// S0.9 — ciclo de vida do Supabase ISOLADO do e2e. Nunca o banco de demonstração:
// por padrão copia supabase/ para um diretório temporário com outro project_id e outras
// portas (supabase --workdir DIR start/stop --no-backup); se o chamador já subiu um banco
// efêmero próprio (ex.: runner de CI), usa E2E_SUPABASE_* em vez de gerenciar uma pilha.
// Em qualquer dos dois casos, verificarIsolamento() recusa host não local e as portas
// padrão 54321/54322 sem E2E_BANCO_DESCARTAVEL=1, antes de qualquer passo do e2e.
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REPO_RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const PORTAS_PADRAO = new Set([54321, 54322]);
// Mesmo offset para todas as portas do config.toml isolado: mantém as mesmas seções do
// supabase/ real, só muda project_id e porta. 54320=shadow, 54321=api, 54322=db, 54323=studio,
// 54324=inbucket web, 54327=analytics, 54329=pooler (desabilitado por padrão).
const OFFSET_PORTA = 10_000;
const PORTAS_CONFIG = [54320, 54321, 54322, 54323, 54324, 54327, 54329];
// Containers que o e2e não usa: só precisamos de postgres, postgrest (REST) e kong (gateway).
// gotrue fica de pé para o schema/funções de auth existirem, mas o e2e nunca chama a API dele
// (o curador de teste é provisionado por SQL direto e o JWT é assinado à mão em auth.ts).
const CONTAINERS_DESNECESSARIOS = [
  "realtime",
  "storage-api",
  "imgproxy",
  "studio",
  "edge-runtime",
  "logflare",
  "vector",
  "supavisor",
  "mailpit",
].join(",");

export interface StatusPilha {
  API_URL: string;
  DB_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
  SECRET_KEY: string;
  PUBLISHABLE_KEY: string;
  JWT_SECRET: string;
}

export interface PilhaIsolada {
  status: StatusPilha;
  /** null quando a pilha é gerenciada por fora (E2E_SUPABASE_URL); nada para este lado parar. */
  workdir: string | null;
  parar(): Promise<void>;
}

const HOSTS_LOCAIS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * Último guard antes de qualquer passo do e2e tocar a pilha: host tem que ser local, e as
 * portas padrão do Supabase local de desenvolvimento (onde mora o banco de demonstração) só
 * valem com a confirmação explícita de que o banco ali é descartável.
 */
export function verificarIsolamento(status: StatusPilha): void {
  for (const bruto of [status.API_URL, status.DB_URL]) {
    const url = new URL(bruto);
    if (!HOSTS_LOCAIS.has(url.hostname)) {
      throw new Error(
        `e2e recusa host não local: ${url.hostname} (só 127.0.0.1/localhost/[::1])`,
      );
    }
    const porta = Number(url.port);
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: guard explícito do e2e, lido fora do turbo (script root, não task).
    if (PORTAS_PADRAO.has(porta) && process.env.E2E_BANCO_DESCARTAVEL !== "1") {
      throw new Error(
        `e2e recusa rodar na porta padrão ${porta} (onde mora o banco de demonstração) ` +
          "sem E2E_BANCO_DESCARTAVEL=1. Isso só é seguro se a porta pertencer a um banco " +
          "efêmero de verdade (ex.: runner de CI), nunca ao Supabase local de desenvolvimento.",
      );
    }
  }
}

function statusExterno(): StatusPilha | null {
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: pilha externa opcional do e2e, lida fora do turbo (script root, não task).
  const API_URL = process.env.E2E_SUPABASE_URL;
  if (!API_URL) return null;
  const nomes = [
    "DB_URL",
    "ANON_KEY",
    "SERVICE_ROLE_KEY",
    "SECRET_KEY",
    "PUBLISHABLE_KEY",
    "JWT_SECRET",
  ] as const;
  const valores: Partial<Record<(typeof nomes)[number], string>> = {};
  for (const nome of nomes) {
    const valor = process.env[`E2E_SUPABASE_${nome}`];
    if (!valor) {
      throw new Error(
        `E2E_SUPABASE_URL definido, mas E2E_SUPABASE_${nome} está ausente`,
      );
    }
    valores[nome] = valor;
  }
  return { API_URL, ...valores } as StatusPilha;
}

async function lerStatus(workdir: string): Promise<StatusPilha> {
  const { stdout } = await execFileAsync(
    "pnpm",
    ["supabase", "--workdir", workdir, "status", "-o", "json"],
    { cwd: REPO_RAIZ, maxBuffer: 1024 * 1024 * 4 },
  );
  return JSON.parse(stdout) as StatusPilha;
}

async function prepararWorkdir(): Promise<string> {
  const workdir = await mkdtemp(join(tmpdir(), "farol-e2e-"));
  await cp(join(REPO_RAIZ, "supabase"), join(workdir, "supabase"), {
    recursive: true,
    // .temp/.branches guardam estado do Supabase local de desenvolvimento (porta, ref do
    // container etc.); copiar isso misturaria a pilha isolada com a de demonstração.
    filter: (origem) => !/[/\\](\.temp|\.branches)(\/|\\|$)/.test(origem),
  });
  const caminhoConfig = join(workdir, "supabase", "config.toml");
  let config = await readFile(caminhoConfig, "utf8");
  config = config.replace(
    /project_id = "farol"/,
    `project_id = "farol_e2e_${process.pid}"`,
  );
  for (const porta of PORTAS_CONFIG) {
    config = config.replaceAll(
      new RegExp(`\\b${porta}\\b`, "g"),
      String(porta + OFFSET_PORTA),
    );
  }
  await writeFile(caminhoConfig, config, "utf8");
  return workdir;
}

async function pararWorkdir(workdir: string): Promise<void> {
  try {
    await execFileAsync(
      "pnpm",
      ["supabase", "--workdir", workdir, "stop", "--no-backup"],
      { cwd: REPO_RAIZ, maxBuffer: 1024 * 1024 * 4 },
    );
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

/**
 * Sobe (ou adota) a pilha isolada. Em caso de falha no `start`, ainda tenta derrubar os
 * containers que tenham subido parcialmente antes de propagar o erro — nada deve sobrar.
 */
export async function subirPilhaIsolada(): Promise<PilhaIsolada> {
  const externo = statusExterno();
  if (externo) {
    verificarIsolamento(externo);
    return {
      status: externo,
      workdir: null,
      async parar() {
        // Pilha gerenciada por fora (banco efêmero do runner, por exemplo): nada a derrubar.
      },
    };
  }

  const workdir = await prepararWorkdir();
  try {
    await execFileAsync(
      "pnpm",
      [
        "supabase",
        "--workdir",
        workdir,
        "start",
        "-x",
        CONTAINERS_DESNECESSARIOS,
      ],
      { cwd: REPO_RAIZ, maxBuffer: 1024 * 1024 * 16 },
    );
    const status = await lerStatus(workdir);
    verificarIsolamento(status);
    return { status, workdir, parar: () => pararWorkdir(workdir) };
  } catch (erro) {
    await pararWorkdir(workdir).catch(() => {});
    throw erro;
  }
}
