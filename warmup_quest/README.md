# Warm-Up Quest — module Odoo 20.0 (Community)

Jeu d'échauffement pour enfants contrôlé par webcam, intégré à Odoo.

## Installation
1. Copier le dossier `warmup_quest` dans un dossier d'addons d'Odoo (`addons_path`).
2. Redémarrer Odoo, activer le mode développeur, puis **Applications › Mettre à jour la liste des applications**.
3. Chercher « Warm-Up Quest » et cliquer sur **Activer**.

À l'installation, 3 séquences par défaut (une par monde) et les 8 créatures sont créées.

## Utilisation
- **Ajouter un enfant** : directement dans le jeu, bouton « + Ajouter un enfant » (prénom + couleur).
  On peut aussi le faire dans **Warm-Up Quest › Joueurs** (photo, année de naissance…).
- **Warm-Up Quest › ▶ Jouer** : ouvre le jeu (`/warmup`) dans un nouvel onglet ; choisir « Qui joue ? » puis un monde.
  - **À deux (coopératif)** : cliquer sur deux prénoms. Chaque défi doit être réussi par les deux enfants ;
    la partie est enregistrée pour chacun. Il faut assez de recul pour que les deux soient entiers à l'image.
  - Tout se joue **sur le chemin**, personnage vu de dos (gauche = gauche). Chaque consigne correspond à un obstacle :
    tronc = **saute**, branche = **baisse-toi**, rocher = **tape** (bras en haut puis en bas), étoile dans un couloir = **va à gauche / à droite**.
    Un petit bonhomme animé dans la carte montre le mouvement, et la voix l'explique.
  - **Réussi / pas réussi** : grand rond vert ✔ ou orange au-dessus du personnage, et « ✔ Bravo ! » au centre.
  - **Éviter les obstacles** (remplace la course sur place, trop peu fiable) : rochers à éviter en changeant de couloir,
    troncs à sauter, branches sous lesquelles se baisser. Un rond par obstacle : vert = évité, orange = touché.
  - **Bulles** : elles apparaissent autour du personnage ; les mains du joueur y sont des gants lumineux.
  - **À deux** : chacun a son personnage à sa couleur et sa moitié de caméra (trait au milieu). Restez chacun de votre côté
    et bien écartés : le jeu ignore un bras qui passe chez le voisin.
  - Pendant une pose, une silhouette jaune sur la vidéo montre la position à prendre ; le personnage s'entoure de vert quand c'est bon.
  - **Tout est en 3D** (Three.js, style jouet) : décors propres à chaque paysage (sapins enneigés, palmiers et mer,
    coraux et poissons, planètes, bonbons géants, grange et moulin, volcan qui fume, dino, château…), neige, bulles,
    lucioles, nuit étoilée, et le paysage change pendant la partie. Réglage parent « Graphismes 2D (léger) » pour les PC
    trop faibles ; repli automatique sur le chemin 2D si la 3D ne se charge pas.
  - Épreuves rigolotes : **tunnel** (rester baissé), **taupes** à taper autour de son personnage, **copie les poses**.
  - **Piste de Danse** : imite Tempo, le danseur, pas à pas en musique (comme dans un miroir).
    **Dojo des Petits Tigres** : imite Maître Bambou (parade, coup de genou, position du cavalier, tranche, saut du tigre).
    Chaque geste est noté ✔ / raté ; les parents peuvent créer leurs chorégraphies (gestes séparés par des virgules).
  - **13 mondes**, tous sur le chemin (Vallée Turbo, Île Bondissante, Monde des Créatures, Banquise, Océan, Espace,
    Pays des Bonbons, Ferme, Vallée des Dinos, Château) + une carte **🎲 Surprise** qui en choisit un au hasard.
  - Jeux : éviter les obstacles, sauter, se baisser, taper, aller à gauche / à droite, **attraper les étoiles**
    (se mettre dessous), **sauter à la corde**, poses (en passant par le **trou du mur**, ou en apprivoisant une créature
    dans le Monde des Créatures), bulles, statues musicales.
  - Le menu ne montre que les prénoms et les mondes ; vitesse, voix, partie courte, **plein écran** (activé par défaut)
    et mode clavier sont rangés dans « ⚙️ Réglages (parents) ».
  - Pensé pour les 4–6 ans : jamais d'échec (au moins 1 étoile et une fête à la fin), mode **Facile** et **partie courte**
    par défaut, une **gommette** gagnée à chaque partie (album dans le carnet, gardé dans le navigateur).
  - Deux jeux en plus : **éclater des bulles** et **statues musicales** (danser, puis se figer quand la musique s'arrête).
  - Le badge « img/s » indique la vitesse de détection : en dessous de 15 (🐢), le PC est trop lent (essayer Chrome/Edge avec l'accélération matérielle).
- **Parties** : historique, graphique de progression et tableau croisé.
- **Carnets** : créatures devenues amies de chaque joueur (évolution à 3).
- **Configuration › Séquences d'échauffement** : créer / modifier les séquences
  (mouvement, répétitions, durées, poses, combos `jump,squat,smash`…). S'il y a plusieurs
  séquences pour un monde, le jeu propose de choisir.

## Important : la webcam
Les navigateurs n'autorisent la caméra qu'en **HTTPS** (ou sur `http://localhost`).
Sur un serveur, mettre Odoo derrière un proxy HTTPS (nginx, Caddy, Traefik…).
La détection des mouvements tourne dans le navigateur : aucune image n'est envoyée au serveur.
Le poste qui joue doit avoir accès à internet (chargement de MediaPipe depuis jsDelivr / Google).

## Faire évoluer le jeu
Le jeu se développe **directement dans ce module** : il n'y a plus de projet séparé à recopier
(l'ancien script `sync-odoo.ps1` ne doit plus être utilisé, il écraserait le jeu).
Après une modification, augmenter la version dans `__manifest__.py` puis mettre à jour le module
(le numéro de version sert à recharger les fichiers du jeu dans les navigateurs).

| Fichier (`static/src/game/js/`) | Rôle |
|---|---|
| `worlds.js` | mondes, paysages, programmes, consignes et voix |
| `game.js` | menu, calibrage, déroulé des épreuves, résultats |
| `pose.js` | détection des mouvements (MediaPipe), 1 ou 2 joueurs |
| `scene3d.js`, `props3d.js` | monde en 3D (Three.js) et catalogue de décors |
| `depth.js`, `decor.js` | chemin 2D (repli) et éléments partagés (bulles, taupes, créatures) |
| `picto.js` | petit bonhomme animé qui montre chaque mouvement |
| `../odoo_bridge.js` | lien avec Odoo : joueurs, séquences, gommettes, enregistrement des parties |

Les programmes par défaut des séquences Odoo (`hooks.py`) reprennent ceux de `worlds.js` :
si on change le programme d'un monde dans le jeu, penser à mettre `hooks.py` à jour aussi.
