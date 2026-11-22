// Mouvements, séquences et les 3 mondes (univers originaux).

// Consignes courtes et concrètes : chaque mouvement correspond à un obstacle visible sur le chemin
// (tronc = saute, branche = baisse-toi, rocher = tape, étoile dans un couloir = va à gauche / à droite).
const POSES = {
  armsUp:   { icon: '🙌', label: 'Lève les bras !',          say: 'Lève les deux bras tout en haut !' },
  airplane: { icon: '✈️', label: "Bras écartés : l'avion !", say: "Fais l'avion : les bras bien écartés, sur les côtés !" },
  star:     { icon: '⭐', label: "Fais l'étoile !",           say: "Fais l'étoile : écarte les bras et les jambes !" },
  flamingo: { icon: '🦩', label: 'Tiens sur un pied !',       say: 'Lève un genou et tiens sur un pied !' },
};

const MOVE_ICONS = { run: '🪨', jump: '⬆️', squat: '⬇️', left: '⬅️', right: '➡️', smash: '👊', rest: '😮‍💨', bubbles: '🫧', freeze: '🎵', catch: '⭐', rope: '🪢', tunnel: '🚇', moles: '🐹', posemix: '🤸', boss: '👑', ball: '⚽', shop: '🛒', foam: '🧽', dance: '💃', karate: '🥋', slice: '🍉', cubes: '🟦', fork: '🔀', wand: '🪄', goal: '🧤', basket: '🏀', kick: '⚽' };
const MOVE_SHORT = { jump: 'Saute', squat: 'Baisse-toi', left: 'Gauche', right: 'Droite', smash: 'Tape' };

// Petits constructeurs de séquences
const R = (t) => ({ m: 'run', t });            // éviter les obstacles pendant t secondes
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
const MO = (t, n) => ({ m: 'foam', t, n });   // singes farceurs : nettoyer n taches de mousse sur l'écran
const SH = (t) => ({ m: 'shop', t });           // supermarché : remplir son caddie en évitant les chapardeurs
const LN = (step) => ({ m: 'learn', of: step }); // tuto : on explique (lentement) l'épreuve qui suit
const BS = (...poses) => ({ m: 'boss', poses, hold: 0.9 });    // gardien du monde : copier ses poses pour qu'il devienne ami
const DN = (...moves) => ({ m: 'dance', moves, beat: 1.8 });   // danser : imiter Tempo pas à pas
const KA = (...moves) => ({ m: 'karate', moves, beat: 2.0 });  // karaté : imiter le maître geste par geste
const SL = (t, n) => ({ m: 'slice', t, n });    // couper n fruits lancés en l'air (d'un geste de la main)
const CU = (n, beat = 1.4) => ({ m: 'cubes', n, beat }); // taper n cubes qui arrivent en rythme (gauche / droite)
const WA = (t, n) => ({ m: 'wand', t, n });   // baguette magique : libérer n créatures ensorcelées en pointant le bras
const GO = (n) => ({ m: 'goal', n });          // gardien de but : arrêter n tirs avec les mains
const BK = (n) => ({ m: 'basket', n });        // basket : attraper (mains jointes) puis tirer (bras levés), n paniers
const KI = (n) => ({ m: 'kick', n });          // penalty : lever le genou du côté du ballon (ou lancer à la main), n buts
const AC = (game, n) => ({ m: 'act', game, n }); // jeu sur place propre à un pays (voir ACTS), n fois

