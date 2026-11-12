// Catalogue de décors 3D (style jouet low-poly), tous construits avec des formes simples.
// Chaque paysage (« kit ») indique quels objets poser le long du chemin, son arrière-plan,
// ses particules d'ambiance et s'il fait nuit. Les objets animés ont userData.anim(t).

const KITS = {
  meadow:   { props: [['pine', 1], ['roundTree', 3], ['bush', 3], ['flower', 4], ['rock', 1], ['mushroom', 1]], backdrop: ['hills', 'windmill'], particles: 'petals' },
  mountain: { props: [['snowPine', 3], ['pine', 2], ['rock', 3], ['bush', 1]], backdrop: ['mountains'] },
  desert:   { props: [['cactus', 4], ['rock', 3], ['palm', 1]], backdrop: ['mesas'] },
  beach:    { props: [['palm', 4], ['umbrella', 2], ['rock', 1], ['flower', 1]], backdrop: ['sea'] },
  jungle:   { props: [['palm', 2], ['fern', 4], ['bigFlower', 2], ['bush', 2], ['roundTree', 2]], backdrop: ['hills'], particles: 'petals' },
  volcano:  { props: [['palm', 2], ['rock', 3], ['fern', 2]], backdrop: ['volcano'], particles: 'embers' },
  forest:   { props: [['pine', 4], ['mushroom', 2], ['bigMushroom', 1], ['bush', 2], ['flower', 2]], backdrop: ['hills'], particles: 'petals' },
  night:    { props: [['pine', 3], ['crystal', 2], ['bigMushroom', 2], ['lantern', 1]], backdrop: ['hills'], particles: 'fireflies', night: true },
  glacier:  { props: [['snowPine', 3], ['snowman', 1], ['iceBlock', 3], ['igloo', 1]], backdrop: ['mountains'], particles: 'snow' },
  aurora:   { props: [['snowPine', 3], ['iceBlock', 2], ['crystal', 1], ['snowman', 1]], backdrop: ['mountains'], particles: 'snow', night: true },
  lagoon:   { props: [['coral', 3], ['seaweed', 3], ['rock', 1], ['fish', 2], ['chest', 1]], backdrop: ['hills'], particles: 'bubbles' },
  reef:     { props: [['coral', 4], ['seaweed', 3], ['fish', 3]], backdrop: ['hills'], particles: 'bubbles' },
  abyss:    { props: [['seaweed', 3], ['crystal', 2], ['coral', 2], ['fish', 2]], backdrop: [], particles: 'bubbles', night: true },
  moon:     { props: [['crater', 3], ['rock', 3], ['rocket', 1]], backdrop: ['planets'], particles: 'stars', night: true },
  mars:     { props: [['rock', 4], ['crater', 2], ['crystal', 1]], backdrop: ['planets', 'mesas'], night: true },
  nebula:   { props: [['crystal', 4], ['rock', 2]], backdrop: ['planets'], particles: 'fireflies', night: true },
  candy:    { props: [['lollipop', 3], ['candyCane', 3], ['cupcake', 2], ['gumdrop', 3], ['donut', 1]], backdrop: ['hills'], particles: 'petals' },
  icecream: { props: [['iceCream', 3], ['lollipop', 2], ['gumdrop', 2], ['candyCane', 1]], backdrop: ['hills', 'mountains'] },
  farm:     { props: [['hayBale', 3], ['fence', 3], ['sunflower', 3], ['roundTree', 1]], backdrop: ['barn', 'windmill', 'hills'] },
  orchard:  { props: [['appleTree', 4], ['fence', 2], ['hayBale', 1], ['bush', 2]], backdrop: ['barn', 'hills'] },
  ferns:    { props: [['fern', 4], ['palm', 3], ['egg', 1], ['bigMushroom', 1], ['dino', 1]], backdrop: ['volcano'] },
  dinoland: { props: [['rock', 3], ['fern', 2], ['egg', 2], ['dino', 1]], backdrop: ['volcano'], particles: 'embers' },
  garden:   { props: [['roseBush', 3], ['roundTree', 2], ['lantern', 1], ['flower', 3]], backdrop: ['castle', 'hills'], particles: 'petals' },
  magic:    { props: [['crystal', 3], ['bigMushroom', 2], ['lantern', 2], ['pine', 2]], backdrop: ['castle'], particles: 'fireflies', night: true },
  disco:    { props: [['speaker', 3], ['balloon', 3], ['lightPole', 3]], backdrop: ['stage'], particles: 'fireflies', night: true },
  dojo:     { props: [['bamboo', 4], ['cherryTree', 3], ['stoneLantern', 2], ['rock', 1]], backdrop: ['pagoda', 'hills'], particles: 'petals' },
  dojoNight: { props: [['bamboo', 3], ['cherryTree', 2], ['stoneLantern', 3]], backdrop: ['pagoda'], particles: 'fireflies', night: true },
};

