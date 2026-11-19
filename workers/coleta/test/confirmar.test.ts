import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  carregarFixtures,
  criarInstanciaTeste,
  type InstanciaTeste,
} from "../../../scripts/instancia-teste/servidor.ts";
import { confere, confirmar, normalizarTitulo } from "../src/confirmar.ts";

const SUPABASE = "http://supabase.test";

type Vinculo = {
  event_id: number;
  instancia: string;
  base: string;
  mapas_id: string;
};
type Evento = { id: number; title: string; starts_at: string | null };

const vinculo = (mudancas: Partial<Vinculo> = {}): Vinculo => ({
  event_id: 1,
  instancia: "ceara",
  base: "mapa-cultural-ce",
  mapas_id: "9001",
  ...mudancas,
});

// Fixture 9001 da instância de teste: "Roda de Choro de Teste", 2030-01-10 16:00 em Fortaleza.
const evento = (mudancas: Partial<Evento> = {}): Evento => ({
  id: 1,
  title: "  RODA de choro de teste ",
  starts_at: "2030-01-10T19:00:00+00:00",
  ...mudancas,
});

/** Supabase falso + fetch real para a instância de teste. Registra cada chamada. */
function supabaseFalso(
  vinculos: Vinculo[],
  eventos: Evento[],
  instanciaFalsa?: (url: URL) => Response,
) {
  const chamadas: { url: URL; corpo?: unknown }[] = [];
  const confirmacoes: { p_event_id: number; p_confere: boolean }[] = [];
  const buscar: typeof fetch = async (entrada, init) => {
    const url = new URL(String(entrada));
    const corpo = init?.body ? JSON.parse(String(init.body)) : undefined;
    chamadas.push({ url, corpo });
    if (url.origin !== SUPABASE) {
      return instanciaFalsa ? instanciaFalsa(url) : fetch(url, init);
    }
    if (url.pathname === "/rest/v1/vinculos_institucionais") {
      return Response.json(vinculos);
    }
    if (url.pathname === "/rest/v1/events") {
      return Response.json(eventos);
    }
    if (url.pathname === "/rest/v1/rpc/confirmar_incorporacao") {
      confirmacoes.push(corpo);
      return Response.json({
        event_id: corpo.p_event_id,
        estado: corpo.p_confere ? "confirmado" : "divergente",
      });
    }
    return new Response("{}", { status: 404 });
  };
  return { buscar, chamadas, confirmacoes };
}

describe("normalizarTitulo e confere", () => {
  it("ignora caixa, acento e espaços", () => {
    expect(normalizarTitulo("  Música   na PRAÇA ")).toBe("musica na praca");
  });

  it("aceita início em qualquer ocorrência e recusa título diferente", () => {
    const registro = {
      id: 1,
      name: "Mostra",
      occurrences: [
        { rule: { startsOn: "2030-01-12", startsAt: "19:30" } },
        { rule: null },
      ],
    };
    expect(
      confere({ title: "mostra", starts_at: "2030-01-12T22:30:00Z" }, registro),
    ).toBe(true);
    expect(
      confere({ title: "outra", starts_at: "2030-01-12T22:30:00Z" }, registro),
    ).toBe(false);
  });
});