// Jeux sur place : un par pays, on ne court pas. Le petit sorcier imite l'enfant, le décor du jeu se dessine autour
// (depth.js : drawAct) ; la partie compte les gestes (game.js : updateAct). per : gestes pour une réussite (n réussites)
const ACTS = {
  grow: { icon: '🌷', label: 'Fais pousser les fleurs !', sec: 5, pts: 100, coach: 'squat',
    say: 'Des graines magiques ! Baisse-toi pour planter la graine, puis lève les bras tout en haut pour faire pousser la fleur !',
    tuto: 'Baisse-toi tout en bas pour planter une graine dans le pot. Puis relève-toi et lève les deux bras vers le ciel, comme une fleur qui pousse : la fleur magique s\'ouvre !',
    cheer: ['Une fleur magique !', 'Elle a poussé !', 'Quelle belle fleur !'] },
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
  animals: { icon: '🐸', label: 'Imite les animaux !', sec: 5, pts: 100, coach: null,
    say: 'Les animaux de la vallée veulent jouer avec toi ! Imite chaque animal qui apparaît !',
    tuto: 'Un animal va apparaître sur une grande carte. Fais comme lui : la grenouille saute, la tortue se cache tout en bas, l\'oiseau ouvre ses ailes, la girafe lève les bras tout en haut !',
    cheer: [] },
};
// Jeux miroir (scène fixe, comme sur console) : l'enfant se voit en grand (image de la caméra, en miroir) et la magie se
// dessine autour de lui ; pas de chemin, pas de course. Moteur : arena.js. n : murs, ordres, bonshommes, potions…
const AR = (game, n) => ({ m: 'arena', game, n });
const ARENA = {
  mur: { icon: '🧱', label: 'Le Mur Magique !', sec: 4.2, pts: 100,
    say: 'Le Mur Magique arrive ! Regarde le trou dans le mur, et prends la même pose pour passer à travers !',
    tuto: 'Un mur arrive vers toi, avec un trou en forme de pose : les bras en l\'air, l\'avion, l\'étoile, accroupi, ou un pas de côté. Prends la même pose avant qu\'il arrive, et tu passes à travers !' },
  soleil: { icon: '☁️', label: '1, 2, 3… Nuage Grognon !', sec: 32, pts: 300, // (n = 1 : une partie jusqu'au nuage)
    say: 'Un, deux, trois, Nuage Grognon ! Cours sur place quand il a le dos tourné. Quand il se retourne : statue !',
    tuto: 'Le Nuage Grognon compte, le dos tourné : cours sur place pour avancer vers lui. Quand il se retourne, ne bouge plus du tout, sinon tu recules ! Arrive jusqu\'à lui pour gagner.' },
  pimprenelle: { icon: '🦉', label: 'Pimprenelle a dit !', sec: 4.5, pts: 100,
    say: 'Pimprenelle a dit ! Fais ce qu\'elle dit… mais seulement si elle dit « Pimprenelle a dit » !',
    tuto: 'Madame Pimprenelle donne des ordres. Si elle dit « Pimprenelle a dit », fais-le vite ! Si elle ne le dit pas, ne bouge pas : c\'est un piège !' },
  neige: { icon: '⛄', label: 'Bataille de boules de neige !', sec: 3.2, pts: 80,
    say: 'Bataille de boules de neige ! Lance une boule sur les bonshommes de neige farceurs : lève le bras et baisse-le d\'un coup !',
    tuto: 'Des bonshommes de neige farceurs apparaissent autour de toi. Lève le bras et lance-le vers l\'avant, d\'un coup, du côté du bonhomme : la boule part ! Tu peux aussi les toucher avec ta main.' },
  potions: { icon: '🧪', label: 'La cuisine des potions !', sec: 18, pts: 200,
    say: 'La cuisine des potions ! Touche les ingrédients de la recette avec ta main, puis touille le chaudron en faisant de grands cercles avec ton bras !',
    tuto: 'La recette est à gauche. Touche avec ta main les ingrédients qui flottent autour de toi : ils tombent dans le chaudron. Quand tout y est, fais de grands cercles avec ton bras pour touiller !' },
  duel: { icon: '⚡', label: 'Duel de sorciers !', sec: 9, pts: 150,
    say: 'Duel de sorciers avec Grimaud le farceur ! Mains jointes pour le bouclier, ou un pas de côté pour esquiver. Puis lève les bras pour lancer ton sort !',
    tuto: 'Grimaud lance des sorts. Une boule violette : joins tes mains devant toi pour faire un bouclier. Une boule rouge : fais un grand pas de côté pour l\'esquiver. Ensuite, à toi : lève les deux bras pour lancer ton sort !' },
  corde: { icon: '🪢', label: 'Tir à la corde magique !', sec: 24, pts: 300, // (n = 1 : une manche)
    say: 'Tir à la corde contre le Nuage Grognon ! Bouge les bras très vite, comme si tu tirais la corde, pour la ramener de ton côté !',
    tuto: 'Tu tiens un ruban magique, le Nuage Grognon tire de l\'autre côté. Bouge les bras très vite, ou saute, pour tirer plus fort que lui et ramener le ruban de ton côté !' },
  equilibre: { icon: '🎪', label: 'L\'équilibriste !', sec: 1.8, pts: 30, // (n : secondes à tenir)
    say: 'L\'équilibriste ! Tiens-toi sur un pied sur la corde. Quand le vent souffle, ouvre grand les bras !',
    tuto: 'Ton petit sorcier marche sur une corde : tiens-toi sur un pied pour qu\'il avance. Quand le vent souffle, ouvre les bras comme un avion pour ne pas tomber !' },
  balai: { icon: '🧹', label: 'La course de balais !', sec: 2.8, pts: 80,
    say: 'La course de balais volants ! Penche-toi à gauche ou à droite pour tourner, lève les bras pour monter, baisse-toi pour descendre. Passe dans les anneaux !',
    tuto: 'Tu voles sur ton balai ! Fais un pas ou penche-toi à gauche ou à droite pour tourner. Lève les bras pour monter, baisse-toi pour descendre. Passe au milieu des anneaux dorés !' },
  photo: { icon: '📸', label: 'Le miroir magique !', sec: 7, pts: 100, // (n : photos)
    say: 'Le miroir magique ! Fais la pose la plus rigolote que tu peux… trois, deux, un… photo !',
    tuto: 'Regarde-toi dans le miroir magique ! Quand il compte trois, deux, un, fais ta pose la plus rigolote : la photo va dans ton grimoire.' },
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
const ARENA_LINES = ['Un, deux, trois…', 'Nuage Grognon !', 'Je t\'ai vu bouger !', 'Cours !', 'Statue !', 'Piégé ! Elle n\'avait pas dit « Pimprenelle a dit » !',
  'Bien joué, tu ne t\'es pas fait avoir !', 'Bravo !', 'Trop tard !', 'Touché !', 'Pas celui-là !', 'Maintenant, touille ! Fais de grands cercles avec ton bras !',
  'La potion est prête !', 'Attention, il prépare un sort !', 'Bouclier ! Joins tes mains !', 'Esquive ! Pas de côté !', 'Paré !', 'Ouille ! Ça chatouille !',
  'À toi ! Lève les deux bras pour lancer ton sort !', 'Il tire fort !', 'Tire, tire !', 'Le vent souffle ! Ouvre les bras !', 'Bravo, tu tiens bien !',
  'Trois, deux, un…', 'Ouistiti !', 'Super photo !', 'Passe dans l\'anneau !', 'Encore un !', 'Il est tout étourdi !', 'Super, le mur est passé !', 'Ouille, le mur !',
  'Champion !', 'Presque ! La prochaine fois !', 'Échauffement magique ! Tends bien ton bras pour attraper l\'étoile !', 'Super, c\'est parti !', 'Pause ! Revenez à deux, ou lève les bras pour continuer tout seul.'];

// Imite les animaux : chaque carte demande un geste (un événement, ou une pose à tenir un moment)
const ANIMALS = [
  { id: 'frog', icon: '🐸', name: 'La grenouille', need: 'jump', say: 'La grenouille ! Saute comme elle !' },
  { id: 'turtle', icon: '🐢', name: 'La tortue', need: 'squat', say: 'La tortue ! Baisse-toi et cache-toi dans ta carapace !' },
  { id: 'bird', icon: '🐦', name: "L'oiseau", need: 'airplane', say: "L'oiseau ! Ouvre grand tes ailes !" },
  { id: 'giraffe', icon: '🦒', name: 'La girafe', need: 'armsUp', say: 'La girafe ! Lève les bras tout en haut, très très haut !' },
  { id: 'flamingo', icon: '🦩', name: 'Le flamant rose', need: 'flamingo', say: 'Le flamant rose ! Tiens-toi sur un pied !' },
  { id: 'bear', icon: '🐻', name: "L'ours", need: 'smash', say: "L'ours ! Lève les bras et tape fort, comme un gros ours !" },
];
function animalSeq(n, upper = false) { // (jamais deux fois le même animal de suite ; sans les jambes visibles, pas de flamant)
  const pool = ANIMALS.filter((a) => !(upper && a.need === 'flamingo')), out = [];
  while (out.length < n) { const l = pool.filter((a) => a !== out[out.length - 1]); out.push(l[Math.floor(Math.random() * l.length)]); }
  return out;
}

// Carrefours : le chemin se sépare, un pas à gauche ou à droite choisit l'épreuve suivante
const FORK_POOL = [B(12, 5), M(12, 6), SL(12, 6), CU(8, 1.5), MO(16, 5), K(10), Q(4), U(4), F(14), WA(14, 3), GO(5)];
const FORK_NAMES = { posemix: 'les poses', bubbles: 'les bulles', moles: 'les taupes', slice: 'les fruits ninja', cubes: 'les cubes en musique', foam: 'les singes farceurs',
  catch: 'les étoiles qui tombent', rope: 'la corde à sauter', tunnel: 'le tunnel', freeze: 'les statues musicales', wand: 'la baguette magique', goal: 'le gardien de but' };
const FORK_SHORT = { posemix: 'Poses', bubbles: 'Bulles', moles: 'Taupes', slice: 'Fruits', cubes: 'Cubes', foam: 'Mousse', catch: 'Étoiles', rope: 'Corde', tunnel: 'Tunnel', freeze: 'Statues', wand: 'Baguette', goal: 'Gardien' };
// Chemin secret : une épreuve surprise (on ne sait pas laquelle avant d'y aller), avec un trésor à la fin
const SECRET_POOL = [PM('armsUp', 'star', 'airplane'), F(12), K(10), Q(4), U(4)];
// Deux épreuves au hasard pour un carrefour. dist : pour chaque épreuve, distance (en étapes) à la plus proche
// du même genre dans le parcours (absente = Infinity) : on prend celles qui n'y sont pas, sinon les plus lointaines
// (jamais deux fois la même coup sur coup). fav : épreuve préférée de l'enfant (proposée plus souvent) ;
// secret : un des deux panneaux mène au chemin secret.
function forkOptions({ dist = {}, fav = null, secret = false } = {}) {
  const d = (m) => (m in dist ? dist[m] : Infinity);
  const rank = (list) => list.map((st) => ({ st, r: Math.random() })).sort((x, y) => (d(y.st.m) - d(x.st.m)) || (x.r - y.r)).map((x) => x.st);
  let pool = FORK_POOL.filter((st) => d(st.m) >= 6);
  if (pool.length < 3) pool = rank(FORK_POOL).slice(0, 3);
  pool = pool.sort(() => Math.random() - 0.5);
  const favStep = fav && Math.random() < 0.6 && pool.find((st) => st.m === fav);
  let two = favStep ? [favStep, pool.find((st) => st !== favStep)] : [pool[0], pool[1]];
  if (Math.random() < 0.5) two.reverse();
  two = two.map((st) => JSON.parse(JSON.stringify(st)));
  if (secret) {
    const k = favStep ? two.findIndex((st) => st.m !== fav) : Math.floor(Math.random() * 2);
    const sp = rank(SECRET_POOL.filter((st) => st.m !== two[1 - k].m && d(st.m) > 1));
    const pick = sp.filter((st) => d(st.m) >= 6);
    const st = (pick.length ? pick : sp)[Math.floor(Math.random() * (pick.length || Math.min(2, sp.length)))] || SECRET_POOL[0];
    two[k] = { ...JSON.parse(JSON.stringify(st)), secret: true };
  }
  return two;
}
// Un carrefour vers 40 % du parcours (et un deuxième vers 70 % pour les longs parcours) ; le chemin secret, s'il y en a
// un, est au premier carrefour
function withForks(steps, { fav = null, secret = false } = {}) {
  if (steps.some((st) => st.m === 'fork') || steps.length < 5) return steps;
  const out = steps.slice(), at = steps.length >= 12 ? [0.7, 0.4] : [0.45];
  at.forEach((f, n) => {
    const k = Math.max(1, Math.round(steps.length * f));
    const dist = {}; // (distance au plus proche du même genre, pour ne pas proposer ce qui arrive juste après)
    out.forEach((st, i) => { const e = i < k ? k - i : i - k + 1; dist[st.m] = Math.min(dist[st.m] ?? Infinity, e); }); // (1 = juste à côté)
    out.splice(k, 0, { m: 'fork', opts: forkOptions({ dist, fav, secret: secret && n === at.length - 1 }) });
  });
  return out;
}
const forkName = (o) => (o.secret ? 'un chemin secret' : FORK_NAMES[o.m]);

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
  karate: {
    coach: 'Maître Bambou', pal: { body: '#ffffff', belly: '#f1f1f1', limb: '#f4f4f4', accent: '#e63946' },
    // (le nom du geste, puis ce qu'il faut faire en mots simples : « Tranche ! » seul ne disait rien aux petits)
    say: { armsUp: 'Parade ! Les bras en l\'air !', airplane: 'Bras tendus sur les côtés !', star: "L'étoile du tigre ! Bras et jambes écartés !", flamingo: 'Coup de genou ! Lève un genou !',
      squat: 'Position du cavalier ! Accroupis-toi !', left: 'Un pas à gauche !', right: 'Un pas à droite !', jump: 'Saut du tigre ! Saute !', smash: 'Tranche ! Les mains en haut, puis en bas, vite !' },
  },
};

