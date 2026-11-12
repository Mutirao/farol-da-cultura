#!/usr/bin/env bash
# Spike F0-10 (ADR-0002): mede rolagem de lista com `dumpsys gfxinfo`.
#
# Uso: scripts/perf/measure-scroll.sh <package> <variante: a|b> <rodadas>
#   ex.: ANDROID_SERIAL=ZF525KHQ9G scripts/perf/measure-scroll.sh br.com.farol.cultura.preview a 3
#
# Protocolo (fixado ANTES de medir; não altere entre variantes):
#   1. Fixa 60 Hz (peak_refresh_rate e min_refresh_rate = 60.0) e restaura os
#      valores originais ao sair (trap EXIT).
#   2. Aborta se a tela estiver bloqueada (isKeyguardShowing=true): não tenta desbloquear.
#   3. Por rodada: `am force-stop` (início a frio), abre a rota da variante por deep link
#      (<scheme>://spike-lista-<variante>, scheme lido de `dumpsys package`, nunca adivinhado),
#      espera RENDER_WAIT_S segundos, `dumpsys gfxinfo <pkg> reset`, 30 swipes verticais,
#      depois salva `dumpsys gfxinfo <pkg> framestats` e `dumpsys gfxinfo <pkg>` brutos.
#      O reset vem DEPOIS da renderização inicial para que os quadros de abertura a frio
#      não entrem na medição de rolagem.
#   4. Swipes: 20 para baixo (dedo de y=SWIPE_Y_LOW até y=SWIPE_Y_HIGH) e depois 10 para
#      cima (inverso), x fixo, duração SWIPE_MS, pausa SWIPE_PAUSE_S entre swipes. 20+10
#      mantém a lista rolando com reciclagem sem parar no fim dos 500 cartões.
#   5. Saída bruta: docs/adr/assets/0002/<variante>-rodada<N>.txt; resumo (extraído do
#      próprio texto do dumpsys gfxinfo) em docs/adr/assets/0002/resumo.csv.
#
# Coordenadas padrão para tela de 1080x2400 (moto g35 5G); sobrescreva por variável
# de ambiente apenas se outro aparelho for usado, e registre no ADR.
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "uso: $0 <package> <variante: a|b> <rodadas>" >&2
  exit 64
fi
PKG="$1"
VARIANT="$2"
ROUNDS="$3"
[[ "$VARIANT" =~ ^[ab]$ ]] || { echo "variante deve ser a ou b" >&2; exit 64; }
[[ "$ROUNDS" =~ ^[1-9][0-9]*$ ]] || { echo "rodadas deve ser inteiro positivo" >&2; exit 64; }

SWIPES_DOWN=20
SWIPES_UP=10
SWIPE_X="${SWIPE_X:-540}"
SWIPE_Y_LOW="${SWIPE_Y_LOW:-1900}"
SWIPE_Y_HIGH="${SWIPE_Y_HIGH:-500}"
SWIPE_MS="${SWIPE_MS:-200}"
SWIPE_PAUSE_S="${SWIPE_PAUSE_S:-0.4}"
RENDER_WAIT_S="${RENDER_WAIT_S:-5}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT/docs/adr/assets/0002"
mkdir -p "$OUT_DIR"
SUMMARY="$OUT_DIR/resumo.csv"

ADB=(adb)
[[ -n "${ANDROID_SERIAL:-}" ]] && ADB=(adb -s "$ANDROID_SERIAL")
sh_adb() { "${ADB[@]}" shell "$@" | tr -d '\r'; }

if sh_adb dumpsys window | grep -q 'isKeyguardShowing=true'; then
  echo "ABORTADO: aparelho bloqueado (isKeyguardShowing=true). Desbloqueie e rode de novo." >&2
  exit 3
fi

# Scheme real registrado pelo app: prefere o igual ao package (app.config.ts usa scheme = id).
SCHEMES="$(sh_adb dumpsys package "$PKG" | awk '
  /^ *Schemes:/ { inside = 1; next }
  inside && /^ *[A-Za-z][A-Za-z0-9.+-]*:$/ { gsub(/[ :]/, ""); print; next }
  inside && /^ *[A-Z][A-Za-z ]*:$/ { inside = 0 }
')"
if grep -qx "$PKG" <<<"$SCHEMES"; then
  SCHEME="$PKG"
else
  SCHEME="$(grep -Evx 'https?|exp\+.*' <<<"$SCHEMES" | head -n1 || true)"
fi
[[ -n "$SCHEME" ]] || { echo "nenhum scheme encontrado em dumpsys package $PKG" >&2; exit 4; }
URL="$SCHEME://spike-lista-$VARIANT"

