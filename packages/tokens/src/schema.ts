import { z } from "zod";

/** Nomes de token de cor do shadcn/ui (Tailwind v4, estilo new-york, base neutral). */
export const SHADCN_COLOR_TOKENS = [
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
] as const;

/** Cinza do app antigo: só decorativo/desabilitado, nunca texto (2,85:1 sobre branco). */
export const DECORATIVE_ONLY_HEX = "#999999";

export const MODES = ["light", "dark", "highContrast"] as const;
export type Mode = (typeof MODES)[number];

const hex = z.string().regex(/^#[0-9A-F]{6}$/, "hex maiúsculo #RRGGBB");
const ref = z.string().regex(/^[a-z]+\.[0-9a-z]+$/, "referência grupo.tom");
const tokenName = z.string().regex(/^[a-z][a-z0-9-]*$/);

const surface = z.strictObject({ ref, role: z.literal("surface") });
const text = z.strictObject({ ref, role: z.literal("text"), on: tokenName });
const graphic = z.strictObject({
  ref,
  role: z.literal("graphic"),
  on: tokenName,
});
const decorative = z.strictObject({ ref, role: z.literal("decorative") });

export const tokenSchema = z.discriminatedUnion("role", [
  surface,
  text,
  graphic,
  decorative,
]);
export type Token = z.infer<typeof tokenSchema>;

const modeSchema = z.record(tokenName, tokenSchema);

const px = z.number().int().nonnegative();

export const tokensSchema = z
  .strictObject({
    palette: z
      .record(z.string(), z.record(z.string(), hex))
      .refine(
        (p) => p.brand?.primary === "#008EA3" && p.brand?.accent === "#EA5B0C",
        "brand.primary deve ser #008EA3 e brand.accent #EA5B0C",
      )
      .refine(
        (p) => Object.values(p.neutral ?? {}).includes(DECORATIVE_ONLY_HEX),
        "neutral deve incluir #999999",
      ),
    modes: z.strictObject({
      light: modeSchema,
      dark: modeSchema,
      highContrast: modeSchema,
    }),
    radius: z.strictObject({
      base: px,
      sm: px,
      md: px,
      lg: px,
      xl: px,
      "2xl": px,
      "3xl": px,
      "4xl": px,
    }),
    spacing: z.record(z.string().regex(/^\d+(\.\d+)?$/), px),
  })
  .superRefine((doc, ctx) => {
    const lightKeys = Object.keys(doc.modes.light).sort().join(",");
    for (const mode of MODES) {
      const tokens = doc.modes[mode];
      if (Object.keys(tokens).sort().join(",") !== lightKeys) {
        ctx.addIssue({
          code: "custom",
          path: ["modes", mode],
          message: "todos os modos precisam ter os mesmos tokens",
        });
      }
      for (const name of SHADCN_COLOR_TOKENS) {
        if (!(name in tokens)) {
          ctx.addIssue({
            code: "custom",
            path: ["modes", mode, name],
            message: "token shadcn ausente",
          });
        }
      }
      for (const [name, token] of Object.entries(tokens)) {
        const [group, shade] = token.ref.split(".") as [string, string];
        const value = doc.palette[group]?.[shade];
        if (value === undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["modes", mode, name, "ref"],
            message: `referência inexistente: ${token.ref}`,
          });
        }
        if (token.role === "text" && value === DECORATIVE_ONLY_HEX) {
          ctx.addIssue({
            code: "custom",
            path: ["modes", mode, name],
            message: "#999999 não pode ser token de texto",
          });
        }
        if (token.role === "text" || token.role === "graphic") {
          if (tokens[token.on]?.role !== "surface") {
            ctx.addIssue({
              code: "custom",
              path: ["modes", mode, name, "on"],
              message: `"on" deve apontar para um token surface: ${token.on}`,
            });
          }
        }
      }
    }
  });

export type Tokens = z.infer<typeof tokensSchema>;

export function parseTokens(input: unknown): Tokens {
  return tokensSchema.parse(input);
}

export function resolveRef(doc: Tokens, tokenRef: string): string {
  const [group, shade] = tokenRef.split(".") as [string, string];
  const value = doc.palette[group]?.[shade];
  if (value === undefined)
    throw new Error(`referência inexistente: ${tokenRef}`);
  return value;
}
