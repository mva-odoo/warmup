#!/bin/bash
# Joue les jeux miroir avec l'enfant virtuel (js/vkid.js), sans webcam, et affiche un tableau des résultats.
# Usage (depuis n'importe où) :
#   tools/vkid_test.sh                       -> tous les profils × 7 jeux
#   tools/vkid_test.sh "petit pire" "potions duel"
#   tools/vkid_test.sh "1&vkid2=1 1&vkid2=petit&vkidgap=0.7" "potions"   (deux enfants : profil + réglages)
# Résultats aussi dans ~/.cache/wuq-test/vkid-<date>.txt. Il faut chromium.
cd "$(dirname "$0")/.." || exit 1
PROFILES=${1:-"1 petit grand decale biais camhaute cambasse travers bouge proche loin pire"}
GAMES=${2:-"potions neige duel mur soleil balai equilibre"}
PAR=${PAR:-3}; BUDGET=${BUDGET:-100000}; PORT=${PORT:-8765}
OUT=~/.cache/wuq-test; mkdir -p "$OUT"; RES="$OUT/vkid-$(date +%Y%m%d-%H%M).txt"
if ! ss -ltn | grep -q ":$PORT "; then (setsid python3 -m http.server "$PORT" >/dev/null 2>&1 &); sleep 3; fi
run() {
  local pf=$1 g=$2 id="vk-$1-$2-$$" t
  t=$(timeout 400 chromium --headless=new --no-sandbox --ignore-gpu-blocklist --enable-gpu --use-angle=vulkan --enable-features=Vulkan \
    --window-size=1280,720 --user-data-dir="$OUT/prof-$id" --virtual-time-budget="$BUDGET" \
    --dump-dom "http://localhost:$PORT/index.html?world=defis&step=arena&game=$g&nostory=1&vkid=$pf" 2>/dev/null | grep -o "<title>VK [^<]*" | head -1)
  rm -rf "$OUT/prof-$id"
  # ratio du jeu demandé (premier jeu joué), portée mesurée / réelle
  python3 - "$pf" "$g" "${t#<title>VK }" <<'PY'
import json, sys
pf, g, raw = sys.argv[1:]
try: d = json.loads(raw)
except Exception: print(f"{pf:9} {g:10} pas de résultat"); sys.exit()
gm = next((x for x in d.get('games', []) if x['g'] == g), None)
cal = d.get('cal') or {}
res = f"{round(gm['ratio'] * 100):3d} % en {gm['s']:3d} s" if gm else "pas fini     "
duo = d.get('duo'); dd = f"   à deux : {duo['swaps']} inversions, {duo['lost']} pertes / {duo['frames']} images" if duo else ""
print(f"{pf:9} {g:10} {res}   portée {cal.get('reachK', '-')} / {cal.get('kidArm', '-')}{dd}")
PY
}
export -f run; export OUT BUDGET PORT
for pf in $PROFILES; do for g in $GAMES; do echo "$pf $g"; done; done | xargs -P "$PAR" -L 1 bash -c 'run $0 $1' | tee "$RES"
echo "→ $RES"
