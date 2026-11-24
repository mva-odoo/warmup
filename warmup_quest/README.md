# Warm-Up Quest — module Odoo 20.0 (Community)

Jeu d'échauffement pour enfants contrôlé par webcam, intégré à Odoo.

## Installation
1. Copier le dossier `warmup_quest` dans un dossier d'addons d'Odoo (`addons_path`).
2. Redémarrer Odoo, activer le mode développeur, puis **Applications › Mettre à jour la liste des applications**.
3. Chercher « Warm-Up Quest » et cliquer sur **Activer**.

À l'installation, une séquence par défaut pour chacun des 8 mondes et les 30 créatures sont créées.

## Le jeu : 8 mondes à thème
Pas d'histoire à suivre ni de carte à débloquer : le menu propose **8 mondes, tous ouverts**, chacun avec son paysage,
sa musique et ses jeux. Une partie dure 2 à 4 minutes ; on garde ses **étoiles et son record par monde**.

| Monde | Jeux |
|---|---|
| ⚽ **Le Stade** | course de foot (sauter les tacles, se baisser sous le grand joueur, changer de couloir devant les plots), gardien de but (tirs à portée de bras, jamais au-dessus de la tête), penalty |
| 🛒 **Le Magasin** | remplir le caddie, ranger les rayons (s'accroupir pour prendre un produit en bas, lever les bras pour le poser en haut), couper les fruits |
| 🛁 **Le Bain** | nettoyer la mousse des singes farceurs, éclater les bulles, nager (un bras puis l'autre) |
| 🏰 **Le Château** | Mur Magique (prendre la pose du trou), Pimprenelle a dit, la grande course (courir sur place pour que son chevalier batte le rival jusqu'au drapeau, une seule manche) |
| ❄️ **La Banquise** | bataille de boules de neige, réchauffer les pingouins (taper dans les mains), chemin d'obstacles, statues musicales |
| 🦖 **Les Dinos** | marcher comme un dino (genoux levés : les œufs éclosent), chemin d'obstacles, tunnel, taupes |
| 🚀 **L'Espace** | faire décoller la fusée (rester accroupi, puis sauter), chemin d'obstacles, attraper les étoiles |
| 🪩 **La Disco** | danser comme Tempo, cubes en rythme, statues musicales |

- **Chemin** (étape `run`) : le personnage court tout seul ; tronc ou tacle = sauter, branche ou grand joueur = se baisser,
  rocher ou plot = changer de couloir.
- **Jeux sur place** (`act_…` dans Odoo) : on ne court pas, le personnage imite l'enfant et le décor du jeu se dessine
  autour de lui (rayons, pingouins, nage, fusée, dino).
- **Jeux miroir** (`arena_…` dans Odoo) : scène fixe en 3D, le personnage de l'enfant imite ses gestes en direct et touche
  les objets avec ses mains (Mur Magique, Pimprenelle a dit, boules de neige, grande course).

## Commandes aux bras (menu et pause)
- **Bras levés** (tenus ~1 s) : valider (jouer le monde choisi, rejouer à la fin, reprendre après une pause).
- **L'étoile** (bras et jambes écartés, tenue 1,5 s) : pause — sauf pendant les jeux où l'étoile est une consigne (poses, danse, jeux miroir, statues).
- **Un bras tendu à gauche / à droite** : changer de monde dans le menu ; pendant le jeu, ça change aussi de couloir. À l'écran de fin, bras à gauche = retour au menu.

## Créatures, gommettes, à deux
- **Créatures** : pendant une pose, une créature vient se montrer ; on tient la pose pour en faire une amie. Elles
  rejoignent l'**album** (évolution à 3 rencontres) ; l'enfant choisit un **compagnon** qui court avec lui.
- **Gommettes** : une à chaque partie (dans l'album) ; jamais d'échec (au moins 1 étoile et une fête à la fin).
- **À deux (coopératif)** : choisir deux prénoms ; un défi est réussi dès qu'un des deux le réussit, et la partie est
  enregistrée pour chacun.
- **Mode petit 🐣** (coché d'office à 5 ans ou moins) : gestes reconnus plus facilement, cibles plus proches.
- **Parents** (⚙️) : vitesse, parties par jour, musique, voix, qualité graphique, mode clavier.

## Détection des mouvements
- Modèle MediaPipe « full » et image 1280×720 sur un ordinateur correct (poignets et genoux plus stables) ; « lite » et
  480×360 sur un petit PC. Si « full » est trop lent pendant la partie (analyse > 45 ms pendant 4 s), le jeu passe tout
  seul au modèle léger. Le modèle utilisé s'affiche sous la vignette caméra (img/s · GPU · full).
- Chaque point du squelette est lissé par un filtre One-Euro : le tremblement est divisé par 2 à 3 environ au repos,
  pour une image de retard (≈ 33 ms) seulement sur un geste rapide.
- Points 3D du squelette (en mètres, donnés par MediaPipe) : le petit sorcier des jeux miroir reprend la vraie direction
  des bras et des jambes, profondeur comprise (mains jointes, bras tendus devant soi, genou levé).
- Jeux miroir : on touche avec des **mains magiques** qui suivent la vraie main de l'enfant (épaule → main), à l'échelle
  du jeu, reliées à la main du sorcier par un rayon ; un peu d'avance sur le mouvement pour réduire le retard.
- **Échauffement magique** (au premier jeu miroir de la partie) : attraper 4 étoiles bras tendu mesure la portée de
  l'enfant ; ensuite, bras tendu = bord de la zone de jeu, quelle que soit sa taille ou sa distance à la caméra.
- **Aide à la visée** : une main qui s'approche d'un bonhomme de neige est attirée vers lui, et
  l'objet visé grossit.
- Sur les chemins aussi (bulles, taupes, cubes, ballons) : zone de contact un peu plus large avec une vraie caméra,
  l'objet visé grossit (bulle) ou s'entoure d'un anneau doré (taupe) ; sans héros 3D, les mains de l'enfant sont mises
  à l'échelle de sa portée mesurée. Un enfant virtuel qui ne fait rien (`&vkididle=1`) ne gagne rien : l'aide ne joue
  pas à sa place. L'enfant virtuel joue aussi aux bulles, taupes et cubes (`?world=dinos&step=moles&vkid=1`).
- Mode test : `?posemodel=lite|full` impose le modèle, `?nofilter=1` coupe le lissage (pour comparer), `?nocal=1` saute
  l'échauffement, `?nointro=1` l'entrée en scène, `?arena2d=1` les jeux miroir dessinés.
- **Enfant virtuel** (`js/vkid.js`, `?world=chateau&step=arena&game=mur&vkid=1`) : un squelette d'enfant simulé,
  projeté comme par une webcam (mêmes 33 points + points 3D que MediaPipe, ~20 fois par seconde, avec le bruit de la
  détection), remplace la caméra. Il regarde l'écran et joue (calibrage bras levés, étoiles, boules de
  neige, poses…) avec un temps de réaction et des gestes imprécis. Résultats dans le titre de la page
  (`VK {...}` : score de chaque jeu, portée mesurée). Réglages : `vkidh` (taille, m), `vkidd` (distance, m),
  `vkidnoise`, `vkidlag` (ms), `vkidskill` (0 à 1), `vkidseed`.
  Profils « vraie vie » : `?vkid=petit`, `grand`, `decale` (pas au milieu), `biais` (tourné), `camhaute` (caméra sur
  la télé), `cambasse` (sur une table), `travers` (caméra penchée), `bouge` (se balade), `proche` (pieds hors de
  l'image), `loin`, `pire` (tout à la fois, maladroit et lent). Tableau de résultats de tous les profils × jeux miroir :
  `tools/vkid_test.sh` (ou `tools/vkid_test.sh "petit pire" "mur neige"`), résultats dans `~/.cache/wuq-test/`.
  **Mondes entiers** : l'enfant virtuel joue aussi les épreuves du chemin (sauts, accroupis, poses, couloirs, étoiles,
  tunnel, statues, danse, jeux sur place) ; `tools/vkid_worlds.sh` joue tous les mondes et donne les
  épreuves à revoir (`tools/vkid_worlds.sh "stade disco" pire`). Il joue tout : chemin, jeux sur place, fruits, mousse,
  sports (but, penalty).
  **Deux enfants** : `&vkid2=1` (ou un profil, `&vkid2=petit`), écart `&vkidgap=0.8` (m), réglages du 2e `vkid2h`,
  `vkid2x`… ; ils vont chacun dans leur rond au calibrage. `&vkid2leave=20` (ou `vkid1leave`) : un enfant s'en va
  après 20 s. Le titre donne aussi `duo` : inversions de joueurs et images où l'un n'est plus vu.
- À deux, si un enfant s'en va : pause « revenez à deux… ou lève les bras pour continuer seul » ; l'autre continue
  seul (le petit sorcier l'imite), et l'enfant parti reprend sa place dès qu'il revient 1,5 s devant la caméra.
- Jeux miroir à deux : il suffit qu'UN des enfants fasse le geste (poses, lancers comptent pour les deux) ;
  à la grande course, leurs pas comptent ensemble.

## Difficulté qui s'adapte, musique des jeux miroir, coudes
- La difficulté s'adapte à l'enfant sans rien lui dire : une épreuve ratée ralentit la suite et élargit un peu les
  cibles, deux réussites parfaites accélèrent (entre 0,85 et 1,4 fois la vitesse choisie par les parents ; `?noadapt=1`
  pour la couper).
- Chaque jeu miroir a sa musique.
- Personnages KayKit (Mage, Chevalier, Barbare, Voleurs) : vrais coudes et genoux dans les jeux miroir (épaule → coude →
  poignet, d'après les points 3D). Les petits personnages Kenney ont des bras d'une seule pièce : ils restent tendus.

## Installation guidée (caméra, lumière, place)
- Au calibrage, le jeu dit précisément ce qui gêne, dans l'ordre : trop sombre, trop de lumière derrière l'enfant
  (contre-jour, mesuré sur l'image de la caméra), trop près (mains qui sortent de l'image bras tendus), tête coupée
  (« penche l'écran vers le haut »), pas au milieu, enfant mal vu (plus de lumière, habits qui changent du mur).
  Titre pour l'enfant, conseil pour les parents en bas, phrase dite. Au plus 10 s de conseils, puis on joue quand même.
- Pendant le jeu : petit voyant orange (« 👣 Recule un peu », « 💡 Plus de lumière ! »…) quand la détection devient
  mauvaise 2,5 s de suite ; la phrase est dite au plus une fois par minute. Conseils : `SETUP_TIPS` dans `js/pose.js`.
- Testé avec l'enfant virtuel, qui obéit aux conseils (« recule », « décale-toi ») : `&vkidd=0.9` (trop près),
  `&vkidx=0.9` (pas au milieu), `&vkidcam=0.6&vkidtilt=-12` (tête coupée), `&vkidapproach=10` (s'approche en jouant).

## Utilisation dans Odoo
- **Joueurs** : un profil par enfant (prénom, couleur, photo, année de naissance, mode petit). On peut aussi ajouter un
  enfant directement dans le jeu (« + Ajouter un enfant »).
- **▶ Jouer** : ouvre le jeu (`/warmup`) dans un nouvel onglet ; « Qui joue ? » puis un monde.
- **Parties** : historique, graphique de progression et tableau croisé. Les parties jouées dans les anciens mondes
  (avant la refonte) restent lisibles, avec le libellé « (ancien) ».
- **Grimoires** : créatures devenues amies de chaque joueur.
- **Configuration › Séquences d'échauffement** : modifier ou créer les programmes des 8 mondes (épreuve, répétitions,
  durées, poses, gestes de la danse `armsUp,squat,left,right`…). S'il y a plusieurs séquences pour un monde, le jeu
  propose de choisir. La grande course se joue toujours en une manche.
- Mise à jour depuis une version d'avant les 8 mondes (migration 20.0.21) : les étapes des types supprimés et les
  séquences des anciens mondes sont effacées, les anciennes séquences par défaut sont remplacées par les nouvelles ;
  les séquences perso des parents (autre nom) sont gardées avec leurs étapes encore valides.

## Webcam de portable
- Les mains sont placées à l'écran d'après la longueur de bras d'un enfant : les mains atteignent les
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
**Mode test (sans caméra)** : ouvrir le jeu avec par exemple `index.html?world=banquise&step=freeze` lance directement
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
`index.html?replay=recordings/<fichier>.json` : la même partie se rejoue sans caméra (même parcours) et
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
