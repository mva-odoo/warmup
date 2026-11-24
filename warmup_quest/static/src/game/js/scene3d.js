// Monde en vraie 3D (Three.js, style « jouet » low-poly), même logique de jeu que DepthScene :
// on hérite de tout (obstacles, bulles, corde, réussi / raté…) et on remplace seulement le dessin.
// Les éléments d'interface (bulles, mains, corde, ✔ / ✗, confettis) restent en 2D par-dessus,
// placés sur la projection du personnage 3D. Three.js n'est chargé qu'à l'ouverture de ce monde.

// Three.js et son chargeur de modèles glTF depuis le même paquet (une seule copie de Three.js)
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm';
const SKELETON_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/SkeletonUtils.js/+esm';
const LANE = 1.6;          // largeur d'un couloir (unités 3D)
const FX_BASE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/';
// Niveaux de qualité : ce qui coûte le plus (taille de l'image, ombres, effets, herbe, décor), réglé selon le PC
const QUALITY = {
  high:   { px: 1.25, shadows: true,  soft: true,  fx: true,  bloom: true,  grass: 1700, decor: 64, tufts: 40, shelfItems: 12, fogFar: 95 },
  medium: { px: 1.0,  shadows: true,  soft: false, fx: true,  bloom: false, grass: 900,  decor: 46, tufts: 26, shelfItems: 6,  fogFar: 85 },
  low:    { px: 0.75, shadows: false, soft: false, fx: false, bloom: false, grass: 350,  decor: 30, tufts: 14, shelfItems: 3,  fogFar: 70 },
};
const QUALITY_ORDER = ['high', 'medium', 'low'];
// Première estimation, avant de mesurer : nombre de cœurs, mémoire et carte graphique
function guessQuality(renderer) {
  let gpu = '';
  try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) { /* (inconnu) */ }
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 8;
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu) || cores <= 2 || mem <= 2) return 'low';
  if (/intel|mali|adreno|powervr|apple gpu|uhd|iris/i.test(gpu) || cores <= 4 || mem <= 4) return 'medium';
  return 'high';
}
const cubeCol = (side) => (side < 0 ? '#4ea8ff' : side > 0 ? '#ff6b35' : '#b388eb'); // cubes : bleu gauche, orange droite, violet en haut
const TER_PERIOD = 100;
const BEND_START = 12, BEND_K = 0.0017; // courbure du monde (à partir de 12 m devant la caméra)    // le relief se répète tous les 100 m (invisible grâce à la brume)

// Hauteur du terrain : plat près du chemin, collines douces plus loin (périodique en z)
function terrainH(x, z) {
  const k = Math.min(1, Math.max(0, (Math.abs(x) - 6) / 9));
  if (k <= 0) return 0;
  const w = (2 * Math.PI) / TER_PERIOD;
  const h = 1.7 * Math.sin(z * w * 2 + x * 0.11) + 1.2 * Math.sin(z * w * 3 - x * 0.07 + 1.3) + 0.9 * Math.sin(x * 0.19 + 2.1) * Math.cos(z * w);
  return k * k * Math.max(-0.2, h + 1.6);
}
const DEPTH_SCALE = 1.3;   // profondeur DepthScene -> unités 3D
const SPORT_GOAL_Z = -11, SPORT_RIM = { x: 2.9, y: 2.95, z: -4.8 }; // (île du Stade : but du penalty, panier de basket)

// Poses du héros animé : direction visée par chaque os (repère du monde : x = droite de l'écran, y = haut,
// z = vers la caméra ; le héros est vu de dos, son côté gauche « L » est à gauche de l'écran).
// Réglage des accessoires du dresseur par rapport aux os (tête, torse), en unités du jeu
// Axe de chaque os dans le modèle (au repos : bras à l'horizontale, jambes vers le bas)
const HUMAN_AXIS = { 'arm-left': [1, 0, 0], 'arm-right': [-1, 0, 0], 'leg-left': [0, -1, 0], 'leg-right': [0, -1, 0] };
const HUMAN_HAND = 0.27; // bout de la main, le long de l'axe du bras (unités du modèle)
const HUMAN_FIT = { head: 0.8, arm: 1.25, hatY: 0.6, glassesY: 0.34, glassesZ: 0.36, bagY: 0.3, bagZ: 0.3 };

// Dresseur (petits humains du pack Mini Characters de Kenney, CC0) : 13 apparences au choix
const HUMAN_MODELS = ['male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'male-g',
  'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f'];
const HUMAN_OWN_HAT = ['male-c'];
// Coachs (danse, karaté, école) : mêmes petits humains que les dresseurs
const COACH_LOOKS = {
  dance: { model: 'kk-mage', hat: 'none', glasses: false, back: 'none', color: '#ff70a6' },
  karate: { model: 'kk-barbarian', hat: 'headband', glasses: false, back: 'none', color: '#e63946' },
};
const DEFAULT_LOOK = { model: 'male-a', hat: 'wizard', glasses: false, color: '#ff6b35' }; // (petit sorcier)
// Aventuriers KayKit (style « jouet » arrondi) : un personnage entier, avec son chapeau et sa cape
const KAY_MODELS = { 'kk-knight': 'Knight', 'kk-mage': 'Mage', 'kk-barbarian': 'Barbarian', 'kk-rogue': 'Rogue', 'kk-hood': 'Rogue_Hooded' };
const isKay = (model) => !!KAY_MODELS[model];
const humanKey = (look) => (look && isKay(look.model)) ? 'kaykit/' + KAY_MODELS[look.model]
  : 'characters/character-' + (HUMAN_MODELS.includes(look && look.model) ? look.model : DEFAULT_LOOK.model);
// Morceaux du dresseur : tête (look.model), corps (look.body), jambes (look.legs) — chacun pris d'un des 13 personnages
const partKey = (look, part) => (look && isKay(look.model)) ? humanKey(look) : humanKey({ model: (look && (part === 'legs' ? look.legs || look.body : part === 'body' ? look.body : null)) || (look && look.model) });
const lookKeys = (look) => [...new Set(['head', 'body', 'legs'].map((p) => partKey(look, p)))];
// Poses du dresseur : direction visée par bras / jambes (même repère que pour le héros animé)
const HUMAN_POSES = {
  armsUp: { 'arm-left': [-0.55, 1, 0], 'arm-right': [0.55, 1, 0] },
  airplane: { 'arm-left': [-1, 0.05, 0], 'arm-right': [1, 0.05, 0] },
  star: { 'arm-left': [-0.7, 0.75, 0], 'arm-right': [0.7, 0.75, 0], 'leg-left': [-0.4, -1, 0], 'leg-right': [0.4, -1, 0] },
  flamingo: { 'arm-left': [-1, -0.1, 0], 'arm-right': [1, -0.1, 0], 'leg-right': [0, -0.25, -1] },
};

// Hauteur de la tête de l'ancien héros « jouet » (les accessoires sont dessinés pour elle)
const HERO_HEAD_Y = 1.25;

// Ciel peint (partagé avec les jeux miroir) : nuages doux qui défilent lentement, étoiles qui scintillent la nuit.
// paintSky(c, d) : c = couleur du dégradé, d = direction regardée (normalisée)
const SKY_PAINT_GLSL = `
  uniform float time, night, cloudK; uniform vec3 cloudCol;
  float skHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float skNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(skHash(i), skHash(i + vec2(1.0, 0.0)), f.x), mix(skHash(i + vec2(0.0, 1.0)), skHash(i + vec2(1.0, 1.0)), f.x), f.y); }
  float skFbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * skNoise(p); p *= 2.03; a *= 0.5; } return v; }
  vec3 paintSky(vec3 c, vec3 d) {
    float h = d.y; if (h <= 0.0) return c;
    vec2 uv = d.xz / (h + 0.22) * 1.4 + vec2(time * 0.012, time * 0.005);
    float n = skFbm(uv), cl = smoothstep(0.5, 0.78, n) * smoothstep(0.0, 0.16, h) * cloudK;
    float lit = smoothstep(0.45, 0.85, skFbm(uv + vec2(0.05, 0.07)));
    c = mix(c, mix(cloudCol, cloudCol * 0.8, lit * 0.7), cl * (1.0 - night * 0.65));
    vec2 g = d.xz / (h + 0.55) * 80.0; vec2 id = floor(g); float r = skHash(id);
    float st = step(0.982, r) * smoothstep(0.32, 0.0, length(fract(g) - 0.5)) * (0.55 + 0.45 * sin(time * (1.3 + r * 4.0) + r * 60.0));
    return c + vec3(st) * night * smoothstep(0.04, 0.3, h) * (1.0 - cl);
  }`;

class Scene3D extends DepthScene {
  constructor(canvas) {
    super(canvas);
    this.ready = false;
    this.loading = null;
  }

  // ---------- Chargement (une seule fois)
  load(progress) {
    if (this.ready) return Promise.resolve();
    if (!this.loading) this.loading = this.init(progress);
    return this.loading;
  }

  async init(progress) {
    if (progress) progress('Chargement du monde 3D…');
    const T = await import(THREE_URL);
    this.T = T;
    try { this.RoundedBox = (await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js/+esm')).RoundedBoxGeometry; } catch (e) { console.warn('Boîtes arrondies indisponibles', e); }
    // Monde « arrondi » (comme les jeux de course du commerce) : au loin, le sol plonge doucement sous l'horizon.
    // On courbe tout ce qui est dessiné, sauf les ombres (calculées sans courbure) ; project() fait de même.
    if (!T.ShaderChunk.project_vertex.includes('WUQ_BEND')) {
      T.ShaderChunk.project_vertex = T.ShaderChunk.project_vertex.replace('gl_Position = projectionMatrix * mvPosition;',
        `#if !defined( DEPTH_PACKING ) && !defined( DISTANCE ) // WUQ_BEND
        { float wuqD = max( 0.0, - mvPosition.z - ${BEND_START.toFixed(1)} ); mvPosition.y -= wuqD * wuqD * ${BEND_K}; }
        #endif
        gl_Position = projectionMatrix * mvPosition;`);
    }
    const cv = document.createElement('canvas');
    cv.id = 'scene3d';
    Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', display: 'none' });
    this.c.parentNode.insertBefore(cv, this.c); // sous le canvas 2D (transparent) qui sert de calque
    this.cv3 = cv;
    // (mode test : on garde l'image pour les captures d'écran sans fenêtre)
    const r = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: !!(typeof DEV !== 'undefined' && (DEV.get('world') || DEV.get('carnet'))) });
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    // Qualité : choix des parents (réglage), sinon estimation puis ajustement automatique en jouant
    const forced = typeof store === 'function' ? store('quality') : null;
    this.qualityAuto = !QUALITY[forced];
    this.quality = QUALITY[forced] ? forced : (typeof DEV !== 'undefined' && DEV.get('quality')) || guessQuality(r);
    this.Q = QUALITY[this.quality];
    r.setPixelRatio(Math.min(devicePixelRatio || 1, this.Q.px));
    r.toneMapping = T.ACESFilmicToneMapping; // couleurs plus riches, comme au cinéma
    r.toneMappingExposure = 1.0;
    this.renderer = r;
    this.camera = new T.PerspectiveCamera(55, 1, 0.1, 200);
    this.camera.position.set(0, 3.4, 6.8);
    this.camera.lookAt(0, 1.0, -8);
    this.resize3d();
    addEventListener('resize', () => this.resize3d());
    this.initEffects().catch((e) => console.warn('Effets d\'image indisponibles', e));
    this.emojiTex = new Map();
    this.thumbs = new Map();
    this.helpers();
    this.ready = true;
    if (this.theme) this.build(this.theme);
  }

