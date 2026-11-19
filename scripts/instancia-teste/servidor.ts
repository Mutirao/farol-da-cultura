// Instância de teste local de Mapas Culturais: stub HTTP sem dependências, só em 127.0.0.1.
// Serve o subconjunto da API que a sincronização (workers/coleta) e a confirmação usam.
// Não é uma instância real: prova acesso à API, não incorporação em instância de terceiro.
import { readFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Uma linha de /api/event/findOccurrences, no formato que workers/coleta valida. */
export interface LinhaOcorrencia {
  event_id: number;
  occurrence_id: number;
  starts_on: string;
  starts_at: string;
  name: string;
  rule: { duration?: number | null; price?: string | null } & Record<
    string,
    unknown
  >;
  space?: ({ id: number; name: string } & Record<string, unknown>) | null;
  [campo: string]: unknown;
}

export interface InstanciaTeste {
  /** Origem da instância, ex.: http://127.0.0.1:41234 (sem barra final). */
  url: string;
  porta: number;
  /** Inclui linhas; a mesma ocorrência no mesmo dia é substituída. */
  adicionar(...linhas: LinhaOcorrencia[]): void;
  /** Remove todas as linhas do evento e devolve quantas saíram. */
  remover(eventId: number): number;
  /** Cópia das linhas servidas agora. */
  linhas(): LinhaOcorrencia[];
  fechar(): Promise<void>;
}

const HOST = "127.0.0.1";
const DIA = /^\d{4}-\d{2}-\d{2}$/;
const ID_EQ = /^EQ\((\d+)\)$/;
const CAMPOS_DO_EVENTO = new Set([
  "id",
  "name",
  "shortDescription",
  "longDescription",
  "classificacaoEtaria",
  "terms",
]);
const CAMPOS_DA_OCORRENCIA = new Set(["id", "rule"]);

/** Lê as linhas de fixtures/ocorrencias.json (2 eventos, 3 ocorrências, 1 espaço). */
export async function carregarFixtures(): Promise<LinhaOcorrencia[]> {
  const caminho = join(import.meta.dirname, "fixtures", "ocorrencias.json");
  return JSON.parse(await readFile(caminho, "utf8")) as LinhaOcorrencia[];
}

const chave = (linha: LinhaOcorrencia) =>
  `${linha.occurrence_id}.${linha.starts_on}`;

const ordem = (a: LinhaOcorrencia, b: LinhaOcorrencia) =>
  `${a.starts_on}T${a.starts_at}`.localeCompare(
    `${b.starts_on}T${b.starts_at}`,
  );

/** Divide "@select" por vírgula fora de chaves: "id,occurrences.{id,rule}". */
function dividirSelect(select: string): string[] {
  const campos: string[] = [];
  let profundidade = 0;
  let atual = "";
  for (const caractere of select) {
    if (caractere === "{") profundidade++;
    if (caractere === "}") profundidade--;
    if (caractere === "," && profundidade === 0) {
      campos.push(atual.trim());
      atual = "";
    } else {
      atual += caractere;
    }
  }
  campos.push(atual.trim());
  return campos.filter(Boolean);
}

/** Regra da ocorrência como a API de leitura por ID devolve (startsOn, startsAt HH:MM, spaceId). */
function regra(linha: LinhaOcorrencia) {
  return {
    ...linha.rule,
    ...(linha.space ? { spaceId: String(linha.space.id) } : {}),
    startsOn: linha.starts_on,
    startsAt: linha.starts_at.slice(0, 5),
  };
}

function evento(linhasDoEvento: LinhaOcorrencia[], select: string) {
  const [primeira] = linhasDoEvento;
  if (!primeira) return null;
  const ocorrencias = new Map<number, LinhaOcorrencia>();
  for (const linha of linhasDoEvento) {
    if (!ocorrencias.has(linha.occurrence_id)) {
      ocorrencias.set(linha.occurrence_id, linha);
    }
  }
  const resultado: Record<string, unknown> = {};
  for (const campo of dividirSelect(select)) {
    if (campo === "id") {
      resultado.id = primeira.event_id;
    } else if (CAMPOS_DO_EVENTO.has(campo)) {
      resultado[campo] = primeira[campo] ?? null;
    } else if (campo === "occurrences") {
      resultado.occurrences = [...ocorrencias.keys()];
    } else {
      const sub = /^occurrences\.\{(.*)\}$/.exec(campo)?.[1];
      if (sub === undefined) continue;
      const subcampos = dividirSelect(sub).filter((nome) =>
        CAMPOS_DA_OCORRENCIA.has(nome),
      );
      resultado.occurrences = [...ocorrencias.values()].map((linha) =>
        Object.fromEntries(
          subcampos.map((nome) => [
            nome,
            nome === "id" ? linha.occurrence_id : regra(linha),
          ]),
        ),
      );
    }
  }
  return resultado;
}

function responder(resposta: ServerResponse, status: number, corpo: unknown) {
  resposta.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  resposta.end(JSON.stringify(corpo));
}

/**
 * Sobe a instância em 127.0.0.1. `porta: 0` (padrão) escolhe uma porta livre; `linhas`
 * (padrão: nenhuma) é o estado inicial — use `await carregarFixtures()` para as fixtures.
 */
export async function criarInstanciaTeste({
  porta = 0,
  linhas: iniciais = [],
}: {
  porta?: number;
  linhas?: LinhaOcorrencia[];
} = {}): Promise<InstanciaTeste> {
  const estado = new Map<string, LinhaOcorrencia>();
  const adicionar = (...novas: LinhaOcorrencia[]) => {
    for (const linha of novas) estado.set(chave(linha), structuredClone(linha));
  };
  adicionar(...iniciais);
  const atuais = () => [...estado.values()].sort(ordem);

  const tratar = (pedido: IncomingMessage, resposta: ServerResponse) => {
    if (pedido.method !== "GET") {
      responder(resposta, 405, { error: "método não suportado" });
      return;
    }
    const url = new URL(pedido.url ?? "/", `http://${HOST}`);
    const parametros = url.searchParams;

    if (url.pathname === "/api/event/findOccurrences") {
      const de = parametros.get("@from");
      const ate = parametros.get("@to");
      if ((de !== null && !DIA.test(de)) || (ate !== null && !DIA.test(ate))) {
        responder(resposta, 400, { error: "@from/@to devem ser YYYY-MM-DD" });
        return;
      }
      responder(
        resposta,
        200,
        atuais().filter(
          (linha) =>
            (de === null || linha.starts_on >= de) &&
            (ate === null || linha.starts_on <= ate),
        ),
      );
      return;
    }

    if (url.pathname === "/api/event/find") {
      const id = ID_EQ.exec(parametros.get("id") ?? "")?.[1];
      if (id === undefined) {
        responder(resposta, 400, { error: "use id=EQ(<número>)" });
        return;
      }
      const encontrado = evento(
        atuais().filter((linha) => linha.event_id === Number(id)),
        parametros.get("@select") ?? "id,name",
      );
      responder(resposta, 200, encontrado ? [encontrado] : []);
      return;
    }

    responder(resposta, 404, {
      error: "rota não existe na instância de teste",
    });
  };

  const servidor = createServer(tratar);
  await new Promise<void>((pronto, falha) => {
    servidor.once("error", falha);
    servidor.listen(porta, HOST, () => {
      servidor.off("error", falha);
      pronto();
    });
  });
  const endereco = servidor.address();
  if (endereco === null || typeof endereco === "string") {
    throw new Error("endereço da instância de teste indisponível");
  }

  return {
    url: `http://${HOST}:${endereco.port}`,
    porta: endereco.port,
    adicionar,
    remover(eventId) {
      let removidas = 0;
      for (const [id, linha] of estado) {
        if (linha.event_id === eventId) {
          estado.delete(id);
          removidas++;
        }
      }
      return removidas;
    },
    linhas: () => structuredClone(atuais()),
    fechar: () =>
      new Promise<void>((pronto, falha) => {
        servidor.close((erro) => (erro ? falha(erro) : pronto()));
        servidor.closeAllConnections();
      }),
  };
}

// CLI: node scripts/instancia-teste/servidor.ts [--porta N] — serve as fixtures (padrão 8787).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const indice = process.argv.indexOf("--porta");
  const porta = Number(indice >= 0 ? process.argv[indice + 1] : "8787");
  if (!Number.isInteger(porta) || porta < 0 || porta > 65_535) {
    throw new Error("porta inválida: use --porta 0..65535");
  }
  const instancia = await criarInstanciaTeste({
    porta,
    linhas: await carregarFixtures(),
  });
  console.log(
    JSON.stringify({ url: instancia.url, linhas: instancia.linhas().length }),
  );
  const encerrar = () => {
    instancia.fechar().then(() => process.exit(0));
  };
  process.once("SIGINT", encerrar);
  process.once("SIGTERM", encerrar);
}
