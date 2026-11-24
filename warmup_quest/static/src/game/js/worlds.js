// Mouvements, consignes et les 8 mondes à thème (Stade, Magasin, Bain, Château, Banquise, Dinos, Espace, Disco).

// Consignes courtes et concrètes : chaque mouvement correspond à un obstacle visible sur le chemin
// (tronc = saute, branche = baisse-toi, rocher = tape, étoile dans un couloir = va à gauche / à droite).
const POSES = {
  armsUp:   { icon: '🙌', label: 'Lève les bras !',          say: 'Lève les deux bras tout en haut !' },
  airplane: { icon: '✈️', label: "Bras écartés : l'avion !", say: "Fais l'avion : les bras bien écartés, sur les côtés !" },
  star:     { icon: '⭐', label: "Fais l'étoile !",           say: "Fais l'étoile : écarte les bras et les jambes !" },
  flamingo: { icon: '🦩', label: 'Tiens sur un pied !',       say: 'Lève un genou et tiens sur un pied !' },
};

const MOVE_ICONS = { run: '🪨', jump: '⬆️', squat: '⬇️', left: '⬅️', right: '➡️', smash: '👊', rest: '😮‍💨', bubbles: '🫧', freeze: '🎵', catch: '⭐', tunnel: '🚇', moles: '🐹', shop: '🛒', foam: '🧽', dance: '💃', slice: '🍉', cubes: '🟦', goal: '🧤', kick: '⚽' };
const MOVE_SHORT = { jump: 'Saute', squat: 'Baisse-toi', left: 'Gauche', right: 'Droite', smash: 'Tape' };

// Petits constructeurs de séquences
const R = (t) => ({ m: 'run', t });            // éviter les obstacles pendant t secondes
const J = (n = 1) => ({ m: 'jump', n });
const S = (n = 1) => ({ m: 'squat', n });
const X = (n = 1) => ({ m: 'smash', n });
const L = () => ({ m: 'left' });
const D = () => ({ m: 'right' });
const P = (pose, hold = 1.5) => ({ m: 'pose', pose, hold });
const Z = (t, text) => ({ m: 'rest', t, text });
const B = (t, n) => ({ m: 'bubbles', t, n });   // éclater n bulles avec les mains
const F = (t) => ({ m: 'freeze', t });          // statues musicales
const K = (t) => ({ m: 'catch', t });           // attraper les étoiles qui tombent (gauche / milieu / droite)
const U = (t) => ({ m: 'tunnel', t });          // rester baissé t secondes dans le tunnel
const M = (t, n) => ({ m: 'moles', t, n });     // taper n taupes qui sortent autour du personnage
const MO = (t, n) => ({ m: 'foam', t, n });   // singes farceurs : nettoyer n taches de mousse sur l'écran
const SH = (t) => ({ m: 'shop', t });           // supermarché : remplir son caddie en évitant les chapardeurs
const DN = (...moves) => ({ m: 'dance', moves, beat: 1.8 });   // danser : imiter Tempo pas à pas
const SL = (t, n) => ({ m: 'slice', t, n });    // couper n fruits lancés en l'air (d'un geste de la main)
const CU = (n, beat = 1.4) => ({ m: 'cubes', n, beat }); // taper n cubes qui arrivent en rythme (gauche / droite)
const GO = (n) => ({ m: 'goal', n });          // gardien de but : arrêter n tirs avec les mains
const KI = (n) => ({ m: 'kick', n });          // penalty : lever le genou du côté du ballon (ou lancer à la main), n buts
const AC = (game, n) => ({ m: 'act', game, n }); // jeu sur place d'un monde (voir ACTS), n fois

