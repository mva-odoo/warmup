// Mouvements, séquences et les 3 mondes (univers originaux).

// Consignes courtes et concrètes : chaque mouvement correspond à un obstacle visible sur le chemin
// (tronc = saute, branche = baisse-toi, rocher = tape, étoile dans un couloir = va à gauche / à droite).
const POSES = {
  armsUp:   { icon: '🙌', label: 'Lève les bras !',          say: 'Lève les deux bras tout en haut !' },
  airplane: { icon: '✈️', label: "Bras écartés : l'avion !", say: "Fais l'avion : les bras bien écartés, sur les côtés !" },
  star:     { icon: '⭐', label: "Fais l'étoile !",           say: "Fais l'étoile : écarte les bras et les jambes !" },
  flamingo: { icon: '🦩', label: 'Tiens sur un pied !',       say: 'Lève un genou et tiens sur un pied !' },
};

const MOVE_ICONS = { run: '🪨', jump: '⬆️', squat: '⬇️', left: '⬅️', right: '➡️', smash: '👊', rest: '😮‍💨', bubbles: '🫧', freeze: '🎵', catch: '⭐', rope: '🪢', tunnel: '🚇', moles: '🐹', posemix: '🤸' };
const MOVE_SHORT = { jump: 'Saute', squat: 'Baisse-toi', left: 'Gauche', right: 'Droite', smash: 'Tape' };

// Petits constructeurs de séquences
const R = (t, target) => ({ m: 'run', t, target });
const J = (n = 1) => ({ m: 'jump', n });
const S = (n = 1) => ({ m: 'squat', n });
const X = (n = 1) => ({ m: 'smash', n });
const L = () => ({ m: 'left' });
const D = () => ({ m: 'right' });
const P = (pose, hold = 1.5) => ({ m: 'pose', pose, hold });
const C = (...parts) => ({ m: 'combo', parts });
const Z = (t, text) => ({ m: 'rest', t, text });
const B = (t, n) => ({ m: 'bubbles', t, n });   // éclater n bulles avec les mains
const F = (t) => ({ m: 'freeze', t });          // statues musicales
const K = (t) => ({ m: 'catch', t });           // attraper les étoiles qui tombent (gauche / milieu / droite)
const Q = (n) => ({ m: 'rope', n });            // sauter à la corde n fois
const U = (t) => ({ m: 'tunnel', t });          // rester baissé t secondes dans le tunnel
const M = (t, n) => ({ m: 'moles', t, n });     // taper n taupes qui sortent autour du personnage
const PM = (...poses) => ({ m: 'posemix', poses, hold: 0.8 }); // copier une suite de poses

// Attraper : nombre d'étoiles pendant l'étape
const catchCount = (s) => Math.max(3, Math.round(s.t / 1.6));

// Statues musicales : une manche ≈ 7 s (danse puis statue)
const freezeRounds = (s) => Math.max(1, Math.round(s.t / 7));

function stepIcon(s) {
  if (s.m === 'pose') return POSES[s.pose].icon;
  if (s.m === 'combo') return '🔥';
  return MOVE_ICONS[s.m];
}

function stepLabel(s) {
  switch (s.m) {
    case 'run': return 'Évite les obstacles !';
    case 'jump': return s.n > 1 ? `Saute ${s.n} fois !` : 'Saute !';
    case 'squat': return s.n > 1 ? `Baisse-toi ${s.n} fois !` : 'Baisse-toi !';
    case 'smash': return s.n > 1 ? `Tape ${s.n} fois avec les bras !` : 'Tape avec les bras !';
    case 'left': return 'Va à gauche !';
    case 'right': return 'Va à droite !';
    case 'bubbles': return 'Éclate les bulles !';
    case 'freeze': return 'Danse… puis statue !';
    case 'catch': return 'Attrape les étoiles !';
    case 'rope': return s.n > 1 ? `Saute ${s.n} fois à la corde !` : 'Saute à la corde !';
    case 'tunnel': return 'Reste baissé dans le tunnel !';
    case 'moles': return 'Tape les taupes !';
    case 'posemix': return 'Copie les poses !';
    case 'pose': return POSES[s.pose].label;
    case 'combo': return 'Enchaîne !';
    case 'rest': return s.text;
  }
}

