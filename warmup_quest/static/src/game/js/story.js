// L'histoire : « Les Étoiles de l'Arc-en-ciel ».
// Au-dessus de l'Académie des Petits Mages brille un arc-en-ciel magique. Le Nuage Grognon (un petit nuage tout seul,
// pas méchant : triste) en vole les six couleurs et les cache, changées en Étoiles, dans les six pays d'aventure.
// L'enfant, petit sorcier, suit ses cours avec Madame Pimprenelle (la chouette directrice), puis part par le portail
// retrouver les Étoiles. Chaque pays libéré rend une couleur : l'arc-en-ciel du parc se reconstruit pour de vrai.
// Au château, on ne « bat » pas le Nuage Grognon : on l'invite à jouer, et il devient le Nuage Câlin.
// Pensé pour 4–10 ans : phrases courtes lues par la voix (on avance tout seul à la fin de chaque phrase), un mystère
// qui se dévoile petit à petit pour les grands (pourquoi est-il grognon ?), jamais de peur, une fin sur l'amitié.

// Une Étoile de couleur par pays d'aventure (dans l'ordre de la carte)
const GEMS = [
  { world: 'sortileges', name: 'violette', col: '#9d4edd', icon: '💜' },
  { world: 'forest', name: 'verte', col: '#38b000', icon: '💚' },
  { world: 'banquise', name: 'orange', col: '#ff8c00', icon: '🧡' },
  { world: 'ocean', name: 'bleue', col: '#1e90ff', icon: '💙' },
  { world: 'dinos', name: 'rouge', col: '#ef233c', icon: '❤️' },
  { world: 'espace', name: 'jaune', col: '#ffd60a', icon: '💛' },
];
// Ordre des bandes de l'arc-en-ciel (de l'extérieur vers l'intérieur)
const RAINBOW = ['dinos', 'banquise', 'espace', 'forest', 'ocean', 'sortileges'];
const gemOf = (id) => GEMS.find((g) => g.world === id) || null;

// Ce que le Nuage Grognon fait après chaque Étoile retrouvée : le mystère se dévoile peu à peu
const GROGNON_HINTS = [
  { art: '🌩️😤', text: 'Tout là-haut, le Nuage Grognon boude : « Grrr ! Rends-moi mon étoile ! »' },
  { art: '🌩️🤧', text: 'Atchoum ! Le Nuage Grognon éternue des petits éclairs. Il a l\'air… tout seul.' },
  { art: '🌩️💧', text: 'On dirait que le Nuage Grognon pleure un peu. Pourquoi est-il si grognon ?' },
  { art: '🦉🤔', text: 'Madame Pimprenelle réfléchit : « Et si le Nuage Grognon n\'était pas méchant… mais juste triste ? »' },
  { art: '🪶✉️', text: 'Une plume de chouette t\'apporte un message : « Plus qu\'une étoile ! Courage, petit sorcier ! »' },
  { art: '🏰🌩️', text: 'Les six étoiles sont là ! Mais le cœur de l\'arc-en-ciel est encore dans le château du Nuage Grognon. Va le voir… et sois gentil avec lui.' },
];

