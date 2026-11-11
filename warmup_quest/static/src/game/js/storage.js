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

  // Éléments optionnels ajoutés au menu (sélecteur de joueur, etc.)
  menuExtras(rebuild) { return null; },
  cardExtra(world, rebuild) { return null; },
};
