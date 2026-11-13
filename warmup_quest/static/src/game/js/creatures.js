// Créatures originales à rencontrer, à rendre amies et à faire évoluer.

// Tous les amis du héros viennent de la même famille graphique que le dresseur (Kenney, CC0) :
// 24 animaux animés du pack « Cube Pets », plus 6 personnages assortis (fantôme, bonhomme de neige, renne…).
// model : fichier 3D (dossier/nom) ; still : modèle sans animation (il est animé par le jeu).
// (shape / feature / belly : dessin 2D de secours, quand la 3D n'est pas disponible)
const CREATURES = [
  { id: 'flammeche', name: 'Flammèche', element: 'Feu', color: '#ff7b39', belly: '#ffd6a8', shape: 'round', feature: 'flame', model: 'pets/animal-fox' },
  { id: 'gouttin', name: 'Gouttin', element: 'Eau', color: '#4ea8ff', belly: '#d4ecff', shape: 'drop', feature: 'fin', model: 'pets/animal-penguin' },
  { id: 'feuillou', name: 'Feuillou', element: 'Plante', color: '#5cc96b', belly: '#dbf7c9', shape: 'round', feature: 'leaves', model: 'pets/animal-bunny' },
  { id: 'volticube', name: 'Voltiplume', element: 'Air', color: '#7c8cff', belly: '#e0e4ff', shape: 'cube', feature: 'antennas', model: 'pets/animal-parrot' },
  { id: 'rocaille', name: 'Rocaille', element: 'Roche', color: '#a3958a', belly: '#e3dbd3', shape: 'round', feature: 'pebbles', model: 'pets/animal-hog' },
  { id: 'nuagon', name: 'Nuagon', element: 'Air', color: '#ffe066', belly: '#ffffff', shape: 'cloud', feature: 'none', model: 'pets/animal-chick' },
  { id: 'givrette', name: 'Givrette', element: 'Glace', color: '#9fe8f5', belly: '#e9fbff', shape: 'round', feature: 'crystal', model: 'pets/animal-polar' },
  { id: 'nocturne', name: 'Nocturne', element: 'Nuit', color: '#8d99ae', belly: '#c9b6e4', shape: 'round', feature: 'batEars', model: 'pets/animal-koala' },
  { id: 'sablou', name: 'Sablou', element: 'Sable', color: '#e9c46a', belly: '#fff3d6', shape: 'egg', feature: 'shell', model: 'pets/animal-crab' },
  { id: 'coraline', name: 'Coraline', element: 'Eau', color: '#ff8fab', belly: '#ffe5ec', shape: 'drop', feature: 'coralCrown', model: 'pets/animal-fish' },
  { id: 'braisou', name: 'Braisou', element: 'Feu', color: '#f77f00', belly: '#ffb4a2', shape: 'round', feature: 'magma', model: 'pets/animal-tiger' },
  { id: 'petalune', name: 'Pétalune', element: 'Fée', color: '#cdb4db', belly: '#ffffff', shape: 'round', feature: 'petalWings', model: 'pets/animal-deer' },
  { id: 'cosmino', name: 'Cosmino', element: 'Étoile', color: '#80ed99', belly: '#c77dff', shape: 'round', feature: 'ring', model: 'space/alien', still: true, flip: true },
  { id: 'sucrette', name: 'Sucrette', element: 'Sucre', color: '#d4a373', belly: '#ffffff', shape: 'drop', feature: 'candyHorns', model: 'holiday/gingerbread-man', still: true },
  { id: 'laineton', name: 'Meuglou', element: 'Ferme', color: '#8d99ae', belly: '#edf2f4', shape: 'round', feature: 'wool', model: 'pets/animal-cow' },
  { id: 'lucibulle', name: 'Lucibulle', element: 'Lumière', color: '#b5e48c', belly: '#fff9db', shape: 'egg', feature: 'lantern', model: 'pets/animal-caterpillar' },
  { id: 'lamalou', name: 'Girafou', element: 'Savane', color: '#f1c453', belly: '#ffffff', shape: 'round', feature: 'none', model: 'pets/animal-giraffe' },
  { id: 'bzouille', name: 'Bzouille', element: 'Insecte', color: '#ffbe0b', belly: '#fff3b0', shape: 'round', feature: 'none', model: 'pets/animal-bee' },
  { id: 'glouglou', name: 'Glouglou', element: 'Eau', color: '#a47148', belly: '#e0f7ff', shape: 'drop', feature: 'none', model: 'pets/animal-beaver' },
  { id: 'rocheron', name: 'Rocheron', element: 'Roche', color: '#8d99ae', belly: '#e9ecef', shape: 'round', feature: 'none', model: 'pets/animal-elephant' },
  { id: 'dragounet', name: 'Rugissou', element: 'Feu', color: '#e9a23b', belly: '#ffd6a5', shape: 'round', feature: 'none', model: 'pets/animal-lion' },
  { id: 'champilou', name: 'Grimpilou', element: 'Plante', color: '#a47148', belly: '#fff1e6', shape: 'round', feature: 'none', model: 'pets/animal-monkey' },
  { id: 'gelouille', name: 'Rosinou', element: 'Ferme', color: '#ffafcc', belly: '#ffe5ec', shape: 'round', feature: 'none', model: 'pets/animal-pig' },
  { id: 'bonbloub', name: 'Croquenoix', element: 'Sucre', color: '#e63946', belly: '#ffe5ec', shape: 'round', feature: 'none', model: 'holiday/nutcracker', still: true },
  { id: 'piquito', name: 'Pandou', element: 'Plante', color: '#f8f9fa', belly: '#d8f3dc', shape: 'round', feature: 'none', model: 'pets/animal-panda' },
  { id: 'calmaron', name: 'Toufou', element: 'Normal', color: '#c08552', belly: '#efe3ff', shape: 'round', feature: 'none', model: 'pets/animal-dog' },
  { id: 'tourbillon', name: 'Tourbillon', element: 'Glace', color: '#e9f5ff', belly: '#ffffff', shape: 'round', feature: 'none', model: 'holiday/snowman', still: true },
  { id: 'fantomi', name: 'Fantômi', element: 'Nuit', color: '#e0e1dd', belly: '#ffffff', shape: 'round', feature: 'none', model: 'graveyard/character-ghost' },
  { id: 'minouille', name: 'Minouille', element: 'Normal', color: '#f4a261', belly: '#fff1e0', shape: 'round', feature: 'none', model: 'pets/animal-cat' },
  { id: 'poilu', name: 'Poilu', element: 'Glace', color: '#a47148', belly: '#ffffff', shape: 'round', feature: 'none', model: 'holiday/reindeer', still: true },
];

