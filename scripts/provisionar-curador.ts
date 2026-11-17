import { resolve } from "node:path";
import postgres from "postgres";

export interface AdminApi {
  buscarPorEmail(email: string): Promise<string | null>;
  criar(email: string): Promise<string>;
}

export interface UsuarioLegado {
  id: number;
  email: string;
  isActive: boolean;
}

export interface BancoCuradoria {
  contarEmailsNormalizados(email: string): Promise<number>;
  buscarUsuarioPorEmail(email: string): Promise<UsuarioLegado | null>;
  vinculoPorUsuario(userId: number): Promise<string | null>;
  vinculoPorAuth(authUserId: string): Promise<number | null>;
  criarVinculo(authUserId: string, userId: number): Promise<void>;
}

export type ResultadoProvisionamento =
  | { status: "vinculado"; authUserId: string; userId: number; criado: boolean }
  | { status: "replay"; authUserId: string; userId: number }
  | {
      status: "previsto";
      authUserId: string | null;
      userId: number;
      criariaConta: boolean;
    }
  | { status: "conflito"; motivo: string }
  | { status: "erro"; motivo: string };

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Provisiona o vínculo entre a conta do Supabase Auth (uuid) e o usuário
// inteiro legado, sem nunca reatribuir UUID nem reativar usuário inativo.
// A criação da conta Auth não envia e-mail (modo de vínculo de contas legadas).
export async function provisionarCurador(
  email: string,
  deps: { banco: BancoCuradoria; admin: AdminApi },
  opcoes: { dryRun?: boolean } = {},
): Promise<ResultadoProvisionamento> {
  const alvo = normalizarEmail(email);
  const { banco, admin } = deps;

  if ((await banco.contarEmailsNormalizados(alvo)) > 1) {
    return {
      status: "conflito",
      motivo:
        `e-mails colidem após normalização para ${alvo}; ` +
        "exige revisão humana, não escolha automática",
    };
  }

  const legado = await banco.buscarUsuarioPorEmail(alvo);
  if (!legado) {
    return {
      status: "erro",
      motivo: `usuário legado não encontrado para ${alvo}`,
    };
  }
  if (!legado.isActive) {
    return {
      status: "erro",
      motivo: `usuário legado ${legado.id} está inativo; não é reativado automaticamente`,
    };
  }

  const existente = await banco.vinculoPorUsuario(legado.id);
  if (existente) {
    return { status: "replay", authUserId: existente, userId: legado.id };
  }

  const authId = await admin.buscarPorEmail(alvo);
  if (authId) {
    const dono = await banco.vinculoPorAuth(authId);
    if (dono !== null && dono !== legado.id) {
      return {
        status: "conflito",
        motivo:
          `conta Auth ${authId} já vinculada ao usuário ${dono}; ` +
          "nunca reatribuir UUID já vinculado",
      };
    }
    if (opcoes.dryRun) {
      return {
        status: "previsto",
        authUserId: authId,
        userId: legado.id,
        criariaConta: false,
      };
    }
    try {
      await banco.criarVinculo(authId, legado.id);
    } catch (e) {
      return { status: "erro", motivo: motivoFalhaVinculo(authId, e) };
    }
    return {
      status: "vinculado",
      authUserId: authId,
      userId: legado.id,
      criado: false,
    };
  }

  if (opcoes.dryRun) {
    return {
      status: "previsto",
      authUserId: null,
      userId: legado.id,
      criariaConta: true,
    };
  }

  const novo = await admin.criar(alvo);
  const donoNovo = await banco.vinculoPorAuth(novo);
  if (donoNovo !== null && donoNovo !== legado.id) {
    return {
      status: "conflito",
      motivo:
        `conta Auth recém-criada ${novo} já vinculada ao usuário ${donoNovo}; ` +
        "exige reconciliação humana",
    };
  }
  try {
    await banco.criarVinculo(novo, legado.id);
  } catch (e) {
    return { status: "erro", motivo: motivoFalhaVinculo(novo, e) };
  }
  return {
    status: "vinculado",
    authUserId: novo,
    userId: legado.id,
    criado: true,
  };
}

function motivoFalhaVinculo(authId: string, e: unknown): string {
  const detalhe = e instanceof Error ? e.message : String(e);
  return (
    `falha entre Auth e vínculo; conta ${authId} criada e preservada, ` +
    `exige reconciliação humana (${detalhe})`
  );
}

const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Só conecta em banco local: provisioning operacional roda com segredos em
// contexto servidor/humano; um alvo remoto aqui seria operação negada.
export async function conectarBancoLocal(url: string): Promise<postgres.Sql> {
  const alvo = new URL(url);
  if (!HOSTS_LOCAIS.has(alvo.hostname)) {
    throw new Error("banco_nao_local: provisioning recusa host remoto");
  }
  const sql = postgres(url, { max: 1 });
  try {
    await sql`select 1`;
  } catch (e) {
    await sql.end();
    throw e;
  }
  return sql;
}

