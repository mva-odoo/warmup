// Mouvements, séquences et les 3 mondes (univers originaux).

const POSES = {
  armsUp:   { icon: '🙌', label: "Bras en l'air !",            say: "Les bras en l'air !" },
  airplane: { icon: '✈️', label: "Fais l'avion !",             say: "Fais l'avion, bras tendus !" },
  star:     { icon: '⭐', label: "Fais l'étoile !",            say: "Fais l'étoile ! Bras et jambes écartés !" },
  flamingo: { icon: '🦩', label: 'Le flamant : sur un pied !', say: 'Le flamant rose ! Tiens sur un pied !' },
};

const MOVE_ICONS = { run: '🏃', jump: '🦘', squat: '🐸', left: '⬅️', right: '➡️', smash: '💥', rest: '😮‍💨' };
const MOVE_SHORT = { jump: 'Saute', squat: 'Accroupi', left: 'Gauche', right: 'Droite', smash: 'Smash' };

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

function stepIcon(s) {
  if (s.m === 'pose') return POSES[s.pose].icon;
  if (s.m === 'combo') return '🔥';
  return MOVE_ICONS[s.m];
}

function stepLabel(s) {
  switch (s.m) {
    case 'run': return 'Cours sur place !';
    case 'jump': return s.n > 1 ? `Saute ${s.n} fois !` : 'Saute !';
    case 'squat': return s.n > 1 ? `Accroupis-toi ${s.n} fois !` : 'Accroupis-toi !';
    case 'smash': return s.n > 1 ? `${s.n} smashs !` : 'Smash !';
    case 'left': return 'Va à gauche !';
    case 'right': return 'Va à droite !';
    case 'pose': return POSES[s.pose].label;
    case 'combo': return 'Combo !';
    case 'rest': return s.text;
  }
}

function stepSpeech(s) {
  switch (s.m) {
    case 'pose': return POSES[s.pose].say;
    case 'combo': return 'Combo ! ' + s.parts.map((p) => MOVE_SHORT[p]).join(', ') + ' !';
    case 'smash': return s.n > 1 ? `${s.n} smashs !` : 'Smash !';
    default: return stepLabel(s);
  }
}

// Durée de la fenêtre (secondes, avant le multiplicateur de difficulté)
function stepDuration(s) {
  switch (s.m) {
    case 'run': case 'rest': return s.t;
    case 'jump': return 1.8 + 1.0 * s.n;
    case 'squat': return 2.0 + 1.6 * s.n;
    case 'smash': return 2.0 + 1.2 * s.n;
    case 'left': case 'right': return 2.6;
    case 'pose': return 3 + s.hold;
    case 'combo': return 1.5 + 1.7 * s.parts.length;
  }
}

function maxPoints(s) {
  switch (s.m) {
    case 'run': return s.target * 10;
    case 'jump': case 'squat': case 'smash': return s.n * 100 + 50;
    case 'left': case 'right': return 150;
    case 'pose': return 200;
    case 'combo': return s.parts.length * 100 + 200;
    default: return 0;
  }
}

const WORLDS = [
  {
    id: 'turbo',
    name: 'Vallée Turbo',
    tagline: 'Cours plus vite que le vent !',
    heroName: 'Zéphyr',
    hero: { type: 'speedy', body: '#2ec4b6', belly: '#d9fbf7', limb: '#1b8a80', accent: '#ff9f1c' },
    collectible: '⚡',
    sky: ['#4cc3ff', '#d4f4ff'], far: '#8fdc9a', mid: '#46b86d',
    ground: '#c98b4b', groundTop: '#5ccb5f', stripe: '#b57a3e',
    deco: ['🌴', '🌻', '🌴', '🌵'],
    obstacle: '#7c6a5c', flyer: '#ef476f',
    endText: 'Zéphyr a battu le record de vitesse !',
    sequence: [
      Z(2.5, 'Prêt ? On s\'échauffe !'),
      R(6, 12), J(), R(5, 10),
      L(), D(), L(), D(),
      S(), J(2), X(),
      R(6, 12),
      P('airplane'),
      C('jump', 'squat'),
      L(), D(),
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
    hero: { type: 'bouncy', body: '#ffb703', belly: '#fff3c4', limb: '#d18a00', accent: '#e63946' },
    collectible: '⭐',
    sky: ['#7fc8f8', '#ffe5d0'], far: '#b5d96b', mid: '#6a994e',
    ground: '#bc6c25', groundTop: '#90be6d', stripe: '#a35a1c',
    deco: ['🌳', '🍄', '🌳', '🌼'],
    obstacle: '#8d5a3b', flyer: '#5e60ce',
    endText: 'Pip a rempli son sac d\'étoiles !',
    sequence: [
      Z(2.5, 'Prêt ? On saute !'),
      R(5, 10), J(), J(2), X(),
      S(), J(3),
      P('armsUp'),
      X(2), L(), D(),
      R(6, 12),
      C('jump', 'smash'),
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
    view: 'depth',
    biomes: [
      { name: 'Forêt', sky0: '#5aa9e6', sky1: '#cdeffd', sun: '#fff6c2', mount0: '#86aecb', mount1: '#4f8a6b',
        grass: '#5cb85c', grass2: '#53a953', path: '#d9b779', path2: '#cdaa6a', fog: '#e8f7ff',
        deco: ['🌲', '🌳', '🍄', '🌸', '🌲', '🌼'] },
      { name: 'Plage', sky0: '#3fa7f5', sky1: '#ffe9c7', sun: '#fff1a8', mount0: '#7ec8e3', mount1: '#4fb0c6',
        grass: '#f1d7a0', grass2: '#e8cc90', path: '#e3b873', path2: '#d8ab64', fog: '#fff6e6',
        deco: ['🌴', '🐚', '🌺', '🌴', '🪸', '⛱️'] },
      { name: 'Vallée étoilée', night: true, sky0: '#1b1d4f', sky1: '#5b4b8a', sun: '#fff6d5', mount0: '#3a3370', mount1: '#2b5d63',
        grass: '#2f6f5e', grass2: '#2a6455', path: '#8e7cc3', path2: '#8170b5', fog: '#b9a7ff',
        deco: ['🌲', '🍄', '✨', '🌸', '🌲', '💎'] },
    ],
    hero: { type: 'creature', body: '#b388eb', belly: '#f3e8ff', limb: '#8a5cc7', accent: '#72efdd' },
    collectible: '🫐',
    sky: ['#232661', '#7b5ea7'], far: '#3d348b', mid: '#2a7f78',
    ground: '#4a3f35', groundTop: '#43aa8b', stripe: '#3d342b',
    deco: ['🌲', '🍄', '🌲', '🌸'],
    obstacle: '#6b5b4e', flyer: '#ffd166',
    night: true,
    endText: 'Lumi et ses nouveaux amis te disent bravo !',
    sequence: [
      Z(2.5, 'Prêt ? On imite Lumi !'),
      R(5, 10),
      P('armsUp'), P('star'),
      S(), J(),
      P('airplane'),
      L(), D(),
      P('flamingo', 2),
      R(6, 12),
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
];

const SPEEDS = [
  { id: 'easy', label: 'Facile', mul: 1.4 },
  { id: 'normal', label: 'Normal', mul: 1 },
  { id: 'fast', label: 'Rapide', mul: 0.75 },
];
