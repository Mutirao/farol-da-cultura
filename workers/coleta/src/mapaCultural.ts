import { z } from "zod";

/** Identificador da fonte gravado em cada registro (proveniência). */
export const FONTE = "mapa-cultural-ce";

const BASE = "https://mapacultural.secult.ce.gov.br";
const FUSO = "America/Fortaleza";
// Alcança o maior filtro de período do app ("próximo mês"), contado a partir do dia 1.
const DIAS_DA_JANELA = 62;
const LIMITE_DE_BYTES = 20 * 1024 * 1024;
const TENTATIVAS = 3;
const AGENTE =
  "farol-da-cultura-coleta (+https://github.com/Mutirao/farol-da-cultura)";

// Só o que o importador usa de cada linha de /api/event/findOccurrences.
const numeroOuTexto = z.union([z.number(), z.string()]);
const Linha = z.object({
  event_id: z.number().int(),
  occurrence_id: z.number().int(),
  starts_on: z.string(),
  starts_at: z.string(),
  name: z.string(),
  shortDescription: z.string().nullish(),
  longDescription: z.string().nullish(),
  classificacaoEtaria: z.string().nullish(),
  terms: z.object({ linguagem: z.array(z.string()).nullish() }).nullish(),
  "@files:avatar.avatarBig": z.object({ url: z.string() }).nullish(),
  rule: z.object({
    duration: z.number().nullish(),
    price: z.string().nullish(),
  }),
  space: z
    .object({
      id: z.number().int(),
      name: z.string(),
      shortDescription: z.string().nullish(),
      endereco: z.string().nullish(),
      En_Municipio: z.string().nullish(),
      acessibilidade_fisica: z.string().nullish(),
      location: z
        .object({ latitude: numeroOuTexto, longitude: numeroOuTexto })
        .nullish(),
    })
    .nullish(),
});

type Espaco = {
  id_externo: string;
  nome: string;
  descricao: string | null;
  endereco: string | null;
  municipio: string | null;
  latitude: number | null;
  longitude: number | null;
  acessibilidade_fisica: string[];
};

type Data = {
  id_externo: string;
  espaco_id_externo: string | null;
  inicio: string;
  fim: string | null;
  preco: string | null;
  gratuito: boolean | null;
};

type Evento = {
  id_externo: string;
  nome: string;
  descricao_curta: string | null;
  descricao_longa: string | null;
  classificacao_etaria: string | null;
  imagem_url: string | null;
  categorias: string[];
  datas: Data[];
};

/** O que public.importar_agenda recebe em p_lote. */
export type Lote = {
  janela: { de: string; ate: string };
  espacos: Espaco[];
  eventos: Evento[];
};

/** Janela em dias inteiros de Fortaleza: a fonte recebe os dias, o banco recebe [de, ate). */
export function janela(agora: Temporal.Instant = Temporal.Now.instant()) {
  const hoje = agora.toZonedDateTimeISO(FUSO).toPlainDate();
  const ultimoDia = hoje.add({ days: DIAS_DA_JANELA });
  return {
    primeiroDia: hoje.toString(),
    ultimoDia: ultimoDia.toString(),
    de: hoje.toZonedDateTime(FUSO).toInstant().toString(),
    ate: ultimoDia
      .add({ days: 1 })
      .toZonedDateTime(FUSO)
      .toInstant()
      .toString(),
  };
}

async function lerComLimite(resposta: Response): Promise<string> {
  const partes: Uint8Array[] = [];
  let total = 0;
  for await (const parte of resposta.body ?? []) {
    total += parte.byteLength;
    if (total > LIMITE_DE_BYTES) {
      throw new Error("resposta da fonte acima do limite de tamanho");
    }
    partes.push(parte);
  }
  return Buffer.concat(partes).toString("utf8");
}

/**
 * Busca todas as ocorrências entre os dois dias, inclusive. Qualquer falha lança: lote
 * incompleto não pode chegar ao banco, porque lá a ausência de uma data significa remoção.
 */
export async function buscarLinhas(
  primeiroDia: string,
  ultimoDia: string,
  {
    buscar = fetch,
    esperar = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms)),
  } = {},
): Promise<unknown[]> {
  // shortcut: uma requisição só, sem paginar. Em 12/11/2026 a API devolveu 264 linhas para
  // 90 dias sem impor limite. Paginar se a janela passar de alguns milhares de linhas.
  const url = new URL("/api/event/findOccurrences", BASE);
  url.search = new URLSearchParams({
    "@from": primeiroDia,
    "@to": ultimoDia,
    "@select":
      "id,name,shortDescription,longDescription,classificacaoEtaria,terms",
    "@files": "(avatar.avatarBig):url",
    "space:@select":
      "id,name,shortDescription,location,endereco,En_Municipio,acessibilidade_fisica",
  }).toString();

  for (let tentativa = 1; ; tentativa++) {
    // redirect "error": a coleta só fala com o host fixo acima.
    const resposta = await buscar(url, {
      redirect: "error",
      signal: AbortSignal.timeout(60_000),
      headers: { accept: "application/json", "user-agent": AGENTE },
    });

    if (resposta.ok) {
      const texto = await lerComLimite(resposta);
      let corpo: unknown;
      try {
        corpo = JSON.parse(texto);
      } catch {
        throw new Error("resposta da fonte não é JSON");
      }
      if (!Array.isArray(corpo)) {
        throw new Error("resposta da fonte não é uma lista");
      }
      return corpo;
    }

    const transitorio = resposta.status === 429 || resposta.status >= 500;
    if (!transitorio || tentativa === TENTATIVAS) {
      throw new Error(`fonte respondeu ${resposta.status}`);
    }
    const pedido = Number(resposta.headers.get("retry-after"));
    await esperar(
      Math.min(
        60_000,
        pedido > 0 ? pedido * 1000 : 2000 * 2 ** (tentativa - 1),
      ),
    );
  }
}