// Ce que dit la voix : la consigne ET pourquoi (l'obstacle à passer)
function stepSpeech(s) {
  switch (s.m) {
    case 'run': return 'Évite les obstacles !';
    case 'jump': return s.n > 1 ? `Saute ${s.n} fois par-dessus le tronc !` : 'Saute par-dessus le tronc !';
    case 'squat': return s.n > 1 ? `Baisse-toi ${s.n} fois sous la branche !` : 'Baisse-toi sous la branche !';
    case 'smash': return s.n > 1 ? `Tape ${s.n} fois le rocher : lève les bras et descends-les fort !` : 'Tape le rocher : lève les bras et descends-les fort !';
    case 'left': return "Va à gauche attraper l'étoile !";
    case 'right': return "Va à droite attraper l'étoile !";
    case 'pose': return POSES[s.pose].say;
    case 'catch': return 'Attrape les étoiles qui arrivent : va à gauche, au milieu ou à droite pour être dessous !';
    case 'rope': return 'Saute à la corde ! Saute quand la corde passe sous tes pieds !';
    case 'tunnel': return 'Un tunnel ! Baisse-toi et reste en bas jusqu\'à la sortie !';
    case 'moles': return 'Des taupes rigolotes ! Tape-les avec tes mains quand elles sortent de leur trou !';
    case 'posemix': return 'Copie les poses du héros, une après l\'autre ! ' + POSES[s.poses[0]].say;
    case 'bubbles': return 'Des bulles autour de ton personnage ! Touche-les avec tes mains pour les éclater !';
    case 'freeze': return "Statues musicales ! Danse avec la musique. Quand elle s'arrête, ne bouge plus !";
    case 'combo': return 'Enchaîne : ' + s.parts.map((p) => MOVE_SHORT[p]).join(', puis ') + ' !';
    default: return stepLabel(s);
  }
}

// Évitements : nombre d'obstacles pendant l'étape
const dodgeCount = (s) => Math.max(2, Math.round(s.t / 2.5));

// Durée de la fenêtre (secondes, avant le multiplicateur de difficulté)
function stepDuration(s) {
  switch (s.m) {
    case 'run': case 'rest': case 'bubbles': case 'freeze': return s.t;
    case 'jump': return 1.8 + 1.0 * s.n;
    case 'squat': return 2.0 + 1.6 * s.n;
    case 'smash': return 2.0 + 1.2 * s.n;
    case 'left': case 'right': return 2.6;
    case 'pose': return 3 + s.hold;
    case 'combo': return 1.5 + 1.7 * s.parts.length;
    case 'catch': return s.t;
    case 'rope': return 1.8 + 1.7 * s.n;
    case 'tunnel': return 1.5 + s.t + 1.5;
    case 'moles': return s.t;
    case 'posemix': return 2 + s.poses.length * 3;
  }
}

function maxPoints(s) {
  switch (s.m) {
    case 'run': return dodgeCount(s) * 60;
    case 'jump': case 'squat': case 'smash': return s.n * 100 + 50;
    case 'left': case 'right': return 150;
    case 'pose': return 200;
    case 'combo': return s.parts.length * 100 + 200;
    case 'bubbles': return s.n * 50 + 50;
    case 'freeze': return freezeRounds(s) * 150;
    case 'catch': return catchCount(s) * 50;
    case 'rope': return s.n * 100 + 50;
    case 'tunnel': return 150 + 50;
    case 'moles': return s.n * 50 + 50;
    case 'posemix': return s.poses.length * 100 + 50;
    default: return 0;
  }
}

