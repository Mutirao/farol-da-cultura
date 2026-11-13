# Farol da Cultura — app mobile

Base Expo SDK 58, somente Android e iOS. Agenda com busca e filtros, detalhes de
eventos e espaços, favoritos locais, locais abertos no app de mapas e Conta com
termos, privacidade e Sobre. Ainda não tem mapa embutido, login ou notificações.
Os textos vêm de `@farol/i18n` (i18next,
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

### Agenda e dados locais

Suba o Supabase local (`pnpm supabase start` na raiz). Em `apps/app/.env.local`
(ignorado pelo git), configure `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com a chave **pública** do projeto local.
Nunca use chave secreta ou `service_role` no app.

Para acessar o Metro e a API pelo USB:

```sh
adb reverse tcp:8081 tcp:8081
adb reverse tcp:54321 tcp:54321
APP_VARIANT=development npx expo start --dev-client --port 8081
```

Refaça os redirecionamentos se desconectar/reconectar o cabo. Os dados fictícios
vêm do seed; a importação de dados reais é descrita em `workers/coleta/README.md`.
Os favoritos usam um arquivo privado do app; só substituem a versão anterior
após completar a gravação. Não migram favoritos nem contas do app antigo.

`pnpm test` testa filtros, fuso, validação HTTP e persistência local com mocks.
Não substitui teste de componentes no aparelho. Evidência e limites da entrega:
[`docs/relatorios/app-mobile-android.md`](../../docs/relatorios/app-mobile-android.md).

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
