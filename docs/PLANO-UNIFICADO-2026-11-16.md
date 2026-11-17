# Farol da Cultura — plano unificado do ecossistema institucional

**Origem:** 2026-11-16. **Revisão:** 2026-11-17. **Estado:** direção de produto e terminologia aprovadas; documentação autorizada; execução das novas tarefas não autorizada por esta revisão.

**Destino:** este monorepo, `Mutirao/farol-da-cultura`. Esta revisão substitui o roteiro futuro anterior neste mesmo arquivo, preservando o histórico no Git e as entregas já realizadas. Não há dois planos de integração concorrentes.

Referências normativas de domínio: [ontologia e fluxo](ONTOLOGIA-E-FLUXO.md) e [ADR-0009](adr/0009-ecossistema-institucional.md). Os detalhes técnicos novos abaixo são tarefas propostas, não contratos de API já implementados nem resultados de aceite.

## 1. Objetivo, escopo e limites

Fortalecer Mapas Culturais como referência institucional das informações culturais, com um ecossistema Farol que coleta e prepara contribuições, acompanha sua incorporação nas instâncias e disponibiliza uma agenda institucional em **Android, iOS e web**, com painel administrativo separado.

O produto contempla múltiplos scrapers/conectores, múltiplas instâncias conectadas e múltiplas cidades. Ceará e Sympla/Fortaleza são pilotos, não limites do modelo. A expansão deve ocorrer em fatias verificáveis, sem ativar integrações não homologadas.

### Requisitos de produto

| ID  | Resultado esperado                                 | Aceite principal                                                                                                                   |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Aplicativo público Android, iOS e web.             | Agenda, filtros, detalhes, procedência e favoritos exercitados por plataforma; fallback de recursos nativos documentado e testado. |
| P2  | Painel separado, React-admin padrão + ra-supabase. | Operador autorizado acompanha coleta, curadoria, envio, confirmação e sincronização; visitante não acessa preparação.              |
| P3  | Múltiplos scrapers e conectores API.               | Dois conectores com fixtures próprias e execução independente, sem dependências de navegador no importador leve.                   |
| P4  | Múltiplas instâncias, incluindo subsites.          | Bases compartilhadas verificadas, IDs com namespace e conexão com cada API testada; não confundir URL com base.                    |
| P5  | Múltiplas cidades.                                 | Recortes e filtros isolados, identidade territorial e fuso explícitos; ausência parcial de uma cidade não altera outra.            |
| P6  | Ontologia e proveniência comuns.                   | Evento, ocorrência e espaço; fonte original, registro institucional e registro interno vinculados sem perda de identidade.         |
| P7  | Agenda pública respaldada pelo Mapas.              | Apenas coletado/aprovado/exportado continua invisível; confirmação institucional precede sincronização e exibição.                 |
| P8  | Preservação e operação segura.                     | Dados/IDs/sequences/CSVs preservados, RLS real, replay e concorrência, corte aprovado e rollback ensaiado.                         |

### Não faz parte desta revisão documental

Alterar código, schema, configuração de builds, dependências ou dados; executar migração hospedada, coleta viva, escrita em uma instância, cron, deploy ou publicação nas lojas; contratar infraestrutura ou arquivar sistemas. Não há autorização implícita de commit/push.

Login de usuários finais, sincronização de favoritos entre aparelhos, notificações e novas entidades como agentes/projetos/oportunidades não são acrescentados automaticamente. Não criar Redis, filas, GraphQL, microserviços ou uma API Node própria.

O suporte web público agora integra o produto; o painel web não o substitui. Manter a direção Expo/Expo Router/camada universal do Expo e verificar adaptações por plataforma, sem presumir compatibilidade de NativeTabs, arquivos, mapas e permissões.

## 2. Referências, precedência e estado observado

### 2.1 Decisões preservadas e revisadas

- [ADR-0009](adr/0009-ecossistema-institucional.md) supera a publicação direta de coleta externa na agenda, a exclusão futura de web e a limitação estrutural a uma cidade/fonte.
- [ADR-0008](adr/0008-plataforma-unificada.md) mantém React-admin padrão + ra-supabase, staging restrito, Supabase/PostgREST e separação de bundles. A prova U0.3 não é painel operacional.
- [ADR-0007](adr/0007-importacao-da-agenda.md) continua sendo referência do importador Ceará existente. O guard de `importar_agenda` continua restrito a `mapa-cultural-ce` até revisão testada do contrato; não é uma RPC genérica de publicação de scraping.
- [ADR-0005](adr/0005-app-web.md) permanece histórico da Fase 0. Sua exclusão de web é superada pelo ADR-0009; o princípio de máximo nativo no Expo permanece.
- [Plano mobile](PLANO-APP-MOBILE.md) e relatórios preservam as entregas M e suas pendências. Suas exclusões antigas de painel, raspagem e web não delimitam mais o produto.
- [Plano da Fase 0](PLANO-FASE-0-REVISADO.md) preserva a fundação e gates. `PLANO-EXECUCAO.md` é stub, não uma especificação implementada.
- `AGENTS.md`, `CLAUDE.md` e instruções locais não são alterados nesta revisão: exigem autorização específica. Trechos desatualizados sobre Refine, web e fases precisam de atualização própria; regras de segurança continuam válidas.

