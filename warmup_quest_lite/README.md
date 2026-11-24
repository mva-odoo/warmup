# Warm-Up Quest — module importable (sans Python)

Le même jeu que `warmup_quest`, emballé en **module de données** (XML + fichiers statiques, aucun fichier Python) :
il s'installe avec **Applications › Importer un module**, y compris là où l'on ne peut pas ajouter de module Python
(Odoo Online). Même principe que `runner_live`.

## Fabriquer et installer
```bash
python3 warmup_quest_lite/dev/make_zip.py      # -> dist/warmup_quest_lite.zip (≈ 25 Mo)
```
1. Dans Odoo : installer le module **Site web** (la page du jeu en a besoin), activer le mode développeur.
2. **Applications › Importer un module** : choisir `dist/warmup_quest_lite.zip` (administrateur).
3. Menu **Warm-Up Quest › ▶ Jouer** (page `/website/action/warmup`, utilisateur interne connecté).

Pour une nouvelle version : augmenter `version` dans `__manifest__.py` (elle sert aussi à recharger les fichiers du jeu
dans les navigateurs), refaire le zip et l'importer à nouveau (même écran, il met à jour le module).

## Ce que fait le script
Tout ce qui est commun est repris du module Python au moment de fabriquer le zip, rien n'est recopié dans le dépôt :
le jeu (`warmup_quest/static/src/game`, sans `tools/`), le pont `odoo_bridge.js`, les mondes, mouvements et poses
(`warmup_constants.py`), l'apparence du personnage, les séquences par défaut (`hooks.py`) et les créatures.
Il fabrique `data/models.xml` (modèles manuels `x_wuq_…`), `data/sequences.xml`, `data/creatures.xml` et
`data/page.xml` (la page du jeu, en gabarit QWeb, depuis `index.html`).

## Différences avec le module Python
| | `warmup_quest` (Python) | `warmup_quest_lite` (importable) |
|---|---|---|
| Installation | dossier dans `addons_path` | « Importer un module » (zip) |
| Dépend de | `web` | `website` (pour la page du jeu) |
| Page du jeu | route `/warmup` | action serveur `/website/action/warmup` |
| Données | `warmup.player`, `warmup.session`… | `x_wuq_player`, `x_wuq_session`… (modèles manuels) |
| Logique de fin de partie | contrôleur Python | `static/src/lite_bridge.js` (appels `/web/dataset/call_kw`) |
| Contrôles serveur | contraintes, données vérifiées | vérifications dans le jeu seulement |
| Migrations | automatiques | aucune : réimporter le zip |
| Mondes dans l'historique | les 8 + les anciens | les 8 (on repart de zéro) |

Pourquoi une action du site web : un module importé sert ses fichiers statiques depuis la base avec l'en-tête
`Content-Security-Policy: default-src 'none'`, qui empêche une page HTML servie ainsi de lancer ses scripts.
La page passe donc par un gabarit QWeb ; scripts, modèles 3D et voix restent des fichiers du module (balise `<base>`).
