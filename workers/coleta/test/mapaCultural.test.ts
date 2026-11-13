import { describe, expect, it } from "vitest";
import {
  buscarLinhas,
  gratuito,
  janela,
  normalizar,
} from "../src/mapaCultural.ts";

const JANELA = { de: "2030-01-01T03:00:00Z", ate: "2030-03-05T03:00:00Z" };

// Linha no formato de /api/event/findOccurrences. O conteúdo é fictício.
function linha(mudancas: Record<string, unknown> = {}) {
  return {
    event_id: 10,
    occurrence_id: 77,
    starts_on: "2030-01-10",
    starts_at: "16:00:00",
    ends_at: "17:30:00",
    name: " Evento de teste ",
    shortDescription: " Curta ",
    longDescription: null,
    classificacaoEtaria: "Livre",
    terms: { tag: [], linguagem: ["Música", " Teatro ", "Música"] },
    "@files:avatar.avatarBig": {
      url: "https://mapacultural.secult.ce.gov.br/files/event/10/a.jpg",
    },
    rule: { spaceId: "5", duration: 90, price: "Gratuito ", frequency: "once" },
    space: {
      id: 5,
      name: "Espaço de teste",
      shortDescription: "Sala",
      endereco: "Rua A, 1",
      En_Municipio: "Fortaleza",
      acessibilidade_fisica: "Rampa de acesso; Elevador;",
      location: { latitude: "-3.72", longitude: "-38.52" },
    },
    ...mudancas,
  };
}

describe("normalizar", () => {
  it("transforma uma linha em evento, data e espaço", () => {
    expect(normalizar([linha()], JANELA)).toEqual({
      rejeitadas: {},
      lote: {
        janela: JANELA,
        espacos: [
          {
            id_externo: "5",
            nome: "Espaço de teste",
            descricao: "Sala",
            endereco: "Rua A, 1",
            municipio: "Fortaleza",
            latitude: -3.72,
            longitude: -38.52,
            acessibilidade_fisica: ["Rampa de acesso", "Elevador"],
          },
        ],
        eventos: [
          {
            id_externo: "10",
            nome: "Evento de teste",
            descricao_curta: "Curta",
            descricao_longa: null,
            classificacao_etaria: "Livre",
            imagem_url:
              "https://mapacultural.secult.ce.gov.br/files/event/10/a.jpg",
            categorias: ["Música", "Teatro"],
            datas: [
              {
                id_externo: "77.2030-01-10",
                espaco_id_externo: "5",
                // 16h em Fortaleza são 19h UTC; o fim vem da duração em minutos.
                inicio: "2030-01-10T19:00:00Z",
                fim: "2030-01-10T20:30:00Z",
                preco: "Gratuito",
                gratuito: true,
              },
            ],
          },
        ],
      },
    });
  });

  it("junta as datas do mesmo evento e não repete o espaço", () => {
    const { lote } = normalizar(
      [linha(), linha({ starts_on: "2030-01-17" })],
      JANELA,
    );
    expect(lote.eventos).toHaveLength(1);
    expect(lote.eventos[0]?.datas.map((data) => data.id_externo)).toEqual([
      "77.2030-01-10",
      "77.2030-01-17",
    ]);
    expect(lote.espacos).toHaveLength(1);
  });

  it("conta a linha ruim e segue com as boas", () => {
    const { lote, rejeitadas } = normalizar(
      [
        linha(),
        linha(),
        linha({ event_id: 11, name: "   " }),
        linha({ event_id: 12, starts_on: "2030-02-30" }),
        { qualquer: "coisa" },
        "<html>",
      ],
      JANELA,
    );
    expect(rejeitadas).toEqual({
      "data repetida": 1,
      "evento sem nome": 1,
      "data inválida": 1,
      "formato inesperado": 2,
    });
    expect(lote.eventos.map((evento) => evento.id_externo)).toEqual(["10"]);
    expect(lote.eventos[0]?.datas).toHaveLength(1);
  });

  it.each([
    [
      "0,0, que é como a fonte grava a falta",
      { latitude: "0", longitude: "0" },
    ],
    ["latitude fora da faixa", { latitude: "-91", longitude: "-38.5" }],
    ["texto que não é número", { latitude: "abc", longitude: "-38.5" }],
    ["localização ausente", null],
  ])("deixa o espaço sem coordenada com %s", (_caso, location) => {
    const { lote } = normalizar(
      [linha({ space: { ...linha().space, location } })],
      JANELA,
    );
    expect(lote.espacos[0]).toMatchObject({ latitude: null, longitude: null });
  });

  it("deixa a data sem espaço quando o espaço não tem nome", () => {
    const { lote } = normalizar(
      [linha({ space: { ...linha().space, name: " " } })],
      JANELA,
    );
    expect(lote.espacos).toEqual([]);
    expect(lote.eventos[0]?.datas[0]?.espaco_id_externo).toBeNull();
  });

  it("deixa a data sem fim quando a fonte não traz duração", () => {
    const semDuracao = normalizar([linha({ rule: { price: null } })], JANELA)
      .lote.eventos[0]?.datas[0];
    expect(semDuracao).toMatchObject({
      fim: null,
      preco: null,
      gratuito: null,
    });

    const duracaoZero = normalizar(
      [linha({ rule: { duration: 0, price: "Pago" } })],
      JANELA,
    ).lote.eventos[0]?.datas[0];
    expect(duracaoZero).toMatchObject({
      fim: "2030-01-10T19:00:00Z",
      gratuito: false,
    });
  });

  it("descarta imagem que não é https", () => {
    const { lote } = normalizar(
      [
        linha({
          "@files:avatar.avatarBig": { url: "http://exemplo.test/a.jpg" },
        }),
      ],
      JANELA,
    );
    expect(lote.eventos[0]?.imagem_url).toBeNull();
  });
});

