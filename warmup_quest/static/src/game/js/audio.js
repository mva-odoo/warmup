// Effets sonores (WebAudio) et voix (synthèse vocale en français).

const Audio8 = (() => {
  let ctx = null;
  let musicTimer = 0;
  const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

  function tone(freq, dur, type = 'square', vol = 0.1, when = 0, slideTo = null) {
    const c = ac();
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
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
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      if (voice) u.voice = voice;
      const natural = voice && quality(voice) >= 4;
      // Les voix naturelles sonnent mieux sans modification ; les autres un peu plus enjouées
      u.rate = natural ? 1.0 : 1.05;
      u.pitch = natural ? 1.05 : 1.15;
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
    good() { tone(660, 0.1, 'square', 0.08); tone(990, 0.15, 'square', 0.08, 0.08); },
    perfect() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.07, i * 0.07)); },
    coin() { tone(1250, 0.05, 'square', 0.06); tone(1750, 0.12, 'square', 0.06, 0.05); },
    miss() { tone(320, 0.3, 'sawtooth', 0.06, 0, 140); },
    tick() { tone(880, 0.1, 'sine', 0.15); },
    go() { tone(1320, 0.35, 'sine', 0.18); },
    soft() { tone(520, 0.12, 'sine', 0.08); tone(660, 0.16, 'sine', 0.07, 0.1); },
    boing() { tone(300, 0.18, 'sine', 0.14, 0, 700); tone(500, 0.12, 'triangle', 0.06, 0.08, 250); },
    pop() { tone(900, 0.06, 'sine', 0.12, 0, 1800); tone(1400, 0.05, 'triangle', 0.05, 0.04); },
    // Musiques en boucle (mélodies originales) : 'fun' (statues), 'dance' (disco), 'karate' (tambours)
    music(on, style = 'fun') {
      if (!on) { clearInterval(musicTimer); musicTimer = 0; return; }
      if (musicTimer) return;
      let i = 0;
      const scale = [523, 587, 659, 784, 880, 1047, 1175];
      const songs = {
        fun: { ms: 190, mel: [0, 2, 4, 2, 5, 4, 2, 0, 3, 5, 6, 5, 4, 2, 3, 1], bass: [131, 131, 175, 196] },
        dance: { ms: 150, mel: [4, -1, 4, 5, 6, -1, 5, 4, 2, -1, 2, 4, 5, 4, 2, 0], bass: [110, 110, 147, 165] },
        karate: { ms: 230, mel: [-1, -1, -1, 4, -1, -1, 5, -1, -1, -1, -1, 3, -1, 2, -1, -1], bass: [87, 87, 98, 87] },
      };
      const song = songs[style] || songs.fun;
      musicTimer = setInterval(() => {
        const note = song.mel[i % song.mel.length];
        if (note >= 0) tone(scale[note], style === 'karate' ? 0.35 : 0.16, style === 'karate' ? 'sine' : 'triangle', style === 'karate' ? 0.05 : 0.07);
        if (style === 'dance') {
          if (i % 2 === 0) tone(90, 0.12, 'sine', 0.22, 0, 45);          // grosse caisse
          if (i % 2 === 1) tone(5200, 0.03, 'square', 0.012);            // charleston
          if (i % 8 === 4) tone(220, 0.08, 'square', 0.03);               // claquement
        } else if (style === 'karate') {
          if (i % 4 === 0 || i % 16 === 14) tone(95, 0.35, 'sine', 0.28, 0, 50); // tambour
          if (i % 4 === 2) tone(160, 0.12, 'triangle', 0.08, 0, 90);
        } else {
          if (i % 2 === 1) tone(2400, 0.03, 'square', 0.015);
        }
        if (i % 4 === 0) tone(song.bass[(i / 4) % song.bass.length | 0], 0.3, 'sine', style === 'karate' ? 0.06 : 0.12);
        i++;
      }, song.ms);
    },
    musicOn: () => !!musicTimer,
    win() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.12)); },
  };
})();
