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
    const look = (i) => this._get('look_' + i) || undefined;
    return this._get('duo')
      ? [{ name: 'Joueur 1', color: '#ff6b35', look: look(0) }, { name: 'Joueur 2', color: '#4ea8ff', look: look(1) }]
      : [{ name: '', color: null, look: look(0) }];
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
      const b = document.createElement('button');
      b.className = 'btn small';
      b.textContent = '👕' + (p.name ? ' ' + p.name : '');
      b.onclick = () => Trainer.open({ name: p.name, look: p.look, color: p.color, onSave: (l) => { this.setLook(i, l); rebuild(); } });
      box.appendChild(b);
    });
    return box;
  },
  cardExtra(world, rebuild) { return null; },
};