// Jeux sur place : on ne court pas. Le petit sorcier imite l'enfant, le décor du jeu se dessine autour
// (depth.js : drawAct) ; la partie compte les gestes (game.js : updateAct). per : gestes pour une réussite (n réussites)
const ACTS = {
  shelf: { icon: '🛒', label: 'Range les rayons !', sec: 5, pts: 100, coach: 'squat',
    say: 'On range le magasin ! Baisse-toi pour prendre un produit sur le rayon du bas, puis lève les bras pour le poser tout en haut !',
    tuto: 'Baisse-toi tout en bas pour prendre un produit sur le rayon du bas. Puis relève-toi et lève les deux bras : tu le poses sur le rayon du haut !',
    cheer: ['Bien rangé !', 'Tout en haut !', 'Quel vendeur !'] },
  clap: { icon: '🐧', label: 'Réchauffe les pingouins !', sec: 4.5, pts: 100, per: 3, coach: null,
    say: 'Les bébés pingouins ont froid ! Tape dans tes mains trois fois pour réchauffer chaque pingouin !',
    tuto: 'Les bébés pingouins grelottent. Tape dans tes mains, bien devant toi : clap, clap, clap ! À chaque fois, le pingouin se réchauffe un peu. Trois claps, et il a bien chaud !',
    cheer: ['Il a bien chaud !', 'Merci pour le pingouin !', 'Tout chaud !'] },
  swim: { icon: '🐬', label: 'Nage avec les dauphins !', sec: 1.5, pts: 40, coach: null,
    say: 'Nage avec les dauphins jusqu\'au trésor ! Lève un bras, puis l\'autre, comme un nageur !',
    tuto: 'Pour nager, fais de grands mouvements de bras, l\'un après l\'autre : le bras gauche en haut, puis le bras droit, comme un vrai nageur. À chaque mouvement, tu avances vers le trésor !',
    cheer: [] },
  launch: { icon: '🚀', label: 'Fais décoller la fusée !', sec: 6.5, pts: 120, coach: 'squat',
    say: 'Décollage ! Baisse-toi et reste en bas pour remplir la fusée de carburant… puis saute très haut pour la faire décoller !',
    tuto: 'Baisse-toi tout en bas et ne bouge plus : la jauge de carburant se remplit. Quand la fusée clignote, saute le plus haut possible : décollage !',
    cheer: ['Décollage !', 'Elle file dans les étoiles !', 'Vers une nouvelle planète !'] },
  stomp: { icon: '🦕', label: 'Marche comme un dino !', sec: 5, pts: 100, per: 4, coach: 'flamingo',
    say: 'Des œufs de dinosaure ! Marche sur place comme un gros dino, en levant bien les genoux : boum, boum ! Les œufs vont éclore !',
    tuto: 'Marche sur place comme un énorme dinosaure : lève un genou, puis l\'autre, bien haut, et pose ton pied fort par terre. Boum, boum ! À chaque pas, l\'œuf craque un peu plus.',
    cheer: ['Un bébé dino !', 'Coucou petit dino !', 'Il est né !'] },
};
// Jeux miroir (scène fixe, comme sur console) : l'enfant se voit en grand (image de la caméra, en miroir) et la magie se
// dessine autour de lui ; pas de chemin, pas de course. Moteur : arena.js. n : murs, ordres, bonshommes, potions…
const AR = (game, n) => ({ m: 'arena', game, n });
const ARENA = {
  mur: { icon: '🧱', label: 'Le Mur Magique !', sec: 4.2, pts: 100,
    say: 'Le Mur Magique arrive ! Regarde le trou dans le mur, et prends la même pose pour passer à travers !',
    tuto: 'Un mur arrive vers toi, avec un trou en forme de pose : les bras en l\'air, l\'avion, l\'étoile, accroupi, ou un pas de côté. Prends la même pose avant qu\'il arrive, et tu passes à travers !' },
  pimprenelle: { icon: '🦉', label: 'Pimprenelle a dit !', sec: 4.5, pts: 100,
    say: 'Pimprenelle a dit ! Fais ce qu\'elle dit… mais seulement si elle dit « Pimprenelle a dit » !',
    tuto: 'Madame Pimprenelle donne des ordres. Si elle dit « Pimprenelle a dit », fais-le vite ! Si elle ne le dit pas, ne bouge pas : c\'est un piège !' },
  neige: { icon: '⛄', label: 'Bataille de boules de neige !', sec: 3.2, pts: 80,
    say: 'Bataille de boules de neige ! Lance une boule sur les bonshommes de neige farceurs : lève le bras et baisse-le d\'un coup !',
    tuto: 'Des bonshommes de neige farceurs apparaissent autour de toi. Lève le bras et lance-le vers l\'avant, d\'un coup, du côté du bonhomme : la boule part ! Tu peux aussi les toucher avec ta main.' },
  course: { icon: '🏁', label: 'La grande course !', sec: 24, pts: 300, // (n = 1 : une course jusqu'au drapeau)
    say: 'La grande course des chevaliers ! Cours sur place, le plus vite possible, pour arriver au drapeau avant l\'autre chevalier !',
    tuto: 'Ton chevalier fait la course contre un autre chevalier. Cours sur place en levant bien les genoux : plus tu cours vite, plus il avance. Arrive au drapeau le premier !' },
};
// Pimprenelle a dit : les ordres (geste à faire) et les phrases (dites telles quelles : la voix est générée à l'avance)
const SIMON_ORDERS = [
  { g: 'armsUp', icon: '🙌', yes: 'Pimprenelle a dit : lève les bras !', no: 'Lève les bras !' },
  { g: 'squat', icon: '⬇️', yes: 'Pimprenelle a dit : baisse-toi !', no: 'Baisse-toi !' },
  { g: 'jump', icon: '⬆️', yes: 'Pimprenelle a dit : saute !', no: 'Saute !' },
  { g: 'airplane', icon: '✈️', yes: "Pimprenelle a dit : fais l'avion !", no: "Fais l'avion !" },
  { g: 'star', icon: '⭐', yes: "Pimprenelle a dit : fais l'étoile !", no: "Fais l'étoile !" },
  { g: 'smash', icon: '👊', yes: 'Pimprenelle a dit : tape fort !', no: 'Tape fort !' },
  { g: 'flamingo', icon: '🦩', yes: 'Pimprenelle a dit : tiens sur un pied !', no: 'Tiens sur un pied !' },
];
// Phrases dites pendant les jeux miroir (liste fixe, pour la voix générée à l'avance)
const ARENA_LINES = ['Cours !', 'Plus vite !', 'Piégé ! Elle n\'avait pas dit « Pimprenelle a dit » !',
  'Bien joué, tu ne t\'es pas fait avoir !', 'Bravo !', 'Trop tard !', 'Touché !', 'Encore un !', 'Super, le mur est passé !', 'Ouille, le mur !',
  'Champion !', 'Presque ! La prochaine fois !', 'Échauffement magique ! Tends bien ton bras pour attraper l\'étoile !', 'Super, c\'est parti !', 'Pause ! Revenez à deux, ou lève les bras pour continuer tout seul.'];