const CHAPTERS_TALE = {
  prologue: { title: 'Le premier jour', pages: [
    { art: '🏰🌈', text: `Au-dessus de l'${SCHOOL} brille un grand arc-en-ciel magique. C'est lui qui donne de la joie à tout le pays.` },
    { art: '🦉📜', text: 'La directrice, Madame Pimprenelle la chouette, t\'accueille : « Bienvenue, petit sorcier ! Ici, on apprend la magie… en bougeant ! »' },
    { art: '🧙🪄', text: 'Chaque cours t\'apprend un nouveau sort : sauter comme une grenouille, danser, viser avec ta baguette…' },
    { art: '🐾💖', text: 'Et voici ton familier : une créature magique rien qu\'à toi. Il te suivra partout et grandira avec toi.' },
    { art: '🌩️👀', text: 'Mais tout là-haut, un petit nuage gris vous regarde en fronçant les sourcils… Qui est-ce ?' },
    { art: '✨🏃', text: 'À toi de jouer ! Va à ton premier cours. Madame Pimprenelle compte sur toi !' },
  ] },
  portal: { title: "L'arc-en-ciel a disparu !", pages: [
    { art: '🌩️🌈', text: 'Patatras ! Pendant la nuit, le Nuage Grognon a aspiré toutes les couleurs de l\'arc-en-ciel !' },
    { art: '⭐⭐⭐', text: 'Il les a changées en six Étoiles de couleur, et il les a cachées dans six pays lointains.' },
    { art: '😢🏰', text: 'Sans arc-en-ciel, tout le monde devient grognon. Même les créatures !' },
    { art: '🦉🌀', text: 'Madame Pimprenelle ouvre le portail magique : « Tu as fini tes cours, petit sorcier. Tu es prêt ! Va retrouver les Étoiles ! »' },
  ] },
  fin: { title: 'Le Nuage Câlin', pages: [
    { art: '🌩️💧', text: 'Le Nuage Grognon renifle : « Snif… Je voulais juste des couleurs. Personne ne m\'invite jamais à jouer. »' },
    { art: '🤝🧙', text: 'Tu lui tends la main : « Viens jouer avec nous ! » Le petit nuage n\'en revient pas.' },
    { art: '🌈☁️', text: 'Il rend le cœur de l\'arc-en-ciel… et pouf ! Il devient un nuage tout doux, aux couleurs de l\'arc-en-ciel.' },
    { art: '🎉🏰', text: 'À l\'Académie, c\'est la fête ! Tout le monde danse, même le petit nuage. Maintenant, on l\'appelle le Nuage Câlin.' },
    { art: '🎓🦉', text: 'Madame Pimprenelle te remet ton diplôme : « Bravo, petit sorcier ! La plus grande magie, c\'est l\'amitié. »' },
  ] },
};
// Chapitre d'une Étoile retrouvée (n : combien on en a maintenant)
function gemChapter(g, n) {
  const w = WORLDS.find((x) => x.id === g.world);
  return { title: `L'Étoile ${g.name}`, gem: g, pages: [
    { art: `⭐${g.icon}`, text: `Bravo ! Dans ${w ? w.name : 'ce pays'}, tu as retrouvé l'Étoile ${g.name} !` },
    { art: '🌈✨', text: n < GEMS.length ? `De retour à l'Académie, l'arc-en-ciel retrouve sa couleur ${g.name}. Encore ${GEMS.length - n} étoile${GEMS.length - n > 1 ? 's' : ''} à trouver !` : `L'arc-en-ciel retrouve sa couleur ${g.name}. Il a presque toutes ses couleurs !` },
    GROGNON_HINTS[Math.min(n, GROGNON_HINTS.length) - 1],
  ] };
}

const Tale = {
  _k: (k, i = 0) => k + '_' + i,
  seen(id, i = 0) { return !!(WUQStore._get(this._k('tale', i)) || {})[id]; },
  markSeen(id, i = 0) { const s = WUQStore._get(this._k('tale', i)) || {}; s[id] = true; WUQStore._set(this._k('tale', i), s); },
  gems(i = 0) { return WUQStore._get(this._k('gems', i)) || []; },  // pays dont l'Étoile est retrouvée (dans l'ordre où on les a eues)
  addGem(id, i = 0) { const g = this.gems(i); if (!g.includes(id)) { g.push(id); WUQStore._set(this._k('gems', i), g); } },
  hasGem(id, i = 0) { return this.gems(i).includes(id); },
  done(i = 0) { return !!WUQStore._get('diploma_' + i); },
  // Un pays est-il fini ? (toutes ses étapes, ou une étoile s'il se joue d'une traite)
  countryDone(w, i = 0) { const n = Stages.count(w); return n ? Stages.done(w, i) >= n : Progress.stars(w, i) > 0; },
  // Rattrape les Étoiles des pays déjà finis (anciennes parties)
  sync(i = 0) { for (const g of GEMS) { const w = WORLDS.find((x) => x.id === g.world); if (w && this.countryDone(w, i)) this.addGem(g.world, i); } },
  // Chapitres prêts à être racontés (dans l'ordre de l'histoire), pas encore vus
  pending(i = 0) {
    this.sync(i);
    const out = [];
    if (!this.seen('prologue', i)) out.push('prologue');
    const adv = WORLDS.find((x) => x.id === CHAPTERS[1].worlds[0]);
    if (adv && Progress.unlocked(adv, i) && !this.seen('portal', i)) out.push('portal');
    this.gems(i).forEach((id) => { if (!this.seen('gem_' + id, i)) out.push('gem_' + id); });
    if (this.done(i) && !this.seen('fin', i)) out.push('fin');
    return out;
  },
  chapter(id, i = 0) {
    if (id.startsWith('gem_')) { const g = gemOf(id.slice(4)); return gemChapter(g, Math.max(1, this.gems(i).indexOf(g.world) + 1)); }
    return CHAPTERS_TALE[id];
  },
  // Chapitres déjà débloqués (pour le livre de l'histoire)
  unlocked(i = 0) {
    const out = ['prologue'];
    if (this.seen('portal', i)) out.push('portal');
    this.gems(i).forEach((id) => { if (this.seen('gem_' + id, i)) out.push('gem_' + id); });
    if (this.seen('fin', i)) out.push('fin');
    return out;
  },
};

