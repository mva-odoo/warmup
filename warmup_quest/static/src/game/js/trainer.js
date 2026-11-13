// Fenêtre « Mon dresseur » : l'enfant choisit son petit personnage, son chapeau, ses lunettes
// et sa couleur préférée, uniquement avec des images (pas besoin de savoir lire).
const TRAINER_MODELS = ['male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'male-g',
  'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f'];
const TRAINER_HATS = ['cap', 'beanie', 'headband', 'none'];
const TRAINER_COLORS = ['#ff6b35', '#4ea8ff', '#5cc96b', '#b388eb', '#ffb703', '#ef476f', '#2ec4b6', '#7c8cff'];

const Trainer = {
  defaults(look, color) {
    const l = look || {};
    return {
      model: TRAINER_MODELS.includes(l.model) ? l.model : 'male-a',
      hat: TRAINER_HATS.includes(l.hat) ? l.hat : 'cap',
      glasses: !!l.glasses,
      color: /^#[0-9a-f]{6}$/i.test(color || l.color || '') ? (color || l.color) : '#ff6b35',
    };
  },

  // opts : { name, look, color, onSave(look) } — onSave peut renvoyer une promesse
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
            <div class="trRow" data-row="model"></div>
            <div class="trRow" data-row="hat"></div>
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
      rows.model.innerHTML = '';
      for (const m of TRAINER_MODELS) tile(rows.model, { model: m, hat: 'none', glasses: false }, look.model === m, () => (look.model = m));
      rows.hat.innerHTML = '';
      for (const h of TRAINER_HATS) tile(rows.hat, { hat: h, glasses: false }, look.hat === h, () => (look.hat = h));
      tile(rows.hat, { glasses: !look.glasses }, false, () => (look.glasses = !look.glasses), look.glasses ? '🚫👓' : '👓');
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
