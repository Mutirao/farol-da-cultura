import { Temporal as TemporalAlternativo } from "@js-temporal/polyfill";
import { criarOperacaoInstancias } from "../../../workers/coleta/src/instancias.ts";
import { buscarLinhas } from "../../../workers/coleta/src/mapaCultural.ts";

// O Edge Runtime pode usar um V8 anterior ao do Node da coleta.
if (!globalThis.Temporal)
  Object.assign(globalThis, { Temporal: TemporalAlternativo });

// biome-ignore lint/suspicious/noUndeclaredEnvVars: injetada pelo Edge Runtime, fora do Turbo.
const url = Deno.env.get("SUPABASE_URL");
// biome-ignore lint/suspicious/noUndeclaredEnvVars: injetada pelo Edge Runtime, fora do Turbo.
const publica = Deno.env.get("SUPABASE_ANON_KEY");
// biome-ignore lint/suspicious/noUndeclaredEnvVars: injetada pelo Edge Runtime, fora do Turbo.
const servidor = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// biome-ignore lint/suspicious/noUndeclaredEnvVars: configurada pelo operador, fora do Turbo.
const sincronizacao = Deno.env.get("FAROL_SYNC_MANUAL") === "true";
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type, x-region",
  "access-control-allow-methods": "POST, OPTIONS",
  "cache-control": "no-store",
};

async function rpc(
  nome: string,
  apikey: string,
  authorization: string,
  body: object,
) {
  if (!url) throw new Error("Supabase não configurado");
  return fetch(new URL(`/rest/v1/rpc/${nome}`, url), {
    method: "POST",
    headers: { apikey, authorization, "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
}

const operar = criarOperacaoInstancias({
  sincronizacao,
  autorizar: async (sessao) => {
    if (!publica) throw new Error("Supabase não configurado");
    // O PostgREST valida assinatura/expiração. A RPC resolve o curador ativo
    // usando o JWT do usuário, nunca usando metadados enviados pelo painel.
    const resposta = await rpc("current_curator", publica, sessao, {});
    if (resposta.status === 401 || resposta.status === 403) return false;
    if (!resposta.ok) throw new Error("Autorização indisponível");
    return Number.isInteger(await resposta.json());
  },
  buscar: (de, ate) =>
    buscarLinhas(de, ate, {
      base: "",
      buscar: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(12_000) }),
      // Tentativas existentes do coletor, mas sem espera longa em requisição web.
      esperar: (ms) =>
        new Promise((resolve) => setTimeout(resolve, Math.min(ms, 1_000))),
    }),
  lerVersao: async () => {
    if (!servidor) throw new Error("Supabase não configurado");
    const resposta = await rpc(
      "versao_agenda_ce",
      servidor,
      `Bearer ${servidor}`,
      {},
    );
    if (!resposta.ok) throw new Error("Versão da agenda indisponível");
    const versao = await resposta.json();
    if (!Number.isSafeInteger(versao) || versao < 0)
      throw new Error("Versão da agenda inválida");
    return versao;
  },
  importar: async (fonte, lote) => {
    if (!servidor) throw new Error("Supabase não configurado");
    const resposta = await rpc(
      "importar_agenda",
      servidor,
      `Bearer ${servidor}`,
      { p_fonte: fonte, p_lote: lote },
    );
    if (resposta.status === 409 && (await resposta.json()).code === "PT409")
      return null;
    if (!resposta.ok) throw new Error("Importação recusada");
    return await resposta.json();
  },
});

function erro(status: number, codigo: string) {
  return Response.json({ erro: codigo }, { status, headers: cors });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return erro(405, "pedido_invalido");
  const sessao = request.headers.get("authorization");
  if (!sessao || !/^Bearer \S+$/i.test(sessao))
    return erro(401, "sessao_necessaria");

  // Comandos só carregam ação, id da instância e, no sync, revisão da prévia.
  const leitor = request.body?.getReader();
  if (!leitor) return erro(400, "pedido_invalido");
  const decoder = new TextDecoder();
  let tamanho = 0;
  let corpo = "";
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      tamanho += value.byteLength;
      if (tamanho > 2048) {
        await leitor.cancel();
        return erro(413, "pedido_invalido");
      }
      corpo += decoder.decode(value, { stream: true });
    }
    corpo += decoder.decode();
  } catch {
    return erro(400, "pedido_invalido");
  }
  let entrada: unknown;
  try {
    entrada = JSON.parse(corpo);
  } catch {
    return erro(400, "pedido_invalido");
  }
  try {
    const resultado = await operar(sessao, entrada);
    return Response.json(resultado.corpo, {
      status: resultado.status,
      headers: cors,
    });
  } catch {
    return erro(503, "painel_indisponivel");
  }
});
