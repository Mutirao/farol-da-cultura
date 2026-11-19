# e2e da corrente (S0.9)

Teste de ponta a ponta da corrente completa: scraper → curadoria → incorporação →
instância de teste → sincronização → confirmação → agenda pública. Roda contra um
Supabase **isolado**, nunca contra o banco de demonstração. Só API/CLI — RPC do
Supabase por `fetch` e a instância de teste HTTP (`scripts/instancia-teste`) — **sem
navegador nem Playwright**.

## Rodar

```bash
pnpm e2e:esqueleto
```

Por padrão, o próprio script sobe a pilha isolada (`pilha.ts#subirPilhaIsolada`): copia
`supabase/` para um diretório temporário com outro `project_id` e outras portas (`+10000`:
API `64321`, banco `64322` etc.), roda `supabase --workdir DIR start` (que já aplica as
migrations e o `seed.sql` numa base nova) e, no final — **inclusive em caso de falha** —,
roda `supabase --workdir DIR stop --no-backup` e remove o diretório. Nunca toca o Supabase
local de desenvolvimento (`54321`/`54322`), onde fica o banco de demonstração: ver
`pilha.ts#verificarIsolamento`. O bloco `finally` de `esqueleto.ts` também fecha a instância
de teste e a conexão Postgres do curador antes de derrubar a pilha, sempre, mesmo quando um
passo lança.

Pré-requisitos: Docker rodando, `pnpm install` feito (usa a `supabase` CLI do workspace, já
em `devDependencies` da raiz). Leva uns 30–60 s com as imagens já em cache local.

Testado duas vezes (saída `ok:true`, sem containers/volumes/redes remanescentes) e uma vez
com uma falha forçada no passo 3, confirmando que a pilha isolada é derrubada e o banco de
demonstração permanece intocado mesmo quando um passo lança.

## Pilha externa (ex.: CI com banco efêmero do runner)

Se o chamador já tem um Supabase isolado/efêmero de pé (ex.: outro passo do CI iniciou um),
defina as seis variáveis abaixo; o script usa essa pilha em vez de gerenciar a sua própria e
não a derruba ao final (quem subiu, derruba):

```
E2E_SUPABASE_URL=http://127.0.0.1:<porta api>
E2E_SUPABASE_DB_URL=postgresql://postgres:***@127.0.0.1:<porta db>/postgres
E2E_SUPABASE_ANON_KEY=...
E2E_SUPABASE_SERVICE_ROLE_KEY=...
E2E_SUPABASE_SECRET_KEY=...
E2E_SUPABASE_PUBLISHABLE_KEY=...
E2E_SUPABASE_JWT_SECRET=...
```

## Guard de isolamento

Em qualquer dos dois modos, antes do primeiro passo o script recusa:

- qualquer host que não seja `127.0.0.1`/`localhost`/`[::1]`;
- as portas padrão `54321`/`54322` (onde mora o banco de demonstração), a não ser que
  `E2E_BANCO_DESCARTAVEL=1` esteja no ambiente — sinal explícito de que ali é mesmo um banco
  descartável (ex.: banco efêmero do runner de CI, nunca o Supabase local de
  desenvolvimento). O modo padrão (pilha gerenciada, portas `+10000`) nunca bate nas portas
  padrão, então não precisa dessa variável.

## Passos (1–7, todos com asserção; o 7 é o caso negativo)

1. Instância de teste (S0.5, `scripts/instancia-teste`) sobe vazia.
2. Scraper (S0.3, `workers/sympla`) sobre a fixture sintética (`sympla-event.html`), chamado pelas
   próprias funções do pacote (`prepararColeta` + `registrarColetaMinima`, não a CLI) →
   `registrar_coleta_minima` grava uma linha `curation_status = 'pending'` em
   `public.events`; `anon` via PostgREST não vê nada novo em `/rest/v1/eventos` e recebe 401
   em `/rest/v1/events`.
3. Curador de teste (provisionado por SQL direto no banco isolado, `auth.ts`) aprova via
   `curar_evento` (S0.4); `anon` continua sem ver nada novo.