export function bancoCuradoria(sql: postgres.Sql): BancoCuradoria {
  return {
    async contarEmailsNormalizados(email: string): Promise<number> {
      const [r] = await sql<{ n: number }[]>`
        select count(*)::int as n from public.users
        where lower(trim(email)) = ${email}`;
      return r?.n ?? 0;
    },
    async buscarUsuarioPorEmail(email: string): Promise<UsuarioLegado | null> {
      const [r] = await sql<UsuarioLegado[]>`
        select id, email, is_active as "isActive"
        from public.users
        where lower(trim(email)) = ${email}
        order by id
        limit 1`;
      return r ?? null;
    },
    async vinculoPorUsuario(userId: number): Promise<string | null> {
      const [r] = await sql<{ auth_user_id: string }[]>`
        select auth_user_id from private.curator_identities
        where user_id = ${userId}
        limit 1`;
      return r?.auth_user_id ?? null;
    },
    async vinculoPorAuth(authUserId: string): Promise<number | null> {
      const [r] = await sql<{ user_id: number }[]>`
        select user_id from private.curator_identities
        where auth_user_id = ${authUserId}
        limit 1`;
      return r?.user_id ?? null;
    },
    async criarVinculo(authUserId: string, userId: number): Promise<void> {
      await sql`
        insert into private.curator_identities (auth_user_id, user_id)
        values (${authUserId}, ${userId})`;
    },
  };
}

// Admin API do GoTrue via fetch nativo. Listagem por páginas e comparação de
// e-mail no cliente: não depende de filtro proprietário do endpoint.
export function adminViaApi(
  base: string,
  serviceRoleKey: string,
  buscar: typeof fetch = fetch,
): AdminApi {
  const alvo = new URL(base);
  if (
    !HOSTS_LOCAIS.has(alvo.hostname) ||
    !["http:", "https:"].includes(alvo.protocol)
  ) {
    throw new Error(
      "auth_nao_local: provisioning recusa destino Auth não local",
    );
  }
  const cabecalhos = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
  return {
    async buscarPorEmail(email: string): Promise<string | null> {
      for (let pagina = 1; pagina <= 100; pagina++) {
        const resposta = await buscar(
          `${base}/auth/v1/admin/users?page=${pagina}&per_page=1000`,
          { headers: cabecalhos, redirect: "error" },
        );
        if (!resposta.ok) {
          throw new Error(`admin_listar_usuarios_http_${resposta.status}`);
        }
        const corpo = (await resposta.json()) as {
          users?: { id: string; email?: string }[];
        };
        const usuarios = corpo.users ?? [];
        const achado = usuarios.find(
          (u) => u.email !== undefined && normalizarEmail(u.email) === email,
        );
        if (achado) return achado.id;
        if (usuarios.length < 1000) return null;
      }
      throw new Error("admin_listar_usuarios_limite_de_paginas");
    },
    async criar(email: string): Promise<string> {
      // email_confirm true: conta pronta para login sem envio de convite em
      // massa; o vínculo é operação administrativa explícita.
      const resposta = await buscar(`${base}/auth/v1/admin/users`, {
        method: "POST",
        headers: cabecalhos,
        redirect: "error",
        body: JSON.stringify({
          email,
          email_confirm: true,
          user_metadata: { proveniencia: "provisionamento-legado" },
        }),
      });
      if (!resposta.ok) {
        throw new Error(`admin_criar_usuario_http_${resposta.status}`);
      }
      const corpo = (await resposta.json()) as { id?: string };
      if (!corpo.id) throw new Error("admin_criar_usuario_sem_id");
      return corpo.id;
    },
  };
}

const executadoDiretamente =
  process.argv[1] !== undefined &&
  import.meta.filename !== undefined &&
  resolve(process.argv[1]) === resolve(import.meta.filename);

if (executadoDiretamente) {
  const argumentos = process.argv.slice(2);
  const dryRun = argumentos.includes("--dry-run");
  const indiceEmail = argumentos.indexOf("--email");
  const email = indiceEmail >= 0 ? argumentos[indiceEmail + 1] : undefined;
  if (!email) {
    console.error(
      "uso: node provisionar-curador.ts --email <email> [--dry-run]",
    );
    process.exit(2);
  }
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: variável de ambiente operacional fornecida pelo operador humano no contexto servidor.
  const base = process.env.FAROL_SUPABASE_URL ?? "http://127.0.0.1:54321";
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: segredo fornecido pelo operador humano; nunca versionado.
  const serviceRole = process.env.FAROL_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) {
    console.error(
      "FAROL_SUPABASE_SERVICE_ROLE_KEY ausente; segredos são fornecidos pelo operador humano",
    );
    process.exit(2);
  }
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: variável de ambiente operacional fornecida pelo operador humano no contexto servidor.
  const urlBanco =
    process.env.FAROL_DATABASE_URL ??
    "postgres://postgres:postgres@127.0.0.1:54322/postgres";

  const sql = await conectarBancoLocal(urlBanco);
  try {
    const resultado = await provisionarCurador(
      email,
      { banco: bancoCuradoria(sql), admin: adminViaApi(base, serviceRole) },
      { dryRun },
    );
    console.log(JSON.stringify(resultado));
    process.exitCode =
      resultado.status === "erro" || resultado.status === "conflito" ? 1 : 0;
  } finally {
    await sql.end();
  }
}