// Où vit chaque créature (paysages 3D, voir KITS) : on la rencontre surtout là
const HABITATS = {
  flammeche: ['volcano', 'forest', 'desert', 'meadow'], gouttin: ['glacier', 'aurora', 'beach', 'icecream'],
  feuillou: ['meadow', 'forest', 'garden', 'orchard'], volticube: ['jungle', 'beach', 'disco', 'volcano'],
  rocaille: ['mountain', 'forest', 'desert', 'dinoland'], nuagon: ['farm', 'orchard', 'meadow'],
  givrette: ['glacier', 'aurora', 'icecream'], nocturne: ['night', 'magic', 'jungle', 'dojoNight'],
  sablou: ['beach', 'lagoon', 'reef', 'desert'], coraline: ['lagoon', 'reef', 'abyss'], braisou: ['jungle', 'volcano', 'dinoland', 'ferns'],
  petalune: ['garden', 'forest', 'magic', 'mountain'], cosmino: ['moon', 'mars', 'nebula'], sucrette: ['candy', 'icecream'],
  laineton: ['farm', 'orchard', 'meadow'], lucibulle: ['night', 'magic', 'garden', 'dojoNight', 'ferns'],
  lamalou: ['desert', 'meadow', 'dinoland'], bzouille: ['meadow', 'garden', 'orchard'], glouglou: ['lagoon', 'forest', 'mountain'],
  rocheron: ['desert', 'jungle', 'dinoland', 'mars'], dragounet: ['desert', 'volcano', 'dinoland'], champilou: ['jungle', 'ferns', 'beach'],
  gelouille: ['farm', 'orchard'], bonbloub: ['candy', 'icecream', 'magic'], piquito: ['dojo', 'dojoNight', 'jungle'],
  calmaron: ['farm', 'meadow', 'garden', 'dojo'], tourbillon: ['glacier', 'aurora'], fantomi: ['night', 'magic', 'abyss', 'disco'],
  minouille: ['farm', 'garden', 'dojo', 'night'], poilu: ['glacier', 'aurora', 'mountain'],
};
// Fichiers 3D des créatures (la forme évoluée est le même modèle, plus grand, avec une couronne)
const creatureModels = (list) => [...new Set(list.map((c) => c && c.model).filter(Boolean))];
const KIT_ALIAS = { flowers: 'meadow' }; // (paysages qui partagent leurs habitants)
const creaturesOf = (kit) => CREATURES.filter((c) => (HABITATS[c.id] || []).includes(KIT_ALIAS[kit] || kit));
const EVOLVE_AT = 3;