### 2.2 Evidência disponível, sem transformar intenção em entrega

| Frente                | Estado observado e limite                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App                   | Expo existente consulta `/rest/v1/eventos`; valida Zod, pagina e mantém favoritos por `fonte:id_externo`. Demonstração Android está documentada; não prova publicação ou testes iOS.                                           |
| Web público           | `apps/app/package.json` possui script web e dependências web, mas `app.config.ts` declara só iOS/Android. Não há suporte público web homologado nesta revisão.                                                                 |
| Agenda                | Cinco tabelas `eventos`, `eventos_datas`, `espacos`, `categorias`, `eventos_categorias`; dados públicos condicionados a visibilidade.                                                                                          |
| Importador            | Só `workers/coleta` existe; lê a API Ceará, usa `America/Fortaleza` e grava via `importar_agenda`. Generalização não implementada.                                                                                             |
| U0.1/U0.2             | Baseline local e inventário registrados; capacidade, projeto hospedado, volumes reais e backups continuam pendentes de humano.                                                                                                 |
| U0.3/U0.4             | Painel mínimo e prova de instalação/composição/build registrados; D6 revisada e ADR-0008 escrito. Login e operações ainda não entregues.                                                                                       |
| U1                    | Migrations de baseline legado, RLS/vínculo de curador, guard por fonte e precedência do guard estão no Git, assim como provisionador/testes. Isso não prova aplicação em ambiente hospedado nem migração dos dados históricos. |
| Múltiplas integrações | Não há conexão Funarte/MinC ou segunda instância/cidade comprovada nesta revisão. Não apresentar fixtures como fontes reais integradas.                                                                                        |

Fontes: [baseline U0.1](relatorios/unificacao-baseline.md), [inventário U0.2](relatorios/unificacao-dados.md), [prova U0.3](relatorios/unificacao-painel-compatibilidade.md) e [demonstração Android](relatorios/app-mobile-android.md). Os resultados neles são históricos, não testes repetidos nesta revisão.

A origem da coleta é `/mnt/data/code/farol/raspagem-farol`, inspecionada no inventário no HEAD `941a75866c329594fc792501734c48e19afce8ff`. Revalidar HEAD e WIP antes de portar: `chart/templates/dev-postgres.yaml`, `chart/templates/migration-job.yaml` e `kimi-export-session_-20261007-011240.md` eram alterações alheias; não limpar, copiar ou commitar esses WIP.

## 3. Arquitetura de destino

```text
Redes sociais / plataformas / sites
        │ múltiplos conectores e scrapers
        ▼
Coleta restrita → normalização → curadoria no painel
        │
        ▼
Preparação de envio (CSV ou integração autorizada)
        │
        ▼
Instâncias de Mapas Culturais (podem compartilhar base)
        │ API institucional: confirmar identidade e conteúdo
        ▼
Sincronização por instância / base / cidade / janela
        │
        ▼
Projeção da agenda no Supabase / PostgREST
        │
        ▼
Aplicativo público Expo: Android / iOS / web
```

Registros já existentes nas instâncias entram pela sincronização, sem repetir coleta externa/curadoria/envio. Não há atalho de staging para agenda. Uma contribuição pode ser incorporada por operação humana assistida antes de existir automação de escrita, mas sempre depende de confirmação posterior na API.

### 3.1 Organização e dependências

- `apps/app/`: aplicativo público compartilhado, com adaptação web comprovada; nunca importar MUI/React-admin.
- `apps/painel/`: SPA administrativa separada; nunca importar Expo/React Native ou o pacote i18n inteiro dependente de expo-localization. Mensagens administrativas puras; tokens podem ser compartilhados sem UI.
- `workers/coleta/`: importador API leve existente, a evoluir por contratos configuráveis; não adicionar Chromium/Crawlee.
- `workers/sympla/`: pacote ainda proposto para o primeiro porte Chromium. Outros scrapers terão adapters/fixtures próprios; pacotes/processos adicionais só se isolamento e dependências justificarem, não um microserviço por fonte.
- `supabase/migrations/` e `supabase/tests/`: uma autoridade de schema e testes de acesso/transação. Numeração nova deve ser descoberta no momento da escrita; `20261117000400` já é ocupado pelo guard.
- `packages/compat-csv/`: pacote puro proposto para preservar o renderer legado, sem React/Expo/ORM.
- `scripts/migracao/`: ferramentas operacionais; não entram em bundles de cliente.
- `supabase/functions/exportacoes/`: exceção proposta e condicional para CSV, dependente de prova U4.2. Não é um segundo CRUD/backend genérico.

Manter Node 26.10.0, pnpm 12.18.0 e catálogo vigente; não rebaixar versões para o shell. Não trazer NestJS, Express, AdminJS, Refine, Drizzle, reflect-metadata ou middleware de sessão legado. Fetch nativo é suficiente no app/importadores atuais; o SDK do painel não obriga SDK nos demais pacotes.

