// Pictogramme animé de la consigne : un petit bonhomme qui MONTRE le mouvement à faire,
// avec l'obstacle correspondant (tronc, branche, rocher, étoile…). Compréhensible sans savoir lire.

// Bonhomme bâton. p : { x, y (sol), s (taille), lift, crouch 0..1, armL, armR (angle depuis le bas, vers l'extérieur),
// legL, legR (écart des jambes), kneeUp ('L' | 'R' | null) }
function stickFigure(ctx, p, color = '#1e1b4b', widthMul = 1) {
  const { x, s } = p;
  const crouch = p.crouch || 0;
  const leg = s * 0.34 * (1 - crouch * 0.45);
  const hipY = p.y - (p.lift || 0) - leg;
  const neckY = hipY - s * 0.32;
  const headR = s * 0.11;
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, s * 0.07) * widthMul; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Jambes (genoux pliés quand on s'accroupit)
  for (const [sg, spread, side] of [[-1, p.legL || 0.15, 'L'], [1, p.legR || 0.15, 'R']]) {
    const footX = x + sg * s * spread, footY = p.y - (p.lift || 0);
    ctx.beginPath(); ctx.moveTo(x + sg * s * 0.05, hipY);
    if (p.kneeUp === side) {
      ctx.lineTo(x + sg * s * 0.14, hipY + s * 0.04); ctx.lineTo(x + sg * s * 0.1, hipY + s * 0.2);
    } else {
      ctx.lineTo(x + sg * s * (spread * 0.5 + crouch * 0.12), hipY + leg * 0.5);
      ctx.lineTo(footX, footY);
    }
    ctx.stroke();
  }
  // Corps et tête
  ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x, neckY); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, neckY - headR * 1.15, headR * (widthMul > 1 ? 1.4 : 1), 0, Math.PI * 2); ctx.fill();
  // Bras
  for (const [sg, a] of [[-1, p.armL ?? 0.3], [1, p.armR ?? 0.3]]) {
    const len = s * 0.3;
    ctx.beginPath(); ctx.moveTo(x, neckY + s * 0.03);
    ctx.lineTo(x + sg * Math.sin(a) * len, neckY + s * 0.03 + Math.cos(a) * len);
    ctx.stroke();
  }
}

function arrow(ctx, x, y, dir, s, color = '#ff6b35') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + dir * s * 0.16, y);
  ctx.lineTo(x - dir * s * 0.02, y - s * 0.13);
  ctx.lineTo(x - dir * s * 0.02, y - s * 0.05);
  ctx.lineTo(x - dir * s * 0.16, y - s * 0.05);
  ctx.lineTo(x - dir * s * 0.16, y + s * 0.05);
  ctx.lineTo(x - dir * s * 0.02, y + s * 0.05);
  ctx.lineTo(x - dir * s * 0.02, y + s * 0.13);
  ctx.closePath(); ctx.fill();
}

const POSE_FIGURES = {
  armsUp: { armL: 2.9, armR: 2.9 },
  airplane: { armL: 1.57, armR: 1.57 },
  star: { armL: 2.4, armR: 2.4, legL: 0.3, legR: 0.3 },
  flamingo: { armL: 1.3, armR: 1.3, kneeUp: 'R' },
};

