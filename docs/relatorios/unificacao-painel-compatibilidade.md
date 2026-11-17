# Unificação — compatibilidade do painel (U0.3)

## Escopo e veredito

**VALIDADO para instalação, composição e build local.** Não é aceite do painel
operacional, do login, de publicação, de acessibilidade final ou de deploy.
O usuário aprovou a revisão D6 para React-admin padrão com ra-supabase nesta
sessão em 2026-11-16. O ADR-0006 histórico permanece intacto.

Pins: React-admin 5.15.7, ra-supabase 4.0.0, Supabase JS 2.119.0, React/React DOM
19.3.0, Vite 7.3.8, plugin-react 4.7.0, MUI/material e icons 7.3.11, Emotion
react/styled 11.14.0. TypeScript vem do catálogo (~6.0.3).

## Resultados observados

| Comando                                                     | Resultado                                                                                       |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm install --strict-peer-dependencies`                   | exit 0 após decisão explícita de não executar postinstall do esbuild                            |
| `pnpm install --frozen-lockfile --strict-peer-dependencies` | exit 0; nenhuma incompatibilidade de peers reportada                                            |
| `pnpm --filter @farol/painel typecheck`                     | exit 0                                                                                          |
| `pnpm --filter @farol/painel build`                         | exit 0; build sem configuração gera JS de 222,88 kB (gzip 69,51 kB), anterior à adição de ready |
| Build configurado descrito abaixo                           | exit 0; JS de 1.113,03 kB (gzip 344,98 kB); aviso de chunk maior que 500 kB                     |
| Import Node de `Admin` e `supabaseDataProvider` no pacote   | exit 0; ambos exports são funções                                                               |
| `pnpm why -r react react-dom`                               | uma versão de cada: 19.3.0                                                                      |
| `pnpm --filter @farol/app typecheck`                        | exit 0                                                                                          |
| Export Android + iOS com sourcemaps                         | exit 0; 1.516/1.528 módulos empacotados                                                         |
| Leitura programática dos dois sourcemaps                    | Android: 1.482 sources; iOS: 1.489; nenhuma source MUI, ra-* ou react-admin                     |

Build configurado, sem credencial real e sem executar queries:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=prova-local-sem-credencial pnpm --filter @farol/painel build
```

O valor acima é sintético, não uma chave Supabase nem uma permissão. Esse build
impede que o Vite elimine a composição de Admin/data provider como código morto.
Servido com `vite preview`, o navegador renderizou o título "Farol — prova de
compatibilidade U0.3" e a descrição; zero erros/unhandled rejections capturados.
Não foram observadas requisições de Auth, PostgREST ou telemetria. `ready` é
necessário para o Admin sem recursos não permanecer vazio.

Export de isolamento, sem carregar dotenv:

```bash
EXPO_NO_DOTENV=1 APP_VARIANT=production pnpm --filter @farol/app exec expo export   --platform android --platform ios --source-maps   --output-dir "$TMPDIR/farol-u03-export" --max-workers 2
```

## Regressão final

Após os arquivos e o CI aditivo: `pnpm biome ci .` exit 0 (9 avisos),
`pnpm run check:tooling` exit 0, scripts 23/23, pgTAP 97/97 e
`pnpm turbo run typecheck test --force` 10/10 tarefas. O build sem configuração
foi repetido após a adição de `ready`: mesmos 222,88 kB (gzip 69,51 kB).
O CI passa a executar o build do pacote; isso é configuração local, não prova
de execução hospedada deste novo ciclo.

## Surpresas e limites

- A primeira instalação terminou com `ERR_PNPM_IGNORED_BUILDS` para esbuild
  0.28.2. O workspace agora registra `esbuild@0.28.2: false`: nenhum script foi
  autorizado. O binário opcional da plataforma bastou ao build. Não foi usado
  `dangerouslyAllowAllBuilds`, nem desligada a checagem de peers.
- O lockfile do pnpm 12 contém dois documentos YAML; a inspeção usa
  `yaml.safe_load_all`, não presume documento único.
- O manifest e os pins React/React DOM/Expo do app não mudaram. O lockfile NÃO é
  byte a byte igual no importer do app: o contexto de peer de expo-router foi
  recalculado por `@types/react-dom` opcional no Radix, e Vitest passou a resolver
  o peer Vite 7.3.8 em vez de 8.3.8. Isso não é prova de quebra; as verificações
  de regressão e os exports precisam continuar verdes.
- O chunk configurado é grande; não se alterou o limite para esconder o aviso.
  Divisão de código, tema, mensagens pt-BR e validação visual completa pertencem
  ao U5, não à prova de compatibilidade.
- Login sem senha, autorização real e RPCs administrativas ainda não foram
  exercitados. Não há recursos nem ações de escrita nesta SPA mínima.
- Capacidade/projeto hospedado, volumes reais e backups continuam no gate
  humano U0.2/D3. Nada foi migrado remotamente ou implantado.