Preservar inicialmente o motor de scraping caracterizado: Crawlee/Playwright/Cheerio, versões conferidas na origem e pins do porte anterior (`3.18.1`, `1.63.0`, `1.2.0`). Declarar `@crawlee/memory-storage` diretamente se importado. Não atualizar motor junto do porte nem afirmar menos dependências transitivas sem medir.

### 3.2 Modelo multidimensional antes da expansão

Instância, base, fonte e cidade são dimensões separadas. Uma instância atende várias cidades; várias instâncias podem compartilhar base ou atender a mesma cidade. O encaminhamento de fonte para destino é explícito. Não deduzir destino ou equivalência de base por URL/marca/município.

Contratos devem identificar endpoint permitido, capacidades, paginação, taxonomias, recorte, fuso, limites, completude e permissões. Falta de município/fuso não vira Fortaleza/UTC-3; dados incompletos são identificados como tal. Mapeamento territorial estável e fusos serão definidos antes do segundo recorte. Não presumir um código municipal global sem conferir a abrangência exigida.

## 4. Contratos de dados, visibilidade e segurança

### 4.1 Ontologia e identidade

Usar evento, ocorrência e espaço cultural conforme [ontologia](ONTOLOGIA-E-FLUXO.md). Conservar fonte/ID original, instância/ID no Mapas, base/tipo de entidade e ID interno. Identidade institucional é contextualizada por base + tipo + ID; mesma numeração em outra base não prova igualdade.

Instâncias comprovadamente compartilhadas podem expor o mesmo registro sem duplicar a identidade institucional. Não fazer deduplicação automática entre bases independentes nem por título/local. Matching produz candidato revisável; aceitação precisa de evidência.

Preservar as dez tabelas legadas `sources`, `connectors`, `events`, `spaces`, `event_space_candidates`, `job_runs`, `exports`, `export_items`, `users`, `login_tokens`, seus IDs inteiros, constraints, relações, sequences e conteúdo; as cinco tabelas da agenda permanecem. Não renomear `events` para `eventos`, converter IDs ou usar a projeção pública como backup do bruto.

A coexistência dos dois modelos é intencional. Novos vínculos/configurações são aditivos e exigem contrato e RLS antes de aplicação. Não reatribuir favoritos `fonte:id_externo` para IDs institucionais sem migração compatível e prova de leitura dos favoritos já gravados.

### 4.2 Etapas e estados independentes

Coletar não aprova; aprovar não envia; gerar CSV é preparação; tentar enviar não comprova incorporação; confirmar na API não implica que uma nova edição local já esteja incorporada. Matching, curadoria, exportação, confirmação institucional e visibilidade da agenda são ciclos distintos.

Recoleta preserva decisões e vínculos; não atualiza a agenda diretamente. Se o conteúdo mudou, o painel mostra a versão que precisa de revisão/envio. Confirmação vincula destino, registro e conteúdo institucional verificado; não aceitar URL de título semelhante ou uma marcação de sucesso sem conferência.

A agenda é derivada de leitura institucional, com política editorial de visibilidade separada. Uma restrição local pode ocultar a projeção, mas não alterar o registro no Mapas. Aprovar/rejeitar uma preparação não equivale a publicar/apagar um registro institucional; a repercussão editorial na agenda precisa de ação e auditoria explícitas.

### 4.3 Snapshot e cobertura

`importar_agenda(text,jsonb)` permanece autorizado só para `mapa-cultural-ce`, preservando algoritmo, transação e privilégios. Ausência em listagem Sympla/social não prova cancelamento e nunca usa o snapshot destrutivo.

Nova integração precisa de cobertura explícita por base/instância/recorte/janela. Reconciliar ausências somente no escopo integral comprovado; paginação parcial, erro, zero anômalo ou falha de parser não autorizam remoção. Processar subsites de uma base não pode causar remoções cruzadas por tratar cada visão como a base inteira.

Definir antes do corte a política de revalidação, cache, indisponibilidade e retirada institucional: falha de rede não é remoção comprovada; confirmação antiga não permite exibir indefinidamente registro revogado sem uma regra explícita. A revisão documental não escolhe silenciosamente TTL ou política de expiração.

### 4.4 Acesso e confiabilidade

