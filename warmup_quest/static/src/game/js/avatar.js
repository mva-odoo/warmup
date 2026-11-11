// « Miroir » : chaque joueur est dessiné comme un personnage du jeu qui imite ses mouvements,
// à la place de l'image de la webcam. La vidéo reste disponible (touche C) pour se placer.

const AVATAR_PALETTES = [
  { body: '#ff6b35', belly: '#ffe1d3', limb: '#c2410c', accent: '#ffd166' },
  { body: '#4ea8ff', belly: '#dceeff', limb: '#1d6fc4', accent: '#ffd166' },
];

// Silhouette « fantôme » de la pose à faire, en longueurs de torse depuis le milieu des épaules.
// x positif = côté gauche du joueur (à droite de l'écran une fois en miroir, donc dessiné vers la gauche).
const TARGET_BONES = [
  ['sL', 'sR'], ['sL', 'eL'], ['eL', 'wL'], ['sR', 'eR'], ['eR', 'wR'],
  ['sL', 'hL'], ['sR', 'hR'], ['hL', 'hR'], ['hL', 'kL'], ['kL', 'aL'], ['hR', 'kR'], ['kR', 'aR'],
];
const TARGET_BODY = { sL: [0.35, 0], sR: [-0.35, 0], hL: [0.25, 1], hR: [-0.25, 1] };
const TARGET_POSES = {
  armsUp: { ...TARGET_BODY, eL: [0.5, -0.5], wL: [0.45, -1.05], eR: [-0.5, -0.5], wR: [-0.45, -1.05],
    kL: [0.25, 1.9], aL: [0.25, 2.8], kR: [-0.25, 1.9], aR: [-0.25, 2.8] },
  airplane: { ...TARGET_BODY, eL: [0.9, 0], wL: [1.45, 0], eR: [-0.9, 0], wR: [-1.45, 0],
    kL: [0.25, 1.9], aL: [0.25, 2.8], kR: [-0.25, 1.9], aR: [-0.25, 2.8] },
  star: { ...TARGET_BODY, eL: [0.75, -0.4], wL: [1.1, -0.85], eR: [-0.75, -0.4], wR: [-1.1, -0.85],
    kL: [0.55, 1.85], aL: [0.8, 2.7], kR: [-0.55, 1.85], aR: [-0.8, 2.7] },
  flamingo: { ...TARGET_BODY, eL: [0.7, 0.25], wL: [1.05, 0.45], eR: [-0.7, 0.25], wR: [-1.05, 0.45],
    kL: [0.25, 1.9], aL: [0.25, 2.8], kR: [-0.4, 1.45], aR: [-0.2, 1.95] },
};

class Mirror {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 0; this.H = 0;
    this.view = null;        // cadrage lissé { S, cx, refY }
    this.showVideo = false;
    this.flash = [];          // petits « pop » quand un mouvement est reconnu
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    const d = Math.min(devicePixelRatio || 1, 1.5);
    this.W = r.width; this.H = r.height;
    this.c.width = Math.round(r.width * d); this.c.height = Math.round(r.height * d);
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  pop(idx) { this.flash[idx] = performance.now(); }

  // Cadrage : on zoome pour que les joueurs remplissent le cadre, centré sur leur position de départ.
  frame(bodies) {
    const W = this.W, H = this.H;
    if (this.showVideo) {
      // Même cadrage que la vidéo (object-fit: cover, hauteur pleine)
      return { S: H, cx: 0.5, refY: null };
    }
    const seen = bodies.filter((b) => b.lm && b.T && b.center);
    if (!seen.length) return this.view;
    const avg = (f) => seen.reduce((a, b) => a + f(b), 0) / seen.length;
    const T = avg((b) => b.T);
    const n = Math.max(1, bodies.length);
    // Hauteur d'un corps ≈ 3,4 torses ; en duo on dézoome pour que les deux tiennent en largeur
    let S = (H * 0.8) / (3.4 * T);
    const spanX = n > 1 ? Math.abs(seen[0].center.x - (seen[1] || seen[0]).center.x) + 2.4 * T : 0;
    if (n > 1 && spanX > 0) S = Math.min(S, (W * 0.9) / (spanX * 4 / 3));
    const cx = avg((b) => (b.calib ? b.calib.cx : b.center.x));
    const refY = avg((b) => (b.base ?? b.center.y) + 2.75 * b.T); // niveau des pieds « debout »
    const v = this.view;
    if (!v || !v.refY) { this.view = { S, cx, refY }; return this.view; }
    const k = 0.08;
    v.S += (S - v.S) * k; v.cx += (cx - v.cx) * k; v.refY += (refY - v.refY) * k;
    return v;
  }