// Fruits à couper : émoji, couleur du jus
const FRUITS = [['🍉', '#ff4d6d'], ['🍊', '#ffa62b'], ['🍎', '#ff3b3b'], ['🍍', '#ffd60a'], ['🥝', '#8ac926'], ['🍋', '#ffe94a'], ['🍑', '#ffb4a2'], ['🍇', '#9b5de5']];
// Position d'un fruit en vol (repère des bulles : unité ≈ demi-mètre, v vers le bas) : il monte, s'arrête, retombe
// (fall : le fruit tombe du ciel, passe par son point et continue sa chute)
function fruitPos(f, now) {
  const t = Math.min(1.2, (now - f.born) / f.dur);
  if (f.fall) return { u: f.u0 + (f.u1 - f.u0) * t, v: f.v0 + (f.v1 - f.v0) * t * t, t };
  if (f.cross) return { u: f.u0 + (f.u1 - f.u0) * t, v: f.av - Math.sin(Math.min(1, t) * Math.PI) * 0.7 + Math.max(0, t - 1) * 3, t }; // (traverse en petite cloche)
  return { u: f.u0 + (f.u1 - f.u0) * t, v: f.av + (f.v0 - f.av) * (2 * t - 1) * (2 * t - 1), t };
}
// Cubes : nombre, et instant d'arrivée de chacun
const cubeTravel = (mul = 1) => 2400 * Math.min(1.3, mul);

