# @farol/tokens

Tokens de design do Farol (ACE-01): uma fonte (`tokens.json`), validada com zod, gera
`dist/theme.css` (web, Tailwind v4 + shadcn/ui) e `dist/native.ts` (React Native, tipado).
O `dist/` é versionado; o VERIFY confere que não há drift.

## Estrutura

- `tokens.json`: paleta (`brand.primary` `#008EA3`, `brand.accent` `#EA5B0C`, `neutral` com
  `#999999`), modos `light`, `dark` e `highContrast`, raios e espaçamentos (px).
  Cada token de modo tem `ref` (grupo.tom da paleta) e `role`:
  - `surface`: fundo;
  - `text`: texto, com `on` (fundo associado), exige ≥ 4,5:1;
  - `graphic`: ícone, borda de controle, foco, gráfico, com `on`, exige ≥ 3:1;
  - `decorative`: divisória ou estado desabilitado, sem exigência (WCAG 1.4.3/1.4.11 isentam).
- `src/schema.ts`: schema zod (marca fixa, refs válidas, mesmos tokens em todos os modos, todos os
  nomes shadcn presentes, `on` aponta para `surface`, `#999999` proibido como `text`).
- `src/oklch.ts`: conversão hex → OKLCH (Ottosson), própria.
- `src/render.ts` / `src/generate.ts`: geram o CSS (`:root`, `.dark`, `.high-contrast`,
  `@theme inline`, escala `--radius-*`, `--spacing`) e o `native.ts`.

## Uso

```css
@import "tailwindcss";
@import "@farol/tokens/theme.css";
```

```ts
import { colors, radius, spacing } from "@farol/tokens";
colors.dark.primaryForeground; // "#0A0A0A"
```

Alto contraste: aplique a classe `high-contrast` no elemento raiz (web) ou use
`colors.highContrast` (nativo).

## Contraste (tabela 3.1)

Razão WCAG 2.x: cada canal sRGB `c` (0–1) é linearizado como
`c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4`; a luminância é
`L = 0.2126 R + 0.7152 G + 0.0722 B`; a razão é `(L_clara + 0.05) / (L_escura + 0.05)`.
Os testes recalculam com a `culori` (`wcagContrast`), tolerância ±0,01. Fundo escuro = `#0A0A0A`.

| Par | Razão | Uso permitido |
| --- | ---: | --- |
| `#008EA3` / `#FFFFFF` | 3,89 | só gráfico no claro (texto usa `teal.700`) |
| `#008EA3` / `#0A0A0A` | 5,09 | texto e gráfico no escuro |
| `#EA5B0C` / `#FFFFFF` | 3,50 | só gráfico no claro (texto usa `orange.700`) |
| `#EA5B0C` / `#0A0A0A` | 5,66 | texto e gráfico no escuro |
| `#FFFFFF` / `#007585` | 5,41 | `primary-foreground` sobre `primary` (claro) |
| `#616161` / `#F5F5F5` | 5,68 | `muted-foreground` sobre `muted` (claro) |
| `#B3470A` / `#FFFFFF` | 5,49 | `highlight` (texto laranja, claro) |
| `#999999` / `#FFFFFF` | 2,85 | nunca texto: só `disabled`/decorativo |

## Verificação

```sh
pnpm --filter @farol/tokens test        # contraste, schema, nomes shadcn, round-trip OKLCH
pnpm --filter @farol/tokens build && git diff --exit-code packages/tokens/dist
pnpm --filter @farol/tokens lint        # biome ci com tailwindDirectives (biome.json do pacote)
pnpm --filter @farol/tokens typecheck
```

O `.gitignore` da raiz ignora `dist/`; aqui ele é reincluído, e o Biome (que só lê o ignore da raiz)
roda com `--vcs-use-ignore-file=false` para analisar o `theme.css`.