describe("gratuito", () => {
  // Os sete primeiros são os valores que a fonte trazia em 12/11/2026.
  it.each([
    ["Gratuito", true],
    ["Gratuito ", true],
    ["É gratuita.", true],
    ["0", true],
    ["000", true],
    ["Pago", false],
    ["2750,00", false],
    ["0,00", true],
    ["R$ 20,00", false],
    ["R$ 10 (gratuito para estudantes)", null],
    ["A confirmar", null],
    [null, null],
  ])("lê %j como %j", (preco, esperado) => {
    expect(gratuito(preco)).toBe(esperado);
  });
});

describe("janela", () => {
  it("conta os dias no fuso de Fortaleza", () => {
    // 02h30 UTC de 1º de janeiro ainda é 31 de dezembro em Fortaleza.
    expect(janela(Temporal.Instant.from("2030-01-01T02:30:00Z"))).toEqual({
      primeiroDia: "2029-12-31",
      ultimoDia: "2030-03-03",
      de: "2029-12-31T03:00:00Z",
      ate: "2030-03-04T03:00:00Z",
    });
  });
});

describe("buscarLinhas", () => {
  // Devolve as respostas na ordem e guarda o que foi pedido e quanto se esperou.
  function fonteFalsa(...respostas: Response[]) {
    const pedidos: { url: URL; opcoes: RequestInit }[] = [];
    const esperas: number[] = [];
    return {
      pedidos,
      esperas,
      opcoes: {
        buscar: (async (url: URL, opcoes: RequestInit) => {
          pedidos.push({ url, opcoes });
          return respostas.shift() as Response;
        }) as typeof fetch,
        esperar: async (ms: number) => {
          esperas.push(ms);
        },
      },
    };
  }

  const json = (corpo: unknown) => new Response(JSON.stringify(corpo));

  it("pede a janela ao host fixo, sem seguir redirecionamento e com prazo", async () => {
    const fonte = fonteFalsa(json([linha()]));
    const linhas = await buscarLinhas("2030-01-01", "2030-03-04", fonte.opcoes);

    expect(linhas).toHaveLength(1);
    const { url, opcoes } = fonte.pedidos[0] ?? {};
    expect(url?.origin).toBe("https://mapacultural.secult.ce.gov.br");
    expect(url?.pathname).toBe("/api/event/findOccurrences");
    expect(url?.searchParams.get("@from")).toBe("2030-01-01");
    expect(url?.searchParams.get("@to")).toBe("2030-03-04");
    expect(opcoes?.redirect).toBe("error");
    expect(opcoes?.signal).toBeInstanceOf(AbortSignal);
  });

  it("respeita o Retry-After de um 429 e tenta de novo", async () => {
    const fonte = fonteFalsa(
      new Response("", { status: 429, headers: { "retry-after": "7" } }),
      json([]),
    );
    await expect(
      buscarLinhas("2030-01-01", "2030-03-04", fonte.opcoes),
    ).resolves.toEqual([]);
    expect(fonte.esperas).toEqual([7000]);
  });

  it("desiste depois de três falhas do servidor", async () => {
    const erro = () => new Response("", { status: 502 });
    const fonte = fonteFalsa(erro(), erro(), erro());
    await expect(
      buscarLinhas("2030-01-01", "2030-03-04", fonte.opcoes),
    ).rejects.toThrow("fonte respondeu 502");
    expect(fonte.esperas).toEqual([2000, 4000]);
  });

  it("não insiste em erro que não é transitório", async () => {
    const fonte = fonteFalsa(new Response("", { status: 404 }));
    await expect(
      buscarLinhas("2030-01-01", "2030-03-04", fonte.opcoes),
    ).rejects.toThrow("fonte respondeu 404");
    expect(fonte.pedidos).toHaveLength(1);
  });

  it.each([
    ["HTML no lugar de JSON", new Response("<html>Error</html>"), "não é JSON"],
    ["objeto no lugar de lista", json({ erro: true }), "não é uma lista"],
    [
      "corpo acima do limite",
      new Response("a".repeat(20 * 1024 * 1024 + 1)),
      "acima do limite",
    ],
  ])("recusa %s", async (_caso, resposta, mensagem) => {
    const fonte = fonteFalsa(resposta);
    await expect(
      buscarLinhas("2030-01-01", "2030-03-04", fonte.opcoes),
    ).rejects.toThrow(mensagem);
  });
});
