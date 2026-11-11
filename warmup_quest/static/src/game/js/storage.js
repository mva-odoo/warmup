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
  getBest(worldId) { return this._get('best_' + worldId) || { stars: 0, score: 0 }; },
  setBest(worldId, b) { this._set('best_' + worldId, b); },

  // Étapes à jouer pour un monde
  steps(world) { return world.sequence; },

  // Peut-on lancer une partie ? (true ou un message d'explication)
  canStart() { return true; },

  // Appelé à la fin de chaque partie avec le résumé
  finish(result) {},

  // Joueurs de la partie : 1 ou 2 (coopératif) — { name, color }
  players() {
    return this._get('duo')
      ? [{ name: 'Joueur 1', color: '#ff6b35' }, { name: 'Joueur 2', color: '#4ea8ff' }]
      : [{ name: '', color: null }];
  },
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
  menuExtras(rebuild) { return null; },
  cardExtra(world, rebuild) { return null; },
};
