# Painel funcional — revisão do plano e paridade com o painel antigo

**Histórico — 19/11/2026.** Este relatório registra a validação local dos
dois ciclos do painel; não autoriza publicação nem substitui o plano vigente.

**Escopo:** o que falta para o painel novo (`apps/painel`)
substituir na operação o painel do Raspagem-Farol (AdminJS em
`raspagem.mutirao.org.br`), integrado com coleta, curadoria, incorporação,
agenda e app. Referências: [plano unificado](../PLANO-UNIFICADO-2026-11-16.md)
(U3–U6, U8), [roadmap](../ROADMAP.md) (M1–M5),
[relatório da Fase 0](fase0-frentes.md).

## 1. Estado observado em 19/11/2026

- **Painel antigo:** no ar. O cluster k3s roda o namespace `farol` com o
  deployment `farol` (imagem `raspagem-farol:941a758-dirty`), o Postgres CNPG
  `farol-postgres` e três CronJobs diários (`collect-web`, `match-events`,
  `synchronize-spaces`). O ingress `raspagem.mutirao.org.br/auth/login`
  responde 200.
- **Painel novo:** sobe localmente e mostra o login. No Supabase local, porém,
  não havia curador, eventos coletados, fontes, execuções nem exportações. O
  container de e-mail local também estava parado, então nenhum curador
  conseguia entrar sem montar o vínculo e gerar o código à mão.
- **Fase 0:** a corrente coleta → painel → incorporação → instância →
  sincronização → app passa no e2e isolado. Ela prova o protocolo, mas não dá
  uma operação diária usável.

## 2. Paridade: painel antigo × painel novo

| Função do painel antigo                                 | Painel novo antes do ciclo 1        | Tarefa do plano    | Gate humano                                  |
| ------------------------------------------------------- | ----------------------------------- | ------------------ | -------------------------------------------- |
| Login sem senha por link                                | código por e-mail (OTP), sem signup | U5.2               | SMTP do projeto hospedado                    |
| Eventos: lista, detalhe, aprovar/rejeitar               | sim, um por vez                     | S0.4               | —                                            |
| Aprovar/rejeitar selecionados                           | não                                 | U3.1               | —                                            |
| Paginação e contexto preservados na curadoria           | padrão do React-admin, sem filtros  | U5.3               | —                                            |
| Fontes, espaços, execuções de jobs (leitura)            | não                                 | U5.1/U5.3          | —                                            |
| Exportações: gerar CSV de 29 colunas, listar, baixar    | só exportação mínima CSV/JSON       | U4.1–U4.3          | exceção Edge Function (U4.2)                 |
| CSV de conferência Sympla (`/review.csv`)               | não                                 | U4.1 (conferência) | —                                            |
| Matching de espaços e sincronização com o Mapas (cron)  | não                                 | U4.4               | decidir se ainda são usados                  |
| Coleta Sympla com navegador (cron diário)               | só fixture, sem navegador           | U2.1–U2.6          | ativar coleta viva                           |
| Dados reais (eventos, decisões, exportações históricas) | banco vazio                         | U6.1–U6.3          | acesso ao Postgres do legado, destino, corte |
| Hospedagem com domínio e TLS                            | imagem e manifests, sem deploy      | S0.8, U8.4         | domínio, TLS, Supabase de produção (D3)      |
| Alerta de falha da coleta (SMTP)                        | não                                 | U2.6, U4           | canal e destinatário                         |

## 3. Ordem de ataque

**Ciclo 1 (local, sem gate humano):**

1. `pnpm painel:local`: provisiona um curador de desenvolvimento, carrega a
   fixture Sympla e eventos de exemplo e imprime o código de login.
   Idempotente e recusa qualquer banco que não seja local.
2. Recursos de leitura: fontes, espaços, execuções e exportações (só as
   colunas com GRANT). Filtros e paginação na URL da lista de eventos.
   Mensagens pt-BR fora do JSX.
3. Curadoria em lote (U3.1): RPC `curar_eventos` com versão, lote de 1 a 100,
   conflitos, IDs ausentes e autor derivado do curador, coberta por pgTAP, e
   botões "Aprovar/Rejeitar selecionados". A seleção vale para a página atual
   e é descartada quando muda a página, a ordenação ou o filtro.

