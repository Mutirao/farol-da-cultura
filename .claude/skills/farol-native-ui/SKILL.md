---

name: farol-native-ui
description: Use when building Farol native UI with Expo SDK 58.
---

# UI nativa do Farol

Use para implementar ou revisar controles, temas e navegação de `apps/app` em
Android/iOS. Leia `packages/ui-native/README.md` e os componentes em
`packages/ui-native/src/` antes de alterar contratos. Web não é alvo deste pacote.

## Precedência e SDK 58 (V10, V12)

**Esta skill PREVALECE sobre as skills oficiais de comunidade `expo-ui` e
`expo-router` em caso de conflito.** As decisões estão em
`docs/PLANO-FASE-0-REVISADO.md`, V10 e V12:

- `NativeTabs` é estável: importe de `expo-router/native-tabs`, nunca de
  `expo-router/unstable-native-tabs`. Use os componentes compostos
  `NativeTabs.Trigger.Icon` e `NativeTabs.Trigger.Label`; ícones `sf` no iOS e
  `md` no Android. Mantenha `expo-symbols` instalado e no máximo cinco abas.
- `List.ForEach` **virtualiza e recicla no SDK 58**. Não reproduza a afirmação
  desatualizada da skill `expo-ui` de que List não é virtualizada. Cartões React
  Native entram via `RNHostView`; isso não comprova desempenho: a medição e a
  escolha frente à FlashList pertencem ao spike F0-10 e ao ADR-0002.
- O wrapper Farol `ListSection` usa `FieldGroup`, não `List.ForEach`: não atribua
  a ele virtualização por causa da regra anterior.

## Wrappers reais de `@farol/ui-native`

Importe os controles de `@farol/ui-native`, não diretamente de `@expo/ui` no app.
São wrappers finos universais; não crie versões `.ios.tsx`/`.android.tsx` sem
uma prop ausente que justifique a divisão.

Todos os quatro exigem **`accessibilityLabel: string`**; forneça texto não vazio,
localizado e que descreva a ação ou seção. `testID?: string` é opcional em todos.
Os contratos públicos completos, além dessas duas props, são:

| Wrapper       | Props obrigatórias                                                     | Props opcionais      | Implementação                       |
| ------------- | ---------------------------------------------------------------------- | -------------------- | ----------------------------------- |
| `Button`      | `label: string`, `onPress: () => void`                                 | `disabled?: boolean` | `Button` universal                  |
| `Toggle`      | `value: boolean`, `onValueChange: (value: boolean) => void`            | `disabled?: boolean` | `Switch` universal                  |
| `ListSection` | `children: ReactNode`                                                  | Nenhuma adicional    | `FieldGroup` + `FieldGroup.Section` |
| `Sheet`       | `isPresented: boolean`, `onDismiss: () => void`, `children: ReactNode` | Nenhuma adicional    | `BottomSheet` universal             |

- `Button.label` é o texto visível; `accessibilityLabel` é o anúncio acessível.
- `Toggle` usa `accessibilityLabel` também como `label` visível do Switch.
- `ListSection` usa `accessibilityLabel` como título nativo da seção, preservando
  os controles filhos. Já contém um `FieldGroup` rolável: não aninhe em outro.
- `Sheet` usa conteúdo React Native com `accessibilityViewIsModal` e um `Text`
  de papel `header` com o rótulo. Os filhos continuam navegáveis; não há garantia
  automatizada de foco inicial ou retorno ao disparador.
- Não há props públicas `modifiers`, `tint`, `style` ou repasse irrestrito de
  props nativas nesses wrappers. Não invente `onChange` para Toggle, `open` para
  Sheet ou `title` para ListSection.
- A ausência de `accessibilityLabel` nas props universais é suprida internamente
  por `labelModifiers.ios.ts` (`accessibilityLabel`) e
  `labelModifiers.android.ts` (`semantics({ contentDescription })`). Não exponha
  um escape que sobrescreva esses rótulos. O fallback `.ts` não valida web.

## Provider e tint dos tokens

`NativeUIProvider` exige `children: ReactNode` e aceita apenas
`matchContents?: boolean` (padrão `false`). Ele cria o `Host` universal, escolhe
`light`/`dark` com `useColorScheme()` e passa `colors[mode].primary` como
`seedColor`: tint no iOS e paleta Material 3 no Android. Não use cores literais.

Sem `matchContents`, o Host usa `flex: 1`; com `matchContents`, mede o conteúdo
intrínseco. Conteúdo React Native de Sheet não herda o tint do Host externo:
coloque outro `NativeUIProvider matchContents` ao usar Button/Toggle nele.