- RLS e GRANT explícito na mesma migration; anon não lê as dez tabelas de preparação. Nunca revogar globalmente o schema público e quebrar a agenda existente.
- Operador ativo e curator é derivado de Supabase Auth por `private.curator_identities` e `public.users`; não confiar em e-mail, papel de navegador ou user_metadata. Desativação deve invalidar autorização mesmo com JWT vigente.
- `auth.users.id` UUID não substitui `public.users.id` inteiro. Provisionamento idempotente preserva vínculo e não reativa conta inativa; colisão de e-mail exige revisão, não exclusão automática.
- Login administrativo sem senha, signup desabilitado, `shouldCreateUser:false`, confirmação explícita antes de `verifyOtp`; GET/prefetch não consome token. URLs/tokens não entram em logs/analytics; sair limpa cache.
- Configurações de conectores, tokens, recibos, HTML bruto e CSV base64 não ficam públicos. Nunca service_role em app, painel ou prefixo público. Schema private não é exposto por PostgREST.
- Mutações transacionais por RPC autorizada; funções security definer exigem search_path seguro, nomes qualificados e testes negativos. Limites de lote, versão esperada e ordem de locks são parte do contrato.
- Execução tem chave idempotente única, reusada em retry após resposta perdida; nova tentativa não cria outra execução. Testar replay e duas sessões reais. Rede fica fora da transação; lock SQL não dura durante navegação.
- Um escritor/agendamento por escopo; resultado antigo não sobrescreve novo. Erros parciais conservam sucessos com contadores reais, sem declarar lote estruturalmente inválido como sucesso vazio.
- Conectores devem limitar timeout, bytes, páginas, concorrência, retries/Retry-After e redirects; validar hosts/protocolos e SSRF. Não contornar autenticação, CAPTCHA ou bloqueio da fonte.

## 5. Roteiro revisado e verificável

Os IDs U0–U7 preservam a organização do plano anterior; U3 muda de publicação direta para incorporação/confirmação institucional. U8 acrescenta o aplicativo público web e provas de plataforma. Tarefas não marcadas como evidência histórica permanecem propostas.

As tabelas abaixo delimitam escopos de escrita por pacote/área. Antes de executar uma fase, decompor cada tarefa em testes e arquivos concretos, com timestamps livres e contratos revisados; nomes de RPCs novas não são aprovados implicitamente. Nenhum executor deve copiar os contratos antigos de `publicar_curados`, `publicacoes_sympla` ou fallback público de espaço Sympla: foram retirados desta revisão por contornarem o Mapas.

Para toda tarefa de código: TDD quando há comportamento novo, integração vertical no limite do caller, fixtures sanitizadas e revisão independente. Caracterização já verde não é RED. Mesmos arquivos têm um único dono e tarefas ordenadas; a revisão técnica de cada fase deve explicitar dependências diretas de todas as tarefas que escrevam o mesmo arquivo antes de qualquer delegação.

### U0 — Baseline, destino e decisões

- **U0.1 — Baseline:** relatório existente; repetir checks na revisão de execução, registrar resultados reais e ambiente, sem reset implícito. Escopo: `docs/relatorios/unificacao-baseline.md`. Juiz: comandos da seção 6.
- **U0.2 — Inventário/capacidade:** relatório local existente; humano confirma origem hospedada, destino, volumes, consumidores, backup e orçamento. Escopo: `docs/relatorios/unificacao-dados.md`. Pronto quando capacidade do bruto/HTML/CSV e agenda estiver demonstrada, não presumida pelo plano Free.
- **U0.3 — Painel mínimo:** prova local existente em `apps/painel` e relatório de compatibilidade; repetir instalação/build apenas quando a execução exigir. Não confundir composição com login/RPCs prontos.
- **U0.4 — Decisões arquiteturais:** ADR-0008 existente e ADR-0009 com direção institucional/multiplataforma. O aceite documental não substitui os gates operacionais.

**Gate U0:** baseline atual, destino/capacidade conhecidos e compatibilidade comprovada; pendências humanas continuam abertas. A arquitetura local pode ser preparada com isolamento, mas corte/deploy não passam sem este gate.

### U1 — Preservação, acesso e contratos de integração

U1.0 (tooling), U1.1 (DDL legado), U1.2 (RLS/vínculo), U1.3 (provisionamento) e U1.4 (guard de fonte) já possuem arquivos no Git. Conservar verificações de baseline, anon sem acesso, usuário sem vínculo/inativo bloqueado, escrita direta negada, agenda preservada, provisionamento/replay/conflitos e guard antes de validar o lote. Reexecutar o gate real antes de novas migrations; existência de arquivo não prova aplicação hospedada.

**U1.5 — Prefator de identidade/configuração, antes de expandir:** depende de U1.0–U1.4 e ADR-0009. Escopo candidato: migrations/testes aditivos, contratos de importação em `workers/coleta`, validação de identidade no app/testes; histórico imutável. Formalizar instância/base/tipo/ID, vínculos com coleta, cidades/fusos, encaminhamento, cobertura e protocolo de confirmação. Definir migração compatível de favoritos e política de revalidação. Nenhuma remoção ou recodificação global de IDs.

**Aceite U1.5:** casos reais em banco local isolado para IDs iguais em bases distintas, registro compartilhado entre duas instâncias, fonte original distinta do ID institucional, favoritos antigos e recortes de duas cidades. Ambiguidade bloqueia vínculo; não gera fusão automática. Contratos novos precisam de revisão antes dos callers.

### U2 — Múltiplos scrapers com piloto Sympla