ORIG_PEAK="$(sh_adb settings get system peak_refresh_rate)"
ORIG_MIN="$(sh_adb settings get system min_refresh_rate)"
restore_refresh() {
  for pair in "peak_refresh_rate:$ORIG_PEAK" "min_refresh_rate:$ORIG_MIN"; do
    key="${pair%%:*}"
    value="${pair#*:}"
    if [[ "$value" == "null" ]]; then
      sh_adb settings delete system "$key" >/dev/null
    else
      sh_adb settings put system "$key" "$value"
    fi
  done
}
trap restore_refresh EXIT
sh_adb settings put system peak_refresh_rate 60.0
sh_adb settings put system min_refresh_rate 60.0

[[ -f "$SUMMARY" ]] || echo "variante,rodada,total_frames,janky_frames,janky_pct,p50_ms,p90_ms,p95_ms,p99_ms,arquivo" >"$SUMMARY"

swipe() { sh_adb input swipe "$SWIPE_X" "$1" "$SWIPE_X" "$2" "$SWIPE_MS"; sleep "$SWIPE_PAUSE_S"; }

for ((round = 1; round <= ROUNDS; round++)); do
  out="$OUT_DIR/$VARIANT-rodada$round.txt"
  echo "== variante $VARIANT, rodada $round/$ROUNDS -> $out"
  sh_adb am force-stop "$PKG"
  sh_adb am start -W -a android.intent.action.VIEW -d "$URL" "$PKG" >/dev/null
  sleep "$RENDER_WAIT_S"
  sh_adb dumpsys gfxinfo "$PKG" reset >/dev/null
  for ((i = 0; i < SWIPES_DOWN; i++)); do swipe "$SWIPE_Y_LOW" "$SWIPE_Y_HIGH"; done
  for ((i = 0; i < SWIPES_UP; i++)); do swipe "$SWIPE_Y_HIGH" "$SWIPE_Y_LOW"; done
  sleep 1
  {
    echo "# measure-scroll.sh -- F0-10 / ADR-0002"
    echo "# data_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "# package: $PKG  variante: $VARIANT  rodada: $round/$ROUNDS  url: $URL"
    echo "# aparelho: $(sh_adb getprop ro.product.manufacturer) $(sh_adb getprop ro.product.model)"
    echo "# android: $(sh_adb getprop ro.build.version.release) (API $(sh_adb getprop ro.build.version.sdk))"
    echo "# build_fingerprint: $(sh_adb getprop ro.build.fingerprint)"
    echo "# app: $(sh_adb dumpsys package "$PKG" | grep -m1 -E 'versionName=' | xargs) $(sh_adb dumpsys package "$PKG" | grep -m1 -E 'versionCode=' | xargs)"
    echo "# refresh: peak=$(sh_adb settings get system peak_refresh_rate) min=$(sh_adb settings get system min_refresh_rate)"
    echo "# swipes: ${SWIPES_DOWN}x ($SWIPE_X,$SWIPE_Y_LOW)->($SWIPE_X,$SWIPE_Y_HIGH) + ${SWIPES_UP}x inverso, ${SWIPE_MS}ms, pausa ${SWIPE_PAUSE_S}s, espera inicial ${RENDER_WAIT_S}s"
    echo
    echo "######## dumpsys gfxinfo $PKG framestats ########"
    sh_adb dumpsys gfxinfo "$PKG" framestats
    echo
    echo "######## dumpsys gfxinfo $PKG ########"
    sh_adb dumpsys gfxinfo "$PKG"
  } >"$out"

  # Resumo: primeira ocorrência de cada linha na seção "dumpsys gfxinfo <pkg>" (agregado do app).
  awk -v variant="$VARIANT" -v round="$round" -v file="$(basename "$out")" '
    /^######## dumpsys gfxinfo .* ########$/ && $0 !~ /framestats/ { inside = 1; next }
    !inside { next }
    /^Total frames rendered:/ && total == "" { total = $4 }
    /^Janky frames:/ && janky == "" { janky = $3; pct = $4; gsub(/[()%]/, "", pct) }
    /^50th percentile:/ && p50 == "" { p50 = $3; sub(/ms$/, "", p50) }
    /^90th percentile:/ && p90 == "" { p90 = $3; sub(/ms$/, "", p90) }
    /^95th percentile:/ && p95 == "" { p95 = $3; sub(/ms$/, "", p95) }
    /^99th percentile:/ && p99 == "" { p99 = $3; sub(/ms$/, "", p99) }
    END { printf "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n", variant, round, total, janky, pct, p50, p90, p95, p99, file }
  ' "$out" | tee -a "$SUMMARY"
done
