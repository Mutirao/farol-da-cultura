#!/usr/bin/env bash
# Stop: typecheck só dos pacotes afetados. Erro -> exit 2 (o Claude continua
# e corrige). Com stop_hook_active=true sai 0 sem rodar nada (evita loop).
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "typecheck.sh: jq não encontrado; typecheck não rodou." >&2
  exit 0
fi

active="$(jq -r '.stop_hook_active // false' 2>/dev/null || echo true)"
[[ "$active" == "true" ]] && exit 0

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0

out="$(pnpm turbo run typecheck --affected --output-logs=errors-only 2>&1)"
status=$?
if [[ $status -ne 0 ]]; then
  printf 'Typecheck falhou nos pacotes afetados:\n%s\n' "$(tail -n 80 <<<"$out")" >&2
  exit 2
fi
exit 0