4. `registrar_incorporacao` com um ID de Mapas de teste (base `mapa-cultural-ce`, a mesma
   que `confirmar.ts` exige).
5. A instância de teste passa a servir o evento com esse ID, mesmo título e mesmo início
   (convertido para America/Fortaleza; o fuso é fixo UTC-3 desde 2019, sem horário de
   verão, então o script faz a conta direto em vez de puxar `Temporal` — ver a nota técnica
   abaixo). Conferido batendo em `/api/event/find` da instância por HTTP de verdade.
6. Sincronização (`buscarLinhas`/`normalizar` de `workers/coleta`, apontando a janela do dia
   do evento para a instância de teste, + `importar_agenda`) e confirmação
   (`workers/coleta/src/confirmar.ts#confirmar`, S0.6) → vínculo passa a `confirmado`; `anon`
   passa a ver o evento em `/rest/v1/eventos` (contagem sobe em exatamente 1).
7. Negativo: um segundo evento coletado e aprovado, sem `registrar_incorporacao`, nunca
   aparece em `/rest/v1/eventos` — a contagem da agenda fica igual à do passo 6.

O relatório final (um objeto JSON, última linha do stdout) lista os 7 passos com
`ok`/detalhe; o progresso de cada passo vai para stderr. Código de saída `0` só se todos os
7 passos passaram; o primeiro passo que falhar interrompe os seguintes (dependem do estado
dele) e o relatório mostra qual foi.

### Por que não há passo 8 (export web + navegador)

Uma tentativa anterior deste script previa um passo 8 opcional com `expo export --platform
web` servido localmente e verificado por Playwright. Esse e2e (S0.9) é explicitamente só
API/CLI — RPC do Supabase e a instância de teste HTTP, **sem navegador nem Playwright** —
então esse passo foi removido, não adaptado. A verificação do app web no navegador já foi
feita manualmente no S0.7 (ver o handoff de `s07`); não é repetida aqui.

## Nota técnica: por que `workers/coleta` e `workers/sympla` são importados por URL dinâmica

`workers/coleta/src/{mapaCultural,confirmar}.ts` e, transitivamente,
`workers/sympla/src/{coleta,rpc,lote,normalize}.ts` usam o global `Temporal`
(`ESNext.Temporal`, declarado no `lib` do `tsconfig.json` de cada um desses pacotes).
`tsconfig.tooling.json` — o programa de `scripts/**/*.ts`, rodado por `pnpm run
check:tooling` (também no CI, job `check`) — **não** declara esse lib, de propósito (mesma
decisão já tomada no README de `scripts/instancia-teste`). Um `import` estático desses
módulos arrastaria `Temporal.Instant`/`Temporal.PlainDateTime` para o mesmo programa de
typecheck e quebraria `check:tooling` com `Cannot find name 'Temporal'` — confirmado
empiricamente antes de escrever `esqueleto.ts`. Por isso `esqueleto.ts` importa essas
funções por uma URL calculada em runtime (`importarDoRepo`, veja o comentário no topo do
arquivo), não como especificador estático — o `tsc` não resolve o módulo para checar tipos,
e em runtime o Node carrega o arquivo normalmente (com `Temporal` disponível de verdade).
Pelo mesmo motivo, `esqueleto.ts` nunca usa `Temporal` diretamente: a conversão para
America/Fortaleza é feita com `Date` e um deslocamento fixo de 3 horas.

## O que o script não verifica

A contagem de `public.eventos` do **banco de demonstração** (a invariante final do VERIFY
do S0.9) é responsabilidade de quem roda o e2e, não do script — ele não tem (e não deve ter)
nenhuma referência às portas `54321`/`54322`. Compare antes/depois com:

```bash
docker exec supabase_db_farol psql -U postgres -t -c 'select count(*) from public.eventos;'
```

## Arquivos

- `esqueleto.ts`: orquestrador (este README descreve o que ele faz).
- `pilha.ts`: ciclo de vida do Supabase isolado (sobe/deriva/derruba), guard de isolamento.
- `auth.ts`: provisionamento do curador de teste e assinatura do JWT HS256 (sem Inbucket).