const texto = (valor: string | null | undefined) => valor?.trim() || null;

const lista = (itens: string[] | null | undefined) => [
  ...new Set((itens ?? []).map((item) => item.trim()).filter(Boolean)),
];

/**
 * Lê o preço em texto livre da fonte. Na dúvida devolve null: marcar como gratuito um evento
 * pago é pior do que deixá-lo fora do filtro "gratuito".
 */
export function gratuito(preco: string | null): boolean | null {
  if (preco === null) return null;
  if (/^0+([.,]0+)?$/.test(preco)) return true;
  const dizGratuito = /gratuit/i.test(preco);
  const dizPago = /\bpag[oa]/i.test(preco) || /[1-9]/.test(preco);
  if (dizGratuito && !dizPago) return true;
  if (dizPago && !dizGratuito) return false;
  return null;
}

function coordenadas(
  local:
    | { latitude: number | string; longitude: number | string }
    | null
    | undefined,
) {
  const latitude = Number(local?.latitude);
  const longitude = Number(local?.longitude);
  // A fonte grava 0,0 quando o espaço não tem localização.
  const valida =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  return valida ? { latitude, longitude } : { latitude: null, longitude: null };
}

const urlHttps = (valor: string | null | undefined) =>
  valor && URL.canParse(valor) && new URL(valor).protocol === "https:"
    ? valor
    : null;

/**
 * Transforma as linhas da fonte no lote do banco. Linha ruim é contada em `rejeitadas` e
 * fica de fora; as boas seguem.
 */
export function normalizar(
  linhas: unknown[],
  janelaDoLote: Lote["janela"],
): { lote: Lote; rejeitadas: Record<string, number> } {
  const espacos = new Map<string, Espaco>();
  const eventos = new Map<string, Evento>();
  const rejeitadas: Record<string, number> = {};
  const rejeitar = (motivo: string) => {
    rejeitadas[motivo] = (rejeitadas[motivo] ?? 0) + 1;
  };

  for (const bruta of linhas) {
    const lida = Linha.safeParse(bruta);
    if (!lida.success) {
      rejeitar("formato inesperado");
      continue;
    }
    const linha = lida.data;

    const nome = texto(linha.name);
    if (!nome) {
      rejeitar("evento sem nome");
      continue;
    }

    let inicio: Temporal.Instant;
    try {
      inicio = Temporal.PlainDateTime.from(
        `${linha.starts_on}T${linha.starts_at}`,
      )
        .toZonedDateTime(FUSO)
        .toInstant();
    } catch {
      rejeitar("data inválida");
      continue;
    }

    const eventoId = String(linha.event_id);
    const dataId = `${linha.occurrence_id}.${linha.starts_on}`;
    let evento = eventos.get(eventoId);
    if (evento?.datas.some((data) => data.id_externo === dataId)) {
      rejeitar("data repetida");
      continue;
    }
    if (!evento) {
      evento = {
        id_externo: eventoId,
        nome,
        descricao_curta: texto(linha.shortDescription),
        descricao_longa: texto(linha.longDescription),
        classificacao_etaria: texto(linha.classificacaoEtaria),
        imagem_url: urlHttps(linha["@files:avatar.avatarBig"]?.url),
        categorias: lista(linha.terms?.linguagem),
        datas: [],
      };
      eventos.set(eventoId, evento);
    }

    // Espaço sem nome não entra; a data fica sem espaço em vez de sumir.
    const nomeDoEspaco = texto(linha.space?.name);
    let espacoId: string | null = null;
    if (linha.space && nomeDoEspaco) {
      espacoId = String(linha.space.id);
      espacos.set(espacoId, {
        id_externo: espacoId,
        nome: nomeDoEspaco,
        descricao: texto(linha.space.shortDescription),
        endereco: texto(linha.space.endereco),
        municipio: texto(linha.space.En_Municipio),
        ...coordenadas(linha.space.location),
        acessibilidade_fisica: lista(
          linha.space.acessibilidade_fisica?.split(";"),
        ),
      });
    }

    const minutos = linha.rule.duration;
    const preco = texto(linha.rule.price);
    evento.datas.push({
      id_externo: dataId,
      espaco_id_externo: espacoId,
      inicio: inicio.toString(),
      fim:
        typeof minutos === "number" && Number.isInteger(minutos) && minutos >= 0
          ? inicio.add({ minutes: minutos }).toString()
          : null,
      preco,
      gratuito: gratuito(preco),
    });
  }

  return {
    lote: {
      janela: janelaDoLote,
      espacos: [...espacos.values()],
      eventos: [...eventos.values()],
    },
    rejeitadas,
  };
}