| ID / dependências | Entrega e escopo candidato                                                                                                     | Pronto quando / juiz                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U2.1 / U1.5       | Portar parser, engine, tipos, normalização/classificação e fixtures para `workers/sympla`, sem Nest/ORM e sem editar a origem. | Testes caracterizados do parser/engine/filters passam; Playwright/Chromium ficam fora do app e do importador API.                                                            |
| U2.2 / U2.1       | Relatório puro de coleta/normalização no mesmo pacote.                                                                         | Fixture cobre incluído/excluído/incompleto, timezone explícito, duplicata, parcial, 429 e zero anômalo; sem campo inventado ou segredo em diagnóstico.                       |
| U2.3 / U2.2       | Contexto e persistência por RPC de servidor, migrations e testes aditivos.                                                     | Coletor confere fonte/conector/recorte ativos antes de navegar e ao gravar; anon/authenticated não autorizado não executam; bruto não entra na agenda.                       |
| U2.4 / U2.3       | Replay, versões, contador e concorrência em worker/testes e RPCs da tarefa anterior.                                           | Mesmo run key não duplica nem incrementa versão; duas sessões reais preservam ciclos; crawl antigo fica skipped; partial/failed não vira sucesso.                            |
| U2.5 / U2.4       | Entrypoint e cliente fetch com validação, limites e retries.                                                                   | Reenvio conserva chave, erro recuperável não vaza conteúdo/credencial; fixture completa sai 0 e partial/failed sai diferente de 0.                                           |
| U2.6 / U2.5       | Agendamento proposto em `.github/workflows/sympla.yml`, inicialmente desativado.                                               | Sem dois escritores; timeout/concorrência por escopo, browser pinado e destinatário de alerta conferidos. Queda antes da persistência é falha do job, não job_run inventado. |
| U2.7 / U2.6       | Segundo scraper/adapter e segunda cidade no contrato U1.5; pacote/local de adapter definido no detalhamento da fase.           | Fixture própria e execução isolada de cada fonte/cidade; falha, revisita ou desativação de uma não apaga registros nem bloqueia a outra indevidamente.                       |

**Gate U2:** testes do pacote, integração RPC/banco local e arquitetura aprovados; nenhuma preparação visível no aplicativo. Coleta viva, ativação e troca de escritor ainda exigem autorização. Não desativar o legado por portar código.

### U3 — Curadoria, incorporação e sincronização institucional

| ID / dependências | Entrega e escopo candidato                                                                                             | Pronto quando / juiz                                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U3.1 / U2.4       | Decisão auditada por versão, migrations/testes e contrato do painel.                                                   | Lote 1–100, versão concorrente, ID ausente, autor forjado e inativo cobertos; aprovação não disponibiliza agenda e preserva matching/exportação/confirmação.                                                                                  |
| U3.2 / U3.1, U4.3 | Preparação e acompanhamento de envio a instância explícita, inicialmente CSV assistido se necessário.                  | Operador autorizado prepara versão revisada; arquivo, tentativa e resultado têm rastreio separado; operação humana/API só com permissão própria. Sem chamada direta de publicação na agenda.                                                  |
| U3.3 / U3.2, U1.5 | Conferência pela API e sincronização da projeção, em `workers/coleta`, migrations/testes e testes do contrato público. | Apenas coletado, aprovado ou CSV gerado não aparece; leitura do registro institucional correspondente permite sincronizar. Conteúdo divergente, ID ambíguo, instância errada, resposta parcial e falha de API não geram confirmação fictícia. |
| U3.4 / U3.3       | Procedência, link institucional e compatibilidade de favoritos em `apps/app/src/agenda`, detalhe e testes.             | Link usa instância/base/ID corretos e URL validada; fonte desconhecida não fabrica endereço; migração de chaves conserva favoritos e IDs. Sem Auth administrativo no app.                                                                     |
| U3.5 / U3.4       | Segunda instância independente e duas instâncias compartilhando uma base; ampliar fixtures e integrações de U3.3/U3.4. | Mesmo ID em bases distintas não colide; mesmo registro de base compartilhada não duplica; consultas por cidade/janela não removem outro recorte. Gate inclui política de indisponibilidade/revalidação/retirada definida em U1.5.             |

**Gate U3:** percurso fixture → curadoria → preparo → incorporação conferida → API → agenda anônima em Supabase local real, incluindo estados negativos e RLS. Simular API com fixtures prova protocolo, não integração viva; antes de conectar cada instância, executar smoke GET autorizado e documentar contrato, versão, permissão e evidência de compartilhamento. Não inferir Funarte/MinC conectados.

### U4 — CSV e operações preservadas