// « Imite le coach » : gestes reconnus par la caméra, avec leurs mots et icônes selon le style
const MIMIC_ICONS = { armsUp: '🙌', airplane: '✈️', star: '⭐', flamingo: '🦵', squat: '⬇️', left: '⬅️', right: '➡️', jump: '⬆️', smash: '👊' };
const MIMIC = {
  dance: {
    coach: 'Tempo', pal: { body: '#ffd166', belly: '#fff3c4', limb: '#9b5de5', accent: '#f15bb5' },
    say: { armsUp: 'En haut !', airplane: "L'avion !", star: "L'étoile !", flamingo: 'Sur un pied !', squat: 'En bas !',
      left: 'À gauche !', right: 'À droite !', jump: 'Saute !', smash: 'Et on frappe !' },
  },
};

// Attraper : nombre d'étoiles pendant l'étape
const catchCount = (s) => Math.max(3, Math.round(s.t / 1.6));

// Statues musicales : une manche ≈ 7 s (danse puis statue)
const freezeRounds = (s) => Math.max(1, Math.round(s.t / 7));

function stepIcon(s) {
  if (s.m === 'pose') return POSES[s.pose].icon;
  if (s.m === 'act') return ACTS[s.game].icon;
  if (s.m === 'arena') return ARENA[s.game].icon;
  if (s.m === 'run' && s.foot) return '⚽';
  return MOVE_ICONS[s.m];
}

function stepLabel(s) {
  switch (s.m) {
    case 'run': return s.foot ? 'Dribble les joueurs !' : 'Évite les obstacles !';
    case 'shop': return 'Remplis ton caddie !';
    case 'foam': return 'Nettoie la mousse !';
    case 'goal': return 'Arrête les tirs !';
    case 'kick': return 'Tire au but !';
    case 'act': return ACTS[s.game].label;
    case 'arena': return ARENA[s.game].label;
    case 'jump': return s.n > 1 ? `Saute ${s.n} fois !` : 'Saute !';
    case 'squat': return s.n > 1 ? `Baisse-toi ${s.n} fois !` : 'Baisse-toi !';
    case 'smash': return s.n > 1 ? `Tape ${s.n} fois avec les bras !` : 'Tape avec les bras !';
    case 'left': return 'Va à gauche !';
    case 'right': return 'Va à droite !';
    case 'bubbles': return 'Éclate les bulles !';
    case 'freeze': return 'Danse… puis statue !';
    case 'catch': return 'Attrape les étoiles !';
    case 'tunnel': return 'Reste baissé !';
    case 'moles': return 'Tape les taupes !';
    case 'dance': return 'Danse comme Tempo !';
    case 'slice': return 'Coupe les fruits !';
    case 'cubes': return 'Tape les cubes !';
    case 'pose': return POSES[s.pose].label;
    case 'rest': return s.text;
  }
}

