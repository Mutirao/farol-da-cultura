// Parser puro da página de evento do Sympla, portado de raspagem-farol
// `src/connectors/sympla.connector.ts` (commit c5bff68). Fica de fora tudo o
// que navega (listagem, Crawlee, Playwright): aqui só entra HTML já obtido.
// HTML da fonte é dado não confiável; nada dele é executado.
import type { RawEvent } from "./tipos.ts";

const ORIGEM = "https://www.sympla.com.br";

/** Aceita só URL de evento do Sympla e remove parâmetros de rastreio. */
export function canonicalEventUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl, ORIGEM);
    if (url.hostname !== "www.sympla.com.br" || url.protocol !== "https:") {
      return null;
    }
    if (!/^\/evento\/[a-z0-9-]+\/\d+\/?$/i.test(url.pathname)) return null;
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

/** `<link rel="canonical">` da página, se for URL de evento do Sympla. */
export function canonicalDaPagina(body: string): string | null {
  const link = body.match(
    /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/i,
  )?.[1];
  return link ? canonicalEventUrl(link) : null;
}

interface NextDataEvent {
  id?: number;
  name?: string;
  description?: string | null;
  detail?: string | null;
  startDate?: string;
  endDate?: string;
  startDateMultiFormat?: { ISO8601?: string } | null;
  endDateMultiFormat?: { ISO8601?: string } | null;
  eventsAddress?: {
    name?: string;
    address?: string;
    addressNum?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
  images?: { logoUrl?: string; logoLarge?: string } | null;
  logoUrl?: string | null;
  onlineInfo?: unknown;
  eventPaymentOptions?: unknown;
}

type Endereco = NonNullable<NextDataEvent["eventsAddress"]>;

function montarEndereco(addr: Endereco): string {
  return [
    addr.address,
    addr.addressNum,
    addr.neighborhood,
    addr.city,
    addr.state,
  ]
    .filter(
      (part) => part && String(part).trim() && String(part).trim() !== "s/n",
    )
    .join(", ");
}

function textoOuNull(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

/**
 * HTML da página de evento → dados da fonte. Hidratação ausente ou malformada
 * devolve null (nunca lança). `url` é a URL da página; só vira `sourceUrl` se
 * for URL canônica de evento do Sympla.
 */
export function parseEventPage(
  body: string,
  url: string | null,
): RawEvent | null {
  const match = body.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s,
  );
  if (!match?.[1]) return null;
  try {
    const parsed: unknown = JSON.parse(match[1]);
    const hydration = (
      parsed as {
        props?: {
          pageProps?: {
            hydrationData?: { eventHydration?: { event?: NextDataEvent } };
          };
        };
      }
    ).props?.pageProps?.hydrationData?.eventHydration?.event;
    if (!hydration?.id || !hydration.name) return null;

    const addr = hydration.eventsAddress ?? null;
    const text = `${hydration.name} ${addr?.name ?? ""} ${addr?.address ?? ""}`;
    const explicitlyOnline =
      hydration.onlineInfo != null ||
      /online|virtual|transmiss|remot/i.test(text);
    const modalityEvidence = explicitlyOnline
      ? "online"
      : addr?.name && addr.address && addr.city
        ? "in_person"
        : "unknown";

    return {
      externalId: String(hydration.id),
      sourceUrl: url ? canonicalEventUrl(url) : null,
      title: hydration.name,
      description: textoOuNull(hydration.detail ?? hydration.description),
      startsAtRaw: textoOuNull(
        hydration.startDateMultiFormat?.ISO8601 ?? hydration.startDate,
      ),
      endsAtRaw: textoOuNull(
        hydration.endDateMultiFormat?.ISO8601 ?? hydration.endDate,
      ),
      venueName: textoOuNull(addr?.name),
      venueAddress: addr ? textoOuNull(montarEndereco(addr)) : null,
      city: textoOuNull(addr?.city),
      modalityEvidence,
      priceRaw: hydration.eventPaymentOptions ?? null,
      avatarUrl: textoOuNull(hydration.images?.logoLarge ?? hydration.logoUrl),
      venueRaw: addr,
      raw: { event: hydration },
    };
  } catch {
    return null;
  }
}
