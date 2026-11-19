import type { InstanciaOficial, PreviaOficial } from "./contratoInstancias.ts";
import { FONTE, janela, type Lote, normalizar } from "./mapaCultural.ts";

const ceara: InstanciaOficial = {
  id: FONTE,
  nome: "Mapa Cultural do Ceará",
  site: "https://mapacultural.secult.ce.gov.br",
  fuso: "America/Fortaleza",
};

// Ordena a estrutura que chega do Mapas, não o instante em que a busca foi feita.
async function revisaoDe(lote: Lote): Promise<string> {
  const ordenado = {
    janela: lote.janela,
    espacos: lote.espacos.toSorted((a, b) =>
      a.id_externo.localeCompare(b.id_externo),
    ),
    eventos: lote.eventos
      .map((e) => ({
        ...e,
        categorias: e.categorias.toSorted(),
        datas: e.datas.toSorted((a, b) =>
          a.id_externo.localeCompare(b.id_externo),
        ),
      }))
      .sort((a, b) => a.id_externo.localeCompare(b.id_externo)),
  };
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(ordenado)),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

type Resposta = { status: number; corpo: Record<string, unknown> };
const erro = (status: number, codigo: string): Resposta => ({
  status,
  corpo: { erro: codigo },
});

export function criarOperacaoInstancias({
  autorizar,
  buscar,
  lerVersao,
  importar,
  sincronizacao,
  agora = () => Temporal.Now.instant(),
}: {
  autorizar: (sessao: string) => Promise<boolean>;
  buscar: (de: string, ate: string) => Promise<unknown[]>;
  lerVersao: () => Promise<number>;
  importar: (
    fonte: string,
    lote: Lote & { versao_esperada: number },
  ) => Promise<unknown>;
  sincronizacao: boolean;
  agora?: () => Temporal.Instant;
}) {
  return async (sessao: string, entrada: unknown): Promise<Resposta> => {
    if (!sessao) return erro(401, "sessao_necessaria");
    const permitido = await autorizar(sessao);
    if (!permitido) return erro(403, "curador_necessario");
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
      return erro(400, "pedido_invalido");
    }
    const pedido = entrada as Record<string, unknown>;
    if (pedido.acao === "listar" && Object.keys(pedido).length === 1) {
      return { status: 200, corpo: { instancias: [ceara], sincronizacao } };
    }
    const sync = pedido.acao === "sincronizar";
    if (
      (pedido.acao !== "buscar" && !sync) ||
      pedido.instancia !== ceara.id ||
      Object.keys(pedido).some(
        (key) =>
          !["acao", "instancia", ...(sync ? ["revisao"] : [])].includes(key),
      ) ||
      (sync &&
        (typeof pedido.revisao !== "string" ||
          !/^[a-f0-9]{64}$/.test(pedido.revisao)))
    )
      return erro(400, "pedido_invalido");
    if (sync && !sincronizacao) return erro(403, "sincronizacao_desativada");

    // Ler antes da consulta remota. O banco confere a versão na transação da escrita.
    const versao = sync ? await lerVersao() : undefined;
    const { primeiroDia, ultimoDia, de, ate } = janela(agora());
    let linhas: unknown[];
    try {
      linhas = await buscar(primeiroDia, ultimoDia);
    } catch {
      return erro(502, "instancia_indisponivel");
    }
    const { lote, rejeitadas } = normalizar(
      linhas,
      { de, ate },
      { somenteJanela: true },
    );
    const totalRejeitadas = Object.values(rejeitadas).reduce(
      (a, b) => a + b,
      0,
    );
    const espacos = new Map(lote.espacos.map((e) => [e.id_externo, e]));
    const datas = lote.eventos.flatMap((e) => e.datas);

    const revisao = await revisaoDe(lote);
    const sincronizavel =
      sincronizacao && datas.length > 0 && totalRejeitadas === 0;
    if (versao !== undefined) {
      if (pedido.revisao !== revisao) return erro(409, "previa_desatualizada");
      if (!sincronizavel) return erro(422, "lote_inseguro");
      if (!(await autorizar(sessao))) return erro(403, "curador_necessario");
      try {
        const resultado = await importar(ceara.id, {
          ...lote,
          versao_esperada: versao,
        });
        if (resultado === null) return erro(409, "agenda_alterada");
        return { status: 200, corpo: { resultado } };
      } catch {
        return erro(502, "importacao_recusada");
      }
    }
    const eventos = lote.eventos
      .map((e) => {
        const primeira = e.datas.reduce((a, b) =>
          Date.parse(a.inicio) <= Date.parse(b.inicio) ? a : b,
        );
        return {
          id: e.id_externo,
          nome: e.nome,
          inicio: primeira.inicio,
          municipio:
            espacos.get(primeira.espaco_id_externo ?? "")?.municipio ?? null,
          ocorrencias: e.datas.length,
        };
      })
      .sort(
        (a, b) =>
          Date.parse(a.inicio) - Date.parse(b.inicio) ||
          a.id.localeCompare(b.id),
      );
    const previa: PreviaOficial = {
      de: primeiroDia,
      ate: ultimoDia,
      totalEventos: eventos.length,
      ocorrencias: datas.length,
      rejeitadas: totalRejeitadas,
      eventos: eventos.slice(0, 50),
      revisao,
      sincronizavel,
    };
    return { status: 200, corpo: previa };
  };
}
