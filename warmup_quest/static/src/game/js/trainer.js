// Fenêtre « Mon dresseur » : l'enfant compose son petit personnage (tête, corps, jambes avec des flèches),
// son chapeau, ses lunettes et sa couleur préférée, uniquement avec des images (pas besoin de savoir lire).
// (d'abord les 5 aventuriers KayKit, entiers ; puis les 13 petits personnages qu'on compose tête / corps / jambes)
const TRAINER_KAY = ['kk-knight', 'kk-mage', 'kk-barbarian', 'kk-rogue', 'kk-hood'];
const TRAINER_MODELS = [...TRAINER_KAY, 'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'male-g',
  'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f'];
const TRAINER_SMALL = TRAINER_MODELS.filter((m) => !TRAINER_KAY.includes(m));
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
      // (corps et jambes : seulement les petits personnages ; un aventurier KayKit est entier)
      body: TRAINER_SMALL.includes(l.body) ? l.body : TRAINER_SMALL.includes(l.model) ? l.model : 'male-a',
      legs: TRAINER_SMALL.includes(l.legs) ? l.legs : TRAINER_SMALL.includes(l.body) ? l.body : TRAINER_SMALL.includes(l.model) ? l.model : 'male-a',
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
    // Un onglet à la fois, avec de GROSSES vignettes (faciles à toucher, ou à viser avec la main)
    const TABS = [['model', '🙂'], ['body', '👕'], ['legs', '👖'], ['hat', '🎩'], ['back', '🎒'], ['color', '🎨']];
    let tab = 'model', page = 0;
    bg.innerHTML = `<div class="trainerPanel">
        <div class="trainerTop">
          <div class="trainerHero"><canvas width="240" height="300"></canvas>
            <div class="trainerName">${String(opts.name || '').replace(/[&<>"]/g, '')}</div>
            <button type="button" class="trDice" title="Au hasard">🎲</button></div>
          <div class="trainerChoices">
            <div class="trTabs">${TABS.map(([k, ic]) => `<button type="button" class="trTab" data-tab="${k}">${ic}</button>`).join('')}</div>
            <div class="trGridRow"><button type="button" class="trPg" data-d="-1">◀</button><div class="trGrid"></div><button type="button" class="trPg" data-d="1">▶</button></div>
            <div class="trStarsRow"></div>
          </div>
        </div>
        <p class="trainerErr"></p>
        <div class="row"><button class="btn" data-ok>✔</button><button class="btn ghost" data-cancel>✖</button></div>
      </div>`;
    document.body.appendChild(bg);
    const hero = bg.querySelector('.trainerHero canvas').getContext('2d');
    const grid = bg.querySelector('.trGrid');
    const can3d = typeof scene3d !== 'undefined' && store('3d') !== false;
    const stars = opts.stars || 0, cost = (id) => (TRAINER_REWARDS.find((r) => r.id === id) || { stars: 0 }).stars;
    const PER = 6; // vignettes par page
    const CROPS = { model: [45, 40, 150, 150], body: [40, 150, 160, 70], legs: [55, 198, 130, 76] };

    // Grosse vignette : image (canvas) ou émoji, verte quand c'est le choix actuel
    const cell = (selected, draw, onPick, cls = '') => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'trBig' + (selected ? ' on' : '') + cls;
      draw(b);
      if (onPick) b.onclick = () => { onPick(); Audio8.pop(); render(); };
      grid.appendChild(b);
    };
    const canvasOf = (b, w = 120, h = 120) => { const c = document.createElement('canvas'); c.width = w; c.height = h; b.appendChild(c); return c.getContext('2d'); };
    const lockedCell = (id) => cell(false, (b) => { b.innerHTML = `<span class="trLock">🔒</span><span class="trCost">⭐ ${cost(id)}</span>`; }, null, ' locked');

    // Liste des choix de l'onglet courant : [{ key, selected, draw, pick } | { locked: id }]
    const items = () => {
      if (tab === 'model' || tab === 'body' || tab === 'legs') {
        const [x, y, w, h] = CROPS[tab];
        const pool = tab === 'model' ? TRAINER_MODELS : TRAINER_MODELS.filter((m) => !TRAINER_KAY.includes(m));
        return pool.map((m) => ({ selected: look[tab] === m, pick: () => { look[tab] = m; if (tab === 'model' && !TRAINER_KAY.includes(m)) { if (TRAINER_KAY.includes(look.body)) look.body = m; if (TRAINER_KAY.includes(look.legs)) look.legs = m; } }, draw: (b) => {
          const g = canvasOf(b), src = this.pieceThumb(m, can3d);
          if (!src) { b.textContent = '…'; return; }
          const [x2, y2, w2, h2] = TRAINER_KAY.includes(m) ? [45, 40, 150, 200] : [x, y, w, h]; // (aventurier : on le montre en entier)
          const k = Math.min(120 / w2, 120 / h2), dw = w2 * k, dh = h2 * k;
          g.drawImage(src, x2, y2, w2, h2, (120 - dw) / 2, (120 - dh) / 2, dw, dh);
          if (TRAINER_KAY.includes(m)) b.classList.add('kayTile');
        } }));
      }
      if (tab === 'hat') {
        const list = TRAINER_OWN_HAT.includes(look.model) ? [] : ALL_HATS.map((hId) => (stars < cost(hId) ? { locked: hId } : {
          selected: look.hat === hId, pick: () => (look.hat = hId),
          draw: (b) => { if (can3d && scene3d.ready) try { canvasOf(b, 96, 120).drawImage(scene3d.trainerThumb({ ...look, hat: hId, glasses: false }, 96), 0, 0); } catch (e) { /* */ } },
        }));
        list.push({ selected: look.glasses, pick: () => (look.glasses = !look.glasses), draw: (b) => { b.innerHTML = '<span class="trEmoji">👓</span>'; } });
        return list;
      }
      if (tab === 'back') return ALL_BACKS.map((bk) => (stars < cost(bk) ? { locked: bk } : {
        selected: look.back === bk, pick: () => (look.back = bk),
        draw: (b) => { if (can3d && scene3d.ready) try { canvasOf(b, 96, 120).drawImage(scene3d.trainerThumb({ ...look, back: bk, view: 'back' }, 96), 0, 0); } catch (e) { /* */ } },
      }));
      return TRAINER_COLORS.map((c) => ({ selected: look.color === c, pick: () => (look.color = c), draw: (b) => { b.innerHTML = `<span class="trDot" style="--c:${c}"></span>`; } }));
    };

    const render = () => {
      hero.clearRect(0, 0, 240, 300);
      if (can3d && scene3d.ready) {
        try { hero.drawImage(scene3d.trainerThumb(look, 240), 0, 0); } catch (e) { console.warn(e); }
      } else {
        hero.fillStyle = look.color; hero.beginPath(); hero.arc(120, 150, 80, 0, Math.PI * 2); hero.fill();
      }
      const kay = TRAINER_KAY.includes(look.model);
      if (kay && (tab === 'body' || tab === 'legs')) tab = 'model';
      bg.querySelectorAll('.trTab').forEach((t) => { t.classList.toggle('on', t.dataset.tab === tab); t.style.display = kay && (t.dataset.tab === 'body' || t.dataset.tab === 'legs') ? 'none' : ''; });
      const list = items(), pages = Math.max(1, Math.ceil(list.length / PER));
      page = Math.max(0, Math.min(pages - 1, page));
      grid.innerHTML = '';
      for (const it of list.slice(page * PER, page * PER + PER)) it.locked ? lockedCell(it.locked) : cell(it.selected, it.draw, it.pick);
      bg.querySelectorAll('.trPg').forEach((p) => p.classList.toggle('off', pages < 2 || (p.dataset.d < 0 ? page === 0 : page >= pages - 1)));
      bg.querySelector('.trStarsRow').innerHTML = tab === 'hat' || tab === 'back'
        ? `⭐ ${stars}${Trainer.nextReward(stars) ? ` · prochain cadeau à ⭐ ${Trainer.nextReward(stars).stars} ${Trainer.nextReward(stars).icon}` : ''}` : '';
    };
    bg.querySelectorAll('.trTab').forEach((t) => (t.onclick = () => { tab = t.dataset.tab; page = 0; Audio8.pop(); render(); }));
    bg.querySelectorAll('.trPg').forEach((p) => (p.onclick = () => { page += Number(p.dataset.d); Audio8.whoosh(); render(); }));
    // (page de la vignette choisie, pour la voir tout de suite)
    const pageOfSelected = () => { const i = items().findIndex((it) => it.selected); page = i > 0 ? Math.floor(i / PER) : 0; };
    bg.querySelectorAll('.trTab').forEach((t) => t.addEventListener('click', () => { pageOfSelected(); render(); }));

    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    bg.querySelector('.trDice').onclick = () => {
      const st = opts.stars || 0, free = (id) => st >= ((TRAINER_REWARDS.find((r) => r.id === id) || { stars: 0 }).stars);
      Object.assign(look, { model: pick(TRAINER_MODELS), body: pick(TRAINER_SMALL), legs: pick(TRAINER_SMALL), hat: pick(ALL_HATS.filter(free)), back: pick(ALL_BACKS.filter(free)) });
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
    pageOfSelected(); render();
    // Les modèles 3D se chargent une fois, puis on redessine avec les vrais personnages
    if (can3d) scene3d.preloadTrainers().then(() => { if (bg.isConnected) render(); }).catch((e) => console.warn(e));
  },
};
