import type { SupabaseClient } from "@supabase/supabase-js";

// Contrato mínimo usado pelo painel. public.events tem mais colunas; o
// painel só depende das que exercita (lista, detalhe, exportação mínima).
export interface EventoColetado {
  id: number;
  version: number;
  title: string;
  external_id?: string | null;
  starts_at?: string | null;
  city?: string | null;
  collection_status?: string | null;
  curation_status: "pending" | "approved" | "rejected";
  [coluna: string]: unknown;
}

export type EstadoDoVinculo = "registrado" | "confirmado" | "divergente";

export interface EstadoVinculo {
  event_id: number;
  estado: EstadoDoVinculo;
  mapas_id: string;
  verificado_em: string | null;
}

export type StatusCuradoria = "approved" | "rejected";

// public.curar_evento(p_event_id, p_version, p_status): confere a version
// lida pelo painel (concorrência otimista). Nunca envia outros campos do
// evento. Ver supabase/migrations/20261117000700_curadoria_minima.sql.
export async function curarEvento(
  supabase: SupabaseClient,
  evento: { id: number; version: number },
  status: StatusCuradoria,
): Promise<unknown> {
  const { data, error } = await supabase.rpc("curar_evento", {
    p_event_id: evento.id,
    p_version: evento.version,
    p_status: status,
  });
  if (error) throw error;
  return data;
}

// public.registrar_incorporacao: contrato do S0.2. Só chamável depois do
// evento aprovado; o registro fica "registrado" até a confirmação (service
// role, fora do painel).
export async function registrarIncorporacao(
  supabase: SupabaseClient,
  destino: {
    eventId: number;
    instancia: string;
    base: string;
    mapasId: string;
  },
): Promise<unknown> {
  const { data, error } = await supabase.rpc("registrar_incorporacao", {
    p_event_id: destino.eventId,
    p_instancia: destino.instancia,
    p_base: destino.base,
    p_mapas_id: destino.mapasId,
  });
  if (error) throw error;
  return data;
}

export function filtrarAprovados(
  eventos: readonly EventoColetado[],
): EventoColetado[] {
  return eventos.filter((evento) => evento.curation_status === "approved");
}

// Exportação mínima: não é o CSV compatível com o Mapas Culturais (isso é
// trabalho de U4). Serve só para o curador levar uma lista dos aprovados.
const COLUNAS_EXPORTACAO = [
  "id",
  "external_id",
  "title",
  "starts_at",
  "city",
  "curation_status",
  "version",
] as const;

function escaparCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  if (/[",\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function gerarCsvAprovados(eventos: readonly EventoColetado[]): string {
  const aprovados = filtrarAprovados(eventos);
  const linhas = [COLUNAS_EXPORTACAO.join(",")];
  for (const evento of aprovados) {
    linhas.push(
      COLUNAS_EXPORTACAO.map((coluna) => escaparCsv(evento[coluna])).join(","),
    );
  }
  return linhas.join("\n");
}

export function gerarJsonAprovados(eventos: readonly EventoColetado[]): string {
  return JSON.stringify(filtrarAprovados(eventos), null, 2);
}
