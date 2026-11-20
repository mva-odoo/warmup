// Le château de l'Académie : un petit monde ouvert pour aller d'un cours à l'autre.
// Une grande cour fermée par les remparts, une fontaine au milieu ; au fond le donjon (le premier jour), sur les côtés
// une tour par cours (danse, dojo, atelier des potions, récré…), à l'entrée la grande porte du portail des aventures.
// Commandes (pas de visée au doigt, trop imprécise pour les petits) : le prochain cours est déjà choisi ; un PAS DE CÔTÉ
// passe au lieu voisin (à gauche ou à droite à l'écran), les DEUX BRAS LEVÉS lancent le sort et le petit sorcier y va
// tout seul, vite. L'enfant VISE un bâtiment avec sa baguette (bras levé,
// comme l'épreuve de la baguette), puis COURT SUR PLACE : son petit sorcier suit le chemin tout seul, plus vite quand
// il court (c'est déjà l'échauffement). En route, parfois, une créature ensorcelée bloque le passage : un coup de
// baguette et elle redevient gentille. Jamais d'échec, jamais perdu : on ne peut que suivre les chemins.
// Scène 3D à part (comme la chambre), dessinée avec le moteur du jeu (scene3d : modèles, personnage, créatures).
// Derrière le portail : un petit VILLAGE par pays d'aventure, même principe. Une porte par étape du pays (dans son
// paysage), le gardien ensorcelé qui attend à la dernière, un portail vers le pays d'avant / d'après et un vers
// l'Académie. Les villageois sont les créatures du pays.