```tsx
import { useState } from "react";
import {
  Button,
  ListSection,
  NativeUIProvider,
  Sheet,
  Toggle,
} from "@farol/ui-native";

export function Preferences() {
  const [enabled, setEnabled] = useState(false);
  const [presented, setPresented] = useState(false);
  return (
    <NativeUIProvider>
      <ListSection accessibilityLabel="Preferências">
        <Toggle
          accessibilityLabel="Receber avisos"
          value={enabled}
          onValueChange={setEnabled}
        />
        <Button
          accessibilityLabel="Abrir detalhes dos avisos"
          label="Detalhes"
          onPress={() => setPresented(true)}
        />
      </ListSection>
      <Sheet
        accessibilityLabel="Detalhes dos avisos"
        isPresented={presented}
        onDismiss={() => setPresented(false)}
      >
        <NativeUIProvider matchContents>
          <Button
            accessibilityLabel="Fechar detalhes dos avisos"
            label="Fechar"
            onPress={() => setPresented(false)}
          />
        </NativeUIProvider>
      </Sheet>
    </NativeUIProvider>
  );
}
```

Em telas reais, obtenha os textos de `@farol/i18n`; os literais acima apenas
mostram o contrato dos controles.

## `@farol/tokens`: imports e nomes

`packages/tokens/dist/native.ts` é gerado, não deve ser editado à mão. Os exports
`@farol/tokens` e `@farol/tokens/native` resolvem esse mesmo arquivo; prefira o
subpath explícito no app, sem importar por caminho relativo entre pacotes:

```ts
import { colors, palette, radius, spacing, tokens } from "@farol/tokens/native";
import type {
  ColorMode,
  ColorToken,
  RadiusToken,
  SpacingToken,
  Tokens,
} from "@farol/tokens/native";
```

- `colors.light`, `colors.dark`, `colors.highContrast`: cores semânticas em
  camelCase, como `background`, `foreground`, `card`, `cardForeground`,
  `primary`, `primaryForeground`, `secondary`, `muted`, `mutedForeground`,
  `accent`, `destructive`, `border`, `input`, `ring`, `brand`, `brandAccent`,
  `highlight`, `disabled`, `chart1`–`chart5` e a família `sidebar*`.
- `palette.brand.primary` e `palette.brand.accent` são cores de marca brutas;
  `palette` também contém `teal`, `orange`, `red` e `neutral`. O tint dos
  wrappers é `colors[mode].primary`, não `palette.brand.primary` fixo.
- `radius`: `base`, `sm`, `md`, `lg`, `xl`, `"2xl"`, `"3xl"`, `"4xl"`.
- `spacing`: `"0"`, `"0.5"`, `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, `"6"`, `"8"`,
  `"10"`, `"12"`, `"16"`. Espaçamentos e raios são números em pixels lógicos.
- `tokens` agrega `{ palette, colors, radius, spacing }`. Use `spacing["4"]` e
  `radius.md` em estilos RN; não passe props de estilo inexistentes aos wrappers.
- `highContrast` existe nos tokens, mas o provider atual só seleciona light/dark;
  não afirme detecção automática de alto contraste.

Para regenerar após alterar a fonte `packages/tokens/tokens.json`, execute
`pnpm --filter @farol/tokens build`.

## Checklist e verificação

Use **`docs/a11y/f0-ui-native.md`** como checklist humano canônico; registre
build/commit, variante, aparelhos, responsável, data e evidências reais.

- TalkBack e VoiceOver: ouvir os quatro rótulos, estado do Toggle, ordem e ações,
  controles desabilitados e alvos de toque.
- Sheet: abrir/fechar, conferir foco inicial, navegar por todos os filhos e
  verificar retorno ao botão disparador nos dois sistemas.
- Android: registrar a escala original, aplicar
  `adb shell settings put system font_scale 2.0`, inspecionar demo/Sheet sem
  cortes ou sobreposições e restaurar a escala original.
- iOS: repetir a inspeção com o maior tamanho de acessibilidade.
- Não preencher assinatura nem declarar conformidade, foco ou leitores de tela
  aprovados a partir de mocks, compilação ou CI. Ausência de aparelho/evidência
  mantém a avaliação humana pendente, não aprovada.

A demo `/ui-demo` só monta na variante development; preview, production e config
ausente redirecionam para `/agenda`. O guard usa a identidade resolvida no config,
não `process.env.APP_VARIANT` no cliente Metro.

Após mudanças nos controles, execute
`pnpm turbo run typecheck test --filter=@farol/ui-native` e `pnpm biome ci .`.
Os testes cobrem contratos, callbacks, composição, tint e guard com pontes nativas
mockadas; não substituem o checklist físico acima.
