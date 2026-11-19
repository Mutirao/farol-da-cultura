# Plano de implementação — Sympla, Outgo, Ingresse e Bilheteria Digital

> **Estado:** detalhamento de U2 incorporado ao [plano unificado](../PLANO-UNIFICADO-2026-11-16.md) e ao [roadmap](../ROADMAP.md). Pesquisa datada de 19/11/2026; não autoriza implementação ou ativação. Evidência de código: HEAD `0b5935595f1b19b51c63fc5867dc72d1c76c0ff4` + working tree. GitNexus/PDG indisponíveis nesta sessão; as conclusões do repositório são derivadas de leitura e testes, não de grafo.
> **Proveniência local, schema 2:** 36 caminhos citados. SHA-256 do estado sujo: `35f879295265e2c7f3371bfb637dacc00933384e80f7c2c94679ca87d78c771d`. Somente o caminho deste plano é excluído do digest; §11 contém a evidência detalhada.
> **Legenda:** `[verified]` = código/configuração conferidos; **observado** = amostra pública ou resultado local, não contrato da origem; `[inferred]` = conclusão/recomendação; `[assumed]` = hipótese a verificar.

## 1. Objetivo

Implementar coleta de eventos externos nesta ordem: **1. Sympla → 2. Outgo → 3. Ingresse → 4. Bilheteria Digital**. Entregar uma fonte operacionalmente isolável por vez, com cobertura descrita, evidência mínima, falhas visíveis e recoleta sem duplicatas. Usar **Fortaleza/CE, presencial, início nos próximos 30 dias** como recorte comparável inicial, apenas onde houver inventário e contrato verificáveis. A segunda cidade de U2.7 é outro recorte homologado, não expansão automática para capitais ou Brasil todo.

