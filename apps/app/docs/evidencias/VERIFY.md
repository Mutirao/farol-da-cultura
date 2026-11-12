# F0-07 — evidências

### `npx expo install --check`

Exit code: 0

```text
Dependencies are up to date
```

### `npx expo-doctor`

Exit code: 0

```text
Running 20 checks on your project...
20/20 checks passed. No issues detected!
```

### `for variant in production development preview; do APP_VARIANT=$variant npx expo config --type public --json | jq -r .android.package; printf "CONFIG_%s_EXIT=%s\n" "$variant" "${PIPESTATUS[*]}"; done`

Exit code: 0

```text
br.com.farol.cultura
CONFIG_production_EXIT=0 0
br.com.farol.cultura.dev
CONFIG_development_EXIT=0 0
br.com.farol.cultura.preview
CONFIG_preview_EXIT=0 0
```

### `pnpm turbo run typecheck test`

Exit code: 0

```text
• turbo 2.11.11
   • Packages in scope: @farol/app, @farol/i18n, @farol/tokens, @farol/tsconfig
   • Running typecheck, test in 4 packages
   • Remote caching disabled, using shared worktree cache

@farol/tokens:build: cache hit, replaying logs 2bb5ad2a4df0325f
@farol/tokens:typecheck: cache hit, replaying logs 9f635176f4d267ce
@farol/tokens:test: cache hit, replaying logs b7d26ab6a98aa70c
@farol/tokens:build: $ node src/generate.ts && biome format --write --vcs-use-ignore-file=false dist
@farol/tokens:build: @farol/tokens: dist/theme.css e dist/native.ts gerados
@farol/tokens:build: Formatted 2 files in 5ms. No fixes applied.
@farol/tokens:test: $ vitest run
@farol/tokens:test: 
@farol/tokens:test:  RUN  v5.1.0 /mnt/data/code/farol/farol-da-cultura/.worktrees/f0-07/packages/tokens
@farol/tokens:test: 
@farol/tokens:test: stdout | test/contrast.test.ts > tabela 3.1: 8 razões recalculadas com culori (±0,01) > brand.primary sobre branco: #008EA3 / #FFFFFF ≈ 3.89
@farol/tokens:test: contraste #008EA3 / #FFFFFF: culori=3.8903 esperado=3.89 Δ=0.0003
@farol/tokens:test: 
@farol/tokens:test: stdout | test/contrast.test.ts > tabela 3.1: 8 razões recalculadas com culori (±0,01) > brand.primary sobre fundo escuro: #008EA3 / #0A0A0A ≈ 5.09
@farol/tokens:test: contraste #008EA3 / #0A0A0A: culori=5.0891 esperado=5.09 Δ=0.0009
@farol/tokens:test: 
@farol/tokens:test: stdout | test/contrast.test.ts > tabela 3.1: 8 razões recalculadas com culori (±0,01) > brand.accent sobre branco: #EA5B0C / #FFFFFF ≈ 3.5
@farol/tokens:test: contraste #EA5B0C / #FFFFFF: culori=3.4999 esperado=3.50 Δ=0.0001
@farol/tokens:test: 
@farol/tokens:test: stdout | test/contrast.test.ts > tabela 3.1: 8 razões recalculadas com culori (±0,01) > brand.accent sobre fundo escuro: #EA5B0C / #0A0A0A ≈ 5.66
@farol/tokens:test: contraste #EA5B0C / #0A0A0A: culori=5.6568 esperado=5.66 Δ=0.0032
@farol/tokens:test: 
@farol/tokens:test: stdout | test/contrast.test.ts > tabela 3.1: 8 razões recalculadas com culori (±0,01) > primary-foreground sobre primary (claro): #FFFFFF / #007585 ≈ 5.41
@farol/tokens:test: contraste #FFFFFF / #007585: culori=5.4079 esperado=5.41 Δ=0.0021
@farol/tokens:test: 
@farol/tokens:test: stdout | test/contrast.test.ts > tabela 3.1: 8 razões recalculadas com culori (±0,01) > muted-foreground sobre muted (claro): #616161 / #F5F5F5 ≈ 5.68
@farol/tokens:test: contraste #616161 / #F5F5F5: culori=5.6807 esperado=5.68 Δ=0.0007
@farol/tokens:test: 
@farol/tokens:test: stdout | test/contrast.test.ts > tabela 3.1: 8 razões recalculadas com culori (±0,01) > highlight sobre background (claro): #B3470A / #FFFFFF ≈ 5.49
@farol/tokens:test: contraste #B3470A / #FFFFFF: culori=5.4939 esperado=5.49 Δ=0.0039
@farol/tokens:test: 
@farol/tokens:test: stdout | test/contrast.test.ts > tabela 3.1: 8 razões recalculadas com culori (±0,01) > disabled #999999 sobre branco (não é texto): #999999 / #FFFFFF ≈ 2.85
@farol/tokens:test: contraste #999999 / #FFFFFF: culori=2.8490 esperado=2.85 Δ=0.0010
@farol/tokens:test: 
@farol/tokens:test:  ✓ test/contrast.test.ts (82 tests) 13ms
@farol/tokens:test:  ✓ test/theme.test.ts (40 tests) 30ms
@farol/tokens:test: 
@farol/tokens:test:  Test Files  2 passed (2)
@farol/tokens:test:       Tests  122 passed (122)
@farol/tokens:test:    Start at  01:00:54
@farol/tokens:test:    Duration  296ms (import 56%, transform 31%, tests 11%, worker 2%)
@farol/tokens:test: 
@farol/tokens:typecheck: $ tsc -p tsconfig.json
@farol/app:typecheck: cache miss, executing e0fd710948c8f72c
@farol/app:typecheck: $ tsc --noEmit

 Tasks:    4 successful, 4 total
Cached:    3 cached, 4 total
  Time:    840ms
```

