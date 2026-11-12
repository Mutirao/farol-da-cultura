import { hexToOklch } from "./oklch.ts";
import { MODES, type Mode, resolveRef, type Tokens } from "./schema.ts";

const HEADER =
  "Gerado por packages/tokens/src/generate.ts a partir de tokens.json. Não edite à mão: rode `pnpm --filter @farol/tokens build`.";

export const MODE_SELECTORS: Record<Mode, string> = {
  light: ":root",
  dark: ".dark",
  highContrast: ".high-contrast",
};

function rem(px: number): string {
  return `${px / 16}rem`;
}

function offset(px: number): string {
  if (px === 0) return "var(--radius)";
  return px > 0
    ? `calc(var(--radius) + ${px}px)`
    : `calc(var(--radius) - ${-px}px)`;
}

export function renderCss(doc: Tokens): string {
  const names = Object.keys(doc.modes.light);
  const lines: string[] = [`/* ${HEADER} */`, ""];
  lines.push("@custom-variant dark (&:is(.dark *));", "");

  for (const mode of MODES) {
    lines.push(`${MODE_SELECTORS[mode]} {`);
    if (mode === "light") lines.push(`  --radius: ${rem(doc.radius.base)};`);
    for (const name of names) {
      const token = doc.modes[mode][name];
      if (token === undefined) throw new Error(`${mode}.${name} ausente`);
      lines.push(`  --${name}: ${hexToOklch(resolveRef(doc, token.ref))};`);
    }
    lines.push("}", "");
  }

  lines.push("@theme inline {");
  const { base, ...scale } = doc.radius;
  for (const [step, px] of Object.entries(scale)) {
    lines.push(`  --radius-${step}: ${offset(px - base)};`);
  }
  const unit = doc.spacing["1"];
  if (unit === undefined) throw new Error("spacing.1 ausente");
  lines.push(`  --spacing: ${rem(unit)};`);
  for (const name of names) {
    lines.push(`  --color-${name}: var(--${name});`);
  }
  lines.push("}", "");
  return lines.join("\n");
}

function camel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function key(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

function objectLiteral(entries: [string, string][], indent: string): string {
  const inner = entries
    .map(([k, v]) => `${indent}  ${key(k)}: ${v},`)
    .join("\n");
  return `{\n${inner}\n${indent}}`;
}

export function renderNative(doc: Tokens): string {
  const colorModes = MODES.map((mode): [string, string] => [
    mode,
    objectLiteral(
      Object.entries(doc.modes[mode]).map(([name, token]) => [
        camel(name),
        JSON.stringify(resolveRef(doc, token.ref)),
      ]),
      "  ",
    ),
  ]);
  const palette = Object.entries(doc.palette).map(
    ([group, shades]): [string, string] => [
      group,
      objectLiteral(
        Object.entries(shades).map(([s, v]) => [s, JSON.stringify(v)]),
        "  ",
      ),
    ],
  );
  const num = (o: Record<string, number>) =>
    objectLiteral(
      Object.entries(o).map(([k, v]) => [k, String(v)]),
      "",
    );

  return [
    `// ${HEADER}`,
    "",
    `export const palette = ${objectLiteral(palette, "")} as const;`,
    "",
    "/** Cores resolvidas (hex sRGB) por modo; chaves em camelCase. */",
    `export const colors = ${objectLiteral(colorModes, "")} as const;`,
    "",
    "/** Raios em px (lógicos). */",
    `export const radius = ${num(doc.radius)} as const;`,
    "",
    "/** Espaçamentos em px (lógicos). */",
    `export const spacing = ${num(doc.spacing)} as const;`,
    "",
    "export const tokens = { palette, colors, radius, spacing } as const;",
    "",
    "export type ColorMode = keyof typeof colors;",
    "export type ColorToken = keyof (typeof colors)[ColorMode];",
    "export type RadiusToken = keyof typeof radius;",
    "export type SpacingToken = keyof typeof spacing;",
    "export type Tokens = typeof tokens;",
    "",
  ].join("\n");
}
