# Bootstrap do painel local

Com Node 26, dependências instaladas e Supabase local já rodando:

```bash
pnpm painel:local
pnpm painel:local --email outro-curador@farol.local
```

O comando recusa API/banco fora de `127.0.0.1`/`localhost`, não segue redirects
HTTP e não inicia, reinicia ou apaga o Supabase. Obtém configuração de
`pnpm -s supabase status -o json`, sem imprimir chaves. Overrides opcionais:
`API_URL`, `DB_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY`, `SERVICE_ROLE_KEY` (também
aceita prefixo `SUPABASE_`, com `SUPABASE_URL` para a API).

Cria um curador ativo, sua conta Auth via Admin API e o vínculo privado. Reutiliza
IDs existentes; colisões, usuários inativos ou com outro papel exigem revisão
manual, sem promover, reativar ou reatribuir UUID automaticamente.

Carrega a fixture sintética do Sympla pelo normalizador do worker e 12 eventos
`[exemplo]`, com datas futuras e preços alternados em `price_raw`. Não inventa
classificação curada `is_free`/`price_min`/`price_max`. Tudo fica em `public.events`,
restrito à operação: **não altera `eventos`, `eventos_datas` ou `espacos`**.

O primeiro exemplo guarda a data base do lote. Reexecuções reutilizam essa base
e o mesmo run key, inclusive no dia seguinte; não duplicam nem renovam as datas.
A fixture também é normalizada com essa base estável. Para renovar exemplos que
envelheceram, é necessária manutenção explícita do lote, não um reset automático.
O recibo da RPC devolve as contagens originais no replay; o relatório do bootstrap
corrige isso para zero inserções/atualizações nesta execução, com `replay: true`.

A saída inclui um código de login de seis dígitos, de uso único, e o comando do
Vite com um **marcador** para a chave pública (substitua-o pela `PUBLISHABLE_KEY`
local; nunca use `SECRET_KEY`/`SERVICE_ROLE_KEY` no cliente). Na tela de login,
informe o e-mail e clique **Enviar código**, depois **Confirmar código** com o
código impresso. Se o envio invalidar o código, rode novamente o bootstrap antes
de confirmar. Não compartilhe os códigos. A última linha é JSON com contagens
do curador e dos eventos; falhas retornam exit 1 sem ecoar credenciais.
