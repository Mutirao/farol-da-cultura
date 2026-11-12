#!/usr/bin/env bash
# Instala as ferramentas do Claude Code do projeto (F0-04). Idempotente:
# pode rodar de novo a qualquer momento; o que já existe é mantido.
# Uso: bash scripts/bootstrap-claude.sh
set -euo pipefail
export DISABLE_TELEMETRY=1

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

for bin in claude npx jq; do
  command -v "$bin" >/dev/null 2>&1 || { echo "bootstrap: '$bin' não encontrado." >&2; exit 1; }
done

MARKETPLACE=claude-plugins-official
PLUGINS=(feature-dev code-review pr-review-toolkit code-simplifier security-guidance
  commit-commands hookify skill-creator frontend-design typescript-lsp expo context7)
# O plugin "supabase" fica de fora de propósito (V04).

# Plugins oficiais (escopo de projeto; o marketplace precisa ser registrado pelo shell).
if claude plugin marketplace list 2>/dev/null | grep -q "$MARKETPLACE"; then
  echo "bootstrap: marketplace $MARKETPLACE já registrado."
else
  claude plugin marketplace add anthropics/claude-plugins-official
fi

installed="$(claude plugin list --json 2>/dev/null || echo '[]')"
for p in "${PLUGINS[@]}"; do
  id="$p@$MARKETPLACE"
  if jq -e --arg id "$id" '[.. | objects | select((.id? // .name?) == $id and ((.scope? // "project") == "project"))] | length > 0' \
    <<<"$installed" >/dev/null 2>&1; then
    echo "bootstrap: $id já instalado no projeto."
  else
    claude plugin install "$id" --scope project
  fi
done

# Skills de comunidade: CLI fixado, fonte fixada depois de lida.
# "universal" grava a cópia canônica em .agents/skills/ e liga .claude/skills/ por symlink.
# SHAs/tags conferidos em 2026-11-12 (ver o PR da F0-04 para quem leu cada uma).
npx -y skills@1.8.1 add supabase/agent-skills@v0.1.9 \
  -s supabase supabase-postgres-best-practices -a claude-code universal -y
npx -y skills@1.8.1 add vercel-labs/agent-skills@1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 \
  -s vercel-react-native-skills vercel-react-best-practices vercel-composition-patterns web-design-guidelines \
  -a claude-code universal -y
npx -y skills@1.8.1 add shadcn-ui/ui@dd41d19e2f80ff6891951f7ced74c2c9a650b065 -s shadcn -a claude-code universal -y

cat <<'MSG'

bootstrap: pronto.
- Para o MCP supabase-dev (só leitura): export SUPABASE_DEV_PROJECT_REF=<ref do farol-dev>
- Depois de logar: /mcp no Claude Code (OAuth do Supabase, Expo e Context7). Nada de token em arquivo.
MSG
