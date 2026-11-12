import { readFileSync } from "node:fs";
import { formatHex, parse } from "culori";
import { describe, expect, it } from "vitest";
import { renderCss, renderNative } from "../src/render.ts";
import { MODES, parseTokens, resolveRef } from "../src/schema.ts";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const raw = () => JSON.parse(read("../tokens.json"));
const doc = parseTokens(raw());
const css = read("../dist/theme.css");

// Lista escrita à mão (independente de SHADCN_COLOR_TOKENS em src/schema.ts).
const SHADCN = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
];

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `bloco ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("tokens.json (zod)", () => {
  it("valida e tem a paleta da marca", () => {
    expect(doc.palette.brand).toEqual({
      primary: "#008EA3",
      accent: "#EA5B0C",
    });
    expect(Object.values(doc.palette.neutral ?? {})).toContain("#999999");
    expect(Object.keys(doc.modes)).toEqual([...MODES]);
    expect(doc.radius.base).toBeGreaterThan(0);
    expect(doc.spacing["1"]).toBe(4);
  });

  it("rejeita referência inexistente", () => {
    const bad = raw();
    bad.modes.dark.ring.ref = "teal.999";
    expect(() => parseTokens(bad)).toThrow(/inexistente/);
  });

  it("rejeita token shadcn ausente", () => {
    const bad = raw();
    delete bad.modes.highContrast["sidebar-ring"];
    expect(() => parseTokens(bad)).toThrow();
  });

  it("rejeita cor da marca trocada", () => {
    const bad = raw();
    bad.palette.brand.primary = "#008EA4";
    expect(() => parseTokens(bad)).toThrow(/brand.primary/);
  });
});

describe("dist/theme.css", () => {
  it("tem :root, .dark, .high-contrast e @theme inline", () => {
    for (const s of [":root", ".dark", ".high-contrast", "@theme inline"]) {
      block(s);
    }
  });

  it.each(SHADCN)("contém --%s nos modos e no @theme inline", (name) => {
    for (const s of [":root", ".dark", ".high-contrast"]) {
      expect(block(s)).toMatch(new RegExp(`--${name}: oklch\\(`));
    }
    expect(block("@theme inline")).toContain(
      `--color-${name}: var(--${name});`,
    );
  });

  it("tem a escala de --radius", () => {
    expect(block(":root")).toContain("--radius: 0.625rem;");
    const theme = block("@theme inline");
    for (const step of ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl"]) {
      expect(theme).toMatch(new RegExp(`--radius-${step}: `));
    }
    expect(theme).toContain("--radius-sm: calc(var(--radius) - 4px);");
    expect(theme).toContain("--radius-lg: var(--radius);");
  });

  it("valores oklch voltam ao hex original (culori)", () => {
    const selectors = {
      light: ":root",
      dark: ".dark",
      highContrast: ".high-contrast",
    };
    for (const mode of MODES) {
      const body = block(selectors[mode]);
      for (const [name, token] of Object.entries(doc.modes[mode])) {
        const match = body.match(new RegExp(`--${name}: (oklch\\([^)]*\\));`));
        expect(match, `${mode}.${name}`).not.toBeNull();
        const color = parse(match?.[1] ?? "");
        expect(formatHex(color), `${mode}.${name}`).toBe(
          resolveRef(doc, token.ref).toLowerCase(),
        );
      }
    }
  });

  it("dist está em sincronia com o gerador", () => {
    expect(css).toBe(renderCss(doc));
    expect(read("../dist/native.ts")).toBe(renderNative(doc));
  });
});

describe("dist/native.ts", () => {
  it("exporta objeto tipado de tokens", async () => {
    const native = await import("../dist/native.ts");
    expect(native.colors.light.primaryForeground).toBe("#FFFFFF");
    expect(native.colors.dark.primary).toBe("#008EA3");
    expect(native.radius.lg).toBe(10);
    expect(native.tokens.spacing["4"]).toBe(16);
  });
});
