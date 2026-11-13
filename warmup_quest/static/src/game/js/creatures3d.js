// Créatures originales en 3D (style cartoon) : corps, grands yeux, petits bras pour montrer les poses,
// et un trait distinctif lié à leur élément. Forme évoluée : plus grande, trait renforcé, étoile au-dessus.
// Construit avec la scène 3D (sc = Scene3D) : matériaux cartoon et contour noir partagés.

// Ami du héros en 3D (animaux « Cube Pets » et personnages assortis de Kenney) : il attend, marche, court,
// danse de joie, fait signe… avec ses vraies animations ; les modèles sans animation sont animés ici (rebonds).
// Forme évoluée : plus grande, couronne dorée et petites étoiles qui tournent autour.
function buildPet3D(sc, cr, evolved) {
  const key = cr.model, obj = sc.P.model(key);
  if (!obj) return null;
  const T = sc.T, group = new T.Group(), inner = new T.Group();
  group.add(inner); inner.add(obj);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  if (cr.flip) obj.rotation.y = Math.PI; // (modèle tourné dans l'autre sens)
  const clips = sc.P.anims.get(key) || [];
  const find = (...names) => { for (const n of names) { const c = clips.find((x) => x.name === n); if (c) return c; } return null; };
  const acts = {
    idle: find('idle', 'static'), happy: find('dance', 'emote-yes', 'jump'), wave: find('walk'),
    run: find('run', 'sprint', 'walk'), show: find('gesture-positive', 'emote-yes', 'idle'), no: find('gesture-negative', 'emote-no', 'walk'),
  };
  const mixer = clips.length ? new T.AnimationMixer(obj) : null;
  // Taille du modèle (pour poser la couronne) ; forme évoluée
  const h = new T.Box3().setFromObject(obj, true).max.y || 1.2;
  const stars = [];
  if (evolved) {
    inner.scale.setScalar(1.3);
    const gold = sc.lam('#ffd23f'), crown = new T.Group();
    const band = new T.Mesh(new T.CylinderGeometry(0.2, 0.22, 0.1, 12, 1, true), gold); crown.add(band);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2, sp = new T.Mesh(new T.ConeGeometry(0.05, 0.14, 6), gold);
      sp.position.set(Math.cos(a) * 0.2, 0.11, Math.sin(a) * 0.2); crown.add(sp);
    }
    crown.position.y = h + 0.06; crown.userData.crown = true; inner.add(crown);
    for (let k = 0; k < 3; k++) {
      const st = new T.Mesh(new T.OctahedronGeometry(0.07, 0), new T.MeshBasicMaterial({ color: '#fff3a0' }));
      group.add(st); stars.push(st);
    }
  }
  let cur = null, last = 0;
  const play = (name) => {
    const clip = acts[name] || acts.idle;
    if (!mixer || !clip || clip === cur) return;
    const a = mixer.clipAction(clip);
    a.reset().fadeIn(0.2).play();
    if (cur) mixer.clipAction(cur).fadeOut(0.2);
    cur = clip;
  };
  const animate = (t, mode = 'idle', pose = null) => {
    const dt = last ? Math.min(0.1, Math.max(0, (t - last) / 1000)) : 0;
    last = t;
    const m = mode === 'happy' ? 'happy' : mode === 'run' ? 'run' : mode === 'wave' ? 'wave' : mode === 'no' ? 'no' : pose ? 'show' : 'idle';
    if (mixer) { play(m); mixer.update(dt); }
    // Modèle sans animation : petits rebonds et balancements selon ce qu'il fait
    if (!mixer || cr.still) {
      const k = t * 0.001;
      const hop = m === 'happy' ? Math.abs(Math.sin(k * 9)) * 0.45 : m === 'run' || m === 'wave' ? Math.abs(Math.sin(k * 11)) * 0.18 : m === 'show' ? Math.abs(Math.sin(k * 5)) * 0.2 : 0;
      inner.position.y = hop;
      inner.rotation.z = m === 'happy' ? Math.sin(k * 9) * 0.25 : m === 'no' ? Math.sin(k * 10) * 0.15 : Math.sin(k * 2.2) * 0.04;
      inner.rotation.y = m === 'happy' ? k * 6 % (Math.PI * 2) : 0;
      const sq = 1 + Math.sin(k * 3) * 0.025; // il « respire »
      obj.scale.set(1 / sq, sq, 1 / sq);
    }
    stars.forEach((st, i) => {
      const a = t * 0.002 + i * 2.094, r = 0.55 * (evolved ? 1.3 : 1);
      st.position.set(Math.cos(a) * r, h * 0.9 + Math.sin(t * 0.004 + i) * 0.12, Math.sin(a) * r);
      st.rotation.y = t * 0.004;
    });
  };
  return { group, animate, height: h * (evolved ? 1.3 : 1) };
}

