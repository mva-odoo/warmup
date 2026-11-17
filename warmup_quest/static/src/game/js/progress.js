// Progression : carte des mondes (îles à ouvrir), surprise du jour, compagnon, parties du jour.
// Pensé pour donner envie de revenir, sans punition : rien ne se perd, rien ne s'achète.

// L'histoire : l'enfant est un petit sorcier en première année à l'Académie des Petits Mages.
// Chapitre 1 « À l'Académie » : les cours (chaque épreuve est une leçon). Chapitre 2 « Les aventures » : par le
// portail magique, on aide les pays que le Nuage Grognon a rendus grognons, jusqu'à son château (dernière île).
const SCHOOL = 'Académie des Petits Mages';
const CHAPTERS = [
  { id: 'cours', icon: '📚', name: "À l'Académie", worlds: ['ecole', 'jardin3d', 'disco', 'dojo', 'verger', 'stade', 'singes', 'supermarche'] },
  { id: 'aventures', icon: '🌀', name: 'Les aventures', worlds: ['sortileges', 'forest', 'banquise', 'ocean', 'dinos', 'espace', 'chateau'] },
];
// Ordre des îles sur la carte (les anciennes îles « retired » n'y sont plus)
const MAP_ORDER = CHAPTERS.flatMap((c) => c.worlds);
const MAP_FREE = 4; // le premier jour et les 3 premiers cours sont ouverts d'office
const chapterOf = (w) => CHAPTERS.find((c) => c.worlds.includes(w.id)) || null;
// Le Nuage Grognon : gardien de la dernière île (une créature à part, qui ne va pas dans le grimoire)
const GROGNON = { id: 'grognon', name: 'Nuage Grognon', element: 'Orage', color: '#6c6f93', belly: '#e9e9f5', shape: 'cloud', feature: 'none' };

// Créatures proposées comme premier compagnon
const STARTERS = ['flammeche', 'gouttin', 'feuillou'];
// Le compagnon grandit d'un niveau toutes les 2 parties ; au niveau 5 il évolue
const COMPANION_STEP = 2, COMPANION_MAX = 5;

const Progress = {
  ordered() {
    const byId = new Map(WORLDS.map((w) => [w.id, w]));
    const list = MAP_ORDER.map((id) => byId.get(id)).filter(Boolean);
    return [...list, ...WORLDS.filter((w) => !MAP_ORDER.includes(w.id) && !w.retired)];
  },
  stars(w, i = 0) { return WUQStore.getBest(w.id, i).stars || 0; },
  // Une île est ouverte si elle fait partie des premières, si on y a déjà joué, si la précédente est réussie,
  // ou si l'enfant est déjà allé plus loin sur la carte (la carte a été réorganisée : rien ne se referme)
  unlocked(w, i = 0) {
    if (typeof store === 'function' && store('allOpen')) return true;
    const list = this.ordered(), k = list.indexOf(w);
    if (k < MAP_FREE || this.stars(w, i) > 0) return true;
    if (k > 0 && this.stars(list[k - 1], i) > 0) return true;
    return list.slice(k + 1).some((x) => this.stars(x, i) > 0);
  },
  // Île où se trouve le petit sorcier : la première ouverte pas encore réussie (sinon la dernière ouverte)
  current(i = 0) {
    const open = this.ordered().filter((w) => this.unlocked(w, i));
    return open.find((w) => this.stars(w, i) === 0) || open[open.length - 1];
  },
  dayKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  // Surprise du jour : un monde ouvert et une créature de ce monde, tirés à partir de la date (les mêmes toute la journée)
  daily(i = 0) {
    let h = 0; for (const ch of this.dayKey()) h = (h * 31 + ch.charCodeAt(0)) % 100003;
    const open = this.ordered().filter((w) => this.unlocked(w, i));
    const w = open[h % open.length];
    const kits = w.biomes.map((b) => b.kit || 'meadow');
    const pool = CREATURES.filter((c) => kits.some((k) => creaturesOf(k).includes(c)));
    return { world: w, creature: pool.length ? pool[(h >> 4) % pool.length] : null };
  },
  // Parties terminées aujourd'hui (pour l'objectif du jour et la limite choisie par les parents)
  playsToday(i = 0) { return (WUQStore._get('plays_' + i) || {})[this.dayKey()] || 0; },
  addPlay(i = 0) {
    const all = WUQStore._get('plays_' + i) || {}, k = this.dayKey();
    all[k] = (all[k] || 0) + 1;
    for (const d of Object.keys(all)) if (d < this.dayKey(new Date(Date.now() - 30 * 864e5))) delete all[d]; // (on garde un mois)
    WUQStore._set('plays_' + i, all);
    return all[k];
  },
  // Compagnon : { id, xp } -> niveau 1..5 et forme évoluée au maximum
  companionLevel(c) { return c ? Math.min(COMPANION_MAX, 1 + Math.floor((c.xp || 0) / COMPANION_STEP)) : 0; },
  companionCreature(c) { return c && CREATURES.find((x) => x.id === c.id) || null; },
};