class Props3D {
  constructor(T) {
    this.T = T;
    this.mats = new Map();
    this.geo = {
      cone: new T.ConeGeometry(1, 1, 7), cyl: new T.CylinderGeometry(1, 1, 1, 10), box: new T.BoxGeometry(1, 1, 1),
      ball: new T.IcosahedronGeometry(1, 1), sphere: new T.SphereGeometry(1, 16, 12), rock: new T.DodecahedronGeometry(1, 0),
      cap: new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), torus: new T.TorusGeometry(1, 0.3, 8, 20),
      octa: new T.OctahedronGeometry(1, 0), capsule: new T.CapsuleGeometry(1, 1, 4, 8),
      arc: new T.TorusGeometry(1, 0.22, 8, 16, Math.PI),
    };
  }

  // Matériau partagé par couleur (évite d'en recréer à chaque objet)
  mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    let m = this.mats.get(key);
    if (!m) { m = new this.T.MeshLambertMaterial({ color, ...opts }); this.mats.set(key, m); }
    return m;
  }

  // Ajoute une forme au groupe : geo, couleur, position, échelle (sx, sy, sz), rotation éventuelle
  add(g, geo, color, x, y, z, sx, sy = sx, sz = sx, opts, rot) {
    const m = new this.T.Mesh(this.geo[geo], this.mat(color, opts));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    g.add(m);
    return m;
  }

  // Objet du kit, couleurs du paysage (pal = biome)
  make(name, pal) {
    const g = new this.T.Group();
    (this[name] || this.bush).call(this, g, pal);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  pick(kit) {
    const list = (KITS[kit] || KITS.meadow).props;
    const total = list.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [n, w] of list) { r -= w; if (r <= 0) return n; }
    return list[0][0];
  }

  leaf(pal, k = 0) { return shade(pal.grass, -0.25 + k); }

  // ---------- Végétation
  pine(g, pal) {
    this.add(g, 'cyl', '#8a5a2b', 0, 0.3, 0, 0.15, 0.6, 0.15);
    [[1, 0.9], [0.8, 1.5], [0.55, 2.05]].forEach(([r, y]) => this.add(g, 'cone', this.leaf(pal), 0, y, 0, r, 1.2, r, { flatShading: true }));
  }
  snowPine(g, pal) {
    this.pine(g, pal);
    [[0.55, 1.25], [0.45, 1.85], [0.3, 2.4]].forEach(([r, y]) => this.add(g, 'cone', '#ffffff', 0, y, 0, r, 0.5, r, { flatShading: true }));
  }
  roundTree(g, pal) {
    this.add(g, 'cyl', '#8a5a2b', 0, 0.6, 0, 0.17, 1.2, 0.17);
    this.add(g, 'ball', this.leaf(pal, 0.1), 0, 1.9, 0, 1.05, 1.05, 1.05, { flatShading: true });
    this.add(g, 'ball', this.leaf(pal, 0.15), 0.6, 1.6, 0.2, 0.55, 0.55, 0.55, { flatShading: true });
  }
  appleTree(g, pal) {
    this.roundTree(g, pal);
    for (let i = 0; i < 6; i++) { const a = i * 1.05; this.add(g, 'sphere', '#e63946', Math.cos(a) * 0.9, 1.7 + Math.sin(i * 2) * 0.4, Math.sin(a) * 0.9, 0.12); }
  }
  bush(g, pal) {
    [[0, 0.35, 0, 0.5], [0.45, 0.28, 0.1, 0.4], [-0.42, 0.26, -0.05, 0.38]].forEach(([x, y, z, s]) => this.add(g, 'ball', this.leaf(pal, 0.12), x, y, z, s, s, s, { flatShading: true }));
  }
  roseBush(g, pal) {
    this.bush(g, pal);
    for (let i = 0; i < 7; i++) { const a = i * 0.9; this.add(g, 'sphere', i % 2 ? '#ff4d6d' : '#ff8fab', Math.cos(a) * 0.45, 0.45 + (i % 3) * 0.1, Math.sin(a) * 0.35, 0.09); }
  }
  flower(g) {
    this.add(g, 'cyl', '#3a7d44', 0, 0.25, 0, 0.03, 0.5, 0.03);
    const c = ['#ff6b9a', '#ffffff', '#b388eb', '#ffd166', '#ff9f1c'][Math.floor(Math.random() * 5)];
    for (let k = 0; k < 5; k++) { const a = k * 1.2566; this.add(g, 'sphere', c, Math.cos(a) * 0.12, 0.52, Math.sin(a) * 0.12, 0.09); }
    this.add(g, 'sphere', '#ffd166', 0, 0.52, 0, 0.07);
  }
  bigFlower(g) {
    this.flower(g);
    g.scale.setScalar(3);
  }
  sunflower(g) {
    this.add(g, 'cyl', '#3a7d44', 0, 0.8, 0, 0.05, 1.6, 0.05);
    this.add(g, 'cyl', '#ffd60a', 0, 1.7, 0.05, 0.38, 0.06, 0.38, {}, [Math.PI / 2, 0, 0]);
    this.add(g, 'cyl', '#6b4226', 0, 1.7, 0.09, 0.18, 0.06, 0.18, {}, [Math.PI / 2, 0, 0]);
    this.add(g, 'sphere', '#4f9d3a', 0.2, 0.8, 0, 0.18, 0.06, 0.1);
  }
  fern(g, pal) {
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, l = this.add(g, 'sphere', this.leaf(pal, 0.05), Math.cos(a) * 0.5, 0.45, Math.sin(a) * 0.5, 0.7, 0.07, 0.2);
      l.rotation.set(0, -a, 0.5);
    }
  }
  palm(g) {
    for (let i = 0; i < 6; i++) this.add(g, 'cyl', i % 2 ? '#a0703c' : '#8a5a2b', i * 0.05, 0.3 + i * 0.5, 0, 0.16 - i * 0.012, 0.52, 0.16 - i * 0.012);
    const top = 3.1;
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047, l = this.add(g, 'sphere', '#2d9e4f', 0.3 + Math.cos(a) * 0.7, top - 0.15, Math.sin(a) * 0.7, 0.9, 0.06, 0.25);
      l.rotation.set(0, -a, -0.35);
    }
    for (let i = 0; i < 3; i++) this.add(g, 'sphere', '#6b4226', 0.3 + Math.cos(i * 2) * 0.15, top - 0.3, Math.sin(i * 2) * 0.15, 0.12);
  }
  cactus(g) {
    this.add(g, 'capsule', '#4caf50', 0, 0.9, 0, 0.28, 1.3, 0.28);
    this.add(g, 'capsule', '#4caf50', 0.4, 1.1, 0, 0.14, 0.45, 0.14);
    this.add(g, 'capsule', '#4caf50', -0.38, 1.3, 0, 0.13, 0.4, 0.13);
    this.add(g, 'sphere', '#ff70a6', 0, 1.85, 0, 0.1);
  }
  seaweed(g) {
    const col = ['#2a9d8f', '#52b788', '#40916c'][Math.floor(Math.random() * 3)];
    const parts = [];
    for (let i = 0; i < 5; i++) parts.push(this.add(g, 'capsule', col, 0, 0.3 + i * 0.5, 0, 0.08, 0.35, 0.08));
    const ph = Math.random() * 6;
    g.userData.anim = (t) => parts.forEach((p, i) => { p.position.x = Math.sin(t * 0.002 + ph + i * 0.6) * 0.08 * i; });
  }
  coral(g) {
    const col = ['#ff6f91', '#ff9671', '#c34a8c', '#ffc75f'][Math.floor(Math.random() * 4)];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1, h = 0.4 + (i % 3) * 0.25;
      const b = this.add(g, 'capsule', col, Math.cos(a) * 0.2, h, Math.sin(a) * 0.2, 0.09, h, 0.09);
      b.rotation.set(Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4);
    }
  }
  bigMushroom(g) {
    const night = Math.random() < 0.5;
    this.add(g, 'cyl', '#f8f1e5', 0, 0.6, 0, 0.25, 1.2, 0.25);
    this.add(g, 'cap', night ? '#9d4edd' : '#e63946', 0, 1.15, 0, 0.9, 0.7, 0.9, night ? { emissive: '#7b2cbf', emissiveIntensity: 0.4 } : {});
    for (let i = 0; i < 5; i++) { const a = i * 1.25; this.add(g, 'sphere', '#ffffff', Math.cos(a) * 0.55, 1.5, Math.sin(a) * 0.55, 0.1); }
  }
  mushroom(g) {
    this.add(g, 'cyl', '#f8f1e5', 0, 0.18, 0, 0.09, 0.35, 0.09);
    this.add(g, 'cap', '#e63946', 0, 0.33, 0, 0.32, 0.26, 0.32);
    for (let i = 0; i < 3; i++) this.add(g, 'sphere', '#ffffff', Math.cos(i * 2) * 0.18, 0.48, Math.sin(i * 2) * 0.18, 0.05);
  }

  // ---------- Minéraux et objets
  rock(g) { this.add(g, 'rock', '#9a9184', 0, 0.3, 0, 0.45 + Math.random() * 0.35, undefined, undefined, { flatShading: true }); }
  crater(g) {
    this.add(g, 'torus', '#8e90a0', 0, 0.05, 0, 0.8, 0.8, 0.5, { flatShading: true }, [Math.PI / 2, 0, 0]);
  }
  crystal(g) {
    const col = ['#72efdd', '#ff70a6', '#c77dff', '#4cc9f0'][Math.floor(Math.random() * 4)];
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const c = this.add(g, 'octa', col, (i - 1) * 0.3, 0.5 + (i === 1 ? 0.3 : 0), 0, 0.22, 0.6 + (i === 1 ? 0.3 : 0), 0.22, { emissive: col, emissiveIntensity: 0.5, flatShading: true });
      parts.push(c);
    }
    g.userData.anim = (t) => parts.forEach((p, i) => { p.rotation.y = t * 0.0008 + i; });
  }
  lantern(g) {
    this.add(g, 'cyl', '#3d3d3d', 0, 0.9, 0, 0.05, 1.8, 0.05);
    const light = this.add(g, 'box', '#ffe066', 0, 1.9, 0, 0.3, 0.38, 0.3, { emissive: '#ffd166', emissiveIntensity: 0.9 });
    this.add(g, 'cone', '#3d3d3d', 0, 2.2, 0, 0.26, 0.2, 0.26);
    g.userData.anim = (t) => { light.material.emissiveIntensity = 0.7 + 0.3 * Math.sin(t * 0.004); };
  }
  umbrella(g) {
    const col = ['#ef476f', '#118ab2', '#ffd166'][Math.floor(Math.random() * 3)];
    this.add(g, 'cyl', '#ffffff', 0, 0.9, 0, 0.04, 1.8, 0.04);
    this.add(g, 'cone', col, 0, 1.85, 0, 1.0, 0.45, 1.0);
    this.add(g, 'box', '#ffffff', 0.7, 0.03, 0.2, 0.6, 0.04, 1.2);
  }
  chest(g) {
    this.add(g, 'box', '#8d5a3b', 0, 0.25, 0, 0.7, 0.45, 0.45);
    this.add(g, 'box', '#a0703c', 0, 0.55, -0.12, 0.72, 0.12, 0.45, {}, [-0.5, 0, 0]);
    this.add(g, 'sphere', '#ffd60a', 0, 0.55, 0.1, 0.2, 0.12, 0.15, { emissive: '#ffb703', emissiveIntensity: 0.4 });
  }
  rocket(g) {
    this.add(g, 'cyl', '#ffffff', 0, 1.2, 0, 0.35, 1.8, 0.35);
    this.add(g, 'cone', '#e63946', 0, 2.5, 0, 0.35, 0.8, 0.35);
    this.add(g, 'sphere', '#4cc9f0', 0, 1.5, 0.3, 0.15);
    for (let i = 0; i < 3; i++) { const a = i * 2.094; this.add(g, 'box', '#e63946', Math.cos(a) * 0.4, 0.4, Math.sin(a) * 0.4, 0.06, 0.6, 0.35, {}, [0, -a, 0]); }
  }
  snowman(g) {
    this.add(g, 'sphere', '#ffffff', 0, 0.45, 0, 0.5);
    this.add(g, 'sphere', '#ffffff', 0, 1.1, 0, 0.36);
    this.add(g, 'sphere', '#ffffff', 0, 1.6, 0, 0.26);
    this.add(g, 'cone', '#ff9f1c', 0, 1.6, 0.3, 0.06, 0.25, 0.06, {}, [Math.PI / 2, 0, 0]);
    for (const x of [-0.09, 0.09]) this.add(g, 'sphere', '#1e1b4b', x, 1.68, 0.22, 0.035);
    this.add(g, 'torus', '#e63946', 0, 1.36, 0, 0.27, 0.27, 0.27, {}, [Math.PI / 2, 0, 0]);
  }
  iceBlock(g) {
    const b = this.add(g, 'box', '#bde0fe', 0, 0.45, 0, 0.9, 0.9, 0.9, { transparent: true, opacity: 0.8 });
    b.rotation.y = Math.random();
  }
  igloo(g) {
    this.add(g, 'cap', '#f8fbff', 0, 0, 0, 1.2, 1.0, 1.2);
    this.add(g, 'cyl', '#e6f0fa', 0, 0.3, 1.0, 0.35, 0.6, 0.35, {}, [Math.PI / 2, 0, 0]);
  }
  fish(g) {
    const col = ['#ffbe0b', '#fb5607', '#3a86ff', '#ff006e'][Math.floor(Math.random() * 4)];
    const f = new this.T.Group();
    this.add(f, 'sphere', col, 0, 0, 0, 0.35, 0.22, 0.14);
    this.add(f, 'cone', col, -0.42, 0, 0, 0.16, 0.22, 0.05, {}, [0, 0, Math.PI / 2]);
    this.add(f, 'sphere', '#ffffff', 0.22, 0.06, 0.1, 0.05);
    f.position.y = 1.2 + Math.random() * 1.5;
    g.add(f);
    const ph = Math.random() * 6, dir = Math.random() < 0.5 ? -1 : 1;
    f.rotation.y = dir < 0 ? Math.PI : 0;
    g.userData.anim = (t) => { f.position.x = Math.sin(t * 0.0006 + ph) * 1.5 * dir; f.position.y += Math.sin(t * 0.003 + ph) * 0.002; };
  }
  egg(g) {
    this.add(g, 'sphere', '#fff4d6', 0, 0.4, 0, 0.32, 0.42, 0.32);
    for (let i = 0; i < 4; i++) this.add(g, 'sphere', '#8ac926', Math.cos(i * 1.6) * 0.28, 0.35 + (i % 2) * 0.2, Math.sin(i * 1.6) * 0.28, 0.06);
  }
  // Grand dino au long cou (création originale, très simplifiée)
  dino(g) {
    const col = '#70c16f';
    this.add(g, 'sphere', col, 0, 1.4, 0, 1.0, 0.7, 0.6);
    for (const [x, z] of [[-0.55, 0.35], [0.55, 0.35], [-0.55, -0.35], [0.55, -0.35]]) this.add(g, 'cyl', col, x, 0.5, z, 0.16, 1.0, 0.16);
    const neck = this.add(g, 'cyl', col, 0.9, 2.3, 0, 0.16, 1.6, 0.16, {}, [0, 0, -0.5]);
    const head = this.add(g, 'sphere', col, 1.35, 3.05, 0, 0.3, 0.22, 0.22);
    this.add(g, 'cone', col, -1.3, 1.3, 0, 0.25, 1.4, 0.25, {}, [0, 0, Math.PI / 2 + 0.2]);
    this.add(g, 'sphere', '#1e1b4b', 1.5, 3.12, 0.15, 0.04);
    g.userData.anim = (t) => { const k = Math.sin(t * 0.0015) * 0.1; neck.rotation.z = -0.5 + k; head.position.y = 3.05 + k * 0.6; };
    g.scale.setScalar(1.2);
  }
  lollipop(g) {
    const col = ['#ff70a6', '#70d6ff', '#ffd670', '#9b5de5'][Math.floor(Math.random() * 4)];
    this.add(g, 'cyl', '#ffffff', 0, 0.8, 0, 0.05, 1.6, 0.05);
    this.add(g, 'cyl', col, 0, 1.85, 0, 0.55, 0.1, 0.55, {}, [Math.PI / 2, 0, 0]);
    this.add(g, 'torus', '#ffffff', 0, 1.85, 0.06, 0.3, 0.3, 0.3);
  }
  candyCane(g) {
    for (let i = 0; i < 6; i++) this.add(g, 'cyl', i % 2 ? '#ffffff' : '#e63946', 0, 0.15 + i * 0.3, 0, 0.1, 0.3, 0.1);
    this.add(g, 'arc', '#e63946', 0.3, 1.85, 0, 0.3, 0.3, 0.45);
  }
  cupcake(g) {
    const col = ['#ffafcc', '#cdb4db', '#a2d2ff'][Math.floor(Math.random() * 3)];
    this.add(g, 'cyl', '#f4a261', 0, 0.3, 0, 0.45, 0.6, 0.45);
    this.add(g, 'sphere', col, 0, 0.75, 0, 0.55, 0.45, 0.55);
    this.add(g, 'sphere', '#e63946', 0, 1.25, 0, 0.12);
  }
  iceCream(g) {
    this.add(g, 'cone', '#e9c46a', 0, 0.6, 0, 0.35, 1.2, 0.35, {}, [Math.PI, 0, 0]);
    this.add(g, 'sphere', ['#ffafcc', '#caffbf', '#fdffb6'][Math.floor(Math.random() * 3)], 0, 1.35, 0, 0.42);
    this.add(g, 'sphere', '#ffc6ff', 0, 1.8, 0, 0.34);
  }
  donut(g) {
    this.add(g, 'torus', '#f4a261', 0, 0.55, 0, 0.5, 0.5, 0.5);
    this.add(g, 'torus', '#ff70a6', 0, 0.62, 0.06, 0.5, 0.5, 0.35);
  }
  gumdrop(g) {
    this.add(g, 'cap', ['#ff595e', '#8ac926', '#1982c4', '#ffca3a', '#6a4c93'][Math.floor(Math.random() * 5)], 0, 0, 0, 0.5, 0.7, 0.5);
  }
  hayBale(g) { this.add(g, 'cyl', '#e9c46a', 0, 0.45, 0, 0.45, 0.9, 0.45, {}, [0, 0, Math.PI / 2]); }
  fence(g) {
    for (const x of [-0.7, 0.7]) this.add(g, 'box', '#ffffff', x, 0.45, 0, 0.1, 0.9, 0.1);
    for (const y of [0.35, 0.7]) this.add(g, 'box', '#ffffff', 0, y, 0, 1.6, 0.1, 0.06);
  }

  // ---------- Disco
  speaker(g) {
    this.add(g, 'box', '#1b1b2f', 0, 0.8, 0, 0.9, 1.6, 0.7);
    for (const [y, r] of [[1.15, 0.28], [0.5, 0.2]]) this.add(g, 'cyl', '#4a4e69', 0, y, 0.36, r, 0.05, r, {}, [Math.PI / 2, 0, 0]);
    const glow = this.add(g, 'box', '#f15bb5', 0, 1.62, 0, 0.92, 0.05, 0.72, { emissive: '#f15bb5', emissiveIntensity: 0.8 });
    g.userData.anim = (t) => { glow.material.emissiveIntensity = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.008)); };
  }
  balloon(g) {
    const col = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#f15bb5'][Math.floor(Math.random() * 6)];
    const b = this.add(g, 'sphere', col, 0, 2.2, 0, 0.4, 0.48, 0.4);
    this.add(g, 'cyl', '#ffffff', 0, 1.0, 0, 0.01, 2.0, 0.01);
    const ph = Math.random() * 6;
    g.userData.anim = (t) => { b.position.y = 2.2 + Math.sin(t * 0.002 + ph) * 0.15; };
  }
  lightPole(g) {
    this.add(g, 'cyl', '#3d3d3d', 0, 1.2, 0, 0.06, 2.4, 0.06);
    const bulb = this.add(g, 'sphere', '#ffffff', 0, 2.5, 0, 0.28, 0.28, 0.28, { emissive: '#ffffff', emissiveIntensity: 1 });
    bulb.material = bulb.material.clone(); // couleur propre à chaque poteau
    const ph = Math.random() * 6;
    g.userData.anim = (t) => { const c = bulb.material.emissive; c.setHSL(((t * 0.0003 + ph) % 1), 0.9, 0.6); bulb.material.color.copy(c); };
  }

  // ---------- Dojo
  bamboo(g) {
    for (let k = 0; k < 3; k++) {
      const x = (k - 1) * 0.25, h = 2.5 + Math.random() * 1.5;
      for (let i = 0; i < 6; i++) this.add(g, 'cyl', i % 2 ? '#6a994e' : '#7cb518', x, (i + 0.5) * h / 6, 0, 0.07, h / 6 - 0.03, 0.07);
      const l = this.add(g, 'sphere', '#55a630', x + 0.25, h, 0, 0.35, 0.05, 0.1); l.rotation.z = -0.4;
    }
  }
  cherryTree(g) {
    this.add(g, 'cyl', '#6b4226', 0, 0.7, 0, 0.16, 1.4, 0.16);
    this.add(g, 'ball', '#ffafcc', 0, 2.0, 0, 1.0, 0.85, 1.0, { flatShading: true });
    this.add(g, 'ball', '#ffc8dd', 0.6, 1.75, 0.2, 0.55, 0.5, 0.55, { flatShading: true });
    this.add(g, 'ball', '#ffc8dd', -0.55, 1.8, -0.2, 0.5, 0.45, 0.5, { flatShading: true });
  }
  stoneLantern(g) {
    this.add(g, 'cyl', '#9a9184', 0, 0.35, 0, 0.18, 0.7, 0.18);
    const light = this.add(g, 'box', '#fff3b0', 0, 0.85, 0, 0.42, 0.32, 0.42, { emissive: '#ffd166', emissiveIntensity: 0.6 });
    this.add(g, 'cone', '#7d7568', 0, 1.18, 0, 0.45, 0.35, 0.45, { flatShading: true });
    this.add(g, 'sphere', '#7d7568', 0, 1.4, 0, 0.08);
    g.userData.anim = (t) => { light.material.emissiveIntensity = 0.5 + 0.2 * Math.sin(t * 0.003); };
  }

  // ---------- Arrière-plans (posés loin, une fois par paysage)
  backdrop(name, pal) {
    const T = this.T, g = new T.Group();
    const add = (...a) => this.add(g, ...a);
    switch (name) {
      case 'hills':
        for (let i = 0; i < 7; i++) add('sphere', shade(pal.grass, -0.1 + (i % 3) * 0.06), -50 + i * 16, -2, -70 - (i % 2) * 10, 12, 7, 8);
        break;
      case 'mountains':
        for (let i = 0; i < 6; i++) {
          const x = -55 + i * 21, h = 18 + (i % 3) * 7;
          add('cone', pal.mount0 || '#9cb8d0', x, h / 2, -85, 12, h, 12, { flatShading: true });
          add('cone', '#ffffff', x, h - h * 0.13, -85, 12 * 0.27, h * 0.27, 12 * 0.27, { flatShading: true });
        }
        break;
      case 'mesas':
        for (let i = 0; i < 4; i++) add('box', i % 2 ? '#c1693a' : '#d4925f', -45 + i * 30, 5, -75, 14, 10 + i * 2, 8);
        break;
      case 'volcano': {
        add('cone', '#6b3e3e', 22, 12, -80, 18, 24, 18, { flatShading: true });
        add('sphere', '#ff7b00', 22, 23.5, -80, 4, 1.5, 4, { emissive: '#ff5400', emissiveIntensity: 0.9 });
        const puffs = [];
        for (let i = 0; i < 5; i++) puffs.push(add('sphere', '#b0a8a0', 22, 25, -80, 2.5));
        g.userData.anim = (t) => puffs.forEach((p, i) => { const k = ((t * 0.0002 + i / 5) % 1); p.position.set(22 + k * 6, 25 + k * 14, -80); p.scale.setScalar(2 + k * 4); });
        break;
      }
      case 'sea': {
        add('box', '#3fa7f5', 40, -0.05, -40, 60, 0.1, 140, { transparent: true, opacity: 0.9 });
        const boat = new T.Group();
        this.add(boat, 'box', '#8d5a3b', 0, 0.3, 0, 2.5, 0.5, 0.9);
        this.add(boat, 'cone', '#ffffff', 0, 2, 0, 1.0, 2.6, 0.08, {}, [0, Math.PI / 2, 0]);
        boat.position.set(24, 0, -55);
        g.add(boat);
        g.userData.anim = (t) => { boat.position.x = 24 + Math.sin(t * 0.0002) * 10; boat.rotation.z = Math.sin(t * 0.002) * 0.05; };
        break;
      }
      case 'castle': {
        const c = ['#f6e8ff', '#e0c3fc'];
        add('box', c[0], 0, 5, -78, 26, 10, 4);
        for (const x of [-14, -5, 5, 14]) {
          add('cyl', c[1], x, 8, -78, 2.2, 16, 2.2);
          add('cone', '#9d4edd', x, 18, -78, 2.8, 5, 2.8);
        }
        add('box', '#7b2cbf', 0, 3, -75.8, 4, 6, 0.4);
        break;
      }
      case 'planets':
        add('sphere', '#ff9e00', -30, 24, -90, 9);
        add('torus', '#ffd6a5', -30, 24, -90, 14, 14, 2, {}, [1.2, 0, 0.3]);
        add('sphere', '#4cc9f0', 28, 30, -100, 6);
        add('sphere', '#c77dff', 10, 16, -70, 2.5);
        break;
      case 'barn': {
        add('box', '#c1121f', 16, 3, -40, 7, 6, 6);
        add('cyl', '#7f0000', 16, 6.6, -40, 4.3, 7, 4.3, {}, [Math.PI / 2, 0, 0]).geometry = new T.CylinderGeometry(1, 1, 1, 3);
        add('box', '#ffffff', 16, 2, -36.9, 2.6, 3.6, 0.1);
        break;
      }
      case 'stage': {
        // Scène disco : arche lumineuse, boule à facettes qui tourne, projecteurs qui balaient
        add('box', '#2b1055', 0, 0.4, -16, 14, 0.8, 7);
        const arch = this.add(g, 'arc', '#f15bb5', 0, 0.8, -18.5, 7, 7, 1, { emissive: '#f15bb5', emissiveIntensity: 0.7 });
        const ball = new T.Mesh(new T.IcosahedronGeometry(1.2, 1), new T.MeshLambertMaterial({ color: '#e0e0ff', emissive: '#8888ff', emissiveIntensity: 0.4, flatShading: true }));
        ball.position.set(0, 8.5, -14); g.add(ball);
        const beams = [];
        ['#ff595e', '#ffca3a', '#8ac926', '#1982c4'].forEach((c, i) => {
          const beam = new T.Mesh(new T.ConeGeometry(1.4, 12, 16, 1, true), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide, fog: false }));
          beam.position.set(-9 + i * 6, 6, -18); g.add(beam); beams.push(beam);
        });
        g.userData.anim = (t) => {
          ball.rotation.y = t * 0.0008;
          arch.material.emissiveIntensity = 0.5 + 0.4 * Math.abs(Math.sin(t * 0.004));
          beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.0012 + i * 1.3) * 0.5; b.rotation.x = 0.3 + Math.cos(t * 0.001 + i) * 0.2; });
        };
        break;
      }
      case 'pagoda': {
        // Pagode à étages et portique au bout du chemin
        for (let i = 0; i < 4; i++) {
          const y = 2 + i * 3.4, w = 9 - i * 1.6;
          add('box', '#f2e8cf', -16, y, -60, w * 0.75, 2.6, w * 0.75);
          add('cone', '#bc4749', -16, y + 1.9, -60, w * 0.8, 1.4, w * 0.8, { flatShading: true }, [0, Math.PI / 4, 0]);
        }
        for (const x of [-3.6, 3.6]) add('cyl', '#d62828', x, 3, -26, 0.35, 6, 0.35);
        add('box', '#d62828', 0, 6.2, -26, 9.6, 0.5, 0.6);
        add('box', '#1e1b4b', 0, 6.65, -26, 10.4, 0.35, 0.8);
        add('box', '#d62828', 0, 5.1, -26, 7.6, 0.35, 0.4);
        break;
      }
      case 'windmill': {
        add('cyl', '#f1e3d3', -14, 5, -38, 1.4, 10, 1.4);
        add('cone', '#8d5a3b', -14, 10.8, -38, 1.8, 2, 1.8);
        const blades = new T.Group();
        for (let i = 0; i < 4; i++) { const b = this.add(blades, 'box', '#ffffff', 0, 2.5, 0, 0.7, 5, 0.1); b.position.set(Math.sin(i * Math.PI / 2) * 2.5, Math.cos(i * Math.PI / 2) * 2.5, 0); b.rotation.z = -i * Math.PI / 2; }
        blades.position.set(-14, 9, -36.5);
        g.add(blades);
        g.userData.anim = (t) => { blades.rotation.z = t * 0.0012; };
        break;
      }
    }
    g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    return g;
  }
}