describe("confirmar", () => {
  let instancia: InstanciaTeste;
  beforeEach(async () => {
    instancia = await criarInstanciaTeste({ linhas: await carregarFixtures() });
  });
  afterEach(async () => {
    await instancia.fechar();
  });

  it("ID presente com título e início iguais → confere=true", async () => {
    const falso = supabaseFalso([vinculo()], [evento()]);
    const contagens = await confirmar({
      supabaseUrl: SUPABASE,
      chave: "chave-de-teste",
      base: instancia.url,
      buscar: falso.buscar,
    });
    expect(falso.confirmacoes).toEqual([{ p_event_id: 1, p_confere: true }]);
    expect(contagens).toMatchObject({ vinculos: 1, confirmados: 1 });
    const consulta = falso.chamadas.find((c) =>
      c.url.href.startsWith(instancia.url),
    );
    expect(consulta?.url.pathname).toBe("/api/event/find");
    expect(consulta?.url.searchParams.get("id")).toBe("EQ(9001)");
  });

  it("título ou início diferente → confere=false", async () => {
    const falso = supabaseFalso(
      [
        vinculo({ event_id: 1 }),
        vinculo({ event_id: 2 }),
        vinculo({ event_id: 3, mapas_id: "9002" }),
      ],
      [
        evento({ id: 1, title: "Outro título" }),
        evento({ id: 2, starts_at: "2030-01-10T20:00:00Z" }),
        // 9002 tem ocorrências em 12/01 e 19/01 às 19:30.
        evento({
          id: 3,
          title: "Mostra de Teatro de Teste",
          starts_at: "2030-01-19T22:30:00Z",
        }),
      ],
    );
    const contagens = await confirmar({
      supabaseUrl: SUPABASE,
      chave: "chave-de-teste",
      base: instancia.url,
      buscar: falso.buscar,
    });
    expect(falso.confirmacoes).toEqual([
      { p_event_id: 1, p_confere: false },
      { p_event_id: 2, p_confere: false },
      { p_event_id: 3, p_confere: true },
    ]);
    expect(contagens).toMatchObject({ confirmados: 1, divergentes: 2 });
  });

  it("ID ausente na instância → sem chamada à RPC, contado", async () => {
    const falso = supabaseFalso([vinculo({ mapas_id: "123456" })], [evento()]);
    const contagens = await confirmar({
      supabaseUrl: SUPABASE,
      chave: "chave-de-teste",
      base: instancia.url,
      buscar: falso.buscar,
    });
    expect(falso.confirmacoes).toEqual([]);
    expect(contagens).toMatchObject({
      vinculos: 1,
      ausentes: 1,
      confirmados: 0,
      divergentes: 0,
    });
  });

  it("pula outra base, ID inválido e evento sem início, sem consultar a instância", async () => {
    const falso = supabaseFalso(
      [
        vinculo({ event_id: 1, base: "outra-base" }),
        vinculo({ event_id: 2, mapas_id: "9001)|EQ(9002" }),
        vinculo({ event_id: 3 }),
        vinculo({ event_id: 4 }),
      ],
      [
        evento({ id: 1 }),
        evento({ id: 2 }),
        evento({ id: 3, starts_at: null }),
      ],
    );
    const contagens = await confirmar({
      supabaseUrl: SUPABASE,
      chave: "chave-de-teste",
      base: instancia.url,
      buscar: falso.buscar,
    });
    expect(falso.chamadas.every((c) => c.url.origin === SUPABASE)).toBe(true);
    expect(falso.confirmacoes).toEqual([]);
    expect(contagens).toEqual({
      vinculos: 4,
      confirmados: 0,
      divergentes: 0,
      ausentes: 0,
      outra_base: 1,
      mapas_id_invalido: 1,
      sem_evento: 1,
      sem_inicio: 1,
    });
  });

  it.each(["https://exemplo.test", "http://10.0.0.1"])(
    "base remota %s recusada antes de qualquer requisição",
    async (base) => {
      const falso = supabaseFalso([vinculo()], [evento()]);
      await expect(
        confirmar({
          supabaseUrl: SUPABASE,
          chave: "chave-de-teste",
          base,
          buscar: falso.buscar,
        }),
      ).rejects.toThrow(/MAPA_CULTURAL_BASE recusada/);
      expect(falso.chamadas).toEqual([]);
    },
  );

  it.each([
    ["não é lista", () => Response.json({ id: 9001, name: "x" })],
    ["sem nome", () => Response.json([{ id: 9001 }])],
    ["não é JSON", () => new Response("<html>")],
    ["erro HTTP", () => new Response("falhou", { status: 500 })],
    ["outro ID", () => Response.json([{ id: 9003, name: "x" }])],
  ])(
    "resposta inválida (%s) → erro sem nenhuma confirmação",
    async (_caso, resposta) => {
      // O primeiro vínculo confere; a resposta ruim do segundo impede a gravação dos dois.
      const falso = supabaseFalso(
        [vinculo({ event_id: 1 }), vinculo({ event_id: 2, mapas_id: "9002" })],
        [evento({ id: 1 }), evento({ id: 2 })],
        (url) =>
          url.searchParams.get("id") === "EQ(9002)"
            ? resposta()
            : Response.json([
                {
                  id: 9001,
                  name: "Roda de Choro de Teste",
                  occurrences: [
                    {
                      id: 8001,
                      rule: { startsOn: "2030-01-10", startsAt: "16:00" },
                    },
                  ],
                },
              ]),
      );
      await expect(
        confirmar({
          supabaseUrl: SUPABASE,
          chave: "chave-de-teste",
          base: instancia.url,
          buscar: falso.buscar,
        }),
      ).rejects.toThrow(/instância/);
      expect(falso.confirmacoes).toEqual([]);
    },
  );
});
