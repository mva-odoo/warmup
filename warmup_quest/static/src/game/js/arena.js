// Jeux miroir (étape « arena ») : une scène fixe, comme les jeux de console à caméra. L'enfant se voit en grand (image de
// la caméra, en miroir, avec un chapeau de sorcier et des mains lumineuses) et la magie se dessine autour de lui : murs à
// traverser, Nuage Grognon qui se retourne, bonshommes de neige, chaudron… Quand il touche un objet avec sa vraie main,
// il le touche à l'écran : rien à viser. La course de balais a son propre décor (ciel, anneaux).
// Sans caméra (mode clavier), un petit sorcier dessiné remplace l'image et suit les touches.
// La partie (game.js) appelle begin / update / end ; les règles et les textes sont dans worlds.js (ARENA).

// Pose « debout, bras le long du corps », accroupi, et pas de côté (en longueurs de torse depuis le milieu des épaules ;
// x positif = côté gauche du joueur, qui est aussi la gauche de l'écran dans le miroir)
const AR_STAND = { ...TARGET_BODY, ...STRAIGHT_LEGS, eL: [0.45, 0.5], wL: [0.5, 1.0], eR: [-0.45, 0.5], wR: [-0.5, 1.0] };
const AR_SQUAT = { sL: [0.35, 0.6], sR: [-0.35, 0.6], hL: [0.3, 1.45], hR: [-0.3, 1.45], kL: [0.6, 1.95], aL: [0.4, 2.8], kR: [-0.6, 1.95], aR: [-0.4, 2.8],
  eL: [0.6, 1.0], wL: [0.4, 1.35], eR: [-0.6, 1.0], wR: [-0.4, 1.35] };
const AR_SHAPES = { ...TARGET_POSES, stand: AR_STAND, squat: AR_SQUAT,
  left: Object.fromEntries(Object.entries(AR_STAND).map(([k, [x, y]]) => [k, [x + 1.2, y]])),
  right: Object.fromEntries(Object.entries(AR_STAND).map(([k, [x, y]]) => [k, [x - 1.2, y]])) };
const AR_HEAD = (shape) => (shape === AR_SQUAT ? [0, 0.15] : [0, -0.45]);
const AR_POSE_NAMES = { armsUp: 'les bras en l\'air', airplane: 'l\'avion', star: 'l\'étoile', flamingo: 'sur un pied', squat: 'accroupi', left: 'à gauche', right: 'à droite' };
const AR_INGREDIENTS = [['🍄', 'Champignon'], ['🌸', 'Fleur'], ['💧', 'Rosée'], ['⭐', 'Poussière d\'étoile'], ['🍓', 'Baie'], ['🪶', 'Plume'], ['🌙', 'Clair de lune']];

class Arena {
  constructor() {
    this.cv = document.getElementById('arena');
    this.ctx = this.cv.getContext('2d');
    this.s = null; this.ev = []; this.fx = [];
    this.off = document.createElement('canvas'); // (mur : on y découpe le trou)
    addEventListener('resize', () => this.resize());
  }
  get on() { return !!this.s; }
  resize() {
    const d = Math.min(1.5, devicePixelRatio || 1);
    this.W = Math.round(innerWidth * d); this.H = Math.round(innerHeight * d);
    if (this.cv.width !== this.W || this.cv.height !== this.H) { this.cv.width = this.W; this.cv.height = this.H; }
  }