| ID / dependências | Entrega e escopo candidato                                                                       | Pronto quando / juiz                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U4.1 / U2.2       | Renderer puro em `packages/compat-csv`, fixtures independentes copiadas do legado e testes.      | Mesmas 29 colunas, cabeçalho literal, BOM, `;`, CRLF, Unicode, fuso do destino, escaping e proteção de fórmula inclusive controle/espaços. Compatibilidade Ceará preservada; outro destino exige contrato próprio.        |
| U4.2 / U4.1       | Prova e medição em `docs/relatorios/exportacao-backend.md`.                                      | Comparar renderer Edge local com SQL nos mesmos fixtures; maior lote cabe nos limites reais. Aprovação explícita antes da exceção Function; não truncar lote nem adicionar fila automaticamente.                          |
| U4.3 / U4.2       | Geração/download autenticados e recibos idempotentes, no runtime escolhido; testes reais.        | Uma transação trava/reclama elegíveis, grava lote/items/checksum/recibo; replay e concorrência não duplicam. Download histórico usa bytes armazenados; rejeição/edição posterior não altera CSV. Inativo/JWT antigo nega. |
| U4.4 / U4.3       | Inventário de matching/sync de espaços e parser Uhuu, escopo no worker e testes se ainda usados. | Preservar candidatos e resolução aceita; recurso usado só sai com substituto testado ou aceite explícito de aposentadoria. Não ativar fonte ou sync opcional por inferência.                                              |

Não remover SMTP/alerta antigo sem canal substituto e destinatário testados. CSV de conferência inclui excluídos/incompletos e tem contrato distinto; exportação não aprova, não incorpora e não publica.

### U5 — Painel operacional

| ID / dependências       | Entrega e escopo candidato                                                          | Pronto quando / juiz                                                                                                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U5.1 / U0.3, U1.5       | Layout/tema/mensagens e recursos explícitos em `apps/painel`.                       | React-admin padrão/MUI, tokens puros e pt-BR, sem kit sobre kit; recursos de fontes, execuções, instâncias/bases/cidades, curadoria, envios e agenda. Sem descoberta automática de tabelas/config/usuários.                                              |
| U5.2 / U5.1             | Auth e confirmação segura em painel/testes.                                         | GET não consome OTP; clique verifica; sem signup; inativo/não vinculado nega e logout limpa cache. Token/query de login não entra em logs.                                                                                                               |
| U5.3 / U5.2             | Listas/detalhes por recorte, contexto e estados em painel/testes.                   | 51 linhas dão 50+1, opções 25/50/100, filtros/sort/página na URL, ID desempata, fuso do recorte; vazio/loading/erro/retry e HTML bruto como texto.                                                                                                       |
| U5.4 / U5.3, U3.5, U4.4 | Ações auditadas de curadoria, preparação, conferência e visibilidade institucional. | Cancelar não muta; conflito exige refetch/confirmar; estado incerto conserva chave idempotente; nenhum botão publica coleta diretamente. Configurar/habilitar integração exige autorização e capacidades verificadas.                                    |
| U5.5 / U5.4             | E2E real local e relatório de QA do painel/app.                                     | Visitante não vê preparação, curador prepara, confirmação pela API antecede agenda; teste negativo sem confirmação, falha/retirada e isolamento entre recortes. CSV antigo permanece idêntico. Navegador 375/768/1440, foco, teclado e erros conferidos. |

**Gate U5:** Auth/RLS/RPC/painel e contrato de agenda integrados. A SPA administrativa não conta como aplicativo público web. CI de Function, se adotada, tem job explícito e runner comprovado, não um `pnpm test` que a ignora.

### U6 — Migração de dados e corte

- **U6.1 / U1.5, U5.5:** manifesto e runbook em `scripts/migracao` e `docs/runbooks/unificacao-corte.md`. Transação read-only repeatable-read, UTC, paginação por ID; colunas/tipos/defaults/nullability, constraints/índices, contagens, hash SHA-256 do conteúdo ordenado e sequences last_value/is_called. Baseline independente da agenda prova que não foi sobrescrita. Testes detectam alteração com mesma contagem e sequence divergente; não imprimir dados privados.
- **U6.2 / U6.1:** ensaio de restore isolado das dez tabelas/sequences selecionadas, sem dump global sobre public. DDL baseline não é importação dos dados. Distinguir dados sobre schema já aplicado de restore com schema; histórico Drizzle é arquivado, não migrador paralelo. Sem `--clean` amplo, sem dump versionado, sem restaurar Auth/storage/migrations Supabase.
- **U6.3 / U6.2:** provisionamento em dry-run, revisão humana de colisões, vínculos e login piloto; desativação com mesmo JWT, download histórico e checksums, contagens de classes/candidatos e agenda preservados.
- **U6.4 / U6.3, U0.2:** corte humano aprovado, um escritor por escopo. Parar mutações/agendamento antigo e aguardar término; backup/manifesto final; humano importa e compara; grants/Auth/runtime e painel validados; então trocar escritor, habilitar cada integração autorizada e conferir coleta, confirmação institucional, sincronização, app e exportação. Não pausar o importador Ceará sem necessidade/decisão explícita.

**Limite do rollback:** a primeira escrita nova no destino impede restaurar automaticamente snapshot antigo ou reabrir origem para escrita. Rollback de código usa dados canônicos atuais ou reconciliação aprovada, sem perder decisões/envios. Registrar esse instante, responsável, janela, retenção, canal de alerta e evidência. O humano escolhe capacidade/hospedagem/backups antes do corte; Free não é garantia de produção.

