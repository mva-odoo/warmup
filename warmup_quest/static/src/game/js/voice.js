// Voix du jeu : chaque phrase est découpée en morceaux (une phrase = un morceau). Pour chaque morceau on joue,
// dans l'ordre : la voix enregistrée par un parent (studio), sinon la voix naturelle livrée avec le jeu (Piper),
// sinon la voix de synthèse du navigateur. Les prénoms et les phrases inconnues restent en voix de synthèse.

const VOICE_BASE = (document.currentScript && document.currentScript.src)
  ? document.currentScript.src.replace(/js\/[^/]*$/, 'voice/') : 'voice/';

const Voice = {
  pack: null,          // morceaux de la voix naturelle (clés)
  mine: new Map(),     // morceaux enregistrés par les parents : clé -> adresse du son
  msgs: [],            // messages perso des parents : { key, text, moment, player, url }
  phrases: null,       // liste des morceaux connus (pour le studio)

  // Clé d'un morceau : empreinte du texte (même calcul dans l'outil qui fabrique la voix)
  norm(s) { return String(s).replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim(); },
  key(s) {
    let h = 0x811c9dc5;
    for (const ch of this.norm(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  },
  split(text) {
    return (this.norm(text).match(/[^.!?…]+(?:[.!?…]+["»)]*|$)/g) || []).map((s) => s.trim()).filter(Boolean);
  },
  packOn() { return typeof store !== 'function' || store('voicePack') !== false; },

  async init() {
    try {
      const r = await fetch(VOICE_BASE + 'piper/keys.json');
      if (r.ok) this.pack = new Set(await r.json());
    } catch (e) { console.warn('Voix naturelle indisponible', e); }
    await this.reloadMine();
    await this.reloadMessages();
  },
  async reloadMine() {
    // (au plus 3 s d'attente : si le serveur est lent, on garde ce qu'on avait)
    try { this.mine = (await Promise.race([WUQStore.voices(), new Promise((ok) => setTimeout(() => ok(null), 3000))])) || this.mine; } catch (e) { console.warn(e); }
  },
  async reloadMessages() {
    if (!WUQStore.messages) return;
    try { this.msgs = (await Promise.race([WUQStore.messages(), new Promise((ok) => setTimeout(() => ok(null), 3000))])) || this.msgs; } catch (e) { console.warn(e); }
  },
  // Message perso pour ce moment et ces enfants (null s'il n'y en a pas) ; jamais deux fois le même à la suite
  pickMessage(moment, team = []) {
    const ok = this.msgs.filter((m) => m.moment === moment && (!m.player || team.some((p) => (p.id != null && p.id === m.player) || p.name === m.player)));
    if (!ok.length) return null;
    const fresh = ok.filter((m) => m.key !== this.lastMsg), list = fresh.length ? fresh : ok;
    const m = list[Math.floor(Math.random() * list.length)];
    this.lastMsg = m.key;
    return m;
  },
  sayMessage(m, onend) { Audio8.say(m.text, { clip: m.url, onend }); },
  newKey() { return Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join(''); },
  clip(sentence) {
    const k = this.key(sentence);
    if (this.mine.has(k)) return { url: this.mine.get(k), mine: true };
    if (this.packOn() && this.pack && this.pack.has(k)) return { url: VOICE_BASE + 'piper/' + k + '.ogg', mine: false };
    return null;
  },
  // [{ text, url }] : url null = voix de synthèse pour ce morceau
  parts(text) { return this.split(text).map((t) => ({ text: t, url: (this.clip(t) || {}).url || null })); },

  // ---------- Studio (réglages parents) : enregistrer sa voix à la place de celle du jeu
  async loadPhrases() {
    if (this.phrases) return this.phrases;
    try { this.phrases = await (await fetch(VOICE_BASE + 'phrases.json')).json(); } catch (e) { this.phrases = []; }
    return this.phrases;
  },
  // Phrases avec les prénoms des enfants (« Bravo Léo ! », « À toi Léo ! »)
  namePhrases() {
    const names = [...new Set((WUQStore.allPlayers ? WUQStore.allPlayers() : WUQStore.players()).map((p) => p.name).filter(Boolean))];
    const out = [];
    for (const n of names) out.push(`Bravo ${n} !`, `À toi ${n} !`);
    if (names.length >= 2) out.push(`Bravo ${names[0]} et ${names[1]} !`, `Bravo ${names[1]} et ${names[0]} !`);
    return out.map((t) => ({ k: this.key(t), t, c: 'names' }));
  },

  async openStudio() {
    if (document.getElementById('studio')) return;
    const list = await this.loadPhrases();
    await this.reloadMine();
    await this.reloadMessages();
    const TABS = [['msg', '💌 Mes messages'], ['ess', '⭐ Les plus dites'], ['bravo', '👏 Bravos'], ['consigne', '🏃 Consignes'], ['tuto', '🎓 École'], ['names', '🧒 Prénoms'], ['mine', '🎙️ Ma voix'], ['all', '📋 Toutes']];
    const el = document.createElement('div');
    el.id = 'studio'; el.className = 'studioBg';
    el.innerHTML = `<div class="studio">
      <div class="stHead"><h2>🎙️ Studio voix</h2><button class="btn ghost small stClose">✖</button></div>
      <p class="stInfo">Enregistre ta voix pour remplacer celle du jeu : les enfants adorent ! Appuie sur ⏺, lis la phrase, puis ⏹.
        Le reste garde la voix du jeu. <label class="stPack"><input type="checkbox"> Voix naturelle du jeu</label></p>
      <div class="stTabs">${TABS.map(([id, l]) => `<button class="stTab" data-tab="${id}">${l}</button>`).join('')}</div>
      <input class="stSearch hidden" type="search" placeholder="Chercher une phrase…">
      <div class="stList"></div><p class="stCount"></p></div>`;
    document.body.appendChild(el);
    const listEl = el.querySelector('.stList'), search = el.querySelector('.stSearch'), pack = el.querySelector('.stPack input');
    pack.checked = this.packOn();
    pack.onchange = () => { store('voicePack', pack.checked); };
    let tab = 'msg', rec = null;
    const stopRec = () => { if (rec && rec.mr.state !== 'inactive') rec.mr.stop(); };
    const close = () => { stopRec(); el.remove(); };
    el.querySelector('.stClose').onclick = close;
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    const rows = () => {
      const all = [...list, ...this.namePhrases()];
      const q = search.value.trim().toLowerCase();
      if (tab === 'all') return all.filter((p) => !q || p.t.toLowerCase().includes(q)).slice(0, 200);
      if (tab === 'mine') return all.filter((p) => this.mine.has(p.k));
      if (tab === 'ess') return all.filter((p) => p.e);
      return all.filter((p) => p.c === tab);
    };
    const paint = () => {
      el.querySelectorAll('.stTab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
      search.classList.toggle('hidden', tab !== 'all');
      if (tab === 'msg') return this.paintMessages(listEl, paint, (r) => (rec = r));
      const rs = rows();
      listEl.innerHTML = rs.length ? '' : `<p class="stEmpty">${tab === 'mine' ? 'Pas encore de phrase avec ta voix.' : tab === 'names' ? 'Ajoute les enfants dans Odoo pour enregistrer leurs prénoms.' : 'Rien ici.'}</p>`;
      for (const p of rs) {
        const row = document.createElement('div');
        row.className = 'stRow' + (this.mine.has(p.k) ? ' mine' : '');
        row.innerHTML = `<span class="stText">${p.t.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</span>
          <button class="btn small ghost stPlay" title="Écouter">▶</button><button class="btn small stRec" title="Enregistrer ma voix">⏺</button>
          <button class="btn small ghost stDel" title="Reprendre la voix du jeu">🗑</button>`;
        row.querySelector('.stPlay').onclick = () => Audio8.say(p.t);
        row.querySelector('.stDel').onclick = async () => { await WUQStore.deleteVoice(p.k); await this.reloadMine(); paint(); };
        row.querySelector('.stRec').onclick = (e) => this.record(p, e.currentTarget, (r) => (rec = r), paint);
        listEl.appendChild(row);
      }
      el.querySelector('.stCount').textContent = `🎙️ ${this.mine.size} phrase${this.mine.size > 1 ? 's' : ''} avec ta voix`;
    };
    el.querySelectorAll('.stTab').forEach((b) => (b.onclick = () => { stopRec(); tab = b.dataset.tab; paint(); }));
    search.oninput = paint;
    paint();
  },

  // Onglet « Mes messages » : écrire un petit mot, choisir quand le jeu le dit et pour qui, l'enregistrer (ou pas)
  paintMessages(listEl, repaint, setRec) {
    const MOMENTS = [['start', '🚀 Au début'], ['success', '👏 Après une réussite'], ['miss', '💪 Quand c\'est raté'], ['end', '🏁 À la fin']];
    const kids = (WUQStore.allPlayers ? WUQStore.allPlayers() : WUQStore.players()).filter((p) => p.name);
    const esc = (s) => String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' }[c]));
    const kidName = (id) => { const k = kids.find((p) => (p.id ?? p.name) === id); return k ? k.name : 'tous'; };
    listEl.innerHTML = `<div class="msgForm">
        <textarea class="msgText" maxlength="200" rows="2" placeholder="Ton petit message… (ex. : Allez mon champion, papa est fier de toi !)"></textarea>
        <div class="msgOpts"><select class="msgMoment">${MOMENTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          <select class="msgKid"><option value="">👨‍👩‍👧 Pour tous</option>${kids.map((p) => `<option value="${esc(p.id ?? p.name)}">🧒 ${esc(p.name)}</option>`).join('')}</select>
          <button class="btn small stRec msgRec" title="Enregistrer ma voix">⏺ Avec ma voix</button>
          <button class="btn small msgAdd">➕ Sans enregistrer</button></div>
        <p class="msgHint">Avec ta voix, c'est encore mieux ! Sans enregistrement, le jeu le lit avec sa voix.</p></div>
      <div class="msgList"></div>`;
    const text = listEl.querySelector('.msgText'), moment = listEl.querySelector('.msgMoment'), kid = listEl.querySelector('.msgKid');
    const meta = () => { const v = kid.value; const k = kids.find((p) => String(p.id ?? p.name) === v); return { moment: moment.value, player: v ? (k && k.id != null ? k.id : v) : null }; };
    const need = () => { if (text.value.trim()) return true; text.focus(); text.classList.add('shake'); setTimeout(() => text.classList.remove('shake'), 500); return false; };
    const after = async () => { await this.reloadMessages(); repaint(); };
    listEl.querySelector('.msgAdd').onclick = async () => { if (!need()) return; await WUQStore.saveVoice(this.newKey(), text.value.trim(), null, meta()); after(); };
    listEl.querySelector('.msgRec').onclick = (e) => {
      if (!e.currentTarget.classList.contains('recording') && !need()) return;
      this.record({ k: this.newKey(), t: text.value.trim(), meta: meta() }, e.currentTarget, setRec, after);
    };
    const box = listEl.querySelector('.msgList');
    if (!this.msgs.length) box.innerHTML = '<p class="stEmpty">Pas encore de message. Écris-en un : le jeu le dira au bon moment !</p>';
    for (const m of this.msgs) {
      const row = document.createElement('div');
      row.className = 'stRow' + (m.url ? ' mine' : '');
      row.innerHTML = `<span class="stText">${esc(m.text)}<small class="msgWhen">${(MOMENTS.find(([v]) => v === m.moment) || [0, ''])[1]} · ${esc(kidName(m.player))}</small></span>
        <button class="btn small stPlay" title="Écouter">▶</button><button class="btn small stDel" style="visibility:visible" title="Supprimer">🗑</button>`;
      row.querySelector('.stPlay').onclick = () => this.sayMessage(m);
      row.querySelector('.stDel').onclick = async () => { await WUQStore.deleteVoice(m.key); after(); };
      box.appendChild(row);
    }
    const n = this.msgs.length;
    listEl.parentElement.querySelector('.stCount').textContent = `💌 ${n} message${n > 1 ? 's' : ''} perso`;
  },

  // Enregistre une phrase au micro (10 s au plus), la garde, et la fait écouter
  async record(p, btn, setRec, done) {
    if (btn.classList.contains('recording')) { btn._stop && btn._stop(); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch (e) {
      alert('Le micro ne marche pas (autorise-le dans le navigateur ; sur un serveur, il faut HTTPS).'); return;
    }
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'].find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    const mr = new MediaRecorder(stream, type ? { mimeType: type } : {});
    const chunks = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stop = () => { clearTimeout(timer); if (mr.state !== 'inactive') mr.stop(); };
    btn._stop = stop;
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      btn.classList.remove('recording'); btn.textContent = btn._label || '⏺';
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
      if (blob.size < 1500) return done();
      await WUQStore.saveVoice(p.k, p.t, blob, p.meta);
      await this.reloadMine();
      await done();
      if (p.meta) { await this.reloadMessages(); const m = this.msgs.find((x) => x.key === p.k); if (m) this.sayMessage(m); } else Audio8.say(p.t);
    };
    setRec({ mr });
    btn._label = btn._label || btn.textContent;
    btn.classList.add('recording'); btn.textContent = '⏹ Stop';
    mr.start();
    const timer = setTimeout(stop, 10000);
  },
};