// Chemins pris aux carrefours (par enfant) : épreuves choisies, derniers chemins de chaque île, clés des chemins secrets
const Paths = {
  // (gardés par WUQStore : dans ce navigateur, ou dans la fiche de l'enfant avec Odoo)
  get(i = 0) { return { counts: {}, last: {}, secrets: {}, ...(WUQStore.getPaths(i) || {}) }; },
  // first : premier carrefour de la partie (on repart d'une trace neuve pour cette île)
  choose(i, world, kind, first) {
    const p = this.get(i);
    p.counts[kind] = (p.counts[kind] || 0) + 1;
    p.last[world] = [...(first ? [] : p.last[world] || []), kind].slice(-2);
    WUQStore.setPaths(i, p);
  },
  secretFound(i, world) { const p = this.get(i); p.secrets[world] = (p.secrets[world] || 0) + 1; WUQStore.setPaths(i, p); },
  // Épreuve préférée : la plus choisie (au moins 2 fois)
  favorite(i = 0) {
    const e = Object.entries(this.get(i).counts).sort((a, b) => b[1] - a[1])[0];
    return e && e[1] >= 2 ? e[0] : null;
  },
};

// Petits souvenirs : photos de fin de partie gardées dans ce navigateur (6 dernières par joueur)
const Photos = {
  list(i = 0) { return WUQStore._get('photos_' + i) || []; },
  add(i, url) {
    if (!url) return;
    const l = [url, ...this.list(i)].slice(0, 6);
    try { WUQStore._set('photos_' + i, l); } catch (e) { /* (place pleine : tant pis pour la photo) */ }
  },
};

// Îles en étapes : une île à plusieurs paysages se joue en étapes (une par partie), une par paysage (3 au plus),
// chacune avec son thème (« Étape 2 sur 3 : La Jungle »). Chaque étape finit par une créature de ce paysage à
// apprivoiser ; le gardien attend à la fin de la dernière. Puis on recommence l'île à l'étape 1.
// (réglage parent « 🧩 Îles en étapes » ; gardé dans ce navigateur)
const Stages = {
  count(w) { // nombre d'étapes de l'île (0 : elle se joue d'une traite)
    if (store('stages') === false || w.tutorial || !w.biomes || w.biomes.length < 2) return 0;
    const n = Math.min(3, w.biomes.length);
    return w.sequence.length >= n * 4 + 2 ? n : 0;
  },
  _all(i) { return WUQStore._get('stages_' + i) || {}; },
  done(w, i = 0) { return this._all(i)[w.id] || 0; },              // étapes terminées (en tout, toutes boucles)
  next(w, i = 0) { const n = this.count(w); return n ? this.done(w, i) % n : 0; }, // étape à jouer (0..n-1)
  // Pastilles de la carte : étapes faites dans le tour en cours (île finie : toutes pleines)
  dots(w, i = 0) { const n = this.count(w), d = this.done(w, i); return !n ? 0 : d && d % n === 0 ? n : d % n; },
  finish(w, i = 0) { const all = this._all(i); all[w.id] = (all[w.id] || 0) + 1; WUQStore._set('stages_' + i, all); },
  // Découpe le parcours de l'île : intro de l'étape, sa part du parcours, une créature à apprivoiser
  // (ou le gardien à la dernière), respiration finale
  split(w, steps, k) {
    const n = this.count(w), bs = w.biomes;
    const boss = steps.find((st) => st.m === 'boss'), last = steps[steps.length - 1];
    const mid = steps.slice(1, -1).filter((st) => st !== boss);
    const a = Math.round((mid.length * k) / n), b = Math.round((mid.length * (k + 1)) / n);
    const story = k === 0 && steps[0] && steps[0].m === 'rest' ? steps[0].text + ' ' : ''; // (l'histoire de l'île, au début de la 1re étape)
    const intro = { m: 'rest', t: story ? 6 : 3.5, text: `${story}Étape ${k + 1} sur ${n} : ${bs[k].name} !` };
    const end = k === n - 1 ? (boss ? [boss] : []) : [{ m: 'pose', pose: ['star', 'airplane', 'armsUp'][k % 3], hold: 1.5, capture: true }];
    return [intro, ...mid.slice(a, b), ...end, last.m === 'rest' ? last : { m: 'rest', t: 3, text: 'Bravo ! Respire bien…' }];
  },
};