  render(tracker, opts) {
    const ctx = this.ctx, W = this.W, H = this.H;
    ctx.clearRect(0, 0, W, H);
    if (!W || !H) return;
    const bodies = tracker.bodies;
    if (tracker.sim) return this.drawSim(bodies, opts);
    const v = this.frame(bodies);
    if (!v) return;
    // Coordonnées caméra (0..1) -> écran, avec effet miroir
    const toX = (x) => W / 2 - (x - v.cx) * v.S * (4 / 3);
    const toY = v.refY == null ? (y) => y * H : (y) => H * 0.94 + (y - v.refY) * v.S;
    const map = (p) => [toX(p.x), toY(p.y)];

    for (const b of bodies) {
      if (!b.lm) continue;
      const pal = (opts.palettes && opts.palettes[b.idx]) || AVATAR_PALETTES[b.idx] || AVATAR_PALETTES[0];
      const unit = (b.T || 0.2) * v.S;
      const shoulder = map(mid(b.lm[11], b.lm[12]));
      if (opts.target) this.drawTarget(shoulder, unit, opts.target, b.state[opts.target]);
      this.drawShadow(b, map, unit);
      ctx.globalAlpha = b.state.upperBody ? 1 : 0.55;
      this.drawAvatar(b, map, unit, pal, performance.now());
      ctx.globalAlpha = 1;
      if (opts.names && opts.names[b.idx]) this.drawName(b, map, unit, opts.names[b.idx], pal);
    }
  }

