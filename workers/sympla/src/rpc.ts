// Cliente de public.registrar_coleta_minima via PostgREST, com fetch nativo.
// A chave de servidor só vai no cabeçalho; nunca em log ou mensagem de erro.
import { z } from "zod";
import type { EventoColetado } from "./lote.ts";

export const SOURCE_SLUG = "sympla";
/** Mesmo teto aplicado pela RPC. */
export const MAX_EVENTOS = 500;

const HOSTS_LOCAIS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** SUPABASE_URL aceita só https, ou http(s) em host local. */
export function resolverUrlSupabase(valor: string | undefined): URL {
  if (!valor || !URL.canParse(valor)) {
    throw new Error("SUPABASE_URL ausente ou inválida");
  }
  const url = new URL(valor);
  const local = HOSTS_LOCAIS.has(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error(
      "SUPABASE_URL recusada: só https, ou http em 127.0.0.1/localhost",
    );
  }
  return url;
}

const EventoResultado = z.object({
  external_id: z.string(),
  event_id: z.number().int(),
  acao: z.enum(["inserido", "atualizado", "inalterado"]),
  version: z.number().int(),
});

export const Resultado = z.object({
  run_key: z.uuid(),
  source_slug: z.string(),
  job_run_id: z.number().int(),
  recebidos: z.number().int(),
  inseridos: z.number().int(),
  atualizados: z.number().int(),
  inalterados: z.number().int(),
  eventos: z.array(EventoResultado),
});
export type Resultado = z.infer<typeof Resultado>;

export interface Envio {
  url: URL;
  chave: string;
  runKey: string;
  eventos: EventoColetado[];
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

/** Erro da RPC sem eco da requisição: só status, código e mensagem do banco. */
function descreverErro(status: number, corpo: string): string {
  try {
    const erro = JSON.parse(corpo) as { code?: unknown; message?: unknown };
    const code = typeof erro.code === "string" ? erro.code : "?";
    const message =
      typeof erro.message === "string" ? erro.message.slice(0, 300) : "";
    return `registrar_coleta_minima respondeu ${status} (${code}): ${message}`;
  } catch {
    return `registrar_coleta_minima respondeu ${status}`;
  }
}

/**
 * Entrega o lote. Reenviar com o mesmo `runKey` devolve o resultado gravado
 * na primeira vez, sem gravar de novo.
 */
export async function registrarColetaMinima(envio: Envio): Promise<Resultado> {
  if (envio.eventos.length === 0 || envio.eventos.length > MAX_EVENTOS) {
    throw new Error(`lote precisa ter de 1 a ${MAX_EVENTOS} eventos`);
  }
  const resposta = await (envio.fetch ?? globalThis.fetch)(
    new URL("/rest/v1/rpc/registrar_coleta_minima", envio.url),
    {
      method: "POST",
      headers: {
        apikey: envio.chave,
        authorization: `Bearer ${envio.chave}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_run_key: envio.runKey,
        p_source_slug: SOURCE_SLUG,
        p_eventos: envio.eventos,
      }),
      // Redirecionamento levaria a chave a outro destino: recusa.
      redirect: "error",
      signal: AbortSignal.timeout(envio.timeoutMs ?? 60_000),
    },
  );
  const corpo = await resposta.text();
  if (!resposta.ok) throw new Error(descreverErro(resposta.status, corpo));
  return Resultado.parse(JSON.parse(corpo));
}