// Dessine le pictogramme de l'étape s (move = mouvement en cours pour un combo)
function drawPicto(ctx, W, H, s, t, move = null) {
  ctx.clearRect(0, 0, W, H);
  const m = move || s.m;
  const S = H * 0.95, gx = W / 2, gy = H * 0.92;
  const base = { x: gx, y: gy, s: S };
  // Sol
  ctx.strokeStyle = 'rgba(30, 27, 75, 0.2)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W * 0.08, gy + 2); ctx.lineTo(W * 0.92, gy + 2); ctx.stroke();
  const cyc = (ms) => (t % ms) / ms;

  switch (m) {
    case 'jump': {
      const k = Math.sin(cyc(1100) * Math.PI);
      ctx.fillStyle = '#9c6b3d';
      ctx.fillRect(gx - S * 0.32, gy - S * 0.07, S * 0.64, S * 0.07); // tronc
      stickFigure(ctx, { ...base, lift: k * S * 0.28, armL: 0.6 + k * 2.2, armR: 0.6 + k * 2.2, crouch: k < 0.15 ? 0.35 : 0 });
      break;
    }
    case 'squat': {
      const k = Math.min(1, Math.sin(cyc(1400) * Math.PI) * 1.4);
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(gx - S * 0.4, gy - S * 0.78, S * 0.8, S * 0.07); // branche
      ctx.fillStyle = '#5cb85c';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(gx - S * 0.36 + i * S * 0.18, gy - S * 0.72, S * 0.05, 0, Math.PI * 2); ctx.fill(); }
      stickFigure(ctx, { ...base, crouch: k, armL: 0.9 - k * 0.4, armR: 0.9 - k * 0.4, legL: 0.15 + k * 0.08, legR: 0.15 + k * 0.08 });
      break;
    }
    case 'smash': {
      const k = cyc(1000);
      const a = k < 0.55 ? 2.9 : 2.9 - (k - 0.55) / 0.45 * 2.5; // bras en haut… puis on tape !
      ctx.fillStyle = '#8d8173';
      ctx.beginPath(); ctx.ellipse(gx + S * 0.32, gy - S * 0.1, S * 0.13, S * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      stickFigure(ctx, { ...base, x: gx - S * 0.05, armL: a, armR: a });
      if (k > 0.85) { ctx.fillStyle = '#ffd166'; ctx.font = `${S * 0.2}px serif`; ctx.textAlign = 'center'; ctx.fillText('💥', gx + S * 0.32, gy - S * 0.2); }
      break;
    }
    case 'left': case 'right': {
      const dir = m === 'left' ? -1 : 1, k = Math.min(1, cyc(1400) * 1.6);
      ctx.font = `${S * 0.2}px serif`; ctx.textAlign = 'center';
      ctx.fillText('⭐', gx + dir * S * 0.42, gy - S * 0.35);
      arrow(ctx, gx + dir * S * 0.05, gy - S * 0.85, dir, S);
      stickFigure(ctx, { ...base, x: gx - dir * S * 0.2 + dir * k * S * 0.4, armL: 0.5, armR: 0.5 });
      break;
    }
    case 'run': { // évitements : un pas de côté pour éviter le rocher
      const k = Math.sin(cyc(1600) * Math.PI * 2);
      ctx.fillStyle = '#8d8173';
      ctx.beginPath(); ctx.ellipse(gx, gy - S * 0.06, S * 0.1, S * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      arrow(ctx, gx - S * 0.36, gy - S * 0.85, -1, S * 0.8);
      arrow(ctx, gx + S * 0.36, gy - S * 0.85, 1, S * 0.8);
      stickFigure(ctx, { ...base, x: gx + k * S * 0.3, armL: 0.6, armR: 0.6 });
      break;
    }
    case 'catch': { // l'étoile arrive : on se met dessous
      const k = cyc(1800), lane = [-1, 1, 0][Math.floor(t / 1800) % 3];
      ctx.font = `${S * 0.2}px serif`; ctx.textAlign = 'center';
      ctx.fillText('⭐', gx + lane * S * 0.32, gy - S * (0.9 - k * 0.45));
      stickFigure(ctx, { ...base, x: gx + lane * S * 0.32 * Math.min(1, k * 2), armL: 2.6, armR: 2.6 });
      break;
    }
    case 'rope': { // la corde passe sous les pieds : on saute
      const k = cyc(1200), phi = k * Math.PI * 2;
      const jump = Math.max(0, Math.cos(phi)) ** 2;
      stickFigure(ctx, { ...base, lift: jump * S * 0.18, armL: 1.0, armR: 1.0 });
      const cy = gy - S * 0.45 + Math.cos(phi) * S * 0.5;
      ctx.strokeStyle = '#e63946'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(gx - S * 0.35, gy - S * 0.45); ctx.quadraticCurveTo(gx, 2 * cy - (gy - S * 0.45), gx + S * 0.35, gy - S * 0.45); ctx.stroke();
      break;
    }
    case 'tunnel': { // accroupi sous les arceaux
      ctx.strokeStyle = '#ff595e'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(gx, gy, S * 0.42, S * 0.6, 0, Math.PI, 0); ctx.stroke();
      stickFigure(ctx, { ...base, crouch: 1, armL: 0.6, armR: 0.6, legL: 0.23, legR: 0.23 });
      break;
    }
    case 'moles': { // une taupe sort, la main la tape
      const k = cyc(1000), side = Math.floor(t / 1000) % 2 ? 1 : -1, up = Math.min(1, k * 3);
      const mx = gx + side * S * 0.36, my = gy - S * 0.1;
      ctx.fillStyle = '#5c3d2e'; ctx.beginPath(); ctx.ellipse(mx, my + S * 0.08, S * 0.12, S * 0.035, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9c6644'; ctx.beginPath(); ctx.arc(mx, my + S * 0.08 - up * S * 0.12, S * 0.08, Math.PI, 0); ctx.fill();
      stickFigure(ctx, { ...base, x: gx - side * S * 0.05, armL: side < 0 ? (k > 0.5 ? 0.9 : 2.2) : 0.4, armR: side > 0 ? (k > 0.5 ? 0.9 : 2.2) : 0.4 });
      break;
    }
    case 'pose': {
      const f = POSE_FIGURES[s.pose] || POSE_FIGURES.armsUp;
      stickFigure(ctx, { ...base, lift: Math.sin(t * 0.004) * S * 0.01, ...f }, '#16a34a');
      break;
    }
    case 'bubbles': {
      const k = cyc(1200), left = k < 0.5;
      for (const [bx, by, r] of [[-0.36, -0.75, 0.09], [0.36, -0.7, 0.08], [-0.3, -0.35, 0.07], [0.33, -0.3, 0.07]]) {
        ctx.strokeStyle = '#7bdff2'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(173, 232, 255, 0.4)';
        ctx.beginPath(); ctx.arc(gx + bx * S, gy + by * S, r * S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      stickFigure(ctx, { ...base, armL: left ? 2.4 : 0.5, armR: left ? 0.5 : 2.4 });
      break;
    }
    case 'slice': { // un fruit saute, la main passe dessus d'un coup : il est coupé en deux
      const k = cyc(1400), side = Math.floor(t / 1400) % 2 ? 1 : -1, fx = gx + side * S * 0.34, fy = gy - S * 0.78;
      const arm = 0.8 + Math.min(1, k * 2.2) * 1.9; // le bras balaie de bas en haut
      ctx.font = `${S * 0.22}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (k < 0.45) ctx.fillText('🍉', fx, fy + (0.45 - k) * S * 0.6);
      else for (const sg of [-1, 1]) {
        ctx.save(); ctx.beginPath(); ctx.rect(fx + (sg < 0 ? -S * 0.2 : 0) + sg * (k - 0.45) * S * 0.25, fy - S * 0.2, S * 0.2, S * 0.5); ctx.clip();
        ctx.fillText('🍉', fx + sg * (k - 0.45) * S * 0.25, fy + (k - 0.45) * S * 0.3); ctx.restore();
      }
      if (k > 0.3 && k < 0.6) { ctx.strokeStyle = 'rgba(255, 107, 53, 0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(gx, gy - S * 0.62, S * 0.38, side < 0 ? 3.6 : -0.9, side < 0 ? 4.4 : -0.1); ctx.stroke(); }
      stickFigure(ctx, { ...base, armL: side < 0 ? arm : 0.4, armR: side > 0 ? arm : 0.4 });
      break;
    }
    case 'cubes': { // un cube bleu à gauche, un orange à droite : on tape avec la bonne main
      const k = cyc(1000), side = Math.floor(t / 1000) % 2 ? 1 : -1, cx = gx + side * S * 0.36, cy = gy - S * 0.62;
      const sz = S * (0.06 + 0.12 * Math.min(1, k * 1.6));
      ctx.fillStyle = side < 0 ? '#4ea8ff' : '#ff6b35';
      if (k < 0.75) ctx.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
      ctx.strokeStyle = side < 0 ? '#4ea8ff' : '#ff6b35'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.12, 0, Math.PI * 2); ctx.stroke();
      const punch = k > 0.55 ? 2.0 : 0.5;
      stickFigure(ctx, { ...base, armL: side < 0 ? punch : 0.4, armR: side > 0 ? punch : 0.4 });
      break;
    }
    case 'freeze': {
      const dancing = cyc(2400) < 0.6;
      if (dancing) {
        const k = Math.sin(t * 0.012);
        ctx.font = `${S * 0.18}px serif`; ctx.textAlign = 'center'; ctx.fillText('🎵', gx + S * 0.38, gy - S * 0.7);
        stickFigure(ctx, { ...base, lift: Math.abs(k) * S * 0.04, armL: 1.6 + k * 1.2, armR: 1.6 - k * 1.2 });
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(gx + S * 0.3, gy - S * 0.8, S * 0.05, S * 0.18); ctx.fillRect(gx + S * 0.39, gy - S * 0.8, S * 0.05, S * 0.18);
        stickFigure(ctx, { ...base, armL: 2.0, armR: 0.4 }, '#64748b');
      }
      break;
    }
    case 'rest': {
      const k = (Math.sin(t * 0.0025) + 1) / 2; // on respire : bras qui montent et descendent doucement
      stickFigure(ctx, { ...base, armL: 0.4 + k * 2.4, armR: 0.4 + k * 2.4 }, '#7c3aed');
      break;
    }
    default:
      stickFigure(ctx, base);
  }
}
