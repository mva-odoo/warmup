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
const TER_PERIOD = 100;    // le relief se répète tous les 100 m (invisible grâce à la brume)

// Hauteur du terrain : plat près du chemin, collines douces plus loin (périodique en z)
function terrainH(x, z) {
  const k = Math.min(1, Math.max(0, (Math.abs(x) - 6) / 9));
  if (k <= 0) return 0;
  const w = (2 * Math.PI) / TER_PERIOD;
  const h = 1.7 * Math.sin(z * w * 2 + x * 0.11) + 1.2 * Math.sin(z * w * 3 - x * 0.07 + 1.3) + 0.9 * Math.sin(x * 0.19 + 2.1) * Math.cos(z * w);
  return k * k * Math.max(-0.2, h + 1.6);
}
const DEPTH_SCALE = 1.3;   // profondeur DepthScene -> unités 3D

// Poses du héros animé : direction visée par chaque os (repère du monde : x = droite de l'écran, y = haut,
// z = vers la caméra ; le héros est vu de dos, son côté gauche « L » est à gauche de l'écran).
// (Three.js retire les points des noms d'os : « UpperArm.L » devient « UpperArmL ».)
const HERO_POSES = {
  armsUp: { UpperArmL: [-0.25, 1, 0], UpperArmR: [0.25, 1, 0] },
  airplane: { UpperArmL: [-1, 0.05, 0], UpperArmR: [1, 0.05, 0] },
  star: { UpperArmL: [-0.7, 0.75, 0], UpperArmR: [0.7, 0.75, 0], UpperLegL: [-0.45, -1, 0], UpperLegR: [0.45, -1, 0] },
  flamingo: { UpperArmL: [-1, -0.15, 0], UpperArmR: [1, -0.15, 0], UpperLegR: [0.1, -0.15, -1], LowerLegR: [0, -1, 0.1] },
};
const HERO_CHILD = { UpperArmL: 'LowerArmL', UpperArmR: 'LowerArmR', UpperLegL: 'LowerLegL', UpperLegR: 'LowerLegR', LowerLegR: 'FootR' };
// Réglage des accessoires du dresseur par rapport aux os (tête, torse), en unités du jeu
// Axe de chaque os dans le modèle (au repos : bras à l'horizontale, jambes vers le bas)
const HUMAN_AXIS = { 'arm-left': [1, 0, 0], 'arm-right': [-1, 0, 0], 'leg-left': [0, -1, 0], 'leg-right': [0, -1, 0] };
const HUMAN_HAND = 0.27; // bout de la main, le long de l'axe du bras (unités du modèle)
const HUMAN_FIT = { head: 0.8, arm: 1.25, hatY: 0.6, glassesY: 0.34, glassesZ: 0.36, bagY: 0.3, bagZ: 0.3 };

// Dresseur (petits humains du pack Mini Characters de Kenney, CC0) : 13 apparences au choix
const HUMAN_MODELS = ['male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'male-g',
  'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f'];
const HUMAN_OWN_HAT = ['male-c'];
const DEFAULT_LOOK = { model: 'male-a', hat: 'cap', glasses: false, color: '#ff6b35' };
const humanKey = (look) => 'characters/character-' + (HUMAN_MODELS.includes(look && look.model) ? look.model : DEFAULT_LOOK.model);
// Poses du dresseur : direction visée par bras / jambes (même repère que pour le héros animé)
const HUMAN_POSES = {
  armsUp: { 'arm-left': [-0.55, 1, 0], 'arm-right': [0.55, 1, 0] },
  airplane: { 'arm-left': [-1, 0.05, 0], 'arm-right': [1, 0.05, 0] },
  star: { 'arm-left': [-0.7, 0.75, 0], 'arm-right': [0.7, 0.75, 0], 'leg-left': [-0.4, -1, 0], 'leg-right': [0.4, -1, 0] },
  flamingo: { 'arm-left': [-1, -0.1, 0], 'arm-right': [1, -0.1, 0], 'leg-right': [0, -0.25, -1] },
};

