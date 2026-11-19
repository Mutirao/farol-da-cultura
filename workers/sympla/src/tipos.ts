// Contrato do parser, portado de raspagem-farol `src/connectors/types.ts`
// (commit c5bff68). Diferença deliberada: campo que a fonte não traz fica
// null, não string vazia nem `false` inventado.

/** Evento como a página da fonte o descreve, ainda sem normalização. */
export interface RawEvent {
  externalId: string;
  /** URL canônica do evento no Sympla; null se a página não a identifica. */
  sourceUrl: string | null;
  title: string;
  description: string | null;
  /** Texto de data/hora da fonte, ainda não convertido em instante. */
  startsAtRaw: string | null;
  endsAtRaw: string | null;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  /** Evidência positiva da fonte; ausência não prova evento presencial. */
  modalityEvidence: "in_person" | "online" | "unknown";
  /** Opções de pagamento como vieram; gratuidade não é inferida daqui. */
  priceRaw: unknown;
  avatarUrl: string | null;
  /** Endereço como veio da fonte (events.venue_raw). */
  venueRaw: unknown;
  /** Payload integral da fonte (events.raw_json). */
  raw: unknown;
}
