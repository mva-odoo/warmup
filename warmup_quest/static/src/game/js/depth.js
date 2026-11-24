// Rendu « en profondeur » (pseudo-3D en 2D) : chemin vers l'horizon, 3 couloirs,
// héros vu de dos, obstacles qui arrivent du fond, rencontres de créatures.

function drawHeroBack(ctx, x, y, s, h, pose, t) {
  ctx.save();
  ctx.translate(x, y);
  const ph = t * 0.014;
  const duck = pose === 'duck';
  const sq = duck ? 0.65 : 1;
  const bob = pose === 'run' ? Math.abs(Math.sin(ph)) * s * 0.05 : 0;
  ctx.translate(0, -bob);
  const legH = s * 0.22 * (duck ? 0.5 : 1);
  const R = s * 0.42;
  const cy = -legH - R * sq * 0.9;
  ctx.lineCap = 'round';

  // Jambes
  let feet;
  switch (pose) {
    case 'run': feet = [[-0.15, -Math.max(0, Math.sin(ph)) * 0.13], [0.15, -Math.max(0, -Math.sin(ph)) * 0.13]]; break;
    case 'star': feet = [[-0.33, 0], [0.33, 0]]; break;
    case 'flamingo': feet = [[-0.08, 0], [0.16, -0.2]]; break;
    case 'jump': feet = [[-0.17, -0.08], [0.17, -0.08]]; break;
    case 'duck': feet = [[-0.22, 0], [0.22, 0]]; break;
    default: feet = [[-0.15, 0], [0.15, 0]];
  }
  ctx.strokeStyle = h.limb; ctx.lineWidth = s * 0.09;
  for (const [i, [fx, fy]] of feet.entries()) {
    ctx.beginPath(); ctx.moveTo((i ? 1 : -1) * s * 0.14, -legH); ctx.lineTo(fx * s, fy * s); ctx.stroke();
    ctx.fillStyle = h.accent;
    ctx.beginPath(); ctx.ellipse(fx * s, fy * s, s * 0.09, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Corps (de dos)
  ctx.fillStyle = h.body;
  ctx.beginPath(); ctx.ellipse(0, cy, R, R * sq, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade(h.body, 0.25);
  for (const [dx, dy, r] of [[-0.3, -0.35, 0.12], [0.25, -0.15, 0.1], [-0.05, 0.15, 0.14]]) {
    ctx.beginPath(); ctx.arc(dx * R, cy + dy * R * sq, r * R, 0, Math.PI * 2); ctx.fill();
  }

  // Bras
  const armA = (sg) => ({
    armsUp: 2.85, airplane: 1.6, star: 2.3, jump: 2.4, duck: 1.0, flamingo: 1.35, bump: 1.3, happy: 2.6,
    smash: sg > 0 ? 2.9 : 0.5,
    run: 0.45 + 0.35 * Math.sin(ph + (sg > 0 ? 0 : Math.PI)),
  }[pose] ?? 0.35);
  for (const sg of [-1, 1]) {
    const sx = sg * R * 0.85, sy = cy - R * 0.05;
    const a = armA(sg);
    const ex = sx + sg * Math.sin(a) * s * 0.34, ey = sy + Math.cos(a) * s * 0.34;
    ctx.strokeStyle = h.limb; ctx.lineWidth = s * 0.085;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = h.belly; ctx.beginPath(); ctx.arc(ex, ey, s * 0.065, 0, Math.PI * 2); ctx.fill();
  }

  // Antenne-feuille
  const top = cy - R * sq;
  ctx.strokeStyle = h.limb; ctx.lineWidth = s * 0.04;
  ctx.beginPath(); ctx.moveTo(0, top + s * 0.02);
  ctx.quadraticCurveTo(s * 0.04, top - s * 0.16, s * 0.12 + Math.sin(t * 0.006) * s * 0.03, top - s * 0.24); ctx.stroke();
  ctx.fillStyle = h.accent;
  ctx.beginPath(); ctx.ellipse(s * 0.17, top - s * 0.27, s * 0.12, s * 0.065, -0.4, 0, Math.PI * 2); ctx.fill();

  // Queue (côté spectateur)
  const wag = Math.sin(t * 0.01) * s * 0.06;
  ctx.strokeStyle = h.limb; ctx.lineWidth = s * 0.07;
  ctx.beginPath(); ctx.moveTo(0, cy + R * sq * 0.6);
  ctx.quadraticCurveTo(s * 0.25 + wag, cy + R * 0.5, s * 0.3 + wag, cy - R * 0.1); ctx.stroke();
  ctx.fillStyle = h.accent;
  ctx.beginPath(); ctx.arc(s * 0.3 + wag, cy - R * 0.15, s * 0.075, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// Sphère d'amitié (objet original : bulle de cristal avec un cœur)
function drawOrb(ctx, x, y, r, t) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#ffd6f5'); g.addColorStop(1, '#c77dff');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ff4d8d';
  ctx.font = `${r * 0.9}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('♥', x, y + r * 0.05 + Math.sin(t * 0.01) * r * 0.05);
  ctx.textBaseline = 'alphabetic';
}

function newHero(pal, base) {
  return { pal, base, lane: base, targetLane: base, y: 0, vy: 0, pose: null, poseUntil: 0, holdPose: null,
    demoPose: null, bumpUntil: 0, squat: false, flash: null };
}

class DepthScene {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = null;
    this.D = 4;          // focale
    this.Zfar = 60;
    this.speed = 1;
    this.targetSpeed = 1;
    this.scroll = 0;
    this.progress = 0;
    this.heroes = [newHero(null, 0)];
    this.hazards = [];   // obstacles à éviter (étape « Évite les obstacles »)
    this.bubbles = [];   // bulles autour des héros { hero, u, v, r, born, p } (unités : torse du héros)
    this.pops = [];
    this.hands = [];     // mains des joueurs, par héros : [{ u, v }, { u, v }]
    this.moles = [];     // taupes qui sortent autour des héros { hero, u, v, born, state, t }
    this.coach = null;   // coach à imiter (danse / karaté) : { move, style, pal, t0 }
    this.cue = null;     // grand signe d'action au-dessus du héros : { icon, k (0..1), ok }
    // Épreuves « à portée de main » : le héros imite en direct les bras / jambes de son joueur
    this.mirror = false; // le héros suit les membres du joueur
    this.limbs = null;   // par héros : { 'arm-left': [dx, dy], … } (directions, y vers le haut)
    this.ghostPose = null; // silhouette dorée de la pose à prendre
    this.closeUp = false;  // caméra rapprochée (bulles, taupes, poses, fruits)
    this.fruits = [];      // fruits à couper (voir fruitPos) ; coupés : deux moitiés qui tombent
    this.cubes = [];       // cubes en rythme { side, born, arrive, u, v, hit, missed }
    this.cubeTargets = null; // cibles des cubes (où mettre les mains)
    this.trails = [];      // traînées des mains (coups de sabre)
    this.sliceOn = false;
    this.obs = null;
    this.enc = null;
    this.decor = [];
    this.parts = [];
    this.floaters = [];
    this.skyStars = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random() * 0.35, r: Math.random() * 1.5 + 0.4, p: Math.random() * 6 }));
    this.clouds = Array.from({ length: 5 }, () => ({ x: Math.random(), y: 0.06 + Math.random() * 0.18, s: 0.03 + Math.random() * 0.03, sp: 0.006 + Math.random() * 0.01 }));
    this.ambient = new Ambient();
    this.last = performance.now();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const d = Math.min(devicePixelRatio || 1, 1.5);
    this.W = innerWidth; this.H = innerHeight;
    this.c.width = this.W * d; this.c.height = this.H * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  // --- Projection
  get hy() { return this.H * 0.42; }
  get gy0() { return this.H * 0.97; }
  get laneW() { return Math.min(this.W * 0.2, this.H * 0.3); }
  get size() { return Math.min(this.H * 0.26, this.W * 0.2); }
  k(z) { return this.D / (this.D + Math.max(-this.D * 0.9, z)); }
  sy(z) { return this.hy + (this.gy0 - this.hy) * this.k(z); }
  sx(lx, z) { return this.W / 2 + lx * this.laneW * this.k(z); }
  heroZ() { return 1.2; }
  get hero() { return this.heroes[0]; }
  heroPx(i = 0) {
    const z = this.heroZ(), h = this.heroes[i] || this.heroes[0];
    return { x: this.sx(h.lane, z), y: this.sy(z) + h.y };
  }
  // Repère des bulles et des mains : épaules du héros, unité = longueur du torse à l'écran
  anchor(i) {
    const p = this.heroPx(i), s = this.size * this.k(this.heroZ());
    return { x: p.x, y: p.y - s * 0.78, u: s * 0.42 };
  }

  biome() {
    const b = this.theme.biomes;
    const forced = typeof DEV !== 'undefined' && DEV.get('biome'); // (mode test) paysage n° … du monde
    const f = forced ? Math.min(b.length - 1, Number(forced)) : Math.min(b.length - 1, this.progress * b.length);
    const i = Math.min(b.length - 1, Math.floor(f));
    const j = Math.min(b.length - 1, i + 1);
    const tr = Math.max(0, (f - i - 0.85) / 0.15); // fondu sur la fin de chaque biome
    const col = (key) => (i === j ? b[i][key] : mixColor(b[i][key], b[j][key], tr));
    return { col, cur: b[i], night: b[i].night };
  }

  // palettes : une par joueur (couleurs du héros) ; par défaut le héros du monde
  // looks : apparence du dresseur de chaque joueur { model, hat, glasses, color }
  setWorld(theme, palettes = null, looks = null) {
    this.theme = theme;
    this.obs = null; this.enc = null; this.parts = []; this.floaters = [];
    this.hazards = []; this.bubbles = []; this.pops = []; this.hands = []; this.moles = []; this.rope = null;
    this.progress = 0;
    const pals = palettes || [theme ? theme.hero : null];
    const n = Math.max(pals.length, looks ? looks.length : 0);
    this.heroes = Array.from({ length: n }, (_, i) => newHero(pals[i] || pals[0], n > 1 ? (i ? 0.55 : -0.55) : 0));
    if (looks) this.heroes.forEach((h, i) => { h.look = looks[i] || looks[0]; });
    this.decor = [];
    if (theme) for (let i = 0; i < 26; i++) this.spawnDecor(Math.random() * this.Zfar);
  }

  setProgress(p) { this.progress = p; }
  // États des joueurs (un par héros) : couloir suivi en direct, accroupi
  setLive(states) {
    const list = Array.isArray(states) ? states : [states];
    const n = this.heroes.length;
    this.heroes.forEach((h, i) => {
      const st = list[i] || list[0] || {};
      const off = st.side === 'left' ? -1 : st.side === 'right' ? 1 : 0;
      h.targetLane = h.base + off * (n > 1 ? 0.45 : 1);
      h.squat = !!st.squat;
    });
  }

  spawnDecor(z) {
    const b = this.theme.biomes[Math.min(this.theme.biomes.length - 1, Math.floor(this.progress * this.theme.biomes.length))];
    const sg = Math.random() < 0.5 ? -1 : 1;
    this.decor.push({ lx: sg * (2.1 + Math.random() * 3.5), z, e: b.deco[Math.floor(Math.random() * b.deco.length)], s: 0.8 + Math.random() * 0.7 });
  }

  // --- Actions (idx : un seul héros, sinon tous)
  action(type, idx = null) {
    const now = performance.now();
    this.heroes.forEach((h, i) => {
      if (idx != null && i !== idx) return;
      if (type === 'jump') { if (h.y >= -1) h.vy = -this.H * 1.6; }
      else if (type === 'squat') { h.pose = 'duck'; h.poseUntil = now + 700; }
      else if (type === 'smash') {
        h.pose = 'smash'; h.poseUntil = now + 450;
        if (this.obs && this.obs.kind === 'crate') this.obs.shake = now;
      }
    });
  }

  setCoach(c) { this.coach = c; }
  // Grande carte du geste du coach (karaté, danse) : le dessin du geste, son nom, et un anneau qui montre le temps
  // (le coach est petit, au loin : sans ça, « Position du cavalier », « Tranche »… n'étaient pas clairs)
  drawCoachCard(now) {
    const c = this.coach, m = c && c.move; if (!m) return;
    const ctx = this.ctx, H = this.H, sz = H * 0.3, x = H * 0.04, y = H * 0.3;
    this.coachPc = this.coachPc || Object.assign(document.createElement('canvas'), { width: 200, height: 200 });
    const st = typeof POSES !== 'undefined' && POSES[m] ? { m: 'pose', pose: m } : { m };
    try { drawPicto(this.coachPc.getContext('2d'), 200, 200, st, now, st.m === 'pose' ? null : m); } catch (e) { return; } // (pose : dessinée d'après st.pose)
    const pop = Math.min(1, (now - (c.t0 || now)) / 220), k = 0.85 + 0.15 * pop;
    ctx.save(); ctx.translate(x + sz / 2, y + sz / 2); ctx.scale(k, k); ctx.translate(-sz / 2, -sz / 2);
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = (c.pal && c.pal.accent) || '#e63946'; ctx.lineWidth = H * 0.008;
    ctx.beginPath(); ctx.roundRect(0, 0, sz, sz * 1.18, sz * 0.12); ctx.fill(); ctx.stroke();
    ctx.drawImage(this.coachPc, sz * 0.08, sz * 0.04, sz * 0.84, sz * 0.84);
    const icon = typeof MIMIC_ICONS !== 'undefined' ? MIMIC_ICONS[m] || '' : '';
    ctx.font = `800 ${sz * 0.16}px 'Baloo 2', system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1e1b4b';
    const word = (typeof MIMIC !== 'undefined' && MIMIC[c.style] && MIMIC[c.style].say[m] || '').split(' !')[0];
    ctx.fillText(icon + ' ' + word, sz / 2, sz * 1.02, sz * 0.92);
    ctx.restore();
  }
  setCue(c) { this.cue = c; }

  // Grand signe d'action (⬆️ saute, ⬇️ baisse-toi, ↔️ va à côté…) qui grossit quand c'est le moment
  drawCue(now) {
    const c = this.cue;
    if (!c) return;
    const ctx = this.ctx;
    this.heroes.forEach((h, i) => {
      const A = this.anchor(i), k = Math.max(0, Math.min(1, c.k));
      const r = A.u * (0.9 + 0.7 * k) * (c.now ? 1 + 0.12 * Math.sin(now * 0.03) : 1);
      const x = A.x, y = A.y - A.u * 3.2;
      ctx.globalAlpha = 0.35 + 0.65 * k;
      ctx.fillStyle = c.now ? '#22c55e' : '#ffd166';
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(3, r * 0.12);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (/^\d$/.test(c.icon)) { // chiffre du décompte : gros, blanc, bien lisible
        ctx.font = `800 ${r * 1.3}px 'Baloo 2', system-ui, sans-serif`; ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = r * 0.12; ctx.strokeText(c.icon, x, y + r * 0.08); ctx.fillText(c.icon, x, y + r * 0.08);
      } else { ctx.font = `${r * 1.15}px serif`; ctx.fillText(c.icon, x, y + r * 0.06); }
      ctx.textBaseline = 'alphabetic';
    });
  }

  // Pose du coach pour un geste (les deux scènes) : pose dessinable + petits mouvements
  coachPose(now) {
    const c = this.coach, m = c && c.move;
    if (!m) return { pose: c && c.style === 'dance' ? 'run' : 'idle', lane: 0, y: 0 };
    if (m === 'squat') return { pose: 'duck', lane: 0, y: 0 };
    if (m === 'jump') return { pose: 'jump', lane: 0, y: Math.abs(Math.sin((now - (c.t0 || 0)) * 0.006)) };
    if (m === 'left' || m === 'right') return { pose: 'armsUp', lane: m === 'left' ? -1 : 1, y: 0 };
    if (m === 'smash') return { pose: ((now - (c.t0 || 0)) % 900) < 450 ? 'armsUp' : 'smash', lane: 0, y: 0 };
    return { pose: m, lane: 0, y: 0 };
  }

  drawCoach2D(now) {
    const cp = this.coachPose(now), z = 7, k = this.k(z), s = this.size * k * 1.7;
    const x = this.sx(cp.lane, z), gy = this.sy(z) - cp.y * s * 0.4;
    this.ctx.fillStyle = 'rgba(0,0,0,0.22)';
    this.ctx.beginPath(); this.ctx.ellipse(x, this.sy(z) + 2, s * 0.4, s * 0.08, 0, 0, Math.PI * 2); this.ctx.fill();
    drawHeroBack(this.ctx, x, gy, s, this.coach.pal || this.theme.hero, cp.pose, now);
  }

  setHoldPose(p, idx = null) { this.heroes.forEach((h, i) => { if (idx == null || i === idx) h.holdPose = p; }); }
  // Le héros montre la pose à faire (sans l'anneau de réussite)
  setDemoPose(p) { this.heroes.forEach((h) => (h.demoPose = p)); }
  // Réussi (vert ✔) ou raté (orange) bien visible sur le héros
  flash(idx, ok) {
    const now = performance.now();
    this.heroes.forEach((h, i) => {
      if (idx != null && i !== idx) return;
      h.flash = { ok, t: now };
      if (!ok) h.bumpUntil = now + 600;
      else h.happyUntil = now + 850; // petit geste de joie
    });
  }

  // --- Obstacles à éviter : { kind: 'rock' | 'log' | 'arch' | 'tackle' | 'giant' | 'cone', lane, born, dur }
  // (Stade : tackle = joueur qui tacle, on saute ; giant = grand joueur bras écartés, on se baisse ; cone = plot dans un couloir)
  addHazard(hz) { hz.state = 'coming'; this.hazards.push(hz); }
  hazardZ(hz, now) {
    const p = (now - hz.born) / hz.dur;
    return this.Zfar - (this.Zfar - this.heroZ()) * p;
  }
  resolveHazard(hz, ok, idx = 0) {
    hz.state = ok ? 'cleared' : 'hit';
    hz.t0 = performance.now();
    if (ok && hz.kind === 'star') {
      const p = this.heroPx(idx);
      this.emojiPop(p.x, p.y - this.size * 1.1, 2);
      this.burst(p.x, p.y - this.size * 0.8, 14, ['#fff', '#ffe066', '#ffd166']);
      hz.t0 = hz.t0 - 500; // disparaît tout de suite
    } else if (ok) {
      const z = this.heroZ() + 0.3, x = this.sx(hz.kind === 'rock' || hz.kind === 'cone' ? hz.lane : 0, z);
      this.burst(x, this.sy(z) - this.size * 0.4, 14, ['#ffffff', '#ffe066', '#4ade80']);
    }
  }

  shift(d) {
    const o = this.obs, e = this.enc;
    if (o) { o.born += d; o.t0 += d; if (o.shake) o.shake += d; }
    if (e) { e.born += d; e.t0 += d; }
    for (const hz of this.hazards) { hz.born += d; if (hz.t0) hz.t0 += d; }
    if (this.rope) this.rope.t0 += d;
    for (const h of this.heroes) { h.poseUntil += d; h.bumpUntil += d; }
    this.last = performance.now();
  }
  setHoldProgress(p) { if (this.enc) this.enc.hold = p; }

  onStep(s, dur) {
    const now = performance.now();
    this.stepKind = s.m; // (la caméra 3D choisit son plan selon l'épreuve)
    if (s.m !== 'boss' && this.setBoss) this.setBoss(null);
    this.ball = null;
    this.obs = null;
    if (this.enc && this.enc.state === 'waiting') this.enc.state = 'leaving';
    this.setHoldPose(null);
    this.setDemoPose(null);
    this.bubbles = []; this.hands = []; this.moles = []; this.coach = null; this.cue = null;
    this.mirror = false; this.limbs = null; this.ghostPose = null; this.closeUp = false; this.avatarHands = []; this.faceCam = false; this.hideHero = false;
    this.wand = null; this.sport = null; this.sportT = {}; this.sportCr = null; this.act = null; this.actSeen = 0;
    this.foam = []; this.foamOn = false; this.squeegees = []; this.turnHero = null; this.foamDrips = []; this.foamFade = false; this.fork = null;
    if (this.foamCx) this.foamCx.clearRect(0, 0, this.foamCv.width, this.foamCv.height);
    this.sliceOn = s.m === 'slice'; this.cubeTargets = null; this.trails = [];
    this.targetSpeed = s.m === 'fork' ? 0.6 : s.m === 'dance' || s.m === 'karate' ? 0 : s.m === 'tunnel' ? 0.8 : s.m === 'boss' || s.m === 'learn' ? 0 : s.m === 'moles' || s.m === 'posemix' ? 0.35 : s.m === 'run' ? 1.6 : s.m === 'shop' ? 1.0 : s.m === 'rest' ? 0.25 : s.m === 'pose' || s.m === 'bubbles' || s.m === 'wand' ? 0.35 : s.m === 'goal' || s.m === 'basket' || s.m === 'kick' || s.m === 'act' || s.m === 'arena' ? 0 : 1;
    // (saut et accroupi : une série d'obstacles gérée par la partie, un par répétition)
    const kind = { smash: 'crate', left: 'gemL', right: 'gemR' }[s.m];
    if (kind) this.obs = { kind, born: now, dur, state: 'coming', t0: now, shake: 0 };
    if (s.m === 'pose' && !s.creature) this.obs = { kind: 'wall', pose: s.pose, born: now, dur, state: 'coming', t0: now };
    if (s.m === 'tunnel') this.obs = { kind: 'tunnel', born: now, dur, state: 'coming', t0: now };
    this.rope = null;
    if (s.m === 'pose' && s.creature) {
      this.enc = { cr: s.creature, pose: s.pose, born: now, state: 'waiting', t0: now, hold: 0, evolved: Carnet.evolved(s.creature.id) };
    }
  }

  obsZ(now) {
    const o = this.obs;
    if (o.kind === 'tunnel') { // le tunnel arrive et entoure le héros
      const p = Math.min(1, (now - o.born) / 1500);
      return this.Zfar - (this.Zfar - this.heroZ()) * p;
    }
    if (o.kind === 'crate') { // le rocher arrive vite puis attend qu'on le tape
      const p = Math.min(1, (now - o.born) / 1600);
      return this.Zfar - (this.Zfar - this.heroZ() - 0.9) * p;
    }
    if (o.kind === 'wall') { // le mur s'approche puis attend devant le héros
      const p = Math.min(1, (now - o.born) / Math.min(1800, o.dur * 0.4));
      return this.Zfar - (this.Zfar - 3.6) * p;
    }
    const p = Math.min(1, (now - o.born) / o.dur);
    return this.Zfar - (this.Zfar - this.heroZ() - 0.6) * p;
  }

  resolve(success) {
    const now = performance.now();
    const o = this.obs;
    if (this.enc && this.enc.state === 'waiting') {
      this.enc.state = success ? 'befriend' : 'leaving';
      this.enc.t0 = now;
    }
    if (!o || o.state !== 'coming') return;
    o.zc = this.obsZ(now);
    o.state = success ? 'cleared' : 'missed';
    o.t0 = now;
    if (success && (o.kind === 'crate' || o.kind === 'gemL' || o.kind === 'gemR' || o.kind === 'wall')) {
      const lx = o.kind === 'gemL' ? -1 : o.kind === 'gemR' ? 1 : 0;
      const x = this.sx(lx, o.zc), y = this.sy(o.zc) - this.size * this.k(o.zc) * 0.5;
      const cols = o.kind === 'crate' ? ['#8d8173', '#bfb3a5', '#5c5248'] : o.kind === 'wall' ? ['#e07a5f', '#f2cc8f', '#ffffff'] : ['#fff', '#ffd166', '#72efdd'];
      this.burst(x, y, o.kind === 'wall' ? 40 : 18, cols);
      this.emojiPop(x, y, 3);
      this.obs = null;
    } else if (success) {
      const p = this.heroPx();
      this.emojiPop(p.x, p.y - this.size * 1.2, 2);
    } else if (o.kind !== 'gemL' && o.kind !== 'gemR') {
      for (const h of this.heroes) h.bumpUntil = now + 600;
    }
  }

  burst(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random() * 0.7) * this.H * 0.6;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - this.H * 0.3, life: 0.9, max: 0.9, color: colors[i % colors.length], r: 3 + Math.random() * 6 });
    }
  }

  emojiPop(x, y, n, text = null) {
    for (let i = 0; i < n; i++) {
      this.floaters.push({ x: x + (i - (n - 1) / 2) * this.size * 0.3, y, text: text || this.theme.collectible, size: this.size * 0.32, life: 1, max: 1, vy: -this.H * (0.25 + i * 0.03) });
    }
  }

  floatText(text, color = '#fff', idx = 0) {
    const p = this.heroPx(idx);
    this.floaters.push({ x: p.x, y: p.y - this.size * 1.5, text, size: this.size * 0.24, life: 1.1, max: 1.1, vy: -this.H * 0.15, color, bold: true });
  }

  // --- Rendu
  render(now) {
    const ctx = this.ctx, W = this.W, H = this.H, th = this.theme;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!th) { ctx.fillStyle = '#1e1b4b'; ctx.fillRect(0, 0, W, H); return; }
    const bio = this.biome(), col = bio.col;

    this.speed += (this.targetSpeed - this.speed) * Math.min(1, dt * 3);
    const dz = this.speed * dt * 14;
    this.scroll += dz;

    // Héros : couloir suivi en direct, saut, accroupi
    for (const hh of this.heroes) {
      hh.lane += (hh.targetLane - hh.lane) * Math.min(1, dt * 8);
      hh.vy += H * 5 * dt; hh.y += hh.vy * dt;
      if (hh.y > 0) { hh.y = 0; hh.vy = 0; }
    }
    const h = this.hero;

    const hy = this.hy;
    // Ciel
    const g = ctx.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, col('sky0')); g.addColorStop(1, col('sky1'));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 2);
    if (bio.night) {
      ctx.fillStyle = '#fff';
      for (const st of this.skyStars) {
        ctx.globalAlpha = 0.4 + 0.5 * Math.sin(now * 0.002 + st.p);
        ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (bio.night) drawMoon(ctx, W * 0.72, hy * 0.38, H * 0.05, col('sun'));
    else {
      drawSun(ctx, W * 0.72, hy * 0.38, H * 0.055, now);
      // Nuages qui dérivent lentement (légère parallaxe selon le couloir)
      for (const c of this.clouds) {
        const span = W + 300;
        const x = ((c.x * span - now * c.sp - h.lane * W * 0.02) % span + span) % span - 150;
        drawCloud(ctx, x, H * c.y, H * c.s, 0.9);
      }
    }

    // Montagnes (parallaxe selon le couloir)
    const px = -h.lane * W * 0.01;
    for (const [layer, colKey, amp, freq] of [[0, 'mount0', 0.16, 0.004], [1, 'mount1', 0.09, 0.009]]) {
      ctx.fillStyle = col(colKey);
      ctx.beginPath(); ctx.moveTo(0, hy + 1);
      for (let x = 0; x <= W; x += 10) {
        const wx = x + px * (layer + 1) + layer * 500;
        ctx.lineTo(x, hy - H * amp * (0.55 + 0.45 * Math.sin(wx * freq) * Math.sin(wx * freq * 0.37 + 1)));
      }
      ctx.lineTo(W, hy + 1); ctx.fill();
    }

    // Sol (bandes qui défilent pour la sensation de vitesse)
    ctx.fillStyle = col('grass'); ctx.fillRect(0, hy, W, H - hy);
    const band = 3;
    for (let i = 0; i < this.Zfar / band + 1; i++) {
      const z0 = i * band - (this.scroll % (band * 2));
      if ((i % 2) === 0) {
        const y0 = this.sy(z0 + band), y1 = this.sy(Math.max(z0, -0.5));
        ctx.fillStyle = col('grass2');
        ctx.fillRect(0, y0, W, y1 - y0);
      }
    }
    // Chemin
    const edge = 1.65;
    ctx.fillStyle = col('path');
    ctx.beginPath();
    ctx.moveTo(this.sx(-edge, this.Zfar), this.sy(this.Zfar)); ctx.lineTo(this.sx(edge, this.Zfar), this.sy(this.Zfar));
    ctx.lineTo(this.sx(edge, -0.8), this.sy(-0.8)); ctx.lineTo(this.sx(-edge, -0.8), this.sy(-0.8));
    ctx.fill();
    for (let i = 0; i < this.Zfar / band + 1; i++) {
      const z0 = i * band - (this.scroll % (band * 2));
      if ((i % 2) === 0) {
        const za = z0 + band, zb = Math.max(z0, -0.8);
        ctx.fillStyle = col('path2');
        ctx.beginPath();
        ctx.moveTo(this.sx(-edge, za), this.sy(za)); ctx.lineTo(this.sx(edge, za), this.sy(za));
        ctx.lineTo(this.sx(edge, zb), this.sy(zb)); ctx.lineTo(this.sx(-edge, zb), this.sy(zb));
        ctx.fill();
      }
    }
    // Lignes des couloirs (pointillés)
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const lx of [-0.5, 0.5]) {
      for (let i = 0; i < this.Zfar / 2; i++) {
        const z0 = i * 2 - (this.scroll % 2), z1 = z0 + 1;
        if (z0 < -0.8) continue;
        const w0 = 0.03 * this.k(z0), w1 = 0.03 * this.k(z1);
        ctx.beginPath();
        ctx.moveTo(this.sx(lx, z1) - w1 * this.laneW, this.sy(z1)); ctx.lineTo(this.sx(lx, z1) + w1 * this.laneW, this.sy(z1));
        ctx.lineTo(this.sx(lx, z0) + w0 * this.laneW, this.sy(z0)); ctx.lineTo(this.sx(lx, z0) - w0 * this.laneW, this.sy(z0));
        ctx.fill();
      }
    }

    // Objets triés du plus loin au plus proche
    for (const d of this.decor) d.z -= dz;
    this.decor = this.decor.filter((d) => d.z > -2);
    while (this.decor.length < 26) this.spawnDecor(this.Zfar - Math.random() * 3);
    const items = this.decor.map((d) => ({ z: d.z, draw: () => this.drawDecor(d) }));
    if (this.obs) items.push({ z: this.obs.state === 'coming' ? this.obsZ(now) : (this.obs.zc ?? 0), draw: () => this.drawObstacle(now, dt) });
    if (this.enc) items.push({ z: this.encZ(now), draw: () => this.drawEncounter(now) });
    this.hazards = this.hazards.filter((hz) => this.hazardZ(hz, now) > -0.9 && !(hz.t0 && now - hz.t0 > 600));
    for (const hz of this.hazards) items.push({ z: Math.max(-0.8, this.hazardZ(hz, now)), draw: () => this.drawHazard(hz, now) });
    items.push({ z: this.heroZ() - 0.01, draw: () => this.drawHero(now) });
    if (this.coach) items.push({ z: 7, draw: () => this.drawCoach2D(now) });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.draw();

    // Petite vie du biome : oiseaux, mouettes, papillons, pétales, lucioles
    this.ambient.setKinds(bio.cur.ambient);
    this.ambient.update(dt, W, H, bio.cur.ambient && bio.cur.ambient.includes('fireflies') ? H : hy + H * 0.2, 0);
    this.ambient.draw(ctx);

    this.drawMoles(now);
    this.drawFruits(now);
    this.drawCoachCard(now);
    this.drawCubes(now);
    this.drawFoam(now);
    this.drawWand(now);
    this.drawSport(now);
    this.drawAct(now);
    this.drawFork(now);
    this.drawBubbles(now);
    this.drawRope(now);
    this.drawCue(now);

    // Brume à l'horizon
    const fog = ctx.createLinearGradient(0, hy - H * 0.04, 0, hy + H * 0.07);
    fog.addColorStop(0, col('fog') + '00');
    fog.addColorStop(0.4, col('fog') + '88');
    fog.addColorStop(1, col('fog') + '00');
    ctx.fillStyle = fog; ctx.fillRect(0, hy - H * 0.04, W, H * 0.11);

    // Lignes de vitesse
    if (this.speed > 1.6) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const r0 = ((now * 1.2 + i * 137) % (W * 0.6)) + W * 0.15;
        const cx = W / 2, cy = hy;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.abs(Math.sin(a)) * r0 * 0.7);
        ctx.lineTo(cx + Math.cos(a) * (r0 + 80), cy + Math.abs(Math.sin(a)) * (r0 + 80) * 0.7);
        ctx.stroke();
      }
    }

    this.drawFx(dt);
  }

  // Particules et textes flottants (coordonnées écran), partagés avec la scène 3D
  drawFx(dt) {
    const ctx = this.ctx, H = this.H;
    for (const p of this.parts) {
      p.vy += H * 1.5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      f.y += f.vy * dt; f.life -= dt;
      if (f.tx != null) { f.x += (f.tx - f.x) * Math.min(1, dt * 4); }
      ctx.globalAlpha = Math.max(0, Math.min(1, (f.life / f.max) * 1.5));
      ctx.font = `${f.bold ? '800 ' : ''}${f.size}px "Baloo 2", system-ui, sans-serif`;
      if (f.color) { ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; }
      ctx.fillText(f.text, f.x, f.y);
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    ctx.globalAlpha = 1;
  }

  fade(z) { return Math.max(0, Math.min(1, (this.Zfar - z) / 12)); }

  drawDecor(d) {
    const ctx = this.ctx, k = this.k(d.z);
    if (d.z < -1.5) return;
    ctx.globalAlpha = this.fade(d.z);
    ctx.font = `${this.size * 1.1 * d.s * k}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(d.e, this.sx(d.lx, d.z), this.sy(d.z) + this.size * 0.08 * k);
    ctx.globalAlpha = 1;
  }

  drawHero(now) {
    const ctx = this.ctx;
    this.heroes.forEach((h, i) => {
      let pose;
      if (now < h.bumpUntil) pose = 'bump';
      else if (h.y < -2) pose = 'jump';
      else if (h.squat) pose = 'duck';
      else if (h.pose && now < h.poseUntil) pose = h.pose;
      else if (h.holdPose) pose = h.holdPose;
      else if (h.demoPose) pose = h.demoPose;
      else if (this.enc && this.enc.state === 'befriend') pose = 'happy';
      else pose = this.speed < 0.5 ? 'idle' : 'run';
      const z = this.heroZ(), k = this.k(z);
      const x = this.sx(h.lane, z), gy = this.sy(z);
      const s = this.size * k * (this.heroes.length > 1 ? 0.85 : 1);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(x, gy + 2, s * 0.38 * (1 + h.y / this.H), s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      drawHeroBack(ctx, x, gy + h.y, s, h.pal || this.theme.hero, pose, now);
      const cy = gy + h.y - s * 0.55;
      if (h.holdPose) {
        ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(x, cy, s * 0.8, 0, Math.PI * 2); ctx.stroke();
      }
      // Réussi / raté : grand rond vert avec ✔, ou orange
      const f = h.flash, age = f ? now - f.t : 1e9;
      if (age < 900) {
        const a = 1 - age / 900, pop = 1 + 0.25 * Math.sin(Math.min(1, age / 250) * Math.PI);
        ctx.globalAlpha = a;
        ctx.fillStyle = f.ok ? '#22c55e' : '#f59e0b';
        const by = gy + h.y - s * 1.45, r = s * 0.28 * pop;
        ctx.beginPath(); ctx.arc(x, by, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(3, r * 0.22); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        if (f.ok) { ctx.moveTo(x - r * 0.45, by); ctx.lineTo(x - r * 0.1, by + r * 0.35); ctx.lineTo(x + r * 0.5, by - r * 0.35); }
        else { ctx.moveTo(x - r * 0.35, by - r * 0.35); ctx.lineTo(x + r * 0.35, by + r * 0.35); ctx.moveTo(x + r * 0.35, by - r * 0.35); ctx.lineTo(x - r * 0.35, by + r * 0.35); }
        ctx.stroke();
        if (f.ok) { ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, cy, s * (0.8 + age / 900 * 0.5), 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      // En duo : pastille de couleur sous le héros pour que chacun se reconnaisse
      if (this.heroes.length > 1 && h.pal) {
        ctx.fillStyle = h.pal.body; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x, gy + 4, s * 0.42, s * 0.1, 0, 0, Math.PI * 2); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      }
    });
  }

  // Corde à sauter qui tourne autour des héros : elle passe sous les pieds à t0 + k × période
  drawRope(now) {
    const r = this.rope;
    if (!r) return;
    const ctx = this.ctx, z = this.heroZ(), k = this.k(z), s = this.size * k;
    const gy = this.sy(z), xl = this.sx(-1.7, z), xr = this.sx(1.7, z);
    const phi = ((now - r.t0) / r.period) * Math.PI * 2;
    const feet = gy + s * 0.05, head = gy - s * 1.35, hand = gy - s * 0.6;
    const cy = (feet + head) / 2 + Math.cos(phi) * (feet - head) * 0.5;
    // Poignées
    ctx.fillStyle = '#8d5a3b';
    for (const x of [xl, xr]) { ctx.beginPath(); ctx.roundRect(x - s * 0.06, hand - s * 0.15, s * 0.12, s * 0.3, s * 0.05); ctx.fill(); }
    // Corde (courbe dont le creux suit la rotation)
    ctx.strokeStyle = '#e63946'; ctx.lineWidth = Math.max(4, s * 0.06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xl, hand); ctx.quadraticCurveTo(this.W / 2, 2 * cy - hand, xr, hand); ctx.stroke();
  }

  // Taupes rigolotes qui sortent de leur trou autour du héros (à taper avec les mains)
  drawMoles(now) {
    const ctx = this.ctx;
    for (const m of this.moles) {
      const A = this.anchor(m.hero), x = A.x + m.u * A.u, y = A.y + m.v * A.u, r = A.u * 0.62;
      let k = Math.min(1, (now - m.born) / 200);                     // sortie du trou
      if (m.state === 'hide') k = Math.max(0, 1 - (now - m.t) / 250);
      const bonk = m.state === 'bonk' ? Math.max(0, 1 - (now - m.t) / 450) : 0;
      // Petite île d'herbe qui flotte (le trou de la taupe est dedans)
      ctx.fillStyle = '#7a4a2a';
      ctx.beginPath(); ctx.moveTo(x - r * 1.75, y + r * 0.95); ctx.quadraticCurveTo(x, y + r * 3.1, x + r * 1.75, y + r * 0.95); ctx.fill();
      ctx.fillStyle = '#5cc96b'; ctx.strokeStyle = '#2f8f46'; ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 1.8, r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Trou
      ctx.fillStyle = 'rgba(60, 35, 20, 0.85)';
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 1.2, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      if (k <= 0) continue;
      if (now - (m.aimT || 0) < 150 && m.state !== 'bonk') { ctx.strokeStyle = 'rgba(255,209,102,.95)'; ctx.lineWidth = Math.max(3, r * 0.12); ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 1.45, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); } // (visée : anneau doré)
      // Corps qui sort (coupé au niveau du trou)
      ctx.save();
      ctx.beginPath(); ctx.rect(x - r * 2, y - r * 3, r * 4, r * 3.9); ctx.clip();
      const by = y + r * 0.9 - (r * 1.9) * k + bonk * r * 0.6;
      ctx.fillStyle = '#9c6644';
      ctx.beginPath(); ctx.ellipse(x, by + r, r, r * (1.05 - bonk * 0.3), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ddb892';
      ctx.beginPath(); ctx.ellipse(x, by + r * 1.3, r * 0.55, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      // Visage : yeux (en croix quand on l'a tapée), nez rose, dents
      ctx.fillStyle = '#1e1b4b'; ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = Math.max(2, r * 0.08);
      for (const sg of [-1, 1]) {
        const ex = x + sg * r * 0.35, ey = by + r * 0.7;
        if (bonk) { ctx.beginPath(); ctx.moveTo(ex - r * 0.1, ey - r * 0.1); ctx.lineTo(ex + r * 0.1, ey + r * 0.1); ctx.moveTo(ex + r * 0.1, ey - r * 0.1); ctx.lineTo(ex - r * 0.1, ey + r * 0.1); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(ex, ey, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = '#ff8fab';
      ctx.beginPath(); ctx.ellipse(x, by + r * 0.98, r * 0.16, r * 0.11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - r * 0.1, by + r * 1.1, r * 0.2, r * 0.16);
      ctx.restore();
      if (m.state === 'up' && k >= 1) { // une petite main qui montre où taper
        ctx.font = `${r * 0.9}px serif`; ctx.textAlign = 'center';
        ctx.fillText('👋', x, by - r * 0.3 + Math.sin(now * 0.012) * r * 0.15);
      }
      if (bonk) { // petites étoiles
        ctx.fillStyle = `rgba(255, 224, 102, ${bonk})`;
        for (let i = 0; i < 5; i++) { const a = i * 1.2566 + now * 0.01; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 1.4, by + Math.sin(a) * r * 0.5, r * 0.14, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }

  // Sabre lumineux tenu dans la main (fruits) : la lame prolonge le bras, une traînée suit les coups
  drawSaber(i, k, A, x, y, hd, now) {
    const ctx = this.ctx;
    const sx = hd.su != null ? A.x + hd.su * A.u : A.x + (hd.u < 0 ? -1 : 1) * A.u * 0.35, sy = hd.sv != null ? A.y + hd.sv * A.u : A.y;
    let dx = x - sx, dy = y - sy; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const len = A.u * 1.5, tx = x + dx * len, ty = y + dy * len, w = A.u * 0.16;
    const col = k === 0 ? '#4ea8ff' : '#ff4d9d', glow = k === 0 ? 'rgba(78,168,255,' : 'rgba(255,77,157,';
    // traînée de la pointe (le geste se voit)
    const key = 'sab' + (i * 2 + k);
    const tr = (this.trails[key] = (this.trails[key] || []).filter((p) => now - p.t < 200));
    tr.push({ x: tx, y: ty, hx: x, hy: y, t: now });
    if (tr.length > 1) {
      ctx.beginPath(); ctx.moveTo(tr[0].hx, tr[0].hy);
      for (const p of tr) ctx.lineTo(p.x, p.y);
      for (let j = tr.length - 1; j >= 0; j--) ctx.lineTo(tr[j].hx, tr[j].hy);
      ctx.closePath(); ctx.fillStyle = glow + '0.25)'; ctx.fill();
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = glow + '0.35)'; ctx.lineWidth = w * 3.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); // halo
    ctx.strokeStyle = col; ctx.lineWidth = w * 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();      // lame
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.55; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); // cœur blanc
    // garde et poignée
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = w * 0.9;
    ctx.beginPath(); ctx.moveTo(x - dy * w * 1.6, y + dx * w * 1.6); ctx.lineTo(x + dy * w * 1.6, y - dx * w * 1.6); ctx.stroke();
    ctx.strokeStyle = '#3d2b1f'; ctx.lineWidth = w * 1.1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx * A.u * 0.35, y - dy * A.u * 0.35); ctx.stroke();
    hd.tipU = (tx - A.x) / A.u; hd.tipV = (ty - A.y) / A.u; // (la lame coupe aussi : voir updateSlice)
  }

  // ---------- Carrefour : deux grandes cartes (gauche / droite) avec l'épreuve, une flèche, un anneau qui se remplit
  drawFork(now) {
    const f = this.fork;
    if (!f) return;
    const ctx = this.ctx, W = this.W, H = this.H, S = Math.min(W, H), cw = S * 0.34, ch = S * 0.42;
    [-1, 1].forEach((side, i) => {
      const o = f.opts[i], on = f.sel === side, picked = f.chosen === side, lost = f.chosen && !picked;
      const ck = f.chosen ? Math.min(1, (now - f.chosenT) / 500) : 0;
      const sc = picked ? 1.12 + ck * 0.08 : on ? 1.08 : 1, a = lost ? 1 - ck * 0.8 : 1;
      const x = W / 2 + side * Math.min(W * 0.3, S * 0.62), y = H * 0.48 + Math.sin(now / 400 + i) * S * 0.008;
      const col = o.secret ? '#ffb703' : side < 0 ? '#3a86ff' : '#ff8c42';
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
      ctx.fillStyle = o.secret ? '#fff1b8' : '#fffdf5'; ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, S * 0.04); ctx.fill();
      if (o.secret) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,183,3,.25)'; for (let k = 0; k < 5; k++) { const a = now / 600 + k * 1.26; ctx.beginPath(); ctx.arc(Math.cos(a) * cw * 0.38, Math.sin(a) * ch * 0.38, S * 0.012, 0, 6.29); ctx.fill(); } }
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.lineWidth = S * 0.012; ctx.strokeStyle = col; ctx.stroke();
      // anneau de choix : le bord se remplit pendant qu'on reste du bon côté
      if ((on && f.k > 0) || picked) {
        const k = picked ? 1 : f.k, per = 2 * (cw + ch);
        ctx.strokeStyle = '#22c55e'; ctx.lineWidth = S * 0.022; ctx.setLineDash([per * k, per]);
        ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, S * 0.04); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${S * 0.15}px serif`; ctx.fillText(o.icon, 0, -ch * 0.12);
      ctx.fillStyle = '#1e1b4b'; ctx.font = `800 ${S * 0.05}px Fredoka, Nunito, sans-serif`; ctx.fillText(o.label, 0, ch * 0.22);
      // grosse flèche vers l'extérieur
      ctx.fillStyle = col; ctx.save(); ctx.translate(side * (cw / 2 + S * 0.07), 0); ctx.scale(side, 1);
      const u = S * 0.06; ctx.beginPath(); ctx.moveTo(-u, -u * 0.45); ctx.lineTo(0, -u * 0.45); ctx.lineTo(0, -u); ctx.lineTo(u * 1.1, 0); ctx.lineTo(0, u); ctx.lineTo(0, u * 0.45); ctx.lineTo(-u, u * 0.45); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (picked) { ctx.font = `${S * 0.08}px serif`; ctx.fillText('✅', cw * 0.38, -ch * 0.42); }
      if (on && f.count && !f.chosen) { // décompte en grand sur le panneau choisi
        const q = Math.min(1, (now - (f.countT || now)) / 300), z = 1.4 - 0.4 * q;
        ctx.save(); ctx.scale(z, z); ctx.font = `900 ${S * 0.2}px 'Baloo 2', system-ui, sans-serif`; ctx.lineWidth = S * 0.02; ctx.strokeStyle = '#1e1b4b'; ctx.lineJoin = 'round';
        ctx.strokeText(String(f.count), 0, -ch * 0.02); ctx.fillStyle = '#22c55e'; ctx.fillText(String(f.count), 0, -ch * 0.02); ctx.restore();
      }
      ctx.restore();
    });
  }

  // ---------- La vitre pleine de mousse (singes farceurs)
  // Un calque à part (1/3 de la taille de l'écran) garde la mousse : les singes le remplissent, chaque coup de
  // raclette y efface une bande (comme sur une vraie vitre) ; on mesure ce qui est propre sur une mini copie.
  foamLayer() {
    const fw = Math.max(16, Math.ceil(this.W / 3)), fh = Math.max(16, Math.ceil(this.H / 3));
    if (!this.foamCv || this.foamCv.width !== fw || this.foamCv.height !== fh) {
      const old = this.foamCv;
      this.foamCv = document.createElement('canvas'); this.foamCv.width = fw; this.foamCv.height = fh;
      this.foamCx = this.foamCv.getContext('2d');
      if (old) this.foamCx.drawImage(old, 0, 0, fw, fh); // (fenêtre redimensionnée : on garde la mousse)
    }
    return this.foamCx;
  }
  // Motif de mousse : blanc bleuté plein de bulles (dessiné une fois)
  foamPattern(g) {
    if (!this.foamTile) {
      const t = document.createElement('canvas'); t.width = t.height = 96;
      const c = t.getContext('2d');
      c.fillStyle = '#f3f7ff'; c.fillRect(0, 0, 96, 96);
      let sd = 7; const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < 34; i++) {
        const x = rnd() * 96, y = rnd() * 96, r = 2 + rnd() * 9;
        for (const [dx, dy] of [[0, 0], [96, 0], [-96, 0], [0, 96], [0, -96]]) { // (motif sans couture)
          c.fillStyle = 'rgba(205,222,245,.55)'; c.beginPath(); c.arc(x + dx, y + dy, r, 0, 6.29); c.fill();
          c.strokeStyle = 'rgba(150,178,220,.55)'; c.lineWidth = 1; c.stroke();
          c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(x + dx - r * 0.35, y + dy - r * 0.35, r * 0.28, 0, 6.29); c.fill();
        }
      }
      this.foamTile = t;
    }
    return g.createPattern(this.foamTile, 'repeat');
  }
  // Toute la vitre couverte (alpha < 1 : une couche de plus)
  foamCover(alpha = 1) {
    const g = this.foamLayer();
    g.save(); g.globalAlpha = alpha; g.fillStyle = this.foamPattern(g); g.fillRect(0, 0, this.foamCv.width, this.foamCv.height); g.restore();
  }
  // Une grosse tache baveuse (x, y : 0..1 ; r : part de la hauteur), un peu colorée
  foamSplat(x, y, r, col, seed = 1) {
    const g = this.foamLayer(), fw = this.foamCv.width, fh = this.foamCv.height, R = r * fh, cx = x * fw, cy = y * fh;
    let sd = Math.floor(seed * 1000) % 233280; const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
    g.save(); g.beginPath();
    g.arc(cx, cy, R, 0, 6.29);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * 6.29 + rnd(), d = R * (0.75 + rnd() * 0.45), rr = R * (0.28 + rnd() * 0.3);
      g.moveTo(cx + Math.cos(a) * d + rr, cy + Math.sin(a) * d); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, 0, 6.29);
    }
    for (let i = 0; i < 4; i++) { const dx = (rnd() - 0.5) * R * 1.4, len = R * (0.6 + rnd() * 1.1); g.moveTo(cx + dx, cy); g.roundRect(cx + dx - R * 0.1, cy, R * 0.2, len, R * 0.1); }
    g.fillStyle = this.foamPattern(g); g.fill();
    if (col) { g.globalAlpha = 0.28; g.fillStyle = col; g.fill(); }
    g.restore();
  }
  // Coup de raclette de (x0, y0) à (x1, y1) : la lame (largeur w, part de la hauteur) balaie une bande
  foamWipe(x0, y0, x1, y1, w) {
    const g = this.foamLayer(), fw = this.foamCv.width, fh = this.foamCv.height, hw = w * fh / 2;
    const ax = x0 * fw, ay = y0 * fh, bx = x1 * fw, by = y1 * fh;
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = g.strokeStyle = '#000';
    g.beginPath(); g.moveTo(ax - hw, ay); g.lineTo(ax + hw, ay); g.lineTo(bx + hw, by); g.lineTo(bx - hw, by); g.closePath(); g.fill();
    g.lineCap = 'round'; g.lineWidth = hw * 1.1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx + 0.01, by); g.stroke();
    g.restore();
    // (quelques gouttes d'eau qui coulent au bout de la lame)
    if (Math.hypot(bx - ax, by - ay) > fh * 0.02 && Math.random() < 0.35 && this.foamDrips.length < 40) {
      this.foamDrips.push({ x: x1 + (Math.random() < 0.5 ? -1 : 1) * w * 0.5 * this.H / this.W, y: y1, born: performance.now(), len: 0.05 + Math.random() * 0.12 });
    }
  }
  // Part de la vitre propre (0..1), sur une copie de 48×27 points
  foamClean() {
    if (!this.foamCv) return 1;
    if (!this.foamMini) { this.foamMini = document.createElement('canvas'); this.foamMini.width = 48; this.foamMini.height = 27; this.foamMiniCx = this.foamMini.getContext('2d', { willReadFrequently: true }); }
    const m = this.foamMiniCx;
    m.clearRect(0, 0, 48, 27); m.drawImage(this.foamCv, 0, 0, 48, 27);
    const d = m.getImageData(0, 0, 48, 27).data;
    let clean = 0; for (let i = 3; i < d.length; i += 4) if (d[i] < 70) clean++;
    return clean / (48 * 27);
  }

  // Dessin : boules en vol, calque de mousse, reflets de la vitre, gouttes, cadre de la fenêtre, raclettes
  drawFoam(now) {
    const ctx = this.ctx, W = this.W, H = this.H, S = Math.min(W, H);
    if (!this.foamOn) return;
    if (this.foamFade && this.foamCx) { // (fin : la mousse restante s'efface doucement)
      const g = this.foamCx; g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.12; g.fillRect(0, 0, this.foamCv.width, this.foamCv.height); g.restore();
    }
    if (this.foamCv) ctx.drawImage(this.foamCv, 0, 0, W, H);
    // reflets en biais : c'est une vitre
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [o, wd] of [[0.18, 0.09], [0.31, 0.035], [0.7, 0.06]]) {
      const x = o * W + Math.sin(now / 4000) * W * 0.02;
      const gr = ctx.createLinearGradient(x, 0, x + wd * W, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + wd * W, 0); ctx.lineTo(x + wd * W - H * 0.45, H); ctx.lineTo(x - H * 0.45, H); ctx.fill();
    }
    ctx.restore();
    // gouttes d'eau qui glissent
    this.foamDrips = this.foamDrips.filter((d) => now - d.born < 1800);
    for (const d of this.foamDrips) {
      const k = (now - d.born) / 1800, x = d.x * W, y0 = d.y * H, y1 = y0 + Math.min(1, k * 2) * d.len * H;
      ctx.strokeStyle = `rgba(190,225,255,${0.5 * (1 - k)})`; ctx.lineWidth = S * 0.006; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      ctx.fillStyle = `rgba(225,242,255,${0.8 * (1 - k)})`; ctx.beginPath(); ctx.arc(x, y1, S * 0.008, 0, 6.29); ctx.fill();
    }
    // boules lancées par les singes : elles volent, puis s'écrasent sur la vitre
    this.foam = (this.foam || []).filter((f) => !f.gone);
    for (const f of this.foam) {
      if (now >= f.land) { this.foamSplat(f.x, f.y, f.r, f.col, f.seed); f.gone = now; Audio8.pop && Audio8.pop(); continue; }
      const k = Math.max(0, (now - f.born) / (f.land - f.born)), sx = f.from < 0 ? -0.05 * W : 1.05 * W, sy = H * 0.6;
      const x = f.x * W, y = f.y * H, bx = sx + (x - sx) * k, by = sy + (y - sy) * k - Math.sin(k * Math.PI) * H * 0.25, br = f.r * H * (0.25 + 0.5 * k);
      ctx.fillStyle = this.foamPattern(ctx); ctx.strokeStyle = 'rgba(120,140,170,.6)'; ctx.lineWidth = 3;
      ctx.save(); ctx.translate(bx, by); ctx.beginPath(); ctx.arc(0, 0, br, 0, 6.29); ctx.fill(); ctx.stroke();
      if (f.col) { ctx.globalAlpha = 0.3; ctx.fillStyle = f.col; ctx.fill(); } ctx.restore();
    }
    // cadre de la fenêtre
    const fr = S * 0.025;
    ctx.save(); ctx.strokeStyle = '#7c5a3a'; ctx.lineWidth = fr * 2; ctx.strokeRect(0, 0, W, H);
    ctx.strokeStyle = '#a47a50'; ctx.lineWidth = fr * 0.6; ctx.strokeRect(fr * 0.7, fr * 0.7, W - fr * 1.4, H - fr * 1.4);
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.strokeRect(fr, fr, W - fr * 2, H - fr * 2);
    ctx.restore();
    // Raclettes : manche, lame en caoutchouc (penchée dans le sens du geste)
    for (const sq of this.squeegees || []) {
      const x = sq.x * W, y = sq.y * H, w = S * 0.24, ang = Math.max(-0.5, Math.min(0.5, sq.vx * 8));
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#ef476f'; ctx.beginPath(); ctx.roundRect(-w * 0.05, 0, w * 0.1, w * 0.8, w * 0.05); ctx.fill();   // manche
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.roundRect(-w / 2, -w * 0.1, w, w * 0.16, w * 0.05); ctx.fill();    // support
      ctx.fillStyle = '#1e1b4b'; ctx.beginPath(); ctx.roundRect(-w / 2 - 6, -w * 0.2, w + 12, w * 0.12, w * 0.04); ctx.fill(); // lame en caoutchouc
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-w / 2, -w * 0.19, w, w * 0.03);
      ctx.restore();
    }
  }

  // ---------- Baguette magique (calque 2D, commun aux rendus 2D et 3D)
  // Créatures ensorcelées (petit nuage d'orage au-dessus de la tête), anneau qui se remplit quand le rayon les vise,
  // baguette dans la main du dresseur et rayon jusqu'au pointeur.
  wandOrigin(i, p) { const h = this.heroPx(i), S = Math.min(this.W, this.H); return { x: h.x + (p.x * this.W > h.x ? 1 : -1) * S * 0.08, y: h.y - S * 0.28 }; }
  // Où est la créature à l'écran (px) : elle apparaît en grandissant ; libérée, elle s'envole vers le dresseur
  wandFoePos(f, now) {
    const S = Math.min(this.W, this.H), x = f.x * this.W, y = f.y * this.H;
    if (f.state !== 'calm') return { x, y, k: Math.min(1, (now - f.born) / 500), a: 1 };
    const q = Math.min(1, (now - f.t) / 1500), h = this.heroPx(0);
    return { x: x + (h.x - x) * q * q, y: y + (h.y - S * 0.2 - y) * q * q - Math.sin(q * Math.PI) * S * 0.12, k: 1 - q * 0.6, a: 1 - q * q };
  }
  drawWandFoe(f, P, r, now) { // (rendu 2D : la créature dessinée ; en 3D, c'est un vrai modèle, voir updateWand3D)
    this.ctx.globalAlpha = P.a;
    drawCreature(this.ctx, P.x, P.y + r * 0.95 * P.k, r * 1.9 * P.k, f.cr, f.state === 'calm' ? 'happy' : null, now, f.evolved);
    this.ctx.globalAlpha = 1;
  }
  drawWand(now) {
    const w = this.wand;
    if (!w) return;
    const ctx = this.ctx, W = this.W, H = this.H, S = Math.min(W, H), r = S * 0.1;
    for (const f of w.foes) {
      const P = this.wandFoePos(f, now), x = P.x, y = P.y, k = P.k;
      this.drawWandFoe(f, P, r, now);
      if (f.state === 'calm') { // elle s'envole vers le dresseur en laissant des étoiles et des cœurs
        ctx.globalAlpha = P.a; ctx.font = `${r * 0.5}px serif`; ctx.textAlign = 'center';
        for (let j = 0; j < 4; j++) ctx.fillText(['✨', '💖', '⭐', '✨'][j], x + Math.cos(now / 300 + j * 1.6) * r * 1.1, y + Math.sin(now / 300 + j * 1.6) * r * 0.9);
        ctx.globalAlpha = 1;
        continue;
      }
      // nuage d'orage (il rétrécit quand la charge monte)
      const cy = y - r * 1.25 * k, cs = r * (1 - f.charge * 0.55) * k, shake = f.aimed ? Math.sin(now * 0.06) * r * 0.05 : 0;
      ctx.save(); ctx.translate(x + shake, cy);
      ctx.fillStyle = '#4a4e69'; ctx.strokeStyle = '#22223b'; ctx.lineWidth = Math.max(2, r * 0.05);
      ctx.beginPath();
      for (const [dx, dy, rr] of [[-0.45, 0.05, 0.38], [0, -0.15, 0.48], [0.45, 0.05, 0.38], [0, 0.15, 0.4]]) { ctx.moveTo(dx * cs + rr * cs, dy * cs); ctx.arc(dx * cs, dy * cs, rr * cs, 0, 6.29); }
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; // petits yeux grognons
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sg * cs * 0.2, -cs * 0.05, cs * 0.09, cs * 0.06, sg * 0.4, 0, 6.29); ctx.fill(); }
      if (Math.sin(now * 0.004 + f.seed * 7) > 0.85) { // éclair
        ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = Math.max(2, r * 0.07); ctx.beginPath();
        ctx.moveTo(0, cs * 0.45); ctx.lineTo(-cs * 0.15, cs * 0.8); ctx.lineTo(cs * 0.08, cs * 0.8); ctx.lineTo(-cs * 0.1, cs * 1.2); ctx.stroke();
      }
      ctx.restore();
      // anneau de charge
      if (f.charge > 0) {
        ctx.lineCap = 'round'; ctx.lineWidth = Math.max(5, r * 0.14);
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, 6.29); ctx.stroke();
        ctx.strokeStyle = '#ffd166'; ctx.beginPath(); ctx.arc(x, y, r * 1.15, -Math.PI / 2, -Math.PI / 2 + f.charge * 6.29); ctx.stroke();
      }
    }
    // Baguettes et rayons
    const cols = ['#ffd166', '#7bdff2'];
    (w.ptrs || []).forEach((p, i) => {
      if (!p) return;
      const o = this.wandOrigin(i, p), tx = p.x * W, ty = p.y * H, a = Math.atan2(ty - o.y, tx - o.x), L = S * 0.09;
      const tip = o.real ? o : { x: o.x + Math.cos(a) * L, y: o.y + Math.sin(a) * L }, col = cols[i % 2], on = !!p.hit;
      // rayon : ondulé, plus épais et plus brillant quand il touche une créature
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const d = Math.hypot(tx - tip.x, ty - tip.y), nx = -(ty - tip.y) / (d || 1), ny = (tx - tip.x) / (d || 1);
      for (const [lw, al] of on ? [[S * 0.05, 0.25], [S * 0.022, 0.6], [S * 0.008, 1]] : [[S * 0.012, 0.25], [S * 0.004, 0.6]]) {
        ctx.strokeStyle = col; ctx.globalAlpha = al; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
        for (let j = 1; j <= 16; j++) { const q = j / 16, wv = Math.sin(q * 12 - now * 0.02) * S * (on ? 0.012 : 0.006) * Math.sin(q * Math.PI); ctx.lineTo(tip.x + (tx - tip.x) * q + nx * wv, tip.y + (ty - tip.y) * q + ny * wv); }
        ctx.stroke();
      }
      ctx.restore();
      if (on && Math.random() < 0.5) this.burst(tx, ty, 1, [col, '#ffffff']);
      // la baguette (manche foncé, bout blanc, étoile) ; en 3D, le petit sorcier tient déjà la vraie
      if (!o.real) {
      ctx.lineCap = 'round'; ctx.strokeStyle = '#3d2b1f'; ctx.lineWidth = Math.max(4, S * 0.014);
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(o.x + Math.cos(a) * L * 0.75, o.y + Math.sin(a) * L * 0.75); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.font = `${S * 0.045}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⭐', tip.x, tip.y);
      }
      // pointeur : étoile qui tourne
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(now / 400); ctx.font = `${S * (on ? 0.07 : 0.05)}px serif`; ctx.fillText('✨', 0, 0); ctx.restore();
      ctx.textBaseline = 'alphabetic';
    });
  }

  // ---------- Île du Stade (calque 2D commun) : ballons, gardien, panier, but. En 3D, le terrain et les créatures
  // sont de vrais modèles (voir updateSport3D) et sportPts() donne leur place à l'écran.
  // ---------- Jeux sur place (game.js : updateAct) : le décor du jeu autour du petit sorcier, qui reste au centre
  // (les objets à gauche, à droite et en bas de l'écran ; emojis : lisibles par les petits, légers à dessiner)
  drawAct(now) {
    const A = this.act;
    if (!A) return;
    const ctx = this.ctx, W = this.W, H = this.H, S = Math.min(W, H), a = A.a, n = A.n, game = A.game;
    const emo = (ch, x, y, sz, rot = 0, alpha = 1) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot);
      ctx.font = `${sz}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, 0); ctx.restore();
    };
    const txt = (t, x, y, sz, col = '#ffffff') => {
      ctx.font = `800 ${sz}px 'Baloo 2', system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = sz * 0.18; ctx.strokeStyle = '#1e1b4b'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y);
    };
    // (emplacements : à gauche et à droite du petit sorcier, en alternance, au bas de l'écran)
    const slot = (i, y = H * 0.84) => { const side = i % 2 ? 1 : -1, col = Math.floor(i / 2); return { x: W / 2 + side * (W * 0.36 - col * W * 0.1), y }; };
    const since = now - a.pop, subSince = now - a.subPop, popped = a.pop && a.pop !== this.actSeen;
    if (popped) this.actSeen = a.pop;
    const burstAt = (x, y) => this.burst(x, y, 34, ['#ffd166', '#ff70a6', '#ffffff', '#7bdff2', '#b8f2a1']);
    ctx.save();
    if (game === 'stomp' && now - a.shake < 180) ctx.translate((Math.random() - 0.5) * S * 0.02, (Math.random() - 0.5) * S * 0.015); // (boum : tout tremble)
    switch (game) {
      case 'shelf': { // Range les rayons : se baisser pour prendre un produit sur le rayon du bas, lever les bras pour le poser en haut
        const goods = ['🥫', '🧃', '🍞', '🧀', '🥛', '🍪', '🍫', '🧻'], yLow = H * 0.9, yHigh = H * 0.42, gs = S * 0.075;
        // deux étagères (une de chaque côté du petit sorcier) : montants, tablette du bas, tablette du haut
        for (const side of [-1, 1]) {
          const x0 = W / 2 + side * W * 0.16, x1 = W / 2 + side * W * 0.47, xa = Math.min(x0, x1), xb = Math.max(x0, x1);
          ctx.fillStyle = 'rgba(47,62,70,.3)'; ctx.fillRect(xa, yHigh - gs * 0.9, xb - xa, yLow - yHigh + gs * 0.9);
          ctx.fillStyle = '#adb5bd'; for (const y of [yHigh, yLow]) ctx.fillRect(xa - S * 0.01, y + gs * 0.45, xb - xa + S * 0.02, S * 0.018);
          ctx.fillStyle = side < 0 ? '#ef476f' : '#118ab2'; ctx.fillRect(xa - S * 0.012, yHigh - gs * 1.1, S * 0.014, yLow - yHigh + gs * 1.7); ctx.fillRect(xb - S * 0.002, yHigh - gs * 1.1, S * 0.014, yLow - yHigh + gs * 1.7);
          emo('⬆️', (xa + xb) / 2, yHigh - gs * 1.5, S * 0.03, 0, 0.5);
        }
        for (let i = 0; i < n; i++) {
          const p = slot(i, yLow), x = p.x, g = goods[i % goods.length];
          if (i < a.reps) { // déjà rangé sur le rayon du haut
            const k = i === a.reps - 1 ? Math.min(1, since / 350) : 1;
            emo(g, x, yHigh + (1 - k) * (yLow - yHigh) * 0.2, gs * (1 + 0.15 * Math.sin(Math.min(1, k) * Math.PI)));
            if (i === a.reps - 1 && popped) burstAt(x, yHigh);
            emo('✨', x + gs * 0.6, yHigh - gs * 0.5, S * 0.025, 0, 0.7 + 0.3 * Math.sin(now / 200 + i));
          } else if (i === a.reps) { // le produit du moment
            if (a.phase === 0) { emo(g, x, yLow - Math.abs(Math.sin(now / 250)) * gs * 0.3, gs * 1.1); emo('⬇️', x, yLow - gs * 1.5, S * 0.05); emo('✋', x - gs * 0.8, yLow - gs * 0.2, S * 0.04, 0, 0.8); }
            else { const k = Math.min(1, a.hold / 450), y = yLow + (yHigh - yLow) * (0.25 + 0.75 * k); emo(g, x, y, gs * 1.15); emo('🙌', x, y - gs * 1.2, S * 0.05); }
          } else emo(g, x, yLow, gs, 0, 0.85); // (encore sur le rayon du bas)
        }
        break;
      }
      case 'clap': { // des bébés pingouins dans des glaçons : chaque clap fait fondre la glace
        for (let i = 0; i < n; i++) {
          const p = slot(i, H * 0.8), sz = S * 0.12, warm = i < a.reps, cur = i === a.reps, k = cur ? a.sub / A.per : warm ? 1 : 0;
          const hop = warm ? Math.abs(Math.sin(now / 260 + i)) * S * 0.03 : 0, shiver = !warm ? Math.sin(now / 35 + i) * S * 0.004 : 0;
          emo('🐧', p.x + shiver, p.y - hop, sz);
          if (!warm) { // le glaçon, de plus en plus fondu
            ctx.fillStyle = `rgba(190,233,255,${0.75 * (1 - k)})`; ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.roundRect(p.x - sz * 0.55, p.y - sz * 0.6, sz * 1.1, sz * 1.15, sz * 0.15); ctx.fill(); ctx.stroke();
            if (cur) for (let d = 0; d < A.per; d++) emo(d < a.sub ? '🔥' : '·', p.x - sz * 0.35 + d * sz * 0.35, p.y + sz * 0.75, S * 0.035);
          } else { emo('🧣', p.x + sz * 0.05, p.y + sz * 0.18 - hop, sz * 0.45); emo('💛', p.x + sz * 0.45, p.y - sz * 0.6 - hop - (now / 20) % (sz * 0.4), sz * 0.25, 0, 0.8); }
          if (warm && i === a.reps - 1 && popped) burstAt(p.x, p.y);
        }
        if (subSince < 450 && a.subPop) emo('👏', W / 2, H * 0.3 - subSince * 0.05, S * 0.12 * (1 + subSince / 900), 0, 1 - subSince / 450);
        break;
      }
      case 'swim': { // nage vers le trésor : une perle par mouvement de bras, le dauphin avance
        for (let i = 0; i < 9; i++) { const q = ((now / 4000 + i * 0.37) % 1), x = (i % 2 ? W * 0.06 : W * 0.94) + Math.sin(now / 600 + i) * S * 0.02; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, H * (1 - q), S * (0.008 + (i % 3) * 0.006), 0, 6.29); ctx.stroke(); }
        const y0 = H * 0.84, x0 = W * 0.1, x1 = W * 0.86, step = (x1 - x0) / n;
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = S * 0.012; ctx.setLineDash([S * 0.012, S * 0.02]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < n; i++) { const x = x0 + step * (i + 1); ctx.fillStyle = i < a.reps ? '#fdfcdc' : 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x, y0, S * (i < a.reps ? 0.013 : 0.009), 0, 6.29); ctx.fill(); }
        emo('💎', x1 + S * 0.05, y0 - S * 0.01, S * 0.07 * (1 + 0.08 * Math.sin(now / 200)));
        const k = Math.min(1, since / 350), from = x0 + step * Math.max(0, a.reps - 1), to = x0 + step * a.reps, dx = a.reps ? from + (to - from) * k : x0;
        emo('🐬', dx, y0 - S * 0.05 - Math.sin(k * Math.PI) * S * 0.07, S * 0.09, -0.25 + k * 0.25);
        emo('🐬', W * 0.12 + ((now / 30) % (W * 0.2)), H * 0.62 + Math.sin(now / 400) * S * 0.03, S * 0.06, 0, 0.6); // (un ami dauphin qui joue)
        if (popped) burstAt(to, y0);
        break;
      }
      case 'launch': { // la fusée sur son pas de tir : jauge de carburant (accroupi), puis décollage (saut)
        const px = W * 0.83, py = H * 0.84, rs = S * 0.2;
        ctx.fillStyle = '#6c757d'; ctx.fillRect(px - rs * 0.6, py, rs * 1.2, S * 0.025);
        ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = S * 0.01; ctx.beginPath(); ctx.moveTo(px + rs * 0.55, py); ctx.lineTo(px + rs * 0.55, py - rs * 1.1); ctx.stroke();
        const flying = a.pop && since < 1400, ready = a.phase === 1;
        if (flying) { // la fusée qui vient de partir
          const q = since / 1400, fy = py - rs * 0.5 - q * q * H * 1.2;
          for (let f = 0; f < 4; f++) emo('🔥', px + (Math.random() - 0.5) * rs * 0.15, fy + rs * (0.45 + f * 0.18), rs * (0.35 - f * 0.06), Math.PI);
          emo('🚀', px, fy, rs, -Math.PI / 4);
          if (popped) burstAt(px, py);
        }
        if (!flying || since > 900) { // (la fusée suivante arrive sur le pas de tir)
          const shake = ready ? Math.sin(now / 30) * S * 0.004 : 0;
          if (ready) for (let f = 0; f < 2; f++) emo('🔥', px + shake, py - rs * 0.02 + f * rs * 0.12, rs * 0.28 * (1 + 0.2 * Math.sin(now / 60 + f)), Math.PI);
          if (a.reps < n) emo('🚀', px + shake, py - rs * 0.5, rs, -Math.PI / 4, flying ? (since - 900) / 500 : 1);
        }
        // jauge de carburant
        const gx = px - rs * 0.95, gh = rs * 1.1, k = ready ? 1 : Math.min(1, a.hold / 1300);
        ctx.fillStyle = 'rgba(15,12,50,.55)'; ctx.beginPath(); ctx.roundRect(gx - S * 0.02, py - gh - S * 0.01, S * 0.04, gh + S * 0.02, S * 0.015); ctx.fill();
        ctx.fillStyle = ready && Math.floor(now / 200) % 2 ? '#ffd166' : '#06d6a0'; ctx.beginPath(); ctx.roundRect(gx - S * 0.012, py - gh * k, S * 0.024, gh * k, S * 0.01); ctx.fill();
        emo('⛽', gx, py + S * 0.04, S * 0.04);
        if (ready && !flying) txt('SAUTE !', px, py - rs * 1.35, S * 0.06, Math.floor(now / 200) % 2 ? '#ffd166' : '#ffffff');
        // les planètes à visiter (une par décollage)
        const planets = ['🌙', '🪐', '🔴', '🌍', '⭐'];
        for (let i = 0; i < n; i++) { const y = H * (0.78 - i * 0.14), on = i < a.reps; emo(planets[i % planets.length], W * 0.09, y, S * (on ? 0.075 : 0.055), 0, on ? 1 : 0.35); if (on) emo('✨', W * 0.09 + S * 0.045, y - S * 0.035, S * 0.03); }
        break;
      }
      case 'stomp': { // des œufs de dino : chaque pas de dino les fait craquer, au bout de 4 ils éclosent
        for (let i = 0; i < n; i++) {
          const p = slot(i, H * 0.84), r = S * 0.055, done = i < a.reps, cur = i === a.reps;
          ctx.fillStyle = '#8d6e4c'; ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.9, r * 1.5, r * 0.4, 0, 0, 6.29); ctx.fill(); // (nid)
          if (done) {
            const b = Math.abs(Math.sin(now / 240 + i)) * r * 0.5;
            emo(i % 2 ? '🦖' : '🦕', p.x, p.y - b, S * 0.1);
            ctx.fillStyle = '#fff3d6'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(p.x + sx * r * 0.9, p.y + r * 0.55, r * 0.45, r * 0.3, sx * 0.4, 0, 6.29); ctx.fill(); }
            if (i === a.reps - 1 && popped) burstAt(p.x, p.y);
          } else {
            const wob = cur && subSince < 300 ? Math.sin(subSince / 25) * 0.15 : 0;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wob);
            ctx.fillStyle = '#fff3d6'; ctx.strokeStyle = '#5a3e2b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r, 0, 0, 6.29); ctx.fill(); ctx.stroke();
            ctx.fillStyle = ['#95d5b2', '#ffafcc', '#a2d2ff'][i % 3]; for (const [dx, dy] of [[-0.3, -0.4], [0.35, 0.1], [-0.15, 0.5]]) { ctx.beginPath(); ctx.arc(dx * r, dy * r, r * 0.16, 0, 6.29); ctx.fill(); }
            if (cur) { ctx.strokeStyle = '#3d2b1f'; ctx.lineWidth = 3; for (let c2 = 0; c2 < a.sub; c2++) { const y = -r * 0.5 + c2 * r * 0.35; ctx.beginPath(); ctx.moveTo(-r * 0.7, y); ctx.lineTo(-r * 0.3, y + r * 0.15); ctx.lineTo(0, y - r * 0.08); ctx.lineTo(r * 0.35, y + r * 0.12); ctx.lineTo(r * 0.7, y); ctx.stroke(); } }
            ctx.restore();
          }
        }
        if (now - a.shake < 400 && a.shake) { const q = (now - a.shake) / 400; txt('BOUM !', W / 2, H * 0.88 - q * S * 0.05, S * 0.07 * (1 + q * 0.3), '#ffd166'); for (const sx of [-1, 1]) { ctx.fillStyle = `rgba(222,203,164,${0.7 * (1 - q)})`; ctx.beginPath(); ctx.arc(W / 2 + sx * S * (0.08 + q * 0.12), H * 0.95, S * (0.03 + q * 0.04), 0, 6.29); ctx.fill(); } }
        break;
      }
    }
    ctx.restore();
  }

  sportKick() { this.sportT.kick = performance.now(); }
  sportScore() { this.sportT.score = performance.now(); }
  sportMate() { // copain qui passe / tire, et gardien du penalty : des créatures du paysage
    if (!this.sportCr) { const l = creaturesOf(this.kitName || (this.theme && this.theme.biomes[0].kit) || 'meadow'); const L = l.length ? l : CREATURES; this.sportCr = [L[Math.floor(Math.random() * L.length)], L[Math.floor(Math.random() * L.length)]]; }
    return this.sportCr;
  }
  sportPts(now) {
    const W = this.W, H = this.H, S = Math.min(W, H), kind = this.sport && this.sport.kind;
    return {
      mate: kind === 'basket' ? { x: W * 0.2, y: H * 0.6, s: S * 0.2 } : { x: W * 0.5, y: H * 0.44, s: S * 0.14 },
      hoop: { x: W * 0.74, y: H * 0.3, r: S * 0.055 },
      goal: { x: W * 0.5, y: H * 0.26, w: W * 0.36, h: H * 0.2 },
      keeper: { x: W * 0.5 + this.keeperX(now) * W * 0.12, y: H * 0.46, s: S * 0.13 },
    };
  }
  keeperX(now) { const b = this.sport && this.sport.ball; if (b && (b.phase === 'shot' || b.phase === 'goal')) return b.keeper * Math.min(1, (now - b.t0) / 300) * 1.2; return Math.sin(now / 700) * 0.6; }
  drawBall(x, y, r, kind, rot = 0) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(r * 0.15, r * 0.2, r, r, 0, 0, 6.29); ctx.fill();
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    if (kind === 'basket') { g.addColorStop(0, '#ffb86b'); g.addColorStop(1, '#e8590c'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ced4da'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.strokeStyle = '#1e1b4b'; ctx.stroke();
    if (kind === 'basket') {
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r);
      ctx.moveTo(-r * 0.7, -r * 0.7); ctx.quadraticCurveTo(0, 0, -r * 0.7, r * 0.7); ctx.moveTo(r * 0.7, -r * 0.7); ctx.quadraticCurveTo(0, 0, r * 0.7, r * 0.7); ctx.stroke();
    } else {
      const pent = (cx, cy, rr) => { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 1.2566; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
      ctx.fillStyle = '#1e1b4b'; pent(0, 0, r * 0.32);
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.clip();
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 1.2566 + 0.63; pent(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.28); }
      ctx.restore();
    }
    ctx.restore();
  }
  // Terrain dessiné (rendu 2D seulement ; en 3D ce sont des modèles)
  drawSportField(now, P) {
    const ctx = this.ctx, kind = this.sport.kind, S = Math.min(this.W, this.H), [mate, keeper] = this.sportMate();
    if (kind === 'kick') {
      const g = P.goal;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
      for (let i = 1; i < 12; i++) { ctx.beginPath(); ctx.moveTo(g.x - g.w / 2 + g.w * i / 12, g.y); ctx.lineTo(g.x - g.w / 2 + g.w * i / 12, g.y + g.h); ctx.stroke(); }
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(g.x - g.w / 2, g.y + g.h * i / 6); ctx.lineTo(g.x + g.w / 2, g.y + g.h * i / 6); ctx.stroke(); }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = S * 0.014; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(g.x - g.w / 2, g.y + g.h); ctx.lineTo(g.x - g.w / 2, g.y); ctx.lineTo(g.x + g.w / 2, g.y); ctx.lineTo(g.x + g.w / 2, g.y + g.h); ctx.stroke();
      drawCreature(ctx, P.keeper.x, P.keeper.y, P.keeper.s, keeper, 'airplane', now);
    } else {
      const k = this.sportT.kick && now - this.sportT.kick < 500;
      drawCreature(ctx, P.mate.x, P.mate.y, P.mate.s, mate, k ? 'happy' : null, now);
    }
    if (kind === 'basket') {
      const h = P.hoop;
      ctx.fillStyle = '#adb5bd'; ctx.fillRect(h.x + h.r * 1.2, h.y - h.r * 0.5, S * 0.012, this.H * 0.45);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#e63946'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(h.x - h.r * 0.2, h.y - h.r * 2.2, h.r * 2.4, h.r * 1.9, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(h.x - h.r + h.r * 0.5 * i, h.y); ctx.lineTo(h.x - h.r * 0.6 + h.r * 0.3 * i, h.y + h.r * 1.4); ctx.stroke(); }
      ctx.strokeStyle = '#f76707'; ctx.lineWidth = S * 0.01; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.3, 0, 0, 6.29); ctx.stroke();
    }
  }
  drawSport(now) {
    const sp = this.sport;
    if (!sp) return;
    const ctx = this.ctx, P = this.sportPts(now), S = Math.min(this.W, this.H);
    this.drawSportField(now, P);
    const lerp = (a, b, t) => a + (b - a) * t;
    if (sp.kind === 'goal') {
      for (const b of sp.balls) {
        const A = this.anchor(b.hero), ex = A.x + b.u * A.u, ey = A.y + b.v * A.u, p = (now - b.born) / (b.arrive - b.born);
        let x = lerp(P.mate.x, ex, Math.min(p, 1.2)), y = lerp(P.mate.y, ey, Math.min(p, 1.2)) - Math.sin(Math.min(1, p) * Math.PI) * A.u * 0.8, r = A.u * 0.34 * (0.25 + 0.75 * Math.min(1.3, p)), al = 1;
        if (b.done === 'saved') { const q = (now - b.t) / 600; if (q > 1) continue; x = ex + Math.sign(b.u || 1) * q * A.u * 2; y = ey - Math.sin(q * Math.PI) * A.u * 1.5; al = 1 - q; }
        else if (b.done === 'goal') { const q = (now - b.t) / 400; if (q > 1) continue; r *= 1 + q * 0.5; al = 1 - q; }
        else if (p > 0.55) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(ex, ey, A.u * 0.45, 0, 6.29); ctx.stroke(); ctx.setLineDash([]); }
        ctx.globalAlpha = al; this.drawBall(x, y, r, 'soccer', now / 120); ctx.globalAlpha = 1;
      }
    } else if (sp.kind === 'basket' && sp.ball) {
      const b = sp.ball, A = this.anchor(b.hero), k = now - b.t0, chest = { x: A.x, y: A.y - 1.4 * A.u }; // (vu de dos : le ballon flotte au-dessus de la tête, sinon le dresseur le cache)
      const hs = this.mirror && this.avatarHands && this.avatarHands[b.hero];
      const held = hs && hs.length ? { x: A.x + hs.reduce((a, q) => a + q.u, 0) / hs.length * A.u, y: A.y + hs.reduce((a, q) => a + q.v, 0) / hs.length * A.u } : { x: A.x, y: A.y - 0.3 * A.u };
      let x, y, r = A.u * 0.55;
      if (b.phase === 'pass') { const t = Math.min(1, k / sp.pass); x = lerp(P.mate.x, chest.x, t); y = lerp(P.mate.y - P.mate.s * 0.5, chest.y, t) - Math.sin(t * Math.PI) * A.u; }
      else if (b.phase === 'catch') {
        x = chest.x; y = chest.y + Math.sin(now / 200) * A.u * 0.06;
        ctx.font = `${A.u * 0.55}px serif`; ctx.textAlign = 'center'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 180); ctx.font = `${A.u * 0.8}px serif`; ctx.fillText('🤲', x + A.u * 1.1, y + A.u * 0.3); ctx.globalAlpha = 1;
      } else if (b.phase === 'hold') {
        x = held.x; y = held.y;
        ctx.font = `${A.u * 0.6}px serif`; ctx.textAlign = 'center'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 180); ctx.fillText('🙌', x, y - A.u * 0.8); ctx.globalAlpha = 1;
      } else if (b.phase === 'shoot') {
        const t = Math.min(1, k / sp.fly), h = P.hoop; if (!b.from) b.from = { ...held };
        x = lerp(b.from.x, h.x, t); y = lerp(b.from.y, h.y - h.r * 0.2, t) - Math.sin(t * Math.PI) * S * 0.25; r *= 1 - t * 0.45;
      } else { const t = Math.min(1, k / 800); x = chest.x + t * A.u; y = chest.y + t * t * A.u * 2; ctx.globalAlpha = 1 - t; }
      this.drawBall(x, y, r, 'basket', now / 200); ctx.globalAlpha = 1;
    } else if (sp.kind === 'kick' && sp.ball) {
      const b = sp.ball, A = this.anchor(b.hero), k = now - b.t0, g = P.goal;
      const foot = b.hand ? { x: A.x + b.side * 1.1 * A.u, y: A.y + 0.1 * A.u } : { x: A.x + b.side * 1.6 * A.u, y: A.y + 2.1 * A.u };
      const aim = { x: g.x + b.side * g.w * 0.3, y: g.y + g.h * 0.55 };
      let x = foot.x, y = foot.y, r = A.u * 0.45;
      if (b.phase === 'wait') {
        ctx.font = `${A.u * 0.95}px serif`; ctx.textAlign = 'center';
        ctx.fillText(b.hand ? '✋' : '🦵', foot.x, foot.y - A.u * 0.95 - Math.abs(Math.sin(now / 250)) * A.u * 0.2);
      } else if (b.phase === 'shot') { const t = Math.min(1, k / 900); x = lerp(foot.x, aim.x, t); y = lerp(foot.y, aim.y, t) - Math.sin(t * Math.PI) * A.u * 0.8; r *= 1 - 0.65 * t; }
      else { x = aim.x + Math.sin(k / 40) * Math.max(0, 1 - k / 500) * r * 0.5; y = aim.y; r *= 0.35; }
      this.drawBall(x, y, r, 'soccer', b.phase === 'shot' ? now / 60 : 0);
      if (b.phase === 'goal' && k < 900) {
        ctx.font = `800 ${S * 0.09}px 'Baloo 2', sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = S * 0.012; ctx.strokeStyle = '#1e1b4b'; ctx.fillStyle = '#ffd166';
        const sc = 1 + 0.2 * Math.sin(Math.min(1, k / 300) * Math.PI); ctx.save(); ctx.translate(g.x, g.y - S * 0.02); ctx.scale(sc, sc);
        ctx.strokeText('BUT !', 0, 0); ctx.fillText('BUT !', 0, 0); ctx.restore();
      }
    }
  }

  // Traînée lumineuse derrière la main (coup de sabre) : on voit son geste
  drawTrail(i, k, x, y, r, now) {
    const ctx = this.ctx, key = i * 2 + k;
    const tr = (this.trails[key] = (this.trails[key] || []).filter((p) => now - p.t < 220));
    tr.push({ x, y, t: now });
    if (tr.length < 2) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let j = 1; j < tr.length; j++) {
      const a = 1 - (now - tr[j].t) / 220;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * a})`; ctx.lineWidth = r * 1.4 * a + 2;
      ctx.beginPath(); ctx.moveTo(tr[j - 1].x, tr[j - 1].y); ctx.lineTo(tr[j].x, tr[j].y); ctx.stroke();
    }
  }

  // Fruits lancés en l'air autour du héros ; coupés : deux moitiés qui s'écartent et tombent, avec du jus
  drawFruits(now) {
    const ctx = this.ctx;
    this.fruits = (this.fruits || []).filter((f) => (f.cut ? now - f.cut < 1200 : (now - f.born) / f.dur < 1.2));
    for (const f of this.fruits) {
      const A = this.anchor(f.hero), size = f.r * A.u * 2.3;
      ctx.font = `${size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (!f.cut) {
        const q = fruitPos(f, now), x = A.x + q.u * A.u, y = A.y + q.v * A.u;
        ctx.save(); ctx.translate(x, y); ctx.rotate((now - f.born) / 1000 * f.spin);
        ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = size * 0.25;
        ctx.fillText(f.emoji, 0, 0); ctx.restore();
        continue;
      }
      const k = (now - f.cut) / 1000, x0 = A.x + f.cu * A.u, y0 = A.y + f.cv * A.u;
      // Jus : gouttes qui giclent
      if (k < 0.45) {
        ctx.fillStyle = f.juice; ctx.globalAlpha = 1 - k / 0.45;
        for (let j = 0; j < 9; j++) { const a = j * 0.698 + f.spin; ctx.beginPath(); ctx.arc(x0 + Math.cos(a) * size * (0.3 + k * 2.2), y0 + Math.sin(a) * size * (0.3 + k * 2.2), size * 0.07, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      // Deux moitiés, coupées le long du geste
      const nx = -Math.sin(f.ang), ny = Math.cos(f.ang), sep = size * (0.15 + k * 1.1), fall = k * k * A.u * 6;
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.7) / 0.5);
      for (const sg of [-1, 1]) {
        ctx.save();
        ctx.translate(x0 + nx * sep * sg, y0 + ny * sep * sg + fall);
        ctx.rotate(sg * k * 2.5);
        ctx.save(); ctx.rotate(f.ang);
        ctx.beginPath(); ctx.rect(-size, sg > 0 ? 0 : -size, size * 2, size); ctx.clip(); // moitié du fruit
        ctx.rotate(-f.ang);
        ctx.fillText(f.emoji, 0, 0);
        ctx.restore();
        // tranche claire, côté coupé
        ctx.rotate(f.ang); ctx.fillStyle = 'rgba(255, 250, 230, 0.9)';
        ctx.fillRect(-size * 0.38, -size * 0.03, size * 0.76, size * 0.06);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Cubes en rythme (version 2D : la 3D les dessine en vrais cubes) et cibles où mettre les mains
  drawCubes(now) {
    if (this.drawCubes3D) return; // (scène 3D)
    const ctx = this.ctx;
    this.cubes = (this.cubes || []).filter((cb) => !(cb.hit && now - cb.hit > 500) && !(cb.missed && now - cb.arrive > 900));
    const A = this.anchor(0);
    for (const t of this.cubeTargets || []) {
      ctx.strokeStyle = t.side < 0 ? '#4ea8ff' : '#ff6b35'; ctx.lineWidth = t.near ? 8 : 4;
      ctx.beginPath(); ctx.arc(A.x + t.u * A.u, A.y + t.v * A.u, A.u * 0.6, 0, Math.PI * 2); ctx.stroke();
    }
    for (const cb of this.cubes) {
      if (cb.u == null) continue;
      const p = Math.min(1.3, (now - cb.born) / (cb.arrive - cb.born)), tx = A.x + cb.u * A.u, ty = A.y + cb.v * A.u;
      const x = this.W / 2 + (tx - this.W / 2) * p, y = this.H * 0.42 + (ty - this.H * 0.42) * p, sz = A.u * (0.25 + 0.75 * p);
      ctx.globalAlpha = cb.hit ? Math.max(0, 1 - (now - cb.hit) / 500) : 1;
      ctx.fillStyle = cb.side < 0 ? '#4ea8ff' : '#ff6b35';
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    }
  }

  // Bulles autour des héros et mains des joueurs (gants lumineux)
  drawBubbles(now) {
    const ctx = this.ctx;
    for (const bb of this.bubbles) {
      const A = this.anchor(bb.hero), grow = Math.min(1, (now - bb.born) / 300);
      const aim = now - (bb.aimT || 0) < 150; bb.k = (bb.k || 1) + ((aim ? 1.25 : 1) - (bb.k || 1)) * 0.25; // (visée : elle grossit)
      const x = A.x + bb.u * A.u, y = A.y + bb.v * A.u + Math.sin(now * 0.003 + bb.p) * A.u * 0.05, r = bb.r * A.u * grow * bb.k;
      if (aim) { ctx.strokeStyle = 'rgba(255,209,102,.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r * 1.18, 0, Math.PI * 2); ctx.stroke(); }
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(0.7, 'rgba(173,232,255,0.35)'); g.addColorStop(1, 'rgba(255,170,230,0.75)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2); ctx.fill();
    }
    this.pops = this.pops.filter((p) => now - p.t < 400);
    for (const p of this.pops) {
      const A = this.anchor(p.hero), k = (now - p.t) / 400;
      const x = A.x + p.u * A.u, y = A.y + p.v * A.u, r = p.r * A.u;
      ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, r * (1 + k), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(173,232,255,${1 - k})`;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * (1 + k * 1.5), y + Math.sin(a) * r * (1 + k * 1.5), 5, 0, Math.PI * 2); ctx.fill();
      }
    }
    this.hands.forEach((list0, i) => {
      // (héros qui imite le joueur : les gants sont dessinés pile sur ses mains, à cette image)
      const list = (this.mirror && this.avatarHands && this.avatarHands[i]) || list0;
      if (!list) return;
      const A = this.anchor(i), h = this.heroes[i];
      for (const hd of list) {
        const x = A.x + hd.u * A.u, y = A.y + hd.v * A.u, r = A.u * 0.2;
        // Le bras, de l'épaule au gant : on voit jusqu'où on touche
        if (this.sliceOn) { this.drawSaber(i, list.indexOf(hd), A, x, y, hd, now); continue; } // fruits : un sabre lumineux dans chaque main
        if (!(h && h.m3 && h.m3.human && this.mirror)) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'; ctx.lineWidth = Math.max(4, A.u * 0.12); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(A.x + Math.sign(hd.u || 1) * A.u * 0.35, A.y); ctx.lineTo(x, y); ctx.stroke();
        }
        if (this.sliceOn) this.drawTrail(i, list.indexOf(hd), x, y, r, now);
        ctx.fillStyle = 'rgba(255, 255, 200, 0.35)';
        ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = (h && h.pal && h.pal.accent) || '#ffd166'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    });
  }

  // Obstacle à éviter : rocher dans un couloir, tronc (sauter) ou branche (se baisser)
  drawHazard(hz, now) {
    const ctx = this.ctx, z = Math.max(-0.8, this.hazardZ(hz, now));
    let alpha = this.fade(z);
    if (hz.t0) alpha *= Math.max(0, 1 - (now - hz.t0) / 600);
    if (alpha <= 0) return;
    const k = this.k(z), s = this.size * k, gy = this.sy(z);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (hz.kind === 'log') this.drawLog(z, s, gy);
    else if (hz.kind === 'arch') this.drawArch(z, s, gy);
    else if (hz.kind === 'tackle') this.drawTackle(z, s, gy, now);
    else if (hz.kind === 'giant') this.drawGiant(z, s, gy, now, hz);
    else if (hz.kind === 'cone') this.drawCone(this.sx(hz.lane, z), s, gy);
    else if (hz.kind === 'star') {
      // Étoile qui arrive dans un couloir : se mettre dessous pour l'attraper
      const x = this.sx(hz.lane, z), y = gy - s * 0.7 + Math.sin(now * 0.008) * s * 0.05;
      ctx.fillStyle = 'rgba(255, 245, 180, 0.45)';
      ctx.beginPath(); ctx.arc(x, y, s * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.font = `${s * 0.55}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.theme.collectible, x, y);
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath(); ctx.ellipse(x, gy, s * 0.3, s * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    }
    else this.drawRock(this.sx(hz.lane, z), s * 0.75, gy);
    ctx.restore();
  }

  drawLog(z, s, gy) {
    const ctx = this.ctx, xl = this.sx(-1.55, z), xr = this.sx(1.55, z), hgt = s * 0.32;
    ctx.fillStyle = '#7a4f2a'; ctx.fillRect(xl, gy - hgt, xr - xl, hgt);
    ctx.fillStyle = '#9c6b3d'; ctx.fillRect(xl, gy - hgt, xr - xl, hgt * 0.35);
    ctx.fillStyle = '#d9a86c';
    for (const x of [xl, xr]) { ctx.beginPath(); ctx.ellipse(x, gy - hgt / 2, hgt * 0.3, hgt / 2, 0, 0, Math.PI * 2); ctx.fill(); }
  }

  drawArch(z, s, gy) {
    const ctx = this.ctx, xl = this.sx(-1.55, z), xr = this.sx(1.55, z), barY = gy - s * 0.95;
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(xl - s * 0.06, barY, s * 0.12, gy - barY);
    ctx.fillRect(xr - s * 0.06, barY, s * 0.12, gy - barY);
    ctx.fillStyle = '#7a5432'; ctx.fillRect(xl, barY - s * 0.1, xr - xl, s * 0.18);
    ctx.font = `${s * 0.3}px serif`; ctx.textAlign = 'center';
    for (let i = 0; i <= 6; i++) ctx.fillText(i % 2 ? '🍃' : '🌿', xl + (xr - xl) * (i / 6), barY + s * 0.05);
  }

  // Footballeur dessiné (maillot rouge à bande blanche, short, chaussettes) : debout, ou couché pour le tacle
  drawPlayer(x, gy, h, opts = {}) {
    const ctx = this.ctx, u = h / 10, arms = opts.arms ? 1 : 0;
    ctx.save(); ctx.translate(x, gy);
    if (opts.lying) ctx.rotate(-Math.PI / 2 * 0.92);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = u * 1.2; // jambes
    const sp = opts.legsOpen ? u * 1.8 : u * 0.6;
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * u * 0.6, -u * 4.2); ctx.lineTo(sg * sp, -u * 0.4); ctx.stroke(); }
    ctx.strokeStyle = '#e63946'; ctx.lineWidth = u * 1.1; // bras
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * u * 1.2, -u * 7.3); ctx.lineTo(sg * (arms ? u * 4.6 : u * 1.8), arms ? -u * 7.4 : -u * 4.6); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-u * 1.3, -u * 5, u * 2.6, u * 1.0); // short
    ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.roundRect(-u * 1.4, -u * 7.8, u * 2.8, u * 3.2, u * 0.6); ctx.fill(); // maillot
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-u * 1.4, -u * 6.9, u * 2.8, u * 0.5);
    ctx.fillStyle = '#ffcf9e'; ctx.beginPath(); ctx.arc(0, -u * 8.8, u * 1.1, 0, Math.PI * 2); ctx.fill(); // tête
    ctx.fillStyle = '#5a3e2b'; ctx.beginPath(); ctx.arc(0, -u * 9.2, u * 1.1, Math.PI, 0); ctx.fill();
    ctx.restore();
  }
  // Tacle : le joueur glisse en travers du chemin, gerbe d'herbe d'un bord à l'autre (sauter)
  drawTackle(z, s, gy, now) {
    const ctx = this.ctx, xl = this.sx(-1.55, z), xr = this.sx(1.55, z);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(xl, gy - s * 0.04, xr - xl, s * 0.06);
    for (let i = 0; i <= 14; i++) { const x = xl + (xr - xl) * (i / 14), j = Math.abs(Math.sin(now * 0.012 + i)) * s * 0.12; ctx.fillStyle = ['#6fbf73', '#8fd97c', '#c49a6c'][i % 3]; ctx.beginPath(); ctx.arc(x, gy - s * 0.08 - j, s * 0.04, 0, Math.PI * 2); ctx.fill(); }
    this.drawPlayer((xl + xr) / 2 + Math.sin(now * 0.03) * s * 0.02, gy - s * 0.02, s * 1.1, { lying: true });
    ctx.font = `${s * 0.22}px serif`; ctx.textAlign = 'center'; ctx.fillText('⚽', xr - (xr - xl) * 0.2, gy - s * 0.03);
  }
  // Grand joueur bras écartés au milieu du chemin (se baisser pour passer dessous)
  drawGiant(z, s, gy, now, hz) {
    const hop = hz.state === 'hit' && hz.t0 ? Math.abs(Math.sin((now - hz.t0) * 0.012)) * s * 0.2 : 0;
    this.drawPlayer(this.sx(0, z), gy - hop, s * 1.6 * 0.95, { arms: true, legsOpen: true });
  }
  // Plot orange à rayures blanches
  drawCone(x, s, gy) {
    const ctx = this.ctx, w = s * 0.32, h = s * 0.62;
    ctx.fillStyle = '#1e1b4b'; ctx.fillRect(x - w * 1.2, gy - s * 0.05, w * 2.4, s * 0.06);
    ctx.fillStyle = '#ff7b00'; ctx.beginPath(); ctx.moveTo(x - w, gy - s * 0.04); ctx.lineTo(x - w * 0.15, gy - h); ctx.lineTo(x + w * 0.15, gy - h); ctx.lineTo(x + w, gy - s * 0.04); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const [a, b] of [[0.28, 0.4], [0.58, 0.68]]) { const wa = w * (1 - a * 0.85), wb = w * (1 - b * 0.85); ctx.beginPath(); ctx.moveTo(x - wa, gy - h * a); ctx.lineTo(x - wb, gy - h * b); ctx.lineTo(x + wb, gy - h * b); ctx.lineTo(x + wa, gy - h * a); ctx.closePath(); ctx.fill(); }
  }

  drawRock(x, s, gy) {
    const ctx = this.ctx;
    ctx.fillStyle = '#8d8173';
    ctx.beginPath(); ctx.ellipse(x, gy - s * 0.45, s * 0.75, s * 0.48, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a89c8e';
    ctx.beginPath(); ctx.ellipse(x - s * 0.2, gy - s * 0.65, s * 0.3, s * 0.15, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5c5248'; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath(); ctx.moveTo(x + s * 0.1, gy - s * 0.85); ctx.lineTo(x - s * 0.05, gy - s * 0.5); ctx.lineTo(x + s * 0.15, gy - s * 0.25); ctx.stroke();
  }

  drawObstacle(now) {
    const o = this.obs;
    const ctx = this.ctx, th = this.theme;
    let z = o.state === 'coming' ? this.obsZ(now) : o.zc;
    let alpha = this.fade(z);
    const since = now - o.t0;
    if (o.state === 'cleared') { z = o.zc - since * 0.02; alpha = Math.max(0, 1 - since / 500); }
    if (o.state === 'missed') alpha = Math.max(0, 1 - since / 700);
    if (alpha <= 0 || z < -0.85) { this.obs = null; return; }
    const k = this.k(z), s = this.size * k, gy = this.sy(z);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (o.kind === 'low') this.drawLog(z, s, gy);          // tronc : sauter par-dessus
    else if (o.kind === 'high' || o.kind === 'tunnel') this.drawArch(z, s, gy);   // branche / tunnel : passer dessous
    else if (o.kind === 'crate') {                         // gros rocher à casser
      const sh = o.shake && now - o.shake < 200 ? Math.sin(now * 0.2) * s * 0.05 : 0;
      this.drawRock(this.sx(0, z) + sh, s, gy);
    } else if (o.kind === 'wall') {
      // Mur avec un trou en forme de bonhomme : on passe en prenant la pose
      const xl = this.sx(-1.6, z), xr = this.sx(1.6, z), top = gy - s * 1.9;
      ctx.fillStyle = '#e07a5f'; ctx.fillRect(xl, top, xr - xl, gy - top);
      ctx.strokeStyle = 'rgba(120, 50, 30, 0.35)'; ctx.lineWidth = Math.max(1, s * 0.02);
      const bh = s * 0.22;
      for (let y = top, row = 0; y < gy; y += bh, row++) {
        ctx.beginPath(); ctx.moveTo(xl, y); ctx.lineTo(xr, y); ctx.stroke();
        for (let x = xl + (row % 2) * bh; x < xr; x += bh * 2) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + bh); ctx.stroke(); }
      }
      const f = POSE_FIGURES[o.pose] || POSE_FIGURES.armsUp;
      stickFigure(ctx, { x: this.sx(0, z), y: gy - s * 0.05, s: s * 1.55, ...f }, 'rgba(255, 255, 230, 0.9)', 2.6);
    } else {
      // Baie brillante dans un couloir, buissons dans les autres
      const lane = o.kind === 'gemL' ? -1 : 1;
      ctx.font = `${s * 0.9}px serif`; ctx.textAlign = 'center';
      for (const l of [-1, 0, 1]) {
        if (l === lane) continue;
        ctx.fillText('🌳', this.sx(l, z), gy);
      }
      const x = this.sx(lane, z), by = gy - s * 0.5 + Math.sin(now * 0.006) * s * 0.06;
      ctx.fillStyle = 'rgba(255,255,200,0.4)';
      ctx.beginPath(); ctx.arc(x, by, s * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.font = `${s * 0.55}px serif`; ctx.textBaseline = 'middle';
      ctx.fillText(th.collectible, x, by);
      ctx.textBaseline = 'alphabetic';
      // flèche au sol
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `800 ${s * 0.5}px system-ui`;
      ctx.fillText(lane < 0 ? '◀' : '▶', this.sx(0, z), gy - s * 0.2);
    }
    ctx.restore();
  }

  encZ(now) {
    const e = this.enc;
    const p = Math.min(1, (now - e.born) / 1300);
    const ease = 1 - Math.pow(1 - p, 3);
    return this.Zfar - (this.Zfar - 6.5) * ease;
  }

  drawEncounter(now) {
    const z = this.encZ(now), k = this.k(z);
    this.drawEncounterAt(now, { z, x: this.sx(0, z), gy: this.sy(z), s: this.size * 2.1 * k });
  }

  // Créature à apprivoiser, dessinée à la position écran g = { z, x, gy (sol), s (taille) }
  drawEncounterAt(now, g) {
    const e = this.enc, ctx = this.ctx, z = g.z, s = g.s;
    let x = g.x, gy = g.gy;
    const since = now - e.t0;
    let alpha = this.fade(z), scale = 1, pose = e.pose, jump = 0;
    if (e.state === 'leaving') {
      x += since * 0.6; pose = 'wave'; alpha = Math.max(0, 1 - since / 900);
      if (alpha <= 0) { this.enc = null; return; }
    } else if (e.state === 'befriend') {
      pose = 'happy';
      jump = Math.abs(Math.sin(since * 0.012)) * s * 0.25 * Math.max(0, 1 - since / 900);
      if (since > 900) scale = Math.max(0, 1 - (since - 900) / 400);
      if (since > 900 && !e.orbSent) {
        e.orbSent = true;
        this.burst(x, gy - s * 0.5, 22, ['#ffd6f5', '#c77dff', '#fff', '#ffe066']);
      }
      if (since > 1300) { this.enc = null; return; }
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    // Anneau d'amitié qui se remplit pendant que l'enfant tient la pose
    if (e.state === 'waiting') {
      const r = s * 0.75;
      ctx.lineWidth = Math.max(3, s * 0.06);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(x, gy - s * 0.5, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ff7eb6';
      ctx.beginPath(); ctx.arc(x, gy - s * 0.5, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (e.hold || 0)); ctx.stroke();
    }
    if (scale < 1) {
      drawOrb(ctx, x, gy - s * 0.5, s * 0.35 * (1.2 - scale * 0.2), now);
    }
    if (scale > 0 && !g.noBody) {
      ctx.translate(x, gy - jump);
      ctx.scale(scale, scale);
      drawCreature(ctx, 0, 0, s, e.cr, pose, now, e.evolved);
    }
    ctx.restore();
    // Nom au-dessus
    if (e.state === 'waiting' && z < 20) {
      ctx.font = `800 ${Math.max(16, s * 0.18)}px "Baloo 2", system-ui`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      const label = e.cr.name + (e.evolved ? ' ★' : '');
      ctx.strokeText(label, x, gy - s * 1.25);
      ctx.fillStyle = '#fff'; ctx.fillText(label, x, gy - s * 1.25);
    }
  }
}
