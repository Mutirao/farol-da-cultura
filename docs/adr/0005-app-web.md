# ADR-0005: App web — escopo da camada universal do Expo UI

- **Status:** Aceito
- **Data:** 2026-11-11 (decisão em 2026-11-12)
- **Decisor:** Lucas Pirola, em sessão ativa, 12/11/2026
- **Requisitos:** OPS-02, OPS-05, D11, D13

## Contexto

O plano revisado da Fase 0 lista a decisão **D13** (app web) como uma das decisões humanas que o `PLANO-EXECUCAO.md` coloca para avaliação nesta fase, junto com observabilidade (§4, §13 e §16/O15). A tarefa F0-07 (`apps/app`), que depende deste ADR, prevê `app.config.ts` com `platforms: ['ios', 'android']` — ou seja, **a web não entra nos alvos de build nesta fase**.

Fatos relevantes:

- O Expo SDK 58 inclui uma camada universal (`@expo/ui`) com componentes como Button, Switch, List, BottomSheet e Picker, com um único import por plataforma (ver ADR-0001, V11). Essa camada é a base de `packages/ui-native` (F0-08).
- Não há, hoje, confirmação de que todo o restante do app (navegação `expo-router`, `NativeTabs`, `expo-maps`/`react-native-maps`, os controles de `ui-native`) roda sem adaptação em `react-native-web`. A verificação dessa capacidade não foi feita na Fase 0: só a camada universal do Expo UI foi avaliada/é a aposta inicial.
- `app.config.ts` da F0-07 declara `platforms: ['ios', 'android']` nesta fase. O suporte à web é um `platforms` futuro, não automático: adicionar `'web'` exige revisão de cada dependência nativa usada pelo app (mapas, abas nativas, UI universal) antes de habilitar o alvo.
- Implementação de fato do app web está fora do escopo de qualquer tarefa da Fase 0 (ver plano revisado, §12: "implementação do app web (D13)" listada como o que fica de fora).

## Decisão

**D13 respondida em 12/11/2026, pelo princípio geral "manter o máximo nativo no Expo" (registrado em `AGENTS.md`):**

1. `app.config.ts` (F0-07) mantém `platforms: ['ios', 'android']` — a web **não** entra como alvo de build na Fase 0 nem é um compromisso automático de fases futuras.
2. Se/quando um alvo web for perseguido, **só a camada universal do Expo UI** (`@expo/ui`, a mesma base de `packages/ui-native`) é candidata — nenhuma biblioteca de UI não-Expo é adotada para a web, pelo mesmo princípio de máximo nativo.
3. Partes do app que não têm camada universal hoje (abas nativas via `NativeTabs`, a biblioteca de mapas escolhida na F0-11) não têm substituto web definido — ficam fora do escopo até surgir necessidade concreta de app web.

## Consequências

- `apps/app` continua mobile-only (iOS/Android) em todas as builds (`eas.json`); nenhuma mudança de escopo imediata.
- Quando um alvo web for proposto, a avaliação já tem a resposta de princípio ("só a camada Expo UI universal, nada de terceiros"), evitando reabrir a discussão de ferramenta — mas ainda precisa de uma tarefa própria para verificar `expo-router`, `NativeTabs` e mapas em `react-native-web`.
- Este ADR fica **Aceito** como decisão de princípio; uma tarefa de implementação futura (fora da Fase 0) abre um ADR de execução se/quando o alvo web for de fato construído.

## Alternativas consideradas

- **Só a camada universal do Expo UI, platforms mobile-only por ora** (ESCOLHIDA): consistente com "máximo nativo no Expo"; não compromete esforço de implementação agora.
- **App web completo com paridade de funcionalidades**: rejeitada por depender de bibliotecas não avaliadas (mapas, abas nativas) fora do ecossistema Expo puro.
- **App web reduzido via Expo UI, sem mapa/abas nativas**: não rejeitada em definitivo, mas sem tarefa aberta — é o caminho mais provável se um alvo web for perseguido no futuro, dado o princípio aceito.
