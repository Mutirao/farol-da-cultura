import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalDaPagina,
  canonicalEventUrl,
  parseEventPage,
} from "../src/sympla.ts";

// HTML sintético com a mesma estrutura de hidratação usada no piloto.
const eventHtml = readFileSync(
  join(import.meta.dirname, "fixtures/sympla-event.html"),
  "utf-8",
);
const URL_EVENTO = "https://www.sympla.com.br/evento/encontro-de-teste/9000001";

function pagina(nextData: string): string {
  return `<script id="__NEXT_DATA__" type="application/json">${nextData}</script>`;
}

describe("parseEventPage (__NEXT_DATA__ → RawEvent)", () => {
  it("interpreta a página sintética da fixture", () => {
    const ev = parseEventPage(eventHtml, URL_EVENTO);
    expect(ev).not.toBeNull();
    expect(ev?.externalId).toBe("9000001");
    expect(ev?.title).toBe("ENCONTRO DE TESTE");
    expect(ev?.startsAtRaw).toBe("2026-09-19T17:30:00-03:00");
    expect(ev?.endsAtRaw).toBe("2026-09-19T22:30:00-03:00");
    expect(ev?.sourceUrl).toBe(URL_EVENTO);
    expect(ev?.city).toBe("Jijoca de Jericoacoara");
    expect(ev?.venueName).toBe("Espaço de Teste");
    expect(ev?.modalityEvidence).toBe("in_person");
    expect(ev?.avatarUrl).toBe("https://imagem.invalid/evento.jpg");
    // Payload preservado sem alteração.
    expect(ev?.raw).toMatchObject({ event: { id: 9000001 } });
  });

  it("não inventa gratuidade nem preço", () => {
    const ev = parseEventPage(eventHtml, URL_EVENTO);
    expect(ev).not.toHaveProperty("isFree");
    expect(ev).not.toHaveProperty("priceMin");
  });

  it("devolve null sem __NEXT_DATA__, em vez de lançar", () => {
    expect(
      parseEventPage("<html><body>quebrada</body></html>", URL_EVENTO),
    ).toBeNull();
  });

  it("devolve null com JSON malformado", () => {
    expect(parseEventPage(pagina("{não é json"), URL_EVENTO)).toBeNull();
  });

  it("devolve null quando falta o evento na hidratação", () => {
    expect(
      parseEventPage(
        pagina('{"props":{"pageProps":{"hydrationData":{}}}}'),
        URL_EVENTO,
      ),
    ).toBeNull();
  });

  it("campo ausente fica null, não string vazia", () => {
    const ev = parseEventPage(
      pagina(
        JSON.stringify({
          props: {
            pageProps: {
              hydrationData: {
                eventHydration: { event: { id: 7, name: "Só nome" } },
              },
            },
          },
        }),
      ),
      null,
    );
    expect(ev).toMatchObject({
      externalId: "7",
      sourceUrl: null,
      startsAtRaw: null,
      endsAtRaw: null,
      city: null,
      venueName: null,
      venueAddress: null,
      description: null,
      avatarUrl: null,
      modalityEvidence: "unknown",
    });
  });

  it("onlineInfo presente é evidência de evento online", () => {
    const ev = parseEventPage(
      pagina(
        JSON.stringify({
          props: {
            pageProps: {
              hydrationData: {
                eventHydration: {
                  event: { id: 8, name: "Live", onlineInfo: {} },
                },
              },
            },
          },
        }),
      ),
      null,
    );
    expect(ev?.modalityEvidence).toBe("online");
  });
});

describe("canonicalEventUrl / canonicalDaPagina", () => {
  it("remove rastreio e barra final", () => {
    expect(canonicalEventUrl(`${URL_EVENTO}/?utm_source=x`)).toBe(URL_EVENTO);
  });

  it("recusa outro host, http e caminho que não é de evento", () => {
    expect(canonicalEventUrl("https://evil.example/evento/a/1")).toBeNull();
    expect(canonicalEventUrl("http://www.sympla.com.br/evento/a/1")).toBeNull();
    expect(
      canonicalEventUrl("https://www.sympla.com.br/eventos/fortaleza-ce"),
    ).toBeNull();
    expect(canonicalEventUrl("javascript:alert(1)")).toBeNull();
  });

  it("lê o link canônico da fixture", () => {
    expect(canonicalDaPagina(eventHtml)).toBe(URL_EVENTO);
    expect(
      canonicalDaPagina(
        '<link rel="canonical" href="https://evil.example/x"/>',
      ),
    ).toBeNull();
    expect(canonicalDaPagina("<html></html>")).toBeNull();
  });
});
