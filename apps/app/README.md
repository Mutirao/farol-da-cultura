# Farol da Cultura — app (F0-07)

Base Expo SDK 58, somente Android e iOS. Quatro abas nativas: Agenda, Mapa e
Favoritos ainda vazias; Conta abre os Termos de Uso, a Política de Privacidade
e a tela Sobre (`src/app/sobre.tsx`). Os textos vêm de `@farol/i18n` (i18next,
expo-localization, fallback pt-BR); o tint vem de `@farol/tokens/native`,
exportado de `packages/tokens/dist/native.ts`.

## Desenvolvimento

Na raiz, rode `pnpm install`. Neste diretório:

```sh
npx expo start --dev-client
npx expo install --check
npx expo-doctor
npx expo export --platform android --platform ios
pnpm typecheck
```

Dependências nativas devem ser instaladas com `npx expo install <pacote> --pnpm`.
O template foi criado com `default@sdk-58 --no-agents-md --no-install`; a flag
foi confirmada no `create-expo-app --help` e nenhum AGENTS.md/CLAUDE.md foi gerado.
`expo-symbols` e `@expo/ui` foram instalados explicitamente.

## Variantes e EAS

| APP_VARIANT                | Android package / iOS bundleIdentifier | Perfil EAS                       |
| -------------------------- | -------------------------------------- | -------------------------------- |
| development (padrão local) | br.com.farol.cultura.dev               | development: dev client, interno |
| preview                    | br.com.farol.cultura.preview           | preview: interno                 |
| production                 | br.com.farol.cultura                   | production: canal production     |

Valores desconhecidos de APP_VARIANT falham explicitamente. Cada perfil define
APP_VARIANT em `eas.json`; os identificadores diferentes permitem coexistência.
Projeto EAS: https://expo.dev/accounts/lpirola/projects/farol-da-cultura

```sh
eas build --profile development --platform android --non-interactive
eas build --profile development --platform ios --non-interactive
```

Typed routes e React Compiler usam `experiments.typedRoutes` e
`experiments.reactCompiler` em `app.config.ts`. O preset Babel do Expo habilita
o compilador automaticamente, sem plugin Babel manual. NativeTabs usa o import
estável `expo-router/native-tabs`, com SF Symbols no iOS e Material no Android.

Referências: [config SDK 58](https://docs.expo.dev/versions/v58.0.0/config/app/),
[native tabs](https://docs.expo.dev/router/advanced/native-tabs/),
[React Compiler](https://docs.expo.dev/guides/react-compiler/).

## Evidências F0-07

Veja `docs/evidencias/VERIFY.md` para saídas, códigos de saída, build IDs,
verificação Android e bloqueio iOS. O CI novo `app-ci.yml` verifica as versões,
roda Expo Doctor e exporta Android/iOS sem build nativo.
