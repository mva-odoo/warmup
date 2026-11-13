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
- **Récompenses** : les étoiles gagnées (meilleure note de chaque monde) débloquent des objets pour le dresseur :
  couronne (3 ⭐), couronne de fleurs, cape, chapeau de magicien, oreilles de chat, ailes, chapeau de pirate,
  casque de viking, casque d'astronaute (30 ⭐). L'écran de fin annonce « Nouveau ! » ou montre la prochaine récompense.
- **Musique** : chaque monde a sa petite musique originale (aventure, danse, karaté, espace, sous l'eau, bonbons…),
  jouée par un synthétiseur intégré (instruments, batterie, réverbération) ; elle baisse quand la voix parle.
  Réglage parent « 🎵 Musique » pour la couper.
- **Mon dresseur 👕** : chaque enfant compose son petit dresseur, uniquement avec des images : la **tête**, le **corps**
  et les **jambes** (une rangée de vignettes pour chacun, parmi 13 personnages, ou 🎲 au hasard), casquette / bonnet / bandeau, lunettes
  et sa couleur préférée (sac à dos et chapeau).
  La fenêtre s'ouvre juste après l'ajout d'un enfant, puis avec le bouton 👕 à côté de son prénom ;
  le choix est enregistré dans sa fiche (onglet principal : Personnage, Chapeau, Lunettes).
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
  - **Le dresseur imite l'enfant** : pendant les bulles, taupes, poses, fruits, cubes, danses et statues, ses bras et ses jambes
    copient ceux de l'enfant en direct, et la caméra se rapproche. On touche bulles et taupes avec les mains du personnage
    (gants lumineux), donc exactement ce qu'on voit à l'écran.
  - Pendant une pose, le **modèle à imiter** se tient de face sur une estrade dorée à côté du chemin, et une silhouette
    dorée se pose sur le dresseur ; elles deviennent vertes quand c'est bon.
  - **Corde à sauter** : décompte 3, 2, 1 avant chaque saut (lent pour le premier, en rythme ensuite).
  - **Fruits** : le dresseur se tourne vers l'enfant, un peu transparent, comme un miroir.
  - La petite vidéo de la caméra est en haut à droite (dans le ciel) pour ne plus cacher les épreuves.
  - Présentation « jeu vidéo » : monde arrondi à l'horizon, consigne annoncée en grand puis rangée en petit en haut,
    étincelles quand c'est réussi, butin qui se compte à la fin, menu animé.
  - **Tout est en 3D** (Three.js, style jouet) : décors propres à chaque paysage (sapins enneigés, palmiers et mer,
    coraux et poissons, planètes, bonbons géants, grange et moulin, volcan qui fume, dino, château…), neige, bulles,
    lucioles, nuit étoilée, et le paysage change pendant la partie. Réglage parent « Graphismes 2D (léger) » pour les PC
    trop faibles ; repli automatique sur le chemin 2D si la 3D ne se charge pas.
  - Épreuves rigolotes : **tunnel** (rester baissé), **taupes** qui sortent de petites îles volantes de chaque côté, **copie les poses**.
  - **Verger des Ninjas** : des fruits sautent en l'air, on les coupe en deux d'un geste vif de la main (traînée de sabre, jus).
  - **Planète Rythmo** : des cubes arrivent en musique à 7 endroits autour du dresseur (en bas, au milieu, en haut de chaque
    côté, au-dessus de la tête) ; bleu = main gauche, orange = main droite, violet = n'importe laquelle ; un anneau montre
    où taper juste avant qu'il arrive.
  - **Piste de Danse** : imite Tempo, le danseur, pas à pas en musique (comme dans un miroir).
    **Dojo des Petits Tigres** : imite Maître Bambou (parade, coup de genou, position du cavalier, tranche, saut du tigre).
    Chaque geste est noté ✔ / raté ; les parents peuvent créer leurs chorégraphies (gestes séparés par des virgules).
  - **30 créatures en 3D** : 16 créatures originales du jeu et 14 monstres animés (pack Quaternius, CC0) (éléments feu, eau, plante, électrique, glace, roche, air, nuit, sable, fée,
    étoile, sucre, lumière…), chacune avec ses lieux de vie, son petit cri et sa forme évoluée. On les voit se promener
    dans les hautes herbes ; elles viennent montrer une pose à copier pour devenir amies, puis rejoignent le carnet.
  - **15 mondes**, tous sur le chemin (Vallée Turbo, Île Bondissante, Monde des Créatures, Banquise, Océan, Espace,
    Pays des Bonbons, Ferme, Vallée des Dinos, Château, Verger des Ninjas, Planète Rythmo…) + une carte **🎲 Surprise** qui en choisit un au hasard.
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
**Mode test (sans caméra)** : ouvrir le jeu avec par exemple `index.html?world=ferme&step=rope` lance directement
un monde en mode clavier, à la première épreuve du type demandé (`&nohud=1` masque l'interface,
`&creature=champilou` choisit la créature, `&look=female-b,beanie,1` habille le dresseur,
`?audiotest=1&errlog=1` calcule chaque musique hors ligne et affiche son volume dans le titre, `&results=1` montre l'écran de fin (`&noanim=1` coupe les animations pour la capture), `&forcepose=star` fige une pose, `&biome=2` affiche directement le 3ᵉ paysage du monde, `&fakelimbs=1` simule des bras qui bougent, `&hold=1` garde l'épreuve affichée,
`?carnet=1` ouvre le carnet complet, `?trainer=1` la fenêtre « Mon dresseur »). Pratique pour vérifier le rendu
ou faire des captures d'écran automatiques.

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
| `trainer.js` | fenêtre « Mon dresseur » (apparence du personnage de l'enfant) |
| `../odoo_bridge.js` | lien avec Odoo : joueurs, séquences, gommettes, enregistrement des parties |

Les programmes par défaut des séquences Odoo (`hooks.py`) reprennent ceux de `worlds.js` :
si on change le programme d'un monde dans le jeu, penser à mettre `hooks.py` à jour aussi.

## Crédits
- Modèles 3D de nature (arbres, plantes, rochers, champignons, cultures…) : **Nature Kit de Kenney**
  ([kenney.nl](https://www.kenney.nl)), licence **CC0** (domaine public) — voir `static/src/game/models/kenney/License.txt`.
- Arbres, buissons, fleurs et herbes « cartoon » : **Ultimate Stylized Nature** de Quaternius ([quaternius.com](https://quaternius.com)),
  licence **CC0**, allégés avec Blender (textures réduites) — `static/src/game/models/quaternius/`.
- Monstres animés (Lamalou, Bzouille, Glouglou, Champilou…) : modèles et animations du pack **Ultimate Monsters** de Quaternius,
  licence **CC0** (`static/src/game/models/monsters/License.txt`) ; les noms français sont propres à ce jeu.
- Petits dresseurs (personnages et animations) : **Mini Characters** de Kenney, licence **CC0**
  (`static/src/game/models/characters/License.txt`) ; chapeaux, sac à dos et lunettes ajoutés par le jeu.
- Vaisseaux, rovers, astronautes, cratères (Space Kit), friandises et fruits géants (Food Kit), bateaux, palmiers,
  coffres et tonneaux pirates (Pirate Kit) : **Kenney**, licence **CC0** (`static/src/game/models/space|food|pirate/License.txt`).
- Moteur 3D : Three.js ; détection des mouvements : MediaPipe (chargés depuis jsDelivr).
- Personnages, créatures, mondes et musiques : créations originales de ce module.
