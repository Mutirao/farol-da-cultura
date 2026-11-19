import { describe, expect, it } from "vitest";
import { classifyCollectedEvent } from "../src/classify.ts";
import { startsWithinNext30Days } from "../src/filters.ts";
import { evento } from "./evento.ts";

const NOW = new Date("2026-09-17T12:00:00Z");

describe("classifyCollectedEvent", () => {
  it("inclui evento presencial em Fortaleza dentro da janela de 30 dias", () => {
    expect(classifyCollectedEvent(evento(), NOW)).toMatchObject({
      status: "included",
      reason: null,
      city: "Fortaleza",
      modality: "in_person",
    });
  });

  it("exclusões conhecidas trazem motivo explícito", () => {
    expect(
      classifyCollectedEvent(evento({ city: "Eusébio" }), NOW),
    ).toMatchObject({
      status: "excluded",
      reason: "other_city",
    });
    expect(
      classifyCollectedEvent(evento({ title: "Show online" }), NOW),
    ).toMatchObject({
      status: "excluded",
      reason: "online",
    });
    expect(
      classifyCollectedEvent(
        evento({ startsAtRaw: "2026-11-01T19:00:00-03:00" }),
        NOW,
      ),
    ).toMatchObject({ status: "excluded", reason: "outside_window" });
  });

  it("evidência ausente ou ambígua é incomplete, não excluded", () => {
    expect(
      classifyCollectedEvent(evento({ startsAtRaw: null }), NOW),
    ).toMatchObject({
      status: "incomplete",
      reason: "missing_start",
    });
    expect(
      classifyCollectedEvent(evento({ city: null, venueAddress: null }), NOW),
    ).toMatchObject({ status: "incomplete", reason: "missing_city" });
    expect(
      classifyCollectedEvent(
        evento({
          modalityEvidence: "unknown",
          venueName: null,
          venueAddress: null,
        }),
        NOW,
      ),
    ).toMatchObject({ status: "incomplete" });
  });

  it("cidade ausente cai para Fortaleza só se o endereço disser", () => {
    expect(
      classifyCollectedEvent(
        evento({ city: null, venueAddress: "Av. Beira Mar, Fortaleza/CE" }),
        NOW,
      ),
    ).toMatchObject({ status: "included", city: "Fortaleza" });
  });
});

describe("startsWithinNext30Days", () => {
  const maisDias = (d: number) =>
    new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000);

  it("aceita +15 dias e o limite de +30", () => {
    expect(startsWithinNext30Days(NOW, maisDias(15))).toBe(true);
    expect(startsWithinNext30Days(NOW, maisDias(30))).toBe(true);
  });
  it("recusa +31 dias, ontem e início nulo", () => {
    expect(startsWithinNext30Days(NOW, maisDias(31))).toBe(false);
    expect(startsWithinNext30Days(NOW, maisDias(-1))).toBe(false);
    expect(startsWithinNext30Days(NOW, null)).toBe(false);
  });
});
