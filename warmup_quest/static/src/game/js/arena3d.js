// Jeux miroir en 3D : chaque jeu a son décor (grande salle de l'Académie, pré, cour enneigée, ciel du soir, corde au-dessus
// des nuages…) et le petit sorcier de l'enfant, en 3D, imite ses gestes en direct, comme dans un jeu vidéo.
// arena.js garde les règles (en pixels de l'écran) : ici on construit la scène, on place les objets du jeu et on renvoie
// où sont les mains, les épaules et la tête du petit sorcier à l'écran (c'est avec SES mains qu'on touche).
// Rendu avec le moteur 3D du jeu (scene3d.js), sur sa toile ; le calque 2D d'arena.js n'affiche plus que les textes.

const A3_MODELS = ['holiday/snowman', 'holiday/snowman-hat', 'holiday/tree-snow-a', 'holiday/tree-snow-b', 'holiday/tree-snow-c', 'holiday/snow-pile',
  'kaykit/fu-shelf_B_large_decorated', 'kaykit/hw-candle_triple', 'kaykit/re-jar_A_large', 'kaykit/re-jar_B_medium', 'kaykit/Rogue_Hooded', 'kaykit/fu-book_set',
  'kenney/tree_default', 'kenney/tree_oak', 'kenney/tree_fat', 'kenney/tree_pineRoundA', 'kenney/flower_redA', 'kenney/flower_yellowA', 'kenney/flower_purpleA',
  'kenney/mushroom_redGroup', 'kenney/rock_largeA', 'kenney/plant_bushLarge', 'custom/castle', 'castle/flag-banner-long', 'pets/animal-chick', 'pets/animal-bunny'];
const A3_GRIMAUD = { model: 'kk-hood', hat: 'none', glasses: false, back: 'none', color: '#5a189a' };
const A3_H = 2; // taille du petit sorcier (unités 3D)
// Mains magiques : bras de l'enfant tendu (≈ 1,1 torse) -> 1,9 « torse du jeu » depuis l'épaule du sorcier (ses bras à lui sont courts)
const A3_REACH = 1.9; // (portée du jeu, bras tendu, en « torses du jeu » ; la portée de l'enfant est mesurée par les étoiles)
const A3_NOSHADOW = { castShadow: false };
// Décor de chaque jeu, et plan de caméra : de face (miroir) ou de dos (course vers le nuage, balai)
const A3_GAMES = {
  mur: { room: 'corridor' }, soleil: { room: 'meadow', back: true }, pimprenelle: { room: 'hall' }, neige: { room: 'snow' },
  potions: { room: 'lab' }, duel: { room: 'arena' }, corde: { room: 'meadow' }, equilibre: { room: 'rope' }, balai: { room: 'sky', back: true }, photo: { room: 'studio' },
};
const a3swap = (k) => k.replace(/left|right/, (x) => (x === 'left' ? 'right' : 'left'));

class Arena3D {
  constructor(S) { this.S = S; this.scene = null; }
  get T() { return this.S.T; }
  static can(S) { return !!(S && S.ready && S.renderer && S.T && S.P && S.P.models); }

