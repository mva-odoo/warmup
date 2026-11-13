// Progression : carte des mondes (îles à ouvrir), surprise du jour, compagnon, parties du jour.
// Pensé pour donner envie de revenir, sans punition : rien ne se perd, rien ne s'achète.

// Ordre des îles sur la carte (du plus simple au plus varié)
const MAP_ORDER = ['ecole', 'jardin3d', 'turbo', 'island', 'forest', 'ferme', 'bonbons', 'banquise', 'ocean', 'dinos', 'verger',
  'espace', 'chateau', 'rythmo', 'disco', 'dojo'];
const MAP_FREE = 4; // l'école et les 3 premières îles sont ouvertes d'office

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
    return this.stars(list[k - 1], i) > 0;
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

// Petits souvenirs : photos de fin de partie gardées dans ce navigateur (6 dernières par joueur)
const Photos = {
  list(i = 0) { return WUQStore._get('photos_' + i) || []; },
  add(i, url) {
    if (!url) return;
    const l = [url, ...this.list(i)].slice(0, 6);
    try { WUQStore._set('photos_' + i, l); } catch (e) { /* (place pleine : tant pis pour la photo) */ }
  },
};
