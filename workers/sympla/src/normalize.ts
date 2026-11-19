// Normalização pura, portada de raspagem-farol `src/ingestion/normalize.ts`
// (commit c5bff68). Diferença deliberada: hora de parede sem fuso é
// interpretada no fuso IANA America/Fortaleza via Temporal, não por um
// deslocamento fixo de -03:00 nem pelo fuso do servidor.

export const FUSO = "America/Fortaleza";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Remove tags, decodifica entidades básicas e colapsa espaços. */
export function cleanText(input: string | null | undefined): string {
  if (!input) return "";
  const withoutTags = input.replace(/<[^>]*>/g, " ");
  const decoded = withoutTags.replace(
    /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
  return decoded.replace(/\s+/g, " ").trim();
}

const STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "a",
  "o",
  "as",
  "os",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "ao",
  "aos",
  "of",
  "the",
  "and",
]);

/**
 * Forma determinística de comparação: minúsculas, sem acento, sem palavras de
 * ligação e com espaços colapsados (`events.normalized_title`).
 */
export function normalizeForMatch(input: string | null | undefined): string {
  if (!input) return "";
  const stripped = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return stripped
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOPWORDS.has(token))
    .join(" ");
}

const MONTHS_PT: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

/** Hora de parede em Fortaleza → instante; componente inválido → null. */
function horaDeFortaleza(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): Date | null {
  if (year < 1000 || year > 9999) return null;
  try {
    const instante = Temporal.PlainDateTime.from(
      { year, month, day, hour, minute, second },
      { overflow: "reject" },
    ).toZonedDateTime(FUSO, { disambiguation: "reject" });
    return new Date(instante.epochMilliseconds);
  } catch {
    return null;
  }
}

/**
 * Formas de data/hora observadas na fonte → instante absoluto:
 *   - ISO 8601 com deslocamento explícito (`2026-09-09T03:00:00-03:00`)
 *   - `YYYY-MM-DD HH:mm[:ss]` (`__NEXT_DATA__` do Sympla)
 *   - `DD/MM/YYYY [HH:mm|HHhMM|HHh]`
 *   - por extenso: `20 de outubro de 2026 [às 19h30|19h]`
 * Sem deslocamento, vale a hora de parede de America/Fortaleza.
 * Entrada que não se encaixa → null (nunca lança).
 */
export function parseFortalezaDateTime(
  raw: string | null | undefined,
): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;

  // 1) ISO 8601 com deslocamento ou Z: já é um instante absoluto.
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/.test(
      text,
    )
  ) {
    const date = new Date(text.replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // 2) `YYYY-MM-DD HH:mm[:ss]` sem deslocamento.
  const iso = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (iso) {
    const [, y, mo, d, h, mi, s] = iso;
    return horaDeFortaleza(
      Number(y),
      Number(mo),
      Number(d),
      Number(h),
      Number(mi),
      Number(s ?? "0"),
    );
  }

  // 3) `DD/MM/YYYY` com ` HH:mm`, ` HHhMM` ou ` HHh` opcionais.
  const slash = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{2})|h(\d{2})?|h)?)?$/i,
  );
  if (slash) {
    const [, d, mo, y, h, miColon, miH] = slash;
    return horaDeFortaleza(
      Number(y),
      Number(mo),
      Number(d),
      Number(h ?? "0"),
      Number(miColon ?? miH ?? "0"),
    );
  }

  // 4) Por extenso: `20 de outubro de 2026` + `às 19h30` / `19h` opcionais.
  const longForm = text.match(
    /^(\d{1,2})\s+de\s+([a-zçà]+)\s+de\s+(\d{4})(?:\s+(?:às|@)?\s*(\d{1,2})h(\d{2})?)?$/i,
  );
  if (longForm) {
    const [, d, monthName, y, h, mi] = longForm;
    const month = MONTHS_PT[(monthName ?? "").toLowerCase()];
    if (month === undefined) return null;
    return horaDeFortaleza(
      Number(y),
      month,
      Number(d),
      Number(h ?? "0"),
      Number(mi ?? "0"),
    );
  }

  return null;
}
