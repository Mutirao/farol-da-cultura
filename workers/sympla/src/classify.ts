// Classificação de recorte, portada de raspagem-farol
// `src/ingestion/classify.ts` (commit c5bff68). O piloto é Fortaleza; outra
// cidade exige contrato próprio (U2.7).
import { startsWithinNext30Days } from "./filters.ts";
import { cleanText, parseFortalezaDateTime } from "./normalize.ts";
import type { RawEvent } from "./tipos.ts";

export type CollectionStatus = "included" | "excluded" | "incomplete";
export type Modality = "in_person" | "online" | "unknown";

export interface Classification {
  status: CollectionStatus;
  reason: string | null;
  city: string;
  modality: Modality;
  startsAt: Date | null;
  endsAt: Date | null;
}

const ONLINE_RE = /online|virtual|transmiss|remot/i;
const FORTALEZA_RE = /^fortaleza(?:\s*[-/,]\s*ce)?$/i;

export function classifyCollectedEvent(
  raw: RawEvent,
  now: Date,
): Classification {
  const title = cleanText(raw.title);
  const cityFromSource = cleanText(raw.city);
  const venueName = cleanText(raw.venueName);
  const venueAddress = cleanText(raw.venueAddress);
  const city =
    cityFromSource ||
    (/(?:^|\W)fortaleza(?:\W|$)/i.test(venueAddress) ? "Fortaleza" : "");
  const startsAt = parseFortalezaDateTime(raw.startsAtRaw);
  const endsAt = raw.endsAtRaw ? parseFortalezaDateTime(raw.endsAtRaw) : null;
  const text = `${title} ${venueName} ${venueAddress}`;
  const modality: Modality =
    raw.modalityEvidence === "online" || ONLINE_RE.test(text)
      ? "online"
      : raw.modalityEvidence === "in_person" ||
          (venueName && venueAddress && city)
        ? "in_person"
        : "unknown";

  if (city && !FORTALEZA_RE.test(city)) {
    return {
      status: "excluded",
      reason: "other_city",
      city,
      modality,
      startsAt,
      endsAt,
    };
  }
  if (modality === "online") {
    return {
      status: "excluded",
      reason: "online",
      city,
      modality,
      startsAt,
      endsAt,
    };
  }
  if (startsAt && !startsWithinNext30Days(now, startsAt)) {
    return {
      status: "excluded",
      reason: "outside_window",
      city,
      modality,
      startsAt,
      endsAt,
    };
  }
  const missing = [
    !title ? "missing_title" : null,
    !startsAt ? "missing_start" : null,
    !city ? "missing_city" : null,
    modality === "unknown" ? "unknown_modality" : null,
  ].filter((part): part is string => !!part);
  if (missing.length > 0) {
    return {
      status: "incomplete",
      reason: missing.join(","),
      city,
      modality,
      startsAt,
      endsAt,
    };
  }
  return { status: "included", reason: null, city, modality, startsAt, endsAt };
}