**Verificação local do ciclo 1:** login de curador e aprovação de dois eventos
sintéticos observados no navegador, sem publicar na agenda. A primeira revisão
identificou três ajustes na lista: desempate por ID em qualquer ordenação,
seleção restrita à página e inclusão integral do dia final no filtro. Os
ajustes têm testes de regressão. A segunda revisão mostrou que reabrir o filtro
pela URL exibia um dia a menos: o campo formatava a data duas vezes. A correção
preserva o dia exibido sem alterar o limite enviado ao PostgREST. O teste de
integração cobre uma data comum e a virada do ano. O e2e isolado passou nos 7
passos, incluindo o caso sem incorporação, e a agenda de demonstração permaneceu
com 176 eventos.
Na prévia somente leitura dos componentes reais, a lista de eventos e as
quatro listas auxiliares foram abertas em 1440 × 900 e 390 × 844. Em 390 px,
os controles de filtro e exportação ficaram dentro da tela e a rolagem
horizontal ficou restrita à tabela. O diálogo de aprovação abriu no celular
emulado e o cancelamento foi observado no desktop, sem enviar decisão.
A revisão independente confirmou a correção do filtro de data e reexecutou
os 16 testes de lista e curadoria em lote. Na prévia, o filtro também reabriu
com a data correta e atualizou a URL após uma edição em desktop e celular.
A prévia usa dados locais de teste. O login local foi confirmado pelo operador
com registro recente no Supabase, mas o navegador de automação não compartilha
essa sessão. Ainda falta verificar a curadoria em lote na versão final com
uma sessão autenticada.
**Rechecagem local (19/11/2026):** na árvore de trabalho sobre `1f18f77`, que
já inclui mudanças em andamento na consulta de instâncias, passaram o build
com configuração de teste, a checagem de tipos, os 37 testes do painel e os
20 do provisionamento local. Em pilhas descartáveis, passaram os 251 testes
pgTAP (38 de curadoria em lote) e os 7 passos do `pnpm e2e:esqueleto`.
O E2E cobre curadoria individual via API; a aprovação em lote no navegador
com curador autenticado continua pendente. A consulta de instâncias passou
a ser verificada separadamente no ciclo 2.

**Ciclo 2 (local): instâncias oficiais.** Em **Operação → Instâncias oficiais**,
o Mapa Cultural do Ceará já está configurado no servidor. Buscar gera uma
prévia sem escrita; sincronizar é opcional, pede confirmação e atualiza a
agenda pública do Farol sem enviar nada ao Mapas. O formulário por evento
saiu do detalhe, mas os vínculos existentes e as RPCs foram preservados.

Na verificação da função em Deno com PostgREST e banco descartável, a API do
Ceará devolveu 289 eventos e 355 ocorrências na janela de 19/11/2026 a
20/01/2027. O banco de teste permaneceu com zero eventos dessa fonte após a
busca; a sincronização criou os 289 eventos. Sem sessão (401), sem curador
(403) ou com curador desativado (403), a função negou acesso. No banco de
demonstração a agenda manteve 176 eventos e 251 ocorrências. Não houve
publicação hospedada nem ativação de agendamento.

A revisão apontou três problemas: sobrescrita após importações concorrentes,
ocorrências fora do período na prévia e perda de foco durante a busca. O banco
agora compara a versão lida antes da busca na mesma transação da gravação.
Com dois lotes simultâneos da mesma versão, o PostgREST aceitou um (200),
recusou o outro (409) e somente o vencedor persistiu. A prévia exclui e
contabiliza ocorrências fora da janela, e o botão mantém o foco durante a busca.
Passaram 259 asserções pgTAP na pilha descartável com a migração nova.

No Chromium, a prévia com componentes reais e dados sintéticos foi
inspecionada em 1440 × 900, 768 × 900 e 375 × 812. Em cada tamanho, o texto
e os botões couberam sem rolagem horizontal; no celular emulado, as ações
ficaram empilhadas e o primeiro evento apareceu na primeira tela. O diálogo
abriu com foco em **Cancelar** e devolveu o foco para **Sincronizar agenda**
ao cancelar no celular ou pressionar Escape no desktop. Essa prévia não
usou login nem gravou dados; o teste da função e do banco foi separado.

**Checagens locais dos dois ciclos:** passaram o Biome, a instalação com
lockfile congelado, a checagem de tipos do tooling, as 13 tarefas de tipos e
testes do Turbo, os 51 testes de scripts, o build do painel e o `deno check`
da função. Na pilha descartável, passaram os 259 testes pgTAP e os 7 passos
do e2e. A repetição do teste contra a API oficial manteve zero eventos no
banco de teste após a busca e importou 289 eventos e 355 ocorrências apenas
após a confirmação. Não foi feita homologação hospedada.

**Próximo trabalho de exportação:** U4.1, renderer do CSV de 29 colunas e do
CSV de conferência com fixtures do legado; depois, comparação SQL e Function
nos mesmos fixtures para U4.2.

**Ciclo 3 (depende de gate):** U4.3 (geração e download persistidos), dados
reais do legado num banco local isolado (U6.1/U6.2, ensaio) e hospedagem.

## 4. Decisões que só a pessoa pode tomar

1. **Dados reais:** autorizar a leitura do Postgres `farol-postgres` (cluster
   k3s, namespace `farol`) para um ensaio de restore local das dez tabelas
   (U6.2). Sem isso, o painel novo opera só com dados de exemplo.
2. **Exportação:** escolher onde roda o CSV de 29 colunas (Edge Function ou
   SQL, U4.2), depois da prova do ciclo 2.
3. **Destino e hospedagem:** Supabase de produção (D3; o Free pausa após
   cerca de 7 dias sem uso), domínio e TLS do painel e do app web (o ingress
   de `deploy/k8s/web.yaml` não tem classe nem TLS).
4. **Matching e sincronização de espaços:** manter, portar ou aposentar
   (U4.4).
5. **Corte:** quando o painel novo vira o único caminho de curadoria e o
   coletor antigo deixa de escrever (U6.4).
