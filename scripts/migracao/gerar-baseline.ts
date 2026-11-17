import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const ARQUIVOS_FONTE = [
  "0000_extensions.sql",
  "0001_sources_table.sql",
  "0002_events_and_full_schema.sql",
  "0003_users_auth_fields.sql",
  "0004_sympla_collection.sql",
] as const;

export const MIGRATION_DESTINO = resolve(
  "supabase/migrations/20261117000100_raspagem_baseline.sql",
);

const MARCO = "--> statement-breakpoint";

export interface BaselineGerado {
  sql: string;
  shas: Record<string, string>;
}

// Transporte de DDL puro: concatena os cinco SQL históricos em ordem e remove
// apenas os marcadores de statement do Drizzle (standalone ou inline no fim da
// linha). Nenhuma coluna, constraint ou default é reformulado aqui.
export async function gerarBaseline(origem: string): Promise<BaselineGerado> {
  const shas: Record<string, string> = {};
  const partes: string[] = [];

  for (const nome of ARQUIVOS_FONTE) {
    const conteudo = readFileSync(join(origem, nome), "utf8");
    shas[nome] = createHash("sha256").update(conteudo).digest("hex");
    partes.push(
      conteudo
        .split("\n")
        .map((linha) => {
          const indice = linha.indexOf(MARCO);
          return indice === -1 ? linha : linha.slice(0, indice);
        })
        .join("\n"),
    );
  }

  const cabecalho = [
    "-- Baseline das dez tabelas de raspagem (Raspagem-Farol), transportado como DDL puro.",
    "-- Gerado por scripts/migracao/gerar-baseline.ts — não editar à mão; regenerar.",
    "-- Qualquer alteração de coluna/default/constraint na origem quebra o teste de baseline.",
    "-- Fontes (SHA-256 dos arquivos de origem):",
    ...ARQUIVOS_FONTE.map((nome) => `--   ${nome} ${shas[nome]}`),
    "",
  ].join("\n");

  return { sql: cabecalho + partes.join("\n"), shas };
}

const executadoDiretamente =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(import.meta.filename ?? "");

if (executadoDiretamente) {
  const origem =
    process.argv[2] ?? "/mnt/data/code/farol/raspagem-farol/src/db/migrations";
  const { sql, shas } = await gerarBaseline(origem);
  writeFileSync(MIGRATION_DESTINO, sql);
  console.log(
    `baseline escrito em ${MIGRATION_DESTINO} (${ARQUIVOS_FONTE.length} fontes, ` +
      `${Object.keys(shas).length} SHAs)`,
  );
}
