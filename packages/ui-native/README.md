# @farol/ui-native

Wrappers móveis finos para o universal `@expo/ui` 58.0.28:

| API Farol   | Universal Expo                   |
| ----------- | -------------------------------- |
| Button      | Button                           |
| Toggle      | Switch                           |
| ListSection | FieldGroup + FieldGroup.Section  |
| Sheet       | BottomSheet                      |
| SearchField | TextInput + estado nativo        |
| Select      | Picker                           |
| Collection  | List + List.ForEach + RNHostView |

Todos exigem `accessibilityLabel: string` no TypeScript. Não há escape
`modifiers` público que possa sobrescrever os rótulos. `ListSection` usa esse
rótulo como título nativo da seção, preservando cada controle filho. `Sheet`
usa um cabeçalho React Native acessível e mantém os filhos navegáveis (o
BottomSheet universal aceita conteúdo React Native).

## Composição e tint

Envolva os controles em `NativeUIProvider`, uma ponte `Host` universal. Seu
`seedColor` vem de `colors[light|dark].primary` de `@farol/tokens/native`, export
que resolve exatamente `packages/tokens/dist/native.ts`. No iOS propaga tint;
no Android gera a paleta Material 3. Não há cores literais nos wrappers.
`ListSection` contém seu próprio FieldGroup rolável; não o coloque em outro
FieldGroup. Conteúdo React Native do Sheet não herda tint: crie outro
`NativeUIProvider` se usar Button/Toggle dentro dele.

`NativeUIProvider.matchContents` também aceita `{ vertical: true }` para medir
controles sem perder a largura disponível. `SearchField` não ecoa cada tecla de
volta ao nativo; só sincroniza mudanças externas (como limpar a busca).
`Collection` é a lista universal provisória da demonstração: o ADR-0002 e sua
medição em release seguem pendentes. Não há benchmark aprovado nesta entrega.

No dev build Android testado, Host dentro de uma janela nativa de Sheet causou
`RootViewUtil.getRootView` ao tocar nos seletores. Por isso os filtros da agenda
ficam na própria tela, não dentro de Sheet. A demo antiga continua pendente de
validação; este pacote não promete corrigir a limitação nativa do SDK.

## Exceção por plataforma: prop ausente

`UniversalBaseProps` e `SwitchProps` não têm `accessibilityLabel`. Por isso,
somente `labelModifiers.ios.ts` e `labelModifiers.android.ts` divergem: usam
`accessibilityLabel(label)` do SwiftUI e `semantics({ contentDescription })`
do Compose, respectivamente, passados ao universal via `modifiers`. Os quatro
componentes continuam compartilhados, sem cópias `.ios.tsx/.android.tsx`.
`labelModifiers.ts` é apenas o fallback de resolução TypeScript; web não é um
alvo deste pacote/app e não tem validação de acessibilidade prometida.

## Demo e verificação

Acesse `/ui-demo` por link direto na variante development. A rota lê a
identidade `br.com.farol.cultura.dev` resolvida por `APP_VARIANT` no config;
preview, production e config ausente redirecionam para `/agenda`, antes de
montar os controles. Não lê `process.env.APP_VARIANT` no cliente: Metro não
expõe variáveis sem prefixo público. Nenhuma das seis telas existentes muda.

`pnpm turbo run typecheck test --filter=@farol/ui-native` valida encaminhamento,
callbacks, tint, guard e obrigatoriedade dos rótulos. Os testes isolam as pontes
nativas com mocks; não comprovam TalkBack/VoiceOver, foco nem fonte máxima.
A validação física e as assinaturas permanecem no checklist humano em
`docs/a11y/f0-ui-native.md`.
