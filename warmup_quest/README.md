# Warm-Up Quest — module Odoo 20.0 (Community)

Jeu d'échauffement pour enfants contrôlé par webcam, intégré à Odoo.

## Installation
1. Copier le dossier `warmup_quest` dans un dossier d'addons d'Odoo (`addons_path`).
2. Redémarrer Odoo, activer le mode développeur, puis **Applications › Mettre à jour la liste des applications**.
3. Chercher « Warm-Up Quest » et cliquer sur **Activer**.

À l'installation, 3 séquences par défaut (une par monde) et les 8 créatures sont créées.

## L'histoire : « Les Étoiles de l'Arc-en-ciel »
Au-dessus de l'Académie brille un arc-en-ciel magique. **Madame Pimprenelle**, la chouette directrice, accueille l'enfant
pour sa première année de petit sorcier. Quand il a fini ses cours, le **Nuage Grognon** vole les six couleurs de
l'arc-en-ciel et les cache, changées en **Étoiles de couleur**, dans les six pays d'aventure (violette au Bois des
Sortilèges, verte dans la Vallée des Créatures, orange sur la Banquise, bleue dans l'Océan, rouge chez les Dinos, jaune
dans l'Espace). Finir un pays rend son Étoile : le grand arc-en-ciel derrière le donjon de l'Académie retrouve cette couleur, et
les petites étoiles du bandeau s'allument. Au fil des Étoiles, on découvre que le Nuage Grognon n'est pas méchant mais
triste et tout seul. Au château, on ne le bat pas : on lui montre qu'on veut être son ami ; il rend le cœur de
l'arc-en-ciel et devient le **Nuage Câlin** (qui flotte ensuite au-dessus de la cour du château). Diplôme : « La plus grande magie,
c'est l'amitié. »
- Chapitres racontés (grandes images, voix lente, on avance tout seul à la fin de chaque phrase) : le prologue au premier
  lancement, « L'arc-en-ciel a disparu ! » quand le portail s'ouvre, un chapitre par Étoile retrouvée, et la fin. Ils
  arrivent au retour au château ou au menu ; l'écran de fin annonce aussi « ⭐ Étoile violette retrouvée ! ».
- « 📜 L'histoire » ouvre le livre : les Étoiles trouvées et les chapitres débloqués, à réécouter.
- Mode test : `?tale=prologue|portal|fin|gem_ocean`, `?gems=3` (Étoiles déjà trouvées), `?taleend=1`, `?book=1`.

## L'Académie
L'enfant est un **petit sorcier** en première année à l'**Académie des Petits Mages**. Il a toujours sa baguette et
(par défaut) son chapeau de sorcier ; ses créatures amies sont ses **familiers**, rangés dans son **grimoire**.
Le Nuage Grognon n'est jamais effrayant (voir l'histoire ci-dessus).
- La carte a deux chapitres (un ruban marque le début de chacun) :
  - **📚 À l'Académie (les cours)** : Premier jour à l'Académie (le tuto), Le Jardin de l'Académie (botanique),
    Cours de danse magique (Tempo), Cours de défense (Maître Bambou), Atelier des potions (couper les fruits),
    La Récré (foot, basket), La Tour des Singes farceurs (les singes ensorcelés couvrent les vitres de mousse),
    Le Marché aux ingrédients.
  - **🌀 Les aventures** : par le portail magique, on aide les pays que le Nuage Grognon a rendus grognons :
    Le Bois des Sortilèges, La Vallée des Créatures, La Banquise Glacée, Le Fond de l'Océan, La Vallée des Dinos,
    Voyage dans l'Espace, et enfin **Le Château du Nuage Grognon** : son gardien est le Nuage Grognon lui-même.
    Quand il redevient gentil, l'enfant gagne son **🎓 diplôme de petit sorcier**.
- Chaque île commence et finit par une phrase de l'histoire ; les gardiens sont « ensorcelés » et redeviennent amis.
- Anciennes îles retirées de la carte (leurs parties restent dans l'historique Odoo) : Vallée Turbo, Île Bondissante,
  Pays des Bonbons, La Ferme Joyeuse, Planète Rythmo (les cubes en musique restent aux carrefours et dans les cours).
- Une carte réorganisée ne referme rien : une île est ouverte si l'enfant y a déjà joué ou est allé plus loin.

## Le château de l'Académie (petit monde ouvert)
Bouton « 🏰 Entrer dans le château de l'Académie » du menu : au lieu de choisir sur la carte, l'enfant se promène.
- Une grande cour fermée par des remparts crénelés, vue d'en haut, avec une fontaine au milieu. Au fond, derrière la
  grande porte, le donjon (Premier jour) et le grand arc-en-ciel ; à côté, la tour de Madame Pimprenelle (la chouette au
  balcon). Sur les côtés, une tour par cours, dans l'ordre du chapitre (à gauche de l'entrée vers le fond, puis à droite du
  fond vers l'entrée) : la serre, la salle de danse, la pagode du dojo, l'atelier des potions (chaudron qui bouillonne),
  le terrain de la récré, la tour des singes, le marché. À l'entrée, le **portail magique** des aventures (il mène au
  village de la prochaine aventure à gagner). Chaque tour a son panneau (icône, nom et étoiles, ou 🔒 ? s'il est encore
  fermé) ; un halo doré entoure le prochain cours à réussir.
