// Détection des mouvements via MediaPipe Pose Landmarker (webcam).
// Émet des événements : jump, squat, left, right, smash, step
// et maintient un état : present, fullBody, side, squat, armsUp, airplane, star, flamingo.

const VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const SKELETON = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

class Tracker {
  constructor() {
    this.listeners = [];
    this.lm = null;
    this.sim = false;
    this.calib = null;
    this.landmarker = null;
    this.lastVideoTime = -1;
    this.state = {
      present: false, fullBody: false, side: 'center',
      squat: false, jumpUp: false,
      armsUp: false, airplane: false, star: false, flamingo: false,
    };
    this.mode = 'full';
    this.base = null;      // hauteur des épaules « debout » (adaptative)
    this.T = null;         // longueur du torse (échelle du corps dans l'image)
    this.offSince = 0;
    this.foot = { L: false, R: false };
    this.wristUp = { L: 0, R: 0 };
  }

  on(fn) { this.listeners.push(fn); }
  emit(type) { const now = performance.now(); for (const f of this.listeners) f(type, now); }

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
      runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, opts('GPU'));
    } catch (e) {
      console.warn('GPU indisponible, passage en CPU', e);
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, opts('CPU'));
    }
  }

  update(video, now) {
    if (this.sim || !this.landmarker || video.readyState < 2) return;
    if (video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;
    const res = this.landmarker.detectForVideo(video, now);
    this.process(res.landmarks && res.landmarks[0], now);
  }

  // mode : 'full' (pieds visibles), 'knees' (jusqu'aux genoux), 'upper' (haut du corps seulement)
  calibrate() {
    if (this.sim) { this.calib = { cx: 0.5 }; this.mode = 'full'; return; }
    const lm = this.lm;
    if (!lm) return;
    const sh = mid(lm[11], lm[12]);
    this.calib = { cx: sh.x };
    this.base = sh.y;
    this.T = dist(sh, mid(lm[23], lm[24]));
    this.mode = this.state.anklesOK ? 'full' : this.state.kneesOK ? 'knees' : 'upper';
    this.bob = { dir: 'down', ext: sh.y };
  }

  process(lm, now) {
    const s = this.state;
    this.lm = lm || null;
    if (!lm) { s.present = s.upperBody = s.fullBody = false; return; }
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
    if (!s.jumpUp && dy < -0.2 * T) { s.jumpUp = true; this.emit('jump'); }
    else if (s.jumpUp && dy > -0.08 * T) s.jumpUp = false;

    // --- Accroupi : le haut du corps descend OU les deux cuisses « écrasées »
    const squatNow = dy > 0.35 * T || (useKnees && kneeL < 0.45 && kneeR < 0.45);
    const standNow = dy < 0.18 * T && kneeL > 0.55 && kneeR > 0.55;
    if (!s.squat && squatNow) { s.squat = true; this.emit('squat'); }
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
    if (!s.squat) {
      if (useKnees) {
        // chaque genou (ou pied) qui se lève = un pas
        const ankDiff = s.anklesOK ? (lm[28].y - lm[27].y) / T : 0;
        const legs = [['L', kneeL, ankDiff], ['R', kneeR, -ankDiff]];
        for (const [k, kr, ankUp] of legs) {
          if (!this.foot[k] && (kr < 0.7 || ankUp > 0.22)) { this.foot[k] = true; this.emit('step'); }
          else if (this.foot[k] && kr > 0.78 && ankUp < 0.1) this.foot[k] = false;
        }
      } else {
        // haut du corps seulement : chaque rebond des épaules = un pas
        const b = this.bob || (this.bob = { dir: 'down', ext: sh.y });
        const th = 0.06 * T;
        if (b.dir === 'down') {
          if (sh.y > b.ext) b.ext = sh.y;
          else if (sh.y < b.ext - th) { b.dir = 'up'; b.ext = sh.y; this.emit('step'); }
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
      if (side !== s.side) { s.side = side; if (side !== 'center') this.emit(side); }
    }

    // --- Poses
    const nose = lm[0], lw = lm[15], rw = lm[16];
    const spread = Math.abs(lw.x - rw.x) / T;
    const level = (w) => Math.abs(w.y - sh.y) < 0.35 * T;
    // Jambes écartées : chevilles si visibles, sinon genoux, sinon on ne regarde que les bras
    const legsApart = s.anklesOK ? Math.abs(lm[27].x - lm[28].x) / T > 0.75
      : s.kneesOK ? Math.abs(lm[25].x - lm[26].x) / T > 0.55 : true;
    s.armsUp = lw.y < nose.y && rw.y < nose.y;
    s.airplane = level(lw) && level(rw) && spread > 1.8;
    s.star = lw.y < sh.y - 0.15 * T && rw.y < sh.y - 0.15 * T && spread > 1.3 && legsApart;
    s.flamingo = !s.squat && useKnees && ((s.anklesOK && Math.abs(lm[27].y - lm[28].y) / T > 0.3) ||
      (kneeL < 0.6 && kneeR > 0.8) || (kneeR < 0.6 && kneeL > 0.8));

    // --- Smash : main au-dessus de la tête puis descente rapide
    for (const [k, w] of [['L', lw], ['R', rw]]) {
      if (w.y < nose.y - 0.1 * T) this.wristUp[k] = now;
      else if (this.wristUp[k] && now - this.wristUp[k] < 800 && w.y > sh.y + 0.6 * T) {
        this.wristUp[k] = 0; this.emit('smash');
      }
    }
  }

  drawSkeleton(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    const lm = this.lm;
    if (!lm || this.sim) return;
    const ok = this.state.upperBody;
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.strokeStyle = ok ? '#4ade80' : '#fb923c';
    for (const [a, b] of SKELETON) {
      if ((lm[a].visibility ?? 1) < 0.4 || (lm[b].visibility ?? 1) < 0.4) continue;
      ctx.beginPath();
      ctx.moveTo(lm[a].x * w, lm[a].y * h);
      ctx.lineTo(lm[b].x * w, lm[b].y * h);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    for (const i of [0, 15, 16, 27, 28]) {
      if ((lm[i].visibility ?? 1) < 0.4) continue;
      ctx.beginPath(); ctx.arc(lm[i].x * w, lm[i].y * h, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Mode clavier pour tester sans caméra
  enableSim() {
    if (this.sim) return;
    this.sim = true;
    const s = this.state;
    s.present = s.upperBody = s.fullBody = s.kneesOK = s.anklesOK = true;
    const poseKeys = { '1': 'armsUp', '2': 'airplane', '3': 'star', '4': 'flamingo' };
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key;
      if ([' ', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(k)) e.preventDefault();
      if (k === ' ' || k === 'ArrowUp') this.emit('jump');
      else if (k === 'ArrowDown') { s.squat = true; this.emit('squat'); }
      else if (k === 'ArrowLeft') { s.side = 'left'; this.emit('left'); }
      else if (k === 'ArrowRight') { s.side = 'right'; this.emit('right'); }
      else if (k === 's' || k === 'S') this.emit('smash');
      else if (k === 'r' || k === 'R') this.emit('step');
      else if (poseKeys[k]) s[poseKeys[k]] = true;
    });
    addEventListener('keyup', (e) => {
      const k = e.key;
      if (k === 'ArrowDown') s.squat = false;
      else if (k === 'ArrowLeft' || k === 'ArrowRight') s.side = 'center';
      else if (poseKeys[k]) s[poseKeys[k]] = false;
    });
  }
}

function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
