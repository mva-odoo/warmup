// Le parc de l'Académie : un petit monde ouvert pour aller d'un cours à l'autre.
// Au centre une fontaine, au fond le château de l'Académie, et en cercle un bâtiment par cours (danse, dojo, atelier
// des potions, récré…) ; le portail magique mène aux aventures. L'enfant VISE un bâtiment avec sa baguette (bras levé,
// comme l'épreuve de la baguette), puis COURT SUR PLACE : son petit sorcier suit le chemin tout seul, plus vite quand
// il court (c'est déjà l'échauffement). En route, parfois, une créature ensorcelée bloque le passage : un coup de
// baguette et elle redevient gentille. Jamais d'échec, jamais perdu : on ne peut que suivre les chemins.
// Scène 3D à part (comme la chambre), dessinée avec le moteur du jeu (scene3d : modèles, personnage, créatures).
// Derrière le portail : un petit VILLAGE par pays d'aventure, même principe. Une porte par étape du pays (dans son
// paysage), le gardien ensorcelé qui attend à la dernière, un portail vers le pays d'avant / d'après et un vers
// l'Académie. Les villageois sont les créatures du pays.

const HUB_SPOTS = { // [angle en degrés (0 = au fond, vers -z), distance au centre]
  ecole: [0, 27], jardin3d: [-100, 18], disco: [-68, 18], dojo: [-38, 18], verger: [38, 18],
  stade: [68, 18], singes: [100, 18], supermarche: [132, 18], portal: [-132, 18],
};
// Pseudo-monde « parc » : passe par le même lancement qu'un monde (caméra, calibrage), sans parcours
const HUB_WORLD = {
  id: 'hub', hub: true, name: "Parc de l'Académie", tagline: '', heroName: '', collectible: '✨', sky: ['#8ecae6', '#e8f6ff'],
  hero: { body: '#70d6ff', belly: '#e0f7ff', limb: '#3a86ff', accent: '#ffd166' },
  biomes: [{ name: 'Parc', kit: 'flowers' }, { name: 'Parc', kit: 'meadow' }], sequence: [], endText: '',
};
// Pseudo-monde « village » d'un pays d'aventure (même lancement que le parc)
const VILLAGES = new Map();
function villageWorld(w) {
  if (!VILLAGES.has(w.id)) VILLAGES.set(w.id, { ...HUB_WORLD, id: 'village', village: w, name: w.name, hero: w.hero, sky: w.sky, biomes: w.biomes });
  return VILLAGES.get(w.id);
}
// Grosse icône de chaque lieu sur son panneau (les petits ne lisent pas encore)
const HUB_ICONS = { ecole: '🏰', jardin3d: '🌸', disco: '💃', dojo: '🥋', verger: '🧪', stade: '⚽', singes: '🐒', supermarche: '🛒' };
const HUB_SAY = {
  hello: "Bienvenue dans le parc de l'Académie ! Lève le bras et vise un bâtiment avec ta baguette pour choisir ton cours.",
  go: "C'est parti ! Cours sur place pour y aller !",
  faster: 'Cours sur place, ton petit sorcier ira plus vite !',
  locked: "Cette porte est encore fermée. Réussis d'abord le cours d'avant !",
  portalLocked: "Le portail magique s'ouvrira quand tu auras fini les premiers cours !",
  block: 'Oh ! Une créature ensorcelée bloque le chemin ! Vise-la avec ta baguette !',
  freed: "Bravo ! Elle n'est plus ensorcelée !",
  enter: 'On entre !',
  village: "Bienvenue au village ! L'Étoile de ce pays est cachée par ici. Vise une étape avec ta baguette pour partir à sa recherche !",
  stageLocked: "Cette étape s'ouvrira quand tu auras réussi celle d'avant !",
  countryLocked: "Ce pays est encore fermé. Termine d'abord celui-ci !",
  travel: 'En route par le portail magique !',
  back: 'Bravo ! Avec ta baguette, choisis où tu veux aller maintenant !',
  aim: 'Lève bien ton bras, comme une baguette magique, et montre un bâtiment !',
};

class AcademyHub {
  constructor(s3d) { this.S = s3d; this.scene = null; this.onGo = null; this.kind = 'academy'; this.w = null; }

  // Modèles à charger avant d'entrer (en plus de ceux du parc fleuri)
  models(friends = [], w = null) {
    if (w) return ['custom/castle', 'custom/stone-lantern', ...creatureModels([...friends, guardianOf(w), ...w.biomes.flatMap((b) => creaturesOf(b.kit || 'meadow'))])];
    return ['custom/castle', 'custom/pagoda', 'custom/torii', 'custom/cherry-tree-a', 'custom/stone-lantern', 'pets/animal-monkey',
      'kaykit/re-crate_carrots', 'kaykit/re-crate_tomatoes', 'kaykit/re-crate_lettuce', ...creatureModels([...friends, ...creaturesOf('meadow')])];
  }

  // Lieux : parc de l'Académie (les cours du chapitre 1 et le portail des aventures) ou village d'un pays
  dests() {
    const list = this.kind === 'village' ? this.villageDests() : this.academyDests();
    for (const d of list) {
      const rad = (d.a * Math.PI) / 180;
      d.dir = { x: Math.sin(rad), z: -Math.cos(rad) };
      d.pos = { x: d.dir.x * d.r, z: d.dir.z * d.r };
      const dr = d.r - (d.id === 'ecole' ? 9 : d.kind === 'academy' ? 4 : 5.2); // (porte : devant le bâtiment, au bout de son chemin)
      d.door = { x: d.dir.x * dr, z: d.dir.z * dr };
    }
    return list;
  }
  academyDests() {
    const byId = new Map(WORLDS.map((w) => [w.id, w]));
    const list = CHAPTERS[0].worlds.map((id) => byId.get(id)).filter(Boolean)
      .map((w) => ({ id: w.id, kind: 'world', w, open: Progress.unlocked(w), stars: Progress.stars(w), name: w.name }));
    const adv = CHAPTERS[1].worlds.map((id) => byId.get(id)).filter(Boolean);
    const open = adv.filter((w) => Progress.unlocked(w));
    // (le portail mène au village de la prochaine aventure à gagner, sinon de la dernière ouverte)
    list.push({ id: 'portal', kind: 'portal', w: open.find((w) => Progress.stars(w) === 0) || open[open.length - 1] || adv[0], open: open.length > 0, name: '🌀 Aventures' });
    for (const d of list) [d.a, d.r] = HUB_SPOTS[d.id];
    return list;
  }
  // Village : une porte par étape (la dernière avec le gardien), l'Académie, les pays d'avant / d'après
  villageDests() {
    const w = this.w, n = Stages.count(w) || 1, dots = Stages.dots(w), nx = Stages.next(w);
    const full = n > 1 ? dots === n : Progress.stars(w) > 0;
    const angles = n === 3 ? [-55, 0, 55] : n === 2 ? [-35, 35] : [0];
    const list = angles.map((a, k) => ({
      id: 'stage' + k, kind: 'stage', k, w, a, r: 19, boss: k === n - 1,
      open: n === 1 || full || k <= nx, done: full || k < nx, next: !full && k === nx,
      name: n > 1 ? `Étape ${k + 1} : ${w.biomes[k].name}` : w.name,
    }));
    list.push({ id: 'academy', kind: 'academy', a: 180, r: 14, open: true, name: '🏰 Académie' });
    const adv = CHAPTERS[1].worlds.map((id) => WORLDS.find((x) => x.id === id)).filter(Boolean), i = adv.indexOf(w);
    if (adv[i - 1]) list.push({ id: 'prev', kind: 'country', w: adv[i - 1], a: -130, r: 18, open: Progress.unlocked(adv[i - 1]), name: '⬅️ ' + adv[i - 1].name });
    if (adv[i + 1]) list.push({ id: 'next', kind: 'country', w: adv[i + 1], a: 130, r: 18, open: Progress.unlocked(adv[i + 1]), name: '➡️ ' + adv[i + 1].name });
    return list;
  }

