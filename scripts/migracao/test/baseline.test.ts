import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ARQUIVOS_FONTE,
  gerarBaseline,
  MIGRATION_DESTINO,
} from "../gerar-baseline.ts";

const ORIGEM_PADRAO = "/mnt/data/code/farol/raspagem-farol/src/db/migrations";

// Concatenação INDEPENDENTE: outra implementação da mesma especificação
// (remover o marcador `--> statement-breakpoint` e o que resta da linha dele),
// para que um bug compartilhado com o gerador não passe despercebido.
function concatenacaoIndependente(origem: string): string {
  return ARQUIVOS_FONTE.map((nome) =>
    readFileSync(join(origem, nome), "utf8").replace(
      /--> statement-breakpoint[^\n]*/g,
      "",
    ),
  ).join("\n");
}

function sha256(conteudo: string): string {
  return createHash("sha256").update(conteudo).digest("hex");
}

describe.skipIf(!existsSync(ORIGEM_PADRAO))("baseline da raspagem", () => {
  beforeAll(() => {
    if (!existsSync(ORIGEM_PADRAO)) {
      console.warn(
        `[pré-requisito] origem não encontrada em ${ORIGEM_PADRAO}; ` +
          "o teste de baseline exige o checkout de raspagem-farol nesta máquina.",
      );
    }
  });

  it("gera DDL cujo corpo é idêntico à concatenação independente dos cinco SQL", async () => {
    const gerado = await gerarBaseline(ORIGEM_PADRAO);
    expect(gerado.sql.endsWith(concatenacaoIndependente(ORIGEM_PADRAO))).toBe(
      true,
    );
  });

  it("registra SHA-256 reais dos arquivos de origem no cabeçalho", async () => {
    const { sql } = await gerarBaseline(ORIGEM_PADRAO);
    for (const nome of ARQUIVOS_FONTE) {
      const esperado = sha256(readFileSync(join(ORIGEM_PADRAO, nome), "utf8"));
      expect(sql).toContain(`${nome} ${esperado}`);
    }
  });

  it("cria exatamente as dez tabelas legadas", async () => {
    const { sql } = await gerarBaseline(ORIGEM_PADRAO);
    const criadas = [...sql.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1]);
    expect(criadas).toEqual([
      "sources",
      "connectors",
      "events",
      "spaces",
      "event_space_candidates",
      "job_runs",
      "exports",
      "export_items",
      "users",
      "login_tokens",
    ]);
  });

  it("não toca nas cinco tabelas mobile", async () => {
    const { sql } = await gerarBaseline(ORIGEM_PADRAO);
    for (const proibida of [
      '"eventos"',
      '"espacos"',
      '"categorias"',
      '"eventos_datas"',
      '"eventos_categorias"',
    ]) {
      expect(sql).not.toContain(`CREATE TABLE ${proibida}`);
    }
  });

  it("remove todos os marcadores statement-breakpoint", async () => {
    const { sql } = await gerarBaseline(ORIGEM_PADRAO);
    expect(sql).not.toContain("statement-breakpoint");
  });

  it("o arquivo commitado está sincronizado com a origem atual", async () => {
    const { sql } = await gerarBaseline(ORIGEM_PADRAO);
    const commitado = readFileSync(MIGRATION_DESTINO, "utf8");
    expect(commitado).toBe(sql);
  });
});
