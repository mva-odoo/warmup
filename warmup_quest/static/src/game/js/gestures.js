// Choisir avec les mouvements : la main levée de l'enfant déplace une petite main à l'écran ;
// on la garde sur un bouton (ou un monde, une vignette…) pendant 1,5 s et il s'active tout seul.
// Marche dans le menu, la carte, le carnet, la chambre, la fenêtre « Mon dresseur » et l'écran de fin.

const GESTURE_DWELL = 1500;   // temps à rester sur un bouton pour le choisir (ms)
const GESTURE_TARGETS = 'button:not([disabled]), .worldCard, [role="button"], .trTile:not(.locked), .trPiece, .trSwatch, .starterCard, a.btn, .gTarget';

const Gestures = {
  on: false,
  x: 0, y: 0, seen: false,
  target: null, since: 0, cooldown: 0,
  el: null,

  // Petite main lumineuse + anneau qui se remplit
  ensureCursor() {
    if (this.el) return;
    const el = document.createElement('div');
    el.id = 'gCursor';
    el.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="gTrack"/><circle cx="50" cy="50" r="44" class="gFill"/></svg><span>🖐️</span>`;
    document.body.appendChild(el);
    this.el = el;
  },

  // Active les gestes (allume la caméra si besoin). progress : texte de chargement (optionnel)
  async enable(progress = () => {}) {
    this.ensureCursor();
    this.on = true;
    store('gestures', true);
    tracker.setPlayers(1);
    if (!tracker.sim && !tracker.landmarker) {
      try { await tracker.start(video, progress); } catch (e) {
        console.warn(e);
        this.disable();
        Audio8.say('La caméra ne marche pas. Demande à un grand !');
        return false;
      }
    }
    document.body.classList.add('gestures');
    return true;
  },

  disable() {
    this.on = false;
    store('gestures', false);
    document.body.classList.remove('gestures');
    if (this.el) this.el.classList.remove('show');
    this.clearTarget();
  },

  clearTarget() {
    if (this.target) this.target.classList.remove('gHover');
    this.target = null; this.since = 0;
    if (this.el) this.el.style.setProperty('--p', 0);
  },

  // Position de la main à l'écran : la main la plus haute, en miroir ; épaules = milieu de l'écran,
  // bras tendu = bord de l'écran. Sans main levée (sous la taille), pas de curseur.
  handPoint() {
    const fake = typeof DEV !== 'undefined' && DEV.get('gpoint'); // (mode test) gpoint=0.5,0.4
    if (fake) { const [fx, fy] = fake.split(',').map(Number); return { x: fx * innerWidth, y: fy * innerHeight }; }
    const b = tracker.bodies[0];
    if (!b || !b.lm || !b.T || !b.state.present) return null;
    const lm = b.lm, sh = mid(lm[11], lm[12]), T = b.T;
    const vis = (i) => (lm[i].visibility ?? 1) > 0.4;
    const hands = [15, 16].filter(vis).map((i) => lm[i]).filter((w) => w.y < sh.y + T * 0.75);
    if (!hands.length) return null;
    const w = hands.reduce((a, h) => (h.y < a.y ? h : a));
    const u = Math.max(-1, Math.min(1, -(w.x - sh.x) / (T * 1.35)));
    const v = Math.max(0, Math.min(1, (w.y - (sh.y - T * 1.1)) / (T * 1.6)));
    return { x: innerWidth / 2 + u * innerWidth * 0.5, y: v * innerHeight };
  },

  update(now) {
    if (!this.on || !this.el) return;
    const p = this.handPoint();
    if (!p) { this.el.classList.remove('show'); this.clearTarget(); this.seen = false; return; }
    // (lissage : la petite main ne tremble pas)
    if (!this.seen) { this.x = p.x; this.y = p.y; this.seen = true; }
    this.x += (p.x - this.x) * 0.35; this.y += (p.y - this.y) * 0.35;
    this.el.classList.add('show');
    this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
    if (now < this.cooldown) return;
    this.el.style.visibility = 'hidden';
    const under = document.elementFromPoint(this.x, this.y);
    this.el.style.visibility = '';
    const t = under && under.closest(GESTURE_TARGETS);
    const ok = t && t.offsetParent !== null && !t.closest('.hidden');
    if (!ok) { this.clearTarget(); return; }
    if (t !== this.target) {
      this.clearTarget();
      this.target = t; this.since = now;
      t.classList.add('gHover');
      Audio8.tick();
    }
    const k = Math.min(1, (now - this.since) / GESTURE_DWELL);
    this.el.style.setProperty('--p', k);
    if (k >= 1) {
      const el = this.target;
      this.clearTarget();
      this.cooldown = now + 900;
      Audio8.pop();
      el.classList.add('gClicked'); setTimeout(() => el.classList.remove('gClicked'), 400);
      el.click();
    }
  },

  // ---------- Tuto : apprendre à choisir avec la main (trois cibles l'une après l'autre)
  tutorial() {
    return new Promise((resolve) => {
      if (document.getElementById('gTuto')) return resolve();
      const bg = document.createElement('div');
      bg.id = 'gTuto';
      bg.className = 'gTutoBg';
      bg.innerHTML = `<div class="gTutoTop"><h2>🖐️ Choisis avec ta main !</h2><p class="gTutoSay"></p></div>
        <div class="gTutoDemo"><canvas width="260" height="200"></canvas></div><div class="gTutoArea"></div>
        <button class="btn ghost gTutoSkip">✖</button>`;
      document.body.appendChild(bg);
      const area = bg.querySelector('.gTutoArea'), say = bg.querySelector('.gTutoSay');
      const demo = bg.querySelector('.gTutoDemo canvas').getContext('2d');
      const STEPS = [
        { icon: '⭐', x: 0.5, y: 0.5, text: 'Lève une main bien haut. Tu vois la petite main sur l\'écran ? Elle bouge comme ta main ! Pose-la sur l\'étoile, et ne bouge plus.' },
        { icon: '🍎', x: 0.2, y: 0.45, text: 'Super ! Maintenant, va chercher la pomme, de l\'autre côté. Garde ta main dessus jusqu\'à ce que le rond soit plein.' },
        { icon: '🎈', x: 0.8, y: 0.3, text: 'Bravo ! Et le ballon, tout en haut ! Lève bien ton bras.' },
      ];
      let i = -1, raf = 0;
      const close = () => { cancelAnimationFrame(raf); bg.remove(); resolve(); };
      const next = () => {
        i++;
        area.innerHTML = '';
        if (i >= STEPS.length) {
          say.textContent = 'Tu sais tout choisir avec ta main ! 🎉';
          Audio8.perfect();
          Audio8.say('Génial ! Maintenant, tu sais tout choisir avec ta main : les mondes, ton dresseur, rejouer… Garde ta main sur ce que tu veux !', { slow: true });
          setTimeout(close, 6500);
          return;
        }
        const st = STEPS[i];
        say.textContent = st.text;
        Audio8.say(st.text, { slow: true });
        const b = document.createElement('div');
        b.className = 'gTarget gTutoTarget';
        b.setAttribute('role', 'button');
        b.textContent = st.icon;
        b.style.left = st.x * 100 + '%'; b.style.top = st.y * 100 + '%';
        b.onclick = () => { scene.burst(innerWidth * st.x, innerHeight * st.y, 30, ['#ffd166', '#ffffff', '#4ade80']); Audio8.good(); setTimeout(next, 700); };
        area.appendChild(b);
      };
      // Petit bonhomme qui montre : bras levé, la main va sur la cible et reste
      const anim = (t) => {
        if (!bg.isConnected) return;
        const k = (t % 3000) / 3000, a = 1.6 + Math.min(1, k * 2) * 1.2;
        demo.clearRect(0, 0, 260, 200);
        demo.font = '40px serif'; demo.textAlign = 'center'; demo.fillText(STEPS[Math.max(0, Math.min(i, 2))].icon, 205, 50);
        stickFigure(demo, { x: 110, y: 190, s: 170, armL: 0.4, armR: a }, '#16a34a');
        if (k > 0.5) { demo.strokeStyle = '#22c55e'; demo.lineWidth = 6; demo.beginPath(); demo.arc(205, 38, 30, -Math.PI / 2, -Math.PI / 2 + (k - 0.5) * 2 * Math.PI * 2); demo.stroke(); }
        raf = requestAnimationFrame(anim);
      };
      raf = requestAnimationFrame(anim);
      bg.querySelector('.gTutoSkip').onclick = close;
      next();
    });
  },
};