## Export Android / iOS

`npx expo export --platform android --platform ios`: exit 0.
Saída literal relevante:

```text
React Compiler enabled
Expo Autolinking module resolution enabled
Android Bundled 13626ms
Exported: dist
EXPORT_EXIT=0
```

## Builds EAS

Projeto confirmado por `eas project:info`: `@lpirola/farol-da-cultura`,
ID `e0eb648f-ab50-41a1-b980-601872a81120`.

`eas build --profile development --platform android --non-interactive --no-wait`:
exit 0, build `24fe12a6-ce0c-49b3-932e-23e66a473d01`.
O arquivo enviado inclui as mudanças locais ainda não comitadas; o gitCommitHash
mostrado pelo EAS aponta para o HEAD anterior à implementação.

https://expo.dev/accounts/lpirola/projects/farol-da-cultura/builds/24fe12a6-ce0c-49b3-932e-23e66a473d01

`eas build:list --limit 1 --json --non-interactive`: exit 0,
status observado inicialmente `IN_PROGRESS`, plataforma `ANDROID`, perfil
`development`, appIdentifier `br.com.farol.cultura.dev`, SDK `58.0.0`.

## iOS bloqueado (H3)

`eas build --profile development --platform ios --non-interactive --no-wait`:
exit 1, nenhum build ID iOS criado. Saída literal:

```text
app.config.ts is missing ios.infoPlist.ITSAppUsesNonExemptEncryption boolean. Manual configuration is required in App Store Connect before the app can be tested.
✔ Using remote iOS credentials (Expo server)
Failed to set up credentials.
You're in non-interactive mode. EAS CLI couldn't find any credentials suitable for internal distribution. Run this command again in interactive mode.
    Error: build command failed.
```

Tentativa real de `eas device:create`: conta Expo lpirola selecionada; o CLI
parou ANTES de gerar URL/QR, solicitando:

```text
› Log in to your Apple Developer account to continue
? Apple ID: ›
```

O processo foi encerrado sem fornecer nem adivinhar credenciais. Não existe URL
de registro capturada: será necessário à pessoa autenticar a conta Apple com
`eas device:create`, abrir a URL gerada no próprio iPhone e concluir o registro,
depois preparar as credenciais e repetir o build. A existência da conta Apple
paga/iPhone foi declarada pela pessoa, mas não verificada nesta lane.
O aviso de criptografia será resolvido na definição de recursos do app antes de
TestFlight; não se declara uma isenção que ainda não foi avaliada.
