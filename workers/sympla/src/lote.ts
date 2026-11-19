// Normalização do evento interpretado para o lote de
// public.registrar_coleta_minima. Campo ausente ou ilegível vira issue e
// segue nulo: nada é preenchido por suposição.
import { classifyCollectedEvent } from "./classify.ts";
import {
  cleanText,
  normalizeForMatch,
  parseFortalezaDateTime,
} from "./normalize.ts";
import type { RawEvent } from "./tipos.ts";

/** Um elemento de `p_eventos`; nomes iguais às colunas de public.events. */
export interface EventoColetado {
  external_id: string;
  source_url: string | null;
  title: string;
  description: string | null;
  normalized_title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_raw: unknown;
  city: string | null;
  modality: "in_person" | "online" | "unknown";
  collection_status: "included" | "excluded" | "incomplete";
  collection_reason: string | null;
  price_raw: unknown;
  avatar_url: string | null;
  raw_json: unknown;
}

/**
 * Diagnóstico sem conteúdo da fonte: `origem` é o arquivo lido ou
 * `sympla:<id externo>`, `motivo` é um código fixo.
 */
export interface Issue {
  origem: string;
  etapa: "leitura" | "pagina" | "campo" | "duplicado";
  motivo: string;
}

function ouNull(texto: string): string | null {
  return texto ? texto : null;
}

/** Evento interpretado → elemento do lote + issues de campo. */
export function normalizarEvento(
  raw: RawEvent,
  agora: Date,
): { evento: EventoColetado | null; issues: Issue[] } {
  const origem = `sympla:${raw.externalId}`;
  const issues: Issue[] = [];
  const campo = (motivo: string) =>
    issues.push({ origem, etapa: "campo", motivo });

  const title = cleanText(raw.title);
  if (!title) {
    // Sem título não há linha a gravar (coluna obrigatória): página perdida.
    issues.push({ origem, etapa: "pagina", motivo: "title_ausente" });
    return { evento: null, issues };
  }
  const venueName = ouNull(cleanText(raw.venueName));
  const venueAddress = ouNull(cleanText(raw.venueAddress));
  const classificacao = classifyCollectedEvent(raw, agora);

  if (!raw.sourceUrl) campo("source_url_ausente");
  if (!raw.startsAtRaw) campo("starts_at_ausente");
  else if (!classificacao.startsAt) campo("starts_at_ilegivel");
  if (raw.endsAtRaw && !parseFortalezaDateTime(raw.endsAtRaw))
    campo("ends_at_ilegivel");
  if (!classificacao.city) campo("city_ausente");
  if (!venueName) campo("venue_name_ausente");
  if (!venueAddress) campo("venue_address_ausente");

  return {
    evento: {
      external_id: raw.externalId,
      source_url: raw.sourceUrl,
      title,
      description: ouNull(cleanText(raw.description)),
      normalized_title: ouNull(
        normalizeForMatch(`${title} ${venueName ?? ""}`),
      ),
      starts_at: classificacao.startsAt?.toISOString() ?? null,
      ends_at: classificacao.endsAt?.toISOString() ?? null,
      venue_name: venueName,
      venue_address: venueAddress,
      venue_raw: raw.venueRaw ?? null,
      city: ouNull(classificacao.city),
      modality: classificacao.modality,
      collection_status: classificacao.status,
      collection_reason: classificacao.reason,
      price_raw: raw.priceRaw ?? null,
      avatar_url: raw.avatarUrl,
      raw_json: raw.raw ?? {},
    },
    issues,
  };
}

/** Vários eventos → lote sem id externo repetido (o primeiro vence). */
export function montarLote(
  raws: RawEvent[],
  agora: Date,
): { eventos: EventoColetado[]; issues: Issue[] } {
  const eventos: EventoColetado[] = [];
  const issues: Issue[] = [];
  const vistos = new Set<string>();
  for (const raw of raws) {
    if (vistos.has(raw.externalId)) {
      issues.push({
        origem: `sympla:${raw.externalId}`,
        etapa: "duplicado",
        motivo: "external_id_repetido",
      });
      continue;
    }
    vistos.add(raw.externalId);
    const { evento, issues: doEvento } = normalizarEvento(raw, agora);
    issues.push(...doEvento);
    if (evento) eventos.push(evento);
  }
  return { eventos, issues };
}
