import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AdminApi,
  type BancoCuradoria,
  bancoCuradoria,
  conectarBancoLocal,
  provisionarCurador,
} from "../provisionar-curador.ts";

const URL_LOCAL = "postgres://postgres:postgres@127.0.0.1:54322/postgres";

interface Fixture {
  userId: number;
  authId: string;
}

function adminStub(
  porEmail: Map<string, string>,
  criar?: (email: string) => Promise<string>,
): AdminApi & { criacoes: string[] } {
  const criacoes: string[] = [];
  return {
    criacoes,
    buscarPorEmail: (email) => Promise.resolve(porEmail.get(email) ?? null),
    criar: (email) => {
      criacoes.push(email);
      return criar ? criar(email) : Promise.resolve(crypto.randomUUID());
    },
  };
}

describe("provisionar-curador", () => {
  let sql: postgres.Sql;
  let banco: BancoCuradoria;
  const fixtures: Fixture[] = [];

  beforeAll(async () => {
    let conexao: postgres.Sql | undefined;
    try {
      conexao = postgres(URL_LOCAL, { max: 1 });
      await conexao`select 1`;
    } catch (e) {
      await conexao?.end().catch(() => undefined);
      throw new Error(
        "[pré-requisito] Supabase local indisponível em 127.0.0.1:54322; " +
          "rode `pnpm supabase start` antes dos testes de provisionar-curador",
        { cause: e },
      );
    }
    sql = conexao;
    banco = bancoCuradoria(conexao);
  });

  afterAll(async () => {
    for (const f of fixtures) {
      await sql`delete from private.curator_identities where auth_user_id = ${f.authId}`;
      await sql`delete from auth.users where id = ${f.authId}`;
      await sql`delete from public.users where id = ${f.userId}`;
    }
    await sql.end();
  });

  async function criarUsuarioLegado(
    email: string,
    opcoes: { ativo?: boolean } = {},
  ): Promise<Fixture> {
    const n = 9770 + fixtures.length;
    const authId = crypto.randomUUID();
    const [legado] = await sql<{ id: number }[]>`
      insert into public.users (id, email, is_active, role)
      values (${n}, ${email}, ${opcoes.ativo ?? true}, 'curator')
      returning id`;
    if (!legado) throw new Error("falha ao criar fixture de usuário legado");
    await sql`
      insert into auth.users (id, aud, role, email, created_at, updated_at)
      values (${authId}, 'authenticated', 'authenticated', ${email}, now(), now())`;
    const fixture = { userId: legado.id, authId };
    fixtures.push(fixture);
    return fixture;
  }

  async function quantosVinculos(userId: number): Promise<number> {
    const [r] = await sql<{ n: number }[]>`
      select count(*)::int as n from private.curator_identities
      where user_id = ${userId}`;
    return r?.n ?? 0;
  }

  it("recusa conexão com banco não local antes de abrir a rede", async () => {
    await expect(
      conectarBancoLocal("postgres://u:p@db.example.com:5432/x"),
    ).rejects.toThrow("banco_nao_local");
  });

  it("vincula usuário legado existente à conta Auth existente", async () => {
    const f = await criarUsuarioLegado("prov-a@teste.local");
    const admin = adminStub(new Map([["prov-a@teste.local", f.authId]]));
    const resultado = await provisionarCurador("prov-a@teste.local", {
      banco,
      admin,
    });
    expect(resultado).toMatchObject({
      status: "vinculado",
      authUserId: f.authId,
      userId: f.userId,
      criado: false,
    });
    expect(await quantosVinculos(f.userId)).toBe(1);
  });

  it("replay: segunda execução com o mesmo e-mail não duplica nem reatribui", async () => {
    const f = await criarUsuarioLegado("prov-replay@teste.local");
    const admin = adminStub(new Map([["prov-replay@teste.local", f.authId]]));
    const deps = { banco, admin };
    await provisionarCurador("prov-replay@teste.local", deps);
    const outroUuid = crypto.randomUUID();
    const adminOutro = adminStub(
      new Map([["prov-replay@teste.local", outroUuid]]),
    );
    const resultado = await provisionarCurador("prov-replay@teste.local", {
      banco,
      admin: adminOutro,
    });
    expect(resultado).toMatchObject({
      status: "replay",
      authUserId: f.authId,
      userId: f.userId,
    });
    expect(await quantosVinculos(f.userId)).toBe(1);
    expect(adminOutro.criacoes).toHaveLength(0);
  });

  it("cria conta Auth quando não existe e vincula (sem e-mail em massa)", async () => {
    const f = await criarUsuarioLegado("prov-novo@teste.local");
    const admin = adminStub(new Map(), () => Promise.resolve(f.authId));
    const resultado = await provisionarCurador("  PROV-NOVO@Teste.Local ", {
      banco,
      admin,
    });
    expect(resultado).toMatchObject({
      status: "vinculado",
      authUserId: f.authId,
      userId: f.userId,
      criado: true,
    });
    expect(admin.criacoes).toEqual(["prov-novo@teste.local"]);
    expect(await quantosVinculos(f.userId)).toBe(1);
  });

  it("conflito: UUID já vinculado a outro usuário não é reatribuído", async () => {
    const dono = await criarUsuarioLegado("prov-dono@teste.local");
    await sql`
      insert into private.curator_identities (auth_user_id, user_id)
      values (${dono.authId}, ${dono.userId})`;
    const invasor = await criarUsuarioLegado("prov-invasor@teste.local");
    const admin = adminStub(
      new Map([["prov-invasor@teste.local", dono.authId]]),
    );
    const resultado = await provisionarCurador("prov-invasor@teste.local", {
      banco,
      admin,
    });
    expect(resultado.status).toBe("conflito");
    expect(await quantosVinculos(invasor.userId)).toBe(0);
  });

  it("usuário inativo não é reativado nem provisionado", async () => {
    const f = await criarUsuarioLegado("prov-inativo@teste.local", {
      ativo: false,
    });
    const admin = adminStub(new Map(), () => {
      throw new Error("admin não deveria ser chamado");
    });
    const resultado = await provisionarCurador("prov-inativo@teste.local", {
      banco,
      admin,
    });
    expect(resultado).toMatchObject({ status: "erro" });
    if (resultado.status === "erro") {
      expect(resultado.motivo).toContain("inativo");
    }
    expect(await quantosVinculos(f.userId)).toBe(0);
  });

  it("e-mails que colidem após normalização exigem revisão, não escolha automática", async () => {
    const f1 = await criarUsuarioLegado("colide@teste.local");
    const f2 = await criarUsuarioLegado("COLIDE@teste.local");
    const admin = adminStub(new Map());
    const resultado = await provisionarCurador("colide@teste.local", {
      banco,
      admin,
    });
    expect(resultado.status).toBe("conflito");
    expect(await quantosVinculos(f1.userId)).toBe(0);
    expect(await quantosVinculos(f2.userId)).toBe(0);
  });

  it("falha entre Auth e vínculo reporta a conta criada para reconciliação humana", async () => {
    const f = await criarUsuarioLegado("prov-falha@teste.local");
    const admin = adminStub(new Map(), () => Promise.resolve(f.authId));
    const bancoFalho: BancoCuradoria = {
      ...banco,
      criarVinculo: () => Promise.reject(new Error("connection lost")),
    };
    const resultado = await provisionarCurador("prov-falha@teste.local", {
      banco: bancoFalho,
      admin,
    });
    expect(resultado.status).toBe("erro");
    if (resultado.status === "erro") {
      expect(resultado.motivo).toContain(f.authId);
      expect(resultado.motivo).toContain("reconciliação");
    }
    expect(await quantosVinculos(f.userId)).toBe(0);
  });

  it("dry-run prevê sem gravar nada", async () => {
    const f = await criarUsuarioLegado("prov-dry@teste.local");
    const admin = adminStub(new Map([["prov-dry@teste.local", f.authId]]));
    const resultado = await provisionarCurador(
      "prov-dry@teste.local",
      {
        banco,
        admin,
      },
      { dryRun: true },
    );
    expect(resultado).toMatchObject({
      status: "previsto",
      authUserId: f.authId,
      userId: f.userId,
      criariaConta: false,
    });
    expect(admin.criacoes).toHaveLength(0);
    expect(await quantosVinculos(f.userId)).toBe(0);
  });

  it("usuário legado inexistente é erro, sem criar conta", async () => {
    const admin = adminStub(new Map(), () => {
      throw new Error("admin não deveria ser chamado");
    });
    const resultado = await provisionarCurador("ausente@teste.local", {
      banco,
      admin,
    });
    expect(resultado).toMatchObject({ status: "erro" });
  });
});
