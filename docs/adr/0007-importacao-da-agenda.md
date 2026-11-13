# ADR-0007: Fonte e mecanismo da importação da agenda

- **Status:** Proposto
- **Data:** 2026-11-12
- **Decisores:** _______________________ (a D1 do plano é da pessoa; a implementação segue a proposta até ela decidir)
- **Requisitos:** SEG-01; tarefa M7 e decisão D1 de `docs/PLANO-APP-MOBILE.md`

## Contexto

O app novo precisa de dados reais, e o plano enxuto cortou o worker de raspagem. Fatos de 12/11/2026:

- A API do app existente não serve: `api.agenda.cultura.ce.gov.br` devolve 502 e o host de homologação não tem DNS.
- O Mapa Cultural do Ceará é de onde o app existente sincroniza agenda e espaços. A API pública dele está no ar, e a página inicial do site aponta a documentação dela. O site não declara termos de uso dos dados.
- `GET /api/event/findOccurrences` devolve as ocorrências já expandidas por data, com o evento e o espaço embutidos. Para 62 dias vieram 260 linhas, 182 eventos e 70 espaços, em uma requisição de cerca de meio megabyte, sem paginação e sem cabeçalho de limite de uso.
- Os dados têm buracos: 39 de 243 ocorrências com coordenada `0,0`, preço em texto livre ("Gratuito", "Pago", "2750,00", "Livre") e nome de município com variação de caixa.
- O Raspagem-Farol cobre só Sympla em Fortaleza e grava num Postgres próprio.
- Regras do projeto: `service_role` só em servidor ou CI; agente não roda `db push` nem `functions deploy`.

## Decisão

A agenda vem do Mapa Cultural do Ceará, pela API pública, importada uma vez por dia.

- **Coleta:** `workers/coleta`, em Node 26, sem dependência além do `zod`. Busca a janela inteira, valida linha a linha e monta um lote. Qualquer falha na busca encerra a execução sem tocar no banco.
- **Gravação:** a função `public.importar_agenda(fonte, lote)` grava o lote numa transação só. Só `service_role` a executa.
- **Agendamento:** um workflow do GitHub Actions, com a chave secreta num ambiente do GitHub. Ele chega desligado e é ativado por uma pessoa.
- **Precedência por campo:** os campos descritivos são da fonte e são sobrescritos a cada execução. `publicado` é editorial: a importação só o define na criação.
- **Remoção:** evento e espaço nunca são apagados. Sai apenas a data da janela coletada que não veio no lote. Lote vazio é recusado, e lote que removeria mais da metade da janela também, salvo permissão explícita.

## Consequências

- Não há serviço novo para manter nem deploy de função: o que roda é um script e uma migração.
- Sem painel, tudo o que a fonte publica entra publicado no app. Esconder um registro é uma alteração manual de `publicado`, que a importação respeita.
- A qualidade do que o app mostra é a da fonte. Limpeza de município e de preço fica para quando uma tela precisar.
- A agenda depende do cron do GitHub, que atrasa em horário de pico e é desligado depois de 60 dias sem atividade no repositório.
- Antes de ativar, falta uma pessoa confirmar com a Secult a permissão de uso dos dados e decidir em que projeto do Supabase a importação grava (D3).
- Rever se a janela passar de alguns milhares de linhas (paginar) ou se entrar uma segunda fonte (a função já separa por `fonte`).

## Alternativas consideradas

- **API do app existente:** fora do ar, sem código-fonte disponível e com arquivamento decidido.
- **Edge Function com `pg_cron`:** dispensa segredo fora do Supabase, mas exige deploy de função, que agente não faz, e um runtime Deno que o repositório ainda não tem.
- **Só SQL, com `pg_net`:** sem código fora do banco, mas a resposta é assíncrona e difícil de validar e testar.
- **Gravar tabela por tabela pela API REST:** sem função, mas uma falha no meio deixaria evento sem data.
- **Raspagem-Farol:** cobre outra fonte; pode alimentar a mesma função no futuro.
