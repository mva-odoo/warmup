// Fenêtre « Mon dresseur » : l'enfant compose son petit personnage (tête, corps, jambes avec des flèches),
// son chapeau, ses lunettes et sa couleur préférée, uniquement avec des images (pas besoin de savoir lire).
const TRAINER_MODELS = ['male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'male-g',
  'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f'];
const TRAINER_HATS = ['cap', 'beanie', 'headband', 'none'];
// Récompenses : chapeaux et dos à débloquer avec les étoiles gagnées (total de tous les mondes)
const TRAINER_REWARDS = [
  { kind: 'hat', id: 'crown', stars: 3, icon: '👑' }, { kind: 'hat', id: 'flowers', stars: 5, icon: '🌸' },
  { kind: 'back', id: 'cape', stars: 7, icon: '🦸' }, { kind: 'hat', id: 'wizard', stars: 10, icon: '🧙' },
  { kind: 'hat', id: 'cat', stars: 13, icon: '🐱' }, { kind: 'back', id: 'wings', stars: 16, icon: '🪽' },
  { kind: 'hat', id: 'pirate', stars: 20, icon: '🏴‍☠️' }, { kind: 'hat', id: 'viking', stars: 25, icon: '⚔️' },
  { kind: 'hat', id: 'astro', stars: 30, icon: '🚀' },
];
const ALL_HATS = [...TRAINER_HATS, ...TRAINER_REWARDS.filter((r) => r.kind === 'hat').map((r) => r.id)];
const ALL_BACKS = ['bag', ...TRAINER_REWARDS.filter((r) => r.kind === 'back').map((r) => r.id)];
const TRAINER_OWN_HAT = ['male-c']; // a déjà sa casquette : pas de choix de chapeau
const TRAINER_COLORS = ['#ff6b35', '#4ea8ff', '#5cc96b', '#b388eb', '#ffb703', '#ef476f', '#2ec4b6', '#7c8cff'];

