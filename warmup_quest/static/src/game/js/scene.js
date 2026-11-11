// Rendu du monde (canvas) : décor en défilement, héros, obstacles, particules.

function drawHero(ctx, x, y, s, theme, pose, t) {
  const h = theme.hero;
  ctx.save();
  ctx.translate(x, y);
  const ph = t * 0.014;
  const duck = pose === 'duck';
  const squash = duck ? 0.62 : 1;
  const bob = pose === 'run' ? Math.abs(Math.sin(ph)) * s * 0.06 : 0;
  ctx.translate(0, -bob);

  const legLen = s * 0.26 * (duck ? 0.5 : 1);
  const bodyR = s * 0.42;
  const hipY = -legLen;
  const cy = hipY - bodyR * squash * 0.85;

  // --- Queue / écharpe (derrière)
  ctx.lineCap = 'round';
  if (h.type === 'speedy') {
    ctx.strokeStyle = h.accent; ctx.lineWidth = s * 0.09;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.2, cy - bodyR * 0.35 * squash);
    for (let i = 1; i <= 4; i++) {
      ctx.lineTo(-bodyR * 0.2 - i * s * 0.14, cy - bodyR * 0.35 * squash + Math.sin(ph * 1.5 + i) * s * 0.05);
    }
    ctx.stroke();
  } else if (h.type === 'creature') {
    ctx.strokeStyle = h.limb; ctx.lineWidth = s * 0.07;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.8, cy + bodyR * 0.3);
    ctx.quadraticCurveTo(-bodyR * 1.6, cy + bodyR * 0.2 + Math.sin(ph) * s * 0.05, -bodyR * 1.45, cy - bodyR * 0.5);
    ctx.stroke();
    ctx.fillStyle = h.accent;
    ctx.beginPath(); ctx.arc(-bodyR * 1.45, cy - bodyR * 0.55, s * 0.08, 0, Math.PI * 2); ctx.fill();
  }

  // --- Jambes
  let feet;
  switch (pose) {
    case 'run': {
      const a = Math.sin(ph), b = Math.sin(ph + Math.PI);
      feet = [[-s * 0.1 + a * s * 0.18, -Math.max(0, Math.cos(ph)) * s * 0.12],
              [s * 0.1 + b * s * 0.18, -Math.max(0, -Math.cos(ph)) * s * 0.12]];
      break;
    }
    case 'jump': feet = [[-s * 0.16, -s * 0.08], [s * 0.16, -s * 0.08]]; break;
    case 'star': feet = [[-s * 0.34, 0], [s * 0.34, 0]]; break;
    case 'flamingo': feet = [[-s * 0.06, 0], [s * 0.14, -s * 0.2]]; break;
    case 'duck': feet = [[-s * 0.2, 0], [s * 0.2, 0]]; break;
    default: feet = [[-s * 0.14, 0], [s * 0.14, 0]];
  }
  ctx.strokeStyle = h.limb; ctx.lineWidth = s * 0.09;
  for (const [i, f] of feet.entries()) {
    ctx.beginPath();
    ctx.moveTo((i ? 1 : -1) * s * 0.13, hipY);
    ctx.lineTo(f[0], f[1]);
    ctx.stroke();
    ctx.fillStyle = h.accent;
    ctx.beginPath(); ctx.ellipse(f[0] + s * 0.04, f[1], s * 0.1, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  }

  // --- Bras (angle depuis la verticale vers le bas, vers l'extérieur)
  const armA = (sg) => {
    switch (pose) {
      case 'armsUp': return 2.85;
      case 'airplane': return 1.6;
      case 'star': return 2.3;
      case 'jump': return 2.4;
      case 'smash': return sg > 0 ? 2.9 : 0.5;
      case 'duck': return 1.0;
      case 'flamingo': return 1.35;
      case 'bump': return 1.3;
      case 'run': return 0.5 + 0.45 * Math.sin(ph + (sg > 0 ? 0 : Math.PI));
      default: return 0.35;
    }
  };
  const armLen = s * 0.34;
  for (const sg of [-1, 1]) {
    const sx = sg * bodyR * 0.8, sy = cy;
    const a = armA(sg);
    const ex = sx + sg * Math.sin(a) * armLen, ey = sy + Math.cos(a) * armLen;
    ctx.strokeStyle = h.limb; ctx.lineWidth = s * 0.08;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = h.belly;
    ctx.beginPath(); ctx.arc(ex, ey, s * 0.065, 0, Math.PI * 2); ctx.fill();
  }

  // --- Corps
  ctx.fillStyle = h.body;
  ctx.beginPath(); ctx.ellipse(0, cy, bodyR, bodyR * squash, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = h.belly;
  ctx.beginPath(); ctx.ellipse(bodyR * 0.18, cy + bodyR * 0.3 * squash, bodyR * 0.55, bodyR * 0.5 * squash, 0, 0, Math.PI * 2); ctx.fill();

  // --- Accessoires sur la tête
  const top = cy - bodyR * squash;
  if (h.type === 'speedy') {
    // Grandes oreilles dressées (style lièvre)
    for (const [off, tilt] of [[-0.35, -0.25], [0.2, 0.1]]) {
      ctx.save();
      ctx.translate(bodyR * off, top + s * 0.06);
      ctx.rotate(tilt - (pose === 'run' ? 0.25 : 0));
      ctx.fillStyle = h.body;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s * 0.08, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = h.belly;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s * 0.04, s * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else if (h.type === 'bouncy') {
    ctx.fillStyle = h.accent;
    ctx.beginPath(); ctx.ellipse(0, top + s * 0.04, bodyR * 0.62, s * 0.12, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.moveTo(0, top - s * 0.07); ctx.lineTo(0, top - s * 0.15); ctx.stroke();
    const w = Math.cos(t * 0.03) * s * 0.22;
    ctx.strokeStyle = '#4361ee'; ctx.lineWidth = s * 0.05;
    ctx.beginPath(); ctx.moveTo(-w, top - s * 0.16); ctx.lineTo(w, top - s * 0.16); ctx.stroke();
  } else if (h.type === 'creature') {
    ctx.strokeStyle = h.limb; ctx.lineWidth = s * 0.04;
    ctx.beginPath(); ctx.moveTo(0, top + s * 0.02);
    ctx.quadraticCurveTo(s * 0.05, top - s * 0.15, s * 0.14, top - s * 0.2); ctx.stroke();
    ctx.fillStyle = h.accent;
    ctx.beginPath(); ctx.ellipse(s * 0.2, top - s * 0.22, s * 0.11, s * 0.06, -0.5, 0, Math.PI * 2); ctx.fill();
  }

  // --- Visage
  const blink = (Math.floor(t / 150) % 30) === 0;
  const eyeY = cy - bodyR * 0.2 * squash;
  for (const ex of [bodyR * 0.12, bodyR * 0.5]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(ex, eyeY, s * 0.075, blink || duck ? s * 0.02 : s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    if (!blink && !duck) {
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.arc(ex + s * 0.025, eyeY + s * 0.01, s * 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex + s * 0.04, eyeY - s * 0.02, s * 0.015, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,120,150,0.55)';
  ctx.beginPath(); ctx.arc(bodyR * 0.72, eyeY + s * 0.12, s * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = s * 0.025;
  ctx.beginPath();
  if (pose === 'bump') ctx.arc(bodyR * 0.35, eyeY + s * 0.2, s * 0.05, Math.PI * 1.1, Math.PI * 1.9);
  else ctx.arc(bodyR * 0.35, eyeY + s * 0.1, s * 0.07, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.restore();
}

class Scene {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = null;
    this.scroll = 0;
    this.speed = 1;
    this.targetSpeed = 1;
    this.hero = { x: 0.28, tx: 0.28, y: 0, vy: 0, pose: null, poseUntil: 0, holdPose: null, bumpUntil: 0 };
    this.obs = null;
    this.parts = [];
    this.floaters = [];
    this.skyStars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.6, r: Math.random() * 1.6 + 0.4, p: Math.random() * 6 }));
    // Nuages sur deux plans (les plus petits, plus loin, défilent moins vite)
    this.clouds = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random(), y: 0.07 + Math.random() * 0.2, s: i < 3 ? 0.035 : 0.06, sp: i < 3 ? 0.04 : 0.1, a: i < 3 ? 0.75 : 0.95,
    }));
    this.ambient = new Ambient();
    this.sky = null; // dégradé du ciel mis en cache
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

  setWorld(theme) {
    this.theme = theme;
    this.ambient.setKinds(theme && theme.ambient);
    // Couleurs dérivées (shade() vient de creatures.js)
    if (theme) this.pal = {
      bush: shade(theme.mid, -0.2), bushHi: shade(theme.mid, 0.12), hillEdge: shade(theme.mid, 0.22),
      farEdge: shade(theme.far, 0.2), tuft: shade(theme.groundTop, -0.25), grassDark: shade(theme.groundTop, -0.12),
    };
    this.obs = null; this.parts = []; this.floaters = [];
    Object.assign(this.hero, { x: 0.28, tx: 0.28, y: 0, vy: 0, pose: null, holdPose: null });
  }

  get groundY() { return this.H * 0.8; }

  // Dégradé du ciel, recalculé seulement quand le monde ou la taille change
  skyLayer() {
    const th = this.theme, key = `${th.id}|${this.c.width}|${this.c.height}`;
    if (this.sky && this.sky.key === key) return this.sky.canvas;
    const cv = document.createElement('canvas');
    cv.width = this.c.width; cv.height = this.c.height;
    const c = cv.getContext('2d'), k = cv.width / this.W;
    c.scale(k, k);
    const g = c.createLinearGradient(0, 0, 0, this.groundY);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
    this.sky = { key, canvas: cv };
    return cv;
  }

  // Colline : forme remplie + liseré clair qui suit le sommet
  hill(yAt, color, edge) {
    const ctx = this.ctx, W = this.W, gy = this.groundY;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, gy);
    for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, yAt(x));
    ctx.lineTo(W, gy); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= W + 12; x += 12) (x ? ctx.lineTo(x, yAt(x) + 2) : ctx.moveTo(x, yAt(x) + 2));
    ctx.stroke();
  }

  // Mer à l'horizon : vagues, reflets et un petit voilier
  drawSea(now) {
    const ctx = this.ctx, W = this.W, H = this.H, th = this.theme;
    const top = this.groundY - H * 0.17;
    ctx.fillStyle = th.sea; ctx.fillRect(0, top, W, this.groundY - top);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; ctx.fillRect(0, top, W, 3);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'; ctx.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
      const y = top + H * (0.03 + row * 0.04), off = (this.scroll * (0.05 + row * 0.03) + now * 0.01) % 60;
      for (let x = -60; x < W + 60; x += 60) {
        ctx.beginPath(); ctx.arc(x - off + (row % 2) * 30, y, 9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
    }
    const bx = W - ((now * 0.012 + this.scroll * 0.03) % (W + 200)) + 100, by = top + H * 0.035 + Math.sin(now * 0.002) * 2;
    ctx.fillStyle = '#8d5a3b';
    ctx.beginPath(); ctx.moveTo(bx - 22, by); ctx.lineTo(bx + 22, by); ctx.lineTo(bx + 14, by + 9); ctx.lineTo(bx - 14, by + 9); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(bx + 2, by - 2); ctx.lineTo(bx + 2, by - 34); ctx.lineTo(bx + 22, by - 4); ctx.fill();
    ctx.fillStyle = '#e63946';
    ctx.beginPath(); ctx.moveTo(bx - 2, by - 4); ctx.lineTo(bx - 2, by - 26); ctx.lineTo(bx - 16, by - 4); ctx.fill();
  }
  get size() { return Math.min(this.H * 0.2, this.W * 0.16); }
  heroPx() { return { x: this.hero.x * this.W, y: this.groundY + this.hero.y }; }

  action(type) {
    const h = this.hero, now = performance.now();
    if (type === 'jump') { if (h.y >= -1) h.vy = -this.H * 1.7; }
    else if (type === 'squat') { h.pose = 'duck'; h.poseUntil = now + 700; }
    else if (type === 'smash') {
      h.pose = 'smash'; h.poseUntil = now + 450;
      if (this.obs && this.obs.kind === 'crate') this.obs.shake = now;
    }
    else if (type === 'left') h.tx = 0.14;
    else if (type === 'right') h.tx = 0.6;
    else if (type === 'step') {
      const p = this.heroPx();
      this.floaters.push({ x: p.x + this.size * 0.2, y: p.y - this.size * 1.2, text: this.theme.collectible, size: this.size * 0.35, life: 0.8, max: 0.8, vy: -this.H * 0.25 });
    }
  }

  setHoldPose(p) { this.hero.holdPose = p; }
  // Le héros montre la pose à faire (sans l'anneau de réussite)
  setDemoPose(p) { this.hero.demoPose = p; }

  shift(d) {
    const o = this.obs;
    if (o) { o.born += d; o.t0 += d; if (o.shake) o.shake += d; }
    this.hero.poseUntil += d; this.hero.bumpUntil += d;
    this.last = performance.now();
  }

  onStep(s, dur) {
    const now = performance.now();
    this.obs = null;
    this.hero.holdPose = null;
    this.hero.demoPose = null;
    if (s.m !== 'left' && s.m !== 'right') this.hero.tx = 0.28;
    this.targetSpeed = s.m === 'run' ? 2.6 : s.m === 'rest' ? 0.2 : 1;
    const kind = { jump: 'low', squat: 'high', smash: 'crate', left: 'gemL', right: 'gemR' }[s.m];
    if (kind) this.obs = { kind, born: now, dur, state: 'coming', t0: now, shake: 0 };
  }

  obsX(now) {
    const o = this.obs;
    if (o.kind === 'gemL') return 0.14 * this.W;
    if (o.kind === 'gemR') return 0.6 * this.W;
    const p = Math.min(1, (now - o.born) / o.dur);
    const target = this.hero.x * this.W + this.size * 0.75;
    return this.W * 1.05 + (target - this.W * 1.05) * p;
  }

  obsY(kind) {
    if (kind === 'high') return this.groundY - this.size * 1.15;
    if (kind === 'gemL' || kind === 'gemR') return this.groundY - this.size * 0.7;
    return this.groundY;
  }

  resolve(success) {
    const o = this.obs;
    if (!o || o.state !== 'coming') return;
    const now = performance.now();
    o.xc = this.obsX(now);
    o.state = success ? 'cleared' : 'missed';
    o.t0 = now;
    const y = this.obsY(o.kind);
    if (success) {
      if (o.kind === 'crate') {
        this.burst(o.xc, y - this.size * 0.35, 18, ['#c68642', '#8d5a3b', '#f4d35e']);
        this.emojiPop(o.xc, y - this.size * 0.5, 3);
        this.obs = null;
      } else if (o.kind === 'gemL' || o.kind === 'gemR') {
        this.burst(o.xc, y, 16, ['#fff', '#ffd166', '#72efdd']);
        this.emojiPop(o.xc, y, 3);
        this.obs = null;
      } else {
        const p = this.heroPx();
        this.emojiPop(p.x, p.y - this.size * 1.3, 2);
      }
    } else if (o.kind !== 'gemL' && o.kind !== 'gemR') {
      this.hero.bumpUntil = now + 600;
    }
  }

  burst(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random() * 0.7) * this.H * 0.6;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - this.H * 0.3, life: 0.9, max: 0.9, color: colors[i % colors.length], r: 3 + Math.random() * 5 });
    }
  }

  emojiPop(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.floaters.push({ x: x + (i - (n - 1) / 2) * this.size * 0.35, y, text: this.theme.collectible, size: this.size * 0.4, life: 1, max: 1, vy: -this.H * (0.25 + i * 0.03) });
    }
  }

  floatText(text, color = '#fff') {
    const p = this.heroPx();
    this.floaters.push({ x: p.x, y: p.y - this.size * 1.6, text, size: this.size * 0.3, life: 1.1, max: 1.1, vy: -this.H * 0.15, color, bold: true });
  }

  render(now) {
    const ctx = this.ctx, W = this.W, H = this.H, th = this.theme;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!th) { ctx.fillStyle = '#1e1b4b'; ctx.fillRect(0, 0, W, H); return; }

    this.speed += (this.targetSpeed - this.speed) * Math.min(1, dt * 3);
    this.scroll += this.speed * dt * W * 0.35;
    const h = this.hero;
    h.vy += H * 5 * dt; h.y += h.vy * dt;
    if (h.y > 0) { h.y = 0; h.vy = 0; }
    h.x += (h.tx - h.x) * Math.min(1, dt * 6);

    const gy = this.groundY, pal = this.pal;

    // Ciel
    ctx.drawImage(this.skyLayer(), 0, 0, W, H);
    if (th.night) {
      for (const st of this.skyStars) {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now * 0.002 + st.p);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawMoon(ctx, W * 0.8, H * 0.16, H * 0.055);
    } else {
      drawSun(ctx, W * 0.82, H * 0.15, H * 0.06, now);
      for (const c of this.clouds) {
        const span = W + 400;
        const x = ((c.x * span - this.scroll * c.sp - now * 0.004) % span + span) % span - 200;
        drawCloud(ctx, x, H * c.y, H * c.s, c.a);
      }
    }

    // Arrière-plan : montagnes enneigées ou mer
    if (th.backdrop === 'mountains') drawMountains(ctx, W, gy - H * 0.08, this.scroll * 0.06, H, th.mount, th.snow);
    else if (th.backdrop === 'sea') this.drawSea(now);

    // Collines lointaines (avec un liseré clair sur le dessus)
    const farY = (x) => { const wx = x + this.scroll * 0.2; return gy - H * 0.12 - Math.sin(wx * 0.006) * H * 0.06 - Math.sin(wx * 0.013) * H * 0.03; };
    this.hill(farY, th.far, pal.farEdge);
    // Collines proches + buissons ronds
    const midY = (x) => gy - H * 0.04 - Math.max(0, Math.sin((x + this.scroll * 0.45) * 0.009)) * H * 0.07;
    this.hill(midY, th.mid, pal.hillEdge);
    const bsp = 150, boff = this.scroll * 0.45;
    for (let k = Math.floor(boff / bsp) - 1; k * bsp - boff < W + bsp; k++) {
      if (hash01(k) < 0.45) continue;
      const x = k * bsp - boff + bsp * hash01(k + 3), r = H * (0.018 + 0.014 * hash01(k + 5));
      const y = midY(x) + r * 0.5;
      ctx.fillStyle = pal.bush;
      for (const [dx, dy, rr] of [[-0.8, 0.2, 0.75], [0, -0.2, 1], [0.8, 0.2, 0.75]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = pal.bushHi;
      ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.5, r * 0.35, 0, Math.PI * 2); ctx.fill();
    }

    // Petite vie : oiseaux, papillons, pétales
    this.ambient.update(dt, W, H, gy, this.speed * W * 0.12);
    this.ambient.draw(ctx);

    // Sol : terre, cailloux, herbe festonnée, touffes et fleurs
    ctx.fillStyle = th.ground; ctx.fillRect(0, gy, W, H - gy);
    const tile = 90, toff = this.scroll % tile, tbase = Math.floor(this.scroll / tile);
    ctx.fillStyle = th.stripe;
    for (let i = -1; i < W / tile + 2; i++) {
      const k = tbase + i, x0 = i * tile - toff;
      for (let j = 0; j < 3; j++) {
        const px = x0 + tile * hash01(k * 3 + j), py = gy + 26 + (H - gy - 36) * hash01(k * 7 + j);
        ctx.beginPath(); ctx.ellipse(px, py, 7 + 6 * hash01(k + j), 4 + 3 * hash01(k - j), 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = th.groundTop; ctx.fillRect(0, gy, W, 12);
    const sc = 26, soff = this.scroll % sc;
    for (let x = -sc; x < W + sc; x += sc) { ctx.beginPath(); ctx.arc(x - soff + sc / 2, gy + 12, sc / 2, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = pal.grassDark; ctx.fillRect(0, gy + 9, W, 3);
    const fsp = 64, fbase = Math.floor(this.scroll / fsp), foff = this.scroll % fsp;
    for (let i = -1; i < W / fsp + 2; i++) {
      const k = fbase + i, x = i * fsp - foff + fsp * hash01(k + 11), h = hash01(k + 13);
      if (h < 0.5) {
        ctx.strokeStyle = pal.tuft; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (const a of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(x, gy + 2); ctx.lineTo(x + a * 10, gy - 9 - (a ? 0 : 4)); ctx.stroke(); }
      } else if (h < 0.75) {
        ctx.strokeStyle = pal.tuft; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, gy + 2); ctx.lineTo(x, gy - 12); ctx.stroke();
        ctx.fillStyle = ['#ff6b9a', '#ffffff', '#ffd166', '#b388eb'][Math.floor(hash01(k + 17) * 4)];
        for (let p = 0; p < 5; p++) { const a = p * 1.2566; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 4, gy - 12 + Math.sin(a) * 4, 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#ffb703'; ctx.beginPath(); ctx.arc(x, gy - 12, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Décor (émojis) posés sur l'herbe, avec une ombre et un léger balancement
    const gap = Math.max(220, W * 0.22);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const off = (this.scroll * 0.7) % gap;
    for (let i = -1; i < W / gap + 2; i++) {
      const idx = Math.floor((this.scroll * 0.7) / gap) + i;
      const d = th.deco[((idx % th.deco.length) + th.deco.length) % th.deco.length];
      const sz = this.size * (0.6 + ((idx * 37) % 5) * 0.08);
      const x = i * gap - off + gap * 0.5;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath(); ctx.ellipse(x, gy + 6, sz * 0.32, sz * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(x, gy + 8);
      ctx.rotate(Math.sin(now * 0.0015 + idx) * 0.04);
      ctx.font = `${sz}px serif`;
      ctx.fillText(d, 0, 0);
      ctx.restore();
    }

    // Lignes de vitesse
    if (this.speed > 1.5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const y = H * 0.2 + ((i * 97) % (H * 0.55));
        const x = W - ((now * 1.6 + i * 230) % (W + 300));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120, y); ctx.stroke();
      }
    }

    this.drawObstacle(now);

    // Héros
    let pose;
    if (now < h.bumpUntil) pose = 'bump';
    else if (h.y < -2) pose = 'jump';
    else if (h.pose && now < h.poseUntil) pose = h.pose;
    else if (h.holdPose) pose = h.holdPose;
    else if (h.demoPose) pose = h.demoPose;
    else pose = this.speed < 0.5 ? 'idle' : 'run';
    const hp = this.heroPx();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(hp.x, this.groundY + 4, this.size * 0.35 * (1 + h.y / H), this.size * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    drawHero(ctx, hp.x, hp.y, this.size, th, pose, now);
    if (h.holdPose) {
      ctx.strokeStyle = `rgba(255,255,180,${0.5 + 0.4 * Math.sin(now * 0.01)})`; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(hp.x, hp.y - this.size * 0.6, this.size * 0.85, 0, Math.PI * 2); ctx.stroke();
    }

    // Particules
    for (const p of this.parts) {
      p.vy += H * 1.5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.y += f.vy * dt; f.life -= dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / f.max * 1.5));
      ctx.font = `${f.bold ? '800 ' : ''}${f.size}px "Baloo 2", system-ui, sans-serif`;
      if (f.color) {
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
      }
      ctx.fillText(f.text, f.x, f.y);
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    ctx.globalAlpha = 1;
  }

  drawObstacle(now) {
    const o = this.obs;
    if (!o) return;
    const ctx = this.ctx, s = this.size, th = this.theme;
    let x = o.state === 'coming' ? this.obsX(now) : o.xc;
    let alpha = 1;
    const since = now - o.t0;
    if (o.state === 'cleared') { x -= since * this.W * 0.0015; alpha = 1 - since / 600; }
    if (o.state === 'missed') alpha = 1 - since / 700;
    if (alpha <= 0) { this.obs = null; return; }
    const y = this.obsY(o.kind);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (o.kind === 'low') {
      ctx.fillStyle = th.obstacle;
      for (const [dx, dy, r] of [[-0.18, -0.16, 0.2], [0.12, -0.2, 0.25], [0.32, -0.12, 0.15]]) {
        ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(x + 0.05 * s, y - 0.3 * s, 0.07 * s, 0, Math.PI * 2); ctx.fill();
    } else if (o.kind === 'high') {
      const wy = y + Math.sin(now * 0.008) * s * 0.06;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const flap = Math.sin(now * 0.04) * 0.6;
      for (const sg of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(x + sg * s * 0.05, wy - s * 0.2, s * 0.12, s * 0.26, sg * (0.6 + flap), 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = th.flyer;
      ctx.beginPath(); ctx.arc(x, wy, s * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x - s * 0.1, wy - s * 0.05, s * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.arc(x - s * 0.12, wy - s * 0.05, s * 0.04, 0, Math.PI * 2); ctx.fill();
    } else if (o.kind === 'crate') {
      const sh = o.shake && now - o.shake < 200 ? Math.sin(now * 0.2) * s * 0.05 : 0;
      const bs = s * 0.7;
      ctx.translate(x + sh, y);
      ctx.fillStyle = '#c68642'; ctx.fillRect(-bs / 2, -bs, bs, bs);
      ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = s * 0.06;
      ctx.strokeRect(-bs / 2, -bs, bs, bs);
      ctx.beginPath(); ctx.moveTo(-bs / 2, -bs); ctx.lineTo(bs / 2, 0); ctx.moveTo(bs / 2, -bs); ctx.lineTo(-bs / 2, 0); ctx.stroke();
    } else {
      const by = y + Math.sin(now * 0.006) * s * 0.08;
      ctx.fillStyle = 'rgba(255,255,200,0.35)';
      ctx.beginPath(); ctx.arc(x, by, s * (0.45 + 0.05 * Math.sin(now * 0.01)), 0, Math.PI * 2); ctx.fill();
      ctx.font = `${s * 0.55}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(th.collectible, x, by);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
  }
}
