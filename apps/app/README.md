# Farol da Cultura — aplicativo público

O produto contempla **Android, iOS e web**, conforme o
[ADR-0009](../../docs/adr/0009-ecossistema-institucional.md) e a trilha U8 do
[plano unificado](../../docs/PLANO-UNIFICADO-2026-11-16.md). A base atual é Expo
SDK 58, com alvos Android, iOS e web (ver "Web" abaixo). O painel
administrativo é outra aplicação e não substitui esse alvo público. A hospedagem
do build web acompanha o modelo do painel, com artefato e domínio próprios.

Estado atual: agenda com busca e filtros, detalhes de
eventos e espaços, favoritos locais, locais abertos no app de mapas e Conta com
termos, privacidade e Sobre. Ainda não tem mapa embutido, login ou notificações.
Os textos vêm de `@farol/i18n` (i18next,
expo-localization, fallback pt-BR); o tint vem de `@farol/tokens/native`,
exportado de `packages/tokens/dist/native.ts`.

A agenda pública deve ser uma projeção das informações confirmadas nas APIs
institucionais de Mapas Culturais. Preparação de scraping fica restrita ao
painel/operação. O importador existente cobre Ceará; múltiplas instâncias e
cidades exigem contratos próprios. Ver [ontologia e fluxo](../../docs/ONTOLOGIA-E-FLUXO.md).

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

### Web

`web.output` é `single`: o export gera um `index.html` e os bundles em
`_expo/`, servidos por qualquer servidor estático **com fallback de SPA**
(toda rota desconhecida devolve `index.html`, senão `/evento/62` recarregado dá
404). As variáveis `EXPO_PUBLIC_*` são embutidas no bundle durante o export.

```sh
npx expo start --web                    # desenvolvimento, com .env.local
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave publishable local> \
  npx expo export --platform web --output-dir dist
```

No navegador, os favoritos ficam no `localStorage` da origem
(`src/agenda/favoritos.web.ts`), com o mesmo contrato do arquivo nativo
(`test/favoritos.contrato.ts`); não são compartilhados com o app instalado.
Comportamento verificado no navegador: abas nativas viram barra de abas web;
localização negada mantém a ordem por data; sem `navigator.share` o botão
Compartilhar não faz nada e `Alert.alert` não mostra aviso (no-op no
react-native-web), assim como o aviso de falha de leitura/gravação dos favoritos.

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
roda Expo Doctor e exporta Android/iOS/web sem build nativo.
