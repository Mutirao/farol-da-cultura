import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { montarLote, normalizarEvento } from "../src/lote.ts";
import { parseEventPage } from "../src/sympla.ts";
import { evento } from "./evento.ts";

const NOW = new Date("2026-09-17T12:00:00Z");
const eventHtml = readFileSync(
  join(import.meta.dirname, "fixtures/sympla-event.html"),
  "utf-8",
);

describe("normalizarEvento", () => {
  it("fixture sintética: instante absoluto, cidade da fonte e recorte explícito", () => {
    const raw = parseEventPage(
      eventHtml,
      "https://www.sympla.com.br/evento/encontro-de-teste/9000001",
    );
    if (!raw) throw new Error("fixture não interpretada");
    const { evento: e, issues } = normalizarEvento(raw, NOW);
    expect(e).toMatchObject({
      external_id: "9000001",
      title: "ENCONTRO DE TESTE",
      starts_at: "2026-09-19T20:30:00.000Z",
      ends_at: "2026-09-20T01:30:00.000Z",
      city: "Jijoca de Jericoacoara",
      venue_name: "Espaço de Teste",
      modality: "in_person",
      collection_status: "excluded",
      collection_reason: "other_city",
      normalized_title: "encontro teste espaco teste",
    });
    expect(e?.venue_address).toContain("Rua de Teste");
    expect(e?.raw_json).toMatchObject({ event: { id: 9000001 } });
    expect(issues).toEqual([]);
    expect(Object.keys(e ?? {})).not.toContain("is_free");
  });

  it("evento completo de Fortaleza na janela entra included sem issues", () => {
    const { evento: e, issues } = normalizarEvento(evento(), NOW);
    expect(e?.collection_status).toBe("included");
    expect(e?.starts_at).toBe("2026-09-20T22:00:00.000Z");
    expect(issues).toEqual([]);
  });

  it("campo ausente vira issue e segue nulo, sem valor inventado", () => {
    const { evento: e, issues } = normalizarEvento(
      evento({
        externalId: "9",
        sourceUrl: null,
        startsAtRaw: null,
        city: null,
        venueName: null,
        venueAddress: null,
      }),
      NOW,
    );
    expect(e).toMatchObject({
      source_url: null,
      starts_at: null,
      city: null,
      venue_name: null,
      venue_address: null,
      collection_status: "incomplete",
    });
    expect(issues.map((i) => i.motivo).sort()).toEqual([
      "city_ausente",
      "source_url_ausente",
      "starts_at_ausente",
      "venue_address_ausente",
      "venue_name_ausente",
    ]);
    expect(
      issues.every((i) => i.origem === "sympla:9" && i.etapa === "campo"),
    ).toBe(true);
  });

  it("data ilegível é issue própria, não data deslocada", () => {
    const { evento: e, issues } = normalizarEvento(
      evento({ startsAtRaw: "em breve", endsAtRaw: "depois" }),
      NOW,
    );
    expect(e?.starts_at).toBeNull();
    expect(e?.ends_at).toBeNull();
    expect(issues.map((i) => i.motivo)).toEqual([
      "starts_at_ilegivel",
      "ends_at_ilegivel",
    ]);
  });

  it("título que some na limpeza não vira linha", () => {
    const { evento: e, issues } = normalizarEvento(
      evento({ title: "<b> </b>" }),
      NOW,
    );
    expect(e).toBeNull();
    expect(issues).toEqual([
      { origem: "sympla:1", etapa: "pagina", motivo: "title_ausente" },
    ]);
  });

  it("issues não carregam conteúdo da fonte", () => {
    const { issues } = normalizarEvento(
      evento({ title: "Segredo no título", city: null }),
      NOW,
    );
    expect(JSON.stringify(issues)).not.toContain("Segredo");
  });
});

describe("montarLote", () => {
  it("id externo repetido entra uma vez e vira issue", () => {
    const { eventos, issues } = montarLote(
      [
        evento({ externalId: "1" }),
        evento({ externalId: "1", title: "Outro" }),
        evento({ externalId: "2" }),
      ],
      NOW,
    );
    expect(eventos.map((e) => [e.external_id, e.title])).toEqual([
      ["1", "Show no teatro"],
      ["2", "Show no teatro"],
    ]);
    expect(issues).toEqual([
      {
        origem: "sympla:1",
        etapa: "duplicado",
        motivo: "external_id_repetido",
      },
    ]);
  });
});
