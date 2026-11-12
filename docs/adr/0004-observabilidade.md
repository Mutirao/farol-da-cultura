# ADR-0004: Observabilidade — Expo Observe × Sentry

- **Status:** Aceito
- **Data:** 2026-11-11 (decisão em 2026-11-12)
- **Decisor:** Lucas Pirola, em sessão ativa, 12/11/2026
- **Requisitos:** OPS-03

## Contexto

O `PLANO-EXECUCAO.md` v1.0 cita "EAS Observe" como ferramenta de observabilidade (seção 3, V22). A documentação atual mostra que o produto foi renomeado para **Expo Observe**, com disponibilidade geral (GA) em 20/08/2026 (docs.expo.dev/eas/observe).

Fatos levantados na Fase 0 (plano revisado, seções 3/V22 e 6/H9):

- **Expo Observe**: plano **Free** concede **100 mil eventos por mês**. Cobre **apenas o app** (crashes, performance, logs do runtime Expo/EAS). **Não cobre** o painel administrativo (`apps/painel`, web) nem as Edge Functions do Supabase previstas no requisito **OPS-03**.
- **Sentry**: alternativa de mercado com SDKs para React Native/Expo, para aplicações web (React/Vite) e para runtimes serverless/Deno (Edge Functions), o que cobriria os três alvos (app, painel, Edge Functions) com uma única ferramenta e um único painel de observabilidade.
- O requisito OPS-03 pede observabilidade que cubra app, painel **e** Edge Functions — nenhuma dessas duas opções é adotada "de cobertura total" sem uma escolha explícita: Expo Observe cobre só um terço do escopo; Sentry cobriria os três, mas exige avaliação de custo, retenção de dados e esforço de integração em cada alvo.
- Esta decisão foi explicitamente apontada no plano revisado como pré-requisito humano **H9**: "Responsável pela escolha Expo Observe × Sentry (§13)" — bloqueia apenas esta decisão, não o restante da Fase 0.
- A seção 16 (decisões do aceite, 11/11/2026) não resolveu H9: a pessoa aceitou o plano revisado, mas a escolha de observabilidade continua pendente de decisão humana separada.

## Decisão

**H9 respondida em 12/11/2026: Expo Observe.** Decisão alinhada ao princípio geral adotado nesta mesma sessão — "manter o máximo nativo no Expo" (preferir a ferramenta nativa do ecossistema Expo a uma integração de terceiros sempre que uma opção nativa exista) — e registrado em `AGENTS.md`.

Escopo explícito da decisão: Expo Observe cobre `apps/app` (crashes, performance, logs do runtime Expo/EAS), no plano Free (100 mil eventos/mês). **A cobertura de `apps/painel` e das Edge Functions do Supabase (parte de OPS-03) não foi decidida aqui** — fica como item em aberto para quando essas superfícies existirem (painel nasce na Fase 3; Edge Functions ainda não têm ADR). Nenhuma ferramenta de terceiros (Sentry) é adotada agora.

A integração de fato do Expo Observe em `apps/app` é tarefa de implementação, não desta decisão — entra como tarefa em fase posterior (fora do escopo das tarefas F0-01 a F0-13).

## Consequências

- `apps/app` ganha observabilidade via Expo Observe quando a tarefa de integração for criada; nenhum código de observabilidade existe ainda.
- `apps/painel` e as Edge Functions ficam sem decisão de observabilidade até essas superfícies existirem — revisar este ADR (ou abrir um novo) quando a Fase 3/Edge Functions estiverem no horizonte.
- Risco aceito: enquanto a integração não acontece, a Fase 0 segue sem instrumentação de observabilidade em produção (sem mudança em relação ao estado anterior).

## Alternativas consideradas

- **Expo Observe** (ESCOLHIDA): cobre só o app, mas é a ferramenta nativa do ecossistema Expo, consistente com o princípio "máximo nativo no Expo". Plano Free suficiente para o volume esperado da Fase 0/1.
- **Sentry**: cobriria as três superfícies (app, painel, Edge Functions) com um único painel, mas é uma dependência de terceiros fora do ecossistema Expo — rejeitada por essa razão, não por limite técnico.
- **Expo Observe (app) + Sentry (painel e Edge Functions) combinados**: rejeitada pelo mesmo princípio — adiada até painel/Edge Functions existirem, quando a decisão específica para essas superfícies será revisitada.