const Carnet = {
  get() { return WUQStore.getCarnet(); },
  add(id) {
    const c = this.get();
    c[id] = (c[id] || 0) + 1;
    WUQStore.setCarnet(c);
    return c[id];
  },
  evolved(id) { return (this.get()[id] || 0) >= EVOLVE_AT; },
  // Choisit de préférence une créature de ce paysage, et jamais rencontrée
  pick(exclude = [], kit = null) {
    const c = this.get();
    const all = CREATURES.filter((k) => !exclude.includes(k.id));
    const local = kit ? all.filter((k) => (HABITATS[k.id] || []).includes(KIT_ALIAS[kit] || kit)) : [];
    const pool = local.length ? local : all;
    const fresh = pool.filter((k) => !c[k.id]);
    const list = fresh.length ? fresh : pool.length ? pool : CREATURES;
    return list[Math.floor(Math.random() * list.length)];
  },
};

// Dessine une créature vue de face. (x, y) = pieds, s = taille.
function drawCreature(ctx, x, y, s, cr, pose, t, evolved = false, silhouette = false) {
  ctx.save();
  ctx.translate(x, y);
  if (evolved) s *= 1.2;
  const bob = Math.sin(t * 0.006) * s * 0.03;
  ctx.translate(0, bob);
  const R = s * 0.4;
  const legH = s * 0.14;
  const cy = -legH - R;
  const body = silhouette ? '#1e1b4b' : cr.color;
  const limb = silhouette ? '#1e1b4b' : shade(cr.color, -0.25);
  const belly = silhouette ? '#1e1b4b' : cr.belly;
  const accent = silhouette ? '#1e1b4b' : null;

  if (evolved && !silhouette) {
    const g = ctx.createRadialGradient(0, cy, R * 0.5, 0, cy, R * 2);
    g.addColorStop(0, 'rgba(255,240,150,0.55)'); g.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, cy, R * 2, 0, Math.PI * 2); ctx.fill();
  }

  // Jambes
  ctx.lineCap = 'round';
  ctx.strokeStyle = limb; ctx.lineWidth = s * 0.08;
  const legs = pose === 'star' ? [[-0.3, 0], [0.3, 0]]
    : pose === 'flamingo' ? [[-0.1, 0], [0.18, -0.16]] : [[-0.14, 0], [0.14, 0]];
  for (const [i, [fx, fy]] of legs.entries()) {
    ctx.beginPath(); ctx.moveTo((i ? 1 : -1) * R * 0.4, -legH - R * 0.2); ctx.lineTo(fx * s, fy * s); ctx.stroke();
    ctx.fillStyle = limb; ctx.beginPath(); ctx.ellipse(fx * s, fy * s, s * 0.08, s * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Bras (vue de face)
  const armA = { armsUp: 2.8, airplane: 1.6, star: 2.25, flamingo: 1.3, happy: 2.6 }[pose] ?? (0.5 + Math.sin(t * 0.008) * 0.15);
  for (const sg of [-1, 1]) {
    const a = pose === 'wave' && sg > 0 ? 2.5 + Math.sin(t * 0.015) * 0.4 : armA;
    const sx = sg * R * 0.85, sy = cy + R * 0.1;
    const ex = sx + sg * Math.sin(a) * s * 0.3, ey = sy + Math.cos(a) * s * 0.3;
    ctx.strokeStyle = limb; ctx.lineWidth = s * 0.075;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = belly; ctx.beginPath(); ctx.arc(ex, ey, s * 0.055, 0, Math.PI * 2); ctx.fill();
  }

  // Caractéristiques derrière le corps
  const top = cy - R;
  if (cr.feature === 'batEars') {
    ctx.fillStyle = body;
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sg * R * 0.25, top + R * 0.3); ctx.lineTo(sg * R * 1.05, top - R * 0.45); ctx.lineTo(sg * R * 0.85, top + R * 0.55); ctx.fill();
    }
  }
  if (cr.feature === 'fin') {
    ctx.fillStyle = silhouette ? body : shade(cr.color, -0.15);
    ctx.beginPath(); ctx.moveTo(-R * 0.2, top + R * 0.5); ctx.quadraticCurveTo(0, top - R * 0.9, R * 0.3, top + R * 0.5); ctx.fill();
  }

  // Corps
  ctx.fillStyle = body;
  ctx.beginPath();
  if (cr.shape === 'drop') {
    ctx.moveTo(0, top - R * 0.5);
    ctx.bezierCurveTo(R * 0.9, cy - R * 0.2, R * 1.1, cy + R, 0, cy + R);
    ctx.bezierCurveTo(-R * 1.1, cy + R, -R * 0.9, cy - R * 0.2, 0, top - R * 0.5);
  } else if (cr.shape === 'cube') {
    roundRect(ctx, -R, cy - R, R * 2, R * 2, R * 0.35);
  } else if (cr.shape === 'cloud') {
    for (const [dx, dy, r] of [[0, 0, 0.85], [-0.6, 0.25, 0.6], [0.6, 0.25, 0.6], [-0.35, -0.45, 0.55], [0.35, -0.45, 0.55]]) {
      ctx.moveTo(dx * R + r * R, cy + dy * R); ctx.arc(dx * R, cy + dy * R, r * R, 0, Math.PI * 2);
    }
  } else {
    ctx.ellipse(0, cy, R, R * 0.95, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  if (cr.shape === 'cloud' && !silhouette) { ctx.strokeStyle = '#c7cff0'; ctx.lineWidth = s * 0.02; ctx.stroke(); }
  if (!silhouette) {
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(0, cy + R * 0.35, R * 0.55, R * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Caractéristiques devant
  if (!silhouette) {
    if (cr.feature === 'flame') {
      const f = Math.sin(t * 0.02) * R * 0.08;
      for (const [c, k] of [['#ffb703', 1], ['#fff3b0', 0.55]]) {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(-R * 0.45 * k, top + R * 0.25);
        ctx.quadraticCurveTo(-R * 0.3 * k, top - R * 0.5 * k, f, top - R * 0.95 * k);
        ctx.quadraticCurveTo(R * 0.3 * k, top - R * 0.4 * k, R * 0.45 * k, top + R * 0.25);
        ctx.fill();
      }
    } else if (cr.feature === 'leaves') {
      ctx.fillStyle = '#2f9e44';
      for (const sg of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(sg * R * 0.55, top + R * 0.05, R * 0.18, R * 0.45, sg * 0.7, 0, Math.PI * 2); ctx.fill();
      }
    } else if (cr.feature === 'antennas') {
      ctx.strokeStyle = '#3a3f8f'; ctx.lineWidth = s * 0.025;
      for (const sg of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sg * R * 0.4, top); ctx.lineTo(sg * R * 0.6, top - R * 0.5); ctx.stroke();
        ctx.fillStyle = (Math.floor(t / 120) % 2) ? '#ffe066' : '#fff';
        ctx.beginPath(); ctx.arc(sg * R * 0.6, top - R * 0.55, s * 0.045, 0, Math.PI * 2); ctx.fill();
      }
    } else if (cr.feature === 'pebbles') {
      ctx.fillStyle = shade(cr.color, -0.2);
      for (const [dx, dy, r] of [[-0.5, -0.5, 0.14], [0.45, -0.6, 0.11], [0.65, 0.05, 0.1], [-0.7, 0.1, 0.09]]) {
        ctx.beginPath(); ctx.arc(dx * R, cy + dy * R, r * R, 0, Math.PI * 2); ctx.fill();
      }
    } else if (cr.feature === 'crystal') {
      ctx.fillStyle = '#e0fbff'; ctx.strokeStyle = '#5bc0de'; ctx.lineWidth = s * 0.015;
      for (const [dx, h] of [[-0.35, 0.35], [0, 0.55], [0.35, 0.35]]) {
        ctx.beginPath(); ctx.moveTo(dx * R - R * 0.12, top + R * 0.15); ctx.lineTo(dx * R, top - h * R); ctx.lineTo(dx * R + R * 0.12, top + R * 0.15); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    // Visage
    const blink = (Math.floor((t + cr.id.length * 400) / 140) % 28) === 0;
    const eyeY = cy - R * 0.15;
    for (const sg of [-1, 1]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(sg * R * 0.33, eyeY, s * 0.07, blink ? s * 0.015 : s * 0.085, 0, 0, Math.PI * 2); ctx.fill();
      if (!blink) {
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.arc(sg * R * 0.33, eyeY + s * 0.01, s * 0.042, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sg * R * 0.33 + s * 0.015, eyeY - s * 0.02, s * 0.014, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(255,110,140,0.5)';
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(sg * R * 0.6, eyeY + s * 0.1, s * 0.045, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = s * 0.022;
    ctx.beginPath(); ctx.arc(0, eyeY + s * 0.08, s * 0.06, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  if (evolved && !silhouette) {
    ctx.font = `${s * 0.28}px serif`; ctx.textAlign = 'center';
    ctx.fillText('👑', 0, top - R * 0.45);
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((c) => c.toString(16).padStart(2, '0')).join('');
}

function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  return '#' + [16, 8, 0].map((s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t).toString(16).padStart(2, '0')).join('');
}
