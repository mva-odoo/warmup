// Détection des mouvements via MediaPipe Pose Landmarker (webcam), pour 1 ou 2 joueurs.
// Chaque joueur (Body) émet des événements : jump, squat, left, right, smash
// et maintient un état : present, fullBody, side, squat, armsUp, airplane, star, flamingo.
// Le Tracker fusionne les états : en coopératif, un défi est réussi quand les DEUX le font.

const VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const POSE_NAMES = ['armsUp', 'airplane', 'star', 'flamingo'];

const SKELETON = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

// Silhouette de chaque pose, en longueurs de torse depuis le milieu des épaules
// (x positif = côté gauche du joueur, c'est-à-dire x croissant dans l'image non inversée).
const TARGET_BONES = [
  ['sL', 'sR'], ['sL', 'eL'], ['eL', 'wL'], ['sR', 'eR'], ['eR', 'wR'],
  ['sL', 'hL'], ['sR', 'hR'], ['hL', 'hR'], ['hL', 'kL'], ['kL', 'aL'], ['hR', 'kR'], ['kR', 'aR'],
];
const TARGET_BODY = { sL: [0.35, 0], sR: [-0.35, 0], hL: [0.25, 1], hR: [-0.25, 1] };
const STRAIGHT_LEGS = { kL: [0.25, 1.9], aL: [0.25, 2.8], kR: [-0.25, 1.9], aR: [-0.25, 2.8] };
const TARGET_POSES = {
  armsUp: { ...TARGET_BODY, ...STRAIGHT_LEGS, eL: [0.5, -0.5], wL: [0.45, -1.05], eR: [-0.5, -0.5], wR: [-0.45, -1.05] },
  airplane: { ...TARGET_BODY, ...STRAIGHT_LEGS, eL: [0.9, 0], wL: [1.45, 0], eR: [-0.9, 0], wR: [-1.45, 0] },
  star: { ...TARGET_BODY, eL: [0.75, -0.4], wL: [1.1, -0.85], eR: [-0.75, -0.4], wR: [-1.1, -0.85],
    kL: [0.55, 1.85], aL: [0.8, 2.7], kR: [-0.55, 1.85], aR: [-0.8, 2.7] },
  flamingo: { ...TARGET_BODY, eL: [0.7, 0.25], wL: [1.05, 0.45], eR: [-0.7, 0.25], wR: [-1.05, 0.45],
    kL: [0.25, 1.9], aL: [0.25, 2.8], kR: [-0.4, 1.45], aR: [-0.2, 1.95] },
};

function drawTarget(ctx, w, h, sh, T, pose) {
  const G = TARGET_POSES[pose];
  if (!G) return;
  const ax = T * (h / w); // le torse est mesuré en hauteur d'image
  const P = (k) => [(sh.x + G[k][0] * ax) * w, (sh.y + G[k][1] * T) * h];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 224, 102, 0.8)';
  ctx.lineWidth = 14;
  ctx.setLineDash([2, 18]);
  for (const [a, b] of TARGET_BONES) {
    const [x1, y1] = P(a), [x2, y2] = P(b);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.restore();
}

function emptyState() {
  return {
    present: false, upperBody: false, fullBody: false, kneesOK: false, anklesOK: false,
    side: 'center', squat: false, jumpUp: false,
    armsUp: false, airplane: false, star: false, flamingo: false, crossed: false,
  };
}

// ---------------------------------------------------------------------------
// Un joueur
// ---------------------------------------------------------------------------
class Body {
  constructor(idx) {
    this.idx = idx;
    this.lm = null;
    this.calib = null;
    this.state = emptyState();
    this.mode = 'full';
    this.base = null;      // hauteur des épaules « debout » (adaptative)
    this.T = null;         // longueur du torse (échelle du corps dans l'image)
    this.offSince = 0;
    this.wristUp = { L: 0, R: 0 };
    this.motion = 0;       // quantité de mouvement lissée (statues musicales)
    this.prevLm = null;
    this.center = null;    // milieu des épaules (sert à reconnaître qui est qui)
  }

