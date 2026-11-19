import { describe, expect, it } from "vitest";
import {
  cleanText,
  normalizeForMatch,
  parseFortalezaDateTime,
} from "../src/normalize.ts";

describe("cleanText", () => {
  it("remove tags", () => {
    expect(cleanText("<p>Show <b>Rock</b></p>")).toBe("Show Rock");
  });

  it("decodifica entidades básicas", () => {
    expect(cleanText("Rock &amp; Roll &lt;ao vivo&gt;")).toBe(
      "Rock & Roll <ao vivo>",
    );
    expect(cleanText("Show &#39;ílke&#39; &nbsp; aqui")).toBe(
      "Show 'ílke' aqui",
    );
  });

  it("colapsa espaços e quebras de linha", () => {
    expect(cleanText("  a\n\n  b \t c  ")).toBe("a b c");
  });

  it("null vira string vazia", () => {
    expect(cleanText(null)).toBe("");
  });
});

describe("normalizeForMatch", () => {
  it("minúsculas e sem acento", () => {
    expect(normalizeForMatch("Teatro de São José")).toBe("teatro sao jose");
  });

  it("colapsa espaços", () => {
    expect(normalizeForMatch("  Casa   da  Música  ")).toBe("casa musica");
  });
});

describe("parseFortalezaDateTime", () => {
  it("ISO 8601 com deslocamento explícito", () => {
    expect(
      parseFortalezaDateTime("2026-09-09T03:00:00-03:00")?.toISOString(),
    ).toBe("2026-09-09T06:00:00.000Z");
  });

  it('"YYYY-MM-DD HH:mm:ss" do Sympla como hora de Fortaleza', () => {
    expect(parseFortalezaDateTime("2026-09-09 03:00:00")?.toISOString()).toBe(
      "2026-09-09T06:00:00.000Z",
    );
  });

  it('"DD/MM/YYYY HH:mm" como hora de Fortaleza', () => {
    expect(parseFortalezaDateTime("09/09/2026 03:00")?.toISOString()).toBe(
      "2026-09-09T06:00:00.000Z",
    );
  });

  it('"DD/MM/YYYY" é meia-noite em Fortaleza', () => {
    expect(parseFortalezaDateTime("09/09/2026")?.toISOString()).toBe(
      "2026-09-09T03:00:00.000Z",
    );
  });

  it("por extenso, com e sem hora", () => {
    expect(parseFortalezaDateTime("20 de outubro de 2026")?.toISOString()).toBe(
      "2026-10-20T03:00:00.000Z",
    );
    expect(
      parseFortalezaDateTime("20 de outubro de 2026 às 19h30")?.toISOString(),
    ).toBe("2026-10-20T22:30:00.000Z");
  });

  it('"19h" junto da data', () => {
    expect(parseFortalezaDateTime("20/10/2026 19h")?.toISOString()).toBe(
      "2026-10-20T22:00:00.000Z",
    );
  });

  it("devolve null para lixo e componente fora da faixa", () => {
    expect(parseFortalezaDateTime("")).toBeNull();
    expect(parseFortalezaDateTime(null)).toBeNull();
    expect(parseFortalezaDateTime("em breve")).toBeNull();
    expect(parseFortalezaDateTime("32/13/2026")).toBeNull();
    expect(parseFortalezaDateTime("31/02/2026")).toBeNull();
    expect(parseFortalezaDateTime("not a date at all")).toBeNull();
    expect(parseFortalezaDateTime("2026-09-09 25:00:00")).toBeNull();
    expect(parseFortalezaDateTime("09/09/2026 23:61")).toBeNull();
    expect(parseFortalezaDateTime("20 de outubro de 2026 às 24h00")).toBeNull();
  });

  it("usa o fuso IANA, não o do processo nem um -03:00 fixo", () => {
    // Em outubro de 1999 Fortaleza estava em horário de verão (UTC-2, tzdata);
    // o deslocamento fixo do legado erraria em uma hora.
    expect(parseFortalezaDateTime("1999-10-20 12:00:00")?.toISOString()).toBe(
      "1999-10-20T14:00:00.000Z",
    );
  });
});