// Ce que dit la voix : la consigne ET pourquoi (l'obstacle à passer)
function stepSpeech(s) {
  switch (s.m) {
    case 'run': return s.foot ? 'Dribble jusqu\'au but ! Saute par-dessus les joueurs qui taclent, baisse-toi sous les grands joueurs, et évite les plots !' : 'Évite les obstacles !';
    case 'jump': return s.n > 1 ? `Saute ${s.n} fois par-dessus le tronc !` : 'Saute par-dessus le tronc !';
    case 'squat': return s.n > 1 ? `Baisse-toi ${s.n} fois sous la branche !` : 'Baisse-toi sous la branche !';
    case 'smash': return s.n > 1 ? `Tape ${s.n} fois le rocher : lève les bras et descends-les fort !` : 'Tape le rocher : lève les bras et descends-les fort !';
    case 'left': return "Va à gauche attraper l'étoile !";
    case 'right': return "Va à droite attraper l'étoile !";
    case 'pose': return POSES[s.pose].say;
    case 'catch': return 'Attrape les étoiles qui arrivent : va à gauche, au milieu ou à droite pour être dessous !';
    case 'tunnel': return 'Baisse-toi et reste en bas jusqu\'à la sortie !';
    case 'moles': return 'Des taupes rigolotes ! Tape-les avec tes mains quand elles sortent de leur trou !';
    case 'foam': return 'Les singes farceurs mettent de la mousse partout ! Tes mains sont des éponges : nettoie tout !';
    case 'goal': return 'Tu es le gardien de but ! Arrête le ballon avec tes mains !';
    case 'kick': return 'Penalty ! Regarde de quel côté est le ballon, et lève le genou de ce côté pour tirer !';
    case 'act': return ACTS[s.game].say;
    case 'arena': return ARENA[s.game].say;
    case 'shop': return 'Au magasin ! Va dans le couloir du produit pour le mettre dans ton caddie. Attention aux chapardeurs : évite-les, ou saute par-dessus !';
    case 'dance': return 'Danse avec Tempo ! Fais comme lui, comme dans un miroir !';
    case 'slice': return 'Des fruits sautent en l\'air ! Coupe-les en deux avec ta main, comme un ninja !';
    case 'cubes': return 'Des cubes arrivent en musique ! Tape les bleus avec la main gauche et les orange avec la main droite !';
    case 'bubbles': return 'Des bulles partout ! Touche-les avec tes mains pour les éclater !';
    case 'freeze': return "Statues musicales ! Danse avec la musique. Quand elle s'arrête, ne bouge plus !";
    default: return stepLabel(s);
  }
}

// Évitements : nombre d'obstacles pendant l'étape
const dodgeCount = (s) => Math.max(2, Math.round(s.t / 2.5));

// Durée de la fenêtre (secondes, avant le multiplicateur de difficulté)
function stepDuration(s) {
  switch (s.m) {
    case 'run': case 'shop': case 'foam': case 'rest': case 'bubbles': case 'freeze': case 'catch': case 'moles': case 'slice': return s.t;
    case 'goal': return 2.5 + s.n * 3.0;
    case 'kick': return 2 + s.n * 4.5;
    case 'act': return 4 + s.n * ACTS[s.game].sec;
    case 'arena': return 5 + s.n * ARENA[s.game].sec;
    case 'jump': return 1.8 + 1.0 * s.n;
    case 'squat': return 2.0 + 1.6 * s.n;
    case 'smash': return 2.0 + 1.2 * s.n;
    case 'left': case 'right': return 2.6;
    case 'pose': return 3 + s.hold;
    case 'tunnel': return 1.5 + s.t + 1.5;
    case 'dance': return 2.6 + s.moves.length * s.beat;
    case 'cubes': return 1.5 + s.n * s.beat + 3;
  }
}

function maxPoints(s) {
  switch (s.m) {
    case 'run': case 'shop': return dodgeCount(s) * 60;
    case 'foam': return s.n * 50 + 50;
    case 'jump': case 'squat': case 'smash': return s.n * 100 + 50;
    case 'left': case 'right': return 150;
    case 'pose': return 200;
    case 'bubbles': return s.n * 50 + 50;
    case 'freeze': return freezeRounds(s) * 150;
    case 'catch': return catchCount(s) * 50;
    case 'tunnel': return 150 + 50;
    case 'moles': return s.n * 50 + 50;
    case 'dance': return s.moves.length * 100 + 50;
    case 'slice': case 'cubes': return s.n * 50 + 50;
    case 'goal': return s.n * 80;
    case 'kick': return s.n * 120;
    case 'act': return s.n * ACTS[s.game].pts + 100;
    case 'arena': return s.n * ARENA[s.game].pts + 100;
    default: return 0;
  }
}

