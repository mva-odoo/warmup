# Les 8 mondes à thème (tous ouverts), dans l'ordre du menu du jeu
ACTIVE_WORLDS = [
    ('stade', 'Le Stade ⚽'),
    ('supermarche', 'Le Magasin 🛒'),
    ('singes', 'Le Bain 🛁'),
    ('chateau', 'Le Château 🏰'),
    ('banquise', 'La Banquise ❄️'),
    ('dinos', 'Les Dinos 🦖'),
    ('espace', "L'Espace 🚀"),
    ('disco', 'La Disco 🪩'),
]
# Anciens mondes : plus dans le jeu, gardés seulement pour lire l'historique des parties
OLD_WORLDS = [
    ('ecole', "Premier jour à l'Académie (ancien)"),
    ('jardin3d', "Le Jardin de l'Académie (ancien)"),
    ('dojo', 'Cours de défense (ancien)'),
    ('verger', 'Atelier des potions (ancien)'),
    ('sortileges', 'Le Bois des Sortilèges (ancien)'),
    ('forest', 'La Vallée des Créatures (ancien)'),
    ('ocean', "Le Fond de l'Océan (ancien)"),
    ('defis', 'La Salle des Défis (ancien)'),
    ('libre', 'Jouer tout de suite (ancien)'),
    ('turbo', 'Vallée Turbo (ancien)'),
    ('island', 'Île Bondissante (ancien)'),
    ('bonbons', 'Pays des Bonbons (ancien)'),
    ('ferme', 'La Ferme Joyeuse (ancien)'),
    ('rythmo', 'Planète Rythmo (ancien)'),
]
WORLDS = ACTIVE_WORLDS + OLD_WORLDS
ACTIVE_WORLD_IDS = [w for w, _label in ACTIVE_WORLDS]

MOVES = [
    ('run', 'Éviter les obstacles'),  # code « run » gardé pour les séquences existantes
    ('jump', 'Sauter'),
    ('squat', 'Se baisser'),
    ('smash', 'Taper (bras en haut puis en bas)'),
    ('left', 'Aller à gauche'),
    ('right', 'Aller à droite'),
    ('pose', 'Pose à tenir'),
    ('rest', 'Pause / respiration'),
    ('bubbles', 'Éclater des bulles'),
    ('freeze', 'Statues musicales'),
    ('catch', 'Attraper les étoiles'),
    ('tunnel', 'Rester baissé dans le tunnel'),
    ('moles', 'Taper les taupes'),
    ('shop', 'Remplir le caddie'),
    ('foam', 'Nettoyer la mousse des singes'),
    ('slice', 'Couper les fruits'),
    ('cubes', 'Taper les cubes en rythme'),
    ('dance', 'Danser comme Tempo'),
    ('goal', 'Gardien de but (arrêter les tirs)'),
    ('kick', 'Penalty (genou levé, ou lancer à la main)'),
    # Jeux sur place (le code « act_… » devient { m: 'act', game: … } dans le jeu)
    ('act_shelf', 'Ranger les rayons (accroupi, puis bras levés)'),
    ('act_clap', 'Réchauffer les pingouins (taper dans les mains)'),
    ('act_swim', "Nager (un bras puis l'autre)"),
    ('act_launch', 'Faire décoller la fusée (rester accroupi, puis sauter)'),
    ('act_stomp', 'Marcher comme un dino (genoux levés)'),
    # Jeux miroir (scène fixe, l'enfant se voit à l'écran ; le code « arena_… » devient { m: 'arena', game: … })
    ('arena_mur', 'Le Mur Magique (prendre la pose du trou)'),
    ('arena_pimprenelle', 'Pimprenelle a dit'),
    ('arena_neige', 'Bataille de boules de neige'),
    ('arena_course', 'La grande course (courir sur place, une manche)'),
]

# Jeux miroir : secondes par unité (même valeur que ARENA dans worlds.js)
ARENA_SECONDS = {'mur': 4.2, 'pimprenelle': 4.5, 'neige': 3.2, 'course': 24}

# Jeux sur place : secondes par réussite (même valeur que ACTS dans worlds.js)
ACT_SECONDS = {'shelf': 5, 'clap': 4.5, 'swim': 1.5, 'launch': 6.5, 'stomp': 5}

# Gestes que Tempo (la danse) peut demander
MIMIC_MOVES = {
    'armsUp': "Bras en l'air", 'airplane': "L'avion", 'star': "L'étoile", 'flamingo': 'Genou levé',
    'squat': 'Accroupi', 'left': 'À gauche', 'right': 'À droite', 'jump': 'Saut', 'smash': 'Frappe',
}

POSES = [
    ('armsUp', "Bras en l'air"),
    ('airplane', "L'avion"),
    ('star', "L'étoile"),
    ('flamingo', 'Le flamant (sur un pied)'),
]

DETECTION_MODES = [
    ('full', 'Corps entier'),
    ('knees', "Jusqu'aux genoux"),
    ('upper', 'Haut du corps'),
]

SPEEDS = [
    ('easy', 'Facile'),
    ('normal', 'Normal'),
    ('fast', 'Rapide'),
]