const WORLDS = [
  {
    id: 'jardin3d',
    name: 'Jardin Fleuri',
    tagline: 'Un jardin plein de fleurs et de surprises !',
    heroName: 'Bouton',
    hero: { body: '#ff8fab', belly: '#ffe5ec', limb: '#e05780', accent: '#ffd166' },
    collectible: '🍓',
    sky: ['#6ec6ff', '#dff3ff'],
    biomes: [
      { name: 'Jardin', sky0: '#6ec6ff', sky1: '#dff3ff', sun: '#fff4b8', mount0: '#a8d5ba', mount1: '#6fbf73',
        grass: '#7ccf6a', grass2: '#72c460', path: '#e6c28f', path2: '#dbb47e', fog: '#e8f6ff',
        deco: ['🌳', '🌷', '🍄', '🌼', '🌳', '🌷'], ambient: ['butterflies'] },
    ],
    endText: 'Bouton a traversé tout le jardin !',
    sequence: [
      Z(2.5, 'Prêt ? On découvre le jardin !'),
      R(6), J(), K(10), S(), P('armsUp'),
      L(), D(), Q(3), X(2), B(10, 6),
      C('jump', 'squat'), P('star'), F(14), R(6),
      Z(3, 'Bravo ! Respire bien…'),
    ],
  },
  {
    id: 'turbo',
    name: 'Vallée Turbo',
    tagline: 'Cours plus vite que le vent !',
    heroName: 'Zéphyr',
    hero: { body: '#2ec4b6', belly: '#d9fbf7', limb: '#1b8a80', accent: '#ff9f1c' },
    collectible: '⚡',
    sky: ['#4cc3ff', '#d4f4ff'],
    biomes: [
      { name: 'Prairie', sky0: '#4cc3ff', sky1: '#d4f4ff', sun: '#fff6c2', mount0: '#9cc7e6', mount1: '#6fbf73',
        grass: '#5ccb5f', grass2: '#54bd57', path: '#d9a066', path2: '#cf955c', fog: '#eaf8ff',
        deco: ['🌻', '🌳', '🌼', '🌳', '🌷', '🌻'], ambient: ['birds', 'butterflies'] },
      { name: 'Montagne', sky0: '#5aa9e6', sky1: '#e3f4ff', sun: '#fff6c2', mount0: '#c4dcef', mount1: '#7a9e7e',
        grass: '#7cc47f', grass2: '#72b875', path: '#c9b18b', path2: '#bda57f', fog: '#f4fbff',
        deco: ['🌲', '🪨', '🌲', '🌲', '🌼', '🪨'], ambient: ['birds'] },
      { name: 'Désert', sky0: '#ffb347', sky1: '#ffe5b4', sun: '#fff1a8', mount0: '#e8a87c', mount1: '#d4925f',
        grass: '#f2c879', grass2: '#e9bd6c', path: '#e0a85f', path2: '#d69c54', fog: '#fff3e0',
        deco: ['🌵', '🪨', '🌵', '🌴', '🌵', '🪨'], ambient: [] },
    ],
    endText: 'Zéphyr a battu le record de vitesse !',
    sequence: [
      Z(2.5, 'Prêt ? On s\'échauffe !'),
      R(6, 12), J(), R(5, 10),
      L(), D(), L(), D(),
      S(), J(2), X(),
      R(6, 12),
      P('airplane'),
      B(10, 6),
      K(10),
      C('jump', 'squat'),
      L(), D(),
      F(14),
      R(8, 16),
      C('left', 'jump', 'right', 'jump'),
      S(2), X(2),
      P('star'),
      R(6, 12),
      C('jump', 'squat', 'smash'),
      Z(3, 'Bravo ! Respire bien…'),
    ],
  },
  {
    id: 'island',
    name: 'Île Bondissante',
    tagline: 'Saute partout et casse les caisses !',
    heroName: 'Pip',
    hero: { body: '#ffb703', belly: '#fff3c4', limb: '#d18a00', accent: '#e63946' },
    collectible: '⭐',
    sky: ['#7fc8f8', '#ffe5d0'],
    biomes: [
      { name: 'Plage', sky0: '#3fa7f5', sky1: '#ffe9c7', sun: '#fff1a8', mount0: '#7ec8e3', mount1: '#4fb0c6',
        grass: '#f1d7a0', grass2: '#e8cc90', path: '#e3b873', path2: '#d8ab64', fog: '#fff6e6',
        deco: ['🌴', '🐚', '🌺', '🌴', '⛱️', '🐚'], ambient: ['gulls'] },
      { name: 'Jungle', sky0: '#5fb8a0', sky1: '#d8f3dc', sun: '#fff6c2', mount0: '#74c69d', mount1: '#2d6a4f',
        grass: '#52b788', grass2: '#4aa87d', path: '#b08968', path2: '#a47f5f', fog: '#e9fff3',
        deco: ['🌴', '🌺', '🌿', '🍄', '🌴', '🌺'], ambient: ['butterflies', 'petals'] },
      { name: 'Volcan', sky0: '#ff7b54', sky1: '#ffd56b', sun: '#fff1c1', mount0: '#a05252', mount1: '#6b3e3e',
        grass: '#90be6d', grass2: '#86b263', path: '#bc6c25', path2: '#b0611f', fog: '#ffe8d6',
        deco: ['🌴', '🌋', '🌼', '🌴', '🍄', '🌋'], ambient: ['birds'] },
    ],
    endText: 'Pip a rempli son sac d\'étoiles !',
    sequence: [
      Z(2.5, 'Prêt ? On saute !'),
      R(5, 10), J(), J(2), X(),
      S(), J(3),
      P('armsUp'),
      X(2), L(), D(),
      B(10, 6),
      Q(3),
      R(6, 12),
      C('jump', 'smash'),
      F(14),
      S(2), J(2),
      P('flamingo', 2),
      C('squat', 'jump', 'smash'),
      X(3),
      R(6, 12),
      C('left', 'smash', 'right', 'smash'),
      J(3),
      Z(3, 'Super ! Souffle un peu…'),
    ],
  },
  {
    id: 'forest',
    name: 'Monde des Créatures',
    tagline: 'Imite les créatures pour devenir leur ami !',
    heroName: 'Lumi',
    biomes: [
      { name: 'Forêt', sky0: '#5aa9e6', sky1: '#cdeffd', sun: '#fff6c2', mount0: '#86aecb', mount1: '#4f8a6b',
        grass: '#5cb85c', grass2: '#53a953', path: '#d9b779', path2: '#cdaa6a', fog: '#e8f7ff',
        deco: ['🌲', '🌳', '🍄', '🌸', '🌲', '🌼'], ambient: ['birds', 'butterflies', 'petals'] },
      { name: 'Plage', sky0: '#3fa7f5', sky1: '#ffe9c7', sun: '#fff1a8', mount0: '#7ec8e3', mount1: '#4fb0c6',
        grass: '#f1d7a0', grass2: '#e8cc90', path: '#e3b873', path2: '#d8ab64', fog: '#fff6e6',
        deco: ['🌴', '🐚', '🌺', '🌴', '🪸', '⛱️'], ambient: ['gulls'] },
      { name: 'Vallée étoilée', night: true, sky0: '#1b1d4f', sky1: '#5b4b8a', sun: '#fff6d5', mount0: '#3a3370', mount1: '#2b5d63',
        grass: '#2f6f5e', grass2: '#2a6455', path: '#8e7cc3', path2: '#8170b5', fog: '#b9a7ff',
        deco: ['🌲', '🍄', '✨', '🌸', '🌲', '💎'], ambient: ['fireflies'] },
    ],
    hero: { body: '#b388eb', belly: '#f3e8ff', limb: '#8a5cc7', accent: '#72efdd' },
    collectible: '🫐',
    sky: ['#232661', '#7b5ea7'],
    creatures: true, // les poses font apparaître des créatures à apprivoiser
    endText: 'Lumi et ses nouveaux amis te disent bravo !',
    sequence: [
      Z(2.5, 'Prêt ? On imite Lumi !'),
      R(5, 10),
      P('armsUp'), P('star'),
      S(), J(),
      P('airplane'),
      L(), D(),
      P('flamingo', 2),
      B(10, 6),
      R(6, 12),
      K(10),
      F(14),
      C('squat', 'jump'),
      P('star'),
      X(2),
      C('left', 'right', 'jump'),
      P('airplane', 2),
      R(6, 12),
      S(2), J(2),
      P('armsUp', 2),
      C('jump', 'squat', 'smash'),
      Z(3, 'Magnifique… respire comme Lumi.'),
    ],
  },
  {
    id: 'banquise',
    name: 'Banquise Glacée',
    tagline: 'Glisse sur la glace et attrape les flocons !',
    heroName: 'Flocon',
    hero: { body: '#9ad7ff', belly: '#f0faff', limb: '#4f9fd1', accent: '#ff7eb6' },
    collectible: '❄️',
    sky: ['#9ad7ff', '#eef8ff'],
    biomes: [
      { name: 'Glacier', sky0: '#8fd3ff', sky1: '#eef8ff', sun: '#fff9e0', mount0: '#d7ecf8', mount1: '#b3d6ea',
        grass: '#f4fbff', grass2: '#e6f3fb', path: '#c9e6f7', path2: '#bcdff3', fog: '#ffffff',
        deco: ['⛄', '🧊', '🌲', '❄️', '🧊', '⛄'], ambient: ['snow'] },
      { name: 'Aurore', night: true, sky0: '#0b1d3a', sky1: '#2a6f6a', sun: '#e8fff6', mount0: '#25496b', mount1: '#1b3550',
        grass: '#dcecf5', grass2: '#cfe2ee', path: '#a9cbe0', path2: '#9cc0d8', fog: '#7ff0c8',
        deco: ['🌲', '🧊', '⛄', '🌲', '✨', '🧊'], ambient: ['snow', 'fireflies'] },
    ],
    endText: 'Flocon a glissé jusqu\'au bout de la banquise !',
    sequence: [
      Z(2.5, 'Prêt ? On glisse !'),
      R(6), J(), K(10), S(), L(), D(),
      P('armsUp'), Q(3), B(10, 6), X(2),
      C('jump', 'squat'), F(14), P('star'), R(6), K(8),
      Z(3, 'Bravo ! Souffle comme le vent du nord…'),
    ],
  },
  {
    id: 'ocean',
    name: 'Fond de l\'Océan',
    tagline: 'Nage entre les coraux et éclate les bulles !',
    heroName: 'Plouf',
    hero: { body: '#2ec4b6', belly: '#d9fbf7', limb: '#168f84', accent: '#ffbe0b' },
    collectible: '🐚',
    sky: ['#1e90c8', '#7fdbff'],
    biomes: [
      { name: 'Lagon', sky0: '#1e90c8', sky1: '#7fdbff', sun: '#fdf7c3', mount0: '#3aa6d0', mount1: '#2a8fb8',
        grass: '#e9d8a6', grass2: '#e0cc93', path: '#d4b483', path2: '#c9a874', fog: '#bdeeff',
        deco: ['🪸', '🐚', '🌿', '🪸', '🐠', '🐚'], ambient: ['rising'] },
      { name: 'Récif', sky0: '#0a5c8a', sky1: '#3fb0d0', sun: '#d8f6ff', mount0: '#1f7fa8', mount1: '#14668b',
        grass: '#2a9d8f', grass2: '#26907f', path: '#e9c46a', path2: '#ddb85d', fog: '#a8e6ff',
        deco: ['🪸', '🐠', '🐙', '🪸', '🐡', '🌿'], ambient: ['rising'] },
      { name: 'Abysses', night: true, sky0: '#03045e', sky1: '#0077b6', sun: '#caf0f8', mount0: '#023e8a', mount1: '#012a5e',
        grass: '#023e8a', grass2: '#03357a', path: '#48cae4', path2: '#3fb8d0', fog: '#90e0ef',
        deco: ['🐙', '🪸', '🐚', '🦑', '🪸', '✨'], ambient: ['rising', 'fireflies'] },
    ],
    endText: 'Plouf a exploré tout l\'océan !',
    sequence: [
      Z(2.5, 'Prêt ? On plonge !'),
      B(12, 8), R(6), S(), J(), K(10),
      P('airplane'), L(), D(), X(2), B(10, 6),
      C('squat', 'jump'), F(14), P('star'), Q(3), R(6),
      Z(3, 'Super ! Respire comme une baleine…'),
    ],
  },
  {
    id: 'espace',
    name: 'Voyage dans l\'Espace',
    tagline: 'Saute de planète en planète !',
    heroName: 'Comète',
    hero: { body: '#9b5de5', belly: '#efe3ff', limb: '#6a2fbf', accent: '#00f5d4' },
    collectible: '⭐',
    sky: ['#0b0c2a', '#2e2a6b'],
    biomes: [
      { name: 'Lune', night: true, sky0: '#0b0c2a', sky1: '#2e2a6b', sun: '#fff6d5', mount0: '#4a4a6a', mount1: '#6c6c8a',
        grass: '#9a9cab', grass2: '#8e90a0', path: '#c7c9d9', path2: '#babccd', fog: '#8f8fd0',
        deco: ['🪐', '🌙', '🚀', '☄️', '🛸', '🪐'], ambient: ['fireflies'] },
      { name: 'Planète rouge', night: true, sky0: '#2a0b1f', sky1: '#6b2a4b', sun: '#ffe0c2', mount0: '#7a2e2e', mount1: '#9c3d1f',
        grass: '#c1440e', grass2: '#b33d0b', path: '#e07a5f', path2: '#d46f54', fog: '#ff9f80',
        deco: ['🪨', '🚀', '🛸', '🪨', '🪐', '☄️'], ambient: ['fireflies'] },
      { name: 'Nébuleuse', night: true, sky0: '#1a0b3a', sky1: '#7b2cbf', sun: '#fff0ff', mount0: '#3c096c', mount1: '#5a189a',
        grass: '#5a189a', grass2: '#521590', path: '#c77dff', path2: '#b96ff2', fog: '#e0aaff',
        deco: ['✨', '🪐', '🌟', '☄️', '✨', '🛸'], ambient: ['fireflies'] },
    ],
    endText: 'Comète a fait le tour de la galaxie !',
    sequence: [
      Z(2.5, 'Prêt pour le décollage ? 3, 2, 1…'),
      J(), K(12), R(6), S(), P('star'),
      L(), D(), Q(4), X(2), B(10, 6),
      C('jump', 'smash'), F(14), P('airplane'), K(10), J(2),
      Z(3, 'Atterrissage en douceur… respire.'),
    ],
  },
  {
    id: 'bonbons',
    name: 'Pays des Bonbons',
    tagline: 'Un chemin tout en sucre !',
    heroName: 'Praline',
    hero: { body: '#ff70a6', belly: '#ffe5ef', limb: '#d94c84', accent: '#70d6ff' },
    collectible: '🍬',
    sky: ['#ffc8dd', '#fff0f6'],
    biomes: [
      { name: 'Prairie sucrée', sky0: '#ffafcc', sky1: '#fff0f6', sun: '#fff6c2', mount0: '#ffc8dd', mount1: '#cdb4db',
        grass: '#ffafcc', grass2: '#ffa3c4', path: '#fde2e4', path2: '#fad2d8', fog: '#fff5fa',
        deco: ['🍭', '🧁', '🍩', '🍬', '🍦', '🧁'], ambient: ['petals'] },
      { name: 'Montagne de glace', sky0: '#a2d2ff', sky1: '#e7f5ff', sun: '#fff6c2', mount0: '#bde0fe', mount1: '#cdb4db',
        grass: '#bde0fe', grass2: '#b1d8fb', path: '#fff1e6', path2: '#fbe6d6', fog: '#ffffff',
        deco: ['🍦', '🍭', '🎂', '🍦', '🍬', '🍩'], ambient: ['petals'] },
    ],
    endText: 'Praline a goûté tous les bonbons du pays !',
    sequence: [
      Z(2.5, 'Prêt ? Miam, on y va !'),
      R(6), K(10), J(), S(), X(2),
      P('armsUp'), B(10, 6), L(), D(), Q(3),
      C('jump', 'squat', 'smash'), F(14), P('flamingo', 2), R(6),
      Z(3, 'Bravo ! Souffle comme sur un gâteau…'),
    ],
  },
  {
    id: 'ferme',
    name: 'La Ferme Joyeuse',
    tagline: 'Aide les animaux de la ferme !',
    heroName: 'Grain',
    hero: { body: '#f4a259', belly: '#fff1e0', limb: '#c97a2e', accent: '#5b8e7d' },
    collectible: '🥕',
    sky: ['#8ecae6', '#e8f6ff'],
    biomes: [
      { name: 'Champs', sky0: '#8ecae6', sky1: '#e8f6ff', sun: '#fff6c2', mount0: '#a7c957', mount1: '#6a994e',
        grass: '#a7c957', grass2: '#9dbf4d', path: '#bc8a5f', path2: '#b07e53', fog: '#f4fbff',
        deco: ['🌾', '🐄', '🌻', '🚜', '🐔', '🌾'], ambient: ['birds', 'butterflies'] },
      { name: 'Verger', sky0: '#7cc6fe', sky1: '#f0f9ff', sun: '#fff6c2', mount0: '#90be6d', mount1: '#43aa8b',
        grass: '#6a994e', grass2: '#618f45', path: '#c9a227', path2: '#bd961d', fog: '#f4fbff',
        deco: ['🍎', '🌳', '🐑', '🍐', '🌳', '🐷'], ambient: ['butterflies', 'birds'] },
    ],
    endText: 'Grain a aidé tous les animaux de la ferme !',
    sequence: [
      Z(2.5, 'Prêt ? Bonjour la ferme !'),
      R(6), J(), S(), K(10), P('armsUp'),
      L(), D(), X(2), Q(3), B(10, 6),
      C('squat', 'jump'), F(14), P('flamingo', 2), R(6),
      Z(3, 'Bravo ! Les animaux te disent merci…'),
    ],
  },
  {
    id: 'dinos',
    name: 'Vallée des Dinos',
    tagline: 'Saute par-dessus les fougères géantes !',
    heroName: 'Croc',
    hero: { body: '#70c16f', belly: '#e8f8df', limb: '#3f8f3e', accent: '#ff9f1c' },
    collectible: '🥚',
    sky: ['#9ad1d4', '#e8f6ef'],
    biomes: [
      { name: 'Fougères', sky0: '#9ad1d4', sky1: '#e8f6ef', sun: '#fff6c2', mount0: '#80b192', mount1: '#4f7942',
        grass: '#6a994e', grass2: '#618f45', path: '#a68a64', path2: '#9a7e59', fog: '#eefaf2',
        deco: ['🦕', '🌴', '🌿', '🦖', '🌴', '🥚'], ambient: ['birds'] },
      { name: 'Volcan', sky0: '#ff8c42', sky1: '#ffd29d', sun: '#fff1c1', mount0: '#8a4f3a', mount1: '#5e3023',
        grass: '#8a5a44', grass2: '#7e513d', path: '#5e3023', path2: '#53291d', fog: '#ffd8b8',
        deco: ['🌋', '🦕', '🪨', '🌋', '🦖', '🌴'], ambient: [] },
    ],
    endText: 'Croc a retrouvé tous les œufs de la vallée !',
    sequence: [
      Z(2.5, 'Prêt ? Les dinos t\'attendent !'),
      J(), R(6), J(2), S(), X(2),
      P('star'), K(10), L(), D(), Q(4),
      C('jump', 'smash'), F(14), P('airplane'), B(10, 6), R(6),
      Z(3, 'Bravo ! Respire comme un grand dino…'),
    ],
  },
  {
    id: 'chateau',
    name: 'Château Enchanté',
    tagline: 'Traverse le jardin magique du château !',
    heroName: 'Étincelle',
    hero: { body: '#c77dff', belly: '#f6e8ff', limb: '#9d4edd', accent: '#ffd60a' },
    collectible: '💎',
    sky: ['#cdb4db', '#fdf0ff'],
    biomes: [
      { name: 'Jardin royal', sky0: '#a0c4ff', sky1: '#fdf0ff', sun: '#fff6c2', mount0: '#cdb4db', mount1: '#80b918',
        grass: '#80b918', grass2: '#76ad15', path: '#d6ccc2', path2: '#cbc0b5', fog: '#fbf5ff',
        deco: ['🏰', '🌹', '🌳', '🌷', '🏰', '🌳'], ambient: ['butterflies', 'petals'] },
      { name: 'Forêt magique', night: true, sky0: '#240046', sky1: '#5a189a', sun: '#fff6d5', mount0: '#3c096c', mount1: '#10002b',
        grass: '#3c096c', grass2: '#360862', path: '#e0aaff', path2: '#d49af5', fog: '#c77dff',
        deco: ['🌳', '✨', '🍄', '💎', '🌳', '🦄'], ambient: ['fireflies'] },
    ],
    endText: 'Étincelle est arrivée au château !',
    sequence: [
      Z(2.5, 'Prêt ? Abracadabra !'),
      R(6), P('star'), J(), S(), K(10),
      L(), D(), B(10, 6), X(2), P('armsUp'),
      C('squat', 'jump'), Q(3), F(14), P('flamingo', 2), R(6),
      Z(3, 'Magnifique ! Fais une révérence…'),
    ],
  }
];