  // ---------- Construction de la scène (une fois par session de jeu)
  build(look, comp, friends = [], opts = {}) {
    const S = this.S, T = S.T, P = S.P;
    this.dispose();
    this.kind = opts.w ? 'village' : 'academy'; this.w = opts.w || null;
    // Couleurs : le parc de l'Académie, ou le premier paysage du pays (ciel, herbe, chemins, nuit…)
    const b0 = this.w ? this.w.biomes[0] : null, kit0 = b0 ? KITS[b0.kit] || {} : {};
    const night = !!(b0 && (b0.night || kit0.night));
    const C = this.colors = b0 ? { sky0: b0.sky0 || '#5aa9e6', sky1: b0.sky1 || '#cdeffd', grass: b0.grass || '#7ccf6a', grass2: b0.grass2 || b0.grass || '#6fbf73',
      path: b0.path || '#e6c28f', fog: b0.fog || '#e8f6ff', mount: b0.mount1 || '#6fbf73', night }
      : { sky0: '#5aa9e6', sky1: '#cdeffd', grass: '#7ccf6a', grass2: '#6fbf73', path: '#e6c28f', fog: '#e8f6ff', mount: '#8fd16a', night: false };
    const scene = (this.scene = new T.Scene());
    const sky = document.createElement('canvas'); sky.width = 2; sky.height = 256;
    const g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, C.sky0); gr.addColorStop(0.6, C.sky1); gr.addColorStop(1, C.fog);
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    scene.background = new T.CanvasTexture(sky); scene.background.colorSpace = T.SRGBColorSpace;
    scene.fog = new T.Fog(C.fog, 55, 110);
    scene.add(new T.HemisphereLight(night ? '#b8b5ff' : '#ffffff', C.grass2, night ? 0.85 : 1.25));
    const sun = new T.DirectionalLight(night ? '#c8d4ff' : '#fff4dc', night ? 0.9 : 1.6); sun.position.set(18, 30, 14);
    if (S.Q && S.Q.shadows) {
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 90 });
    }
    scene.add(sun);
    const lam = (c, o) => S.lam(c, o), mesh = (geo, c, x, y, z, sx = 1, sy = sx, sz = sx, parent = scene, o) => {
      const m = new T.Mesh(geo, lam(c, o)); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
      m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    };
    const box = new T.BoxGeometry(1, 1, 1), cyl = new T.CylinderGeometry(1, 1, 1, 24), cone = new T.ConeGeometry(1, 1, 24), ball = new T.SphereGeometry(1, 20, 14);
    const fit = (m, h) => { const sz = new T.Box3().setFromObject(m).getSize(new T.Vector3()); m.scale.multiplyScalar(h / Math.max(0.01, sz.y)); return m; };
    const put = (key, x, z, h, ry = 0, parent = scene) => {
      const m = P.model(key); if (!m) return null;
      fit(m, h); m.position.set(x, 0, z); m.rotation.y = ry;
      m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); parent.add(m); return m;
    };
    // Sol : un grand pré rond, des collines autour, la place au centre (fontaine à l'Académie, pierre magique au village)
    const ground = new T.Mesh(new T.CircleGeometry(60, 64), lam(C.grass)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.userData.noOutline = true; scene.add(ground);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; mesh(ball, i % 2 ? C.grass2 : C.mount, Math.sin(a) * 58, -3, Math.cos(a) * 58, 14, 8, 10); }
    mesh(cyl, shade(C.path, 0.15), 0, 0.02, 0, 6.5, 0.04, 6.5);
    this.water = null; this.crystal = null;
    if (this.kind === 'academy') {
      mesh(cyl, '#cfd8dc', 0, 0.35, 0, 2.6, 0.7, 2.6); mesh(cyl, '#7fd8f8', 0, 0.72, 0, 2.3, 0.05, 2.3, scene, { transparent: true, opacity: 0.85 });
      mesh(cyl, '#cfd8dc', 0, 1.3, 0, 0.35, 1.6, 0.35); mesh(cyl, '#cfd8dc', 0, 2.1, 0, 1.1, 0.2, 1.1);
      this.water = mesh(ball, '#a8e6ff', 0, 2.5, 0, 0.45, 0.55, 0.45, scene, { transparent: true, opacity: 0.8 });
      // L'arc-en-ciel de l'Académie : une bande par Étoile retrouvée (grise et pâle tant qu'elle manque)
      this.rainbow = RAINBOW.map((id, i) => {
        const m = new T.Mesh(new T.TorusGeometry(10.5 - i * 0.62, 0.3, 8, 64, Math.PI), new T.MeshLambertMaterial({ color: '#d9d9e3', transparent: true, opacity: 0.3, emissiveIntensity: 0.35 }));
        m.position.set(0, 1.2, -3); m.userData.noOutline = true; scene.add(m);
        return { id, m, col: gemOf(id).col };
      });
      // Le Nuage Câlin (le Nuage Grognon devenu gentil) flotte au-dessus de la place, après la fin de l'histoire
      try { this.calin = buildCreature3D(S, { ...GROGNON, id: 'calin', name: 'Nuage Câlin', color: '#ffd6ec', belly: '#ffffff' }, false); this.calin.group.scale.multiplyScalar(2.4); this.calin.group.visible = false; scene.add(this.calin.group); } catch (e) { this.calin = null; }
    } else {
      mesh(cyl, '#9a9184', 0, 0.4, 0, 1.6, 0.8, 1.6);
      const col = this.w.hero.accent || '#c77dff';
      this.crystal = new T.Mesh(new T.OctahedronGeometry(1, 0), lam(col, { emissive: col, emissiveIntensity: 0.7 }));
      this.crystal.position.set(0, 2.4, 0); this.crystal.scale.set(0.8, 1.3, 0.8); scene.add(this.crystal);
    }
    // Chemins de la place vers chaque lieu (tous partent du centre : impossible de se perdre)
    const spots = this.dests();
    for (const d of spots) {
      const len = Math.hypot(d.door.x, d.door.z) - 3.2, mid = 3.2 + len / 2;
      const p = mesh(box, C.path, d.dir.x * mid, 0.03, d.dir.z * mid, 2.4, 0.06, len);
      p.rotation.y = Math.atan2(d.dir.x, d.dir.z);
      for (const s of [-1, 1]) for (let k = 2; k < len; k += 4) { // petites lanternes le long du chemin
        const t = 3.2 + k, x = d.dir.x * t + d.dir.z * s * 1.7, z = d.dir.z * t - d.dir.x * s * 1.7;
        if ((k / 4) % 2 < 1 || this.kind === 'village') put('custom/stone-lantern', x, z, 1.1);
        else { const f = P.make && P.make(['pf:flowers', 'k:flower_redA', 'k:flower_yellowA'][k % 3], { grass: C.grass }); if (f) { f.position.set(x, 0, z); scene.add(f); } }
      }
    }
    // Les bâtiments (un par lieu)
    this.buildings = {};
    for (const d of spots) {
      const grp = new T.Group(); grp.position.set(d.pos.x, 0, d.pos.z); grp.rotation.y = Math.atan2(-d.dir.x, -d.dir.z) + Math.PI; // (face à la place)
      scene.add(grp);
      const h = this.makeBuilding(d, grp, { mesh, put, box, cyl, cone, ball, fit });
      this.buildings[d.id] = { grp, h };
    }
    // Décor tout autour (arbres du parc, ou objets des paysages du pays), plus ou moins selon la machine
    const nTrees = S.Q && S.Q.decor < 40 ? 14 : 26;
    const kitProps = this.w ? this.w.biomes.flatMap((b) => ((KITS[b.kit] || {}).props || []).map((pp) => pp[0])) : null;
    for (let i = 0; i < nTrees; i++) {
      const a = (i / nTrees) * Math.PI * 2 + 0.13, r = 34 + (i % 3) * 3;
      const name = kitProps && kitProps.length ? kitProps[(i * 7) % kitProps.length] : ['kk:hex-trees_A_medium', 'kk:hex-trees_B_medium', 'kk:hex-tree_single_A', 'cu:cherry-tree-a'][i % 4];
      const t = P.make && P.make(name, this.w ? this.w.biomes[0] : { grass: C.grass });
      if (t) { t.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); t.rotation.y = a * 3; scene.add(t); }
    }
    if (this.kind === 'village') this.makeHouses(scene, { mesh, box, cone, cyl }, spots);
    // Le petit sorcier, son familier, et les amis du grimoire qui se promènent dans le parc
    this.hero = S.makeHero({ body: look.color }, false, null, true, look);
    scene.add(this.hero.group);
    this.comp = null;
    if (comp) { try { this.comp = buildCreature3D(S, comp.cr, comp.level >= COMPANION_MAX); this.comp.group.scale.multiplyScalar(0.5 + comp.level * 0.07); scene.add(this.comp.group); } catch (e) { this.comp = null; } }
    // (au village, les promeneurs sont les créatures du pays : les villageois)
    const locals = this.w ? [...new Set(this.w.biomes.flatMap((b) => creaturesOf(b.kit || 'meadow')))] : [];
    const walkers = (this.w ? locals : friends.length ? friends : creaturesOf('meadow')).slice(0, 5);
    this.walkers = walkers.map((cr, i) => {
      try {
        const c = buildCreature3D(S, cr, Carnet.evolved(cr.id)); c.group.scale.multiplyScalar(0.75); scene.add(c.group);
        return { c, a: (i / walkers.length) * Math.PI * 2 + 0.4, r: 8.5 + (i % 2) * 1.5, sp: 0.06 + (i % 3) * 0.02 };
      } catch (e) { return null; }
    }).filter(Boolean);
    S.outline && S.outline(scene);
    this.cam = new T.PerspectiveCamera(50, 1, 0.1, 200);
    this.camPos = new T.Vector3(0, 30, 40); this.camLook = new T.Vector3(0, 1, -7);
    this.cam.position.copy(this.camPos);
    this.labels = {};
    this.pos = { x: 0, z: 4.5 }; this.yaw = Math.PI; this.mode = 'choose'; this.lastSay = {}; this.moveK = 0; // (dessiné dès le calibrage, avant enter)
  }
  // Un bâtiment par cours (modèles du jeu et formes simples), vu depuis la place ; renvoie sa hauteur
  makeBuilding(d, g, k) {
    const { mesh, put, box, cyl, cone, ball } = k, S = this.S, T = S.T, id = d.id;
    const anims = (this.anims = this.anims || []);
    if (d.kind === 'stage') return this.makeGate(d, g, k);
    if (d.kind !== 'world') return this.makePortal(d, g, k);
    switch (id) {
      case 'ecole': { // le château de l'Académie
        if (!put('custom/castle', 0, 0, 15, Math.PI, g)) {
          mesh(box, '#f6e8ff', 0, 4, 0, 14, 8, 5, g);
          for (const x of [-7, 7]) { mesh(cyl, '#e0c3fc', x, 6, 0, 1.6, 12, 1.6, g); mesh(cone, '#9d4edd', x, 13.5, 0, 2, 3.5, 2, g); }
        }
        return 15;
      }
      case 'jardin3d': { // massifs de fleurs et arche de verdure
        for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, f = S.P.make && S.P.make(['k:flower_redA', 'k:flower_yellowA', 'k:flower_purpleA', 'pf:flowers'][i % 4], { grass: '#7ccf6a' }); if (f) { f.position.set(Math.sin(a) * 2.6, 0, Math.cos(a) * 2.6); g.add(f); } }
        const arch = new T.Mesh(new T.TorusGeometry(2.4, 0.35, 10, 24, Math.PI), S.lam('#4f9a52')); arch.position.set(0, 0, 2.4); arch.castShadow = true; g.add(arch);
        for (let i = 0; i < 6; i++) mesh(ball, ['#ff8fab', '#ffd166', '#c77dff'][i % 3], Math.cos((i / 5) * Math.PI) * 2.4, Math.sin((i / 5) * Math.PI) * 2.4, 2.4, 0.3, 0.3, 0.3, g);
        put('kaykit/hex-tree_single_A', -3.5, -2, 4.5, 0, g); put('kaykit/hex-tree_single_A', 3.5, -2.5, 4, 1, g);
        return 5;
      }
      case 'disco': { // la salle de danse : estrade, arche lumineuse, boule à facettes
        mesh(box, '#3c096c', 0, 0.4, 0, 7, 0.8, 5, g);
        const arch = new T.Mesh(new T.TorusGeometry(3.2, 0.3, 10, 28, Math.PI), S.lam('#f15bb5', { emissive: '#f15bb5', emissiveIntensity: 0.6 })); arch.position.set(0, 0.8, -1); g.add(arch);
        const disco = new T.Mesh(new T.IcosahedronGeometry(0.8, 1), new T.MeshLambertMaterial({ color: '#e0e0ff', emissive: '#8888ff', emissiveIntensity: 0.4, flatShading: true }));
        disco.position.set(0, 4.9, -0.5); g.add(disco);
        anims.push((t) => { disco.rotation.y = t * 0.001; arch.material.emissiveIntensity = 0.4 + 0.4 * Math.abs(Math.sin(t * 0.004)); });
        return 6;
      }
      case 'dojo': { // la pagode et son portique
        if (!put('custom/pagoda', 0, -1, 10, 0, g)) for (let i = 0; i < 3; i++) { mesh(box, '#f2e8cf', 0, 1.2 + i * 2.6, -1, 5 - i, 2, 5 - i, g); mesh(cone, '#bc4749', 0, 2.6 + i * 2.6, -1, 3.6 - i * 0.6, 1, 3.6 - i * 0.6, g); }
        put('custom/torii', 0, 3, 4.2, 0, g);
        return 10;
      }
      case 'verger': { // l'atelier des potions : cabane, cheminée qui fume vert, chaudron qui bouillonne
        mesh(box, '#b08968', 0, 1.8, -1, 5, 3.6, 4, g); mesh(cone, '#7b2cbf', 0, 4.6, -1, 3.9, 2.2, 3.4, g).rotation.y = Math.PI / 4;
        mesh(box, '#5a3e2b', 0, 1.1, 1.02, 1.2, 2.2, 0.1, g); mesh(cyl, '#6d6875', 1.6, 5.4, -1.5, 0.35, 2, 0.35, g);
        mesh(cyl, '#2b2d42', -1.8, 0.6, 2.2, 0.8, 1.1, 0.8, g); const brew = mesh(cyl, '#70e000', -1.8, 1.18, 2.2, 0.7, 0.05, 0.7, g, { emissive: '#70e000', emissiveIntensity: 0.6 });
        const puffs = [0, 1, 2, 3].map(() => mesh(ball, '#b9fbc0', 1.6, 6.5, -1.5, 0.4, 0.4, 0.4, g, { transparent: true, opacity: 0.7 }));
        const bubbles = [0, 1, 2].map(() => mesh(ball, '#ccff33', -1.8, 1.3, 2.2, 0.15, 0.15, 0.15, g, { emissive: '#ccff33', emissiveIntensity: 0.5 }));
        anims.push((t) => {
          puffs.forEach((p, i) => { const q = (t * 0.0003 + i / 4) % 1; p.position.set(1.6 + q * 1.2, 6.5 + q * 3, -1.5); p.scale.setScalar(0.3 + q * 0.7); });
          bubbles.forEach((b, i) => { const q = (t * 0.0012 + i / 3) % 1; b.position.set(-1.8 + Math.sin(i * 2) * 0.35, 1.25 + q * 0.6, 2.2 + Math.cos(i * 2) * 0.35); b.scale.setScalar(0.15 * (1 - q)); });
          brew.material.emissiveIntensity = 0.5 + 0.2 * Math.sin(t * 0.005);
        });
        return 6;
      }
      case 'stade': { // le terrain de la récré : pelouse rayée, but et panier
        mesh(box, '#57cc99', 0, 0.05, 0, 9, 0.1, 6, g);
        for (const x of [-4.4, 4.4]) mesh(box, '#ffffff', x, 0.11, 0, 0.1, 0.02, 6, g);
        mesh(box, '#ffffff', 0, 0.11, 0, 0.1, 0.02, 6, g);
        for (const x of [-1.3, 1.3]) mesh(cyl, '#ffffff', x - 3, 0.75, -2.6, 0.07, 1.5, 0.07, g);
        mesh(cyl, '#ffffff', -3, 1.5, -2.6, 0.07, 2.6, 0.07, g).rotation.z = Math.PI / 2;
        mesh(cyl, '#adb5bd', 3.5, 1.6, -2.6, 0.08, 3.2, 0.08, g); mesh(box, '#ffffff', 3.5, 3.3, -2.4, 1.3, 0.9, 0.08, g);
        const rim = new T.Mesh(new T.TorusGeometry(0.3, 0.04, 8, 20), S.lam('#f76707')); rim.position.set(3.5, 3.0, -2.0); rim.rotation.x = Math.PI / 2; g.add(rim);
        return 4;
      }
      case 'singes': { // la tour des singes farceurs (un singe tout en haut)
        mesh(cyl, '#d6ccc2', 0, 4.5, -0.5, 2, 9, 2, g); mesh(cone, '#bc6c25', 0, 10.2, -0.5, 2.6, 2.6, 2.6, g);
        for (const y of [3, 6]) mesh(box, '#a2d2ff', 0, y, 1.45, 0.9, 1.1, 0.2, g);
        mesh(box, '#5a3e2b', 0, 1.1, 1.45, 1.1, 2.2, 0.2, g);
        const mk = creaturesByModel('pets/animal-monkey');
        if (mk) { try { const m = buildCreature3D(S, mk, false); m.group.scale.multiplyScalar(0.9); m.group.position.set(1.2, 8.3, 0.6); g.add(m.group); anims.push((t) => m.animate(t, Math.sin(t * 0.0013) > 0.4 ? 'happy' : 'idle')); } catch (e) { /* (singe indisponible) */ } }
        for (let i = 0; i < 3; i++) mesh(ball, '#f3f7ff', -1.2 + i * 1.1, 2.4 + i * 1.7, 1.5, 0.35, 0.3, 0.15, g); // (traces de mousse)
        return 11;
      }
      case 'supermarche': { // le marché aux ingrédients : trois étals à auvent rayé
        for (const [x, c] of [[-3, '#ef476f'], [0, '#06d6a0'], [3, '#ffd166']]) {
          mesh(box, '#8d5a3b', x, 0.6, 0, 2.4, 1.2, 1.4, g);
          for (let i = 0; i < 4; i++) mesh(box, i % 2 ? '#ffffff' : c, x - 0.9 + i * 0.6, 2.7, 0.1, 0.6, 0.15, 1.9, g).rotation.x = -0.25;
          for (const s of [-1, 1]) mesh(cyl, '#6b4226', x + s * 1.1, 1.4, 0.6, 0.06, 2.8, 0.06, g);
        }
        put('kaykit/re-crate_carrots', -3, 0.4, 0.5, 0, g); put('kaykit/re-crate_tomatoes', 0, 0.4, 0.5, 0, g); put('kaykit/re-crate_lettuce', 3, 0.4, 0.5, 0, g);
        return 3.5;
      }
    }
    return 4;
  }

  // Portail magique (vers les aventures, l'Académie ou un autre pays) : deux piliers, un anneau qui tourbillonne
  makePortal(d, g, k) {
    const { mesh } = k, S = this.S, T = S.T, anims = this.anims;
    const col = d.kind === 'academy' ? '#ffd166' : d.kind === 'country' ? (d.w.hero.body || '#4cc9f0') : '#9d4edd';
    for (const x of [-2.2, 2.2]) { mesh(k.cyl, '#9a9184', x, 2, 0, 0.45, 4, 0.45, g); mesh(k.ball, col, x, 4.3, 0, 0.35, 0.35, 0.35, g, { emissive: col, emissiveIntensity: 0.8 }); }
    const ring = new T.Mesh(new T.TorusGeometry(1.8, 0.22, 12, 40), S.lam(col, { emissive: col, emissiveIntensity: 0.7 })); ring.position.set(0, 2.3, 0); g.add(ring);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(30,27,75,0.9)');
    x.fillStyle = gr; x.beginPath(); x.arc(64, 64, 64, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 5; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(64, 64, 14 + i * 12, i, i + 2.4); x.stroke(); }
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    const disc = new T.Mesh(new T.CircleGeometry(1.7, 40), new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide }));
    disc.position.set(0, 2.3, 0); g.add(disc);
    if (d.kind === 'academy') { ring.scale.setScalar(0.8); disc.scale.setScalar(0.8); } // (portail du retour, plus petit : il est tout près de la caméra)
    anims.push((t) => { disc.rotation.z = -t * 0.002; ring.material.emissiveIntensity = 0.5 + 0.3 * Math.sin(t * 0.003); });
    return 5;
  }

  // Porte d'une étape du pays : portique aux couleurs de son paysage, quelques objets de ce paysage autour ;
  // à la dernière, le gardien ensorcelé (nuage d'orage) attend… ou fait la fête s'il est déjà ami
  makeGate(d, g, k) {
    const { mesh, box, cyl } = k, S = this.S, P = S.P, b = d.w.biomes[d.k] || d.w.biomes[0], kit = KITS[b.kit] || {};
    const post = shade(b.path || '#c8955f', -0.35), beam = b.path2 || b.path || '#d4a373';
    for (const x of [-2, 2]) mesh(cyl, post, x, 2, 0, 0.3, 4, 0.3, g);
    mesh(box, beam, 0, 4.15, 0, 5.4, 0.45, 0.6, g); mesh(box, post, 0, 3.55, 0, 4.4, 0.25, 0.4, g);
    mesh(box, b.mount0 || '#ffd166', 0, 2.9, 0.05, 1.6, 1, 0.1, g); // (petit panneau aux couleurs du paysage)
    const props = (kit.props || []).map((pp) => pp[0]);
    for (let i = 0; i < 4 && props.length; i++) {
      const o = P.make && P.make(props[(i * 3 + d.k) % props.length], b); if (!o) continue;
      o.position.set((i % 2 ? 1 : -1) * (3.4 + (i > 1 ? 1.6 : 0)), 0, -1 - (i > 1 ? 1.5 : 0)); g.add(o);
    }
    if (b.night || kit.night) for (const x of [-2, 2]) mesh(k.ball, '#fff3b0', x, 4.4, 0, 0.22, 0.22, 0.22, g, { emissive: '#ffd166', emissiveIntensity: 0.9 });
    if (d.boss) {
      const cr = guardianOf(d.w);
      try {
        const c = buildCreature3D(S, cr, true); c.group.scale.multiplyScalar(1.6); c.group.position.set(3.4, 0, 1.2); c.group.rotation.y = -0.5; g.add(c.group);
        this.guardian = { c, cr, friend: !!d.done && Stages.dots(d.w) >= (Stages.count(d.w) || 1) };
      } catch (e) { this.guardian = null; }
    }
    return 4.6;
  }

  // Quelques petites maisons de village entre les chemins (toit aux couleurs du pays)
  makeHouses(scene, k, spots) {
    const C = this.colors, roof = this.w.hero.limb || '#bc4749', wall = shade(C.path, 0.35);
    const used = spots.map((d) => Math.atan2(d.dir.x, -d.dir.z));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.31;
      if (used.some((u) => Math.abs(Math.atan2(Math.sin(a - u), Math.cos(a - u))) < 0.32)) continue; // (pas sur un chemin)
      const r = 11 + (i % 2) * 3, x = Math.sin(a) * r, z = -Math.cos(a) * r, gr = new this.S.T.Group();
      gr.position.set(x, 0, z); gr.rotation.y = -a; scene.add(gr);
      k.mesh(k.box, wall, 0, 0.9, 0, 2, 1.8, 2, gr);
      const top = k.mesh(k.cone, roof, 0, 2.35, 0, 1.7, 1.2, 1.7, gr); top.rotation.y = Math.PI / 4;
      k.mesh(k.box, shade(roof, -0.3), 0, 0.55, 1.01, 0.6, 1.1, 0.05, gr);
      k.mesh(k.box, '#ffe8a3', 0.6, 1.1, 1.01, 0.4, 0.4, 0.05, gr, C.night ? { emissive: '#ffd166', emissiveIntensity: 0.8 } : undefined);
    }
  }

  // Panneau au-dessus de chaque bâtiment : nom et étoiles (ou « ? » si c'est encore fermé), dessiné une fois
  label(d) {
    const T = this.S.T, key = `${d.id}|${d.open}|${d.stars}|${d.next}|${d.done}|${d.name}`;
    const old = this.labels[d.id];
    if (old && old.key === key) return old.sp;
    if (old) { this.scene.remove(old.sp); old.sp.material.map.dispose(); old.sp.material.dispose(); }
    // (canevas : la grosse icône en haut, le panneau en dessous)
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 400;
    const x = cv.getContext('2d');
    const icon = !d.open ? '' : d.kind === 'world' ? HUB_ICONS[d.id] || '⭐' : d.kind === 'stage' ? (d.boss ? '👑' : ['1️⃣', '2️⃣', '3️⃣'][d.k] || '⭐') : '';
    if (icon) { x.font = '120px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(icon, 256, 76); }
    x.translate(0, 144);
    x.fillStyle = d.open ? (d.next ? '#ffd166' : 'rgba(255,255,255,.95)') : 'rgba(60,50,110,.85)';
    x.beginPath(); x.roundRect(8, 8, 496, 240, 44); x.fill();
    x.lineWidth = 10; x.strokeStyle = d.kind === 'world' || d.kind === 'stage' ? '#7b2cbf' : '#9d4edd'; x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = d.open ? '#1e1b4b' : '#ffffff';
    if (!d.open) { x.font = '800 96px "Baloo 2", sans-serif'; x.fillText('🔒 ?', 256, 132); }
    else {
      // (nom sur une ou deux lignes, en gros : les petits ne lisent pas, mais les grands oui)
      const name = d.name, words = name.split(' '), sub = d.kind === 'world' || d.kind === 'stage';
      x.font = '800 64px "Baloo 2", sans-serif';
      let lines = [name];
      if (x.measureText(name).width > 460 && words.length > 1) {
        let best = 1, bw = 1e9;
        for (let i = 1; i < words.length; i++) { const w = Math.max(x.measureText(words.slice(0, i).join(' ')).width, x.measureText(words.slice(i).join(' ')).width); if (w < bw) { bw = w; best = i; } }
        lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
      }
      const y0 = !sub ? (lines.length > 1 ? 95 : 128) : lines.length > 1 ? 62 : 90;
      lines.forEach((l, i) => x.fillText(l, 256, y0 + i * 66, 470));
      x.font = '52px serif';
      if (d.kind === 'world') x.fillText([0, 1, 2].map((i) => (i < d.stars ? '⭐' : '☆')).join(' '), 256, 204);
      if (d.kind === 'stage') { x.font = '800 44px "Baloo 2", sans-serif'; x.fillText((d.done ? '✅ ' : '') + (d.boss ? '👑 Gardien' : d.done ? 'Réussie' : 'À faire'), 256, 206); }
    }
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false }));
    sp.center.set(0.5, 0.32); // (le point d'accroche reste au milieu du panneau)
    sp.userData.base = d.kind === 'academy' ? 0.6 : 1; // (portail du retour, tout près de la caméra : panneau plus petit)
    sp.scale.set(7 * sp.userData.base, 5.47 * sp.userData.base, 1);
    const b = this.buildings[d.id];
    sp.position.set(d.pos.x, d.id === 'ecole' ? 9 : d.kind === 'academy' ? 3.2 : (b ? b.h : 5) + 2.4, d.pos.z + (d.id === 'ecole' ? 4 : d.kind === 'academy' ? 1.5 : 0)); // (château : devant la porte ; portail du retour, tout près de la caméra : panneau bas)
    this.scene.add(sp);
    this.labels[d.id] = { key, sp };
    return sp;
  }

  // ---------- Entrée dans le parc (au début, ou en revenant d'un cours : devant la porte de ce bâtiment)
  enter(fromId = null) {
    const S = this.S;
    if (!this.scene) return;
    this.places = this.dests();
    const cur = Progress.current();
    for (const d of this.places) { if (d.kind === 'world') d.next = d.open && d.w === cur && d.stars === 0; this.label(d); }
    // (d'où l'on arrive : la porte de ce lieu ; un autre pays : son portail ; sinon le milieu de la place)
    const from = this.places.find((d) => d.id === fromId || (d.kind === 'country' && d.w.id === fromId));
    this.pos = from ? { ...from.door } : { x: 0, z: 4.5 };
    this.yaw = from ? Math.atan2(from.dir.x, from.dir.z) : Math.PI; // (de dos : regarde vers le fond)
    // Étoiles retrouvées : bandes de l'arc-en-ciel et petites étoiles du bandeau
    for (const r of this.rainbow || []) {
      const on = Tale.hasGem(r.id); r.m.material.color.set(on ? r.col : '#d9d9e3'); r.m.material.opacity = on ? 0.9 : 0.3;
      r.m.material.emissive && r.m.material.emissive.set(on ? r.col : '#000000');
    }
    if (this.calin) this.calin.group.visible = this.kind === 'academy' && Tale.done();
    const gemsEl = document.getElementById('hubGems');
    if (gemsEl) gemsEl.innerHTML = GEMS.map((g) => `<span class="taleStar${Tale.hasGem(g.world) ? ' on' : ''}" style="--gc:${g.col}">⭐</span>`).join('');
    const title = document.querySelector('#hubHud .hubTitle');
    if (title) title.textContent = this.kind === 'village' ? `🌀 ${this.w.name}` : "🏰 Parc de l'Académie";
    if (this.guardian) { const n = Stages.count(this.w) || 1; this.guardian.friend = n > 1 ? Stages.dots(this.w) === n : Progress.stars(this.w) > 0; }
    this.mode = 'choose'; this.target = null; this.route = null; this.hover = null; this.charge = 0; this.ptr = null;
    this.block = null; this.trips = this.trips || 0; this.slowT = 0; this.moveK = 0; this.t0 = performance.now();
    this.enterT = 0; this.lastSay = {};
    S.mirror = false;
    this.say(from ? 'back' : this.kind === 'village' ? 'village' : 'hello', 0); // (au retour d'un cours : une phrase courte)
    this.hint(this.kind === 'village' ? '🪄 Vise une étape avec ta baguette' : '🪄 Lève le bras et vise un bâtiment avec ta baguette');
  }
  say(k, cool = 9000) { const now = performance.now(); if (now - (this.lastSay[k] || -1e9) < cool) return; this.lastSay[k] = now; Audio8.say(HUB_SAY[k]); }
  hint(t) { const el = document.getElementById('hubHint'); if (el && el.textContent !== t) el.textContent = t; }

  // Pointeur de la baguette : le bras levé le plus tendu (comme l'épreuve de la baguette), lissé
  pointer() {
    const auto = typeof DEV !== 'undefined' && DEV.get('hubauto');
    let p = null;
    if (auto && this.mode === 'choose') { const d = this.places.find((x) => x.next) || this.places.find((x) => x.open && (x.kind === 'world' || x.kind === 'stage')); if (d) p = this.screenOf(d); }
    else if (auto && auto !== '2' && this.block) p = this.screenOfObj(this.block.c.group.position, 0.8); // (hubauto=2 : ne vise pas la créature)
    else for (const b of tracker.bodies) {
      if (!b.lm || !b.T || !b.state.present) continue;
      const sh = mid(b.lm[11], b.lm[12]);
      const ps = [15, 16].map((k) => armPoint(b, k)).filter((q) => q && q.wy < sh.y + b.T * 0.6);
      if (ps.length) { p = ps.reduce((a, q) => (Math.hypot(q.x - 0.5, q.y - 0.62) > Math.hypot(a.x - 0.5, a.y - 0.62) ? q : a)); break; }
    }
    if (!p) return (this.ptr = null);
    const o = this.ptr;
    return (this.ptr = o ? { x: o.x + (p.x - o.x) * 0.4, y: o.y + (p.y - o.y) * 0.4 } : { x: p.x, y: p.y });
  }
  screenOfObj(v, dy = 0) {
    const T = this.S.T, q = new T.Vector3(v.x, v.y + dy, v.z).project(this.cam);
    return { x: (q.x + 1) / 2, y: (1 - q.y) / 2, behind: q.z > 1 };
  }
  screenOf(d) { const b = this.buildings[d.id]; return this.screenOfObj({ x: d.pos.x, y: 0, z: d.pos.z + (d.id === 'ecole' ? 4 : 0) }, d.id === 'ecole' ? 2.5 : (b ? b.h : 5) * 0.55); } // (château : vise sa porte, sous le panneau)

  // Énergie du joueur (course sur place) : 0..1
  energy() {
    if (tracker.sim) return typeof DEV !== 'undefined' && DEV.get('hubslow') ? 0 : typeof DEV !== 'undefined' && DEV.get('hubauto') ? 1 : (this.keyRun || 0) > performance.now() ? 1 : 0.35;
    const m = Math.max(0, ...tracker.bodies.map((b) => (b.state.present ? b.motion || 0 : 0)));
    return Math.max(0, Math.min(1, (m - 0.015) / 0.05));
  }

  choose(d, now) {
    if (!d.open) { Audio8.soft(); this.say({ portal: 'portalLocked', stage: 'stageLocked', country: 'countryLocked' }[d.kind] || 'locked', 4000); this.charge = 0; return; }
    this.target = d; this.mode = 'walk'; this.charge = 0; this.trips++;
    const start = { ...this.pos }, atCenter = Math.hypot(start.x, start.z) < 5;
    this.route = atCenter ? [start, d.door] : [start, { x: 0, z: 0 }, d.door]; // (par la place : tous les chemins y passent)
    this.seg = 0; this.walked = 0;
    this.blockAt = (typeof DEV !== 'undefined' && DEV.get('hubblock')) || (this.trips > 1 && Math.random() < 0.45) ? 0.55 : null; // (une créature ensorcelée sur le chemin, une fois sur deux à peu près)
    Audio8.spell(); this.S.burst(this.ptr ? this.ptr.x * this.S.W : this.S.W / 2, this.ptr ? this.ptr.y * this.S.H : this.S.H / 2, 30, ['#ffd166', '#ff70a6', '#ffffff', '#c77dff']);
    Audio8.say(d.kind === 'world' || d.kind === 'stage' ? HUB_SAY.go : HUB_SAY.travel);
    this.hint(this.goHint());
  }
  goHint() {
    const d = this.target;
    return '🏃 Cours sur place pour aller ' + ({ world: () => 'à : ' + d.w.name, stage: () => `à l'étape ${d.k + 1}`, portal: () => 'au portail des aventures',
      academy: () => "à l'Académie", country: () => 'vers : ' + d.w.name }[d.kind] || (() => ''))() + ' !';
  }

  // ---------- Logique (appelée à chaque image de la boucle du jeu)
  update(now) {
    if (!this.scene || !this.places) return;
    const dt = Math.min(0.1, Math.max(0, (now - (this.lastT || now)) / 1000)); this.lastT = now;
    const p = this.pointer(), W = this.S.W, H = this.S.H, A = W / Math.max(1, H);
    if (this.mode === 'choose') {
      let best = null, bd = 0.13;
      if (p) for (const d of this.places) { const s = this.screenOf(d); const dd = Math.hypot((s.x - p.x) * A, s.y - p.y); if (dd < bd) { bd = dd; best = d; } }
      if (this.keyPick != null) best = this.places[this.keyPick] || null;
      if (best !== this.hover) { this.hover = best; this.charge = 0; }
      if (best) {
        this.charge = Math.min(1, this.charge + dt / (tracker.bodies.some((b) => b.easy) ? 0.9 : 1.2));
        if (now - (this.hum || 0) > 200) { this.hum = now; Audio8.sparkle(this.charge); }
        if (this.charge >= 1 || this.keyGo) { this.keyGo = false; this.choose(best, now); }
      } else this.charge = Math.max(0, this.charge - dt);
      // (pas de bras levé depuis un moment : la voix rappelle comment faire)
      if (p) this.noPtr = 0; else if ((this.noPtr = (this.noPtr || 0) + dt) > 10) { this.noPtr = 0; this.say('aim', 20000); }
    } else if (this.mode === 'walk') {
      const e = this.energy();
      this.moveK += (e - this.moveK) * Math.min(1, dt * 3);
      const speed = 1.3 + 4.5 * this.moveK;
      if (e < 0.15) { this.slowT += dt; if (this.slowT > 3) { this.say('faster', 12000); this.slowT = 0; } } else this.slowT = 0;
      let step = speed * dt;
      while (step > 0 && this.seg < this.route.length - 1) {
        const a = this.route[this.seg], b = this.route[this.seg + 1], L = Math.hypot(b.x - a.x, b.z - a.z) || 0.001;
        const done = Math.hypot(this.pos.x - a.x, this.pos.z - a.z), left = L - done;
        const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
        this.yaw = Math.atan2(dx, dz) + Math.PI;
        if (step < left) { this.pos.x += dx * step; this.pos.z += dz * step; this.walked += step; step = 0; }
        else { this.pos = { ...b }; this.walked += left; step -= left; this.seg++; }
      }
      const total = this.route.reduce((s, q, i) => (i ? s + Math.hypot(q.x - this.route[i - 1].x, q.z - this.route[i - 1].z) : 0), 0);
      if (this.blockAt != null && this.walked / total > this.blockAt) { this.blockAt = null; this.spawnBlock(); }
      if (this.seg >= this.route.length - 1) { this.mode = 'enter'; this.enterT = now; Audio8.say(HUB_SAY.enter); Audio8.perfect(); }
    } else if (this.mode === 'block') {
      const bk = this.block, s = this.screenOfObj(bk.c.group.position, 0.8);
      bk.aimed = !!p && Math.hypot((s.x - p.x) * A, s.y - p.y) < 0.14;
      if (bk.aimed || (tracker.sim && (this.keyGo || now - bk.t0 > 2500))) {
        bk.charge = Math.min(1, bk.charge + dt / 1.2); this.keyGo = false;
        if (now - (this.hum || 0) > 200) { this.hum = now; Audio8.sparkle(bk.charge); }
      } else bk.charge = Math.max(0, bk.charge - dt / 2.5);
      if (bk.charge >= 1 || (tracker.sim && now - bk.t0 > 2500)) {
        bk.free = now; this.mode = 'walk'; Audio8.spell(); Audio8.cry(bk.cr.id, true); this.say('freed', 0);
        this.S.burst(s.x * W, s.y * H, 40, ['#ffd166', '#ff70a6', '#ffffff', '#7bdff2']);
        this.hint(this.goHint());
      }
    } else if (this.mode === 'enter' && now - this.enterT > 1300) {
      this.mode = 'gone';
      if (this.onGo) this.onGo(this.target);
    }
  }
  spawnBlock() {
    const pool = creaturesOf('meadow'), cr = pool[Math.floor(Math.random() * pool.length)] || CREATURES[0];
    let c; try { c = buildCreature3D(this.S, cr, false); } catch (e) { return; }
    const fw = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
    c.group.position.set(this.pos.x + fw.x * 3, 0, this.pos.z + fw.z * 3);
    c.group.rotation.y = this.yaw + Math.PI;
    this.scene.add(c.group);
    this.block = { c, cr, t0: performance.now(), charge: 0, free: 0 };
    this.mode = 'block'; Audio8.cry(cr.id); this.say('block', 0);
    this.hint('🪄 Vise la créature avec ta baguette pour la libérer !');
  }

  // ---------- Dessin
  render(now) {
    const S = this.S, T = S.T;
    if (!this.scene || !S.renderer) return;
    if (S.cv3 && S.cv3.style.display !== 'block') S.cv3.style.display = 'block'; // (la toile 3D du jeu, prêtée au parc)
    const dt = Math.min(0.1, Math.max(0, (now - (this.lastR || now)) / 1000)); this.lastR = now;
    // Le petit sorcier : court sur le chemin, s'arrête devant une créature, saute de joie en entrant
    const h = this.hero, fake = { lane: 0, y: 0, holdPose: null };
    const pose = this.mode === 'walk' ? 'run' : this.mode === 'enter' ? 'happy' : 'idle';
    if (h.human) { const save = S.heroY3; S.heroY3 = () => 0; try { S.applyHumanPose(fake, h, pose, now); } finally { S.heroY3 = save; } }
    if (h.human && h.human.cur && pose === 'run') h.human.cur.timeScale = this.mode === 'walk' ? 0.55 + this.moveK * 0.8 : 1;
    const fade = this.mode === 'enter' || this.mode === 'gone' ? Math.max(0, 1 - (now - this.enterT) / 1100) : 1;
    let px = this.pos.x, pz = this.pos.z;
    if (this.mode === 'enter' || this.mode === 'gone') { const d = this.target, k = 1 - fade; px = d.door.x + d.dir.x * 2.2 * k; pz = d.door.z + d.dir.z * 2.2 * k; }
    h.group.position.set(px, 0, pz); h.group.rotation.set(0, this.yaw, 0); h.group.scale.setScalar((h.scale || 1) * Math.max(0.01, fade));
    for (const a of h.anims || []) a(now);
    // Le familier suit, un peu derrière
    if (this.comp) {
      const fw = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) }, tx = px - fw.x * 1.6 + fw.z * 1.1, tz = pz - fw.z * 1.6 - fw.x * 1.1;
      const g = this.comp.group; g.position.x += (tx - g.position.x) * Math.min(1, dt * 4); g.position.z += (tz - g.position.z) * Math.min(1, dt * 4);
      g.rotation.y = this.yaw; g.visible = fade > 0.3;
      this.comp.animate(now, this.mode === 'walk' ? 'run' : this.mode === 'enter' ? 'happy' : 'idle');
    }
    // Les amis du grimoire se promènent autour de la place
    for (const wk of this.walkers) { wk.a += wk.sp * dt; const x = Math.sin(wk.a) * wk.r, z = Math.cos(wk.a) * wk.r; wk.c.group.position.set(x, 0, z); wk.c.group.rotation.y = wk.a + Math.PI / 2; wk.c.animate(now, Math.sin(now * 0.0008 + wk.r) > 0.8 ? 'happy' : 'run'); }
    // La créature ensorcelée du chemin : boude, gigote sous le rayon, saute de joie puis s'écarte
    if (this.block) {
      const bk = this.block, g = bk.c.group;
      if (bk.free) {
        const k = (now - bk.free) / 1200;
        g.position.x += Math.cos(this.yaw) * dt * 2.5; g.position.z -= Math.sin(this.yaw) * dt * 2.5;
        bk.c.animate(now, 'happy'); g.scale.setScalar(Math.max(0.01, 1 - Math.max(0, k - 0.6) * 2.5));
        if (k > 1) { this.scene.remove(g); this.block = null; }
      } else { g.rotation.z = Math.sin(now * (bk.aimed ? 0.03 : 0.004)) * (bk.aimed ? 0.12 : 0.05); bk.c.animate(now, bk.aimed ? 'no' : 'idle'); }
    }
    for (const a of this.anims || []) a(now);
    if (this.water) { this.water.scale.y = 0.55 + Math.sin(now * 0.006) * 0.08; }
    if (this.calin && this.calin.group.visible) { this.calin.group.position.set(Math.sin(now * 0.0004) * 4, 6 + Math.sin(now * 0.002) * 0.4, -2 + Math.cos(now * 0.0004) * 2); this.calin.animate(now, 'happy'); }
    if (this.crystal) { this.crystal.rotation.y = now * 0.001; this.crystal.position.y = 2.4 + Math.sin(now * 0.002) * 0.15; }
    if (this.guardian) { const gc = this.guardian.c; gc.animate(now, this.guardian.friend ? (Math.sin(now * 0.001) > 0.3 ? 'happy' : 'idle') : 'idle'); gc.group.rotation.z = this.guardian.friend ? 0 : Math.sin(now * 0.004) * 0.05; }
    // Caméra : vue d'ensemble pour choisir ; derrière le petit sorcier quand il marche
    const follow = this.mode !== 'choose';
    const fw = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
    const wantP = follow ? new T.Vector3(px - fw.x * 8, 4.6, pz - fw.z * 8) : new T.Vector3(0, 30, 40);
    const wantL = follow ? new T.Vector3(px + fw.x * 5, 1.5, pz + fw.z * 5) : new T.Vector3(0, 1, -7);
    const k = Math.min(1, dt * (follow ? 2.4 : 1.6));
    this.camPos.lerp(wantP, k); this.camLook.lerp(wantL, k);
    this.cam.position.copy(this.camPos); this.cam.lookAt(this.camLook);
    // Panneaux lointains agrandis : ils restent lisibles au fond du parc (et l'icône se voit de loin)
    for (const lb of Object.values(this.labels || {})) {
      const k2 = lb.sp.userData.base * Math.max(1, Math.min(2.2, lb.sp.position.distanceTo(this.camPos) / 38));
      lb.sp.scale.set(7 * k2, 5.47 * k2, 1);
    }
    if (typeof DEV !== 'undefined' && DEV.get('hubdbg')) document.title = `HUB ${this.mode} dt=${dt.toFixed(3)} k=${k.toFixed(3)} cam=${this.camPos.toArray().map((v) => v.toFixed(1))} want=${wantP.toArray().map((v) => v.toFixed(1))}`;
    const W = S.W, H = S.H;
    if (Math.abs(this.cam.aspect - W / H) > 0.001) { this.cam.aspect = W / H; this.cam.updateProjectionMatrix(); }
    if (S.outlineMat) S.outlineMat.visible = true;
    S.renderer.render(this.scene, this.cam);
    this.drawOverlay(now, dt, fade);
  }

  // Calque 2D : anneau de charge sur le bâtiment visé, baguette et rayon, nuage de la créature ensorcelée, étincelles
  drawOverlay(now, dt, fade) {
    const S = this.S, ctx = S.ctx, W = S.W, H = S.H, M = Math.min(W, H);
    ctx.clearRect(0, 0, W, H);
    const ring = (x, y, r, k, col = '#ffd166') => {
      ctx.lineCap = 'round'; ctx.lineWidth = Math.max(6, M * 0.012);
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.stroke();
      ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + k * 6.29); ctx.stroke();
    };
    if (this.mode === 'choose' && this.places) {
      for (const d of this.places) if (d.next) { // (le prochain cours / la prochaine étape : un halo doré qui pulse autour du bâtiment)
        const s = this.screenOf(d), r = M * (0.075 + 0.012 * Math.sin(now / 220));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const [lw, al] of [[M * 0.03, 0.25], [M * 0.012, 0.7]]) { ctx.strokeStyle = '#ffd166'; ctx.globalAlpha = al; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, r, 0, 6.29); ctx.stroke(); }
        ctx.restore();
      }
      if (this.hover) { const s = this.screenOf(this.hover); ring(s.x * W, s.y * H, M * 0.085, this.charge, this.hover.open ? '#ffd166' : '#adb5bd'); }
    }
    if (this.guardian && !this.guardian.friend) { // le gardien du pays est encore ensorcelé : petit nuage d'orage
      const v = this.guardian.c.group.getWorldPosition(new S.T.Vector3()), s0 = this.screenOfObj(v, 3.3), cs = M * 0.04;
      if (!s0.behind) { ctx.fillStyle = '#4a4e69'; ctx.strokeStyle = '#22223b'; ctx.lineWidth = 3; ctx.beginPath();
        for (const [dx, dy, rr] of [[-0.45, 0.05, 0.38], [0, -0.15, 0.48], [0.45, 0.05, 0.38], [0, 0.15, 0.4]]) { ctx.moveTo(s0.x * W + dx * cs + rr * cs, s0.y * H + dy * cs); ctx.arc(s0.x * W + dx * cs, s0.y * H + dy * cs, rr * cs, 0, 6.29); }
        ctx.fill(); ctx.stroke(); }
    }
    if (this.block && !this.block.free) { // nuage d'orage grognon au-dessus de la créature
      const s = this.screenOfObj(this.block.c.group.position, 1.9), x = s.x * W, y = s.y * H, cs = M * 0.06 * (1 - this.block.charge * 0.5);
      ctx.fillStyle = '#4a4e69'; ctx.strokeStyle = '#22223b'; ctx.lineWidth = 3; ctx.beginPath();
      for (const [dx, dy, rr] of [[-0.45, 0.05, 0.38], [0, -0.15, 0.48], [0.45, 0.05, 0.38], [0, 0.15, 0.4]]) { ctx.moveTo(x + dx * cs + rr * cs, y + dy * cs); ctx.arc(x + dx * cs, y + dy * cs, rr * cs, 0, 6.29); }
      ctx.fill(); ctx.stroke();
      const c = this.screenOfObj(this.block.c.group.position, 0.8); if (this.block.charge > 0) ring(c.x * W, c.y * H, M * 0.08, this.block.charge);
    }
    // Baguette du petit sorcier -> pointeur (rayon ondulé, plus fort quand il vise quelque chose)
    const p = this.ptr;
    if (p && (this.mode === 'choose' || this.mode === 'block') && fade > 0.5) {
      const tipObj = this.hero.wandTip, v = tipObj ? tipObj.getWorldPosition(new S.T.Vector3()) : this.hero.group.position;
      const o = this.screenOfObj(v, tipObj ? 0 : 1.4), ox = o.x * W, oy = o.y * H, tx = p.x * W, ty = p.y * H;
      const on = this.mode === 'choose' ? !!this.hover : !!(this.block && this.block.aimed);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const d = Math.hypot(tx - ox, ty - oy) || 1, nx = -(ty - oy) / d, ny = (tx - ox) / d;
      for (const [lw, al] of on ? [[M * 0.04, 0.25], [M * 0.016, 0.6], [M * 0.006, 1]] : [[M * 0.01, 0.25], [M * 0.004, 0.6]]) {
        ctx.strokeStyle = '#ffd166'; ctx.globalAlpha = al; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ox, oy);
        for (let j = 1; j <= 16; j++) { const q = j / 16, wv = Math.sin(q * 12 - now * 0.02) * M * (on ? 0.01 : 0.005) * Math.sin(q * Math.PI); ctx.lineTo(ox + (tx - ox) * q + nx * wv, oy + (ty - oy) * q + ny * wv); }
        ctx.stroke();
      }
      ctx.restore();
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(now / 400); ctx.font = `${M * (on ? 0.065 : 0.05)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✨', 0, 0); ctx.restore();
    }
    // Course sur place : jauge d'énergie (plus elle est pleine, plus le petit sorcier va vite)
    if (this.mode === 'walk') {
      const bw = M * 0.32, bx = W / 2 - bw / 2, by = H - M * 0.12;
      ctx.fillStyle = 'rgba(15,12,50,.55)'; ctx.beginPath(); ctx.roundRect(bx - 8, by - 8, bw + 16, M * 0.05 + 16, 20); ctx.fill();
      ctx.fillStyle = '#06d6a0'; ctx.beginPath(); ctx.roundRect(bx, by, Math.max(8, bw * this.moveK), M * 0.05, 14); ctx.fill();
      ctx.font = `${M * 0.045}px serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('🏃', bx - 14, by + M * 0.025);
    }
    S.drawFx(dt);
  }

  dispose() {
    if (!this.scene) return;
    this.scene.traverse((o) => { if (o.isSprite && o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    this.scene = null; this.places = null; this.anims = []; this.labels = {}; this.block = null; this.guardian = null; this.rainbow = null; this.calin = null;
  }
}
