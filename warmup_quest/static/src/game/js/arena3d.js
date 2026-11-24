// Jeux miroir en 3D : chaque jeu a son décor (grande salle de l'Académie, couloir du mur, cour enneigée, pré du château pour
// la grande course) et le petit sorcier de l'enfant, en 3D, imite ses gestes en direct, comme dans un jeu vidéo.
// arena.js garde les règles (en pixels de l'écran) : ici on construit la scène, on place les objets du jeu et on renvoie
// où sont les mains, les épaules et la tête du petit sorcier à l'écran (c'est avec SES mains qu'on touche).
// Rendu avec le moteur 3D du jeu (scene3d.js), sur sa toile ; le calque 2D d'arena.js n'affiche plus que les textes.

const A3_MODELS = ['holiday/snowman', 'holiday/snowman-hat', 'holiday/tree-snow-a', 'holiday/tree-snow-b', 'holiday/tree-snow-c', 'holiday/snow-pile',
  'kaykit/Knight', 'quaternius/CommonTree_1', 'quaternius/CommonTree_2', 'quaternius/CommonTree_3', 'quaternius/Pine_2', 'kenney/flower_redA', 'kenney/flower_yellowA', 'kenney/flower_purpleA',
  'kenney/mushroom_redGroup', 'kenney/rock_largeA', 'kenney/plant_bushLarge', 'custom/castle',
  ...['pillar', 'torch_mounted', 'banner_patternA_red', 'banner_patternB_blue', 'barrel_large', 'barrel_small_stack', 'chest_gold', 'shelf_small_candles',
    'table_medium_decorated_A', 'candle_triple', 'crates_stacked', 'sword_shield', 'keg_decorated', 'coin_stack_large'].map((n) => 'dungeon/' + n), 'castle/flag-banner-long'];
// Le chevalier rival de la grande course (aventurier KayKit, avec son casque et sa cape)
const A3_RIVAL = { model: 'kk-knight', hat: 'none', glasses: false, back: 'cape', color: '#e63946' };
const A3_COURSE_L = 20; // (longueur de la piste de la grande course, unités 3D)
const A3_H = 2; // taille du petit sorcier (unités 3D)
// Mains magiques : bras de l'enfant tendu (≈ 1,1 torse) -> 1,9 « torse du jeu » depuis l'épaule du sorcier (ses bras à lui sont courts)
const A3_REACH = 1.9; // (portée du jeu, bras tendu, en « torses du jeu » ; la portée de l'enfant est mesurée par les étoiles)
const A3_NOSHADOW = { castShadow: false };
// Décor de chaque jeu, et plan de caméra : de face (miroir) ou de dos (la grande course)
// (noHands : on ne touche rien avec les mains ; pas de mains magiques ni de rayons qui suivraient des bras agités en tous sens)
const A3_GAMES = {
  mur: { room: 'corridor' }, pimprenelle: { room: 'hall' }, neige: { room: 'snow' }, course: { room: 'meadow', back: true },
};
// Images d'effets (Kenney Particle Pack, CC0) : étoiles scintillantes, cœurs, onde de choc, petit nuage de fumée
const A3_FX = { star: ['star_06', 'star_07', 'star_08', 'star_09', 'magic_05'], heart: ['symbol_01'], gem: ['symbol_02'], ring: ['circle_03'], smoke: ['smoke_04'] };
const A3_FX_BASE = MODELS_BASE.replace(/models\/$/, 'fx/');
const a3swap = (k) => k.replace(/left|right/, (x) => (x === 'left' ? 'right' : 'left'));

class Arena3D {
  constructor(S) { this.S = S; this.scene = null; }
  get T() { return this.S.T; }
  static can(S) { return !!(S && S.ready && S.renderer && S.T && S.P && S.P.models); }

