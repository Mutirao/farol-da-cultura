import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { codigoDeSaida, prepararColeta } from "../src/coleta.ts";

const FIXTURE = join(import.meta.dirname, "fixtures/sympla-event.html");
const NOW = new Date("2026-09-17T12:00:00Z");
let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "farol-sympla-"));
  await writeFile(
    join(dir, "quebrada.html"),
    "<html><body>sem hidratação</body></html>",
  );
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("prepararColeta", () => {
  it("fixture completa: um evento com URL canônica tirada da página, saída 0", async () => {
    const preparo = await prepararColeta([FIXTURE], NOW);
    expect(preparo.arquivos).toBe(1);
    expect(preparo.interpretados).toBe(1);
    expect(preparo.eventos).toHaveLength(1);
    expect(preparo.eventos[0]?.source_url).toBe(
      "https://www.sympla.com.br/evento/encontro-de-teste/9000001",
    );
    expect(preparo.issues).toEqual([]);
    expect(codigoDeSaida(preparo.issues)).toBe(0);
  });

  it("página quebrada, arquivo ausente e duplicata: segue com o que interpretou, saída 2", async () => {
    const quebrada = join(dir, "quebrada.html");
    const ausente = join(dir, "nao-existe.html");
    const preparo = await prepararColeta(
      [FIXTURE, quebrada, ausente, FIXTURE],
      NOW,
    );
    expect(preparo.eventos).toHaveLength(1);
    expect(preparo.issues).toEqual([
      { origem: quebrada, etapa: "pagina", motivo: "pagina_nao_interpretavel" },
      { origem: ausente, etapa: "leitura", motivo: "arquivo_ilegivel" },
      {
        origem: "sympla:9000001",
        etapa: "duplicado",
        motivo: "external_id_repetido",
      },
    ]);
    expect(codigoDeSaida(preparo.issues)).toBe(2);
  });

  it("issue só de campo não torna a coleta parcial", () => {
    expect(
      codigoDeSaida([
        { origem: "sympla:1", etapa: "campo", motivo: "city_ausente" },
      ]),
    ).toBe(0);
    expect(
      codigoDeSaida([
        {
          origem: "sympla:1",
          etapa: "duplicado",
          motivo: "external_id_repetido",
        },
      ]),
    ).toBe(0);
  });
});
