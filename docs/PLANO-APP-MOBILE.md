# Farol da Cultura — plano enxuto: app mobile novo a partir do app existente

**Status:** implementação autorizada pela pessoa em 12/11/2026, com a resposta "pode implementar" ao plano proposto. A pessoa não respondeu às decisões D1 e D2 uma a uma: a implementação segue as propostas da seção 7 até que ela diga o contrário. · **Data:** 12/11/2026 · **Origem:** rascunho de agente, a pedido da pessoa.

**Lugar deste plano:** a Fase 0 fica registrada em [`PLANO-FASE-0-REVISADO.md`](./PLANO-FASE-0-REVISADO.md) e foi aprovada, com pendências, em [`relatorios/portao-0.md`](./relatorios/portao-0.md). Este plano toma o lugar do roteiro das Fases 1 a 4 (dados, app, painel), que nunca entrou neste repositório: [`PLANO-EXECUCAO.md`](./PLANO-EXECUCAO.md) é um stub.

## 1. Objetivo

Colocar o app novo (`apps/app`, Expo SDK 58) no lugar do app existente nas lojas, com o núcleo do que ele faz hoje: ver a agenda, achar no mapa e guardar favoritos. O que não serve a isso sai do plano.

## 2. Premissa: o que é "o app existente" e como ele é usado

O app existente é o Farol da Cultura publicado com o id `br.com.farol.cultura`, cujo código é o Flutter de `../farol-cultural`. O app novo continua sendo o `apps/app` deste monorepo, e a variante `production` dele já usa esse mesmo id.

| Do app existente                                                                                   | Como entra no app novo                      |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Telas e fluxos das 5 abas (Início, Agenda, Mapa, Favoritos, Perfil)                                | Referência do escopo (seção 4)              |
| Textos em português (`app_pt.arb`, 211 chaves)                                                     | Origem dos textos de `packages/i18n`        |
| Imagens de categoria (`imagens/`) e GeoJSON das regionais (`assets/geo/`)                          | Copiados quando a tela que os usa for feita |
| Formato dos dados: evento, datas em espaços, categorias (`lib/app/modules/splash/domain/adapter/`) | Base do schema mínimo (M1)                  |
| Listagens nas lojas                                                                                | O app novo sai como atualização delas (M8)  |

Não entram o código Dart, a API nem o login do app existente (seção 3).

## 3. Fatos observados em 12/11/2026

Verificado por leitura dos repositórios locais e por requisições GET públicas, sem autenticação. Nenhum arquivo de segredo foi aberto.

- **App novo:** `apps/app` tem as 4 abas nativas (agenda, mapa, favoritos, conta) vazias. `@farol/tokens`, `@farol/ui-native` (4 controles) e `@farol/i18n` (só os rótulos das abas) estão prontos. Segundo o relatório do PORTÃO 0, o dev build Android roda no Moto G35 e o iOS nunca foi construído. O app não tem `@supabase/supabase-js` nem executor de testes (V24), e `supabase/` não tem migração.
- **Lojas:** Google Play e App Store mostram "Farol da Cultura" na versão 1.1.7 (23/10 e 27/10/2026), publicado por Redeinova Tecnologia. O repositório `farolcultura-dev/farol-cultural` (clone local igual ao remoto, commit `7a26d28` de 08/09/2026) está na 1.1.6, `versionCode` 28. O código da 1.1.7 não está nesse repositório, então a referência funcional deste plano é a 1.1.6.
- **API do app existente:** os dois endereços que o código 1.1.6 usa não servem. `api.agenda.cultura.ce.gov.br` devolveu 502 nas cinco requisições feitas (`/`, `/api/versao`, `/api/categorias`, `/api/eventos`), e `apiagendacultural.redeinova.com.br` não tem registro DNS. Não se sabe há quanto tempo, nem se a 1.1.7 usa outro endereço.
- **Mapa Cultural do Ceará**, de onde o app existente sincroniza agenda e espaços (README dele): a API pública respondeu 200 a `GET /api/event/find`.
- **Raspagem-Farol** (`Mutirao/Raspagem-Farol`, commit `941a758`): coleta eventos do Sympla em Fortaleza para um Postgres próprio, com curadoria e exportação.

## 4. Escopo da v1

| Aba do app novo | O que porta do app existente                                                                                                                                                                                | Fora da v1                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Agenda          | Início e Agenda: eventos por data, busca por texto, filtros de período, categoria, gratuito ou pago e recursos de acessibilidade do espaço (se a fonte da D1 trouxer o dado), detalhe do evento e do espaço | Banners e destaques, grupos de programação, avaliação de evento      |
| Mapa            | Espaços e eventos no mapa, perto da localização do aparelho                                                                                                                                                 | Escolha manual de local                                              |
| Favoritos       | Favoritar evento e ver os próximos favoritos                                                                                                                                                                | Favoritos na conta: na v1 ficam só no aparelho (D2)                  |
| Conta           | Termos de uso e política de privacidade (as páginas de `farol.mutirao.org.br` que o app existente já abre), ajuda e sobre                                                                                   | Login, cadastro, dados cadastrais e senha; idiomas além do português |

Também ficam fora a introdução e as notificações.

## 5. Fora do plano

- Painel administrativo: `apps/painel`, ADR-0006, skill e MCP `shadcn`, `theme.css`.
- Worker de coleta com raspagem (`workers/coleta`). A entrada de dados reais se reduz a uma importação (M7).
- App web (o ADR-0005 já limita a iOS e Android) e Maestro (V23).
- Conta, login e sincronização entre aparelhos (V19).
- Mais ferramenta de agente: o que a Fase 0 entregou basta.

Nada é apagado do repositório: pastas, ADRs e skills ficam como estão, sem tarefa.

## 6. Tarefas