function buildCreature3D(sc, cr, evolved = false) {
  if (cr.model) { const m = buildPet3D(sc, cr, evolved); if (m) return m; }
  const T = sc.T, G = sc.geo, lam = sc.lam;
  const group = new T.Group(), body = new T.Group();
  group.add(body);
  const color = evolved ? shade(cr.color, 0.08) : cr.color, belly = cr.belly, limb = shade(cr.color, -0.25);
  const anims = [];
  const add = (geo, col, x, y, z, sx, sy = sx, sz = sx, rot = null, extra = {}, parent = body) => {
    const m = new T.Mesh(geo, lam(col, extra)); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    if (rot) m.rotation.set(...rot);
    parent.add(m); return m;
  };
  const box = new T.BoxGeometry(1, 1, 1), torus = (r, t, arc = Math.PI * 2) => new T.TorusGeometry(r, t, 8, 24, arc);
  let top = 1.32; // haut de la tête (pour placer les traits)

  // ---------- Corps selon la forme
  switch (cr.shape) {
    case 'drop':
      add(G.sphere, color, 0, 0.66, 0, 0.56, 0.6, 0.54);
      add(G.cone, color, 0, 1.3, 0, 0.36, 0.5, 0.36);
      top = 1.55;
      break;
    case 'cube':
      add(box, color, 0, 0.66, 0, 1.0, 0.95, 0.85);
      top = 1.15;
      break;
    case 'cloud':
      [[0, 0.7, 0, 0.55], [-0.42, 0.62, 0, 0.38], [0.42, 0.62, 0, 0.38], [0, 1.05, -0.05, 0.4], [-0.25, 0.95, 0.1, 0.3], [0.25, 0.95, 0.1, 0.3]]
        .forEach(([x, y, z, r]) => add(G.sphere, color, x, y, z, r));
      top = 1.4;
      break;
    case 'egg':
      add(G.sphere, color, 0, 0.75, 0, 0.5, 0.7, 0.5);
      top = 1.42;
      break;
    default: // rond
      add(G.sphere, color, 0, 0.68, 0, 0.6, 0.58, 0.56);
  }
  // Ventre clair
  add(G.sphere, belly, 0, 0.58, 0.36, 0.34, 0.32, 0.2);

  // ---------- Visage (vers le joueur) : grands yeux brillants, joues, sourire
  const eyes = [];
  const eyeY = cr.shape === 'cube' ? 0.82 : cr.shape === 'egg' ? 0.95 : 0.84;
  const front = cr.shape === 'cube' ? 0.44 : cr.shape === 'egg' ? 0.42 : 0.48;
  for (const sg of [-1, 1]) {
    const e = new T.Group(); e.position.set(sg * 0.2, eyeY, front); body.add(e);
    add(G.sphere, '#ffffff', 0, 0, 0, 0.14, 0.16, 0.08, null, {}, e);
    const pupil = add(G.sphere, '#1e1b4b', 0, -0.01, 0.05, 0.085, 0.1, 0.05, null, {}, e);
    const shine = add(G.sphere, '#ffffff', -0.035, 0.04, 0.09, 0.03, 0.03, 0.02, null, {}, e);
    pupil.userData.noOutline = true; shine.userData.noOutline = true;
    eyes.push(e);
  }
  for (const sg of [-1, 1]) {
    const ch = add(G.sphere, '#ff8fab', sg * 0.34, eyeY - 0.14, front - 0.06, 0.08, 0.05, 0.03);
    ch.userData.noOutline = true;
  }
  const mouth = add(torus(0.07, 0.018, Math.PI), '#1e1b4b', 0, eyeY - 0.17, front + 0.02, 1, 1, 1, [0, 0, Math.PI]);
  mouth.userData.noOutline = true;

  // ---------- Petits bras (pour montrer les poses) et pieds
  const arm = (sg) => {
    const p = new T.Group(); p.position.set(sg * 0.5, 0.72, 0.05); body.add(p);
    const seg = new T.Mesh(new T.CapsuleGeometry(0.075, 0.18, 4, 8), lam(limb)); seg.position.y = -0.16; p.add(seg);
    return p;
  };
  const arms = [arm(-1), arm(1)];
  const feet = [-1, 1].map((sg) => add(G.sphere, limb, sg * 0.24, 0.08, 0.12, 0.16, 0.09, 0.2));

  // ---------- Trait de l'élément
  const glow = (col, k = 0.8) => ({ emissive: col, emissiveIntensity: k });
  const big = evolved ? 1.35 : 1;
  switch (cr.feature) {
    case 'flame': {
      const fl = [];
      [['#ffd166', 0, 0.42], ['#ff7b39', -0.13, 0.32], ['#ff7b39', 0.13, 0.32]].forEach(([c, x, h]) =>
        fl.push(add(G.cone, c, x, top + h * 0.45 * big, 0, 0.13 * big, h * big, 0.13 * big, null, glow(c))));
      anims.push((t) => fl.forEach((f, i) => { f.scale.y = (i ? 0.32 : 0.42) * big * (0.85 + 0.25 * Math.abs(Math.sin(t * 0.012 + i))); }));
      break;
    }
    case 'fin':
      add(G.cone, shade(color, -0.1), 0, top - 0.05, -0.15, 0.22 * big, 0.45 * big, 0.06, [-0.3, 0, 0]);
      add(G.cone, shade(color, -0.1), 0, 0.4, -0.6, 0.25, 0.35, 0.06, [-Math.PI / 2, 0, 0]);
      break;
    case 'leaves':
      for (const sg of [-1, 1]) add(G.sphere, '#3fae5a', sg * 0.16, top + 0.12, 0, 0.1, 0.24 * big, 0.04, [0, 0, -sg * 0.5]);
      add(G.stem, '#2d7d3f', 0, top + 0.02, 0, 1, 0.15, 1);
      break;
    case 'antennas': {
      const balls = [];
      for (const sg of [-1, 1]) {
        add(G.stem, limb, sg * 0.22, top + 0.18, 0, 1.2, 0.36 * big, 1.2, [0, 0, -sg * 0.25]);
        balls.push(add(G.sphere, '#ffe066', sg * 0.31, top + 0.38 * big, 0, 0.08 * big, 0.08 * big, 0.08 * big, null, glow('#ffd166')));
      }
      anims.push((t) => balls.forEach((b, i) => { b.material.emissiveIntensity = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.008 + i)); }));
      break;
    }
    case 'pebbles':
      [[-0.25, top - 0.15, -0.25], [0.2, top - 0.05, -0.3], [0, top - 0.3, -0.45], [0.35, top - 0.35, -0.3]].forEach(([x, y, z]) =>
        add(G.rock, '#8d8173', x, y, z, 0.13 * big, 0.11 * big, 0.13 * big, null, { flatShading: true }));
      break;
    case 'crystal':
      [[0, 0.3], [-0.16, 0.2], [0.16, 0.2]].forEach(([x, h]) =>
        add(new T.OctahedronGeometry(1, 0), '#bdf3ff', x, top + h * 0.6 * big, 0, 0.09 * big, h * big, 0.09 * big, null, glow('#72efdd', 0.5)));
      break;
    case 'batEars': {
      for (const sg of [-1, 1]) add(G.cone, color, sg * 0.3, top + 0.15, 0, 0.15, 0.42 * big, 0.08, [0, 0, -sg * 0.35]);
      const wings = [-1, 1].map((sg) => add(G.sphere, shade(color, -0.15), sg * 0.62, 0.75, -0.1, 0.3 * big, 0.2 * big, 0.04));
      anims.push((t) => wings.forEach((w, i) => { w.rotation.y = Math.sin(t * 0.02) * 0.6 * (i ? -1 : 1); }));
      break;
    }
    case 'shell': // coquille en spirale sur le dos
      add(torus(0.32, 0.16), '#c97b48', 0, 0.85, -0.42, big, big, big, [0, Math.PI / 2, 0]);
      add(G.sphere, '#f4a261', 0, 0.85, -0.42, 0.18 * big);
      break;
    case 'coralCrown':
      for (let i = 0; i < 5; i++) {
        const a = -0.6 + i * 0.3;
        add(new T.CapsuleGeometry(0.05, 0.22, 4, 6), i % 2 ? '#ff9671' : '#ffc75f', Math.sin(a) * 0.3, top + 0.08, Math.cos(a) * 0.05, big, big, big, [0, 0, -a]);
      }
      break;
    case 'magma': { // petites cornes et fissures de braise qui rougeoient
      for (const sg of [-1, 1]) add(G.cone, '#3d2b1f', sg * 0.22, top + 0.08, 0, 0.08, 0.22 * big, 0.08, [0, 0, -sg * 0.3]);
      const cracks = [];
      [[-0.3, 0.9, 0.38], [0.32, 0.55, 0.4], [-0.1, 0.35, 0.48], [0.4, 1.0, 0.2]].forEach(([x, y, z]) =>
        cracks.push(add(box, '#ffb703', x, y, z, 0.12, 0.03, 0.03, [0, 0, Math.random()], glow('#ff6b00', 1))));
      anims.push((t) => cracks.forEach((c, i) => { c.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 0.006 + i); }));
      break;
    }
    case 'petalWings': {
      const wings = [];
      [[-1, 0.95], [1, 0.95], [-1, 0.6], [1, 0.6]].forEach(([sg, y], i) =>
        wings.push(add(G.sphere, i < 2 ? '#ffc8dd' : '#ffffff', sg * 0.55, y, -0.25, 0.32 * big, 0.16 * big, 0.04, [0, 0, sg * 0.4])));
      anims.push((t) => wings.forEach((w, i) => { w.rotation.y = Math.sin(t * 0.025 + (i % 2) * Math.PI) * 0.5; }));
      break;
    }
    case 'ring': { // petit anneau de planète autour du corps
      const ring = add(torus(0.78 * big, 0.05), '#ffd6a5', 0, 0.72, 0, 1, 1, 1, [1.2, 0, 0.25], glow('#ffb703', 0.4));
      add(G.sphere, '#fff3b0', 0, top + 0.12, 0, 0.08, 0.08, 0.08, null, glow('#fff3b0'));
      anims.push((t) => { ring.rotation.z = 0.25 + t * 0.0015; });
      break;
    }
    case 'candyHorns':
      for (const sg of [-1, 1]) {
        add(G.cone, '#ffffff', sg * 0.2, top + 0.12, 0, 0.1, 0.3 * big, 0.1, [0, 0, -sg * 0.3]);
        add(torus(0.07, 0.025), '#ff4d6d', sg * 0.205, top + 0.08, 0, 1, 1, 1, [Math.PI / 2, 0, 0]);
      }
      break;
    case 'wool':
      for (let i = 0; i < 9; i++) {
        const a = i * 0.7, y = 0.5 + (i % 3) * 0.3;
        add(G.sphere, '#ffffff', Math.cos(a) * 0.55, y, Math.sin(a) * 0.45 - 0.1, 0.24 * big);
      }
      add(G.sphere, '#ffffff', 0, top, -0.05, 0.28 * big);
      break;
    case 'lantern': { // antenne recourbée avec une petite lanterne lumineuse
      add(G.stem, limb, 0, top + 0.2, 0.05, 1.3, 0.4, 1.3, [0.4, 0, 0]);
      const bulb = add(G.sphere, '#fff3b0', 0, top + 0.38, 0.2, 0.12 * big, 0.12 * big, 0.12 * big, null, glow('#ffe066', 1));
      anims.push((t) => { bulb.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 0.005); });
      break;
    }
  }
  // Forme évoluée : petite étoile flottante au-dessus de la tête
  if (evolved) {
    const star = add(new T.OctahedronGeometry(1, 0), '#ffd60a', 0, top + 0.75, 0, 0.13, 0.13, 0.13, null, glow('#ffb703', 0.9));
    anims.push((t) => { star.rotation.y = t * 0.003; star.position.y = top + 0.75 + Math.sin(t * 0.004) * 0.05; });
  }

  sc.shadow(body);
  sc.outline(body);
  group.scale.setScalar(evolved ? 1.25 : 1);

  // ---------- Animation : rebond, clignement, poses, joie, au revoir
  let lastBlink = 0;
  const animate = (t, mode = 'idle', pose = null) => {
    const ph = t * 0.006;
    let bounce = Math.abs(Math.sin(ph)) * 0.08, armZ = 0.45, footUp = null, spread = 0.24;
    if (mode === 'happy') { bounce = Math.abs(Math.sin(t * 0.014)) * 0.35; armZ = 2.6; }
    else if (mode === 'wave') { armZ = 0.4; arms[1].rotation.z = 2.4 + Math.sin(t * 0.02) * 0.4; }
    if (mode === 'idle' && pose) {
      armZ = { armsUp: 2.8, airplane: 1.6, star: 2.3, flamingo: 1.2 }[pose] ?? 0.45;
      if (pose === 'star') spread = 0.34;
      if (pose === 'flamingo') footUp = 1;
    }
    body.position.y = bounce;
    body.scale.y = 1 - Math.min(0.08, bounce * 0.3);
    arms[0].rotation.z = -armZ;
    if (mode !== 'wave') arms[1].rotation.z = armZ;
    feet.forEach((f, i) => { f.position.x = (i ? 1 : -1) * spread; f.position.y = footUp === i ? 0.35 : 0.08; });
    // Clignement des yeux de temps en temps
    if (t - lastBlink > 2800 + Math.random() * 2000) lastBlink = t;
    const closed = t - lastBlink < 120;
    eyes.forEach((e) => { e.scale.y = closed ? 0.12 : 1; });
    for (const a of anims) a(t);
  };
  return { group, animate };
}