// Attraper : nombre d'étoiles pendant l'étape
const catchCount = (s) => Math.max(3, Math.round(s.t / 1.6));

// Statues musicales : une manche ≈ 7 s (danse puis statue)
const freezeRounds = (s) => Math.max(1, Math.round(s.t / 7));

function stepIcon(s) {
  if (s.m === 'learn') return stepIcon(s.of);
  if (s.m === 'pose') return POSES[s.pose].icon;
  if (s.m === 'combo') return '🔥';
  if (s.m === 'act') return ACTS[s.game].icon;
  if (s.m === 'arena') return ARENA[s.game].icon;
  return MOVE_ICONS[s.m];
}

function stepLabel(s) {
  switch (s.m) {
    case 'run': return 'Évite les obstacles !';
    case 'shop': return 'Remplis ton caddie !';
    case 'foam': return 'Nettoie la vitre !';
    case 'wand': return 'Baguette magique !';
    case 'goal': return 'Arrête les tirs !';
    case 'basket': return 'Marque des paniers !';
    case 'kick': return 'Tire au but !';
    case 'act': return ACTS[s.game].label;
    case 'arena': return ARENA[s.game].label;
    case 'fork': return 'Un carrefour : choisis !';
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
    case 'boss': return s.final ? 'Le Nuage Grognon !' : 'Le gardien ensorcelé !';
    case 'learn': return 'On apprend : ' + stepLabel(s.of);
    case 'ball': return 'Passe-toi le ballon !';
    case 'dance': return 'Danse comme Tempo !';
    case 'karate': return 'Imite le maître karatéka !';
    case 'slice': return 'Coupe les fruits !';
    case 'cubes': return 'Tape les cubes !';
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
    case 'foam': return 'Les singes farceurs couvrent la vitre de mousse ! Tes mains sont des raclettes : lave toute la vitre !';
    case 'goal': return 'Tu es le gardien de but ! Ton ami va tirer : arrête le ballon avec tes mains !';
    case 'basket': return 'Basket ! Ton ami te passe le ballon : attrape-le avec les deux mains, puis lève les bras pour tirer dans le panier !';
    case 'kick': return 'Penalty ! Regarde de quel côté est le ballon, et lève le genou de ce côté pour tirer !';
    case 'act': return ACTS[s.game].say;
    case 'arena': return ARENA[s.game].say;
    case 'wand': return 'Oh non ! Le Nuage Grognon a ensorcelé des créatures ! Pointe ta baguette vers elles avec ton bras, et garde le rayon dessus pour chasser le nuage !';
    case 'fork': return `Un carrefour ! À gauche : ${forkName(s.opts[0])}. À droite : ${forkName(s.opts[1])}. Fais un grand pas du côté que tu veux !`;
    case 'shop': return 'Au supermarché ! Va dans le couloir du produit pour le mettre dans ton caddie. Attention aux chapardeurs : évite-les, ou saute par-dessus !';
    case 'ball': return 'Passe de ballon ! Quand le ballon arrive vers toi, lève la main pour le renvoyer à ton ami !';
    case 'boss': return 'Oh ! Un gardien ensorcelé bloque le chemin ! Copie ses poses pour devenir son ami ! ' + POSES[s.poses[0]].say;
    case 'dance': return 'Danse avec Tempo ! Fais comme lui, comme dans un miroir !';
    case 'karate': return 'Le maître karatéka te montre les gestes. Imite-le ! Kiaï !';
    case 'slice': return 'Des fruits sautent en l\'air ! Coupe-les en deux avec ta main, comme un ninja !';
    case 'cubes': return 'Des cubes arrivent en musique ! Tape les bleus avec la main gauche et les orange avec la main droite !';
    case 'bubbles': return 'Des bulles autour de ton personnage ! Touche-les avec tes mains pour les éclater !';
    case 'freeze': return "Statues musicales ! Danse avec la musique. Quand elle s'arrête, ne bouge plus !";
    case 'combo': return 'Enchaîne : ' + s.parts.map((p) => MOVE_SHORT[p]).join(', puis ') + ' !';
    default: return stepLabel(s);
  }
}

// Tuto (École des dresseurs) : explication lente de chaque épreuve, avec ce qu'il faut regarder à l'écran
function tutoText(s) {
  if (s.m === 'pose') return {
    armsUp: 'Lève les deux bras tout en haut, vers le ciel, et ne bouge plus. Quand ton sorcier a un rond vert, c\'est gagné !',
    airplane: 'Écarte les bras sur les côtés, bien droits, comme les ailes d\'un avion. Et ne bouge plus !',
    star: 'Pour faire l\'étoile : lève les bras en l\'air, bien écartés, et écarte aussi les jambes. Tiens la pose, comme une grande étoile !',
    flamingo: 'Lève un genou et tiens-toi sur un seul pied, comme un flamant rose. Ouvre les bras pour ne pas tomber !',
  }[s.pose];
  if (s.m === 'act') return ACTS[s.game].tuto;
  if (s.m === 'arena') return ARENA[s.game].tuto;
  return {
    jump: 'Pour sauter, plie un peu les genoux, puis saute bien haut, les deux pieds en même temps ! Quand un tronc arrive sur le chemin, saute par-dessus.',
    squat: 'Pour te baisser, plie les genoux comme une petite grenouille, puis relève-toi. Quand une branche arrive, passe dessous !',
    left: 'Fais un grand pas sur le côté, vers la gauche. Ton sorcier change de couloir avec toi, pour attraper l\'étoile.',
    right: 'Fais un grand pas sur le côté, vers la droite. Ton sorcier change de couloir avec toi.',
    smash: 'Pour casser le rocher : lève les deux bras tout en haut, puis descends-les très fort, d\'un coup. Boum !',
    run: 'Sur le chemin, regarde le grand signe au-dessus de ton sorcier : un rocher, fais un pas de côté ; un tronc, saute ; une branche, baisse-toi !',
    bubbles: 'Des bulles vont apparaître autour de ton sorcier. Tes mains sont des gants lumineux : touche les bulles pour les éclater !',
    moles: 'Des taupes vont sortir de petites îles, à gauche et à droite. Tape-les avec ta main quand elles sortent la tête !',
    foam: 'Les singes vont couvrir la vitre de mousse : on ne verra plus rien ! Lève les mains : ce sont des raclettes. Passe-les de haut en bas, de gauche à droite, comme pour laver une fenêtre, jusqu\'à ce que la vitre brille.',
    goal: 'Tu es le gardien du but. Ton ami va tirer le ballon vers toi : un rond blanc montre où il arrive. Mets tes mains dessus pour l\'arrêter !',
    basket: 'Ton ami va te lancer le ballon. Pour l\'attraper, rapproche tes deux mains devant ton ventre. Ensuite, lève les deux bras tout en haut : le ballon part dans le panier !',
    kick: 'Le ballon est posé devant un de tes pieds : une petite jambe te montre lequel. Lève bien le genou de ce côté, comme pour shooter, et le ballon part dans le but !',
    wand: 'Le Nuage Grognon a rendu des créatures toutes grognonnes : regarde le petit nuage noir sur leur tête ! Lève le bras et pointe ta baguette vers une créature. Garde le rayon dessus, sans bouger, jusqu\'à ce que le rond doré soit plein : pouf, le nuage s\'en va et elle redevient gentille !',
    fork: 'Au carrefour, deux panneaux montrent deux épreuves. Fais un grand pas à gauche ou à droite, et reste un peu : tu choisis ton chemin !',
    shop: 'Des produits arrivent dans les couloirs. Fais un pas à gauche ou à droite pour te mettre devant, et hop, dans le caddie ! Les petits chapardeurs, eux, il faut les éviter.',
    slice: 'Des fruits vont voler de partout. Fais un grand geste rapide avec ta main, comme un ninja, pour les couper en deux !',
    cubes: 'Des cubes arrivent en musique. Les bleus, tape-les avec la main gauche ; les orange, avec la main droite. Tape quand ils touchent l\'anneau !',
    catch: 'Des étoiles tombent du ciel. Va à gauche, au milieu ou à droite pour être juste dessous, et attrape-les !',
    rope: 'La corde va tourner. Écoute bien le décompte : trois, deux, un… et saute quand la corde passe sous tes pieds !',
    tunnel: 'Un tunnel arrive. Baisse-toi tout en bas, et reste baissé jusqu\'à la sortie du tunnel !',
    freeze: 'Danse quand la musique joue ! Quand elle s\'arrête : statue ! Ne bouge plus du tout, même pas un doigt.',
    posemix: 'Ton sorcier va faire des poses, l\'une après l\'autre. Copie-les, comme dans un miroir !',
    boss: 'À la fin de chaque pays, un gardien ensorcelé par le Nuage Grognon bloque le chemin. Il te montre des poses : copie-les, une après l\'autre, et il deviendra ton ami !',
  }[s.m] || stepSpeech(s);
}
// Geste que Tempo montre pendant l'explication (quand il y en a un)
const tutoCoachMove = (s) => (s.m === 'pose' ? s.pose : s.m === 'act' ? ACTS[s.game].coach : ['jump', 'squat', 'left', 'right', 'smash'].includes(s.m) ? s.m
  : s.m === 'rope' ? 'jump' : s.m === 'wand' ? 'airplane' : s.m === 'basket' ? 'armsUp' : s.m === 'kick' ? 'flamingo' : s.m === 'tunnel' ? 'squat' : s.m === 'fork' ? 'left' : null);