Uma tarefa é um branch e um PR com CI verde. Ordem: M1 → M2 → M3 → (M4, M5). M6 e M7 correm em paralelo a partir da M1. M8 fica por último.

**Verificação de tela**, exigida em toda tarefa de tela: no Moto G35, com o dev build, a tela funciona com o seed, o `uiautomator dump` mostra rótulo em todo controle, e um print com `font_scale 2.0` sem texto cortado vai no PR. Os textos vêm de `@farol/i18n` e os controles de `@farol/ui-native`.

| #   | Tarefa                                                                                                                                                                                                                                                                                                                 | Depende de                        | Pronto quando                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| M1  | Dados mínimos: uma migração com espaços, eventos, datas do evento em espaços e categorias. Leitura pública só do que está publicado. GRANT, RLS e pgTAP na mesma migração (skill `farol-rls`). `seed.sql` com amostra de desenvolvimento                                                                               | —                                 | `pnpm supabase db reset && pnpm supabase test db` verde no local e no CI                                                |
| M2  | Agenda: lista de eventos lida do Supabase, busca e filtros. Componente de lista conforme o ADR-0002. Escolhe o executor de testes do app (V24; proposta: `jest-expo`) e testa a lógica de filtro                                                                                                                       | M1, F0-10                         | Testes no CI; verificação de tela; checklist humano de TalkBack                                                         |
| M3  | Detalhe do evento e do espaço                                                                                                                                                                                                                                                                                          | M2                                | Verificação de tela                                                                                                     |
| M4  | Mapa com espaços e eventos. Biblioteca conforme o ADR-0003                                                                                                                                                                                                                                                             | M3, H5, F0-11                     | Verificação de tela com os pinos do seed                                                                                |
| M5  | Favoritos guardados no aparelho                                                                                                                                                                                                                                                                                        | M3, D2                            | Teste da lógica; verificação de tela; o favorito continua lá depois de fechar e abrir o app                             |
| M6  | Conta: termos, privacidade, ajuda e sobre                                                                                                                                                                                                                                                                              | —                                 | Verificação de tela                                                                                                     |
| M7  | Dados reais: importação agendada da fonte escolhida na D1 para as tabelas da M1, idempotente pelo id externo e com proveniência (skills `farol-connector` e `farol-sync-rules`). O mecanismo é o mais simples que rode agendado, decidido no PR                                                                        | M1, D1                            | Teste com fixture: importar duas vezes não duplica nem apaga; contagens de recebidos, criados e alterados registradas   |
| M8  | Publicação: Expo Observe no app (ADR-0004); versão acima da 1.1.7 publicada (hoje `app.config.ts` diz 0.1.0); schema e dados no Supabase de produção; build `production`; checklist humano de acessibilidade (TalkBack, VoiceOver, fonte máxima) nas telas reais; teste interno no Play e TestFlight antes da produção | M1 a M7, D3, H3, H10, contenção 1 | Num aparelho com o app existente instalado, a atualização pela loja abre o app novo com dados reais; checklist assinado |

`supabase db push` e `eas submit` são negados ao agente em `.claude/settings.json`. Subir o schema e enviar às lojas são passos humanos.

Se a H5 não chegar, publicar sem a aba Mapa é decisão da pessoa.

## 7. Decisões e bloqueios humanos

| #           | O que                                          | Bloqueia      | Observação                                                                                                                                                                                |
| ----------- | ---------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1          | Fonte dos dados reais                          | M7            | Proposta: importar do Mapa Cultural do Ceará, que é a fonte do app existente e está no ar. A API do app existente não serve hoje (seção 3). O Raspagem-Farol cobre só Sympla em Fortaleza |
| D2          | Favoritos sem conta na v1                      | M5            | Proposta: sim. Consequência: contas e favoritos do app existente não passam para o novo                                                                                                   |
| D3          | Supabase de produção                           | M8            | Só existe o `farol-dev`, no plano Free, que pausa após cerca de 7 dias sem uso. Usar esse projeto em produção ou criar outro é decisão da pessoa                                          |
| H3          | Acesso Apple para build e registro de aparelho | iOS na M8     | Pendente desde a Fase 0                                                                                                                                                                   |
| H5          | Chave Google Maps restrita                     | M4            | Pendente desde a Fase 0                                                                                                                                                                   |
| H10 (novo)  | Acesso de publicação às listagens              | M8            | No Play e na App Store o app existente é publicado por Redeinova Tecnologia. Sem acesso a essas contas, ou transferência do app, o app novo não sai como atualização                      |
| Contenção 1 | Play App Signing conferido e upload key nova   | Android na M8 | [`checklists/fase-0-contencao.md`](./checklists/fase-0-contencao.md), item 1                                                                                                              |

## 8. Pendências da Fase 0

| Pendência                                                                                                                            | Destino                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| F0-10, spike de lista: infraestrutura no branch `spike/lista` (PR #17, 4 commits atrás da `main`), ADR-0002 em rascunho, sem medição | Pré-requisito da M2: atualizar o branch e medir numa sessão com o aparelho desperto |
| F0-11, spike de mapa: não iniciado                                                                                                   | Pré-requisito da M4, depois da H5                                                   |
| F0-08, checklist de acessibilidade: não executado                                                                                    | Executado na M2, na primeira tela real, e de novo na M8                             |
| Contenção 6 (selos) e 7 (responsáveis pelas lacunas)                                                                                 | Não bloqueiam o app. O app existente não tem selos                                  |

## 9. Pendente depois do aceite

O `AGENTS.md` (linhas 35 e 62) ainda aponta o plano da Fase 0 como o plano vigente. Trocar esse ponteiro exige aprovação síncrona e explícita da pessoa, por regra do `CLAUDE.md`, e "pode implementar" não foi tratado como essa aprovação.
