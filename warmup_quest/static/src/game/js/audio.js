// Effets sonores (WebAudio) et voix (synthèse vocale en français).

const Audio8 = (() => {
  let ctx = null;
  let lastSaid = '', lastSaidAt = 0;
  const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

  // ---------- Table de mixage : bus musique / bruitages -> compresseur -> sortie, avec une réverbération douce
  let comp, musicBus, sfxBus, revIn, noiseBuf, musicVol = 0.5;
  function graph() {
    const c = ac();
    if (comp) return c;
    comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    const out = c.createGain(); out.gain.value = 0.95;
    comp.connect(out).connect(c.destination);
    // Réverbération : réponse impulsionnelle fabriquée (bruit qui s'éteint), comme une petite salle
    const len = Math.floor(c.sampleRate * 1.6), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    const rev = c.createConvolver(); rev.buffer = ir;
    revIn = c.createGain(); revIn.gain.value = 0.22;
    revIn.connect(rev).connect(comp);
    musicBus = c.createGain(); musicBus.gain.value = musicVol; musicBus.connect(comp);
    sfxBus = c.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(comp);
    const mSend = c.createGain(); mSend.gain.value = 0.6; musicBus.connect(mSend).connect(revIn);
    const sSend = c.createGain(); sSend.gain.value = 0.4; sfxBus.connect(sSend).connect(revIn);
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return c;
  }
  const env = (g, t, a, peak, dec, sus = 0.0001) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + dec);
  };
  const osc = (type, f, t, stop, detune = 0) => {
    const o = ac().createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    o.start(t); o.stop(stop); return o;
  };

  // ---------- Instruments (synthèse) : chacun joue une note à l'instant t
  const INST = {
    // Corde pincée : deux dents de scie légèrement désaccordées, filtre qui se referme
    pluck(f, t, d, v, bus) {
      const c = ac(), g = c.createGain(), lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(9000, f * 8), t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), t + d);
      lp.Q.value = 2;
      for (const dt of [-8, 8]) osc('sawtooth', f, t, t + d + 0.1, dt).connect(lp);
      env(g, t, 0.004, v, d);
      lp.connect(g).connect(bus);
    },
    // Cloche douce (synthèse FM)
    bell(f, t, d, v, bus) {
      const c = ac(), g = c.createGain(), mg = c.createGain();
      const car = osc('sine', f, t, t + d + 0.1), mod = osc('sine', f * 3.5, t, t + d + 0.1);
      mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.1, t + d);
      mod.connect(mg).connect(car.frequency);
      env(g, t, 0.003, v, d);
      car.connect(g).connect(bus);
    },
    // Marimba : bois tapé, très court
    marimba(f, t, d, v, bus) {
      const c = ac(), g = c.createGain(), g2 = c.createGain();
      osc('sine', f, t, t + 0.6).connect(g); osc('sine', f * 4, t, t + 0.1).connect(g2);
      env(g, t, 0.002, v, Math.min(0.5, d + 0.2)); env(g2, t, 0.001, v * 0.35, 0.05);
      g.connect(bus); g2.connect(bus);
    },
    // Basse ronde
    bass(f, t, d, v, bus) {
      const c = ac(), g = c.createGain(), lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 2, t + d);
      osc('triangle', f, t, t + d + 0.05).connect(lp); osc('sine', f / 2, t, t + d + 0.05).connect(lp);
      env(g, t, 0.01, v, d, v * 0.3);
      g.gain.setValueAtTime(v * 0.3, t + d); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
      lp.connect(g).connect(bus);
    },
    // Nappe : trois dents de scie, attaque lente (accords)
    pad(f, t, d, v, bus) {
      const c = ac(), g = c.createGain(), lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = Math.min(2400, f * 4);
      for (const dt of [-12, 0, 12]) osc('sawtooth', f, t, t + d + 0.6, dt).connect(lp);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.4, d / 3));
      g.gain.setValueAtTime(v, t + d); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5);
      lp.connect(g).connect(bus);
    },
    // Batterie
    kick(f, t, d, v, bus) {
      const c = ac(), g = c.createGain(), o = osc('sine', 150, t, t + 0.4);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
      env(g, t, 0.002, v, 0.32); o.connect(g).connect(bus);
    },
    noise(f, t, d, v, bus, type = 'highpass') {
      const c = ac(), src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noiseBuf; flt.type = type; flt.frequency.value = f; flt.Q.value = type === 'bandpass' ? 1.2 : 0.7;
      env(g, t, 0.002, v, d);
      src.connect(flt).connect(g).connect(bus); src.start(t, Math.random() * 0.5); src.stop(t + d + 0.05);
    },
    snare(f, t, d, v, bus) { INST.noise(1800, t, 0.16, v, bus, 'bandpass'); INST.marimba(190, t, 0.05, v * 0.5, bus); },
    hat(f, t, d, v, bus) { INST.noise(7500, t, 0.04, v, bus); },
    taiko(f, t, d, v, bus) {
      const c = ac(), g = c.createGain(), o = osc('sine', 110, t, t + 0.6);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.3);
      env(g, t, 0.003, v, 0.5); o.connect(g).connect(bus); INST.noise(400, t, 0.08, v * 0.4, bus, 'lowpass');
    },
  };
  const play = (name, f, when, d, v, bus) => { graph(); INST[name](f, ac().currentTime + when, d, v, bus || sfxBus); };
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // Ancienne petite note (gardée pour quelques sons très courts)
  function tone(freq, dur, type = 'square', vol = 0.1, when = 0, slideTo = null) {
    const c = graph(), t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }

  // ---------- Musiques : petits morceaux originaux générés à partir d'une « graine » (un par monde)
  // Chaque style : tempo, gamme, suite d'accords, instruments et rythme de batterie (16 doubles-croches par mesure)
  const STYLES = {
    adventure: { bpm: 112, key: 60, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], lead: 'pluck', arp: 'marimba', pad: true,
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' },
    fun: { bpm: 124, key: 62, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]], lead: 'marimba', arp: 'bell',
      kick: 'x.....x.x.......', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.x.' },
    dance: { bpm: 120, key: 57, scale: [0, 3, 5, 7, 10], chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], lead: 'pluck', arp: 'pluck', pad: true, offBass: true,
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' },
    karate: { bpm: 92, key: 57, scale: [0, 2, 3, 7, 8], chords: [[0, 3, 7], [0, 3, 7], [8, 12, 15], [7, 10, 14]], lead: 'bell', arp: 'pluck', taiko: 'x..x..x.x...x.x.' },
    space: { bpm: 90, key: 64, scale: [0, 2, 4, 7, 11], chords: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], lead: 'bell', arp: 'bell', pad: true, slow: true,
      kick: 'x.......x.......', hat: '....x.......x...' },
    water: { bpm: 84, key: 62, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], lead: 'bell', arp: 'marimba', pad: true, slow: true,
      kick: 'x.........x.....' },
    candy: { bpm: 132, key: 65, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], lead: 'marimba', arp: 'bell',
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxx.xxx.xxx.xxx.' },
  };
  const WORLD_STYLE = { disco: 'dance', rythmo: 'dance', dojo: 'karate', verger: 'karate', espace: 'space', ocean: 'water', bonbons: 'candy', island: 'fun', jardin3d: 'fun' };

  function compose(style, seed) {
    let x = 0; for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) % 2147483647;
    const rnd = () => ((x = (x * 16807 + 11) % 2147483647) / 2147483647);
    // Mélodie de 4 mesures (forme A A' B A) : notes de la gamme, rythme vivant, finit sur la tonique
    const phrase = () => {
      const out = []; let deg = 2;
      for (let i = 0; i < 16; i++) {
        const on = i % 4 === 0 || rnd() < (style.slow ? 0.25 : 0.45);
        if (!on) { out.push(null); continue; }
        deg = Math.max(0, Math.min(9, deg + Math.round((rnd() - 0.5) * 4)));
        out.push(deg);
      }
      return out;
    };
    const a = phrase(), b = phrase(), a2 = a.map((n, i) => (i > 11 && n != null ? Math.max(0, n - 1) : n));
    const mel = [a, a2, b, a].map((p, k) => (k === 3 ? [...p.slice(0, 12), 0, null, null, null] : p));
    return { style, mel };
  }

  let song = null, songStyle = null, nextT = 0, stepI = 0, sched = 0, themeMuted = false, fg = null, enabled = true;
  try { enabled = localStorage.getItem('wuq_music') !== 'false'; } catch {}
  function startSong(styleName, seed) {
    graph();
    const st = STYLES[styleName] || STYLES.adventure;
    song = compose(st, seed + styleName); songStyle = styleName;
    nextT = ac().currentTime + 0.08; stepI = 0;
    if (!sched) sched = setInterval(() => tick(), 25);
  }
  function stopSong() { song = null; songStyle = null; clearInterval(sched); sched = 0; }
  function tick(horizon = null) {
    if (!song || !enabled) return;
    const st = song.style, c = ac(), s16 = 60 / st.bpm / 4;
    while (nextT < (horizon ?? c.currentTime + 0.15)) {
      const i = stepI % 16, bar = Math.floor(stepI / 16) % 4, t = nextT - c.currentTime;
      const ch = st.chords[bar], root = st.key + ch[0];
      const B = musicBus;
      const at = (name, f, d, v) => INST[name](f, nextT, d, v, B);
      if (st.kick && st.kick[i] === 'x') at('kick', 0, 0, 0.55);
      if (st.snare && st.snare[i] === 'x') at('snare', 0, 0, 0.22);
      if (st.hat && st.hat[i] === 'x') at('hat', 0, 0, 0.08);
      if (st.taiko && st.taiko[i] === 'x') at('taiko', 0, 0, i % 8 === 0 ? 0.6 : 0.35);
      // Basse : la fondamentale de l'accord (sur les contretemps en style danse)
      if (st.offBass ? i % 4 === 2 : i % 8 === 0) at('bass', hz(root - 24), s16 * (st.offBass ? 1.5 : 3.5), 0.32);
      // Nappe d'accord au début de chaque mesure
      if (st.pad && i === 0) for (const n of ch) at('pad', hz(st.key + n - 12), s16 * 15, 0.035);
      // Arpège léger
      if (i % 2 === 1 && !st.slow || st.slow && i % 4 === 2) at(st.arp, hz(st.key + ch[(i >> 1) % ch.length] + 12), s16 * 1.5, 0.05);
      // Mélodie
      const deg = song.mel[bar][i];
      if (deg != null) {
        const n = st.key + st.scale[deg % 5] + 12 * Math.floor(deg / 5) + 12;
        at(st.lead, hz(n), s16 * (st.slow ? 3.5 : 1.8), st.lead === 'pluck' ? 0.09 : 0.12);
      }
      nextT += s16; stepI++;
      if (t < -0.2 && horizon == null) nextT = c.currentTime + 0.05; // (onglet en veille : on reprend sans rattraper)
    }
  }
  // Musique jouée : celle de l'épreuve (danse, karaté…) sinon celle du monde
  let theme = null;
  function refresh() {
    const want = fg ? { style: fg, seed: 'fg' } : theme && !themeMuted ? theme : null;
    if (!want || !enabled) { stopSong(); return; }
    if (songStyle !== want.style || !song) startSong(want.style, want.seed);
  }

  // --- Voix : on cherche la plus naturelle disponible.
  // Edge propose des voix « Natural » (neuronales, très humaines) ; Chrome a « Google français ».
  const hasTTS = 'speechSynthesis' in window;
  let voice = null;
  let voices = [];
  const listeners = [];
  const quality = (v) => {
    let q = 0;
    if (/natural|neural/i.test(v.name)) q += 10;
    if (/online/i.test(v.name)) q += 5;
    if (/google/i.test(v.name)) q += 4;
    if (v.lang === 'fr-FR') q += 1;
    return q;
  };
  function loadVoices() {
    if (!hasTTS) return;
    voices = speechSynthesis.getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith('fr'))
      .sort((a, b) => quality(b) - quality(a));
    let saved = null;
    try { saved = localStorage.getItem('wuq_voice'); } catch {}
    voice = voices.find((v) => v.name === saved) || voices[0] || null;
    listeners.forEach((f) => f());
  }
  if (hasTTS) {
    speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    loadVoices();
  }

  return {
    unlock() { ac().resume(); },
    say(text) {
      if (!hasTTS || !text) return;
      const t = performance.now();
      if (text === lastSaid && t - lastSaidAt < 4000) return; // pas deux fois la même phrase coup sur coup
      lastSaid = text; lastSaidAt = t;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      if (voice) u.voice = voice;
      const natural = voice && quality(voice) >= 4;
      // Les voix naturelles sonnent mieux sans modification ; les autres un peu plus enjouées
      u.rate = natural ? 1.0 : 1.05;
      u.pitch = natural ? 1.05 : 1.15;
      // La musique se fait plus discrète pendant que la voix parle
      const duck = (v) => { if (musicBus) musicBus.gain.setTargetAtTime(v, ac().currentTime, 0.12); };
      u.onstart = () => duck(musicVol * 0.35); u.onend = u.onerror = () => duck(musicVol);
      speechSynthesis.speak(u);
    },
    voices: () => voices,
    voiceName: () => (voice ? voice.name : ''),
    isNatural: () => !!voice && quality(voice) >= 4,
    setVoice(name) {
      voice = voices.find((v) => v.name === name) || voice;
      try { localStorage.setItem('wuq_voice', name); } catch {}
    },
    onVoices(f) { listeners.push(f); },
    // Bruitages (instruments + réverbération)
    good() { play('bell', hz(84), 0, 0.3, 0.16); play('bell', hz(91), 0.08, 0.4, 0.14); },
    perfect() { [72, 76, 79, 84, 88].forEach((n, i) => play('bell', hz(n + 12), i * 0.06, 0.45, 0.13)); play('noise', 6000, 0.25, 0.4, 0.05); },
    coin() { play('bell', hz(96), 0, 0.15, 0.1); play('bell', hz(103), 0.05, 0.3, 0.1); },
    miss() { play('pluck', hz(60), 0, 0.25, 0.12); play('pluck', hz(55), 0.12, 0.35, 0.1); },
    tick() { play('marimba', hz(84), 0, 0.12, 0.3); },
    go() { play('bell', hz(91), 0, 0.5, 0.2); play('kick', 0, 0, 0, 0.3); },
    soft() { play('marimba', hz(72), 0, 0.2, 0.22); play('marimba', hz(76), 0.1, 0.25, 0.2); },
    // Petit cri propre à chaque créature (hauteur tirée de son nom) ; plus joyeux quand elle devient amie
    cry(id, happy = false) {
      let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 997;
      const base = 380 + (h % 9) * 70;
      tone(base, 0.12, 'triangle', 0.1, 0, base * 1.5);
      tone(base * 1.25, 0.14, 'sine', 0.08, 0.13, base * (happy ? 2.2 : 0.9));
      if (happy) tone(base * 1.6, 0.18, 'triangle', 0.07, 0.3, base * 2.4);
    },
    boing() { tone(300, 0.18, 'sine', 0.14, 0, 700); tone(500, 0.12, 'triangle', 0.06, 0.08, 250); play('marimba', hz(67), 0, 0.2, 0.15); },
    // Arrivée d'une nouvelle consigne : souffle qui monte
    whoosh() {
      graph(); const c = ac(), t = c.currentTime, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.3);
      env(g, t, 0.12, 0.12, 0.25); src.connect(f).connect(g).connect(sfxBus); src.start(t); src.stop(t + 0.45);
    },
    // Coup de sabre (fruit coupé) et cube tapé
    slash() {
      graph(); const c = ac(), t = c.currentTime, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 4; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.15);
      env(g, t, 0.005, 0.3, 0.15); src.connect(f).connect(g).connect(sfxBus); src.start(t); src.stop(t + 0.25);
      play('marimba', hz(79), 0.03, 0.15, 0.18);
    },
    hit() { play('kick', 0, 0, 0, 0.45); play('bell', hz(88), 0.01, 0.25, 0.12); },
    pop() { tone(900, 0.06, 'sine', 0.12, 0, 1800); play('bell', hz(96), 0.02, 0.12, 0.05); },
    // Musique de fond du monde (world = id du monde ; null = silence)
    theme(world) { theme = world ? { style: WORLD_STYLE[world] || 'adventure', seed: world } : null; refresh(); },
    // La musique de fond se tait (statues musicales) ou reprend
    themeMute(on) { themeMuted = on; refresh(); },
    // Musique d'une épreuve (danse, karaté, statues, cubes) ; music(false) : retour à la musique du monde
    music(on, style = 'fun') { fg = on ? ({ dance: 'dance', karate: 'karate', fun: 'fun' }[style] || style) : null; refresh(); },
    musicOn: () => !!fg,
    debug: () => ({ state: ctx && ctx.state, steps: stepI, style: songStyle }), // (mode test)
    // (mode test) calcule 6 s d'une musique sans haut-parleur et renvoie son volume moyen / maximum
    async render(style, world = 'test') {
      const saved = { ctx, comp, musicBus, sfxBus, revIn, noiseBuf, song, songStyle, nextT, stepI };
      ctx = new OfflineAudioContext(2, 44100 * 6, 44100); comp = null; graph();
      song = compose(STYLES[style], world + style); nextT = 0.05; stepI = 0;
      tick(5.8);
      const buf = await ctx.startRendering(), d = buf.getChannelData(0);
      let sum = 0, peak = 0; for (let i = 0; i < d.length; i++) { sum += d[i] * d[i]; peak = Math.max(peak, Math.abs(d[i])); }
      ({ ctx, comp, musicBus, sfxBus, revIn, noiseBuf, song, songStyle, nextT, stepI } = saved);
      return { style, rms: +Math.sqrt(sum / d.length).toFixed(3), peak: +peak.toFixed(2) };
    },
    musicEnabled: () => enabled,
    setMusicEnabled(on) { enabled = on; try { localStorage.setItem('wuq_music', on ? 'true' : 'false'); } catch {} refresh(); },
    win() {
      [60, 64, 67, 72, 67, 72, 76, 84].forEach((n, i) => { play('bell', hz(n + 12), i * 0.11, 0.5, 0.12); play('pluck', hz(n), i * 0.11, 0.3, 0.06); });
      [0, 4, 7].forEach((n) => play('pad', hz(60 + n), 0.9, 1.2, 0.05));
      play('kick', 0, 0.88, 0, 0.4);
    },
  };
})();
