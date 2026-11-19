// Política de recorte, portada de raspagem-farol `src/ingestion/filters.ts`
// (commit c5bff68). Só o que a classificação usa.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Janela de coleta: começa nos próximos 30 dias, `[agora, agora + 30d]`.
 * Ontem fica de fora; o limite do dia 30 é inclusivo.
 */
export function startsWithinNext30Days(
  now: Date,
  startsAt: Date | null,
): boolean {
  if (!startsAt) return false;
  const min = now.getTime();
  const max = now.getTime() + 30 * DAY_MS;
  const t = startsAt.getTime();
  return t >= min && t <= max;
}