  // Applique un niveau de qualité (à chaud : taille de l'image, ombres, effets, herbe, décor, brume)
  setQuality(q) {
    if (!QUALITY[q] || !this.renderer) return;
    const T = this.T;
    this.quality = q; this.Q = QUALITY[q];
    const Q = this.Q, r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, Q.px));
    this.resize3d();
    if (r.shadowMap.enabled !== Q.shadows || (r.shadowMap.type === T.PCFSoftShadowMap) !== Q.soft) {
      r.shadowMap.enabled = Q.shadows; r.shadowMap.type = Q.soft ? T.PCFSoftShadowMap : T.PCFShadowMap;
      if (this.sun) this.sun.castShadow = Q.shadows;
      this.s3 && this.s3.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
    }
    if (this.bloomPass) this.bloomPass.enabled = Q.bloom;
    for (const c of this.chunks || []) if (c.grass) c.grass.count = Q.grass;
    if (this.s3 && this.s3.fog && !(KITS[this.kitName] || {}).underwater) this.s3.fog.far = Q.fogFar;
    // décor en trop : on le retire (il n'est pas recréé)
    while (this.decor && this.decor.length > Q.decor) this.dispose(this.decor.pop());
    while (this.tufts && this.tufts.length > Q.tufts) this.s3.remove(this.tufts.pop());
    console.info('Qualité 3D :', q);
  }

  // Ajustement automatique : si l'image met trop longtemps à venir (moins de ~28 images/s) pendant 3 s, on baisse d'un cran
  autoQuality(now) {
    if (!this.qualityAuto || !this.theme) return;
    if (!this.qT || now - this.qT > 3000) {
      if (this.qT && this.qSlow > 0.6) {
        const next = QUALITY_ORDER[QUALITY_ORDER.indexOf(this.quality) + 1];
        if (next) this.setQuality(next);
      }
      this.qT = now; this.qSlow = 0; this.qN = 0;
    }
    this.qN = (this.qN || 0) + 1;
    const slow = this.frameMs > 36 ? 1 : 0;
    this.qSlow = ((this.qSlow || 0) * (this.qN - 1) + slow) / this.qN;
  }

  resize3d() {
    if (!this.renderer) return;
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    if (this.composer) this.composer.setSize(innerWidth, innerHeight);
  }

  // Effets d'image : léger halo lumineux (bloom) et vignettage ; désactivés si le PC rame
  async initEffects() {
    const T = this.T;
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { ShaderPass }, { OutputPass }, { Pass, FullScreenQuad }] = await Promise.all(
      ['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'ShaderPass', 'OutputPass', 'Pass'].map((n) => import(FX_BASE + n + '.js/+esm')));
    // Image de travail avec sa profondeur : elle sert à tracer les contours « à l'encre »
    const px = this.renderer.getPixelRatio(), size = new T.Vector2(innerWidth * px, innerHeight * px);
    const rt = new T.WebGLRenderTarget(size.x, size.y, { type: T.HalfFloatType, depthTexture: new T.DepthTexture(size.x, size.y) });
    const c = new EffectComposer(this.renderer, rt);
    // (chaque image de travail a SA texture de profondeur, sinon lecture et écriture se mordent la queue)
    c.renderTarget1.depthTexture = new T.DepthTexture(size.x, size.y);
    c.renderTarget2.depthTexture = new T.DepthTexture(size.x, size.y);
    const setSize0 = c.setSize.bind(c);
    c.setSize = (w, h) => {
      setSize0(w, h);
      for (const t of [c.renderTarget1, c.renderTarget2]) {
        t.depthTexture.image.width = t.width; t.depthTexture.image.height = t.height; t.depthTexture.needsUpdate = true;
      }
    };
    this.renderPass = new RenderPass(new T.Scene(), this.camera);
    c.addPass(this.renderPass);
    // Trait d'encre de dessin animé : contour sombre là où la profondeur « casse » (silhouettes, arêtes),
    // sur TOUT ce qui est dessiné (modèles animés compris), fin et régulier ; il s'efface au loin.
    // (dans le tampon de profondeur, une surface plane varie de façon linéaire : son laplacien est nul,
    //  seul un vrai bord ressort — pas de faux traits sur le sol)
    const camera = this.camera;
    const inkMat = new T.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, texel: { value: new T.Vector2(1 / size.x, 1 / size.y) },
        near: { value: camera.near }, far: { value: camera.far }, ink: { value: new T.Color('#241a4d') }, strength: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse, tDepth; uniform vec2 texel; uniform float near, far, strength; uniform vec3 ink; varying vec2 vUv;
        float zOf(float d) { return near * far / (far - d * (far - near)); } // distance réelle (m)
        void main() {
          vec4 col = texture2D(tDiffuse, vUv);
          float d = texture2D(tDepth, vUv).x, z = zOf(d);
          vec2 o = texel * 1.25;
          float dl = texture2D(tDepth, vUv - vec2(o.x, 0.)).x, dr = texture2D(tDepth, vUv + vec2(o.x, 0.)).x;
          float du = texture2D(tDepth, vUv + vec2(0., o.y)).x, dd = texture2D(tDepth, vUv - vec2(0., o.y)).x;
          float zmin = zOf(min(min(dl, dr), min(du, dd)));   // l'objet le plus proche autour : c'est lui qu'on détoure
          float lap = abs(dl + dr - 2. * d) + abs(du + dd - 2. * d);
          // normalisé par la distance (sinon les objets proches auraient un trait énorme, les lointains aucun)
          float e = lap * zmin * zmin / (near * 0.9);
          float edge = smoothstep(0.06, 0.16, e);
          edge *= col.a > 0.985 ? 1. : 0.22;                  // feuillages découpés : trait très léger (sinon l'arbre devient noir)
          edge *= 1. - smoothstep(26., 44., zmin);            // le trait s'efface au loin (pas de fouillis à l'horizon)
          gl_FragColor = vec4(mix(col.rgb, ink * col.rgb * 0.35 + ink * 0.25, edge * 0.85 * strength), col.a);
        }`,
    });
    const inkPass = new Pass();
    inkPass.fsQuad = new FullScreenQuad(inkMat);
    inkPass.render = function (renderer, writeBuffer, readBuffer) {
      inkMat.uniforms.tDiffuse.value = readBuffer.texture; inkMat.uniforms.tDepth.value = readBuffer.depthTexture;
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      this.fsQuad.render(renderer);
    };
    inkPass.setSize = (w, h) => inkMat.uniforms.texel.value.set(1 / w, 1 / h);
    c.addPass(inkPass);
    this.inkMat = inkMat;
    this.bloomPass = new UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), 0.16, 0.4, 0.95); // halo discret (sinon l'image devient laiteuse)
    this.bloomPass.enabled = this.Q.bloom;
    c.addPass(this.bloomPass);
    c.addPass(new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv);'
        // couleurs un peu plus vives et contrastées (moins « voilé »), puis vignettage
        + ' float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = max(mix(vec3(l), c.rgb, 1.22), 0.0); c.rgb = pow(c.rgb, vec3(1.07));'
        + ' float d = distance(vUv, vec2(0.5)); c.rgb *= mix(1.0, 0.72, smoothstep(0.35, 0.85, d)); gl_FragColor = c; }',
    }));
    c.addPass(new OutputPass());
    // Lissage des bords (anticrénelage FXAA) : plus d'« escaliers » sur les contours
    try {
      const { FXAAShader } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/shaders/FXAAShader.js/+esm');
      const fxaa = new ShaderPass(FXAAShader);
      fxaa.setSize = (w, h) => fxaa.material.uniforms.resolution.value.set(1 / w, 1 / h);
      c.addPass(fxaa);
    } catch (e) { console.warn('Lissage indisponible', e); }
    c.setSize(innerWidth, innerHeight);
    this.composer = c;
  }

  setWorld(theme, palettes = null, looks = null) {
    super.setWorld(theme, palettes, looks);
    this.introT = typeof DEV !== 'undefined' && DEV.get('world') ? 0 : performance.now(); this.outro = false; // vol d'arrivée de la caméra (pas en mode test)
    this.cubeMeshes = new Map(); this.cubeBits = []; this.cubeRings = [];
    this.shot = null; this.stepKind = null; this.roll = 0; this.qT = 0;
    if (this.monkeys && this.s3) this.monkeys.forEach((m) => this.dispose(m.mesh.group));
    this.monkeys = null;
    if (this.cart && this.s3) this.dispose(this.cart);
    this.cart = null; this.cartItems = []; this.cartX = null;
    if (this.bossM && this.s3) this.dispose(this.bossM.group);
    this.boss = null; this.bossM = null;
    if (this.poseModel && this.s3) this.dispose(this.poseModel.root);
    this.poseModel = null;
    if (!this.ready) return;
    this.cv3.style.display = theme ? 'block' : 'none';
    if (theme) this.build(theme);
  }

  // Outils partagés : matériaux, formes, catalogue de décors
  helpers() {
    const T = this.T;
    this.P = this.P || new Props3D(T);
    this.lam = (color, extra = {}) => this.P.toon(color, extra); // ombrage cartoon partout
    this.outlineMat = this.outlineMat || new T.MeshBasicMaterial({ color: '#1e1b4b', side: T.BackSide });
    this.shadow = (m) => { m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };
    this.geo = this.geo || {
      cone: new T.ConeGeometry(1, 1.2, 7), trunk: new T.CylinderGeometry(0.14, 0.18, 1, 6),
      ball: new T.IcosahedronGeometry(1, 1), sphere: new T.SphereGeometry(1, 14, 10),
      rock: new T.DodecahedronGeometry(1, 0), stem: new T.CylinderGeometry(0.03, 0.03, 1, 5),
      box: new T.BoxGeometry(1, 1, 1),
    };
  }

  // ---------- Construction du monde (une fois), puis paysage courant (change pendant la partie)
  build(theme) {
    const T = this.T;
    this.clear3d();
    const scene = new T.Scene();
    this.s3 = scene;
    this.helpers();
    const lam = this.lam;
    this.mat = { leaf2: lam('#5cb85c', { flatShading: true }), rock: lam('#9a9184', { flatShading: true }) };

    // Ciel (dégradé redessiné à chaque paysage) et brume
    this.skyU = {
      top: { value: new T.Color('#4cc3ff') }, mid: { value: new T.Color('#d4f4ff') }, low: { value: new T.Color('#ffffff') },
      sunDir: { value: new T.Vector3(-18, 22, -80).normalize() }, sunCol: { value: new T.Color('#fff2c7') }, glow: { value: 1 },
      time: { value: 0 }, night: { value: 0 }, cloudK: { value: 1 }, cloudCol: { value: new T.Color('#ffffff') },
    };
    this.sky = new T.Mesh(new T.SphereGeometry(190, 32, 16), new T.ShaderMaterial({
      uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top, mid, low, sunCol, sunDir; uniform float glow; varying vec3 vP;${SKY_PAINT_GLSL}
        void main(){ vec3 d = normalize(vP); float h = d.y;
          vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h * 1.6, 0.0, 1.0), 0.7)) : mix(mid, low, clamp(-h * 4.0, 0.0, 1.0));
          c = paintSky(c, d);
          float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 24.0) * 0.12 + pow(s, 160.0) * 0.5) * glow;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    this.sky.renderOrder = -1;
    scene.add(this.sky);
    scene.fog = new T.Fog('#ffffff', 34, 95);

    // Lumières
    this.hemi = new T.HemisphereLight('#ffffff', '#88aa66', 1.1);
    scene.add(this.hemi);
    const sun = new T.DirectionalLight(0xffffff, 1.7);
    sun.position.set(6, 12, 5);
    sun.target.position.set(0, 0, -4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
    scene.add(sun, sun.target);
    this.sun = sun;
    // Contre-jour bleuté venant de l'arrière : détache les personnages et les objets du décor (liseré de lumière)
    this.rim = new T.DirectionalLight('#bcd4ff', 0.55);
    this.rim.position.set(-5, 6, -9);
    scene.add(this.rim);
    this.disc = new T.Mesh(new T.SphereGeometry(4, 24, 16), new T.MeshBasicMaterial({ color: '#fff6c2', fog: false }));
    this.disc.position.set(-18, 22, -80);
    scene.add(this.disc);

    // Sol et chemin
    this.buildTerrain();
    this.pathCv = document.createElement('canvas'); this.pathCv.width = this.pathCv.height = 256;
    const tex = new T.CanvasTexture(this.pathCv);
    tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(1, 30);
    this.pathTex = tex;
    const path = new T.Mesh(new T.PlaneGeometry(LANE * 3 + 0.8, 160, 1, 96), lam('#ffffff', { map: tex }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, -70); path.receiveShadow = true;
    scene.add(path);
    // Bords du chemin bien marqués (bordure claire + liseré sombre)
    this.edges = [];
    for (const sg of [-1, 1]) {
      for (const [w, off, col] of [[0.3, 0.15, '#ffffff'], [0.12, 0.36, '#3d2b1f']]) {
        const e = new T.Mesh(new T.PlaneGeometry(w, 160, 1, 96), lam(col));
        e.rotation.x = -Math.PI / 2; e.position.set(sg * (LANE * 1.5 + 0.4 + off), 0.02, -70); e.receiveShadow = true;
        scene.add(e); this.edges.push(e);
      }
    }

    // Nuages (cachés la nuit)
    this.clouds = [];
    for (let i = 0; i < 7; i++) {
      const c = new T.Group();
      for (let k = 0; k < 5; k++) {
        const m = new T.Mesh(this.geo.sphere, lam('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.25 }));
        m.scale.setScalar(1.2 + Math.random() * 1.3);
        m.position.set(k * 1.6 - 3.2, Math.random() * 0.8, Math.random());
        c.add(m);
      }
      c.position.set(-40 + Math.random() * 80, 14 + Math.random() * 6, -45 - Math.random() * 25);
      scene.add(c); this.clouds.push(c);
    }

    // Héros (un par joueur)
    for (const h of this.heroes) { h.m3 = this.makeHero(h.pal || theme.hero, this.heroes.length > 1, theme.hero.extra, true, h.look); scene.add(h.m3.group); }
    this.hzMeshes = new Map();
    this.obsMesh = null; this.obsRef = null;
    this.decor = []; this.tufts = []; this.backdrops = null; this.particles = null; this.stars = null;
    this.coachMesh = null; this.coachStyle = null; this.encMesh = null; this.encRef = null;
    // (objets créés à la demande : ceux de la partie précédente étaient dans l'ancienne scène, on les recrée dans celle-ci)
    this.lantern = null; this.dust = null; this.ballMesh = null; this.wandMeshes = null; this.fxRings = [];
    this.sportG = null; this.sportNet = null; this.sportKind3 = undefined; this.forkSigns = null; this.companions = null;
    this.biomeIdx = -1;
    this.applyBiome(0);
    for (const c of this.chunks || []) if (c.grass) c.grass.count = this.Q.grass;
    if (this.sun) this.sun.castShadow = this.Q.shadows;
    this.renderer.shadowMap.enabled = this.Q.shadows;
  }

  // Paysage n° i du monde : couleurs, ciel, nuit, arrière-plan, particules et objets du décor
  applyBiome(i) {
    const T = this.T, scene = this.s3, b = this.theme.biomes[i], kit = KITS[b.kit] || KITS.meadow;
    const night = !!(kit.night || b.night);
    this.biomeIdx = i; this.pal = b; this.kitName = b.kit || 'meadow';
    this.skyU.top.value.set(b.sky0); this.skyU.mid.value.set(b.sky1); this.skyU.low.value.set(b.fog || b.sky1);
    this.skyU.sunCol.value.set(night ? '#cfd8ff' : '#fff2c7'); this.skyU.glow.value = night ? 0.35 : 1;
    // (nuages peints : pas sous l'eau ni dans le supermarché ; la nuit, à peine visibles, et les étoiles s'allument)
    this.skyU.night.value = night ? 1 : 0; this.skyU.cloudK.value = kit.underwater || kit.flat ? 0 : night ? 0.5 : 1;
    this.skyU.cloudCol.value.set(night ? '#8f97c8' : '#ffffff');
    scene.fog.color.set(b.fog || b.sky1);
    // Sous l'eau : brume bleue plus proche, pas de soleil ni de nuages
    const water = !!kit.underwater;
    scene.fog.near = water ? 12 : 34; scene.fog.far = water ? 62 : this.Q.fogFar;
    // La nuit : clair de lune bleuté (et non la couleur du ciel noir), lanterne qui suit le héros
    if (night) {
      this.hemi.color.set(new T.Color(b.sky1).lerp(new T.Color('#b9c8ff'), 0.7));
      this.hemi.groundColor.set(new T.Color(b.grass).lerp(new T.Color('#6b5b95'), 0.4));
    } else { this.hemi.color.set(b.sky0); this.hemi.groundColor.set(b.grass); }
    this.hemi.intensity = night ? 1.25 : 1.1;
    this.sun.intensity = night ? 1.0 : 1.7;
    this.sun.color.set(night ? '#c9d6ff' : '#ffffff');
    if (!this.lantern) { this.lantern = new T.PointLight('#ffd9a0', 0, 14, 1.4); scene.add(this.lantern); }
    this.lantern.intensity = night ? 9 : 0;
    this.renderer.toneMappingExposure = night ? 1.2 : 1.0;
    this.disc.material.color.set(b.sun || '#fff6c2');
    this.disc.scale.setScalar(night ? 0.6 : 1);
    for (const c of this.clouds) c.visible = !night && !water && !kit.flat; // (pas de nuages dans le supermarché)
    this.disc.visible = !water;
    if (water) this.skyU.glow.value = 0.2; // (lumière diffuse sous l'eau)
    this.colorTerrain(b, !!kit.grass, !!(kit.tiles || kit.pitch));
    // Carrelage au sol (Le Bain), pelouse tondue en bandes (Le Stade) : texture sur le terrain, qui défile avec lui
    const tileMap = kit.tiles ? this.tileTex() : kit.pitch ? this.pitchTex(b) : null;
    if (this.terMat && this.terMat.map !== tileMap) { this.terMat.map = tileMap; this.terMat.needsUpdate = true; }
    this.flatK = kit.flat ? 0.04 : 1; // (supermarché : le sol est plat)
    if (this.chunks) for (const c of this.chunks) c.mesh.scale.y = this.flatK;
    this.mat.leaf2.color.set(shade(b.grass, -0.1));
    this.paintPath(b, night);
    // (Stade : pas de liseré sombre de chemin, seulement la ligne blanche, comme une ligne de touche)
    this.edges.forEach((e, i) => { e.visible = !(kit.pitch && i % 2); });

    // Arrière-plan du paysage
    if (this.backdrops) this.dispose(this.backdrops);
    this.backdrops = new T.Group();
    for (const name of kit.backdrop || []) this.backdrops.add(this.P.backdrop(name, b));
    scene.add(this.backdrops);

    // Particules d'ambiance (+ étoiles la nuit)
    if (this.particles) { this.dispose(this.particles.points); this.particles = null; }
    if (kit.particles && kit.particles !== 'stars') this.particles = this.makeParticles(kit.particles);
    if (this.stars) { this.dispose(this.stars); this.stars = null; }
    if (night || kit.particles === 'stars') this.stars = this.makeStars();

    // Hautes herbes en bordure du chemin (paysages herbeux)
    for (const t of this.tufts) scene.remove(t);
    this.tufts = [];
    if (kit.grass) {
      for (let k = 0; k < this.Q.tufts; k++) {
        const t = this.makeTuft();
        if (!t) break;
        t.position.set((k % 2 ? 1 : -1) * (LANE * 1.5 + 1.4 + Math.random() * 2.2), 0, -78 + k * 2.1); // jamais sur le chemin
        scene.add(t); this.tufts.push(t);
      }
    }

    // Décor : on remplit au départ ; ensuite les objets lointains changent tout de suite, les proches en défilant
    if (!this.decor.length) {
      for (let k = 0; k < this.Q.decor; k++) { const d = this.makeDecor(); this.placeDecor(d, -80 + Math.random() * 86); scene.add(d); this.decor.push(d); } // (paysage bien rempli)
    } else {
      this.decor = this.decor.map((d) => {
        if (d.position.z > -18) return d;
        const z = d.position.z; this.dispose(d);
        const n = this.makeDecor(); this.placeDecor(n, z); scene.add(n); return n;
      });
    }
  }

  // Texture du chemin : terre battue avec grain, petits cailloux, traces plus claires et pointillés des couloirs
  paintPath(b, night) {
    const g = this.pathCv.getContext('2d'), N = 256;
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const grad = g.createLinearGradient(0, 0, 0, N);
    grad.addColorStop(0, b.path); grad.addColorStop(0.5, b.path2); grad.addColorStop(1, b.path);
    g.fillStyle = grad; g.fillRect(0, 0, N, N);
    const pitch = !!(KITS[this.kitName] || {}).pitch;
    this.pathTex.repeat.set(1, pitch ? 20 : 30); // (Stade : 8 m par motif, deux bandes de 4 m comme la pelouse autour)
    if (pitch) { // Le Stade : la même pelouse tondue en bandes, et les couloirs tracés à la craie
      for (let j = 0; j < 2; j++) { g.fillStyle = j % 2 ? b.path : b.path2; g.fillRect(0, j * N / 2, N, N / 2); }
      for (let i = 0; i < 500; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; g.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 2, 2 + rnd() * 4); } // (brins d'herbe)
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (const x of [N / 3, (2 * N) / 3]) for (let y = 8; y < N; y += 64) { g.beginPath(); g.roundRect(x - 2, y, 4, 34, 2); g.fill(); }
      this.pathTex.anisotropy = 4; this.pathTex.needsUpdate = true;
      return;
    }
    if ((KITS[this.kitName] || {}).tiles) { // Le Bain : grand tapis de bain moelleux (carreaux de couleur, bords à franges, pointillés des couloirs)
      const sz = N / 6;
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.fillStyle = (i + j) % 2 ? shade(b.path, 0.12) : shade(b.path2, 0.04); g.beginPath(); g.roundRect(i * sz + 3, j * sz + 3, sz - 6, sz - 6, 6); g.fill(); }
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(rnd() * N, rnd() * N, 2 + rnd() * 5, 0, Math.PI * 2); g.fill(); } // (petites bulles)
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (const x of [N / 3, (2 * N) / 3]) { g.beginPath(); g.roundRect(x - 3, 30, 6, 70, 3); g.fill(); }
      this.pathTex.anisotropy = 4; this.pathTex.needsUpdate = true;
      return;
    }
    // Grain de la terre
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)';
      g.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 3, 1 + rnd() * 3);
    }
    // Traces de pas plus claires au milieu de chaque couloir
    for (const cx of [N / 6, N / 2, (5 * N) / 6]) {
      const tg = g.createLinearGradient(cx - 26, 0, cx + 26, 0);
      tg.addColorStop(0, 'rgba(255,255,255,0)'); tg.addColorStop(0.5, `rgba(255,255,255,${night ? 0.05 : 0.1})`); tg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = tg; g.fillRect(cx - 26, 0, 52, N);
    }
    // Petits cailloux (ombre + reflet)
    for (let i = 0; i < 26; i++) {
      const x = rnd() * N, y = rnd() * N, r = 2 + rnd() * 4;
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x + 1, y + 1.5, r, r * 0.7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = shade(b.path, 0.25 + rnd() * 0.2); g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.25, r * 0.35, r * 0.2, 0, 0, Math.PI * 2); g.fill();
    }
    // Pointillés entre les couloirs
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (const x of [N / 3, (2 * N) / 3]) { g.beginPath(); g.roundRect(x - 3, 30, 6, 70, 3); g.fill(); }
    this.pathTex.anisotropy = 4;
    this.pathTex.needsUpdate = true;
  }

  // ---------- Terrain vallonné (3 morceaux qui défilent) et herbe au vent (milliers de brins)
  buildTerrain() {
    const T = this.T, scene = this.s3;
    this.windU = { value: 0 };
    const terMat = this.lam('#ffffff', { vertexColors: true });
    this.terMat = terMat; // (Le Bain : on y pose la texture du carrelage)
    // Brin d'herbe : petit triangle effilé ; il ondule (plus le haut que le bas) selon le temps et sa position
    const blade = new T.PlaneGeometry(0.1, 0.6, 1, 3); blade.translate(0, 0.3, 0);
    const bp = blade.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setX(i, bp.getX(i) * (1 - bp.getY(i) / 0.62));
    const grassMat = this.P.toon('#ffffff', { side: T.DoubleSide, depthWrite: false }); // (pas dans la profondeur : pas de trait d'encre sur chaque brin)
    grassMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.windU;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 ip = vec3(instanceMatrix[3]);
        transformed.x += sin(uTime * 2.2 + ip.x * 0.8 + ip.z * 0.6) * 0.16 * position.y;
        transformed.z += cos(uTime * 1.7 + ip.x * 0.5) * 0.08 * position.y;`);
    };
    grassMat.customProgramCacheKey = () => 'herbe-au-vent';
    this.chunks = [];
    for (let k = 0; k < 3; k++) {
      const g = new T.PlaneGeometry(240, TER_PERIOD, 120, 50);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, terrainH(p.getX(i), p.getZ(i)));
      g.setAttribute('color', new T.BufferAttribute(new Float32Array(p.count * 3), 3));
      g.computeVertexNormals();
      const mesh = new T.Mesh(g, terMat);
      mesh.receiveShadow = true;
      const n = 1700, grass = new T.InstancedMesh(blade, grassMat, n); // (on n'en dessine qu'une partie selon la qualité : grass.count)
      const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), pos = new T.Vector3(), up = new T.Vector3(0, 1, 0);
      for (let i = 0; i < n; i++) {
        let x;
        do { x = (Math.random() - 0.5) * 60; } while (Math.abs(x) < LANE * 1.5 + 1.0);
        const z = (Math.random() - 0.5) * TER_PERIOD;
        pos.set(x, terrainH(x, z), z);
        q.setFromAxisAngle(up, Math.random() * Math.PI);
        const s = 0.7 + Math.random() * 0.8;
        sc.set(s, s * (0.8 + Math.random() * 0.6), s);
        grass.setMatrixAt(i, m4.compose(pos, q, sc));
      }
      grass.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      mesh.add(grass);
      scene.add(mesh);
      this.chunks.push({ mesh, grass });
    }
    this.terOff = 0;
  }

  // Couleurs du terrain (taches plus claires / plus foncées) et de l'herbe pour ce paysage
  colorTerrain(b, grassy, tiles = false) {
    const T = this.T, base = new T.Color(b.grass), light = new T.Color(shade(b.grass, 0.12)), dark = new T.Color(shade(b.grass, -0.14));
    const c = new T.Color();
    for (const { mesh, grass } of this.chunks) {
      const p = mesh.geometry.attributes.position, col = mesh.geometry.attributes.color;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        const v = Math.sin(x * 0.21 + z * 0.13) * 0.5 + Math.sin(x * 0.07 - z * 0.31 + 1.7) * 0.5;
        c.copy(base).lerp(v > 0 ? light : dark, Math.abs(v) * (tiles ? 0.25 : 0.8)); // (carrelage : couleur presque unie)
        col.setXYZ(i, c.r, c.g, c.b);
      }
      col.needsUpdate = true;
      grass.visible = grassy;
      if (grassy) {
        for (let i = 0; i < grass.count; i++) {
          c.copy(base).lerp(Math.random() < 0.5 ? light : dark, Math.random()).multiplyScalar(0.95 + Math.random() * 0.15);
          grass.setColorAt(i, c);
        }
        grass.instanceColor.needsUpdate = true;
      }
    }
  }

  // Carreaux du sol (Le Bain) : carreaux blancs, joints gris clair, un carreau coloré de temps en temps (créée une fois)
  tileTex() {
    if (this._tileTex && this._tileFor === this.terMat) return this._tileTex; // (une par sol : libérée avec lui)
    const T = this.T, cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d'), n = 2, s = 128 / n;
    x.fillStyle = '#c9d6e3'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? '#ffffff' : '#f3f8fc'; x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); }
    x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) x.fillRect(i * s + 8, j * s + 8, s * 0.3, 4); // (reflet)
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(120 / n, TER_PERIOD / 2 / n); tex.anisotropy = 4;
    this._tileTex = tex; this._tileFor = this.terMat;
    return tex;
  }

  // Pelouse du Stade : larges bandes claires / foncées comme une pelouse tondue (une par couleur de paysage)
  pitchTex(b) {
    const key = b.grass + b.grass2;
    if (this._pitchTex && this._pitchFor === this.terMat && this._pitchKey === key) return this._pitchTex;
    const T = this.T, cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
    const x = cv.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#e4e4e4'; x.fillRect(0, 64, 64, 64); // (teinte posée sur la couleur du sol)
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(1, TER_PERIOD / 8); tex.anisotropy = 4; // (une bande tous les 4 m)
    this._pitchTex = tex; this._pitchFor = this.terMat; this._pitchKey = key;
    return tex;
  }

  // Hauteur du sol à une position du monde (pour poser le décor sur les collines)
  groundY(x, z) { return terrainH(x, z - this.terOff - TER_PERIOD / 2) * (this.flatK ?? 1); } // (sol plat au supermarché)

  makeTuft() {
    const t = this.P.model(Math.random() < 0.6 ? 'kenney/grass_large' : 'kenney/grass');
    if (!t) return null;
    t.scale.multiplyScalar(0.55 + Math.random() * 0.4);
    t.rotation.y = Math.random() * Math.PI * 2;
    return t;
  }

  makeDecor() {
    if (Math.random() < 0.06) { const w = this.makeWildCreature(); if (w) { w.position.y = 0; return w; } }
    const name = this.P.pick(this.kitName);
    const d = this.P.make(name, this.pal);
    d.userData.name = name;
    d.scale.multiplyScalar(0.8 + Math.random() * 0.5);
    d.rotation.y = Math.random() * Math.PI * 2;
    return d;
  }

  placeDecor(d, z) {
    const side = Math.random() < 0.5 ? -1 : 1;
    // Une bande dégagée de chaque côté du chemin : rien ne déborde dessus
    if (d.userData.name === 'shelf' || d.userData.name === 'fruitCrate') { // (rayons et cageots face au chemin)
      d.position.set(side * (LANE * 1.5 + 2.4 + Math.random() * 7), 0, z); d.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; return;
    }
    if (d.userData.name === 'adBoard') { d.position.set(side * (LANE * 1.5 + 1.9), 0, z); d.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; return; } // (Stade : le long de la touche)
    if (d.userData.name === 'cornerFlag' || d.userData.name === 'ballStack') { d.position.set(side * (LANE * 1.5 + 1.3 + Math.random() * 0.4), 0, z); return; } // (entre la touche et les panneaux)
    if (d.userData.name === 'creature') { d.position.set(side * (LANE * 1.5 + 1.8 + Math.random() * 2.2), 0, z); return; } // dans les herbes
    const nm = d.userData.name || '';
    const big = /ship|tower|hangar/.test(nm) ? 7 : /bathtub|dino|igloo|palm|bigMushroom|appleTree|roundTree|tree_|trees_|cherryTree|cherry-tree|torii|bamboo|satellite|lollypop|popsicle|crystalsLarge/.test(nm) ? 2.2 : 0;
    d.position.set(side * (LANE * 1.5 + 2.0 + big + Math.random() * 10), 0, z);
  }

  // Particules : neige, bulles, lucioles, pétales, braises
  makeParticles(kind) {
    const T = this.T, n = 260, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 40; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = -60 + Math.random() * 68; }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const look = {
      snow: ['#ffffff', 0.18], bubbles: ['#e0f7ff', 0.14], fireflies: ['#fff59d', 0.26],
      petals: ['#ffafcc', 0.2], embers: ['#ff8c42', 0.18], soap: ['#ffffff', 0.55],
    }[kind] || ['#ffffff', 0.15];
    const points = new T.Points(geo, new T.PointsMaterial({ color: look[0], size: look[1], transparent: true, opacity: 0.9, depthWrite: false, ...(kind === 'soap' ? { map: this.soapTex(), alphaTest: 0.02 } : {}) }));
    this.s3.add(points);
    const vel = { snow: [0.3, -1.2], bubbles: [0.2, 1.0], fireflies: [0.6, 0.15], petals: [0.5, -0.8], embers: [0.3, 1.4], soap: [0.4, 0.45] }[kind] || [0.2, -0.5];
    return { points, kind, vel };
  }
  // Bulle de savon (Le Bain) : anneau irisé et reflet, transparente au milieu
  soapTex() {
    const T = this.T, c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 18, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(0.7, 'rgba(190,230,255,0.45)'); g.addColorStop(0.88, 'rgba(255,170,230,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 30, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.ellipse(22, 20, 7, 4, -0.6, 0, Math.PI * 2); x.fill();
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }

  makeStars() {
    const T = this.T, n = 400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 220; pos[i * 3 + 1] = 12 + Math.random() * 60; pos[i * 3 + 2] = -95 - Math.random() * 10; }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const stars = new T.Points(geo, new T.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false }));
    this.s3.add(stars);
    return stars;
  }

  updateParticles(now, dt, move) {
    const p = this.particles;
    if (!p) return;
    const a = p.points.geometry.attributes.position, arr = a.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += Math.sin(now * 0.001 + i) * p.vel[0] * dt;
      arr[i + 1] += p.vel[1] * dt * (p.kind === 'fireflies' ? Math.sin(now * 0.002 + i) : 1);
      arr[i + 2] += move;
      if (arr[i + 1] < 0) arr[i + 1] = 14;
      if (arr[i + 1] > 14) arr[i + 1] = 0;
      if (arr[i + 2] > 8) arr[i + 2] -= 68;
    }
    a.needsUpdate = true;
  }

  // Papillons (paysages d'herbe, de jour) : deux ailes qui battent, ils volettent au bord du chemin et défilent avec le décor
  updateButterflies(now, dt, move) {
    const T = this.T, kit = KITS[this.kitName] || {}, on = !!kit.grass && !(kit.night || (this.pal && this.pal.night));
    if (!this.flies && on) {
      this.flies = [];
      const cols = ['#ff70a6', '#ffd166', '#7bdff2', '#c77dff', '#ff9f1c', '#ffffff'];
      for (let i = 0; i < 8; i++) {
        const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
        g.fillStyle = cols[i % cols.length]; g.beginPath(); g.ellipse(34, 22, 26, 18, -0.3, 0, 6.29); g.fill(); g.beginPath(); g.ellipse(30, 46, 16, 13, 0.4, 0, 6.29); g.fill();
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(38, 22, 6, 0, 6.29); g.fill();
        const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
        const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: T.DoubleSide }), grp = new T.Group();
        const wings = [-1, 1].map((sd) => { const pv = new T.Group(), w = new T.Mesh(new T.PlaneGeometry(0.6, 0.6), mat); w.position.x = sd * 0.3; w.scale.x = sd; w.rotation.x = -Math.PI / 2; pv.add(w); grp.add(pv); return pv; });
        const side = Math.random() < 0.5 ? -1 : 1;
        grp.position.set(side * (3.2 + Math.random() * 5), 0.8 + Math.random() * 1.8, 6 - Math.random() * 66);
        this.s3.add(grp); this.flies.push({ grp, wings, ph: Math.random() * 10, x0: grp.position.x, y0: grp.position.y, tex });
      }
    }
    if (!this.flies) return;
    for (const f of this.flies) {
      f.grp.visible = on; if (!on) continue;
      const t = now / 1000 + f.ph, flap = Math.sin(t * 18) * 0.9;
      f.wings[0].rotation.z = flap; f.wings[1].rotation.z = -flap;
      f.grp.position.x = f.x0 + Math.sin(t * 0.7) * 1.2; f.grp.position.y = this.groundY(f.grp.position.x, f.grp.position.z) + f.y0 + Math.sin(t * 1.9) * 0.35 + Math.abs(Math.sin(t * 9)) * 0.08;
      f.grp.position.z += move + Math.sin(t * 0.5) * dt * 0.6; f.grp.rotation.y = Math.sin(t * 0.7) * 0.9;
      if (f.grp.position.z > 8) { f.grp.position.z -= 68; f.x0 = (Math.random() < 0.5 ? -1 : 1) * (3.2 + Math.random() * 5); }
    }
  }

  // Libère le monde précédent (mémoire de la carte graphique) avant d'en construire un nouveau
  clear3d() {
    if (this.flies) { for (const f of this.flies) f.tex.dispose(); this.flies = null; }
    if (!this.s3) return;
    this.freeRes(this.s3); // (sans toucher aux modèles chargés ni aux formes et matériaux partagés)
    for (const m of Object.values(this.mat || {})) m.dispose(); // (matériaux de ce monde : recréés par build)
    if (this.skyTex) this.skyTex.dispose();
    this.s3 = null;
  }

  // Ressources partagées entre plusieurs objets (caches) : jamais libérées avec un objet
  // (modèles chargés et leurs copies, formes et matériaux communs, textures des émojis et des cubes…)
  sharedRes() {
    const P = this.P, models = P && P.models;
    const key = [models ? models.size : 0, P ? P.mats.size : 0, P && P.boxMat ? 1 : 0, this.humanGeo ? this.humanGeo.size : 0,
      this.emojiTex.size, Object.keys(this.cubeTexs || {}).length, Object.keys(this.cubeMats || {}).length].join();
    if (this._shared && this._sharedKey === key && this._sharedMat === this.mat) return this._shared;
    const s = new Set(), addMat = (m) => { if (m) { s.add(m); if (m.map) s.add(m.map); } };
    if (P) {
      for (const g of Object.values(P.geo)) s.add(g);
      for (const m of P.mats.values()) addMat(m);
      addMat(P.boxMat); if (P.gradient) s.add(P.gradient);
      if (models) for (const root of models.values()) root.traverse((o) => { if (o.geometry) s.add(o.geometry); for (const m of [].concat(o.material || [])) addMat(m); });
    }
    for (const g of Object.values(this.geo || {})) s.add(g);
    addMat(this.outlineMat);
    for (const m of Object.values(this.mat || {})) addMat(m);
    if (this.humanGeo) for (const g of this.humanGeo.values()) if (g) s.add(g);
    for (const t of this.emojiTex.values()) s.add(t);
    for (const t of Object.values(this.cubeTexs || {})) s.add(t);
    if (this.cubeGeo) s.add(this.cubeGeo);
    for (const l of Object.values(this.cubeMats || {})) for (const m of l) addMat(m);
    this._shared = s; this._sharedKey = key; this._sharedMat = this.mat;
    return s;
  }

  // Libère les géométries, matériaux et textures propres à un objet (keep : autres ressources à garder)
  freeRes(obj, keep = null) {
    if (!obj) return;
    const shared = this.sharedRes(), done = new Set(), skip = (r) => shared.has(r) || (keep && keep.has(r)) || done.has(r);
    obj.traverse((o) => {
      for (const res of [o.geometry, ...[].concat(o.material || [])]) {
        if (!res || skip(res)) continue;
        done.add(res);
        if (res.map && !skip(res.map)) { done.add(res.map); res.map.dispose(); }
        res.dispose();
      }
    });
  }

  isEmojiTex(tex) { for (const t of this.emojiTex.values()) if (t === tex) return true; return false; }

  // Personnage jouet : corps rond, oreilles, antenne-feuille, bras et jambes articulés (vu de dos)
  // Dresseur : petit humain animé (sprint, saut, accroupi, coup, joie, refus) + chapeau, sac à dos, lunettes
  makeHumanHero(pal, small, look) {
    const T = this.T, key = partKey(look, 'body'), obj = this.composeHuman(look);
    const group = new T.Group(), inner = new T.Group();
    group.add(inner); inner.add(obj);
    obj.rotation.y = Math.PI; // vu de dos
    // (matériaux propres à ce personnage : il peut devenir un peu transparent sans toucher les autres)
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material = o.material.clone(); } });
    const bones = {};
    obj.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    // Squelette KayKit : mêmes noms que les autres dresseurs pour le reste du jeu ; ses bras ont un avant-bras
    // (on vise du bras vers l'avant-bras), et son chapeau / sa cape d'origine peuvent être cachés
    const kay = !!bones['upperarm.l'], child = {};
    if (kay) {
      for (const [n, a, c] of [['arm-left', 'upperarm.l', 'lowerarm.l'], ['arm-right', 'upperarm.r', 'lowerarm.r'], ['leg-left', 'upperleg.l', 'lowerleg.l'], ['leg-right', 'upperleg.r', 'lowerleg.r']]) {
        bones[n] = bones[a]; child[n] = bones[c];
      }
      bones.torso = bones.chest; bones.handL = bones['hand.l']; bones.handR = bones['hand.r'];
      const native = { hat: null, cape: null };
      obj.traverse((o) => {
        if (!o.isMesh || o.isSkinnedMesh) return;
        if (/Throwable/i.test(o.name)) o.visible = false;
        else if (/_Cape$/.test(o.name)) native.cape = o;
        else if (/_Hat$|_Helmet$/.test(o.name)) native.hat = o;
      });
      // (chapeau d'origine gardé si l'enfant choisit « rien » ; cape d'origine si l'enfant choisit la cape)
      if (native.hat) native.hat.visible = !look.hat || look.hat === 'none' || look.hat === 'own';
      if (native.cape) native.cape.visible = look.back === 'cape';
    }
    const mixer = new T.AnimationMixer(obj), actions = {};
    for (const c of this.P.anims.get(key) || []) actions[c.name] = mixer.clipAction(c);
    for (const n of ['jump', 'crouch', 'attack-melee-right', 'emote-no', 'Jump_Full_Short', 'Sit_Floor_Down', 'Unarmed_Melee_Attack_Punch_A', 'Hit_A']) if (actions[n]) { actions[n].setLoop(T.LoopOnce); actions[n].clampWhenFinished = true; }
    const ring = new T.Mesh(new T.TorusGeometry(0.95, 0.06, 8, 40), new T.MeshBasicMaterial({ color: '#4ade80' }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; ring.visible = false; group.add(ring);
    if (small) {
      const disk = new T.Mesh(new T.CircleGeometry(0.75, 32), new T.MeshBasicMaterial({ color: pal.body, transparent: true, opacity: 0.55 }));
      disk.rotation.x = -Math.PI / 2; disk.position.y = 0.02; group.add(disk);
    }
    // ---------- Accessoires faits sur mesure : on mesure la tête et le torse de CE personnage, et chaque accessoire
    // est accroché à l'os (il suit la tête quand elle bouge, sans jamais flotter ni s'enfoncer)
    const fit = this.measureHuman(obj, bones, look);
    const col = look.color || DEFAULT_LOOK.color, dark = shade(col, -0.32), light = shade(col, 0.35);
    const hat = new T.Group(), bag = new T.Group(), glasses = new T.Group();
    (bones.head || inner).add(hat, glasses);
    (bones.torso || inner).add(bag);
    const RB = this.RoundedBox, mat = (c, o = {}) => this.lam(c, o);
    // (forme arrondie « jouet » : boîte aux coins doux)
    const rbox = (w, h, d, r = 0.12) => (RB ? new RB(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999) : new T.BoxGeometry(w, h, d));
    const put = (grp, geo, c, x, y, z, rot, o) => { const m = new T.Mesh(geo, mat(c, o)); m.position.set(x, y, z); if (rot) m.rotation.set(...rot); m.castShadow = true; grp.add(m); return m; };
    // Repère de la tête : origine au sommet du crâne, unité = largeur de la tête
    const H = fit.head, u = H.w, dr = H.d / u, hr = H.h / u;
    hat.position.set(H.cx, H.top, H.cz); hat.scale.setScalar(u);
    const hatKind = HUMAN_OWN_HAT.includes(look.model || DEFAULT_LOOK.model) ? 'none' : look.hat;
    const band = (grp, y, thick, hgt, c, grow = 1.04) => { // bandeau rectangulaire aux coins arrondis, tout autour de la tête
      const w = grow, d = dr * grow, r = 0.16;
      const shape = new T.Shape(), hole = new T.Path(), o = thick;
      const rr = (pth, x0, y0, x1, y1, rad) => { pth.moveTo(x0 + rad, y0); pth.lineTo(x1 - rad, y0); pth.quadraticCurveTo(x1, y0, x1, y0 + rad); pth.lineTo(x1, y1 - rad); pth.quadraticCurveTo(x1, y1, x1 - rad, y1); pth.lineTo(x0 + rad, y1); pth.quadraticCurveTo(x0, y1, x0, y1 - rad); pth.lineTo(x0, y0 + rad); pth.quadraticCurveTo(x0, y0, x0 + rad, y0); };
      rr(shape, -w / 2 - o, -d / 2 - o, w / 2 + o, d / 2 + o, r + o); rr(hole, -w / 2, -d / 2, w / 2, d / 2, r); shape.holes.push(hole);
      const geo = new T.ExtrudeGeometry(shape, { depth: hgt, bevelEnabled: false, curveSegments: 6 });
      const m = put(grp, geo, c, 0, y, 0, [Math.PI / 2, 0, 0]); m.position.y = y + hgt / 2; return m;
    };
    if (hatKind === 'cap') { // casquette : calotte arrondie, visière, bouton
      put(hat, rbox(1.08, 0.36, dr * 1.08, 0.17), col, 0, -0.16, 0);
      put(hat, rbox(0.84, 0.05, 0.42, 0.04), dark, 0, -0.3, dr * 0.54 + 0.15, [0.12, 0, 0]);
      put(hat, this.geo.sphere, light, 0, 0.03, 0).scale.setScalar(0.07);
    } else if (hatKind === 'beanie') { // bonnet : grande calotte douce, revers, pompon
      put(hat, rbox(1.08, 0.56, dr * 1.08, 0.26), col, 0, -0.22, 0);
      band(hat, -0.46, 0.035, 0.13, dark, 1.06);
      put(hat, this.geo.sphere, '#ffffff', 0, 0.12, 0).scale.setScalar(0.14);
    } else if (hatKind === 'headband') {
      band(hat, -0.34, 0.03, 0.12, col);
      put(hat, this.geo.sphere, dark, 0, -0.28, -dr * 0.56).scale.set(0.12, 0.09, 0.09);
    } else if (hatKind === 'crown') { // couronne : bandeau doré, pointes boulées, pierres
      const gold = '#ffd23f';
      band(hat, -0.3, 0.035, 0.2, gold, 1.0);
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2, x = Math.cos(a) * 0.52, z = Math.sin(a) * dr * 0.52;
        put(hat, new T.ConeGeometry(0.07, 0.2, 8), gold, x, -0.02, z);
        put(hat, this.geo.sphere, gold, x, 0.09, z).scale.setScalar(0.04);
      }
      for (const [x, c] of [[-0.24, '#ef476f'], [0, '#4ea8ff'], [0.24, '#5cc96b']]) put(hat, this.geo.sphere, c, x, -0.2, dr * 0.53).scale.setScalar(0.05);
    } else if (hatKind === 'flowers') { // couronne de fleurs : liane et fleurs à cinq pétales
      band(hat, -0.3, 0.03, 0.07, '#5cc96b', 1.02);
      const fc = ['#ff70a6', '#ffd166', '#ffffff', '#b388eb', '#ff9f1c'];
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * Math.PI * 2, x = Math.cos(a) * 0.55, z = Math.sin(a) * dr * 0.55, f = new T.Group();
        for (let p = 0; p < 5; p++) { const b = put(f, this.geo.sphere, fc[k % 5], Math.cos(p * 1.257) * 0.05, 0, Math.sin(p * 1.257) * 0.05); b.scale.setScalar(0.045); }
        put(f, this.geo.sphere, '#ffd23f', 0, 0.012, 0).scale.setScalar(0.03);
        f.position.set(x, -0.26, z); hat.add(f);
      }
    } else if (hatKind === 'wizard') { // chapeau de magicien : bord, cône incliné, étoile
      put(hat, new T.CylinderGeometry(0.82, 0.82, 0.04, 32), dark, 0, -0.2, 0).scale.z = dr;
      const cone = put(hat, new T.ConeGeometry(0.46, 1.05, 32), col, 0.04, 0.32, 0); cone.rotation.z = -0.12;
      put(hat, new T.CylinderGeometry(0.47, 0.47, 0.08, 32), '#ffd23f', 0, -0.14, 0);
      put(hat, new T.OctahedronGeometry(0.08, 0), '#fff3a0', 0.1, 0.25, 0.36);
    } else if (hatKind === 'cat') { // oreilles de chat sur un serre-tête
      band(hat, -0.26, 0.025, 0.06, col, 1.02);
      for (const sg of [-1, 1]) {
        put(hat, new T.ConeGeometry(0.17, 0.32, 4), col, sg * 0.3, 0.0, 0, [0, Math.PI / 4, sg * -0.25]);
        put(hat, new T.ConeGeometry(0.1, 0.2, 4), '#ffb4c8', sg * 0.3, -0.02, 0.06, [0, Math.PI / 4, sg * -0.25]);
      }
    } else if (hatKind === 'pirate') { // bicorne : deux ailes relevées, galon doré, tête de mort
      put(hat, rbox(1.06, 0.32, dr * 1.06, 0.15), '#1e1b4b', 0, -0.16, 0);
      put(hat, rbox(1.5, 0.34, 0.16, 0.08), '#1e1b4b', 0, -0.04, dr * 0.32, [-0.25, 0, 0]);
      put(hat, rbox(1.5, 0.3, 0.16, 0.08), '#1e1b4b', 0, -0.06, -dr * 0.32, [0.25, 0, 0]);
      put(hat, rbox(1.52, 0.04, 0.17, 0.02), '#ffd23f', 0, 0.12, dr * 0.36, [-0.25, 0, 0]);
      put(hat, this.geo.sphere, '#ffffff', 0, -0.02, dr * 0.42).scale.set(0.09, 0.08, 0.05);
    } else if (hatKind === 'viking') { // casque à cornes
      put(hat, rbox(1.08, 0.5, dr * 1.08, 0.25), '#adb5bd', 0, -0.2, 0);
      band(hat, -0.42, 0.035, 0.1, '#8d5a3b', 1.06);
      put(hat, rbox(0.1, 0.5, 0.06, 0.03), '#ced4da', 0, -0.2, dr * 0.55);
      for (const sg of [-1, 1]) put(hat, new T.ConeGeometry(0.1, 0.5, 16), '#fff8e7', sg * 0.64, -0.02, 0, [0, 0, -sg * 0.75]);
    } else if (hatKind === 'astro') { // casque d'astronaute : bulle transparente autour de la tête, col
      const R = 0.5 * Math.sqrt(1 + dr * dr + hr * hr) * 0.98;
      const bub = new T.Mesh(new T.SphereGeometry(R, 32, 20), new T.MeshPhysicalMaterial({ color: '#dff6ff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }));
      bub.position.set(0, -hr / 2, 0); bub.userData.noOutline = true; hat.add(bub);
      put(hat, new T.TorusGeometry(R * 0.82, 0.07, 10, 32), '#ffffff', 0, -hr / 2 - R * 0.62, 0, [Math.PI / 2, 0, 0]);
    }
    // Lunettes rondes posées sur le devant du visage, à hauteur des yeux
    if (look.glasses) {
      glasses.position.set(H.cx, H.top - H.h * 0.47, H.front + 0.004 * u); glasses.scale.setScalar(u);
      const frame = new T.TorusGeometry(0.13, 0.028, 8, 24);
      for (const sg of [-1, 1]) put(glasses, frame, '#1e1b4b', sg * 0.19, 0, 0.01);
      put(glasses, rbox(0.12, 0.03, 0.03, 0.012), '#1e1b4b', 0, 0.02, 0.01);
      for (const sg of [-1, 1]) put(glasses, new T.CircleGeometry(0.12, 20), '#e0f4ff', sg * 0.19, 0, 0.005, null, { transparent: true, opacity: 0.35 });
    }
    // Dos : sac à dos ajusté (collé au dos, bretelles sur les épaules), cape ou ailes
    const B = fit.torso, tu = B.w;
    bag.position.set(B.cx, B.cy, B.back); bag.scale.setScalar(tu);
    const backKind = look.back || 'bag';
    if (backKind === 'cape' && kay) {
      // (aventurier KayKit : il a déjà sa propre cape, montrée à la place)
    } else if (backKind === 'cape') {
      const cape = new T.Mesh(new T.CylinderGeometry(0.62, 0.78, 1.3, 16, 4, true, Math.PI - 0.85, 1.7), new T.MeshToonMaterial({ color: col, side: T.DoubleSide, gradientMap: this.P.gradient || null }));
      cape.geometry.translate(0, -0.65, 0.5); cape.position.set(0, B.h / tu * 0.45, -0.03); cape.name = 'cape'; cape.castShadow = true; bag.add(cape);
      put(bag, rbox(1.02, 0.08, 0.08, 0.03), '#ffd23f', 0, B.h / tu * 0.46, -0.02);
    } else if (backKind === 'wings') {
      for (const sg of [-1, 1]) {
        const w = new T.Group(); w.name = sg < 0 ? 'wingL' : 'wingR'; w.position.set(sg * 0.14, 0.12, -0.04); bag.add(w);
        const f = put(w, this.geo.sphere, '#ffffff', sg * 0.42, 0.06, -0.02); f.scale.set(0.46, 0.24, 0.05); f.rotation.z = sg * 0.4;
        const f2 = put(w, this.geo.sphere, '#dbeafe', sg * 0.32, -0.12, -0.03); f2.scale.set(0.3, 0.16, 0.05); f2.rotation.z = sg * 0.2;
      }
    } else if (backKind !== 'none') {
      const bd = 0.42;
      put(bag, rbox(0.74, 0.86, bd, 0.14), col, 0, 0.02, -bd / 2);
      put(bag, rbox(0.78, 0.3, bd * 0.9, 0.1), dark, 0, 0.32, -bd / 2 - 0.02);
      put(bag, rbox(0.5, 0.28, 0.1, 0.06), light, 0, -0.18, -bd - 0.03);
      put(bag, this.geo.sphere, '#ffd166', 0, 0.2, -bd - 0.03).scale.setScalar(0.05);
      // bretelles : passent par-dessus les épaules et redescendent devant
      const front = (B.front - B.back) / tu, top = B.h / tu * 0.5;
      for (const sg of [-1, 1]) {
        put(bag, rbox(0.12, 0.06, front + 0.06, 0.02), dark, sg * 0.24, top + 0.02, front / 2);
        put(bag, rbox(0.12, top * 1.3, 0.05, 0.02), dark, sg * 0.24, top * 0.35, front + 0.02);
      }
    }
    this.shadow(hat); this.shadow(bag);
    // Baguette de petit sorcier dans la main droite (toujours là : c'est le fil de l'histoire), étoile au bout
    const wand = new T.Group(), WL = 0.24;
    const stick = new T.Mesh(new T.CylinderGeometry(0.014, 0.02, WL, 8), this.lam('#4a2c1a')); stick.position.y = WL / 2; wand.add(stick);
    const tipW = new T.Mesh(new T.CylinderGeometry(0.016, 0.016, 0.05, 8), this.lam('#fff8e1')); tipW.position.y = WL - 0.02; wand.add(tipW);
    const star = new T.Mesh(new T.OctahedronGeometry(0.035, 0), new T.MeshBasicMaterial({ color: '#ffd60a' })); star.position.y = WL + 0.03; wand.add(star);
    if (kay && bones.handR) { bones.handR.add(wand); wand.position.set(0, 0.05, 0.02); }
    else if (bones['arm-right']) { bones['arm-right'].add(wand); wand.position.set(-HUMAN_HAND * 0.92, 0, 0.02); wand.rotation.z = Math.PI / 2; } // (le long du bras, au bout de la main)
    else inner.add(wand);
    this.shadow(wand);
    const scale = small ? 0.85 : 1;
    group.scale.setScalar(scale);
    return { group, inner, ring, scale, anims: [(t) => { star.rotation.y = t * 0.004; }], wandTip: star, human: { mixer, actions, bones, hat, bag, glasses, look, obj, kay, child, cur: null, last: 0 } };
  }

  // Mesure (une fois par personnage) la tête et le torse dans le repère de leur os : largeur, profondeur, sommet, avant / arrière
  measureHuman(obj, bones, look) {
    const T = this.T, key = lookKeys(look).join('|');
    this.humanFits = this.humanFits || new Map();
    if (this.humanFits.has(key)) return this.humanFits.get(key);
    obj.updateMatrixWorld(true);
    const boxIn = (mesh, bone, keep) => {
      const b = new T.Box3(), v = new T.Vector3(), pos = mesh.geometry.attributes.position, si = mesh.geometry.attributes.skinIndex;
      for (let i = 0; i < pos.count; i++) {
        if (keep && !keep(si.getX(i))) continue;
        v.fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld); bone.worldToLocal(v); b.expandByPoint(v);
      }
      return b;
    };
    let head = null, body = null;
    obj.traverse((o) => { if (o.isSkinnedMesh) { if (/^head|_Head/.test(o.name)) head = o; else if (/^body|_Body$/.test(o.name)) body = o; } });
    const res = { head: { cx: 0, cz: 0, top: 0.2, front: 0.1, w: 0.25, d: 0.25, h: 0.25 }, torso: { cx: 0, cy: 0.1, back: -0.06, front: 0.06, w: 0.2, h: 0.2 } };
    if (head && bones.head) {
      const b = boxIn(head, bones.head);
      res.head = { cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2, top: b.max.y, front: b.max.z, w: b.max.x - b.min.x, d: b.max.z - b.min.z, h: b.max.y - b.min.y };
    }
    if (body && bones.torso) {
      const ti = body.skeleton.bones.indexOf(bones.torso);
      const kayUp = bones['upperarm.l'] ? new Set([bones.chest, bones.spine].map((x) => body.skeleton.bones.indexOf(x))) : null; // (KayKit : poitrine et dos)
      const b = boxIn(body, bones.torso, kayUp ? (j) => kayUp.has(j) : (j) => j === ti);
      res.torso = { cx: (b.min.x + b.max.x) / 2, cy: (b.min.y + b.max.y) / 2, back: b.min.z, front: b.max.z, w: b.max.x - b.min.x, h: b.max.y - b.min.y };
    }
    this.humanFits.set(key, res);
    return res;
  }

  // Dresseur immobile (aperçus) : première image de l'animation de repos + pose
  poseHumanStill(m, pose = 'idle') {
    const h = { lane: 0, y: 0, holdPose: null };
    const save = this.heroY3; this.heroY3 = () => 0;
    try { for (let t = 1; t <= 801; t += 100) this.applyHumanPose(h, m, pose, t); } finally { this.heroY3 = save; } // (fondu terminé)
    m.ring.visible = false;
  }

  // Aperçu du dresseur (fenêtre « Mon dresseur ») : vu de face, sur fond transparent
  trainerThumb(look, size = 240) {
    const T = this.T;
    this.trR = this.trR || new T.WebGLRenderer({ canvas: Object.assign(document.createElement('canvas'), { width: 240, height: 300 }), antialias: true, alpha: true, preserveDrawingBuffer: true });
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight('#ffffff', '#b9c4d6', 1.5));
    const sun = new T.DirectionalLight(0xffffff, 1.6); sun.position.set(2, 4, 5); scene.add(sun);
    const m = this.makeHumanHero({ body: look.color || '#ff6b35' }, false, look);
    this.poseHumanStill(m, 'idle');
    m.group.rotation.y = look.view === "back" ? 0.5 : Math.PI + 0.45; // de face, légèrement de trois quarts (de dos pour montrer cape, ailes…)
    scene.add(m.group);
    const cam = new T.PerspectiveCamera(30, 240 / 300, 0.1, 50);
    cam.position.set(0, 1.45, 6.2); cam.lookAt(0, 1.05, 0);
    this.trR.setClearColor(0x000000, 0);
    this.trR.render(scene, cam);
    const out = document.createElement('canvas'); out.width = size; out.height = Math.round(size * 1.25);
    out.getContext('2d').drawImage(this.trR.domElement, 0, 0, out.width, out.height);
    this.freeRes(scene); // (dresseur de l'aperçu : il ne sert plus)
    return out;
  }

  hasTrainer(model) { return !!(this.P.models && this.P.models.has(humanKey({ model }))); }

  // Charge les petits dresseurs (tous, pour la fenêtre de choix)
  preloadTrainers(models = [...Object.keys(KAY_MODELS), ...HUMAN_MODELS]) {
    return this.load().then(() => this.P.preload(models.map((model) => humanKey({ model }))));
  }

  // Dresseur « à la carte » : squelette et corps d'un personnage, tête d'un autre, jambes d'un troisième
  // (les 13 personnages ont le même squelette et la même palette de couleurs : on échange les géométries)
  composeHuman(look) {
    if (look && isKay(look.model)) return this.P.model(humanKey(look));
    const kb = partKey(look, 'body'), kh = partKey(look, 'head'), kl = partKey(look, 'legs');
    const obj = this.P.model(kb);
    if (kh === kb && kl === kb) return obj;
    const meshOf = (root, name) => { let f = null; root.traverse((o) => { if (!f && o.isSkinnedMesh && o.name.startsWith(name)) f = o; }); return f; };
    const tpl = (k) => this.P.models.get(k);
    if (kh !== kb) {
      const src = tpl(kh) && meshOf(tpl(kh), 'head'), dst = meshOf(obj, 'head');
      if (src && dst) dst.geometry = src.geometry;
    }
    if (kl !== kb) {
      this.humanGeo = this.humanGeo || new Map();
      const gk = kb + '|' + kl;
      if (!this.humanGeo.has(gk)) {
        const a = tpl(kb) && meshOf(tpl(kb), 'body'), b = tpl(kl) && meshOf(tpl(kl), 'body');
        this.humanGeo.set(gk, a && b ? this.mergeBodyLegs(a.geometry, b.geometry) : null);
      }
      const g = this.humanGeo.get(gk), dst = meshOf(obj, 'body');
      if (g && dst) dst.geometry = g;
    }
    return obj;
  }

  // Haut du corps (torse, bras) d'une géométrie + jambes d'une autre (triangles des os « jambe »)
  mergeBodyLegs(gUp, gLegs) {
    const T = this.T;
    const tris = (g, legs) => {
      const idx = g.index.array, si = g.attributes.skinIndex, out = [];
      for (let t = 0; t < idx.length; t += 3) {
        let n = 0;
        for (let k = 0; k < 3; k++) { const j = si.getX(idx[t + k]); if (j === 1 || j === 2) n++; }
        if ((n >= 2) === legs) out.push(idx[t], idx[t + 1], idx[t + 2]);
      }
      return out;
    };
    const flat = (attr) => { // (attributs entrelacés ou non)
      const out = new attr.array.constructor(attr.count * attr.itemSize);
      for (let i = 0; i < attr.count; i++) for (let c = 0; c < attr.itemSize; c++) out[i * attr.itemSize + c] = attr.getComponent(i, c);
      return out;
    };
    const geo = new T.BufferGeometry(), nUp = gUp.attributes.position.count;
    for (const name of Object.keys(gUp.attributes)) {
      const A = gUp.attributes[name], B = gLegs.attributes[name];
      if (!B || B.itemSize !== A.itemSize) continue;
      const a = flat(A), b = flat(B), arr = new a.constructor(a.length + b.length);
      arr.set(a); arr.set(b, a.length);
      geo.setAttribute(name, new T.BufferAttribute(arr, A.itemSize, A.normalized));
    }
    geo.setIndex([...tris(gUp, false), ...tris(gLegs, true).map((i) => i + nUp)]);
    geo.computeBoundingSphere();
    return geo;
  }

  // Membres du joueur que ce héros doit imiter (ou null)
  liveLimbs(h) {
    if (!this.mirror || !this.limbs || !h.m3 || !h.m3.human) return null;
    return this.limbs[this.heroes.indexOf(h)] || null;
  }

  // Dresseur un peu transparent (vu de face pendant les fruits : on voit les fruits derrière lui)
  setSeeThrough(m, on) {
    if (m.seeThrough === on) return;
    m.seeThrough = on;
    (m.human.obj || m.inner).traverse((o) => { // (le personnage seul : ses matériaux lui sont propres)
      if (!o.isMesh || !o.material) return;
      for (const mt of Array.isArray(o.material) ? o.material : [o.material]) { mt.transparent = on; mt.opacity = on ? 0.72 : 1; mt.needsUpdate = true; }
    });
  }

  // Modèle à imiter : le dresseur de l'enfant, DE FACE, sur une estrade dorée à côté du chemin, qui fait la pose
  updatePoseModel(now) {
    const want = this.ghostPose && HUMAN_POSES[this.ghostPose] ? this.ghostPose : null;
    const h = this.heroes[0];
    if (!want || this.ghostOnly || !h || !h.m3 || !h.m3.human) { if (this.poseModel) this.poseModel.root.visible = false; return; }
    const T = this.T;
    if (!this.poseModel || this.poseModel.look !== h.m3.human.look) {
      if (this.poseModel) this.dispose(this.poseModel.root);
      const root = new T.Group(), m = this.makeHumanHero(h.pal || this.theme.hero, false, h.m3.human.look);
      m.facing = true; m.isGhost = true;
      m.group.rotation.y = Math.PI; // de face
      const stage = new T.Mesh(new T.CylinderGeometry(0.9, 1.05, 0.25, 32), this.lam('#ffd166'));
      stage.position.y = 0.12; stage.receiveShadow = true;
      const glow = new T.Mesh(new T.TorusGeometry(1.0, 0.05, 8, 40), new T.MeshBasicMaterial({ color: '#fff3b0' }));
      glow.rotation.x = Math.PI / 2; glow.position.y = 0.27;
      root.add(stage, glow, m.group); m.group.position.y = 0.25;
      this.s3.add(root);
      this.poseModel = { root, m, look: h.m3.human.look, pose: null, glow };
    }
    const pm = this.poseModel;
    if (pm.pose !== want) { this.poseHumanStill(pm.m, want); pm.m.group.position.y = 0.25; pm.pose = want; }
    pm.root.visible = true;
    // à gauche du chemin (la créature se met à droite), légèrement en avant pour bien se voir
    const x = -(LANE * 1.5 + 1.1), z = -2.2 + (this.cuK || 0) * 0.9;
    pm.root.position.set(x, this.groundY(x, z), z);
    pm.root.rotation.y = 0.35; // tourné vers le joueur
    pm.m.group.position.y = 0.25 + Math.abs(Math.sin(now * 0.004)) * 0.08;
    pm.glow.material.color.set(h.holdPose ? '#4ade80' : '#fff3b0');
    pm.glow.scale.setScalar(1 + 0.06 * Math.sin(now * 0.008));
  }

  // Silhouette dorée de la pose à prendre, posée sur le héros (verte quand c'est bon)
  updateGhost(h, m) {
    const turnOk = this.turnHero == null || this.stepKind !== 'pose' || this.heroes.indexOf(h) === this.turnHero; // (à deux : seulement celui dont c'est le tour)
    const r = m.human, want = HUMAN_POSES[this.ghostPose] && turnOk ? this.ghostPose : null;
    if (!want) { if (r.ghost) r.ghost.group.visible = false; return; }
    if (!r.ghost) {
      const g = this.makeHumanHero({ body: '#ffd166' }, false, r.look);
      g.isGhost = true;
      r.ghostMat = new this.T.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.42, depthWrite: false });
      g.group.traverse((o) => { if (o.isMesh) { o.material = r.ghostMat; o.castShadow = false; o.renderOrder = 3; } });
      g.group.scale.setScalar(1.07);
      // (seulement le corps et la tête : les accessoires transparents s'empileraient et cacheraient le héros)
      for (const part of [g.human.hat, g.human.bag, g.human.glasses]) part.visible = false;
      g.group.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh) o.visible = false; });
      m.group.add(g.group);
      r.ghost = g;
    }
    if (r.ghostPose !== want) { this.poseHumanStill(r.ghost, want); r.ghostPose = want; }
    r.ghost.group.position.set(0, 0, 0.05);
    r.ghost.group.visible = true;
    r.ghostMat.color.set(h.holdPose ? '#4ade80' : '#ffd166');
    r.ghostMat.opacity = 0.2 + 0.08 * Math.sin(performance.now() * 0.006);
  }

  // Dresseur : animation, poses (bras / jambes visés), accessoires posés sur la tête et le dos
  applyHumanPose(h, m, pose, now) {
    const r = m.human, T = this.T;
    const clip = (r.kay ? { run: 'Running_A', jump: 'Jump_Full_Short', duck: 'Sit_Floor_Down', smash: 'Unarmed_Melee_Attack_Punch_A', bump: 'Hit_A', happy: 'Cheer' }
      : { run: 'sprint', jump: 'jump', duck: 'crouch', smash: 'attack-melee-right', bump: 'emote-no', happy: 'emote-yes' })[pose] || (r.kay ? 'Idle' : 'idle');
    const next = r.actions[clip] || r.actions.idle || r.actions.Idle;
    if (next && next !== r.cur) { next.reset().fadeIn(0.15).play(); if (r.cur) r.cur.fadeOut(0.15); r.cur = next; }
    const dt = r.last ? Math.min(0.1, Math.max(0, (now - r.last) / 1000)) : 0;
    r.last = now;
    r.mixer.update(dt);
    // Proportions « dessin animé » lisibles de dos : tête un peu plus petite, bras plus longs (la pose se voit)
    if (r.bones.head && !r.kay) r.bones.head.scale.setScalar(HUMAN_FIT.head);
    const P = HUMAN_POSES[pose];
    const L = !m.isGhost && (m.liveL || this.liveLimbs(h)); // imitation en direct du joueur (m.liveL : chambre)
    const long = P || L ? HUMAN_FIT.arm : 1; // bras un peu plus longs pendant une pose (on la voit mieux)
    if (!r.kay) for (const n of ['arm-left', 'arm-right']) if (r.bones[n]) r.bones[n].scale.set(long, 1, 1);
    // De face (modèle à imiter, fruits) : son bras gauche est à droite de l'écran, on échange gauche / droite
    const facing = !!m.facing || (!m.isGhost && this.faceCam && !!L);
    const sw = (b) => (facing ? b.replace(/left|right/, (x) => (x === 'left' ? 'right' : 'left')) : b);
    m.inner.rotation.y = facing && !m.facing ? Math.PI : 0;
    this.setSeeThrough(m, facing && !m.facing);
    const ch = (b) => (r.kay ? r.child[b] : null); // (KayKit : on vise du bras vers son avant-bras)
    if (P) for (const [bone, dir] of Object.entries(P)) this.aimBone(r.bones[sw(bone)], ch(sw(bone)), facing ? [dir[0], dir[1], -dir[2]] : dir, m.inner, HUMAN_AXIS[sw(bone)]);
    if (L) for (const [bone, d] of Object.entries(L)) if (d && r.bones[sw(bone)]) this.aimBone(r.bones[sw(bone)], ch(sw(bone)), [d[0], d[1], facing ? -0.08 : 0.08], m.inner, HUMAN_AXIS[sw(bone)]);
    if (r.kay && (P || L)) for (const n of ['arm-left', 'arm-right', 'leg-left', 'leg-right']) if (r.child[n] && (P && P[n] || L && L[n])) r.child[n].quaternion.identity(); // (bras tendu)
    if (!m.isGhost) this.updateGhost(h, m);
    m.ring.visible = !!h.holdPose;
    m.group.position.set(h.lane * LANE, this.heroY3(h), 0);
    if (this.highFiveT && this.heroes.length > 1) { // (tape dans la main : on se rapproche puis on revient)
      const k = (performance.now() - this.highFiveT) / 1100;
      if (k < 1) { const i = this.heroes.indexOf(h); m.group.position.x += (i === 0 ? 1 : -1) * Math.sin(k * Math.PI) * LANE * 0.35; }
    }
    m.group.rotation.z = 0;
    m.group.updateMatrixWorld(true);
    const at = (bone, dx, dy, dz, target) => {
      if (!bone) return;
      const v = bone.getWorldPosition(new T.Vector3()); m.inner.worldToLocal(v);
      target.position.set(v.x + dx, v.y + dy, v.z + dz);
    };
    // (chapeau, lunettes et sac sont accrochés aux os : ils suivent tout seuls)
    // Cape qui flotte, ailes qui battent
    const t9 = now / 1000, cape = r.bag.getObjectByName('cape');
    if (cape) cape.rotation.x = 0.25 + 0.15 * Math.sin(t9 * 6) + (pose === 'run' ? 0.35 : 0);
    for (const [n, sg] of [['wingL', -1], ['wingR', 1]]) { const w = r.bag.getObjectByName(n); if (w) w.rotation.y = sg * (0.3 + 0.35 * Math.sin(t9 * 9)); }
    // Position des mains du héros, dans le repère des bulles / taupes (unité = demi-mètre autour des épaules)
    if (L) {
      const idx = this.heroes.indexOf(h), sc = m.scale, ax = m.group.position.x, ay = m.group.position.y + 1.15 * sc;
      this.avatarHands = this.avatarHands || [];
      this.avatarHands[idx] = ['arm-left', 'arm-right'].map((n) => {
        const b = r.bones[n]; if (!b) return null;
        const hb = r.kay && (n === 'arm-left' ? r.bones.handL : r.bones.handR);
        const v = hb ? hb.getWorldPosition(new T.Vector3()) : b.localToWorld(new T.Vector3(HUMAN_AXIS[n][0] * HUMAN_HAND, 0, 0)), o = b.getWorldPosition(new T.Vector3());
        // main (u, v) et épaule (su, sv) : on touche avec tout le bras
        return { u: (v.x - ax) / (0.5 * sc), v: -(v.y - ay) / (0.5 * sc), su: (o.x - ax) / (0.5 * sc), sv: -(o.y - ay) / (0.5 * sc) };
      }).filter(Boolean);
    }
  }

  makeHero(pal, small, extra = null, allowRig = true, look = null) {
    if (allowRig && this.P.models && lookKeys(look).every((k) => this.P.models.has(k))) return this.makeHumanHero(pal, small, look || DEFAULT_LOOK);
    const T = this.T, lam = this.lam, G = this.geo;
    const group = new T.Group(), inner = new T.Group();
    group.add(inner);
    const body = new T.Mesh(G.sphere, lam(pal.body)); body.scale.set(0.6, 0.63, 0.57); body.position.y = 1.0; inner.add(body);
    for (const [x, y, s] of [[-0.22, 1.2, 0.1], [0.18, 0.95, 0.08], [-0.05, 0.75, 0.11]]) {
      const sp = new T.Mesh(G.sphere, lam(shade(pal.body, 0.3))); sp.scale.setScalar(s); sp.position.set(x, y, 0.5); inner.add(sp);
    }
    for (const sg of [-1, 1]) {
      const ear = new T.Mesh(G.cone, lam(pal.body)); ear.scale.set(0.14, 0.3, 0.14); ear.position.set(sg * 0.3, 1.62, 0); ear.rotation.z = -sg * 0.35; inner.add(ear);
    }
    const stem = new T.Mesh(G.stem, lam(pal.limb)); stem.scale.set(1, 0.35, 1); stem.position.set(0.06, 1.78, 0); stem.rotation.z = -0.3; inner.add(stem);
    const leaf = new T.Mesh(G.sphere, lam(pal.accent)); leaf.scale.set(0.2, 0.08, 0.12); leaf.position.set(0.2, 1.95, 0); leaf.rotation.z = 0.4; inner.add(leaf);
    const tail = new T.Mesh(G.sphere, lam(pal.accent)); tail.scale.setScalar(0.14); tail.position.set(0, 0.62, 0.55); inner.add(tail);
    const limb = (x, y, len, r, color, endColor, endScale) => {
      const pivot = new T.Group(); pivot.position.set(x, y, 0);
      const seg = new T.Mesh(new T.CapsuleGeometry(r, len, 4, 8), lam(color)); seg.position.y = -len / 2 - r; pivot.add(seg);
      const end = new T.Mesh(G.sphere, lam(endColor)); end.scale.set(...endScale); end.position.y = -len - r * 2; pivot.add(end);
      inner.add(pivot); return pivot;
    };
    const armL = limb(-0.55, 1.15, 0.36, 0.085, pal.limb, pal.belly, [0.1, 0.1, 0.1]);
    const armR = limb(0.55, 1.15, 0.36, 0.085, pal.limb, pal.belly, [0.1, 0.1, 0.1]);
    const legL = limb(-0.24, 0.48, 0.22, 0.1, pal.limb, pal.accent, [0.15, 0.09, 0.2]);
    const legR = limb(0.24, 0.48, 0.22, 0.1, pal.limb, pal.accent, [0.15, 0.09, 0.2]);
    // Anneau vert quand le joueur tient la pose
    const ring = new T.Mesh(new T.TorusGeometry(0.95, 0.06, 8, 40), new T.MeshBasicMaterial({ color: '#4ade80' }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; ring.visible = false; group.add(ring);
    // En duo : disque de couleur sous le personnage
    if (small) {
      const disk = new T.Mesh(new T.CircleGeometry(0.75, 32), new T.MeshBasicMaterial({ color: pal.body, transparent: true, opacity: 0.55 }));
      disk.rotation.x = -Math.PI / 2; disk.position.y = 0.02; disk.userData.noOutline = true; group.add(disk);
    }
    const scale = small ? 0.85 : 1;
    group.scale.setScalar(scale);
    const anims = this.addAccessory(inner, extra || pal.extra, pal);
    this.shadow(inner);
    this.outline(inner);
    return { group, inner, armL, armR, legL, legR, ring, scale, anims };
  }

  // Coach (danse / karaté) : grand personnage jouet tourné vers le joueur, au fond de la scène
  updateCoach(now) {
    const c = this.coach;
    if (!c) { if (this.coachMesh) this.coachMesh.group.visible = false; return; }
    if (!this.coachMesh || this.coachStyle !== c.style) {
      if (this.coachMesh) this.dispose(this.coachMesh.group);
      // Coach : un petit humain de la même famille que le dresseur (Tempo le danseur, Maître Bambou au karaté)
      const look = COACH_LOOKS[c.style] || COACH_LOOKS.dance;
      const human = lookKeys(look).every((k) => this.P.models && this.P.models.has(k));
      const m = human ? this.makeHumanHero({ body: look.color }, false, look) : this.makeHero(c.pal || this.theme.hero, false, null, false);
      if (human) { m.facing = true; m.isGhost = true; } // (de face, en miroir ; pas de silhouette ni d'imitation)
      if (!human && c.style === 'karate') { // ceinture noire et bandeau rouge
        const belt = new this.T.Mesh(new this.T.TorusGeometry(0.56, 0.05, 8, 32), this.lam('#1e1b4b'));
        belt.rotation.x = Math.PI / 2; belt.position.y = 0.82; m.inner.add(belt);
        const band = new this.T.Mesh(new this.T.TorusGeometry(0.5, 0.05, 8, 32), this.lam('#e63946'));
        band.rotation.x = Math.PI / 2; band.position.y = 1.35; band.scale.set(1, 0.95, 1); m.inner.add(band);
      }
      m.group.rotation.y = Math.PI;
      m.group.scale.setScalar(human ? 1.45 : 1.6);
      this.s3.add(m.group);
      this.coachMesh = m; this.coachStyle = c.style;
    }
    const cp = this.coachPose(now), m = this.coachMesh;
    const fake = { y: -cp.y * this.H * 0.12, squat: cp.pose === 'duck', pose: cp.pose === 'smash' ? 'smash' : null,
      poseUntil: (c.t0 || 0) + Math.ceil(((now - (c.t0 || 0)) + 1) / 900) * 900, holdPose: ['armsUp', 'airplane', 'star', 'flamingo', 'run', 'jump'].includes(cp.pose) ? cp.pose : null,
      demoPose: null, bumpUntil: 0, lane: cp.lane * 0.9, m3: m };
    if (fake.holdPose === 'run' || fake.holdPose === 'jump') fake.holdPose = null;
    m.group.visible = true;
    this.applyPose(fake, now);
    m.ring.visible = false;
    m.group.position.z = -6.5;
    if (c.learn) { m.group.position.x += LANE * 1.4; m.group.position.z = -3.6; m.group.rotation.y = Math.PI - 0.35; } // (tuto : à côté du dresseur, bien visible)
    if (c.style === 'dance' && !m.human) { m.group.rotation.z = Math.sin(now * 0.008) * 0.12; m.inner.position.y += Math.abs(Math.sin(now * 0.008)) * 0.12; }
  }

  // Contour noir façon dessin animé (copie agrandie de chaque forme, vue de l'intérieur)
  outline(root, k = 1.07) {
    const meshes = [];
    root.traverse((o) => { if (o.isMesh && !o.userData.noOutline && !(o.material && o.material.transparent)) meshes.push(o); });
    for (const m of meshes) {
      const o = new this.T.Mesh(m.geometry, this.outlineMat);
      o.scale.setScalar(k); o.userData.noOutline = true;
      m.add(o);
    }
    return root;
  }

  // Modèles du monde (Kenney) chargés avant de jouer
  preloadWorld(world, looks = [], extra = []) {
    const kits = world.biomes.map((b) => b.kit || 'meadow');
    if (world.id === 'singes') extra = [...extra, 'pets/animal-monkey'];
    return this.load().then(() => this.P.preload([...new Set([DEFAULT_LOOK, ...looks, ...Object.values(COACH_LOOKS)].flatMap(lookKeys)), ...this.P.modelsOf(kits), ...creatureModels(kits.flatMap((k) => creaturesOf(k))), ...extra]));
  }

  // Petit signe distinctif du héros de chaque monde (vu de dos) ; renvoie les animations éventuelles
  addAccessory(inner, kind, pal) {
    const T = this.T, G = this.geo, lam = this.lam, anims = [];
    const add = (geo, color, x, y, z, sx, sy = sx, sz = sx, rot = null, extra = {}) => {
      const m = new T.Mesh(geo, lam(color, extra)); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
      if (rot) m.rotation.set(...rot); inner.add(m); return m;
    };
    const torus = (r, t) => new T.TorusGeometry(r, t, 8, 28);
    switch (kind) {
      case 'scarf': { // écharpe au vent
        add(torus(0.42, 0.09), '#ff9f1c', 0, 1.42, 0, 1, 1, 1, [Math.PI / 2, 0, 0]);
        const tail = add(G.sphere, '#ff9f1c', 0.25, 1.3, 0.55, 0.1, 0.06, 0.38);
        anims.push((t) => { tail.rotation.x = Math.sin(t * 0.012) * 0.4; tail.position.x = 0.25 + Math.sin(t * 0.01) * 0.06; });
        break;
      }
      case 'propellerCap': { // casquette à hélice
        add(new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#e63946', 0, 1.52, 0, 0.42, 0.3, 0.42);
        const blades = new T.Group(); blades.position.set(0, 1.86, 0); inner.add(blades);
        for (const r of [0, Math.PI]) { const b = new T.Mesh(G.sphere, lam('#ffd166')); b.scale.set(0.3, 0.03, 0.07); b.position.x = Math.cos(r) * 0.28; b.position.z = Math.sin(r) * 0.28; blades.add(b); }
        add(G.stem, '#3d3d3d', 0, 1.78, 0, 1.5, 0.2, 1.5);
        anims.push((t) => { blades.rotation.y = t * 0.02; });
        break;
      }
      case 'beanie': // bonnet à pompon
        add(new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#4cc9f0', 0, 1.48, 0, 0.5, 0.38, 0.48);
        add(torus(0.48, 0.07), '#ffffff', 0, 1.5, 0, 1, 1, 1, [Math.PI / 2, 0, 0]);
        add(G.sphere, '#ffffff', 0, 1.92, 0, 0.12);
        break;
      case 'goggles': // masque de plongée et tuba
        add(torus(0.5, 0.05), '#1e1b4b', 0, 1.35, 0, 1, 1, 1, [Math.PI / 2, 0, 0]);
        add(G.stem, '#ffbe0b', 0.42, 1.55, 0.1, 2.5, 0.7, 2.5);
        add(G.sphere, '#ffbe0b', 0.42, 1.92, 0.1, 0.07);
        break;
      case 'helmet': // casque d'astronaute (bulle transparente)
        add(G.sphere, '#bde0fe', 0, 1.2, 0, 0.78, 0.78, 0.78, null, { transparent: true, opacity: 0.28, depthWrite: false });
        add(torus(0.62, 0.07), '#e9ecef', 0, 0.72, 0, 1, 1, 1, [Math.PI / 2, 0, 0]);
        add(G.stem, '#adb5bd', 0.3, 1.95, 0, 1.2, 0.35, 1.2);
        add(G.sphere, '#ff4d6d', 0.3, 2.14, 0, 0.05, 0.05, 0.05, null, { emissive: '#ff4d6d', emissiveIntensity: 0.8 });
        break;
      case 'bow': // gros nœud
        for (const sg of [-1, 1]) add(G.sphere, '#ff4d8d', sg * 0.2, 1.68, 0, 0.18, 0.12, 0.08, [0, 0, sg * 0.4]);
        add(G.sphere, '#ff4d8d', 0, 1.68, 0, 0.07);
        break;
      case 'strawHat': // chapeau de paille
        add(new T.CylinderGeometry(1, 1, 1, 24), '#e9c46a', 0, 1.55, 0, 0.72, 0.03, 0.72);
        add(new T.CylinderGeometry(0.7, 1, 1, 20), '#e9c46a', 0, 1.7, 0, 0.36, 0.28, 0.36);
        add(torus(0.36, 0.035), '#d62828', 0, 1.6, 0, 1, 1, 1, [Math.PI / 2, 0, 0]);
        break;
      case 'spikes': // crête de petit dino le long du dos
        for (let i = 0; i < 5; i++) add(G.cone, '#ff9f1c', 0, 0.6 + i * 0.25, 0.5 - Math.abs(i - 2) * 0.04, 0.1, 0.18, 0.1, [Math.PI / 2 - 0.4, 0, 0]);
        break;
      case 'crown': // petite couronne
        add(new T.CylinderGeometry(1, 1, 1, 12, 1, true), '#ffd60a', 0, 1.62, 0, 0.26, 0.12, 0.26, null, { side: T.DoubleSide, emissive: '#ffb703', emissiveIntensity: 0.3 });
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; add(G.cone, '#ffd60a', Math.cos(a) * 0.24, 1.75, Math.sin(a) * 0.24, 0.05, 0.12, 0.05); }
        break;
      case 'flower': // fleur sur la tête
        for (let i = 0; i < 5; i++) { const a = i * 1.2566; add(G.sphere, '#ffffff', 0.12 + Math.cos(a) * 0.1, 1.72, Math.sin(a) * 0.1, 0.08); }
        add(G.sphere, '#ffd166', 0.12, 1.72, 0, 0.06);
        break;
      case 'headphones': // casque audio
        add(new T.TorusGeometry(0.5, 0.05, 8, 24, Math.PI), '#1e1b4b', 0, 1.3, 0, 1, 1, 1);
        for (const sg of [-1, 1]) add(new T.CylinderGeometry(1, 1, 1, 16), '#f15bb5', sg * 0.55, 1.3, 0, 0.15, 0.1, 0.15, [0, 0, Math.PI / 2]);
        break;
      case 'headband': { // bandeau et rubans
        add(torus(0.5, 0.05), '#d62828', 0, 1.38, 0, 1, 1, 1, [Math.PI / 2, 0, 0]);
        const r1 = add(G.sphere, '#d62828', 0.1, 1.3, 0.55, 0.05, 0.04, 0.22), r2 = add(G.sphere, '#d62828', -0.1, 1.28, 0.55, 0.05, 0.04, 0.2);
        anims.push((t) => { r1.rotation.x = Math.sin(t * 0.01) * 0.3; r2.rotation.x = Math.sin(t * 0.01 + 1) * 0.3; });
        break;
      }
    }
    return anims;
  }

  // ---------- Aperçu d'un monde pour le menu (rendu 3D une seule fois, puis réutilisé)
  thumb(world, look = null) {
    const tkey = world.id + JSON.stringify(look || {});
    if (this.thumbs.has(tkey)) return this.thumbs.get(tkey);
    const T = this.T;
    if (!this.thumbR) {
      // Affiche de monde (portrait) : même rendu que le jeu (tons cinéma, ombres douces)
      const cv = document.createElement('canvas'); cv.width = 300; cv.height = 400;
      this.thumbR = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
      this.thumbR.shadowMap.enabled = true; this.thumbR.shadowMap.type = T.PCFSoftShadowMap;
      this.thumbR.toneMapping = T.ACESFilmicToneMapping; this.thumbR.outputColorSpace = T.SRGBColorSpace;
    }
    const b = world.biomes[0], kit = KITS[b.kit] || KITS.meadow, night = !!(kit.night || b.night);
    const scene = new T.Scene(), disposables = [];
    const sky = document.createElement('canvas'); sky.width = 2; sky.height = 128;
    const sc = sky.getContext('2d'), gr = sc.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, b.sky0); gr.addColorStop(0.55, b.sky1); gr.addColorStop(1, b.fog || b.sky1); sc.fillStyle = gr; sc.fillRect(0, 0, 2, 128);
    const skyTex = new T.CanvasTexture(sky); skyTex.colorSpace = T.SRGBColorSpace; scene.background = skyTex; disposables.push(skyTex);
    scene.fog = new T.Fog(b.fog || b.sky1, 18, 60);
    scene.add(new T.HemisphereLight(b.sky0, b.grass, night ? 0.6 : 1.1));
    const sun = new T.DirectionalLight(0xffffff, night ? 0.5 : 1.6);
    sun.position.set(5, 10, 6); sun.castShadow = true; sun.shadow.mapSize.set(512, 512);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
    scene.add(sun);
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160, 40, 80), this.lam(b.grass)); ground.rotation.x = -Math.PI / 2; ground.position.z = -40; ground.receiveShadow = true; scene.add(ground);
    const path = new T.Mesh(new T.PlaneGeometry(LANE * 3 + 0.8, 80, 1, 60), this.lam(b.path)); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, -36); path.receiveShadow = true; scene.add(path);
    for (const name of kit.backdrop || []) scene.add(this.P.backdrop(name, b));
    for (let i = 0; i < 16; i++) {
      const d = this.P.make(this.P.pick(b.kit || 'meadow'), b);
      d.position.set((i % 2 ? 1 : -1) * (LANE * 1.5 + 1 + Math.random() * 5), 0, -1 - i * 2.2);
      d.rotation.y = Math.random() * 6; scene.add(d);
    }
    // Le dresseur, de face, qui salue ; une créature du coin à côté de lui
    const hero = this.makeHero(world.hero, false, world.hero.extra, true, look);
    if (hero.human) this.poseHumanStill(hero, 'armsUp');
    else if (hero.armL) { hero.armL.rotation.z = -0.6; hero.armR.rotation.z = 0.6; }
    hero.group.rotation.y = Math.PI + 0.35;
    hero.group.position.set(-0.5, 0, 0);
    scene.add(hero.group);
    const loaded = (cr) => creatureModels([cr]).every((k) => this.P.models && this.P.models.has(k));
    const mine = creaturesOf(b.kit || 'meadow')[world.id.length % 3];
    const cr = mine && loaded(mine) ? mine : creaturesOf(b.kit || 'meadow').find(loaded);
    if (cr) {
      try {
        const c = buildCreature3D(this, cr, false);
        for (let t = 0; t <= 600; t += 100) c.animate(t, 'idle');
        c.group.position.set(0.85, 0, -0.6); c.group.rotation.y = -0.5; c.group.scale.multiplyScalar(0.75);
        scene.add(c.group);
      } catch (e) { /* créature indisponible : l'affiche reste jolie sans elle */ }
    }
    const cam = new T.PerspectiveCamera(42, 3 / 4, 0.1, 120);
    cam.position.set(0.25, 1.7, 6.4); cam.lookAt(0.15, 1.05, -3);
    this.thumbR.render(scene, cam);
    const out = document.createElement('canvas'); out.width = 300; out.height = 400;
    out.getContext('2d').drawImage(this.thumbR.domElement, 0, 0);
    disposables.forEach((x) => x.dispose());
    this.freeRes(scene);
    this.thumbs.set(tkey, out);
    return out;
  }

  // Créature à apprivoiser (calque 2D placé sur le chemin 3D)
  drawEncounter3D(now) {
    if (!this.enc) return;
    const z = this.encZ(now), wz = this.z3(z), ex = this.encX(now);
    const foot = this.project(ex, 0, wz), top = this.project(ex, 2.4, wz);
    this.drawEncounterAt(now, { z, x: foot.x, gy: foot.y, s: Math.abs(foot.y - top.y), noBody: true });
  }

  // La créature se place à côté du chemin (côté droit), pour ne jamais cacher le héros
  encX() { return LANE * 1.15; }

  // Créature 3D de la rencontre : arrive, montre la pose, saute de joie ou repart en saluant
  updateEncounter3D(now) {
    const e = this.enc;
    if (!e) { if (this.encMesh) { this.dispose(this.encMesh.group); this.encMesh = null; this.encRef = null; } return; }
    // Créature animée pas encore chargée : on la charge et on la remplacera dès qu'elle est prête
    if (e.cr.model && !e.loadAsked) {
      const keys = creatureModels([e.cr]);
      if (!keys.every((k) => this.P.models && this.P.models.has(k))) {
        e.loadAsked = true;
        this.P.preload(keys).then(() => { if (this.enc === e) this.encRef = null; });
      }
    }
    if (e !== this.encRef) {
      if (this.encMesh) this.dispose(this.encMesh.group);
      this.encMesh = buildCreature3D(this, e.cr, e.evolved);
      this.s3.add(this.encMesh.group);
      this.encRef = e;
    }
    const m = this.encMesh, since = now - e.t0;
    let x = 0, k = 1.9, mode = 'idle';
    if (e.state === 'leaving') { mode = 'wave'; x = since * 0.004; k = 1.9 * Math.max(0.01, 1 - since / 900); }
    else if (e.state === 'befriend') { mode = 'happy'; if (since > 900) k = 1.9 * Math.max(0.01, 1 - (since - 900) / 400); }
    m.group.position.set(this.encX(now) + x, 0, this.z3(this.encZ(now)));
    m.group.rotation.y = -0.35; // un peu tournée vers le héros
    m.group.scale.setScalar(k * (e.evolved ? 1.25 : 1));
    m.animate(now, mode, e.state === 'waiting' ? e.pose : null);
  }

  // Créature de ce paysage qui se promène au bord du chemin
  makeWildCreature() {
    const list = creaturesOf(this.kitName);
    if (!list.length) return null;
    const c = buildCreature3D(this, list[Math.floor(Math.random() * list.length)], Math.random() < 0.2);
    c.group.scale.multiplyScalar(0.8);
    c.group.userData.name = 'creature';
    const ph = Math.random() * 6, turn = Math.random() * 6;
    c.group.userData.anim = (t) => {
      c.animate(t + ph * 1000, Math.sin(t * 0.0007 + ph) > 0.7 ? 'happy' : 'idle');
      c.group.rotation.y = turn + Math.sin(t * 0.0005 + ph) * 0.8;
    };
    return c.group;
  }

  // Rendu 3D d'une créature pour l'album (fond transparent), mis en cache
  creatureThumb(cr, evolved) {
    const key = cr.id + (evolved ? '+' : '');
    this.crThumbs = this.crThumbs || new Map();
    if (this.crThumbs.has(key)) return this.crThumbs.get(key);
    const T = this.T;
    if (!this.crR) {
      const cv = document.createElement('canvas'); cv.width = 280; cv.height = 260;
      this.crR = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    }
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight('#ffffff', '#bbbbbb', 1.2));
    const sun = new T.DirectionalLight(0xffffff, 1.4); sun.position.set(2, 4, 5); scene.add(sun);
    const c = buildCreature3D(this, cr, evolved);
    for (let t = 0; t <= 600; t += 100) c.animate(t, 'idle');
    c.group.rotation.y = -0.35;
    scene.add(c.group);
    const cam = new T.PerspectiveCamera(35, 280 / 260, 0.1, 50);
    const hh = c.height || 1.4; // (cadrage selon la taille de l'ami)
    cam.position.set(0, hh * 0.75, 1.6 + hh * 1.75); cam.lookAt(0, hh * 0.52, 0);
    this.crR.setClearColor(0x000000, 0);
    this.crR.render(scene, cam);
    const out = document.createElement('canvas'); out.width = 280; out.height = 260;
    out.getContext('2d').drawImage(this.crR.domElement, 0, 0);
    this.freeRes(scene);
    this.crThumbs.set(key, out);
    return out;
  }

  // Obstacles : en 3D ils partent moins loin (hors de la brume) pour qu'on les voie arriver longtemps
  hazardZ(hz, now) {
    const p = (now - hz.born) / hz.dur, start = 26;
    return start - (start - this.heroZ()) * p;
  }

  // Petits nuages de poussière sous les pieds quand on court
  updateDust(now, dt, move) {
    const T = this.T;
    if (!this.dust) {
      this.dust = [];
      const g = new T.IcosahedronGeometry(0.14, 0);
      for (let i = 0; i < 16; i++) {
        const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: '#efe3cf', transparent: true, opacity: 0, depthWrite: false }));
        m.visible = false; this.s3.add(m); this.dust.push({ m, t0: 0 });
      }
      this.dustAt = 0;
    }
    if (this.speed > 0.8 && now - this.dustAt > 110) {
      this.dustAt = now;
      for (const h of this.heroes) {
        if (h.y < -2) continue;
        const d = this.dust.find((x) => !x.m.visible);
        if (!d) break;
        d.t0 = now; d.m.visible = true;
        d.m.position.set(h.lane * LANE + (Math.random() - 0.5) * 0.5, 0.08, 0.35);
      }
    }
    for (const d of this.dust) {
      if (!d.m.visible) continue;
      const k = (now - d.t0) / 650;
      if (k >= 1) { d.m.visible = false; continue; }
      d.m.position.z += move; d.m.position.y += dt * 0.4;
      d.m.scale.setScalar(1 + k * 1.8);
      d.m.material.opacity = 0.55 * (1 - k);
    }
  }

  // ---------- Conversions et projection écran
  z3(depth) { return -(depth - this.heroZ()) * DEPTH_SCALE; }
  heroY3(h) { return -h.y * 5 / this.H; }
  project(x, y, z) {
    // (même courbure que les shaders : voir load())
    const v = new this.T.Vector3(x, y, z).applyMatrix4(this.camera.matrixWorldInverse);
    const d = Math.max(0, -v.z - BEND_START); v.y -= d * d * BEND_K;
    v.applyMatrix4(this.camera.projectionMatrix);
    return { x: (v.x + 1) / 2 * this.W, y: (1 - v.y) / 2 * this.H };
  }
  heroPx(i = 0) {
    if (!this.ready || !this.theme) return super.heroPx(i);
    const h = this.heroes[i] || this.heroes[0];
    return this.project(h.lane * LANE, this.heroY3(h), 0);
  }
  anchor(i) {
    if (!this.ready || !this.theme) return super.anchor(i);
    const h = this.heroes[i] || this.heroes[0], sc = h.m3 ? h.m3.scale : 1;
    const x = h.lane * LANE, y = this.heroY3(h) + 1.15 * sc;
    const a = this.project(x, y, 0), b = this.project(x, y + 0.5 * sc, 0);
    return { x: a.x, y: a.y, u: Math.abs(a.y - b.y) };
  }

  // ---------- Résultats (mêmes règles, positions 3D)
  resolve(success) {
    if (!this.ready || !this.theme) return super.resolve(success);
    const now = performance.now(), o = this.obs;
    if (this.enc && this.enc.state === 'waiting') { this.enc.state = success ? 'befriend' : 'leaving'; this.enc.t0 = now; }
    if (!o || o.state !== 'coming') return;
    o.zc = this.obsZ(now); o.state = success ? 'cleared' : 'missed'; o.t0 = now;
    const lx = o.kind === 'gemL' ? -1 : o.kind === 'gemR' ? 1 : 0;
    const p = this.project(lx * LANE, 1, this.z3(o.zc));
    if (success && (o.kind === 'crate' || o.kind === 'gemL' || o.kind === 'gemR' || o.kind === 'wall')) {
      const cols = o.kind === 'crate' ? ['#8d8173', '#bfb3a5', '#5c5248'] : o.kind === 'wall' ? ['#e07a5f', '#f2cc8f', '#ffffff'] : ['#fff', '#ffd166', '#72efdd'];
      this.burst(p.x, p.y, o.kind === 'wall' ? 40 : 18, cols);
      this.emojiPop(p.x, p.y, 3);
    } else if (success) {
      const hp = this.heroPx();
      this.emojiPop(hp.x, hp.y - this.size * 1.2, 2);
    } else if (o.kind !== 'gemL' && o.kind !== 'gemR') {
      for (const h of this.heroes) h.bumpUntil = now + 600;
    }
  }

  resolveHazard(hz, ok, idx = 0) {
    if (!this.ready || !this.theme) return super.resolveHazard(hz, ok, idx);
    hz.state = ok ? 'cleared' : 'hit';
    hz.t0 = performance.now();
    if (ok && hz.kind === 'star') {
      const p = this.heroPx(idx);
      this.emojiPop(p.x, p.y - this.size * 1.1, 2);
      this.burst(p.x, p.y - this.size * 0.8, 14, ['#fff', '#ffe066', '#ffd166']);
      hz.t0 -= 500;
    } else if (hz.kind === 'item' && ok) {
      this.cartAdd(hz.prod);
      const p = this.heroPx(idx); this.burst(p.x, p.y - this.size * 0.5, 16, ['#ffffff', '#ffe066', '#4ade80']);
      hz.t0 -= 450;
    } else if (hz.kind === 'thief' && !ok) {
      this.cartSteal();
    } else if (ok) {
      const p = this.project(hz.kind === 'rock' || hz.kind === 'cone' ? hz.lane * LANE : 0, hz.kind === 'giant' ? 1.8 : 0.8, 0.4);
      this.burst(p.x, p.y, 14, hz.kind === 'tackle' || hz.kind === 'giant' ? ['#ffffff', '#e63946', '#ffe066', '#4ade80'] : ['#ffffff', '#ffe066', '#4ade80']);
      if (hz.kind === 'tackle' || hz.kind === 'giant') this.emojiPop(p.x, p.y - this.size * 0.4, 1, '⚽');
    }
  }

  // ---------- Objets : obstacles, étoiles, mur
  emojiSprite(ch, size) {
    const T = this.T;
    let tex = this.emojiTex.get(ch);
    if (!tex) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = 'rgba(255, 245, 180, 0.55)'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill();
      x.font = '84px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 70);
      tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
      this.emojiTex.set(ch, tex);
    }
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false }));
    s.scale.set(size, size, 1);
    return s;
  }

  makeLog() {
    const T = this.T, m = new T.Group();
    const log = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, LANE * 3 + 0.6, 10), this.lam('#8a5a2b'));
    log.rotation.z = Math.PI / 2; log.position.y = 0.32; m.add(log);
    return this.shadow(m);
  }

  makeArch() {
    const T = this.T, m = new T.Group(), wood = this.lam('#6b4a2b');
    for (const sg of [-1, 1]) { const p = new T.Mesh(this.geo.trunk, wood); p.scale.set(0.8, 2.0, 0.8); p.position.set(sg * (LANE * 1.5 + 0.3), 1.0, 0); m.add(p); }
    const beam = new T.Mesh(new T.BoxGeometry(LANE * 3 + 1, 0.25, 0.3), wood); beam.position.y = 1.85; m.add(beam);
    for (let i = 0; i < 9; i++) { const l = new T.Mesh(this.geo.ball, this.mat.leaf2); l.scale.setScalar(0.25); l.position.set(-2.6 + i * 0.65, 1.68, 0.1); m.add(l); }
    return this.shadow(m);
  }

  // ---------- Stade : joueurs de l'équipe rouge (obstacles de la course) et plots
  // Joueur : un petit humain (comme les dresseurs) en maillot rouge, tourné vers l'enfant ; repli : bonhomme simple
  makeFootPlayer(pose = 'idle', legs = null) {
    const T = this.T, models = typeof FOOT_PLAYER_MODELS !== 'undefined' ? FOOT_PLAYER_MODELS : ['male-a'];
    this.footN = (this.footN || 0) + 1;
    const look = { model: models[this.footN % models.length], hat: 'none', glasses: false, back: 'none', color: '#e63946' };
    const loaded = (lk) => this.P.models && lookKeys(lk).every((k) => this.P.models.has(k));
    const lk = loaded(look) ? look : loaded(DEFAULT_LOOK) ? { ...DEFAULT_LOOK, hat: 'none', back: 'none', color: '#e63946' } : null;
    if (!lk) { // (personnages pas chargés : bonhomme rouge en formes simples)
      const g = new T.Group(), red = this.lam('#e63946'), skin = this.lam('#ffcf9e'), dark = this.lam('#1e1b4b');
      const body = new T.Mesh(this.geo.sphere, red); body.scale.set(0.42, 0.55, 0.32); body.position.y = 1.15; g.add(body);
      const head = new T.Mesh(this.geo.sphere, skin); head.scale.setScalar(0.3); head.position.y = 1.9; g.add(head);
      for (const sg of [-1, 1]) {
        const leg = new T.Mesh(this.geo.trunk, dark); leg.scale.set(0.7, 0.75, 0.7); leg.position.set(sg * 0.18 + (legs ? sg * 0.15 : 0), 0.4, 0); leg.rotation.z = legs ? sg * 0.35 : 0; g.add(leg);
        const arm = new T.Mesh(this.geo.trunk, red); arm.scale.set(0.5, 0.7, 0.5);
        if (pose === 'airplane') { arm.position.set(sg * 0.75, 1.4, 0); arm.rotation.z = sg * Math.PI / 2; } else { arm.position.set(sg * 0.5, 1.05, 0); arm.rotation.z = sg * 0.25; }
        g.add(arm);
      }
      return { group: this.shadow(g), human: false };
    }
    const m = this.makeHumanHero({ body: '#e63946' }, false, lk);
    m.isGhost = true; // (pas de fantôme de pose, pas d'imitation de l'enfant)
    if (m.wandTip && m.wandTip.parent) m.wandTip.parent.visible = false; // (pas de baguette : c'est un footballeur)
    this.poseHumanStill(m, pose);
    const r = m.human;
    if (legs) for (const [n, d] of Object.entries(legs)) this.aimBone(r.bones[n], r.kay ? r.child[n] : null, d, m.inner, HUMAN_AXIS[n]);
    // Maillot rouge de l'équipe adverse (bande blanche) par-dessus le torse
    if (r.bones.torso) {
      const B = this.measureHuman(r.obj, r.bones, lk).torso, d = Math.max(0.05, B.front - B.back);
      const RB = this.RoundedBox, geo = RB ? new RB(B.w * 1.16, B.h * 1.12, d * 1.25, 3, Math.min(B.w, d) * 0.2) : new T.BoxGeometry(B.w * 1.16, B.h * 1.12, d * 1.25);
      const shirt = new T.Mesh(geo, this.lam('#e63946')); shirt.position.set(B.cx, B.cy, (B.front + B.back) / 2); shirt.castShadow = true; r.bones.torso.add(shirt);
      const band = new T.Mesh(new T.BoxGeometry(B.w * 1.18, B.h * 0.18, d * 1.28), this.lam('#ffffff')); band.position.copy(shirt.position); band.position.y += B.h * 0.12; r.bones.torso.add(band);
    }
    m.group.rotation.y = Math.PI; // (de face : il vient vers l'enfant)
    return m;
  }
  // Tacle : un joueur glisse au ras du sol, couché en travers du chemin, jambe tendue ; une gerbe d'herbe sur toute la largeur
  makeTackle() {
    const T = this.T, g = new T.Group(), p = this.makeFootPlayer('idle', { 'leg-left': [0.15, -1, -0.9], 'leg-right': [-0.1, -1, 0.15] });
    const pl = p.group; pl.scale.multiplyScalar(1.2);
    pl.rotation.set(0, Math.PI, Math.PI / 2 * 0.92); // (couché sur le côté, la tête vers un bord du chemin)
    const wrap = new T.Group(); wrap.add(pl); pl.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(pl), c = box.getCenter(new T.Vector3());
    pl.position.set(-c.x, -box.min.y + 0.02, -c.z);
    g.add(wrap); g.userData.slider = wrap;
    // gerbe d'herbe et de terre soulevée, d'un bord à l'autre du chemin (on saute par-dessus tout ça)
    const greens = ['#6fbf73', '#8fd97c', '#ffffff', '#c49a6c'], clumps = [];
    for (let i = 0; i < 22; i++) {
      const b = new T.Mesh(this.geo.ball, this.lam(greens[i % 4])); const x = -LANE * 1.5 - 0.2 + (i / 21) * (LANE * 3 + 0.4);
      b.scale.setScalar(0.09 + Math.random() * 0.08); b.position.set(x, 0.15 + Math.random() * 0.35, 0.35 + Math.random() * 0.3); g.add(b); clumps.push([b, b.position.y, Math.random() * 6]);
    }
    const line = new T.Mesh(new T.BoxGeometry(LANE * 3 + 0.6, 0.05, 0.5), this.lam('#ffffff', { transparent: true, opacity: 0.6 })); line.position.set(0, 0.03, 0.2); g.add(line); // (trace blanche)
    const ball = new T.Mesh(this.geo.sphere, this.lam('#ffffff')); ball.scale.setScalar(0.22); ball.position.set(0.9, 0.22, 0.7); g.add(ball);
    for (let i = 0; i < 5; i++) { const sp = new T.Mesh(this.geo.sphere, this.lam('#1e1b4b')); sp.scale.setScalar(0.3); const a = i * 1.26; sp.position.set(Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0.3); ball.add(sp); }
    g.userData.clumps = clumps; g.userData.ball = ball;
    return this.shadow(g);
  }
  // Grand joueur (1,6 fois plus grand) bras grands écartés, jambes ouvertes : on passe dessous en se baissant
  makeGiant() {
    const T = this.T, g = new T.Group(), p = this.makeFootPlayer('airplane', { 'leg-left': [-0.38, -1, 0], 'leg-right': [0.38, -1, 0] });
    p.group.scale.multiplyScalar(1.6);
    g.add(p.group); g.userData.giant = p.group;
    return this.shadow(g);
  }
  // Plot orange (à rayures blanches, socle noir) dans un couloir : on change de couloir
  makeCone() {
    const T = this.T, g = new T.Group();
    const base = new T.Mesh(this.geo.box, this.lam('#1e1b4b')); base.scale.set(0.8, 0.08, 0.8); base.position.y = 0.04; g.add(base);
    const cone = new T.Mesh(new T.ConeGeometry(0.34, 1.05, 20), this.lam('#ff7b00')); cone.position.y = 0.6; g.add(cone);
    for (const [y, r] of [[0.45, 0.27], [0.75, 0.17]]) { const st = new T.Mesh(new T.CylinderGeometry(r * 0.92, r * 1.08, 0.12, 20), this.lam('#ffffff')); st.position.y = y; g.add(st); }
    return this.shadow(g);
  }

  makeRock(r = 0.65) {
    const m = new this.T.Mesh(this.geo.rock, this.mat.rock);
    m.scale.setScalar(r); m.position.y = r * 0.8;
    const g = new this.T.Group(); g.add(m);
    return this.shadow(g);
  }

  makeWall(pose) {
    const T = this.T, c = document.createElement('canvas'); c.width = 512; c.height = 300;
    const x = c.getContext('2d');
    x.fillStyle = '#e07a5f'; x.fillRect(0, 0, 512, 300);
    x.strokeStyle = 'rgba(120, 50, 30, 0.45)'; x.lineWidth = 3;
    for (let y = 0, row = 0; y < 300; y += 30, row++) {
      x.beginPath(); x.moveTo(0, y); x.lineTo(512, y); x.stroke();
      for (let bx = (row % 2) * 30; bx < 512; bx += 60) { x.beginPath(); x.moveTo(bx, y); x.lineTo(bx, y + 30); x.stroke(); }
    }
    stickFigure(x, { x: 256, y: 290, s: 270, ...(POSE_FIGURES[pose] || POSE_FIGURES.armsUp) }, '#fff7d6', 2.6);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const wall = new T.Mesh(new T.BoxGeometry(LANE * 3 + 0.8, 3.2, 0.3), this.lam('#ffffff', { map: tex }));
    wall.position.y = 1.6;
    const g = new T.Group(); g.add(wall);
    return this.shadow(g);
  }

  // Photo souvenir : renvoie (promesse) l'image de la prochaine image dessinée
  snapshot() {
    return new Promise((resolve) => {
      this.snapReq = resolve;
      if (typeof DEV !== 'undefined' && DEV.get('world')) return; // (capture sans fenêtre : le temps virtuel court plus vite que les images)
      setTimeout(() => { if (this.snapReq === resolve) { this.snapReq = null; resolve(null); } }, 6000);
    });
  }

  // ---------- Chambre du dresseur : une petite pièce en 3D avec sa collection, où l'on touche les choses
  // data : { kids: [{ name, color, look, companion: {cr, level}, photos: [url], stickers: [émojis] }] (1 ou 2 enfants : un lit chacun),
  //          friends: [{cr, evolved}], trophies: [étoiles par monde], onPhoto(url) }
  // On touche (souris, doigt, ou petite main des gestes) : le dresseur salue, les créatures sautent et chantent, le lit
  // endort son dresseur (la nuit tombe), la lampe s'allume, les trophées tournent, l'affiche lance ses gommettes…
  openRoom(canvas, data) {
    const T = this.T;
    this.closeRoom();
    // (appelée après un chargement : si l'enfant a déjà quitté la chambre, on ne lance rien en arrière-plan)
    const screen = canvas.closest('.screen'), gone = () => !canvas.isConnected || (screen && screen.classList.contains('hidden'));
    if (gone()) return;
    const r = new T.WebGLRenderer({ canvas, antialias: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    r.toneMapping = T.ACESFilmicToneMapping; r.outputColorSpace = T.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
    const DAY = new T.Color('#2b2160'), NIGHT = new T.Color('#0b0a24');
    const scene = new T.Scene(); scene.background = DAY.clone();
    const hemi = new T.HemisphereLight('#fff4e0', '#6b5b95', 1.3); scene.add(hemi);
    const sun = new T.DirectionalLight('#fff1d6', 1.7); sun.position.set(4, 8, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
    scene.add(sun);
    const lamp = new T.PointLight('#ffcf8a', 6, 12, 1.5); lamp.position.set(-5, 3.6, -3.4); scene.add(lamp);
    const lam = (c, o) => this.P.toon(c, o), box = new T.BoxGeometry(1, 1, 1);
    const add = (geo, c, x, y, z, sx, sy, sz, parent = scene) => { const m = new T.Mesh(geo, lam(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    const kids = (data.kids && data.kids.length ? data.kids : [{}]).slice(0, 2), duo = kids.length > 1;
    // (objets à toucher : act(obj) appelé au toucher ; le plus proche sous le doigt gagne)
    const acts = [], act = (o, f, name = '') => { o.userData.act = f; o.userData.name = name; acts.push(o); return o; };
    // Petites images flottantes (cœurs, étoiles, Zzz, gommettes) : sprites à partir d'émojis
    const emoTex = new Map(), emo = (ch) => {
      if (!emoTex.has(ch)) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.font = '100px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 70); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; emoTex.set(ch, t); }
      return emoTex.get(ch);
    };
    const parts = [], puff = (pos, chars, n = 6, o = {}) => {
      for (let i = 0; i < n; i++) {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: emo(chars[i % chars.length]), transparent: true, depthWrite: false })); sp.position.copy(pos); sp.scale.setScalar(o.size || 0.45); scene.add(sp);
        const a = Math.random() * Math.PI * 2, v = o.speed ?? 1.4;
        parts.push({ sp, v: new T.Vector3(Math.cos(a) * v * 0.6, (o.up ?? 2) + Math.random(), Math.sin(a) * v * 0.3), t0: performance.now(), life: o.life || 1400, g: o.grav ?? 2 });
      }
    };
    const label = (txt, col) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 72; const g = c.getContext('2d');
      g.fillStyle = col; g.beginPath(); g.roundRect(4, 4, 248, 64, 32); g.fill(); g.fillStyle = '#fff'; g.font = '800 40px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 38);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const sp = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true })); sp.scale.set(1.8, 0.5, 1); return sp;
    };
    // Pièce : plancher, deux murs, tapis rond, fenêtre
    add(box, '#c98b5a', 0, -0.05, 0, 12, 0.1, 9);
    for (let i = -5; i <= 5; i++) add(box, '#b57a4c', i, 0.001, 0, 0.04, 0.01, 9);
    add(box, '#ffd6e0', 0, 3.5, -4.5, 12, 7, 0.2);
    add(box, '#ffe9b8', -6, 3.5, 0, 0.2, 7, 9);
    add(new T.CylinderGeometry(1, 1, 0.04, 40), '#7c8cff', 0, 0.03, 0.8, 2.4, 1, 2.4);
    // Meubles (KayKit Furniture Bits) : canapé, lampe, plante, étagère à livres ; un lit par enfant
    const place = (n, x, z, ry, sc) => { const m = this.P.model('kaykit/' + n); if (!m) return null; m.position.set(x, 0, z); m.rotation.y = ry; m.scale.multiplyScalar(sc); m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); scene.add(m); return m; };
    place('fu-couch_pillows', -3.6, 1.6, Math.PI / 2, 1.2); place('fu-cactus_medium_A', 5.2, duo ? 3.4 : 1.5, 0, 1);
    place('fu-shelf_B_large_decorated', -4.6, -3.9, 0, 1.3); place('fu-rug_rectangle_stripes_A', 2.6, -1.4, 0, 1.6); place('fu-pillow_A', -1.6, 2.6, 0.4, 1);
    const lampM = place('fu-lamp_standing', -5.2, -3.6, 0, 1.4);
    let lampOn = true;
    if (lampM) act(lampM, () => { lampOn = !lampOn; Audio8.sample('click', 0.7) || Audio8.tick(); }, 'La lampe');
    const win = add(box, '#a7e3ff', -5.85, 4.2, 0.5, 0.05, 2, 2.6); add(box, '#ffffff', -5.82, 4.2, 0.5, 0.05, 0.08, 2.6);
    const winStars = [0, 1, 2, 3].map((i) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: emo(i ? '⭐' : '🌙'), transparent: true, opacity: 0 })); sp.scale.setScalar(i ? 0.3 : 0.6); sp.position.set(-5.78, 3.6 + (i % 2) * 0.9 + (i ? 0 : 0.3), -0.4 + i * 0.6); scene.add(sp); return sp; });
    let night = false; const sleeping = new Set();
    const setNight = () => { const n = sleeping.size > 0 || night; if (n !== setNight.was) { setNight.was = n; if (n) Audio8.say(sleeping.size ? 'Chut… bonne nuit !' : 'La nuit tombe !'); } };
    act(win, () => { night = !night; Audio8.spell(); setNight(); }, 'La fenêtre');
    // Étagères : créatures amies et trophées (or : 3 étoiles, argent : 2, bronze : 1)
    for (const y of [2.2, 4.0]) add(box, '#8d5a3b', 1.8, y, -4.1, 6.5, 0.15, 0.7);
    const hops = []; // (créatures qui sautent quand on les touche)
    const creature = (c, cr) => { act(c.group, () => { c.hopT = performance.now(); Audio8.cry(cr.id, true); Audio8.say(cr.name); puff(c.group.position.clone().add(new T.Vector3(0, 0.6, 0.2)), ['💖', '✨'], 5, { size: 0.35 }); }, cr.name); c.cr = cr; c.base = c.group.position.y; hops.push(c); };
    data.friends.slice(0, 7).forEach((f, i) => {
      try {
        const c = buildCreature3D(this, f.cr, f.evolved);
        c.group.scale.multiplyScalar(0.55); c.group.position.set(-0.9 + i * 0.9, 2.28, -4.05); c.group.rotation.y = (Math.random() - 0.5) * 0.6;
        for (let t = 0; t <= 600; t += 100) c.animate(t, 'idle'); scene.add(c.group); creature(c, f.cr);
      } catch (e) { /* (créature indisponible) */ }
    });
    const spins = [];
    data.trophies.filter((st) => st > 0).slice(0, 8).forEach((st, i) => {
      const col = st >= 3 ? '#ffd23f' : st === 2 ? '#d9e2ec' : '#d4884a', g = new T.Group();
      add(new T.CylinderGeometry(0.22, 0.08, 0.35, 16), col, 0, 0.42, 0, 1, 1, 1, g);
      add(new T.CylinderGeometry(0.05, 0.05, 0.18, 8), col, 0, 0.17, 0, 1, 1, 1, g);
      add(box, '#5b3a29', 0, 0.05, 0, 0.3, 0.1, 0.3, g);
      g.position.set(-1.1 + i * 0.78, 4.08, -4.05); scene.add(g);
      act(g, () => { g.userData.spinT = performance.now(); Audio8.coin(); puff(g.position.clone().add(new T.Vector3(0, 0.7, 0.2)), ['⭐'], st, { size: 0.3, up: 1.6 }); }, 'Un trophée'); spins.push(g);
    });
    // Cadres photos au mur (souvenirs de fin de partie, des deux enfants) : on les touche pour les voir en grand
    const loader = new T.TextureLoader();
    kids.flatMap((k) => k.photos || []).slice(0, 3).forEach((url, i) => {
      const fr = add(box, '#ffffff', -4.2 + i * 0.05, 4.6 - i * 1.25, -4.35, 1.5, 0.95, 0.06);
      const tex = loader.load(url); tex.colorSpace = T.SRGBColorSpace;
      const p = new T.Mesh(new T.PlaneGeometry(1.36, 0.8), new T.MeshBasicMaterial({ map: tex }));
      p.position.set(-4.2 + i * 0.05, 4.6 - i * 1.25, -4.31); scene.add(p);
      const show = () => { Audio8.photo(); if (data.onPhoto) data.onPhoto(url); }; act(fr, show, 'Une photo'); act(p, show);
    });
    // Affiche de gommettes (une par enfant, sur le mur de gauche) : on la touche, les gommettes s'envolent
    kids.forEach((k, ki) => {
      const st = k.stickers || []; if (!st.length) return;
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 384;
      const g = cv.getContext('2d'); g.fillStyle = '#fff8e7'; g.fillRect(0, 0, 512, 384);
      g.font = '60px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      st.slice(0, 20).forEach((e, i) => g.fillText(e, 52 + (i % 5) * 102, 48 + Math.floor(i / 5) * 96));
      if (duo) { g.fillStyle = k.color || '#ffd166'; g.fillRect(0, 0, 512, 14); }
      const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
      const p = new T.Mesh(new T.PlaneGeometry(1.8, 1.35), new T.MeshBasicMaterial({ map: tex }));
      p.position.set(-5.85, 2.2, duo ? -2.9 + ki * 2.2 : -2.3); p.rotation.y = Math.PI / 2; scene.add(p);
      act(p, () => { Audio8.boing(); puff(p.position.clone().add(new T.Vector3(0.4, 0, 0)), st.slice(0, 8), 8, { size: 0.4, up: 2.4 }); }, 'Les gommettes');
    });
    // Les dresseurs (ils saluent quand on les touche), chacun avec son compagnon et son lit (couverture de sa couleur)
    const people = kids.map((k, i) => {
      const hx = duo ? -2.0 + i * 1.9 : 0.2, look = k.look || {};
      const hero = this.makeHumanHero({ body: look.color || k.color }, false, look);
      hero.group.rotation.y = Math.PI + 0.25; hero.group.position.set(hx, 0, 0.8); scene.add(hero.group);
      const me = { k, hero, hx, waveT: 0, comp: null, bed: null, pivot: null };
      act(hero.group, () => {
        if (sleeping.has(i)) return wake(me, i);
        me.waveT = performance.now(); Audio8.say(k.name ? `Coucou ${k.name} !` : 'Coucou !'); Audio8.good();
        puff(hero.group.position.clone().add(new T.Vector3(0, 2.4, 0.3)), ['💖', '⭐', '✨'], 6);
      }, k.name || 'Toi');
      hero.facing = true; // (de face : il imite l'enfant comme dans un miroir, voir applyHumanPose)
      if (k.companion) {
        try {
          const c = buildCreature3D(this, k.companion.cr, k.companion.level >= COMPANION_MAX);
          c.group.scale.multiplyScalar(0.5 + k.companion.level * 0.07); c.group.position.set(hx + (duo ? 0.95 : 1.4), 0, duo ? 1.9 : 1.3); c.group.rotation.y = -0.4; scene.add(c.group);
          me.comp = c; creature(c, k.companion.cr);
        } catch (e) { me.comp = null; }
      }
      // le lit : couverture et oreiller de sa couleur, son prénom au-dessus ; le toucher = au dodo (ou debout)
      // (seul : le long du mur de droite ; à deux : tête contre le mur du fond, côte à côte, avec un passage entre les deux)
      const bed = duo ? place('fu-bed_single_A', 1.9 + i * 3.3, 0, 0, 1.1) : place('fu-bed_single_A', 4.2, -2.6, -Math.PI / 2, 1.3);
      if (bed) {
        let bb = new T.Box3().setFromObject(bed);
        if (duo) { bed.position.z += -4.35 - bb.min.z; bb = new T.Box3().setFromObject(bed); }
        const sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3()), top = bb.min.y + sz.y * 0.5;
        // (tête du lit : vers la droite seul, vers le fond à deux ; la couverture et le dormeur suivent)
        const along = duo ? new T.Vector3(0, 0, 1) : new T.Vector3(-1, 0, 0), len = duo ? sz.z : sz.x;
        const bc = c.clone().addScaledVector(along, len * 0.12);
        const blanket = add(box, k.color || look.color || '#7c8cff', bc.x, top + 0.04, bc.z, duo ? sz.x * 0.9 : sz.x * 0.62, 0.08, duo ? sz.z * 0.62 : sz.z * 0.9);
        if (k.name || duo) { const lb = label(k.name || `Joueur ${i + 1}`, k.color || '#7b2cbf'); lb.position.set(c.x, duo ? top + 0.45 : bb.max.y + 0.5, duo ? bb.max.z + 0.1 : c.z); scene.add(lb); } // (à deux : prénom au pied du lit, sous l'étagère)
        const pc = c.clone().addScaledVector(along, len * 0.5 - 0.35), pivot = new T.Group(); pivot.position.set(pc.x, top + 0.3, pc.z); pivot.rotation.y = duo ? Math.PI : Math.PI / 2; // (tête vers l'oreiller ; repère du dormeur, hors scène)
        me.bed = bed; me.pivot = pivot;
        const go = () => (sleeping.has(i) ? wake(me, i) : sleep(me, i)); act(bed, go, duo ? `Le lit de ${k.name || 'joueur ' + (i + 1)}` : 'Le lit'); act(blanket, go);
      }
      return me;
    });
    function sleep(me, i) {
      sleeping.add(i); // (couché sur le lit : placé à chaque image, au pied du lit, la tête vers l'oreiller)
      Audio8.say(me.k.name ? `Bonne nuit ${me.k.name} !` : 'Bonne nuit !'); setNight(); me.zT = 0;
    }
    function wake(me, i) {
      sleeping.delete(i); me.hero.group.rotation.set(0, Math.PI + 0.25, 0, 'XYZ'); me.waveT = performance.now();
      Audio8.say('Debout !'); Audio8.perfect(); puff(new T.Vector3(me.hx, 2.4, 1), ['☀️', '⭐'], 6); setNight();
    }
    // Toucher : rayon depuis la caméra (souris, doigt) ; la petite main des gestes « clique » à sa position
    const ray = new T.Raycaster(), cam = new T.PerspectiveCamera(45, 1, 0.1, 60);
    const pick = (cx, cy) => {
      const rc = canvas.getBoundingClientRect(); if (cx < rc.left || cx > rc.right || cy < rc.top || cy > rc.bottom) return null;
      ray.setFromCamera(new T.Vector2(((cx - rc.left) / rc.width) * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1), cam);
      for (const h of ray.intersectObjects(acts, true)) { let o = h.object; while (o && !o.userData.act) o = o.parent; if (o) return o; }
      return null;
    };
    const onClick = (e) => {
      const g = typeof Gestures !== 'undefined' && Gestures.on && !e.isTrusted; // (clic de la petite main : à sa position)
      const o = pick(g ? Gestures.x : e.clientX, g ? Gestures.y : e.clientY); if (o) o.userData.act(o);
    };
    const onMove = (e) => { canvas.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : 'default'; };
    canvas.addEventListener('click', onClick); canvas.addEventListener('pointermove', onMove);
    canvas.classList.add('gTarget'); canvas.gestureHit = (x, y) => pick(x, y); // (la petite main ne se remplit que sur un objet)
    // Aux bras (comme le menu) : un bras tendu à gauche / à droite promène la petite main 👇 d'un objet à l'autre (dans
    // l'ordre où on les voit, de gauche à droite), les bras levés tenus « touchent » l'objet ; tout à droite, le bouton
    // « Retour » (retour au menu). (une seule cible par objet : le cadre d'une photo, pas aussi l'image ; la couverture
    // compte avec son lit)
    const navList = acts.filter((o) => o.userData.name);
    const back = { isBack: true, userData: { name: 'Retour au menu', act: () => data.onBack && data.onBack() } };
    navList.push(back);
    const screenX = (o) => (o.isBack ? 9 : new T.Box3().setFromObject(o).getCenter(new T.Vector3()).project(cam).x);
    const ptr = new T.Sprite(new T.SpriteMaterial({ map: emo('👇'), transparent: true, depthTest: false })); ptr.scale.setScalar(0.9); ptr.renderOrder = 9; ptr.visible = false; scene.add(ptr);
    let sel = -1;
    const choose = (d) => {
      const order = navList.map((o) => ({ o, x: screenX(o) })).sort((a, b) => a.x - b.x).map((e) => e.o);
      const cur = sel >= 0 ? order.indexOf(navList[sel]) : (d > 0 ? -1 : order.length);
      const next = order[(cur + d + order.length) % order.length];
      sel = navList.indexOf(next); ptr.visible = !next.isBack;
      Audio8.tick(); Audio8.say(next.userData.name);
      if (data.onSelect) data.onSelect(next.userData.name, !!next.isBack);
    };
    const tapSel = () => { if (sel < 0) return; const o = navList[sel]; if (!o.isBack) puff(ptr.position.clone(), ['✨'], 3, { size: 0.3 }); o.userData.act(o); };
    // Saut de l'enfant : toutes les créatures sautent avec lui
    const jumpAll = () => { const now = performance.now(); for (const c of hops) c.hopT = now; Audio8.boing(); };
    const t0 = performance.now(), fake = { lane: 0, y: 0, holdPose: null };
    let lastT = t0, nightK = 0;
    const loop = () => {
      if (gone()) return this.closeRoom();
      const now = performance.now(), t = (now - t0) / 1000, dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.floor(w * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      cam.position.set(Math.sin(t * 0.25) * 1.2 + 1, duo ? 3.4 : 3.0, duo ? 9.6 : 8.4); cam.lookAt(duo ? 0.8 : 0, 2.0, -1);
      // nuit : la pièce s'assombrit, la lampe garde une lumière douce, la lune et les étoiles à la fenêtre
      nightK += ((sleeping.size || night ? 1 : 0) - nightK) * Math.min(1, dt * 2.5);
      scene.background.copy(DAY).lerp(NIGHT, nightK); hemi.intensity = 1.3 - nightK * 0.95; sun.intensity = 1.7 * (1 - nightK * 0.9);
      lamp.intensity += ((lampOn ? 6 + nightK * 4 : 0) - lamp.intensity) * Math.min(1, dt * 8);
      win.material.color.set('#a7e3ff').lerp(new T.Color('#1d2b64'), nightK); winStars.forEach((sp) => (sp.material.opacity = nightK));
      // commandes aux bras (si la caméra est allumée) et miroir : le personnage de chaque enfant copie ses bras
      const g = data.arms ? data.arms(now) : null;
      if (g) { if (g.side) choose(g.side === 'left' ? -1 : 1); if (g.ok) tapSel(); }
      if (data.onHold) data.onHold(g ? g.upP : 0);
      for (const [i, me] of people.entries()) me.hero.liveL = !sleeping.has(i) && data.limbs ? data.limbs(i) : null;
      if (sel >= 0 && !navList[sel].isBack) { const o = navList[sel], b = new T.Box3().setFromObject(o); ptr.position.set((b.min.x + b.max.x) / 2, Math.min(b.max.y + 0.45, 4.7) + Math.abs(Math.sin(now / 250)) * 0.15, (b.min.z + b.max.z) / 2 + 0.2); } // (sous le haut de l'image : la fenêtre est haute)
      const save = this.heroY3; this.heroY3 = () => 0;
      try {
        for (const [i, me] of people.entries()) {
          const zz = sleeping.has(i), waving = now - me.waveT < 1600;
          this.applyHumanPose(fake, me.hero, zz ? 'idle' : waving ? 'happy' : Math.floor(t / 4 + i) % 2 ? 'happy' : 'idle', now);
          if (zz) { me.hero.group.position.copy(me.pivot.position); me.hero.group.rotation.set(Math.PI / 2, me.pivot.rotation.y, 0, 'YXZ'); me.hero.group.updateMatrixWorld(true); }
          if (zz) { if (now - (me.zT || 0) > 1100) { me.zT = now; const p = me.pivot.getWorldPosition(new T.Vector3()); puff(p.add(new T.Vector3(0.6, 0.6, 0)), ['💤'], 1, { size: 0.5, up: 0.7, speed: 0.2, grav: 0, life: 2000 }); } }
          else me.hero.group.position.set(me.hx, waving ? Math.abs(Math.sin((now - me.waveT) / 160)) * 0.25 : 0, 0.8);
          me.hero.ring && (me.hero.ring.visible = false);
        }
      } finally { this.heroY3 = save; }
      for (const c of hops) {
        const k = (now - (c.hopT || 0)) / 700, on = k < 1;
        c.group.position.y = c.base + (on ? Math.sin(k * Math.PI) * 0.6 : 0);
        if (on) c.group.rotation.y += dt * 9;
        c.animate(now, on || (people.some((p) => p.comp === c) && Math.floor(t / 3) % 2) ? 'happy' : 'idle');
      }
      for (const g of spins) { const k = (now - (g.userData.spinT || 0)) / 900; g.rotation.y = k < 1 ? (1 - (1 - k) ** 3) * Math.PI * 2 : 0; }
      for (let j = parts.length - 1; j >= 0; j--) {
        const p = parts[j], k = (now - p.t0) / p.life;
        if (k >= 1) { scene.remove(p.sp); p.sp.material.dispose(); parts.splice(j, 1); continue; }
        p.v.y -= p.g * dt; p.sp.position.addScaledVector(p.v, dt); p.sp.material.opacity = Math.min(1, (1 - k) * 2.5);
      }
      r.render(scene, cam);
      this.roomRAF = requestAnimationFrame(loop);
    };
    this.room = { r, scene, people, sleeping, jump: jumpAll, off: () => { canvas.removeEventListener('click', onClick); canvas.removeEventListener('pointermove', onMove); canvas.gestureHit = null; for (const t of emoTex.values()) t.dispose(); } };
    loop();
  }

  closeRoom() {
    if (this.roomRAF) cancelAnimationFrame(this.roomRAF);
    if (this.room) { if (this.room.off) this.room.off(); this.freeRes(this.room.scene); this.room.r.dispose(); this.room = null; }
  }

  // ---------- Ballon de la passe à deux : il vole en cloche d'un dresseur à l'autre
  updateBall3D(now) {
    const b = this.ball, T = this.T;
    if (!b) { if (this.ballMesh) this.ballMesh.visible = false; return; }
    if (!this.ballMesh) {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
      const g = cv.getContext('2d'); const cols = ['#ff6b35', '#ffffff', '#4ea8ff', '#ffffff'];
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 32, 0, 32, 64); });
      const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
      this.ballMesh = new T.Mesh(new T.SphereGeometry(0.32, 24, 16), this.P.toon('#ffffff', { map: tex }));
      this.ballMesh.castShadow = true; this.s3.add(this.ballMesh);
    }
    const fly = 1700, k = b.drop ? 1 : Math.max(0, Math.min(1.2, (now - b.t0) / fly));
    const pos = (i) => { const h = this.heroes[i] || this.heroes[0]; return { x: h.lane * LANE + (i ? -0.5 : 0.5), y: 2.1 + this.heroY3(h) }; };
    const a = pos(b.from), z = pos(b.to);
    let x = a.x + (z.x - a.x) * k, y = a.y + (z.y - a.y) * k + Math.sin(Math.min(1, k) * Math.PI) * 2.2;
    if (b.drop) { const d = (now - b.drop) / 1000; x = z.x + d * 0.8; y = Math.max(0.32, z.y - d * 5 + Math.abs(Math.sin(d * 9)) * Math.max(0, 1 - d) * 0.8); }
    this.ballMesh.visible = true;
    this.ballMesh.position.set(x, y, 0.2);
    this.ballMesh.rotation.z -= 0.15;
  }

  // ---------- Singes farceurs : deux singes au bord du chemin, qui sautent et lancent de la mousse vers l'écran
  updateMonkeys(now) {
    const on = this.stepKind === 'foam';
    if (!on) { if (this.monkeys) this.monkeys.forEach((m) => (m.mesh.group.visible = false)); return; }
    if (!this.monkeys) {
      const cr = creaturesByModel('pets/animal-monkey');
      if (!cr || !(this.P.models && this.P.models.has(cr.model))) return;
      this.monkeys = [-1, 1].map((side) => { const mesh = buildCreature3D(this, cr, false); mesh.group.scale.multiplyScalar(1.4); this.s3.add(mesh.group); return { side, mesh, throwT: 0 }; });
    }
    for (const m of this.monkeys) {
      m.mesh.group.visible = true;
      const throwing = now - m.throwT < 600;
      m.mesh.group.position.set(m.side * (LANE * 1.5 + 1.6), throwing ? Math.sin((now - m.throwT) / 600 * Math.PI) * 0.6 : 0, -3.5);
      m.mesh.group.rotation.y = m.side * -0.6;
      m.mesh.animate(now, throwing ? 'happy' : 'idle');
    }
  }
  // ---------- Baguette magique (3D) : les créatures ensorcelées sont de vrais modèles, placés devant la caméra à
  // l'endroit de l'écran choisi par la partie (le calque 2D ajoute le nuage d'orage, l'anneau et le rayon)
  screenTo3D(sx, sy, dist) {
    const T = this.T, cam = this.camera, o = cam.getWorldPosition(new T.Vector3());
    const v = new T.Vector3(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(cam).sub(o).normalize();
    return o.addScaledVector(v, dist);
  }
  drawWandFoe() {} // (le modèle 3D est déjà dessiné)
  updateWand3D(now) {
    // (le décor tout près de la caméra rapetisse le temps de l'épreuve : aucun sapin ne cache une créature)
    const clear = this.stepKind === 'wand';
    for (const d of this.decor) {
      const u = d.userData, want = clear && d.position.z > -6 ? 0 : 1;
      if (u.wk == null && want === 1) continue;
      if (!u.s0) u.s0 = d.scale.clone();
      u.wk = (u.wk ?? 1) + (want - (u.wk ?? 1)) * 0.12;
      if (want === 1 && u.wk > 0.99) { d.scale.copy(u.s0); d.visible = true; u.wk = null; continue; }
      d.scale.copy(u.s0).multiplyScalar(Math.max(0.001, u.wk)); d.visible = u.wk > 0.02;
    }
    this.wandMeshes = this.wandMeshes || new Map();
    const foes = (this.wand && this.wand.foes) || [], alive = new Set(foes);
    for (const [f, m] of this.wandMeshes) if (!alive.has(f)) { this.dispose(m.group); this.wandMeshes.delete(f); }
    for (const f of foes) {
      let m = this.wandMeshes.get(f);
      if (!m) { m = buildCreature3D(this, f.cr, f.evolved); this.s3.add(m.group); this.wandMeshes.set(f, m); m.base = m.group.scale.x; }
      // (tout près de la caméra, devant les arbres du bord du chemin ; toutes à la même taille à l'écran,
      // environ un cinquième de la hauteur, comme le dessin 2D)
      const P = this.wandFoePos(f, now), D = 4, hh = m.height || 1.4;
      const sz = (1.0 / hh) * P.k * (f.evolved ? 1.15 : 1) * Math.sqrt(P.a);
      const p = this.screenTo3D(P.x / this.W, P.y / this.H, D);
      m.group.position.set(p.x, p.y - hh * sz * 0.5, p.z);
      m.group.scale.setScalar(Math.max(0.01, m.base * sz));
      const cam = this.camera.getWorldPosition(new this.T.Vector3());
      m.group.rotation.y = Math.atan2(cam.x - p.x, cam.z - p.z);
      if (f.state === 'grumpy') m.group.rotation.z = Math.sin(now * (f.aimed ? 0.03 : 0.004) + f.seed) * (f.aimed ? 0.12 : 0.06); // (boude, et gigote sous le rayon)
      else m.group.rotation.z = 0;
      m.animate(now, f.state === 'calm' ? 'happy' : f.aimed ? 'no' : 'idle');
    }
  }
  // Baguette dans la main du dresseur qui pointe (celle du côté du pointeur)
  wandOrigin(i, p) {
    const h = this.heroes[i], hs = this.avatarHands && this.avatarHands[i];
    if (!h || !h.m3 || !hs || !hs.length) return super.wandOrigin(i, p);
    const sc = h.m3.scale || 1, ax = h.m3.group.position.x, ay = h.m3.group.position.y + 1.15 * sc;
    const side = p.x * this.W > this.project(ax, ay, 0).x ? 1 : -1;
    const hd = hs.reduce((a, q) => (q.u * side > a.u * side ? q : a));
    const hand = this.project(ax + hd.u * 0.5 * sc, ay - hd.v * 0.5 * sc, h.m3.group.position.z);
    if (h.m3.wandTip) { // (le rayon part du bout de la vraie baguette si elle est du côté visé)
      const v = h.m3.wandTip.getWorldPosition(new this.T.Vector3()), tip = this.project(v.x, v.y, v.z);
      if (Math.sign(tip.x - this.project(ax, ay, 0).x) === side || hs.length < 2) return { ...tip, real: true };
    }
    return hand;
  }

  // ---------- Île du Stade (3D) : but avec filet et gardien (penalty), panier de basket, copain créature qui passe / tire
  buildSport3D(kind) {
    const T = this.T, g = new T.Group(), white = this.lam('#ffffff'), [mateCr, keeperCr] = this.sportMate();
    const cyl = (r, h, mat, x, y, z, rz = 0, rx = 0) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, h, 12), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
    const lines = (pts, col = '#ffffff', op = 0.7) => { const ge = new T.BufferGeometry().setFromPoints(pts.map((p) => new T.Vector3(...p))); const l = new T.LineSegments(ge, new T.LineBasicMaterial({ color: col, transparent: true, opacity: op })); g.add(l); return l; };
    const crea = (cr, x, z, sc, face) => { const m = buildCreature3D(this, cr, false); m.group.scale.multiplyScalar(sc); m.group.position.set(x, 0, z); m.group.rotation.y = face; g.add(m.group); return m; };
    this.sportM = [];
    if (kind === 'kick') {
      const Z = SPORT_GOAL_Z, w = 2.6, h = 2.2, d = 1.2;
      cyl(0.09, h, white, -w, h / 2, Z); cyl(0.09, h, white, w, h / 2, Z); cyl(0.09, w * 2 + 0.18, white, 0, h, Z, Math.PI / 2);
      const pts = [];
      for (let i = 0; i <= 16; i++) { const x = -w + (2 * w * i) / 16; pts.push([x, h, Z], [x, h * 0.85, Z - d], [x, h * 0.85, Z - d], [x, 0, Z - d]); }
      for (let j = 0; j <= 7; j++) { const y = (h * 0.85 * j) / 7; pts.push([-w, y, Z - d], [w, y, Z - d]); }
      for (const sx of [-w, w]) for (let j = 0; j <= 7; j++) { const y = (h * j) / 7; pts.push([sx, y, Z], [sx, Math.min(y, h * 0.85), Z - d]); }
      this.sportNet = lines(pts);
      this.sportM = [null, crea(keeperCr, 0, Z + 0.4, 1.35, 0)];
    } else if (kind === 'basket') {
      const grey = this.lam('#adb5bd'), H = SPORT_RIM.y;
      cyl(0.1, H + 0.6, grey, SPORT_RIM.x + 0.9, (H + 0.6) / 2, SPORT_RIM.z - 0.5);
      const board = new T.Mesh(new T.BoxGeometry(1.7, 1.15, 0.08), white); board.position.set(SPORT_RIM.x, H + 0.45, SPORT_RIM.z - 0.45); board.castShadow = true; g.add(board);
      const sq = new T.Mesh(new T.BoxGeometry(0.62, 0.46, 0.09), this.lam('#e63946')); sq.position.set(SPORT_RIM.x, H + 0.3, SPORT_RIM.z - 0.44); g.add(sq);
      const sq2 = new T.Mesh(new T.BoxGeometry(0.5, 0.34, 0.1), white); sq2.position.copy(sq.position); g.add(sq2);
      const rim = new T.Mesh(new T.TorusGeometry(0.34, 0.04, 8, 28), this.lam('#f76707')); rim.position.set(SPORT_RIM.x, H, SPORT_RIM.z); rim.rotation.x = Math.PI / 2; g.add(rim);
      const net = new T.Mesh(new T.CylinderGeometry(0.34, 0.22, 0.5, 12, 3, true), new T.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.8 }));
      net.position.set(SPORT_RIM.x, H - 0.25, SPORT_RIM.z); g.add(net); this.sportNet = net;
      this.sportM = [crea(mateCr, -2.6, -3.5, 1.25, Math.atan2(2.6, 3.5))];
    } else {
      this.sportM = [crea(mateCr, 0, SPORT_GOAL_Z, 1.4, 0)];
    }
    this.outline && g.children.forEach((m) => m.isMesh && this.outline(m));
    this.s3.add(g); this.sportG = g;
  }
  updateSport3D(now) {
    const kind = this.sport && this.sport.kind;
    if (kind !== this.sportKind3) { // (autre épreuve : on range le terrain)
      if (this.sportG) { this.dispose(this.sportG); this.sportG = null; this.sportNet = null; }
      this.sportKind3 = kind;
      if (kind) this.buildSport3D(kind);
    }
    if (!this.sportG) return;
    const [mate, keeper] = this.sportM, T0 = this.sportT, b = this.sport.ball;
    if (mate) mate.animate(now, T0.kick && now - T0.kick < 600 ? 'happy' : 'idle');
    if (keeper) {
      keeper.group.position.x = this.keeperX(now) * 1.6;
      keeper.group.rotation.z = b && (b.phase === 'shot' || b.phase === 'goal') ? -b.keeper * Math.min(1.1, (now - b.t0) / 250) : 0; // (plongeon)
      keeper.animate(now, b && b.phase === 'goal' ? 'no' : 'idle');
    }
    if (this.sportNet) { const k = T0.score ? Math.max(0, 1 - (now - T0.score) / 700) : 0; this.sportNet.scale.set(1, 1, 1 + Math.sin(now / 40) * 0.15 * k); }
  }
  drawSportField() {} // (le terrain est en 3D)
  sportPts(now) {
    const P = super.sportPts(now), kind = this.sport && this.sport.kind;
    if (kind === 'basket') {
      const m = this.project(-2.6, 0.9, -3.5), m2 = this.project(-2.6, 2.4, -3.5);
      P.mate = { x: m.x, y: m.y, s: Math.abs(m.y - m2.y) };
      const c = this.project(SPORT_RIM.x, SPORT_RIM.y, SPORT_RIM.z), e = this.project(SPORT_RIM.x + 0.34, SPORT_RIM.y, SPORT_RIM.z);
      P.hoop = { x: c.x, y: c.y, r: Math.abs(e.x - c.x) };
    } else if (kind === 'kick') {
      const a = this.project(-2.6, 2.2, SPORT_GOAL_Z), b = this.project(2.6, 0, SPORT_GOAL_Z);
      P.goal = { x: (a.x + b.x) / 2, y: a.y, w: b.x - a.x, h: b.y - a.y };
    } else if (kind === 'goal') {
      const m = this.project(0, 0.6, SPORT_GOAL_Z);
      P.mate = { x: m.x, y: m.y, s: 0 };
    }
    return P;
  }

  // ---------- Carrefour : deux panneaux en bois de chaque côté du chemin (icône de l'épreuve + flèche)
  updateForkSigns(now) {
    const f = this.fork, T = this.T;
    if (!f) { if (this.forkSigns) this.forkSigns.visible = false; return; }
    if (!this.forkSigns || this.forkSigns.userData.key !== f.key) {
      if (this.forkSigns) this.dispose(this.forkSigns);
      const g = new T.Group(); g.userData.key = f.key;
      const wood = this.lam('#9a6b3f'), dark = this.lam('#6b4426');
      [-1, 1].forEach((side, i) => {
        const p = new T.Group();
        const post = new T.Mesh(new T.CylinderGeometry(0.12, 0.14, 2.6, 8), dark); post.position.y = 1.3; p.add(post);
        const board = new T.Mesh(new T.BoxGeometry(1.7, 0.8, 0.14), this.lam(side < 0 ? '#3a86ff' : '#ff8c42')); board.position.y = 2.25; p.add(board);
        const tip = new T.Mesh(new T.ConeGeometry(0.42, 0.5, 3), this.lam(side < 0 ? '#3a86ff' : '#ff8c42'));
        tip.rotation.z = -side * Math.PI / 2; tip.rotation.y = Math.PI / 6; tip.position.set(side * 1.08, 2.25, 0); p.add(tip);
        const plank = new T.Mesh(new T.BoxGeometry(1.5, 0.6, 0.16), wood); plank.position.y = 2.25; plank.scale.set(1, 1, 1); p.add(plank);
        const icon = this.emojiSprite(f.opts[i].icon, 1.3); icon.position.set(0, 3.2, 0.1); p.add(icon);
        p.position.set(side * (LANE * 1.5 + 0.6), 0, -5);
        p.rotation.y = -side * 0.35;
        p.userData = { side, icon };
        g.add(p);
      });
      this.s3.add(g); this.forkSigns = g;
    }
    this.forkSigns.visible = true;
    for (const p of this.forkSigns.children) {
      const { side, icon } = p.userData, on = f.sel === side || f.chosen === side, lost = f.chosen && f.chosen !== side;
      const sc = lost ? 0.6 : on ? 1.15 + Math.sin(now / 150) * 0.05 : 1;
      p.scale.setScalar(p.scale.x + (sc - p.scale.x) * 0.2);
      icon.position.y = 3.2 + Math.sin(now / 300 + side) * 0.12;
    }
  }
  monkeyThrow(side) { const m = this.monkeys && this.monkeys.find((x) => x.side === side); if (m) m.throwT = performance.now(); Audio8.boing(); }

  // ---------- À deux : tape dans la main (les dresseurs se rejoignent au milieu, joie, étincelles entre eux)
  highFive() {
    const now = performance.now();
    this.highFiveT = now;
    for (const h of this.heroes) h.happyUntil = now + 1100;
    setTimeout(() => {
      const a = this.anchor(0), b = this.anchor(1);
      this.burst((a.x + b.x) / 2, Math.min(a.y, b.y) - a.u * 1.2, 40, ['#ffd166', '#ffffff', '#ff70a6', '#7bdff2']);
      Audio8.hit();
    }, 420);
  }

  // Repère « à toi ! » au-dessus de l'enfant dont c'est le tour (poses à tour de rôle)
  drawTurn(now) {
    if (this.turnHero == null || this.heroes.length < 2 || this.stepKind !== 'pose') return;
    const A = this.anchor(this.turnHero), ctx = this.ctx, y = A.y - A.u * 3.4 + Math.sin(now * 0.008) * A.u * 0.2;
    ctx.font = `${A.u * 1.4}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('👇', A.x, y);
    ctx.font = `800 ${A.u * 0.7}px 'Baloo 2', sans-serif`; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = A.u * 0.12;
    ctx.strokeText('À toi !', A.x, y - A.u * 1.1); ctx.fillText('À toi !', A.x, y - A.u * 1.1);
    ctx.textBaseline = 'alphabetic';
  }

  // ---------- Gardien de fin de monde : grande créature évoluée qui bloque le chemin et montre les poses
  setBoss(b) {
    if (this.bossM) { this.dispose(this.bossM.group); this.bossM = null; }
    this.boss = b;
    if (!b || !this.ready || !this.theme) return;
    const keys = creatureModels([b.cr]);
    const build = () => {
      if (this.boss !== b) return;
      const m = buildCreature3D(this, b.cr, true);
      m.group.scale.multiplyScalar(2.3);
      this.s3.add(m.group);
      this.bossM = m; m.t0 = performance.now();
    };
    if (b.cr.model && !keys.every((k) => this.P.models && this.P.models.has(k))) this.P.preload(keys).then(build); else build();
  }

  // Pose réussie : le gardien sursaute (étoiles) ; à la dernière, il saute de joie
  bossHit(last, nextPose) {
    if (!this.boss) return;
    this.boss.hitT = performance.now(); this.boss.won = last;
    if (nextPose) this.boss.pose = nextPose;
    const p = this.bossM && this.project(this.bossM.group.position.x, 3, this.bossM.group.position.z);
    if (p) this.burst(p.x, p.y, last ? 60 : 30, ['#ffd166', '#ff70a6', '#ffffff', '#7bdff2']);
  }

  updateBoss(now) {
    const b = this.boss, m = this.bossM;
    if (!b || !m) return;
    const arrive = Math.min(1, (now - m.t0) / 1500), e = 1 - Math.pow(1 - arrive, 3);
    const hit = b.hitT ? Math.max(0, 1 - (now - b.hitT) / 500) : 0;
    // (seul : sur le côté du chemin, tourné vers le dresseur, pour ne jamais le cacher ; à deux : au milieu, plus loin)
    const duo = this.heroes.length > 1, x = duo ? 0 : LANE * 1.5 + 1.2, z = duo ? -13 : -8.5;
    m.group.position.set(x + Math.sin(now * 0.001) * 0.3, b.won ? Math.abs(Math.sin(now * 0.012)) * 0.6 : hit * 0.5, -22 + (22 + z) * e);
    m.group.rotation.y = (duo ? 0 : -0.55) + Math.sin(now * 0.0015) * 0.15;
    m.group.rotation.z = hit * Math.sin(now * 0.05) * 0.2;
    m.animate(now, b.won ? 'happy' : 'idle', b.won ? null : b.pose);
  }

  // Combo : anneau doré qui s'élargit autour du dresseur et pluie d'étincelles ; tout le monde saute de joie
  combo(lvl = 1) {
    const T = this.T, now = performance.now();
    for (const h of this.heroes) h.happyUntil = now + 1400;
    for (const h of this.heroes) {
      if (!h.m3) continue;
      const ring = new T.Mesh(new T.TorusGeometry(1, 0.08, 8, 48), new T.MeshBasicMaterial({ color: lvl >= 3 ? '#ff70a6' : '#ffd166', transparent: true }));
      ring.rotation.x = Math.PI / 2; ring.position.copy(h.m3.group.position); ring.position.y += 0.1;
      this.s3.add(ring);
      this.fxRings = this.fxRings || [];
      this.fxRings.push({ ring, t0: now, lvl });
    }
    const A = this.anchor(0);
    for (let k = 0; k < 2 + lvl; k++) setTimeout(() => this.burst(A.x + (Math.random() - 0.5) * A.u * 6, A.y - A.u * (1 + Math.random() * 2), 30, ['#ffd166', '#ffffff', '#ff70a6', '#7bdff2', '#4ade80']), k * 160);
  }

  updateFx(now) {
    this.fxRings = (this.fxRings || []).filter((f) => {
      const k = (now - f.t0) / 900;
      if (k >= 1) { this.dispose(f.ring); return false; }
      f.ring.scale.setScalar(1 + k * (3 + f.lvl)); f.ring.material.opacity = 1 - k;
      return true;
    });
  }

  // ---------- Caddie (supermarché) : poussé devant le dresseur, il se remplit des produits attrapés
  updateCart(now) {
    const on = this.stepKind === 'shop', h = this.heroes[0];
    if (!on || !h || !h.m3) { if (this.cart) this.cart.visible = false; return; }
    if (!this.cart) { try { this.cart = makeShopCart(this.P); } catch (e) { console.warn(e); return; } this.cart.scale.setScalar(1.1); this.cartItems = []; this.s3.add(this.cart); }
    this.cart.visible = !this.hideHero;
    const x = h.lane * LANE;
    // (poussé à côté du dresseur, pour qu'on le voie se remplir ; du côté du chemin qui reste libre)
    const side = h.lane > 0.5 ? -1 : 1;
    this.cartX = (this.cartX ?? x + side) + (x + side * 1.05 - (this.cartX ?? x + side)) * 0.2;
    this.cart.position.set(this.cartX, this.heroY3(h) * 0.3, -0.7);
    this.cart.rotation.y = side * 0.12;
    this.cart.rotation.z = Math.sin(now * 0.02) * 0.02 * this.speed;
  }
  cartAdd(prod) {
    if (!this.cart) return;
    const m = this.P.model('food/' + prod) || new this.T.Mesh(this.geo.sphere, this.lam('#ffd166'));
    const n = this.cartItems.length, s = 0.45;
    m.scale.multiplyScalar(s);
    m.position.set(-0.22 + (n % 3) * 0.22, 0.65 + Math.floor(n / 6) * 0.22, -0.25 + (Math.floor(n / 3) % 2) * 0.35);
    m.rotation.y = Math.random() * 6;
    this.cart.add(m); this.cartItems.push(m);
    if (this.cartItems.length > 18) this.dispose(this.cartItems.shift()); // (caddie bien plein !)
  }
  cartSteal() {
    const m = this.cartItems && this.cartItems.pop();
    if (m) this.dispose(m);
    const p = this.heroPx(0); this.emojiPop(p.x, p.y - this.size * 0.9, 1, '😝');
  }

  // ---------- Créature compagnon : elle court à côté de son dresseur, saute de joie quand il réussit
  // list : par joueur, { cr, level } ou null (niveau 1..5 : elle grandit ; au niveau 5 elle a évolué)
  setCompanions(list) { this.companionSpec = list || []; this.rebuildCompanions = true; }

  updateCompanions(now) {
    if (this.rebuildCompanions || !this.companions) {
      for (const c of this.companions || []) if (c) this.dispose(c.mesh.group);
      const wait = [];
      this.companions = (this.companionSpec || []).map((sp) => {
        if (!sp || !sp.cr) return null;
        // (modèle pas encore chargé : on le charge, puis on reconstruit une seule fois ; s'il est introuvable,
        // buildCreature3D dessine la créature sans lui)
        const missing = creatureModels([sp.cr]).filter((k) => !(this.P.models && this.P.models.has(k)) && !(this.P.failed && this.P.failed.has(k)));
        if (sp.cr.model && missing.length) { wait.push(...missing); return null; }
        const mesh = buildCreature3D(this, sp.cr, sp.level >= COMPANION_MAX);
        mesh.group.scale.multiplyScalar(0.5 + sp.level * 0.07);
        this.s3.add(mesh.group);
        return { mesh, sp, x: 0 };
      });
      this.rebuildCompanions = false;
      if (wait.length) this.P.preload(wait).then(() => { this.rebuildCompanions = true; }).catch((e) => console.warn(e));
    }
    this.companions.forEach((c, i) => {
      if (!c) return;
      const h = this.heroes[i] || this.heroes[0], happy = now < (h.happyUntil || 0) || this.outro;
      const side = this.heroes.length > 1 && i === 0 ? -1 : 1; // (à deux : chacun du côté extérieur)
      const tx = h.lane * LANE + side * 1.35;
      c.x += (tx - c.x) * 0.12;
      const hop = this.speed > 0.4 ? Math.abs(Math.sin(now * 0.012 + i)) * 0.25 : 0;
      c.mesh.group.visible = !this.hideHero;
      c.mesh.group.position.set(c.x, this.heroY3(h) * 0.6 + hop + (happy ? Math.abs(Math.sin(now * 0.02)) * 0.4 : 0), 0.7);
      c.mesh.group.rotation.y = this.outro ? 0.4 : Math.PI + (happy ? Math.sin(now * 0.02) * 0.6 : 0); // de dos, comme son dresseur
      // (joie, marche quand on avance, et pendant une pose il la fait aussi)
      const pose = this.ghostPose || h.holdPose || null;
      c.mesh.animate(now, happy ? 'happy' : !pose && this.speed > 0.9 ? 'run' : !pose && this.speed > 0.3 ? 'wave' : 'idle', pose);
    });
  }

  // Plan de caméra voulu selon l'épreuve en cours (x, y, z : décalage ; lx, ly, lz : décalage du point visé ; fov)
  directShot(now) {
    const shot = { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0, fov: 55 }, k = this.stepKind, t = now / 1000;
    const meet = this.enc && (this.enc.state === 'waiting' || this.enc.state === 'befriend');
    if (this.outro || !this.theme) return shot;
    if (meet) Object.assign(shot, { x: 1.3, lx: 0.5, y: -0.2, z: -0.4, fov: 50 });            // rencontre : héros et créature dans le même plan
    else if (k === 'learn') Object.assign(shot, { x: 2.2, y: 0.4, lx: -0.8, lz: 3.5, fov: 52 });                 // tuto : on voit Tempo qui montre le geste
    else if (k === 'boss') Object.assign(shot, { y: -0.7, z: 0.8, ly: 1.8, lz: 1, fov: 60 });               // gardien : contre-plongée, il paraît immense
    else if (k === 'dance' || k === 'karate') Object.assign(shot, { x: 2.6 + Math.sin(t * 0.8) * 0.5, y: 0.5, lx: -0.6, lz: 3, fov: 52 }); // de côté : on voit le coach
    else if (k === 'rope') Object.assign(shot, { x: 2.6, y: -0.9, z: -0.8, lx: -0.3, lz: 6.5, fov: 50 }); // de trois quarts, bas : on voit la corde passer sous les pieds
    else if (k === 'cubes') Object.assign(shot, { y: 0.5, z: 1.3, ly: 0.2, fov: 60 });           // plus large : on voit les cubes arriver
    else if (k === 'tunnel') Object.assign(shot, { y: -1.1, z: -1.4, ly: -0.2, fov: 62 });       // au ras du sol, dans le tunnel
    else if (k === 'basket') Object.assign(shot, { x: -0.6, y: 0.7, z: 1.4, lx: 0.9, ly: 1.0, fov: 60 });     // basket : on voit le copain et le panier
    else if (k === 'kick') Object.assign(shot, { y: 0.5, z: 0.4, ly: 0.2, lz: -1, fov: 55 });                 // penalty : regard vers le but
    else if (k === 'goal') Object.assign(shot, { y: 0.2, ly: 0.4, fov: 56 });                               // gardien : on voit le tireur au loin
    else if (k === 'wand') Object.assign(shot, { y: 0.5, z: 1.1, ly: 0.7, fov: 58 });              // baguette : plus large, on voit les créatures autour
    else if (k === 'catch') Object.assign(shot, { y: 0.9, z: 1.0, ly: 0.9, fov: 58 });           // lève les yeux vers les étoiles qui tombent
    else if (k === 'smash') Object.assign(shot, { y: -0.4, z: -0.9, fov: 52 });                  // serré sur le rocher
    else if (k === 'rest') Object.assign(shot, { x: Math.sin(t * 0.45) * 2.4, y: 0.4, z: 0.6, fov: 52 }); // respiration : lent travelling
    else if (k === 'freeze') Object.assign(shot, { x: Math.sin(t * 0.6) * 1.2, z: 0.4 });
    return shot;
  }

  // ---------- Cubes en rythme (3D) : ils glissent vers le héros ; bleu = main gauche, orange = main droite
  cubeTex(side) {
    this.cubeTexs = this.cubeTexs || {};
    if (this.cubeTexs[side]) return this.cubeTexs[side];
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = cubeCol(side); g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(8, 8, 112, 112);
    g.font = '78px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(side < 0 ? '🤛' : side > 0 ? '🤜' : '🙌', 64, 70);
    const tex = new this.T.CanvasTexture(cv); tex.colorSpace = this.T.SRGBColorSpace;
    return (this.cubeTexs[side] = tex);
  }

  cubeWorld(u, v) {
    const h = this.heroes[0], sc = h.m3 ? h.m3.scale : 1;
    return { x: h.lane * LANE + u * 0.5 * sc, y: this.heroY3(h) + 1.15 * sc - v * 0.5 * sc };
  }

  updateCubes3D(now, dt) {
    const T = this.T;
    this.cubeMeshes = this.cubeMeshes || new Map();
    this.cubeBits = this.cubeBits || [];
    this.cubes = (this.cubes || []).filter((cb) => !(cb.hit && now - cb.hit > 50) && !(cb.missed && now - cb.arrive > 1200));
    const alive = new Set(this.cubes);
    for (const [cb, mesh] of this.cubeMeshes) {
      if (alive.has(cb)) continue;
      if (cb.hit) this.burstCube(mesh, cb.side);
      this.dispose(mesh); this.cubeMeshes.delete(cb);
    }
    for (const cb of this.cubes) {
      if (cb.u == null) continue;
      let mesh = this.cubeMeshes.get(cb);
      if (!mesh) {
        const col = cubeCol(cb.side);
        mesh = new T.Group();
        // (forme et matériaux partagés par tous les cubes d'un même côté : rien à recréer à chaque cube)
        this.cubeGeo = this.cubeGeo || new T.BoxGeometry(0.62, 0.62, 0.62);
        this.cubeMats = this.cubeMats || {};
        if (!this.cubeMats[cb.side]) {
          const m = this.lam(col);
          if (m.emissive) { m.emissive.set(col); m.emissiveIntensity = 0.35; }
          this.cubeMats[cb.side] = [m, m, m, m, new T.MeshBasicMaterial({ map: this.cubeTex(cb.side) }), m];
        }
        const box = new T.Mesh(this.cubeGeo, this.cubeMats[cb.side]);
        box.castShadow = true; mesh.add(box);
        this.outline(mesh);
        this.s3.add(mesh); this.cubeMeshes.set(cb, mesh);
      }
      const p = (now - cb.born) / (cb.arrive - cb.born), w = this.cubeWorld(cb.u, cb.v);
      mesh.position.set(w.x * Math.min(1, 0.35 + 0.65 * p), w.y + Math.sin(p * Math.PI * 4) * 0.04, -36 * (1 - p));
      mesh.rotation.set(0, 0, Math.sin(now * 0.004 + cb.k) * 0.1);
      const fade = cb.missed ? Math.max(0, 1 - (now - cb.arrive - 380) / 600) : 1;
      mesh.scale.setScalar(Math.max(0.01, fade));
    }
    // Morceaux de cube qui volent quand on le tape
    this.cubeBits = this.cubeBits.filter((b) => {
      b.v.y -= 9 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.x += dt * 6; b.m.rotation.y += dt * 4;
      b.life -= dt; b.m.scale.setScalar(Math.max(0.01, 0.22 * b.life / 0.7));
      if (b.life > 0) return true;
      this.dispose(b.m); return false;
    });
    // Cibles : deux anneaux à l'endroit où taper (ils grossissent quand un cube arrive)
    this.cubeRings = this.cubeRings || [];
    const tg = this.cubeTargets || [];
    tg.forEach((t, i) => {
      let r = this.cubeRings[i];
      if (!r) {
        r = new T.Mesh(new T.TorusGeometry(0.42, 0.06, 10, 40), new T.MeshBasicMaterial({ color: '#ffffff' }));
        this.s3.add(r); this.cubeRings[i] = r;
      }
      const w = this.cubeWorld(t.u, t.v);
      r.position.set(w.x, w.y, 0.05); r.visible = true; r.material.color.set(cubeCol(t.side));
      r.scale.setScalar(t.near ? 1.25 + 0.1 * Math.sin(now * 0.03) : 1);
    });
    for (let i = tg.length; i < this.cubeRings.length; i++) this.cubeRings[i].visible = false;
  }

  burstCube(mesh, side) {
    const T = this.T, col = cubeCol(side);
    for (let i = 0; i < 10; i++) {
      const m = new T.Mesh(this.geo.box, new T.MeshBasicMaterial({ color: i % 3 ? col : '#ffffff' })); // (forme partagée ; le matériau est libéré avec le morceau)
      m.scale.setScalar(0.18); m.position.copy(mesh.position);
      this.s3.add(m);
      this.cubeBits.push({ m, life: 0.7, v: new T.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.3) * 4) });
    }
  }

  makeHazard(hz) {
    if (hz.kind === 'log') return this.makeLog();
    if (hz.kind === 'arch') return this.makeArch();
    if (hz.kind === 'tackle') return this.makeTackle();
    if (hz.kind === 'giant') return this.makeGiant();
    if (hz.kind === 'cone') { const g = this.makeCone(); g.position.x = hz.lane * LANE; return g; }
    if (hz.kind === 'star') { const g = new this.T.Group(); const s = this.emojiSprite(this.theme.collectible, 1.1); s.position.set(hz.lane * LANE, 1.1, 0); g.add(s); return g; }
    if (hz.kind === 'item') { // produit qui arrive en tournant, posé sur un petit halo
      const g = new this.T.Group(), m = this.P.model('food/' + hz.prod) || this.emojiSprite('🛒', 1);
      m.scale.multiplyScalar(1.15); m.position.y = 0.9; m.userData.spin = true; g.add(m);
      const halo = new this.T.Mesh(new this.T.CircleGeometry(0.6, 24), new this.T.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.6 }));
      halo.rotation.x = -Math.PI / 2; halo.position.y = 0.03; g.add(halo);
      g.position.x = hz.lane * LANE; g.userData.item = m; return g;
    }
    if (hz.kind === 'thief') { // chapardeur : un petit animal masqué qui court vers toi
      const list = ['dog', 'fox', 'monkey', 'cat', 'hog'].map((n) => creaturesByModel('pets/animal-' + n)).filter(Boolean);
      const cr = list[Math.floor(Math.random() * list.length)];
      const g = new this.T.Group();
      if (cr) {
        const c = buildCreature3D(this, cr, false); c.group.scale.multiplyScalar(1.1); g.add(c.group); g.userData.pet = c;
        const mask = new this.T.Mesh(new this.T.BoxGeometry(1, 1, 1), this.lam('#1e1b4b')); // masque de bandit
        mask.scale.set(0.62, 0.12, 0.1); mask.position.set(0, (c.height || 1.2) * 0.72, 0.42); c.group.add(mask);
        const sack = new this.T.Mesh(this.geo.sphere, this.lam('#c08552')); sack.scale.set(0.25, 0.3, 0.25); sack.position.set(0.45, 0.6, 0); g.add(sack);
      } else g.add(this.makeRock());
      g.position.x = hz.lane * LANE; return g;
    }
    const g = this.makeRock(); g.position.x = hz.lane * LANE; return g;
  }

  makeTunnel() {
    const T = this.T, g = new T.Group(), cols = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
    for (let i = 0; i < 7; i++) {
      const hoop = new T.Mesh(new T.TorusGeometry(1, 0.12, 8, 24, Math.PI), this.lam(cols[i % cols.length]));
      hoop.scale.set(LANE * 1.6, 1.45, 1);
      hoop.position.z = -4.5 + i * 1.5;
      g.add(hoop);
    }
    return this.shadow(g);
  }

  makeObstacle(o) {
    if (o.kind === 'tunnel') return this.makeTunnel();
    if (o.kind === 'low') return this.makeLog();
    if (o.kind === 'high') return this.makeArch();
    if (o.kind === 'crate') return this.makeRock(this.heroes.length > 1 ? 1.6 : 0.95); // (à deux : un gros rocher à taper ensemble)
    if (o.kind === 'wall') return this.makeWall(o.pose);
    // Étoile dans un couloir, buissons dans les autres
    const T = this.T, g = new T.Group(), lane = o.kind === 'gemL' ? -1 : 1;
    for (const l of [-1, 0, 1]) {
      if (l === lane) { const s = this.emojiSprite(this.theme.collectible, 1.2); s.position.set(l * LANE, 1.0, 0); g.add(s); continue; }
      const bush = new T.Mesh(this.geo.ball, this.mat.leaf2); bush.scale.set(0.7, 0.6, 0.6); bush.position.set(l * LANE, 0.5, 0); g.add(bush);
    }
    return this.shadow(g);
  }

  // Retire un objet de la scène et libère ses ressources propres (pas celles des caches : voir sharedRes)
  dispose(obj) {
    if (!obj) return;
    if (obj.parent) obj.parent.remove(obj);
    this.freeRes(obj);
  }

  // ---------- Pose du personnage 3D
  posePick(h, now) {
    if (typeof DEV !== 'undefined' && DEV.get('forcepose') && h.m3 && h.m3.human) return DEV.get('forcepose'); // (mode test)
    if (this.liveLimbs(h)) return 'live'; // il imite son joueur
    if (now < h.bumpUntil) return 'bump';
    if (h.y < -2) return 'jump';
    if (h.squat) return 'duck';
    if (this.outro || now < (h.happyUntil || 0)) return 'happy';
    if (h.pose && now < h.poseUntil) return h.pose;
    if (h.holdPose) return h.holdPose;
    if (h.demoPose) return h.demoPose;
    return this.speed < 0.5 ? 'idle' : 'run';
  }

  // Oriente un os pour que le segment os -> enfant pointe dans la direction voulue (repère du monde)
  aimBone(bone, child, dir, root, axis = [0, 1, 0]) {
    if (!bone) return;
    const T = this.T;
    root.updateMatrixWorld(true);
    const p = bone.getWorldPosition(new T.Vector3());
    let cur;
    if (child) cur = child.getWorldPosition(new T.Vector3()).sub(p);
    else cur = new T.Vector3(...axis).applyQuaternion(bone.getWorldQuaternion(new T.Quaternion())); // (sans enfant : axe de l'os)
    if (cur.lengthSq() < 1e-8) return;
    const delta = new T.Quaternion().setFromUnitVectors(cur.normalize(), new T.Vector3(...dir).normalize());
    const world = bone.getWorldQuaternion(new T.Quaternion());
    const parent = bone.parent ? bone.parent.getWorldQuaternion(new T.Quaternion()) : new T.Quaternion();
    bone.quaternion.copy(parent.invert().multiply(delta.multiply(world)));
  }


  applyPose(h, now) {
    const m = h.m3, pose = this.posePick(h, now), ph = now * 0.014;
    m.group.visible = !this.hideHero;
    if (m.human) return this.applyHumanPose(h, m, pose, now);
    let armZ = 0.25, armX = [0, 0], legX = [0, 0], legZ = 0, sy = 1, rotZ = 0, bob = 0;
    switch (pose) {
      case 'run': legX = [0.7 * Math.sin(ph), -0.7 * Math.sin(ph)]; armX = [-0.6 * Math.sin(ph), 0.6 * Math.sin(ph)]; bob = Math.abs(Math.sin(ph)) * 0.08; break;
      case 'jump': armZ = 2.4; legX = [-0.4, -0.4]; break;
      case 'duck': sy = 0.62; armZ = 1.0; break;
      case 'armsUp': armZ = 2.9; break;
      case 'airplane': armZ = 1.6; break;
      case 'star': armZ = 2.3; legZ = 0.35; break;
      case 'flamingo': armZ = 1.35; legX = [0, -1.3]; break;
      case 'smash': { const k = 1 - Math.max(0, (h.poseUntil - now) / 450); armZ = k < 0.4 ? 2.9 : 2.9 - (k - 0.4) / 0.6 * 2.6; break; }
      case 'bump': rotZ = Math.sin(now * 0.03) * 0.25; armZ = 1.3; break;
      case 'happy': armZ = 2.6; bob = Math.abs(Math.sin(now * 0.012)) * 0.25; break;
      default: bob = Math.sin(now * 0.003) * 0.02;
    }
    m.armL.rotation.set(armX[0], 0, -armZ);
    m.armR.rotation.set(armX[1], 0, armZ);
    m.legL.rotation.set(legX[0], 0, -legZ);
    m.legR.rotation.set(legX[1], 0, legZ);
    m.inner.scale.y = sy;
    m.inner.position.y = bob;
    m.group.rotation.z = rotZ;
    m.ring.visible = !!h.holdPose;
    m.group.position.set(h.lane * LANE, this.heroY3(h), 0);
    if (m.anims) for (const a of m.anims) a(now);
  }

  // ---------- Rendu
  render(now) {
    if (!this.ready || !this.theme || !this.s3) return super.render(now);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.speed += (this.targetSpeed - this.speed) * Math.min(1, dt * 3);
    const dz = this.speed * dt * 14;
    this.scroll += dz;
    const move = dz * DEPTH_SCALE;

    for (const h of this.heroes) {
      h.lane += (h.targetLane - h.lane) * Math.min(1, dt * 8);
      h.vy += this.H * 5 * dt; h.y += h.vy * dt;
      if (h.y > 0) { h.y = 0; h.vy = 0; }
      if (!h.m3) { h.m3 = this.makeHero(h.pal || this.theme.hero, this.heroes.length > 1, this.theme.hero.extra, true, h.look); this.s3.add(h.m3.group); }
      this.applyPose(h, now);
    }
    this.updateCompanions(now);
    this.updateFx(now);
    this.updateCart(now);
    this.updateBoss(now);
    this.updateBall3D(now);
    this.updateMonkeys(now);
    this.updateWand3D(now);
    this.updateSport3D(now);
    this.updateForkSigns(now);
    // Paysage suivant quand on avance dans la partie
    const fb = typeof DEV !== 'undefined' && DEV.get('biome'); // (mode test) paysage forcé
    const bi = Math.min(this.theme.biomes.length - 1, fb ? Number(fb) : Math.floor(this.progress * this.theme.biomes.length));
    if (bi !== this.biomeIdx) this.applyBiome(bi);
    // Le chemin et le décor défilent vers nous ; un objet qui sort est remplacé par un objet du paysage courant
    this.pathTex.offset.y = (this.pathTex.offset.y + move / (160 / 30)) % 1;
    this.decor = this.decor.map((d) => {
      d.position.z += move;
      if (d.userData.anim) d.userData.anim(now);
      if (d.position.z <= 8) return d;
      this.dispose(d);
      const n = this.makeDecor(); this.placeDecor(n, d.position.z - 88); this.s3.add(n); return n;
    });
    if (this.backdrops) this.backdrops.children.forEach((g) => g.userData.anim && g.userData.anim(now));
    for (const t of this.tufts) { t.position.z += move; if (t.position.z > 8) t.position.z -= 84; t.position.y = this.groundY(t.position.x, t.position.z); }
    // Terrain : 3 morceaux qui avancent et se relaient ; le décor suit le relief
    this.terOff = (this.terOff + move) % TER_PERIOD;
    this.chunks.forEach((c, k) => { c.mesh.position.z = TER_PERIOD / 2 - k * TER_PERIOD + this.terOff; });
    for (const d of this.decor) d.position.y = this.groundY(d.position.x, d.position.z);
    this.windU.value = now / 1000;
    this.updateDust(now, dt, move);
    this.updateParticles(now, dt, move);
    this.updateButterflies(now, dt, move);
    for (const c of this.clouds) { c.position.x += dt * 0.6; if (c.position.x > 45) c.position.x = -45; }
    this.skyU.time.value = now / 1000;
    // Caméra : suit le héros (couloir, saut) avec un léger balancement quand on court
    const avg = this.heroes.reduce((a, h) => a + h.lane, 0) / this.heroes.length;
    const hy = this.heroY3(this.heroes[0]);
    // (épreuves à portée de main : la caméra se rapproche pour bien voir les bras du héros)
    const cdt = Math.min(0.25, Math.max(0, (now - (this.cuT || now)) / 1000)); this.cuT = now; // (horloge propre : PC lents)
    this.cuK = (this.cuK || 0) + ((this.closeUp ? 1 : 0) - (this.cuK || 0)) * Math.min(1, cdt * 2.5);
    const cu = this.cuK;
    // Réalisateur : un plan par situation (décalage de la caméra, point visé, focale), enchaînés en douceur
    const S = this.directShot(now), sh = (this.shot = this.shot || { ...S }), kS = Math.min(1, cdt * 1.8);
    for (const key of Object.keys(S)) sh[key] += (S[key] - sh[key]) * kS;
    this.camera.position.x += (avg * LANE * (0.35 + 0.5 * cu) + sh.x - this.camera.position.x) * Math.min(1, dt * 3);
    this.camera.position.y += (3.2 - 1.25 * cu + sh.y + hy * 0.35 + Math.sin(now * 0.011) * 0.04 * Math.min(1, this.speed) - this.camera.position.y) * Math.min(1, dt * 4);
    this.camera.position.z = 6.8 - 3.0 * cu + sh.z;
    this.camera.lookAt((this.camera.position.x - sh.x) * (0.6 + 0.4 * cu) + sh.lx, 1.1 + 0.25 * cu + hy * 0.3 + sh.ly, -8 + 2 * cu + sh.lz);
    // La caméra penche un peu dans les changements de couloir ; la focale s'ouvre avec la vitesse
    const h0 = this.heroes[0], lean = h0 ? Math.max(-1, Math.min(1, h0.targetLane - h0.lane)) : 0;
    this.roll = (this.roll || 0) + (lean * -0.05 - (this.roll || 0)) * Math.min(1, cdt * 6);
    this.camera.rotateZ(this.roll);
    const fov = sh.fov + Math.max(0, this.speed - 1) * 7;
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    // Arrivée dans le monde : la caméra descend du ciel en tournant autour du héros (pendant le 3, 2, 1)
    const ik = this.introT ? Math.min(1, (now - this.introT) / 3600) : 1;
    if (ik < 1) {
      const e = 1 - Math.pow(1 - ik, 3), a = (1 - e) * 0.5, r = 6.8 + (1 - e) * 6;
      const from = new this.T.Vector3(Math.sin(a) * r, 3.2 + (1 - e) * 10, Math.cos(a) * r);
      this.camera.position.lerp(from, 1 - e);
      this.camera.lookAt(0, 1.2 * (1 - e) + (1.1 + hy * 0.3) * e, -8 * e);
    }
    // Fin de partie : la caméra passe devant le héros qui fête sa victoire
    if (this.outro) {
      // (le héros se place sur le côté gauche de l'écran : le tableau des résultats reste lisible au milieu)
      const ok2 = Math.min(1, (now - this.outro) / 1800), e = ok2 * ok2 * (3 - 2 * ok2);
      const a = Math.PI * 0.85 * e + Math.sin((now - this.outro) / 2500) * 0.08;
      const tgt = new this.T.Vector3(Math.sin(a) * 5.2, 1.9 + 0.8 * (1 - e), Math.cos(a) * 5.2);
      this.camera.position.lerp(tgt, e);
      const side = 2.3 * e;
      this.camera.lookAt(Math.cos(a) * side, 1.35, -Math.sin(a) * side);
    }
    // Petit « coup » de caméra : rebond quand c'est réussi, secousse quand on se cogne
    const fl = this.heroes[0] && this.heroes[0].flash;
    if (fl && now - fl.t < 350) {
      const k = 1 - (now - fl.t) / 350;
      if (fl.ok) this.camera.position.y += Math.sin(k * Math.PI) * 0.12;
      else { this.camera.position.x += Math.sin(now * 0.09) * 0.12 * k; this.camera.position.y += Math.cos(now * 0.11) * 0.08 * k; }
    }
    this.sky.position.copy(this.camera.position);
    if (this.lantern) this.lantern.position.set(this.camera.position.x * 0.6, 3.2, 1.5); // (lanterne au-dessus du héros)

    this.updateCubes3D(now, dt);
    this.updatePoseModel(now);

    // Obstacles à éviter / étoiles
    this.hazards = this.hazards.filter((hz) => this.hazardZ(hz, now) > -0.9 && !(hz.t0 && now - hz.t0 > 600));
    const alive = new Set(this.hazards);
    for (const [hz, mesh] of this.hzMeshes) if (!alive.has(hz)) { this.dispose(mesh); this.hzMeshes.delete(hz); }
    for (const hz of this.hazards) {
      let mesh = this.hzMeshes.get(hz);
      if (!mesh) { mesh = this.makeHazard(hz); this.s3.add(mesh); this.hzMeshes.set(hz, mesh); }
      mesh.position.z = this.z3(this.hazardZ(hz, now));
      const k = hz.t0 ? Math.max(0.01, 1 - (now - hz.t0) / 600) : 1;
      mesh.scale.setScalar(k);
      if (hz.kind === 'star') mesh.position.y = Math.sin(now * 0.006) * 0.1 + (hz.t0 ? (1 - k) * 1.5 : 0);
      if (hz.kind === 'item' && mesh.userData.item) { mesh.userData.item.rotation.y = now * 0.003; mesh.userData.item.position.y = 0.9 + Math.sin(now * 0.006) * 0.12; }
      if (hz.kind === 'tackle' && mesh.userData.slider) { // (il glisse : petites secousses, l'herbe vole, le ballon roule)
        mesh.userData.slider.position.x = Math.sin(now * 0.03) * 0.05;
        for (const [b, y, p] of mesh.userData.clumps) b.position.y = y + Math.abs(Math.sin(now * 0.012 + p)) * 0.25;
        mesh.userData.ball.rotation.x -= 0.2;
        if (hz.state === 'cleared') mesh.userData.slider.rotation.y = (1 - k) * 0.6;
      }
      if (hz.kind === 'giant' && mesh.userData.giant) { // (se dandine, bras écartés ; raté : il saute de joie)
        const gp = mesh.userData.giant; gp.rotation.z = Math.sin(now * 0.004) * 0.06;
        gp.position.y = hz.state === 'hit' ? Math.abs(Math.sin((now - hz.t0) * 0.012)) * 0.5 : 0;
      }
      if (hz.kind === 'thief' && mesh.userData.pet) { mesh.userData.pet.animate(now, hz.t0 && hz.state === 'hit' ? 'happy' : 'run'); mesh.rotation.y = hz.state === 'cleared' ? Math.PI : 0; }
    }

    // Obstacle de l'étape (tronc, branche, rocher, étoile dans un couloir, mur)
    const o = this.obs;
    if (o !== this.obsRef) {
      if (this.obsMesh) this.dispose(this.obsMesh);
      this.obsMesh = o ? this.makeObstacle(o) : null;
      if (this.obsMesh) this.s3.add(this.obsMesh);
      this.obsRef = o;
    }
    if (o && this.obsMesh) {
      if (o.state === 'coming') {
        this.obsMesh.position.z = this.z3(this.obsZ(now));
        if (o.kind === 'crate' && o.shake && now - o.shake < 200) this.obsMesh.position.x = Math.sin(now * 0.2) * 0.08;
      } else {
        const since = now - o.t0, k = Math.max(0, 1 - since / (o.state === 'cleared' ? 400 : 700));
        this.obsMesh.scale.setScalar(Math.max(0.01, k));
        if (o.state === 'cleared' && o.kind === 'tunnel') this.obsMesh.position.z = this.z3(o.zc) + since * 0.012;
        else if (o.state === 'cleared') this.obsMesh.position.y = (1 - k) * 1.2;
        if (k <= 0) this.obs = null;
      }
    }

    this.updateCoach(now);
    this.updateEncounter3D(now);
    // Rendu avec effets d'image, sauf si le PC rame (moyenne des images trop lente) ou si les parents les ont coupés
    this.frameMs = (this.frameMs || 16) * 0.95 + dt * 1000 * 0.05;
    this.autoQuality(now);
    if (typeof DEV !== 'undefined' && DEV.get('perf')) { // (mode test) coût de l'image
      const t0 = performance.now(); this.renderer.render(this.s3, this.camera); const ms = performance.now() - t0;
      const i = this.renderer.info.render, m = this.renderer.info.memory; let meshes = 0, skinned = 0;
      this.s3.traverse((o) => { if (o.isMesh && o.visible) { meshes++; if (o.isSkinnedMesh) skinned++; } });
      document.title = 'PERF ' + JSON.stringify({ calls: i.calls, tris: i.triangles, meshes, skinned, geo: m.geometries, tex: m.textures, renderMs: +ms.toFixed(1), px: [this.renderer.domElement.width, this.renderer.domElement.height] });
    }
    const fx = this.composer && this.Q.fx && (typeof store !== 'function' || store('effects') !== false);
    this.outlineMat.visible = !fx; // (sans effets : anciens contours « coque » ; avec : trait d'encre sur toute l'image)
    if (fx) { this.renderPass.scene = this.s3; this.composer.render(); }
    else this.renderer.render(this.s3, this.camera);
    // Photo souvenir demandée : on la prend juste après le dessin (même image), en petit, en JPEG
    if (this.snapReq) {
      const done = this.snapReq; this.snapReq = null;
      try {
        const c = document.createElement('canvas'); c.width = 480; c.height = Math.round(480 * this.cv3.height / this.cv3.width);
        c.getContext('2d').drawImage(this.cv3, 0, 0, c.width, c.height);
        done(c.toDataURL('image/jpeg', 0.8));
      } catch (e) { console.warn('Photo impossible', e); done(null); }
    }

    // Calque 2D : bulles, mains, corde, ✔ / ✗, particules
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    this.drawEncounter3D(now);
    this.drawMoles(now);
    this.drawFruits(now);
    this.drawCoachCard(now);
    this.drawBubbles(now);
    this.drawFoam(now);
    this.drawWand(now);
    this.drawSport(now);
    this.drawAct(now);
    this.drawFork(now);
    this.drawTurn(now);
    this.drawRope(now);
    this.drawCue(now);
    this.drawFlashes(now);
    this.drawFx(dt);
  }

  // Corde à sauter (calque 2D) qui passe sous les pieds à t0 + k × période
  drawRope(now) {
    const r = this.rope;
    if (!r) return;
    const ctx = this.ctx, phi = ((now - r.t0) / r.period) * Math.PI * 2;
    // Au moment de sauter (phi = 0, 2π…), la corde est SOUS les pieds ; à mi-chemin, au-dessus de la tête
    const handY = 0.95, cy = 1.0 - Math.cos(phi) * 1.0; // 0 = pieds, 2 = au-dessus de la tête
    const L = this.project(-(LANE * 1.5 + 0.6), handY, 0.2), R = this.project(LANE * 1.5 + 0.6, handY, 0.2);
    const midX = this.heroes.reduce((a, h) => a + h.lane, 0) / this.heroes.length * LANE;
    const C = this.project(midX, 2 * cy - handY, 0.2);
    const s = this.size * 0.5;
    ctx.fillStyle = '#8d5a3b';
    for (const p of [L, R]) { ctx.beginPath(); ctx.roundRect(p.x - s * 0.06, p.y - s * 0.15, s * 0.12, s * 0.3, s * 0.05); ctx.fill(); }
    ctx.strokeStyle = '#e63946'; ctx.lineWidth = Math.max(4, s * 0.06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.quadraticCurveTo(C.x, C.y, R.x, R.y); ctx.stroke();
  }

  // Grand rond vert ✔ ou orange ✗ au-dessus de chaque personnage
  drawFlashes(now) {
    const ctx = this.ctx;
    this.heroes.forEach((h) => {
      const f = h.flash, age = f ? now - f.t : 1e9;
      if (age >= 900) return;
      const sc = h.m3 ? h.m3.scale : 1;
      const top = this.project(h.lane * LANE, this.heroY3(h) + 2.5 * sc, 0), base = this.project(h.lane * LANE, this.heroY3(h), 0);
      const a = 1 - age / 900, pop = 1 + 0.25 * Math.sin(Math.min(1, age / 250) * Math.PI);
      const r = Math.abs(base.y - top.y) * 0.16 * pop, x = top.x, y = top.y;
      ctx.globalAlpha = a;
      ctx.fillStyle = f.ok ? '#22c55e' : '#f59e0b';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(3, r * 0.22); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      if (f.ok) { ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.35); ctx.lineTo(x + r * 0.5, y - r * 0.35); }
      else { ctx.moveTo(x - r * 0.35, y - r * 0.35); ctx.lineTo(x + r * 0.35, y + r * 0.35); ctx.moveTo(x + r * 0.35, y - r * 0.35); ctx.lineTo(x - r * 0.35, y + r * 0.35); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }
}
