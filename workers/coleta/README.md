# @farol/coleta

Importa a agenda do Mapa Cultural do Ceará para o Supabase (tarefa M7 de
[`docs/PLANO-APP-MOBILE.md`](../../docs/PLANO-APP-MOBILE.md); decisão em
[`docs/adr/0007-importacao-da-agenda.md`](../../docs/adr/0007-importacao-da-agenda.md)).

Uma execução faz três coisas:

1. Busca na API pública do Mapa Cultural todas as ocorrências de hoje até 62 dias à frente.
2. Valida cada linha e monta um lote. Linha ruim é contada e fica de fora.
3. Entrega o lote a `public.importar_agenda`, que grava tudo numa transação só.

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