  // ---------- Construction
  begin(A) {
    const S = this.S, T = this.T, game = A.s.game;
    this.A = A; this.game = game; this.cfg = A3_GAMES[game] || { room: 'hall' };
    this.own = []; this.parts = []; this.objs = new Map(); this.t0 = performance.now(); this.lastT = this.t0;
    const scene = (this.scene = new T.Scene());
    this.cam = new T.PerspectiveCamera(40, 1, 0.1, 200); this.camP = null; this.camL = null;
    this.shakeT = 0; this.punchT = 0; this.reactT = 0; this.reactKind = null; this.boneQ = new Map(); this.prevSide = 0; this.lean = 0; this.landT = 0;
    // Le petit sorcier de l'enfant (même apparence que sur le chemin), grandi à A3_H, tourné vers nous
    const h0 = S.heroes && S.heroes[0];
    const look = (h0 && h0.m3 && h0.m3.human && h0.m3.human.look) || (h0 && h0.look) || DEFAULT_LOOK;
    const m = S.makeHero((h0 && h0.pal) || (S.theme && S.theme.hero) || { body: look.color }, false, null, true, look);
    if (!m.human) return false; // (personnages 3D pas chargés : on garde la version dessinée)
    this.av = m; scene.add(m.group);
    S.poseHumanStill(m, 'idle');
    m.group.position.set(0, 0, 0); m.group.rotation.set(0, 0, 0); m.group.scale.setScalar(m.scale); m.group.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(m.inner), hgt = Math.max(0.3, box.max.y - box.min.y);
    this.avScale = m.scale * A3_H / hgt; m.group.scale.setScalar(this.avScale); m.group.updateMatrixWorld(true);
    this.measure();
    // Mains lumineuses
    this.glowTex = this.glowTex || this.dotTex();
    this.glows = [0, 1].map(() => { const s = new T.Sprite(new T.SpriteMaterial({ map: this.glowTex, color: '#ffd166', blending: T.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(0.55); scene.add(s); return s; });
    // Lumières : ciel + soleil (ombres si la qualité le permet)
    this.hemi = new T.HemisphereLight('#fff4e0', '#5b4e8c', 1.15); scene.add(this.hemi);
    this.sun = new T.DirectionalLight('#fff1d6', 1.5); this.sun.position.set(-4, 9, 7);
    if (S.Q && S.Q.shadows) { this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024); Object.assign(this.sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -6, near: 1, far: 40 }); this.sun.shadow.bias = -0.0005; }
    scene.add(this.sun, this.sun.target);
    this.anims = [];
    this['room_' + this.cfg.room](scene);
    const init = this['init3_' + game]; if (init) init.call(this, scene);
    return true;
  }
  end() {
    for (const g of this.own || []) g.dispose && g.dispose();
    if (this.ropeMesh) { this.ropeMesh.geometry.dispose(); this.ropeMesh = null; }
    this.scene = null; this.av = null; this.parts = []; this.objs = new Map(); this.own = [];
  }

  // Mesures du petit sorcier debout (épaules, hanches, tête, longueur des bras et des jambes)
  measure() {
    const T = this.T, r = this.av.human, b = r.bones, g = this.av.group;
    g.updateMatrixWorld(true);
    const wp = (o) => (o ? o.getWorldPosition(new T.Vector3()) : null);
    const sL = wp(b['arm-left']), sR = wp(b['arm-right']), hL = wp(b['leg-left']), hR = wp(b['leg-right']), head = wp(b.head);
    const hand = this.handPos('arm-left');
    const M = this.M = {};
    M.shY = sL ? (sL.y + sR.y) / 2 : A3_H * 0.5; M.shW = sL ? Math.abs(sL.x - sR.x) / 2 : 0.25;
    M.hipY = hL ? (hL.y + hR.y) / 2 : A3_H * 0.3; M.hipW = hL ? Math.abs(hL.x - hR.x) / 2 : 0.15;
    const hb = head ? head.y : M.shY + 0.1; M.headR = Math.max(0.25, (A3_H - hb) / 2); M.headY = A3_H - M.headR;
    M.arm = sL && hand ? sL.distanceTo(hand) * 1.08 : 0.6; M.leg = M.hipY;
    M.side = 0.95; // (pas de côté : décalage du petit sorcier)
  }
  handPos(n) {
    const T = this.T, r = this.av.human, b = r.bones[n]; if (!b) return null;
    const hb = r.kay && (n === 'arm-left' ? r.bones.handL : r.bones.handR);
    return hb ? hb.getWorldPosition(new T.Vector3()) : b.localToWorld(new T.Vector3(HUMAN_AXIS[n][0] * HUMAN_HAND, 0, 0));
  }

  // ---------- Petits outils
  mat(c, o) { return this.S.lam(c, o); }
  add(parent, geo, c, x, y, z, sx = 1, sy = sx, sz = sx, o) {
    const T = this.T, m = new T.Mesh(geo, o && o.basic ? new T.MeshBasicMaterial({ color: c, ...o.basic }) : this.mat(c, o));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = !!(o && o.shadow); m.receiveShadow = true; parent.add(m); return m;
  }
  geo(g) { this.own.push(g); return g; }
  get G() {
    const T = this.T;
    if (!this._G) this._G = { box: new T.BoxGeometry(1, 1, 1), ball: new T.SphereGeometry(1, 20, 14), cyl: new T.CylinderGeometry(1, 1, 1, 24), cone: new T.ConeGeometry(1, 1, 20), plane: new T.PlaneGeometry(1, 1), torus: new T.TorusGeometry(1, 0.1, 10, 40) };
    return this._G;
  }
  model(key, h, x, y, z, ry = 0, parent = this.scene) {
    const m = this.S.P.model(key); if (!m) return null;
    const T = this.T, sz = new T.Box3().setFromObject(m).getSize(new T.Vector3());
    m.scale.multiplyScalar(h / Math.max(0.01, sz.y)); m.position.set(x, y, z); m.rotation.y = ry;
    const cast = parent !== this.scene || h < 1.6; m.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = true; } }); parent.add(m); return m;
  }
  tex(w, h, draw, rx = 1, ry = 1) {
    const T = this.T, c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    if (rx !== 1 || ry !== 1) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); }
    this.own.push(t); return t;
  }
  dotTex() {
    const T = this.T, c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); return t;
  }
  emoTex(ch) {
    this.emoCache = this.emoCache || new Map();
    if (!this.emoCache.has(ch)) {
      const T = this.T, c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d'); x.font = '100px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 72);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; this.emoCache.set(ch, t);
    }
    return this.emoCache.get(ch);
  }
  emo(ch, size) { const T = this.T, s = new T.Sprite(new T.SpriteMaterial({ map: this.emoTex(ch), depthWrite: false, transparent: true })); s.scale.set(size, size, 1); return s; }
  sky(scene, stops) {
    scene.background = this.tex(2, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach(([k, c]) => g.addColorStop(k, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  }
  glowMat(c, op = 1, shared = false) {
    if (shared) { this.gm = this.gm || new Map(); const k = c + op; if (!this.gm.has(k)) this.gm.set(k, this.glowMat(c, op)); return this.gm.get(k); }
    return new this.T.SpriteMaterial({ map: this.glowTex, color: c, blending: this.T.AdditiveBlending, depthWrite: false, transparent: true, opacity: op });
  }
  glow(c, size, op = 1) { const s = new this.T.Sprite(this.glowMat(c, op)); s.scale.setScalar(size); return s; }

  // Petites particules 3D : étincelles (sprites lumineux) ou morceaux (neige, briques)
  burst(pos, n = 24, opts = {}) {
    const T = this.T, cols = opts.cols || ['#ffd166', '#ff70a6', '#ffffff', '#7bdff2', '#b8f2a1'], now = performance.now();
    if (this.parts.length > 260) n = Math.min(n, 4); // (déjà beaucoup d'étincelles : on reste léger)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * Math.PI * 0.6, sp = (opts.speed || 3) * (0.4 + Math.random() * 0.8);
      let o;
      if (opts.chunk) { o = new T.Mesh(opts.chunk === 'box' ? this.G.box : this.G.ball, this.mat(cols[i % cols.length])); o.scale.setScalar((opts.size || 0.12) * (0.6 + Math.random() * 0.8)); o.castShadow = true; }
      else { o = new T.Sprite(this.glowMat(cols[i % cols.length], 1, true)); o.scale.setScalar((opts.size || 0.22) * (0.6 + Math.random() * 0.8)); }
      o.position.copy(pos); this.scene.add(o);
      this.parts.push({ o, v: new T.Vector3(Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + (opts.up || 1.5), Math.sin(a) * Math.cos(e) * sp * 0.6), t0: now, life: opts.life || 900, g: opts.grav ?? 4, s0: o.scale.x, spin: opts.chunk ? (Math.random() - 0.5) * 12 : 0 });
    }
  }
  updateParts(now, dt) {
    this.parts = this.parts.filter((p) => {
      const k = (now - p.t0) / p.life;
      if (k >= 1) { this.scene.remove(p.o); return false; }
      p.v.y -= p.g * dt; p.o.position.addScaledVector(p.v, dt);
      if (p.o.position.y < 0.02 && p.spin) { p.o.position.y = 0.02; p.v.multiplyScalar(0.5); p.v.y = Math.abs(p.v.y) * 0.3; }
      if (p.spin) { p.o.rotation.x += p.spin * dt; p.o.rotation.z += p.spin * dt * 0.7; }
      const s = p.s0 * (p.o.isSprite ? 1 - k : Math.min(1, (1 - k) * 3)); p.o.scale.setScalar(Math.max(0.001, s));
      return true;
    });
  }

  // ---------- Écran <-> 3D (pixels du calque d'arena.js)
  toScreen(v) { const p = v.clone().project(this.cam); return { x: (p.x + 1) / 2 * this.A.W, y: (1 - p.y) / 2 * this.A.H, v: 1, z: p.z }; }
  toWorld(px, py, z0 = 0) {
    const T = this.T, o = this.cam.position.clone(), d = new T.Vector3(px / this.A.W * 2 - 1, 1 - py / this.A.H * 2, 0.5).unproject(this.cam).sub(o);
    return o.addScaledVector(d, (z0 - o.z) / (Math.abs(d.z) < 1e-6 ? -1e-6 : d.z));
  }
  ppu(z0 = 0) { return this.A.H / (2 * Math.max(0.5, this.cam.position.z - z0) * Math.tan((this.cam.fov * Math.PI) / 360)); } // (pixels par unité, à la profondeur z0)

  // ---------- Caméra : de face, à hauteur d'enfant (le petit sorcier prend la moitié de l'écran)
  camFront(x = 0, lookX = x, dist = 5.6) { this.camTo(x, 1.3, dist, lookX, 1.05, 0, 40); }
  camTo(x, y, z, lx, ly, lz, fov, k = 1) {
    const c = this.cam, A = this.A;
    this.camP = this.camP || new this.T.Vector3(x, y, z); this.camL = this.camL || new this.T.Vector3(lx, ly, lz);
    this.camP.lerp(new this.T.Vector3(x, y, z), k); this.camL.lerp(new this.T.Vector3(lx, ly, lz), k);
    c.position.copy(this.camP); c.lookAt(this.camL);
    const asp = A.W / A.H; if (Math.abs(c.aspect - asp) > 0.001 || c.fov !== fov) { c.aspect = asp; c.fov = fov; c.updateProjectionMatrix(); }
    c.updateMatrixWorld(true);
  }

  // ---------- Le petit sorcier : animation (clip) + bras / jambes visés (directions du joueur, repère de l'écran en miroir)
  poseAvatar(now, P) {
    const S = this.S, m = this.av, r = m.human, fake = { lane: 0, y: 0, holdPose: null };
    const save = S.heroY3, mir = S.mirror, gp = S.ghostPose; S.heroY3 = () => 0; S.mirror = false; S.ghostPose = null;
    try { S.applyHumanPose(fake, m, P.clip || 'idle', now); } finally { S.heroY3 = save; S.mirror = mir; S.ghostPose = gp; }
    m.inner.rotation.y = 0;
    m.group.position.set(P.x || 0, P.y || 0, P.z || 0); m.group.rotation.set(0, P.ry ?? Math.PI, P.rz || 0); m.group.scale.setScalar(this.avScale);
    if (P.limbs) {
      if (!r.kay) for (const n of ['arm-left', 'arm-right']) if (r.bones[n]) r.bones[n].scale.set(1.08, 1, 1);
      m.group.updateMatrixWorld(true);
      for (const [k, d] of Object.entries(P.limbs)) {
        if (!d) continue;
        const n = P.facing === false ? k : a3swap(k), bone = r.bones[n]; if (!bone) continue; // (de face, en miroir : le bras gauche de l'enfant est le bras droit du sorcier)
        S.aimBone(bone, r.kay ? r.child[n] : null, d.length === 3 ? d : [d[0], d[1], 0.18], m.inner, HUMAN_AXIS[n]);
        if (r.kay && r.child[n]) r.child[n].quaternion.identity();
        // (mouvement doux : le bras rejoint la position de l'enfant en une fraction de seconde, sans tremblote)
        const prev = this.boneQ.get(n);
        if (prev && P.smooth !== false) bone.quaternion.copy(prev.slerp(bone.quaternion, 0.5));
        this.boneQ.set(n, bone.quaternion.clone());
      }
    }
    // tête : regarde ce qui se passe (Grimaud, la chouette, le chaudron…)
    if (P.look && r.bones.head) {
      m.group.updateMatrixWorld(true);
      const hp = r.bones.head.getWorldPosition(new this.T.Vector3()), d = P.look.clone().sub(hp), fy = m.group.rotation.y;
      const yaw = Math.atan2(d.x, d.z) - fy, yw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      this.headYaw = (this.headYaw || 0) + (Math.max(-0.6, Math.min(0.6, yw)) - (this.headYaw || 0)) * 0.15;
      r.bones.head.rotateY(this.headYaw);
    }
    for (const a of m.anims || []) a(now);
    m.group.updateMatrixWorld(true);
  }
  shift(d) { for (const k of ['shakeT', 'punchT', 'reactT', 'landT']) if (this[k]) this[k] += d; }
  // Réactions : petite secousse de caméra, « coup » de zoom, le sorcier réagit (joie / aïe)
  shake(a = 0.08, ms = 300) { this.shakeT = performance.now(); this.shakeA = a; this.shakeMs = ms; }
  punch() { this.punchT = performance.now(); }
  react(kind) { this.reactT = performance.now(); this.reactKind = kind; if (kind === 'win') { this.punch(); this.shake(0.04, 200); } if (kind === 'hurt') this.shake(0.18, 400); }

  // Le corps vu à l'écran (comme arena.body) : directions des membres du joueur (ou du sorcier au clavier) -> petit sorcier 3D
  body(A, now, st) {
    const b = tracker.bodies[0], real = !tracker.sim && b && b.lm && b.state.present, M = this.M;
    let limbs;
    let unit = 1; // (longueur d'un torse, dans l'unité des directions)
    if (real) { limbs = A.g.limbsOf(b, 0); unit = b.T || 0.25; const w3 = this.worldLimbs(b); if (w3) limbs = { ...limbs, ...w3 }; }
    else { // (clavier / enfant imaginaire : la forme du petit sorcier dessiné, en directions)
      const G = A.simShape(now, st), d = (a, z) => (G[a] && G[z] ? [-(G[z][0] - G[a][0]), -(G[z][1] - G[a][1])] : null);
      limbs = { 'arm-left': d('sL', 'wL'), 'arm-right': d('sR', 'wR'), 'leg-left': st.squat ? null : d('hL', 'aL'), 'leg-right': st.squat ? null : d('hR', 'aR') };
    }
    // Profondeur des bras : un bras qui paraît court à l'écran est tendu vers la caméra (mains jointes, bras devant soi)
    if (limbs) for (const k of ['arm-left', 'arm-right']) {
      const d = limbs[k]; if (!d || d.length === 3) continue; // (direction 3D déjà connue)
      const l = Math.min(1, Math.hypot(d[0], d[1]) / (1.05 * unit)), n = Math.hypot(d[0], d[1]) || 1;
      const z = l > 0.88 ? 0.1 : Math.max(0.1, Math.sqrt(1 - l * l)); limbs[k] = [d[0] / n * l, d[1] / n * l, z];
    }
    // jambes : genou levé vers la caméra (flamant) ; au clavier, la jambe droite se lève
    if (limbs) for (const k of ['leg-left', 'leg-right']) {
      const d = limbs[k]; if (!d || d.length === 3) continue;
      const l = Math.min(1, Math.hypot(d[0], d[1]) / (1.5 * unit)), n = Math.hypot(d[0], d[1]) || 1;
      limbs[k] = [d[0] / n * l, d[1] / n * l, l > 0.8 ? 0.04 : Math.sqrt(1 - l * l)];
    }
    if (limbs && !real && st.flamingo) limbs['leg-right'] = [0.05, -0.35, 0.95];
    if (limbs && st.squat) { limbs['leg-left'] = null; limbs['leg-right'] = null; }
    // pas de côté (vrai joueur : décalage du corps depuis le calibrage), saut
    let side = st.side === 'left' ? -1 : st.side === 'right' ? 1 : 0;
    if (real && b.calib && b.center && b.T) side = Math.max(-1, Math.min(1, -((b.center.x - b.calib.cx) * camXS()) / (b.T * 0.7)));
    this.sideK = (this.sideK ?? side) + (side - (this.sideK ?? side)) * 0.25;
    const jk = A.lastJump && now - A.lastJump < 450 ? Math.sin(((now - A.lastJump) / 450) * Math.PI) : 0;
    if (jk === 0 && this.wasJump) this.landT = now; this.wasJump = jk > 0;
    const react = now - this.reactT < 700 ? this.reactKind : null;
    const P = { limbs, clip: st.squat ? 'duck' : react === 'win' ? 'happy' : react === 'hurt' ? 'bump' : 'idle', x: this.sideK * M.side, y: jk * 0.55 + Math.sin(now / 650) * 0.012, ry: Math.PI };
    // penché dans le sens du pas de côté
    this.lean += ((this.prevSide - this.sideK) * 6 - this.lean) * 0.2; this.prevSide = this.sideK; P.rz = Math.max(-0.2, Math.min(0.2, this.lean));
    const over = this['pose3_' + this.game]; if (over) over.call(this, P, A.st, now, st);
    if (A.outro) { // célébration : bras en V et petits sauts (ou épaules qui tombent)
      const k = now - A.outro.t0, good = A.outro.ratio >= 0.5;
      P.clip = good ? 'happy' : 'idle';
      if (!this.cfg.back || this.game === 'soleil') { P.limbs = good ? { 'arm-left': [-0.55, 1, 0.25], 'arm-right': [0.55, 1, 0.25] } : { 'arm-left': [-0.2, -1, 0.2], 'arm-right': [0.2, -1, 0.2] }; P.facing = P.facing ?? true; }
      if (good) P.y = (this.game === 'balai' ? P.y : 0) + Math.abs(Math.sin(k / 160)) * 0.35;
      if (this.game === 'soleil') { P.ry = Math.min(1, k / 600) * Math.PI; P.facing = true; } // (se retourne vers nous)
      if (good && Math.floor(k / 280) !== this.confN) { this.confN = Math.floor(k / 280); this.burst(new this.T.Vector3(P.x + (Math.random() - 0.5) * 3, (P.y || 0) + 3.2, (P.z || 0) + 0.5), 18, { cols: ['#ffd166', '#ff70a6', '#7bdff2', '#b8f2a1', '#c77dff'], chunk: 'box', size: 0.07, speed: 2.5, grav: 3, life: 1600 }); }
    }
    if (now - this.landT < 160) { const q = (now - this.landT) / 160; this.squash = 1 - Math.sin(q * Math.PI) * 0.12; } else this.squash = 1;
    this.P = P;
    this.poseAvatar(now, P);
    if (this.squash !== 1) this.av.group.scale.set(this.avScale * (2 - this.squash), this.avScale * this.squash, this.avScale * (2 - this.squash));
    if (P.hide) { this.av.group.visible = false; } else this.av.group.visible = true;
    // Points du corps à l'écran (gauche / droite = celles de l'enfant ; de face, c'est le côté opposé du sorcier)
    const T = this.T, r = this.av.human, sw = P.facing === false ? (k) => k : a3swap;
    const wp = (n) => { const o = r.bones[n]; return o ? this.toScreen(o.getWorldPosition(new T.Vector3())) : null; };
    const hs = (n) => { const v = this.handPos(n); return v ? this.toScreen(v) : null; };
    const J = { sL: wp(sw('arm-left')), sR: wp(sw('arm-right')), hL: wp(sw('leg-left')), hR: wp(sw('leg-right')), handL: hs(sw('arm-left')), handR: hs(sw('arm-right')) };
    const head = r.bones.head ? r.bones.head.getWorldPosition(new T.Vector3()) : null;
    J.nose = head ? this.toScreen(head.add(new T.Vector3(0, M.headR * 0.8, 0))) : J.sL;
    const sh = J.sL && J.sR ? { x: (J.sL.x + J.sR.x) / 2, y: (J.sL.y + J.sR.y) / 2 } : { x: A.W / 2, y: A.H / 2 };
    // (unité des règles : comme le torse du petit sorcier dessiné, calée sur la longueur des bras)
    const Tpx = (M.arm / 1.1) * this.ppu(this.av.group.position.z);
    // Mains magiques : là où l'enfant tend VRAIMENT la main (vecteur épaule -> main, à l'échelle du jeu), au bout du bras du
    // sorcier ; c'est avec elles qu'on touche. Les bras du sorcier sont courts : sans ça, impossible d'atteindre les objets.
    this.avHand3 = [this.handPos(sw('arm-left')), this.handPos(sw('arm-right'))];
    const vec = this.handVecs(A, now, st, b, real); this.lastVec = vec; // (aussi vu de dos : l'échauffement en a besoin)
    if (!this.cfg.back) {
      const k = A3_REACH / ((b && b.reachK) || (real ? 1.1 : 1));
      [['handL', 'sL', 0], ['handR', 'sR', 1]].forEach(([hk, sk, i]) => {
        const v = vec[i], s0 = J[sk]; if (!v || !s0) { J[hk] = null; return; }
        // (un peu d'avance sur le mouvement : la main magique paraît moins en retard)
        const pv = this.prevVec && this.prevVec[i], lead = real && pv ? 0.6 : 0;
        const vx = v[0] + (pv ? (v[0] - pv[0]) * lead : 0), vy = v[1] + (pv ? (v[1] - pv[1]) * lead : 0);
        J[hk] = { x: s0.x + vx * Tpx * k, y: s0.y + vy * Tpx * k, v: 1 };
      });
      this.prevVec = vec;
      this.setHands(J);
    } else this.hand3 = this.avHand3;
    J.wL = J.handL; J.wR = J.handR;
    if (DEV.get('a3dbg')) document.title = 'A3 ' + JSON.stringify({ M, Tpx: Math.round(Tpx), sh: [Math.round(J.sL.x), Math.round(J.sR.x), Math.round(J.sL.y)], hand: J.handL && [Math.round(J.handL.x), Math.round(J.handL.y)], head: [Math.round(J.nose.x), Math.round(J.nose.y)], W: A.W, H: A.H, fps: Math.round(1000 / (this.S.frameMs || 16)) });
    return { J, sh, T: Tpx, st, motion: real ? b.motion || 0 : st.wave ? 0.08 : 0, real: !!real };
  }

  setHands(J) { this.hand3 = [J.handL, J.handR].map((h) => (h ? this.toWorld(h.x, h.y, 0.45) : null)); }
  // Directions 3D des membres (points du monde de MediaPipe, en mètres) : x vers la droite de l'écran en miroir, y en haut,
  // z vers la caméra. Bien plus juste que de deviner la profondeur à partir de la longueur à l'écran.
  worldLimbs(b) {
    const w = b.wlm, lm = b.lm; if (!w || !lm || w.length < 29) return null;
    const vis = (k) => (lm[k].visibility ?? 1) > 0.4;
    const dir = (a, z, z2) => {
      const e = vis(z) ? z : vis(z2) ? z2 : null; if (!vis(a) || e == null) return null;
      const v = [-(w[e].x - w[a].x), -(w[e].y - w[a].y), -(w[e].z - w[a].z)], n = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / n, v[1] / n, Math.max(-0.35, v[2] / n)];
    };
    const out = { 'arm-left': dir(11, 15, 13), 'arm-right': dir(12, 16, 14) };
    if (tracker.mode !== 'upper') { out['leg-left'] = dir(23, 27, 25); out['leg-right'] = dir(24, 28, 26); }
    for (const k of Object.keys(out)) if (!out[k]) delete out[k];
    return out;
  }
  // Vecteur épaule -> main de l'enfant (en longueurs de torse, x vers la droite de l'écran en miroir, y vers le bas)
  handVecs(A, now, st, b, real) {
    if (real) {
      const lm = b.lm, T = b.T || 0.25, vis = (k) => (lm[k].visibility ?? 1);
      return [[11, 15, 19], [12, 16, 20]].map(([s0, w, f]) => {
        const i = vis(f) > vis(w) ? f : w; if (vis(i) < 0.35 || vis(s0) < 0.3) return null;
        return [-(lm[i].x - lm[s0].x) * camAspect() / T, (lm[i].y - lm[s0].y) / T];
      });
    }
    const G = A.simShape(now, st);
    return [['sL', 'wL'], ['sR', 'wR']].map(([a, z]) => [-(G[z][0] - G[a][0]), G[z][1] - G[a][1]]);
  }
  // Rayon magique entre la main du sorcier et sa main magique
  beams(now) {
    const T = this.T;
    if (!this.beamM) {
      this.beamGeo = this.geo(new T.CylinderGeometry(1, 1, 1, 6, 1, true));
      this.beamM = [0, 1].map(() => { const m = new T.Mesh(this.beamGeo, new T.MeshBasicMaterial({ color: '#ffe8a3', transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false })); m.userData.noOutline = true; this.scene.add(m); return m; });
    }
    this.beamM.forEach((m, i) => {
      const a = this.avHand3 && this.avHand3[i], b = this.hand3 && this.hand3[i], B = this.A.B, hs = B && B.J && (i ? B.J.handR : B.J.handL);
      const low = hs && B.J.hL && hs.y > B.J.hL.y; // (bras baissé : pas de rayon, il traverserait le sol)
      m.visible = !!(a && b && !this.cfg.back && !low); if (!m.visible) return;
      const d = b.clone().sub(a), L = d.length(); if (L < 0.05) { m.visible = false; return; }
      m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(0.035, L, 0.035);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); m.material.opacity = 0.35 + 0.15 * Math.sin(now / 90 + i);
    });
  }

  // ---------- Image
  render(A, now) {
    const S = this.S, dt = Math.min(0.1, Math.max(0, (now - this.lastT) / 1000)); this.lastT = now;
    if (S.cv3 && S.cv3.style.display !== 'block') S.cv3.style.display = 'block';
    if (S.ctx) S.ctx.clearRect(0, 0, S.W, S.H); // (calque du chemin : vide)
    const B = A.B;
    const cam = this['cam3_' + this.game]; if (cam) cam.call(this, A.st, now); else this.camFront(this.av.group.position.x * 0.35);
    this.camFx(A, now);
    const sync = this['sync3_' + this.game]; if (sync) sync.call(this, A.st, now, dt, B);
    // mains lumineuses (pas pendant le balai ni la course vers le nuage : on voit le sorcier de dos)
    const showGlow = !this.cfg.back && B && this.hand3;
    const hipY = B && B.J && B.J.hL ? B.J.hL.y : this.A.H;
    this.glows.forEach((g, i) => {
      const h = showGlow && this.hand3[i], hs = B && B.J && (i ? B.J.handR : B.J.handL); g.visible = !!h; if (!h) return;
      const low = hs && hs.y > hipY; g.visible = !low; if (low) return; g.position.copy(h); g.scale.setScalar(0.6 + 0.06 * Math.sin(now / 120 + i));
    });
    if (showGlow) this.beams(now); else if (this.beamM) this.beamM.forEach((m) => (m.visible = false));
    if (showGlow && Math.random() < 0.2) { const h = this.hand3[Math.random() < 0.5 ? 0 : 1]; if (h) this.burst(h, 1, { cols: ['#fff3b0', '#ffd166'], speed: 0.4, up: 0.6, grav: -0.5, size: 0.1, life: 600 }); }
    // Fluidité : si les images arrivent trop lentement, on coupe les effets d'image, puis on baisse la qualité du jeu
    this.ft = (this.ft || 16) * 0.92 + Math.min(100, dt * 1000) * 0.08;
    if (!A.intro && now - (this.qCheck || (this.qCheck = now)) > 2500) {
      if (this.ft > 26) { if (!this.noFx && S.Q && S.Q.fx) { this.noFx = true; console.info('Jeux miroir : effets d\'image coupés'); } else if (S.qualityAuto) { const nx = QUALITY_ORDER[QUALITY_ORDER.indexOf(S.quality) + 1]; if (nx) { S.setQuality(nx); if (this.sun) this.sun.castShadow = !!S.Q.shadows; } } }
      this.qCheck = now;
    }
    S.frameMs = this.ft;
    for (const a of this.anims) a(now, dt);
    this.updateParts(now, dt);
    // effets d'image du jeu (trait d'encre, halo lumineux, couleurs) si le PC suit ; sinon contours simples
    const fx = !this.noFx && S.composer && S.renderPass && S.Q && S.Q.fx && (typeof store !== 'function' || store('effects') !== false);
    if (fx) {
      const rp = S.renderPass, oc = rp.camera; rp.scene = this.scene; rp.camera = this.cam; if (S.outlineMat) S.outlineMat.visible = false;
      try { S.composer.render(); } finally { rp.camera = oc; }
    } else { if (S.outlineMat) S.outlineMat.visible = true; S.renderer.render(this.scene, this.cam); }
  }
  // Caméra : survol du décor à l'entrée, plan rapproché à la fin, secousses et coups de zoom
  camFx(A, now) {
    const T = this.T, c = this.cam, av = this.av.group.position;
    if (A.intro && !A.cal) {
      const k = Math.min(1, (now - A.intro.t0) / 1900), e = k * k * (3 - 2 * k), ang = (1 - e) * 0.7;
      const base = c.position.clone(), look = this.camL.clone(), rel = base.clone().sub(look);
      const r = rel.length() * (1 + (1 - e) * 0.7), from = new T.Vector3(Math.sin(ang) * r, rel.y + (1 - e) * 3.5, Math.cos(ang) * r);
      c.position.copy(look.clone().add(from)); c.lookAt(look);
    }
    if (A.outro) { // la caméra vient devant le sorcier
      const k = Math.min(1, (now - A.outro.t0) / 1200), e = k * k * (3 - 2 * k), fy = this.av.group.rotation.y;
      const fwd = new T.Vector3(-Math.sin(fy), 0, -Math.cos(fy)), tgt = av.clone().add(fwd.multiplyScalar(5.2)).add(new T.Vector3(0.7, 1.7, 0));
      const look = av.clone().add(new T.Vector3(0, 1.75, 0));
      this.outCam = this.outCam || c.position.clone();
      c.position.copy(this.outCam.clone().lerp(tgt, e)); c.lookAt(this.camL.clone().lerp(look, e));
    } else this.outCam = null;
    const ks = (now - this.shakeT) / (this.shakeMs || 300);
    if (this.shakeT && ks < 1) { const a = (this.shakeA || 0.08) * (1 - ks); c.position.x += Math.sin(now * 0.09) * a; c.position.y += Math.cos(now * 0.11) * a * 0.7; }
    const kp = (now - this.punchT) / 260, fov0 = c.fov;
    if (this.punchT && kp < 1) { c.fov = fov0 - Math.sin(kp * Math.PI) * 3; c.updateProjectionMatrix(); c.fov = fov0; this.fovDirty = true; }
    else if (this.fovDirty) { c.updateProjectionMatrix(); this.fovDirty = false; }
    c.updateMatrixWorld(true);
  }

  // ======================= Décors =======================
  floor(scene, c, size, texDraw, rep = 8) {
    const map = texDraw ? this.tex(256, 256, texDraw, rep, rep) : null;
    const f = new this.T.Mesh(this.geo(new this.T.PlaneGeometry(size, size)), this.mat(c, map ? { map } : {}));
    f.rotation.x = -Math.PI / 2; f.receiveShadow = true; f.userData.noOutline = true; scene.add(f); return f;
  }
  stoneTex(base = '#6d6487', line = '#3d3456') {
    return (x, w, h) => {
      x.fillStyle = base; x.fillRect(0, 0, w, h);
      const rows = 4, bh = h / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) {
        const bw = w / 3, bx = c * bw + (r % 2) * bw / 2;
        x.fillStyle = `hsl(${255 + Math.random() * 15}, ${12 + Math.random() * 8}%, ${38 + Math.random() * 10}%)`;
        for (const ox of [0, -w]) x.fillRect(bx + ox + 3, r * bh + 3, bw - 6, bh - 6);
      }
      x.strokeStyle = line; x.lineWidth = 4;
      for (let r = 0; r <= rows; r++) { x.beginPath(); x.moveTo(0, r * bh); x.lineTo(w, r * bh); x.stroke(); }
    };
  }
  // Grande salle de l'Académie : dallage, murs de pierre, fenêtres en ogive (nuit étoilée), piliers, torches, bougies qui flottent
  room_hall(scene, o = {}) {
    const T = this.T, G = this.G, back = o.back ?? -9;
    this.sky(scene, [[0, '#1b1440'], [1, '#3c2a6e']]);
    scene.fog = new T.Fog('#2a1f55', o.fogNear || 14, o.fogFar || 34);
    this.hemi.color.set('#ffe7c4'); this.hemi.groundColor.set('#3c2a5a'); this.hemi.intensity = 0.95;
    this.floor(scene, '#ffffff', 80, (x, w, h) => {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#8a7fa8' : '#a99fc4'; x.fillRect(i * w / 2, j * h / 2, w / 2, h / 2); }
      x.strokeStyle = '#5b5078'; x.lineWidth = 6; x.strokeRect(0, 0, w, h); x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
    }, 40);
    // tapis rouge bordé d'or jusqu'au fond
    const carpet = this.tex(64, 256, (x, w, h) => { x.fillStyle = '#9d0208'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd166'; x.fillRect(0, 0, 6, h); x.fillRect(w - 6, 0, 6, h); x.fillStyle = 'rgba(255,209,102,.35)'; for (let y = 16; y < h; y += 64) { x.beginPath(); x.moveTo(w / 2, y); x.lineTo(w / 2 + 10, y + 16); x.lineTo(w / 2, y + 32); x.lineTo(w / 2 - 10, y + 16); x.fill(); } }, 1, 6);
    const cp = new T.Mesh(this.geo(new T.PlaneGeometry(2.6, Math.abs(back) + 6)), this.mat('#ffffff', { map: carpet, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); cp.rotation.x = -Math.PI / 2; cp.position.set(0, 0.02, (back + 4) / 2); cp.receiveShadow = true; cp.userData.noOutline = true; scene.add(cp);
    // mur du fond, fenêtres, bannière de l'Académie
    const wallMap = this.tex(256, 256, this.stoneTex(), 10, 3);
    const wall = this.add(scene, G.box, '#ffffff', 0, 6, back, 60, 12, 0.6, { map: wallMap }); wall.userData.noOutline = true;
    const winTex = this.tex(128, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1d2b64'); g.addColorStop(1, '#6a5acd'); x.fillStyle = g;
      x.beginPath(); x.moveTo(0, h); x.lineTo(0, w / 2); x.arc(w / 2, w / 2, w / 2, Math.PI, 0); x.lineTo(w, h); x.fill();
      x.fillStyle = '#fff'; for (let i = 0; i < 18; i++) { x.globalAlpha = 0.4 + Math.random() * 0.6; x.fillRect(Math.random() * w, w * 0.3 + Math.random() * (h - w * 0.3), 2, 2); }
      x.globalAlpha = 1; x.fillStyle = '#fff6c9'; x.beginPath(); x.arc(w * 0.7, w * 0.55, 12, 0, 7); x.fill();
      x.strokeStyle = '#2b2350'; x.lineWidth = 6; x.beginPath(); x.moveTo(w / 2, 10); x.lineTo(w / 2, h); x.moveTo(0, h * 0.55); x.lineTo(w, h * 0.55); x.stroke();
    });
    for (const wx of o.windows || [-7.5, -4, 4, 7.5]) {
      const p = new T.Mesh(G.plane, new T.MeshBasicMaterial({ map: winTex, transparent: true })); p.scale.set(1.8, 3.6, 1); p.position.set(wx, 4.6, back + 0.4); p.userData.noOutline = true; scene.add(p);
      const light = this.glow('#7b8cff', 4, 0.25); light.position.set(wx, 4.6, back + 0.7); scene.add(light);
    }
    if (o.banner !== false) {
      const ban = this.tex(128, 256, (x, w, h) => {
        x.fillStyle = '#5a189a'; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, h * 0.85); x.lineTo(w / 2, h); x.lineTo(0, h * 0.85); x.fill();
        x.strokeStyle = '#ffd166'; x.lineWidth = 8; x.stroke(); x.font = '70px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('⭐', w / 2, h * 0.42);
      });
      for (const bx of o.banners || [0]) { const p = new T.Mesh(G.plane, new T.MeshBasicMaterial({ map: ban, transparent: true })); p.scale.set(1.5, 3, 1); p.position.set(bx, 6.4, back + 0.45); scene.add(p); }
    }
    // piliers et torches
    const pil = o.pillars || [[-4.6, -3.2], [4.6, -3.2], [-6.8, back + 1.4], [6.8, back + 1.4]];
    const torches = [];
    for (const [px, pz] of pil) {
      this.add(scene, G.cyl, '#8f86ad', px, 3.5, pz, 0.42, 7, 0.42); this.add(scene, G.box, '#6d6487', px, 0.25, pz, 1.1, 0.5, 1.1); this.add(scene, G.box, '#6d6487', px, 7, pz, 1.1, 0.4, 1.1);
      const tx = px + (px < 0 ? 0.5 : -0.5);
      this.add(scene, G.cyl, '#5d4037', tx, 2.6, pz + 0.2, 0.06, 0.6, 0.06);
      const fl = this.add(scene, G.cone, '#ffb703', tx, 3.05, pz + 0.2, 0.14, 0.38, 0.14, { basic: {} }); fl.castShadow = false;
      const gl = this.glow('#ff9f1c', 1.4, 0.9); gl.position.set(tx, 3.05, pz + 0.2); scene.add(gl);
      torches.push({ fl, gl });
    }
    if (o.torchLight !== false) {
      this.anims.push((now) => { for (const t of torches) { const k = 1 + Math.sin(now / 70 + t.fl.position.x) * 0.12; t.fl.scale.set(0.14 * k, 0.38 / k + 0.04, 0.14 * k); t.gl.material.opacity = 0.75 + 0.2 * Math.sin(now / 55 + t.fl.position.x); } });
    }
    // bougies qui flottent
    const candles = [];
    for (let i = 0; i < (o.candles ?? 14); i++) {
      const g = new T.Group(), x = (Math.random() - 0.5) * 15, z = back + 1 + Math.random() * (Math.min(-2, o.candleFront ?? -2) - back - 1);
      this.add(g, G.cyl, '#fff8e7', 0, 0, 0, 0.06, 0.32, 0.06); const f = this.glow('#ffd166', 0.35); f.position.y = 0.24; g.add(f);
      g.position.set(x, 4 + Math.random() * 2.2, z); scene.add(g); candles.push({ g, y: g.position.y, p: Math.random() * 6 });
    }
    this.anims.push((now) => { for (const c of candles) c.g.position.y = c.y + Math.sin(now / 900 + c.p) * 0.12; });
    this.dust(scene, '#ffe8a3', 70, [-8, 8], [0.3, 6], [back + 1, 3]);
  }
  // Poussière dorée qui flotte (ou neige, ou étoiles)
  dust(scene, col, n, X, Y, Z, fall = 0) {
    const T = this.T, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = X[0] + Math.random() * (X[1] - X[0]); pos[i * 3 + 1] = Y[0] + Math.random() * (Y[1] - Y[0]); pos[i * 3 + 2] = Z[0] + Math.random() * (Z[1] - Z[0]); }
    const g = this.geo(new T.BufferGeometry()); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const p = new T.Points(g, new T.PointsMaterial({ color: col, size: fall ? 0.09 : 0.05, map: this.glowTex, transparent: true, depthWrite: false, blending: fall ? T.NormalBlending : T.AdditiveBlending }));
    scene.add(p);
    this.anims.push((now, dt) => {
      const a = g.attributes.position;
      for (let i = 0; i < n; i++) {
        let y = a.getY(i) - (fall ? fall * dt * (0.6 + (i % 5) * 0.12) : 0) + (fall ? 0 : Math.sin(now / 1500 + i) * 0.002);
        if (y < Y[0]) y = Y[1];
        a.setY(i, y); if (fall) a.setX(i, a.getX(i) + Math.sin(now / 800 + i) * 0.004);
      }
      a.needsUpdate = true;
    });
    return p;
  }
  room_corridor(scene) { // (le mur magique arrive du fond d'un long couloir)
    const pil = []; for (let z = -2; z > -40; z -= 6) pil.push([-4.4, z], [4.4, z]);
    this.room_hall(scene, { back: -44, pillars: pil, windows: [], candles: 22, banners: [0], fogNear: 26, fogFar: 70 });
  }
  room_lab(scene) { // atelier des potions : étagères de bocaux, livres, bougies, le chaudron devant le sorcier
    this.room_hall(scene, { windows: [-7.5, 7.5], banners: [0] });
    for (const [x, ry] of [[-3.6, 0.35], [3.6, -0.35]]) {
      if (!this.model('kaykit/fu-shelf_B_large_decorated', 3.2, x, 0, -6.2, ry)) this.add(this.scene, this.G.box, '#8d5a3b', x, 1.6, -6.2, 2.4, 3.2, 0.6);
    }
    for (const [k, x, z, h] of [['kaykit/re-jar_A_large', -2.3, -3.6, 0.7], ['kaykit/re-jar_B_medium', 2.4, -3.4, 0.55], ['kaykit/hw-candle_triple', -2.8, -2.6, 0.6], ['kaykit/hw-candle_triple', 2.9, -2.2, 0.6], ['kaykit/fu-book_set', 2.2, -4.4, 0.4]]) this.model(k, h, x, 0, z, Math.random() * 6);
  }
  room_arena(scene) { // salle de duel : une estrade ronde, un cercle de runes qui brille
    this.room_hall(scene, { pillars: [[-6.8, -7.6], [6.8, -7.6], [-7.5, -1.5], [7.5, -1.5]] });
    const T = this.T, st = this.add(scene, this.geo(new T.CylinderGeometry(5.5, 5.8, 0.24, 48)), '#5b5078', 0.8, 0.12, -1.3); st.userData.noOutline = true;
    const rune = new T.Mesh(this.geo(new T.TorusGeometry(5.0, 0.06, 8, 80)), new T.MeshBasicMaterial({ color: '#c77dff' })); rune.rotation.x = -Math.PI / 2; rune.position.set(0.8, 0.26, -1.3); scene.add(rune);
    const rune2 = new T.Mesh(this.geo(new T.TorusGeometry(4.3, 0.03, 8, 80)), new T.MeshBasicMaterial({ color: '#7bdff2' })); rune2.rotation.x = -Math.PI / 2; rune2.position.copy(rune.position); scene.add(rune2);
    this.anims.push((now) => { rune.material.color.setHSL(0.78, 0.9, 0.62 + 0.12 * Math.sin(now / 400)); rune2.rotation.z = now / 4000; });
  }
  room_studio(scene) { // le miroir magique : grand cadre doré derrière le sorcier, rideaux
    this.room_hall(scene, { windows: [-7.5, 7.5], banner: false });
    const T = this.T, G = this.G, g = new T.Group(), w = 3.6, h = 3.3;
    for (const [x, y, sx, sy] of [[0, h, w + 0.4, 0.3], [0, 0.05, w + 0.4, 0.3], [-w / 2, h / 2, 0.3, h], [w / 2, h / 2, 0.3, h]]) this.add(g, G.box, '#ffc300', x, y, 0, sx, sy, 0.25, { emissive: '#7a5200', emissiveIntensity: 0.3 });
    const inner = this.tex(256, 256, (x, W2, H2) => { const gr = x.createRadialGradient(W2 / 2, H2 / 2, 10, W2 / 2, H2 / 2, W2 * 0.7); gr.addColorStop(0, '#e0c3fc'); gr.addColorStop(1, '#7b2cbf'); x.fillStyle = gr; x.fillRect(0, 0, W2, H2); x.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * W2, Math.random() * H2, 3, 3); });
    const p = new T.Mesh(G.plane, new T.MeshBasicMaterial({ map: inner })); p.scale.set(w - 0.1, h - 0.1, 1); p.position.set(0, h / 2, -0.1); g.add(p);
    for (const s of [-1, 1]) { const e = this.emo('✨', 0.6); e.position.set(s * w / 2, h + 0.1, 0.2); g.add(e); }
    g.position.set(0, 0, -1.2); scene.add(g);
    for (const s of [-1, 1]) this.add(scene, G.box, '#9d0208', s * 3.4, 3.2, -1.6, 1.2, 6.4, 0.2); // (rideaux)
  }
  room_meadow(scene) { // pré du château : herbe, chemin, arbres, collines, ciel bleu
    const T = this.T, G = this.G;
    this.sky(scene, [[0, '#4ea8de'], [0.6, '#bde0fe'], [1, '#e8f6ff']]);
    scene.fog = new T.Fog('#dff1ff', 30, 90);
    this.hemi.color.set('#ffffff'); this.hemi.groundColor.set('#6fbf73'); this.hemi.intensity = 1.2; this.sun.intensity = 1.6;
    this.floor(scene, '#7ccf6a', 300, (x, w, h) => { x.fillStyle = '#7ccf6a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { x.fillStyle = Math.random() < 0.5 ? '#6fbf73' : '#8fd97c'; x.fillRect(Math.random() * w, Math.random() * h, 3, 6); } }, 60);
    const path = this.tex(64, 256, (x, w, h) => { x.fillStyle = '#e6c28f'; x.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { x.fillStyle = Math.random() < 0.5 ? '#d9b27c' : '#f0d3a6'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 0, 7); x.fill(); } }, 1, 20);
    const pm = new T.Mesh(this.geo(new T.PlaneGeometry(3.2, 120)), this.mat('#ffffff', { map: path, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); pm.rotation.x = -Math.PI / 2; pm.position.set(0, 0.02, -50); pm.receiveShadow = true; pm.userData.noOutline = true; scene.add(pm);
    this.pathMap = path;
    const trees = ['kenney/tree_default', 'kenney/tree_oak', 'kenney/tree_fat', 'kenney/tree_pineRoundA'];
    for (let z = 8; z > -70; z -= 6) for (const s of [-1, 1]) {
      const x = s * (4.5 + Math.random() * 6);
      if (!this.model(trees[Math.floor(Math.random() * trees.length)], 3 + Math.random() * 2, x, 0, z + Math.random() * 2, Math.random() * 6)) { this.add(scene, G.cyl, '#8d5a3b', x, 0.8, z, 0.2, 1.6, 0.2); this.add(scene, G.ball, '#43aa8b', x, 2.4, z, 1.2); }
      if (Math.random() < 0.6) this.model(['kenney/flower_redA', 'kenney/flower_yellowA', 'kenney/flower_purpleA', 'kenney/mushroom_redGroup'][Math.floor(Math.random() * 4)], 0.5, s * (2.2 + Math.random() * 1.5), 0, z, Math.random() * 6);
    }
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.35; this.add(scene, G.ball, i % 2 ? '#8fd16a' : '#6fbf73', Math.cos(a) * 110, -14, Math.sin(a) * 110 - 20, 30, 22, 20).userData.noOutline = true; }
    this.clouds(scene, 8, [-60, 60], [18, 30], [-110, -50]);
  }
  clouds(scene, n, X, Y, Z) {
    const T = this.T, list = [];
    for (let i = 0; i < n; i++) {
      const g = new T.Group();
      for (let k = 0; k < 4; k++) { const m = this.add(g, this.G.ball, '#ffffff', (k - 1.5) * 1.6, Math.sin(k * 2) * 0.4, 0, 1.4 + Math.random() * 0.8, 1.1, 1.2); m.castShadow = false; m.userData.noOutline = true; }
      g.position.set(X[0] + Math.random() * (X[1] - X[0]), Y[0] + Math.random() * (Y[1] - Y[0]), Z[0] + Math.random() * (Z[1] - Z[0])); g.scale.setScalar(1.5 + Math.random() * 2);
      scene.add(g); list.push(g);
    }
    this.anims.push((now, dt) => { for (const c of list) { c.position.x += dt * 0.8; if (c.position.x > X[1]) c.position.x = X[0]; } });
    return list;
  }
  room_snow(scene) { // cour enneigée du château : sapins blancs, tas de neige, flocons, ciel d'hiver
    const T = this.T;
    this.sky(scene, [[0, '#7aa5d9'], [0.7, '#cfe3f7'], [1, '#f2f7ff']]);
    scene.fog = new T.Fog('#e3eefa', 16, 60);
    this.hemi.color.set('#f2f7ff'); this.hemi.groundColor.set('#a8c5e8'); this.hemi.intensity = 1.25; this.sun.color.set('#fff6e8');
    this.floor(scene, '#ffffff', 200, (x, w, h) => { x.fillStyle = '#f4f8ff'; x.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { x.fillStyle = Math.random() < 0.5 ? '#e3ecf9' : '#ffffff'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 8, 0, 7); x.fill(); } }, 40);
    const trees = ['holiday/tree-snow-a', 'holiday/tree-snow-b', 'holiday/tree-snow-c'];
    for (let i = 0; i < 26; i++) {
      const a = Math.random(), x = (Math.random() < 0.5 ? -1 : 1) * (4.6 + Math.random() * 9), z = -2 - Math.random() * 26;
      if (!this.model(trees[i % 3], 2.6 + a * 2.2, x, 0, z, Math.random() * 6)) { this.add(scene, this.G.cone, '#2d6a4f', x, 1.6, z, 1.1, 3.2, 1.1); this.add(scene, this.G.cone, '#ffffff', x, 2.6, z, 0.75, 1.3, 0.75); }
    }
    for (let i = 0; i < 8; i++) this.model('holiday/snow-pile', 0.4 + Math.random() * 0.3, (i % 2 ? 1 : -1) * (3.6 + Math.random() * 3), 0, -2 - Math.random() * 10, Math.random() * 6);
    // les remparts du château au fond
    const wallMap = this.tex(256, 256, this.stoneTex('#c9c3dc', '#8f86ad'), 12, 2);
    this.add(scene, this.G.box, '#ffffff', 0, 2.5, -30, 70, 5, 1, { map: wallMap }).userData.noOutline = true;
    for (let x = -30; x <= 30; x += 3) this.add(scene, this.G.box, '#c9c3dc', x, 5.3, -30, 1.4, 0.8, 1);
    for (const x of [-14, 14]) { this.add(scene, this.G.cyl, '#c9c3dc', x, 4.5, -29, 2, 9, 2); this.add(scene, this.G.cone, '#5a189a', x, 10, -29, 2.6, 3, 2.6); }
    this.dust(scene, '#ffffff', 160, [-10, 10], [0, 8], [-14, 4], 0.9);
  }
  room_sky(scene) { // ciel du soir : nuages qui filent, mer de nuages en bas, le château au loin
    const T = this.T;
    this.sky(scene, [[0, '#240046'], [0.45, '#7b2cbf'], [0.8, '#ff9e00'], [1, '#ff6d00']]);
    scene.fog = new T.Fog('#c86bd6', 40, 120);
    this.hemi.color.set('#ffd6e8'); this.hemi.groundColor.set('#5a189a'); this.hemi.intensity = 1.1; this.sun.color.set('#ffb36b'); this.sun.position.set(6, 6, -8);
    const sea = this.tex(256, 256, (x, w, h) => { x.fillStyle = '#f6c6ea'; x.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.7)' : 'rgba(199,125,255,.25)'; x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 30, 8 + Math.random() * 10, 0, 0, 7); x.fill(); } }, 12, 12);
    const f = new T.Mesh(this.geo(new T.PlaneGeometry(400, 400)), this.mat('#ffffff', { map: sea })); f.rotation.x = -Math.PI / 2; f.position.y = -9; f.userData.noOutline = true; scene.add(f);
    this.anims.push((now, dt) => { sea.offset.y += dt * 0.25; });
    const castle = this.model('custom/castle', 26, 18, -6, -110, -0.4);
    if (!castle) { this.add(scene, this.G.cyl, '#3c096c', 18, 4, -110, 4, 20, 4); this.add(scene, this.G.cone, '#3c096c', 18, 17, -110, 5, 6, 5); }
    this.dust(scene, '#ffffff', 200, [-60, 60], [14, 40], [-120, -40]);
    // nuages qui arrivent vers nous (la vitesse)
    this.flyClouds = [];
    for (let i = 0; i < 16; i++) {
      const g = new T.Group();
      for (let k = 0; k < 4; k++) { const m = this.add(g, this.G.ball, '#ffffff', (k - 1.5) * 0.9, Math.sin(k * 2) * 0.3, 0, 0.9 + Math.random() * 0.4, 0.7, 0.8, { transparent: true, opacity: 0.92 }); m.castShadow = false; }
      scene.add(g); this.flyClouds.push(g); this.placeFly(g, -10 - Math.random() * 90);
    }
    this.anims.push((now, dt) => { for (const c of this.flyClouds) { c.position.z += dt * 22; if (c.position.z > 10) this.placeFly(c, -100); } });
  }
  placeFly(g, z) { const s = Math.random() < 0.5 ? -1 : 1, x = s * (7.5 + Math.random() * 14); g.position.set(x, Math.random() < 0.5 ? -4 + Math.random() * 3 : 7 + Math.random() * 5, z); g.scale.setScalar(1 + Math.random() * 1.5); }
  room_rope(scene) { // la corde de l'équilibriste, entre deux tours, au-dessus des nuages
    const T = this.T, G = this.G;
    this.sky(scene, [[0, '#ffafcc'], [0.5, '#ffc8dd'], [1, '#fff1e6']]);
    scene.fog = new T.Fog('#ffe5ec', 30, 90);
    this.hemi.color.set('#fff1e6'); this.hemi.groundColor.set('#cdb4db'); this.hemi.intensity = 1.2;
    for (let i = 0; i < 46; i++) { const m = this.add(scene, G.ball, '#ffffff', (Math.random() - 0.5) * 90, -6.5 - Math.random() * 2, -Math.random() * 70 + 6, 3 + Math.random() * 4, 1.6, 3, { emissive: '#ffe5ec', emissiveIntensity: 0.45 }); m.castShadow = false; m.userData.noOutline = true; }
    const rope = this.add(scene, this.geo(new T.CylinderGeometry(0.05, 0.05, 15, 8)), '#f1faee', 0, -0.05, 0); rope.rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) {
      this.add(scene, G.cyl, '#e9d8c4', s * 7.6, -3, 0, 1.2, 8, 1.2); this.add(scene, G.cone, '#e63946', s * 7.6, 2.4, 0, 1.6, 2.2, 1.6);
      this.add(scene, G.box, '#8d5a3b', s * 6.8, 0.0, 0, 1.2, 0.15, 1.6);
      const fl = this.model('castle/flag-banner-long', 1.4, s * 7.6, 3.5, 0); if (!fl) this.add(scene, G.box, '#ffd166', s * 7.6 + 0.4, 3.8, 0, 0.8, 0.5, 0.05);
    }
    this.clouds(scene, 10, [-60, 60], [6, 20], [-80, -30]);
    this.wind = [];
    for (let i = 0; i < 14; i++) { const m = new T.Mesh(G.plane, new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); m.scale.set(1.6, 0.04, 1); m.position.set(0, 0.5 + Math.random() * 3, -1 + Math.random() * 2); scene.add(m); this.wind.push({ m, p: Math.random() }); }
  }

  // ======================= Les jeux =======================

  // ----- Le Mur Magique : un vrai mur de briques arrive du fond du couloir, avec un trou en forme de pose
  init3_mur() { this.wallObj = null; this.wallOld = []; }
  wallTex(pose, edge) {
    const M = this.M, W = 12, H = 6.4, k = 64, cw = W * k, ch = H * k, cx = (x) => (x + W / 2) * k, cy = (y) => (H - y) * k;
    return this.tex(cw, ch, (x) => {
      x.fillStyle = '#6a4c93'; x.fillRect(0, 0, cw, ch);
      const bw = 0.8 * k, bh = 0.4 * k;
      for (let r = 0; r * bh < ch; r++) for (let c = -1; c * bw < cw; c++) { x.fillStyle = `hsl(${265 + Math.random() * 12}, 32%, ${36 + Math.random() * 10}%)`; x.fillRect(c * bw + (r % 2) * bw / 2 + 2, r * bh + 2, bw - 4, bh - 4); }
      x.fillStyle = 'rgba(255,209,102,.9)'; x.font = `${k * 0.5}px serif`; x.textAlign = 'center'; x.fillText('✨', cx(-4.4), cy(5.2)); x.fillText('⭐', cx(4.5), cy(4.9));
      // la silhouette : le petit sorcier dans la pose (au milieu du mur ; décalé pour un pas de côté)
      const ox = pose === 'left' ? -M.side : pose === 'right' ? M.side : 0, path = new Path2D(), lw = 0.42;
      const line = (a, b) => { path.moveTo(cx(a[0]), cy(a[1])); path.lineTo(cx(b[0]), cy(b[1])); };
      const G = AR_SHAPES[pose === 'left' || pose === 'right' ? 'stand' : pose] || AR_SHAPES.stand;
      const dir = (a, b) => { const dx = -(G[b][0] - G[a][0]), dy = -(G[b][1] - G[a][1]), n = Math.hypot(dx, dy) || 1; return [dx / n, dy / n]; };
      if (pose === 'squat') {
        const top = A3_H * 0.66;
        path.rect(cx(ox - M.shW - 0.35), cy(top - M.headR), (M.shW * 2 + 0.7) * k, (top - M.headR) * k); path.moveTo(cx(ox + M.headR * 1.15), cy(top - M.headR)); path.arc(cx(ox), cy(top - M.headR), M.headR * 1.15 * k, 0, Math.PI * 2);
      } else {
        for (const [s, sk, wk] of [[-1, 'sL', 'wL'], [1, 'sR', 'wR']]) { const d = dir(sk, wk), sh = [ox + s * M.shW, M.shY]; line(sh, [sh[0] + d[0] * M.arm, sh[1] + d[1] * M.arm]); }
        for (const [s, hk, ak] of [[-1, 'hL', 'aL'], [1, 'hR', 'aR']]) {
          const hp = [ox + s * M.hipW, M.hipY];
          if (G.kL && G.kR) { const kk = s < 0 ? 'kL' : 'kR', d1 = dir(hk, kk), d2 = dir(kk, ak), kn = [hp[0] + d1[0] * M.leg * 0.5, hp[1] + d1[1] * M.leg * 0.5]; line(hp, kn); line(kn, [kn[0] + d2[0] * M.leg * 0.55, Math.max(0.05, kn[1] + d2[1] * M.leg * 0.55)]); }
          else { const d = dir(hk, ak); line(hp, [hp[0] + d[0] * M.leg, Math.max(0.05, hp[1] + d[1] * M.leg)]); }
        }
        path.rect(cx(ox - M.shW - 0.12), cy(M.shY + 0.15), (M.shW * 2 + 0.24) * k, (M.shY + 0.15 - M.hipY + 0.1) * k);
        path.moveTo(cx(ox + M.headR * 1.12), cy(M.headY)); path.arc(cx(ox), cy(M.headY), M.headR * 1.12 * k, 0, Math.PI * 2);
      }
      x.lineCap = x.lineJoin = 'round';
      x.strokeStyle = edge; x.fillStyle = edge; x.lineWidth = (lw + 0.22) * k; x.stroke(path); x.fill(path); // (bord lumineux)
      x.globalCompositeOperation = 'destination-out'; x.lineWidth = lw * k; x.stroke(path); x.fill(path);
      x.globalCompositeOperation = 'source-over';
    });
  }
  makeWall(w) {
    const T = this.T, g = new T.Group();
    const mk = () => new T.MeshToonMaterial({ map: null, gradientMap: this.S.P.gradient, transparent: true, alphaTest: 0.5, side: T.DoubleSide });
    const front = new T.Mesh(this.G.plane, mk()), back = new T.Mesh(this.G.plane, mk());
    for (const [p, z] of [[front, 0.18], [back, -0.18]]) { p.scale.set(12, 6.4, 1); p.position.set(0, 3.2, z); p.castShadow = true; p.receiveShadow = true; g.add(p); }
    const cap = this.add(g, this.G.box, '#4a2f73', 0, 6.45, 0, 12.2, 0.18, 0.5);
    this.scene.add(g);
    const o = { ref: w, g, front, back, cap, edge: null, pose: w.pose };
    this.paintWall(o, '#ffd166');
    return o;
  }
  paintWall(o, edge) {
    if (o.edge === edge) return;
    const old = o.front.material.map; const t = this.wallTex(o.pose, edge);
    o.front.material.map = t; o.back.material.map = t; o.front.material.needsUpdate = o.back.material.needsUpdate = true; o.edge = edge;
    if (old) { old.dispose(); this.own = this.own.filter((x) => x !== old); }
  }
  sync3_mur(st, now, dt) {
    const w = st.wall;
    if (this.wallObj && this.wallObj.ref !== w) { // (le mur est arrivé : il passe à travers, ou fait « bong » et tombe)
      const o = this.wallObj; o.endT = now; o.ok = !!o.ref.ok; this.wallOld.push(o); this.wallObj = null;
      if (o.ok) this.burst(new this.T.Vector3(this.av.group.position.x, 1.3, 0.3), 50, { speed: 4 });
      else { this.burst(new this.T.Vector3(this.av.group.position.x, 1.2, 0.4), 18, { chunk: 'box', cols: ['#6a4c93', '#7b5ea7'], speed: 3, size: 0.18, life: 1200 }); Audio8.crash(); this.react('hurt'); }
    }
    if (w && !this.wallObj) { this.wallObj = this.makeWall(w); Audio8.whoosh(); }
    if (this.wallObj) {
      const o = this.wallObj, q = Math.min(1, (now - w.t0) / w.dur);
      o.g.position.z = -32 + 32 * q; o.g.position.y = 0;
      this.paintWall(o, w.match ? '#4ade80' : '#ffd166');
    }
    this.wallOld = this.wallOld.filter((o) => {
      const k = (now - o.endT) / 900;
      if (k >= 1) { this.scene.remove(o.g); o.front.material.dispose(); o.back.material.dispose(); return false; }
      if (o.ok) { o.g.position.z = k * 6; for (const p of [o.front, o.back]) { p.material.opacity = 1 - k; } }
      else { o.g.position.z = 0.4; o.g.rotation.x = -k * 1.3; o.g.position.y = -k * 1.5; }
      return true;
    });
  }

  // ----- 1, 2, 3… Nuage Grognon : vu de dos, le sorcier court sur le chemin vers le nuage
  init3_soleil(scene) {
    try { this.cloud = buildCreature3D(this.S, GROGNON, false); this.cloud.group.scale.multiplyScalar(3.2); this.cloud.group.position.set(0, 1.2, -22); scene.add(this.cloud.group); } catch (e) { this.cloud = null; }
    this.flag = this.emo('🏁', 1.4); this.flag.position.set(1.8, 0.8, -19); scene.add(this.flag);
    this.prevProg = 0; this.runT = 0;
  }
  pose3_soleil(P, st, now) {
    const run = st.phase === 'dos' && st.prog > this.prevProg + 1e-5; this.prevProg = st.prog;
    if (run) this.runT = now;
    P.limbs = null; P.ry = 0; P.facing = false; P.x = 0; P.z = -st.prog * 17;
    P.clip = st.oops && now - st.oops < 900 ? 'bump' : now - this.runT < 250 ? 'run' : 'idle';
  }
  cam3_soleil(st) { const z = this.av.group.position.z; this.camTo(0, 2.7, z + 5.4, 0, 1.4, z - 8, 45, 0.12); }
  sync3_soleil(st, now) {
    const c = this.cloud; if (!c) return;
    const look = st.phase === 'regarde', want = look ? 0 : Math.PI; // (dos tourné : on voit son dos)
    if (st.phase !== this.lastPhase) { if (look) { Audio8.whoosh(); this.shake(0.05, 250); } this.lastPhase = st.phase; }
    if (st.oops && st.oops !== this.lastOops) { this.lastOops = st.oops; Audio8.boing(); this.react('hurt'); }
    c.group.rotation.y += (want - c.group.rotation.y) * 0.18;
    c.group.position.y = 1.2 + Math.sin(now / 500) * 0.15;
    c.animate(now, look && st.oops && now - st.oops < 1200 ? 'happy' : 'idle');
    const red = look ? 0.5 + 0.1 * Math.sin(now / 90) : 0;
    this.hemi.color.setRGB(1, 1 - red * 0.45, 1 - red * 0.5);
  }

  // ----- Pimprenelle a dit : la chouette directrice sur son perchoir, qui bat des ailes quand elle parle
  init3_pimprenelle(scene) {
    const T = this.T, G = this.G, g = new T.Group(), body = new T.Group();
    this.add(g, G.cyl, '#8d5a3b', 0, 0.5, 0, 0.08, 1.0, 0.08); this.add(g, G.cyl, '#8d5a3b', 0, 1.0, 0, 0.07, 1.1, 0.07).rotation.z = Math.PI / 2; this.add(g, G.cyl, '#6d4c41', 0, 0.06, 0, 0.5, 0.12, 0.5);
    this.add(body, G.ball, '#a47148', 0, 0.5, 0, 0.42, 0.52, 0.38); this.add(body, G.ball, '#f2e3c6', 0, 0.42, 0.18, 0.3, 0.38, 0.24);
    for (const s of [-1, 1]) {
      this.add(body, G.ball, '#ffffff', s * 0.15, 0.78, 0.28, 0.14); this.add(body, G.ball, '#1e1b4b', s * 0.15, 0.78, 0.4, 0.07); this.add(body, G.ball, '#ffffff', s * 0.13, 0.81, 0.46, 0.02);
      this.add(body, G.cone, '#7f5539', s * 0.25, 1.05, 0, 0.08, 0.22, 0.08).rotation.z = -s * 0.3;
      this.add(body, G.ball, '#f4a261', s * 0.08, 0.04, 0.12, 0.08, 0.04, 0.1);
    }
    this.add(body, G.cone, '#f4a261', 0, 0.66, 0.38, 0.05, 0.12, 0.05).rotation.x = Math.PI / 2 + 0.4;
    const hat = new T.Group(); this.add(hat, G.cyl, '#5a189a', 0, 0, 0, 0.32, 0.04, 0.32); this.add(hat, G.cone, '#7b2cbf', 0, 0.28, 0, 0.2, 0.55, 0.2); this.add(hat, G.cyl, '#ffd166', 0, 0.06, 0, 0.205, 0.06, 0.205); hat.position.set(0.05, 1.12, 0); hat.rotation.z = -0.2; body.add(hat);
    this.owlWings = [-1, 1].map((s) => { const p = new T.Group(); p.position.set(s * 0.36, 0.62, 0); this.add(p, G.ball, '#7f5539', s * 0.05, -0.2, 0, 0.1, 0.32, 0.22); body.add(p); return p; });
    body.position.y = 1.05; body.scale.setScalar(0.85); g.add(body); this.owl = body;
    this.S.outline(g); g.position.set(2.1, 0, 0.1); g.rotation.y = -0.45; scene.add(g);
  }
  sync3_pimprenelle(st, now) {
    const c = st.cur, talking = c && now - c.t0 < 1400, res = st.res && now - st.res.t < 1200 ? st.res : null;
    this.owlWings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (talking ? 0.4 + 0.5 * Math.abs(Math.sin(now / 80)) : 0.05); });
    this.owl.position.y = 1.05 + (res ? Math.abs(Math.sin((now - res.t) / 120)) * 0.25 : Math.sin(now / 600) * 0.03);
    this.owl.rotation.y = res && !res.good ? Math.sin((now - res.t) / 90) * 0.5 : Math.sin(now / 1400) * 0.25;
  }

  // ----- Bataille de boules de neige : des bonshommes de neige sortent de la neige, autour du sorcier
  pose3_pimprenelle(P) { if (this.owl) P.look = new this.T.Vector3(2.1, 1.5, 0.1); }
  pose3_potions(P, st) { if (st.phase === 'stir') P.look = this.potW().add(new this.T.Vector3(0, 0.6, 0)); }
  slotXZ(k) { return [[-2.5, -0.6], [2.5, -0.6], [-1.5, -3.4], [1.6, -3.6], [0, -6]][k] || [0, -4]; }
  slotXY(k, y = 0.95) { const [x, z] = this.slotXZ(k); return this.toScreen(new this.T.Vector3(x, y, z)); }
  init3_neige() { this.men = new Map(); this.balls = new Map(); }
  makeSnowman() {
    const T = this.T, g = new T.Group();
    const m = this.model(Math.random() < 0.5 ? 'holiday/snowman-hat' : 'holiday/snowman', 1.5, 0, 0, 0, 0, g);
    if (!m) { const G = this.G; this.add(g, G.ball, '#ffffff', 0, 0.42, 0, 0.45); this.add(g, G.ball, '#ffffff', 0, 1.0, 0, 0.32); this.add(g, G.ball, '#ffffff', 0, 1.42, 0, 0.24); this.add(g, G.cone, '#f77f00', 0, 1.42, 0.25, 0.05, 0.22, 0.05).rotation.x = Math.PI / 2; this.S.outline(g); }
    this.scene.add(g); return g;
  }
  sync3_neige(st, now) {
    const live = new Set(st.men);
    for (const [m, o] of this.men) if (!live.has(m)) { this.scene.remove(o.g); this.men.delete(m); }
    for (const m of st.men) {
      let o = this.men.get(m); const [x, z] = this.slotXZ(m.slot);
      if (!o) { o = { g: this.makeSnowman() }; this.men.set(m, o); Audio8.pop(); this.burst(new this.T.Vector3(x, 0.2, z), 10, { chunk: 'ball', cols: ['#ffffff', '#e3ecf9'], speed: 1.6, size: 0.1, life: 700 }); }
      const pop = Math.min(1, (now - m.t0) / 300);
      const aim = now - (m.aimT || 0) < 150; o.k = (o.k || 1) + ((aim ? 1.18 : 1) - (o.k || 1)) * 0.25; o.g.scale.setScalar(o.k);
      o.g.position.set(x, -1.5 * (1 - pop), z); o.g.rotation.y = Math.atan2(this.cam.position.x - x, this.cam.position.z - z) + Math.sin(now / 300 + m.slot) * 0.15;
      if (m.hit && !o.boom) { o.boom = true; o.g.visible = false; Audio8.puff(); this.shake(0.05, 200); this.burst(new this.T.Vector3(x, 0.9, z), 26, { chunk: 'ball', cols: ['#ffffff', '#f1f6ff', '#f77f00'], speed: 3.5, size: 0.16, life: 1300 }); this.burst(new this.T.Vector3(x, 1, z), 16, { cols: ['#ffffff', '#bde0fe'] }); }
      if (m.gone) o.g.position.y = -1.5 * Math.min(1, (now - m.gone) / 600);
    }
    const lb = new Set(st.balls);
    for (const [b, o] of this.balls) if (!lb.has(b)) { this.scene.remove(o); this.balls.delete(b); }
    for (const b of st.balls) {
      let o = this.balls.get(b);
      if (!o) { o = this.add(this.scene, this.G.ball, '#ffffff', 0, 0, 0, 0.14); o.userData.from = (this.hand3 && this.hand3[b.x0 < this.A.W / 2 ? 0 : 1] || new this.T.Vector3(0, 1.4, 0.3)).clone(); this.balls.set(b, o); Audio8.whoosh(); }
      const q = Math.min(1, (now - b.t0) / 300), [x, z] = this.slotXZ(b.m.slot), f = o.userData.from;
      o.position.set(f.x + (x - f.x) * q, f.y + (0.95 - f.y) * q + Math.sin(q * Math.PI) * 0.8, f.z + (z - f.z) * q);
    }
  }

  // ----- La cuisine des potions : le chaudron fume devant le sorcier ; les ingrédients flottent dans des bulles
  init3_potions(scene) {
    const T = this.T, G = this.G, g = new T.Group();
    const pts = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 0.95; pts.push(new T.Vector2(Math.sin(a) * 0.8 + 0.02, -Math.cos(a) * 0.65 + 0.65)); }
    const pot = new T.Mesh(this.geo(new T.LatheGeometry(pts, 32)), this.mat('#2b2d42', { side: T.DoubleSide })); pot.castShadow = true; g.add(pot);
    const rim = new T.Mesh(this.geo(new T.TorusGeometry(0.8, 0.07, 10, 40)), this.mat('#3d405b')); rim.rotation.x = Math.PI / 2; rim.position.y = 1.28; g.add(rim);
    for (let i = 0; i < 3; i++) { const a = i * 2.1; this.add(g, G.cyl, '#2b2d42', Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55, 0.07, 0.3, 0.07); }
    this.brew = new T.Mesh(this.geo(new T.CircleGeometry(0.76, 32)), new T.MeshBasicMaterial({ color: '#70e000' })); this.brew.rotation.x = -Math.PI / 2; this.brew.position.y = 1.16; g.add(this.brew);
    this.brewGlow = this.glow('#70e000', 1.8, 0.3); this.brewGlow.position.y = 1.5; g.add(this.brewGlow);
    this.bubbles = []; for (let i = 0; i < 6; i++) { const b = this.add(g, G.ball, '#b8f2a1', 0, 1.2, 0, 0.06, 0.06, 0.06, { transparent: true, opacity: 0.8 }); b.castShadow = false; this.bubbles.push({ b, p: Math.random(), x: (Math.random() - 0.5) * 0.9, z: (Math.random() - 0.5) * 0.9 }); }
    const spoon = new T.Group(); this.add(spoon, G.cyl, '#a0522d', 0, 0.6, 0, 0.04, 1.4, 0.04); this.add(spoon, G.ball, '#a0522d', 0, -0.1, 0, 0.14, 0.06, 0.14); spoon.position.y = 1.2; spoon.rotation.z = 0.35; g.add(spoon); this.spoon = spoon; spoon.visible = false;
    this.S.outline(pot); this.S.outline(rim);
    g.position.copy(this.potW()); g.scale.setScalar(0.62); scene.add(g); this.pot = g; pot.castShadow = true;
    this.items = new Map(); this.fly = new Map(); this.spoonA = 0; this.lastStir = 0; this.lastOk = 0;
  }
  potW() { return new this.T.Vector3(1.9, 0, 0.6); }
  potXY() { return this.toScreen(this.potW().add(new this.T.Vector3(0, 0.9, 0))); }
  sync3_potions(st, now) {
    const T = this.T, cols = ['#70e000', '#c77dff', '#4cc9f0', '#ff70a6'], col = cols[st.ok % 4];
    this.brew.material.color.set(col); this.brewGlow.material.color.set(col); this.brewGlow.material.opacity = 0.3 + 0.08 * Math.sin(now / 200);
    for (const b of this.bubbles) { const q = (now / 1400 + b.p) % 1; b.b.position.set(b.x * 0.8, 1.2 + q * 0.7, b.z * 0.8); b.b.scale.setScalar(0.06 + q * 0.05); b.b.material.color.set(col); }
    // ingrédients dans leurs bulles (là où les règles les placent, autour du sorcier)
    const live = new Set(st.items.filter((it) => !it.taken));
    for (const [it, o] of this.items) if (!live.has(it)) { this.scene.remove(o); this.items.delete(it); }
    const z0 = 0.5, ppu = this.ppu(z0);
    for (const it of live) {
      let o = this.items.get(it);
      if (!o) {
        o = new T.Group();
        const glass = new T.Mesh(this.G.ball, this.mat('#bde0fe', { transparent: true, opacity: 0.25, depthWrite: false })); glass.userData.noOutline = true; glass.renderOrder = 1; o.add(glass);
        const shine = this.add(o, this.G.ball, '#ffffff', -0.35, 0.35, 0.55, 0.12, 0.12, 0.12, { basic: { transparent: true, opacity: 0.8 } }); shine.castShadow = false;
        const e = this.emo(it.e, 1.5); e.renderOrder = 2; o.add(e); this.scene.add(o); this.items.set(it, o);
        if (!it.bad) { const halo = this.glow('#ffd166', 3.4, 0.55); halo.renderOrder = 0; o.add(halo); o.userData.halo = halo; } // (ingrédient de la recette : il brille)
      }
      if (it.x == null) { o.visible = false; continue; }
      o.visible = true;
      const p = this.toWorld(it.x + (now - it.wob < 500 ? Math.sin((now - it.wob) / 30) * 8 : 0), it.y, z0), r = (0.5 * this.A.B.T) / ppu;
      const aim = now - (it.aimT || 0) < 150; // (visé par une main : il grossit)
      o.userData.k = (o.userData.k || 1) + ((aim ? 1.35 : 1) - (o.userData.k || 1)) * 0.25;
      o.position.copy(p); o.scale.setScalar(r * o.userData.k * (it.bad ? 0.85 : 1 + 0.06 * Math.sin(now / 180 + it.seed))); o.rotation.y = Math.sin(now / 700 + it.seed) * 0.4;
      if (o.userData.halo) o.userData.halo.material.opacity = 0.4 + 0.25 * Math.sin(now / 200 + it.seed);
    }
    // ingrédients qui volent dans le chaudron
    const lf = new Set(st.flying);
    for (const [f, o] of this.fly) if (!lf.has(f)) { this.scene.remove(o); this.fly.delete(f); this.burst(this.potW().add(new T.Vector3(0, 1, 0)), 10, { cols: [col, '#ffffff'], speed: 1.5 }); }
    for (const f of st.flying) {
      let o = this.fly.get(f);
      if (!o) { o = this.emo(f.e, 0.45); o.userData.from = this.toWorld(f.x0, f.y0, z0); this.scene.add(o); this.fly.set(f, o); Audio8.pop(); }
      const q = Math.min(1, (now - f.t0) / 500), a = o.userData.from, pw = this.potW();
      o.position.set(a.x + (pw.x - a.x) * q, a.y + (0.95 - a.y) * q + Math.sin(q * Math.PI) * 0.9, a.z + (pw.z - a.z) * q);
    }
    // touiller : la louche tourne quand l'enfant fait des cercles
    this.spoon.visible = st.phase === 'stir';
    if (st.phase === 'stir') { const d = Math.max(0, (st.stir || 0) - this.lastStir); this.spoonA += d + 0.01; this.spoon.position.set(Math.cos(this.spoonA) * 0.35, 1.2, Math.sin(this.spoonA) * 0.35); this.brew.rotation.z = -this.spoonA; }
    this.lastStir = st.stir || 0;
    if (st.ok > this.lastOk) { this.lastOk = st.ok; Audio8.spell(); this.shake(0.1, 300); this.burst(this.potW().add(new T.Vector3(0, 1.2, 0)), 60, { cols: ['#c77dff', '#7bdff2', '#b8f2a1', '#ffd166'], speed: 4, up: 3 }); }
  }

  // ----- Duel de sorciers : Grimaud sur l'estrade ; sorts lumineux, bouclier, contre-attaque
  init3_duel(scene) {
    const S = this.S, T = this.T;
    let look = A3_GRIMAUD; if (!lookKeys(look).every((k) => S.P.models.has(k))) look = COACH_LOOKS.dance;
    this.grim = S.makeHero({ body: look.color }, false, null, true, look);
    if (this.grim.human) { S.poseHumanStill(this.grim, 'idle'); const b = new T.Box3().setFromObject(this.grim.inner); this.grimS = this.grim.scale * 2.3 / Math.max(0.3, b.max.y - b.min.y); }
    scene.add(this.grim.group);
    this.orb = this.glow('#c77dff', 0.8); this.orbCore = this.add(scene, this.G.ball, '#ffffff', 0, 0, 0, 0.16, 0.16, 0.16, { basic: {} }); this.orbCore.castShadow = false; scene.add(this.orb);
    this.shield = new T.Mesh(this.geo(new T.SphereGeometry(1.25, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55)), new T.MeshBasicMaterial({ color: '#7bdff2', transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
    this.shield.rotation.x = Math.PI / 2; scene.add(this.shield);
    this.stars = [0, 1, 2].map(() => { const e = this.emo('⭐', 0.35); scene.add(e); return e; });
    this.lastHp = null;
  }
  grimPos() { return new this.T.Vector3(2.6, 0.24, -2.6); }
  pose3_duel(P) { P.x = -1.1 + (P.x || 0); P.y = (P.y || 0) + 0.24; P.look = this.grimPos().add(new this.T.Vector3(0, 1.6, 0)); }
  cam3_duel() { this.camTo(-0.2, 1.55, 6.2, 0.55, 1.15, -1, 40, 0.2); }
  sync3_duel(st, now) {
    const S = this.S, T = this.T, g = this.grim, gp = this.grimPos(), dizzy = st.dizzy && now - st.dizzy < 1500;
    const hero = this.av.group.position, chest = new T.Vector3(hero.x, hero.y + 1.15, 0.25);
    if (g.human) {
      const clip = dizzy ? 'bump' : st.phase === 'charge' || st.phase === 'cast' && now - st.at < 400 ? 'smash' : st.hp <= 0 ? 'bump' : 'idle';
      const save = S.heroY3; S.heroY3 = () => 0; try { S.applyHumanPose({ lane: 0, y: 0, holdPose: null }, g, clip, now); } finally { S.heroY3 = save; }
      g.group.scale.setScalar(this.grimS); g.group.position.copy(gp); g.group.rotation.set(0, Math.atan2(-(hero.x - gp.x), -(chest.z - gp.z)), dizzy ? Math.sin(now / 80) * 0.12 : 0);
    }
    const hand = new T.Vector3(gp.x - 0.5, gp.y + 1.3, gp.z + 0.5), col = st.kind === 'shield' ? '#c77dff' : '#ff4d6d';
    let orbAt = null, size = 0;
    if (st.phase === 'charge') { const k = Math.min(1, (now - st.at) / 1500); orbAt = hand; size = 0.3 + k * 0.6; }
    else if (st.phase === 'cast') { const q = Math.min(1, (now - st.at) / (st.until - st.at)); orbAt = hand.clone().lerp(chest, q); size = 0.9; }
    else if (st.phase === 'bolt') { const q = Math.min(1, (now - st.at) / 600); orbAt = new T.Vector3(hero.x, hero.y + 2.4, 0.2).lerp(new T.Vector3(gp.x, gp.y + 1.2, gp.z), q); size = 1; }
    else if (st.phase === 'counter') { const k = Math.min(1, (st.hold || 0) / 0.5); orbAt = new T.Vector3(hero.x, hero.y + 2.45, 0.2); size = 0.2 + k * 0.9; }
    const c2 = st.phase === 'bolt' || st.phase === 'counter' ? '#ffd166' : col;
    this.orb.visible = this.orbCore.visible = !!orbAt;
    if (orbAt) {
      this.orb.position.copy(orbAt); this.orb.scale.setScalar(size * (1 + 0.1 * Math.sin(now / 50))); this.orb.material.color.set(c2);
      this.orbCore.position.copy(orbAt); this.orbCore.scale.setScalar(size * 0.18);
      if (Math.random() < 0.5) this.burst(orbAt, 1, { cols: [c2, '#ffffff'], speed: 0.5, up: 0.2, grav: 0, size: 0.18, life: 400 });
    }
    // résultat d'un sort : paré (étincelles sur le bouclier) ou touché
    if (st.phase !== this.lastPhase) {
      if (st.phase === 'charge') Audio8.charge();
      if (st.phase === 'cast') Audio8.zap();
      if (st.phase === 'bolt') Audio8.spell();
      if (this.lastPhase === 'cast') { if (st.phase === 'counter') Audio8.hit(); else { Audio8.crash(); this.react('hurt'); } }
      if (this.lastPhase === 'bolt') { Audio8.hit(); this.shake(0.12, 350); this.punch(); }
      if (this.lastPhase === 'cast') { if (st.phase === 'counter') this.burst(chest.clone().add(new T.Vector3(0, 0, 0.9)), 30, { cols: ['#7bdff2', '#ffffff'], speed: 3 }); else this.burst(chest, 30, { cols: ['#ff4d6d', '#ffffff'], speed: 3 }); }
      if (this.lastPhase === 'bolt') this.burst(new T.Vector3(gp.x, gp.y + 1.3, gp.z), 50, { cols: ['#ffd166', '#ffffff', '#ff70a6'], speed: 4 });
      this.lastPhase = st.phase;
    }
    const sh = this.A.B && this.A.B.st.handsTogether && (st.phase === 'cast' || st.phase === 'charge');
    this.shield.visible = !!sh; if (sh) { this.shield.position.set(hero.x, hero.y + 1.1, 0.05); this.shield.material.opacity = 0.25 + 0.1 * Math.sin(now / 80); }
    this.stars.forEach((e, i) => { e.visible = !!dizzy; const a = now / 250 + i * 2.1; e.position.set(gp.x + Math.cos(a) * 0.5, gp.y + 2.6, gp.z + Math.sin(a) * 0.5); });
  }
  grimXY() { return this.toScreen(new this.T.Vector3(this.grimPos().x, 2.9, this.grimPos().z)); }

  // ----- Tir à la corde : le sorcier tire une corde magique contre le Nuage Grognon (tout glisse vers le gagnant)
  init3_corde(scene) {
    const T = this.T;
    try { this.cloud = buildCreature3D(this.S, GROGNON, false); this.cloud.group.scale.multiplyScalar(1.5); scene.add(this.cloud.group); } catch (e) { this.cloud = null; }
    this.add(scene, this.G.box, '#ffffff', 0, 0.02, 0, 0.12, 0.02, 6).userData.noOutline = true;
    for (const [x, c] of [[-1.1, '#ffd166'], [1.1, '#9aa0c3']]) { this.add(scene, this.G.box, c, x, 0.02, 0, 0.1, 0.02, 4).userData.noOutline = true; const f = this.emo(x < 0 ? '🏆' : '☁️', 0.6); f.position.set(x, 0.35, 1.6); scene.add(f); }
    this.ropeMat = this.mat('#c77dff', { emissive: '#7b2cbf', emissiveIntensity: 0.4 });
    this.bow = this.emo('🎀', 0.5); scene.add(this.bow);
  }
  pose3_corde(P, st, now) { const off = st.m * 1.1; P.x = -2.1 + off + (P.x || 0) * 0.3; P.rz = -0.08 - (now - st.burst < 1100 ? 0.1 : 0); }
  cam3_corde(st) { const off = st.m * 1.1 * 0.6; this.camTo(off, 1.5, 7.2, off, 1.1, 0, 42, 0.15); }
  sync3_corde(st, now) {
    const T = this.T, off = st.m * 1.1, strong = now - st.burst < 1100, cx = 2.6 + off;
    if (st.burst && st.burst !== this.lastBurst) { this.lastBurst = st.burst; Audio8.whoosh(); this.shake(0.06, 400); }
    if (this.cloud) { this.cloud.group.position.set(cx + (strong ? Math.sin(now / 40) * 0.08 : 0), 0.35 + Math.sin(now / 500) * 0.06, 0); this.cloud.group.rotation.y = -0.6; this.cloud.animate(now, strong ? 'happy' : 'idle'); }
    const h = this.hand3 && this.hand3.filter(Boolean); const a = h && h.length ? h.reduce((s, v) => s.add(v), new T.Vector3()).multiplyScalar(1 / h.length) : new T.Vector3(-2 + off, 1.1, 0.2);
    const b = new T.Vector3(cx - 0.75, 1.0, 0.1), mid = a.clone().lerp(b, 0.5); mid.y -= 0.15 + Math.sin(now / 80) * 0.03;
    const curve = new T.QuadraticBezierCurve3(a, mid, b);
    if (this.ropeMesh) { this.ropeMesh.geometry.dispose(); this.ropeMesh.geometry = new T.TubeGeometry(curve, 16, 0.05, 5); }
    else { this.ropeMesh = new T.Mesh(new T.TubeGeometry(curve, 24, 0.05, 6), this.ropeMat); this.ropeMesh.castShadow = true; this.scene.add(this.ropeMesh); }
    const bp = curve.getPoint(0.5); this.bow.position.set(bp.x, bp.y, bp.z + 0.05); this.bow.material.rotation = Math.sin(now / 200) * 0.2;
  }

  // ----- L'équilibriste : sur la corde au-dessus des nuages ; le vent souffle, on avance en tenant bon
  pose3_equilibre(P, st, now) {
    const k = Math.min(1, (st.held || 0) / st.n); P.x = -3.2 + k * 6.4; P.y = 0; P.rz = st.ok2 ? Math.sin(now / 700) * 0.04 : Math.sin(now / 110) * 0.22 + (st.gust ? st.side * -0.1 : 0);
  }
  cam3_equilibre() { const x = this.av.group.position.x; this.camTo(x * 0.6, 1.5, 6.2, x * 0.7, 1.0, 0, 42, 0.1); }
  sync3_equilibre(st, now, dt) {
    if (st.gust && st.gust !== this.lastGust) { this.lastGust = st.gust; Audio8.whoosh(); }
    for (const w of this.wind || []) {
      const on = !!st.gust; w.m.material.opacity += ((on ? 0.7 : 0) - w.m.material.opacity) * 0.1;
      w.p = (w.p + dt * 0.9) % 1; const x = (st.side || 1) > 0 ? 8 - w.p * 16 : -8 + w.p * 16; w.m.position.x = x;
    }
    if (st.held && Math.floor(st.held) !== this.lastSec) { this.lastSec = Math.floor(st.held); if (this.lastSec > 0) this.burst(new this.T.Vector3(this.av.group.position.x, 2.4, 0.2), 10, { speed: 1.5 }); }
  }

  // ----- La course de balais : vu de dos, le sorcier vole ; les anneaux d'or arrivent du fond du ciel
  init3_balai(scene) {
    const T = this.T, G = this.G, b = new T.Group();
    this.add(b, G.cyl, '#8d5a3b', 0, 0, 0, 0.05, 2.4, 0.05).rotation.x = Math.PI / 2;
    const br = this.add(b, G.cone, '#e9c46a', 0, 0, 1.4, 0.16, 0.7, 0.16); br.rotation.x = -Math.PI / 2;
    this.add(b, G.cyl, '#bc6c25', 0, 0, 1.08, 0.08, 0.08, 0.08).rotation.x = Math.PI / 2;
    this.S.outline(b); scene.add(b); this.broom = b;
    this.rings = new Map(); this.bx = 0; this.prevX = 0;
  }
  ringPos(gx, gy) { return new this.T.Vector3(gx * 2.6, 2.4 - gy * 1.5 + 1.0, 0); }
  ringXY(gx, gy) { return this.toScreen(this.ringPos(gx, gy)); }
  pose3_balai(P, st, now) {
    P.facing = false; P.ry = 0; P.x = st.x * 2.6; P.y = 2.4 - st.y * 1.5 + Math.sin(now / 300) * 0.08; P.clip = 'idle';
    const arms = this.A.B && this.A.B.st && this.A.B.st.armsUp;
    P.limbs = { 'leg-left': [-0.15, -0.45, -1], 'leg-right': [0.15, -0.45, -1], 'arm-left': arms ? [-0.4, 1, 0] : [0.1, -0.35, -1], 'arm-right': arms ? [0.4, 1, 0] : [-0.1, -0.35, -1] };
    const v = st.x - this.prevX; this.prevX = st.x; this.bank = (this.bank || 0) + (-v * 14 - (this.bank || 0)) * 0.15; P.rz = Math.max(-0.5, Math.min(0.5, this.bank - st.x * 0.12));
  }
  cam3_balai() { const p = this.av.group.position; this.camTo(p.x * 0.55, p.y + 1.25, 7.4, p.x * 0.4, p.y + 0.7, -20, 50, 0.15); }
  sync3_balai(st, now) {
    const T = this.T, p = this.av.group.position, M = this.M;
    this.broom.position.set(p.x, p.y + M.hipY - 0.15, 0.1); this.broom.rotation.set(0.28, 0, this.av.group.rotation.z); // (balai penché : la paille part vers le bas, derrière)
    if (Math.random() < 0.7) this.burst(new T.Vector3(p.x, p.y + M.hipY - 0.1, 1.7), 1, { cols: ['#ffd166', '#ff70a6', '#ffffff'], speed: 0.6, up: 0, grav: 0, size: 0.25, life: 500 });
    const live = new Set(st.rings);
    for (const [r, o] of this.rings) if (!live.has(r)) { this.scene.remove(o); this.rings.delete(r); }
    for (const r of st.rings) {
      let o = this.rings.get(r);
      if (!o) { o = new T.Mesh(this.G.torus, this.mat('#ffd166', { emissive: '#ff9e00', emissiveIntensity: 0.6 })); o.scale.setScalar(1.05); o.castShadow = true; const gl = this.glow('#ffd166', 2.6, 0.35); o.add(gl); this.scene.add(o); this.rings.set(r, o); }
      const q = Math.min(1, (now - r.t0) / r.dur), rp = this.ringPos(r.gx, r.gy);
      const rz = -70 + 70 * q + (r.res ? (now - r.t) * 0.02 : 0), dz = Math.max(0, this.cam.position.z - rz - BEND_START);
      o.position.set(rp.x, rp.y + dz * dz * BEND_K, rz); // (le monde « arrondi » ferait plonger les anneaux lointains : on compense)
      o.rotation.z = now / 600;
      if (q > 0.9 && !o.userData.wh) { o.userData.wh = true; Audio8.whoosh(); }
      if (r.res && !o.userData.done) { o.userData.done = true; o.material.color.set(r.res === 'ok' ? '#4ade80' : '#ff8fab'); o.material.emissive.set(r.res === 'ok' ? '#2d6a4f' : '#9d0208'); if (r.res === 'ok') this.burst(o.position.clone(), 40, { speed: 4 }); }
      o.scale.setScalar(r.res ? 1.05 * (1 + (now - r.t) / 300) : 1.05);
    }
  }

  // ----- Le miroir magique : le sorcier pose devant le grand cadre doré, deux petits amis sautillent à côté
  init3_photo(scene) {
    this.pets = [['pets/animal-chick', -1.6], ['pets/animal-bunny', 1.6]].map(([k, x]) => {
      const m = this.model(k, 0.8, x, 0, 0.6, 0) || (() => { const e = this.emo(x < 0 ? '🐣' : '🐰', 0.9); e.position.set(x, 0.5, 0.6); scene.add(e); return e; })();
      return { m, x };
    });
    this.lastFlash = 0;
  }
  sync3_photo(st, now) {
    this.pets.forEach((p, i) => { p.m.position.y = (p.m.isSprite ? 0.5 : 0) + Math.abs(Math.sin(now / 260 + i)) * 0.3; p.m.rotation.y = Math.sin(now / 500 + i) * 0.5; });
    if (st.flash && st.flash !== this.lastFlash) { this.lastFlash = st.flash; Audio8.photo(); this.punch(); this.burst(new this.T.Vector3(0, 3, 0.5), 70, { cols: ['#ffd166', '#ff70a6', '#7bdff2', '#b8f2a1', '#c77dff'], chunk: 'box', size: 0.08, speed: 3.5, grav: 3, life: 1800 }); }
  }
}
