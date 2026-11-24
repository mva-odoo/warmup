// Jeux miroir (étape « arena ») : une scène fixe, comme les jeux de console à caméra. L'enfant se voit en grand (image de
// la caméra, en miroir, avec un chapeau de sorcier et des mains lumineuses) et la magie se dessine autour de lui : murs à
// traverser, ordres de Madame Pimprenelle, bonshommes de neige, la grande course des chevaliers… Quand il touche un objet
// avec sa vraie main, il le touche à l'écran : rien à viser.
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
// Musique de chaque jeu miroir (styles d'audio.js ; un morceau à lui, tiré de son nom)
// Consigne dite à voix haute quand un mur arrive (les petits ne lisent pas ; gauche / droite : on suit la flèche)
const AR_POSE_TIPS = { armsUp: 'Lève les bras tout en haut !', airplane: 'Fais l\'avion, les bras sur les côtés !', star: 'Fais l\'étoile, bras et jambes écartés !',
  flamingo: 'Lève un pied, comme un flamant rose !', squat: 'Accroupis-toi, tout petit !', left: 'Va du côté de la flèche !', right: 'Va du côté de la flèche !' };
const AR_MUSIC = { mur: 'dance', pimprenelle: 'fun', neige: 'candy', course: 'adventure' };
// La grande course : le chevalier de l'enfant à pleine vitesse arrive en COURSE_FAST × la durée de l'épreuve ;
// le rival, qui va à vitesse régulière, en COURSE_RIVAL × cette durée (plus lent en mode facile : × vitesse de la partie)
const COURSE_FAST = 0.55, COURSE_RIVAL = 0.92;

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
      if (b0 && !b0.reachK && !DEV.get('nocal')) { this.cal = { t0: this.t0, i: 0, on: 0, best: 0, vals: [], st: this.t0 }; Audio8.say(duo() ? 'Échauffement magique ! L\'un de vous deux, tends bien le bras pour attraper l\'étoile !' : 'Échauffement magique ! Tends bien ton bras pour attraper l\'étoile !', { interrupt: true }); }
      else { Audio8.whoosh(); setTimeout(() => this.intro && Audio8.sting(), 250); }
    }
    this.cv.classList.remove('hidden'); document.body.classList.add('arenaOn');
    const init = this['init_' + s.game]; if (init) init.call(this, this.st, this.t0);
  }
  musicWanted() { return !!this.s && !this.outro; }
  end() { if (this.s) Audio8.music(false); if (this.v3) { this.v3.end(); this.v3 = null; } this.s = null; this.intro = null; this.outro = null; this.cal = null; document.body.classList.remove('arenaIntro'); this.cv.classList.add('hidden'); document.body.classList.remove('arenaOn'); this.fx = []; }
  // Pause : toutes les échéances du jeu sont décalées (murs, ordres, bonshommes, anneaux…)
  shift(d) {
    const keys = new Set(['t0', 'at', 'until', 'next', 'count', 'hit', 'gone', 't', 'autoT', 'detT', 'finishAt', 'endT', 'pushT']);
    const seen = new Set(); // (un objet visible par deux chemins — bonhomme visé par une boule — n'est décalé qu'une fois)
    const walk = (o, depth) => { if (!o || typeof o !== 'object' || depth > 3 || seen.has(o)) return; seen.add(o); for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'number' && keys.has(k) && v > 1000) o[k] = v + d; else if (typeof v === 'object') walk(v, depth + 1); } };
    walk(this.st, 0); this.lastT += d;
    if (this.intro) this.intro.t0 += d; if (this.outro) this.outro.t0 += d; if (this.cal) { this.cal.t0 += d; this.cal.st += d; } if (this.v3) this.v3.shift(d);
  }
  ratio() { const st = this.st; if (!st) return 0; return st.ratio != null ? st.ratio : st.ok / Math.max(1, st.n); }
  detail() {
    const s = this.s, st = this.st; if (!s) return '';
    const icon = ARENA[s.game].icon;
    if (s.game === 'course') return `<div class="runCount">${icon} <b>${Math.round((st.prog || 0) * 100)} %</b></div>`;
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
    // À deux, jeux miroir : il suffit qu'UN des enfants fasse le geste (le petit n'attend pas le grand, et inversement)
    const act = tracker.active, any = (k) => act.some((x) => x.state[k]);
    const st = { ...(this.fake || {}) }, base = act.length > 1 ? null : tracker.state;
    for (const k of ['armsUp', 'airplane', 'star', 'starArms', 'flamingo', 'squat', 'handsTogether', 'present']) if (st[k] == null) st[k] = base ? !!base[k] : any(k);
    if (st.side == null) st.side = base ? base.side || 'center' : (act.find((x) => x.state.side !== 'center') || { state: { side: 'center' } }).state.side;
    if (this.v3) return this.v3.body(this, now, st); // (3D : le petit sorcier du jeu imite l'enfant ; on touche avec SES mains ; avant l'image de la caméra, sinon le sorcier 3D ne suit pas la webcam)
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
    if (st.wave) { const a = Math.sin(now / 90); G.wL = [0.6, 0.2 + a * 0.6]; G.wR = [-0.6, 0.2 - a * 0.6]; } // (court sur place)
    return G;
  }
  hands(B) { return [B.J.handL, B.J.handR].filter((h) => h && (h.v == null || h.v > 0.3)); }
  touching(B, x, y, r) { const rr = (this.v3 ? r * 1.25 : r) * Math.max(1, Math.min(1.25, this.g.diffK || 1)); return this.hands(B).some((h) => Math.hypot(h.x - x, h.y - y) < rr); } // (3D : un peu plus généreux)
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
    const mw = this.musicWanted(); // (musique du jeu : elle reprend après une pause, se tait pour la célébration)
    if (mw !== Audio8.musicOn()) Audio8.music(mw, AR_MUSIC[this.s.game] || 'fun', 'arena-' + this.s.game);
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
    const st0 = this.st;
    if (st0.finishAt) { if (now >= st0.finishAt) { st0.finishAt = 0; this.finish(st0.finishRatio); } return; } // (fin différée, suspendue pendant la pause)
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
      else { const hud = this['hud_' + this.s.game]; if (hud) hud.call(this, this.st, now, B); this.duoBadges(now); if (this.introEnd && now - this.introEnd < 700) this.hudGo(now - this.introEnd); }
      this.drawFx(now); ctx.restore(); return;
    }
    ctx.save();
    this.drawMirror(now, B);
    const dr = this['draw_' + this.s.game]; if (dr) dr.call(this, this.st, now, B);
    if (!this.intro && !this.outro && !this.cal) this.duoBadges(now);
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
  // (à deux : seulement les deux étoiles des côtés, et le bras de n'importe quel enfant compte — sinon seul celui qui « mène » était vu)
  calDirs() { return duo() && !tracker.sim ? [[-1, 0.05], [1, 0.05]] : [[-0.7, -0.7], [0.7, -0.7], [-1, 0.05], [1, 0.05]]; }
  updateCal(now) {
    const cal = this.cal, b0 = tracker.lead();
    this.ev.splice(0); this.B = this.body(now);
    const dt = Math.min(0.1, (now - (cal.last || now)) / 1000); cal.last = now;
    const D = this.calDirs()[cal.i];
    // bras de chaque enfant vu (seul : celui qui mène) ; on retient la portée de chacun
    const kids = duo() && this.v3 ? tracker.active.filter((b) => b.state.present && b.lm) : [];
    const sets = kids.length ? kids.map((b) => [b, this.v3.handVecs(this, now, this.B.st, b, true)]) : [[b0, (this.v3 && this.v3.lastVec) || []]];
    let hit = false;
    const ready = now > (cal.wait || 0); // (petite pause entre deux étoiles : le temps de passer de l'autre côté)
    if (tracker.sim) { if (now - cal.st > 700) { hit = true; cal.best = 1; } }
    else if (ready) for (const [b, vec] of sets) for (const v of vec) {
      if (!v) continue; const L = Math.hypot(v[0], v[1]); if (L < (b && b.easy ? 0.45 : 0.55)) continue; // (mode petit : bras moins tendu suffit)
      if ((v[0] * D[0] + v[1] * D[1]) / (L * Math.hypot(D[0], D[1])) > 0.7) { // (longueur lissée sur les images du geste : le maximum d'une image prenait les pics de la détection)
        hit = true; cal.best = cal.best ? cal.best + (L - cal.best) * 0.3 : L; if (b) { const pm = (cal.per = cal.per || new Map()), o = pm.get(b); pm.set(b, o ? o + (L - o) * 0.3 : L); }
      }
    }
    cal.on = hit ? cal.on + dt : Math.max(0, cal.on - dt * 2);
    const next = (val) => {
      if (val) { cal.vals.push(val); Audio8.coin(); const p = this.calStar(cal.i); this.burst(p.x, p.y, 30); if (this.v3) this.v3.react('win'); }
      cal.i++; cal.on = 0; cal.best = 0; cal.st = now; cal.wait = now + 1000;
      if (cal.i >= this.calDirs().length) this.endCal(now);
    };
    if (cal.on > 0.4) next(cal.best);
    else if (now - cal.st > 12000) next(null); // (étoile trop difficile : on passe, mais on laisse le temps)
  }
  endCal(now) {
    const cal = this.cal, v = [...cal.vals].sort((a, b) => a - b), b0 = tracker.lead();
    const reach = v.length ? v[Math.floor(v.length / 2)] : 1.1;
    const k = (r) => Math.max(0.7, Math.min(1.6, r * 1.05)); // (un peu de marge : bras tendu = bord de la portée du jeu)
    if (b0) b0.reachK = k(reach);
    // (à deux : chaque enfant qui a attrapé une étoile a sa portée ; l'autre prend celle du groupe)
    for (const b of tracker.bodies) { const r = cal.per && cal.per.get(b); if (r) b.reachK = k(Math.min(r, reach * 1.3)); else if (!b.reachK) b.reachK = k(reach); }
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
    for (let i = 0; i < this.calDirs().length; i++) {
      const p = this.calStar(i), cur = i === cal.i, done = i < cal.i;
      if (cur) { this.ring(p.x, p.y, this.B.T * 0.55, cal.on / 0.4, '#b8f2a1', 0.01); this.emo('⭐', p.x, p.y, this.B.T * (0.75 + 0.1 * Math.sin(now / 150))); }
      else this.emo(done ? '✅' : '⭐', p.x, p.y, this.B.T * (done ? 0.45 : 0.4), 0, done ? 1 : 0.35);
    }
    this.pill((duo() && !tracker.sim ? ['⬅️ L\'un de vous deux : tends le bras vers l\'étoile !', 'Et de l\'autre côté ! ➡️'] : ['↖️ Tends le bras vers l\'étoile, en haut !', '↗️ Et l\'autre étoile, en haut !', '⬅️ Tends le bras sur le côté !', 'Et de l\'autre côté ! ➡️'])[cal.i] || '', '#ffffff');
  }

  // ---------- À deux : ce que le jeu demande à CHAQUE enfant, et qui l'a déjà fait (les deux doivent le faire ensemble)
  wanted() {
    const st = this.st, g = this.s.game;
    if (g === 'mur') return st.wall ? { pose: st.wall.pose } : null;
    if (g === 'pimprenelle' && st.cur && st.cur.simon && !/jump|smash/.test(st.cur.o.g)) return { pose: st.cur.o.g };
    if (g === 'course' && !st.winner) return { move: true };
    return null;
  }
  // Une pastille par enfant, de son côté de l'écran (sa couleur, son prénom) : ✅ c'est bon, 👉 « à toi ! »
  duoBadges(now) {
    if (typeof duo !== 'function' || !duo() || tracker.sim || !this.st) return;
    const want = this.wanted(), ctx = this.ctx, W = this.W, H = this.H, r = H * 0.055;
    tracker.bodies.forEach((b, i) => {
      if (b.away) return;
      const left = b.center ? 1 - b.center.x < 0.5 : i === 0, x = left ? W * 0.07 : W * 0.93, y = H * 0.2;
      const s = b.state, seen = s.present || s.low;
      const ok = !want || !seen ? null : want.pose ? this.poseOk({ st: s }, want.pose) : want.move ? (b.motion || 0) > 0.02 : (b.motion || 0) < 0.03;
      const name = (team[i] && team[i].name) || (i ? 'Joueur 2' : 'Joueur 1');
      ctx.save(); ctx.fillStyle = colors[i] || '#ffd166'; ctx.strokeStyle = ok ? '#4ade80' : '#ffffff'; ctx.lineWidth = r * (ok ? 0.22 : 0.12);
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill(); ctx.stroke(); ctx.restore();
      this.text(name.charAt(0).toUpperCase(), x, y + r * 0.05, r * 1.1);
      this.text(name, x, y + r * 1.55, H * 0.032);
      const tag = !seen ? '👀' : ok == null ? '' : ok ? '✅' : '👉 à toi !';
      if (tag) this.text(tag, x, y + r * 2.45 + (ok === false ? Math.sin(now / 150) * H * 0.006 : 0), H * 0.036, ok ? '#b8f2a1' : '#ffd166');
    });
    if (want && (want.pose || want.move)) this.text('👫 Tous les deux en même temps !', W / 2, H * 0.13, H * 0.035, '#ffffff');
  }

  // ---------- L'enfant imaginaire (mode test) : fait ce que le jeu demande, avec un temps de réaction
  autoPlay(now, evs) {
    const st = this.st, g = this.s.game, f = (this.fake = {});
    const once = (key, gap, ev) => { if (now - (this.autoAt?.[key] || 0) > gap) { this.autoAt = { ...(this.autoAt || {}), [key]: now }; evs.push(ev); if (ev === 'jump') this.lastJump = now; if (ev === 'smash') this.lastSmash = now; } };
    if (g === 'mur') { const w = st.wall; if (w && (now - w.t0) / w.dur > 0.55) { if (w.pose === 'left' || w.pose === 'right') f.side = w.pose; else f[w.pose] = true; } }
    if (g === 'course' && !st.winner) f.wave = true;
    if (g === 'pimprenelle' && st.cur && st.cur.simon && now - st.cur.t0 > 900) { const o = st.cur.o.g; if (o === 'jump' || o === 'smash') once('simon', 600, o); else if (o === 'squat') f.squat = true; else f[o] = true; }
    if (g === 'neige') { const m = (st.men || []).find((x) => !x.hit && now - x.t0 > 700); if (m) once('throw', 900, m.x < this.W / 2 ? 'throwL' : 'throwR'); }
  }

  // ======================= Les jeux =======================

  // ----- Le Mur Magique : un mur arrive avec un trou en forme de pose ; on prend la pose pour passer
  init_mur(st, now) {
    const pool = ['armsUp', 'airplane', 'star', 'squat', 'left', 'right', ...(tracker.mode === 'upper' ? [] : ['flamingo'])];
    st.seq = []; while (st.seq.length < st.n) { const l = pool.filter((p) => p !== st.seq[st.seq.length - 1]); st.seq.push(l[Math.floor(Math.random() * l.length)]); }
    st.k = 0; st.next = now + 1800 * Math.min(1, this.g.mul); st.wall = null;
  }
  up_mur(st, now, dt, B) {
    const easy = tracker.bodies.some((b) => b.easy); // (mode petit : murs plus lents, et la pose compte plus tôt)
    if (!st.wall && st.k < st.n && now > st.next) {
      st.wall = { pose: st.seq[st.k], t0: now, dur: Math.max(2.4, 4 - st.k * 0.18) * 1000 * Math.min(1.3, this.g.mul) * (easy ? 1.4 : 1), ok: false };
      this.say(AR_POSE_TIPS[st.wall.pose], 0);
    }
    const w = st.wall; if (!w) return;
    const q = (now - w.t0) / w.dur;
    w.match = this.poseOk(B, w.pose);
    if (q > (easy ? 0.4 : 0.62) && w.match) w.ok = true;
    if (q >= 1) {
      st.k++; st.wall = null; st.next = now + 900 * Math.min(1, this.g.mul);
      if (w.ok) { this.win(ARENA.mur.pts, 'SUPER !', B.sh.x, B.sh.y); this.say('Super, le mur est passé !', 0); this.fx.push({ k: 'shatter', t: now }); }
      else { Audio8.soft(); this.say('Ouille, le mur !', 0); this.pop('Bong !', B.sh.x, B.sh.y, '#ff8fab'); }
      ui.setDetail(this.g.detail(this.c));
      if (st.k >= st.n) this.finish(st.ok / st.n);
    }
  }
  draw_mur(st, now, B) {
    const w = st.wall, ctx = this.ctx, W = this.W, H = this.H;
    if (!w) { if (st.k < st.n) this.text(`Mur ${st.k + 1} / ${st.n}`, W / 2, H * 0.86, H * 0.05, '#ffd166'); return; }
    this.poseGhost(w.pose, B, w.match, now);
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

  // ----- La grande course : courir sur place fait avancer le chevalier de l'enfant vers le drapeau, contre un chevalier
  // rival qui avance à vitesse régulière ; le premier arrivé gagne (à deux, le mouvement des deux enfants compte)
  init_course(st, now) {
    st.prog = 0; st.rival = 0; st.sp = 0; st.ratio = 0; st.winner = null; st.keyRun = 0;
    st.at = now + (this.v3 ? 300 : 1500); // (départ ; en 3D, le 3, 2, 1… de l'entrée en scène vient d'être fait)
    st.rivalMs = ARENA.course.sec * 1000 * COURSE_RIVAL * Math.max(0.6, this.g.mul || 1);
  }
  up_course(st, now, dt, B, evs) {
    if (st.winner) return;
    if (now < st.at) return;
    if (!st.said) { st.said = true; this.say('Cours !', 0); }
    // vitesse de course : le mouvement de l'enfant (à deux : la somme des deux), ou les touches / l'enfant imaginaire
    const mSum = B.real ? tracker.active.filter((x) => x.state.present).reduce((a, x) => a + (x.motion || 0), 0) || B.motion : 0;
    if (this.has(evs, 'jump', 'left', 'right', 'smash') || (tracker.sim && !this.auto && (tracker.state.side !== 'center' || tracker.state.squat))) st.keyRun = 1;
    st.keyRun = Math.max(0, st.keyRun - dt * 1.6);
    const sp = B.real ? Math.max(0, Math.min(1, (mSum - 0.008) / 0.018)) : B.st.wave ? 1 : st.keyRun; // (courir sur place d'un enfant : ~0,02)
    st.sp += (sp - st.sp) * Math.min(1, dt * 4);
    st.prog = Math.min(1, st.prog + dt * st.sp / (ARENA.course.sec * COURSE_FAST));
    st.rival = Math.min(1, st.rival + dt * 1000 / st.rivalMs); // (même horloge que l'enfant : équitable même sur un PC lent)
    st.ratio = st.prog;
    if (now - (st.detT || 0) > 300) { st.detT = now; ui.setDetail(this.g.detail(this.c)); }
    if (st.rival - st.prog > 0.12 && now - (st.pushT || 0) > 6000) { st.pushT = now; this.say('Plus vite !', 0); }
    if (st.prog >= 1) {
      st.winner = 'kid'; st.endT = now;
      this.g.add(this.g.pts(ARENA.course.pts), 'GAGNÉ !'); this.burst(this.W / 2, this.H * 0.4, 60);
      if (this.v3) this.v3.react('win');
      st.finishAt = now + 900; st.finishRatio = 1; // (le temps de voir passer la ligne d'arrivée)
    } else if (st.rival >= 1) {
      st.winner = 'rival'; st.endT = now;
      const pts = Math.round(ARENA.course.pts * st.prog * 0.5); if (pts > 0) this.g.add(this.g.pts(pts), '+' + this.g.pts(pts));
      st.finishAt = now + 900; st.finishRatio = st.prog;
    }
  }
  draw_course(st, now, B) { // (sans 3D : deux couloirs en bas de l'image, le chevalier de l'enfant et le rival, le drapeau)
    const ctx = this.ctx, W = this.W, H = this.H, x0 = W * 0.1, x1 = W * 0.84, sz = H * 0.065;
    for (const [y, k, ch, col] of [[H * 0.8, st.rival, '⚔️', '#e63946'], [H * 0.9, st.prog, '🛡️', '#ffd166']]) {
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = H * 0.018; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + (x1 - x0) * k, y); ctx.stroke();
      const run = !st.winner && now > st.at && (col === '#e63946' || st.sp > 0.15);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * k, y - sz * 0.6 - (run ? Math.abs(Math.sin(now / 110)) * sz * 0.25 : 0), sz * 0.55, 0, 6.29); ctx.fill();
      this.emo(ch, x0 + (x1 - x0) * k, y - sz * 0.6 - (run ? Math.abs(Math.sin(now / 110)) * sz * 0.25 : 0), sz * 0.7);
    }
    this.emo('🏁', x1 + W * 0.04, H * 0.84, H * 0.09);
    const t = st.winner === 'kid' ? '🏆 GAGNÉ !' : st.winner === 'rival' ? 'Presque !' : now < st.at ? 'Prêt ?' : '🏃 COURS !';
    this.text(t, W / 2, H * 0.14, H * 0.07, st.winner === 'rival' ? '#bde0fe' : '#b8f2a1');
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
      st.cur = null; st.i++; st.next = now + 1300 * Math.min(1, this.g.mul); st.res = { good, t: now };
      if (good) this.win(ARENA.pimprenelle.pts, c.simon ? 'BRAVO !' : 'PAS PIÉGÉ !', B.sh.x, B.sh.y); else Audio8.soft();
      if (msg) this.say(msg, 0);
      if (st.i >= st.n) { st.finishAt = now + 1200; st.finishRatio = st.ok / st.n; }
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
    const thrown = evs.some((e) => /^throw[LR]$/.test(e)); // (un lancer émet aussi « smash » : une seule boule par lancer)
    for (const e of evs) {
      if (!/^throw[LR]$|^smash$/.test(e) || (e === 'smash' && thrown)) continue;
      const hand = (e === 'throwR' ? B.J.handR || B.J.handL : B.J.handL || B.J.handR) || B.sh; // (main pas vue à cet instant : l'autre, ou les épaules)
      if (!hand) continue;
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
  // Silhouette jaune de la pose à prendre, posée sur le petit sorcier (verte quand c'est bon) : on voit tout de suite
  // où mettre les bras et les jambes, bien avant que le mur arrive. Calée sur la place « debout » de l'enfant.
  poseGhost(pose, B, match, now) {
    const ctx = this.ctx, G = AR_SHAPES[pose]; if (!G || !B || !B.sh || !B.T) return;
    if (!B.st.squat || !this.ghostRef) this.ghostRef = this.ghostRef ? { x: this.ghostRef.x + (B.sh.x - this.ghostRef.x) * 0.15, y: this.ghostRef.y + (B.sh.y - this.ghostRef.y) * 0.15 } : { ...B.sh };
    const T = B.T, o = this.ghostRef, pt = (k) => [o.x - G[k][0] * T, o.y + G[k][1] * T], col = match ? '#4ade80' : '#ffd166';
    ctx.save(); ctx.globalAlpha = match ? 0.55 : 0.4 + 0.15 * Math.sin(now / 180);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = T * 0.3;
    ctx.beginPath(); for (const [a, b] of TARGET_BONES) { if (!G[a] || !G[b]) continue; ctx.moveTo(...pt(a)); ctx.lineTo(...pt(b)); } ctx.stroke();
    const hd = AR_HEAD(G); ctx.beginPath(); ctx.arc(o.x - hd[0] * T, o.y + hd[1] * T, T * 0.3, 0, 6.29); ctx.fill();
    ctx.globalAlpha = 1;
    // aides : flèche vers le côté (pas de côté), flèche vers le bas (accroupi)
    const bob = Math.sin(now / 150) * T * 0.12;
    if (pose === 'left' || pose === 'right') { const d = pose === 'left' ? -1 : 1; this.text(d < 0 ? '⬅️' : '➡️', o.x + d * (T * 1.9 + bob), o.y + T * 0.4, T * 0.9); }
    if (pose === 'squat') this.text('⬇️', o.x + T * 1.3, o.y + T * 0.4 + bob, T * 0.8);
    ctx.restore();
  }
  posePicto(p) { return p === 'squat' ? { m: 'squat' } : p === 'left' || p === 'right' ? { m: p } : { m: 'pose', pose: p }; }
  hud_mur(st, now, B) {
    const w = st.wall;
    if (!w) { if (st.k < st.n) this.pill(`Mur ${st.k + 1} / ${st.n} : regarde le trou !`, '#ffd166'); return; }
    this.poseGhost(w.pose, B, w.match, now);
    this.pill((w.match ? '✅ Parfait, garde la pose : ' : 'Fais la pose du trou : ') + AR_POSE_NAMES[w.pose], w.match ? '#b8f2a1' : '#ffd166', this.posePicto(w.pose));
  }
  hud_course(st, now) {
    const W = this.W, H = this.H, t = st.winner === 'kid' ? '🏆 GAGNÉ !' : st.winner === 'rival' ? 'Presque !' : now < st.at ? 'Prêt ?' : '🏃 COURS !';
    this.text(t, W / 2, H * 0.17, H * 0.08, st.winner === 'rival' ? '#bde0fe' : '#b8f2a1');
    // la course vue d'en haut : le rival (rouge) et le chevalier de l'enfant (doré) vers le drapeau
    this.bar(st.rival, H * 0.25, '#e63946'); this.emo('⚔️', W * 0.25 + W * 0.5 * st.rival, H * 0.235, H * 0.045);
    this.bar(st.prog, H * 0.3, '#ffd166'); this.emo('🛡️', W * 0.25 + W * 0.5 * st.prog, H * 0.285, H * 0.05);
    this.emo('🏁', W * 0.78, H * 0.27, H * 0.06);
    if (!st.winner) this.pill(now < st.at ? 'Prépare-toi à courir…' : 'Cours sur place, lève bien les genoux !', '#ffffff');
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
}
const now0 = () => performance.now();
const arena = new Arena();
