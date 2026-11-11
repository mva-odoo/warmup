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
    pop() { tone(900, 0.06, 'sine', 0.12, 0, 1800); tone(1400, 0.05, 'triangle', 0.05, 0.04); },
    // Petite musique joyeuse en boucle (mélodie originale, gamme pentatonique)
    music(on) {
      if (!on) { clearInterval(musicTimer); musicTimer = 0; return; }
      if (musicTimer) return;
      let i = 0;
      const mel = [0, 2, 4, 2, 5, 4, 2, 0, 3, 5, 6, 5, 4, 2, 3, 1];
      const scale = [523, 587, 659, 784, 880, 1047, 1175];
      const bass = [131, 131, 175, 196];
      musicTimer = setInterval(() => {
        tone(scale[mel[i % mel.length]], 0.16, 'triangle', 0.07);
        if (i % 4 === 0) tone(bass[(i / 4) % bass.length | 0], 0.3, 'sine', 0.12);
        if (i % 2 === 1) tone(2400, 0.03, 'square', 0.015);
        i++;
      }, 190);
    },
    musicOn: () => !!musicTimer,
    win() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.12)); },
  };
})();