  // ---------- Cycle de vie (appelé par la partie)
  begin(s, game, c) {
    this.s = s; this.g = game; this.c = c; this.ev = []; this.fx = []; this.st = { n: s.n, done: 0, ok: 0 };
    this.t0 = performance.now(); this.lastT = this.t0; this.saidAt = {};
    this.auto = tracker.sim && (DEV.get('fakelimbs') || DEV.get('sportauto')); // (mode test : un enfant imaginaire joue)
    this.resize();
    // En 3D quand le jeu est en 3D (décor et petit sorcier qui imite l'enfant), sinon la version dessinée
    this.v3 = null; this.B = null;
    try {
      if (typeof Arena3D !== 'undefined' && typeof scene3d !== 'undefined' && scene === scene3d && Arena3D.can(scene3d) && !DEV.get('arena2d')) {
        this.a3 = this.a3 || new Arena3D(scene3d);
        if (this.a3.begin(this)) this.v3 = this.a3; else this.a3.end();
      }
    } catch (e) { console.warn('Jeu miroir 3D indisponible', e); this.v3 = null; }
    // Entrée en scène (3D) : la caméra survole le décor, le titre du jeu, puis 3, 2, 1… (le chrono de l'épreuve attend)
    this.intro = null; this.outro = null;
    if (this.v3 && !DEV.get('nointro')) {
      const dur = 3300; this.intro = { t0: this.t0, dur, n: -1 };
      if (c) { c.start = (c.start || this.t0) + dur; c.end = (c.end || this.t0) + dur; }
      document.body.classList.add('arenaIntro');
      // Première fois : « attrape les étoiles » pour mesurer jusqu'où l'enfant tend les bras (sa portée), avant le titre
      const b0 = tracker.lead();
      if (b0 && !b0.reachK && !DEV.get('nocal')) { this.cal = { t0: this.t0, i: 0, on: 0, best: 0, vals: [], st: this.t0 }; Audio8.say('Échauffement magique ! Tends bien ton bras pour attraper l\'étoile !', { interrupt: true }); }
      else { Audio8.whoosh(); setTimeout(() => this.intro && Audio8.sting(), 250); }
    }
    this.cv.classList.remove('hidden'); document.body.classList.add('arenaOn');
    const init = this['init_' + s.game]; if (init) init.call(this, this.st, this.t0);
  }
  end() { if (this.v3) { this.v3.end(); this.v3 = null; } this.s = null; this.intro = null; this.outro = null; this.cal = null; document.body.classList.remove('arenaIntro'); this.cv.classList.add('hidden'); document.body.classList.remove('arenaOn'); this.fx = []; }
  // Pause : toutes les échéances du jeu sont décalées (murs, ordres, bonshommes, anneaux…)
  shift(d) {
    const keys = new Set(['t0', 'at', 'until', 'next', 'count', 'nextBurst', 'burst', 'nextGust', 'gust', 'hit', 'gone', 't', 'wob', 'autoT', 'oops', 'dizzy', 'hurt', 'bolt', 'poof', 'flash', 'detT']);
    const walk = (o, depth) => { if (!o || typeof o !== 'object' || depth > 3) return; for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'number' && keys.has(k) && v > 1000) o[k] = v + d; else if (typeof v === 'object') walk(v, depth + 1); } };
    walk(this.st, 0); this.lastT += d;
    if (this.intro) this.intro.t0 += d; if (this.outro) this.outro.t0 += d; if (this.cal) { this.cal.t0 += d; this.cal.st += d; } if (this.v3) this.v3.shift(d);
  }
  ratio() { const st = this.st; if (!st) return 0; return st.ratio != null ? st.ratio : st.ok / Math.max(1, st.n); }
  detail() {
    const s = this.s, st = this.st; if (!s) return '';
    const icon = ARENA[s.game].icon;
    if (s.game === 'soleil' || s.game === 'corde') return `<div class="runCount">${icon} <b>${Math.round(this.ratio() * 100)} %</b></div>`;
    if (s.game === 'equilibre') return `<div class="runCount">${icon} <b>${Math.floor(st.held || 0)}</b> / ${s.n} s</div>`;
    if (s.game === 'duel') return `<div class="runCount">⚡ Grimaud : ${'💜'.repeat(Math.max(0, st.hp ?? s.n))}${'🤍'.repeat(Math.max(0, s.n - (st.hp ?? s.n)))}</div>`;
    return `<div class="runCount">${icon} <b>${st.ok}</b> / ${s.n}</div>`;
  }
  say(t, cool = 2500) { const now = performance.now(); if (now - (this.saidAt[t] || -1e9) < cool) return; this.saidAt[t] = now; Audio8.say(t); }
  win(points, text, x, y) {
    this.st.ok++; this.g.add(this.g.pts(points), text || '+' + this.g.pts(points)); Audio8.good();
    if (x != null) this.burst(x, y, 30);
    if (this.v3) this.v3.react('win');
    ui.setDetail(this.g.detail(this.c));
  }
  finish(ratio = this.ratio()) {
    this.st.ratio = ratio; this.st.over = true;
    if (!this.v3) { this.g.arenaEnd(ratio); return; }
    // (3D) célébration : le sorcier saute de joie, confettis, étoiles… puis la partie passe à la suite
    const now = performance.now(); this.outro = { t0: now, ratio, sent: false };
    if (this.c) this.c.end = Math.max(this.c.end || 0, now + 3000);
    if (ratio >= 0.5) { Audio8.tada(); this.say(ratio >= 0.85 ? 'Champion !' : 'Bravo !', 0); } else { Audio8.soft(); this.say('Presque ! La prochaine fois !', 0); }
  }
  stars(r) { return r >= 0.85 ? 3 : r >= 0.5 ? 2 : 1; } // (la partie note l'épreuve et passe à la suite)

  // ---------- Le corps de l'enfant, en pixels de l'écran (miroir), ou celui du petit sorcier dessiné (mode clavier)
  body(now) {
    const b = tracker.lead(), W = this.W, H = this.H, video = document.getElementById('video');
    const st = { ...(this.fake || {}) }, base = tracker.state;
    for (const k of ['armsUp', 'airplane', 'star', 'starArms', 'flamingo', 'squat', 'handsTogether', 'present']) if (st[k] == null) st[k] = !!base[k];
    if (st.side == null) st.side = base.side || 'center';
    const real = !tracker.sim && b && b.lm && b.state.present && video && video.videoWidth;
    if (real) {
      const vw = video.videoWidth, vh = video.videoHeight, k = Math.max(W / vw, H / vh), dw = vw * k, dh = vh * k, ox = (W - dw) / 2, oy = (H - dh) / 2;
      const P = (i) => ({ x: W - (ox + b.lm[i].x * dw), y: oy + b.lm[i].y * dh, v: b.lm[i].visibility ?? 1 });
      const J = { nose: P(0), sL: P(11), sR: P(12), eL: P(13), eR: P(14), wL: P(15), wR: P(16), hL: P(23), hR: P(24), kL: P(25), kR: P(26), aL: P(27), aR: P(28) };
      const hand = (w, i1, i2) => { const a = P(i1), c = P(i2); return { x: (w.x * 2 + a.x + c.x) / 4, y: (w.y * 2 + a.y + c.y) / 4 }; };
      J.handL = hand(J.wL, 17, 19); J.handR = hand(J.wR, 18, 20);
      const sh = { x: (J.sL.x + J.sR.x) / 2, y: (J.sL.y + J.sR.y) / 2 };
      return { J, sh, T: (b.T || 0.25) * dh, st, motion: b.motion || 0, real: true, video: { ox, oy, dw, dh } };
    }
    if (this.v3) return this.v3.body(this, now, st); // (3D : le petit sorcier du jeu imite l'enfant ; on touche avec SES mains)
    // Petit sorcier dessiné : forme selon les touches (ou l'enfant imaginaire), petit saut, bras qui tapent
    const T = H * 0.15, jump = this.lastJump && now - this.lastJump < 450 ? Math.sin(((now - this.lastJump) / 450) * Math.PI) * T * 0.6 : 0;
    const G = this.simShape(now, st), shape = this.simShapeName(st);
    const cx = W / 2 - (st.side === 'left' ? -1 : st.side === 'right' ? 1 : 0) * T * 1.3, cy = H * 0.5 - jump;
    const J = {};
    for (const [k, [x, y]] of Object.entries(G)) J[k] = { x: cx - x * T, y: cy + y * T, v: 1 };
    const hd = AR_HEAD(AR_SHAPES[shape]); J.nose = { x: cx - hd[0] * T, y: cy + (hd[1] + 0.05) * T, v: 1 };
    J.handL = J.wL; J.handR = J.wR;
    return { J, sh: { x: (J.sL.x + J.sR.x) / 2, y: (J.sL.y + J.sR.y) / 2 }, T, st, motion: st.wave ? 0.08 : 0, real: false };
  }
  simShapeName(st) { return st.squat ? 'squat' : st.armsUp ? 'armsUp' : st.airplane ? 'airplane' : st.star ? 'star' : st.flamingo ? 'flamingo' : 'stand'; }
  // Forme du petit sorcier au clavier (en longueurs de torse ; x positif = gauche de l'écran, y vers le bas)
  simShape(now, st) {
    const G = { ...AR_SHAPES[this.simShapeName(st)] };
    if (st.handsTogether) { G.eL = [0.35, 0.55]; G.wL = [0.05, 0.5]; G.eR = [-0.35, 0.55]; G.wR = [-0.05, 0.5]; }
    if (this.lastSmash && now - this.lastSmash < 350) { const q = (now - this.lastSmash) / 350; G.wL = [0.5, -1 + q * 2]; G.wR = [-0.5, -1 + q * 2]; G.eL = [0.5, -0.4 + q]; G.eR = [-0.5, -0.4 + q]; }
    if (st.wave) { const a = Math.sin(now / 90); G.wL = [0.6, 0.2 + a * 0.6]; G.wR = [-0.6, 0.2 - a * 0.6]; } // (court sur place / tire la corde)
    if (st.stirAng != null) { G.wR = [-0.2 + Math.cos(st.stirAng) * 0.55, 0.9 + Math.sin(st.stirAng) * 0.4]; G.eR = [-0.4, 0.55]; }
    return G;
  }
  hands(B) { return [B.J.handL, B.J.handR].filter((h) => h && (h.v == null || h.v > 0.3)); }
  touching(B, x, y, r) { const rr = this.v3 ? r * 1.25 : r; return this.hands(B).some((h) => Math.hypot(h.x - x, h.y - y) < rr); } // (3D : un peu plus généreux)
  // Pose demandée tenue ? (étoile : les bras suffisent quand on ne voit pas les jambes)
  poseOk(B, p) {
    const st = B.st;
    if (p === 'left' || p === 'right') return st.side === p;
    if (p === 'star') return st.star || (tracker.mode === 'upper' && st.starArms);
    return !!st[p];
  }

  // ---------- Boucle
  update(now) {
    if (DEV.get('a3state')) document.title = 'AS ' + JSON.stringify({ on: !!this.s, g: this.s && this.s.game, cal: this.cal && this.cal.i, intro: !!this.intro, outro: !!this.outro, over: this.st && this.st.over, ok: this.st && this.st.ok, phase, reach: tracker.lead() && tracker.lead().reachK });
    if (!this.s) return;
    if (this.outro) { // célébration de fin (3D)
      this.ev.splice(0); this.B = this.body(now);
      if (!this.outro.sent && now - this.outro.t0 > 2300) { this.outro.sent = true; this.g.arenaEnd(this.outro.ratio); }
      return;
    }
    if (this.st.over) return;
    if (this.cal) { this.updateCal(now); return; }
    if (this.intro) { // entrée en scène : le sorcier imite déjà l'enfant, les règles attendent
      const it = this.intro, k = now - it.t0, n = k < 1400 ? -1 : Math.min(3, Math.floor((k - 1400) / 600));
      if (n !== it.n) { it.n = n; if (n >= 0 && n < 3) Audio8.tick(); else if (n === 3) Audio8.go(); }
      this.ev.splice(0); this.B = this.body(now);
      if (k < it.dur) { this.lastT = now; return; }
      this.shift(it.dur); this.intro = null; this.introEnd = now; this.lastT = now; document.body.classList.remove('arenaIntro');
    }
    const dt = Math.min(100, now - this.lastT) / 1000; this.lastT = now;
    const evs = this.ev.splice(0);
    for (const e of evs) { if (e === 'jump') this.lastJump = now; if (e === 'smash') this.lastSmash = now; }
    if (this.auto) this.autoPlay(now, evs);
    this.evs = evs;
    this.B = this.body(now);
    this.assist(now);
    const up = this['up_' + this.s.game]; if (up) up.call(this, this.st, now, dt, this.B, evs);
  }
  has(evs, ...k) { return evs.some((e) => k.includes(e)); }

  render(now) {
    if (!this.s) return;
    const ctx = this.ctx, W = this.W, H = this.H;
    if (!this.B) this.B = this.body(now);
    const B = this.B;
    if (this.v3) { // 3D : la scène est dessinée par le moteur du jeu ; ici, seulement les textes et les étincelles
      this.v3.render(this, now);
      ctx.clearRect(0, 0, W, H); ctx.save();
      if (this.cal) this.hudCal(now);
      else if (this.intro) this.hudIntro(now);
      else if (this.outro) this.hudOutro(now);
      else { const hud = this['hud_' + this.s.game]; if (hud) hud.call(this, this.st, now, B); if (this.introEnd && now - this.introEnd < 700) this.hudGo(now - this.introEnd); }
      this.drawFx(now); ctx.restore(); return;
    }
    ctx.save();
    if (this.s.game === 'balai') this.drawSky(now);
    else this.drawMirror(now, B);
    const dr = this['draw_' + this.s.game]; if (dr) dr.call(this, this.st, now, B);
    this.drawFx(now);
    ctx.restore();
  }

  // Le miroir : l'image de la caméra (ou la salle de l'Académie), le petit sorcier, son chapeau, ses mains lumineuses
  drawMirror(now, B) {
    const ctx = this.ctx, W = this.W, H = this.H, video = document.getElementById('video');
    if (B.real) {
      const v = B.video;
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(video, v.ox, v.oy, v.dw, v.dh); ctx.restore();
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(60,40,140,.35)'); g.addColorStop(1, 'rgba(20,10,60,.25)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else { // salle de l'Académie : murs de pierre, fenêtres, lumière douce
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b2350'); g.addColorStop(0.7, '#5b4e8c'); g.addColorStop(0.7, '#7b5e57'); g.addColorStop(1, '#4e342e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,240,180,.18)';
      for (const x of [0.12, 0.88]) { ctx.beginPath(); ctx.moveTo(W * x - W * 0.05, H * 0.55); ctx.lineTo(W * x - W * 0.05, H * 0.22); ctx.arc(W * x, H * 0.22, W * 0.05, Math.PI, 0); ctx.lineTo(W * x + W * 0.05, H * 0.55); ctx.fill(); }
      this.drawKid(B, now);
    }
    // vignette douce sur les bords
    const r = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(10,5,40,.55)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    this.drawHat(B, now);
    for (const h of this.hands(B)) this.glow(h.x, h.y, B.T * 0.28, '#ffd166', now);
  }
  drawKid(B, now) {
    const ctx = this.ctx, J = B.J, T = B.T;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const line = (a, b, w, col) => { if (!J[a] || !J[b]) return; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(J[a].x, J[a].y); ctx.lineTo(J[b].x, J[b].y); ctx.stroke(); };
    for (const [a, b] of [['hL', 'kL'], ['kL', 'aL'], ['hR', 'kR'], ['kR', 'aR']]) line(a, b, T * 0.2, '#1e1b4b');
    ctx.fillStyle = '#3a86ff'; ctx.beginPath(); ctx.moveTo(J.sL.x, J.sL.y); ctx.lineTo(J.sR.x, J.sR.y); ctx.lineTo(J.hR.x - T * 0.12, J.hR.y); ctx.lineTo(J.hL.x + T * 0.12, J.hL.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.fillRect(Math.min(J.hL.x, J.hR.x) - T * 0.1, (J.hL.y + J.hR.y) / 2 - T * 0.12, Math.abs(J.hL.x - J.hR.x) + T * 0.2, T * 0.1); // (ceinture dorée)
    for (const [a, b] of [['sL', 'eL'], ['eL', 'wL'], ['sR', 'eR'], ['eR', 'wR']]) line(a, b, T * 0.16, '#4895ef');
    ctx.fillStyle = '#ffd6a5'; ctx.beginPath(); ctx.arc(J.nose.x, J.nose.y, T * 0.28, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#1e1b4b'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(J.nose.x + s * T * 0.1, J.nose.y - T * 0.02, T * 0.035, 0, 6.29); ctx.fill(); }
    ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = T * 0.03; ctx.beginPath(); ctx.arc(J.nose.x, J.nose.y + T * 0.06, T * 0.09, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  drawHat(B, now) { // chapeau de sorcier pointu, posé sur la tête (il suit l'enfant)
    const ctx = this.ctx, J = B.J, T = B.T, n = J.nose; if (!n) return;
    const w = T * 0.95, y = n.y - T * (B.real ? 0.5 : 0.24), x = n.x;
    const [a, b] = J.sL.x < J.sR.x ? [J.sL, J.sR] : [J.sR, J.sL], tilt = Math.atan2(b.y - a.y, b.x - a.x) * 0.6; // (penché comme les épaules)
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.max(-0.5, Math.min(0.5, tilt)));
    ctx.fillStyle = '#5a189a'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.7, w * 0.16, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#7b2cbf'; ctx.beginPath(); ctx.moveTo(-w * 0.42, -w * 0.02); ctx.quadraticCurveTo(-w * 0.1, -w * 0.7, w * 0.25, -w * 1.15); ctx.quadraticCurveTo(w * 0.05, -w * 0.6, w * 0.42, -w * 0.02); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.fillRect(-w * 0.42, -w * 0.14, w * 0.84, w * 0.12);
    ctx.font = `${w * 0.28}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⭐', 0, -w * 0.45 + Math.sin(now / 300) * w * 0.03);
    ctx.restore();
  }
  glow(x, y, r, col, now) {
    const ctx = this.ctx, g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, col + 'cc'); g.addColorStop(1, col + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, 6.29); ctx.fill();
    if (Math.random() < 0.3) this.fx.push({ k: 'spark', x: x + (Math.random() - 0.5) * r * 2, y: y + (Math.random() - 0.5) * r * 2, t: now, col });
  }
  emo(ch, x, y, sz, rot = 0, alpha = 1) {
    const ctx = this.ctx; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.font = `${sz}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  text(t, x, y, sz, col = '#fff', alpha = 1) {
    const ctx = this.ctx; ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `800 ${sz}px 'Baloo 2', system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = sz * 0.16; ctx.strokeStyle = '#1e1b4b'; ctx.lineJoin = 'round'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); ctx.restore();
  }
  bubble(x, y, w, h, txt, sz) { // bulle de dialogue
    const ctx = this.ctx; ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#7b2cbf'; ctx.lineWidth = sz * 0.12;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h * 0.35); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1e1b4b'; ctx.font = `800 ${sz}px 'Baloo 2', system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y, w * 0.92);
  }
  cloud(x, y, r, face, now, col = '#6c6f93') { // le Nuage Grognon (face : 'grognon', 'dos', 'rit', 'content')
    const ctx = this.ctx;
    ctx.fillStyle = col; ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = r * 0.06; ctx.beginPath();
    for (const [dx, dy, rr] of [[-0.55, 0.1, 0.45], [0, -0.2, 0.6], [0.55, 0.1, 0.45], [0, 0.25, 0.5]]) { ctx.moveTo(x + dx * r + rr * r, y + dy * r); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, 6.29); }
    ctx.fill(); ctx.stroke();
    if (face === 'dos') return;
    ctx.fillStyle = '#fff'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * r * 0.25, y - r * 0.05, r * 0.16, 0, 6.29); ctx.fill(); }
    const look = Math.sin(now / 300) * r * 0.05;
    ctx.fillStyle = '#1e1b4b'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * r * 0.25 + look, y - r * 0.03, r * 0.07, 0, 6.29); ctx.fill(); }
    ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = r * 0.06;
    if (face === 'grognon') { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.42, y - r * 0.3); ctx.lineTo(x + s * r * 0.12, y - r * 0.2); ctx.stroke(); } ctx.beginPath(); ctx.arc(x, y + r * 0.35, r * 0.15, Math.PI + 0.3, -0.3); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, y + r * 0.18, r * 0.16, 0.2, Math.PI - 0.2); ctx.stroke(); }
  }
  burst(x, y, n = 24, cols = ['#ffd166', '#ff70a6', '#ffffff', '#7bdff2', '#b8f2a1']) {
    const now = performance.now();
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.29, v = (0.3 + Math.random()) * this.H * 0.0009; this.fx.push({ k: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: now, col: cols[i % cols.length] }); }
  }
  pop(txt, x, y, col = '#ffd166') { this.fx.push({ k: 'txt', txt, x, y, t: performance.now(), col }); }
  drawFx(now) {
    const ctx = this.ctx, H = this.H;
    this.fx = this.fx.filter((f) => now - f.t < (f.k === 'txt' ? 1100 : f.k === 'spark' ? 500 : 900));
    for (const f of this.fx) {
      const q = (now - f.t) / (f.k === 'txt' ? 1100 : f.k === 'spark' ? 500 : 900);
      if (f.k === 'dot') { const dtm = now - f.t; ctx.globalAlpha = 1 - q; ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x + f.vx * dtm, f.y + f.vy * dtm + 0.0004 * H * (dtm / 30) ** 2 * 0.1, H * 0.008, 0, 6.29); ctx.fill(); }
      else if (f.k === 'spark') { ctx.globalAlpha = 1 - q; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y - q * H * 0.02, H * 0.004, 0, 6.29); ctx.fill(); }
      else if (f.k === 'txt') { ctx.globalAlpha = 1; this.text(f.txt, f.x, f.y - q * H * 0.06, H * 0.06 * (1 + 0.15 * Math.sin(q * Math.PI)), f.col, 1 - Math.max(0, q - 0.6) / 0.4); }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Aide à la visée : une main qui s'approche d'un objet à toucher est attirée vers lui (et l'objet grossit)
  targets() {
    const st = this.st, g = this.s.game;
    if (g === 'potions' && st.phase === 'pick') return (st.items || []).filter((it) => !it.taken && !it.bad && it.x != null).map((it) => ({ x: it.x, y: it.y, ref: it }));
    if (g === 'neige') return (st.men || []).filter((m) => !m.hit && !m.gone && m.x != null && now0() - m.t0 > 300).map((m) => ({ x: m.x, y: m.y, ref: m }));
    return [];
  }
  assist(now) {
    const B = this.B; if (!B || !B.J) return;
    const tg = this.targets(); if (!tg.length) return;
    const R = B.T * (this.v3 ? 1.4 : 1.1);
    for (const k of ['handL', 'handR']) {
      const h = B.J[k]; if (!h) continue;
      let best = null, bd = R;
      for (const t of tg) { const d = Math.hypot(t.x - h.x, t.y - h.y); if (d < bd) { bd = d; best = t; } }
      if (!best) continue;
      const pull = 0.7 * Math.pow(1 - bd / R, 0.6);
      B.J[k] = { ...h, x: h.x + (best.x - h.x) * pull, y: h.y + (best.y - h.y) * pull };
      best.ref.aimT = now;
    }
    B.J.wL = B.J.handL; B.J.wR = B.J.handR;
    if (this.v3) this.v3.setHands(B.J);
  }

  // ---------- « Attrape les étoiles » (une fois par partie) : mesure la portée des bras de l'enfant
  // Une étoile à la fois (en haut à gauche, en haut à droite, à gauche, à droite) : on la prend en tendant le bras vers elle.
  calDirs() { return [[-0.7, -0.7], [0.7, -0.7], [-1, 0.05], [1, 0.05]]; }
  updateCal(now) {
    const cal = this.cal, b0 = tracker.lead();
    this.ev.splice(0); this.B = this.body(now);
    const dt = Math.min(0.1, (now - (cal.last || now)) / 1000); cal.last = now;
    const D = this.calDirs()[cal.i], vec = (this.v3 && this.v3.lastVec) || [];
    let hit = false;
    if (tracker.sim) { if (now - cal.st > 700) { hit = true; cal.best = 1; } }
    else for (const v of vec) {
      if (!v) continue; const L = Math.hypot(v[0], v[1]); if (L < 0.55) continue;
      if ((v[0] * D[0] + v[1] * D[1]) / (L * Math.hypot(D[0], D[1])) > 0.8) { hit = true; cal.best = Math.max(cal.best, L); }
    }
    cal.on = hit ? cal.on + dt : Math.max(0, cal.on - dt * 2);
    const next = (val) => {
      if (val) { cal.vals.push(val); Audio8.coin(); const p = this.calStar(cal.i); this.burst(p.x, p.y, 30); if (this.v3) this.v3.react('win'); }
      cal.i++; cal.on = 0; cal.best = 0; cal.st = now;
      if (cal.i >= 4) this.endCal(now);
    };
    if (cal.on > 0.4) next(cal.best);
    else if (now - cal.st > 6500) next(null); // (étoile trop difficile : on passe)
  }
  endCal(now) {
    const cal = this.cal, v = [...cal.vals].sort((a, b) => a - b), b0 = tracker.lead();
    const reach = v.length ? v[Math.floor(v.length / 2)] : 1.1;
    if (b0) b0.reachK = Math.max(0.7, Math.min(1.6, reach * 1.05)); // (un peu de marge : bras tendu = bord de la portée du jeu)
    const d = now - cal.t0; this.cal = null;
    if (this.c) { this.c.start += d; this.c.end += d; }
    this.shift(d); this.lastT = now;
    if (this.intro) this.intro.t0 = now; // (après le décalage : le titre commence maintenant)
    Audio8.say('Super, c\'est parti !', { interrupt: true }); Audio8.whoosh(); setTimeout(() => this.intro && Audio8.sting(), 250);
  }
  calStar(i) { const B = this.B, D = this.calDirs()[i], n = Math.hypot(D[0], D[1]); return { x: B.sh.x + D[0] / n * B.T * 2.0, y: B.sh.y + D[1] / n * B.T * 2.0 }; }
  hudCal(now) {
    const cal = this.cal, W = this.W, H = this.H;
    this.text('✨ Échauffement magique ✨', W / 2, H * 0.14, H * 0.06, '#ffd166');
    for (let i = 0; i < 4; i++) {
      const p = this.calStar(i), cur = i === cal.i, done = i < cal.i;
      if (cur) { this.ring(p.x, p.y, this.B.T * 0.55, cal.on / 0.4, '#b8f2a1', 0.01); this.emo('⭐', p.x, p.y, this.B.T * (0.75 + 0.1 * Math.sin(now / 150))); }
      else this.emo(done ? '✅' : '⭐', p.x, p.y, this.B.T * (done ? 0.45 : 0.4), 0, done ? 1 : 0.35);
    }
    this.pill(['↖️ Tends le bras vers l\'étoile, en haut !', '↗️ Et l\'autre étoile, en haut !', '⬅️ Tends le bras sur le côté !', 'Et de l\'autre côté ! ➡️'][cal.i] || '', '#ffffff');
  }

  // ---------- L'enfant imaginaire (mode test) : fait ce que le jeu demande, avec un temps de réaction
  autoPlay(now, evs) {
    const st = this.st, g = this.s.game, f = (this.fake = {});
    const once = (key, gap, ev) => { if (now - (this.autoAt?.[key] || 0) > gap) { this.autoAt = { ...(this.autoAt || {}), [key]: now }; evs.push(ev); if (ev === 'jump') this.lastJump = now; if (ev === 'smash') this.lastSmash = now; } };
    if (g === 'mur') { const w = st.wall; if (w && (now - w.t0) / w.dur > 0.55) { if (w.pose === 'left' || w.pose === 'right') f.side = w.pose; else f[w.pose] = true; } }
    if (g === 'soleil') { if (st.phase === 'dos' && now - st.at > 300) f.wave = true; }
    if (g === 'pimprenelle' && st.cur && st.cur.simon && now - st.cur.t0 > 900) { const o = st.cur.o.g; if (o === 'jump' || o === 'smash') once('simon', 600, o); else if (o === 'squat') f.squat = true; else f[o] = true; }
    if (g === 'neige') { const m = (st.men || []).find((x) => !x.hit && now - x.t0 > 700); if (m) once('throw', 900, m.x < this.W / 2 ? 'throwL' : 'throwR'); }
    if (g === 'potions' && st.phase === 'stir') { f.stirAng = now / 160; }
    if (g === 'duel') { if (st.phase === 'cast' && now - st.at > 350) { if (st.kind === 'shield') f.handsTogether = true; else f.side = 'left'; } if (st.phase === 'counter' && now - st.at > 500) f.armsUp = true; }
    if (g === 'corde') f.wave = true;
    if (g === 'equilibre') { f.flamingo = true; if (st.gust) f.airplane = true; }
    if (g === 'balai') { const r = (st.rings || []).find((x) => !x.res); if (r) { f.side = r.gx < 0 ? 'left' : r.gx > 0 ? 'right' : 'center'; if (r.gy < 0) f.armsUp = true; if (r.gy > 0) f.squat = true; } }
  }

  // ======================= Les jeux =======================

  // ----- Le Mur Magique : un mur arrive avec un trou en forme de pose ; on prend la pose pour passer
  init_mur(st, now) {
    const pool = ['armsUp', 'airplane', 'star', 'squat', 'left', 'right', ...(tracker.mode === 'upper' ? [] : ['flamingo'])];
    st.seq = []; while (st.seq.length < st.n) { const l = pool.filter((p) => p !== st.seq[st.seq.length - 1]); st.seq.push(l[Math.floor(Math.random() * l.length)]); }
    st.k = 0; st.next = now + 1800; st.wall = null;
  }
  up_mur(st, now, dt, B) {
    if (!st.wall && st.k < st.n && now > st.next) st.wall = { pose: st.seq[st.k], t0: now, dur: Math.max(2.4, 4 - st.k * 0.18) * 1000 * Math.min(1.3, this.g.mul), ok: false };
    const w = st.wall; if (!w) return;
    const q = (now - w.t0) / w.dur;
    w.match = this.poseOk(B, w.pose);
    if (q > 0.62 && w.match) w.ok = true;
    if (q >= 1) {
      st.k++; st.wall = null; st.next = now + 900;
      if (w.ok) { this.win(ARENA.mur.pts, 'SUPER !', B.sh.x, B.sh.y); this.say('Super, le mur est passé !', 0); this.fx.push({ k: 'shatter', t: now }); }
      else { Audio8.soft(); this.say('Ouille, le mur !', 0); this.pop('Bong !', B.sh.x, B.sh.y, '#ff8fab'); }
      ui.setDetail(this.g.detail(this.c));
      if (st.k >= st.n) this.finish(st.ok / st.n);
    }
  }
  draw_mur(st, now, B) {
    const w = st.wall, ctx = this.ctx, W = this.W, H = this.H;
    if (!w) { if (st.k < st.n) this.text(`Mur ${st.k + 1} / ${st.n}`, W / 2, H * 0.86, H * 0.05, '#ffd166'); return; }
    const q = Math.min(1, (now - w.t0) / w.dur), sc = 0.18 + 0.82 * q ** 1.6;
    const G = AR_SHAPES[w.pose], T = B.T * sc, cx = W / 2 + (B.sh.x - W / 2) * q, cy = H * 0.42 + (B.sh.y - H * 0.42) * q;
    // le mur (sur un calque à part : on y découpe le trou en forme de pose)
    const o = this.off; if (o.width !== W || o.height !== H) { o.width = W; o.height = H; }
    const x = o.getContext('2d'); x.clearRect(0, 0, W, H);
    const ww = W * (0.25 + 0.95 * q ** 1.6), wh = H * (0.25 + 0.95 * q ** 1.6), wx = W / 2 - ww / 2, wy = H * 0.45 - wh / 2;
    x.fillStyle = '#6a4c93'; x.fillRect(wx, wy, ww, wh);
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = Math.max(1, ww * 0.004);
    const bh = wh / 9; for (let r = 0; r < 9; r++) { x.beginPath(); x.moveTo(wx, wy + r * bh); x.lineTo(wx + ww, wy + r * bh); x.stroke(); for (let c = 0; c < 8; c++) { const bx = wx + (c + (r % 2) * 0.5) * (ww / 8); x.beginPath(); x.moveTo(bx, wy + r * bh); x.lineTo(bx, wy + (r + 1) * bh); x.stroke(); } }
    x.globalCompositeOperation = 'destination-out'; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = T * 0.5;
    const pt = (k) => [cx - G[k][0] * T, cy + G[k][1] * T];
    for (const [a, b] of TARGET_BONES) { if (!G[a] || !G[b]) continue; x.beginPath(); x.moveTo(...pt(a)); x.lineTo(...pt(b)); x.stroke(); }
    const hd = AR_HEAD(G); x.beginPath(); x.arc(cx - hd[0] * T, cy + hd[1] * T, T * 0.38, 0, 6.29); x.fill();
    x.beginPath(); x.moveTo(...pt('sL')); x.lineTo(...pt('sR')); x.lineTo(...pt('hR')); x.lineTo(...pt('hL')); x.closePath(); x.fill();
    x.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.25 + 0.65 * Math.min(1, q * 1.5); ctx.drawImage(o, 0, 0); ctx.globalAlpha = 1;
    // le bord du trou : vert quand l'enfant est dans la bonne pose
    ctx.strokeStyle = w.match ? '#22c55e' : '#ffd166'; ctx.lineWidth = Math.max(3, T * 0.06); ctx.lineCap = 'round';
    for (const [a, b] of TARGET_BONES) { if (!G[a] || !G[b]) continue; ctx.beginPath(); ctx.moveTo(...pt(a)); ctx.lineTo(...pt(b)); ctx.stroke(); }
    this.text((w.match ? '✅ ' : '') + AR_POSE_NAMES[w.pose], W / 2, H * 0.86, H * 0.055, w.match ? '#b8f2a1' : '#ffd166');
  }

  // ----- 1, 2, 3… Nuage Grognon : on court sur place quand il a le dos tourné, statue quand il regarde
  init_soleil(st, now) { st.prog = 0; st.phase = 'wait'; st.at = now; st.until = now + 2500; st.ratio = 0; }
  up_soleil(st, now, dt, B, evs) {
    const moving = B.motion > 0.035 || this.has(evs, 'jump', 'left', 'right') || (tracker.sim && !this.auto && (tracker.state.side !== 'center' || tracker.state.squat));
    if (now > st.until) {
      if (st.phase === 'dos') { st.phase = 'regarde'; st.at = now; st.until = now + 2200; st.seen = false; this.say('Nuage Grognon !', 0); }
      else { st.phase = 'dos'; st.at = now; st.until = now + 2500 + Math.random() * 2000; this.say('Un, deux, trois…', 0); }
    }
    if (st.phase === 'dos') {
      const sp = B.real ? Math.max(0, Math.min(1, (B.motion - 0.008) / 0.018)) : moving || B.st.wave ? 1 : 0; // (courir sur place d'un enfant : ~0,02 ; testé avec l'enfant virtuel)
      st.prog = Math.min(1, st.prog + dt * sp * 0.11);
    } else if (st.phase === 'regarde' && now - st.at > 800 && !st.seen && moving && !B.st.wave) { // (l'enfant imaginaire s'arrête toujours à temps)
      st.seen = true; st.prog = Math.max(0, st.prog - 0.18); st.oops = now; Audio8.soft(); this.say('Je t\'ai vu bouger !', 0);
    }
    st.ratio = st.prog;
    if (now - (st.detT || 0) > 300) { st.detT = now; ui.setDetail(this.g.detail(this.c)); }
    if (st.prog >= 1) { this.g.add(this.g.pts(ARENA.soleil.pts), 'BRAVO !'); this.burst(this.W * 0.78, this.H * 0.36, 50); this.say('Bravo !', 0); this.finish(1); }
  }
  draw_soleil(st, now, B) {
    const W = this.W, H = this.H, ctx = this.ctx, look = st.phase === 'regarde';
    const cx = W * 0.8, cy = H * 0.36 + Math.sin(now / 500) * H * 0.01, r = H * 0.12;
    if (look) { ctx.fillStyle = `rgba(255,80,80,${0.12 + 0.05 * Math.sin(now / 90)})`; ctx.fillRect(0, 0, W, H); }
    this.cloud(cx, cy, r, look ? (st.oops && now - st.oops < 1200 ? 'rit' : 'grognon') : 'dos', now);
    this.text(look ? '🗿 STATUE !' : st.phase === 'dos' ? '🏃 COURS !' : 'Prêt ?', cx, cy + r * 1.35, H * 0.065, look ? '#ff8fab' : '#b8f2a1');
    // le chemin jusqu'au nuage
    const x0 = W * 0.12, x1 = W * 0.72, y = H * 0.88;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = H * 0.018; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.strokeStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + (x1 - x0) * st.prog, y); ctx.stroke();
    this.emo('🧙', x0 + (x1 - x0) * st.prog, y - H * 0.045 - (st.phase === 'dos' ? Math.abs(Math.sin(now / 120)) * H * 0.015 : 0), H * 0.07);
    this.emo('🏁', x1 + W * 0.03, y - H * 0.03, H * 0.06);
  }

  // ----- Pimprenelle a dit : on fait l'ordre seulement si elle a dit « Pimprenelle a dit »
  init_pimprenelle(st, now) {
    st.pool = SIMON_ORDERS.filter((o) => !(tracker.mode === 'upper' && o.g === 'flamingo'));
    st.i = 0; st.cur = null; st.next = now + 2200; st.res = null;
  }
  up_pimprenelle(st, now, dt, B, evs) {
    if (!st.cur && st.i < st.n && now > st.next) {
      const prev = st.prev, l = st.pool.filter((o) => o !== prev), o = l[Math.floor(Math.random() * l.length)];
      const simon = st.i === 0 || Math.random() < 0.68;
      st.cur = { o, simon, t0: now, hold: 0, win: Math.max(2.4, 3.6 - st.i * 0.12) * 1000 * Math.min(1.3, this.g.mul) }; st.prev = o;
      Audio8.say(simon ? o.yes : o.no);
    }
    const c = st.cur; if (!c) return;
    const since = now - c.t0; if (since < 700) return; // (le temps d'entendre l'ordre)
    const g = c.o.g;
    let did = false;
    if (g === 'jump' || g === 'smash') did = this.has(evs, g);
    else if (g === 'squat') did = this.has(evs, 'squat') || B.st.squat;
    else { c.hold = this.poseOk(B, g) ? c.hold + dt : 0; did = c.hold > 0.35; }
    const resolve = (good, msg) => {
      st.cur = null; st.i++; st.next = now + 1300; st.res = { good, t: now };
      if (good) this.win(ARENA.pimprenelle.pts, c.simon ? 'BRAVO !' : 'PAS PIÉGÉ !', B.sh.x, B.sh.y); else Audio8.soft();
      if (msg) this.say(msg, 0);
      if (st.i >= st.n) setTimeout(() => this.s && this.s.game === 'pimprenelle' && this.finish(st.ok / st.n), 1200);
    };
    if (did) resolve(c.simon, c.simon ? null : 'Piégé ! Elle n\'avait pas dit « Pimprenelle a dit » !');
    else if (since > c.win) resolve(!c.simon, c.simon ? 'Trop tard !' : 'Bien joué, tu ne t\'es pas fait avoir !');
  }
  draw_pimprenelle(st, now, B) {
    const W = this.W, H = this.H, x = W * 0.82, y = H * 0.42;
    this.emo('🦉', x, y + Math.sin(now / 400) * H * 0.01, H * 0.2);
    const c = st.cur;
    if (c) {
      this.bubble(W * 0.5, H * 0.87, W * 0.62, H * 0.09, (c.simon ? '🦉 Pimprenelle a dit : ' : '') + c.o.no.replace(' !', '') + ' ' + c.o.icon, H * 0.045);
      const k = Math.min(1, (now - c.t0) / c.win), ctx = this.ctx;
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(W * 0.25, H * 0.805, W * 0.5, H * 0.01);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(W * 0.25, H * 0.805, W * 0.5 * (1 - k), H * 0.01);
    }
    if (st.res && now - st.res.t < 1200) this.text(st.res.good ? '✅' : '😜 Piégé !', W * 0.82, H * 0.68, H * 0.08, st.res.good ? '#b8f2a1' : '#ff8fab');
  }

  // ----- Bataille de boules de neige : on lance (bras levé puis baissé d'un coup) vers les bonshommes, ou on les touche
  init_neige(st, now) { st.men = []; st.next = now + 1500; st.balls = []; st.spawned = 0; st.lastSlot = -1; st.flakes = Array.from({ length: 40 }, () => [Math.random(), Math.random(), 0.3 + Math.random()]); }
  up_neige(st, now, dt, B, evs) {
    const T = B.T, slots = [[-2, 0.2], [0, -1.5], [2, 0.2], [-2.3, 1.4], [2.3, 1.4]];
    const alive = st.men.filter((m) => !m.hit && !m.gone);
    if (st.spawned < st.n && alive.length < 2 && now > st.next) {
      const free = slots.map((_, k) => k).filter((k) => k !== st.lastSlot && !alive.some((m) => m.slot === k)), k = free[Math.floor(Math.random() * free.length)];
      st.men.push({ slot: k, t0: now, life: Math.max(2200, 3600 - st.spawned * 120) * Math.min(1.3, this.g.mul) }); st.spawned++; st.lastSlot = k; st.next = now + 1100;
    }
    for (const m of st.men) {
      if (this.v3) { const p = this.v3.slotXY(m.slot); m.x = p.x; m.y = p.y; continue; } // (3D : les bonshommes sont dans la neige, autour du sorcier)
      const [gx, gy] = slots[m.slot]; m.x = B.sh.x + gx * T; m.y = B.sh.y + gy * T; m.x = Math.max(this.W * 0.08, Math.min(this.W * 0.92, m.x)); m.y = Math.max(this.H * 0.36, m.y);
    }
    const hitMan = (m) => { m.hit = now; this.win(ARENA.neige.pts, 'Touché !', m.x, m.y); this.say('Touché !', 1500); };
    // lancer : la boule part de la main, vers le bonhomme le plus proche de ce côté
    for (const e of evs) {
      if (!/^throw[LR]$|^smash$/.test(e)) continue;
      const hand = e === 'throwL' ? B.J.handL : e === 'throwR' ? B.J.handR : B.J.handL;
      const cand = st.men.filter((m) => !m.hit && !m.gone && !m.target).sort((a, b) => Math.abs(a.x - hand.x) - Math.abs(b.x - hand.x))[0];
      if (cand) { cand.target = true; st.balls.push({ x0: hand.x, y0: hand.y, m: cand, t0: now }); Audio8.soft(); }
    }
    for (const b of st.balls) if (!b.done && now - b.t0 > 300) { b.done = true; if (!b.m.hit) hitMan(b.m); }
    st.balls = st.balls.filter((b) => now - b.t0 < 400);
    for (const m of st.men) if (!m.hit && !m.gone && this.touching(B, m.x, m.y, T * 0.55)) hitMan(m); // (on peut aussi les toucher)
    for (const m of st.men) if (!m.hit && !m.gone && now - m.t0 > m.life) { m.gone = now; this.pop('Hi hi !', m.x, m.y, '#bde0fe'); }
    st.men = st.men.filter((m) => !(m.hit && now - m.hit > 900) && !(m.gone && now - m.gone > 600));
    if (st.spawned >= st.n && !st.men.some((m) => !m.hit && !m.gone)) this.finish(st.ok / st.n);
  }
  draw_neige(st, now, B) {
    const ctx = this.ctx, W = this.W, H = this.H, T = B.T;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const f of st.flakes) { const y = ((f[1] + now / 9000 * f[2]) % 1) * H, x = (f[0] + Math.sin(now / 1500 + f[1] * 9) * 0.01) * W; ctx.beginPath(); ctx.arc(x, y, H * 0.004 * f[2], 0, 6.29); ctx.fill(); }
    for (const m of st.men) {
      const pop = Math.min(1, (now - m.t0) / 250), s = T * 0.45 * pop * (m.gone ? Math.max(0, 1 - (now - m.gone) / 600) : 1);
      if (m.hit) { this.emo('💥', m.x, m.y, T * 0.8 * (1 + (now - m.hit) / 900), 0, 1 - (now - m.hit) / 900); continue; }
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#a8dadc'; ctx.lineWidth = s * 0.06;
      for (const [dy, r] of [[0.9, 0.62], [0.05, 0.45], [-0.65, 0.33]]) { ctx.beginPath(); ctx.arc(m.x, m.y + dy * s, r * s, 0, 6.29); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#1e1b4b'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(m.x + sx * s * 0.12, m.y - s * 0.72, s * 0.05, 0, 6.29); ctx.fill(); }
      ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = s * 0.05; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(m.x + sx * s * 0.24, m.y - s * 0.88); ctx.lineTo(m.x + sx * s * 0.06, m.y - s * 0.8); ctx.stroke(); }
      ctx.fillStyle = '#f77f00'; ctx.beginPath(); ctx.moveTo(m.x, m.y - s * 0.66); ctx.lineTo(m.x + s * 0.3, m.y - s * 0.6); ctx.lineTo(m.x, m.y - s * 0.56); ctx.fill();
      ctx.fillStyle = '#e63946'; ctx.fillRect(m.x - s * 0.4, m.y - s * 0.33, s * 0.8, s * 0.1);
      const k = 1 - (now - m.t0) / m.life; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.arc(m.x, m.y + s * 0.2, s * 1.25, -Math.PI / 2, -Math.PI / 2 + k * 6.29); ctx.stroke();
    }
    for (const b of st.balls) { const q = Math.min(1, (now - b.t0) / 300); const x = b.x0 + (b.m.x - b.x0) * q, y = b.y0 + (b.m.y - b.y0) * q - Math.sin(q * Math.PI) * T * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, T * 0.12, 0, 6.29); ctx.fill(); }
  }

  // ----- La cuisine des potions : toucher les ingrédients de la recette, puis touiller (grands cercles avec le bras)
  init_potions(st, now) { this.newRecipe(st, now); }
  newRecipe(st, now) {
    const bag = [...AR_INGREDIENTS].sort(() => Math.random() - 0.5);
    st.recipe = bag.slice(0, 3).map(([e, n]) => ({ e, n, got: false }));
    const extra = bag.slice(3, 5).map(([e, n]) => ({ e, n, bad: true }));
    // (3D : en arc autour du haut du corps, à portée des mains magiques, jamais derrière le chaudron à droite)
    const spots = (this.v3 ? [[-1.9, -0.3], [-1.6, 0.9], [1.9, -0.6], [-1.5, -1.6], [1.5, -1.7]] : [[-2.1, -0.6], [2.1, -0.6], [-2.4, 0.7], [2.4, 0.7], [0, -1.7]]).sort(() => Math.random() - 0.5);
    st.items = [...st.recipe.map((r) => ({ ...r, ref: r })), ...extra].map((it, i) => ({ ...it, spot: spots[i], wob: 0, seed: Math.random() * 6 }));
    st.phase = 'pick'; st.stir = 0; st.ang = null; st.flying = [];
  }
  up_potions(st, now, dt, B, evs) {
    const T = B.T, W = this.W, H = this.H, pot = this.v3 ? this.v3.potXY() : { x: W / 2, y: H * 0.86 };
    if (st.phase === 'pick') {
      for (const it of st.items) {
        if (it.taken) continue;
        it.x = Math.max(W * 0.08, Math.min(W * 0.92, B.sh.x + it.spot[0] * T)); it.y = Math.max(H * 0.3, B.sh.y + it.spot[1] * T + Math.sin(now / 600 + it.seed) * T * 0.08);
        const auto = this.auto && !it.bad && now - (st.autoT || 0) > 1100;
        const key = this.has(evs, 'key_b') && !it.bad && !st.keyUsed;
        if (this.touching(B, it.x, it.y, T * 0.42) || auto || key) {
          if (auto) st.autoT = now; if (key) st.keyUsed = true;
          if (it.bad) { if (now - it.wob > 900) { it.wob = now; Audio8.soft(); this.say('Pas celui-là !', 1500); } continue; }
          it.taken = true; it.ref.got = true; st.flying.push({ e: it.e, x0: it.x, y0: it.y, t0: now }); Audio8.good();
        }
      }
      st.keyUsed = false;
      if (st.recipe.every((r) => r.got) && !st.flying.some((f) => now - f.t0 < 500)) { st.phase = 'stir'; st.at = now; this.say('Maintenant, touille ! Fais de grands cercles avec ton bras !', 0); }
    } else if (st.phase === 'stir') {
      // angle de la main la plus active autour de son épaule : on additionne les tours (bras assez tendu)
      let best = 0;
      for (const [h, s] of [[B.J.handL, B.J.sL], [B.J.handR, B.J.sR]]) {
        if (!h || !s || Math.hypot(h.x - s.x, h.y - s.y) < T * 0.45) continue;
        const a = Math.atan2(h.y - s.y, h.x - s.x), key = s === B.J.sL ? 'aL' : 'aR', prev = st[key];
        st[key] = a; if (prev == null) continue;
        const d = Math.abs(Math.atan2(Math.sin(a - prev), Math.cos(a - prev))); if (d < 0.8) best = Math.max(best, d);
      }
      if (this.has(evs, 'key_s', 'smash')) best = Math.max(best, 0.6); // (mode clavier : S)
      st.stir += best; if (best > 0.05 && now - (st.hum || 0) > 180) { st.hum = now; Audio8.sparkle(Math.min(1, st.stir / (4 * Math.PI))); }
      if (st.stir >= 4 * Math.PI) {
        this.win(ARENA.potions.pts, 'POTION !', pot.x, pot.y - H * 0.08); this.burst(pot.x, pot.y - H * 0.1, 60, ['#c77dff', '#7bdff2', '#b8f2a1', '#ffd166']);
        this.say('La potion est prête !', 0); st.poof = now;
        if (st.ok >= st.n) { this.finish(1); return; }
        this.newRecipe(st, now);
      }
    }
  }
  draw_potions(st, now, B) {
    const ctx = this.ctx, W = this.W, H = this.H, T = B.T, px = W / 2, py = H * 0.86, pr = H * 0.11;
    // chaudron
    const brew = ['#70e000', '#c77dff', '#4cc9f0', '#ff70a6'][st.ok % 4];
    ctx.fillStyle = '#2b2d42'; ctx.beginPath(); ctx.ellipse(px, py, pr * 1.25, pr * 0.95, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = brew; ctx.beginPath(); ctx.ellipse(px, py - pr * 0.6, pr * 1.05, pr * 0.28, 0, 0, 6.29); ctx.fill();
    for (let i = 0; i < 4; i++) { const q = (now / 900 + i / 4) % 1; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(px + Math.sin(i * 2.3) * pr * 0.6, py - pr * 0.6 - q * pr * 0.9, pr * 0.07 * (1 - q), 0, 6.29); ctx.fill(); }
    if (st.phase === 'stir') { const k = Math.min(1, st.stir / (4 * Math.PI)); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = H * 0.012; ctx.beginPath(); ctx.arc(px, py - pr * 0.6, pr * 0.75, -Math.PI / 2, -Math.PI / 2 + k * 6.29); ctx.stroke(); this.text('🌀 Touille !', px, py - pr * 1.6, H * 0.05, '#ffd166'); this.emo('🥄', px + Math.cos(now / 200) * pr * 0.5, py - pr * 0.8 + Math.sin(now / 200) * pr * 0.15, pr * 0.6); }
    // recette
    ctx.fillStyle = 'rgba(255,250,240,.92)'; ctx.strokeStyle = '#7b2cbf'; ctx.lineWidth = H * 0.006; ctx.beginPath(); ctx.roundRect(W * 0.02, H * 0.32, W * 0.13, H * 0.4, H * 0.03); ctx.fill(); ctx.stroke();
    this.text('📜', W * 0.085, H * 0.36, H * 0.04);
    st.recipe.forEach((r, i) => { const y = H * (0.45 + i * 0.09); this.emo(r.e, W * 0.07, y, H * 0.06, 0, r.got ? 0.45 : 1); if (r.got) this.emo('✅', W * 0.115, y, H * 0.035); });
    // ingrédients qui flottent (dans des bulles)
    for (const it of st.items || []) {
      if (it.taken) continue;
      const wob = now - it.wob < 500 ? Math.sin((now - it.wob) / 30) * T * 0.08 : 0;
      ctx.fillStyle = 'rgba(200,230,255,.25)'; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(it.x + wob, it.y, T * 0.36, 0, 6.29); ctx.fill(); ctx.stroke();
      this.emo(it.e, it.x + wob, it.y, T * 0.4);
    }
    for (const f of st.flying) { const q = Math.min(1, (now - f.t0) / 500); this.emo(f.e, f.x0 + (px - f.x0) * q, f.y0 + (py - pr * 0.6 - f.y0) * q - Math.sin(q * Math.PI) * H * 0.1, T * 0.4 * (1 - q * 0.5)); }
    st.flying = st.flying.filter((f) => now - f.t0 < 520);
    if (st.poof && now - st.poof < 900) this.emo('✨', px, py - pr * 1.2, H * 0.15 * (1 + (now - st.poof) / 900), 0, 1 - (now - st.poof) / 900);
  }

  // ----- Duel de sorciers : bouclier (mains jointes) ou esquive (pas de côté), puis contre-attaque (bras levés)
  init_duel(st, now) { st.hp = st.n; st.phase = 'wait'; st.at = now; st.until = now + 2000; }
  up_duel(st, now, dt, B) {
    const go = (phase, dur) => { st.phase = phase; st.at = now; st.until = now + dur; };
    if (st.phase === 'wait' && now > st.until) { st.kind = Math.random() < 0.55 ? 'shield' : 'dodge'; go('charge', 1500); this.say('Attention, il prépare un sort !', 6000); }
    else if (st.phase === 'charge' && now > st.until) { go('cast', 1500 * Math.min(1.3, this.g.mul)); this.say(st.kind === 'shield' ? 'Bouclier ! Joins tes mains !' : 'Esquive ! Pas de côté !', 0); st.safe = false; }
    else if (st.phase === 'cast') {
      const q = (now - st.at) / (st.until - st.at);
      if (q > 0.45 && (st.kind === 'shield' ? B.st.handsTogether : B.st.side !== 'center')) st.safe = true;
      if (now > st.until) {
        if (st.safe) { Audio8.good(); this.pop('Paré !', B.sh.x, B.sh.y - B.T, '#b8f2a1'); this.say('Paré !', 0); go('counter', 3500); setTimeout(() => this.s && this.st === st && st.phase === 'counter' && this.say('À toi ! Lève les deux bras pour lancer ton sort !', 0), 600); st.hold = 0; }
        else { Audio8.soft(); this.pop('Ouille !', B.sh.x, B.sh.y, '#ff8fab'); this.say('Ouille ! Ça chatouille !', 0); st.hurt = now; go('wait', 1500); }
      }
    } else if (st.phase === 'counter') {
      st.hold = B.st.armsUp ? st.hold + dt : Math.max(0, st.hold - dt);
      if (st.hold > 0.5) { st.bolt = now; go('bolt', 600); }
      else if (now > st.until) go('wait', 800);
    } else if (st.phase === 'bolt' && now > st.until) {
      const gx = this.v3 ? this.v3.grimXY() : { x: this.W * 0.8, y: this.H * 0.42 };
      st.hp--; this.win(ARENA.duel.pts, '⚡ BOUM !', gx.x, gx.y); st.dizzy = now;
      if (st.hp <= 0) { this.say('Il est tout étourdi !', 0); this.finish(1); return; }
      go('wait', 1600);
    }
    st.ratio = (st.n - st.hp) / st.n;
  }
  draw_duel(st, now, B) {
    const ctx = this.ctx, W = this.W, H = this.H, rx = W * 0.8, ry = H * 0.42, dizzy = st.dizzy && now - st.dizzy < 1500;
    this.emo('🧙', rx + (dizzy ? Math.sin(now / 60) * H * 0.01 : 0), ry, H * 0.16, dizzy ? Math.sin(now / 100) * 0.2 : 0);
    if (dizzy) this.emo('💫', rx, ry - H * 0.1, H * 0.06, now / 300);
    this.text('Grimaud', rx, ry + H * 0.1, H * 0.035, '#e0c3fc');
    for (let i = 0; i < st.n; i++) this.emo(i < st.hp ? '💜' : '🤍', rx + (i - (st.n - 1) / 2) * H * 0.045, ry - H * 0.12, H * 0.035);
    const col = st.kind === 'shield' ? '#c77dff' : '#ff4d6d';
    if (st.phase === 'charge') { const k = (now - st.at) / 1500; this.glow(rx + H * 0.06, ry - H * 0.03, H * 0.03 * (0.5 + k), col, now); }
    if (st.phase === 'cast') { // la boule de sort arrive vers l'enfant en grossissant
      const q = Math.min(1, (now - st.at) / (st.until - st.at)), tx = st.kind === 'dodge' ? B.sh.x : B.sh.x, ty = B.sh.y + B.T * 0.3;
      this.glow(rx + (tx - rx) * q, ry + (ty - ry) * q, H * (0.03 + q * 0.09), col, now);
      this.text(st.kind === 'shield' ? '🙏 Mains jointes !' : '↔️ Pas de côté !', W / 2, H * 0.86, H * 0.06, st.safe ? '#b8f2a1' : '#ffd166');
    }
    if (B.st.handsTogether && (st.phase === 'cast' || st.phase === 'charge')) { // bouclier
      ctx.strokeStyle = 'rgba(123,223,242,.85)'; ctx.fillStyle = 'rgba(123,223,242,.18)'; ctx.lineWidth = H * 0.008;
      ctx.beginPath(); ctx.arc(B.sh.x, B.sh.y + B.T * 0.3, B.T * 1.2, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); ctx.stroke();
    }
    if (st.phase === 'counter') { const k = Math.min(1, st.hold / 0.5); this.text('🙌 À toi : bras levés !', W / 2, H * 0.86, H * 0.06, '#ffd166'); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = H * 0.01; ctx.beginPath(); ctx.arc(B.sh.x, B.sh.y - B.T * 1.2, B.T * 0.4, -Math.PI / 2, -Math.PI / 2 + k * 6.29); ctx.stroke(); }
    if (st.phase === 'bolt') { const q = (now - st.at) / 600; this.glow(B.sh.x + (rx - B.sh.x) * q, B.sh.y - B.T + (ry - B.sh.y + B.T) * q, H * 0.05, '#ffd166', now); }
    if (st.hurt && now - st.hurt < 400) { ctx.fillStyle = `rgba(255,77,109,${0.3 * (1 - (now - st.hurt) / 400)})`; ctx.fillRect(0, 0, W, H); }
  }

  // ----- Tir à la corde magique contre le Nuage Grognon : bouger les bras très vite (ou sauter) pour tirer
  init_corde(st, now) { st.m = 0; st.burst = 0; st.nextBurst = now + 4000; st.ratio = 0.5; }
  up_corde(st, now, dt, B, evs) {
    const pull = B.real ? Math.max(0, Math.min(1, (B.motion - 0.015) / 0.05)) : B.st.wave || this.has(evs, 'jump', 'smash', 'left', 'right') ? 1 : (st.keyPull = Math.max(0, (st.keyPull || 0) - dt * 2));
    if (this.has(evs, 'jump', 'smash')) st.keyPull = 1;
    if (now > st.nextBurst) { st.burst = now; st.nextBurst = now + 4500 + Math.random() * 2500; this.say('Il tire fort !', 0); }
    const cloud = now - st.burst < 1100 ? 0.32 : 0.1;
    st.m = Math.min(0.9, st.m + (cloud - Math.max(pull, st.keyPull || 0) * 0.3) * dt);
    st.ratio = Math.max(0, Math.min(1, (1 - st.m) / 2));
    if (now - (st.detT || 0) > 300) { st.detT = now; ui.setDetail(this.g.detail(this.c)); if (pull > 0.5 && now - (st.cheerT || 0) > 5000) { st.cheerT = now; this.say('Tire, tire !', 0); } }
    if (st.m <= -1) { this.g.add(this.g.pts(ARENA.corde.pts), 'GAGNÉ !'); this.burst(this.W * 0.25, this.H * 0.75, 60); this.say('Bravo !', 0); this.finish(1); }
  }
  draw_corde(st, now, B) {
    const ctx = this.ctx, W = this.W, H = this.H, y = H * 0.76, kx = W / 2 + st.m * W * 0.32, strong = now - st.burst < 1100;
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3; ctx.setLineDash([H * 0.015, H * 0.015]); ctx.beginPath(); ctx.moveTo(W / 2, y - H * 0.08); ctx.lineTo(W / 2, y + H * 0.08); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#c77dff'; ctx.lineWidth = H * 0.02; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(W * 0.05, y); ctx.quadraticCurveTo(kx, y + Math.sin(now / 80) * H * 0.006, W * 0.88, y - H * 0.04); ctx.stroke();
    this.emo('🎀', kx, y, H * 0.08, Math.sin(now / 200) * 0.2);
    this.cloud(W * 0.9 + (strong ? Math.sin(now / 40) * H * 0.006 : 0), y - H * 0.12, H * 0.1, 'grognon', now);
    for (const h of this.hands(B)) { ctx.strokeStyle = 'rgba(199,125,255,.6)'; ctx.lineWidth = H * 0.008; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(W * 0.05, y); ctx.stroke(); }
    this.text(strong ? '💨 Il tire fort !' : '💪 Tire !', W / 2, H * 0.88, H * 0.055, strong ? '#ff8fab' : '#b8f2a1');
  }

  // ----- L'équilibriste : sur un pied sur la corde ; quand le vent souffle, bras ouverts
  init_equilibre(st, now) { st.held = 0; st.gust = 0; st.nextGust = now + 4000; st.side = 1; }
  up_equilibre(st, now, dt, B) {
    const upper = tracker.mode === 'upper';
    if (!st.gust && now > st.nextGust) { st.gust = now; st.side = Math.random() < 0.5 ? -1 : 1; this.say('Le vent souffle ! Ouvre les bras !', 0); }
    if (st.gust && now - st.gust > 2500) { st.gust = 0; st.nextGust = now + 3500 + Math.random() * 2500; }
    const base = upper ? B.st.airplane || B.st.armsUp : B.st.flamingo, ok = base && (!st.gust || B.st.airplane || (upper && B.st.airplane));
    st.ok2 = ok; if (ok) st.held += dt;
    st.ok = Math.floor(st.held); st.ratio = Math.min(1, st.held / st.n);
    if (now - (st.detT || 0) > 300) { st.detT = now; ui.setDetail(this.g.detail(this.c)); }
    if (st.held >= st.n) { this.g.add(this.g.pts(ARENA.equilibre.pts * st.n), 'BRAVO !'); this.burst(this.W / 2, this.H * 0.8, 50); this.say('Bravo, tu tiens bien !', 0); this.finish(1); }
  }
  draw_equilibre(st, now, B) {
    const ctx = this.ctx, W = this.W, H = this.H, y = H * 0.84, k = Math.min(1, st.held / st.n), x = W * (0.12 + 0.76 * k);
    ctx.fillStyle = '#8d6e63'; for (const tx of [W * 0.06, W * 0.94]) ctx.fillRect(tx - W * 0.015, y - H * 0.02, W * 0.03, H * 0.2);
    ctx.strokeStyle = '#f1faee'; ctx.lineWidth = H * 0.008; ctx.beginPath(); ctx.moveTo(W * 0.06, y); ctx.quadraticCurveTo(x, y + H * 0.02, W * 0.94, y); ctx.stroke();
    const tilt = st.ok2 ? Math.sin(now / 700) * 0.05 : Math.sin(now / 90) * 0.35;
    this.emo('🧙', x, y - H * 0.06, H * 0.1, tilt);
    if (st.gust) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = H * 0.006; for (let i = 0; i < 6; i++) { const q = ((now / 600 + i / 6) % 1), yy = H * (0.4 + i * 0.07), xx = st.side > 0 ? W * (1 - q) : W * q; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + st.side * W * 0.08, yy); ctx.stroke(); } this.text('💨 Bras ouverts !', W / 2, H * 0.3, H * 0.06, '#bde0fe'); }
    else this.text(tracker.mode === 'upper' ? '✈️ Bras ouverts' : '🦩 Sur un pied', W / 2, H * 0.3 + 0, H * 0.055, st.ok2 ? '#b8f2a1' : '#ffd166');
  }

  // ----- La course de balais : se pencher (gauche / droite), bras levés (monter), accroupi (descendre) ; passer dans les anneaux
  init_balai(st, now) { st.x = 0; st.y = 0; st.rings = []; st.spawned = 0; st.next = now + 1500; st.stars = Array.from({ length: 60 }, () => [Math.random(), Math.random() * 0.6, Math.random()]); }
  up_balai(st, now, dt, B) {
    // position voulue : décalage du corps (ou pas de côté), hauteur selon les bras / l'accroupi
    let tx = B.st.side === 'left' ? -1 : B.st.side === 'right' ? 1 : 0;
    const b = tracker.lead();
    if (B.real && b && b.calib && b.center && b.T) {
      // (le milieu suit lentement l'enfant : s'il s'est déplacé sans le vouloir, il ne reste pas bloqué d'un côté ;
      //  testé avec l'enfant virtuel qui se balade) + se pencher compte aussi (épaules décalées par rapport aux hanches)
      const lm = b.lm, hipX = lm ? (lm[23].x + lm[24].x) / 2 : b.center.x;
      st.cx = st.cx == null ? b.calib.cx : st.cx + (b.center.x - st.cx) * Math.min(1, dt / 25);
      const lean0 = -((b.center.x - hipX) * camXS()) / (b.T * 0.35); // (caméra de travers : l'enfant droit paraît penché -> on part de sa position de départ)
      st.lean0 = st.lean0 == null ? lean0 : st.lean0 + (lean0 - st.lean0) * Math.min(1, dt / 25);
      const step = -((b.center.x - st.cx) * camXS()) / (b.T * 0.7), lean = lean0 - st.lean0;
      tx = Math.max(-1, Math.min(1, step + lean));
    }
    const ty = B.st.armsUp ? -1 : B.st.squat ? 1 : 0;
    st.x += (tx - st.x) * Math.min(1, dt * 5); st.y += (ty - st.y) * Math.min(1, dt * 4);
    if (st.spawned < st.n && now > st.next) {
      const gx = [-1, 0, 1][Math.floor(Math.random() * 3)], gy = [-1, 0, 1][Math.floor(Math.random() * 3)];
      st.rings.push({ gx, gy, t0: now, dur: Math.max(1900, 3000 - st.spawned * 80) * Math.min(1.3, this.g.mul) }); st.spawned++; st.next = now + 1500;
    }
    for (const r of st.rings) {
      if (r.res || (now - r.t0) < r.dur) continue;
      const pass = Math.hypot(st.x - r.gx, (st.y - r.gy) * 1.2) < 0.6;
      r.res = pass ? 'ok' : 'miss'; r.t = now;
      if (pass) { this.win(ARENA.balai.pts, '+' + ARENA.balai.pts, ...this.ringXY(r.gx, r.gy)); if (st.ok % 3 === 0) this.say('Encore un !', 3000); } else Audio8.soft();
    }
    st.rings = st.rings.filter((r) => !r.res || now - r.t < 500);
    if (st.spawned >= st.n && !st.rings.some((r) => !r.res)) this.finish(st.ok / st.n);
  }
  ringXY(gx, gy) { if (this.v3) { const p = this.v3.ringXY(gx, gy); return [p.x, p.y]; } return [this.W / 2 + gx * this.W * 0.27, this.H * 0.52 + gy * this.H * 0.2]; }
  drawSky(now) {
    const ctx = this.ctx, W = this.W, H = this.H, st = this.st;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#240046'); g.addColorStop(0.55, '#7b2cbf'); g.addColorStop(0.85, '#ff9e00'); g.addColorStop(1, '#ff6d00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; for (const s of st.stars || []) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(now / 700 + s[2] * 9)); ctx.beginPath(); ctx.arc(s[0] * W, s[1] * H, H * 0.002 * (1 + s[2]), 0, 6.29); ctx.fill(); }
    ctx.globalAlpha = 1;
    // château au loin et collines
    ctx.fillStyle = '#3c096c'; const hy = H * 0.72;
    ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += W / 20) ctx.lineTo(x, hy + Math.sin(x / W * 9 + 1) * H * 0.03); ctx.lineTo(W, H); ctx.fill();
    for (const [x, w, h] of [[0.42, 0.03, 0.14], [0.47, 0.06, 0.1], [0.55, 0.03, 0.16]]) { ctx.fillRect(W * x, hy - H * h, W * w, H * h); ctx.beginPath(); ctx.moveTo(W * x - W * 0.008, hy - H * h); ctx.lineTo(W * (x + w / 2), hy - H * h - H * 0.06); ctx.lineTo(W * (x + w) + W * 0.008, hy - H * h); ctx.fill(); }
    // nuages qui filent (vitesse)
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    for (let i = 0; i < 6; i++) { const q = ((now / 1800 + i / 6) % 1), s = 0.3 + q * 1.4, x = W / 2 + (i % 2 ? 1 : -1) * W * (0.1 + q * 0.6), y = H * (0.45 + (i % 3 - 1) * 0.15 * q); ctx.beginPath(); ctx.ellipse(x, y, W * 0.08 * s, H * 0.03 * s, 0, 0, 6.29); ctx.fill(); }
  }
  draw_balai(st, now) {
    const ctx = this.ctx, W = this.W, H = this.H;
    for (const r of st.rings) { // l'anneau arrive du fond vers sa place
      const q = Math.min(1, (now - r.t0) / r.dur), [tx, ty] = this.ringXY(r.gx, r.gy), x = W / 2 + (tx - W / 2) * q, y = H * 0.45 + (ty - H * 0.45) * q, rad = H * (0.02 + 0.13 * q ** 1.5);
      ctx.globalAlpha = r.res ? Math.max(0, 1 - (now - r.t) / 500) : 1;
      ctx.strokeStyle = r.res === 'ok' ? '#b8f2a1' : r.res === 'miss' ? '#ff8fab' : '#ffd166'; ctx.lineWidth = Math.max(3, rad * 0.16);
      ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 1.1, 0, 0, 6.29); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // le petit sorcier sur son balai
    const [px, py] = this.ringXY(st.x, st.y), tilt = (st.x - (st.px ?? st.x)) * 6; st.px = st.x;
    ctx.save(); ctx.translate(px, py + Math.sin(now / 300) * H * 0.01); ctx.rotate(Math.max(-0.4, Math.min(0.4, tilt)) + st.x * 0.12);
    ctx.strokeStyle = '#8d5a3b'; ctx.lineWidth = H * 0.014; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-H * 0.12, H * 0.05); ctx.lineTo(H * 0.12, H * 0.03); ctx.stroke();
    ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.moveTo(-H * 0.11, H * 0.035); ctx.lineTo(-H * 0.2, H * 0.0); ctx.lineTo(-H * 0.2, H * 0.1); ctx.closePath(); ctx.fill();
    ctx.restore();
    this.emo('🧙', px, py - H * 0.03 + Math.sin(now / 300) * H * 0.01, H * 0.12);
    for (let i = 0; i < 3; i++) if (Math.random() < 0.5) this.fx.push({ k: 'spark', x: px - H * 0.18, y: py + H * 0.05 + (Math.random() - 0.5) * H * 0.04, t: now });
  }

  // ----- Le miroir magique : trois, deux, un… photo rigolote (gardée dans le grimoire)
  init_photo(st, now) { st.k = 0; st.next = now + 2500; st.count = 0; }
  up_photo(st, now) {
    if (st.count === 0 && now > st.next && st.k < st.n) { st.count = now; this.say('Trois, deux, un…', 0); }
    if (st.count && now - st.count > 3000) {
      st.count = 0; st.k++; st.flash = now; Audio8.perfect(); this.say(st.k === st.n ? 'Super photo !' : 'Ouistiti !', 0);
      try { const c = document.createElement('canvas'); c.width = 480; c.height = Math.round(480 * this.H / this.W); this.render(now); const x = c.getContext('2d'); if (this.v3 && scene3d.cv3) x.drawImage(scene3d.cv3, 0, 0, c.width, c.height); x.drawImage(this.cv, 0, 0, c.width, c.height); Photos.add(0, c.toDataURL('image/jpeg', 0.75)); } catch (e) { /* (photo impossible) */ }
      this.win(ARENA.photo.pts, '📸 Clic !');
      st.next = now + 2200;
      if (st.k >= st.n) setTimeout(() => this.s && this.s.game === 'photo' && this.finish(1), 1500);
    }
  }
  draw_photo(st, now, B) {
    const ctx = this.ctx, W = this.W, H = this.H;
    // cadre doré du miroir
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = H * 0.03; ctx.beginPath(); ctx.roundRect(W * 0.04, H * 0.06, W * 0.92, H * 0.88, H * 0.12); ctx.stroke();
    for (const [x, y] of [[0.04, 0.06], [0.96, 0.06], [0.04, 0.94], [0.96, 0.94]]) this.emo('✨', W * x, H * y, H * 0.06, now / 600);
    for (const s of [-1, 1]) this.emo(['🦋', '🐣', '🦄'][Math.floor(now / 3000) % 3], B.sh.x + s * B.T * 0.9, B.sh.y - B.T * 0.15 + Math.sin(now / 300 + s) * B.T * 0.05, B.T * 0.45); // (des amis sur les épaules)
    if (st.count) { const k = 3 - Math.floor((now - st.count) / 1000); if (k > 0) this.text(String(k), W / 2, H * 0.5, H * 0.3, '#ffd166', 0.85); }
    else if (st.k < st.n) this.text('Fais ta pose la plus rigolote !', W / 2, H * 0.86, H * 0.05, '#ffd166');
    if (st.flash && now - st.flash < 400) { ctx.fillStyle = `rgba(255,255,255,${1 - (now - st.flash) / 400})`; ctx.fillRect(0, 0, W, H); }
  }
  // Entrée en scène : panneau titre qui descend, puis 3, 2, 1
  hudIntro(now) {
    const ctx = this.ctx, W = this.W, H = this.H, it = this.intro, k = now - it.t0, a = ARENA[this.s.game];
    const e = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
    if (k < 1700) {
      const y = H * 0.36 - (1 - e(k / 450)) * H * 0.5 + (k > 1350 ? e((k - 1350) / 350) * -H * 0.6 : 0), w = Math.min(W * 0.7, H * 1.25), h = H * 0.24;
      ctx.save(); ctx.translate(W / 2, y); ctx.rotate(-0.02);
      ctx.fillStyle = 'rgba(30,20,80,.88)'; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = H * 0.008;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.25); ctx.fill(); ctx.stroke();
      this.emo(a.icon, -w / 2 + h * 0.55, 0, h * 0.62, Math.sin(now / 200) * 0.15);
      this.text(a.label, h * 0.35, -h * 0.08, Math.min(H * 0.075, w * 0.075), '#ffffff');
      this.text('★ Jeu miroir ★', h * 0.35, h * 0.27, H * 0.032, '#ffd166');
      ctx.restore();
    } else {
      const n = Math.floor((k - 1400) / 600), q = ((k - 1400) % 600) / 600;
      if (n < 3) this.text(String(3 - n), W / 2, H * 0.42, H * (0.34 - q * 0.08), ['#ff70a6', '#ffd166', '#b8f2a1'][n], 1 - Math.max(0, q - 0.7) / 0.3);
    }
  }
  hudGo(k) { const q = k / 700; this.text('GO !', this.W / 2, this.H * 0.42, this.H * (0.3 + q * 0.12), '#b8f2a1', 1 - q); }
  // Célébration : étoiles qui tombent une à une, gros « BRAVO ! »
  hudOutro(now) {
    const W = this.W, H = this.H, o = this.outro, k = now - o.t0, n = this.stars(o.ratio), good = o.ratio >= 0.5;
    const pop = (t) => { const x = Math.max(0, Math.min(1, t)); return x < 0.6 ? x / 0.6 * 1.2 : 1.2 - (x - 0.6) / 0.4 * 0.2; };
    this.text(good ? (n === 3 ? 'CHAMPION !' : 'BRAVO !') : 'PRESQUE !', W / 2, H * 0.2, H * 0.11 * pop(k / 400), good ? '#ffd166' : '#bde0fe');
    for (let i = 0; i < 3; i++) { const t = (k - 350 - i * 260) / 300; if (t < 0) continue; this.emo(i < n ? '⭐' : '☆', W / 2 + (i - 1) * H * 0.15, H * 0.33, H * 0.11 * pop(t), (i - 1) * 0.15, i < n ? 1 : 0.5); if (t < 0.15 && i < n && !o['s' + i]) { o['s' + i] = true; Audio8.coin(); } }
  }

  // ======================= Interface par-dessus la 3D (textes, chronos, recette) =======================
  bar(k, y, col = '#ffd166') { const ctx = this.ctx, W = this.W, H = this.H; ctx.fillStyle = 'rgba(30,27,75,.55)'; ctx.beginPath(); ctx.roundRect(W * 0.25, y, W * 0.5, H * 0.018, H * 0.009); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(W * 0.25, y, Math.max(H * 0.018, W * 0.5 * Math.max(0, Math.min(1, k))), H * 0.018, H * 0.009); ctx.fill(); }
  ring(x, y, r, k, col = '#ffd166', w = 0.012) { const ctx = this.ctx; ctx.lineCap = 'round'; ctx.lineWidth = this.H * w; ctx.strokeStyle = 'rgba(30,27,75,.45)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.stroke(); ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.max(0, k) * 6.29); ctx.stroke(); }
  // Consigne permanente en bas de l'écran : grosse pastille (icône ou dessin de la pose + texte court)
  pill(text, col = '#ffffff', pose = null) {
    const ctx = this.ctx, W = this.W, H = this.H, h = H * 0.095, y = H * 0.885;
    ctx.save(); ctx.font = `800 ${H * 0.048}px 'Baloo 2', system-ui, sans-serif`;
    const tw = ctx.measureText(text).width, pw = pose ? h * 1.05 : 0, w = Math.min(W * 0.92, tw + pw + H * 0.07);
    ctx.fillStyle = 'rgba(30,20,80,.82)'; ctx.strokeStyle = 'rgba(255,209,102,.9)'; ctx.lineWidth = H * 0.005;
    ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y - h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
    if (pose) {
      this.pc = this.pc || Object.assign(document.createElement('canvas'), { width: 150, height: 150 });
      const pc = this.pc.getContext('2d'); drawPicto(pc, 150, 150, pose, performance.now());
      ctx.fillStyle = '#fff8e7'; ctx.beginPath(); ctx.arc(W / 2 - w / 2 + h * 0.55, y, h * 0.44, 0, 6.29); ctx.fill();
      ctx.drawImage(this.pc, W / 2 - w / 2 + h * 0.1, y - h * 0.45, h * 0.9, h * 0.9);
    }
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, W / 2 + pw / 2, y + H * 0.004, w - pw - H * 0.04);
    ctx.restore();
  }
  posePicto(p) { return p === 'squat' ? { m: 'squat' } : p === 'left' || p === 'right' ? { m: p } : { m: 'pose', pose: p }; }
  hud_mur(st, now) {
    const w = st.wall;
    if (!w) { if (st.k < st.n) this.pill(`Mur ${st.k + 1} / ${st.n} : regarde le trou !`, '#ffd166'); return; }
    this.pill((w.match ? '✅ Parfait, garde la pose : ' : 'Fais la pose du trou : ') + AR_POSE_NAMES[w.pose], w.match ? '#b8f2a1' : '#ffd166', this.posePicto(w.pose));
  }
  hud_soleil(st, now) {
    const W = this.W, H = this.H, look = st.phase === 'regarde';
    if (look) { this.ctx.fillStyle = `rgba(255,80,80,${0.1 + 0.05 * Math.sin(now / 90)})`; this.ctx.fillRect(0, 0, W, H); }
    this.text(look ? '🗿 STATUE !' : st.phase === 'dos' ? '🏃 COURS !' : 'Prêt ?', W / 2, H * 0.2, H * 0.085, look ? '#ff8fab' : '#b8f2a1');
    this.bar(st.prog, H * 0.78, '#ffd166'); this.emo('🧙', W * 0.25 + W * 0.5 * st.prog, H * 0.755, H * 0.05); this.emo('☁️', W * 0.77, H * 0.785, H * 0.05);
    this.pill(look ? 'Il te regarde : ne bouge plus du tout !' : 'Cours sur place pour avancer vers le nuage', look ? '#ff8fab' : '#ffffff');
  }
  hud_pimprenelle(st, now) {
    const W = this.W, H = this.H, c = st.cur;
    if (c) {
      this.bubble(W * 0.5, H * 0.2, W * 0.64, H * 0.09, (c.simon ? '🦉 Pimprenelle a dit : ' : '🦉 ') + c.o.no.replace(' !', '') + ' ' + c.o.icon, H * 0.045);
      this.bar(1 - Math.min(1, (now - c.t0) / c.win), H * 0.265);
    }
    if (st.res && now - st.res.t < 1200) this.text(st.res.good ? '✅ Bravo !' : '😜 Piégé !', W / 2, H * 0.4, H * 0.08, st.res.good ? '#b8f2a1' : '#ff8fab');
    this.pill('Fais-le seulement si elle dit « Pimprenelle a dit » !', '#ffffff');
  }
  hud_neige(st, now) {
    for (const m of st.men) if (!m.hit && !m.gone && m.x != null && now - m.t0 > 300) { const p = this.v3.slotXY(m.slot, 2.0); this.ring(p.x, p.y, this.H * 0.025, 1 - (now - m.t0) / m.life, '#ffd166', 0.008); }
    this.pill('☝️ Lève le bras, puis lance-le vers un bonhomme !', '#ffffff');
  }
  hud_potions(st, now) {
    const ctx = this.ctx, W = this.W, H = this.H;
    ctx.fillStyle = 'rgba(255,250,240,.94)'; ctx.strokeStyle = '#7b2cbf'; ctx.lineWidth = H * 0.006; ctx.beginPath(); ctx.roundRect(W * 0.02, H * 0.3, W * 0.12, H * 0.42, H * 0.03); ctx.fill(); ctx.stroke();
    this.emo('📜', W * 0.08, H * 0.35, H * 0.045);
    st.recipe.forEach((r, i) => { const y = H * (0.45 + i * 0.09); this.emo(r.e, W * 0.07, y, H * 0.06, 0, r.got ? 0.4 : 1); if (r.got) this.emo('✅', W * 0.11, y, H * 0.035); });
    if (st.phase === 'stir') { const p = this.v3.potXY(), k = Math.min(1, st.stir / (4 * Math.PI)); this.ring(p.x, p.y, H * 0.08, k); this.text('🌀 Touille !', W / 2, H * 0.2, H * 0.07, '#ffd166'); this.pill('Fais de grands cercles avec ton bras 🔄', '#ffd166'); }
    else this.pill('✋ Touche avec ta main : ' + st.recipe.filter((r) => !r.got).map((r) => r.e).join(' '), '#ffffff');
  }
  hud_duel(st, now, B) {
    const W = this.W, H = this.H, g = this.v3.grimXY();
    for (let i = 0; i < st.n; i++) this.emo(i < st.hp ? '💜' : '🤍', g.x + (i - (st.n - 1) / 2) * H * 0.045, g.y, H * 0.038);
    this.text('Grimaud', g.x, g.y - H * 0.05, H * 0.035, '#e0c3fc');
    if (st.phase === 'charge') this.pill('⚠️ Attention, Grimaud prépare un sort…', '#ffd166');
    else if (st.phase === 'cast') this.pill(st.kind === 'shield' ? '🙏 Bouclier : joins tes mains devant toi !' : '↔️ Esquive : fais un pas de côté !', st.safe ? '#b8f2a1' : '#ffd166', st.kind === 'shield' ? null : { m: 'fork' });
    else if (st.phase === 'counter') this.pill('🙌 À toi : lève les deux bras pour lancer ton sort !', '#ffd166', { m: 'pose', pose: 'armsUp' });
    else this.pill('Regarde Grimaud…', '#ffffff');
    if (st.hurt && now - st.hurt < 400) { this.ctx.fillStyle = `rgba(255,77,109,${0.3 * (1 - (now - st.hurt) / 400)})`; this.ctx.fillRect(0, 0, W, H); }
  }
  hud_corde(st, now) {
    const strong = now - st.burst < 1100;
    this.text(strong ? '💨 Il tire fort !' : '💪 Tire !', this.W / 2, this.H * 0.2, this.H * 0.075, strong ? '#ff8fab' : '#b8f2a1');
    this.bar(st.ratio, this.H * 0.78, '#c77dff');
    this.pill('Bouge les bras très vite pour tirer la corde !', '#ffffff');
  }
  hud_equilibre(st) {
    const W = this.W, H = this.H, up = tracker.mode === 'upper';
    if (st.gust) this.text('💨 Le vent !', W / 2, H * 0.2, H * 0.08, '#bde0fe');
    this.bar(st.ratio, H * 0.78, '#b8f2a1');
    this.pill(st.gust ? 'Ouvre grand les bras pour ne pas tomber !' : up ? 'Garde les bras ouverts' : 'Tiens sur un pied', st.ok2 ? '#b8f2a1' : '#ffd166', st.gust || up ? { m: 'pose', pose: 'airplane' } : { m: 'pose', pose: 'flamingo' });
  }
  hud_balai(st, now) {
    const r = (st.rings || []).find((x) => !x.res);
    const t = !r ? 'Prépare-toi…' : r.gx < 0 ? '⬅️ Penche-toi à gauche' : r.gx > 0 ? 'Penche-toi à droite ➡️' : '⬆️ Reste au milieu';
    this.pill(t + (r && r.gy < 0 ? ' · 🙌 bras levés' : r && r.gy > 0 ? ' · accroupi' : ''), '#ffffff');
  }
  hud_photo(st, now) {
    const ctx = this.ctx, W = this.W, H = this.H;
    if (st.count) { const k = 3 - Math.floor((now - st.count) / 1000); if (k > 0) this.text(String(k), W / 2, H * 0.45, H * 0.3, '#ffd166', 0.9); }
    else if (st.k < st.n) this.pill('📸 Fais ta pose la plus rigolote !', '#ffd166');
    if (st.flash && now - st.flash < 400) { ctx.fillStyle = `rgba(255,255,255,${1 - (now - st.flash) / 400})`; ctx.fillRect(0, 0, W, H); }
  }
}
const now0 = () => performance.now();
const arena = new Arena();
