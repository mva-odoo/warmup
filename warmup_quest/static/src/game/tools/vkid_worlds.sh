#!/bin/bash
# Joue des mondes entiers avec l'enfant virtuel (js/vkid.js) et donne, pour chacun, la note de chaque épreuve.
# Usage : tools/vkid_worlds.sh                     -> tous les mondes, enfant normal
#         tools/vkid_worlds.sh "verger dojo" pire   -> ces mondes, profil « pire »
cd "$(dirname "$0")/.." || exit 1
WORLDS_L=${1:-"ecole jardin3d disco dojo verger rythmo singes supermarche turbo island forest banquise ocean espace bonbons ferme dinos chateau sortileges stade defis"}
PF=${2:-1}; PAR=${PAR:-3}; PORT=${PORT:-8765}
OUT=~/.cache/wuq-test; mkdir -p "$OUT"; RES="$OUT/worlds-$(date +%Y%m%d-%H%M).txt"
# (serveur lancé par ce script : arrêté à la fin ; s'il tournait déjà, on le laisse)
if ! ss -ltn | grep -q ":$PORT "; then setsid python3 -m http.server "$PORT" >/dev/null 2>&1 & SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT; fi
# (le serveur peut mettre plusieurs secondes à démarrer : on attend qu'il réponde, sinon les premiers essais échouent)
for _ in $(seq 1 60); do curl -s -o /dev/null "http://localhost:$PORT/index.html" && break; sleep 0.5; done
run() {
  local w=$1 pf=$2 id="vw-$1-$$" t
  t=$(timeout 1100 chromium --headless=new --no-sandbox --ignore-gpu-blocklist --enable-gpu --use-angle=vulkan --enable-features=Vulkan \
    --window-size=1280,720 --user-data-dir="$OUT/prof-$id" --virtual-time-budget=${WBUDGET:-650000} --enable-logging=stderr --v=0 \
    --dump-dom "http://localhost:$PORT/index.html?world=$w&nostory=1&nofork=1&vkid=$pf&vkidsteps=1" 2>"$OUT/err-$id.txt" | grep -o "<title>VK [^<]*" | head -1)
  local err; err=$(grep -o "Uncaught [^\"]*" "$OUT/err-$id.txt" | sort -u | head -2 | tr '\n' ' ')
  rm -rf "$OUT/prof-$id" "$OUT/err-$id.txt"
  python3 - "$w" "${t#<title>VK }" "$err" <<'PY'
import json, sys
w, raw, err = sys.argv[1:]
try: d = json.loads(raw)
except Exception: print(f"{w:12} pas de résultat {err}"); sys.exit()
steps = d.get('steps') or []; games = d.get('games') or []
bad = [s for s in steps if s.endswith(':miss') or s.endswith(':ok')] + [f"{g['g']}:{round(g['ratio']*100)}%" for g in games if g['ratio'] < 1]
fin = 'fini' if d.get('phase') == 'results' else 'PAS FINI (' + str(d.get('phase')) + ')'
print(f"{w:12} {fin:8} {len(steps):2} épreuves, {len(games)} jeux · à revoir : {', '.join(bad) or 'rien'} {err}")
PY
}
export -f run; export OUT PORT WBUDGET
for w in $WORLDS_L; do echo "$w $PF"; done | xargs -P "$PAR" -L 1 bash -c 'run $0 $1' | tee "$RES"
echo "→ $RES"
