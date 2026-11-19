# Painel — curadoria mínima (S0.4)

Painel operacional: login de curador, lista/detalhe dos eventos coletados,
aprovação e rejeição individual ou em lote, exportação mínima e consulta da
agenda por instância oficial.
Supera a prova de composição U0.3 (histórico em
[relatório U0.3](../../docs/relatorios/unificacao-painel-compatibilidade.md)).
D6 revisada pelo usuário em 2026-11-16; ver [ADR-0008](../../docs/adr/0008-plataforma-unificada.md)
e [ADR-0009](../../docs/adr/0009-ecossistema-institucional.md).

**Curadoria nunca publica direto na agenda.** Aprovar não envia nem publica;
exportar não comprova incorporação. A atualização da agenda pública só lê
eventos já disponíveis na API institucional.

## Instâncias oficiais

Em **Operação → Instâncias oficiais**, o **Mapa Cultural do Ceará** já vem
configurado no servidor. **Buscar eventos** consulta a API do dia atual até
62 dias à frente (fuso de Fortaleza), mostra contagens e até 50 eventos em
ordem de início, sem gravar nada. A lista de fontes de coleta é outro recurso.

**Sincronizar agenda** pede confirmação e atualiza a agenda pública do Farol
no período consultado; não escreve no Mapas nem na fila de curadoria. O servidor
refaz a busca e recusa o lote se o conteúdo mudou desde a prévia ou se há dados
inválidos, repetidos, fora do período ou nenhuma ocorrência. O importador mantém
a proteção contra remoções em massa. Se outra execução gravar enquanto a fonte
é consultada, o painel pede uma nova busca. O resultado mostra o que foi gravado.

Para a consulta local no Supabase já iniciado, na raiz do repositório:
`pnpm supabase functions serve instancias-oficiais`. Mantenha esse processo aberto;
não é necessário resetar o banco. A função exige curador ativo. A consulta não
precisa de permissão de escrita; **a opção de sincronizar fica desligada por
padrão**. Use `FAROL_SYNC_MANUAL=true` na configuração da função somente em um
ambiente autorizado para atualizar a agenda e com a migração de versionamento
aplicada. Em ambiente hospedado a função precisa estar publicada separadamente
da SPA. Veja os limites e o agendamento em
[@farol/coleta](../../workers/coleta/README.md).

O piloto não permite cadastrar URLs pelo navegador. Para adicionar outra
instância, primeiro valide a origem, o fuso, a identidade da base e o recorte
que pode ser sincronizado. Nenhum agendamento novo é ativado por essa tela.

## Como rodar localmente

Pré-requisitos: Node 26.10.0, pnpm 12.18.0 (`export PATH=...` conforme
`AGENTS.md`), Supabase local rodando (`pnpm supabase start`, Docker).

```bash
pnpm install --frozen-lockfile --strict-peer-dependencies

# chaves do stack local (nunca a service_role aqui: VITE_* é sempre público)
pnpm supabase status -o json   # copie API_URL e PUBLISHABLE_KEY

VITE_SUPABASE_URL=http://127.0.0.1:54321 \
VITE_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY de supabase status> \
pnpm --filter @farol/painel dev        # http://127.0.0.1:5173

# ou build + preview (bundle de produção, mesmo fluxo da verificação E2E)
VITE_SUPABASE_URL=http://127.0.0.1:54321 \
VITE_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY> \
pnpm --filter @farol/painel build
pnpm --filter @farol/painel preview    # http://127.0.0.1:4173
```

Sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`, a SPA mostra só um
aviso ("não configurado"), sem nenhuma chamada de rede — não há mais a prova
de composição `ready` do U0.3.

```bash
pnpm --filter @farol/painel typecheck
pnpm --filter @farol/painel build
pnpm --filter @farol/painel test        # vitest (unitários; não precisa do Supabase local)
```

## Como logar localmente

Com o Supabase local iniciado, use `pnpm painel:local` na raiz para
provisionar o curador de desenvolvimento, carregar exemplos e obter um código
de login local. Veja o [roteiro do ambiente de demonstração](../../scripts/dev/README.md).
Não aponte esse roteiro para uma base com dados reais.

O login é sem senha: a tela pede um e-mail de curador, chama
`supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`
("Enviar código") e, só depois de um segundo clique explícito
("Confirmar código"), chama `verifyOtp` com o código digitado. Cadastro
público desabilitado — só curador já provisionado entra. `checkAuth` exige
`current_curator()` não nulo (vínculo em `private.curator_identities` com
`public.users.role = 'curator'` e `is_active = true`; ver
`20261117000200_curadoria_acesso.sql`), não só uma sessão válida: curador
desativado perde acesso mesmo com JWT ainda vigente.

**Inbucket local está parado** (confirmado: `signInWithOtp` responde
`500 Error sending magic link email`). Por isso a tela sempre avança para a
etapa de código depois de "Enviar código", mesmo quando o envio falhou (isso
também evita vazar se o e-mail existe) — e a verificação de uma
sessão ainda sem curador não mostra mais notificação "sem sessão" ao abrir a
tela de login — útil tanto em produção (SMTP fora do ar) quanto aqui.

Roteiro para logar localmente sem e-mail de verdade, usando um curador
provisionado:

1. **Provisione o vínculo** (fora deste pacote, não editado por S0.4): rode
   `scripts/provisionar-curador.ts` com um `public.users` já existente e
   papel `curator`, ou monte o vínculo a mão (veja o padrão usado no pgTAP
   `007_curadoria_minima.test.sql` e em `scripts/test/admin-local.test.ts`):
   - crie o usuário no Auth local via Admin API
     (`POST {API_URL}/auth/v1/admin/users` com `service_role`, nunca no
     cliente), com o mesmo e-mail de um `public.users` com `role='curator'`
     e `is_active=true`;
   - ligue as duas identidades em `private.curator_identities (auth_user_id,
     user_id)`.
2. **Gere o código sem e-mail**: `POST {API_URL}/auth/v1/admin/generate_link`
   (`service_role`) com `{"type":"magiclink","email":"<e-mail do curador>"}`.
   A resposta traz `email_otp` (6 dígitos) — esse endpoint nunca tenta enviar
   e-mail, então funciona com o Inbucket parado.
3. Na tela de login do painel: digite o e-mail, clique **Enviar código**
   (vai mostrar um aviso de que não foi possível confirmar o envio — normal
   aqui), digite o `email_otp` do passo 2 em **Código recebido** e clique
   **Confirmar código**.
4. Para desfazer o provisionamento de teste: apague a linha de
   `private.curator_identities`, o `public.users` e o usuário Auth (Admin API
   `DELETE /auth/v1/admin/users/<id>`) — nessa ordem.

Em produção, com SMTP configurado, o mesmo fluxo funciona com o código vindo
do e-mail de verdade; nada no painel muda.

## Recursos

- **Curadoria / Operação**: menu agrupado no layout padrão do React-admin.
  Além de eventos, **espaços**, **fontes de eventos**, **execuções de jobs** e
  **exportações** têm lista e detalhe somente leitura, sem criar/editar/excluir.
  Exportações consultam somente os metadados autorizados pelo GRANT de coluna;
  `csv_content_base64` nunca é solicitado.
- **Lista de eventos**: filtros por curadoria, fonte, título (busca sem distinguir
  maiúsculas/minúsculas) e intervalo de início, incluindo os dias escolhidos no
  fuso `America/Fortaleza`. Ordenação inicial por início crescente, com ID como
  desempate também nas demais ordenações; 50 itens por página, opções 25/50/100.
  Filtros, ordenação e página permanecem na URL. HTML coletado é exibido como
  texto, sem renderizar a marcação da fonte.
- **Mensagens pt-BR**: centralizadas em `src/mensagens.ts`, sem importar o pacote
  mobile `@farol/i18n`.

- **Eventos coletados** (`public.events`, lista e detalhe): só as colunas que
  a RLS de `20261117000200_curadoria_acesso.sql` libera para `authenticated`
  com curador ativo (ninguém mais vê nenhuma linha).
- **Aprovar / Rejeitar**: chama `curar_evento(p_event_id, p_version, p_status)`
  (`20261117000700_curadoria_minima.sql`). Sempre envia a `version` lida pelo
  painel; a RPC recusa (`23505`) se divergir da versão atual do evento.
  Não altera `export_*`, `space_match_*` nem `mapas_import_*` e nunca escreve
  na agenda pública.
- **Aprovar / Rejeitar selecionados**: a seleção vale para a página atual e é
  limpa ao mudar de página, filtros ou ordenação. O painel confirma com o
  curador e envia os IDs e versões à RPC `curar_eventos`, que informa quantos
  eventos foram alterados, estavam em conflito ou não foram encontrados.
- **Vínculo institucional** (coluna na lista e estado no detalhe, quando existe): lê
  `public.vinculos_institucionais` (contrato do S0.2) por `event_id`; evento
  sem linha aparece como "Sem vínculo institucional" na lista. O formulário por
  evento saiu do painel; os vínculos existentes e as RPCs de registro e
  confirmação não foram alterados.
- **Exportar aprovados (CSV/JSON mínimo)**: botão na lista, busca
  `curation_status=approved` direto (independe da paginação/filtro atual da
  tela) e gera o arquivo no navegador. Rotulado como exportação mínima — não
  é o CSV compatível com o Mapas Culturais (isso é trabalho do U4).

## Limites conhecidos

- Mensagens próprias do painel são pt-BR (sem `@farol/i18n`, por regra do
  projeto); textos de infraestrutura do próprio React-admin (paginação,
  "Please login to continue" antes do primeiro login) continuam em inglês —
  não foi feita localização completa do framework.
- Sem papéis/permissões diferenciadas entre curadores e sem edição de outros
  campos do evento. Paginação usa o componente padrão do React-admin.
- `useVinculo`/`useVinculos` buscam o vínculo institucional fora do data
  provider (consulta direta via `@supabase/supabase-js`); atualizam na
  aprovação/registro desta sessão, mas não há realtime entre abas.