const Trainer = {
  defaults(look, color) {
    const l = look || {};
    return {
      model: TRAINER_MODELS.includes(l.model) ? l.model : 'male-a', // tête
      body: TRAINER_MODELS.includes(l.body) ? l.body : TRAINER_MODELS.includes(l.model) ? l.model : 'male-a',
      legs: TRAINER_MODELS.includes(l.legs) ? l.legs : TRAINER_MODELS.includes(l.body) ? l.body : TRAINER_MODELS.includes(l.model) ? l.model : 'male-a',
      hat: ALL_HATS.includes(l.hat) ? l.hat : 'cap',
      back: ALL_BACKS.includes(l.back) ? l.back : 'bag',
      glasses: !!l.glasses,
      color: /^#[0-9a-f]{6}$/i.test(color || l.color || '') ? (color || l.color) : '#ff6b35',
    };
  },

  // Récompenses débloquées avec n étoiles, et celles gagnées en passant de « avant » à « après »
  unlocked(stars) { return TRAINER_REWARDS.filter((r) => stars >= r.stars); },
  gained(before, after) { return TRAINER_REWARDS.filter((r) => before < r.stars && after >= r.stars); },
  nextReward(stars) { return TRAINER_REWARDS.find((r) => stars < r.stars) || null; },

  // Portrait d'un personnage entier (sans chapeau ni lunettes), gardé en mémoire : on y découpe tête, corps, jambes
  pieceThumb(model, can3d) {
    this.pieces = this.pieces || {};
    if (this.pieces[model]) return this.pieces[model];
    if (!can3d || !scene3d.ready || !scene3d.hasTrainer(model)) return null;
    try { this.pieces[model] = scene3d.trainerThumb({ model, body: model, legs: model, hat: 'none', glasses: false, color: '#cbd5e1' }, 240); } catch (e) { console.warn(e); return null; }
    return this.pieces[model];
  },

  // opts : { name, look, color, stars, onSave(look) } — onSave peut renvoyer une promesse
  open(opts) {
    if (document.getElementById('trainerBox')) return;
    const look = this.defaults(opts.look, opts.color);
    const bg = document.createElement('div');
    bg.id = 'trainerBox';
    bg.className = 'trainerBg';
    bg.innerHTML = `<div class="trainerPanel">
        <div class="trainerTop">
          <div class="trainerHero"><canvas width="240" height="300"></canvas>
            <div class="trainerName">${String(opts.name || '').replace(/[&<>"]/g, '')}</div></div>
          <div class="trainerChoices">
            <div class="trParts">
              ${[['model', '🙂'], ['body', '👕'], ['legs', '👖']].map(([k, ic]) => `<div class="trPart" data-part="${k}">
                <span class="trPartIcon">${ic}</span><div class="trStrip"></div></div>`).join('')}
              <button type="button" class="trDice" title="Au hasard">🎲</button>
            </div>
            <div class="trRow" data-row="hat"></div>
            <div class="trRow" data-row="back"></div>
            <div class="trRow" data-row="color"></div>
          </div>
        </div>
        <p class="trainerErr"></p>
        <div class="row"><button class="btn" data-ok>✔</button><button class="btn ghost" data-cancel>✖</button></div>
      </div>`;
    document.body.appendChild(bg);
    const hero = bg.querySelector('.trainerHero canvas').getContext('2d');
    const rows = {};
    bg.querySelectorAll('.trRow').forEach((r) => (rows[r.dataset.row] = r));
    const can3d = typeof scene3d !== 'undefined' && store('3d') !== false;

    // Petite vignette 3D (ou pastille de couleur si la 3D n'est pas disponible)
    const tile = (row, variant, selected, onPick, label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'trTile' + (selected ? ' on' : '');
      if (label) b.innerHTML = `<span class="trEmoji">${label}</span>`;
      else {
        const c = document.createElement('canvas'); c.width = 96; c.height = 120;
        b.appendChild(c);
        if (can3d && scene3d.ready) {
          try { c.getContext('2d').drawImage(scene3d.trainerThumb({ ...look, ...variant }, 96), 0, 0); } catch (e) { console.warn(e); }
        }
      }
      b.onclick = () => { onPick(); Audio8.pop(); render(); };
      row.appendChild(b);
    };

    const render = () => {
      hero.clearRect(0, 0, 240, 300);
      if (can3d && scene3d.ready) {
        try { hero.drawImage(scene3d.trainerThumb(look, 240), 0, 0); } catch (e) { console.warn(e); }
      } else {
        hero.fillStyle = look.color; hero.beginPath(); hero.arc(120, 150, 80, 0, Math.PI * 2); hero.fill();
      }
      // Toutes les têtes, tous les corps, toutes les jambes : une vignette par personnage, on touche celle qu'on veut
      const CROPS = { model: [50, 38, 140, 124], body: [40, 150, 160, 62], legs: [55, 198, 130, 70] };
      bg.querySelectorAll('.trPart').forEach((row) => {
        const part = row.dataset.part, strip = row.querySelector('.trStrip'), [x, y, w, h] = CROPS[part];
        strip.innerHTML = '';
        for (const m of TRAINER_MODELS) {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'trPiece' + (look[part] === m ? ' on' : '');
          const cv = document.createElement('canvas'); cv.width = 64; cv.height = 52; b.appendChild(cv);
          const src = this.pieceThumb(m, can3d);
          if (src) {
            const g = cv.getContext('2d'), k = Math.min(cv.width / w, cv.height / h), dw = w * k, dh = h * k;
            g.drawImage(src, x, y, w, h, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
          } else b.textContent = '…'; // (personnages 3D en cours de chargement)
          b.onclick = () => { look[part] = m; Audio8.pop(); render(); };
          strip.appendChild(b);
        }
      });
      rows.hat.innerHTML = '';
      const stars = opts.stars || 0, cost = (id) => (TRAINER_REWARDS.find((r) => r.id === id) || { stars: 0 }).stars;
      // Objet pas encore gagné : cadenas et nombre d'étoiles à réunir
      const locked = (row, id) => {
        const b = document.createElement('div');
        b.className = 'trTile locked';
        b.innerHTML = `<span class="trLock">🔒</span><span class="trCost">⭐ ${cost(id)}</span>`;
        b.onclick = () => { Audio8.soft(); Audio8.say(`Gagne ${cost(id)} étoiles pour l'avoir !`); };
        row.appendChild(b);
      };
      if (!TRAINER_OWN_HAT.includes(look.model)) {
        for (const h of ALL_HATS) {
          if (stars < cost(h)) locked(rows.hat, h);
          else tile(rows.hat, { hat: h, glasses: false }, look.hat === h, () => (look.hat = h));
        }
      }
      tile(rows.hat, { glasses: !look.glasses }, false, () => (look.glasses = !look.glasses), look.glasses ? '🚫👓' : '👓');
      rows.back.innerHTML = '<span class="trStars">⭐ ' + stars + '</span>';
      for (const bk of ALL_BACKS) {
        if (stars < cost(bk)) locked(rows.back, bk);
        else tile(rows.back, { back: bk, view: 'back' }, look.back === bk, () => (look.back = bk));
      }
      rows.color.innerHTML = '';
      for (const c of TRAINER_COLORS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'trSwatch' + (look.color === c ? ' on' : '');
        b.style.setProperty('--c', c);
        b.onclick = () => { look.color = c; render(); };
        rows.color.appendChild(b);
      }
    };

    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    bg.querySelector('.trDice').onclick = () => {
      const st = opts.stars || 0, free = (id) => st >= ((TRAINER_REWARDS.find((r) => r.id === id) || { stars: 0 }).stars);
      Object.assign(look, { model: pick(TRAINER_MODELS), body: pick(TRAINER_MODELS), legs: pick(TRAINER_MODELS), hat: pick(ALL_HATS.filter(free)), back: pick(ALL_BACKS.filter(free)) });
      Audio8.boing(); render();
    };
    const close = () => bg.remove();
    bg.querySelector('[data-cancel]').onclick = close;
    bg.querySelector('[data-ok]').onclick = async (e) => {
      e.target.disabled = true;
      try { await (opts.onSave && opts.onSave({ ...look })); close(); } catch (err) {
        bg.querySelector('.trainerErr').textContent = err.message || String(err);
        e.target.disabled = false;
      }
    };
    render();
    // Les modèles 3D se chargent une fois, puis on redessine avec les vrais personnages
    if (can3d) scene3d.preloadTrainers().then(() => { if (bg.isConnected) render(); }).catch((e) => console.warn(e));
  },
};
