# @farol/sympla

Coleta mínima do Sympla (tarefa S0.3; recorte de U2.1–U2.5 do
[plano unificado](../../docs/PLANO-UNIFICADO-2026-11-16.md)). Lê páginas de evento
já baixadas, interpreta, normaliza e grava o lote por
`public.registrar_coleta_minima` (migração
[`20261117000600_coleta_minima.sql`](../../supabase/migrations/20261117000600_coleta_minima.sql)).

## Papel no fluxo institucional

Coleta → normalização. O registro entra em `public.events` como `pending` e fica
restrito à operação (curadoria, preparação de envio). Este pacote **nunca**
escreve em `public.eventos`, `eventos_datas` ou `espacos`: a agenda só recebe
dados pela sincronização com a API de uma instância (ADR-0009,
[ontologia e fluxo](../../docs/ONTOLOGIA-E-FLUXO.md)).

## Origem do código

Porte da parte pura de `Mutirao/Raspagem-Farol` (commit `c5bff68`, somente
leitura): `src/connectors/sympla.connector.ts` (parser da página de evento) e
`src/ingestion/{normalize,classify,filters}.ts`. A fixture
`test/fixtures/sympla-event.html` é sintética: conserva o formato da URL e da
hidratação, sem código ou configurações da página capturada. Ficaram de fora
a listagem, Crawlee e Playwright: aqui não há navegação nem rede de coleta.

Mudanças deliberadas em relação ao legado:

- Hora sem fuso é lida no fuso IANA `America/Fortaleza` (Temporal), não com
  `-03:00` fixo nem com o fuso do processo.
- Campo ausente fica `null` e vira issue; nada é preenchido por suposição. O
  parser não envia mais `isFree: false` nem preço: `is_free`, `price_min` e
  `price_max` ficam no default da tabela, e `price_raw` guarda as opções de
  pagamento como vieram.
- `source_url` só aceita URL canônica de evento do Sympla (`https`,
  `www.sympla.com.br/evento/<slug>/<id>`), tirada do `<link rel="canonical">`.
- `venue_raw` guarda o endereço da fonte, não o payload inteiro.

## Rodar

```bash
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SECRET_KEY="$(pnpm supabase status -o json | jq -r .SECRET_KEY)"
pnpm --filter @farol/sympla coletar [--run-key=<uuid>] pagina.html [outra.html ...]
```

O pnpm roda o script dentro de `workers/sympla`: caminho relativo parte de lá.
Não use `--` antes das opções: depois dele, `--run-key=...` vira nome de
arquivo.

- `SUPABASE_URL` precisa ser `https`; `http` só em `127.0.0.1`/`localhost`.
- Sem `--run-key` (ou `RUN_KEY`), gera um uuid novo. A saída imprime o run key:
  repetir o comando com ele depois de perder a resposta devolve o resultado da
  primeira gravação sem gravar de novo.
- A saída é uma linha JSON com contagens, ids externos, caminhos de arquivo e
  códigos de issue. Nunca conteúdo da página nem a chave.
- Código de saída: `0` completo; `2` gravado, mas alguma página não virou
  evento; `1` nada gravado (nenhum evento interpretado, argumento inválido ou
  erro da RPC).

## Testes

```bash
pnpm --filter @farol/sympla test       # parser, normalização, cliente, sem rede
pnpm supabase test db                  # a RPC (supabase/tests/006_coleta_minima.test.sql)
```

## Limites

- Só a fonte `sympla` e o recorte de Fortaleza (piloto). Outra fonte ou cidade
  exige conector, fixture e testes próprios (U2.7).
- Sem listagem, paginação, retry nem agendamento (U2.5/U2.6).
- `normalized_title` segue o legado: título **mais** nome do local.