// Évitements : nombre d'obstacles pendant l'étape
const dodgeCount = (s) => Math.max(2, Math.round(s.t / 2.5));

// Durée de la fenêtre (secondes, avant le multiplicateur de difficulté)
function stepDuration(s) {
  switch (s.m) {
    case 'run': case 'shop': case 'foam': case 'rest': case 'bubbles': case 'freeze': case 'wand': return s.t;
    case 'goal': return 2.5 + s.n * 3.0;
    case 'basket': return 3 + s.n * 7;
    case 'kick': return 2 + s.n * 4.5;
    case 'act': return 4 + s.n * ACTS[s.game].sec;
    case 'arena': return 5 + s.n * ARENA[s.game].sec;
    case 'fork': return 13; // (explication des deux chemins, puis décompte 3, 2, 1)
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
    case 'boss': return 4 + s.poses.length * 4;
    case 'ball': return 3 + s.n * 2.2;
    case 'learn': return Math.max(7, tutoText(s.of).length / 12 + 4); // (le temps de tout écouter, voix lente)
    case 'dance': case 'karate': return 2.6 + s.moves.length * s.beat;
    case 'slice': return s.t;
    case 'cubes': return 1.5 + s.n * s.beat + 3;
  }
}

function maxPoints(s) {
  switch (s.m) {
    case 'run': case 'shop': return dodgeCount(s) * 60;
    case 'foam': return s.n * 50 + 50;
    case 'fork': return 100;
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
    case 'posemix': case 'boss': return s.poses.length * 100 + 50;
    case 'ball': return s.n * 60;
    case 'dance': case 'karate': return s.moves.length * 100 + 50;
    case 'slice': case 'cubes': return s.n * 50 + 50;
    case 'wand': return s.n * 100 + 50;
    case 'goal': return s.n * 80;
    case 'basket': case 'kick': return s.n * 120;
    case 'act': return s.n * ACTS[s.game].pts + 100;
    case 'arena': return s.n * ARENA[s.game].pts + 100;
    default: return 0;
  }
}

