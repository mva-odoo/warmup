// Détection des mouvements via MediaPipe Pose Landmarker (webcam), pour 1 ou 2 joueurs.
// Chaque joueur (Body) émet des événements : jump, squat, left, right, smash, step
// et maintient un état : present, fullBody, side, squat, armsUp, airplane, star, flamingo.
// Le Tracker fusionne les états : en coopératif, un défi est réussi quand les DEUX le font.

const VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const POSE_NAMES = ['armsUp', 'airplane', 'star', 'flamingo'];

function emptyState() {
  return {
    present: false, upperBody: false, fullBody: false, kneesOK: false, anklesOK: false,
    side: 'center', squat: false, jumpUp: false,
    armsUp: false, airplane: false, star: false, flamingo: false,
    lift: null, checks: null,
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
    this.foot = { L: false, R: false };
    this.wristUp = { L: 0, R: 0 };
    this.bob = null;
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
    this.bob = { dir: 'down', ext: sh.y };
  }

  process(lm, now, emit) {
    const s = this.state;
    this.lm = lm || null;
    if (!lm) {
      s.present = s.upperBody = s.fullBody = false;
      s.lift = null;
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
    if (!s.present) { s.lift = null; return; }

    const sh = mid(lm[11], lm[12]);
    const hip = mid(lm[23], lm[24]);
    this.center = sh;
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

    // --- Course sur place
    s.lift = null;
    if (!s.squat) {
      if (useKnees) {
        // chaque genou (ou pied) qui se lève = un pas
        const ankDiff = s.anklesOK ? (lm[28].y - lm[27].y) / T : 0;
        const legs = [['L', kneeL, ankDiff], ['R', kneeR, -ankDiff]];
        // 0 = jambe tendue, 1 = assez haut pour compter un pas
        const liftOf = (kr, ankUp) => Math.max(0, Math.min(1.2, Math.max((0.9 - kr) / 0.2, ankUp / 0.22)));
        s.lift = { L: liftOf(kneeL, ankDiff), R: liftOf(kneeR, -ankDiff) };
        for (const [k, kr, ankUp] of legs) {
          if (!this.foot[k] && (kr < 0.7 || ankUp > 0.22)) { this.foot[k] = true; emit('step'); }
          else if (this.foot[k] && kr > 0.78 && ankUp < 0.1) this.foot[k] = false;
        }
      } else {
        // haut du corps seulement : chaque rebond des épaules = un pas
        const b = this.bob || (this.bob = { dir: 'down', ext: sh.y });
        const th = 0.06 * T;
        if (b.dir === 'down') {
          if (sh.y > b.ext) b.ext = sh.y;
          else if (sh.y < b.ext - th) { b.dir = 'up'; b.ext = sh.y; emit('step'); }
        } else {
          if (sh.y < b.ext) b.ext = sh.y;
          else if (sh.y > b.ext + th) { b.dir = 'down'; b.ext = sh.y; }
        }
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
    const legsApart = s.anklesOK ? Math.abs(lm[27].x - lm[28].x) / T > 0.75
      : s.kneesOK ? Math.abs(lm[25].x - lm[26].x) / T > 0.55 : true;
    const handsHigh = lw.y < nose.y && rw.y < nose.y;
    const armsLevel = level(lw) && level(rw);
    const armsWide = spread > 1.8;
    const starArmsUp = lw.y < sh.y - 0.15 * T && rw.y < sh.y - 0.15 * T;
    const starArmsWide = spread > 1.3;
    const footUp = useKnees && ((s.anklesOK && Math.abs(lm[27].y - lm[28].y) / T > 0.3) ||
      (kneeL < 0.6 && kneeR > 0.8) || (kneeR < 0.6 && kneeL > 0.8));
    s.armsUp = handsHigh;
    s.airplane = armsLevel && armsWide;
    s.star = starArmsUp && starArmsWide && legsApart;
    s.flamingo = !s.squat && footUp;
    // Ce qui est bon / pas bon, pour aider l'enfant pendant la pose
    s.checks = {
      armsUp: [['Mains au-dessus de la tête', handsHigh]],
      airplane: [['Bras à hauteur des épaules', armsLevel], ['Bras bien écartés', armsWide]],
      star: [['Bras levés', starArmsUp], ['Bras écartés', starArmsWide],
        ...(s.kneesOK ? [['Jambes écartées', legsApart]] : [])],
      flamingo: [['Un genou levé', footUp], ['Reste debout', !s.squat]],
    };

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
    let order;
    if (!this.calibrated || bodies.some((b) => !b.center)) {
      // Avant le départ : joueur 1 = celui de gauche à l'écran (image en miroir => x le plus grand)
      const sorted = [...list].sort((a, b) => cen(b).x - cen(a).x);
      order = [sorted[0] || null, sorted[1] || null];
    } else if (list.length >= 2) {
      // Pendant la partie : on garde l'association la plus proche des positions précédentes
      const d = (b, lm) => dist(b.center, cen(lm));
      const keep = d(bodies[0], list[0]) + d(bodies[1], list[1]);
      const swap = d(bodies[0], list[1]) + d(bodies[1], list[0]);
      order = keep <= swap ? [list[0], list[1]] : [list[1], list[0]];
    } else if (list.length === 1) {
      const c = cen(list[0]);
      order = dist(bodies[0].center, c) <= dist(bodies[1].center, c) ? [list[0], null] : [null, list[0]];
    } else order = [null, null];
    send(bodies[0], order[0]);
    send(bodies[1], order[1]);
  }

  calibrate() {
    if (this.sim) { for (const b of this.bodies) { b.calib = { cx: 0.5 }; b.mode = 'full'; } }
    else for (const b of this.bodies) b.calibrate();
    this.calibrated = true;
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
      else if (k === 'r' || k === 'R') emitAll('step');
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

function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
