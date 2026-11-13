import { describe, expect, it, vi } from "vitest";
import {
  alternarFavorito,
  buscarAgenda,
  chaveEvento,
  type Evento,
  EventoSchema,
  FavoritosSchema,
  filtrar,
  filtrosIniciais,
  limitesPeriodo,
} from "../src/agenda/dados";

const AGORA = new Date("2030-01-10T20:00:00Z");
const espaco = {
  id: 1,
  nome: "Teatro José",
  descricao: null,
  endereco: null,
  municipio: "Fortaleza",
  latitude: -3.7,
  longitude: -38.5,
  acessibilidade_fisica: ["Rampa"],
};
const evento: Evento = {
  id: 1,
  fonte: "teste",
  id_externo: "1",
  nome: "Forró na Praça",
  descricao_curta: "Música ao vivo",
  descricao_longa: null,
  imagem_url: null,
  classificacao_etaria: "Livre",
  categorias: [{ categorias: { nome: "Música" } }],
  datas: [
    {
      id: 1,
      inicio: "2030-01-10T22:00:00Z",
      fim: null,
      preco: "Gratuito",
      gratuito: true,
      espaco,
    },
    {
      id: 2,
      inicio: "2030-01-11T20:00:00Z",
      fim: "2030-01-11T22:00:00Z",
      preco: "Pago",
      gratuito: false,
      espaco: {
        ...espaco,
        id: 2,
        municipio: "Sobral",
        acessibilidade_fisica: [],
      },
    },
  ],
};
const aplicar = (mudancas = {}) =>
  filtrar([evento], { ...filtrosIniciais, ...mudancas }, AGORA);

describe("filtros da agenda", () => {
  it.each(["FORRO", "praca", "jose", "musica", "fortaleza"])(
    'busca "%s" sem exigir acento ou caixa',
    (busca) => {
      expect(aplicar({ busca })).toHaveLength(1);
    },
  );
  it("busca inexistente não retorna tudo", () =>
    expect(aplicar({ busca: "zzz" })).toEqual([]));
  it("filtra por linguagem", () => {
    expect(aplicar({ categoria: "Música" })).toHaveLength(1);
    expect(aplicar({ categoria: "Teatro" })).toHaveLength(0);
  });
  it("preço desconhecido não é nem pago nem gratuito", () => {
    const incerto = {
      ...evento,
      datas: [{ ...evento.datas[0]!, gratuito: null }],
    };
    for (const ingresso of ["gratuito", "pago"])
      expect(
        filtrar([incerto], { ...filtrosIniciais, ingresso }, AGORA),
      ).toHaveLength(0);
  });
  it("cruza período, preço, cidade e acessibilidade na mesma ocorrência", () => {
    expect(
      aplicar({
        periodo: "hoje",
        ingresso: "gratuito",
        municipio: "FORTALEZA",
        acessibilidade: "Rampa",
      }),
    ).toHaveLength(1);
    expect(aplicar({ periodo: "hoje", ingresso: "pago" })).toHaveLength(0);
    expect(aplicar({ ingresso: "pago", municipio: "Fortaleza" })).toHaveLength(
      0,
    );
    expect(
      aplicar({ periodo: "amanha", acessibilidade: "Rampa" }),
    ).toHaveLength(0);
    expect(
      aplicar({ periodo: "amanha", ingresso: "pago", municipio: "Sobral" }),
    ).toHaveLength(1);
  });
  it("evento com data e espaço ausentes não quebra a lista", () => {
    expect(filtrar([{ ...evento, datas: [] }], filtrosIniciais, AGORA)).toEqual(
      [],
    );
    expect(
      filtrar(
        [{ ...evento, datas: [{ ...evento.datas[0]!, espaco: null }] }],
        filtrosIniciais,
        AGORA,
      ),
    ).toHaveLength(1);
  });
  it("exclui evento que já terminou em outro dia", () => {
    expect(
      filtrar([evento], filtrosIniciais, new Date("2030-01-15T00:00:00Z")),
    ).toEqual([]);
  });
  it("ordena pela primeira ocorrência que passa pelos filtros", () => {
    const cedo = {
      ...evento,
      id: 2,
      datas: [{ ...evento.datas[0]!, inicio: "2030-01-10T10:00:00Z" }],
    };
    expect(
      filtrar([evento, cedo], filtrosIniciais, AGORA).map((e) => e.id),
    ).toEqual([2, 1]);
  });
  it("considera a data que atravessou a meia-noite e ainda está acontecendo", () => {
    const madrugada = {
      ...evento,
      datas: [
        {
          ...evento.datas[0]!,
          inicio: "2030-01-10T02:00:00Z",
          fim: "2030-01-10T04:00:00Z",
        },
      ],
    };
    expect(
      filtrar([madrugada], { ...filtrosIniciais, periodo: "hoje" }, AGORA),
    ).toHaveLength(1);
  });
});

