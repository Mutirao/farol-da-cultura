import type { RawEvent } from "../src/tipos.ts";

/** Evento interpretado mínimo e completo; o conteúdo é fictício. */
export function evento(mudancas: Partial<RawEvent> = {}): RawEvent {
  return {
    externalId: "1",
    sourceUrl: "https://www.sympla.com.br/evento/show/1",
    title: "Show no teatro",
    description: null,
    startsAtRaw: "2026-09-20T19:00:00-03:00",
    endsAtRaw: null,
    venueName: "Teatro São José",
    venueAddress: "Rua Rufino de Alencar, Fortaleza, CE",
    city: "Fortaleza",
    modalityEvidence: "in_person",
    priceRaw: null,
    avatarUrl: null,
    venueRaw: null,
    raw: {},
    ...mudancas,
  };
}