### U8 — Aplicativo Android, iOS e web

Esta trilha pode avançar em paralelo à coleta depois dos contratos U1.5; o gate final depende de U3.5/U5.5. Não bloquear melhorias mobile já existentes em função da migração, nem excluir o alvo web do aceite final do produto.

| ID / dependências | Entrega e escopo candidato                                                                                                       | Pronto quando / juiz                                                                                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U8.1 / U1.5       | Prova de compatibilidade e especificação das adaptações em `apps/app`/relatório; código de plataforma só em execução autorizada. | Inventário de Expo Router/NativeTabs, wrappers Expo UI, arquivos/favoritos, maps, localização, compartilhamento e links; cada recurso tem implementação suportada ou fallback explícito sem nova UI arbitrária.                                     |
| U8.2 / U8.1       | Habilitar web em configuração/rotas/storage do aplicativo, testes e job de export/browser.                                       | Navegador carrega agenda pública e rotas diretas, busca/filtros por cidade, detalhe e procedência; favoritos persistem em reload; sem importar módulo nativo incompatível. Negação de localização e teclado/foco têm prova de comportamento.        |
| U8.3 / U8.2, U3.5 | Regressão Android/iOS e paridade da agenda pública.                                                                              | Mesmas fixtures institucionais/recortes produzem resultados equivalentes; favoritos antigos conservados; share/link/permissão exercitados por plataforma; fonte ampliada e leitores de tela conferidos. Export não substitui teste iOS em aparelho. |
| U8.4 / U8.3, U5.5 | Preparação de release/hospedagem e QA, sem publicar por inferência.                                                              | Teste interno Play/TestFlight, domínio/hospedagem web, deep links, privacidade e acessibilidade aprovados por humano; lojas/chaves/Apple/Maps continuam gates próprios.                                                                             |

A princípio, `apps/app` continua a base Expo única; a tarefa não cria outro frontend público por padrão. Build web, teste browser e deploy são evidências separadas. Expo Observe permanece a direção de observabilidade; conferir suporte e configuração de cada plataforma antes de afirmar cobertura.

### U7 — Aposentadoria e gate final (última etapa)

- **U7.1 / U6.4, U8.4:** verificar arquitetura em scripts/testes e runtime autorizado: sem API Node/ORM/frameworks aposentados, sem MUI no app ou Expo no painel, sem segredos em bundles; HTML e dependências de ferramenta não são falsos positivos. Código ausente não prova pod/cron desligado.
- **U7.2 / U7.1:** só com autorização específica, arquivar origem após aceite e recuperação preservada. Não apagar repo, WIP, usuários ou tabelas para limpar. Retenção proposta: sete dias e uma coleta diária válida, o que demorar mais; decisão operacional final é humana.
- **U7.3 — Verificação final:** depende de U7.2 e de todas as tarefas anteriores. Revisor diferente do implementador executa a matriz da seção 6 e confere preservação, direção institucional, múltiplos recortes e três plataformas; relatório em `docs/relatorios/unificacao-aceite.md`, com comandos/ambiente/exit codes/artefatos reais e pendências humanas explícitas. Review com achados abre tarefa de correção identificada e repete o gate; no máximo duas rodadas de correção, depois reportar achados abertos, sem declarar aceite.

## 6. Verificação e critérios de conclusão

A matéria-prima dos testes são fixtures sanitizadas da API e dos scrapers, SQL/migrations reais, CSV legado independente, dados/manifestos autorizados e comportamento em navegador/aparelhos. Descrições de issue ou respostas simuladas de sucesso não substituem esses insumos. Testes/RLS, comparação de bytes/manifestos, browser e revisão humana são os juízes; a leitura do executor não é aceite.

| Dimensão         | Casos obrigatórios                                                                                                                           | Responsável no roteiro     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Autoridade       | Coletado, aprovado e CSV gerado invisíveis; conferido na API visível após sync; edição local não incorporada não substitui conteúdo público. | U3.1–U3.3, U5.5            |
| Identidade       | Mesmo ID em bases distintas; evento/espaço com mesmo número; instâncias de base compartilhada; fonte original distinta de ID institucional.  | U1.5, U3.5                 |
| Cidade/cobertura | Duas cidades, fuso explícito, município desconhecido, snapshot completo vs parcial, recortes sobrepostos sem remoção cruzada.                | U2.7, U3.5                 |
| Revalidação      | API indisponível, registro retirado/oculto, conteúdo alterado e confirmação antiga conforme política explicitamente definida.                | U1.5, U3.3, U3.5           |
| Concorrência     | Duas sessões reais, replay após timeout, versão divergente, execução antiga e falha parcial preservando contadores verdadeiros.              | U2.4, U3.1, U4.3           |
| Segurança        | Anon, não vinculado, inativo com JWT vigente, autorização forjada, SSRF/redirect, URLs perigosas e segredo em bundle/log.                    | U1, U2.5, U3.4, U5.2, U7.1 |
| Preservação      | Dez tabelas/IDs/sequences iguais, agenda não sobrescrita, favoritos antigos e CSV bytes/checksum invariáveis.                                | U1.5, U3.4, U4, U6         |
| Plataformas      | Android/iOS/browser: agenda, busca/filtros/cidades, detalhes, procedência, favoritos, permissão negada, fallback, teclado/leitor de tela.    | U8, U7.3                   |
| Operação         | Um escritor por escopo, alerta recebido, backup/restore ensaiado, confirmação das conexões e legado sem tráfego.                             | U2.6, U6, U7               |

