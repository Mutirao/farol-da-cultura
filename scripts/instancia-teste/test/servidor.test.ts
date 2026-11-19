import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  carregarFixtures,
  criarInstanciaTeste,
  type InstanciaTeste,
} from "../servidor.ts";

let instancia: InstanciaTeste | undefined;
afterEach(async () => {
  await instancia?.fechar();
  instancia = undefined;
});

async function subir(comFixtures = true) {
  instancia = await criarInstanciaTeste({
    linhas: comFixtures ? await carregarFixtures() : [],
  });
  return instancia;
}

type Corpo = Array<Record<string, unknown>>;

const ler = async (url: string, init?: RequestInit) => {
  const resposta = await fetch(url, init);
  return { status: resposta.status, corpo: (await resposta.json()) as Corpo };
};

describe("instância de teste", () => {
  it("escuta só em 127.0.0.1, em porta efêmera", async () => {
    const { url, porta } = await subir();
    expect(porta).toBeGreaterThan(0);
    expect(url).toBe(`http://127.0.0.1:${porta}`);
  });

  it("serve as fixtures em findOccurrences, filtrando @from/@to inclusive", async () => {
    const { url } = await subir();
    const todas = await ler(`${url}/api/event/findOccurrences`);
    expect(todas.status).toBe(200);
    expect(todas.corpo.map((linha) => linha.occurrence_id)).toEqual([
      8001, 8002, 8003,
    ]);

    const janela = await ler(
      `${url}/api/event/findOccurrences?@from=2030-01-10&@to=2030-01-12`,
    );
    expect(janela.corpo).toHaveLength(2);

    const ruim = await ler(`${url}/api/event/findOccurrences?@from=ontem`);
    expect(ruim.status).toBe(400);
  });

  it("começa vazia por padrão e reflete adicionar/remover", async () => {
    const vazia = await subir(false);
    expect((await ler(`${vazia.url}/api/event/findOccurrences`)).corpo).toEqual(
      [],
    );

    const [primeira] = await carregarFixtures();
    if (!primeira) throw new Error("fixture vazia");
    vazia.adicionar(primeira, { ...primeira, name: "Título novo" });
    const depois = await ler(`${vazia.url}/api/event/findOccurrences`);
    expect(depois.corpo).toHaveLength(1);
    expect(depois.corpo[0]?.name).toBe("Título novo");

    expect(vazia.remover(primeira.event_id)).toBe(1);
    expect(vazia.remover(primeira.event_id)).toBe(0);
    expect(vazia.linhas()).toEqual([]);
  });

  it("lê um evento por ID no formato de /api/event/find", async () => {
    const { url } = await subir();
    const { status, corpo } = await ler(
      `${url}/api/event/find?id=EQ(9002)&@select=id,name,occurrences.{id,rule}`,
    );
    expect(status).toBe(200);
    expect(corpo).toEqual([
      {
        id: 9002,
        name: "Mostra de Teatro de Teste",
        occurrences: [
          {
            id: 8002,
            rule: expect.objectContaining({
              spaceId: "7001",
              startsOn: "2030-01-12",
              startsAt: "19:30",
              duration: 90,
            }),
          },
          {
            id: 8003,
            rule: expect.objectContaining({ startsOn: "2030-01-19" }),
          },
        ],
      },
    ]);

    const soIds = await ler(
      `${url}/api/event/find?id=EQ(9001)&@select=id,occurrences`,
    );
    expect(soIds.corpo).toEqual([{ id: 9001, occurrences: [8001] }]);

    const padrao = await ler(`${url}/api/event/find?id=EQ(9001)`);
    expect(padrao.corpo).toEqual([
      { id: 9001, name: "Roda de Choro de Teste" },
    ]);
  });

  it("devolve lista vazia para ID ausente e 400 para filtro inválido", async () => {
    const { url } = await subir();
    expect((await ler(`${url}/api/event/find?id=EQ(1)`)).corpo).toEqual([]);
    expect((await ler(`${url}/api/event/find?id=IN(1,2)`)).status).toBe(400);
  });

  it("recusa rota desconhecida e método diferente de GET", async () => {
    const { url } = await subir();
    expect((await ler(`${url}/api/agent/find`)).status).toBe(404);
    expect(
      (await ler(`${url}/api/event/findOccurrences`, { method: "POST" }))
        .status,
    ).toBe(405);
  });

  it("para de responder depois de fechar", async () => {
    const { url } = await subir();
    await instancia?.fechar();
    instancia = undefined;
    await expect(fetch(`${url}/api/event/findOccurrences`)).rejects.toThrow();
  });

  it("sobe pela linha de comando com --porta 0 e serve as fixtures", async () => {
    const processo = spawn(
      process.execPath,
      [join(import.meta.dirname, "..", "servidor.ts"), "--porta", "0"],
      { stdio: ["ignore", "pipe", "inherit"] },
    );
    try {
      const [saida] = await once(processo.stdout, "data");
      const { url, linhas } = JSON.parse(String(saida));
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(linhas).toBe(3);
      expect(
        (await ler(`${url}/api/event/findOccurrences`)).corpo,
      ).toHaveLength(3);
    } finally {
      processo.kill("SIGTERM");
      await once(processo, "exit");
    }
  });
});
