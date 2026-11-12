@../../AGENTS.md

## Específico de `apps/app`

- Raiz do Expo Router: `src/app/` (convenção automática do Expo SDK 58 quando existe pasta `src/`).
- 4 abas nativas via `expo-router/native-tabs` (import estável, não `unstable-native-tabs`): agenda, mapa, favoritos, conta.
- `app.config.ts` resolve `APP_VARIANT` para os 3 bundle ids; `eas.json` tem os perfis `development`/`preview`/`production`.
- Rota `(dev)/ui-demo.tsx` só é alcançável quando o identificador resolvido é `br.com.farol.cultura.dev` — guard checa `ios.bundleIdentifier ?? android.package` (bug de checar só `ios` foi corrigido em 12/11/2026, PR #13).
- Rótulos de texto vêm de `@farol/i18n`, nunca string fixa em JSX (regra do Biome cobre `apps/**`).
- Metro local: `APP_VARIANT=development npx expo start --dev-client` + `adb reverse tcp:<porta> tcp:<porta>`.
