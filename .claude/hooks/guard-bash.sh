#!/usr/bin/env bash
# PreToolUse (Bash): bloqueia leitura de segredos e comandos de produção,
# inclusive via wrappers (npx, pnpm exec, pnpm dlx, sh -c, env, xargs...).
# Cobre o que as regras de prefixo de permissions.deny deixam passar.
# Falha fechado: sem jq, ou com entrada ilegível, nada roda.
set -uo pipefail

block() {
  echo "guard-bash: bloqueado: $1" >&2
  echo "Se for mesmo necessário, peça a um humano para rodar fora do agente." >&2
  exit 2
}

if ! command -v jq >/dev/null 2>&1; then
  block "jq não encontrado; o hook falha fechado (instale jq)."
fi

input="$(cat)"
if ! cmd="$(jq -er '.tool_input.command // ""' <<<"$input" 2>/dev/null)"; then
  block "entrada do hook ilegível (JSON inválido)."
fi
[[ -z "$cmd" ]] && exit 0

# Normaliza: sem aspas nem barras invertidas, separadores de comando viram
# quebra de linha (cada segmento é checado sozinho).
norm="$cmd"
norm="${norm//\\/}"
norm="${norm//\"/ }"
norm="${norm//\'/ }"
norm="${norm//\`/$'\n'}"
norm="${norm//\$(/$'\n'}"
norm="${norm//&&/$'\n'}"
norm="${norm//||/$'\n'}"
norm="${norm//;/$'\n'}"
norm="${norm//|/$'\n'}"
norm="${norm//&/$'\n'}"
norm="${norm//(/ }"
norm="${norm//)/ }"
norm="${norm//$'\t'/ }"

# 1) Arquivos de segredo, por qualquer comando (cat, cp, base64, grep...).
secret_re='\.env\.production|\.(keystore|jks)([^[:alnum:]_]|$)|key\.properties'
if [[ "$norm" =~ $secret_re ]]; then
  block "referência a arquivo de segredo (${BASH_REMATCH[0]})."
fi

sp='[[:space:]]'
# Binário como palavra: aceita caminho (node_modules/.bin/x) e versão (x@1.2).
supabase_re="(^|${sp}|/)supabase(@[^[:space:]]*)?(${sp}|$)"
eas_re="(^|${sp}|/)eas(-cli)?(@[^[:space:]]*)?(${sp}|$)"
w() { printf '(^|%s)%s(%s|$)' "$sp" "$1" "$sp"; }

while IFS= read -r seg; do
  seg=" ${seg} "
  if [[ "$seg" =~ $supabase_re ]]; then
    rest="${seg#*"${BASH_REMATCH[0]}"}"
    rest=" ${rest} "
    if [[ "$rest" =~ $(w db) && "$rest" =~ $(w push) ]]; then
      block "supabase db push (produção/remoto)."
    fi
    if [[ "$rest" =~ $(w db) && "$rest" =~ $(w reset) && "$rest" =~ --(linked|db-url) ]]; then
      block "supabase db reset contra banco remoto."
    fi
    if [[ "$rest" =~ $(w migration) && "$rest" =~ $(w '(repair|up|squash)') && "$rest" =~ --(linked|db-url) ]]; then
      block "supabase migration contra banco remoto."
    fi
    if [[ "$rest" =~ --remote([=[:space:]]|$) ]]; then
      block "supabase com --remote."
    fi
    if [[ "$rest" =~ $(w functions) && "$rest" =~ $(w deploy) ]]; then
      block "supabase functions deploy."
    fi
    if [[ "$rest" =~ $(w secrets) && "$rest" =~ $(w '(set|unset)') ]]; then
      block "supabase secrets set/unset."
    fi
    if [[ "$rest" =~ $(w config) && "$rest" =~ $(w push) ]]; then
      block "supabase config push."
    fi
    if [[ "$rest" =~ $(w '(projects|branches)') && "$rest" =~ $(w delete) ]]; then
      block "supabase projects/branches delete."
    fi
  fi
  if [[ "$seg" =~ $eas_re ]]; then
    rest="${seg#*"${BASH_REMATCH[0]}"}"
    rest=" ${rest} "
    if [[ "$rest" =~ $(w submit) || "$rest" =~ --auto-submit ]]; then
      block "eas submit (loja)."
    fi
    if [[ "$rest" =~ $(w 'update') && "$rest" =~ production ]]; then
      block "eas update em produção."
    fi
    if [[ "$rest" =~ $(w 'env:(create|update|delete|push)') && "$rest" =~ production ]]; then
      block "eas env em produção."
    fi
  fi
done <<<"$norm"

exit 0