// ---------- Lecteur de l'histoire : grande image, texte, voix ; avance tout seul à la fin de la phrase
// (ou avec le bouton, au clic ou la main posée dessus). pages : [{ art, text }]
function playTale(ch, onDone = () => {}, start = 0) {
  let k = Math.min(start, ch.pages.length - 1), timer = 0;
  const still = typeof DEV !== 'undefined' && DEV.get('taleshot'); // (mode test : la page reste affichée, pour la capture)
  const bg = document.createElement('div');
  bg.className = 'trainerBg storyBg';
  const end = () => { clearTimeout(timer); bg.remove(); Audio8.stopSpeech(); onDone(); };
  const next = () => { clearTimeout(timer); if (++k >= ch.pages.length) end(); else page(); };
  const page = () => {
    const st = ch.pages[k], last = k === ch.pages.length - 1, kk = k;
    bg.innerHTML = `<div class="storyPanel"><div class="taleTitle">📖 ${ch.title}</div><div class="storyArt">${st.art}</div><p>${st.text}</p>
      <div class="storyDots">${ch.pages.map((_, i) => `<span class="${i === k ? 'on' : ''}"></span>`).join('')}</div>
      <button class="btn">${last ? 'C\'est parti ! ✨' : 'Suivant ▶'}</button></div>`;
    bg.querySelector('button').onclick = next;
    if (ch.gem && k === 0) Audio8.perfect();
    Audio8.say(st.text, { slow: true, onend: () => { if (k === kk && !still) timer = setTimeout(() => { if (k === kk) next(); }, last ? 3500 : 1600); } }); // (dernière page : se ferme toute seule aussi)
  };
  document.body.appendChild(bg);
  page();
}

// Raconte, l'un après l'autre, les chapitres en attente du joueur 1 (puis onDone)
function playPendingTale(onDone = () => {}) {
  const list = Tale.pending(0);
  if (!list.length || document.querySelector('.storyBg')) return onDone();
  const id = list[0];
  playTale(Tale.chapter(id, 0), () => { Tale.markSeen(id, 0); playPendingTale(onDone); });
}

// ---------- Le livre de l'histoire (bouton « 📜 L'histoire ») : les chapitres débloqués, à relire, et les Étoiles
function openTaleBook() {
  const bg = document.createElement('div');
  bg.className = 'trainerBg storyBg';
  const have = Tale.gems(0);
  const stars = GEMS.map((g) => `<span class="taleStar${have.includes(g.world) ? ' on' : ''}" style="--gc:${g.col}" title="Étoile ${g.name}">⭐</span>`).join('');
  const items = Tale.unlocked(0).map((id) => { const ch = Tale.chapter(id, 0); return `<button class="taleItem" data-id="${id}"><span>${ch.pages[0].art}</span>${ch.title}</button>`; }).join('');
  const locked = Math.max(0, 2 + GEMS.length - Tale.unlocked(0).length);
  bg.innerHTML = `<div class="storyPanel taleBook"><div class="taleTitle">📜 Les Étoiles de l'Arc-en-ciel</div>
    <div class="taleStars">${stars}</div><div class="taleList">${items}${'<div class="taleItem locked">❓</div>'.repeat(Math.min(3, locked))}</div>
    <button class="btn" id="taleClose">Fermer</button></div>`;
  document.body.appendChild(bg);
  bg.querySelector('#taleClose').onclick = () => bg.remove();
  bg.querySelectorAll('.taleItem[data-id]').forEach((b) => (b.onclick = () => { bg.remove(); playTale(Tale.chapter(b.dataset.id, 0), openTaleBook); }));
  Audio8.say(`Tu as retrouvé ${have.length} étoile${have.length > 1 ? 's' : ''} sur ${GEMS.length}. Choisis un chapitre à écouter !`);
}
