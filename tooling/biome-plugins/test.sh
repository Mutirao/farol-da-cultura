#!/usr/bin/env bash
# Testa os plugins GritQL do Biome contra as fixtures, usando o biome.json real.
# Uso: bash tooling/biome-plugins/test.sh
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
biome="$root/node_modules/.bin/biome"
[[ -x "$biome" ]] || { echo "Biome ausente: rode pnpm install." >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Monta um projeto descartável: biome.json da raiz (sem $schema) + plugins + fixtures
# nas mesmas posições que teriam no repositório (apps/**, packages/**).
jq 'del(."$schema")' "$root/biome.json" >"$work/biome.json"
mkdir -p "$work/tooling/biome-plugins"
cp "$here"/*.grit "$work/tooling/biome-plugins/"
cp -R "$here/fixtures/apps" "$here/fixtures/packages" "$work/"

cd "$work"
set +e
"$biome" lint --vcs-enabled=false --reporter=json --max-diagnostics=none . >"$work/report.json" 2>"$work/stderr"
set -e

jq -r '.diagnostics[] | select(.category == "plugin")
  | "\(.severity) \(.location.path):\(.location.start.line) \(.message)"' "$work/report.json" |
  sort >"$work/got.txt"
sort "$here/fixtures/expected.txt" >"$work/want.txt"

if diff -u "$work/want.txt" "$work/got.txt"; then
  echo "biome-plugins: $(wc -l <"$work/got.txt") diagnósticos, exatamente os esperados"
else
  echo "biome-plugins: diagnósticos diferentes do esperado (diff acima)" >&2
  cat "$work/stderr" >&2
  exit 1
fi
