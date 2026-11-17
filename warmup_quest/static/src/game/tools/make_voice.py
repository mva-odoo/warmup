"""Fabrique la voix naturelle du jeu (développement, pas utilisé par Odoo).

1. relève les phrases écrites telles quelles dans le code (Audio8.say(...), consignes du calibrage, tuto des gestes) ;
2. ouvre tools/voicelist.html avec Chrome sans fenêtre : toutes les phrases du jeu, découpées en morceaux, avec leur clé
   -> voice/phrases.json (liste aussi utilisée par le studio voix) ;
3. synthétise chaque morceau manquant avec Piper -> voice/piper/<clé>.ogg et voice/piper/keys.json.

Usage (serveur local lancé dans static/src/game : python3 -m http.server 8765) :
  python -I make_voice.py --model fr_FR-siwis-medium.onnx --chrome "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
  (Linux : --chrome /usr/bin/chromium)
Dépendances : pip install piper-tts soundfile numpy ; voix : https://huggingface.co/rhasspy/piper-voices (fr_FR siwis, CC-BY 4.0).
"""
import argparse
import html
import json
import re
import subprocess
import tempfile
import time
from pathlib import Path

GAME = Path(__file__).resolve().parent.parent
JS = GAME / 'js'
VOICE = GAME / 'voice'
BRAVO = re.compile(r'^(Bravo|Super|Génial|Trop|Incroyable|Waouh|Tope|Youpi|Magnifique|Excellent|Parfait|Bien joué)', re.I)


def call_args(src, start):
    """Arguments (texte brut) d'un appel dont la parenthèse ouvrante est à start."""
    depth, i, cur, args, quote = 0, start, '', [], None
    while i < len(src):
        ch = src[i]
        if quote:
            cur += ch
            if ch == '\\':
                cur += src[i + 1]; i += 1
            elif ch == quote:
                quote = None
        elif ch in '\'"`':
            quote = ch; cur += ch
        elif ch in '([{':
            depth += 1
            if depth > 1:
                cur += ch
        elif ch in ')]}':
            depth -= 1
            if depth == 0:
                args.append(cur); return args
            cur += ch
        elif ch == ',' and depth == 1:
            args.append(cur); cur = ''
        else:
            cur += ch
        i += 1
    return args


LIT = re.compile(r"'((?:\\.|[^'\\])*)'|\"((?:\\.|[^\"\\])*)\"|`((?:\\.|[^`\\$])*)`")


def literals(text):
    out = []
    for m in LIT.finditer(text):
        s = next(g for g in m.groups() if g is not None)
        s = s.replace("\\'", "'").replace('\\"', '"').replace('\\n', ' ')
        if re.search(r'[A-Za-zÀ-ÿ]', s) and len(s) > 1:
            out.append(s)
    return out


def scan():
    found = []
    for f in sorted(JS.glob('*.js')):
        src = f.read_text(encoding='utf-8')
        for m in re.finditer(r'\bsay\(', src):
            a = call_args(src, m.end() - 1)
            if a:
                found += literals(a[0])
        for m in re.finditer(r'\bsetCalibStage\(', src):
            a = call_args(src, m.end() - 1)
            if len(a) >= 4 and not a[0].strip().startswith('stage'):
                found += literals(a[3])
        if f.name == 'gestures.js':
            found += [s for s in re.findall(r"text: '((?:\\.|[^'\\])*)'", src)]
    found = [s.replace("\\'", "'") for s in found]
    seen, out = set(), []
    for s in found:
        if s in seen or s in ('fr-FR', ' '):
            continue
        seen.add(s)
        out.append([s, 'bravo' if BRAVO.match(s) else 'jeu', bool(BRAVO.match(s))])
    return out


def phrase_list(chrome, url):
    stamp = int(time.time() * 1000)
    # (Chrome de Windows lancé depuis WSL : profil dans un dossier Windows ; sinon un dossier temporaire)
    prof = r'C:\Users\Public\wuq_voicelist_' + str(stamp) if chrome.lower().endswith('.exe') else tempfile.mkdtemp(prefix='wuq_voicelist_')
    res = subprocess.run([chrome, '--headless=new', '--no-sandbox', f'--user-data-dir={prof}', '--virtual-time-budget=8000', '--dump-dom',
                          f'{url}/tools/voicelist.html?n={stamp}'], capture_output=True, text=True, encoding='utf-8', timeout=120)
    m = re.search(r'<pre id="out">(.*?)</pre>', res.stdout, re.S)
    if not m or m.group(1).startswith('ERREUR') or m.group(1) == '…':
        raise SystemExit('Liste des phrases introuvable : ' + (m.group(1)[:200] if m else res.stdout[-300:]))
    return json.loads(html.unescape(m.group(1)))


def synth(model, phrases, length_scale):
    import numpy as np
    import soundfile as sf
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(model)
    cfg = SynthesisConfig(length_scale=length_scale, noise_scale=0.62, noise_w_scale=0.8)
    out = VOICE / 'piper'
    out.mkdir(parents=True, exist_ok=True)
    keys = {p['k'] for p in phrases}
    for old in out.glob('*.ogg'):  # morceaux qui n'existent plus dans le jeu
        if old.stem not in keys:
            old.unlink()
    made = 0
    for p in phrases:
        dest = out / (p['k'] + '.ogg')
        if dest.exists():
            continue
        text = re.sub(r'[\U0001F000-\U0001FFFF\u2600-\u27BF\uFE0F]', '', p['t']).strip()
        chunks = list(voice.synthesize(text, syn_config=cfg))
        if not chunks:
            continue
        audio = np.concatenate([c.audio_float_array for c in chunks])
        sf.write(dest, audio, chunks[0].sample_rate, format='OGG', subtype='VORBIS', compression_level=0.6)
        made += 1
    (out / 'keys.json').write_text(json.dumps(sorted(k for k in keys if (out / (k + '.ogg')).exists())), encoding='utf-8')
    return made


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--chrome', required=True)
    ap.add_argument('--url', default='http://localhost:8765')
    ap.add_argument('--length-scale', type=float, default=1.05)
    ap.add_argument('--list-only', action='store_true')
    a = ap.parse_args()
    lits = scan()
    (GAME / 'tools' / 'literals.json').write_text(json.dumps(lits, ensure_ascii=False, indent=0), encoding='utf-8')
    phrases = phrase_list(a.chrome, a.url)
    VOICE.mkdir(exist_ok=True)
    (VOICE / 'phrases.json').write_text(json.dumps(phrases, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{len(lits)} phrases relevées dans le code, {len(phrases)} morceaux au total')
    if not a.list_only:
        print(f'{synth(a.model, phrases, a.length_scale)} morceaux synthétisés')


if __name__ == '__main__':
    main()
