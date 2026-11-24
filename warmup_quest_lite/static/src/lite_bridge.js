// Version importable (sans Python) : la page du jeu (/website/action/warmup) charge les fichiers statiques du module. Ce script remplace le contrôleur
// du module Python : il lit les données d'Odoo avec la session de l'utilisateur connecté (/web/dataset/call_kw), puis
// lance le pont (odoo_bridge.js) et le jeu (game.js) ; pendant la partie, il répond aux appels du jeu (window.WUQ_RPC).
// Les modèles sont les modèles manuels x_wuq_… du module (data/models.xml, fabriqué par dev/make_zip.py).
(function () {
  const me = document.currentScript;
  const version = (me && me.dataset.version) || String(Date.now());
  const loginUrl = () => '/web/login?redirect=' + encodeURIComponent(location.pathname + location.search);
  const WORLD_IDS = WORLDS.map((w) => w.id);
  const now = () => new Date().toISOString().slice(0, 19).replace('T', ' '); // (format des dates d'Odoo, en UTC)
  const json = (txt, def) => { try { const v = JSON.parse(txt || ''); return v == null ? def : v; } catch (e) { return def; } };

  async function call(model, method, args = [], kwargs = {}) {
    const res = await fetch(`/web/dataset/call_kw/${model}/${method}`, {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), params: { model, method, args, kwargs } }),
    });
    if (res.status === 404 || res.redirected) { location.href = loginUrl(); throw new Error('Connexion à Odoo nécessaire'); }
    const data = await res.json();
    if (data.error) {
      const name = data.error.data && data.error.data.name;
      if (data.error.code === 100 || /SessionExpired/.test(name || '')) { location.href = loginUrl(); }
      throw new Error((data.error.data && data.error.data.message) || data.error.message);
    }
    return data.result;
  }
  const searchRead = (model, domain, fields, extra = {}) => call(model, 'search_read', [domain], { fields, ...extra });

  // ---------------- Profil d'un enfant pour le jeu (comme _game_data du module Python)
  const PLAYER_FIELDS = ['x_name', 'x_color', 'x_birth_year', 'x_avatar_model', 'x_avatar_body', 'x_avatar_legs', 'x_avatar_hat',
    'x_avatar_glasses', 'x_avatar_back', 'x_easy_mode', 'x_stickers', 'x_companion'];
  let creatureCodes = new Map(); // id -> code
  function look(p) {
    const head = p.x_avatar_model || 'male-a', body = p.x_avatar_body || head, age = new Date().getFullYear() - (p.x_birth_year || 0);
    return { model: head, body, legs: p.x_avatar_legs || body, hat: p.x_avatar_hat || 'wizard', glasses: !!p.x_avatar_glasses,
      back: p.x_avatar_back || 'bag', easy: !!p.x_easy_mode || (!!p.x_birth_year && age > 0 && age <= 5) };
  }
  function gameData(p, catches, sessions) {
    const carnet = {}, best = {};
    for (const c of catches) if (c.x_player_id && c.x_player_id[0] === p.id && c.x_count) carnet[creatureCodes.get(c.x_creature_id[0])] = c.x_count;
    for (const s of sessions) {
      if (!s.x_player_id || s.x_player_id[0] !== p.id || !s.x_world) continue;
      const b = best[s.x_world] || { score: 0, stars: 0 };
      best[s.x_world] = { score: Math.max(b.score, s.x_score || 0), stars: Math.max(b.stars, s.x_stars || 0) };
    }
    const comp = json(p.x_companion, null);
    return { id: p.id, name: p.x_name, color: p.x_color || '#ff6b35', avatar: false, carnet, best,
      stickers: json(p.x_stickers, []).filter((x) => typeof x === 'string'), look: look(p),
      companion: comp && typeof comp === 'object' ? comp : null, paths: null };
  }
  async function playersData(domain) {
    const players = await searchRead('x_wuq_player', domain, PLAYER_FIELDS, { order: 'x_name' });
    const ids = players.map((p) => p.id);
    const [catches, sessions] = await Promise.all([
      searchRead('x_wuq_catch', [['x_player_id', 'in', ids], ['x_count', '>', 0]], ['x_player_id', 'x_creature_id', 'x_count']),
      searchRead('x_wuq_session', [['x_player_id', 'in', ids]], ['x_player_id', 'x_world', 'x_score', 'x_stars']),
    ]);
    return players.map((p) => gameData(p, catches, sessions));
  }
  const playerData = async (id) => (await playersData([['id', '=', id]]))[0];

  // ---------------- Séquences : étape Odoo -> étape du jeu (comme _to_game du module Python)
  const intN = (v, min = 1) => Math.max(min, Math.round(Number(v) || 0));
  function toGame(st) {
    const m = st.x_move, t = (d) => Number(st.x_duration) || d;
    if (!m) return null;
    if (m.startsWith('act_') && ACTS[m.slice(4)]) return { m: 'act', game: m.slice(4), n: intN(st.x_count) };
    if (m.startsWith('arena_') && ARENA[m.slice(6)]) return { m: 'arena', game: m.slice(6), n: m === 'arena_course' ? 1 : intN(st.x_count) };
    switch (m) {
      case 'run': return { m, t: t(6) };
      case 'shop': return { m, t: t(12) };
      case 'foam': return { m, t: t(16), n: intN(st.x_count) };
      case 'goal': case 'kick': case 'jump': case 'squat': case 'smash': return { m, n: intN(st.x_count) };
      case 'left': case 'right': return { m };
      case 'pose': return { m, pose: POSES[st.x_pose] ? st.x_pose : 'armsUp', hold: Number(st.x_hold) || 1.5 };
      case 'rest': return { m, t: t(3), text: st.x_text || 'Respire…' };
      case 'bubbles': return { m, t: t(10), n: intN(st.x_count) };
      case 'freeze': return { m, t: t(14) };
      case 'catch': return { m, t: t(10) };
      case 'tunnel': return { m, t: t(4) };
      case 'moles': return { m, t: t(12), n: intN(st.x_count) };
      case 'slice': return { m, t: t(14), n: intN(st.x_count) };
      case 'cubes': return { m, n: intN(st.x_count, 2), beat: Number(st.x_hold) || 1.4 };
      case 'dance': {
        const moves = (st.x_combo || '').split(',').map((x) => x.trim()).filter((x) => MIMIC_ICONS[x]);
        return moves.length >= 2 ? { m, moves, beat: Number(st.x_hold) || 1.8 } : null;
      }
      default: return null;
    }
  }
  async function sequencesData() {
    const seqs = await searchRead('x_wuq_sequence', [['x_world', 'in', WORLD_IDS]], ['x_name', 'x_world'], { order: 'x_world, x_sequence, id' });
    const steps = await searchRead('x_wuq_step', [['x_sequence_id', 'in', seqs.map((s) => s.id)]],
      ['x_sequence_id', 'x_move', 'x_count', 'x_duration', 'x_pose', 'x_hold', 'x_combo', 'x_text'], { order: 'x_sequence_id, x_sequence, id' });
    const out = {};
    for (const s of seqs) {
      const list = steps.filter((st) => st.x_sequence_id[0] === s.id).map(toGame).filter(Boolean);
      if (list.length) (out[s.x_world] = out[s.x_world] || []).push({ id: s.id, name: s.x_name, steps: list });
    }
    return out;
  }

  // ---------------- Appels du jeu (mêmes adresses que les routes du module Python)
  const COLOR = /^#[0-9a-fA-F]{6}$/;
  const AVATARS = new Set(), HATS = new Set(), BACKS = new Set(); // (valeurs permises : lues dans le modèle au chargement)
  function lookVals(l) {
    const v = {};
    if (!l || typeof l !== 'object') return v;
    for (const [k, f] of [['model', 'x_avatar_model'], ['body', 'x_avatar_body'], ['legs', 'x_avatar_legs']]) if (AVATARS.has(l[k])) v[f] = l[k];
    if (HATS.has(l.hat)) v.x_avatar_hat = l.hat;
    if (BACKS.has(l.back)) v.x_avatar_back = l.back;
    if ('easy' in l) v.x_easy_mode = !!l.easy;
    if ('glasses' in l) v.x_avatar_glasses = !!l.glasses;
    return v;
  }
  const companionVal = (c) => {
    if (c == null) return false;
    if (typeof c !== 'object' || ![...creatureCodes.values()].includes(c.id)) return undefined; // (inconnu : on ne touche à rien)
    return JSON.stringify({ id: c.id, xp: Math.max(0, Math.min(1000, Math.trunc(Number(c.xp) || 0))) });
  };
  const playerId = (v) => { const n = Math.trunc(Number(v)); if (!(n > 0)) throw new Error("Cet enfant n'existe plus."); return n; };
  const asInt = (v, lo = 0, hi = 1e6) => { const n = Math.trunc(Number(v) || 0); return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : 0)); };
  const voiceUrl = (v) => `/web/content/x_wuq_voice/${v.id}/x_audio?unique=${Date.parse((v.write_date || '').replace(' ', 'T') + 'Z') || 0}`;

  const handlers = {
    async '/warmup/api/player'({ name, color, look: l }) {
      name = String(name || '').trim().slice(0, 40);
      if (!name) throw new Error("Indique le prénom de l'enfant.");
      const id = await call('x_wuq_player', 'create', [{ x_name: name, ...(COLOR.test(color || '') ? { x_color: color } : {}), ...lookVals(l) }]);
      return playerData(Array.isArray(id) ? id[0] : id);
    },
    async '/warmup/api/player/look'({ player_id, look: l, color }) {
      const id = playerId(player_id), v = { ...lookVals(l), ...(COLOR.test(color || '') ? { x_color: color } : {}) };
      if (Object.keys(v).length) await call('x_wuq_player', 'write', [[id], v]);
      return playerData(id);
    },
    async '/warmup/api/player/companion'({ player_id, companion }) {
      const id = playerId(player_id), v = companionVal(companion);
      if (v !== undefined) await call('x_wuq_player', 'write', [[id], { x_companion: v }]);
      return json(v, null);
    },
    async '/warmup/api/session'(d) {
      const id = playerId(d.player_id);
      if (!WORLD_IDS.includes(d.world)) throw new Error('Monde inconnu.');
      const codes = (Array.isArray(d.catches) ? d.catches : []).filter((c) => typeof c === 'string').slice(0, 50);
      const modes = ['full', 'knees', 'upper'], speeds = SPEEDS.map((s) => s.id);
      await call('x_wuq_session', 'create', [{
        x_player_id: id, x_date: now(), x_world: d.world, x_sequence_id: asInt(d.sequence_id) || false,
        x_score: asInt(d.score), x_max_score: asInt(d.max_score), x_stars: asInt(d.stars, 0, 3), x_success: asInt(d.success, 0, 1000),
        x_steps: asInt(d.steps, 0, 1000), x_collected: asInt(d.collected), x_best_streak: asInt(d.best_streak, 0, 1000),
        x_duration: asInt(d.duration, 0, 24 * 3600), x_mode: modes.includes(d.mode) ? d.mode : false,
        x_speed: speeds.includes(d.speed) ? d.speed : false, x_creatures: codes.join(', '),
      }]);
      // Album : +1 pour chaque créature devenue amie
      const byCode = new Map([...creatureCodes].map(([cid, code]) => [code, cid]));
      for (const code of codes) {
        const cid = byCode.get(code); if (!cid) continue;
        const [line] = await searchRead('x_wuq_catch', [['x_player_id', '=', id], ['x_creature_id', '=', cid]], ['x_count'], { limit: 1 });
        if (line) await call('x_wuq_catch', 'write', [[line.id], { x_count: (line.x_count || 0) + 1, x_last_date: now() }]);
        else await call('x_wuq_catch', 'create', [{ x_player_id: id, x_creature_id: cid, x_count: 1, x_last_date: now() }]);
      }
      const v = {};
      if (Array.isArray(d.stickers)) v.x_stickers = JSON.stringify(d.stickers.filter((s) => typeof s === 'string' && s.length > 0 && s.length <= 8).slice(0, 300));
      if ('companion' in d) { const c = companionVal(d.companion); if (c !== undefined) v.x_companion = c; }
      if (Object.keys(v).length) await call('x_wuq_player', 'write', [[id], v]);
      const p = await playerData(id);
      return { carnet: p.carnet, best: p.best, stickers: p.stickers, companion: p.companion };
    },
    // Studio voix : phrases enregistrées par les parents, et messages perso
    async '/warmup/api/voice/list'() {
      return (await searchRead('x_wuq_voice', [['x_audio', '!=', false]], ['x_key', 'write_date'])).map((v) => ({ key: v.x_key, url: voiceUrl(v) }));
    },
    async '/warmup/api/voice/messages'() {
      const [list, withAudio] = await Promise.all([
        searchRead('x_wuq_voice', [['x_moment', '!=', false]], ['x_key', 'x_name', 'x_moment', 'x_player_id', 'write_date']),
        call('x_wuq_voice', 'search', [[['x_moment', '!=', false], ['x_audio', '!=', false]]]),
      ]);
      const has = new Set(withAudio);
      return list.map((v) => ({ key: v.x_key, url: has.has(v.id) ? voiceUrl(v) : null, text: v.x_name, moment: v.x_moment, player: v.x_player_id ? v.x_player_id[0] : null }));
    },
    async '/warmup/api/voice/save'({ key, text, data, mimetype, moment, player }) {
      if (!/^[0-9a-f]{8}$/.test(key || '')) throw new Error('Enregistrement refusé : clé invalide');
      if (![null, undefined, false, 'start', 'success', 'miss', 'end'].includes(moment)) throw new Error('Enregistrement refusé : moment inconnu');
      const v = { x_name: String(text || '').slice(0, 300) || key };
      if (data) {
        const bytes = Math.floor(String(data).length * 3 / 4);
        if (!(bytes > 1000 && bytes <= 600 * 1024)) throw new Error('Enregistrement refusé : trop court ou trop long');
        const mt = /^audio\/[\w.+-]+(;\s*codecs=[\w.]+)?$/.test(mimetype || '') ? mimetype.split(';')[0] : 'audio/webm';
        Object.assign(v, { x_audio: data, x_mimetype: mt });
      } else if (!moment) throw new Error('Enregistrement refusé : enregistrement manquant');
      if (moment) Object.assign(v, { x_moment: moment, x_player_id: asInt(player) || false });
      const [old] = await searchRead('x_wuq_voice', [['x_key', '=', key]], ['id'], { limit: 1 });
      let id = old && old.id;
      if (id) await call('x_wuq_voice', 'write', [[id], v]); else { id = await call('x_wuq_voice', 'create', [{ x_key: key, ...v }]); id = Array.isArray(id) ? id[0] : id; }
      const [rec] = await searchRead('x_wuq_voice', [['id', '=', id]], ['write_date']);
      return { key, url: data || old ? voiceUrl({ id, write_date: rec && rec.write_date }) : null };
    },
    async '/warmup/api/voice/delete'({ key }) {
      const ids = await call('x_wuq_voice', 'search', [[['x_key', '=', String(key || '')]]]);
      if (ids.length) await call('x_wuq_voice', 'unlink', [ids]);
      return true;
    },
  };
  window.WUQ_RPC = (url, params = {}) => {
    const h = handlers[url];
    return h ? h(params) : Promise.reject(new Error('Appel inconnu : ' + url));
  };

  // ---------------- Chargement : données d'Odoo, puis le pont et le jeu
  const load = (src) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = ko; document.body.appendChild(s); });
  (async () => {
    const fields = await call('x_wuq_player', 'fields_get', [['x_avatar_model', 'x_avatar_hat', 'x_avatar_back']], { attributes: ['selection'] });
    for (const [set, f] of [[AVATARS, 'x_avatar_model'], [HATS, 'x_avatar_hat'], [BACKS, 'x_avatar_back']]) for (const [v] of fields[f].selection) set.add(v);
    creatureCodes = new Map((await searchRead('x_wuq_creature', [], ['x_code'])).map((c) => [c.id, c.x_code]));
    const [players, sequences] = await Promise.all([playersData([]), sequencesData()]);
    window.WUQ_CONFIG = { players, sequences, backUrl: '/odoo/action-warmup_quest_lite.action_player' };
    await load(`../odoo_bridge.js?v=${version}`);
    await load(`js/game.js?v=${version}`);
  })().catch((e) => {
    console.error(e);
    // (sans Odoo : le jeu marche quand même, avec les données gardées dans ce navigateur)
    if (!document.querySelector('script[src*="js/game.js"]')) load(`js/game.js?v=${version}`);
  });
})();
