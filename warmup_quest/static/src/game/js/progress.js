// Progression : carte des mondes (îles à ouvrir), surprise du jour, compagnon, parties du jour.
// Pensé pour donner envie de revenir, sans punition : rien ne se perd, rien ne s'achète.

// Ordre des îles sur la carte (du plus simple au plus varié)
const MAP_ORDER = ['ecole', 'jardin3d', 'turbo', 'island', 'stade', 'forest', 'sortileges', 'ferme', 'bonbons', 'supermarche', 'singes', 'banquise', 'ocean', 'dinos', 'verger',
  'espace', 'chateau', 'rythmo', 'disco', 'dojo'];
const MAP_FREE = 4; // l'école et les 3 premières îles sont ouvertes d'office
// Îles ajoutées après coup au milieu du chemin : elles s'ouvrent comme les autres, mais ne ferment pas la suite
// à un enfant qui l'avait déjà ouverte (l'île d'après regarde aussi celle d'avant la nouvelle)
const MAP_LATE = ['sortileges', 'stade'];

// Créatures proposées comme premier compagnon
const STARTERS = ['flammeche', 'gouttin', 'feuillou'];
// Le compagnon grandit d'un niveau toutes les 2 parties ; au niveau 5 il évolue
const COMPANION_STEP = 2, COMPANION_MAX = 5;

const Progress = {
  ordered() {
    const byId = new Map(WORLDS.map((w) => [w.id, w]));
    const list = MAP_ORDER.map((id) => byId.get(id)).filter(Boolean);
    return [...list, ...WORLDS.filter((w) => !MAP_ORDER.includes(w.id))];
  },
  stars(w, i = 0) { return WUQStore.getBest(w.id, i).stars || 0; },
  // Une île est ouverte si elle fait partie des premières, si on y a déjà joué, ou si la précédente est réussie
  unlocked(w, i = 0) {
    if (typeof store === 'function' && store('allOpen')) return true;
    const list = this.ordered(), k = list.indexOf(w);
    if (k < MAP_FREE || this.stars(w, i) > 0) return true;
    for (let j = k - 1; j >= 0; j--) {
      if (this.stars(list[j], i) > 0) return true;
      if (!MAP_LATE.includes(list[j].id)) return false;
    }
    return false;
  },
  // Île où se trouve le dresseur : la première ouverte pas encore réussie (sinon la dernière ouverte)
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
    const intro = { m: 'rest', t: 3.5, text: `Étape ${k + 1} sur ${n} : ${bs[k].name} !` };
    const end = k === n - 1 ? (boss ? [boss] : []) : [{ m: 'pose', pose: ['star', 'airplane', 'armsUp'][k % 3], hold: 1.5, capture: true }];
    return [intro, ...mid.slice(a, b), ...end, last.m === 'rest' ? last : { m: 'rest', t: 3, text: 'Bravo ! Respire bien…' }];
  },
};