// Plan du château : [x, z, rempart] (o = gauche, e = droite, n = fond, s = entrée). Les cours suivent l'ordre du
// chapitre : à gauche de l'entrée vers le fond, puis à droite du fond vers l'entrée (comme une ronde dans la cour).
// Les allées sont droites : l'allée centrale (de la porte au donjon) et trois allées en travers, une par paire de tours.
const CASTLE = {
  ecole: [0, -27, 'n'], jardin3d: [-19, 11, 'o'], disco: [-19, 0, 'o'], dojo: [-19, -11, 'o'], verger: [-10, -17, 'n'],
  stade: [19, -11, 'e'], singes: [19, 0, 'e'], supermarche: [19, 11, 'e'], portal: [0, 17, 's'],
  defis: [10, -17, 'n'], // (la Salle des Défis : la tour de Madame Pimprenelle, ouverte d'office)
};
const CASTLE_SIDE = { o: { x: -1, z: 0 }, e: { x: 1, z: 0 }, n: { x: 0, z: -1 }, s: { x: 0, z: 1 } };
const CASTLE_ROOF = { jardin3d: '#52b788', disco: '#f15bb5', verger: '#7b2cbf', stade: '#4cc9f0', supermarche: '#ff9f1c' }; // (toit de la tour de chaque cours)
// Pseudo-monde « parc » : passe par le même lancement qu'un monde (caméra, calibrage), sans parcours
const HUB_WORLD = {
  id: 'hub', hub: true, name: "Château de l'Académie", tagline: '', heroName: '', collectible: '✨', sky: ['#8ecae6', '#e8f6ff'],
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
const HUB_ICONS = { defis: '🏆', ecole: '🏰', jardin3d: '🌸', disco: '💃', dojo: '🥋', verger: '🧪', stade: '⚽', singes: '🐒', supermarche: '🛒' };
const HUB_SAY = {
  hello: "Bienvenue au château de l'Académie ! Lève les deux bras pour aller au cours qui brille. Pour en choisir un autre, fais un pas de côté !",
  go: "C'est parti !",
  locked: "Cette porte est encore fermée. Réussis d'abord le cours d'avant !",
  portalLocked: "Le portail magique s'ouvrira quand tu auras fini les premiers cours !",
  block: 'Oh ! Une créature ensorcelée bloque le chemin ! Lève le bras pour lui lancer un sort !',
  freed: "Bravo ! Elle n'est plus ensorcelée !",
  enter: 'On entre !',
  village: "Bienvenue au village ! L'Étoile de ce pays est cachée par ici. En route pour l'étape qui brille !",
  villageBack: "Bravo ! On continue l'aventure… Fais un pas de côté si tu veux choisir autre chose !",
  stageLocked: "Cette étape s'ouvrira quand tu auras réussi celle d'avant !",
  countryLocked: "Ce pays est encore fermé. Termine d'abord celui-ci !",
  travel: 'En route par le portail magique !',
  back: 'Bravo ! Lève les deux bras pour aller au suivant, ou fais un pas de côté pour choisir !',
  aim: 'Fais un grand pas de côté pour changer, et lève les deux bras pour y aller !',
};

class AcademyHub {
  constructor(s3d) { this.S = s3d; this.scene = null; this.onGo = null; this.kind = 'academy'; this.w = null; }

  // Modèles à charger avant d'entrer (en plus de ceux du parc fleuri)
  models(friends = [], w = null) {
    if (w) return ['custom/castle', 'custom/stone-lantern', ...creatureModels([...friends, guardianOf(w), ...w.biomes.flatMap((b) => creaturesOf(b.kit || 'meadow'))])];
    return ['custom/castle', 'custom/pagoda', 'custom/torii', 'custom/cherry-tree-a', 'custom/stone-lantern', 'pets/animal-monkey',
      'kaykit/re-crate_carrots', 'kaykit/re-crate_tomatoes', 'kaykit/re-crate_lettuce', ...creatureModels([...friends, ...creaturesOf('meadow')])];
  }

  // Lieux : château de l'Académie (les cours du chapitre 1 et le portail des aventures) ou village d'un pays.
  // d.dir : du centre vers le lieu ; d.door : où l'on s'arrête pour entrer ; d.route : le chemin depuis la fontaine
  dests() {
    const list = this.kind === 'village' ? this.villageDests() : this.academyDests(), c0 = { x: 0, z: 0 };
    for (const d of list) {
      if (d.side) { // château : tour dans un rempart, porte au bout de son allée
        d.dir = { ...CASTLE_SIDE[d.side] }; d.pos = { x: d.x, z: d.z };
        const off = d.id === 'ecole' ? 13 : d.id === 'portal' ? 4 : d.side === 'n' ? 6 : 7.5;
        d.door = { x: d.x - d.dir.x * off, z: d.z - d.dir.z * off };
        d.route = d.door.x && d.door.z ? [c0, { x: 0, z: d.door.z }, d.door] : [c0, d.door]; // (allée centrale, puis allée en travers)
        continue;
      }
      const rad = (d.a * Math.PI) / 180;
      d.dir = { x: Math.sin(rad), z: -Math.cos(rad) };
      d.pos = { x: d.dir.x * d.r, z: d.dir.z * d.r };
      const dr = d.r - (d.kind === 'academy' ? 4 : 5.2); // (porte : devant le bâtiment, au bout de son chemin)
      d.door = { x: d.dir.x * dr, z: d.dir.z * dr };
      d.route = [c0, d.door];
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
    const defis = byId.get('defis'); // (hors de la carte : ouverte d'office, elle ne bloque pas l'histoire)
    if (defis) list.push({ id: 'defis', kind: 'world', w: defis, open: true, stars: Progress.stars(defis), name: defis.name });
    list.push({ id: 'portal', kind: 'portal', w: open.find((w) => Progress.stars(w) === 0) || open[open.length - 1] || adv[0], open: open.length > 0, name: '🌀 Aventures' });
    for (const d of list) [d.x, d.z, d.side] = CASTLE[d.id];
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
    if (adv[i + 1]) list.push({ id: 'next', kind: 'country', w: adv[i + 1], a: 130, r: 18, open: Progress.unlocked(adv[i + 1]), next: full, name: '➡️ ' + adv[i + 1].name }); // (pays fini : on file au suivant)
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
    scene.fog = this.kind === 'academy' ? new T.Fog(C.fog, 75, 150) : new T.Fog(C.fog, 55, 110);
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
    const K = { mesh, put, box, cyl, cone, ball, fit };
    if (this.kind === 'academy') this.makeCastle(K);
    mesh(cyl, shade(C.path, 0.15), 0, 0.06, 0, this.kind === 'academy' ? 4.4 : 6.5, 0.04, this.kind === 'academy' ? 4.4 : 6.5);
    this.water = null; this.crystal = null;
    if (this.kind === 'academy') {
      mesh(cyl, '#cfd8dc', 0, 0.35, 0, 2.6, 0.7, 2.6); mesh(cyl, '#7fd8f8', 0, 0.72, 0, 2.3, 0.05, 2.3, scene, { transparent: true, opacity: 0.85 });
      mesh(cyl, '#cfd8dc', 0, 1.3, 0, 0.35, 1.6, 0.35); mesh(cyl, '#cfd8dc', 0, 2.1, 0, 1.1, 0.2, 1.1);
      this.water = mesh(ball, '#a8e6ff', 0, 2.5, 0, 0.45, 0.55, 0.45, scene, { transparent: true, opacity: 0.8 });
      // L'arc-en-ciel de l'Académie : une bande par Étoile retrouvée (grise et pâle tant qu'elle manque)
      this.rainbow = RAINBOW.map((id, i) => {
        const m = new T.Mesh(new T.TorusGeometry(10.5 - i * 0.62, 0.3, 8, 64, Math.PI), new T.MeshLambertMaterial({ color: '#d9d9e3', transparent: true, opacity: 0.3, emissiveIntensity: 0.35 }));
        m.position.set(0, 0, -38); m.scale.setScalar(2.2); m.userData.noOutline = true; scene.add(m); // (grand arc derrière le donjon)
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
    // Chemins : au château, l'allée centrale et les allées en travers ; au village, de la place vers chaque lieu
    // (tous passent par la fontaine : impossible de se perdre)
    const spots = this.dests();
    const paths = this.kind === 'academy'
      ? [[{ x: 0, z: -14 }, { x: 0, z: 16.5 }, 3.2], ...[11, 0, -11].map((z) => [{ x: -11.5, z }, { x: 11.5, z }, 2.4])]
      : spots.map((d) => [{ x: d.dir.x * 3.2, z: d.dir.z * 3.2 }, d.door, 2.4]);
    const onPath = (x, z, pad) => Math.hypot(x, z) < (this.kind === 'academy' ? 4.4 : 6.5) + pad || paths.some(([a, b, w]) => {
      const L = Math.hypot(b.x - a.x, b.z - a.z) || 1, ux = (b.x - a.x) / L, uz = (b.z - a.z) / L, t = (x - a.x) * ux + (z - a.z) * uz;
      return t > -pad && t < L + pad && Math.abs((x - a.x) * uz - (z - a.z) * ux) < w / 2 + pad;
    });
    for (const [a, b, w] of paths) {
      const L = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
      const p = mesh(box, C.path, (a.x + b.x) / 2, 0.04, (a.z + b.z) / 2, w, 0.06, L);
      p.rotation.y = Math.atan2(ux, uz);
      for (const s of [-1, 1]) for (let k = 2; k < L; k += 4) { // petites lanternes (et fleurs) le long du chemin, jamais sur une autre allée
        const x = a.x + ux * k + uz * s * (w / 2 + 0.5), z = a.z + uz * k - ux * s * (w / 2 + 0.5);
        if (onPath(x, z, 0.5)) continue;
        if ((k / 4) % 2 < 1 || this.kind === 'village') put('custom/stone-lantern', x, z, 1.1);
        else { const f = P.make && P.make(['pf:flowers', 'k:flower_redA', 'k:flower_yellowA'][k % 3], { grass: C.grass }); if (f) { f.position.set(x, 0, z); scene.add(f); } }
      }
    }
    // Les bâtiments (un par lieu), la façade tournée vers la fontaine (côté -z du groupe)
    this.buildings = {};
    for (const d of spots) {
      const grp = new T.Group(); grp.position.set(d.pos.x, 0, d.pos.z); grp.rotation.y = Math.atan2(-d.dir.x, -d.dir.z) + Math.PI;
      scene.add(grp);
      const h = this.makeBuilding(d, grp, K);
      this.buildings[d.id] = { grp, h };
    }
    // Décor tout autour (arbres du parc, ou objets des paysages du pays), plus ou moins selon la machine
    const nTrees = S.Q && S.Q.decor < 40 ? 14 : 26;
    const kitProps = this.w ? this.w.biomes.flatMap((b) => ((KITS[b.kit] || {}).props || []).map((pp) => pp[0])) : null;
    for (let i = 0; i < nTrees; i++) {
      const a = (i / nTrees) * Math.PI * 2 + 0.13, r = 34 + (i % 3) * 3;
      if (this.kind === 'academy' && Math.cos(a) * r > 20) continue; // (rien devant le château : la caméra regarde par là)
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
    this.overview = this.kind === 'academy' ? [new T.Vector3(0, 50, 44), new T.Vector3(0, 0, -1)] : [new T.Vector3(0, 30, 40), new T.Vector3(0, 1, -7)];
    this.camPos = this.overview[0].clone(); this.camLook = this.overview[1].clone();
    this.navCam = new T.PerspectiveCamera(50, 16 / 9, 0.1, 200); this.navCam.position.copy(this.overview[0]); this.navCam.lookAt(this.overview[1]); this.navCam.updateMatrixWorld(); // (ordre des lieux à l'écran, vue d'ensemble)
    this.cam.position.copy(this.camPos);
    this.labels = {};
    this.pos = { x: 0, z: 4.5 }; this.yaw = Math.PI; this.mode = 'choose'; this.lastSay = {}; this.moveK = 0; // (dessiné dès le calibrage, avant enter)
  }
  // Les remparts du château : cour pavée et pelouses, murs crénelés, tours d'angle, grande porte du donjon au fond,
  // rempart bas à l'entrée (la caméra regarde par-dessus) et la tour de la directrice (la chouette veille sur la cour)
  makeCastle(k) {
    const { mesh, box, cyl, cone, ball } = k, S = this.S, T = S.T, scene = this.scene, anims = (this.anims = this.anims || []);
    const stone = '#e4ddf0', stone2 = '#c3b8de', roof = '#7b2cbf', lawn = shade(this.colors.grass, 0.1);
    mesh(box, '#ddd3c2', 0, 0.02, -0.5, 37, 0.04, 33); // (pavés de la cour)
    for (const sx of [-1, 1]) for (const [z0, z1] of [[-15.6, -12.4], [-9.6, -1.4], [1.4, 9.6], [12.4, 15.6]]) { // pelouses entre les allées
      mesh(box, lawn, sx * 6.6, 0.05, (z0 + z1) / 2, 8.8, 0.06, z1 - z0);
      for (let n = 0; n < 2; n++) mesh(ball, n ? '#ff8fab' : '#ffd166', sx * (3.4 + n * 6.4), 0.25, (z0 + z1) / 2 + (n ? 1 : -1) * 1.2, 0.3, 0.3, 0.3); // (petites fleurs)
    }
    const wall = (x1, z1, x2, z2, h, th = 1.6) => {
      const L = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(x2 - x1, z2 - z1);
      mesh(box, stone, (x1 + x2) / 2, h / 2, (z1 + z2) / 2, th, h, L).rotation.y = ang;
      const n = Math.max(1, Math.round(L / 1.8));
      for (let i = 0; i < n; i += 2) { const t = (i + 0.5) / n; mesh(box, stone2, x1 + (x2 - x1) * t, h + 0.4, z1 + (z2 - z1) * t, th + 0.15, 0.8, 0.9).rotation.y = ang; } // (créneaux)
    };
    const tower = (x, z, r, h, col = roof) => {
      mesh(cyl, stone, x, h / 2, z, r, h, r); mesh(cyl, stone2, x, h + 0.3, z, r + 0.25, 0.6, r + 0.25);
      mesh(cone, col, x, h + 0.6 + r * 0.8, z, r + 0.4, r * 1.6, r + 0.4);
      mesh(ball, '#ffd166', x, h + 0.7 + r * 1.6, z, 0.25, 0.25, 0.25, scene, { emissive: '#ffd166', emissiveIntensity: 0.5 });
    };
    wall(-19, -17, -19, 17, 4.5); wall(19, -17, 19, 17, 4.5); // (remparts des côtés)
    wall(-19, -17, -4, -17, 4.5); wall(4, -17, 19, -17, 4.5); // (rempart du fond, ouvert sur le donjon)
    wall(-19, 17, -3.8, 17, 1.4); wall(3.8, 17, 19, 17, 1.4); // (rempart de l'entrée, bas)
    for (const sx of [-1, 1]) { tower(sx * 19, -17, 2.4, 10); tower(sx * 19, 17, 1.8, 3); tower(sx * 4.6, -17, 1.5, 7.5); }
    mesh(box, stone2, 0, 7.2, -17, 9.5, 1.2, 1.9); // (arche de la grande porte du donjon)
    // La tour de la directrice (la Salle des Défis) : la plus haute, une fenêtre allumée et Madame Pimprenelle au balcon
    tower(10, -17, 2.3, 13, '#3a86ff');
    mesh(cyl, '#fff3b0', 10, 10.5, -14.75, 0.8, 0.1, 0.8, scene, { emissive: '#ffd166', emissiveIntensity: 0.8 }).rotation.x = Math.PI / 2;
    mesh(cyl, stone2, 10, 8.6, -14.2, 1.3, 0.3, 1.3); // (balcon)
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d'); x.font = '104px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🦉', 64, 70);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    const owl = new T.Sprite(new T.SpriteMaterial({ map: tex })); owl.scale.set(2.4, 2.4, 1); owl.position.set(10, 10, -13.6); scene.add(owl);
    anims.push((t) => { owl.position.y = 10 + Math.abs(Math.sin(t * 0.002)) * 0.25; });
    // Drapeaux aux couleurs de l'Académie sur les tours d'angle du fond
    for (const sx of [-1, 1]) {
      mesh(cyl, '#6d6875', sx * 19, 16.2, -17, 0.06, 2.4, 0.06);
      const f = mesh(box, sx < 0 ? '#ffd166' : '#ff70a6', sx * 19 + 0.7, 16.8, -17, 1.4, 0.8, 0.05);
      anims.push((t) => { f.rotation.y = Math.sin(t * 0.003 + sx) * 0.3; });
    }
  }

  // Tour d'un cours dans le rempart (toit à sa couleur, porte et fenêtres côté cour, bannière) ; renvoie sa hauteur
  makeTower(g, k, col, h = 8) {
    const { mesh, box, cyl, cone } = k, stone = '#e4ddf0';
    mesh(cyl, stone, 0, h / 2, 0.4, 2.7, h, 2.7, g); mesh(cyl, '#c3b8de', 0, h + 0.3, 0.4, 2.95, 0.6, 2.95, g);
    mesh(cone, col, 0, h + 2.6, 0.4, 3.3, 4, 3.3, g);
    mesh(box, '#5a3e2b', 0, 1.3, -2.25, 1.6, 2.6, 0.2, g); mesh(cyl, '#5a3e2b', 0, 2.6, -2.25, 0.8, 0.2, 0.8, g).rotation.x = Math.PI / 2; // (porte en arc)
    for (const y of [4.6, 6.4]) mesh(box, '#fff3b0', 0, y, -2.3, 0.7, 0.9, 0.12, g);
    mesh(box, col, 1.6, h - 1.6, -1.9, 0.9, 2.2, 0.08, g).rotation.y = -0.6; mesh(box, col, -1.6, h - 1.6, -1.9, 0.9, 2.2, 0.08, g).rotation.y = 0.6; // (bannières)
    return h + 4.6;
  }

  // Un bâtiment par cours (modèles du jeu et formes simples) : au château, une tour dans le rempart et, devant elle dans
  // la cour, ce qui raconte le cours (scène de danse, chaudron, terrain…) ; renvoie la hauteur (pour le panneau)
  makeBuilding(d, g, k) {
    const { mesh, put, box, cyl, cone, ball } = k, S = this.S, T = S.T, id = d.id;
    const anims = (this.anims = this.anims || []);
    if (d.kind === 'stage') return this.makeGate(d, g, k);
    if (d.kind !== 'world') return this.makePortal(d, g, k);
    const th = CASTLE_ROOF[id] ? this.makeTower(g, k, CASTLE_ROOF[id]) : 0;
    switch (id) {
      case 'ecole': { // le donjon de l'Académie, derrière la grande porte
        if (!put('custom/castle', 0, 0, 17, Math.PI, g)) {
          mesh(box, '#f6e8ff', 0, 4, 0, 14, 8, 5, g);
          for (const x of [-7, 7]) { mesh(cyl, '#e0c3fc', x, 6, 0, 1.6, 12, 1.6, g); mesh(cone, '#9d4edd', x, 13.5, 0, 2, 3.5, 2, g); }
        }
        return 17;
      }
      case 'defis': { // la Salle des Défis (la tour est celle des remparts) : un grand miroir magique doré et une coupe
        mesh(box, '#ffd166', 0, 2.2, -4.2, 3.2, 4.2, 0.35, g, { emissive: '#ffd166', emissiveIntensity: 0.25 });
        const glass = mesh(box, '#bde0fe', 0, 2.2, -4.42, 2.6, 3.6, 0.05, g, { emissive: '#c77dff', emissiveIntensity: 0.4 });
        mesh(cone, '#ffd166', 0, 4.7, -4.2, 0.6, 0.8, 0.6, g);
        for (const x of [-2.6, 2.6]) { mesh(cyl, '#adb5bd', x, 0.6, -4.6, 0.35, 1.2, 0.35, g); mesh(cyl, '#ffd166', x, 1.6, -4.6, 0.45, 0.8, 0.45, g, { emissive: '#ffd166', emissiveIntensity: 0.3 }); } // (coupes)
        anims.push((t) => { glass.material.emissiveIntensity = 0.3 + 0.25 * Math.sin(t * 0.003); });
        return 13.5;
      }
      case 'jardin3d': { // la serre : massif de fleurs et arche de verdure devant la tour
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, f = S.P.make && S.P.make(['k:flower_redA', 'k:flower_yellowA', 'k:flower_purpleA', 'pf:flowers'][i % 4], { grass: '#7ccf6a' }); if (f) { f.position.set(Math.sin(a) * 1.9, 0, -4.6 + Math.cos(a) * 1.2); g.add(f); } }
        const arch = new T.Mesh(new T.TorusGeometry(1.9, 0.3, 10, 24, Math.PI), S.lam('#4f9a52')); arch.position.set(0, 0, -6.2); arch.castShadow = true; g.add(arch);
        for (let i = 0; i < 6; i++) mesh(ball, ['#ff8fab', '#ffd166', '#c77dff'][i % 3], Math.cos((i / 5) * Math.PI) * 1.9, Math.sin((i / 5) * Math.PI) * 1.9, -6.2, 0.26, 0.26, 0.26, g);
        put('custom/cherry-tree-a', -3.4, -3.2, 4, 0, g); put('custom/cherry-tree-a', 3.4, -3.4, 3.6, 1, g);
        return th;
      }
      case 'disco': { // la salle de danse : estrade, arche lumineuse, boule à facettes
        mesh(box, '#3c096c', 0, 0.3, -4.6, 6.4, 0.6, 3.8, g);
        const arch = new T.Mesh(new T.TorusGeometry(2.8, 0.26, 10, 28, Math.PI), S.lam('#f15bb5', { emissive: '#f15bb5', emissiveIntensity: 0.6 })); arch.position.set(0, 0.6, -3.4); g.add(arch);
        const disco = new T.Mesh(new T.IcosahedronGeometry(0.7, 1), new T.MeshLambertMaterial({ color: '#e0e0ff', emissive: '#8888ff', emissiveIntensity: 0.4, flatShading: true }));
        disco.position.set(0, 4.2, -3.6); g.add(disco);
        const tiles = [0, 1, 2, 3, 4, 5].map((i) => mesh(box, ['#f15bb5', '#4cc9f0', '#ffd166'][i % 3], -2 + (i % 3) * 2, 0.62, -5.4 + Math.floor(i / 3) * 1.6, 1.7, 0.04, 1.4, g, { emissive: ['#f15bb5', '#4cc9f0', '#ffd166'][i % 3], emissiveIntensity: 0.3 }));
        anims.push((t) => { disco.rotation.y = t * 0.001; arch.material.emissiveIntensity = 0.4 + 0.4 * Math.abs(Math.sin(t * 0.004)); tiles.forEach((m, i) => { m.material.emissiveIntensity = (Math.floor(t / 400) + i) % 3 ? 0.15 : 0.7; }); });
        return th;
      }
      case 'dojo': { // la pagode du dojo, dans le rempart, et son portique dans la cour
        if (!put('custom/pagoda', 0, 0.6, 11, 0, g)) for (let i = 0; i < 3; i++) { mesh(box, '#f2e8cf', 0, 1.2 + i * 2.6, 0.6, 5 - i, 2, 5 - i, g); mesh(cone, '#bc4749', 0, 2.6 + i * 2.6, 0.6, 3.6 - i * 0.6, 1, 3.6 - i * 0.6, g); }
        put('custom/torii', 0, -5, 3.8, 0, g);
        return 11;
      }
      case 'verger': { // l'atelier des potions : un gros chaudron qui bouillonne et fume vert devant la tour
        mesh(cyl, '#2b2d42', 0, 0.75, -4.6, 1.2, 1.4, 1.2, g); const brew = mesh(cyl, '#70e000', 0, 1.48, -4.6, 1.05, 0.05, 1.05, g, { emissive: '#70e000', emissiveIntensity: 0.6 });
        for (const x of [-2.6, 2.6]) { mesh(box, '#8d5a3b', x, 0.5, -4.2, 1.4, 1, 1, g); for (let i = 0; i < 3; i++) mesh(cyl, ['#ff70a6', '#4cc9f0', '#ffd166'][i], x - 0.45 + i * 0.45, 1.3, -4.2, 0.16, 0.6, 0.16, g, { emissive: ['#ff70a6', '#4cc9f0', '#ffd166'][i], emissiveIntensity: 0.4 }); } // (étagères de fioles)
        const puffs = [0, 1, 2, 3].map(() => mesh(ball, '#b9fbc0', 0, 2, -4.6, 0.4, 0.4, 0.4, g, { transparent: true, opacity: 0.7 }));
        const bubbles = [0, 1, 2].map(() => mesh(ball, '#ccff33', 0, 1.5, -4.6, 0.15, 0.15, 0.15, g, { emissive: '#ccff33', emissiveIntensity: 0.5 }));
        anims.push((t) => {
          puffs.forEach((p, i) => { const q = (t * 0.0003 + i / 4) % 1; p.position.set(Math.sin(q * 6) * 0.4, 1.8 + q * 4, -4.6); p.scale.setScalar(0.3 + q * 0.8); });
          bubbles.forEach((b, i) => { const q = (t * 0.0012 + i / 3) % 1; b.position.set(Math.sin(i * 2) * 0.5, 1.5 + q * 0.6, -4.6 + Math.cos(i * 2) * 0.5); b.scale.setScalar(0.15 * (1 - q)); });
          brew.material.emissiveIntensity = 0.5 + 0.2 * Math.sin(t * 0.005);
        });
        return th;
      }
      case 'stade': { // le terrain de la récré : pelouse rayée, but et panier
        mesh(box, '#57cc99', 0, 0.08, -5, 7.4, 0.1, 4.6, g);
        for (const x of [-3.6, 0, 3.6]) mesh(box, '#ffffff', x, 0.14, -5, 0.1, 0.02, 4.6, g);
        for (const x of [-1, 1]) mesh(cyl, '#ffffff', x - 2, 0.7, -3, 0.07, 1.4, 0.07, g);
        mesh(cyl, '#ffffff', -2, 1.4, -3, 0.07, 2, 0.07, g).rotation.z = Math.PI / 2;
        mesh(cyl, '#adb5bd', 2.6, 1.6, -3, 0.08, 3.2, 0.08, g); mesh(box, '#ffffff', 2.6, 3.3, -3.2, 1.3, 0.9, 0.08, g);
        const rim = new T.Mesh(new T.TorusGeometry(0.3, 0.04, 8, 20), S.lam('#f76707')); rim.position.set(2.6, 3.0, -3.6); rim.rotation.x = Math.PI / 2; g.add(rim);
        mesh(ball, '#ffffff', -0.8, 0.35, -5.4, 0.3, 0.3, 0.3, g); mesh(ball, '#f76707', 1.2, 0.35, -5, 0.32, 0.32, 0.32, g);
        return th;
      }
      case 'singes': { // la tour des singes farceurs (un singe tout en haut, des traces de mousse partout)
        mesh(cyl, '#d6ccc2', 0, 4.5, 0.4, 2.4, 9, 2.4, g); mesh(cone, '#bc6c25', 0, 10.6, 0.4, 3, 3.2, 3, g);
        for (const y of [3.4, 6]) mesh(box, '#a2d2ff', 0, y, -2, 0.9, 1.1, 0.2, g);
        mesh(box, '#5a3e2b', 0, 1.2, -2, 1.3, 2.4, 0.2, g);
        const mk = creaturesByModel('pets/animal-monkey');
        if (mk) { try { const m = buildCreature3D(S, mk, false); m.group.scale.multiplyScalar(0.9); m.group.position.set(1.4, 9.1, -1.4); m.group.rotation.y = Math.PI; g.add(m.group); anims.push((t) => m.animate(t, Math.sin(t * 0.0013) > 0.4 ? 'happy' : 'idle')); } catch (e) { /* (singe indisponible) */ } }
        for (let i = 0; i < 3; i++) mesh(ball, '#f3f7ff', -1.2 + i * 1.1, 2.4 + i * 1.7, -2.1, 0.35, 0.3, 0.15, g); // (traces de mousse)
        for (let i = 0; i < 5; i++) mesh(ball, '#f3f7ff', -2 + i, 0.15, -3.5 - (i % 2) * 1.4, 0.45, 0.2, 0.45, g);
        put('kaykit/re-crate_carrots', 2.4, -4, 0.6, 0.4, g);
        return 12;
      }
      case 'supermarche': { // le marché aux ingrédients : trois étals à auvent rayé devant la tour
        for (const [x, c] of [[-2.5, '#ef476f'], [0, '#06d6a0'], [2.5, '#ffd166']]) {
          mesh(box, '#8d5a3b', x, 0.55, -4.4, 2, 1.1, 1.2, g);
          for (let i = 0; i < 4; i++) mesh(box, i % 2 ? '#ffffff' : c, x - 0.75 + i * 0.5, 2.4, -4.5, 0.5, 0.13, 1.6, g).rotation.x = -0.25;
          for (const sx of [-1, 1]) mesh(cyl, '#6b4226', x + sx * 0.9, 1.25, -3.9, 0.06, 2.5, 0.06, g);
        }
        put('kaykit/re-crate_carrots', -2.5, -4.4, 0.45, 0, g); put('kaykit/re-crate_tomatoes', 0, -4.4, 0.45, 0, g); put('kaykit/re-crate_lettuce', 2.5, -4.4, 0.45, 0, g);
        return th;
      }
    }
    return th || 4;
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
    const icon = !d.open ? '' : d.kind === 'world' ? HUB_ICONS[d.id] || '⭐' : d.kind === 'stage' ? (d.boss ? '👑' : ['1️⃣', '2️⃣', '3️⃣'][d.k] || '⭐') : '';
    if (this.kind === 'academy') return this.flatLabel(d, key, icon);
    // (canevas : la grosse icône en haut, le panneau en dessous)
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 400;
    const x = cv.getContext('2d');
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
    sp.center.set(0.5, 0.32); sp.userData.ar = 400 / 512; // (le point d'accroche reste au milieu du panneau)
    sp.userData.base = d.kind === 'academy' ? 0.6 : this.kind === 'academy' ? 0.9 : 1; // (portail du retour, tout près de la caméra : panneau plus petit ; château : vu de haut, des tours serrées)
    sp.scale.set(7 * sp.userData.base, 5.47 * sp.userData.base, 1);
    const lp = this.spotOf(d, true); sp.position.set(lp.x, lp.y, lp.z);
    this.scene.add(sp);
    this.labels[d.id] = { key, sp };
    return sp;
  }

  // Panneau du château : plat (les tours d'un même rempart sont proches à l'écran), grosse icône à gauche, nom et
  // étoiles à droite ; fermé : juste un cadenas
  flatLabel(d, key, icon) {
    const T = this.S.T, cv = document.createElement('canvas'), x = cv.getContext('2d');
    cv.width = 640; cv.height = 224;
    const lock = !d.open, x0 = lock ? 200 : 8, x1 = lock ? 440 : 632;
    x.fillStyle = lock ? 'rgba(60,50,110,.88)' : d.next ? '#ffd166' : 'rgba(255,255,255,.95)';
    x.beginPath(); x.roundRect(x0, 12, x1 - x0, 200, 50); x.fill();
    x.lineWidth = 10; x.strokeStyle = '#7b2cbf'; x.stroke();
    x.textBaseline = 'middle'; x.fillStyle = lock ? '#ffffff' : '#1e1b4b';
    if (lock) { x.textAlign = 'center'; x.font = '800 92px "Baloo 2", sans-serif'; x.fillText('🔒 ?', 320, 116); }
    else {
      const tx = icon ? 172 : 30, tw = 632 - tx - 24;
      if (icon) { x.textAlign = 'center'; x.font = '118px serif'; x.fillText(icon, 92, 118); }
      x.textAlign = 'left'; x.font = '800 54px "Baloo 2", sans-serif';
      const words = d.name.split(' ');
      let lines = [d.name];
      if (x.measureText(d.name).width > tw && words.length > 1) {
        let best = 1, bw = 1e9;
        for (let i = 1; i < words.length; i++) { const w = Math.max(x.measureText(words.slice(0, i).join(' ')).width, x.measureText(words.slice(i).join(' ')).width); if (w < bw) { bw = w; best = i; } }
        lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
      }
      const stars = d.kind === 'world';
      const y0 = (stars ? 92 : 116) - (lines.length - 1) * 27;
      lines.forEach((l, i) => x.fillText(l, tx, y0 + i * 54, tw));
      if (stars) { x.font = '44px serif'; x.fillText([0, 1, 2].map((i) => (i < d.stars ? '⭐' : '☆')).join(' '), tx, y0 + lines.length * 54 + 4); }
    }
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false }));
    sp.userData.ar = 224 / 640; sp.userData.base = d.kind === 'world' ? 1.5 : 1.2;
    sp.scale.set(7 * sp.userData.base, 7 * sp.userData.base * sp.userData.ar, 1);
    const lp = this.spotOf(d, true); sp.position.set(lp.x, lp.y, lp.z);
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
    if (this.kind === 'academy' && !this.places.some((d) => d.next)) { const pt = this.places.find((d) => d.id === 'portal' && d.open); if (pt) { pt.next = true; this.label(pt); } } // (tous les cours faits : le portail brille, et son panneau est doré)
    // (d'où l'on arrive : la porte de ce lieu ; un autre pays : son portail ; sinon le milieu de la place)
    const from = this.places.find((d) => d.id === fromId || (d.kind === 'country' && d.w.id === fromId));
    this.pos = from ? { ...from.door } : { x: 0, z: 4.5 }; this.at = from || null;
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
    if (title) title.textContent = this.kind === 'village' ? `🌀 ${this.w.name}` : "🏰 Château de l'Académie";
    if (this.guardian) { const n = Stages.count(this.w) || 1; this.guardian.friend = n > 1 ? Stages.dots(this.w) === n : Progress.stars(this.w) > 0; }
    this.mode = 'choose'; this.target = null; this.route = null; this.charge = 0; this.ptr = null;
    this.block = null; this.trips = this.trips || 0; this.moveK = 0; this.t0 = performance.now();
    this.hover = this.defaultHover(from); this.sideWas = 'center'; this.idle = 0;
    this.enterT = 0; this.lastSay = {};
    // (on arrive souvent les bras encore en l'air : calibrage, « lève les bras pour continuer » ; ce geste-là ne doit pas
    // lancer tout de suite le lieu choisi : il faut d'abord baisser les bras un instant)
    this.needDown = true; this.downT = 0; this.downHint = false;
    S.mirror = false;
    // Au village, pas besoin de choisir : le petit sorcier part tout seul vers l'étape suivante (ou le pays suivant) après
    // quelques secondes ; un pas de côté annule, pour choisir autre chose. (Arrivée par le portail : on ne choisit qu'une fois)
    const fromCourse = from && (from.kind === 'stage' || from.kind === 'world');
    this.autoGo = this.kind === 'village' && this.hover && this.hover.next ? this.hover : null;
    this.autoT = performance.now() + (fromCourse ? 2000 : 3500); this.autoDur = 2.5;
    this.say(this.kind === 'village' ? (fromCourse ? 'villageBack' : 'village') : from ? 'back' : 'hello', 0); // (au retour d'un cours : une phrase courte)
    this.hint(this.autoGo ? '✨ On y va tout seul… · 👣 Pas de côté : choisir autre chose' : '🙌 Bras levés : on y va · 👣 Pas de côté : changer');
  }
  say(k, cool = 9000) { const now = performance.now(); if (now - (this.lastSay[k] || -1e9) < cool) return; this.lastSay[k] = now; Audio8.say(HUB_SAY[k]); }
  hint(t) { const el = document.getElementById('hubHint'); if (el && el.textContent !== t) el.textContent = t; }

  // ---------- Commandes : pas de côté (changer de lieu), bras levés (y aller)
  defaultHover(from = null) { // le prochain cours / la prochaine étape, sinon le lieu d'où l'on vient, sinon le premier ouvert
    const L = this.navList();
    return L.find((d) => d.next) || (from && from.open && L.includes(from) ? from : null) || L.find((d) => d.kind === 'world' || d.kind === 'stage') || L[0] || null;
  }
  navList() { // lieux ouverts, de gauche à droite à l'écran (vue d'ensemble), puis de haut en bas
    const key = (d) => { const q = new this.S.T.Vector3(...['x', 'y', 'z'].map((k) => this.spotOf(d, false)[k])).project(this.navCam); return [q.x, -q.y]; };
    return this.places.filter((d) => d.open).map((d) => ({ d, k: key(d) })).sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1]).map((o) => o.d);
  }
  move(dir) {
    const L = this.navList(); if (!L.length) return;
    const i = L.indexOf(this.hover);
    this.hover = L[i < 0 ? 0 : (i + dir + L.length) % L.length]; this.charge = 0; this.hoverT = performance.now();
    Audio8.sparkle(0.5);
  }
  sideNow() { for (const b of tracker.bodies) if (b.state.present || tracker.sim) return b.state.side || 'center'; return 'center'; }
  armsUp() { return tracker.bodies.some((b) => (b.state.present || tracker.sim) && b.state.armsUp); }
  armUp() { // un bras levé suffit (sort lancé à la créature du chemin)
    return tracker.bodies.some((b) => {
      if (tracker.sim) return b.state.armsUp;
      if (!b.lm || !b.state.present) return false;
      const ny = b.lm[0].y; return b.state.armsUp || b.lm[15].y < ny || b.lm[16].y < ny;
    });
  }
  screenOfObj(v, dy = 0) {
    const T = this.S.T, q = new T.Vector3(v.x, v.y + dy, v.z).project(this.cam);
    return { x: (q.x + 1) / 2, y: (1 - q.y) / 2, behind: q.z > 1 };
  }
  screenOf(d) { return this.screenOfObj(this.spotOf(d, false)); }
  // Point du lieu (anneau, rayon : lab = false) ou point d'accroche de son panneau (lab = true)
  spotOf(d, lab) {
    const b = this.buildings[d.id], h = b ? b.h : 5;
    if (d.id === 'ecole') return lab ? { x: 0, y: 9.5, z: -16 } : { x: 0, y: 4.5, z: -18 }; // (donjon : au-dessus de la grande porte)
    if (d.id === 'portal' && d.side) return lab ? { x: 0, y: 4.6, z: 19.5 } : { x: 0, y: 2.4, z: 17 }; // (grande porte de l'entrée : panneau juste devant)
    if (d.side && d.kind === 'world') return lab ? { x: d.pos.x - d.dir.x * 1.2, y: h + 1.6, z: d.pos.z - d.dir.z * 1.2 } : { x: d.pos.x - d.dir.x * 2.5, y: 3.6, z: d.pos.z - d.dir.z * 2.5 };
    if (d.kind === 'academy') return lab ? { x: d.pos.x, y: 3.2, z: d.pos.z + 1.5 } : { x: d.pos.x, y: h * 0.55, z: d.pos.z }; // (portail du retour, tout près de la caméra : panneau bas)
    return { x: d.pos.x, y: lab ? h + 2.4 : h * 0.55, z: d.pos.z };
  }

  choose(d, now) {
    if (!d.open) { Audio8.soft(); this.say({ portal: 'portalLocked', stage: 'stageLocked', country: 'countryLocked' }[d.kind] || 'locked', 4000); this.charge = 0; return; }
    this.target = d; this.mode = 'walk'; this.charge = 0; this.trips++;
    // (par les allées : retour à la fontaine par le chemin d'où l'on vient, puis le chemin du lieu choisi)
    const back = this.at ? this.at.route.slice(0, -1).reverse() : Math.hypot(this.pos.x, this.pos.z) < 5 ? [] : [{ x: 0, z: 0 }]; // (déjà près de la fontaine : on part directement)
    const route = [{ ...this.pos }, ...back, ...d.route.slice(1)];
    this.route = route.filter((q, i) => !i || Math.hypot(q.x - route[i - 1].x, q.z - route[i - 1].z) > 0.01);
    this.seg = 0; this.walked = 0;
    this.blockAt = (typeof DEV !== 'undefined' && DEV.get('hubblock')) || (this.trips > 1 && Math.random() < 0.45) ? 0.55 : null; // (une créature ensorcelée sur le chemin, une fois sur deux à peu près)
    { const q = this.screenOf(d); Audio8.spell(); this.S.burst(q.x * this.S.W, q.y * this.S.H, 30, ['#ffd166', '#ff70a6', '#ffffff', '#c77dff']); }
    Audio8.say(d.kind === 'world' || d.kind === 'stage' ? HUB_SAY.go : HUB_SAY.travel);
    this.hint(this.goHint());
  }
  goHint() {
    const d = this.target;
    return '✨ En route ' + ({ world: () => 'à : ' + d.w.name, stage: () => `à l'étape ${d.k + 1}`, portal: () => 'au portail des aventures',
      academy: () => "à l'Académie", country: () => 'vers : ' + d.w.name }[d.kind] || (() => ''))() + ' !';
  }

  // ---------- Logique (appelée à chaque image de la boucle du jeu)
  update(now) {
    if (!this.scene || !this.places) return;
    const dt = Math.min(0.1, Math.max(0, (now - (this.lastT || now)) / 1000)); this.lastT = now;
    const W = this.S.W, H = this.S.H, auto = typeof DEV !== 'undefined' && DEV.get('hubauto');
    if (this.mode === 'choose') {
      if (!this.hover || !this.hover.open) this.hover = this.defaultHover();
      // (un pas de côté : le lieu voisin ; on revient au milieu pour recommencer, ou on reste sur le côté : ça continue)
      const side = this.sideNow();
      if (side !== this.sideWas) {
        this.sideWas = side; this.sideT = now;
        if (side !== 'center') { this.move(side === 'left' ? -1 : 1); if (this.autoGo) { this.autoGo = null; this.hint('🙌 Bras levés : on y va · 👣 Pas de côté : changer'); } } // (on choisit soi-même)
      }
      else if (side !== 'center' && now - this.sideT > 1300) { this.sideT = now; this.move(side === 'left' ? -1 : 1); }
      const raised = this.armsUp();
      if (this.needDown) { if (raised) this.downT = 0; else if (!this.downT) this.downT = now; else if (now - this.downT > 400) { this.needDown = false; if (this.downHint) this.hint(this.autoGo ? '✨ On y va tout seul… · 👣 Pas de côté : choisir autre chose' : '🙌 Bras levés : on y va · 👣 Pas de côté : changer'); } }
      if (this.needDown && raised && now - this.t0 > 2500) { this.downHint = true; this.hint('👇 Baisse les bras… puis lève-les pour y aller'); }
      const up = (raised && !this.needDown) || (auto && now - this.t0 > 1500);
      if (up && this.hover) {
        this.charge = Math.min(1, this.charge + dt / (tracker.bodies.some((b) => b.easy) ? 0.6 : 0.8));
        if (now - (this.hum || 0) > 200) { this.hum = now; Audio8.sparkle(this.charge); }
      } else if (this.autoGo && this.hover === this.autoGo && now > this.autoT) this.charge = Math.min(1, this.charge + dt / this.autoDur); // (départ tout seul)
      else this.charge = Math.max(0, this.charge - dt * 1.5);
      if (this.hover && (this.charge >= 1 || this.keyGo)) { this.keyGo = false; this.choose(this.hover, now); }
      // (rien ne se passe depuis un moment : la voix rappelle comment faire)
      if (up || side !== 'center' || this.autoGo) this.idle = 0; else if ((this.idle += dt) > 12) { this.idle = 0; this.say('aim', 20000); }
    } else if (this.mode === 'walk') {
      this.moveK = Math.min(1, this.moveK + dt * 2.5); // (le petit sorcier y va tout seul : il accélère, puis file)
      let step = (2 + 8 * this.moveK) * dt;
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
      if (this.seg >= this.route.length - 1) { this.at = this.target; this.mode = 'enter'; this.enterT = now; Audio8.say(HUB_SAY.enter); Audio8.perfect(); }
    } else if (this.mode === 'block') {
      const bk = this.block, s = this.screenOfObj(bk.c.group.position, 0.8);
      bk.aimed = this.armUp() || (!!auto && auto !== '2'); // (hubauto=2 : ne lance pas le sort)
      if (bk.aimed || (tracker.sim && (this.keyGo || now - bk.t0 > 2500))) {
        bk.charge = Math.min(1, bk.charge + dt / 0.9); this.keyGo = false;
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
    c.group.scale.multiplyScalar(1.3); c.group.position.set(this.pos.x + fw.x * 4.5, 0, this.pos.z + fw.z * 4.5);
    c.group.rotation.y = this.yaw + Math.PI;
    this.scene.add(c.group);
    this.block = { c, cr, t0: performance.now(), charge: 0, free: 0 };
    this.mode = 'block'; Audio8.cry(cr.id); this.say('block', 0);
    this.hint('🪄 Lève le bras pour lancer un sort à la créature !');
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
    if (h.human && h.human.cur && pose === 'run') h.human.cur.timeScale = this.mode === 'walk' ? 0.8 + this.moveK * 0.9 : 1;
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
    if (this.calin && this.calin.group.visible) { this.calin.group.position.set(Math.sin(now * 0.0004) * 5, 9 + Math.sin(now * 0.002) * 0.4, -4 + Math.cos(now * 0.0004) * 2); this.calin.animate(now, 'happy'); }
    if (this.crystal) { this.crystal.rotation.y = now * 0.001; this.crystal.position.y = 2.4 + Math.sin(now * 0.002) * 0.15; }
    if (this.guardian) { const gc = this.guardian.c; gc.animate(now, this.guardian.friend ? (Math.sin(now * 0.001) > 0.3 ? 'happy' : 'idle') : 'idle'); gc.group.rotation.z = this.guardian.friend ? 0 : Math.sin(now * 0.004) * 0.05; }
    // Caméra : vue d'ensemble pour choisir ; derrière le petit sorcier quand il marche
    const follow = this.mode !== 'choose';
    const fw = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
    // (plus haut que le petit sorcier, pour voir devant lui ; face à une créature : encore plus haut, cadrée sur elle)
    const bk = this.block && !this.block.free ? this.block.c.group.position : null;
    let wantP = follow ? new T.Vector3(px - fw.x * (bk ? 5 : 7), bk ? 8.5 : 6.5, pz - fw.z * (bk ? 5 : 7)) : this.overview[0];
    const wantL = !follow ? this.overview[1] : bk ? new T.Vector3(bk.x, 1, bk.z) : new T.Vector3(px + fw.x * 6, 1, pz + fw.z * 6);
    if (follow && this.kind === 'academy') wantP = new T.Vector3(Math.max(-15, Math.min(15, wantP.x)), wantP.y, Math.max(-14.5, Math.min(30, wantP.z))); // (jamais dans un rempart ou une tour)
    const k = Math.min(1, dt * (follow ? 2.4 : 1.6));
    this.camPos.lerp(wantP, k); this.camLook.lerp(wantL, k);
    this.cam.position.copy(this.camPos); this.cam.lookAt(this.camLook);
    // Panneaux lointains agrandis : ils restent lisibles au fond du parc (et l'icône se voit de loin)
    for (const lb of Object.values(this.labels || {})) {
      const k2 = lb.sp.userData.base * Math.max(1, Math.min(this.kind === 'academy' ? 1.4 : 2.2, lb.sp.position.distanceTo(this.camPos) / (this.kind === 'academy' ? 55 : 38)));
      lb.sp.scale.set(7 * k2, 7 * k2 * lb.sp.userData.ar, 1);
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
      if (this.hover) { // le lieu choisi : grand anneau qui se remplit (bras levés), petits pas de chaque côté
        const s = this.screenOf(this.hover), pop = Math.max(0, 1 - (now - (this.hoverT || 0)) / 300), r = M * (0.085 + pop * 0.03);
        ctx.fillStyle = 'rgba(255,209,102,.18)'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, r, 0, 6.29); ctx.fill();
        ring(s.x * W, s.y * H, r, this.charge);
        ctx.fillStyle = '#ffffff'; ctx.font = `${M * 0.045}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('👣', s.x * W - r - M * 0.04, s.y * H); ctx.fillText('👣', s.x * W + r + M * 0.04, s.y * H);
        if (this.charge === 0) { ctx.font = `${M * 0.05 * (1 + 0.1 * Math.sin(now / 180))}px serif`; ctx.fillText('🙌', s.x * W, s.y * H + r + M * 0.04); }
      }
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
    // Baguette du petit sorcier -> le lieu choisi (pendant que l'anneau se remplit) ou la créature (sort lancé)
    const tgt = this.mode === 'choose' && this.hover && this.charge > 0 ? this.screenOf(this.hover)
      : this.mode === 'block' && this.block && this.block.aimed && !this.block.free ? this.screenOfObj(this.block.c.group.position, 0.8) : null;
    if (tgt && fade > 0.5) {
      const tipObj = this.hero.wandTip, v = tipObj ? tipObj.getWorldPosition(new S.T.Vector3()) : this.hero.group.position;
      const o = this.screenOfObj(v, tipObj ? 0 : 1.4), ox = o.x * W, oy = o.y * H, tx = tgt.x * W, ty = tgt.y * H;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const d = Math.hypot(tx - ox, ty - oy) || 1, nx = -(ty - oy) / d, ny = (tx - ox) / d;
      for (const [lw, al] of [[M * 0.04, 0.25], [M * 0.016, 0.6], [M * 0.006, 1]]) {
        ctx.strokeStyle = '#ffd166'; ctx.globalAlpha = al; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ox, oy);
        for (let j = 1; j <= 16; j++) { const q = j / 16, wv = Math.sin(q * 12 - now * 0.02) * M * 0.01 * Math.sin(q * Math.PI); ctx.lineTo(ox + (tx - ox) * q + nx * wv, oy + (ty - oy) * q + ny * wv); }
        ctx.stroke();
      }
      ctx.restore();
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(now / 400); ctx.font = `${M * 0.065}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✨', 0, 0); ctx.restore();
    }
    S.drawFx(dt);
  }

  dispose() {
    if (!this.scene) return;
    this.scene.traverse((o) => { if (o.isSprite && o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    this.scene = null; this.places = null; this.anims = []; this.labels = {}; this.block = null; this.guardian = null; this.rainbow = null; this.calin = null;
  }
}
