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
    this.hero = { lane: 0, y: 0, vy: 0, pose: null, poseUntil: 0, holdPose: null, bumpUntil: 0 };
    this.live = { side: 'center', squat: false };
    this.obs = null;
    this.enc = null;
    this.decor = [];
    this.parts = [];
    this.floaters = [];
    this.skyStars = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random() * 0.35, r: Math.random() * 1.5 + 0.4, p: Math.random() * 6 }));
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
  heroPx() {
    const z = this.heroZ();
    return { x: this.sx(this.hero.lane, z), y: this.sy(z) + this.hero.y };
  }

  biome() {
    const b = this.theme.biomes;
    const f = Math.min(b.length - 1, this.progress * b.length);
    const i = Math.min(b.length - 1, Math.floor(f));
    const j = Math.min(b.length - 1, i + 1);
    const tr = Math.max(0, (f - i - 0.85) / 0.15); // fondu sur la fin de chaque biome
    const col = (key) => (i === j ? b[i][key] : mixColor(b[i][key], b[j][key], tr));
    return { col, cur: b[i], night: b[i].night };
  }

  setWorld(theme) {
    this.theme = theme;
    this.obs = null; this.enc = null; this.parts = []; this.floaters = [];
    this.progress = 0;
    Object.assign(this.hero, { lane: 0, y: 0, vy: 0, pose: null, holdPose: null });
    this.decor = [];
    if (theme) for (let i = 0; i < 26; i++) this.spawnDecor(Math.random() * this.Zfar);
  }

  setProgress(p) { this.progress = p; }
  setLive(st) { this.live.side = st.side; this.live.squat = st.squat; }

  spawnDecor(z) {
    const b = this.theme.biomes[Math.min(this.theme.biomes.length - 1, Math.floor(this.progress * this.theme.biomes.length))];
    const sg = Math.random() < 0.5 ? -1 : 1;
    this.decor.push({ lx: sg * (2.1 + Math.random() * 3.5), z, e: b.deco[Math.floor(Math.random() * b.deco.length)], s: 0.8 + Math.random() * 0.7 });
  }

  // --- API commune avec Scene
  action(type) {
    const h = this.hero, now = performance.now();
    if (type === 'jump') { if (h.y >= -1) h.vy = -this.H * 1.6; }
    else if (type === 'squat') { h.pose = 'duck'; h.poseUntil = now + 700; }
    else if (type === 'smash') {
      h.pose = 'smash'; h.poseUntil = now + 450;
      if (this.obs && this.obs.kind === 'crate') this.obs.shake = now;
    }
    else if (type === 'step') {
      const p = this.heroPx();
      this.floaters.push({ x: p.x + (Math.random() - 0.5) * this.size * 0.5, y: p.y - this.size * 1.1, text: this.theme.collectible, size: this.size * 0.3, life: 0.8, max: 0.8, vy: -this.H * 0.3 });
    }
  }

  setHoldPose(p) { this.hero.holdPose = p; }
  // Le héros montre la pose à faire (sans l'anneau de réussite)
  setDemoPose(p) { this.hero.demoPose = p; }

  shift(d) {
    const o = this.obs, e = this.enc;
    if (o) { o.born += d; o.t0 += d; if (o.shake) o.shake += d; }
    if (e) { e.born += d; e.t0 += d; }
    this.hero.poseUntil += d; this.hero.bumpUntil += d;
    this.last = performance.now();
  }
  setHoldProgress(p) { if (this.enc) this.enc.hold = p; }

  onStep(s, dur) {
    const now = performance.now();
    this.obs = null;
    if (this.enc && this.enc.state === 'waiting') this.enc.state = 'leaving';
    this.hero.holdPose = null;
    this.hero.demoPose = null;
    this.targetSpeed = s.m === 'run' ? 2.6 : s.m === 'rest' ? 0.25 : s.m === 'pose' ? 0.35 : 1;
    const kind = { jump: 'low', squat: 'high', smash: 'crate', left: 'gemL', right: 'gemR' }[s.m];
    if (kind) this.obs = { kind, born: now, dur, state: 'coming', t0: now, shake: 0 };
    if (s.m === 'pose' && s.creature) {
      this.enc = { cr: s.creature, pose: s.pose, born: now, state: 'waiting', t0: now, hold: 0, evolved: Carnet.evolved(s.creature.id) };
    }
  }

  obsZ(now) {
    const o = this.obs;
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
    if (success && (o.kind === 'crate' || o.kind === 'gemL' || o.kind === 'gemR')) {
      const lx = o.kind === 'gemL' ? -1 : o.kind === 'gemR' ? 1 : 0;
      const x = this.sx(lx, o.zc), y = this.sy(o.zc) - this.size * this.k(o.zc) * 0.5;
      this.burst(x, y, 18, o.kind === 'crate' ? ['#8d8173', '#bfb3a5', '#5c5248'] : ['#fff', '#ffd166', '#72efdd']);
      this.emojiPop(x, y, 3);
      this.obs = null;
    } else if (success) {
      const p = this.heroPx();
      this.emojiPop(p.x, p.y - this.size * 1.2, 2);
    } else if (o.kind !== 'gemL' && o.kind !== 'gemR') {
      this.hero.bumpUntil = now + 600;
    }
  }

  burst(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random() * 0.7) * this.H * 0.6;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - this.H * 0.3, life: 0.9, max: 0.9, color: colors[i % colors.length], r: 3 + Math.random() * 6 });
    }
  }

  emojiPop(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.floaters.push({ x: x + (i - (n - 1) / 2) * this.size * 0.3, y, text: this.theme.collectible, size: this.size * 0.32, life: 1, max: 1, vy: -this.H * (0.25 + i * 0.03) });
    }
  }

  floatText(text, color = '#fff') {
    const p = this.heroPx();
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
    const h = this.hero;
    const targetLane = this.live.side === 'left' ? -1 : this.live.side === 'right' ? 1 : 0;
    h.lane += (targetLane - h.lane) * Math.min(1, dt * 8);
    h.vy += H * 5 * dt; h.y += h.vy * dt;
    if (h.y > 0) { h.y = 0; h.vy = 0; }

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
    ctx.fillStyle = col('sun');
    ctx.beginPath(); ctx.arc(W * 0.72, hy * 0.38, H * 0.06, 0, Math.PI * 2); ctx.fill();

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
    items.push({ z: this.heroZ() - 0.01, draw: () => this.drawHero(now) });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.draw();

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

    // Particules et textes flottants
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
    const ctx = this.ctx, h = this.hero;
    let pose;
    if (now < h.bumpUntil) pose = 'bump';
    else if (h.y < -2) pose = 'jump';
    else if (this.live.squat) pose = 'duck';
    else if (h.pose && now < h.poseUntil) pose = h.pose;
    else if (h.holdPose) pose = h.holdPose;
    else if (h.demoPose) pose = h.demoPose;
    else if (this.enc && this.enc.state === 'befriend') pose = 'happy';
    else pose = this.speed < 0.5 ? 'idle' : 'run';
    const z = this.heroZ(), k = this.k(z);
    const x = this.sx(h.lane, z), gy = this.sy(z);
    const s = this.size * k * 1.0;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x, gy + 2, s * 0.38 * (1 + h.y / this.H), s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    drawHeroBack(ctx, x, gy + h.y, s, this.theme.hero, pose, now);
    if (h.holdPose) {
      ctx.strokeStyle = `rgba(255,255,180,${0.5 + 0.4 * Math.sin(now * 0.01)})`; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, gy + h.y - s * 0.55, s * 0.8, 0, Math.PI * 2); ctx.stroke();
    }
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
    const xl = this.sx(-1.55, z), xr = this.sx(1.55, z);
    if (o.kind === 'low') {
      // Tronc d'arbre en travers du chemin
      const hgt = s * 0.32;
      ctx.fillStyle = '#7a4f2a';
      ctx.fillRect(xl, gy - hgt, xr - xl, hgt);
      ctx.fillStyle = '#9c6b3d';
      ctx.fillRect(xl, gy - hgt, xr - xl, hgt * 0.35);
      ctx.fillStyle = '#d9a86c';
      for (const x of [xl, xr]) { ctx.beginPath(); ctx.ellipse(x, gy - hgt / 2, hgt * 0.3, hgt / 2, 0, 0, Math.PI * 2); ctx.fill(); }
    } else if (o.kind === 'high') {
      // Arche de branches : il faut passer dessous
      const barY = gy - s * 0.95;
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(xl - s * 0.06, barY, s * 0.12, gy - barY);
      ctx.fillRect(xr - s * 0.06, barY, s * 0.12, gy - barY);
      ctx.fillStyle = '#7a5432';
      ctx.fillRect(xl, barY - s * 0.1, xr - xl, s * 0.18);
      ctx.font = `${s * 0.3}px serif`; ctx.textAlign = 'center';
      for (let i = 0; i <= 6; i++) ctx.fillText(i % 2 ? '🍃' : '🌿', xl + (xr - xl) * (i / 6), barY + s * 0.05);
    } else if (o.kind === 'crate') {
      // Gros rocher à casser
      const sh = o.shake && now - o.shake < 200 ? Math.sin(now * 0.2) * s * 0.05 : 0;
      const x = this.sx(0, z) + sh;
      ctx.fillStyle = '#8d8173';
      ctx.beginPath(); ctx.ellipse(x, gy - s * 0.45, s * 0.75, s * 0.48, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a89c8e';
      ctx.beginPath(); ctx.ellipse(x - s * 0.2, gy - s * 0.65, s * 0.3, s * 0.15, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5c5248'; ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath(); ctx.moveTo(x + s * 0.1, gy - s * 0.85); ctx.lineTo(x - s * 0.05, gy - s * 0.5); ctx.lineTo(x + s * 0.15, gy - s * 0.25); ctx.stroke();
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
    const e = this.enc, ctx = this.ctx;
    const z = this.encZ(now), k = this.k(z), s = this.size * 2.1 * k;
    let x = this.sx(0, z), gy = this.sy(z);
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
    if (scale > 0) {
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
