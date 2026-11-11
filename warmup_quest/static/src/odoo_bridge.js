// Pont entre le jeu et Odoo : joueurs, séquences, records et carnet viennent du serveur,
// et chaque partie terminée y est enregistrée. Chargé uniquement par la route /warmup.
(function () {
  const cfg = window.WUQ_CONFIG;
  if (!cfg || typeof WUQStore === 'undefined') return;

  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem('wuq_odoo_' + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('wuq_odoo_' + k, JSON.stringify(v)); } catch {} },
  };

  let playerId = ls.get('player');
  const seqChoice = ls.get('seq') || {}; // monde -> id de séquence choisi
  const player = () => cfg.players.find((p) => p.id === playerId) || null;
  if (!player() && cfg.players.length) playerId = cfg.players[0].id;

  const sequencesFor = (world) => (cfg.sequences && cfg.sequences[world]) || [];
  const currentSeq = (world) => {
    const list = sequencesFor(world);
    return list.find((s) => s.id === seqChoice[world]) || list[0] || null;
  };

  async function rpc(url, params) {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params, id: Date.now() }),
    });
    const data = await res.json();
    if (data.error) throw new Error((data.error.data && data.error.data.message) || data.error.message);
    return data.result;
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  Object.assign(WUQStore, {
    getCarnet() { const p = player(); return p ? { ...(p.carnet || {}) } : {}; },
    setCarnet(c) { const p = player(); if (p) p.carnet = c; },
    getBest(world) {
      const p = player();
      return (p && p.best && p.best[world]) || { stars: 0, score: 0 };
    },
    setBest(world, b) {
      const p = player();
      if (!p) return;
      p.best = p.best || {};
      p.best[world] = b;
    },
    steps(world) {
      const seq = currentSeq(world.id);
      return seq && seq.steps.length ? seq.steps : world.sequence;
    },
    canStart() {
      return player() ? true : "Crée d'abord un joueur dans Odoo (Warm-Up Quest › Joueurs), puis recharge cette page.";
    },
    finish(result) {
      const p = player();
      if (!p) return;
      const seq = currentSeq(result.world);
      rpc('/warmup/api/session', { ...result, player_id: p.id, sequence_id: seq ? seq.id : false })
        .then((res) => {
          if (res) { p.carnet = res.carnet; p.best = res.best; }
          const best = document.getElementById('resBest');
          if (best) best.textContent += ' · ✅ Enregistré dans Odoo';
        })
        .catch((e) => {
          console.error(e);
          const best = document.getElementById('resBest');
          if (best) best.textContent += " · ⚠️ Non enregistré dans Odoo";
        });
    },
    menuExtras(rebuild) {
      const box = el('div', 'odooBar');
      const back = el('a', 'btn small ghost', '← Odoo');
      back.href = cfg.backUrl || '/odoo';
      box.appendChild(back);
      if (!cfg.players.length) {
        box.appendChild(el('span', 'odooHint', "Aucun joueur : crée un profil dans Odoo (Warm-Up Quest › Joueurs)."));
        return box;
      }
      box.appendChild(el('span', 'odooLabel', 'Qui joue ?'));
      for (const p of cfg.players) {
        const chip = el('button', 'playerChip' + (p.id === playerId ? ' on' : ''));
        chip.style.setProperty('--pc', p.color);
        chip.innerHTML = (p.avatar
          ? `<img src="${esc(p.avatar)}" alt="">`
          : `<span class="ini">${esc(p.name.charAt(0).toUpperCase())}</span>`) + `<span>${esc(p.name)}</span>`;
        chip.onclick = () => { playerId = p.id; ls.set('player', p.id); rebuild(); };
        box.appendChild(chip);
      }
      return box;
    },
    cardExtra(world, rebuild) {
      const list = sequencesFor(world.id);
      if (list.length < 2) return null;
      const sel = el('select', 'seqSelect');
      const cur = currentSeq(world.id);
      sel.innerHTML = list.map((s) => `<option value="${s.id}"${cur && s.id === cur.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
      sel.onchange = () => { seqChoice[world.id] = Number(sel.value); ls.set('seq', seqChoice); };
      return sel;
    },
  });

  // Styles propres au mode Odoo
  const style = document.createElement('style');
  style.textContent = `
    .odooBar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:center; }
    .odooBar a.btn { text-decoration:none; }
    .odooLabel { font-weight:800; font-size:20px; }
    .odooHint { font-size:16px; background:rgba(239,68,68,.25); padding:6px 12px; border-radius:12px; }
    .playerChip { display:flex; align-items:center; gap:8px; font-family:inherit; font-weight:800; font-size:18px;
      border:3px solid transparent; border-radius:999px; padding:4px 14px 4px 4px; cursor:pointer;
      background:rgba(255,255,255,.18); color:#fff; }
    .playerChip.on { background:#fff; color:#1e1b4b; border-color:var(--pc); box-shadow:0 0 0 4px rgba(255,255,255,.25); }
    .playerChip img, .playerChip .ini { width:34px; height:34px; border-radius:50%; object-fit:cover; }
    .playerChip .ini { display:flex; align-items:center; justify-content:center; background:var(--pc); color:#fff; }
    .seqSelect { margin-top:8px; width:100%; font-family:inherit; font-size:15px; border:0; border-radius:10px; padding:4px 8px; }
  `;
  document.head.appendChild(style);
})();