  // mode : 'full' (pieds visibles), 'knees' (jusqu'aux genoux), 'upper' (haut du corps seulement)
  calibrate() {
    const lm = this.lm;
    if (!lm) return;
    const sh = mid(lm[11], lm[12]);
    this.calib = { cx: sh.x };
    this.base = sh.y;
    this.T = dist(sh, mid(lm[23], lm[24]));
    this.mode = this.state.anklesOK ? 'full' : this.state.kneesOK ? 'knees' : 'upper';
  }

  process(lm, now, emit) {
    const s = this.state;
    this.lm = lm || null;
    if (!lm) {
      s.present = s.upperBody = s.fullBody = false;
      return;
    }
    const vis = (i) => (lm[i].visibility == null ? 1 : lm[i].visibility);
    const inFrame = (i) => lm[i].x > 0 && lm[i].x < 1 && lm[i].y > 0 && lm[i].y < 1;
    const shOK = vis(11) > 0.5 && vis(12) > 0.5;
    const hipOK = vis(23) > 0.5 && vis(24) > 0.5;
    s.kneesOK = [25, 26].every((i) => vis(i) > 0.5 && inFrame(i));
    s.anklesOK = s.kneesOK && [27, 28].every((i) => vis(i) > 0.5 && inFrame(i));
    s.present = shOK;
    s.upperBody = shOK && hipOK && vis(0) > 0.5 && inFrame(0);
    s.fullBody = s.upperBody && s.anklesOK;
    if (!s.present) return;

    const sh = mid(lm[11], lm[12]);
    const hip = mid(lm[23], lm[24]);
    this.center = sh;
    if (this.prevLm && this.T) {
      let m = 0;
      for (const i of [0, 13, 14, 15, 16, 25, 26]) m += Math.hypot(lm[i].x - this.prevLm[i].x, lm[i].y - this.prevLm[i].y);
      this.motion += (m / 7 / this.T - this.motion) * 0.3;
    }
    this.prevLm = lm;
    const Tnow = hipOK ? dist(sh, hip) : this.T;
    if (this.T == null) this.T = Tnow || 0.2;
    if (this.base == null) this.base = sh.y;
    const T = this.T;
    // Référence verticale = épaules (toujours visibles, même pour un adulte proche de la caméra)
    const dy = sh.y - this.base; // positif = plus bas

    const useKnees = s.kneesOK && hipOK;
    // Rapport hanche→genou / torse : ~0.9 debout, petit quand on s'accroupit ou lève le genou
    const kneeL = useKnees ? (lm[25].y - lm[23].y) / T : 1;
    const kneeR = useKnees ? (lm[26].y - lm[24].y) / T : 1;

    // --- Saut : le haut du corps monte nettement
    if (!s.jumpUp && dy < -0.2 * T) { s.jumpUp = true; emit('jump'); }
    else if (s.jumpUp && dy > -0.08 * T) s.jumpUp = false;

    // --- Accroupi : le haut du corps descend OU les deux cuisses « écrasées »
    const squatNow = dy > 0.35 * T || (useKnees && kneeL < 0.45 && kneeR < 0.45);
    const standNow = dy < 0.18 * T && kneeL > 0.55 && kneeR > 0.55;
    if (!s.squat && squatNow) { s.squat = true; emit('squat'); }
    else if (s.squat && standNow) s.squat = false;

    // --- Ligne de base adaptative (seulement quand on est « normal »)
    if (Math.abs(dy) < 0.1 * T) {
      this.base += (sh.y - this.base) * 0.05;
      if (hipOK) this.T += (Tnow - this.T) * 0.03;
      this.offSince = 0;
    } else {
      if (!this.offSince) this.offSince = now;
      if (now - this.offSince > 4000) { // le joueur s'est déplacé : on recale
        this.base = sh.y; if (hipOK) this.T = Tnow; this.offSince = 0;
        s.squat = false; s.jumpUp = false;
      }
    }

    // --- Gauche / droite (par rapport à la position de départ)
    // Image non inversée : quand le joueur va à SA gauche, x augmente.
    if (this.calib) {
      const dx = sh.x - this.calib.cx;
      let side = s.side;
      if (dx > 0.5 * T) side = 'left';
      else if (dx < -0.5 * T) side = 'right';
      else if (Math.abs(dx) < 0.3 * T) side = 'center';
      if (side !== s.side) { s.side = side; if (side !== 'center') emit(side); }
    }

    // --- Poses
    const nose = lm[0], lw = lm[15], rw = lm[16];
    const spread = Math.abs(lw.x - rw.x) / T;
    const level = (w) => Math.abs(w.y - sh.y) < 0.35 * T;
    // Jambes écartées : chevilles si visibles, sinon genoux, sinon on ne regarde que les bras
    // (seuils généreux : un petit enfant écarte moins les jambes qu'un adulte)
    const legsApart = s.anklesOK ? Math.abs(lm[27].x - lm[28].x) / T > 0.5
      : s.kneesOK ? Math.abs(lm[25].x - lm[26].x) / T > 0.4 : true;
    // Bras croisés devant la poitrine (geste de pause) : les poignets échangent leur côté
    const chest = (w) => w.y > sh.y - 0.3 * T && w.y < hip.y + 0.2 * T && Math.abs(w.x - sh.x) < 0.8 * T * 0.75;
    s.crossed = lw.x < rw.x - 0.03 && chest(lw) && chest(rw);
    s.armsUp = lw.y < nose.y && rw.y < nose.y;
    s.airplane = level(lw) && level(rw) && spread > 1.8;
    s.star = lw.y < sh.y && rw.y < sh.y && spread > 1.05 && legsApart;
    s.flamingo = !s.squat && useKnees && ((s.anklesOK && Math.abs(lm[27].y - lm[28].y) / T > 0.3) ||
      (kneeL < 0.6 && kneeR > 0.8) || (kneeR < 0.6 && kneeL > 0.8));

    // --- Smash : main au-dessus de la tête puis descente rapide
    for (const [k, w] of [['L', lw], ['R', rw]]) {
      if (w.y < nose.y - 0.1 * T) this.wristUp[k] = now;
      else if (this.wristUp[k] && now - this.wristUp[k] < 800 && w.y > sh.y + 0.6 * T) {
        this.wristUp[k] = 0; emit('smash');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// La caméra et les joueurs
// ---------------------------------------------------------------------------
class Tracker {
  constructor() {
    this.listeners = [];
    this.sim = false;
    this.landmarker = null;
    this.lastVideoTime = -1;
    this.players = 1;
    this.bodies = [new Body(0)];
    this.calibrated = false;
    // Performance : temps de calcul moyen et images analysées par seconde
    this.delegate = '';
    this.perf = { ms: 0, fps: 0, frames: 0, since: 0, last: 0 };
  }

  on(fn) { this.listeners.push(fn); }
  emit(type, idx = 0) { const now = performance.now(); for (const f of this.listeners) f(type, now, idx); }

  // 1 joueur ou 2 joueurs (coopératif). Repart de zéro pour chaque joueur.
  setPlayers(n) {
    n = n === 2 ? 2 : 1;
    if (n !== this.players || this.bodies.length !== n) {
      this.players = n;
      this.bodies = Array.from({ length: n }, (_, i) => new Body(i));
      if (this.landmarker) this.landmarker.setOptions({ numPoses: n }).catch((e) => console.warn(e));
    }
    this.calibrated = false;
    if (this.sim) for (const b of this.bodies) this.simBody(b);
  }

  // État commun : en coopératif, une pose / un côté n'est validé que si tout le monde y est
  get state() {
    if (this.bodies.length === 1) return this.bodies[0].state;
    const all = this.bodies.map((b) => b.state);
    const every = (k) => all.every((s) => s[k]);
    const m = emptyState();
    for (const k of ['present', 'upperBody', 'fullBody', 'kneesOK', 'anklesOK', 'squat', ...POSE_NAMES]) m[k] = every(k);
    m.side = all.every((s) => s.side === all[0].side) ? all[0].side : 'center';
    m.someone = all.some((s) => s.present);
    m.crossed = all.some((s) => s.crossed); // un seul enfant suffit pour faire pause
    return m;
  }

  // Le mode le plus limitant des joueurs (pour adapter les étapes)
  get mode() {
    const modes = this.bodies.map((b) => b.mode);
    return modes.includes('upper') ? 'upper' : modes.includes('knees') ? 'knees' : 'full';
  }

  async start(video, progress) {
    progress('Ouverture de la caméra…');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false,
    });
    video.srcObject = stream;
    await video.play();
    progress('Chargement de la détection des mouvements…');
    const { PoseLandmarker, FilesetResolver } = await import(VISION_CDN + '/vision_bundle.mjs');
    const fileset = await FilesetResolver.forVisionTasks(VISION_CDN + '/wasm');
    const opts = (delegate) => ({
      baseOptions: { modelAssetPath: POSE_MODEL, delegate },
      runningMode: 'VIDEO', numPoses: this.players,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, opts('GPU'));
      this.delegate = 'GPU';
    } catch (e) {
      console.warn('GPU indisponible, passage en CPU', e);
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, opts('CPU'));
      this.delegate = 'CPU';
    }
  }

  update(video, now) {
    if (this.sim || !this.landmarker || video.readyState < 2) return;
    if (video.currentTime === this.lastVideoTime) return;
    // Sur un PC lent, on analyse moins d'images pour garder le jeu fluide
    const P = this.perf;
    const minGap = P.ms > 40 ? 66 : P.ms > 25 ? 45 : 0;
    if (now - P.last < minGap) return;
    P.last = now;
    this.lastVideoTime = video.currentTime;
    const t0 = performance.now();
    const res = this.landmarker.detectForVideo(video, now);
    P.ms += (performance.now() - t0 - P.ms) * 0.1;
    P.frames++;
    if (!P.since) P.since = now;
    if (now - P.since >= 1000) { P.fps = Math.round(P.frames * 1000 / (now - P.since)); P.frames = 0; P.since = now; }
    this.assign(res.landmarks || [], now);
  }

  // Donne chaque squelette détecté au bon joueur
  assign(list, now) {
    const bodies = this.bodies;
    const send = (b, lm) => b.process(lm, now, (type) => this.emit(type, b.idx));
    if (bodies.length === 1) return send(bodies[0], list[0]);
    const cen = (lm) => mid(lm[11], lm[12]);
    // Deux détections presque au même endroit = la même personne vue deux fois : on n'en garde qu'une
    if (list.length >= 2 && Math.abs(cen(list[0]).x - cen(list[1]).x) < 0.06) list = [list[0]];
    // Joueur 1 = à gauche de l'écran (image en miroir => x le plus grand), joueur 2 = à droite.
    // Chacun garde son côté : c'est plus fiable que de suivre les positions quand les enfants se rapprochent.
    let order;
    if (list.length >= 2) order = [...list].sort((a, b) => cen(b).x - cen(a).x);
    else if (list.length === 1) order = cen(list[0]).x >= 0.5 ? [list[0], null] : [null, list[0]];
    else order = [null, null];
    if (order[0] && order[1]) {
      // Un bras ou une jambe qui dépasse nettement chez le voisin est sans doute à lui : on l'ignore
      const midX = (cen(order[0]).x + cen(order[1]).x) / 2;
      order = [cleanSide(order[0], midX, +1), cleanSide(order[1], midX, -1)];
    }
    send(bodies[0], order[0]);
    send(bodies[1], order[1]);
  }

  calibrate() {
    if (this.sim) { for (const b of this.bodies) { b.calib = { cx: 0.5 }; b.mode = 'full'; } }
    else for (const b of this.bodies) b.calibrate();
    this.calibrated = true;
  }

  // Dessine les squelettes sur la vidéo (le canvas est retourné en miroir par le CSS).
  // Pendant une pose : silhouette jaune à imiter, et squelette vert quand c'est réussi.
  draw(ctx, w, h, { colors = [], target = null } = {}) {
    ctx.clearRect(0, 0, w, h);
    if (this.sim) return;
    if (this.bodies.length === 2) {
      // Chacun sa moitié (joueur 1 à gauche de l'écran = x > 0.5 dans l'image non inversée)
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = colors[0] || '#ff6b35'; ctx.fillRect(w / 2, 0, w / 2, h);
      ctx.fillStyle = colors[1] || '#4ea8ff'; ctx.fillRect(0, 0, w / 2, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 4; ctx.setLineDash([14, 12]);
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const b of this.bodies) {
      const lm = b.lm;
      if (!lm) continue;
      if (target && b.T) drawTarget(ctx, w, h, mid(lm[11], lm[12]), b.T, target);
      const done = target && b.state[target];
      const color = done ? '#4ade80' : colors[b.idx] || (b.state.upperBody ? '#4ade80' : '#fb923c');
      ctx.lineWidth = done ? 10 : 7; ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      for (const [i, j] of SKELETON) {
        if ((lm[i].visibility ?? 1) < 0.4 || (lm[j].visibility ?? 1) < 0.4) continue;
        ctx.beginPath(); ctx.moveTo(lm[i].x * w, lm[i].y * h); ctx.lineTo(lm[j].x * w, lm[j].y * h); ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      for (const i of [0, 15, 16, 27, 28]) {
        if ((lm[i].visibility ?? 1) < 0.4) continue;
        ctx.beginPath(); ctx.arc(lm[i].x * w, lm[i].y * h, 7, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // Résumé lisible : « 24 img/s · GPU » (🐢 si la détection rame)
  perfLabel() {
    if (this.sim || !this.perf.fps) return '';
    const slow = this.perf.fps < 15 ? ' 🐢' : '';
    return `${this.perf.fps} img/s · ${this.delegate}${slow}`;
  }

  // Mode clavier pour tester sans caméra (le clavier joue pour tous les joueurs)
  simBody(b) {
    const s = b.state;
    s.present = s.upperBody = s.fullBody = s.kneesOK = s.anklesOK = true;
  }

  enableSim() {
    if (this.sim) return;
    this.sim = true;
    for (const b of this.bodies) this.simBody(b);
    const poseKeys = { '1': 'armsUp', '2': 'airplane', '3': 'star', '4': 'flamingo' };
    const all = (fn) => this.bodies.forEach(fn);
    const emitAll = (type) => all((b) => this.emit(type, b.idx));
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key;
      if ([' ', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(k)) e.preventDefault();
      if (k === ' ' || k === 'ArrowUp') emitAll('jump');
      else if (k === 'ArrowDown') { all((b) => (b.state.squat = true)); emitAll('squat'); }
      else if (k === 'ArrowLeft') { all((b) => (b.state.side = 'left')); emitAll('left'); }
      else if (k === 'ArrowRight') { all((b) => (b.state.side = 'right')); emitAll('right'); }
      else if (k === 's' || k === 'S') emitAll('smash');
      else if (poseKeys[k]) all((b) => (b.state[poseKeys[k]] = true));
    });
    addEventListener('keyup', (e) => {
      const k = e.key;
      if (k === 'ArrowDown') all((b) => (b.state.squat = false));
      else if (k === 'ArrowLeft' || k === 'ArrowRight') all((b) => (b.state.side = 'center'));
      else if (poseKeys[k]) all((b) => (b.state[poseKeys[k]] = false));
    });
  }
}

// Garde les points d'un joueur de son côté de la ligne médiane (side +1 : x > midX)
function cleanSide(lm, midX, side) {
  const margin = 0.03;
  return lm.map((p, i) => (i >= 13 && (p.x - midX) * side < -margin ? { ...p, visibility: 0 } : p));
}

function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