  // ---------- Construction
  begin(A) {
    const S = this.S, T = this.T, game = A.s.game;
    this.A = A; this.game = game; this.cfg = A3_GAMES[game] || { room: 'hall' }; this.skyU = null;
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
    if (!this.fxTex) { // (chargées une fois ; tant qu'elles ne sont pas là, on garde les points lumineux)
      const L = new T.TextureLoader(); this.fxTex = {};
      for (const [k, names] of Object.entries(A3_FX)) this.fxTex[k] = names.map((n) => { const t = L.load(A3_FX_BASE + n + '.png', () => (t.userData.ok = true)); t.colorSpace = T.SRGBColorSpace; return t; });
    }
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
    // Le reste de la scène (petit sorcier avec chapeau, sac et baguette, décor, matériaux) : libéré aussi,
    // sauf les ressources gardées d'un jeu à l'autre (formes communes, lueur, émojis)
    if (this.scene) {
      const keep = new Set([...Object.values(this._G || {}), ...(this.emoCache ? this.emoCache.values() : []), ...(this.gm ? this.gm.values() : [])]);
      if (this.glowTex) keep.add(this.glowTex);
      this.S.freeRes(this.scene, keep);
    }
    this.beamM = null; this.beamGeo = null; // (rayons recréés dans la scène du prochain jeu)
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
  // Ciel : le dégradé (haut -> horizon) sur une grande sphère, avec les nuages peints et les étoiles du ciel des chemins
  sky(scene, stops, o = {}) {
    const T = this.T, grad = this.tex(2, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach(([k, c]) => g.addColorStop(k, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    scene.background = new T.Color(stops[stops.length - 1][1]);
    this.skyU = { grad: { value: grad }, time: { value: 0 }, night: { value: o.night || 0 }, cloudK: { value: o.clouds ?? 1 }, cloudCol: { value: new T.Color(o.cloudCol || '#ffffff') } };
    const m = new T.Mesh(this.geo(new T.SphereGeometry(150, 32, 16)), new T.ShaderMaterial({
      uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D grad; varying vec3 vP;${SKY_PAINT_GLSL}
        void main(){ vec3 d = normalize(vP); vec3 c = texture2D(grad, vec2(0.5, clamp(0.08 + d.y * 1.15, 0.0, 1.0))).rgb;
          gl_FragColor = vec4(paintSky(c, d), 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    m.renderOrder = -1; m.userData.noOutline = true; scene.add(m);
  }
  glowMat(c, op = 1, shared = false) {
    if (shared) { this.gm = this.gm || new Map(); const k = c + op; if (!this.gm.has(k)) this.gm.set(k, this.glowMat(c, op)); return this.gm.get(k); }
    return new this.T.SpriteMaterial({ map: this.glowTex, color: c, blending: this.T.AdditiveBlending, depthWrite: false, transparent: true, opacity: op });
  }
  // Sprite d'effet (une image du pack au hasard dans la famille), partagé par couleur ; repli : point lumineux
  fxMat(kind, c) {
    const list = (this.fxTex && this.fxTex[kind] || []).filter((t) => t.userData.ok); if (!list.length) return this.glowMat(c, 1, true);
    const t = list[Math.floor(Math.random() * list.length)], k = kind + t.uuid + c; this.fm = this.fm || new Map();
    if (!this.fm.has(k)) this.fm.set(k, new this.T.SpriteMaterial({ map: t, color: c, blending: kind === 'smoke' ? this.T.NormalBlending : this.T.AdditiveBlending, depthWrite: false, transparent: true }));
    return this.fm.get(k);
  }
  // Onde de choc : un anneau lumineux qui s'agrandit et s'efface (réussite)
  shock(pos, col = '#ffd166', size = 2.4) {
    const s = new this.T.Sprite(this.fxMat('ring', col).clone()); s.position.copy(pos); s.scale.setScalar(0.2); this.scene.add(s);
    this.parts.push({ o: s, v: new this.T.Vector3(), t0: performance.now(), life: 550, g: 0, s0: 0.2, spin: 0, grow: size, own: true });
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
      else { // (étincelles : surtout des étoiles qui scintillent, quelques points lumineux pour le volume)
        const kind = opts.tex || (Math.random() < 0.65 ? 'star' : null), big = kind && kind !== 'star' ? 1.6 : kind ? 1.5 : 1;
        o = new T.Sprite(kind ? this.fxMat(kind, cols[i % cols.length]) : this.glowMat(cols[i % cols.length], 1, true)); o.scale.setScalar((opts.size || 0.22) * big * (0.6 + Math.random() * 0.8));
      }
      o.position.copy(pos); this.scene.add(o);
      this.parts.push({ o, v: new T.Vector3(Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + (opts.up || 1.5), Math.sin(a) * Math.cos(e) * sp * 0.6), t0: now, life: opts.life || 900, g: opts.grav ?? 4, s0: o.scale.x, spin: opts.chunk ? (Math.random() - 0.5) * 12 : 0 });
    }
  }
  updateParts(now, dt) {
    this.parts = this.parts.filter((p) => {
      const k = (now - p.t0) / p.life;
      if (k >= 1) { this.scene.remove(p.o); if (p.own) p.o.material.dispose(); return false; }
      p.v.y -= p.g * dt; p.o.position.addScaledVector(p.v, dt);
      if (p.o.position.y < 0.02 && p.spin) { p.o.position.y = 0.02; p.v.multiplyScalar(0.5); p.v.y = Math.abs(p.v.y) * 0.3; }
      if (p.spin) { p.o.rotation.x += p.spin * dt; p.o.rotation.z += p.spin * dt * 0.7; }
      if (p.grow) { p.o.scale.setScalar(p.s0 + (p.grow - p.s0) * (1 - (1 - k) ** 3)); p.o.material.opacity = 1 - k; return true; } // (onde de choc)
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
  camFront(x = 0, lookX = x, dist = 5.6) { this.camTo(x, 1.3, dist, lookX, 1.05, 0, 40, 0.06); } // (amortie : ne suit pas chaque tremblement du sorcier)
  camTo(x, y, z, lx, ly, lz, fov, k = 1) {
    const c = this.cam, A = this.A;
    this.camP = this.camP || new this.T.Vector3(x, y, z); this.camL = this.camL || new this.T.Vector3(lx, ly, lz);
    // (k réglé pour 60 images/s : même douceur sur un PC lent, qui dessine moins d'images)
    const n = Math.min(6, Math.max(0.25, (this.frameDt || 1 / 60) * 60)), ke = k >= 1 ? 1 : 1 - Math.pow(1 - k, n);
    this.camP.lerp(new this.T.Vector3(x, y, z), ke); this.camL.lerp(new this.T.Vector3(lx, ly, lz), ke);
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
        const sg = r.kay && r.child[n] && P.seg && P.seg[k], up = sg && sg[0], fo = sg && sg[1];
        S.aimBone(bone, r.kay ? r.child[n] : null, up || (d.length === 3 ? d : [d[0], d[1], 0.18]), m.inner, HUMAN_AXIS[n]);
        if (r.kay && r.child[n]) {
          r.child[n].quaternion.identity();
          if (up && fo) { // (vrai coude / genou : l'avant-bras suit le poignet de l'enfant)
            const end = /arm/.test(n) ? (/left/.test(n) ? r.bones.handL : r.bones.handR) : r.bones[/left/.test(n) ? 'foot.l' : 'foot.r'];
            if (end) { S.aimBone(r.child[n], end, fo, m.inner); const pq = this.boneQ.get(n + ':fo'); if (pq && P.smooth !== false) r.child[n].quaternion.copy(pq.slerp(r.child[n].quaternion, P.smoothK || 0.5)); this.boneQ.set(n + ':fo', r.child[n].quaternion.clone()); }
          }
        }
        // (mouvement doux : le bras rejoint la position de l'enfant en une fraction de seconde, sans tremblote)
        const prev = this.boneQ.get(n);
        // (un bras qui « saute » de plus de 90° en une image : souvent un point mal détecté ; on le suit doucement)
        const jump = prev ? prev.angleTo(bone.quaternion) > 1.6 : false;
        if (prev && P.smooth !== false) bone.quaternion.copy(prev.slerp(bone.quaternion, jump ? 0.12 : P.smoothK || 0.5));
        this.boneQ.set(n, bone.quaternion.clone());
      }
    }
    // tête : regarde ce qui se passe (la chouette…)
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
  react(kind) { this.reactT = performance.now(); this.reactKind = kind; if (kind === 'win') { this.punch(); this.shake(0.04, 200); if (this.av && this.scene) { const p = this.av.group.position.clone().add(new this.T.Vector3(0, 1.3, 0.3)); this.shock(p); this.burst(p, 6, { tex: 'heart', cols: ['#ff70a6', '#ff8fab'], speed: 1.6, up: 2, grav: 1, size: 0.3, life: 1100 }); } } if (kind === 'hurt') this.shake(0.18, 400); }

  // Le corps vu à l'écran (comme arena.body) : directions des membres du joueur (ou du sorcier au clavier) -> petit sorcier 3D
  body(A, now, st) {
    const b0 = tracker.lead(), live = !tracker.sim && b0 && b0.lm && b0.state.present, M = this.M;
    // (l'enfant perdu un instant, ou un autre enfant qui « mène » une image : on garde sa dernière pose 0,8 s au lieu de
    // remettre le sorcier d'un coup au milieu dans la pose du clavier — c'était les sauts « par moment »)
    if (live) this.lastReal = { b: b0, t: now };
    const hold = !live && !tracker.sim && this.lastReal && now - this.lastReal.t < 800 && this.lastReal.b.lm;
    const b = hold ? this.lastReal.b : b0, real = live || !!hold;
    let limbs;
    let unit = 1; // (longueur d'un torse, dans l'unité des directions)
    let seg = null;
    if (real) { limbs = A.g.limbsOf(b, 0); unit = b.T || 0.25; const w3 = this.worldLimbs(b); if (w3) { seg = w3.seg; delete w3.seg; limbs = { ...limbs, ...w3 }; } }
    else { // (clavier / enfant imaginaire : la forme du petit sorcier dessiné, en directions)
      const G = A.simShape(now, st), d = (a, z) => (G[a] && G[z] ? [-(G[z][0] - G[a][0]), -(G[z][1] - G[a][1])] : null);
      limbs = { 'arm-left': d('sL', 'wL'), 'arm-right': d('sR', 'wR'), 'leg-left': st.squat ? null : d('hL', 'aL'), 'leg-right': st.squat ? null : d('hR', 'aR') };
      const d3 = (a, z) => { const v = d(a, z); if (!v) return null; const n = Math.hypot(v[0], v[1]) || 1; return [v[0] / n, v[1] / n, 0.15]; };
      seg = { 'arm-left': [d3('sL', 'eL'), d3('eL', 'wL')], 'arm-right': [d3('sR', 'eR'), d3('eR', 'wR')] };
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
    // (vitesse limitée : un faux point d'une image ne téléporte plus le sorcier ; un vrai pas de côté reste rapide)
    const sk = this.sideK ?? side, dk = (side - sk) * 0.25, cap = 0.09 * Math.max(0.25, (this.frameDt || 1 / 60) * 60);
    this.sideK = sk + Math.max(-cap, Math.min(cap, dk));
    const jk = A.lastJump && now - A.lastJump < 450 ? Math.sin(((now - A.lastJump) / 450) * Math.PI) : 0;
    if (jk === 0 && this.wasJump) this.landT = now; this.wasJump = jk > 0;
    const react = now - this.reactT < 700 ? this.reactKind : null;
    const P = { limbs, seg, clip: st.squat ? 'duck' : react === 'win' ? 'happy' : react === 'hurt' ? 'bump' : 'idle', x: this.sideK * M.side, y: jk * 0.55 + Math.sin(now / 650) * 0.012, ry: Math.PI };
    // penché dans le sens du pas de côté
    this.lean += ((this.prevSide - this.sideK) * 6 - this.lean) * 0.2; this.prevSide = this.sideK; P.rz = Math.max(-0.2, Math.min(0.2, this.lean));
    const over = this['pose3_' + this.game]; if (over) over.call(this, P, A.st, now, st);
    if (A.outro) { // célébration : bras en V et petits sauts (ou épaules qui tombent)
      const k = now - A.outro.t0, good = A.outro.ratio >= 0.5;
      P.clip = good ? 'happy' : 'idle';
      if (!this.cfg.back || this.game === 'course') { P.limbs = good ? { 'arm-left': [-0.55, 1, 0.25], 'arm-right': [0.55, 1, 0.25] } : { 'arm-left': [-0.2, -1, 0.2], 'arm-right': [0.2, -1, 0.2] }; P.facing = P.facing ?? true; }
      if (good) P.y = Math.abs(Math.sin(k / 160)) * 0.35;
      if (this.game === 'course') { P.ry = Math.min(1, k / 600) * Math.PI; P.facing = true; } // (se retourne vers nous)
      if (good && Math.floor(k / 280) !== this.confN) { this.confN = Math.floor(k / 280); this.burst(new this.T.Vector3(P.x + (Math.random() - 0.5) * 3, (P.y || 0) + 3.2, (P.z || 0) + 0.5), 18, { cols: ['#ffd166', '#ff70a6', '#7bdff2', '#b8f2a1', '#c77dff'], chunk: 'box', size: 0.07, speed: 2.5, grav: 3, life: 1600 }); }
    }
    if (P.limbs !== limbs) P.seg = null; // (pose imposée par le jeu ou la célébration : bras tendus)
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
    // coudes et genoux (personnages KayKit, qui ont un avant-bras) : bras = épaule -> coude, avant-bras = coude -> poignet
    out.seg = { 'arm-left': [dir(11, 13, 13), dir(13, 15, 15)], 'arm-right': [dir(12, 14, 14), dir(14, 16, 16)] };
    if (tracker.mode !== 'upper') { out.seg['leg-left'] = [dir(23, 25, 25), dir(25, 27, 27)]; out.seg['leg-right'] = [dir(24, 26, 26), dir(26, 28, 28)]; }
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
    const S = this.S, dt = Math.min(0.1, Math.max(0, (now - this.lastT) / 1000)); this.lastT = now; this.frameDt = dt;
    if (S.cv3 && S.cv3.style.display !== 'block') S.cv3.style.display = 'block';
    if (S.ctx) S.ctx.clearRect(0, 0, S.W, S.H); // (calque du chemin : vide)
    const B = A.B;
    if (this.skyU) this.skyU.time.value = now / 1000;
    const cam = this['cam3_' + this.game]; if (cam) cam.call(this, A.st, now); else this.camFront(this.av.group.position.x * 0.35);
    this.camFx(A, now);
    const sync = this['sync3_' + this.game]; if (sync) sync.call(this, A.st, now, dt, B);
    // mains lumineuses (pas pendant la course : on voit le sorcier de dos)
    const showGlow = !this.cfg.back && !this.cfg.noHands && B && this.hand3;
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
    this.sky(scene, [[0, '#1b1440'], [1, '#3c2a6e']], { night: 1, clouds: 0.3, cloudCol: '#5a4a8c' }); // (la nuit derrière les fenêtres)
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
    // (piliers de pierre et torches murales du Dungeon Pack de KayKit ; repli : formes simples)
    for (const [px, pz] of pil) {
      const pm = this.model('dungeon/pillar', 7.2, px, 0, pz); if (pm) { pm.scale.x *= 0.42; pm.scale.z *= 0.42; } // (affiné : le pilier du pack est trapu)
      else { this.add(scene, G.cyl, '#8f86ad', px, 3.5, pz, 0.42, 7, 0.42); this.add(scene, G.box, '#6d6487', px, 0.25, pz, 1.1, 0.5, 1.1); this.add(scene, G.box, '#6d6487', px, 7, pz, 1.1, 0.4, 1.1); }
      const tx = px + (px < 0 ? 0.62 : -0.62);
      if (!this.model('dungeon/torch_mounted', 0.75, tx, 2.25, pz + 0.25, px < 0 ? Math.PI / 2 : -Math.PI / 2)) this.add(scene, G.cyl, '#5d4037', tx, 2.6, pz + 0.2, 0.06, 0.6, 0.06);
      const fl = this.add(scene, G.cone, '#ffb703', tx, 3.05, pz + 0.2, 0.14, 0.38, 0.14, { basic: {} }); fl.castShadow = false;
      const gl = this.glow('#ff9f1c', 1.4, 0.9); gl.position.set(tx, 3.05, pz + 0.2); scene.add(gl);
      torches.push({ fl, gl });
    }
    if (o.torchLight !== false) {
      this.anims.push((now) => { for (const t of torches) { const k = 1 + Math.sin(now / 70 + t.fl.position.x) * 0.12; t.fl.scale.set(0.14 * k, 0.38 / k + 0.04, 0.14 * k); t.gl.material.opacity = 0.75 + 0.2 * Math.sin(now / 55 + t.fl.position.x); } });
    }
    // Bannières et mobilier de l'Académie (Dungeon Pack de KayKit) : bannières au mur du fond, tonneaux, coffre au trésor,
    // étagère à bougies, table, caisses ; sur les côtés, loin du sorcier
    if (o.props !== false) {
      const P = [['banner_patternA_red', 3.2, -2.4, 3.3, back + 0.45, 0], ['banner_patternB_blue', 3.2, 2.4, 3.3, back + 0.45, 0],
        ['shelf_small_candles', 2.4, -9.2, 0, back + 0.7, 0], ['barrel_large', 1.2, -7.9, 0, back + 1.3, 0.4], ['barrel_small_stack', 1.1, -6.3, 0, back + 1.0, -0.3],
        ['chest_gold', 0.9, 6.2, 0, back + 1.3, -0.35], ['crates_stacked', 1.6, 8.3, 0, back + 1.0, 0.2], ['table_medium_decorated_A', 1.0, 9.3, 0, back + 2.6, Math.PI / 2],
        ['sword_shield', 1.3, -4.6, 2.6, back + 0.4, 0], ['keg_decorated', 1.0, 9.6, 0, back + 4.2, -0.5], ['coin_stack_large', 0.35, 7.0, 0, back + 1.9, 0]];
      for (const [n, h, x, y, z, ry] of P) this.model('dungeon/' + n, h, x, y, z, ry);
      const ct = this.model('dungeon/candle_triple', 0.45, 9.3, 1.0, back + 2.6); if (ct) { const g = this.glow('#ffd166', 0.9, 0.8); g.position.set(9.3, 1.6, back + 2.6); scene.add(g); }
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
  room_meadow(scene) { // pré du château : herbe, chemin, arbres, collines, ciel bleu
    const T = this.T, G = this.G;
    this.sky(scene, [[0, '#4ea8de'], [0.6, '#bde0fe'], [1, '#e8f6ff']]);
    scene.fog = new T.Fog('#dff1ff', 30, 90);
    this.hemi.color.set('#ffffff'); this.hemi.groundColor.set('#6fbf73'); this.hemi.intensity = 1.2; this.sun.intensity = 1.6;
    this.floor(scene, '#7ccf6a', 300, (x, w, h) => { x.fillStyle = '#7ccf6a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { x.fillStyle = Math.random() < 0.5 ? '#6fbf73' : '#8fd97c'; x.fillRect(Math.random() * w, Math.random() * h, 3, 6); } }, 60);
    const path = this.tex(64, 256, (x, w, h) => { x.fillStyle = '#e6c28f'; x.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { x.fillStyle = Math.random() < 0.5 ? '#d9b27c' : '#f0d3a6'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 0, 7); x.fill(); } }, 1, 20);
    const pm = new T.Mesh(this.geo(new T.PlaneGeometry(3.2, 120)), this.mat('#ffffff', { map: path, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); pm.rotation.x = -Math.PI / 2; pm.position.set(0, 0.02, -50); pm.receiveShadow = true; pm.userData.noOutline = true; scene.add(pm);
    this.pathMap = path;
    const trees = ['quaternius/CommonTree_1', 'quaternius/CommonTree_2', 'quaternius/CommonTree_3', 'quaternius/Pine_2'];
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
      if (o.ok) { const p = new this.T.Vector3(this.av.group.position.x, 1.3, 0.3); this.burst(p, 50, { speed: 4 }); this.shock(p, '#b8f2a1', 3.2); Audio8.sample('glass', 0.5); }
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

  // ----- La grande course : vu de dos, le chevalier de l'enfant (à gauche) et le chevalier rival (à droite) courent sur
  // le chemin du pré vers la ligne d'arrivée (drapeaux, banderole), le château au fond
  init3_course(scene) {
    const S = this.S, T = this.T, G = this.G, L = A3_COURSE_L;
    let look = A3_RIVAL; if (!lookKeys(look).every((k) => S.P.models.has(k))) look = COACH_LOOKS.karate;
    this.rival = S.makeHero({ body: look.color }, false, null, true, look);
    this.rival.isGhost = true; // (n'imite pas l'enfant)
    if (this.rival.wandTip && this.rival.wandTip.parent) this.rival.wandTip.parent.visible = false;
    this.rivalS = this.avScale;
    if (this.rival.human) { S.poseHumanStill(this.rival, 'idle'); this.rival.group.updateMatrixWorld(true); const b = new T.Box3().setFromObject(this.rival.inner); this.rivalS = this.rival.scale * A3_H * 1.02 / Math.max(0.3, b.max.y - b.min.y); }
    scene.add(this.rival.group);
    // piste : lignes de couloir à la craie, ligne de départ, ligne d'arrivée à damier
    for (const x of [-1.9, 0, 1.9]) this.add(scene, G.box, '#ffffff', x, 0.03, -L / 2 + 1, 0.07, 0.02, L + 4).userData.noOutline = true;
    this.add(scene, G.box, '#ffffff', 0, 0.03, 0.6, 3.9, 0.02, 0.12).userData.noOutline = true;
    const chk = this.tex(128, 32, (x, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#1e1b4b' : '#ffffff'; x.fillRect(i * 8, j * 8, 8, 8); } });
    const fin = new T.Mesh(this.geo(new T.PlaneGeometry(3.9, 0.9)), this.mat('#ffffff', { map: chk, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
    fin.rotation.x = -Math.PI / 2; fin.position.set(0, 0.035, -L); fin.userData.noOutline = true; scene.add(fin);
    // arche d'arrivée : deux poteaux, une banderole, des drapeaux
    for (const sx of [-2.4, 2.4]) {
      this.add(scene, G.cyl, '#ffd166', sx, 1.9, -L, 0.09, 3.8, 0.09).castShadow = true;
      if (!this.model('castle/flag-banner-long', 1.6, sx, 3.8, -L, sx < 0 ? 0.3 : -0.3)) { const f = this.emo('🚩', 0.9); f.position.set(sx, 4.2, -L); scene.add(f); }
    }
    const ban = this.tex(512, 96, (x, w, h) => { x.fillStyle = '#e63946'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd166'; x.fillRect(0, 0, w, 8); x.fillRect(0, h - 8, w, 8); x.fillStyle = '#ffffff'; x.font = '800 58px "Baloo 2", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🏁 ARRIVÉE 🏁', w / 2, h / 2 + 3); });
    const bm = new T.Mesh(this.geo(new T.PlaneGeometry(4.8, 0.9)), new T.MeshBasicMaterial({ map: ban, side: T.DoubleSide })); bm.position.set(0, 3.45, -L); scene.add(bm);
    this.flag = this.emo('🏁', 1.0); this.flag.position.set(0, 4.4, -L); scene.add(this.flag);
    // le château au fond, des fanions le long de la piste
    if (!this.model('custom/castle', 26, 0, 0, -95)) { this.add(scene, G.cyl, '#e0c3fc', 0, 8, -95, 4, 16, 4); this.add(scene, G.cone, '#9d4edd', 0, 18, -95, 5, 5, 5); }
    const cols = ['#ff70a6', '#ffd166', '#7bdff2', '#b8f2a1', '#c77dff'];
    for (let z = -2; z > -L - 2; z -= 3.2) for (const s of [-1, 1]) {
      this.add(scene, G.cyl, '#8d5a3b', s * 3.0, 0.7, z, 0.05, 1.4, 0.05);
      const fl = this.add(scene, G.cone, cols[Math.floor(-z) % 5], s * 3.0 + s * 0.22, 1.25, z, 0.16, 0.4, 0.04); fl.rotation.z = s * Math.PI / 2;
    }
    this.lastWinner = null; this.dustT = 0;
  }
  rivalZ(st) { return -(st.rival || 0) * A3_COURSE_L; }
  pose3_course(P, st, now) {
    P.limbs = null; P.ry = 0; P.facing = false; P.x = -0.95; P.z = -(st.prog || 0) * A3_COURSE_L;
    P.clip = st.winner === 'kid' ? 'happy' : st.winner === 'rival' ? 'idle' : (st.sp || 0) > 0.15 && now > st.at ? 'run' : 'idle';
  }
  cam3_course(st) { // (derrière le chevalier qui est le plus en arrière : on voit toujours les deux)
    const zk = this.av.group.position.z, zr = this.rivalZ(st), back = Math.max(zk, zr), front = Math.min(zk, zr);
    this.camTo(0, 2.9, back + 5.8, 0, 1.3, front - 8, 46, 0.1);
  }
  sync3_course(st, now) {
    const S = this.S, r = this.rival; if (!r) return;
    const running = !st.winner && now > st.at, clip = st.winner === 'rival' ? 'happy' : running ? 'run' : 'idle';
    if (r.human) { const save = S.heroY3; S.heroY3 = () => 0; try { S.applyHumanPose({ lane: 0, y: 0, holdPose: null }, r, clip, now); } finally { S.heroY3 = save; } }
    r.group.scale.setScalar(this.rivalS); r.group.position.set(0.95, st.winner === 'rival' ? Math.abs(Math.sin(now / 160)) * 0.3 : 0, this.rivalZ(st)); r.group.rotation.set(0, 0, 0);
    this.flag.position.y = 4.4 + Math.sin(now / 300) * 0.1; this.flag.material.rotation = Math.sin(now / 250) * 0.15;
    // petits nuages de poussière sous les pieds de ceux qui courent
    if (now - this.dustT > 140) {
      this.dustT = now;
      if (running) this.burst(new this.T.Vector3(0.95, 0.1, this.rivalZ(st) + 0.3), 1, { tex: 'smoke', cols: ['#e6c28f'], speed: 0.4, up: 0.3, grav: 0, size: 0.35, life: 500 });
      if (running && (st.sp || 0) > 0.15) this.burst(new this.T.Vector3(-0.95, 0.1, this.av.group.position.z + 0.3), 1, { tex: 'smoke', cols: ['#e6c28f'], speed: 0.4, up: 0.3, grav: 0, size: 0.35, life: 500 });
    }
    if (st.winner && st.winner !== this.lastWinner) { // ligne d'arrivée franchie : confettis (si c'est l'enfant) ou petit « oh »
      this.lastWinner = st.winner;
      const p = new this.T.Vector3(st.winner === 'kid' ? -0.95 : 0.95, 2.6, -A3_COURSE_L);
      if (st.winner === 'kid') { Audio8.tada(); this.shake(0.06, 300); this.burst(p, 60, { cols: ['#ffd166', '#ff70a6', '#7bdff2', '#b8f2a1', '#c77dff'], chunk: 'box', size: 0.08, speed: 3.5, grav: 3, life: 1600 }); }
      else { Audio8.soft(); this.burst(p, 20, { cols: ['#e63946', '#ffffff'] }); }
    }
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
      if (m.hit && !o.boom) { o.boom = true; o.g.visible = false; Audio8.puff(); this.shake(0.05, 200); this.burst(new this.T.Vector3(x, 0.9, z), 26, { chunk: 'ball', cols: ['#ffffff', '#f1f6ff', '#f77f00'], speed: 3.5, size: 0.16, life: 1300 }); this.burst(new this.T.Vector3(x, 1, z), 16, { cols: ['#ffffff', '#bde0fe'] }); this.burst(new this.T.Vector3(x, 0.9, z), 5, { tex: 'smoke', cols: ['#ffffff'], speed: 0.8, up: 0.6, grav: -0.3, size: 0.9, life: 900 }); }
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
}