A coleta termina na preparação restrita em `public.events`. **Coletar, aprovar ou gerar CSV não põe um evento na agenda.** A contribuição precisa ser incorporada e conferida na API da instância do Mapas Culturais; a agenda deriva da sincronização institucional. Não mudar `public.importar_agenda`, app, favoritos ou patrimônio histórico para entregar o crawler. Referências: [ADR-0009](../adr/0009-ecossistema-institucional.md), [ontologia](../ONTOLOGIA-E-FLUXO.md), [plano unificado U1.5/U2](../PLANO-UNIFICADO-2026-11-16.md#u2--múltiplos-scrapers-com-piloto-sympla) e [roadmap](../ROADMAP.md#2-roadmap-mínimo-depois-da-fase-0).

## 2. O que existe e o que falta

- `[verified; código]` S0.3 já tem parser de **detalhe** `parseEventPage`, leitura local `prepararColeta`, normalização `montarLote` e o CLI `@farol/sympla coletar`. Lê `__NEXT_DATA__`; não descobre, pagina, revisita nem agenda. Fontes: [`src/sympla.ts`](../../workers/sympla/src/sympla.ts), [`src/coleta.ts`](../../workers/sympla/src/coleta.ts), [`src/coletar.ts`](../../workers/sympla/src/coletar.ts), [`src/lote.ts`](../../workers/sympla/src/lote.ts), [README do worker](../../workers/sympla/README.md).
- `[verified; SQL]` [`registrar_coleta_minima`](../../supabase/migrations/20261117000600_coleta_minima.sql) só aceita `sympla`, cria a fonte mínima se faltar, limita a 500 eventos e faz upsert por `(source_id, external_id)`. Reenvio do run key com o mesmo lote repete o recibo, não a escrita. Não valida um conector/recorte ativo nem ordena o término de runs diferentes; grava `job_runs.succeeded` quando a **gravação** vence, mesmo que o CLI tenha páginas ilegíveis. **Não basta remover o `if` de Sympla.**
- `[verified; código/SQL]` [`classify.ts`](../../workers/sympla/src/classify.ts) e [`normalize.ts`](../../workers/sympla/src/normalize.ts) contêm pressupostos da fase mínima: fuso de Fortaleza, fallback territorial por texto, modalidade por heurística; datas só com dia podem virar meia-noite. A RPC inclui `raw_json` e classificação de janela na comparação de `version`. Não generalizar esse comportamento entre fontes ou recortes.
- `[verified; código/SQL]` O botão mínimo de [exportar aprovados](../../apps/painel/src/eventos/ExportarAprovadosButton.tsx) lê `curation_status = approved`; isso não prova que o conteúdo **atual** é a versão revisada. [`curar_evento`](../../supabase/migrations/20261117000700_curadoria_minima.sql) da base S0 checa `version` sob lock. [`registrar_incorporacao`](../../supabase/migrations/20261117000500_vinculo_institucional.sql) da base S0 confere aprovação. A proteção contra exportar ou encaminhar revisão não aprovada é um **gate de operação**, não algo que o crawler resolve apagando a decisão anterior.

## 3. Arquitetura recomendada

`[inferred]` **Um worker, um job por fonte/recorte, adaptadores pequenos**, no pacote `workers/sympla` neste ciclo (nome histórico). Preservar a CLI de arquivo, os caminhos consumidos pelo S0 e o importador institucional em [`workers/coleta`](../../workers/coleta/README.md). Só tirar primitivas do piloto para o módulo comum quando Outgo demonstrar compartilhamento. Não criar um processo permanente por fonte, SDK genérico de crawler, fila, ORM ou um novo backend. Renomear o pacote é adiável.

```text
Entrada autorizada (API/feed ou página) → descoberta paginada → detalhes/revisita
  → adaptação por fonte → normalização + classificação → relatório com cobertura
  → RPC de servidor (somente preparação) → public.events e auditoria de execução
```

Proposta de interface comum em C2: `coletar(recorte, transporte, conhecidas) → relatório com registros identificados, evidências, cobertura e issues`. Só o adaptador conhece o markup, ID e paginação da fonte; só a normalização conhece o modelo interno; só o coordenador usa o banco. Simulação usa a mesma interface com fixtures/HTTP local. Preferir **API/feed documentado e autorizado** se cobrir o objetivo; senão, **HTTP em páginas públicas autorizadas**; navegador apenas se a evidência mostrar necessidade e a fonte permitir. Dados embutidos no HTML não são uma API pública de catálogo.

## 4. Pesquisa de campo, por ordem de entrega

Método: GETs pontuais e anônimos de páginas públicas e `robots.txt` na primeira etapa da pesquisa; contagem de âncoras, leitura de JSON embutido e teste de um detalhe Sympla sobre os arquivos locais. Não houve caminhada do catálogo, login, chamada a API interna, uso de credencial ou navegador renderizado. A rodada não validou o texto integral dos termos nem fez busca web adicional ou homologação viva. Links de documentação, termos e contato abaixo são pontos de verificação, não licenças. Não versionar respostas, cookies ou cabeçalhos brutos.

### 1º Sympla — HTTP é o primeiro experimento, não um aceite de cobertura

- **Observado:** a [listagem Fortaleza](https://www.sympla.com.br/eventos/fortaleza-ce) e [`?page=2`](https://www.sympla.com.br/eventos/fortaleza-ce?page=2) devolveram HTTP 200 (421 kB e 402 kB). Contando URLs absolutas de detalhe `www.sympla.com.br/evento/…/<id>` em **todo** o documento: 61 na primeira resposta, 70 na segunda, 58 exclusivas da segunda. No DOM, os 16 `a.sympla-card` da primeira página eram **Bileto**; na segunda, 10 Sympla e 6 Bileto. Os dados embutidos indicavam `total=269`, `limit=16`, páginas 1 e 2 no bloco de resultados, **não** 269 candidatos Sympla/Fortaleza válidos. Havia carrosséis separados, inclusive com cidades como Jijoca de Jericoacoara. Não somar `total` dos carrosséis nem usar regex global de URLs como prova de descoberta.
- **Observado:** um [detalhe público em Fortaleza](https://www.sympla.com.br/evento/23-encontro-da-comunidade-de-produto-ceara/3653650) devolveu 200 (223 kB). `parseEventPage` atual leu ID, canonical alinhado, cidade e início com offset. O detalhe ainda usa `__NEXT_DATA__`; a listagem observada usa dados embutidos do Next App Router, não o mesmo formato. O sitemap nacional observado tinha 22.584 entradas sem `lastmod` por evento e sem filtro por município; **não** serve como descoberta incremental ou alternativa de volume para este piloto.
- **Observado:** `robots.txt` respondeu **503** nas duas consultas. `Raspagem-Farol@941a758`, `docs/validacao-sympla.md`, registra ocorrência anterior de **429** na listagem. 503 não prova bloqueio permanente e 200 no catálogo não autoriza automação. Portal oficial linkado: [API Sympla](https://developers.sympla.com.br/api-doc/index.html), [termos](https://termos-e-politicas.sympla.com.br/hc/pt-br), [contato](https://ajuda.sympla.com.br/hc/pt-br/requests/new). Confirmar se a API/um feed contratado cobre descoberta municipal multi-organizador; acesso autorizado aos eventos da própria conta **não** demonstra esse catálogo.
- `[inferred]` Primeiro construir prova offline **HTTP + parser de detalhe existente**. Caracterizar o bloco principal e o término de `page`, contabilizando Bileto separadamente como família fora do piloto, sem requisitar esse host. Se exigir dados embutidos, ler o mínimo de JSON identificado pela forma da resposta, sem executar JavaScript nem aderir ao protocolo interno; se a forma não for estável em fixtures e amostras atuais, não adotar. Browser é candidato somente se faltar cobertura que a página renderizada autorizada comprove; é **proibido** usá-lo para superar 429, desafio ou `robots` indisponível. M2 não exige navegador antecipadamente: o transporte escolhido precisa passar no aceite de cobertura de U2.

### 2º Outgo — SSR parece suficiente; recorte e identidade são a prova pendente

- **Observado:** [home](https://www.outgo.com.br/) 200, ~3,50 MB. HTML SSR contém 12 cards `out-card-event` na amostra de RN; `script#app-root-state` contém `states` (inclui CE) e `agenda-home-RN--` com `events`, `featuredEvents`, `new_events` e `moreEvents`. A amostra contém `id`, `identificador`, `startDate`/`endDate` sem offset, `cancelled`, `isPublic` e `location`. Links públicos de categorias de RN aparecem em `/eventos/RN/…`. A home **não** demonstrou Fortaleza, paginação final ou equivalência entre ID do catálogo e do detalhe.
- **Observado:** [robots](https://www.outgo.com.br/robots.txt) 200, com restrição explícita a `/honeytrap-canary/`. O HTML aponta [termos](https://www.outgo.com.br/termos), [privacidade](https://www.outgo.com.br/privacidade) e [página institucional](https://www.outgo.com.br/sobre). Não há feed/API de catálogo identificado nesta amostra. Não usar a UF escolhida pelo servidor/cookie como configuração do Farol.
- `[inferred]` Pedir feed de catálogo à equipe Outgo; senão, validar a **rota pública ligada pelo seletor** para CE/município e como `moreEvents` progride, sem presumir que mudar a URL prova o filtro. Extrair SSR por HTTP, preferindo o estado estruturado limitado; decodificar o escape específico do TransferState uma vez e fazer `JSON.parse`, nunca `eval`. Cruzar cards e estado por ID/link; deduplicar os grupos; exigir prova de estabilidade do ID em dois detalhes/revisitas e de escopo (global ou por tenant). Slug é URL, não chave. Aceitar hora civil só com contrato de fuso; `location` pode ser rótulo incompleto. `isPublic=false` não entra como candidato; `cancelled=true` sobre evento identificado é evidência distinta de fim de venda.

### 3º Ingresse — catálogo por parceria primeiro; browser é contingência

- **Observado:** [home](https://www.ingresse.com/) 200, 14,4 kB, com shell Next App Router, `NEXT_DYNAMIC_NO_SSR_CODE`, placeholder de carregamento e nenhuma âncora de evento no HTML amostrado; há referências a Queue-it na página. Isso demonstra que o **HTML inicial da home** não entrega o inventário, não que todo detalhe exija navegador ou que não exista API. [Robots](https://www.ingresse.com/robots.txt) 200 com restrição explícita a `/honeytrap-canary/`.
- `[inferred]` Solicitar **documentação e acesso de leitura ao catálogo autorizado**, verificando se lista por município/janela, namespace de IDs, relação evento–sessão, status e cursor; um endpoint de bilhetagem para produtor não basta. Não procurar chaves em bundles nem usar endpoints de venda/widgets como catálogo. Sem feed, após consulta aos termos e autorização, conferir em navegador público a listagem, o fim da paginação e uma amostra de detalhes/JSON-LD. Usar browser só na etapa que o exigir; não atravessar sala de espera, autenticação nem checkout. Se nenhum caminho comprovar cobertura, manter desativado; URLs cedidas por organizadores são amostra, não catálogo completo.
- **Prova exigida:** fixtures de duas páginas/cursors, de uma edição com múltiplas sessões e de indisponibilidade; ID estável em revisita e correspondência com a data/local público. Tratar horário de sessão, início das vendas e fim de lote como campos distintos.

### 4º Bilheteria Digital — HTML de vitrine promissor; falta ID estável

- **Observado:** [home](https://www.bilheteriadigital.com/) 200, 191 kB. Cards são HTML com link de detalhe de caminho amigável e texto de dia/local/cidade; não há JSON-LD na home amostrada. Existe formulário público **GET `/busca`**, campo `pesquisa`; não foi testado se a busca tem filtro por município, pagina, retorna HTML completo ou encontra Fortaleza. O próprio HTML aponta [termos](https://bd.bilheteriadigital.com/termos-uso), [privacidade](https://bd.bilheteriadigital.com/politica-privacidade) e [atendimento](https://www.bilheteriadigital.com/atendimento). [Robots do host `www`](https://www.bilheteriadigital.com/robots.txt) 200 restringe `/voucher/`.
- `[inferred]` Pedir feed/API documentado. Alternativa HTTP: validar a rota ligada pelo formulário e critérios de paginação/território; abrir detalhes autorizados para conferir ID e data completa. Preferir estrutura de evento/JSON-LD **se houver e for confiável**, senão seletores testados. Não inventar ano pelo dia/mês do card; slug com data no caminho pode mudar; título+data não é ID. Sem identificador editorial estável ou contrato equivalente, não gravar automaticamente. Sem catálogo verificável, amostra assistida com cobertura declarada como tal.
- **Identidade:** Bilheteria Digital (`bilheteriadigital.com`) **não é** Bilheteria Virtual (`bilheteria.com.br`), pesquisada no legado. Não portar rotas, chaves, tenants ou conclusões dessa outra plataforma.

## 5. Fluxo crítico verificado sem PDG

Sem índice/runner local e sem ferramentas GitNexus nesta sessão; refresh não executado. Os pontos abaixo vêm de `rg` por caller e leitura direcionada, não de arestas inferidas como se fossem análise estática:

| Trecho verificado                                                                                                                                                                                                                                                    | Consequência para a implementação                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[verified]` `coletar.ts` → `prepararColeta` → `parseEventPage`/`montarLote` → [`registrarColetaMinima`](../../workers/sympla/src/rpc.ts). Código parcial (`2`) é decidido depois de gravar.                                                                         | CLI de rede separado, resultado de operação explícito; não alterar o contrato da CLI de arquivo por efeito colateral.                                                                         |
| `[verified]` Migração `20261117000600`: guard de fonte (linha 69), recibo/hash (86–115), upsert/version (203–275), `succeeded` (283). Testes em [`006_coleta_minima.test.sql`](../../supabase/tests/006_coleta_minima.test.sql).                                     | Evoluir por migração aditiva; não editar baseline. O namespace e o recibo antigo continuam funcionando. A concorrência de duas chaves diferentes precisa de testes novos e transações curtas. |
| `[verified]` [`esqueleto.ts`](../../scripts/e2e/esqueleto.ts#L266) importa arquivos do worker e o detalhe histórico por caminho; [`e2e.yml`](../../.github/workflows/e2e.yml) filtra `workers/sympla/**`.                                                            | Sem mover o pacote nem as fixtures. Reusar [stack efêmera](../../scripts/e2e/README.md) nas provas, preservar os casos institucionais do S0.                                                  |
| `[verified]` [`curadoria_acesso`](../../supabase/migrations/20261117000200_curadoria_acesso.sql) concede ao curador ativo leitura de `events` e `job_runs`; `connectors` não tem leitura de painel. [`config.toml`](../../supabase/config.toml) não expõe `private`. | Colunas `raw_json` e `details` atuais **não** são cofre de credenciais ou de dados pessoais. Não conceder leitura nova dos conectores para montar o job.                                      |

## 6. Contrato proposto de implementação

### 6.1 Fonte, recorte e normalização

- **Configuração aprovada no servidor:** `source_id`, conector cadastrado, recorte estável, método/rota e revisão do contrato, município IBGE (Fortaleza `2304400`), fuso IANA, janela, política de cobertura, limites e aprovação operacional. Separar `sources.is_active` de “crawler liberado neste recorte”; novas configurações nascem desligadas. Credenciais de eventual feed só no cofre/ambiente do job, não em `connectors.config_json`. Base e instância Mapas não se deduzem da cidade e não são parâmetros de publicação do crawler.
- **Identidade e detalhes:** `(source_id, external_id)` permanece. ID vem de evidência estável; canonical de detalhe válido deve concordar com ID do payload/candidato. Preservar representação sem perdas (string, não converter IDs potencialmente grandes para `Number`). Slug alterado mantém ID; mesma numeração em duas fontes é distinta; similaridade só gera sugestão futura. Sem identidade/título confiáveis, registrar motivo sanitizado, **sem linha inventada**.
- **Tempo e lugar:** congelar `agora` por execução; preservar a janela inicial de [`filters.ts`](../../workers/sympla/src/filters.ts), `[agora, agora + 30×24 h]`. Usar `Temporal` estrito: offset explícito preferido; hora civil sem offset só com evidência temporal do recorte/fonte; data sem hora não vira `00:00`, e horário impossível, ambiguidades ou término menor que início viram issue. Validar município/UF com chave territorial; não inferir Fortaleza pela URL da vitrine nem por substring de endereço. Distinguir presencial, online e desconhecido por evidências positivas. Espaço textual não é identidade institucional. Coordenada só se comprovada e válida, nunca `0,0` como default.
- **Evento × ocorrência:** se houver uma ocorrência ou um intervalo contínuo comprovado, projetar nos campos atuais. Para várias sessões, preservar sua evidência mínima ordenada, sem colapsar num evento contínuo ou criar IDs sintéticos; se a projeção S0 não representar o dado, marcar incompleto para revisão. `collection_status` (`included`, `excluded`, `incomplete`) é diferente de execução e de curadoria. Classificação da janela pertence ao recorte; no piloto há um recorte ativo por fonte. Antes de admitir recortes sobrepostos para a mesma fonte, fixar em U1.5 qual alimenta a projeção em `events`; a observação de outro recorte não pode sobrescrevê-la pelo simples fato de executar por último.
- **Atributos e privacidade:** validar uma projeção pequena e allowlist de campos para `raw_json`/`venue_raw` em vez de copiar a hidratação atual inteira. Considerar texto sem marcação, URL/imagem HTTPS em origens aprovadas, datas originais, local público, versão do parser e evidência de cancelamento/preço quando houver. Não copiar e-mails de organizador, nomes de compradores, dados de venda, hashes, detalhes de tracking ou scripts. Não baixar imagem por padrão. Ausência de preço não é gratuidade nem preço pago; não escrever `is_free`/`price_min`/`price_max` no primeiro corte. Não substituir registro válido por parse estruturalmente degradado; informações expressamente ausentes numa resposta válida são distintas de campos que o parser deixou de entender. Não alterar dados históricos para sanitizar retroativamente nesta tarefa.

### 6.2 Transporte, paginação e relatórios

- **Política de origem:** permissão de coleta e de reutilização (campos, atribuição, imagens, retenção e frequência) registrada por fonte e host. Conferir `robots` no preflight do HTML; `5xx`/inalcançável → assumir desautorização temporária da automação conforme política conservadora e [RFC 9309 §2.3.1.4](https://www.rfc-editor.org/rfc/rfc9309.html#section-2.3.1.4). Sem usar permissão de uma origem para outra. Sem contornar desafio, espera ou bloqueio. Identificar o crawler com contato do projeto.
- **Limites iniciais propostos para medir, não permissões:** 1 conexão ativa por origem, intervalo mínimo de 6 s e teto de 150 requisições contando redirects/retries; até 20 páginas e 120 detalhes/revisitas; 15 s por GET, 16 min por run, deadline externo 20 min. Teto streaming descomprimido de 5 MiB/listagem (Outgo observado >3 MiB), 2 MiB/detalhe e 64 MiB/run. Limitar DOM/JSON e amostra de erros. Reduzir conforme acordo; se insuficiente, registrar `partial` e rever recorte/contrato, sem aumentar automaticamente. A 10 req/min, 140 GETs levam pelo menos ~14 min; reservar janela para timeout e finalização.
- **Erros transportados como códigos:** no máximo 1 retry para falha transitória elegível, com backoff e jitter; em 429 respeitar `Retry-After` (data ou segundos), encerrar o run e suspender novas chamadas à origem durante a espera. Se inválido/ausente, aplicar política conservadora acordada e alertar. Em 403, desafio, host/redirect não permitido ou HTML de bloqueio, parar. Validar origem HTTPS, porta, caminho e query explícitos, sem credenciais na URL; revalidar cada redirect e garantir que o destino conectado não seja rede interna/metadata (inclusive IPv6) por controles de egresso e resolução/conexão verificadas. Fetch de fonte não recebe segredo Supabase; a RPC não segue redirects nem ecoa corpo de erro em logs. Fixtures/loopback só em runner de teste injetado, não via URL arbitrária em produção.
- **Percurso com final comprovado:** guardar IDs/cursor ou assinatura do bloco principal para detectar repetição e páginas sem progresso; fim explícito e forma esperada, nunca “acabou o limite, então completou”. Counters distinguem candidatos únicos, fora do namespace, páginas, detalhes tentados, retornados, interpretados, revisitas, incluídos/excluídos/incompletos e gravados (`inseridos/atualizados/inalterados`). Registrar descoberta e detalhe completos separadamente, além de origem, recorte, janela, método, término e erros por código. Revisitar, dentro do orçamento, URLs canônicas conhecidas de eventos futuros do próprio recorte; escolher mais antigas primeiro e não acumular fila. Sem confirmar persistência, não avançar checkpoint; para o piloto, sem cursor persistente entre runs.
- **Sem exclusão por falta de resposta:** falha de rede/parser, 404, sold-out, desaparecimento ou zero suspeito não provam cancelamento. Só evidência positiva traz status de origem/revisão; não apagar evento, ocorrência institucional ou última observação válida. Usar `succeeded` quando o percurso declarado foi validado, inclusive vazio **explícito** e não anômalo; `partial` quando parte confiável foi gravada e há lacuna; `failed` para erro estrutural, zero inexplicado ou impossibilidade de escrever; `skipped` para bloqueio administrativo/conflito de execução. Saída proposta do CLI novo: 0/2/1/3 respectivamente; sem resumo `succeeded` quando parcial. Histórico zero anômalo deve discriminar por fonte/recorte.

### 6.3 Gravação, concorrência e compatibilidade

1. **Manter S0 e adicionar contrato de job**, com duas operações de servidor propostas (nomes a aprovar): concessão de execução e finalização. Reutilizar `public.sources`, `public.connectors`, `public.job_runs` e `private.recibos_idempotencia` ([baseline](../../supabase/migrations/20261117000100_raspagem_baseline.sql), [grants](../../supabase/migrations/20261117000200_curadoria_acesso.sql)). Sem fila/tabelas genéricas novas. Na concessão, validar fonte/conector/recorte, versão da configuração e autorização antes do GET; registrar `running` só se concedida. Usar lock transacional curto por **fonte** e lease com validade maior que o limite interno (proposta: 18 min). Duas fontes não se bloqueiam; dois recortes da mesma fonte serializam para proteger a chave `source_id + external_id`. Nenhum lock SQL durante a rede. ACK de início incerto não autoriza refazer a navegação.
2. **Finalização:** verificar recibo/identidade do run, lock na mesma ordem, lease, configuração intacta e ativação novamente. Uma execução antiga/expirada não sobrescreve outra, mesmo se retornar depois. Se a fonte foi desligada ou a concessão perdeu validade, parar sem upsert; relatar o motivo, e encerrar leases abandonados na próxima operação. Falha de infra antes da concessão real só aparece no log do job. Se válida, transação única para validar o lote (até 500 itens e 2 MiB serializados como proposta inicial), preservar IDs, fazer upsert só de colunas da fonte e fechar `job_runs` com estado/contagens verdadeiros. Permitir zero eventos para fechar run **sem escrita em `events`**, quando devidamente classificado; não para fingir cobertura.
3. **Idempotência e versionamento:** um UUID por execução; vincular recibo a fonte, recorte, execução e hash canônico do envelope terminal. Ordenar eventos por ID e congelar o envelope; após timeout reenviar **o mesmo**, sem recoletar para gerar outro lote sob a mesma chave. Replay do recibo terminal retorna o resultado, mesmo se a fonte foi desligada; chave com operação/escopo/lote diferente conflita. Recoleta idêntica renova `last_collected_at`; só mudança material de conteúdo da fonte (inclui cancelamento positivo) avança a versão por coleta. Telemetria, hora do run, metadados de rastreio e classificação móvel da janela não são mudança editorial. Testar o que acontece quando há decisão concorrente, sem resetar `curation_*`, `space_match_*`, `export_*`, `mapas_import_*`, vínculos ou CSVs antigos.
4. **Cutover e isolamento:** S0 continua em banco isolado. Antes do primeiro escritor vivo v2 no mesmo destino, provar que o caminho v1 não aceita novas escritas concorrentes para a fonte (por exemplo, marcador persistente de troca de escritor, independente da chave liga/desliga, checado depois do replay). Parar e drenar escritor legado no escopo; não reativá-lo automaticamente em rollback. RPCs PostgREST com `EXECUTE` explícito só ao servidor; se `SECURITY DEFINER` for necessário, `search_path = ''`, nomes qualificados e funções privadas não expostas. Não ampliar nenhum grant de agenda/painel. **Gate U3.1/U4.3:** exportar/preparar novo envio só com decisão correspondente à versão; até provado, executar com fixtures/staging isolado, sem escritas recorrentes que possam alterar o conteúdo aprovado do destino operacional.

## 7. Sequência executável e portões

| Ordem / dependência                                      | Fatia e verificável ao fim                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C0 — antes de alterar código**                         | Reconciliar U1.5 (escopo, identidade municipal, fuso, aprovação de contrato), acordo dos donos e gates operacionais. Registrar arquivos interessados e interfaces de teste. Rebaseline local e levantar a configuração instalada. Permissão pendente não impede especificar fixture; impede validar/ativar tráfego.                                                                                                                             |
| **C1.1 Sympla — C0, U2.1–2**                             | Caracterizar detalhe e descoberta HTTP com fixtures sanitizadas: página 1, 2, final e repetida; seção principal × carrossel × Bileto. Trace vertical `fixture → registros/relatório` sem banco. Provar ID/canonical, zero explícito e mudança de layout, decidir se a cobertura do HTTP é plausível.                                                                                                                                            |
| **C1.2 Sympla — C1.1, U2.2/2.5**                         | CLI de rede em modo fixture por padrão; transporte HTTP limitado reutiliza parsers. Exercitar entrada → descoberta → detalhe → relatório em loopback, incluindo 429, timeout, lote parcial e conhecidos. Não instalar Chromium nesta fatia.                                                                                                                                                                                                     |
| **C1.3 Sympla — C1.2, U2.3–2.5**                         | Migração e cliente v2, idempotência/lease/concorrência em stack isolada. Provar CLI → PostgREST → `events`/`job_runs` → invisível a `anon`, e S0 intacto. C1.3 é a única dona das gravações do worker e SQL de job até seu gate.                                                                                                                                                                                                                |
| **C1.4 Sympla — C1.3, U2.6**                             | Quando autorizado, 2 listagens + 3–5 detalhes como amostra sem gravação; depois campanha manual do §8/§13 com limites aprovados. Confirmar permissão vigente e cobertura antes de agendar; aplicar o gate de versão antes de gravar no destino operacional. Preparar somente **um** agendador de referência; Actions manual/inativo primeiro, cron só com ação humana. Se Kubernetes for escolhido, substituir, jamais somar Actions + CronJob. |
| **C2 Outgo — após o gate técnico Sympla, U2.7**          | Fechar referência CE/município, ID e paginação. Criar fixture/conector SSR, extrair só o comportamento já comum às duas fontes. Provar uma fonte e uma segunda cidade independentes em fixtures, com a segunda cidade viva escolhida e homologada separadamente. Repetir U2.2–2.6 sem duplicar o motor ou afrouxar guards.                                                                                                                      |
| **C3 Ingresse — após o gate técnico Outgo**              | Contrato de feed autorizado ou de página pública com cobertura. Implementar um caminho demonstrado. Se browser indispensável, medir num spike isolado e só então fixar runtime/imagem e CI offline. Sem contrato, registrar bloqueio; não mudar o ranking nem implementar por palpite.                                                                                                                                                          |
| **C4 Bilheteria Digital — após o gate técnico Ingresse** | Confirmar busca/filtro e identidade estável em detalhe. Adaptador HTTP ou feed aprovado, mesmas provas, e só depois habilitação pelo operador.                                                                                                                                                                                                                                                                                                  |

**Dois tipos de aceite:** concluir testes e contrato técnico da fonte anterior antecede abrir implementação da próxima; ativar também segue a mesma ordem, mas exige permissão e revisão operacional próprias. Sem prova técnica, parar e trazer a decisão ao usuário. Estimativa relativa (dias úteis de engenharia, sem espera externa nem U1.5/U3/U4): Sympla **5–8**, Outgo **2–4**, Ingresse **2–4** com feed ou **4–7** se navegador homologado, Bilheteria Digital **2–4** se houver ID/rota estáveis. Tempo de parceria e cobertura não demonstrada não são estimáveis com essas amostras.

## 8. Estratégia de teste e baseline

TDD em fatias verticais: checar o resultado pela interface do parser/adaptador, CLI com transporte local, RPC/PostgREST em banco isolado e leitura de `anon`. Fixture tem entrada mínima sanitizada e resultado esperado independente. Não repetir a classificação no teste para produzir a própria expectativa.

| Superfície         | Cenário → expectativa                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Descoberta         | Mesmo carrossel em duas páginas + lista mudou → contar avanços da lista; cursor/página repetida ou truncada → `partial`; sem markup reconhecível → `failed`; fim e vazio explícitos só quando o contrato permitir.                                                                                                                                                                                 |
| Detalhe            | URL de outro host/porta ou ID conflitante → nenhuma linha; slug novo do mesmo ID → mesma linha. ID repetido com dados conflitantes → issue, sem “primeiro ganha” silencioso. Evento sem hora/UF/modo, fuso incompatível, intervalo invertido e duas sessões → razões próprias; tempo na borda de 30d e fuso diferente em segunda cidade → seleção comprovada.                                      |
| HTTP/limites       | Retry-After em data e delta, 403/desafio, redirect externo/privado, timeout, `Content-Length` falso e corpo grande → budget respeitado, relatório útil sem ecoar dados. Simular DNS/egresso e status na fronteira; sem tráfego vivo no CI. Falha de um detalhe entre válidos → parcial, só válidos persistidos.                                                                                    |
| SQL/RPC            | `anon`, `authenticated` sem vínculo, curador inativo e ativo → sem execução da RPC do crawler ou acesso aos recibos privados; o worker grava pela RPC de servidor. Config desativada durante o run → não grava. Mesmo UUID/envelope → recibo idêntico; UUID diferente/recoleta idêntica → sem versão nova; mesmo UUID/evidência diferente → conflito; item inválido estrutural → rollback inteiro. |
| Duas sessões reais | A inicia, lease vence, B conclui, A retorna → A não grava; B preserva versão, IDs e contagens. Execuções de fontes distintas e IDs iguais coexistem; disputa v1/v2 e curadoria×crawl não regravam aprovação. Fuso/cidade ausentes em outra fonte não herdam o piloto.                                                                                                                              |
| Institucional      | Lote normalizado, aprovado e até exportado ainda invisível em `public.eventos`/`eventos_datas`/`espacos`; percurso institucional S0 e guard Ceará continuam verdes. Recoleta e cancelamento não apagam vínculo/CSV ou linha de outro recorte.                                                                                                                                                      |

**Executado nesta pesquisa (sem DB):** `pnpm --filter @farol/sympla test` — 46/46; `pnpm --filter @farol/sympla typecheck` — exit 0; `pnpm --filter @farol/coleta test` — 61/61; `parseEventPage` sobre o detalhe público já capturado — ID/canonical coerentes. **Gates futuros, não executados:** os três comandos acima mais `pnpm run check:tooling`, `pnpm e2e:esqueleto` e `pnpm supabase test db` somente na pilha descartável correspondente, como no [smoke CI](../../.github/workflows/supabase-smoke.yml). Adicionar teste de duas conexões reais e relatório de carga no mesmo ambiente. Nenhum reset no banco de demonstração.

## 9. Riscos e operação

| Risco                                                                   | Resposta / decisão verificável                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Paginação entrega recomendação, inventário muda ou site reduz cobertura | Comparar amostra manual independente com lista e detalhes obtidos; manifestar blocos/hosts fora, repetição, cap e zero anômalo. Meta é o recorte acordado, não “todos os eventos da cidade”.                                                                                                                                                                                                                                                                                   |
| Alteração de layout e scraping bloqueado                                | Alertar de imediato `partial/failed`, manter último dado válido, desabilitar por fonte sem afetar as outras. Não alternar IP, navegador ou endpoint para superar restrições.                                                                                                                                                                                                                                                                                                   |
| Recoleta altera conteúdo aprovado ou papel com escrita inadequada       | Gate de versão obrigatório antes da produção. Contabilizar em pgTAP o papel efetivo e negar campos editoriais; reexecutar S0, prova de corrida e zero escrita pública.                                                                                                                                                                                                                                                                                                         |
| Corpo grande, HTML instável e custos de Chromium                        | Medir GETs/min, duração, bytes, pico RSS e custo antes de ativar. A revisão anterior do plano unificado citava Playwright `1.63.0`; a [revisão V15](../PLANO-FASE-0-REVISADO.md#3-divergências-entre-o-plano-e-a-documentação-atual) e a [skill](../../.claude/skills/farol-connector/SKILL.md) citam imagem `v1.65.0-noble`. Se necessário, resolver explicitamente o par versão/imagem/digest e provar recursos; não misturar pins nem colocar Chromium no importador Ceará. |
| Jobs concorrentes e credencial desviada                                 | Concessão no banco, ambiente protegido, URLs fixadas, timeout externo, limite por origem, nenhum dado sensível em log/artefato. Testar cancelamento manual, desativação entre leitura/escrita e replay.                                                                                                                                                                                                                                                                        |

**Runbook candidato (C1.4):** contagens e códigos sanitizados por `run_key`, fonte, recorte e revisão do parser; monitorar duração, bytes/status, proporção de falhas, último run completo e revisão pendente. Se a campanha introduzir alerta, testar entrega a responsável humano e pausa/reinício. Desligar flag operacional e o agendamento escolhido; finalizar/drain ou esperar expiração, preservar recibos e linhas. Não reconstruir snapshot antigo nem religar o legado para encobrir coleta parcial. [`coleta.yml`](../../.github/workflows/coleta.yml) e [`coleta-cronjob.yaml`](../../infra/k8s/dev/coleta-cronjob.yaml) são referências dos gates, **não** recipientes para os quatro scrapers.

## 10. Arquivos previstos (nomes novos propostos)

| Dono         | Escopo de escrita futuro                                                                                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1.1         | `workers/sympla/src/sympla.ts`, `src/tipos.ts`, `src/normalize.ts`, `src/classify.ts`, `src/lote.ts` sob o mesmo pacote; novo `src/sympla-descoberta.ts`; `workers/sympla/test/` e fixtures mínimas. Preservar o detalhe e contrato S0.                              |
| C1.2         | Novos `workers/sympla/src/http.ts`, `src/raspar.ts`, `src/execucao.ts`, testes loopback e `workers/sympla/package.json` (CLI adicional, sem mudança na raiz).                                                                                                        |
| C1.3         | Novo `workers/sympla/src/rpc-crawler.ts`, chamadas somente no runner novo; nova migração e pgTAP em `supabase/migrations/`/`supabase/tests/` com numeração descoberta na execução; teste de concorrência na pilha efêmera. Preservar a SQL histórica e o importador. |
| C1.4         | Proposta `.github/workflows/sympla.yml` desativada por padrão, `workers/sympla/README.md` e relatório com decisões de permissão/cobertura/schedule. Qualquer alteração de precedência sobre writer v1 é aditiva e testada nesse corte, não antecipada.               |
| C2 → C3 → C4 | Novos `workers/sympla/src/fontes/outgo.ts`, `ingresse.ts`, `bilheteriaDigital.ts`, cada qual com fixtures e testes próprios. Compartilhados de C1 só após gate de cada antecedente e quando a evidência exigir. Expansão de configuração fechada no servidor.        |

## 11. Contexto de implementação

```yaml
implementation_context:
  task_summary: "Detalhar U2 nesta ordem: Sympla, Outgo, Ingresse, Bilheteria Digital. Somente planejamento nesta sessão."
  acceptance_criteria:
    - "Por fonte: identidade e cobertura demonstradas no recorte, fixtures independentes, parcial/falha visíveis."
    - "Idempotência, lease e concorrência provados no banco isolado, sem tocar agenda pública."
    - "Go-live humano e separado; nenhuma escrita nova sobre revisão não protegida por versão."
  evidence_provenance:
    {
      "schema_version": 2,
      "head_commit": "0b5935595f1b19b51c63fc5867dc72d1c76c0ff4",
      "generated_plan_path": "docs/plans/2026-11-19-gitnexus-plan-crawler-quatro-fontes.md",
      "global_dirty_digest":
        {
          "algorithm": "sha256",
          "canonicalization": "gitnexus-evidence-provenance-v2 NUL-framed UTF-8 records",
          "value": "35f879295265e2c7f3371bfb637dacc00933384e80f7c2c94679ca87d78c771d",
        },
      "cited_path_manifest":
        [
          {
            "path": ".claude/skills/farol-connector/SKILL.md",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:9cfbf370efa9c7caa7bc3bd2d2d64b281aed6bd77c46e4a48bcee7ee00961abd",
            "index_digest": "sha256:9cfbf370efa9c7caa7bc3bd2d2d64b281aed6bd77c46e4a48bcee7ee00961abd",
            "worktree_digest": "sha256:9cfbf370efa9c7caa7bc3bd2d2d64b281aed6bd77c46e4a48bcee7ee00961abd",
            "untracked_digest": "absent",
          },
          {
            "path": ".github/workflows/coleta.yml",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:68ca38a5dfc383ac25c6e5dae49aaeba357147f4800067b1d6448ce13b71b098",
            "index_digest": "sha256:68ca38a5dfc383ac25c6e5dae49aaeba357147f4800067b1d6448ce13b71b098",
            "worktree_digest": "sha256:68ca38a5dfc383ac25c6e5dae49aaeba357147f4800067b1d6448ce13b71b098",
            "untracked_digest": "absent",
          },
          {
            "path": ".github/workflows/e2e.yml",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:1a6811858db83309360d002c1276ba7c3894d0b002f9d83f070f550ce706704c",
            "index_digest": "sha256:1a6811858db83309360d002c1276ba7c3894d0b002f9d83f070f550ce706704c",
            "worktree_digest": "sha256:1a6811858db83309360d002c1276ba7c3894d0b002f9d83f070f550ce706704c",
            "untracked_digest": "absent",
          },
          {
            "path": ".github/workflows/supabase-smoke.yml",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:9648d27c7ea486372b8eb54fe9f772e378c54db1ef6e67b4ba2e16a843e2caff",
            "index_digest": "sha256:9648d27c7ea486372b8eb54fe9f772e378c54db1ef6e67b4ba2e16a843e2caff",
            "worktree_digest": "sha256:9648d27c7ea486372b8eb54fe9f772e378c54db1ef6e67b4ba2e16a843e2caff",
            "untracked_digest": "absent",
          },
          {
            "path": "apps/painel/src/eventos/ExportarAprovadosButton.tsx",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "unstaged",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:0c6d0aabbc1a2222519edfefd7a18294f6cd627f396d928d4ed9d4cec0d2d9cf",
            "index_digest": "sha256:0c6d0aabbc1a2222519edfefd7a18294f6cd627f396d928d4ed9d4cec0d2d9cf",
            "worktree_digest": "sha256:45079dac0e998f2df35bec210357a99b178b2df42736a0230699af5446f2fa7b",
            "untracked_digest": "absent",
          },
          {
            "path": "docs/ONTOLOGIA-E-FLUXO.md",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "unstaged",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:ff9a07e14741e3aab31bb6979f64e9663f8ad53facc26e6a21ac19f2bff58fbd",
            "index_digest": "sha256:ff9a07e14741e3aab31bb6979f64e9663f8ad53facc26e6a21ac19f2bff58fbd",
            "worktree_digest": "sha256:b5e3cf55bba94032595e7eedd2f5b8206db9d90dd49926aea5cb561a11179329",
            "untracked_digest": "absent",
          },
          {
            "path": "docs/PLANO-FASE-0-REVISADO.md",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "unstaged",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:832372b4c0b530f1f6abf38fac1313c9d0ea42f31841918bd61c6b22e55358fb",
            "index_digest": "sha256:832372b4c0b530f1f6abf38fac1313c9d0ea42f31841918bd61c6b22e55358fb",
            "worktree_digest": "sha256:0bcd84aa561b9588ab6bb0479cef8fbd8beb062e353d65582e7668795689d0c6",
            "untracked_digest": "absent",
          },
          {
            "path": "docs/PLANO-UNIFICADO-2026-11-16.md",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "unstaged",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:fe77ef16d6177f790c86e1e0be24745f10e788f85eac3ea86843b70815ccd96e",
            "index_digest": "sha256:fe77ef16d6177f790c86e1e0be24745f10e788f85eac3ea86843b70815ccd96e",
            "worktree_digest": "sha256:3d5b867c690ae1e7da6dcb43e03c72884df23f7f5eb4b3660f7e98a755f171da",
            "untracked_digest": "absent",
          },
          {
            "path": "docs/ROADMAP.md",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "unstaged",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:803b524e669d25925d6bf36c66ac13958f545591c43662c9cfb2703a89dfeabd",
            "index_digest": "sha256:803b524e669d25925d6bf36c66ac13958f545591c43662c9cfb2703a89dfeabd",
            "worktree_digest": "sha256:c718c1a2318d4fd3504cb60a85a852b0c917f621bafecbd98deec2744a4a89cb",
            "untracked_digest": "absent",
          },
          {
            "path": "docs/adr/0009-ecossistema-institucional.md",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:9277475a16214a4de92a7ccd67232acacb87b4785869900bbdb0ada743608bba",
            "index_digest": "sha256:9277475a16214a4de92a7ccd67232acacb87b4785869900bbdb0ada743608bba",
            "worktree_digest": "sha256:9277475a16214a4de92a7ccd67232acacb87b4785869900bbdb0ada743608bba",
            "untracked_digest": "absent",
          },
          {
            "path": "infra/k8s/dev/coleta-cronjob.yaml",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:cde1342ce722ac38dc027f73d96fea8592f82e971d721ecc38d56c986e7ba541",
            "index_digest": "sha256:cde1342ce722ac38dc027f73d96fea8592f82e971d721ecc38d56c986e7ba541",
            "worktree_digest": "sha256:cde1342ce722ac38dc027f73d96fea8592f82e971d721ecc38d56c986e7ba541",
            "untracked_digest": "absent",
          },
          {
            "path": "package.json",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "unstaged",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:1707a72888e0c02fcc644d564fd736322ef64230596446828feb541cb15ecd49",
            "index_digest": "sha256:1707a72888e0c02fcc644d564fd736322ef64230596446828feb541cb15ecd49",
            "worktree_digest": "sha256:76b6b50fb3a8fb06bac010452a3ed1470ec062d96129fa019b7076eb2f345fc2",
            "untracked_digest": "absent",
          },
          {
            "path": "scripts/e2e/README.md",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:d8b46cf33b517629e4d81e6a8e90d3646e484df2055ea0d9b18fb312754a191a",
            "index_digest": "sha256:d8b46cf33b517629e4d81e6a8e90d3646e484df2055ea0d9b18fb312754a191a",
            "worktree_digest": "sha256:d8b46cf33b517629e4d81e6a8e90d3646e484df2055ea0d9b18fb312754a191a",
            "untracked_digest": "absent",
          },
          {
            "path": "scripts/e2e/esqueleto.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:d56c6da63b6e8e3dbdcf8da5c40b4b0ab4a32d4accddde75c063646d94d82ca9",
            "index_digest": "sha256:d56c6da63b6e8e3dbdcf8da5c40b4b0ab4a32d4accddde75c063646d94d82ca9",
            "worktree_digest": "sha256:d56c6da63b6e8e3dbdcf8da5c40b4b0ab4a32d4accddde75c063646d94d82ca9",
            "untracked_digest": "absent",
          },
          {
            "path": "supabase/config.toml",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:70c3c80d7d87ad2c488949f3aa37402561dfa9533cceae5216af59d6a5f237ef",
            "index_digest": "sha256:70c3c80d7d87ad2c488949f3aa37402561dfa9533cceae5216af59d6a5f237ef",
            "worktree_digest": "sha256:70c3c80d7d87ad2c488949f3aa37402561dfa9533cceae5216af59d6a5f237ef",
            "untracked_digest": "absent",
          },
          {
            "path": "supabase/migrations/20261117000100_raspagem_baseline.sql",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:c8b7fec0b6481fc9cf9d4445234771b6a1d7a1c9adaa219e214ae5d2b6166a9d",
            "index_digest": "sha256:c8b7fec0b6481fc9cf9d4445234771b6a1d7a1c9adaa219e214ae5d2b6166a9d",
            "worktree_digest": "sha256:c8b7fec0b6481fc9cf9d4445234771b6a1d7a1c9adaa219e214ae5d2b6166a9d",
            "untracked_digest": "absent",
          },
          {
            "path": "supabase/migrations/20261117000200_curadoria_acesso.sql",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:47a7eb64390c9309ff7f2e64cefeb4982c0d2d27776a6c3d89d6fed1c678e412",
            "index_digest": "sha256:47a7eb64390c9309ff7f2e64cefeb4982c0d2d27776a6c3d89d6fed1c678e412",
            "worktree_digest": "sha256:47a7eb64390c9309ff7f2e64cefeb4982c0d2d27776a6c3d89d6fed1c678e412",
            "untracked_digest": "absent",
          },
          {
            "path": "supabase/migrations/20261117000500_vinculo_institucional.sql",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:44bb3dc62f6537e95bd3db5398a8f36c818c74e5eeb0e1613f828807dfaaa94f",
            "index_digest": "sha256:44bb3dc62f6537e95bd3db5398a8f36c818c74e5eeb0e1613f828807dfaaa94f",
            "worktree_digest": "sha256:44bb3dc62f6537e95bd3db5398a8f36c818c74e5eeb0e1613f828807dfaaa94f",
            "untracked_digest": "absent",
          },
          {
            "path": "supabase/migrations/20261117000600_coleta_minima.sql",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:21e8d46cf8d9868ed3cefb445fa28e1a07a3fcfa1cd3c020c4306fa4c1455924",
            "index_digest": "sha256:21e8d46cf8d9868ed3cefb445fa28e1a07a3fcfa1cd3c020c4306fa4c1455924",
            "worktree_digest": "sha256:21e8d46cf8d9868ed3cefb445fa28e1a07a3fcfa1cd3c020c4306fa4c1455924",
            "untracked_digest": "absent",
          },
          {
            "path": "supabase/migrations/20261117000700_curadoria_minima.sql",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:cbe3d6b5ea8df590b936dcd833819fffe92a2d7eaad2ac74451aa7110e9ee9a3",
            "index_digest": "sha256:cbe3d6b5ea8df590b936dcd833819fffe92a2d7eaad2ac74451aa7110e9ee9a3",
            "worktree_digest": "sha256:cbe3d6b5ea8df590b936dcd833819fffe92a2d7eaad2ac74451aa7110e9ee9a3",
            "untracked_digest": "absent",
          },
          {
            "path": "supabase/tests/006_coleta_minima.test.sql",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:eb68b0c410f11ec521e681d5e25b6f86d349493131b60ea3b4b060a6484bf370",
            "index_digest": "sha256:eb68b0c410f11ec521e681d5e25b6f86d349493131b60ea3b4b060a6484bf370",
            "worktree_digest": "sha256:eb68b0c410f11ec521e681d5e25b6f86d349493131b60ea3b4b060a6484bf370",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/coleta/README.md",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:29caa3a8b3d2befce2083302577f86b5b487da234476d6c92bc4cc85d4e537f1",
            "index_digest": "sha256:29caa3a8b3d2befce2083302577f86b5b487da234476d6c92bc4cc85d4e537f1",
            "worktree_digest": "sha256:29caa3a8b3d2befce2083302577f86b5b487da234476d6c92bc4cc85d4e537f1",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/coleta/package.json",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:3020dc07c30885500ef06d33a0ea9000ddaae4b94450533f4d1de33f727eda0d",
            "index_digest": "sha256:3020dc07c30885500ef06d33a0ea9000ddaae4b94450533f4d1de33f727eda0d",
            "worktree_digest": "sha256:3020dc07c30885500ef06d33a0ea9000ddaae4b94450533f4d1de33f727eda0d",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/README.md",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "unstaged",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:d5d28a00ba2ef7369767956a8eb63d946750f6ae2e4ef8acaaf9638ace81304f",
            "index_digest": "sha256:d5d28a00ba2ef7369767956a8eb63d946750f6ae2e4ef8acaaf9638ace81304f",
            "worktree_digest": "sha256:4d029fcc5880fb1a9abb1694ff9c1ee43ca3990920c94f2bcce23f384419ffcd",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/package.json",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:4f4334b4b8d51f37e74e4a99e9271466b7176d9224148c9df1461f271ecbdcdc",
            "index_digest": "sha256:4f4334b4b8d51f37e74e4a99e9271466b7176d9224148c9df1461f271ecbdcdc",
            "worktree_digest": "sha256:4f4334b4b8d51f37e74e4a99e9271466b7176d9224148c9df1461f271ecbdcdc",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/src/classify.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:1e6bbb9da764986dfe3ef1257ff6d44cc598bc8a9d37f4cb02bb3de431d7ce06",
            "index_digest": "sha256:1e6bbb9da764986dfe3ef1257ff6d44cc598bc8a9d37f4cb02bb3de431d7ce06",
            "worktree_digest": "sha256:1e6bbb9da764986dfe3ef1257ff6d44cc598bc8a9d37f4cb02bb3de431d7ce06",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/src/coleta.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:f16b322945f1d3cde892bc06411fd07bc00ef9fe03a40624cd25a02987712689",
            "index_digest": "sha256:f16b322945f1d3cde892bc06411fd07bc00ef9fe03a40624cd25a02987712689",
            "worktree_digest": "sha256:f16b322945f1d3cde892bc06411fd07bc00ef9fe03a40624cd25a02987712689",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/src/coletar.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:c7813fe7b63ccd62e9bedb64830d887b4ff41b23c30c1b1dc1a8957c10895efc",
            "index_digest": "sha256:c7813fe7b63ccd62e9bedb64830d887b4ff41b23c30c1b1dc1a8957c10895efc",
            "worktree_digest": "sha256:c7813fe7b63ccd62e9bedb64830d887b4ff41b23c30c1b1dc1a8957c10895efc",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/src/filters.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:0db804b97da5588ec3f73709333887db01d44cd97ad194814985a5023584ec33",
            "index_digest": "sha256:0db804b97da5588ec3f73709333887db01d44cd97ad194814985a5023584ec33",
            "worktree_digest": "sha256:0db804b97da5588ec3f73709333887db01d44cd97ad194814985a5023584ec33",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/src/lote.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:e8c8cddf02b8285a0628a9c5b9e8226170299ad2c0d9bb8566e8bc3bc5568183",
            "index_digest": "sha256:e8c8cddf02b8285a0628a9c5b9e8226170299ad2c0d9bb8566e8bc3bc5568183",
            "worktree_digest": "sha256:e8c8cddf02b8285a0628a9c5b9e8226170299ad2c0d9bb8566e8bc3bc5568183",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/src/normalize.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:1cfee852a4f43e1a98dc2ea257b53e9cd00f129caa3d2f3c3fcc642c6026b400",
            "index_digest": "sha256:1cfee852a4f43e1a98dc2ea257b53e9cd00f129caa3d2f3c3fcc642c6026b400",
            "worktree_digest": "sha256:1cfee852a4f43e1a98dc2ea257b53e9cd00f129caa3d2f3c3fcc642c6026b400",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/src/rpc.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:fd0c69624daebd66ec96cebcdd6cbd2b1d85b32a2d6a3a8b71722caed992abe0",
            "index_digest": "sha256:fd0c69624daebd66ec96cebcdd6cbd2b1d85b32a2d6a3a8b71722caed992abe0",
            "worktree_digest": "sha256:fd0c69624daebd66ec96cebcdd6cbd2b1d85b32a2d6a3a8b71722caed992abe0",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/src/sympla.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:6524667291a91c1dc5746e24e048b20d0125d75238849273cb21274ad8332793",
            "index_digest": "sha256:6524667291a91c1dc5746e24e048b20d0125d75238849273cb21274ad8332793",
            "worktree_digest": "sha256:6524667291a91c1dc5746e24e048b20d0125d75238849273cb21274ad8332793",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/src/tipos.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:bcd67c862313728940d51f3b8430283503798ec5c22a2b1553fcaf0af7dbcd99",
            "index_digest": "sha256:bcd67c862313728940d51f3b8430283503798ec5c22a2b1553fcaf0af7dbcd99",
            "worktree_digest": "sha256:bcd67c862313728940d51f3b8430283503798ec5c22a2b1553fcaf0af7dbcd99",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/test/fixtures/sympla-event.html",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:8eea2b0a1bafecd0bd46b9b46647373ae35e6097190d9986eedf8cb517f9988f",
            "index_digest": "sha256:8eea2b0a1bafecd0bd46b9b46647373ae35e6097190d9986eedf8cb517f9988f",
            "worktree_digest": "sha256:8eea2b0a1bafecd0bd46b9b46647373ae35e6097190d9986eedf8cb517f9988f",
            "untracked_digest": "absent",
          },
          {
            "path": "workers/sympla/test/sympla.test.ts",
            "object_kind":
              {
                "head": "regular",
                "index": "regular",
                "worktree": "regular",
                "untracked": "absent",
              },
            "state": "clean",
            "rename_from": null,
            "rename_to": null,
            "head_digest": "sha256:0971e13dcc87439cbb9897a6abb03bdea3a361ef8a44513678993a045377f1ed",
            "index_digest": "sha256:0971e13dcc87439cbb9897a6abb03bdea3a361ef8a44513678993a045377f1ed",
            "worktree_digest": "sha256:0971e13dcc87439cbb9897a6abb03bdea3a361ef8a44513678993a045377f1ed",
            "untracked_digest": "absent",
          },
        ],
    }
  primary_symbols:
    - {
        symbol: parseEventPage,
        file: workers/sympla/src/sympla.ts,
        lines: "79–134",
        role: "Parser puro de detalhe",
      }
    - {
        symbol: prepararColeta,
        file: workers/sympla/src/coleta.ts,
        lines: "18–59",
        role: "Entrada local S0/consumida no E2E",
      }
    - {
        symbol: montarLote,
        file: workers/sympla/src/lote.ts,
        lines: "103–125",
        role: "Normalização e deduplicação S0",
      }
    - {
        symbol: registrarColetaMinima,
        file: workers/sympla/src/rpc.ts,
        lines: "72–98",
        role: "Cliente PostgREST S0",
      }
    - {
        symbol: registrar_coleta_minima,
        file: supabase/migrations/20261117000600_coleta_minima.sql,
        lines: "21–325",
        role: "Gravação e recibo S0",
      }
  related_symbols:
    - {
        symbol: canonicalDaPagina,
        relationship: "prepararColeta chama",
        relevance: "URL canônica não implica identidade confirmada até checar ID",
      }
    - {
        symbol: classifyCollectedEvent,
        relationship: "normalizarEvento chama",
        relevance: "recorte e fuso fixos exigem revisão",
      }
    - {
        symbol: curar_evento,
        relationship: "outro escritor da mesma linha",
        relevance: "preservar decisão e tratar versão concorrente",
      }
    - {
        symbol: ExportarAprovadosButton,
        relationship: "consumidor de events",
        relevance: "gate do conteúdo revisado fora do crawler",
      }
    - {
        symbol: importar_agenda,
        relationship: "separado",
        relevance: "não usar para fontes externas",
      }
  execution_path:
    [
      "S0 permanece por HTML de arquivo",
      "Job novo valida configuração e recebe concessão",
      "Descobre, coleta, normaliza e compõe envelope",
      "Só RPC de finalização grava preparação e recibo",
    ]
  pdg_constraints: [] # análise derivada de fonte; sem PDG disponível
  architectural_patterns:
    - {
        pattern: "Parser puro e CLI de execução",
        example_location: "workers/sympla/src/sympla.ts e workers/sympla/src/coletar.ts",
        usage_guidance: "Não acoplar parsers ao banco; adaptar primeiro Sympla.",
      }
    - {
        pattern: "Stack efêmera fim a fim",
        example_location: scripts/e2e/README.md,
        usage_guidance: "Não resetar banco de demonstração.",
      }
  files_to_modify:
    - {
        file: workers/sympla/src/sympla.ts,
        symbols: [parseEventPage, canonicalEventUrl],
        intended_change: "C1.1 validar identidade/dado e minimizar evidência.",
      }
    - {
        file: workers/sympla/src/sympla-descoberta.ts,
        symbols: [],
        intended_change: "Novo C1.1, descoberta delimitada por bloco/cursor.",
      }
    - {
        file: workers/sympla/src/raspar.ts,
        symbols: [],
        intended_change: "Novo C1.2/C1.3, CLI de rede separado do S0.",
      }
    - {
        file: "supabase/migrations/<novo-timestamp>_crawler.sql",
        symbols: [],
        intended_change: "C1.3 aditiva, contrato/replay/lease; descobrir numeração na execução.",
      }
    - {
        file: "workers/sympla/src/fontes/",
        symbols: [],
        intended_change: "C2→C4, adaptador por fonte, sem framework novo.",
      }
  tests:
    - {
        file: workers/sympla/test/sympla.test.ts,
        scenarios:
          [
            "ID do canonical contradiz detalhe → erro",
            "layout mudou ou timestamp inválido → não inventa",
          ],
      }
    - {
        file: workers/sympla/test/sympla-descoberta.test.ts,
        scenarios:
          [
            "SSR Bileto + dados Sympla → contagens separadas",
            "página repetida → sem cobertura completa",
          ],
      }
    - {
        file: "supabase/tests/<nova-numeração>_crawler.test.sql",
        scenarios:
          [
            "escopo desativado entre concessão e recibo → sem upsert",
            "mesma chave/hash → sem segunda escrita",
            "recoleta não muda curadoria, vínculo e agenda",
          ],
      }
    - {
        file: scripts/e2e/esqueleto.ts,
        scenarios:
          [
            "manter S0 verde; nova prova da CLI de rede usa apenas loopback e stack isolada, sem trocar porta do banco de demonstração",
          ],
      }
  verification_commands:
    - "pnpm --filter @farol/sympla test"
    - "pnpm --filter @farol/sympla typecheck"
    - "pnpm --filter @farol/coleta test"
    - "pnpm run check:tooling"
    - "pnpm e2e:esqueleto"
    - "pnpm supabase test db # contra stack descartável, conforme CI"
  risks:
    [
      "Sympla HTTP ainda não demonstra fim/cobertura e robots retornou 503",
      "Outgo CE e ID estável não provados",
      "Ingresse depende de contrato",
      "Bilheteria Digital sem detalhe verificado",
      "exportação S0 não distingue versões aprovadas",
    ]
  assumptions:
    [
      "Verificar Fortaleza/30d junto a U1.5 e ao responsável pela fonte.",
      "Medir limites e confirmar capacidade com amostra autorizada.",
      "Conferir grants e caller de curadoria/exportação atuais; working tree tem WIP.",
    ]
  open_questions:
    [
      "Acordos de origem e reúso, cobertura demonstrável por método, segunda cidade, agenda operacional e aprovação versionada. Ver §12.",
    ]
  avoid:
    [
      "Não repetir pesquisa de repo sem drift.",
      "Não ampliar registrar_coleta_minima por simples remoção do guard.",
      "Não usar importador Ceará, API interna, checkout, captura de PII ou contorno de bloqueio.",
      "Não ativar cron, deploy, banco hospedado ou fazer commit nesta fase.",
    ]
```

## 12. Decisões pendentes e fora do escopo

1. **Fonte e jurídico/operação:** para cada plataforma, quem é o contato/responsável, que catálogo é permitido, em quais hosts/rotas, com quais limites/licenças e autorização de armazenamento e reúso? Solicitar por escrito e verificar termos vigentes. Sympla tem também `robots` pendente. Outgo: confirmar rota e inventário municipal, estabilidade do ID e fuso. Ingresse: obter contrato de feed ou prova de catálogo público autorizado. Bilheteria Digital: provar paginação, ID e data no detalhe. Não tratar ausência de documentação na amostra como inexistência de API.
2. **Recorte e conteúdo:** Fortaleza é proposta a validar, não cidade default. Qual o segundo recorte de U2.7 e o mínimo de cobertura/qualidade aceito? Fixar regra de recortes sobrepostos e classificação por versão antes de alargar; resolver política de ocorrências múltiplas com U1.5/U3. Não implementar taxonomia, matching/merge entre fontes ou restauração institucional automática neste lote.
3. **Autoridade e corte:** quem aprova exportação/versionamento e confirma capacidade de staging, retenção, canal de alerta e um único scheduler? Verificar o baseline do painel em WIP e as migrations vigentes antes de começar a gravar. Nenhuma ativação está aprovada por este texto.
4. **Runtime:** navegador só diante de prova, com revisão dos pins conflitantes e aceite da evolução em M2. Sem GitNexus/PDG, o mapa de impacto é por leitura; reavaliar no ponto de alterar contratos compartilhados se houver índice confiável. Antes de escrever SQL, conferir documentação vigente do Supabase, helpers e versão instalada conforme as skills do projeto.

Adiados: esteira de dados nacional, Bileto, Bilheteria Virtual, novo painel, automação do Mapas, checkout, notificações, CSV legado, fila, substituição do importador Ceará e aposentadoria do legado. Nenhum desses é fallback automático.

## 13. Definição de pronto

- **Técnico, por fonte na ordem pedida:** contrato revisado, parser e relatório verificáveis, fixture sanitizada de listagem/detalhe/falhas, identidade estável demonstrada, duas execuções não duplicam e alteração material afeta só a versão correta. pgTAP + duas sessões reais + e2e local preservam RLS e invisibilidade pública. O predecessor passa seu gate ou a sequência fica bloqueada para decisão humana.
- **Cobertura autorizada antes de declarar homologado:** conferir manualmente **20 URLs alcançáveis (ou todas, se menos)** entre início, meio e fim do percurso acordado; cobrar correspondência de ID, URL, título, início e cidade. Documentar separadamente as fora do namespace e qualquer inacessível/divergente. Uma amostra pequena em `page=2`, HTML 200 ou execução parcial não são aceite. Fazer duas execuções controladas, medir duração/carga e registrar um relatório com método, revisão de contrato e limites reais.
- **Operação:** permissão vigente, um escritor, agenda ainda vazia para dados só coletados, trava de revisão por versão no envio, alerta de falha recebido e rollback de ativação ensaiado sem perder registros nem religar legado. Fora do escopo autorizado, o schedule permanece desligado.
