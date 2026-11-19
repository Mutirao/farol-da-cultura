# @farol/coleta

Importa a agenda do Mapa Cultural do Ceará para o Supabase (tarefa M7 de
[`docs/PLANO-APP-MOBILE.md`](../../docs/PLANO-APP-MOBILE.md); decisão em
[`docs/adr/0007-importacao-da-agenda.md`](../../docs/adr/0007-importacao-da-agenda.md)).

## Papel no fluxo institucional

Este pacote executa a **sincronização da agenda**: lê informações já presentes
na API da instância e atualiza a projeção de leitura do Farol. Não incorpora
raspagem no Mapas nem publica diretamente registros externos em preparação.
O guard da RPC é restrito a `mapa-cultural-ce`; não reutilizar o snapshot para
Sympla, outra instância ou outra cobertura sem contrato e testes próprios.

O escopo do produto inclui múltiplos scrapers, instâncias e cidades; este
importador ainda é o piloto Ceará, com fuso e janela fixados no código.
Bases compartilhadas, identidades e recortes precisam ser explicitados antes
da expansão. Ver [ontologia e fluxo](../../docs/ONTOLOGIA-E-FLUXO.md) e
[plano unificado](../../docs/PLANO-UNIFICADO-2026-11-16.md).

Uma execução faz três coisas:

1. Busca na API pública do Mapa Cultural todas as ocorrências de hoje até 62 dias à frente.
2. Valida cada linha e monta um lote. Linha ruim é contada e fica de fora.
3. Entrega o lote a `public.importar_agenda`, que grava tudo numa transação só.

O importador lê `public.versao_agenda_ce()` antes da busca. Se a agenda for
atualizada por outra execução nesse intervalo, o banco recusa o lote e é
preciso começar uma nova coleta. A mesma regra vale para a sincronização
pelo painel. Aplique a migração de versionamento antes de atualizar o worker
e somente habilite a sincronização manual após atualizar os demais importadores.

## Regras que a importação segue

- Espaço e evento novos entram publicados. Depois disso a importação não mexe em `publicado`:
  quem despublicar um registro à mão não é desfeito na execução seguinte.
- Evento e espaço nunca são apagados. Só sai a data que está na janela coletada e não veio da
  fonte, porque foi cancelada ou remarcada.
- Se mais da metade das datas da janela sumir de uma vez, a função recusa o lote inteiro: isso
  parece resposta incompleta da fonte, não cancelamento.
- Qualquer falha na busca (erro, prazo, resposta que não é a lista esperada) encerra a execução
  sem tocar no banco.
- Registros de outras fontes não são tocados.

## Rodar contra o Supabase local

```bash
pnpm supabase start
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SECRET_KEY="$(pnpm supabase status -o json | jq -r .SECRET_KEY)"
pnpm --filter @farol/coleta importar
```

A saída é uma linha de JSON só com contagens: linhas recebidas, rejeitadas por motivo, e o que
foi criado, alterado e removido. `pnpm supabase db reset` volta o banco local ao seed.

## Confirmar incorporações

`pnpm --filter @farol/coleta confirmar` (mesmas `SUPABASE_URL` e `SUPABASE_SECRET_KEY`) lê os
vínculos `registrado` em `public.vinculos_institucionais`, busca cada ID no Mapas em
`/api/event/find` da instância e compara título (sem acento, caixa ou espaços extras) e início
(minuto, em America/Fortaleza) com o evento coletado em `public.events`. Grava o resultado com
`public.confirmar_incorporacao`: `confirmado` se os dois conferem, `divergente` se não. ID que a
instância não devolve continua `registrado`, sem chamada, e só entra na contagem `ausentes`; o
mesmo vale para vínculo de outra base, ID não numérico ou evento sem início. Todas as leituras na
instância acontecem antes da primeira gravação: resposta fora do formato encerra sem confirmar
nada. `MAPA_CULTURAL_BASE` segue a mesma regra da importação (só `127.0.0.1`/`localhost`, ver
[instância de teste](../../scripts/instancia-teste/README.md)). A saída é uma linha de JSON só
com contagens. Não rode contra o banco local de demonstração.

## Testes

```bash
pnpm --filter @farol/coleta test   # validação e busca, sem rede
pnpm supabase test db              # a função importar_agenda (pgTAP)
```

## Ativar a execução agendada

O workflow [`coleta.yml`](../../.github/workflows/coleta.yml) roda todo dia às 05h17 de
Fortaleza, mas chega desligado. Quem ativa é uma pessoa, nesta ordem:

1. Confirmar com a Secult a permissão de uso dos dados. O site do Mapa Cultural aponta a
   documentação da API, mas não declara termos de uso.
2. Subir as migrações para o projeto do Supabase. Agentes não rodam `supabase db push`.
3. Criar no GitHub o ambiente `coleta` com o segredo `SUPABASE_SECRET_KEY` e a variável
   `SUPABASE_URL`.
4. Definir a variável de repositório `COLETA_ATIVA` como `true`.

Para desligar, apague `COLETA_ATIVA` ou mude o valor.

Se a função recusar uma remoção em massa e o sumiço for real, rode o workflow à mão com
`permitir_remocao_em_massa` marcado.

## Limites conhecidos

- A busca é uma requisição só, sem paginação. Em 12/11/2026 a API devolveu 264 linhas para 90
  dias sem impor limite.
- Os dados entram como a fonte escreve. Nome de município vem com variação de caixa
  (`Fortaleza`, `FORTALEZA`) e às vezes com lixo; preço é texto livre, e `gratuito` fica nulo
  quando o texto não deixa claro.
- O GitHub desliga workflows agendados de repositórios públicos depois de 60 dias sem
  atividade no repositório.
