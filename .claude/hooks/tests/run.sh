#!/usr/bin/env bash
# Testes dos hooks do Claude Code (.claude/hooks). Uso: bash .claude/hooks/tests/run.sh
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
hooks="$root/.claude/hooks"
fx="$here/fixtures"
pass=0
fail=0

ok() { pass=$((pass + 1)); }
ko() { fail=$((fail + 1)); echo "FALHOU: $*"; }

expect_exit() { # nome esperado obtido
  if [[ "$2" == "$3" ]]; then ok; else ko "$1 (esperado exit $2, obtido $3)"; fi
}

# ---------- guard-bash.sh ----------
n="$(jq length "$fx/guard-bash.json")"
for ((i = 0; i < n; i++)); do
  cmd="$(jq -r ".[$i].command" "$fx/guard-bash.json")"
  exp="$(jq -r ".[$i].expect" "$fx/guard-bash.json")"
  jq -n --arg c "$cmd" '{hook_event_name:"PreToolUse",tool_name:"Bash",tool_input:{command:$c}}' |
    bash "$hooks/guard-bash.sh" >/dev/null 2>&1
  got=$?
  want=0; [[ "$exp" == block ]] && want=2
  expect_exit "guard-bash [$exp] $cmd" "$want" "$got"
done

# guard-bash falha fechado sem jq: PATH só com o bash.
nojq="$(mktemp -d)"
ln -s "$(command -v bash)" "$nojq/bash"
echo '{"tool_input":{"command":"ls"}}' | PATH="$nojq" "$nojq/bash" "$hooks/guard-bash.sh" >/dev/null 2>&1
expect_exit "guard-bash sem jq falha fechado" 2 $?
echo 'nao-e-json' | bash "$hooks/guard-bash.sh" >/dev/null 2>&1
expect_exit "guard-bash com JSON inválido falha fechado" 2 $?
rm -rf "$nojq"

# ---------- biome.sh ----------
if [[ -x "$root/node_modules/.bin/biome" ]]; then
  work="$(mktemp -d "$root/.claude/hooks/tests/.run-XXXXXX")"
  trap 'rm -rf "$work"' EXIT
  run_biome() { # fixture -> exit; stdout em $work/out
    cp "$fx/$1" "$work/$1"
    sed "s|__FILE__|$work/$1|" "$fx/biome-input.json" |
      CLAUDE_PROJECT_DIR="$root" bash "$hooks/biome.sh" >"$work/out" 2>"$work/err"
  }
  run_biome biome-error.ts
  expect_exit "biome.sh erro -> 2" 2 $?
  grep -q noSelfAssign "$work/err" || ko "biome.sh erro sem diagnóstico no stderr"

  run_biome biome-warning.ts
  expect_exit "biome.sh aviso -> 0" 0 $?
  if jq -e '.hookSpecificOutput.additionalContext | test("noUnusedVariables")' "$work/out" >/dev/null 2>&1; then ok; else ko "biome.sh aviso sem additionalContext"; fi

  run_biome biome-format.ts
  expect_exit "biome.sh formata -> 0" 0 $?
  if grep -q 'a: 1,' "$work/biome-format.ts" && [[ ! -s "$work/out" ]]; then ok; else ko "biome.sh não formatou"; fi

  echo '{"tool_input":{"file_path":"/nao/existe.ts"}}' | bash "$hooks/biome.sh" >/dev/null 2>&1
  expect_exit "biome.sh arquivo inexistente -> 0" 0 $?
else
  ko "node_modules/.bin/biome ausente: rode pnpm install antes dos testes"
fi

# ---------- typecheck.sh (pnpm substituído por um stub) ----------
stub="$(mktemp -d)"
cat >"$stub/pnpm" <<'STUB'
#!/usr/bin/env bash
echo "$*" >>"$STUB_LOG"
[[ "${STUB_FAIL:-0}" == 1 ]] && { echo "src/x.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'."; exit 1; }
exit 0
STUB
chmod +x "$stub/pnpm"
export STUB_LOG="$stub/log"

: >"$STUB_LOG"
PATH="$stub:$PATH" CLAUDE_PROJECT_DIR="$root" bash "$hooks/typecheck.sh" <"$fx/stop-active.json" >/dev/null 2>&1
expect_exit "typecheck stop_hook_active=true -> 0" 0 $?
[[ ! -s "$STUB_LOG" ]] && ok || ko "typecheck rodou pnpm com stop_hook_active=true"

: >"$STUB_LOG"
PATH="$stub:$PATH" CLAUDE_PROJECT_DIR="$root" bash "$hooks/typecheck.sh" <"$fx/stop-inactive.json" >/dev/null 2>&1
expect_exit "typecheck sem erro -> 0" 0 $?
grep -qx 'turbo run typecheck --affected --output-logs=errors-only' "$STUB_LOG" && ok || ko "typecheck não chamou turbo --affected: $(cat "$STUB_LOG")"

STUB_FAIL=1 PATH="$stub:$PATH" CLAUDE_PROJECT_DIR="$root" bash "$hooks/typecheck.sh" <"$fx/stop-inactive.json" >/dev/null 2>"$stub/err"
expect_exit "typecheck com erro de tipo -> 2" 2 $?
grep -q TS2322 "$stub/err" && ok || ko "typecheck não devolveu o erro no stderr"
rm -rf "$stub"

# ---------- .mcp.json (T05b) ----------
mcp="$root/.mcp.json"
if grep -Eiq 'service_role|sbp_[A-Za-z0-9]|SUPABASE_ACCESS_TOKEN|Bearer|eyJhbGci' "$mcp"; then
  ko ".mcp.json contém service_role, PAT ou token"
else ok; fi
bad="$(jq -r '.mcpServers[] | .url? // empty | select(test("mcp\\.supabase\\.com")) | select((test("[?&]read_only=true(&|$)") and test("[?&]project_ref=")) | not)' "$mcp")"
[[ -z "$bad" ]] && ok || ko ".mcp.json: URL do Supabase hospedado sem read_only=true/project_ref: $bad"

echo "hooks: $pass ok, $fail falha(s)"
[[ $fail -eq 0 ]]