- **Choisir** : le prochain cours est déjà choisi (grand anneau doré). Pour un autre lieu, un **pas de côté** passe au
  lieu voisin à gauche ou à droite de l'écran (rester sur le côté continue de défiler ; les lieux fermés sont sautés).
  Pas de visée au doigt : elle dépendait trop de la taille de l'enfant et de sa distance à la caméra.
- **Y aller** : **lever les deux bras** (l'anneau se remplit en ~0,8 s, la baguette lance un rayon) ; le petit sorcier y
  va tout seul, vite, par les allées droites (l'allée centrale de la porte au donjon, et une allée en travers par paire de
  tours), qui passent toutes par la fontaine. Tous les cours faits : c'est le portail qui brille.
- En route (à peu près un trajet sur deux, pas le premier), une **créature ensorcelée** bloque le chemin : lever un bras
  lui lance un sort et elle redevient gentille. Le familier suit l'enfant, et les amis du grimoire se promènent dans la cour.
- Arrivé à la porte, le petit sorcier entre et le cours commence directement (pas besoin de se recalibrer) ; à la fin,
  🏠 ramène au château, devant cette tour. ✖ (en haut) ou Échap : retour au menu.
- 3D seulement (bouton caché avec « Graphismes 2D »). Mode clavier : ← → (pas de côté), 1 (bras levés) ou Entrée.
  Mode test : `?hub=1&hubauto=1` (choisit tout seul ; `hubblock=1` créature forcée, `hubauto=2` sans lancer le sort,
  `hubret=1` finit le cours tout de suite et revient au château).

## Les villages des aventures
Le portail du château mène au **village** du pays d'aventure en cours (même principe : pas de côté pour choisir, bras levés pour y aller).
- **On ne choisit qu'une fois** : au village, le petit sorcier part tout seul vers l'étape qui brille après quelques
  secondes (l'anneau doré se remplit) ; un pas de côté annule, pour choisir autre chose. Pays fini : il file au pays suivant.
- Fin d'une étape (ou d'un cours lancé du château) : le gros bouton est « 🌀 On continue ! » (« 🏰 Au château ! ») et lever
  les bras continue l'aventure au lieu de rejouer ; « Encore » reste là, en petit.
- Ciel, sol, chemins, décor et petites maisons aux couleurs du pays ; les villageois sont les créatures du pays ; au centre,
  une pierre magique aux couleurs du pays.
- **Une porte par étape** du pays (portique dans le paysage de l'étape : « Étape 2 : Récif »), avec « À faire » ou « ✅ Réussie ».
  On ne peut entrer que dans les étapes déjà ouvertes ; rejouer une étape réussie ne fait pas sauter la suivante.
- À la dernière porte, le **gardien ensorcelé** attend sous son petit nuage d'orage (au château, c'est le Nuage Grognon) ;
  une fois le pays fini, il fait la fête.
- Des portails mènent au **pays d'avant / d'après** (s'il est ouvert) et à l'**Académie**. Après une étape, 🏠 ramène au village.
- Mode test : `?village=banquise&hubauto=1` (`hubret=1` : finit l'étape tout de suite et revient au village).

## Un jeu sur place par pays
Chaque pays d'aventure (et le Jardin) a son jeu à lui, où l'on ne court pas : le petit sorcier s'arrête et imite l'enfant
(plan large), le décor du jeu se dessine autour de lui. Il revient une fois par étape, mélangé à quelques épreuves du
thème (moins de course qu'avant). Étape `act` dans le jeu, `act_…` dans les séquences Odoo (nombre de réussites).
- 🌷 **Jardin** : faire pousser les fleurs (s'accroupir pour planter la graine, puis lever les bras : la fleur s'ouvre).
- 🐸 **Vallée des Créatures** : imiter les animaux d'une grande carte (grenouille = saut, tortue = accroupi, oiseau =
  avion, girafe = bras levés, flamant = sur un pied, ours = frappe).
- 🐧 **Banquise** : réchauffer les bébés pingouins pris dans la glace (3 claps dans les mains par pingouin).
- 🐬 **Océan** : nager avec les dauphins jusqu'au trésor (un bras en haut, puis l'autre ; une perle par mouvement).
- 🚀 **Espace** : faire décoller la fusée (rester accroupi : la jauge de carburant se remplit ; puis sauter).
- 🦕 **Dinos** : marcher comme un dino, genoux levés (ou petits sauts si la caméra ne voit pas les jambes) : chaque pas
  fait craquer l'œuf, au 4e le bébé dino sort.
- Mode test : `?world=ocean&step=act&fakelimbs=1` (l'enfant imaginaire fait les gestes ; `hold=1` garde l'épreuve).
- Odoo : les séquences par défaut de ces pays sont remplacées par la migration 20.0.17 seulement si elles n'ont pas été
  modifiées (mêmes épreuves, nombres et durées qu'à l'origine).

## L'interface
- Accueil : trois grandes tuiles, **🏰 Jouer** (le château), **🏆 Salle des Défis**, **🗺️ La carte** (toutes les îles,
  dans un panneau, page par page) ; en dessous l'histoire, le grimoire et la chambre ; les réglages parents derrière la
  roue dentée ⚙️ en bas à droite. Mode test : `?map=1` ouvre la carte.
- Une même identité partout : ciel de nuit, silhouette du château, panneaux aux bords dorés, gros boutons dorés ; la
  consigne de la partie sur un parchemin ; pause, chargement, calibrage et écran de fin dans un grand panneau.

## Les jeux miroir (comme sur console)
Une scène fixe, sans chemin : l'enfant se voit en grand à l'écran (image de la caméra, en miroir, avec un chapeau de
sorcier et des mains lumineuses) et la magie se dessine autour de lui. Quand il touche un objet avec sa vraie main, il le
touche à l'écran : rien à viser. Étape `arena` (moteur : `js/arena.js`), `arena_…` dans les séquences Odoo.
- 🧱 **Le Mur Magique** : un mur arrive avec un trou en forme de pose (bras en l'air, avion, étoile, accroupi, pas de
  côté, sur un pied) ; prendre la pose pour passer. De plus en plus vite.
- ☁️ **1, 2, 3… Nuage Grognon** : courir sur place quand il a le dos tourné, statue quand il se retourne (sinon on recule).
- 🦉 **Pimprenelle a dit** : faire l'ordre seulement si elle a dit « Pimprenelle a dit » (les grands adorent le piège).
- ⛄ **Bataille de boules de neige** : lancer (bras levé puis baissé d'un coup) vers les bonshommes farceurs, ou les toucher.
- 🧪 **La cuisine des potions** : toucher les ingrédients de la recette, puis touiller (grands cercles avec le bras).
- ⚡ **Duel de sorciers** contre Grimaud : bouclier (mains jointes) ou esquive (pas de côté), puis bras levés pour son sort.
- 🪢 **Tir à la corde** contre le Nuage Grognon : bouger les bras très vite (ou sauter) pour ramener le ruban.
- 🎪 **L'équilibriste** : sur un pied (bras ouverts sans les jambes visibles) ; bras ouverts quand le vent souffle.
- 🧹 **La course de balais** (décor de ciel) : se pencher pour tourner, bras levés pour monter, accroupi pour descendre.
- 📸 **Le miroir magique** : trois, deux, un… photo rigolote, gardée dans le grimoire.
- Dans les cours et les aventures : potions (Atelier), duel (Défense), Mur (Danse), 1-2-3 et corde (Récré), Pimprenelle
  (Jardin), boules de neige (Banquise), équilibriste (Singes), balais (Sortilèges, Château).
- **🏆 La Salle des Défis** (la tour de Madame Pimprenelle, au château, ouverte d'office) : trois jeux miroir au hasard à
  chaque visite, de plus en plus vite, record à battre. Elle ne bloque pas l'histoire.
- Sans caméra (mode clavier), un petit sorcier dessiné remplace l'image ; B = toucher un ingrédient, S = touiller.
- Mode test : `?world=defis&step=arena&game=mur&fakelimbs=1` (l'enfant imaginaire joue).

## Détection des mouvements
- Modèle MediaPipe « full » et image 1280×720 sur un ordinateur correct (poignets et genoux plus stables) ; « lite » et
  480×360 sur un petit PC. Si « full » est trop lent pendant la partie (analyse > 45 ms pendant 4 s), le jeu passe tout
  seul au modèle léger. Le modèle utilisé s'affiche sous la vignette caméra (img/s · GPU · full).
- Chaque point du squelette est lissé par un filtre One-Euro : le tremblement est divisé par 2 à 3 environ au repos,
  pour une image de retard (≈ 33 ms) seulement sur un geste rapide.
- Mode test : `?posemodel=lite|full` impose le modèle, `?nofilter=1` coupe le lissage (pour comparer).

## Pensé pour les 4–8 ans
- Une partie = un cours ou une étape de 1,5 à 4,5 minutes (vitesse Facile) ; le **Premier jour** (le tuto) est découpé en
  5 leçons : Les premiers sorts, Les poses magiques, Les ateliers, Les farces des singes, La baguette et la récré.
- Au château et dans les villages, chaque panneau a une grosse icône (🌸 💃 🥋 🧪 ⚽ 🐒 🛒, 1️⃣ 2️⃣ 3️⃣ 👑) et le prochain lieu à
  faire est entouré d'un halo doré : pas besoin de savoir lire. Les panneaux du fond grossissent pour rester lisibles.
- Si rien ne se passe, la voix rappelle comment choisir ; au retour d'un cours, une phrase courte (pas tout l'accueil).
  Au retour d'un cours, pas de nouveau calibrage : on reprend directement au château.
- Baguette du Bois des Sortilèges : la visée est aimantée (la créature dans la direction du bras, même si le point n'est
  pas exactement dessus), et le rayon file droit sur elle.
- Pour les plus grands : vitesse « Rapide » dans les réglages parents, et les étapes s'enchaînent vite.

## Utilisation
- **Ajouter un enfant** : directement dans le jeu, bouton « + Ajouter un enfant » (prénom + couleur).
  On peut aussi le faire dans **Warm-Up Quest › Joueurs** (photo, année de naissance…).
- **🎓 Premier jour à l'Académie** (première île de la carte, toujours ouverte) : le mode tuto. Tout y est plus lent ; avant chaque
  épreuve, une grande carte et une voix lente expliquent quoi faire, et Tempo (un petit sorcier) montre le geste à côté
  du chemin. Puis on essaie, sans stress. Le programme fait le tour de tous les jeux, y compris le tunnel, la vitre des
  singes, le supermarché, les carrefours et le gardien du monde.
- **🖐️ Choisir avec la main** (bouton du menu, gardé pour la fois suivante) : la caméra s'allume dans le menu ; la main levée de
  l'enfant déplace une petite main à l'écran, et on la garde 1,5 s sur un monde, un bouton, une vignette… pour le choisir
  (menu, carte, carnet, chambre, « Mon sorcier », fin de partie, pause). La première fois, un petit tuto apprend le geste
  (poser la main sur une étoile, une pomme, un ballon) ; on peut le revoir avec « 🎓 Apprendre les gestes ».
- **Accueil simple pour les petits** : une barre « joueur » (le visage de son sorcier, à toucher pour l'habiller ; 🖐️ pour
  choisir avec la main ; 🎯/✅ objectif du jour et 🎁 surprise en images). Sur la carte, seules les îles ouvertes et la
  **prochaine à gagner** sont montrées ; les suivantes sont des surprises « ? ».
- **Fin de partie en cérémonie** : étoiles, butin, gommette, récompense, compagnon… arrivent un par un en grand, puis se rangent ;
  les boutons « Encore » et « Maison » apparaissent à la fin.
- **Mon sorcier** : six onglets à grosses images (tête, corps, jambes, chapeau, dos, couleur), six grandes vignettes à la fois.
- **Accueil en pages** : la carte des îles tient dans l'écran, sans défilement (deux rangées) ; on tourne la page avec les
  grosses flèches ◀ ▶ (main posée dessus) ou d'un grand geste de la main vers la gauche / la droite.
- **Carte des îles** : les mondes forment un chemin ; les 3 premiers sont ouverts, chaque île suivante s'ouvre quand on gagne
  une étoile dans la précédente (réglage parent « 🗺️ Toutes les îles ouvertes »). Le sorcier est posé sur l'île où il en est.
- **Îles en étapes** 🧩 (réglage parent « 🧩 Îles en étapes », activé d'office) : une île à plusieurs paysages se joue en
  2 ou 3 étapes, une par partie, chacune dans son paysage (« Étape 2 sur 3 : Jungle ! »). Chaque étape finit par une
  **créature de ce paysage à apprivoiser** ; le gardien attend à la fin de la dernière. Des pastilles sous les étoiles de
  l'île montrent les étapes faites ; l'écran de fin annonce la suivante. Puis l'île recommence à l'étape 1. Une étape
  est déjà courte : le réglage « partie courte » ne s'applique qu'aux îles d'une traite. (Gardé dans ce navigateur.)
  Mode test : `&world=island&stage=1`.
- **Faire évoluer ses amis en jouant** : au Stade, le copain qui passe et tire est une des créatures amies de l'enfant
  (pas encore évoluée de préférence) ; chaque épreuve réussie avec lui compte comme une rencontre, et à 3 il évolue.
- **Surprise du jour** 🎁 : chaque jour, une créature spéciale attend dans un des mondes ouverts (rien n'est perdu si on ne vient pas).
- **Familier** 🐾 : avant la première partie, l'enfant choisit Flammèche, Gouttin ou Feuillou. Le compagnon court à côté de lui,
  fait les poses avec lui, saute de joie quand il réussit, grandit toutes les 2 parties et évolue au niveau 5.
  On peut en changer dans le carnet (bouton 🐾 sur une créature amie). Enregistré dans la fiche Odoo.
- **Combos** : 3 réussites d'affilée déclenchent une fête (bannière, anneau doré, étincelles, musique qui s'emballe).
- **Gardien du monde** 👑 : à la fin de chaque monde, une grande créature évoluée bloque le chemin ; on copie ses 3 poses
  et elle devient amie.
- **Photo souvenir** 📸 à la fin de chaque partie, et **🏠 Ma chambre** : une pièce en 3D avec le sorcier, son compagnon,
  les créatures amies sur l'étagère, un trophée par monde réussi, les photos au mur et l'affiche de gommettes.
- **À deux (coopératif)** :
  - **réussite d'équipe** : un défi est réussi dès qu'un des deux enfants le réussit (on s'entraide, personne n'attend l'autre) ;
  - **jeux « ensemble »** : la corde, les couloirs gauche / droite et les combos sont remplacés par des jeux d'équipe
    (mousse, étoiles, bulles, gros rocher à taper ensemble) ;
  - **placement guidé** au départ : deux grands ronds de couleur sur la vidéo, au nom de chaque enfant, qui deviennent verts
    quand il est bien placé ; en jeu, « ↔️ Écartez-vous ! » si les deux se rapprochent trop ;
  - **poses à tour de rôle** : « À toi Léo ! », un repère 👇 et la silhouette guide sur son sorcier ;
  - **tape dans la main** : à chaque réussite (une fois sur deux), les deux sorciers se rejoignent et se tapent dans la main.
- **Mode petit 🐣** (par enfant, dans « Mon sorcier » ou la fiche Odoo, coché d'office à 5 ans ou moins d'après l'année de
  naissance) : sauts, flexions et poses reconnus plus facilement, bulles et taupes plus faciles à toucher.
- **Parents** : objectif du jour (une partie), réglage « 🌙 parties par jour » (1, 2, 3 ou sans limite) : une fois atteint, le jeu
  félicite et dit « à demain ». Dans Odoo, la fiche de l'enfant montre ses parties du jour et des 7 derniers jours.
- **Récompenses** : les étoiles gagnées (meilleure note de chaque monde) débloquent des objets pour le sorcier :
  couronne (3 ⭐), couronne de fleurs, cape, chapeau de magicien, oreilles de chat, ailes, chapeau de pirate,
  casque de viking, casque d'astronaute (30 ⭐). L'écran de fin annonce « Nouveau ! » ou montre la prochaine récompense.
- **Musique** : chaque monde a sa petite musique originale (aventure, danse, karaté, espace, sous l'eau, bonbons…),
  jouée par un synthétiseur intégré (instruments, batterie, réverbération) ; elle baisse quand la voix parle.
  Réglage parent « 🎵 Musique » pour la couper.
- **Mon sorcier 👕** : chaque enfant choisit un **aventurier** (chevalier, magicien, barbare, aventurières, avec leurs
  vraies animations) ou compose son petit sorcier, uniquement avec des images : la **tête**, le **corps**
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
  - **Le sorcier imite l'enfant** : pendant les bulles, taupes, poses, fruits, cubes, danses et statues, ses bras et ses jambes
    copient ceux de l'enfant en direct, et la caméra se rapproche. On touche bulles et taupes avec les mains du personnage
    (gants lumineux), donc exactement ce qu'on voit à l'écran.
  - Pendant une pose, le **modèle à imiter** se tient de face sur une estrade dorée à côté du chemin, et une silhouette
    dorée se pose sur le sorcier ; elles deviennent vertes quand c'est bon.
  - **Corde à sauter** : décompte 3, 2, 1 avant chaque saut (lent pour le premier, en rythme ensuite).
  - **Fruits** : ils arrivent de partout (d'en bas, du ciel, de gauche, de droite) ; le sorcier s'efface, et l'enfant tient
    un **sabre lumineux** dans chaque main (bleu à gauche, rose à droite) : la lame coupe les fruits.
  - La petite vidéo de la caméra est en haut à droite (dans le ciel) pour ne plus cacher les épreuves.
  - **Rendu dessin animé** : trait d'encre calculé sur toute l'image (contours nets sur tous les objets et personnages,
    qui s'effacent au loin), bords lissés, contre-jour qui détache les personnages.
  - **Caméra qui met en scène** : un plan par situation (de côté pour voir le coach de danse, de trois quarts pour la corde,
    au ras du sol dans le tunnel, plan à deux lors d'une rencontre, lent travelling pendant les pauses…), enchaînés en douceur ;
    elle penche dans les changements de couloir et la focale s'ouvre avec la vitesse.
  - **Son cohérent** : les bruitages utilisent les mêmes instruments que la musique et sont joués dans son ton ;
    la musique entre et sort en fondu.
  - Présentation « jeu vidéo » : monde arrondi à l'horizon, consigne annoncée en grand puis rangée en petit en haut,
    étincelles quand c'est réussi, butin qui se compte à la fin, menu animé.
  - **Tout est en 3D** (Three.js, style jouet) : décors propres à chaque paysage (sapins enneigés, palmiers et mer,
    coraux et poissons, planètes, bonbons géants, grange et moulin, volcan qui fume, dino, château…), neige, bulles,
    lucioles, nuit étoilée, et le paysage change pendant la partie. Réglage parent « Graphismes 2D (léger) » pour les PC
    trop faibles ; repli automatique sur le chemin 2D si la 3D ne se charge pas.
  - Épreuves rigolotes : **tunnel** (rester baissé), **taupes** qui sortent de petites îles volantes de chaque côté, **copie les poses**.
  - **Verger des Ninjas** : des fruits sautent en l'air, on les coupe en deux d'un geste vif de la main (traînée de sabre, jus).
  - **Tour des Singes farceurs** 🐒 : les singes bombardent l'écran de mousse jusqu'à couvrir **toute la vitre** :
    on ne voit plus le décor, seulement les deux **raclettes** (les mains de l'enfant). Chaque geste efface une bande,
    comme sur une vraie fenêtre (gouttes qui coulent, reflets, cadre en bois). Vitre propre à 80 % (65 % en mode petit) :
    elle brille… et les singes recommencent (1 à 3 vitres selon le nombre réglé : 5 = une vitre). Très bien à deux.
  - **Bois des Sortilèges** 🪄 (après le Vallée des Créatures sur la carte) : le Nuage Grognon a ensorcelé des créatures
    (petit nuage d'orage sur la tête). L'enfant lève le bras et **pointe sa baguette** : un rayon part de la main de son
    sorcier jusqu'à la créature visée ; tenu dessus (anneau doré qui se remplit, ~1,3 s, 0,9 s en mode petit), le nuage
    éclate et elle redevient gentille. La dernière libérée devient son **amie** (carnet). On vise avec tout le bras
    (pas le doigt, trop petit pour la caméra à 2–3 m) : aucun calibrage selon la place de la caméra. L'épreuve est aussi
    dans l'Premier jour à l'Académie et aux carrefours. Mode test : `&step=wand&fakelimbs=1&wandaim=1`.
  - **Récré** 🏟️ (un des cours de l'Académie) : on fait du sport avec les créatures, le sorcier s'arrête
    sur le terrain.
    - 🧤 **Gardien de but** : un copain créature tire depuis le bout du chemin ; un rond blanc montre où le ballon arrive,
      on l'arrête avec les mains (haut du corps seulement, parfait pour une webcam de portable).
    - 🏀 **Basket** : le copain passe le ballon ; on l'attrape en joignant les mains devant soi, puis on lève les deux bras
      pour tirer dans le panier (mode petit : toucher le ballon suffit pour l'attraper).
    - ⚽ **Penalty** : le ballon est posé devant un pied (une petite jambe montre lequel) ; on lève le genou de ce côté.
      Le gardien plonge… du mauvais côté. Si la caméra ne voit pas les jambes, on tire **à la main** comme au handball
      (bras levé puis baissé fort, du côté du ballon).
    - Le gardien de but est aussi aux carrefours ; les trois sports sont dans l'Premier jour à l'Académie.
      Mode test : `&step=goal|basket|kick&fakelimbs=1&sportauto=1` (clavier : G / D = genou gauche / droit, H = mains jointes).
  - **Carrefours** 🔀 : dans chaque parcours (sauf l'école), le chemin se sépare. Deux panneaux montrent deux épreuves
    tirées au hasard (bulles, taupes, fruits, cubes, mousse, étoiles, corde, tunnel, statues) ; un grand pas à gauche
    ou à droite, tenu un instant, choisit la suivante. Un carrefour au milieu, deux pour les longs parcours.
    Les épreuves proposées ne sont pas déjà au programme (sinon, celles qui reviennent le plus loin).
    Le jeu retient les choix de chaque enfant (dans sa fiche Odoo) : son **épreuve préférée** (la plus choisie) revient plus souvent, et la carte
    des îles montre les chemins pris la dernière fois (🔀). Une partie sur trois environ, un panneau doré « ❓ Secret ! »
    cache une épreuve surprise (poses, statues, étoiles, corde, tunnel) ; au bout, un **trésor** (+300 points) et une
    **clé dorée** 🗝️ sur l'île de la carte. Mode test : `&forksecret=1&forkside=secret`.
  - **Super Marché Rigolo** 🛒 (au loin : façade et enseigne, hauts rayons, panneaux de rayon) : des produits arrivent dans les couloirs ; un pas à gauche ou à droite pour se mettre devant
    et ils tombent dans le caddie (poussé à côté du sorcier, il se remplit pour de vrai). De petits chapardeurs masqués
    foncent sur le sorcier : il faut les éviter (ou sauter par-dessus), sinon ils volent un produit !
  - **Planète Rythmo** : des cubes arrivent en musique à 7 endroits autour du sorcier (en bas, au milieu, en haut de chaque
    côté, au-dessus de la tête) ; bleu = main gauche, orange = main droite, violet = n'importe laquelle ; un anneau montre
    où taper juste avant qu'il arrive.
  - **Piste de Danse** : imite Tempo, le danseur, pas à pas en musique (comme dans un miroir).
    **Dojo des Petits Tigres** : imite Maître Bambou (parade, coup de genou, position du cavalier, tranche, saut du tigre).
    Chaque geste est noté ✔ / raté ; les parents peuvent créer leurs chorégraphies (gestes séparés par des virgules).
  - **30 amis en 3D**, tous de la même famille que le sorcier (animaux « Cube Pets » de Kenney et personnages assortis) (éléments feu, eau, plante, glace, roche, air, nuit, sable, fée,
    étoile, sucre, lumière…), chacune avec ses lieux de vie, son petit cri et sa forme évoluée. On les voit se promener
    dans les hautes herbes ; elles viennent montrer une pose à copier pour devenir amies, puis rejoignent le carnet.
  - **15 mondes**, tous sur le chemin (Vallée Turbo, Île Bondissante, Vallée des Créatures, Banquise, Océan, Espace,
    Pays des Bonbons, Ferme, Vallée des Dinos, Château, Verger des Ninjas, Planète Rythmo…) + une carte **🎲 Surprise** qui en choisit un au hasard.
  - Jeux : éviter les obstacles, sauter, se baisser, taper, aller à gauche / à droite, **attraper les étoiles**
    (se mettre dessous), **sauter à la corde**, poses (en passant par le **trou du mur**, ou en apprivoisant une créature
    dans le Vallée des Créatures), bulles, statues musicales.
  - Le menu ne montre que les prénoms et les mondes ; vitesse, voix, partie courte, **plein écran** (activé par défaut)
    et mode clavier sont rangés dans « ⚙️ Réglages (parents) ».
  - Pensé pour les 4–6 ans : jamais d'échec (au moins 1 étoile et une fête à la fin), mode **Facile** et **partie courte**
    par défaut, une **gommette** gagnée à chaque partie (album dans le carnet, gardé dans le navigateur).
  - Deux jeux en plus : **éclater des bulles** et **statues musicales** (danser, puis se figer quand la musique s'arrête).
  - Le badge « img/s » indique la vitesse de détection : en dessous de 15 (🐢), le PC est trop lent (essayer Chrome/Edge avec l'accélération matérielle).
- **Parties** : historique, graphique de progression et tableau croisé.
- **Grimoires** : créatures devenues amies de chaque joueur (évolution à 3).
- **Configuration › Séquences d'échauffement** : créer / modifier les séquences
  (mouvement, répétitions, durées, poses, combos `jump,squat,smash`…). S'il y a plusieurs
  séquences pour un monde, le jeu propose de choisir.

## Webcam de portable
- Les mains sont placées à l'écran d'après la longueur de bras d'un enfant : raclettes, baguette et curseur atteignent les
  bords et les coins sans tendre le bras à fond ; si le poignet sort de l'image, le jeu prolonge le bras depuis le coude.
- Le format réel de la caméra (4:3 ou 16:9) est pris en compte pour l'avion, l'étoile, les jambes écartées et les pas de côté.
- Le flamant rose est reconnu au genou levé, même quand les pieds (et l'autre genou) sont hors de l'image.
- Pour voir les pieds : poser l'ordinateur plus bas (sur une chaise) et pencher l'écran en arrière, ou utiliser une webcam USB
  grand angle posée bas (sous la télé).

## Petits ordinateurs
Le jeu choisit tout seul sa **qualité** (Haute, Moyenne, Basse) d'après la machine (cœurs, mémoire, carte graphique), puis
baisse d'un cran s'il n'atteint pas ~28 images/s pendant quelques secondes. Réglage parent « 🖥️ Qualité » pour la forcer.
- **Haute** : image nette, ombres douces, trait d'encre, halo lumineux, herbe dense, décor complet.
- **Moyenne** : image normale, ombres simples, trait d'encre, sans halo, moitié moins d'herbe, un peu moins de décor.
- **Basse** : image plus petite (agrandie à l'écran), sans ombres ni effets, peu d'herbe, décor allégé ; la détection des
  mouvements analyse une image plus petite (480 × 360) au plus ~16 fois par seconde, et le menu garde ses dessins 2D.
- Dernier recours : « 🎮 Graphismes 2D (léger) ».
Repères (mesurés) : 130 à 270 dessins par image et 65 000 à 150 000 triangles selon le monde et la qualité ;
environ 11 Mo de modèles 3D et 5 Mo pour la détection des mouvements, téléchargés une fois puis gardés par le navigateur.
Mode test : `&perf=1` affiche ces chiffres dans le titre de la page, `&quality=low` force une qualité.

## Important : la webcam
Les navigateurs n'autorisent la caméra qu'en **HTTPS** (ou sur `http://localhost`).
Sur un serveur, mettre Odoo derrière un proxy HTTPS (nginx, Caddy, Traefik…).
La détection des mouvements tourne dans le navigateur : aucune image n'est envoyée au serveur.
Le poste qui joue doit avoir accès à internet (chargement de MediaPipe depuis jsDelivr / Google).

## Faire évoluer le jeu
**Mode test (sans caméra)** : ouvrir le jeu avec par exemple `index.html?world=ferme&step=rope` lance directement
un monde en mode clavier, à la première épreuve du type demandé (`&nohud=1` masque l'interface,
`&creature=champilou` choisit la créature, `&look=female-b,beanie,1` habille le sorcier,
`?audiotest=1&errlog=1` calcule chaque musique hors ligne et affiche son volume dans le titre, `&gpoint=0.5,0.4` (place la main des gestes), `?gtuto=1` (tuto des gestes), `&duo=1` (à deux), `&comp=feuillou:5` (compagnon), `&combo=2`, `?room=1` (chambre), `?lineup=1` (planche de tous les chapeaux), `?starter=1` (choix du compagnon), `&results=1` montre l'écran de fin (`&noanim=1` coupe les animations pour la capture), `&forcepose=star` fige une pose, `&biome=2` affiche directement le 3ᵉ paysage du monde, `&fakelimbs=1` simule des bras qui bougent, `&hold=1` garde l'épreuve affichée,
`?carnet=1` ouvre le carnet complet, `?trainer=1` la fenêtre « Mon sorcier »). Pratique pour vérifier le rendu
ou faire des captures d'écran automatiques.

**Voix** : chaque phrase est découpée en morceaux (une phrase = un morceau). Pour chacun, le jeu joue la **voix d'un parent**
si elle a été enregistrée, sinon la **voix naturelle** livrée avec le jeu (585 morceaux, Piper, voix « siwis »), sinon la voix
de synthèse du navigateur (prénoms, phrases ajoutées par les parents dans les séquences). La musique baisse pendant que la voix parle.
- **🎙️ Studio voix** (réglages parents) : rubriques « Les plus dites », Bravos, Consignes, École, Prénoms (« Bravo Léo ! »,
  « À toi Léo ! » avec les prénoms des enfants), Ma voix, Toutes (avec recherche). ▶ écoute, ⏺ enregistre (10 s au plus),
  🗑 reprend la voix du jeu. Une case coupe la voix naturelle (retour à la voix du navigateur). Le micro demande HTTPS, comme la caméra.
- **💌 Mes messages** (premier onglet du studio) : un petit mot perso (« Allez mon champion, papa est fier de toi ! »),
  avec le moment où le jeu le dit (🚀 au début, avant le 3-2-1 ; 👏 après une réussite ; 💪 quand c'est raté ; 🏁 à la fin,
  avant « Lève les bras pour rejouer ») et pour qui (tous, ou un enfant). On l'enregistre avec sa voix, ou on l'ajoute sans
  enregistrement (le jeu le lit avec sa voix). Après une réussite ou un raté, un message arrive de temps en temps (au plus un
  toutes les 40 s, jamais deux fois le même à la suite) et l'épreuve suivante attend qu'il soit fini.
- Les enregistrements sont gardés **dans Odoo** (Configuration › Voix et messages perso) et suivent sur tous les postes ;
  sans Odoo, dans le navigateur.
- Refaire la voix naturelle après un changement de texte : serveur local lancé dans `static/src/game`, puis
  `python -I static/src/game/tools/make_voice.py --model fr_FR-siwis-medium.onnx --chrome <chemin de chrome>`
  (`pip install piper-tts soundfile numpy`). Le script relève les phrases du code, liste tous les morceaux (`voice/phrases.json`)
  et ne synthétise que ceux qui manquent.

**Mets-toi bien** : au départ (seul), une grande silhouette s'affiche dans l'image de la caméra. Chaque partie du corps
que la caméra voit devient verte (tête, bras, ventre, genoux, pieds) et une consigne s'affiche en gros (« Recule ! »,
« Avance un peu », « Par ici ! »). Si les pieds ne sont pas visibles, le jeu demande d'abord de reculer, puis joue quand même
avec le haut du corps au bout de 6 secondes.

**Enregistreur de mouvements** (pour régler la détection sur les vrais gestes des enfants) : cocher
« 🎥 Enregistrer les mouvements » dans les réglages parents. Pendant la partie, seuls les **points du corps** vus par la
caméra sont gardés (33 points par enfant, jamais l'image) ; à la fin (ou à l'abandon après 20 s), le navigateur télécharge
`wuq-mouvements-<date>-<monde>.json` (2 à 3 Mo pour une partie ; bouton « 💾 Mouvements » sur l'écran de fin pour le
reprendre). Pour le **rejouer** : copier le fichier dans `static/src/game/recordings/` (ignoré par git) et ouvrir
`index.html?replay=recordings/<fichier>.json` : la même partie se rejoue sans caméra (même parcours, mêmes carrefours) et
un rapport s'affiche à la fin. Pour chaque épreuve, il donne la note obtenue et celle de la partie enregistrée, les
gestes reconnus (sauts, accroupis, pas de côté…), le temps passé dans chaque pose, et les mesures qui décident
(hauteur du saut, écart des bras et des jambes, pas de côté, rapportés à la taille du torse). En automatique :
`chrome --headless --virtual-time-budget=300000 --dump-dom "…index.html?replay=…&quality=low"`, rapport dans `#replayReport`.

Le jeu se développe **directement dans ce module** : il n'y a plus de projet séparé à recopier
(l'ancien script `sync-odoo.ps1` ne doit plus être utilisé, il écraserait le jeu).
Après une modification, augmenter la version dans `__manifest__.py` puis mettre à jour le module
(le numéro de version sert à recharger les fichiers du jeu dans les navigateurs).

| Fichier (`static/src/game/js/`) | Rôle |
|---|---|
| `worlds.js` | mondes, paysages, programmes, consignes et voix |
| `game.js` | menu, calibrage, déroulé des épreuves, résultats |
| `pose.js` | détection des mouvements (MediaPipe), 1 ou 2 joueurs |
| `rec.js` | enregistreur de mouvements et rejeu (rapport de détection) |
| `voice.js` | voix du jeu (voix des parents, voix naturelle, synthèse) et studio voix |
| `scene3d.js`, `props3d.js` | monde en 3D (Three.js) et catalogue de décors |
| `depth.js`, `decor.js` | chemin 2D (repli) et éléments partagés (bulles, taupes, créatures) |
| `picto.js` | petit bonhomme animé qui montre chaque mouvement |
| `trainer.js` | fenêtre « Mon sorcier » (apparence du personnage de l'enfant) |
| `../odoo_bridge.js` | lien avec Odoo : joueurs, séquences, gommettes, enregistrement des parties |

Les programmes par défaut des séquences Odoo (`hooks.py`) reprennent ceux de `worlds.js` :
si on change le programme d'un monde dans le jeu, penser à mettre `hooks.py` à jour aussi.

## Crédits
Les sorciers aventuriers, les coachs et une partie des décors viennent de **KayKit** de Kay Lousberg
([kaylousberg.com](https://www.kaylousberg.com)), licence **CC0** : Adventurers Character Pack (chevalier, magicien, barbare,
aventurières ; armes retirées, animations et textures allégées avec Blender), Medieval Hexagon Pack (arbres, rochers),
Halloween Bits (citrouilles, lanternes, arbres de nuit), Furniture Bits (meubles de la chambre), Restaurant Bits
(cageots de légumes, frigo du supermarché) — `static/src/game/models/kaykit/License.txt`.
Les autres modèles 3D viennent de **Kenney** ([kenney.nl](https://www.kenney.nl)), licence **CC0** (domaine public) : une seule
famille graphique pour le sorcier, ses amis et les décors. Chaque dossier de `static/src/game/models/` contient sa `License.txt`.
- Sorciers : **Mini Characters** (`characters/`) ; chapeaux, sac à dos, cape, ailes et lunettes ajoutés par le jeu,
  taillés sur mesure (le jeu mesure la tête et le torse de chaque personnage) et accrochés aux os : ils suivent les mouvements.
- Amis du héros : 24 animaux animés du pack **Cube Pets** (`pets/`), plus le fantôme (Graveyard Kit), le bonhomme de neige,
  le renne, le pain d'épices et le casse-noisette (Holiday Kit) et l'extraterrestre (Space Kit). Les noms sont propres au jeu ;
  la forme évoluée est plus grande, avec une couronne dorée.
- Décors : **Nature Kit** (`kenney/`), **Space Kit**, **Food Kit**, **Pirate Kit**, **Holiday Kit**, **Graveyard Kit**,
  **Castle Kit**, **Fantasy Town Kit**, **Platformer Kit**, **Survival Kit**.
- Décors maison, modelés pour le jeu dans Blender (`custom/`) : grands fonds à l'horizon (château, pagode, grange,
  volcan qui fume, montagnes, mesas, phare), torii, lanternes de pierre, cerisiers, coraux, algues, étoiles de mer.
  Posés loin, ils ne sont pas effacés par la brume mais légèrement voilés, et relevés de la courbure du monde pour rester
  sur l'horizon. Quelques éléments restent construits par le jeu (dinosaures, œufs, algues qui ondulent, scène de danse).
- Voix naturelle : **Piper** (MIT) avec la voix française « siwis », base SIWIS de l'Université d'Édimbourg, licence **CC-BY 4.0**
  (`static/src/game/voice/License.txt`).
- Moteur 3D : Three.js ; détection des mouvements : MediaPipe (chargés depuis jsDelivr).
- Mondes, musiques (synthétiseur intégré) et règles du jeu : créations originales de ce module.
