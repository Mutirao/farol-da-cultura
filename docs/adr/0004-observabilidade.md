# ADR-0004: Observabilidade — Expo Observe × Sentry

- **Status:** Proposto
- **Data:** 2026-11-11
- **Decisor:** _(em branco — decisão humana pendente, H9)_
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

**Nenhuma decisão de produto é tomada neste ADR.** Este documento registra a evidência levantada na Fase 0 (fatos, limites de cobertura e plano gratuito de cada opção) para que a decisão humana (H9) seja tomada com essa base, quando a pessoa retornar. O ADR permanece com status **Proposto** até essa decisão.

Nenhum código de observabilidade é implementado na Fase 0 por causa desta pendência: a integração de Expo Observe e/ou Sentry em `apps/app`, `apps/painel` e nas Edge Functions acontece em fase posterior, condicionada à resposta de H9.

## Consequências

- Enquanto H9 não for respondida, a Fase 0 segue sem instrumentação de observabilidade em produção — risco aceito explicitamente no plano (o caminho crítico da Fase 0 é acesso/infra, não este ADR).
- Se a escolha recair sobre Expo Observe, o painel e as Edge Functions (OPS-03) ficam sem cobertura de observabilidade até uma ferramenta complementar ser escolhida para eles — ou seja, Expo Observe isolado não satisfaz OPS-03 por completo.
- Se a escolha recair sobre Sentry, há custo de licenciamento/retenção a avaliar e esforço de integração em três superfícies diferentes (RN/Expo, web, Deno/Edge Functions), mas um único painel cobre OPS-03 inteiro.
- Precisa ser revisto quando H9 for respondida: este ADR deve ser atualizado para Aceito (ou Rejeitado/Substituído) com o nome do decisor, a data e a opção escolhida, antes de qualquer tarefa de integração de observabilidade ser iniciada.

## Alternativas consideradas

- **Expo Observe isolado**: cobre só o app; não atende OPS-03 por completo (painel e Edge Functions ficam de fora). Mantido como opção em aberto, não descartado.
- **Sentry isolado**: cobre as três superfícies, mas custo e esforço de integração ainda não foram medidos nesta fase. Mantido como opção em aberto, não descartado.
- **Expo Observe (app) + Sentry (painel e Edge Functions) combinados**: evitaria pagar por cobertura redundante no app, mas duplica painéis de observabilidade e processos de triagem de incidente. Mantido como opção em aberto, não descartado.
- Nenhuma das três foi escolhida: a escolha depende da decisão humana H9.
