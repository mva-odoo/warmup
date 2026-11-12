// Monde en vraie 3D (Three.js, style « jouet » low-poly), même logique de jeu que DepthScene :
// on hérite de tout (obstacles, bulles, corde, réussi / raté…) et on remplace seulement le dessin.
// Les éléments d'interface (bulles, mains, corde, ✔ / ✗, confettis) restent en 2D par-dessus,
// placés sur la projection du personnage 3D. Three.js n'est chargé qu'à l'ouverture de ce monde.

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const LANE = 1.6;          // largeur d'un couloir (unités 3D)
const DEPTH_SCALE = 1.3;   // profondeur DepthScene -> unités 3D

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
    const r = new T.WebGLRenderer({ canvas: cv, antialias: true });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer = r;
    this.camera = new T.PerspectiveCamera(55, 1, 0.1, 200);
    this.camera.position.set(0, 3.4, 6.8);
    this.camera.lookAt(0, 1.0, -8);
    this.resize3d();
    addEventListener('resize', () => this.resize3d());
    this.emojiTex = new Map();
    this.ready = true;
    if (this.theme) this.build(this.theme);
  }

  resize3d() {
    if (!this.renderer) return;
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  setWorld(theme, palettes = null) {
    super.setWorld(theme, palettes);
    if (!this.ready) return;
    this.cv3.style.display = theme ? 'block' : 'none';
    if (theme) this.build(theme);
  }

  // ---------- Construction du monde (une fois), puis paysage courant (change pendant la partie)
  build(theme) {
    const T = this.T;
    this.clear3d();
    const scene = new T.Scene();
    this.s3 = scene;
    this.P = this.P || new Props3D(T);
    const lam = (color, extra = {}) => new T.MeshLambertMaterial({ color, ...extra });
    const shadow = (m) => { m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };
    this.lam = lam; this.shadow = shadow;
    this.geo = {
      cone: new T.ConeGeometry(1, 1.2, 7), trunk: new T.CylinderGeometry(0.14, 0.18, 1, 6),
      ball: new T.IcosahedronGeometry(1, 1), sphere: new T.SphereGeometry(1, 14, 10),
      rock: new T.DodecahedronGeometry(1, 0), stem: new T.CylinderGeometry(0.03, 0.03, 1, 5),
    };
    this.mat = { leaf2: lam('#5cb85c', { flatShading: true }), rock: lam('#9a9184', { flatShading: true }) };

    // Ciel (dégradé redessiné à chaque paysage) et brume
    this.skyCv = document.createElement('canvas'); this.skyCv.width = 2; this.skyCv.height = 256;
    this.skyTex = new T.CanvasTexture(this.skyCv); this.skyTex.colorSpace = T.SRGBColorSpace;
    scene.background = this.skyTex;
    scene.fog = new T.Fog('#ffffff', 24, 72);

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
    this.ground = new T.Mesh(new T.PlaneGeometry(220, 220), lam('#7ccf6a'));
    this.ground.rotation.x = -Math.PI / 2; this.ground.position.z = -60; this.ground.receiveShadow = true;
    scene.add(this.ground);
    this.pathCv = document.createElement('canvas'); this.pathCv.width = this.pathCv.height = 128;
    const tex = new T.CanvasTexture(this.pathCv);
    tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(1, 30);
    this.pathTex = tex;
    const path = new T.Mesh(new T.PlaneGeometry(LANE * 3 + 0.8, 160), lam('#ffffff', { map: tex }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, -70); path.receiveShadow = true;
    scene.add(path);

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
    for (const h of this.heroes) { h.m3 = this.makeHero(h.pal || theme.hero, this.heroes.length > 1); scene.add(h.m3.group); }
    this.hzMeshes = new Map();
    this.obsMesh = null; this.obsRef = null;
    this.decor = []; this.backdrops = null; this.particles = null; this.stars = null;
    this.biomeIdx = -1;
    this.applyBiome(0);
  }

  // Paysage n° i du monde : couleurs, ciel, nuit, arrière-plan, particules et objets du décor
  applyBiome(i) {
    const T = this.T, scene = this.s3, b = this.theme.biomes[i], kit = KITS[b.kit] || KITS.meadow;
    const night = !!(kit.night || b.night);
    this.biomeIdx = i; this.pal = b; this.kitName = b.kit || 'meadow';
    const sc = this.skyCv.getContext('2d'), g = sc.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, b.sky0); g.addColorStop(0.6, b.sky1); g.addColorStop(1, b.sky1);
    sc.fillStyle = g; sc.fillRect(0, 0, 2, 256);
    this.skyTex.needsUpdate = true;
    scene.fog.color.set(b.fog || b.sky1);
    this.hemi.color.set(b.sky0); this.hemi.groundColor.set(b.grass);
    this.hemi.intensity = night ? 0.55 : 1.1;
    this.sun.intensity = night ? 0.45 : 1.7;
    this.disc.material.color.set(b.sun || '#fff6c2');
    this.disc.scale.setScalar(night ? 0.6 : 1);
    for (const c of this.clouds) c.visible = !night;
    this.ground.material.color.set(b.grass);
    this.mat.leaf2.color.set(shade(b.grass, -0.1));
    const p2 = this.pathCv.getContext('2d');
    p2.fillStyle = b.path; p2.fillRect(0, 0, 128, 128);
    p2.fillStyle = b.path2; p2.fillRect(0, 0, 128, 64);
    p2.fillStyle = 'rgba(255,255,255,0.7)';
    for (const x of [128 / 3, 256 / 3]) p2.fillRect(x - 2, 10, 4, 40);
    this.pathTex.needsUpdate = true;

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

  makeDecor() {
    const name = this.P.pick(this.kitName);
    const d = this.P.make(name, this.pal);
    d.userData.name = name;
    d.scale.multiplyScalar(0.8 + Math.random() * 0.5);
    d.rotation.y = Math.random() * Math.PI * 2;
    return d;
  }

  placeDecor(d, z) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const big = ['dino', 'igloo', 'palm', 'bigMushroom', 'appleTree', 'roundTree'].includes(d.userData.name) ? 1.5 : 0;
    d.position.set(side * (LANE * 1.5 + 1.2 + big + Math.random() * 10), 0, z);
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
  makeHero(pal, small) {
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
      disk.rotation.x = -Math.PI / 2; disk.position.y = 0.02; group.add(disk);
    }
    this.shadow(inner);
    const scale = small ? 0.85 : 1;
    group.scale.setScalar(scale);
    return { group, inner, armL, armR, legL, legR, ring, scale };
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
    if (now < h.bumpUntil) return 'bump';
    if (h.y < -2) return 'jump';
    if (h.squat) return 'duck';
    if (h.pose && now < h.poseUntil) return h.pose;
    if (h.holdPose) return h.holdPose;
    if (h.demoPose) return h.demoPose;
    return this.speed < 0.5 ? 'idle' : 'run';
  }

  applyPose(h, now) {
    const m = h.m3, pose = this.posePick(h, now), ph = now * 0.014;
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
      if (!h.m3) { h.m3 = this.makeHero(h.pal || this.theme.hero, this.heroes.length > 1); this.s3.add(h.m3.group); }
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
    this.updateParticles(now, dt, move);
    for (const c of this.clouds) { c.position.x += dt * 0.6; if (c.position.x > 45) c.position.x = -45; }
    const avg = this.heroes.reduce((a, h) => a + h.lane, 0) / this.heroes.length;
    this.camera.position.x += (avg * LANE * 0.35 - this.camera.position.x) * Math.min(1, dt * 3);

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

    this.renderer.render(this.s3, this.camera);

    // Calque 2D : bulles, mains, corde, ✔ / ✗, particules
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    this.drawBubbles(now);
    this.drawMoles(now);
    this.drawRope(now);
    this.drawFlashes(now);
    this.drawFx(dt);
  }

  // Corde à sauter (calque 2D) qui passe sous les pieds à t0 + k × période
  drawRope(now) {
    const r = this.rope;
    if (!r) return;
    const ctx = this.ctx, phi = ((now - r.t0) / r.period) * Math.PI * 2;
    const handY = 0.95, cy = 1.0 + Math.cos(phi) * 1.0; // 0 = pieds, 2 = au-dessus de la tête
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