const SPEEDS = [
  { id: 'easy', label: 'Facile', mul: 1.5 },
  { id: 'normal', label: 'Normal', mul: 1 },
  { id: 'fast', label: 'Rapide', mul: 0.75 },
];

// Paysage 3D (« kit » de décor, voir props3d.js) de chaque partie de chaque monde
const WORLD_KITS = {
  jardin3d: ['meadow'], turbo: ['meadow', 'mountain', 'desert'], island: ['beach', 'jungle', 'volcano'],
  forest: ['forest', 'beach', 'night'], banquise: ['glacier', 'aurora'], ocean: ['lagoon', 'reef', 'abyss'],
  espace: ['moon', 'mars', 'nebula'], bonbons: ['candy', 'icecream'], ferme: ['farm', 'orchard'],
  dinos: ['ferns', 'dinoland'], chateau: ['garden', 'magic'],
};
// Épreuves rigolotes ajoutées à chaque monde (tunnel, taupes, copie de poses)
const FUN_POSES = [['armsUp', 'star', 'airplane'], ['airplane', 'armsUp', 'star'], ['star', 'airplane', 'armsUp']];
WORLDS.forEach((w, i) => {
  (WORLD_KITS[w.id] || []).forEach((kit, k) => { if (w.biomes[k]) w.biomes[k].kit = kit; });
  const seq = w.sequence, n = seq.length;
  seq.splice(Math.round(n * 0.75), 0, PM(...FUN_POSES[i % FUN_POSES.length]));
  seq.splice(Math.round(n * 0.5), 0, M(12, 6));
  seq.splice(Math.round(n * 0.25), 0, U(4));
});
