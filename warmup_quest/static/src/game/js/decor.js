// Éléments de décor partagés par les deux scènes : soleil, lune, nuages, montagnes,
// et petite « vie » ambiante (oiseaux, papillons, lucioles, pétales).
// Tout est dessiné au canvas, sans image, et reste léger pour les PC modestes.

// Nombre pseudo-aléatoire stable (même décor à chaque passage)
function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Soleil souriant avec des rayons qui tournent doucement
function drawSun(ctx, x, y, r, t, color = '#ffd84d') {
  const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3);
  glow.addColorStop(0, 'rgba(255, 244, 180, 0.55)');
  glow.addColorStop(1, 'rgba(255, 244, 180, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.0002);
  ctx.fillStyle = 'rgba(255, 221, 87, 0.75)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(r * 1.15, -r * 0.16);
    ctx.lineTo(r * (1.6 + 0.12 * Math.sin(t * 0.004 + i)), 0);
    ctx.lineTo(r * 1.15, r * 0.16);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  // Visage : yeux qui clignent de temps en temps, joues, sourire
  const blink = (t % 4200) < 140;
  ctx.fillStyle = '#7a4a00';
  for (const s of [-1, 1]) {
    if (blink) ctx.fillRect(x + s * r * 0.33 - r * 0.1, y - r * 0.15, r * 0.2, r * 0.05);
    else { ctx.beginPath(); ctx.arc(x + s * r * 0.33, y - r * 0.13, r * 0.09, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(255, 120, 90, 0.45)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * r * 0.55, y + r * 0.15, r * 0.14, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = Math.max(2, r * 0.07); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.38, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
}

// Lune avec cratères et halo
function drawMoon(ctx, x, y, r, color = '#fff6d5') {
  const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.6);
  glow.addColorStop(0, 'rgba(255, 246, 213, 0.35)');
  glow.addColorStop(1, 'rgba(255, 246, 213, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(180, 170, 140, 0.35)';
  for (const [dx, dy, rr] of [[-0.3, -0.2, 0.18], [0.25, 0.25, 0.14], [0.15, -0.35, 0.09]]) {
    ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2); ctx.fill();
  }
}

// Nuage moelleux : boules blanches + dessous légèrement ombré
function drawCloud(ctx, x, y, s, alpha = 1) {
  ctx.globalAlpha = alpha;
  const puffs = [[-0.9, 0.1, 0.45], [-0.35, -0.2, 0.6], [0.3, -0.25, 0.55], [0.85, 0.05, 0.42], [0, 0.15, 0.5]];
  ctx.fillStyle = 'rgba(200, 220, 240, 0.9)';
  for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s + s * 0.1, r * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#ffffff';
  for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}

// Chaîne de montagnes (pics « en triangle » arrondis) avec neige au sommet
function drawMountains(ctx, W, baseY, scroll, H, color, snow) {
  const bw = H * 0.42;
  const first = Math.floor(scroll / bw) - 1;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, baseY);
  const peaks = [];
  for (let i = first; i <= first + W / bw + 3; i++) {
    const x = i * bw - scroll;
    const h = H * (0.16 + 0.12 * hash01(i));
    const px = x + bw * (0.3 + 0.4 * hash01(i + 7));
    ctx.lineTo(x, baseY - H * 0.04);
    ctx.lineTo(px, baseY - h);
    peaks.push([px, baseY - h, h]);
  }
  ctx.lineTo(W, baseY); ctx.closePath(); ctx.fill();
  if (!snow) return;
  ctx.fillStyle = snow;
  for (const [px, py, h] of peaks) {
    const d = h * 0.22;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + d * 0.9, py + d);
    ctx.lineTo(px + d * 0.3, py + d * 0.8);
    ctx.lineTo(px, py + d * 1.05);
    ctx.lineTo(px - d * 0.35, py + d * 0.8);
    ctx.lineTo(px - d * 0.9, py + d);
    ctx.closePath(); ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Vie ambiante
// kinds : 'birds', 'butterflies', 'fireflies', 'petals', 'gulls'
// ---------------------------------------------------------------------------
const BUTTERFLY_COLORS = ['#ff6b9a', '#ffd166', '#7bdff2', '#b388eb', '#ff9f1c'];
const PETAL_COLORS = ['#ffc8dd', '#ffafcc', '#ffffff', '#fde68a'];

class Ambient {
  constructor() { this.items = []; this.kinds = []; }

  setKinds(kinds) {
    const k = (kinds || []).join(',');
    if (k === this.kinds.join(',')) return;
    this.kinds = kinds || [];
    this.items = [];
  }

  spawn(kind, W, H, groundY, anywhere) {
    const r = Math.random;
    const x = anywhere ? r() * W : W + 40;
    switch (kind) {
      case 'birds': case 'gulls':
        return { kind, x, y: H * (0.08 + r() * 0.22), vx: -(40 + r() * 50), s: 6 + r() * 6, p: r() * 6 };
      case 'butterflies':
        return { kind, x, y: groundY - H * (0.05 + r() * 0.18), vx: -(15 + r() * 25), s: 7 + r() * 4, p: r() * 6,
          c: BUTTERFLY_COLORS[Math.floor(r() * BUTTERFLY_COLORS.length)] };
      case 'fireflies':
        return { kind, x: r() * W, y: groundY - r() * H * 0.45, vx: (r() - 0.5) * 20, s: 2 + r() * 2, p: r() * 6 };
      case 'petals':
        return { kind, x: anywhere ? r() * W : r() * W * 1.3, y: anywhere ? r() * groundY : -10, vx: -(20 + r() * 30),
          vy: 25 + r() * 25, s: 4 + r() * 3, p: r() * 6, c: PETAL_COLORS[Math.floor(r() * PETAL_COLORS.length)] };
    }
    return null;
  }

  // drift : vitesse de défilement du décor (les objets reculent quand on court)
  update(dt, W, H, groundY, drift = 0) {
    const want = { birds: 3, gulls: 3, butterflies: 4, fireflies: 22, petals: 10 };
    for (const kind of this.kinds) {
      const n = this.items.filter((it) => it.kind === kind).length;
      if (n < want[kind]) {
        const it = this.spawn(kind, W, H, groundY, !this.items.length);
        if (it) this.items.push(it);
      }
    }
    for (const it of this.items) {
      it.p += dt;
      it.x += (it.vx - drift * (it.kind === 'fireflies' ? 0.2 : 0.5)) * dt;
      if (it.vy) it.y += it.vy * dt;
      if (it.kind === 'fireflies') { it.y += Math.sin(it.p * 1.3) * 8 * dt; if (it.x < -10) it.x = W + 10; if (it.x > W + 10) it.x = -10; }
    }
    this.items = this.items.filter((it) => it.x > -60 && it.y < groundY + 20);
  }

  draw(ctx) {
    for (const it of this.items) {
      switch (it.kind) {
        case 'birds': case 'gulls': {
          const flap = Math.sin(it.p * 9) * it.s * 0.6;
          ctx.strokeStyle = it.kind === 'gulls' ? '#ffffff' : '#2b2d42';
          ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(it.x - it.s, it.y - flap);
          ctx.quadraticCurveTo(it.x - it.s * 0.4, it.y - it.s * 0.2, it.x, it.y);
          ctx.quadraticCurveTo(it.x + it.s * 0.4, it.y - it.s * 0.2, it.x + it.s, it.y - flap);
          ctx.stroke();
          break;
        }
        case 'butterflies': {
          const y = it.y + Math.sin(it.p * 2.2) * 14;
          const w = Math.abs(Math.sin(it.p * 14)) * 0.8 + 0.2;
          ctx.fillStyle = it.c;
          for (const sgn of [-1, 1]) {
            ctx.beginPath(); ctx.ellipse(it.x + sgn * it.s * 0.55 * w, y - it.s * 0.2, it.s * 0.6 * w, it.s * 0.75, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(it.x + sgn * it.s * 0.45 * w, y + it.s * 0.45, it.s * 0.4 * w, it.s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#2b2d42';
          ctx.fillRect(it.x - 1.2, y - it.s * 0.7, 2.4, it.s * 1.5);
          break;
        }
        case 'fireflies': {
          const a = 0.35 + 0.65 * Math.max(0, Math.sin(it.p * 2.5));
          ctx.globalAlpha = a * 0.35;
          ctx.fillStyle = '#fff59d';
          ctx.beginPath(); ctx.arc(it.x, it.y, it.s * 4, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = a;
          ctx.beginPath(); ctx.arc(it.x, it.y, it.s, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'petals': {
          ctx.save();
          ctx.translate(it.x + Math.sin(it.p * 2) * 12, it.y);
          ctx.rotate(it.p * 2);
          ctx.fillStyle = it.c;
          ctx.beginPath(); ctx.ellipse(0, 0, it.s, it.s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
      }
    }
  }
}
