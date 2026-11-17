# Farol da Cultura — plano unificado: app, coleta e curadoria

**Data:** 2026-11-16. **Status:** proposta de execução, ainda não implementada.
**Repositório de destino:** `/mnt/data/code/farol/farol-da-cultura` (`Mutirao/farol-da-cultura`).
**Referência inspecionada:** `main`, HEAD `39d4044`; checkout limpo antes de salvar este documento.
**Direção aprovada pela pessoa:** integrar coleta/curadoria e o app Expo no mesmo produto, com Supabase/PostgREST, reduzir dependências e aposentar a aplicação web Raspagem-Farol independente.

A aprovação dessa direção e a solicitação deste plano não autorizam migração hospedada, alteração de segredos, ativação de cron, deploy nem publicação nas lojas.

## 1. Objetivo

Unificar o Farol em um monorepo e um backend Supabase, mantendo o app Expo, integrando a coleta e a curadoria com um painel pronto e preservando os dados e comportamentos úteis do Raspagem-Farol, sem carregar seu servidor e seus frameworks para o destino.

## 2. Lugar deste plano e decisões preservadas

Este documento propõe substituir o planejamento **futuro da integração**; não apaga a história ou transforma entrega anterior em pendência.

- `docs/PLANO-APP-MOBILE.md` continua sendo a referência das funcionalidades mobile já entregues e das pendências de publicação. A exclusão de painel/raspagem daquele escopo passa a ser reaberta por esta proposta unificada, sem bloquear a evolução do app enquanto a integração é construída.
- `docs/PLANO-FASE-0-REVISADO.md` continua como histórico da fundação e dos gates.
- `docs/PLANO-EXECUCAO.md` é um stub no checkout inspecionado; não tratá-lo como especificação implementada.
- `docs/adr/0007-importacao-da-agenda.md` e a RPC `public.importar_agenda` continuam válidos para o Mapa Cultural, com a restrição por fonte descrita adiante.
- `docs/adr/0006-painel.md` registra a decisão humana anterior por Refine. Este plano propõe **reabrir essa escolha e adotar React-admin padrão com `ra-supabase`**, condicionado ao pequeno teste de compatibilidade U0.3 e ao aceite da revisão. Não instalar Refine e React-admin juntos.
- O ADR-0005 de Expo/web continua aplicável ao app público: este plano não adiciona alvo web ao app Expo. O painel de operação é outra interface, não uma versão web do app.
- Não modificar `AGENTS.md`, `CLAUDE.md` ou os `CLAUDE.md` locais sem a aprovação síncrona específica exigida pelo projeto. Eles contêm trechos desatualizados; isso é uma atualização documental a aprovar, não licença para ignorar segurança.
- Não retomar a exigência de branch/PR por microtarefa como pressuposto: existe decisão mais recente da pessoa por trabalho direto na main com checks locais. Nenhum commit/push foi autorizado ou executado neste turno de planejamento; acertar o fluxo antes da execução, sem alterar instruções automaticamente.

### Não fazem parte desta mudança

Login de usuários finais, sincronização de favoritos, notificações, app web público, novo mapa nativo, deduplicação automática entre fontes, publicação automática no Mapas Cultural, migração de contas Flutter antigas, Redis, filas, GraphQL, microserviços ou uma API própria na frente do PostgREST.

As pendências mobile de mapa embutido, medições, acessibilidade humana, Apple, Google Maps, acesso às lojas e decisão do Supabase de produção continuam abertas onde já estavam registradas. Esta integração não pode ser declarada como conclusão delas.

## 3. Contexto verificado e limites da evidência

### 3.1 O que existe no app

| Evidência                                                | Estado observado                                                                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/app/package.json`                                  | Expo `~58.0.25`, React `19.3.0`, TypeScript do catálogo; sem SDK Supabase como dependência direta                                        |
| `apps/app/src/agenda/dados.ts`                           | `fetch` em `/rest/v1/eventos`, seleção relacional, validação Zod, paginação de 200 e limite de páginas                                   |
| `apps/app/src/agenda/AgendaProvider.tsx`                 | prazo de requisição, erro recuperável, favoritos locais; sem sessão administrativa                                                       |
| `apps/app/src/app/evento/[id].tsx`                       | link de origem é construído apenas para `mapa-cultural-ce`; Sympla precisa de adaptação limitada                                         |
| `supabase/migrations/20261113015139_agenda_minima.sql`   | `espacos`, `eventos`, `eventos_datas`, `categorias`, `eventos_categorias`; leitura pública condicionada a publicação                     |
| `supabase/migrations/20261113020741_importar_agenda.sql` | importação transacional por fonte; criação publicada; preserva decisão editorial posterior; remove datas ausentes de uma janela completa |
| `workers/coleta/src/importar.ts`                         | Node + `fetch`; chama `rpc/importar_agenda`; loga contagens                                                                              |
| `workers/coleta/package.json`                            | só Zod como dependência direta de produção                                                                                               |
| `.github/workflows/coleta.yml`                           | agendamento existente, gate `COLETA_ATIVA`, ambiente `coleta`, concorrência serial                                                       |
| `apps/painel/CLAUDE.md`                                  | não há painel implementado; referência antiga a Refine                                                                                   |

`docs/relatorios/app-mobile-android.md` registra demonstração Android de desenvolvimento e resultados anteriores, não uma versão publicada nem execução repetida neste planejamento. Favoritos já usam `fonte:id_externo`: preservar essa identidade, não o ID numérico como identidade global.

### 3.2 Origem da raspagem

Repositório de referência real: `/mnt/data/code/farol/raspagem-farol`, HEAD inspecionado anteriormente `941a758`. O caminho `/mnt/data/code/mutirao/raspagem-farol` de algumas instruções locais está desatualizado neste ambiente.

Existem WIP alheios na origem: `chart/templates/dev-postgres.yaml`, `chart/templates/migration-job.yaml` e `kimi-export-session_-20261007-011240.md`. Não copiar, limpar, commitar ou apagar esses arquivos durante a integração.

Preservar as dez tabelas da raspagem, seus IDs, constraints, relacionamentos, sequences e conteúdo:

```text
public.sources
public.connectors
public.events
public.spaces
public.event_space_candidates
public.job_runs
public.exports
public.export_items
public.users
public.login_tokens
```

Não renomear `events` para `eventos`, `spaces` para `espacos`, nem converter IDs para UUID. As cinco tabelas do app também permanecem como estão. Os nomes distintos permitem coexistência, mas a ausência de colisões no banco vivo precisa ser demonstrada antes de qualquer importação.

### 3.3 Checks realmente executados agora

- Shell padrão: Node `v22.23.3`, inferior à versão do projeto; **não baixar versões do projeto para acomodar o shell**.
- `.nvmrc`: `26.10.0`; existe `/home/lucas/.nvm/versions/node/v26.10.0/bin/node`.
- pnpm: `12.18.0`.
- Com Node 26.10.0 no PATH, `pnpm exec biome ci .`: **exit 0**, 111 arquivos, nenhum fix aplicado, oito avisos preexistentes de non-null assertion.
- Com Node 26.10.0, typecheck sem emissão e sem incremental do app e do importador: **exit 0** nos dois.
- Não foram executados testes, build de tokens/app, reset de banco, pgTAP, instalação, benchmark, browser, coleta viva, migração ou deploy nesta análise. `turbo test` pode construir dependências e gravar cache; reset/pgTAP modificam banco local. Esses comandos são tarefas de execução, não provas já obtidas.

Não copiar números de testes do relatório anterior para o aceite novo. Registrar números reais ao executar.

## 4. Arquitetura de destino

Supabase é o único backend web: PostgREST para consultas, Auth apenas para operadores e RPCs SQL para mutações transacionais. O app Expo continua consumindo a agenda publicada e o painel React-admin opera coleta, curadoria, publicação e exportação sem outro servidor CRUD. Importação API e raspagem Chromium continuam como scripts Node separados no mesmo monorepo, pois têm custos e dependências diferentes, não como serviços web novos.

```text
workers/coleta (já existe)
  Mapa Cultural → validação → RPC importar_agenda
                                      │
                                      ▼
                         public.eventos / eventos_datas
                         public.espacos / categorias
                                      ▲
                                      │ RPC publicar_curados
workers/sympla → RPC registrar_coleta_sympla
                      │               ▲
                      ▼               │
              public.events ── decisão do curador
              dados brutos            │
              job_runs          apps/painel
                                      │
                  Supabase Auth + PostgREST + RPC
                                      │
                                      ▼
                              apps/app (Expo)
                        só consulta agenda publicada