describe("datas no Ceará", () => {
  it("02h UTC ainda é o dia anterior em Fortaleza", () => {
    const [de, ate] = limitesPeriodo("hoje", new Date("2030-01-11T02:00:00Z"));
    expect(new Date(de).toISOString()).toBe("2030-01-10T03:00:00.000Z");
    expect(new Date(ate).toISOString()).toBe("2030-01-11T03:00:00.000Z");
  });
  it.each([
    ["amanha", 1, 2],
    ["semana", 0, 7],
    ["mes", 0, 30],
  ] as const)("limites de %s", (periodo, diasDe, diasAte) => {
    const hoje = Date.parse("2030-01-10T03:00:00Z");
    expect(limitesPeriodo(periodo, AGORA)).toEqual([
      hoje + diasDe * 86400000,
      hoje + diasAte * 86400000,
    ]);
  });
});

describe("fronteira HTTP", () => {
  const signal = new AbortController().signal;
  it("recusa falta de configuração antes de chamar a rede", async () => {
    const buscar = vi.fn<typeof fetch>();
    await expect(
      buscarAgenda(undefined, undefined, signal, buscar),
    ).rejects.toThrow("configuracao");
    expect(buscar).not.toHaveBeenCalled();
  });
  it("valida o JSON, propaga cancelamento e usa só chave pública", async () => {
    const buscar = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([evento])));
    expect(
      await buscarAgenda(
        "http://localhost:54321",
        "publica-teste",
        signal,
        buscar,
      ),
    ).toEqual([evento]);
    const [url, opcoes] = buscar.mock.calls[0]!;
    expect(String(url)).toContain("/rest/v1/eventos?");
    expect(opcoes).toMatchObject({
      signal,
      headers: { apikey: "publica-teste" },
    });
    expect(opcoes?.headers).not.toHaveProperty("authorization");
  });
  it("busca todas as páginas, não só a primeira", async () => {
    const buscar = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(Array(200).fill(evento))),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ ...evento, id: 201 }])),
      );
    expect(
      await buscarAgenda("https://exemplo.test", "publica", signal, buscar),
    ).toHaveLength(201);
    expect(String(buscar.mock.calls[1]![0])).toContain("offset=200");
  });
  it("erro em página posterior não entrega uma agenda parcial", async () => {
    const buscar = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(Array(200).fill(evento))),
      )
      .mockResolvedValueOnce(new Response("", { status: 500 }));
    await expect(
      buscarAgenda("https://exemplo.test", "publica", signal, buscar),
    ).rejects.toThrow("HTTP 500");
  });
  it.each([
    {},
    [{ ...evento, datas: [{ inicio: "inválido" }] }],
    [{ ...evento, id: "1" }],
  ])("recusa resposta inesperada", async (dados) => {
    const buscar = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(dados)));
    await expect(
      buscarAgenda("https://exemplo.test", "publica", signal, buscar),
    ).rejects.toThrow();
  });
  it("não aceita URL de imagem executável", () => {
    expect(
      EventoSchema.parse({ ...evento, imagem_url: "javascript:alert(1)" })
        .imagem_url,
    ).toBeNull();
  });
});

describe("favoritos", () => {
  it("salva e remove sem duplicação nem mutação", () => {
    const antes = ["outra:1"];
    const chave = chaveEvento(evento);
    const salvo = alternarFavorito(antes, chave);
    expect(antes).toEqual(["outra:1"]);
    expect(salvo).toEqual(["outra:1", "teste:1"]);
    expect(alternarFavorito(salvo, chave)).toEqual(antes);
  });
  it("identidade não depende do id do banco local", () => {
    expect(chaveEvento({ ...evento, id: 999 })).toBe(chaveEvento(evento));
    expect(chaveEvento({ ...evento, fonte: "outra" })).not.toBe(
      chaveEvento(evento),
    );
  });
  it.each([{}, [1], [null], [""]])(
    "recusa arquivo de favoritos inválido",
    (dados) => {
      expect(FavoritosSchema.safeParse(dados).success).toBe(false);
    },
  );
});