// Hauteur de la tête de l'ancien héros « jouet » (les accessoires sont dessinés pour elle)
const HERO_HEAD_Y = 1.25;

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
    const cv = document.createElement('canvas');
    cv.id = 'scene3d';
    Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', display: 'none' });
    this.c.parentNode.insertBefore(cv, this.c); // sous le canvas 2D (transparent) qui sert de calque
    this.cv3 = cv;
    // (mode test : on garde l'image pour les captures d'écran sans fenêtre)
    const r = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: !!(typeof DEV !== 'undefined' && (DEV.get('world') || DEV.get('carnet'))) });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
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
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { ShaderPass }, { OutputPass }] = await Promise.all(
      ['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'ShaderPass', 'OutputPass'].map((n) => import(FX_BASE + n + '.js/+esm')));
    const c = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(new T.Scene(), this.camera);
    c.addPass(this.renderPass);
    c.addPass(new UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), 0.16, 0.4, 0.95)); // halo discret (sinon l'image devient laiteuse)
    c.addPass(new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv);'
        // couleurs un peu plus vives et contrastées (moins « voilé »), puis vignettage
        + ' float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = max(mix(vec3(l), c.rgb, 1.22), 0.0); c.rgb = pow(c.rgb, vec3(1.07));'
        + ' float d = distance(vUv, vec2(0.5)); c.rgb *= mix(1.0, 0.72, smoothstep(0.35, 0.85, d)); gl_FragColor = c; }',
    }));
    c.addPass(new OutputPass());
    c.setSize(innerWidth, innerHeight);
    this.composer = c;
  }

  setWorld(theme, palettes = null, looks = null) {
    super.setWorld(theme, palettes, looks);
    this.cubeMeshes = new Map(); this.cubeBits = []; this.cubeRings = [];
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
    };
    this.sky = new T.Mesh(new T.SphereGeometry(190, 32, 16), new T.ShaderMaterial({
      uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top, mid, low, sunCol, sunDir; uniform float glow; varying vec3 vP;
        void main(){ vec3 d = normalize(vP); float h = d.y;
          vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h * 1.6, 0.0, 1.0), 0.7)) : mix(mid, low, clamp(-h * 4.0, 0.0, 1.0));
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
    this.disc = new T.Mesh(new T.SphereGeometry(4, 24, 16), new T.MeshBasicMaterial({ color: '#fff6c2', fog: false }));
    this.disc.position.set(-18, 22, -80);
    scene.add(this.disc);

    // Sol et chemin
    this.buildTerrain();
    this.pathCv = document.createElement('canvas'); this.pathCv.width = this.pathCv.height = 256;
    const tex = new T.CanvasTexture(this.pathCv);
    tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(1, 30);
    this.pathTex = tex;
    const path = new T.Mesh(new T.PlaneGeometry(LANE * 3 + 0.8, 160), lam('#ffffff', { map: tex }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, -70); path.receiveShadow = true;
    scene.add(path);
    // Bords du chemin bien marqués (bordure claire + liseré sombre)
    this.edges = [];
    for (const sg of [-1, 1]) {
      for (const [w, off, col] of [[0.3, 0.15, '#ffffff'], [0.12, 0.36, '#3d2b1f']]) {
        const e = new T.Mesh(new T.PlaneGeometry(w, 160), lam(col));
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
    this.biomeIdx = -1;
    this.applyBiome(0);
  }

  // Paysage n° i du monde : couleurs, ciel, nuit, arrière-plan, particules et objets du décor
  applyBiome(i) {
    const T = this.T, scene = this.s3, b = this.theme.biomes[i], kit = KITS[b.kit] || KITS.meadow;
    const night = !!(kit.night || b.night);
    this.biomeIdx = i; this.pal = b; this.kitName = b.kit || 'meadow';
    this.skyU.top.value.set(b.sky0); this.skyU.mid.value.set(b.sky1); this.skyU.low.value.set(b.fog || b.sky1);
    this.skyU.sunCol.value.set(night ? '#cfd8ff' : '#fff2c7'); this.skyU.glow.value = night ? 0.35 : 1;
    scene.fog.color.set(b.fog || b.sky1);
    this.hemi.color.set(b.sky0); this.hemi.groundColor.set(b.grass);
    this.hemi.intensity = night ? 0.85 : 1.1; // (la nuit, le héros reste bien visible)
    this.sun.intensity = night ? 0.45 : 1.7;
    this.disc.material.color.set(b.sun || '#fff6c2');
    this.disc.scale.setScalar(night ? 0.6 : 1);
    for (const c of this.clouds) c.visible = !night;
    this.colorTerrain(b, !!kit.grass);
    this.mat.leaf2.color.set(shade(b.grass, -0.1));
    this.paintPath(b, night);

    // Arrière-plan du paysage
    if (this.backdrops) scene.remove(this.backdrops);
    this.backdrops = new T.Group();
    for (const name of kit.backdrop || []) this.backdrops.add(this.P.backdrop(name, b));
    scene.add(this.backdrops);

    // Particules d'ambiance (+ étoiles la nuit)
    if (this.particles) { scene.remove(this.particles.points); this.particles.points.geometry.dispose(); this.particles = null; }
    if (kit.particles && kit.particles !== 'stars') this.particles = this.makeParticles(kit.particles);
    if (this.stars) { scene.remove(this.stars); this.stars.geometry.dispose(); this.stars = null; }
    if (night || kit.particles === 'stars') this.stars = this.makeStars();

    // Hautes herbes en bordure du chemin (paysages herbeux)
    for (const t of this.tufts) scene.remove(t);
    this.tufts = [];
    if (kit.grass) {
      for (let k = 0; k < 40; k++) {
        const t = this.makeTuft();
        if (!t) break;
        t.position.set((k % 2 ? 1 : -1) * (LANE * 1.5 + 1.4 + Math.random() * 2.2), 0, -78 + k * 2.1); // jamais sur le chemin
        scene.add(t); this.tufts.push(t);
      }
    }

    // Décor : on remplit au départ ; ensuite les objets lointains changent tout de suite, les proches en défilant
    if (!this.decor.length) {
      for (let k = 0; k < 46; k++) { const d = this.makeDecor(); this.placeDecor(d, -80 + Math.random() * 86); scene.add(d); this.decor.push(d); }
    } else {
      this.decor = this.decor.map((d) => {
        if (d.position.z > -18) return d;
        const z = d.position.z; scene.remove(d);
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
    // Brin d'herbe : petit triangle effilé ; il ondule (plus le haut que le bas) selon le temps et sa position
    const blade = new T.PlaneGeometry(0.1, 0.6, 1, 3); blade.translate(0, 0.3, 0);
    const bp = blade.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setX(i, bp.getX(i) * (1 - bp.getY(i) / 0.62));
    const grassMat = this.P.toon('#ffffff', { side: T.DoubleSide });
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
      const n = 1700, grass = new T.InstancedMesh(blade, grassMat, n);
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
  colorTerrain(b, grassy) {
    const T = this.T, base = new T.Color(b.grass), light = new T.Color(shade(b.grass, 0.12)), dark = new T.Color(shade(b.grass, -0.14));
    const c = new T.Color();
    for (const { mesh, grass } of this.chunks) {
      const p = mesh.geometry.attributes.position, col = mesh.geometry.attributes.color;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        const v = Math.sin(x * 0.21 + z * 0.13) * 0.5 + Math.sin(x * 0.07 - z * 0.31 + 1.7) * 0.5;
        c.copy(base).lerp(v > 0 ? light : dark, Math.abs(v) * 0.8);
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

  // Hauteur du sol à une position du monde (pour poser le décor sur les collines)
  groundY(x, z) { return terrainH(x, z - this.terOff - TER_PERIOD / 2); }

  makeTuft() {
    const t = this.P.model(Math.random() < 0.6 ? 'quaternius/Grass_Large' : 'quaternius/Grass_Small');
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
    if (d.userData.name === 'creature') { d.position.set(side * (LANE * 1.5 + 1.8 + Math.random() * 2.2), 0, z); return; } // dans les herbes
    const big = /dino|igloo|palm|bigMushroom|appleTree|roundTree|tree_|cherryTree|bamboo/.test(d.userData.name || '') ? 2.2 : 0;
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
      petals: ['#ffafcc', 0.2], embers: ['#ff8c42', 0.18],
    }[kind] || ['#ffffff', 0.15];
    const points = new T.Points(geo, new T.PointsMaterial({ color: look[0], size: look[1], transparent: true, opacity: 0.9, depthWrite: false }));
    this.s3.add(points);
    const vel = { snow: [0.3, -1.2], bubbles: [0.2, 1.0], fireflies: [0.6, 0.15], petals: [0.5, -0.8], embers: [0.3, 1.4] }[kind] || [0.2, -0.5];
    return { points, kind, vel };
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

  // Libère le monde précédent (mémoire de la carte graphique) avant d'en construire un nouveau
  clear3d() {
    if (!this.s3) return;
    const shared = new Set();
    if (this.P) { for (const g of Object.values(this.P.geo)) shared.add(g); for (const m of this.P.mats.values()) shared.add(m); }
    this.s3.traverse((o) => {
      for (const res of [o.geometry, ...(Array.isArray(o.material) ? o.material : [o.material])]) {
        if (res && !shared.has(res)) { shared.add(res); if (res.map && !this.isEmojiTex(res.map)) res.map.dispose(); res.dispose(); }
      }
    });
    if (this.skyTex) this.skyTex.dispose();
    this.s3 = null;
  }

  isEmojiTex(tex) { for (const t of this.emojiTex.values()) if (t === tex) return true; return false; }

  // Personnage jouet : corps rond, oreilles, antenne-feuille, bras et jambes articulés (vu de dos)
  // Dresseur : petit humain animé (sprint, saut, accroupi, coup, joie, refus) + chapeau, sac à dos, lunettes
  makeHumanHero(pal, small, look) {
    const T = this.T, key = humanKey(look), obj = this.P.model(key);
    const group = new T.Group(), inner = new T.Group();
    group.add(inner); inner.add(obj);
    obj.rotation.y = Math.PI; // vu de dos
    // (matériaux propres à ce personnage : il peut devenir un peu transparent sans toucher les autres)
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material = o.material.clone(); } });
    const bones = {};
    obj.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    const mixer = new T.AnimationMixer(obj), actions = {};
    for (const c of this.P.anims.get(key) || []) actions[c.name] = mixer.clipAction(c);
    for (const n of ['jump', 'crouch', 'attack-melee-right', 'emote-no']) if (actions[n]) { actions[n].setLoop(T.LoopOnce); actions[n].clampWhenFinished = true; }
    const ring = new T.Mesh(new T.TorusGeometry(0.95, 0.06, 8, 40), new T.MeshBasicMaterial({ color: '#4ade80' }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; ring.visible = false; group.add(ring);
    if (small) {
      const disk = new T.Mesh(new T.CircleGeometry(0.75, 32), new T.MeshBasicMaterial({ color: pal.body, transparent: true, opacity: 0.55 }));
      disk.rotation.x = -Math.PI / 2; disk.position.y = 0.02; group.add(disk);
    }
    // Accessoires à la couleur préférée de l'enfant
    const col = look.color || DEFAULT_LOOK.color, dark = shade(col, -0.3), lam = this.lam, G = this.geo;
    const hat = new T.Group(), bag = new T.Group(), glasses = new T.Group();
    inner.add(hat, bag, glasses);
    const add = (grp, geo, c, x, y, z, sx, sy = sx, sz = sx, rot) => {
      const m = new T.Mesh(geo, lam(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (rot) m.rotation.set(...rot); grp.add(m); return m;
    };
    const dome = new T.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const hatKind = HUMAN_OWN_HAT.includes(look.model) ? 'none' : look.hat; // ce personnage a déjà sa casquette
    if (hatKind === 'cap') { // casquette portée à l'envers : on voit la visière de dos
      add(hat, dome, col, 0, 0, 0, 0.5, 0.36, 0.5);
      add(hat, new T.CylinderGeometry(1, 1, 1, 20, 1, false, -Math.PI / 2, Math.PI), dark, 0, 0.01, 0.32, 0.36, 0.03, 0.34);
      add(hat, G.sphere, '#ffffff', 0, 0.36, 0, 0.06);
    } else if (hatKind === 'beanie') {
      add(hat, dome, col, 0, -0.02, 0, 0.5, 0.44, 0.5);
      add(hat, new T.TorusGeometry(0.48, 0.07, 8, 24), dark, 0, 0.0, 0, 1, 1, 1, [Math.PI / 2, 0, 0]);
      add(hat, G.sphere, '#ffffff', 0, 0.47, 0, 0.11);
    } else if (hatKind === 'headband') {
      add(hat, new T.TorusGeometry(0.47, 0.06, 8, 24), col, 0, -0.08, 0, 1, 1, 1, [Math.PI / 2, 0, 0]);
    }
    // Sac à dos de dresseur, avec un rabat et deux bretelles
    add(bag, new T.BoxGeometry(1, 1, 1), col, 0, 0, 0, 0.52, 0.58, 0.26);
    add(bag, new T.BoxGeometry(1, 1, 1), dark, 0, 0.18, 0.02, 0.54, 0.2, 0.28);
    add(bag, G.sphere, '#ffd166', 0, 0.12, 0.15, 0.05);
    if (look.glasses) {
      for (const sg of [-1, 1]) add(glasses, new T.TorusGeometry(0.1, 0.022, 6, 16), '#1e1b4b', sg * 0.15, 0, 0, 1);
      add(glasses, new T.BoxGeometry(1, 1, 1), '#1e1b4b', 0, 0, 0, 0.12, 0.025, 0.025);
    }
    this.shadow(hat); this.shadow(bag); this.outline(hat); this.outline(bag);
    const scale = small ? 0.85 : 1;
    group.scale.setScalar(scale);
    return { group, inner, ring, scale, anims: [], human: { mixer, actions, bones, hat, bag, glasses, look, cur: null, last: 0 } };
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
    m.group.rotation.y = Math.PI + 0.45; // de face, légèrement de trois quarts
    scene.add(m.group);
    const cam = new T.PerspectiveCamera(30, 240 / 300, 0.1, 50);
    cam.position.set(0, 1.45, 6.2); cam.lookAt(0, 1.05, 0);
    this.trR.setClearColor(0x000000, 0);
    this.trR.render(scene, cam);
    const out = document.createElement('canvas'); out.width = size; out.height = Math.round(size * 1.25);
    out.getContext('2d').drawImage(this.trR.domElement, 0, 0, out.width, out.height);
    return out;
  }

  // Charge les petits dresseurs (tous, pour la fenêtre de choix)
  preloadTrainers(models = HUMAN_MODELS) {
    return this.load().then(() => this.P.preload(models.map((model) => humanKey({ model }))));
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
    if (!want || !h || !h.m3 || !h.m3.human) { if (this.poseModel) this.poseModel.root.visible = false; return; }
    const T = this.T;
    if (!this.poseModel || this.poseModel.look !== h.m3.human.look) {
      if (this.poseModel) this.s3.remove(this.poseModel.root);
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
    const r = m.human, want = HUMAN_POSES[this.ghostPose] ? this.ghostPose : null;
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
    const clip = { run: 'sprint', jump: 'jump', duck: 'crouch', smash: 'attack-melee-right', bump: 'emote-no', happy: 'emote-yes' }[pose] || 'idle';
    const next = r.actions[clip] || r.actions.idle;
    if (next && next !== r.cur) { next.reset().fadeIn(0.15).play(); if (r.cur) r.cur.fadeOut(0.15); r.cur = next; }
    const dt = r.last ? Math.min(0.1, Math.max(0, (now - r.last) / 1000)) : 0;
    r.last = now;
    r.mixer.update(dt);
    // Proportions « dessin animé » lisibles de dos : tête un peu plus petite, bras plus longs (la pose se voit)
    if (r.bones.head) r.bones.head.scale.setScalar(HUMAN_FIT.head);
    const P = HUMAN_POSES[pose];
    const L = !m.isGhost && this.liveLimbs(h); // imitation en direct du joueur
    const long = P || L ? HUMAN_FIT.arm : 1; // bras un peu plus longs pendant une pose (on la voit mieux)
    for (const n of ['arm-left', 'arm-right']) if (r.bones[n]) r.bones[n].scale.set(long, 1, 1);
    // De face (modèle à imiter, fruits) : son bras gauche est à droite de l'écran, on échange gauche / droite
    const facing = !!m.facing || (!m.isGhost && this.faceCam && !!L);
    const sw = (b) => (facing ? b.replace(/left|right/, (x) => (x === 'left' ? 'right' : 'left')) : b);
    m.inner.rotation.y = facing && !m.facing ? Math.PI : 0;
    this.setSeeThrough(m, facing && !m.facing);
    if (P) for (const [bone, dir] of Object.entries(P)) this.aimBone(r.bones[sw(bone)], null, facing ? [dir[0], dir[1], -dir[2]] : dir, m.inner, HUMAN_AXIS[sw(bone)]);
    if (L) for (const [bone, d] of Object.entries(L)) if (d && r.bones[sw(bone)]) this.aimBone(r.bones[sw(bone)], null, [d[0], d[1], facing ? -0.08 : 0.08], m.inner, HUMAN_AXIS[sw(bone)]);
    if (!m.isGhost) this.updateGhost(h, m);
    m.ring.visible = !!h.holdPose;
    m.group.position.set(h.lane * LANE, this.heroY3(h), 0);
    m.group.rotation.z = 0;
    m.group.updateMatrixWorld(true);
    const at = (bone, dx, dy, dz, target) => {
      if (!bone) return;
      const v = bone.getWorldPosition(new T.Vector3()); m.inner.worldToLocal(v);
      target.position.set(v.x + dx, v.y + dy, v.z + dz);
    };
    at(r.bones.head, 0, HUMAN_FIT.hatY, 0, r.hat);
    at(r.bones.head, 0, HUMAN_FIT.glassesY, -HUMAN_FIT.glassesZ, r.glasses);
    at(r.bones.torso, 0, HUMAN_FIT.bagY, HUMAN_FIT.bagZ, r.bag);
    // Position des mains du héros, dans le repère des bulles / taupes (unité = demi-mètre autour des épaules)
    if (L) {
      const idx = this.heroes.indexOf(h), sc = m.scale, ax = m.group.position.x, ay = m.group.position.y + 1.15 * sc;
      this.avatarHands = this.avatarHands || [];
      this.avatarHands[idx] = ['arm-left', 'arm-right'].map((n) => {
        const b = r.bones[n]; if (!b) return null;
        const v = b.localToWorld(new T.Vector3(HUMAN_AXIS[n][0] * HUMAN_HAND, 0, 0)), o = b.getWorldPosition(new T.Vector3());
        // main (u, v) et épaule (su, sv) : on touche avec tout le bras
        return { u: (v.x - ax) / (0.5 * sc), v: -(v.y - ay) / (0.5 * sc), su: (o.x - ax) / (0.5 * sc), sv: -(o.y - ay) / (0.5 * sc) };
      }).filter(Boolean);
    }
  }

  // Héros animé (lapin du pack Quaternius, CC0) : vraies animations de course, saut, accroupi, frappe, salut ;
  // les poses (bras levés, avion, étoile, flamant) sont ajoutées en bougeant bras et jambes par-dessus.
  makeAnimatedHero(pal, small, extra) {
    const T = this.T, obj = this.P.model('monsters/Bunny');
    const group = new T.Group(), inner = new T.Group();
    group.add(inner); inner.add(obj);
    obj.rotation.y = Math.PI; // vu de dos
    const tint = new T.Color(pal.body).lerp(new T.Color('#ffffff'), 0.55); // couleur du héros du monde
    obj.traverse((o) => {
      if (!o.isMesh) return;
      if (/carrot/i.test(o.name)) { o.visible = false; return; } // (le lapin tient une carotte : on la range)
      o.material = o.material.clone(); o.material.color.copy(tint);
      o.castShadow = true; o.frustumCulled = false;
    });
    const bones = {};
    obj.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    const clips = this.P.anims.get('monsters/Bunny') || [];
    const mixer = new T.AnimationMixer(obj);
    const actions = {};
    for (const c of clips) actions[c.name] = mixer.clipAction(c);
    for (const n of ['Duck', 'Punch', 'HitReact', 'Jump']) if (actions[n]) { actions[n].setLoop(T.LoopOnce); actions[n].clampWhenFinished = true; }
    const ring = new T.Mesh(new T.TorusGeometry(0.95, 0.06, 8, 40), new T.MeshBasicMaterial({ color: '#4ade80' }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; ring.visible = false; group.add(ring);
    if (small) {
      const disk = new T.Mesh(new T.CircleGeometry(0.75, 32), new T.MeshBasicMaterial({ color: pal.body, transparent: true, opacity: 0.55 }));
      disk.rotation.x = -Math.PI / 2; disk.position.y = 0.02; group.add(disk);
    }
    // Accessoire du monde, qui suit la tête à chaque image
    const acc = new T.Group(); inner.add(acc);
    const anims = this.addAccessory(acc, extra || pal.extra, pal);
    this.shadow(acc); this.outline(acc);
    const scale = small ? 0.85 : 1;
    group.scale.setScalar(scale);
    return { group, inner, ring, scale, anims, rig: { mixer, actions, bones, acc, cur: null, last: 0 } };
  }

  makeHero(pal, small, extra = null, allowRig = true, look = null) {
    if (allowRig && this.P.models && this.P.models.has(humanKey(look))) return this.makeHumanHero(pal, small, look || DEFAULT_LOOK);
    if (allowRig && this.P.models && this.P.models.has('monsters/Bunny')) return this.makeAnimatedHero(pal, small, extra);
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
      if (this.coachMesh) this.s3.remove(this.coachMesh.group);
      const m = this.makeHero(c.pal || this.theme.hero, false, null, false);
      if (c.style === 'karate') { // ceinture noire et bandeau rouge
        const belt = new this.T.Mesh(new this.T.TorusGeometry(0.56, 0.05, 8, 32), this.lam('#1e1b4b'));
        belt.rotation.x = Math.PI / 2; belt.position.y = 0.82; m.inner.add(belt);
        const band = new this.T.Mesh(new this.T.TorusGeometry(0.5, 0.05, 8, 32), this.lam('#e63946'));
        band.rotation.x = Math.PI / 2; band.position.y = 1.35; band.scale.set(1, 0.95, 1); m.inner.add(band);
      }
      m.group.rotation.y = Math.PI;
      m.group.scale.setScalar(1.6);
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
    if (c.style === 'dance') { m.group.rotation.z = Math.sin(now * 0.008) * 0.12; m.inner.position.y += Math.abs(Math.sin(now * 0.008)) * 0.12; }
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
  preloadWorld(world, looks = []) {
    const kits = world.biomes.map((b) => b.kit || 'meadow');
    return this.load().then(() => this.P.preload([...new Set([DEFAULT_LOOK, ...looks].map(humanKey)), ...this.P.modelsOf(kits), ...creatureModels(kits.flatMap((k) => creaturesOf(k)))]));
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
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160), this.lam(b.grass)); ground.rotation.x = -Math.PI / 2; ground.position.z = -40; ground.receiveShadow = true; scene.add(ground);
    const path = new T.Mesh(new T.PlaneGeometry(LANE * 3 + 0.8, 80), this.lam(b.path)); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, -36); path.receiveShadow = true; scene.add(path);
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
        c.animate(0, 'idle', 'armsUp');
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
    if (!e) { if (this.encMesh) { this.s3.remove(this.encMesh.group); this.encMesh = null; this.encRef = null; } return; }
    // Créature animée pas encore chargée : on la charge et on la remplacera dès qu'elle est prête
    if (e.cr.model && !e.loadAsked) {
      const keys = creatureModels([e.cr]);
      if (!keys.every((k) => this.P.models && this.P.models.has(k))) {
        e.loadAsked = true;
        this.P.preload(keys).then(() => { if (this.enc === e) this.encRef = null; });
      }
    }
    if (e !== this.encRef) {
      if (this.encMesh) this.s3.remove(this.encMesh.group);
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
    c.animate(0, 'idle', 'armsUp');
    c.group.rotation.y = -0.35;
    scene.add(c.group);
    const cam = new T.PerspectiveCamera(35, 280 / 260, 0.1, 50);
    cam.position.set(0, 1.3, evolved ? 5.6 : 4.8); cam.lookAt(0, evolved ? 0.95 : 0.8, 0);
    this.crR.setClearColor(0x000000, 0);
    this.crR.render(scene, cam);
    const out = document.createElement('canvas'); out.width = 280; out.height = 260;
    out.getContext('2d').drawImage(this.crR.domElement, 0, 0);
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
    const v = new this.T.Vector3(x, y, z).project(this.camera);
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
    } else if (ok) {
      const p = this.project(hz.kind === 'rock' ? hz.lane * LANE : 0, 0.8, 0.4);
      this.burst(p.x, p.y, 14, ['#ffffff', '#ffe066', '#4ade80']);
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

  // ---------- Cubes en rythme (3D) : ils glissent vers le héros ; bleu = main gauche, orange = main droite
  cubeTex(side) {
    this.cubeTexs = this.cubeTexs || {};
    if (this.cubeTexs[side]) return this.cubeTexs[side];
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = side < 0 ? '#4ea8ff' : '#ff6b35'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(8, 8, 112, 112);
    g.font = '78px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(side < 0 ? '🤛' : '🤜', 64, 70);
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
        const col = cb.side < 0 ? '#4ea8ff' : '#ff6b35';
        mesh = new T.Group();
        const box = new T.Mesh(new T.BoxGeometry(0.62, 0.62, 0.62), [this.lam(col), this.lam(col), this.lam(col), this.lam(col),
          new T.MeshBasicMaterial({ map: this.cubeTex(cb.side) }), this.lam(col)]);
        box.material.forEach((m) => { if (m.emissive) { m.emissive.set(col); m.emissiveIntensity = 0.35; } });
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
      this.s3.remove(b.m); return false;
    });
    // Cibles : deux anneaux à l'endroit où taper (ils grossissent quand un cube arrive)
    this.cubeRings = this.cubeRings || [];
    const tg = this.cubeTargets || [];
    tg.forEach((t, i) => {
      let r = this.cubeRings[i];
      if (!r) {
        r = new T.Mesh(new T.TorusGeometry(0.42, 0.06, 10, 40), new T.MeshBasicMaterial({ color: t.side < 0 ? '#4ea8ff' : '#ff6b35' }));
        this.s3.add(r); this.cubeRings[i] = r;
      }
      const w = this.cubeWorld(t.u, t.v);
      r.position.set(w.x, w.y, 0.05); r.visible = true;
      r.scale.setScalar(t.near ? 1.25 + 0.1 * Math.sin(now * 0.03) : 1);
    });
    for (let i = tg.length; i < this.cubeRings.length; i++) this.cubeRings[i].visible = false;
  }

  burstCube(mesh, side) {
    const T = this.T, col = side < 0 ? '#4ea8ff' : '#ff6b35';
    for (let i = 0; i < 10; i++) {
      const m = new T.Mesh(this.geo.box || new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: i % 3 ? col : '#ffffff' }));
      m.scale.setScalar(0.18); m.position.copy(mesh.position);
      this.s3.add(m);
      this.cubeBits.push({ m, life: 0.7, v: new T.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.3) * 4) });
    }
  }

  makeHazard(hz) {
    if (hz.kind === 'log') return this.makeLog();
    if (hz.kind === 'arch') return this.makeArch();
    if (hz.kind === 'star') { const g = new this.T.Group(); const s = this.emojiSprite(this.theme.collectible, 1.1); s.position.set(hz.lane * LANE, 1.1, 0); g.add(s); return g; }
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
    if (o.kind === 'crate') return this.makeRock(0.95);
    if (o.kind === 'wall') return this.makeWall(o.pose);
    // Étoile dans un couloir, buissons dans les autres
    const T = this.T, g = new T.Group(), lane = o.kind === 'gemL' ? -1 : 1;
    for (const l of [-1, 0, 1]) {
      if (l === lane) { const s = this.emojiSprite(this.theme.collectible, 1.2); s.position.set(l * LANE, 1.0, 0); g.add(s); continue; }
      const bush = new T.Mesh(this.geo.ball, this.mat.leaf2); bush.scale.set(0.7, 0.6, 0.6); bush.position.set(l * LANE, 0.5, 0); g.add(bush);
    }
    return this.shadow(g);
  }

  dispose(obj) {
    this.s3.remove(obj);
    obj.traverse((o) => { if (o.isSprite) o.material.dispose(); });
  }

  // ---------- Pose du personnage 3D
  posePick(h, now) {
    if (typeof DEV !== 'undefined' && DEV.get('forcepose') && h.m3 && (h.m3.rig || h.m3.human)) return DEV.get('forcepose'); // (mode test)
    if (this.liveLimbs(h)) return 'live'; // il imite son joueur
    if (now < h.bumpUntil) return 'bump';
    if (h.y < -2) return 'jump';
    if (h.squat) return 'duck';
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

  // Héros animé : choix de l'animation, poses par-dessus, accessoire qui suit la tête
  applyRigPose(h, m, pose, now) {
    const r = m.rig, T = this.T;
    const clip = { run: 'Run', jump: 'Jump_Idle', duck: 'Duck', smash: 'Punch', bump: 'HitReact', happy: 'Wave' }[pose] || 'Idle';
    const next = r.actions[clip] || r.actions.Idle;
    if (next && next !== r.cur) {
      next.reset().fadeIn(0.15).play();
      if (r.cur) r.cur.fadeOut(0.15);
      r.cur = next;
    }
    const dt = r.last ? Math.min(0.1, Math.max(0, (now - r.last) / 1000)) : 0;
    r.last = now;
    r.mixer.update(dt);
    // Poses : on tourne bras / jambes par-dessus l'animation de repos
    // Poses : chaque os est orienté vers sa direction, par-dessus l'animation de repos
    const P = HERO_POSES[pose];
    if (P) {
      const o = r.bones.Root || m.inner;
      for (const [bone, dir] of Object.entries(P)) this.aimBone(r.bones[bone], r.bones[HERO_CHILD[bone]], dir, o);
    }
    m.ring.visible = !!h.holdPose;
    m.group.position.set(h.lane * LANE, this.heroY3(h), 0);
    m.group.rotation.z = pose === 'bump' ? Math.sin(now * 0.03) * 0.15 : 0;
    // L'accessoire se place sur la tête
    const head = r.bones.Head;
    if (head) {
      m.group.updateMatrixWorld(true);
      const v = head.getWorldPosition(new T.Vector3());
      m.inner.worldToLocal(v);
      r.acc.position.set(v.x, v.y - HERO_HEAD_Y, v.z);
    }
    if (m.anims) for (const a of m.anims) a(now);
  }

  applyPose(h, now) {
    const m = h.m3, pose = this.posePick(h, now), ph = now * 0.014;
    if (m.human) return this.applyHumanPose(h, m, pose, now);
    if (m.rig) return this.applyRigPose(h, m, pose, now);
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
    // Paysage suivant quand on avance dans la partie
    const bi = Math.min(this.theme.biomes.length - 1, Math.floor(this.progress * this.theme.biomes.length));
    if (bi !== this.biomeIdx) this.applyBiome(bi);
    // Le chemin et le décor défilent vers nous ; un objet qui sort est remplacé par un objet du paysage courant
    this.pathTex.offset.y = (this.pathTex.offset.y + move / (160 / 30)) % 1;
    this.decor = this.decor.map((d) => {
      d.position.z += move;
      if (d.userData.anim) d.userData.anim(now);
      if (d.position.z <= 8) return d;
      this.s3.remove(d);
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
    for (const c of this.clouds) { c.position.x += dt * 0.6; if (c.position.x > 45) c.position.x = -45; }
    // Caméra : suit le héros (couloir, saut) avec un léger balancement quand on court
    const avg = this.heroes.reduce((a, h) => a + h.lane, 0) / this.heroes.length;
    const hy = this.heroY3(this.heroes[0]);
    // (épreuves à portée de main : la caméra se rapproche pour bien voir les bras du héros)
    const cdt = Math.min(0.25, Math.max(0, (now - (this.cuT || now)) / 1000)); this.cuT = now; // (horloge propre : PC lents)
    this.cuK = (this.cuK || 0) + ((this.closeUp ? 1 : 0) - (this.cuK || 0)) * Math.min(1, cdt * 2.5);
    const cu = this.cuK;
    this.camera.position.x += (avg * LANE * (0.35 + 0.5 * cu) - this.camera.position.x) * Math.min(1, dt * 3);
    this.camera.position.y += (3.2 - 1.25 * cu + hy * 0.35 + Math.sin(now * 0.011) * 0.04 * Math.min(1, this.speed) - this.camera.position.y) * Math.min(1, dt * 4);
    this.camera.position.z = 6.8 - 3.0 * cu;
    this.camera.lookAt(this.camera.position.x * (0.6 + 0.4 * cu), 1.1 + 0.25 * cu + hy * 0.3, -8 + 2 * cu);
    this.sky.position.copy(this.camera.position);

    this.updateCubes3D(now, dt);

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
    if (this.frameMs > 40 && this.composer && !this.lowQuality) { this.lowQuality = true; console.info('PC lent : effets d\'image coupés'); }
    const fx = this.composer && !this.lowQuality && (typeof store !== 'function' || store('effects') !== false);
    if (fx) { this.renderPass.scene = this.s3; this.composer.render(); }
    else this.renderer.render(this.s3, this.camera);

    // Calque 2D : bulles, mains, corde, ✔ / ✗, particules
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    this.drawEncounter3D(now);
    this.drawMoles(now);
    this.drawFruits(now);
    this.drawBubbles(now);
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