// Les 8 mondes à thème, tous ouverts. icon : sur la carte du menu ; obstacles : ceux du chemin (étape run)
const WORLDS = [
  {
    id: 'stade', icon: '⚽',
    name: 'Le Stade',
    tagline: 'Dribble, arrête les tirs et marque des buts !',
    heroName: 'Tilt',
    hero: { body: '#06d6a0', belly: '#e6fff7', limb: '#049f76', accent: '#ef476f', extra: 'headband' },
    collectible: '🏆',
    sky: ['#4cc9f0', '#e0fbff'],
    obstacles: ['cone', 'tackle', 'cone', 'giant'], // (foot : plot = change de couloir, tacle = saute, grand joueur = baisse-toi)
    biomes: [
      { name: 'Le terrain', sky0: '#4cc9f0', sky1: '#e0fbff', sun: '#fff6c2', mount0: '#90e0ef', mount1: '#52b788',
        grass: '#57cc99', grass2: '#4fbf8e', path: '#f8f9fa', path2: '#e9ecef', fog: '#e9fbff',
        deco: ['🏟️', '🚩', '🎈', '⚽', '🏀', '🚩'], ambient: ['birds'] },
    ],
    endText: 'Quel match ! Tu es un vrai champion !',
    sequence: [
      Z(3, 'C\'est le match ! Dribble les joueurs, arrête les tirs et marque des buts !'),
      R(18), GO(5), KI(4), R(18), GO(5), KI(4),
      Z(3, 'Quel match ! Respire bien, champion…'),
    ],
  },
  {
    id: 'supermarche', icon: '🛒',
    name: 'Le Magasin',
    tagline: 'Remplis ton caddie et range les rayons !',
    heroName: 'Panier',
    hero: { body: '#ef476f', belly: '#ffe5ec', limb: '#c9184a', accent: '#ffd166', extra: 'headband' },
    collectible: '🛒',
    sky: ['#ffd6a5', '#fff7e6'],
    biomes: [
      { name: 'Les rayons', sky0: '#e9d8bd', sky1: '#fbeedd', sun: '#ffe8c2', mount0: '#e76f51', mount1: '#f4a261',
        grass: '#d9b98f', grass2: '#c49a6c', path: '#8fa3b5', path2: '#7d93a6', fog: '#f3e3cb',
        deco: ['🛒', '🍞', '🧀', '🥕', '🍌', '🥛'], ambient: [] },
      { name: 'Le rayon des fruits', sky0: '#dfe8c8', sky1: '#f6f1dc', sun: '#ffe8c2', mount0: '#6a994e', mount1: '#a7c957',
        grass: '#b98b5e', grass2: '#a3774d', path: '#8aa37b', path2: '#79926a', fog: '#efe9d2',
        deco: ['🍎', '🍐', '🍍', '🍉', '🍇', '🥕'], ambient: [] },
    ],
    endText: 'Le caddie est plein et les rayons sont rangés !',
    sequence: [
      Z(3, 'On fait les courses ! Remplis ton caddie et range les rayons.'),
      SH(14), AC('shelf', 4), SL(14, 8), SH(14), AC('shelf', 4), SL(12, 6),
      Z(3, 'Les courses sont faites ! Respire bien…'),
    ],
  },
  {
    id: 'singes', icon: '🛁',
    name: 'Le Bain',
    tagline: 'Les singes farceurs mettent de la mousse partout !',
    heroName: 'Coco',
    hero: { body: '#a47148', belly: '#f1e3c8', limb: '#7f5539', accent: '#ffd166', extra: 'headband' },
    collectible: '🦆',
    sky: ['#bde0fe', '#f0f8ff'],
    biomes: [
      { name: 'La salle de bain', sky0: '#a2d2ff', sky1: '#f0f8ff', sun: '#fff6c2', mount0: '#cdeffd', mount1: '#a2d2ff',
        grass: '#e3f2fd', grass2: '#d6ebfa', path: '#ffffff', path2: '#eef6fc', fog: '#f0f8ff',
        deco: ['🛁', '🦆', '🧼', '🫧', '🧽', '🦆'], ambient: ['butterflies'] },
    ],
    endText: 'Tout propre ! Les singes rigolent avec toi.',
    sequence: [
      Z(3, 'C\'est l\'heure du bain ! Mais les singes farceurs mettent de la mousse partout…'),
      MO(16, 6), B(12, 8), AC('swim', 12), MO(18, 8), B(12, 8), AC('swim', 12),
      Z(3, 'Tout propre ! Respire bien…'),
    ],
  },
  {
    id: 'chateau', icon: '🏰',
    name: 'Le Château',
    tagline: 'Les défis de Madame Pimprenelle : mur, ordres et course !',
    heroName: 'Étincelle',
    hero: { body: '#c77dff', belly: '#f6e8ff', limb: '#9d4edd', accent: '#ffd60a', extra: 'crown' },
    collectible: '👑',
    sky: ['#cdb4db', '#fdf0ff'],
    biomes: [
      { name: 'Jardin du château', sky0: '#a0c4ff', sky1: '#fdf0ff', sun: '#fff6c2', mount0: '#cdb4db', mount1: '#80b918',
        grass: '#80b918', grass2: '#76ad15', path: '#d6ccc2', path2: '#cbc0b5', fog: '#fbf5ff',
        deco: ['🏰', '🌹', '🌳', '🌷', '🏰', '🌳'], ambient: ['butterflies', 'petals'] },
      { name: 'La tour enchantée', night: true, sky0: '#240046', sky1: '#5a189a', sun: '#fff6d5', mount0: '#3c096c', mount1: '#10002b',
        grass: '#3c096c', grass2: '#360862', path: '#e0aaff', path2: '#d49af5', fog: '#c77dff',
        deco: ['🌳', '✨', '🍄', '💎', '🌳', '🦄'], ambient: ['fireflies'] },
    ],
    endText: 'Bravo, chevalier ! Tous les défis du château sont réussis !',
    sequence: [
      Z(3, 'Bienvenue au château ! Madame Pimprenelle t\'a préparé des défis.'),
      AR('mur', 6), AR('pimprenelle', 6), AR('course', 1), AR('mur', 6), AR('pimprenelle', 6),
      Z(3, 'Bravo, chevalier ! Respire bien…'),
    ],
  },
  {
    id: 'banquise', icon: '❄️',
    name: 'La Banquise',
    tagline: 'Boules de neige et bébés pingouins !',
    heroName: 'Flocon',
    hero: { body: '#9ad7ff', belly: '#f0faff', limb: '#4f9fd1', accent: '#ff7eb6', extra: 'beanie' },
    collectible: '❄️',
    sky: ['#9ad7ff', '#eef8ff'],
    biomes: [
      { name: 'Glacier', sky0: '#4fb0f0', sky1: '#d6efff', sun: '#fff9e0', mount0: '#d7ecf8', mount1: '#b3d6ea',
        grass: '#e2f0fa', grass2: '#d4e8f6', path: '#8cc6ea', path2: '#7fbbe2', fog: '#cfe9fb',
        deco: ['⛄', '🧊', '🌲', '❄️', '🧊', '⛄'], ambient: ['snow'] },
      { name: 'Aurore', night: true, sky0: '#0b1d3a', sky1: '#2a6f6a', sun: '#e8fff6', mount0: '#25496b', mount1: '#1b3550',
        grass: '#dcecf5', grass2: '#cfe2ee', path: '#a9cbe0', path2: '#9cc0d8', fog: '#7ff0c8',
        deco: ['🌲', '🧊', '⛄', '🌲', '✨', '🧊'], ambient: ['snow', 'fireflies'] },
    ],
    endText: 'Les pingouins ont bien chaud. Bravo !',
    sequence: [
      Z(3, 'Brrr, la banquise ! Les pingouins veulent jouer avec toi.'),
      AR('neige', 8), AC('clap', 3), R(16), F(14), AR('neige', 8), AC('clap', 3),
      Z(3, 'Bravo ! Souffle comme le vent du nord…'),
    ],
  },
  {
    id: 'dinos', icon: '🦖',
    name: 'Les Dinos',
    tagline: 'Marche comme un dino et fais éclore les œufs !',
    heroName: 'Croc',
    hero: { body: '#70c16f', belly: '#e8f8df', limb: '#3f8f3e', accent: '#ff9f1c', extra: 'spikes' },
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
    endText: 'Tous les bébés dinos sont nés !',
    sequence: [
      Z(3, 'Bienvenue chez les dinos ! Des œufs vont bientôt éclore…'),
      AC('stomp', 3), R(16), U(4), M(12, 6), AC('stomp', 4), R(14),
      Z(3, 'Bravo ! Respire comme un grand dino…'),
    ],
  },
  {
    id: 'espace', icon: '🚀',
    name: 'L\'Espace',
    tagline: 'Fusée, astéroïdes et étoiles filantes !',
    heroName: 'Comète',
    hero: { body: '#9b5de5', belly: '#efe3ff', limb: '#6a2fbf', accent: '#00f5d4', extra: 'helmet' },
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
    endText: 'Quel voyage ! Tu es un vrai astronaute.',
    sequence: [
      Z(3, 'Mets ton casque, on part dans l\'espace !'),
      AC('launch', 2), R(16), K(12), AC('launch', 2), R(14), K(10),
      Z(3, 'Atterrissage en douceur… respire.'),
    ],
  },
  {
    id: 'disco', icon: '🪩',
    name: 'La Disco',
    tagline: 'Danse avec Tempo et tape les cubes en rythme !',
    heroName: 'Tempo',
    hero: { body: '#70d6ff', belly: '#e0f7ff', limb: '#3a86ff', accent: '#ffd166', extra: 'headphones' },
    collectible: '🎵',
    sky: ['#1a0b3a', '#5a189a'],
    biomes: [
      { name: 'Salle de danse', night: true, sky0: '#1a0b3a', sky1: '#5a189a', sun: '#fff0ff', mount0: '#3c096c', mount1: '#240046',
        grass: '#2d1b4e', grass2: '#26173f', path: '#ff70a6', path2: '#70d6ff', fog: '#5a189a',
        deco: ['🎵', '🪩', '🎤', '🎶', '✨', '🎵'], ambient: ['fireflies'] },
    ],
    endText: 'Tempo dit : quel danseur !',
    sequence: [
      Z(3, 'Musique ! On danse avec Tempo.'),
      DN('armsUp', 'squat', 'armsUp', 'squat', 'left', 'right', 'left', 'right'), CU(12, 1.6), F(14),
      DN('star', 'jump', 'star', 'jump', 'airplane', 'armsUp'), CU(16, 1.4),
      Z(3, 'Bravo, quelle danse ! Respire bien…'),
    ],
  },
];

const SPEEDS = [
  { id: 'easy', label: 'Facile', mul: 1.5 },
  { id: 'normal', label: 'Normal', mul: 1 },
  { id: 'fast', label: 'Rapide', mul: 0.75 },
];

// Paysage 3D (« kit » de décor, voir props3d.js) de chaque partie de chaque monde
const WORLD_KITS = {
  stade: ['stadium'], supermarche: ['market', 'marketFruit'], singes: ['bathroom'], chateau: ['garden', 'magic'],
  banquise: ['glacier', 'aurora'], dinos: ['ferns', 'dinoland'], espace: ['moon', 'mars', 'nebula'], disco: ['disco'],
};
WORLDS.forEach((w) => (WORLD_KITS[w.id] || []).forEach((kit, k) => { if (w.biomes[k]) w.biomes[k].kit = kit; }));
