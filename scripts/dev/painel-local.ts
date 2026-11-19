import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import {
  adminViaApi,
  bancoCuradoria,
  conectarBancoLocal,
  normalizarEmail,
  provisionarCurador,
} from "../provisionar-curador.ts";
import {
  type EventoLocal,
  gerarEventosSinteticos,
  montarInstrucoes,
  PRIMEIRO_EXEMPLO,
  RUN_KEY,
  verificarDestinoLocal,
} from "./painel-local-lib.ts";

const raiz = new URL("../../", import.meta.url);

async function configuracao(): Promise<Record<string, string>> {
  const nomes = [
    "API_URL",
    "DB_URL",
    "PUBLISHABLE_KEY",
    "SECRET_KEY",
    "SERVICE_ROLE_KEY",
  ];
  const ambiente: Record<string, string> = {};
  for (const nome of nomes) {
    const valor =
      process.env[`SUPABASE_${nome === "API_URL" ? "URL" : nome}`] ??
      process.env[nome];
    if (valor) ambiente[nome] = valor;
  }
  let status: Record<string, string> = {};
  if (!nomes.every((nome) => ambiente[nome])) {
    try {
      const { stdout } = await promisify(execFile)(
        "pnpm",
        ["-s", "supabase", "status", "-o", "json"],
        {
          cwd: fileURLToPath(raiz),
          maxBuffer: 4 * 1024 * 1024,
        },
      );
      status = JSON.parse(stdout) as Record<string, string>;
    } catch {
      // Não ecoar stdout/stderr/argv da CLI, pois contêm credenciais locais.
      throw new Error("não foi possível obter o status do Supabase local");
    }
  }
  const config = { ...status, ...ambiente };
  for (const nome of nomes) {
    if (!config[nome]) throw new Error(`configuração local ausente: ${nome}`);
  }
  verificarDestinoLocal(config.API_URL ?? "", config.DB_URL ?? "");
  return config;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { email: { type: "string", default: "curador@farol.local" } },
  });
  const email = normalizarEmail(values.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("e-mail inválido");
  const config = await configuracao();
  const api = config.API_URL ?? "";
  const sql = await conectarBancoLocal(config.DB_URL ?? "");
  try {
    // Serializa bootstraps, inclusive criação no Auth; max:1 no adaptador reutilizado.
    await sql`select pg_advisory_lock(82633966)`;
    const banco = bancoCuradoria(sql);
    const existentes = await banco.contarEmailsNormalizados(email);
    if (existentes > 1)
      throw new Error("e-mails normalizados em conflito; revise manualmente");
    if (existentes === 0) {
      await sql`insert into public.users (email, role, is_active) values (${email}, 'curator', true)`;
    }
    const [usuario] =
      await sql`select role, is_active from public.users where lower(trim(email)) = ${email}`;
    if (usuario?.role !== "curator" || !usuario.is_active) {
      throw new Error(
        "usuário existente não é curador ativo; não será promovido ou reativado",
      );
    }
    const curador = await provisionarCurador(email, {
      banco,
      admin: adminViaApi(api, config.SERVICE_ROLE_KEY ?? ""),
    });
    if (curador.status !== "vinculado" && curador.status !== "replay") {
      throw new Error(
        "provisionamento recusado; revise identidades locais sem reatribuir UUID",
      );
    }
    // Import por URL dinâmica, como no e2e: não arrasta ESNext.Temporal ao tooling.
    const coleta = (await import(
      new URL("workers/sympla/src/coleta.ts", raiz).href
    )) as {
      prepararColeta(
        arquivos: string[],
        agora: Date,
      ): Promise<{ eventos: EventoLocal[] }>;
    };
    const rpc = (await import(
      new URL("workers/sympla/src/rpc.ts", raiz).href
    )) as {
      registrarColetaMinima(envio: {
        url: URL;
        chave: string;
        runKey: string;
        eventos: EventoLocal[];
      }): Promise<{
        inseridos: number;
        atualizados: number;
        inalterados: number;
      }>;
    };
    const [anterior] =
      await sql`select raw_json ->> 'bootstrap_base' as base from public.events where external_id = ${PRIMEIRO_EXEMPLO} and source_id = (select id from public.sources where slug = 'sympla')`;
    const base =
      typeof anterior?.base === "string"
        ? anterior.base
        : `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
    const fixture = await coleta.prepararColeta(
      [
        fileURLToPath(
          new URL("workers/sympla/test/fixtures/sympla-event.html", raiz),
        ),
      ],
      new Date(base),
    );
    if (fixture.eventos.length !== 1)
      throw new Error("fixture Sympla não produziu exatamente um evento");
    const [recibo] =
      await sql`select chave from private.recibos_idempotencia where chave = ${RUN_KEY}`;
    const resultado = await rpc.registrarColetaMinima({
      url: new URL(api),
      chave: config.SECRET_KEY ?? "",
      runKey: RUN_KEY,
      eventos: [...fixture.eventos, ...gerarEventosSinteticos(base)],
    });
    const resposta = await fetch(new URL("/auth/v1/admin/generate_link", api), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        apikey: config.SERVICE_ROLE_KEY ?? "",
        authorization: `Bearer ${config.SERVICE_ROLE_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ type: "magiclink", email }),
    });
    if (!resposta.ok)
      throw new Error(`generate_link respondeu HTTP ${resposta.status}`);
    const corpo = (await resposta.json()) as { email_otp?: string };
    console.log(montarInstrucoes(api, email, corpo.email_otp ?? ""));
    console.log(
      JSON.stringify({
        ok: true,
        curador: {
          criados: existentes === 0 ? 1 : 0,
          existentes: existentes === 0 ? 0 : 1,
          user_id: curador.userId,
          auth_user_id: curador.authUserId,
        },
        eventos: {
          inseridos: recibo ? 0 : resultado.inseridos,
          atualizados: recibo ? 0 : resultado.atualizados,
          inalterados: recibo ? 13 : resultado.inalterados,
          replay: Boolean(recibo),
        },
      }),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

try {
  await main();
} catch {
  // Erros de rede/Postgres podem carregar URLs/credenciais: não serializá-los.
  console.error(
    "Bootstrap local falhou: confira hosts locais, Supabase ativo, configuração, curador ativo e ausência de conflitos de identidade/run key.",
  );
  process.exitCode = 1;
}