```

O diagrama é a proposta, não prova de que essas RPCs novas existem. `public.importar_agenda` é a única RPC dessa lista já existente.

### 4.1 Organização proposta

```text
apps/app/                    # Expo existente; alteração pequena de origem/fixtures
apps/painel/                 # React-admin padrão; só frontend estático
workers/coleta/              # importador API existente, continua leve
workers/sympla/              # coletor Chromium, parser e normalização reaproveitados
supabase/migrations/         # uma única autoridade de migrations
supabase/tests/              # grants, RLS, RPCs e publicação
supabase/functions/exportacoes/   # exceção delimitada para CSV legado, se passar U4
packages/compat-csv/          # código puro compartilhado Node/Edge, sem React/Expo
scripts/migracao/             # ferramentas operacionais; não importadas pelo app
```

**Por que dois workers:** não adicionar Chromium/Crawlee a `workers/coleta`, que hoje só precisa de Zod, nem ao bundle do app/painel. Eles compartilham repositório, convenções, banco e protocolo de gravação; não precisam compartilhar processo ou deploy.

**Por que não compartilhar toda a UI:** o app é nativo e o painel é tabular. Não importar MUI/React-admin no Expo, nem Expo/React Native no painel. `packages/i18n` hoje importa `expo-localization`; portanto não importá-lo inteiro na SPA por conveniência. Mensagens puras do painel ficam no painel inicialmente; extrair pacote comum só quando houver dois consumidores reais. `@farol/tokens/tokens.json` pode ser consumido sem importar UI nativa.

### 4.2 Dependências: orçamento explícito

- Não trazer NestJS, Express, AdminJS, Refine, Ant Design, Drizzle, reflect-metadata, session middleware ou outro ORM para o monorepo.
- Não adicionar SDK Supabase ao app só porque o painel usa um. O `fetch` atual já funciona com PostgREST.
- O worker Sympla usa `fetch` nativo para RPC, como o importador existente; nenhum SDK, driver PostgreSQL ou ORM nele.
- Reaproveitar Crawlee/Playwright/Cheerio inicialmente, com suas versões testadas; removê-los ou trocar o motor é outra mudança, não parte da migração de arquitetura.
- Declarar `@crawlee/memory-storage` diretamente: `engine.ts` o importa, e pnpm não deve depender de hoisting transitivo.
- React-admin traz MUI, roteamento e estado de dados por baixo. A meta é menos código/integrações **próprios**, não anunciar uma redução não medida de pacotes transitivos.
- Não montar um kit sobre outro kit: sem shadcn-admin-kit sobre React-admin e sem TanStack Table adicional.
- Não criar um conjunto de Edge Functions. A única exceção proposta é preservar a geração de CSV no backend com o renderer já testado. U4 compara essa exceção com SQL e mede capacidade antes de incorporá-la; não inventar compatibilidade Deno ou capacidade.

## 5. Regras de dados e publicação

### 5.1 Um banco não significa uma tabela para tudo

| Conjunto                                                   | Autoridade                                    | Acesso                                                      |
| ---------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Dados/evidência da raspagem (`events` e relacionados)      | coleta e curadoria                            | restrito ao operador; nunca leitura pública indiscriminada  |
| Agenda (`eventos`, `eventos_datas`, `espacos`, categorias) | importação Mapa e publicação editorial Sympla | público somente quando `publicado`                          |
| `auth.users`                                               | Supabase Auth                                 | autenticação do operador                                    |
| `public.users` legado                                      | contas de curadoria existentes                | ID inteiro preservado; autorização mapeada de forma privada |

As linhas de agenda são uma projeção editorial, não uma substituição nem cópia de segurança dos dados brutos. IDs originais de coleta não são usados como chave primária de `eventos`. Proveniência estável: `fonte='sympla'` e `id_externo=events.external_id`; no Mapa permanece `fonte='mapa-cultural-ce'`.

### 5.2 Diferença crítica entre as fontes

**Mapa Cultural:** o contrato atual pressupõe snapshot completo da janela e permite remover datas que desapareceram. Manter esse comportamento somente para a fonte existente.

**Sympla:** listagem parcial ou ausência não prova cancelamento. Nunca chamar `importar_agenda('sympla', ...)` para reaproveitar esse algoritmo. Criar RPCs próprias de coleta e publicação incremental; nenhum DELETE por ausência.

Acrescentar em migration nova uma trava de `importar_agenda` para aceitar somente `p_fonte='mapa-cultural-ce'`. Testes atuais usam fontes `pgtap-*`: adaptá-los usando a fonte real dentro de transação com rollback e fixtures filtradas por IDs próprios, sem remover os asserts de isolamento. Uma segunda fonte só entra por revisão explícita, não por aceitar qualquer string silenciosamente.

### 5.3 Ciclos de vida independentes

- Coletar não aprova, publicar não exporta CSV, exportar não publica e matching não aprova.
- Aprovar/rejeitar mantém os quatro ciclos legados (`space_match_*`, `curation_*`, `export_*`, `mapas_import_*`) independentes.
- Publicar exige aprovação, `collection_status='included'`, título e data válidos. Registro legado ainda não reprocessado precisa ser reclassificado antes de publicar, não receber classificação inventada.
- Aprovação não publica automaticamente. O botão de publicação é uma intenção explícita.
- Rejeitar um evento já publicado também o despublica na mesma transação. Isso é uma nova integração editorial intencional; não altera `export_status` ou os bytes de lotes históricos.
- Recoleta atualiza apenas os dados da fonte na área de coleta; **não atualiza nem republica automaticamente o snapshot público**. O painel indica versão coletada diferente da última publicada para nova revisão.
- Despublicar não apaga evento/datas nem reatribui seus IDs. Recoleta não desfaz despublicação.
- Nenhuma deduplicação automática entre Mapa Cultural e Sympla; títulos parecidos não são chave de identidade.

### 5.4 Mapeamento de publicação Sympla

| Destino                    | Regra                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `eventos.fonte`            | literal `sympla`                                                                                                           |
| `eventos.id_externo`       | `events.external_id` original, sem reformatar                                                                              |
| `eventos.nome`             | título normalizado existente                                                                                               |
| `descricao_longa`          | descrição normalizada; sem HTML executável                                                                                 |
| `descricao_curta`          | texto limpo limitado por Unicode a 900 caracteres; não inventar resumo de IA                                               |
| `imagem_url`               | HTTPS válida ou null                                                                                                       |
| `classificacao_etaria`     | null se não existe evidência; não confundir categoria com classificação                                                    |
| `categorias`               | vazias se não há classificação confiável; não inferir por título                                                           |
| `eventos_datas.id_externo` | literal `principal`, por evento; não usar a data como identidade, pois pode haver remarcação                               |
| `inicio` / `fim`           | timestamps existentes; recusar fim anterior ao início                                                                      |
| `preco`                    | texto da origem quando disponível e validado; sem estrutura confiável, null, não um valor inventado                        |
| `gratuito`                 | evidência disponível; false legado sozinho não comprova preço conhecido; ausência de evidência pode virar null na projeção |
| `espaco_id`                | espaço Mapas já publicado, somente se vínculo aceito e identidade de origem comprovados; caso contrário regra abaixo       |

Sem vínculo comprovado: se houver nome de local, criar/atualizar um espaço de apresentação com `fonte='sympla'`, `id_externo='evento:' || external_id`, nome/endereço/cidade disponíveis, coordenadas null e acessibilidade vazia. A chave por evento evita mesclar locais por nome. Se nem nome houver, `espaco_id=null`; o app já aceita ocorrência sem espaço. Não geocodificar nem fabricar coordenadas nesta entrega.

Criar `private.publicacoes_sympla` como metadado operacional: `event_id` inteiro FK para `events`, `evento_id` bigint FK para `eventos`, `collected_version`, `published_by` inteiro FK para `users`, `published_at`; `event_id` é único. Não alterar colunas das tabelas preservadas.

Publicação recebe versão esperada de cada registro; com lock de linha, versão divergente retorna conflito para refetch/confirmar novamente. A mesma publicação repetida é idempotente por fonte/ID externo e não cria outra data `principal`.

### 5.5 Link da origem no app sem remodelar tabelas

O modelo mobile não contém URL de origem. Não adicionar `source_url` a `eventos` implicitamente. Criar `public.consultar_origem(p_fonte text,p_id_externo text)` retornando URL pública de um **evento publicado**:

- Mapa: URL já conhecida, validando ID numérico.
- Sympla: `source_url` preservada da coleta, somente após validação de protocolo HTTPS e host permitido.
- Fonte desconhecida, evento não publicado, URL inválida: null.

A RPC pública retorna só uma URL, nunca raw JSON, credenciais, usuário ou motivos internos. `security definer`, se necessário para ler coleta restrita, exige `search_path=''`, nomes qualificados, checagem de publicação e teste negativo. O app chama a RPC apenas no detalhe Sympla; o caminho Mapa atual continua local. Publicar URLs não exige que o app tenha conta.

## 6. Contratos de backend e permissões

Nomes abaixo são **propostos**, exceto `importar_agenda`, e devem ser implementados exatamente ou alterados formalmente no contrato antes de seus callers.

| Operação                                          | Caller        | Entrada e saída                                                   | Fronteira/garantia                                                    |
| ------------------------------------------------- | ------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `importar_agenda(text,jsonb)`                     | worker Mapa   | contrato existente                                                | só servidor; snapshot por janela de `mapa-cultural-ce`                |
| `contexto_coleta_sympla()`                        | worker Sympla | fonte/conector ativos + URLs para revisita                        | só servidor; erro antes da navegação se registro ausente/inativo      |
| `registrar_coleta_sympla(uuid,timestamptz,jsonb)` | worker Sympla | run key, início, relatório validado → `runId,status,counters`     | só servidor; advisory lock de fonte na transação; upserts e manifesto |
| `current_curator()`                               | painel        | identidade mínima ou null                                         | Auth UUID mapeado a usuário inteiro ativo/curator                     |
| `curar_eventos(jsonb,text)`                       | painel        | IDs/versões esperadas + status → alterados/ausentes/conflitos     | autor derivado da sessão; locks em ordem de ID                        |
| `publicar_curados(jsonb)`                         | painel        | IDs/versões esperadas → publicados/impedidos                      | aprovação + incluído + dados válidos; transação atômica               |
| `alterar_publicacao(bigint,boolean)`              | painel        | ID público e visibilidade → resultado                             | só curador; auditar decisão; não alterar descrição de fonte           |
| `consultar_origem(text,text)`                     | visitante/app | fonte/ID → URL ou null                                            | só conteúdo já público, sem exposição do staging                      |
| `exportacoes`                                     | painel        | geração com chave idempotente; download imutável; conferência CSV | única Function condicional de U4; sem CRUD paralelo                   |

### 6.1 Autorização administrativa

Adicionar `private.curator_identities(auth_user_id uuid PK references auth.users, user_id integer unique references public.users)`. `auth.users.id` não substitui `public.users.id`.

`current_curator` e toda RPC de operador verificam `users.is_active=true` e `role='curator'`, sem confiar em e-mail/papel enviado pelo navegador ou `user_metadata`. A desativação deve bloquear o mesmo JWT ainda não expirado. `public.users`, `login_tokens`, configurações de conectores, vínculos e recibos não ficam legíveis pelo cliente.

Manter login administrativo sem senha e cadastro público desabilitado: `shouldCreateUser:false`, signup desabilitado no Auth e confirmação explícita antes de `verifyOtp`. `ra-supabase` não entrega o magic link completo pronto segundo a documentação consultada; o pequeno adaptador é parte do plano, não uma capacidade presumida. Sessões/tokens legados expiram no corte; dados dos tokens são preservados.

### 6.2 Privilégios e RLS sem quebrar o app

- Manter as políticas públicas das cinco tabelas mobile; não fazer `REVOKE ALL ON ALL TABLES IN SCHEMA public` para proteger as dez legadas, pois isso quebraria a agenda.
- Enumerar as dez tabelas legadas nos grants/revokes; habilitar RLS antes de expor API.
- `anon`: nenhuma leitura das dez tabelas de coleta.
- `authenticated` sem vínculo: só o que a agenda pública já permite.
- Curador ativo: leitura limitada de `events`, `sources`, `spaces`, `job_runs` e metadados de `exports`; sem escrita direta. Ações usam RPCs.
- `csv_content_base64`: fora do SELECT permitido do painel; download autenticado.
- RPCs administrativas: revogar EXECUTE de PUBLIC/anon; conceder só a authenticated, mantendo autorização interna.
- `private` não entra em schemas expostos pelo PostgREST. Nenhuma chave secreta vai a `apps/**` ou prefixos públicos.
- Usar uma instância Supabase como destino lógico comum; qual projeto hospedado pode receber dados é gate humano. Não assumir que o Free existente comporta o volume de HTML/base64.

### 6.3 Concorrência e repetição

Workers novos fazem rede fora da transação e enviam relatório validado à RPC. Um UUID gerado uma vez por execução identifica replay após perda de resposta; reenvio usa o mesmo UUID. Em `job_runs.owner`, usar `sympla:<uuid>` nas execuções novas; preservar valores históricos. A RPC serializa persistência por fonte, consulta replay antes de upsert e retorna a execução já existente sem incrementar versões novamente.

O advisory lock da RPC não permanece durante a navegação: não alegar que mantém um lock entre requests. Agendamento Sympla é único e serial; relatório com início anterior à execução mais recente já aplicada vira `skipped`, registrado, para não sobrescrever dados novos com crawl antigo. Testar concorrência real de duas sessões, além de replay sequencial.

Erros de um evento usam subtransação/`EXCEPTION` SQL para preservar sucessos de outros e marcar `partial`, como o comportamento atual. Falha estrutural do lote é erro, não sucesso vazio. Exceção do conector produz relatório `failed` sem perder diagnóstico. Queda abrupta do processo antes de gravar é falha do job de CI, não evidência de um `job_runs` persistido; registrar essa limitação e alertar pelo scheduler.

## 7. Estratégia de implementação e gates

Os itens a seguir são unidades pequenas de edição (aproximadamente 2–5 minutos). Cada linha de uma matriz de casos deve ser um ciclo separado; não tentar implementar uma fase inteira num patch. Instalações, navegadores, ensaio de migração e CI naturalmente podem durar mais.

**TDD por comportamento:** teste → execução RED com falha da regra ausente → implementação mínima → mesma execução GREEN → gate da fase → commit local focado quando autorizado. Testes antigos de caracterização podem começar verdes: não apresentá-los como RED de uma feature nova. Não exigir um único teste monstruoso ou excluir asserts para retirar frameworks.

Todos os resultados esperados abaixo são critérios futuros; apenas os checks da seção 3.3 foram executados no planejamento.

### U0 — Baseline, destino e decisão do painel

#### U0.1 — Registrar baseline no Node correto

Criar `docs/relatorios/unificacao-baseline.md`. Ler `.nvmrc`; usar Node 26.10.0 já instalado. Comandos de execução:

```bash
node --version
pnpm --version
pnpm biome ci .
pnpm turbo run typecheck test
pnpm supabase start
pnpm supabase test db
```

Esperado: Node `v26.10.0`, pnpm `12.18.0`, checks sem erro; registrar totais reais. Oito avisos conhecidos do Biome não são oito erros nem motivo para refatoração fora do escopo. Não usar Turbo como read-only: ele pode construir tokens e gravar cache. Não resetar o Supabase local atual sem consentimento: pode conter a demonstração com dados reais.

Commit sugerido: `docs(plan): record verified unification baseline`.

#### U0.2 — Inventariar origem e destino sem segredos

Criar `docs/relatorios/unificacao-dados.md`: dez tabelas de raspagem, cinco de agenda, tamanhos, versões PostgreSQL, extensões, índices, sequences, namespace e histórico de migrations. Banco hospedado é leitura humana/autorizada; agentes não acessam segredos ou comandos remotos negados. Validar que nomes das tabelas e migrations não colidem no destino.

Anotar proprietário, projeto de destino, capacidade do plano, retenção de backup e consumidores externos. A diferença de capacidade entre agenda normalizada e HTML bruto/CSV base64 precisa ser medida; não contratar plano pago por conta própria.

#### U0.3 — Pequeno teste de compatibilidade do painel, sem alterar Expo

Arquivos candidatos: `apps/painel/package.json`, `apps/painel/tsconfig.json`, `apps/painel/vite.config.ts`, `apps/painel/src/main.tsx`, `apps/painel/src/app.tsx`, `apps/painel/index.html` e `pnpm-lock.yaml`. Primeiro concluir o gate humano de revisão D6; a prova de build pode ser feita num diretório de experimento aprovado sem contaminar o pacote final.

Versões pesquisadas no npm nesta análise: `react-admin@5.15.7`, `ra-supabase@4.0.0`, `@supabase/supabase-js@2.119.0`; peers declarados de React-admin aceitam React 19. `ra-supabase` agrupa core/UI Material UI e tem peers internos que precisam de instalação/build para prova real. Usar React/React DOM `19.3.0` do catálogo, não React 18 do plano antigo. Para evitar mudança desnecessária de tooling: `vite@7.3.8` e `@vitejs/plugin-react@4.7.0`, cujas faixas declaradas combinam. Não instalar tudo com latest; Vite/plugin latest têm outra composição.

Comandos previstos após criar o pacote `@farol/painel`:

```bash
pnpm --filter @farol/painel typecheck
pnpm --filter @farol/painel build
pnpm why -r react react-dom
pnpm --filter @farol/app typecheck
```

Esperado: painel mínimo builda, React do app não muda e bundle do app não importa MUI/ra-*; peers inválidos bloqueiam. Não contar apenas metadados npm como build aprovado. Não adicionar ESLint/Prettier: Biome já é a ferramenta comum.

#### U0.4 — Formalizar proposta sem reescrever ADR aceito

Criar `docs/adr/0008-plataforma-unificada.md`: Contexto, Decisão proposta, Consequências, relação com ADR-0006/0007. Definir React-admin padrão, staging restrito, publicação explícita, preservação de contratos e exceção CSV. A troca de painel só fica aceita com confirmação humana. Alterar ponteiros de instruções somente com autorização específica.

**Gate U0:** baseline real, destino/capacidade conhecidos, UI comprovadamente compatível e revisão D6 aceita. Rollback: retirar somente arquivos experimentais novos; app/importador e bancos existentes intactos.

### U1 — Schema legado preservado e acesso seguro

#### U1.0 — Habilitar testes das ferramentas sem depender de hoisting

Antes de usar `pnpm exec vitest` na raiz, modificar `package.json` adicionando `vitest`, `typescript` e `@types/node` como devDependencies com valor `"catalog:"`; essas ferramentas já têm versões no catálogo, mas hoje não são dependências diretas da raiz. Executar `pnpm install` e versionar o lockfile no mesmo commit. Não adicionar bibliotecas de aplicação na raiz.

Criar `tsconfig.tooling.json` estendendo `./packages/tsconfig/base.json`, com `compilerOptions.types=["node"]`, `allowImportingTsExtensions=true` e include `scripts/**/*.ts`. Adicionar script `check:tooling = tsc -p tsconfig.tooling.json` e executá-lo no CI; esse script roda diretamente e não chama Turbo recursivamente. Assim os testes/comandos das ferramentas abaixo são resolvíveis com pnpm estrito e os scripts também recebem typecheck.

Verificação: `pnpm exec vitest --version` deve mostrar a versão resolvida do catálogo; `pnpm run check:tooling` deve terminar com exit 0 após existir o primeiro script tipado. Não interpretar “vitest: command not found” como RED válido do gerador ou manifesto.

#### U1.1 — Transportar DDL, não o ORM

Criar `scripts/migracao/gerar-baseline.ts`, gerando `supabase/migrations/20261117000100_raspagem_baseline.sql` a partir dos cinco SQL históricos da origem `src/db/migrations/0000_extensions.sql` até `0004_sympla_collection.sql`, em ordem. Remover somente marcadores `--> statement-breakpoint`; manter colunas/constraints. Incluir comentário com SHAs calculados dos arquivos de origem, não inventados.

Criar `scripts/migracao/test/baseline.test.ts`: compara o resultado a concatenação independente dos cinco SQL; confirma dez tabelas e nenhuma alteração nas cinco mobile; detecta alteração de coluna/default/constraint. Esse DDL é bootstrap de banco vazio/local, não importação de dados.

Comandos RED/GREEN: `pnpm exec vitest run scripts/migracao/test/baseline.test.ts`. Após consentimento para reset **descartável/local**: `pnpm supabase db reset --local && pnpm supabase test db`. Esperado: DDL aplica sem colisões, testes M1/M7 continuam verdes.

Não instalar Drizzle no destino para gerar essas tabelas. Histórico `drizzle.__drizzle_migrations` será arquivado na migração de dados, não vira outro migrador ativo.

#### U1.2 — Fechar coleta e habilitar vínculo de curador

Criar `supabase/migrations/20261117000200_curadoria_acesso.sql`, `supabase/tests/003_curadoria_acesso.test.sql`. Na mesma migração: RLS das dez tabelas, grants explícitos mínimos, schema privado, vínculo UUID↔inteiro, recibos de idempotência e função `current_curator`. Policies/leitura da agenda pública permanecem intactas.

Casos TDD separados: anon sem acesso ao bruto; authenticated sem vínculo sem acesso; ativo/curator pode ler colunas permitidas; inativo com mesmo sub perde acesso; papel incorreto nega; configurações/tokens/base64 continuam privados; escrita direta negada; agenda pública continua lendo seed publicado.

Comando RED/GREEN: `pnpm supabase test db`. Expectativa GREEN: pgTAP positivo e negativo, `plan(...)` completo e sem falha. Dados de teste sempre em transação/rollback.

#### U1.3 — Provisionamento idempotente do operador

Criar `scripts/provisionar-curador.ts`, `scripts/test/provisionar-curador.test.ts`. Ler usuário inteiro existente, criar/procurar conta no Supabase Auth por Admin API no contexto servidor e criar vínculo. Não gerar nova linha `users` se ela já existe; nunca reatribuir UUID já vinculado; usuário inativo não é reativado. E-mails colidindo após trim/lowercase exigem revisão, não exclusão automática.

Adicionar `--dry-run` e modo de vincular contas legadas sem envio de e-mail em massa. Segredos são fornecidos e operados por humano conforme regra local; testes usam PostgreSQL local e stub só da Admin API. Casos: replay, conflito, falha entre Auth e vínculo e preservação de ID.

Comando: `pnpm exec vitest run scripts/test/provisionar-curador.test.ts`. Esperado: nenhuma conta duplicada ou reativada.

#### U1.4 — Travar semântica de snapshot por fonte

Criar `supabase/migrations/20261117000300_importacao_por_fonte.sql`, `supabase/tests/004_importacao_por_fonte.test.sql`; ajustar `supabase/tests/002_importar_agenda.test.sql` conforme 5.2.

TDD: `importar_agenda('sympla',lote)` falha sem gravar/remover nada; `mapa-cultural-ce` continua idempotente, respeita publicado manual, remove apenas datas da fonte na janela completa e rejeita sumiço em massa não autorizado. Não alterar `workers/coleta/src/mapaCultural.ts` nem sua constante FONTE.

Comando: `pnpm supabase test db`. Gate U1 inclui novamente `pnpm --filter @farol/coleta test` e leitura pública do app. Rollback: migrations novas somente em cópia local; nenhuma migração destrutiva das tabelas atuais.

### U2 — Coletor Sympla sem servidor/ORM

#### U2.1 — Portar os arquivos puros com testes existentes

Criar o pacote `workers/sympla` (`@farol/sympla`), com `package.json`, `tsconfig.json`, `vitest.config.ts`, `README.md` e diretórios `src/`/`test/fixtures/`.

Mapeamento de cópia, sem imports do repositório vizinho em runtime:

| Origem em raspagem-farol             | Destino no monorepo                                |
| ------------------------------------ | -------------------------------------------------- |
| `src/connectors/types.ts`            | `workers/sympla/src/types.ts`                      |
| `src/connectors/engine.ts`           | `workers/sympla/src/engine.ts`                     |
| `src/connectors/sympla.connector.ts` | `workers/sympla/src/sympla.ts`                     |
| `src/ingestion/normalize.ts`         | `workers/sympla/src/normalize.ts`                  |
| `src/ingestion/classify.ts`          | `workers/sympla/src/classify.ts`                   |
| `src/ingestion/filters.ts`           | `workers/sympla/src/filters.ts`                    |
| `test/fixtures/sympla-event.html`    | `workers/sympla/test/fixtures/sympla-event.html`   |
| `test/fixtures/sympla-listing.html`  | `workers/sympla/test/fixtures/sympla-listing.html` |

Portar por comportamento os casos de `test/sympla.connector.spec.ts`, `test/engine.spec.ts`, `test/classify.spec.ts`, `test/normalize.spec.ts`, `test/filters.spec.ts` para `*.test.ts` desse pacote. Ajustar paths e estilo Biome; não copiar Nest, repositories, app modules, `.env`, credenciais, Docker Compose ou Helm.

Dependências de produção iniciais: `crawlee@3.18.1`, `@crawlee/memory-storage@3.18.1`, `playwright@1.63.0`, `cheerio@1.2.0`, Zod do catálogo. O import de memória era transitivo na origem; declará-lo diretamente. Novos parsers não persistem dados. Preservar remoção de storage temporário em finally e limites/retries/429 existentes.

Comandos: `pnpm --filter @farol/sympla test -- test/sympla.test.ts test/classify.test.ts test/normalize.test.ts test/filters.test.ts test/engine.test.ts`, depois typecheck do pacote. RED de nova fronteira: fixture não pode depender de nenhum container Nest; caracterização existente permanece igual. Não atualizar Playwright/Crawlee junto com a migração.

#### U2.2 — Normalizar relatório sem banco

Criar `workers/sympla/src/relatorio.ts`, `workers/sympla/test/relatorio.test.ts`. Extrair de `src/ingestion/ingestion.service.ts` da origem as regras de normalização/classificação e cálculo de contagens, sem decorators ou classes de persistência.

Entrada: `CollectionReport`, instante de início e UUID da execução. Saída: registros normalizados, URLs descobertas/revisitadas/consultadas, issues e cobertura. Preservar `raw_json`, externo original e os campos de fonte; ausência não vira exclusão; invalidade por evento gera issue sanitizada.

Tests: incluído/excluído/incompleto; Fortaleza UTC-3; datas inválidas; relatório parcial; evento duplicado; conector falho; payload sem credenciais em erro. Comando: `pnpm --filter @farol/sympla test -- test/relatorio.test.ts`.

#### U2.3 — RPC de contexto antes de navegar

Criar `supabase/migrations/20261117000400_coleta_sympla.sql` inicialmente com `contexto_coleta_sympla()`, e `supabase/tests/005_coleta_sympla.test.sql`.

Resolver `sources.slug='sympla'` e conector crawler ativos; recusar ausência/inativo; retornar URLs futuras ou sem data para revisita, sem expor config ao navegador. Apenas papel servidor executa. Worker precisa chamar isso antes de abrir Chromium; conferir novamente o registro ao persistir, pois pode ter sido desativado durante o crawl.

Casos: ausente, inativo, conector inativo e lista de revisita; anon/authenticated não executam. Comando RED/GREEN: `pnpm supabase test db`.

#### U2.4 — RPC de persistência com paridade do upsert

Completar a mesma migration antes de ser aplicada em ambientes compartilhados; depois de aplicada, qualquer mudança passa a ser outra migration versionada. Adicionar `registrar_coleta_sympla(...)` e expandir `005_coleta_sympla.test.sql`.

Reproduzir SQL/semântica de `EventsRepository.upsertByExternalId`: UNIQUE fonte/externo, atualização de campos de fonte e incremento de versão, **sem tocar nos quatro ciclos de vida**. Uma falha por evento não impede persistir os demais; counters refletem realmente os sucessos/erros. Persistir `job_runs.details` com manifestos existentes.

Casos RED/GREEN, um por ciclo: criar; replay mesmo UUID não duplica nem incrementa versão; UUID novo atualiza; ciclos editoriais preservados; partial preserva sucessos; erro de lote falha; zero após histórico vira failed/anomalia; 429 não vira vazio; source desativado recusa; versão de crawl antigo fica skipped. Testar duas sessões simultâneas para replay/concorrência em `workers/sympla/test/persistencia.integration.test.ts`, contra Supabase local real.

Comandos: `pnpm supabase test db` e `pnpm --filter @farol/sympla test -- test/persistencia.integration.test.ts`. Integração é invocada com env local explicitamente; teste deve recusar URL não local. Não colocar credenciais em fixtures/logs. Não presumir que timeout de fetch faz rollback de SQL já confirmado: replay deve retornar a execução original.

#### U2.5 — Cliente RPC e entrypoint Node

Criar `workers/sympla/src/rpc.ts`, `workers/sympla/src/coletar.ts`, `workers/sympla/test/rpc.test.ts` e `workers/sympla/test/coletar.test.ts`.

Seguir `workers/coleta/src/importar.ts`: fetch nativo, apikey/authorization no servidor, `AbortSignal.timeout`, validação de resposta e erro sanitizado. `rpc.ts` exporta função testável; entrypoint só valida ambiente, obtém contexto, coleta, monta relatório, grava e define exit code. Gerar UUID uma vez e reusá-lo em retries, nunca por tentativa. Retentar apenas falhas transitórias, limitado a três tentativas e respeitando Retry-After; 4xx de validação não retentam.

Falha de coleta ainda tenta registrar relatório failed; indisponibilidade de banco impede afirmar job_run criado. Alertar por falha do workflow e por contagens sanitizadas, sem restaurar SMTP/Nodemailer obrigatório no worker. A mudança de canal de alerta precisa de aceite operacional antes do desligamento: não simplesmente retirar o alerta humano antigo.

Comandos: `pnpm --filter @farol/sympla test -- test/rpc.test.ts test/coletar.test.ts`; fixture completa fim a fim deve sair 0, partial/failed saem !=0 e não deixam processo pendurado.

#### U2.6 — Agendamento compatível sem dois escritores

Criar `.github/workflows/sympla.yml` a partir da estrutura de `coleta.yml`, com gate independente `SYMPLA_ATIVA`, `environment: coleta`, permissões contents read, concorrência `sympla`, timeout explícito e execução `pnpm --filter @farol/sympla coletar`. Versão de Chromium instalada deve ser a do Playwright pinado; fazer prova local/CI isolada antes de ativar. Não usar uma imagem Playwright com outro Node para fingir Node 26.

Manter `coleta.yml` e seu horário sem alterar. O novo workflow nasce desligado. Testar artefato de fixture sem rede real antes de smoke vivo autorizado. CI de falha deve notificar responsável definido, não apenas logar.

**Gate U2:** fixtures antigas, RPCs, replay e concorrência reais aprovados; nenhuma dependência de Nest/Drizzle no worker. Rollback: manter `SYMPLA_ATIVA` false; coletor antigo continua canônico até o corte final.

### U3 — Curadoria e publicação para o app

#### U3.1 — RPC auditada de decisão

Criar `supabase/migrations/20261117000500_curar_eventos.sql`, `supabase/tests/006_curar_eventos.test.sql`.

Entrada: lista de `{id,version}` (1–100 positivos) e status approved/rejected. IDs repetidos são deduplicados; versões incompatíveis retornam conflito sem gravar uma decisão em conteúdo diferente do revisado. Derivar autor pelo vínculo privado; locks em ordem de ID; evidência `decidedBy/decidedAt` nos campos atuais. IDs ausentes retornam notFound. Não alterar export/matching/import status. Rejeição despublica projeção existente no mesmo commit da decisão.

Casos: cada transição, lote, identidade forjada ignorada/recusada, inativo, versão concorrente, ausência, campos de outros ciclos intactos, rejeição despublica e lote histórico não muda. Comando RED/GREEN: `pnpm supabase test db`.

#### U3.2 — Projeção pública estável

Criar `supabase/migrations/20261117000600_publicar_curados.sql`, `supabase/tests/007_publicar_curados.test.sql`, com metadado `private.publicacoes_sympla` e RPC `publicar_curados` conforme seção 5.

Implementar em pequenas fatias: elegibilidade/autor; evento por fonte/externo; data `principal`; local/fallback; metadado de versão; republish; concorrência. Para cada fatia, pgTAP antes da função/ramo correspondente.

Casos obrigatórios: pending/rejected/excluded/incomplete não publicam; aprovado válido publica; replay mantém ID do evento/data; remarcação muda início da mesma data; preço desconhecido não vira pago; falta de coordenada não vira 0,0; sem local continua válido; falha de uma gravação reverte projeção/metadado inteiro; publicação não altera export_status; mapa com mesmo id externo fica intacto; ausência em coleta parcial não apaga data pública; recoleta não desfaz despublicação.

Resultado de impedimentos: IDs e códigos estáveis (`NOT_APPROVED`, `NOT_INCLUDED`, `INVALID_DATE`, `STALE_VERSION`, `NOT_FOUND`), sem inferências de dados. Negação de autorização é falha total. Não publicar parcialmente um lote se houver conflito de versão sem apresentar ao operador o resultado de cada ID.

Comando RED/GREEN: `pnpm supabase test db`. Testar anonimato **com role anon**, verificando que antes da publicação não há evento e depois há evento/datas; conteúdo bruto continua invisível.

#### U3.3 — Publicação editorial e origem

Criar `supabase/migrations/20261117000700_agenda_editorial.sql`, `supabase/tests/008_agenda_editorial.test.sql`. Adicionar `alterar_publicacao` com auditoria privada e `consultar_origem` conforme seção 5.5. Não abrir UPDATE genérico de `eventos` ao authenticated.

Casos: curador despublica Mapa e próxima importação respeita; anônimo não altera; usuário sem vínculo não altera; origem de evento oculto não revela URL; URL HTTP/javascript/host estranho retorna null; URL Sympla exata é preservada, não fabricada do título; Mapa existente continua correto.

Comando: `pnpm supabase test db`.

#### U3.4 — Adaptação mínima do Expo para outra fonte

Modificar somente `apps/app/src/app/evento/[id].tsx` e criar `apps/app/src/agenda/origem.ts`, `apps/app/test/origem.test.ts`; complementar `apps/app/test/agenda.test.ts` e `favoritos.test.ts` com fixture Sympla no contrato atual.

O detalhe Mapa mantém a construção de URL existente. Sympla busca URL pela RPC pública com fetch e chave publishable, timeout e abort no desmontar; falha em obter URL não derruba detalhes/agenda. Não adicionar AuthProvider, SDK Supabase, MUI ou React-admin ao app. Texto de erro/rótulo necessário entra em `packages/i18n/src/index.ts`, sem nova lib.

Casos: fonte reconhecida/desconhecida, URL perigosa recusada pelo caller também, origem oculta, erro HTTP recuperável; agenda aceita evento sem categoria/local/coord; favorito `sympla:ID` não colide com `mapa-cultural-ce:ID`; IDs numéricos distintos não mudam favorito por fonte/externo.

Comandos: `pnpm --filter @farol/app test`, `pnpm --filter @farol/app typecheck`. Conferir no aparelho lista, detalhe, origem, favorito persistente e fonte ampliada. Sem apagar dados da demonstração para obter resultado limpo.

**Gate U3:** pipeline fixture Sympla → curadoria → publicação → leitura no contrato Expo funciona com RLS real. Rollback: manter projeções Sympla ocultas; não alterar/disponibilizar fonte sem aprovação.

### U4 — Preservar CSV e operações legadas sem reconstruir a API antiga

As exportações fazem parte do sistema existente e não somem por não serem necessárias ao Expo. Esta fase é pré-requisito para aposentar o painel antigo, mas não bloqueia entregar melhorias mobile independentes.

#### U4.1 — Fixar compatibilidade do renderer

Criar pacote `packages/compat-csv` (`@farol/compat-csv`), com renderer puro copiado de `src/exports/export-csv.ts` da origem, normalização necessária, renderer de conferência extraído de `src/review/sympla-review.service.ts` e fixture independente `mapas-eventos-v1-header.csv`.

Nenhum import de banco, Nest, React ou Expo. Dependência inicial de produção: `csv-stringify@6.8.3`. Portar casos puros de `test/exports.service.spec.ts` e `test/sympla-review.spec.ts`. Preservar 29 colunas, ordem/cabeçalho literal, BOM, `;`, CRLF, Fortaleza, Unicode, escaping e proteção de fórmulas inclusive espaços/caracteres de controle.

Comando: `pnpm --filter @farol/compat-csv test`. Teste primeiro; não alterar fixture para fazer passar. CSV de conferência não usa o contrato Mapas e inclui excluídos/incompletos.

#### U4.2 — Decidir a única exceção de execução no Supabase

Criar `docs/relatorios/exportacao-backend.md` com prova pequena de bundling/execução do renderer na Function local e medição do maior lote esperado. Comparar com uma tradução SQL que passe **todos os mesmos fixtures**, não apenas um exemplo ASCII.

**Direção proposta:** uma Function `exportacoes`, sem framework web, reaproveitando o renderer e postgres.js, porque reconstruir regras de CSV/Unicode em SQL pode aumentar código e risco. Ela contém só gerar/baixar CSV e conferência; consultas e curadoria continuam PostgREST/RPC. Isso adiciona runtime Edge/Deno — uma exceção explícita, não “zero dependências”. A pessoa aprova essa exceção no gate; não esconder o custo.

Não criar ORM, pool global não limitado, API CRUD, listener Node, servidor de login ou várias Functions. Se SQL realmente provar a mesma compatibilidade com menos complexidade, registrar a escolha e eliminar a Function antes de desenvolver callers; não manter as duas soluções.

**STOP:** se o maior lote ultrapassar limites de CPU/memória/payload, revisar essa fronteira antes de desligar o legado. Não truncar exportação nem criar fila/microserviço sem aprovação. O orçamento de capacidade só vira fato após execução.

#### U4.3 — Atomicidade, idempotência e downloads históricos

Após o gate U4.2, criar os arquivos sob `supabase/functions/exportacoes/` (entrypoint, handler, dependências pinadas e testes) e a migration `20261117000800_exportacao_recibos.sql` para recibos privados, se ainda não existirem em U1. Não duplicar a tabela de recibos.

Preservar `ExportsService.generate` da origem em uma única transação: validar usuário atual; lock da chave idempotente; replay; reclamar aprovados/não exportados com `FOR UPDATE SKIP LOCKED`; resolver local aceito/fallback; renderizar; SHA-256; inserir exports e items; marcar exportado; gravar recibo. Matching não é requisito de exportação. Nenhuma gravação é autorizada por e-mail enviado pelo cliente.

Endpoint proposto da Function: POST gerar (UUID em `Idempotency-Key`), GET lote por ID para download, GET conferência Sympla. Erros estáveis: 401 sem sessão, 403 sem autorização, 400 entrada inválida, 409 sem elegíveis/chave conflitante, 404 lote ausente, 503 temporário. Nenhum raw error/connection string em resposta. CORS exato do painel, não `*`; GET não gera lote.

Download lê `exports.csv_content_base64` armazenado e nunca regenera com evento atual. Lote antigo migrado mantém bytes/checksum. Conferência usa todos os eventos Sympla já classificados, não só aprovados.

Testes: duas conexões concorrentes/chaves diferentes não duplicam eventos; mesma chave devolve mesmo lote após timeout; nova aprovação não muda replay; falha no item reverte lote/eventos/recibo; inativo com JWT antigo nega; checksum corresponde aos bytes; download após mudança/rejeição continua igual. Fixar o comando do runner local escolhido em `supabase/functions/exportacoes/README.md` após U4.2, antes da implementação de UI. Não fingir que `pnpm test` testa Function sem job explícito no CI.

#### U4.4 — Matching/sync opcionais e parser Uhuu

Inventariar referências da origem a `src/matching/matcher.service.ts`, `src/mapas/spaces-sync.service.ts`, `src/connectors/uhuu.connector.ts` e testes correspondentes. Preservar dados/candidatos atuais e testar resolução de local aceita para CSV/publicação.

Não ativar novas fontes ou agendar matching/sync nesta entrega. Se a equipe ainda usa esses comandos, portar os algoritmos como funções simples para `workers/sympla/src/operacoes/` e scripts CLI antes do desligamento, com os mesmos asserts de `matcher.integration`, `matcher.score`, `spaces-sync`, `mapas.client` e `uhuu.connector`. Se não usa, registrar explicitamente como recurso fora do runtime e exigir aceite de aposentadoria — não chamar remoção silenciosa de “mesma funcionalidade”. Não instalar fastest-levenshtein/nova dependência até esse inventário comprovar o uso.

**Gate U4:** exportações novas e históricas conferidas, capacidade demonstrada, canal de alerta aceito, comandos opcionais com destino definido. Rollback: manter as novas operações inacessíveis e ainda não desligar o sistema de origem.

### U5 — Painel pronto, orientado às operações necessárias

#### U5.1 — Layout, tema e rotas do kit

Completar o pacote testado em U0.3. Arquivos: `apps/painel/src/app.tsx`, `src/resources.tsx`, `src/theme.ts`, `src/messages.ts`, `index.html`, `DESIGN.md`.

Usar React-admin/Material UI padrão; sem kit adicional, dashboard decorativo ou components próprios equivalentes aos do kit. Tokens vêm de `@farol/tokens/tokens.json`, não hex espalhado. Mensagens pt-BR ficam puras; não importar `@farol/i18n` com dependência Expo no navegador. `DESIGN.md` registra layout tabular, foco/teclado, estados e tokens derivados; não reinventa sistema visual.

Rotas: `/login`, `/auth/confirm`, `/events`, `/events/:id/show`, `/job-runs`, `/exports`, `/agenda`, `/spaces`, `/sources`. CRUD genérico desabilitado para tabelas brutas. Recursos são explícitos; não usar AdminGuesser para expor automaticamente users/login_tokens/connectors ou tudo do schema em produção.

#### U5.2 — Auth administrativo com confirmação segura

Criar `src/supabase.ts`, `src/auth.ts`, `src/pages/login.tsx`, `src/pages/confirm.tsx`, `test/auth.test.ts`. Usar o provider pronto como base e adaptar apenas magic link/check de `current_curator`. Configurar `detectSessionInUrl:false`, `shouldCreateUser:false` e cadastro público false.

GET da página de confirmação não chama verifyOtp. Só o clique explícito consome token; template Auth deve apontar para essa página, sem autoexchange em prefetch. `checkAuth` verifica Auth e vínculo ativo; logout limpa cache administrativo. Nenhum token ou query string de confirmação entra em log/analytics. `index.html` inclui `referrer=no-referrer`; sem fontes/scripts de terceiros.

Testes RED/GREEN: e-mail não autorizado não revela existência, sem signup, GET não consome, clique valida, erro expirado, conta sem vínculo, inativo e cache limpo entre usuários. Comando: `pnpm --filter @farol/painel test -- test/auth.test.ts`.

#### U5.3 — Consultas e paginação do kit

Criar `src/events.tsx`, `src/operacao.tsx`, `test/listas.test.tsx` usando List/DataTable/Show do React-admin. Metadados/seleções explícitas para exports sem base64. Eventos exibem título, fonte, início, classificação, curadoria, publicação/versão e exportação; evidência bruta só no detalhe autorizado.

Defaults: 50 por página; 25/50/100; filtro/sort/página na URL; ordenação com ID como desempate; datas America/Fortaleza. Sem Create/Edit/Delete genéricos. Empty/loading/error e retry são estados obrigatórios.

Testes: 51 linhas → 50+1; filtro mantém contexto; ação em página 2 não volta à 1 sem necessidade; página esvaziada vai à última válida e vazio fica na 1 sem loop; raw HTML aparece como texto; campos proibidos não são requisitados. `pnpm --filter @farol/painel test -- test/listas.test.tsx`.

#### U5.4 — Ações de curadoria, publicação e exportação

Criar `src/actions/curadoria.tsx`, `src/actions/publicacao.tsx`, `src/actions/exportacao.tsx`, `src/workflow.ts`, `test/acoes.test.tsx`.

Botões de confirmação do kit, chamadas `supabase.rpc` para decisões/publicação e cliente restrito da operação CSV escolhida em U4. Não usar updateMany genérico nas tabelas. IDs/versões revisadas vão à RPC; autor nunca vai no payload. Conflito pede refetch e nova confirmação. Invalidar listas/detalhes afetados no cache do React-admin; sem uma camada React Query paralela.

Publicar e Aprovar são ações diferentes; Rejeitar informa que retira do app quando já público. Gerar exportação informa que inclui todos os aprovados ainda não exportados, não só a seleção. Preservar chave idempotente enquanto resposta de exportação for incerta, não gerar outra em retry. Downloads via fetch Bearer/Blob, com revogação de object URL.

Testes: cancelar sem RPC; lote/individual; autor falsificado não enviado; erro não mostra sucesso; stale version mantém confirmação pendente; exportação repetida usa mesma chave; publicação não marca exportado. Comando: `pnpm --filter @farol/painel test -- test/acoes.test.tsx`.

#### U5.5 — Testar painel e app no mesmo fluxo

Criar `apps/painel/e2e/unificacao.spec.ts` e configuração Playwright local; ampliar `.github/workflows/ci.yml`/workflow específico só para testes, sem deploy. Escolher Playwright de teste compatível com o crawler pinado ou isolar instalações; não obrigar upgrade do parser por causa do E2E.

Fixture local: coleta produz pending → visitante não vê → curador aprova (ainda invisível) → publica → contrato `buscarAgenda` lê → remarcação/republicação mantém favoritos → rejeita → visitante deixa de ver → CSV antigo continua idêntico. Usar Supabase local real, usuário de teste provisionado localmente e cleanup explícito.

Comandos: `pnpm --filter @farol/painel build`, `pnpm --filter @farol/painel exec playwright test`, `pnpm --filter @farol/app test`.

Capturar painel em 375/768/1440 e conferir loading/vazio/erro/confirmação/teclado. No aparelho, validar detalhe Sympla, origem, favorito e fonte 2.0. Registrar em `docs/relatorios/unificacao-qa.md`; screenshot é evidência visual, typecheck não é.

**Gate U5:** percurso real com Auth/RLS/RPC/painel e contrato mobile, sem acesso bruto anônimo. Rollback: painel novo não recebe tráfego; app/Mapa existentes continuam funcionando.

### U6 — Migração de dados e corte com um escritor por fonte

#### U6.1 — Manifesto independente de dados

Criar `scripts/migracao/manifesto.ts`, `scripts/migracao/test/manifesto.test.ts`, `docs/runbooks/unificacao-corte.md`.

Manifesto de origem/destino: dez tabelas legadas com colunas/tipos/defaults/nullability, constraints/índices, contagem, hash SHA-256 do conteúdo canônico ordenado por ID e sequences (last_value/is_called). Transação read-only repeatable-read, UTC, paginação por ID. Não imprimir linhas/e-mails/tokens; hashes não substituem proteção do dump. Registrar também baseline das cinco tabelas mobile para provar que não foram sobrescritas.

Testes: cópias iguais passam; JSON alterado com mesma contagem falha; sequence fora de sincronia falha; constraint ausente falha; tabela vazia funciona. `pnpm exec vitest run scripts/migracao/test/manifesto.test.ts`.

#### U6.2 — Ensaiar restore sem restaurar o Supabase inteiro

Runbook humano usa dump **das dez tabelas e sequences relacionadas**, mais histórico Drizzle explicitamente selecionado para arquivo/histórico, não um dump global de `public` sobre o banco do app. Nunca sobrescrever `eventos`, `espacos`, Auth, storage, migrations Supabase ou objetos de outro produto.

O DDL U1 é bootstrap. Para um destino que já tem as dez tabelas por migration, restaurar dados nelas em ordem/constraints corretas, sem repetir CREATE TABLE. Para destino por restore de schema+dados, baseline só pode ser marcada aplicada após comparação estrutural; não executar migration que recria tabelas. Escolher um procedimento no ensaio, documentar o comando do CLI 3.1.0 realmente conferido e usá-lo no corte, sem dois migradores concorrentes.

Proteger a API antes de inserir dados: mesmo com auto_expose false, grants/RLS precisam estar aplicados e testados antes de reabrir acesso. Preservar IDs/sequences e CSV base64; não converter timestamps ou fazer limpeza de dados no caminho. Nenhum `--clean` amplo. Nenhum dump versionado/anexado ao PR. As credenciais e a execução remota pertencem ao operador, não ao agente.

Depois do restore, manifestos devem coincidir integralmente para as dez tabelas; dados mobile preexistentes permanecem iguais. Só objetos aditivos de segurança/integração são diferenças esperadas de estrutura.

#### U6.3 — Vincular operadores e validar dados históricos

Executar dry-run do provisionador, resolver conflitos humanos e criar vínculos sem campanha de e-mails. Login real de um curador piloto; desativação com JWT ainda válido. Conferir download de lote legado contra checksum e evidência original; contagens de eventos/classes/candidatos iguais. Não declarar tudo publicado apenas porque está approved.

#### U6.4 — Corte aprovado e sem dual-write

Ordem obrigatória:

1. Humano escolhe projeto/capacidade, hospedagem da SPA, responsável, canal de alerta e janela de manutenção; aprova runbook ensaiado.
2. Suspender coleta/agendamento e mutações web do Raspagem-Farol; aguardar execuções/transações terminarem. Mapa Cultural só é pausado se o restore/locks do destino exigirem, com decisão explícita.
3. Backup final e manifesto consistente da origem parada para escrita.
4. Importação final pelo humano; comparação de conteúdo/estrutura/sequences e preservação da agenda existente.
5. Vínculos/Auth/grants/Functions e painel publicados pelo humano conforme permissões; leitura e login piloto antes de abrir mutações.
6. Novo painel vira único caminho de curadoria; novo worker Sympla vira único escritor da fonte e só então `SYMPLA_ATIVA` é habilitada.
7. Validar coleta, curadoria, publicação, app e exportação no destino; desligar ingress/deployment/cron antigos.

**Primeira escrita nova no destino é o limite do rollback simples.** Depois disso, não reabrir a origem antiga para escrita e não restaurar snapshot velho automaticamente: isso perderia decisões e exportações. Rollback de código usa o banco canônico atual ou exige reconciliação aprovada. Registrar esse instante e os procedimentos reais no runbook.

Mesmo projeto Supabase não garante que o Free comporta os dados ou que deve ser produção. A decisão D3 continua humana. Agentes não executam `db push`, `functions deploy`, `secrets set`, `eas submit` ou comandos remotos negados por wrappers alternativos.

### U7 — Aposentadoria e aceite da plataforma unificada

#### U7.1 — Verificar ausência do servidor legado

Criar `scripts/verificar-arquitetura.ts`, `scripts/test/verificar-arquitetura.test.ts`: examinar imports/manifests de produção, com fronteiras por pacote. Reprovar Nest/Express/AdminJS/Refine/Drizzle no novo runtime, import Expo no painel, import MUI/ra-* no app, segredo em bundle e listener HTTP Node de aplicação. Não confundir texto em docs/fixtures ou dependência transitiva de ferramenta com API própria.

Testar a checagem com manifests/imports sintéticos permitidos e proibidos; não renomear produção para satisfazer regex errada. Checks são parte do CI e falham em violação. Inspecionar runtime autorizado para provar ausência de tráfego/pods/crons antigos; código morto no Git não prova desligamento.

#### U7.2 — Arquivar origem sem perder WIP ou recuperação

Somente após aceite e autorização específica, registrar o Raspagem-Farol como arquivado na documentação/deploy/repositório pertinente. Git remoto não é arquivado pelo agente por consequência implícita desta proposta. Preservar os WIP locais listados e backups; não apagar repo, usuário ou tabelas para “limpar”. Retenção segura mínima sugerida: sete dias e uma coleta diária validada, o que terminar depois; duração final é decisão operacional.

Migrações do monorepo são a única autoridade ativa. Histórico Drizzle fica preservado, sem `db:migrate` concorrente. CSV/matching ou comandos opcionais só saem com substituto validado ou aposentadoria explicitamente aceita em U4.4.

#### U7.3 — Documentar estado verdadeiro

Criar `docs/relatorios/unificacao-aceite.md`; atualizar README do monorepo/worker e ponteiros de planejamento depois do aceite. Solicitar permissão separada para atualizar instruções protegidas que ainda dizem “Nada aqui ainda” ou Refine. Não reescrever ADRs antigos como se a decisão nunca tivesse existido: registrar supersessão.

Rodar gate final da seção 9; registrar comandos reais, ambiente, exit codes, screenshots, manifestos resumidos sem dados privados, digest/versão de artefatos e evidência de desligamento. Não commitar/push sem autorização própria. Não copiar totais deste documento como resultados observados.

## 8. Exemplos completos para as primeiras fronteiras

Os trechos são contratos executáveis para iniciar testes, não implementação já aplicada. Não usar stub que retorna sucesso fictício para satisfazer gates de integração.

### 8.1 Cliente RPC testável do worker (base para U2.5)

```ts
// workers/sympla/src/rpc.ts
export async function chamarRpc<T>(
  base: string,
  chave: string,
  nome: "contexto_coleta_sympla" | "registrar_coleta_sympla",
  parametros: Record<string, unknown>,
  buscar: typeof fetch = fetch,
): Promise<T> {
  const url = new URL(base);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("configuracao_rpc_invalida");
  }
  const resposta = await buscar(new URL(`/rest/v1/rpc/${nome}`, url), {
    method: "POST",
    redirect: "error",
    headers: {
      apikey: chave,
      authorization: `Bearer ${chave}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(parametros),
    signal: AbortSignal.timeout(60_000),
  });
  if (!resposta.ok) throw new Error(`rpc_${nome}_http_${resposta.status}`);
  return (await resposta.json()) as T;
}
```

Validar o retorno por schema específico no caller; o cast TypeScript não é validação. Retry pertence ao nível que conserva run key e conhece idempotência, não a um fetch genérico que repete toda operação.

```ts
// workers/sympla/test/rpc.test.ts
import { describe, expect, it, vi } from "vitest";
import { chamarRpc } from "../src/rpc.ts";

describe("chamarRpc", () => {
  it("envia parametros à RPC fixa e não segue redirects", async () => {
    const buscar = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    await expect(
      chamarRpc(
        "https://exemplo.test",
        "chave-de-teste",
        "contexto_coleta_sympla",
        {},
        buscar,
      ),
    ).resolves.toEqual({ ok: true });
    expect(buscar).toHaveBeenCalledWith(
      new URL("https://exemplo.test/rest/v1/rpc/contexto_coleta_sympla"),
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        body: "{}",
      }),
    );
  });

  it("erro público não inclui corpo nem credencial", async () => {
    const buscar = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("diagnóstico sensível", { status: 503 }));
    await expect(
      chamarRpc(
        "https://exemplo.test",
        "chave-de-teste",
        "registrar_coleta_sympla",
        {},
        buscar,
      ),
    ).rejects.toThrow("rpc_registrar_coleta_sympla_http_503");
  });

  it("recusa HTTP remoto antes de abrir a rede", async () => {
    const buscar = vi.fn<typeof fetch>();
    await expect(
      chamarRpc(
        "http://exemplo.test",
        "chave-de-teste",
        "contexto_coleta_sympla",
        {},
        buscar,
      ),
    ).rejects.toThrow("configuracao_rpc_invalida");
    expect(buscar).not.toHaveBeenCalled();
  });
});
```

A chave acima é uma string sintética fixa de teste, não segredo real. Primeiro executar esse arquivo com `rpc.ts` ausente e registrar a ausência da fronteira; depois implementar e obter três casos verdes. Em seguida adicionar casos de timeout/replay no entrypoint, sem simular sucesso de persistência em banco.

### 8.2 Guard de fonte existente em migration nova (U1.4)

A implementação deve manter assinatura e corpo atual de `importar_agenda`, acrescentando no início do bloco a condição completa abaixo. Não editar a migration histórica já aplicada.

```sql
if p_fonte is distinct from 'mapa-cultural-ce' then
  raise exception using
    errcode = '22023',
    message = 'importar_agenda: fonte não autorizada para snapshot por janela';
end if;
```

Teste novo completo do guard, com lote vazio proposital: a checagem de fonte deve acontecer antes da checagem de lote.

```sql
-- supabase/tests/004_importacao_por_fonte.test.sql
begin;
select plan(1);
set local role service_role;
select throws_ok(
  $$select public.importar_agenda('sympla', '{}'::jsonb)$$,
  '22023',
  'importar_agenda: fonte não autorizada para snapshot por janela',
  'Sympla não usa snapshot destrutivo da fonte Mapa Cultural'
);
reset role;
select * from finish();
rollback;
```

Este arquivo testa somente a nova negativa. Os 30 asserts existentes do importador devem continuar cobertos, depois da adaptação de fixtures de U1.4; não substituí-los pelo teste único.

## 9. Matriz de validação e critérios de conclusão

| Dimensão            | Critério que precisa de execução real                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| Preservação         | dez tabelas antigas com mesmos dados/IDs/sequences; cinco mobile não sobrescritas                       |
| Agenda atual        | importação Mapa, leitura anônima, filtros/detalhes/favoritos existentes continuam funcionando           |
| Limite entre fontes | Mapa pode reconciliar snapshot completo; Sympla nunca apaga por ausência                                |
| Coleta              | fixture estável, revisita, classificação, counters/manifestos, partial/failed, zero-anomalia            |
| Idempotência        | replay de run key não incrementa versões; upsert de execução nova preserva curadoria/exportação         |
| Segurança           | grants/RLS com caller real; inativo e não vinculado bloqueados; bruto/tokens/config não públicos        |
| Curadoria           | decisão auditada/versão; rejeitar despublica; outros ciclos legados intactos                            |
| Publicação          | só aprovados elegíveis; repetir mantém IDs; data remarcada não duplica; recoleta não republica          |
| Mobile              | mesmo contrato PostgREST, link de origem seguro, favorito por fonte/externo, sem dependências do painel |
| Painel              | pronto e sem CRUD genérico perigoso; 50+1; contexto/erros/foco; ações confirmadas                       |
| CSV                 | 29 colunas e bytes históricos; transação/replay/concorrência; fórmula/Unicode; conferência distinta     |
| Operação            | uma autoridade de migrations e um scheduler por fonte; alerta chega a responsável; legado sem tráfego   |
| Simplicidade        | sem API Node própria, ORM ou frameworks aposentados; dependências pesadas isoladas                      |

Gate agregado proposto, depois de os pacotes e scripts existirem:

```bash
pnpm install --frozen-lockfile
pnpm biome ci .
pnpm turbo run typecheck test
pnpm run check:tooling
pnpm supabase test db
pnpm --filter @farol/painel build
pnpm --filter @farol/painel exec playwright test
pnpm exec vitest run scripts/migracao/test scripts/test
```

A validação de Function escolhida em U4.2 precisa de job explícito adicional, com comando verificado no runtime local. Não registrar gate agregado verde enquanto essa verificação estiver ausente. Testes que dependem do Supabase devem falhar com pré-requisito claro se ele não está ativo, não virar skipped silencioso.

Não rodar a sequência em banco com demonstração/dados pessoais sem confirmar isolamento. Builds de publicação Expo, testes de aparelho e acessibilidade humana continuam no roteiro mobile; E2E web não prova comportamento nativo.

## 10. Mapa de arquivos e fronteiras de escrita

### Manter sem remodelar

- `supabase/migrations/20261113015139_agenda_minima.sql` e `20261113020741_importar_agenda.sql`: histórico imutável.
- `workers/coleta/src/mapaCultural.ts`, `workers/coleta/src/importar.ts` e `.github/workflows/coleta.yml`: não introduzir raspagem ou dependências pesadas; alterar só se uma regressão real de contrato exigir teste e correção próprios.
- `apps/app` permanece Expo/mobile; sem migração de framework ou sistema de contas.
- `packages/ui-native` permanece exclusivo do mobile; tokens puros podem servir ao painel sem UI compartilhada.

### Arquivos novos por fase

| Fase           | Caminhos                                                                                                                                                                           | Depende de                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| U0             | `docs/relatorios/unificacao-baseline.md`, `unificacao-dados.md`; `docs/adr/0008-plataforma-unificada.md`                                                                           | baseline/destino e proposta         |
| U0/U5          | `apps/painel/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `DESIGN.md`, `src/main.tsx`, `src/app.tsx`                                                            | decisão de painel                   |
| U1             | `scripts/migracao/gerar-baseline.ts`, `scripts/migracao/test/baseline.test.ts`                                                                                                     | SQL histórico origem                |
| U1             | migrations `20261117000100_raspagem_baseline.sql`, `20261117000200_curadoria_acesso.sql`, `20261117000300_importacao_por_fonte.sql`                                                | DDL e acesso                        |
| U1             | `supabase/tests/003_curadoria_acesso.test.sql`, `004_importacao_por_fonte.test.sql`                                                                                                | migrations                          |
| U1             | `scripts/provisionar-curador.ts`, `scripts/test/provisionar-curador.test.ts`                                                                                                       | vínculo/Auth local                  |
| U2             | `workers/sympla/package.json`, `tsconfig.json`, `vitest.config.ts`, `README.md`                                                                                                    | pacote isolado                      |
| U2             | `workers/sympla/src/{types,engine,sympla,normalize,classify,filters,relatorio,rpc,coletar}.ts`                                                                                     | cópias puras/RPC                    |
| U2             | `workers/sympla/test/{sympla,engine,normalize,classify,filters,relatorio,rpc,coletar,persistencia.integration}.test.ts` e fixtures HTML                                            | código sob teste                    |
| U2             | `supabase/migrations/20261117000400_coleta_sympla.sql`, `supabase/tests/005_coleta_sympla.test.sql`, `.github/workflows/sympla.yml`                                                | persistência e execução             |
| U3             | migrations `20261117000500_curar_eventos.sql`, `20261117000600_publicar_curados.sql`, `20261117000700_agenda_editorial.sql`                                                        | identidade e coleta                 |
| U3             | testes `006_curar_eventos.test.sql`, `007_publicar_curados.test.sql`, `008_agenda_editorial.test.sql` em `supabase/tests/`                                                         | RPCs                                |
| U3             | `apps/app/src/agenda/origem.ts`, `apps/app/test/origem.test.ts`                                                                                                                    | origem pública segura               |
| U4             | `packages/compat-csv/package.json`, `tsconfig.json`, `src/export-csv.ts`, `src/review-csv.ts`, `src/normalize.ts`, `test/csv.test.ts`, `test/fixtures/mapas-eventos-v1-header.csv` | renderer sem framework              |
| U4             | `docs/relatorios/exportacao-backend.md`                                                                                                                                            | prova de compatibilidade/capacidade |
| U4 condicional | `supabase/functions/exportacoes/{index,handler,exportar,download,conferencia}.ts`, configuração/lock e testes; migration `20261117000800_exportacao_recibos.sql`                   | escolha aprovada U4.2               |
| U5             | `apps/painel/src/{resources,theme,messages,supabase,auth,events,operacao,workflow}.ts[x]`, `src/pages/{login,confirm}.tsx`, `src/actions/{curadoria,publicacao,exportacao}.tsx`    | kit e backend                       |
| U5             | `apps/painel/test/{auth,listas,acoes}.test.ts[x]`, `e2e/unificacao.spec.ts`, config Vitest/Playwright, `docs/relatorios/unificacao-qa.md`                                          | UI                                  |
| U6             | `scripts/migracao/manifesto.ts`, `scripts/migracao/test/manifesto.test.ts`, `docs/runbooks/unificacao-corte.md`                                                                    | ensaio                              |
| U7             | `scripts/verificar-arquitetura.ts`, `scripts/test/verificar-arquitetura.test.ts`, `docs/relatorios/unificacao-aceite.md`                                                           | runtime integrado                   |

Os conjuntos acima abreviam apenas nomes já enumerados nas tarefas; não autorizam criar módulos genéricos novos. Expansão do inventário exige registrar a necessidade antes de editar.

### Modificações pequenas previstas

| Caminho                                             | Fase                        | Escopo                                                                                         |
| --------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm-lock.yaml`                                    | U0/U2/U4/U5                 | pins resolvidos; mesmo commit dos manifests                                                    |
| `pnpm-workspace.yaml`                               | se necessário U0/U5         | somente catálogo/peers necessários; globs já incluem apps/workers/packages                     |
| `package.json`                                      | U1/U7                       | scripts explícitos de tooling/arquitetura, sem dependência web na raiz                         |
| `supabase/tests/002_importar_agenda.test.sql`       | U1                          | fixtures pela fonte permitida, asserts preservados                                             |
| `supabase/config.toml`                              | U1/U4                       | configuração local de Auth/Function, sem segredo nem deploy                                    |
| `apps/app/src/app/evento/[id].tsx`                  | U3                          | origem Sympla via helper, sem reescrever tela                                                  |
| `apps/app/test/agenda.test.ts`, `favoritos.test.ts` | U3                          | fixture de nova fonte e identidade                                                             |
| `packages/i18n/src/index.ts`                        | U3                          | rótulos mobile indispensáveis                                                                  |
| `.github/workflows/ci.yml`, `supabase-smoke.yml`    | U2/U5                       | cobrir novos scripts/pacotes e contrato; sem deploy                                            |
| `.gitignore`                                        | U5/U6                       | excluir dumps/capturas privadas e relatórios locais; não esconder evidência pública necessária |
| `README.md` do repo                                 | U7                          | arquitetura/comandos novos e status real                                                       |
| `AGENTS.md`, `CLAUDE.md` e locais                   | após autorização específica | atualizar orientação contraditória, não nesta etapa                                            |

Nenhum arquivo de código da origem deve ser editado durante o porte. Arquivamento/desligamento lá é tarefa operacional posterior, com autorização e preservação de WIP.

## 11. Riscos e escolhas ainda humanas

1. **Preservação dos dois modelos:** não é permitido “unificar” renomeando tabelas ou reatribuindo IDs. Projeção pública é incremental e auditada.
2. **Backend hospedado:** destino/capacidade/custo ainda não confirmados. HTML bruto e CSV base64 podem exceder o orçamento Free mesmo que a agenda caiba.
3. **React-admin:** proposta mais pronta para operação; D6 anterior era Refine. Instalação/build/teste precisam provar peers com React 19.3 e não alterar Expo. Não afirmar menos dependências transitivas sem medir.
4. **CSV:** exceção Edge precisa de aceite e capacidade. Menos pacotes não justifica reimplementar incorretamente Unicode/CSV em SQL; mais serviços também não são grátis.
5. **Importador Mapa:** seus deletes por ausência e publicação inicial não podem ser reutilizados para Sympla. Guard por fonte é bloqueante da integração.
6. **Fonte e escopo:** Sympla cobre Fortaleza/listagem alcançável; não equivale à cobertura do Mapa Cultural. Não eliminar o importador existente por isso.
7. **Publicação:** snapshot público fica estável até revisão; mudança coletada não significa atualização editorial automática. Painel precisa mostrar divergência de versão.
8. **Alertas:** trocar SMTP por mecanismo de CI exige destinatário/canal verificado. Retirar infraestrutura sem substituir o alerta não é simplificação concluída.
9. **Workflows GitHub:** atraso de cron, retenção e desativação por inatividade continuam limitações operacionais; não prometer horário exato ou SLA não medido.
10. **Privacidade/segurança:** base única não significa grants globais; proteger coleta sem quebrar leitura pública. Não restaurar schemas nativos Supabase como se fossem dados de negócio.
11. **Cutover:** primeira escrita nova impede rollback automático para dump antigo. Um único escritor por fonte; nada de dual-write permanente.
12. **Mobile:** mapa nativo, publicação e acessibilidade humana continuam pendentes; o painel não resolve esses gates. A evolução mobile pode seguir em paralelo.
13. **Migração sem autorização remota:** runbook e SQL escritos não autorizam agente a acessar segredos, fazer db push ou arquivar GitHub/deploys.

## 12. Paralelismo, commits e aceite do plano

```text
U0 → U1 ──→ U2 (worker) ───┐
        └─→ U3 (publicar) ─┼─→ U5.5 integração → U6 corte → U7 aposentadoria
        └─→ U4 (CSV) ─────┤
             U5 painel ───┘

Pendências mobile já existentes continuam em trilha paralela.
```

Migrations, contrato de RPC, lockfile e manifests têm um dono por vez; numeração proposta precisa ser conferida contra migrations novas surgidas antes da execução. Separar os arquivos permite paralelismo real entre UI e worker depois de contratos estáveis. `dag-ulw` é opção para esses trechos disjuntos com um nó final de verificação; não automatiza os gates humanos de D6, capacidade ou corte.

Commits locais pequenos, sempre verdes, depois de autorização de execução; tipo/escopo do repo (`feat(coleta)`, `feat(curadoria)`, `feat(painel)`, `test(unificacao)`, `docs(arquitetura)`). Não commitar README que afirme um deploy não realizado. Não fazer push/merge por inferência deste plano.

**Aceite do plano:** confirmar a arquitetura integrada e a abertura da revisão D6; começar por U0/U1. Aceitar o plano não é aceitar os resultados dos testes, a migração, o deploy, o desligamento ou uma compra de infraestrutura. Esses efeitos exigem as provas e aprovações indicadas.

## 13. Referências

- `docs/PLANO-APP-MOBILE.md`, `docs/relatorios/app-mobile-android.md`.
- `docs/adr/0005-app-web.md`, `0006-painel.md`, `0007-importacao-da-agenda.md`.
- `AGENTS.md`, `CLAUDE.md`, `.claude/claude-security-guidance.md` e skills locais farol-connector, farol-sync-rules, farol-rls.
- Implementações e testes de origem em `/mnt/data/code/farol/raspagem-farol` citados nas tarefas; não dependências runtime do destino.
- Plano isolado anterior: `/mnt/data/code/farol/raspagem-farol/.hermes/plans/2026-11-16_141050-reescrita-supabase-painel-unificado.md`. Esta proposta o substitui **quanto ao destino/arquitetura integrada**, preservando sua utilidade histórica para os casos de compatibilidade. Não executar os dois planos em paralelo.
- Supabase/PostgREST: https://supabase.com/docs/guides/api
- RLS/grants: https://supabase.com/docs/guides/database/postgres/row-level-security
- React-admin/Supabase: https://github.com/marmelab/ra-supabase

**Resultado deste turno:** somente este plano foi escrito no repositório mobile; nenhuma feature, migration aplicada, pacote instalado, deploy, commit ou alteração de banco foi executada.