const WORLDS = [
  {
    id: 'ecole',
    name: 'Premier jour à l\'Académie',
    tagline: 'On apprend tous les sorts, doucement !',
    heroName: 'Tempo',
    tutorial: true, // tout plus lent, chaque épreuve expliquée avant
    hero: { body: '#70d6ff', belly: '#e0f7ff', limb: '#3a86ff', accent: '#ffd166', extra: 'headphones' },
    collectible: '⭐',
    sky: ['#8ecae6', '#e8f6ff'],
    biomes: [
      { name: 'Cour de l\'Académie', sky0: '#8ecae6', sky1: '#e8f6ff', sun: '#fff6c2', mount0: '#a7c957', mount1: '#6a994e',
        grass: '#8fd16a', grass2: '#84c75f', path: '#e6c28f', path2: '#dbb47e', fog: '#f4fbff',
        deco: ['🌳', '🌼', '🏫', '🌷', '🌳', '🌼'], ambient: ['butterflies'] },
    ],
    endText: 'Bravo ! Ton premier jour à l\'Académie est réussi !',
    // Le premier jour en 5 leçons courtes (une par partie, comme les étapes des autres lieux) : un enfant de 4 ans
    // ne tient pas 15 minutes de tuto d'affilée. Le parcours complet (sequence) sert quand les étapes sont coupées.
    lessons: [
      { name: 'Les premiers sorts', steps: [LN(J()), J(2), LN(S()), S(2), LN(L()), L(), LN(D()), D(), LN(X()), X(2), LN(P('armsUp')), P('armsUp', 2)] },
      { name: 'Les poses magiques', steps: [LN(P('star')), P('star', 2), LN(P('airplane')), P('airplane', 2), LN(R(6)), R(8), LN(K(10)), K(10), LN(Q(2)), Q(2), LN(F(14)), F(14)] },
      { name: 'Les ateliers', steps: [LN(B(14, 4)), B(14, 4), LN(M(14, 4)), M(14, 4), LN(SL(16, 4)), SL(16, 4), LN(U(4)), U(4)] },
      { name: 'Les farces des singes', steps: [LN(CU(6, 2.0)), CU(6, 2.0), LN(MO(14, 4)), MO(14, 4), LN(SH(10)), SH(10),
        LN({ m: 'fork', opts: [B(10, 3), M(10, 3)] }), { m: 'fork', opts: [B(10, 3), M(10, 3)] }] },
      { name: 'La baguette et la récré', steps: [LN(WA(18, 2)), WA(18, 2), LN(GO(3)), GO(3), LN(BK(2)), BK(2), LN(KI(2)), KI(2), LN(BS('armsUp', 'star')), BS('armsUp', 'star')] },
    ],
    sequence: [],
  },
  {
    id: 'jardin3d',
    name: 'Le Jardin de l\'Académie',
    tagline: 'Cours de botanique : un jardin plein de surprises !',
    heroName: 'Bouton',
    hero: { body: '#ff8fab', belly: '#ffe5ec', limb: '#e05780', accent: '#ffd166', extra: 'flower' },
    collectible: '🍓',
    sky: ['#6ec6ff', '#dff3ff'],
    biomes: [
      { name: 'Jardin magique', sky0: '#6ec6ff', sky1: '#dff3ff', sun: '#fff4b8', mount0: '#a8d5ba', mount1: '#6fbf73',
        grass: '#7ccf6a', grass2: '#72c460', path: '#e6c28f', path2: '#dbb47e', fog: '#e8f6ff',
        deco: ['🌳', '🌷', '🍄', '🌼', '🌳', '🌷'], ambient: ['butterflies'] },
    ],
    endText: 'Bouton te félicite : cours de botanique réussi !',
    sequence: [
      Z(4, 'Cours de botanique ! Bouton, le jardinier, te confie des graines magiques. On les fait pousser ?'),
      AC('grow', 3), K(10), B(10, 6), AC('grow', 3), P('star'), AR('pimprenelle', 6), M(12, 6), AC('grow', 4),
      Z(3, 'Bravo, petit sorcier ! Respire le parfum des fleurs…'),
    ],
  },
  {
    id: 'disco',
    name: 'Cours de danse magique',
    tagline: 'Danse avec Tempo pour lancer des sorts !',
    heroName: 'Tempo',
    hero: { body: '#70d6ff', belly: '#e0f7ff', limb: '#3a86ff', accent: '#ffd166', extra: 'headphones' },
    collectible: '🎵',
    sky: ['#1a0b3a', '#5a189a'],
    biomes: [
      { name: 'Salle de danse', night: true, sky0: '#1a0b3a', sky1: '#5a189a', sun: '#fff0ff', mount0: '#3c096c', mount1: '#240046',
        grass: '#2d1b4e', grass2: '#26173f', path: '#ff70a6', path2: '#70d6ff', fog: '#5a189a',
        deco: ['🎵', '🪩', '🎤', '🎶', '✨', '🎵'], ambient: ['fireflies'] },
    ],
    endText: 'Tempo dit : quel danseur… et quel sorcier !',
    sequence: [
      Z(4, 'Cours de danse ! Chez les petits sorciers, on danse pour lancer des sorts. Musique !'),
      DN('armsUp', 'squat', 'armsUp', 'squat', 'left', 'right', 'left', 'right'),
      AR('mur', 5),
      DN('star', 'jump', 'star', 'jump', 'airplane', 'armsUp'),
      F(14),
      DN('left', 'armsUp', 'right', 'armsUp', 'squat', 'jump', 'star', 'airplane'),
      DN('flamingo', 'armsUp', 'squat', 'jump', 'left', 'right'),
      Z(3, 'Bravo ! Salue la classe…'),
    ],
  },
  {
    id: 'dojo',
    name: 'Cours de défense',
    tagline: 'Maître Bambou t\'apprend à arrêter les mauvais sorts !',
    heroName: 'Maître Bambou',
    hero: { body: '#ffb703', belly: '#fff3c4', limb: '#fb8500', accent: '#1e1b4b', extra: 'headband' },
    collectible: '🏅',
    sky: ['#ffcdb2', '#fff1e6'],
    biomes: [
      { name: 'Dojo de l\'Académie', sky0: '#ffcdb2', sky1: '#fff1e6', sun: '#fff3b0', mount0: '#b5838d', mount1: '#6d6875',
        grass: '#8ab17d', grass2: '#7fa672', path: '#d4a373', path2: '#c8955f', fog: '#fff1e6',
        deco: ['🎋', '🌸', '🏯', '🌸', '🎋', '🪨'], ambient: ['petals'] },
      { name: 'Dojo du soir', night: true, sky0: '#22223b', sky1: '#9a8c98', sun: '#fefae0', mount0: '#4a4e69', mount1: '#22223b',
        grass: '#52796f', grass2: '#4a6d63', path: '#bc8a5f', path2: '#a9784f', fog: '#c9ada7',
        deco: ['🎋', '🏮', '🌸', '🏯', '🏮', '🎋'], ambient: ['fireflies'] },
    ],
    endText: 'Le maître te salue : bravo, petit sorcier !',
    sequence: [
      Z(4, 'Cours de défense avec Maître Bambou : on apprend à arrêter les mauvais sorts. Salue le maître… Kiaï !'),
      KA('armsUp', 'squat', 'armsUp', 'squat', 'smash', 'smash'),
      KA('flamingo', 'squat', 'left', 'right', 'smash', 'jump'),
      AR('duel', 3),
      KA('squat', 'armsUp', 'smash', 'flamingo', 'jump', 'star'),
      P('airplane'),
      KA('left', 'smash', 'right', 'smash', 'squat', 'jump'),
      Z(3, 'Salue le maître… et respire.'),
    ],
  },
  {
    id: 'verger',
    name: 'Atelier des potions',
    tagline: 'Coupe les fruits magiques pour la potion !',
    heroName: 'Kiwi',
    hero: { body: '#8ac926', belly: '#f1ffd6', limb: '#4f772d', accent: '#e63946', extra: 'headband' },
    collectible: '🍉',
    sky: ['#ffb4a2', '#fff1e6'],
    biomes: [
      { name: 'Verger magique', sky0: '#7cc6fe', sky1: '#f0f9ff', sun: '#fff6c2', mount0: '#90be6d', mount1: '#43aa8b',
        grass: '#6a994e', grass2: '#618f45', path: '#d4a373', path2: '#c8955f', fog: '#f4fbff',
        deco: ['🍎', '🌳', '🍐', '🍊', '🌳', '🍑'], ambient: ['butterflies', 'birds'] },
      { name: 'Atelier de Kiwi', sky0: '#ffb4a2', sky1: '#fff1e6', sun: '#fff3b0', mount0: '#b5838d', mount1: '#6d6875',
        grass: '#8ab17d', grass2: '#7fa672', path: '#d4a373', path2: '#c8955f', fog: '#fff1e6',
        deco: ['🎋', '🌸', '🏯', '🌸', '🎋', '🪨'], ambient: ['petals'] },
    ],
    endText: 'La potion est prête ! Kiwi te félicite, petit sorcier !',
    sequence: [
      Z(4, 'Atelier des potions ! Kiwi a besoin de fruits magiques coupés en deux pour sa potion. Prêt ?'),
      SL(14, 8), AR('potions', 1), J(2), SL(16, 12), P('star'), AR('potions', 2),
      Z(3, 'La potion bouillonne… Bravo ! Respire bien.'),
    ],
  },
  {
    id: 'rythmo',
    retired: true, // (ancienne île, retirée de la carte de l'Académie : ses parties restent dans l'historique)
    name: 'Planète Rythmo',
    tagline: 'Tape les cubes en musique !',
    heroName: 'Bip',
    hero: { body: '#70d6ff', belly: '#e0f7ff', limb: '#3a86ff', accent: '#ff70a6', extra: 'headphones' },
    collectible: '🎵',
    sky: ['#10002b', '#5a189a'],
    biomes: [
      { name: 'Piste lumineuse', night: true, sky0: '#10002b', sky1: '#3c096c', sun: '#fff0ff', mount0: '#3c096c', mount1: '#240046',
        grass: '#2e1a5c', grass2: '#27164f', path: '#3a0ca3', path2: '#4361ee', fog: '#4a1a80',
        deco: ['🎵', '🟦', '🟧', '🎶', '✨', '🎵'], ambient: ['fireflies'] },
    ],
    endText: 'Bip dit : quel rythme !',
    sequence: [
      Z(2.5, 'Prêt ? Musique !'),
      CU(12, 1.6), S(2), CU(16, 1.4), P('armsUp'),
      CU(16, 1.3), J(2), CU(20, 1.2),
      Z(3, 'Bravo ! Quel rythme…'),
    ],
  },
  {
    id: 'singes',
    name: 'La Tour des Singes farceurs',
    tagline: 'Nettoie la mousse sur les vitres de la tour !',
    heroName: 'Coco',
    hero: { body: '#a47148', belly: '#f1e3c8', limb: '#7f5539', accent: '#ffd166', extra: 'headband' },
    collectible: '🍌',
    sky: ['#90e0ef', '#e9fbff'],
    biomes: [
      { name: 'Pied de la tour', sky0: '#48cae4', sky1: '#e9fbff', sun: '#fff6c2', mount0: '#52b788', mount1: '#2d6a4f',
        grass: '#52b788', grass2: '#4aa87d', path: '#d4a373', path2: '#c8955f', fog: '#e9fbff',
        deco: ['🌴', '🐒', '🍌', '🌺', '🌴', '🐒'], ambient: ['butterflies'] },
      { name: 'Haut de la tour', sky0: '#90e0ef', sky1: '#fdffef', sun: '#fff6c2', mount0: '#95d5b2', mount1: '#52b788',
        grass: '#74c69d', grass2: '#6abf93', path: '#e6c28f', path2: '#dbb47e', fog: '#fdffef',
        deco: ['🌴', '🍌', '🦜', '🌺', '🐒', '🍍'], ambient: ['butterflies'] },
    ],
    endText: 'Les vitres brillent, et les singes ne sont plus ensorcelés !',
    sequence: [
      Z(4, 'Oh non ! Le Nuage Grognon a ensorcelé les singes de l\'Académie : ils couvrent les vitres de la tour de mousse !'),
      MO(16, 6), J(2), AR('equilibre', 10), MO(18, 8), P('armsUp'), S(2), MO(18, 8), K(10), MO(20, 10),
      Z(3, 'Bravo ! La tour brille… respire bien.'),
    ],
  },
  {
    id: 'supermarche',
    name: 'Le Marché aux ingrédients',
    tagline: 'Remplis ton panier pour l\'atelier des potions !',
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
    endText: 'Le caddie est plein : de quoi faire plein de potions !',
    sequence: [
      Z(4, 'Au marché aux ingrédients ! Remplis ton caddie pour l\'atelier des potions… et attention aux chapardeurs !'),
      SH(12), J(2), SH(14), P('armsUp'), S(2), SH(16), X(2), SH(14),
      Z(3, 'Les courses sont faites ! Respire bien…'),
    ],
  },
  {
    id: 'turbo',
    retired: true, // (ancienne île, retirée de la carte de l'Académie : ses parties restent dans l'historique)
    name: 'Vallée Turbo',
    tagline: 'Cours plus vite que le vent !',
    heroName: 'Zéphyr',
    hero: { body: '#2ec4b6', belly: '#d9fbf7', limb: '#1b8a80', accent: '#ff9f1c', extra: 'scarf' },
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
      R(6), J(), R(5),
      L(), D(), L(), D(),
      S(), J(2), X(),
      R(6),
      P('airplane'),
      B(10, 6),
      K(10),
      C('jump', 'squat'),
      L(), D(),
      F(14),
      R(8),
      C('left', 'jump', 'right', 'jump'),
      S(2), X(2),
      P('star'),
      R(6),
      C('jump', 'squat', 'smash'),
      Z(3, 'Bravo ! Respire bien…'),
    ],
  },
  {
    id: 'island',
    retired: true, // (ancienne île, retirée de la carte de l'Académie : ses parties restent dans l'historique)
    name: 'Île Bondissante',
    tagline: 'Saute partout et casse les caisses !',
    heroName: 'Pip',
    hero: { body: '#ffb703', belly: '#fff3c4', limb: '#d18a00', accent: '#e63946', extra: 'propellerCap' },
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
      R(5), J(), J(2), X(),
      S(), J(3),
      P('armsUp'),
      X(2), L(), D(),
      B(10, 6),
      Q(3),
      R(6),
      C('jump', 'smash'),
      F(14),
      S(2), J(2),
      P('flamingo', 2),
      C('squat', 'jump', 'smash'),
      X(3),
      R(6),
      C('left', 'smash', 'right', 'smash'),
      J(3),
      Z(3, 'Super ! Souffle un peu…'),
    ],
  },
  {
    id: 'forest',
    name: 'La Vallée des Créatures',
    tagline: 'Imite les créatures pour qu\'elles deviennent tes amies !',
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
    endText: 'Lumi te donne l\'Étoile verte ! Tes nouveaux amis te disent bravo !',
    sequence: [
      Z(4, "Le portail t'emmène dans la Vallée des Créatures. L'Étoile verte est cachée ici : imite les animaux, ils t'aideront à la trouver !"),
      AC('animals', 4), B(10, 6), P('flamingo', 2), C('squat', 'jump'),
      AC('animals', 5), K(10), M(12, 6), P('star'),
      AC('animals', 5), F(14), PM('armsUp', 'star', 'airplane'), J(2),
      Z(3, 'Magnifique… respire comme Lumi.'),
    ],
  },
  {
    id: 'banquise',
    name: 'La Banquise Glacée',
    tagline: 'Le Nuage Grognon a tout gelé : réchauffe la banquise !',
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
    endText: 'Flocon te rend l\'Étoile orange : la banquise est sauvée !',
    sequence: [
      Z(4, "Brrr ! Le Nuage Grognon a tout gelé, et il a caché l'Étoile orange sous la glace. Les bébés pingouins ont besoin de toi !"),
      AC('clap', 3), U(4), AR('neige', 8), Q(3), AC('clap', 4),
      X(2), B(10, 6), F(14), AR('neige', 10), AC('clap', 4),
      Z(3, 'Bravo ! Souffle comme le vent du nord…'),
    ],
  },
  {
    id: 'ocean',
    name: 'Le Fond de l\'Océan',
    tagline: 'Plonge aider les créatures de la mer !',
    heroName: 'Plouf',
    hero: { body: '#2ec4b6', belly: '#d9fbf7', limb: '#168f84', accent: '#ffbe0b', extra: 'goggles' },
    collectible: '🐚',
    sky: ['#1e90c8', '#7fdbff'],
    biomes: [
      { name: 'Lagon', sky0: '#0b6fa8', sky1: '#38b6e0', sun: '#fdf7c3', mount0: '#3aa6d0', mount1: '#2a8fb8',
        grass: '#e3c88f', grass2: '#d9bc80', path: '#c99a5b', path2: '#bd8e50', fog: '#3fb3d9',
        deco: ['🪸', '🐚', '🌿', '🪸', '🐠', '🐚'], ambient: ['rising'] },
      { name: 'Récif', sky0: '#0a5c8a', sky1: '#3fb0d0', sun: '#d8f6ff', mount0: '#1f7fa8', mount1: '#14668b',
        grass: '#2a9d8f', grass2: '#26907f', path: '#e9c46a', path2: '#ddb85d', fog: '#1f8fbf',
        deco: ['🪸', '🐠', '🐙', '🪸', '🐡', '🌿'], ambient: ['rising'] },
      { name: 'Abysses', night: true, sky0: '#03045e', sky1: '#0077b6', sun: '#caf0f8', mount0: '#023e8a', mount1: '#012a5e',
        grass: '#023e8a', grass2: '#03357a', path: '#48cae4', path2: '#3fb8d0', fog: '#90e0ef',
        deco: ['🐙', '🪸', '🐚', '🦑', '🪸', '✨'], ambient: ['rising', 'fireflies'] },
    ],
    endText: 'Plouf te rend l\'Étoile bleue : l\'océan est sauvé !',
    sequence: [
      Z(4, "Le portail s'ouvre… sous la mer ! L'Étoile bleue brille au fond de l'océan. Les dauphins vont nager avec toi !"),
      AC('swim', 12), B(12, 8), U(4), P('airplane'),
      AC('swim', 14), K(10), M(12, 6), S(2),
      AC('swim', 16), CU(10, 1.5), F(14), P('star'),
      Z(3, 'Super ! Respire comme une baleine…'),
    ],
  },
  {
    id: 'espace',
    name: 'Voyage dans l\'Espace',
    tagline: 'Le Nuage Grognon a éteint les étoiles : rallume-les !',
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
    endText: 'Comète te rend l\'Étoile jaune : le ciel brille à nouveau !',
    sequence: [
      Z(4, "Le Nuage Grognon a emporté l'Étoile jaune tout là-haut, dans l'espace ! Prépare ta fusée…"),
      AC('launch', 2), K(12), P('star'), J(2),
      AC('launch', 3), F(14), B(10, 6), C('left', 'right', 'jump'),
      AC('launch', 3), SL(12, 6), PM('star', 'airplane', 'armsUp'), P('airplane'),
      Z(3, 'Atterrissage en douceur… respire.'),
    ],
  },
  {
    id: 'bonbons',
    retired: true, // (ancienne île, retirée de la carte de l'Académie : ses parties restent dans l'historique)
    name: 'Pays des Bonbons',
    tagline: 'Un chemin tout en sucre !',
    heroName: 'Praline',
    hero: { body: '#ff70a6', belly: '#ffe5ef', limb: '#d94c84', accent: '#70d6ff', extra: 'bow' },
    collectible: '🍬',
    sky: ['#ffc8dd', '#fff0f6'],
    biomes: [
      { name: 'Prairie sucrée', sky0: '#ff7eb6', sky1: '#ffe4f0', sun: '#fff6c2', mount0: '#ffc8dd', mount1: '#cdb4db',
        grass: '#ff8fbb', grass2: '#ff82b2', path: '#fff0f3', path2: '#ffe0e8', fog: '#ffd3e6',
        deco: ['🍭', '🧁', '🍩', '🍬', '🍦', '🧁'], ambient: ['petals'] },
      { name: 'Montagne de glace', sky0: '#a2d2ff', sky1: '#e7f5ff', sun: '#fff6c2', mount0: '#bde0fe', mount1: '#cdb4db',
        grass: '#9fd1ff', grass2: '#92c8fb', path: '#fff1e6', path2: '#fbe6d6', fog: '#dcefff',
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
    retired: true, // (ancienne île, retirée de la carte de l'Académie : ses parties restent dans l'historique)
    name: 'La Ferme Joyeuse',
    tagline: 'Aide les animaux de la ferme !',
    heroName: 'Grain',
    hero: { body: '#f4a259', belly: '#fff1e0', limb: '#c97a2e', accent: '#5b8e7d', extra: 'strawHat' },
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
    name: 'La Vallée des Dinos',
    tagline: 'Retrouve les œufs volés par le Nuage Grognon !',
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
    endText: 'Croc te rend l\'Étoile rouge, et tous les œufs sont retrouvés !',
    sequence: [
      Z(4, "Dans la Vallée des Dinos, le Nuage Grognon a caché l'Étoile rouge au milieu des œufs ! Marche comme un dino pour les faire éclore."),
      AC('stomp', 3), X(2), J(2), M(12, 6), AC('stomp', 4),
      Q(4), CU(10, 1.5), P('flamingo', 2), AC('stomp', 4), F(14),
      Z(3, 'Bravo ! Respire comme un grand dino…'),
    ],
  },
  {
    id: 'chateau',
    finalBoss: true, // (le gardien de la dernière île : le Nuage Grognon lui-même)
    name: 'Le Château du Nuage Grognon',
    tagline: 'La dernière aventure : rends le Nuage Grognon gentil !',
    heroName: 'Étincelle',
    hero: { body: '#c77dff', belly: '#f6e8ff', limb: '#9d4edd', accent: '#ffd60a', extra: 'crown' },
    collectible: '💎',
    sky: ['#cdb4db', '#fdf0ff'],
    biomes: [
      { name: 'Jardin du château', sky0: '#a0c4ff', sky1: '#fdf0ff', sun: '#fff6c2', mount0: '#cdb4db', mount1: '#80b918',
        grass: '#80b918', grass2: '#76ad15', path: '#d6ccc2', path2: '#cbc0b5', fog: '#fbf5ff',
        deco: ['🏰', '🌹', '🌳', '🌷', '🏰', '🌳'], ambient: ['butterflies', 'petals'] },
      { name: 'Tour du Nuage Grognon', night: true, sky0: '#240046', sky1: '#5a189a', sun: '#fff6d5', mount0: '#3c096c', mount1: '#10002b',
        grass: '#3c096c', grass2: '#360862', path: '#e0aaff', path2: '#d49af5', fog: '#c77dff',
        deco: ['🌳', '✨', '🍄', '💎', '🌳', '🦄'], ambient: ['fireflies'] },
    ],
    endText: 'Le Nuage Grognon est devenu ton ami, et l\'arc-en-ciel brille à nouveau !',
    sequence: [
      Z(4, 'Voici le château du Nuage Grognon. Le cœur de l\'arc-en-ciel est caché ici. Courage, petit sorcier… et sois gentil avec lui !'),
      AR('balai', 10), P('star'), J(), S(), K(10),
      L(), D(), B(10, 6), AR('mur', 6), P('armsUp'),
      C('squat', 'jump'), Q(3), F(14), P('flamingo', 2), AR('soleil', 1),
      Z(3, 'Le ciel est tout bleu… Magnifique ! Fais une révérence.'),
    ],
  },
  {
    id: 'sortileges',
    name: 'Le Bois des Sortilèges',
    tagline: 'Première aventure : le Nuage Grognon est là !',
    heroName: 'Plume',
    hero: { body: '#7b2cbf', belly: '#f3e8ff', limb: '#5a189a', accent: '#ffd60a', extra: 'crown' },
    collectible: '✨',
    sky: ['#3c096c', '#c77dff'],
    biomes: [
      { name: 'Bois du matin', sky0: '#7cc6fe', sky1: '#e9e3ff', sun: '#fff6c2', mount0: '#a9a2d9', mount1: '#4f8a6b',
        grass: '#5cb85c', grass2: '#53a953', path: '#d9b779', path2: '#cdaa6a', fog: '#efe9ff',
        deco: ['🌲', '🍄', '🌳', '✨', '🌲', '🍄'], ambient: ['butterflies', 'petals'] },
      { name: 'Clairière enchantée', night: true, sky0: '#240046', sky1: '#5a189a', sun: '#fff6d5', mount0: '#3c096c', mount1: '#10002b',
        grass: '#3c096c', grass2: '#360862', path: '#e0aaff', path2: '#d49af5', fog: '#c77dff',
        deco: ['🌳', '✨', '🍄', '💎', '🌳', '🔮'], ambient: ['fireflies'] },
    ],
    endText: 'L\'Étoile violette brille dans ta main ! Les créatures du bois sont libres !',
    sequence: [
      Z(4, 'Ta première aventure ! Le Nuage Grognon a caché l\'Étoile violette dans le Bois des Sortilèges. Chut… prépare ta baguette !'),
      WA(16, 3), AR('balai', 8), J(2), P('armsUp'), WA(18, 4), S(2), B(10, 6), WA(20, 5), K(10),
      Z(3, 'Bravo, petit sorcier ! Respire bien…'),
    ],
  },
  {
    id: 'stade',
    name: 'La Récré',
    tagline: 'Foot et basket avec les créatures de l\'Académie !',
    heroName: 'Tilt',
    hero: { body: '#06d6a0', belly: '#e6fff7', limb: '#049f76', accent: '#ef476f', extra: 'headband' },
    collectible: '🏆',
    sky: ['#4cc9f0', '#e0fbff'],
    biomes: [
      { name: 'Terrain de l\'Académie', sky0: '#4cc9f0', sky1: '#e0fbff', sun: '#fff6c2', mount0: '#90e0ef', mount1: '#52b788',
        grass: '#57cc99', grass2: '#4fbf8e', path: '#f8f9fa', path2: '#e9ecef', fog: '#e9fbff',
        deco: ['🏟️', '🚩', '🎈', '⚽', '🏀', '🚩'], ambient: ['birds'] },
      { name: 'Parc de l\'Académie', sky0: '#5aa9e6', sky1: '#fdffef', sun: '#fff6c2', mount0: '#a8d5ba', mount1: '#6fbf73',
        grass: '#7ccf6a', grass2: '#72c460', path: '#e6c28f', path2: '#dbb47e', fog: '#f4fbff',
        deco: ['🌳', '🌼', '🎈', '🌳', '🌷', '⚽'], ambient: ['butterflies'] },
    ],
    endText: 'Dring ! Fin de la récré… quel match !',
    sequence: [
      Z(4, 'Dring ! C\'est la récré ! On joue au ballon avec les créatures de l\'Académie.'),
      GO(5), AR('soleil', 1), J(2), BK(3), S(2), KI(4), AR('corde', 1), P('star'), GO(6), BK(3), KI(4),
      Z(3, 'Dring ! La récré est finie. Respire bien, champion…'),
    ],
  },
  {
    // Salle des Défis : les jeux miroir, pour tous et surtout pour les grands (trois au hasard à chaque visite, de plus en
    // plus vite ; record à battre). Hors de la carte : ouverte d'office, elle ne bloque pas l'histoire.
    id: 'defis',
    arenaMix: 3, noBoss: true,
    name: 'La Salle des Défis',
    tagline: 'Trois défis au hasard : bats ton record !',
    heroName: 'Pimprenelle',
    hero: { body: '#3a86ff', belly: '#dbeafe', limb: '#1e40af', accent: '#ffd166', extra: 'scarf' },
    collectible: '🏆',
    sky: ['#3a0ca3', '#7209b7'],
    biomes: [
      { name: 'La Salle des Défis', sky0: '#5a189a', sky1: '#c77dff', sun: '#ffe8c2', mount0: '#7b2cbf', mount1: '#9d4edd',
        grass: '#7ccf6a', grass2: '#6fbf73', path: '#e6c28f', path2: '#dbb47e', fog: '#e0c3fc',
        deco: ['🏆', '⭐', '🎈', '🪄', '🦉', '✨'], ambient: ['butterflies'] },
    ],
    endText: 'Quels défis ! Madame Pimprenelle est fière de toi.',
    sequence: [
      Z(4, 'Bienvenue dans la Salle des Défis de Madame Pimprenelle ! Trois défis t\'attendent… prêt ?'),
      AR('mur', 6), AR('soleil', 1), AR('pimprenelle', 7), AR('neige', 10), AR('potions', 2), AR('duel', 4),
      AR('corde', 1), AR('equilibre', 12), AR('balai', 12), AR('photo', 2),
      Z(3, 'Bravo, champion ! Respire bien…'),
    ],
  }
];

const SPEEDS = [
  { id: 'easy', label: 'Facile', mul: 1.5 },
  { id: 'normal', label: 'Normal', mul: 1 },
  { id: 'fast', label: 'Rapide', mul: 0.75 },
];

// Premier jour : le parcours complet = intro + les 5 leçons + respiration
WORLDS.forEach((w) => {
  if (!w.lessons) return;
  w.sequence = [Z(4, 'Madame Pimprenelle, la chouette directrice, t\'attend pour ton premier jour ! On va tout apprendre, doucement.'),
    ...w.lessons.flatMap((l) => l.steps), Z(4, 'Tu connais tous les sorts ! Respire bien… Bravo, petit sorcier !')];
});
// Paysage 3D (« kit » de décor, voir props3d.js) de chaque partie de chaque monde
const WORLD_KITS = {
  jardin3d: ['flowers'], turbo: ['meadow', 'mountain', 'desert'], island: ['beach', 'jungle', 'volcano'],
  forest: ['forest', 'beach', 'night'], banquise: ['glacier', 'aurora'], ocean: ['lagoon', 'reef', 'abyss'],
  espace: ['moon', 'mars', 'nebula'], bonbons: ['candy', 'icecream'], ferme: ['farm', 'orchard'],
  ecole: ['flowers'], defis: ['flowers'], supermarche: ['market', 'marketFruit'], singes: ['jungle', 'beach'], dinos: ['ferns', 'dinoland'], chateau: ['garden', 'magic'], disco: ['disco'], dojo: ['dojo', 'dojoNight'],
  verger: ['orchard', 'dojo'], rythmo: ['disco'], sortileges: ['forest', 'magic'], stade: ['stadium', 'meadow'],
};
// Épreuves rigolotes ajoutées à chaque monde (tunnel, taupes, copie de poses)
const FUN_POSES = [['armsUp', 'star', 'airplane'], ['airplane', 'armsUp', 'star'], ['star', 'airplane', 'armsUp']];
let classicN = 0; // rang parmi les mondes « classiques » (même règle que hooks.py)
WORLDS.forEach((w, i) => {
  (WORLD_KITS[w.id] || []).forEach((kit, k) => { if (w.biomes[k]) w.biomes[k].kit = kit; });
  if (['disco', 'dojo', 'verger', 'rythmo', 'ecole', 'supermarche', 'singes', 'sortileges', 'stade', 'jardin3d', 'forest', 'banquise', 'ocean', 'espace', 'dinos', 'defis'].includes(w.id)) return; // ces mondes ont leur propre programme (leur jeu sur place)
  const seq = w.sequence, n = seq.length;
  seq.splice(Math.round(n * 0.75), 0, PM(...FUN_POSES[i % FUN_POSES.length]));
  seq.splice(Math.round(n * 0.62), 0, classicN++ % 2 ? CU(10, 1.5) : SL(12, 6)); // fruits ou cubes, un monde sur deux
  seq.splice(Math.round(n * 0.5), 0, M(12, 6));
  seq.splice(Math.round(n * 0.25), 0, U(4));
});
// ---------- Mini-jeux un par un : « Jouer tout de suite » (les six premiers, en grandes cartes) et le labo de test (tous)
// step() : l'épreuve, assez longue pour une vraie petite partie (≈ 1 min)
const MINI_GAMES = [
  { id: 'slice', icon: '🍉', label: 'Fruits ninja', step: () => SL(40, 14) },
  { id: 'bubbles', icon: '🫧', label: 'Bulles', step: () => B(40, 16) },
  { id: 'mur', icon: '🧱', label: 'Mur magique', step: () => AR('mur', 8) },
  { id: 'balai', icon: '🧹', label: 'Balai volant', step: () => AR('balai', 12) },
  { id: 'dance', icon: '💃', label: 'Danse', step: () => DN('armsUp', 'star', 'left', 'right', 'squat', 'jump', 'airplane', 'armsUp', 'star', 'smash') },
  { id: 'goal', icon: '⚽', label: 'Gardien de but', step: () => GO(8) },
  { id: 'moles', icon: '🐹', label: 'Taupes', step: () => M(30, 10) },
  { id: 'cubes', icon: '🟦', label: 'Cubes en musique', step: () => CU(12, 1.5) },
  { id: 'catch', icon: '⭐', label: 'Étoiles qui tombent', step: () => K(30) },
  { id: 'wand', icon: '🪄', label: 'Baguette magique', step: () => WA(30, 5) },
  { id: 'foam', icon: '🧽', label: 'Mousse des singes', step: () => MO(30, 5) },
  { id: 'freeze', icon: '🎵', label: 'Statues musicales', step: () => F(21) },
  { id: 'rope', icon: '🪢', label: 'Corde à sauter', step: () => Q(6) },
  { id: 'tunnel', icon: '🕳️', label: 'Tunnel', step: () => U(5) },
  { id: 'posemix', icon: '🤸', label: 'Suite de poses', step: () => PM('armsUp', 'star', 'airplane', 'flamingo') },
  { id: 'karate', icon: '🥋', label: 'Karaté', step: () => KA('armsUp', 'squat', 'left', 'right', 'smash', 'jump') },
  { id: 'basket', icon: '🏀', label: 'Basket', step: () => BK(3) },
  { id: 'kick', icon: '🥅', label: 'Penalty', step: () => KI(3) },
  { id: 'run', icon: '🏃', label: 'Course (obstacles)', step: () => R(20) },
  { id: 'soleil', icon: '☁️', label: '1, 2, 3 Nuage', step: () => AR('soleil', 1) },
  { id: 'pimprenelle', icon: '🦉', label: 'Pimprenelle a dit', step: () => AR('pimprenelle', 7) },
  { id: 'neige', icon: '⛄', label: 'Boules de neige', step: () => AR('neige', 10) },
  { id: 'potions', icon: '🧪', label: 'Potions', step: () => AR('potions', 2) },
  { id: 'duel', icon: '⚡', label: 'Duel de sorciers', step: () => AR('duel', 4) },
  { id: 'corde', icon: '💪', label: 'Tir à la corde', step: () => AR('corde', 1) },
  { id: 'equilibre', icon: '🎪', label: 'Équilibriste', step: () => AR('equilibre', 12) },
  { id: 'photo', icon: '📸', label: 'Photo magique', step: () => AR('photo', 2) },
];
const QUICK_GAMES = MINI_GAMES.slice(0, 6);
// Partie faite de mini-jeux choisis (monde « libre » : ne compte pas dans l'histoire ni les étoiles des îles).
// loop : on enchaîne les parties sans s'arrêter (labo de test)
function quickWorld(games, loop = false) {
  const base = WORLDS.find((w) => w.id === 'jardin3d'), one = games.length === 1;
  return { ...base, id: 'libre', quick: true, loop, noBoss: true, lessons: null, tutorial: false,
    name: one ? games[0].label : '🧪 Labo des mini-jeux', tagline: '', collectible: one ? games[0].icon : '🧪', biomes: [base.biomes[0]],
    endText: one ? `Bravo ! ${games[0].icon}` : 'Tour du labo terminé !',
    sequence: [Z(3, one ? `${games[0].label} ! C'est parti !` : 'Le labo des mini-jeux ! C\'est parti !'), ...games.map((g) => g.step()), Z(2, 'Bravo ! Respire bien…')] };
}
// Gardien de fin de monde (avant la respiration finale), dans tous les mondes
const BOSS_POSES = [['star', 'airplane', 'armsUp'], ['armsUp', 'star', 'airplane'], ['airplane', 'armsUp', 'star']];
WORLDS.forEach((w, i) => { if (w.tutorial || w.noBoss) return; const seq = w.sequence; seq.splice(seq.length - 1, 0, BS(...BOSS_POSES[i % 3])); });