### Comandos existentes de referência

Rodar na raiz, com Node de `.nvmrc`; Biome é o único linter. Não usar `npx expo lint` nem `turbo run lint` (o script Expo pode instalar ESLint e sujar manifests).

```bash
pnpm biome ci .
pnpm turbo run typecheck test
pnpm run check:tooling
pnpm --filter @farol/coleta test
pnpm --filter @farol/app test
pnpm --filter @farol/painel typecheck
pnpm --filter @farol/painel build
pnpm exec vitest run scripts/migracao/test scripts/test
```

`pnpm supabase test db` exige banco local isolado com schema correspondente. `pnpm supabase start` e principalmente `pnpm supabase db reset --local` não podem substituir ou apagar a demonstração existente sem consentimento. Nenhuma execução local prova capacidade/migração hospedada.

Comandos novos de scraper, integração browser, Function e export web devem ser fixados no detalhamento da fase após existência dos respectivos pacotes/runners. Não escrever gate verde para script ausente ou teste skipped. Fixtures/stubs podem provar acesso à API, mas não uma incorporação real em instância de terceiro.

### Review Focus: entradas ainda dependentes de contrato

1. **Registro some depois da confirmação:** distinguir indisponibilidade/retirada; política definida em U1.5 e coberta por U3.5 antes do corte.
2. **Subsite compartilha só parte dos contratos/IDs:** comprovar namespace por tipo/endpoint em U1.5/U3.5; não presumir equivalência de todos os recursos.
3. **Data sem fuso ou ocorrência em outra cidade:** exigir origem temporal explícita ou classificar como incompleto em U2.2/U2.7, sem deslocamento silencioso para Fortaleza.
4. **Favorito salvo antes do vínculo institucional:** provar resolução compatível após mudança de namespace em U1.5/U3.4/U8.3; não apagar preferências para passar o teste.
5. **Capacidade de escrita e CSV varia por instância:** U3.2/U4.1 devem rejeitar destino sem contrato, preservar versão/artefato e exigir confirmação posterior. Automação de escrita ainda não escolhida.

## 7. Riscos, gates humanos e conformidade

A revisão respeita `AGENTS.md` e `.claude/claude-security-guidance.md`: RLS/grants e pgTAP, nenhuma credencial privilegiada no cliente, nenhuma leitura/manipulação de segredos pelo agente e nenhum comando remoto negado por wrapper alternativo. Não editar instruções protegidas por consequência de atualizar os documentos.

O princípio de máximo nativo no Expo é mantido; o alvo web agora é requisito de produto, com prova técnica antes da entrega. O painel é outra interface e não obriga compartilhar sua UI com o app.

Gates ainda humanos: destino/capacidade/custo/backup; acesso a contas/lojas e Apple; chave Maps restrita se necessária; permissões de cada fonte/instância; envio/importação institucional; política de revalidação; exceção CSV/Edge; hospedagem web; responsável/canal de alerta; revisão de acessibilidade; janela/corte/rollback e aposentadoria. Não preencher assinatura, data de aceite ou implantação que não ocorreu.

Não prometer cobertura nacional por conectar duas instâncias, cancelamento por ausência parcial ou paridade completa por compilar três alvos. Não eliminar coleta existente antes da homologação e do corte de cada escopo.

## 8. Ordem e aceites separados

```text
U0: baseline / decisões / capacidade
U1: preservação / segurança → U1.5 contratos multidimensionais
    ├→ U2 coleta → U3.1 curadoria ───────────────┐
    ├→ U4 CSV → U3.2 preparo → U3.3 API/sync → U3.4/U3.5
    ├→ U5.1–U5.3 painel → U5.4–U5.5 integração ┘
    └→ U8.1–U8.2 web → U8.3–U8.4 três plataformas
U6 corte aprovado → U7 aposentadoria / revisão final
```

As dependências por tarefa prevalecem sobre o desenho resumido; não existe ciclo U3/U4. U8 pode avançar antes de U6, mas release/corte/deploy permanecem ações autorizadas separadamente. Antes de delegar código, materializar a decomposição por arquivos e dependências da fase; esta revisão documental não despacha executores.

Aceite de domínio e escopo não é aceite da implementação, da migração, do deploy ou de uma compra. Esta revisão registra o entendimento aprovado e corrige o plano; a execução técnica deve começar por rebaseline e detalhamento dos contratos U1.5, sem reiniciar nem declarar concluídas as entregas já existentes.
