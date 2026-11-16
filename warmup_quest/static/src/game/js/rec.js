// Enregistreur de mouvements : pour régler le jeu sur les vrais gestes des enfants.
// - Enregistrer (case « Enregistrer les mouvements » dans les réglages) : pendant la partie, on garde seulement les
//   points du corps vus par la caméra (33 points par enfant, ~20 fois par seconde), jamais l'image. À la fin, un
//   fichier « wuq-mouvements-….json » est téléchargé.
// - Rejouer (mode test) : index.html?replay=<adresse du fichier> refait la même partie avec ces mouvements, sans
//   caméra, et affiche à la fin un rapport : pour chaque épreuve, ce qui a été reconnu et pourquoi.

const Rec = {
  on: false,        // enregistrement en cours
  playing: false,   // rejeu en cours
  data: null,       // enregistrement (en cours ou rejoué)
  t0: 0,
  last: null,       // dernier fichier prêt (pour le re-télécharger)

  wanted() { return typeof store === 'function' && store('rec') === true; },

  // Début : au calibrage (le rejeu repart du même instant, la partie se déroule alors pareil)
  begin(info) {
    this.t0 = performance.now();
    if (this.playing) { this.feedK = 0; this.reported = false; this.report = { steps: [], cur: null }; return; }
    if (!this.wanted()) { this.on = false; return; }
    this.on = true;
    this.data = { v: 1, app: 'warmup-quest', date: new Date().toISOString(), ...info, steps: null, frames: [], events: [], marks: [] };
  },
  t() { return Math.round(performance.now() - this.t0); },

  // Une image analysée : liste des squelettes (avant de les attribuer aux joueurs)
  frame(now, list) {
    if (!this.on) return;
    const r3 = (x) => Math.round(x * 1000) / 1000;
    this.data.frames.push({ t: Math.round(now - this.t0), p: list.map((lm) => lm.flatMap((q) => [r3(q.x), r3(q.y), r3(q.z || 0), Math.round((q.visibility ?? 1) * 100) / 100])) });
  },
  event(type, idx) {
    if (this.on) this.data.events.push({ t: this.t(), e: type, i: idx });
    if (this.playing && this.report && this.report.cur) { const ev = this.report.cur.ev; ev[type] = (ev[type] || 0) + 1; }
  },
  // Parcours de la partie (avec les carrefours tirés au hasard) : le rejeu reprend exactement le même
  steps(list) {
    if (this.playing && this.data.steps) return JSON.parse(JSON.stringify(this.data.steps));
    if (this.on) this.data.steps = JSON.parse(JSON.stringify(list));
    return list;
  },
  stepStart(i, s) {
    if (this.on) this.data.marks.push({ t: this.t(), k: 'step', i, m: s.m, pose: s.pose });
    if (this.playing && this.report.cur && this.report.cur.dur == null) this.report.cur.dur = this.t() - this.report.cur.t; // (repos : pas de note)
    if (this.playing) this.report.steps.push((this.report.cur = { i, m: s.m, pose: s.pose, t: this.t(), ev: {}, flags: {}, frames: 0, diag: {} }));
  },
  stepEnd(i, rating) {
    if (this.on) this.data.marks.push({ t: this.t(), k: 'end', i, rating });
    if (this.playing && this.report.cur && this.report.cur.i === i) { this.report.cur.rating = rating; this.report.cur.dur = this.t() - this.report.cur.t; }
  },

  // Fin (partie finie, ou abandonnée : result = null)
  end(result) {
    if (this.playing) { if (result) this.showReport(result); return; }
    if (!this.on) return;
    this.on = false;
    const d = this.data;
    if (!result && (!d.frames.length || d.frames[d.frames.length - 1].t < 20000)) return; // (abandon tout de suite : rien à garder)
    d.result = result; d.duration = this.t();
    this.last = d;
    this.download(d);
  },
  download(d = this.last) {
    if (!d) return;
    const stamp = d.date.slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1-');
    const blob = new Blob([JSON.stringify(d)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wuq-mouvements-${stamp}-${d.world}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },

  // ---------- Rejeu
  async load(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Enregistrement introuvable : ' + url);
    this.data = await r.json();
    this.playing = true;
    // (les squelettes sont reconstitués une fois pour toutes)
    for (const f of this.data.frames) f.lms = f.p.map((a) => { const lm = []; for (let k = 0; k < a.length; k += 4) lm.push({ x: a[k], y: a[k + 1], z: a[k + 2], visibility: a[k + 3] }); return lm; });
    return this.data;
  },
  // À chaque tour de jeu : on donne au suivi du corps toutes les images enregistrées jusqu'à maintenant
  feed(tracker, now) {
    if (!this.t0) return;
    const fr = this.data.frames, t = now - this.t0;
    while (this.feedK < fr.length && fr[this.feedK].t <= t) {
      const f = fr[this.feedK++];
      tracker.assign(f.lms.map((lm) => lm.map((q) => ({ ...q }))), this.t0 + f.t);
      this.observe(tracker);
    }
    // (enregistrement fini avant la partie, par exemple partie abandonnée : rapport quand même)
    if (this.feedK >= fr.length && !this.reported && t > (fr.length ? fr[fr.length - 1].t : 0) + 3000) {
      const g = typeof game !== 'undefined' && game;
      this.showReport({ score: g ? g.score : 0, max: g ? g.maxScore : 0, partial: true });
    }
  },
  // Ce que le jeu « voit » pendant l'épreuve en cours : poses reconnues, et les mesures qui décident
  observe(tracker) {
    const cur = this.report && this.report.cur;
    if (!cur) return;
    cur.frames++;
    tracker.bodies.forEach((b, i) => {
      const s = b.state, d = b.diag;
      for (const k of ['armsUp', 'airplane', 'star', 'starArms', 'legsApart', 'flamingo', 'squat']) if (s[k]) cur.flags[k] = (cur.flags[k] || 0) + 1;
      if (s.side !== 'center') cur.flags[s.side] = (cur.flags[s.side] || 0) + 1;
      if (!s.present) cur.flags.absent = (cur.flags.absent || 0) + 1;
      if (!d) return;
      const g = (cur.diag[i] = cur.diag[i] || {});
      const keep = (k, v, fn) => { if (v != null && isFinite(v)) g[k] = g[k] == null ? v : fn(g[k], v); };
      keep('sautMax', -d.dy, Math.max); keep('baisseMax', d.dy, Math.max);
      keep('brasEcartMax', d.spread, Math.max); keep('jambesEcartMax', d.legs, Math.max);
      keep('coteMax', Math.abs(d.dx), Math.max); keep('genouMin', Math.min(d.kneeL, d.kneeR), Math.min);
    });
  },
  showReport(result) {
    this.reported = true;
    const orig = {};
    for (const m of this.data.marks || []) if (m.k === 'end') orig[m.i] = m.rating;
    const pct = (n, all) => (all ? Math.round(n * 100 / all) + ' %' : '-');
    const lines = [`Rejeu : ${this.data.world} · ${this.data.players} joueur(s) · ${this.data.date.slice(0, 16)}`,
      `Score : ${result.score} / ${result.max} (enregistré : ${this.data.result ? this.data.result.score + ' / ' + this.data.result.max : '?'})`, ''];
    const out = { world: this.data.world, result, steps: [] };
    for (const st of this.report.steps) {
      const flags = Object.entries(st.flags).map(([k, n]) => `${k} ${pct(n, st.frames)}`).join(', ');
      const ev = Object.entries(st.ev).map(([k, n]) => `${k}×${n}`).join(' ');
      const diag = Object.entries(st.diag).map(([i, g]) => `J${+i + 1} ` + Object.entries(g).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' ')).join(' | ');
      const name = st.m + (st.pose ? ':' + st.pose : '');
      lines.push(`${String(st.i + 1).padStart(2)}. ${name.padEnd(16)} ${String(st.rating || '-').padEnd(8)} (avant : ${orig[st.i] || '-'})  ${((st.dur || 0) / 1000).toFixed(1)} s`);
      if (ev) lines.push('     gestes : ' + ev);
      if (flags) lines.push('     vu : ' + flags);
      if (diag) lines.push('     mesures : ' + diag);
      out.steps.push({ ...st, orig: orig[st.i] });
    }
    let el = document.getElementById('replayReport');
    if (!el) { el = document.createElement('pre'); el.id = 'replayReport'; document.body.appendChild(el); }
    el.textContent = lines.join('\n');
    el.dataset.json = JSON.stringify(out);
    console.log(el.textContent);
  },
};
