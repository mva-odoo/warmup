# Warm-Up Quest — module Odoo 20.0 (Community)

Jeu d'échauffement pour enfants contrôlé par webcam, intégré à Odoo.

## Installation
1. Copier le dossier `warmup_quest` dans un dossier d'addons d'Odoo (`addons_path`).
2. Redémarrer Odoo, activer le mode développeur, puis **Applications › Mettre à jour la liste des applications**.
3. Chercher « Warm-Up Quest » et cliquer sur **Activer**.

À l'installation, 3 séquences par défaut (une par monde) et les 8 créatures sont créées.

## Utilisation
- **Warm-Up Quest › Joueurs** : créer un profil par enfant (prénom, photo, couleur).
- **Warm-Up Quest › ▶ Jouer** : ouvre le jeu (`/warmup`) dans un nouvel onglet ; choisir « Qui joue ? » puis un monde.
  - **À deux (coopératif)** : cliquer sur deux prénoms. Chaque défi doit être réussi par les deux enfants ;
    la partie est enregistrée pour chacun. Il faut assez de recul pour que les deux soient entiers à l'image.
  - Les joueurs sont dessinés comme des personnages du jeu qui imitent leurs mouvements (la vidéo n'est pas affichée) ;
    touche **C** pour voir la vraie caméra et se placer. Pendant une pose, une silhouette montre la position à prendre.
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

## Mettre à jour le jeu
Le jeu est développé dans le dossier racine du projet (`index.html`, `js/`, `css/`).
Après une modification, lancer `sync-odoo.ps1` pour le recopier dans
`static/src/game/`, puis mettre à jour le module (le numéro de version sert au cache).
