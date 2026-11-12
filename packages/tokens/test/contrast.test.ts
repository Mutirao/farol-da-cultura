import { readFileSync } from "node:fs";
import { formatHex, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import { MODES, parseTokens, resolveRef } from "../src/schema.ts";

// Contraste recalculado com a culori (implementação independente da nossa
// conversão OKLCH). Fórmula WCAG 2.x: L = 0,2126 R + 0,7152 G + 0,0722 B, com
// cada canal linearizado (c <= 0,04045 ? c/12,92 : ((c+0,055)/1,055)^2,4) e
// razão = (L_clara + 0,05) / (L_escura + 0,05).

const doc = parseTokens(
  JSON.parse(readFileSync(new URL("../tokens.json", import.meta.url), "utf8")),
);
const DARK_BG = resolveRef(doc, doc.modes.dark.background?.ref ?? "");
const TOLERANCE = 0.01;

// Tabela §3.1: as 8 razões de referência (frente, fundo, razão esperada).
const TABLE_3_1: [string, string, string, number][] = [
  ["brand.primary sobre branco", "#008EA3", "#FFFFFF", 3.89],
  ["brand.primary sobre fundo escuro", "#008EA3", "#0A0A0A", 5.09],
  ["brand.accent sobre branco", "#EA5B0C", "#FFFFFF", 3.5],
  ["brand.accent sobre fundo escuro", "#EA5B0C", "#0A0A0A", 5.66],
  ["primary-foreground sobre primary (claro)", "#FFFFFF", "#007585", 5.41],
  ["muted-foreground sobre muted (claro)", "#616161", "#F5F5F5", 5.68],
  ["highlight sobre background (claro)", "#B3470A", "#FFFFFF", 5.49],
  ["disabled #999999 sobre branco (não é texto)", "#999999", "#FFFFFF", 2.85],
];

const paletteHexes = new Set(
  Object.values(doc.palette).flatMap((group) => Object.values(group)),
);

describe("tabela 3.1: 8 razões recalculadas com culori (±0,01)", () => {
  it("o fundo escuro da tabela é o background do modo escuro", () => {
    expect(DARK_BG).toBe("#0A0A0A");
  });

  it.each(TABLE_3_1)("%s: %s / %s ≈ %f", (_label, fg, bg, expected) => {
    expect(paletteHexes.has(fg)).toBe(true);
    expect(paletteHexes.has(bg)).toBe(true);
    const ratio = wcagContrast(fg, bg);
    console.log(
      `contraste ${fg} / ${bg}: culori=${ratio.toFixed(4)} esperado=${expected.toFixed(2)} Δ=${Math.abs(ratio - expected).toFixed(4)}`,
    );
    expect(Math.abs(ratio - expected)).toBeLessThanOrEqual(TOLERANCE);
  });
});

function pairs(role: "text" | "graphic") {
  return MODES.flatMap((mode) =>
    Object.entries(doc.modes[mode]).flatMap(([name, token]) => {
      if (token.role !== role) return [];
      const on = doc.modes[mode][token.on];
      if (on === undefined) throw new Error(`${mode}.${token.on} ausente`);
      return [
        [
          `${mode}.${name} sobre ${token.on}`,
          resolveRef(doc, token.ref),
          resolveRef(doc, on.ref),
        ] as [string, string, string],
      ];
    }),
  );
}

describe("tokens de texto >= 4,5:1 sobre o fundo associado", () => {
  const textPairs = pairs("text");
  it("há tokens de texto em todos os modos", () => {
    expect(textPairs.length).toBeGreaterThanOrEqual(MODES.length * 10);
  });
  it.each(textPairs)("%s (%s / %s)", (_label, fg, bg) => {
    expect(wcagContrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("tokens gráficos (ícones, bordas, foco) >= 3:1", () => {
  const graphicPairs = pairs("graphic");
  it("há tokens gráficos em todos os modos", () => {
    expect(graphicPairs.length).toBeGreaterThanOrEqual(MODES.length * 5);
  });
  it.each(graphicPairs)("%s (%s / %s)", (_label, fg, bg) => {
    expect(wcagContrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});

describe("#999999 nunca é token de texto", () => {
  it("nenhum token text resolve para #999999", () => {
    const offenders = MODES.flatMap((mode) =>
      Object.entries(doc.modes[mode])
        .filter(
          ([, t]) =>
            t.role === "text" &&
            formatHex(resolveRef(doc, t.ref)) === "#999999",
        )
        .map(([name]) => `${mode}.${name}`),
    );
    expect(offenders).toEqual([]);
  });

  it("#999999 aparece só como decorativo", () => {
    const roles = new Set(
      MODES.flatMap((mode) =>
        Object.values(doc.modes[mode])
          .filter((t) => resolveRef(doc, t.ref) === "#999999")
          .map((t) => t.role),
      ),
    );
    expect([...roles]).toEqual(["decorative"]);
  });

  it("o schema zod rejeita #999999 como texto", () => {
    const raw = JSON.parse(
      readFileSync(new URL("../tokens.json", import.meta.url), "utf8"),
    );
    raw.modes.light["muted-foreground"].ref = "neutral.400";
    expect(() => parseTokens(raw)).toThrow(/#999999/);
  });
});
