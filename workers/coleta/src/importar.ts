// Importa a agenda do Mapa Cultural do Ceará para o Supabase: busca, normaliza e entrega o
// lote a public.importar_agenda, que grava tudo numa transação só.
import { buscarLinhas, FONTE, janela, normalizar } from "./mapaCultural.ts";

const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  throw new Error("defina SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente");
}

const periodo = janela();
const linhas = await buscarLinhas(periodo.primeiroDia, periodo.ultimoDia);
const { lote, rejeitadas } = normalizar(linhas, {
  de: periodo.de,
  ate: periodo.ate,
});
if (lote.eventos.length === 0) {
  throw new Error("nenhuma data válida na resposta da fonte");
}

const resposta = await fetch(new URL("/rest/v1/rpc/importar_agenda", url), {
  method: "POST",
  headers: {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    p_fonte: FONTE,
    p_lote:
      process.env.PERMITIR_REMOCAO_EM_MASSA === "true"
        ? { ...lote, permitir_remocao_em_massa: true }
        : lote,
  }),
  signal: AbortSignal.timeout(60_000),
});
const corpo = await resposta.text();
if (!resposta.ok) {
  throw new Error(`importar_agenda respondeu ${resposta.status}: ${corpo}`);
}

// Só contagens no log: nada de conteúdo da fonte nem de chave.
console.log(
  JSON.stringify({
    fonte: FONTE,
    janela: lote.janela,
    linhas: linhas.length,
    rejeitadas,
    resultado: JSON.parse(corpo),
  }),
);
