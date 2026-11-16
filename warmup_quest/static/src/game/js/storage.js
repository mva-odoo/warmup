// Couche de stockage du jeu.
// Par défaut : le navigateur (localStorage). Un « backend » (ex. le module Odoo)
// peut remplacer ces méthodes pour stocker joueurs, scores et carnet sur un serveur.

const WUQStore = {
  _get(k) { try { return JSON.parse(localStorage.getItem('wuq_' + k)); } catch { return null; } },
  _set(k, v) { try { localStorage.setItem('wuq_' + k, JSON.stringify(v)); } catch {} },

  // Carnet des créatures : { codeCreature: nombreDeFoisAmi }
  getCarnet() { return this._get('carnet') || {}; },
  setCarnet(c) { this._set('carnet', c); },

  // Meilleur score par monde : { score, stars }
  // (i = joueur dans la partie : 0, ou 1 en coopératif)
  getBest(worldId, i = 0) { return this._get('best_' + worldId + (i ? '_' + i : '')) || { stars: 0, score: 0 }; },
  setBest(worldId, b, i = 0) { this._set('best_' + worldId + (i ? '_' + i : ''), b); },

  // Total des étoiles du joueur n° i (meilleure note de chaque monde) : sert à débloquer les récompenses
  totalStars(i = 0) { return (typeof WORLDS === 'undefined' ? [] : WORLDS).reduce((n, w) => n + (this.getBest(w.id, i).stars || 0), 0); },

  // Créature compagnon du joueur n° i : { id, xp } (ou null)
  getCompanion(i = 0) { return this._get('companion_' + i); },
  setCompanion(i, c) { this._set('companion_' + i, c); },

  // Étapes à jouer pour un monde
  steps(world) { return world.sequence; },

  // Peut-on lancer une partie ? (true ou un message d'explication)
  canStart() { return true; },

  // Appelé à la fin de chaque partie avec le résumé
  finish(result) {},

  // Gommettes gagnées par le joueur n° i de la partie (liste d'émojis)
  getStickers(i = 0) { return this._get('stickers_' + i) || []; },
  addSticker(i, sticker) { this._set('stickers_' + i, [...this.getStickers(i), sticker]); },

  // Joueurs de la partie : 1 ou 2 (coopératif) — { name, color, look }
  // look : apparence du dresseur { model, hat, glasses, color } (fenêtre « Mon dresseur »)
  players() {
    const look = (i) => this._get('look_' + i) || undefined, easy = (i) => !!(look(i) && look(i).easy);
    return this._get('duo')
      ? [{ name: 'Joueur 1', color: '#ff6b35', look: look(0), easy: easy(0) }, { name: 'Joueur 2', color: '#4ea8ff', look: look(1), easy: easy(1) }]
      : [{ name: '', color: null, look: look(0), easy: easy(0) }];
  },
  setLook(i, look) { this._set('look_' + i, look); },
  // Bouton du menu pour passer en 2 joueurs (le module Odoo le remplace par le choix des profils)
  duoToggle(rebuild) {
    const b = document.createElement('button');
    const on = !!this._get('duo');
    b.className = 'btn small' + (on ? '' : ' ghost');
    b.textContent = on ? '👥 2 joueurs (coopératif) ✓' : '👥 Jouer à 2 (coopératif)';
    b.onclick = () => { this._set('duo', !on); rebuild(); };
    return b;
  },

  // Éléments optionnels ajoutés au menu (sélecteur de joueur, etc.)
  menuExtras(rebuild) {
    if (typeof Trainer === 'undefined') return null;
    const box = document.createElement('div');
    box.className = 'dressBar';
    this.players().forEach((p, i) => {
      // Le visage du dresseur (dessiné par le jeu) : on le touche pour l'habiller
      const b = document.createElement('button');
      b.className = 'avatarBtn';
      b.innerHTML = `<canvas class="avatarCv" width="96" height="96" data-player="${i}"></canvas><span class="avatarPen">👕</span>${p.name ? `<b>${p.name}</b>` : ''}`;
      b.onclick = () => Trainer.open({ name: p.name, look: p.look, color: p.color, stars: this.totalStars(i), onSave: (l) => { this.setLook(i, l); rebuild(); } });
      box.appendChild(b);
    });
    return box;
  },
  cardExtra(world, rebuild) { return null; },

  // ---------- Voix des parents (studio) : gardées dans ce navigateur (IndexedDB) ; le module Odoo les garde sur le serveur
  _vdb() {
    return (this._vdbP = this._vdbP || new Promise((ok, ko) => {
      const r = indexedDB.open('wuq_voice', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('clips');
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
    }));
  },
  async _vtx(mode, fn) {
    const db = await this._vdb();
    return new Promise((ok, ko) => { const tx = db.transaction('clips', mode), st = tx.objectStore('clips'), r = fn(st); tx.oncomplete = () => ok(r && r.result); tx.onerror = () => ko(tx.error); });
  },
  // Map clé -> adresse du son
  async voices() {
    const out = new Map();
    const db = await this._vdb();
    await new Promise((ok) => {
      const req = db.transaction('clips').objectStore('clips').openCursor();
      req.onsuccess = () => { const c = req.result; if (!c) return ok(); if (c.value.blob) out.set(c.key, URL.createObjectURL(c.value.blob)); c.continue(); };
      req.onerror = () => ok();
    });
    return out;
  },
  // meta : { moment, player } pour un message perso (blob peut manquer : le jeu le lit avec sa voix)
  saveVoice(key, text, blob, meta = {}) { return this._vtx('readwrite', (st) => st.put({ text, blob, ...meta }, key)); },
  async messages() {
    const out = [], db = await this._vdb();
    await new Promise((ok) => {
      const req = db.transaction('clips').objectStore('clips').openCursor();
      req.onsuccess = () => { const c = req.result; if (!c) return ok(); const v = c.value; if (v.moment) out.push({ key: c.key, text: v.text, moment: v.moment, player: v.player || null, url: v.blob ? URL.createObjectURL(v.blob) : null }); c.continue(); };
      req.onerror = () => ok();
    });
    return out;
  },
  deleteVoice(key) { return this._vtx('readwrite', (st) => st.delete(key)); },
};
