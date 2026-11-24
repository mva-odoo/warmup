// Commandes aux bras, hors du jeu (menu, écran de fin) : un bras tendu à gauche / à droite = gauche / droite,
// les deux bras levés (tenus un moment) = valider. Pendant le jeu, l'étoile tenue = pause (game.js : updatePauseGesture).
// La caméra est la même que pour le jeu : une fois allumée dans le menu, la partie démarre sans attendre.
const Gestures = {
  on: false,
  hold: { side: null, sideT: 0, upT: 0, armed: false, repeatAt: 0 },

  // Allume la caméra (si besoin) et active les commandes. progress : texte de chargement (optionnel)
  async enable(progress = () => {}) {
    this.on = true;
    store('gestures', true);
    tracker.setPlayers(1);
    if (!tracker.sim && !tracker.landmarker) {
      tracker.lowPower = isLowPower();
      try { await tracker.start(video, progress); } catch (e) {
        console.warn(e);
        this.disable();
        return false;
      }
    }
    document.body.classList.add('gestures');
    return true;
  },

  disable() {
    this.on = false;
    store('gestures', false);
    document.body.classList.remove('gestures');
    this.reset();
  },

  reset() { this.hold = { side: null, sideT: 0, upT: 0, armed: false, repeatAt: 0 }; },

  // À appeler à chaque image : renvoie ce qui vient d'être déclenché et l'avancée des gestes en cours.
  // { side: 'left' | 'right' | null, ok: bool, upP: 0..1 (bras levés), sideP: 0..1 (bras sur le côté) }
  // Entre deux commandes, il faut revenir les bras au repos (pas de répétition involontaire) ; un bras gardé sur
  // le côté fait défiler doucement.
  read(now, { upMs = 1200, sideMs = 450, repeatMs = 1100 } = {}) {
    const s = tracker.state, h = this.hold, out = { side: null, ok: false, upP: 0, sideP: 0 };
    if (!this.on || !s.present) { this.reset(); h.armed = !!this.on; return out; }
    const side = !s.armsUp && s.armSide ? s.armSide : null;
    if (!s.armsUp && !side) { h.armed = true; h.upT = 0; h.side = null; return out; }
    if (s.armsUp) {
      h.side = null;
      if (!h.armed) return out;
      h.upT = h.upT || now;
      out.upP = Math.min(1, (now - h.upT) / upMs);
      if (out.upP >= 1) { out.ok = true; h.armed = false; h.upT = 0; }
      return out;
    }
    h.upT = 0;
    if (h.side !== side) { h.side = side; h.sideT = now; h.repeatAt = 0; }
    if (h.armed) {
      out.sideP = Math.min(1, (now - h.sideT) / sideMs);
      if (out.sideP >= 1) { out.side = side; h.armed = false; h.repeatAt = now + repeatMs; }
    } else if (h.repeatAt && now >= h.repeatAt) { out.side = side; h.repeatAt = now + repeatMs; }
    return out;
  },
};
