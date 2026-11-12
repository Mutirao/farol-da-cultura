# ADR-0005: App web — escopo da camada universal do Expo UI

- **Status:** Proposto
- **Data:** 2026-11-11
- **Decisor:** _(em branco — decisão humana pendente, D13)_
- **Requisitos:** OPS-02, OPS-05, D11, D13

## Contexto

O plano revisado da Fase 0 lista a decisão **D13** (app web) como uma das decisões humanas que o `PLANO-EXECUCAO.md` coloca para avaliação nesta fase, junto com observabilidade (§4, §13 e §16/O15). A tarefa F0-07 (`apps/app`), que depende deste ADR, prevê `app.config.ts` com `platforms: ['ios', 'android']` — ou seja, **a web não entra nos alvos de build nesta fase**.

Fatos relevantes:

- O Expo SDK 58 inclui uma camada universal (`@expo/ui`) com componentes como Button, Switch, List, BottomSheet e Picker, com um único import por plataforma (ver ADR-0001, V11). Essa camada é a base de `packages/ui-native` (F0-08).
- Não há, hoje, confirmação de que todo o restante do app (navegação `expo-router`, `NativeTabs`, `expo-maps`/`react-native-maps`, os controles de `ui-native`) roda sem adaptação em `react-native-web`. A verificação dessa capacidade não foi feita na Fase 0: só a camada universal do Expo UI foi avaliada/é a aposta inicial.
- `app.config.ts` da F0-07 declara `platforms: ['ios', 'android']` nesta fase. O suporte à web é um `platforms` futuro, não automático: adicionar `'web'` exige revisão de cada dependência nativa usada pelo app (mapas, abas nativas, UI universal) antes de habilitar o alvo.
- Implementação de fato do app web está fora do escopo de qualquer tarefa da Fase 0 (ver plano revisado, §12: "implementação do app web (D13)" listada como o que fica de fora).

## Decisão

**Nenhuma decisão de implementação é tomada neste ADR.** Fica registrado que:

1. Apenas a camada universal do Expo UI (`@expo/ui`) é a candidata avaliada para rodar na web nesta fase — ela é a única parte do app com import único entre plataformas hoje.
2. `app.config.ts` (F0-07) mantém `platforms: ['ios', 'android']` na Fase 0. A inclusão de `'web'` em `platforms` é um passo futuro, condicionado à decisão humana D13 e à verificação de que `expo-router`, `NativeTabs`, a biblioteca de mapas escolhida (F0-11) e `packages/ui-native` funcionam (ou têm substituto equivalente) em `react-native-web`.
3. O ADR permanece **Proposto** até a decisão humana D13 definir se o app ganha, de fato, um alvo web, e com qual escopo de paridade de funcionalidades.

## Consequências

- Enquanto D13 não for respondida, nenhuma tarefa da Fase 0 ou de fases seguintes assume suporte web do app como pronto; `apps/app` continua mobile-only (iOS/Android) em todas as builds (`eas.json`).
- Se D13 decidir por suporte web usando só a camada universal do Expo UI, as demais partes do app (abas nativas, mapas) precisarão de uma estratégia própria para a web (substituto web, feature flag, ou app web reduzido) — não resolvida aqui.
- Se D13 decidir não ter app web, este ADR pode ser encerrado como "Rejeitado" sem mudança de código, já que nenhuma implementação foi feita.
- Precisa ser revisto quando D13 for respondida pela pessoa: atualizar Status, Decisor e Decisão com o escopo final antes de `platforms` ganhar `'web'` em `app.config.ts`.

## Alternativas consideradas

- **App web completo com paridade de funcionalidades** (abas, mapa, UI): não avaliado nesta fase; custo de adaptação de cada dependência nativa é desconhecido.
- **App web reduzido** (ex.: só telas que usam a camada universal do Expo UI, sem mapa/abas nativas): candidato mais barato, mas ainda não especificado.
- **Sem app web nesta fase** (status quo, `platforms: ['ios', 'android']`): opção atual de fato, mantida até D13 decidir o contrário.
- Nenhuma foi escolhida: a decisão depende de D13.
