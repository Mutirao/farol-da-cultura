#!/usr/bin/env bash
# PostToolUse (Edit|MultiEdit|Write): roda o Biome só no arquivo editado.
# Erro -> exit 2 (stderr volta para o Claude). Aviso -> additionalContext.
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "biome.sh: jq não encontrado; Biome não rodou neste arquivo." >&2
  exit 1
fi

file="$(jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
[[ -z "$file" || ! -f "$file" ]] && exit 0

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0
if [[ ! -x node_modules/.bin/biome ]]; then
  echo "biome.sh: node_modules ausente (rode pnpm install); Biome não rodou." >&2
  exit 1
fi

out="$(pnpm exec biome check --write --colors=off --no-errors-on-unmatched \
  --files-ignore-unknown=true "$file" 2>&1)"
status=$?

if [[ $status -ne 0 ]]; then
  printf 'Biome encontrou erros em %s (corrija antes de seguir):\n%s\n' "$file" "$out" >&2
  exit 2
fi

if grep -Eq 'Found [0-9]+ warning' <<<"$out"; then
  jq -n --arg ctx "Biome: avisos em ${file}:"$'\n'"${out}" \
    '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
fi
exit 0