  // Ombre au sol, pour « poser » le personnage
  drawShadow(b, map, unit) {
    const ctx = this.ctx;
    const [x] = map(mid(b.lm[23], b.lm[24]));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath(); ctx.ellipse(x, this.H * 0.95, unit * 0.9, unit * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  }

  drawAvatar(b, map, unit, pal, now) {
    const ctx = this.ctx, lm = b.lm;
    const vis = (i) => (lm[i].visibility ?? 1) > 0.5;
    const P = (i) => map(lm[i]);
    const OUT = 'rgba(30, 27, 75, 0.9)';
    const limbW = unit * 0.24;
    const pop = this.flash[b.idx] && now - this.flash[b.idx] < 250 ? 1 + 0.12 * (1 - (now - this.flash[b.idx]) / 250) : 1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const limb = (ids, color) => {
      if (!ids.every(vis)) return;
      const pts = ids.map(P);
      for (const [w, c] of [[limbW + 7, OUT], [limbW, color]]) {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(...pts[0]);
        for (const p of pts.slice(1)) ctx.lineTo(...p);
        ctx.stroke();
      }
    };
    const blob = (i, r, color) => {
      if (!vis(i)) return;
      const [x, y] = P(i);
      ctx.fillStyle = color; ctx.strokeStyle = OUT; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    };

    // Jambes, puis pieds
    limb([23, 25, 27], pal.limb);
    limb([24, 26, 28], pal.limb);
    for (const i of [27, 28]) {
      if (!vis(i)) continue;
      const [x, y] = P(i);
      ctx.fillStyle = pal.limb; ctx.strokeStyle = OUT; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.ellipse(x, y + limbW * 0.3, limbW * 0.95, limbW * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Corps : forme arrondie épaules → hanches, avec un ventre clair
    const sL = P(11), sR = P(12);
    const hipsOK = vis(23) && vis(24);
    const hL = hipsOK ? P(23) : [sL[0], sL[1] + unit];
    const hR = hipsOK ? P(24) : [sR[0], sR[1] + unit];
    const pad = unit * 0.12;
    ctx.fillStyle = pal.body; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sL[0], sL[1] - pad);
    ctx.quadraticCurveTo((sL[0] + sR[0]) / 2, sL[1] - pad * 2.2, sR[0], sR[1] - pad);
    ctx.quadraticCurveTo(sR[0] + (sR[0] - sL[0]) * 0.18, (sR[1] + hR[1]) / 2, hR[0], hR[1] + pad);
    ctx.quadraticCurveTo((hL[0] + hR[0]) / 2, (hL[1] + hR[1]) / 2 + pad * 2.5, hL[0], hL[1] + pad);
    ctx.quadraticCurveTo(sL[0] + (sL[0] - sR[0]) * 0.18, (sL[1] + hL[1]) / 2, sL[0], sL[1] - pad);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    const cx = (sL[0] + sR[0] + hL[0] + hR[0]) / 4, cy = (sL[1] + sR[1] + hL[1] * 2 + hR[1] * 2) / 6;
    ctx.fillStyle = pal.belly;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.abs(sL[0] - sR[0]) * 0.3 + 2, unit * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bras et mains
    limb([11, 13, 15], pal.limb);
    limb([12, 14, 16], pal.limb);
    blob(15, limbW * 0.8 * pop, pal.accent);
    blob(16, limbW * 0.8 * pop, pal.accent);

    // Tête (entre les oreilles), regard dans la direction du nez
    if (!vis(0)) return;
    const nose = P(0);
    const earsOK = vis(7) && vis(8);
    const ec = earsOK ? [(P(7)[0] + P(8)[0]) / 2, (P(7)[1] + P(8)[1]) / 2] : nose;
    const r = unit * 0.38 * pop;
    const hx = ec[0], hy = ec[1] - r * 0.15;
    // Écharpe
    ctx.strokeStyle = pal.accent; ctx.lineWidth = unit * 0.13;
    ctx.beginPath(); ctx.moveTo(sL[0] - pad, sL[1] - pad); ctx.lineTo(sR[0] + pad, sR[1] - pad); ctx.stroke();
    // Petites oreilles
    ctx.fillStyle = pal.body; ctx.strokeStyle = OUT; ctx.lineWidth = 3.5;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + sgn * r * 0.35, hy - r * 0.85);
      ctx.lineTo(hx + sgn * r * 0.75, hy - r * 1.35);
      ctx.lineTo(hx + sgn * r * 0.85, hy - r * 0.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Yeux
    const lookX = Math.max(-1, Math.min(1, (nose[0] - ec[0]) / (r * 0.6)));
    for (const sgn of [-1, 1]) {
      const ex = hx + sgn * r * 0.36, ey = hy - r * 0.1;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.22, r * 0.27, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath(); ctx.arc(ex + lookX * r * 0.09, ey + r * 0.04, r * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    // Sourire (plus grand quand la pose est réussie)
    const happy = POSE_NAMES.some((p) => b.state[p]);
    ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy + r * 0.25, r * (happy ? 0.32 : 0.2), 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }

  drawName(b, map, unit, name, pal) {
    if ((b.lm[0].visibility ?? 1) < 0.5) return;
    const ctx = this.ctx;
    const [x, y] = map(b.lm[0]);
    const ty = y - unit * 1.05;
    ctx.font = '800 16px "Baloo 2", sans-serif';
    const w = ctx.measureText(name).width + 18;
    ctx.fillStyle = pal.body; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x - w / 2, ty - 13, w, 26, 13); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, x, ty + 1);
  }

  drawTarget(shoulder, unit, pose, ok) {
    const G = TARGET_POSES[pose];
    if (!G) return;
    const ctx = this.ctx;
    // Miroir : x positif (gauche du joueur) => vers la gauche de l'écran
    const P = (k) => [shoulder[0] - G[k][0] * unit, shoulder[1] + G[k][1] * unit];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = ok ? 'rgba(74, 222, 128, 0.7)' : 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = unit * 0.34;
    ctx.setLineDash([1, unit * 0.45]);
    for (const [a, bb] of TARGET_BONES) {
      const [x1, y1] = P(a), [x2, y2] = P(bb);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = ok ? 'rgba(74, 222, 128, 0.9)' : 'rgba(255, 224, 102, 0.95)';
    for (const k of ['wL', 'wR', 'aL', 'aR']) {
      const [x, y] = P(k);
      ctx.beginPath(); ctx.arc(x, y, unit * 0.16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Mode clavier : un personnage immobile par joueur, pour visualiser le cadre
  drawSim(bodies, opts) {
    const ctx = this.ctx, W = this.W, H = this.H;
    const n = bodies.length;
    bodies.forEach((b, i) => {
      const pal = (opts.palettes && opts.palettes[i]) || AVATAR_PALETTES[i];
      const x = W * (i + 1) / (n + 1);
      const unit = H * 0.22;
      ctx.fillStyle = pal.body; ctx.strokeStyle = 'rgba(30,27,75,.9)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, H * 0.4, unit * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(x - unit * 0.35, H * 0.5, unit * 0.7, unit, unit * 0.3); ctx.fill(); ctx.stroke();
      if (opts.names && opts.names[i]) {
        ctx.font = '800 16px "Baloo 2", sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText(opts.names[i], x, H * 0.24);
      }
    });
  }
}
