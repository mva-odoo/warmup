# Mondes : l'histoire de l'Académie des Petits Mages (les cours, puis les aventures). Les anciennes îles restent
# pour l'historique des parties, mais ne sont plus sur la carte du jeu.
WORLDS = [
    ('ecole', "Premier jour à l'Académie"),
    ('jardin3d', "Le Jardin de l'Académie"),
    ('disco', 'Cours de danse magique'),
    ('dojo', 'Cours de défense'),
    ('verger', 'Atelier des potions'),
    ('stade', 'La Récré'),
    ('singes', 'La Tour des Singes farceurs'),
    ('supermarche', 'Le Marché aux ingrédients'),
    ('sortileges', 'Le Bois des Sortilèges'),
    ('forest', 'La Vallée des Créatures'),
    ('banquise', 'La Banquise Glacée'),
    ('ocean', "Le Fond de l'Océan"),
    ('dinos', 'La Vallée des Dinos'),
    ('espace', "Voyage dans l'Espace"),
    ('chateau', 'Le Château du Nuage Grognon'),
    ('defis', 'La Salle des Défis'),
    ('libre', 'Jouer tout de suite (mini-jeux)'),
    ('turbo', 'Vallée Turbo (ancienne île)'),
    ('island', 'Île Bondissante (ancienne île)'),
    ('bonbons', 'Pays des Bonbons (ancienne île)'),
    ('ferme', 'La Ferme Joyeuse (ancienne île)'),
    ('rythmo', 'Planète Rythmo (ancienne île)'),
]

MOVES = [
    ('run', 'Éviter les obstacles'),  # code « run » gardé pour les séquences existantes
    ('jump', 'Sauter'),
    ('squat', 'Se baisser'),
    ('smash', 'Taper (bras en haut puis en bas)'),
    ('left', 'Aller à gauche'),
    ('right', 'Aller à droite'),
    ('pose', 'Pose à tenir'),
    ('combo', 'Combo'),
    ('rest', 'Pause / respiration'),
    ('bubbles', 'Éclater des bulles'),
    ('freeze', 'Statues musicales'),
    ('catch', 'Attraper les étoiles'),
    ('rope', 'Sauter à la corde'),
    ('tunnel', 'Rester baissé dans le tunnel'),
    ('moles', 'Taper les taupes'),
    ('posemix', 'Copier une suite de poses'),
    ('dance', 'Danser comme Tempo'),
    ('karate', 'Imiter le maître karatéka'),
    ('slice', 'Couper les fruits'),
    ('cubes', 'Taper les cubes en rythme'),
    ('boss', 'Gardien du monde (copier ses poses)'),
    ('ball', 'Passe de ballon (à deux)'),
    ('shop', 'Remplir le caddie (supermarché)'),
    ('foam', 'Laver la vitre (mousse des singes)'),
    ('wand', 'Baguette magique (libérer les créatures ensorcelées)'),
    ('goal', 'Gardien de but (arrêter les tirs)'),
    ('basket', 'Basket (attraper puis tirer)'),
    ('kick', 'Penalty (genou levé, ou lancer à la main)'),
    # Jeux sur place : un par pays (le code « act_… » devient { m: 'act', game: … } dans le jeu)
    ('act_grow', 'Faire pousser les fleurs (accroupi, puis bras levés)'),
    ('act_clap', 'Réchauffer les pingouins (taper dans les mains)'),
    ('act_swim', "Nager avec les dauphins (un bras puis l'autre)"),
    ('act_launch', 'Faire décoller la fusée (rester accroupi, puis sauter)'),
    ('act_stomp', 'Marcher comme un dino (genoux levés)'),
    ('act_animals', 'Imiter les animaux'),
    # Jeux miroir (scène fixe, l'enfant se voit à l'écran ; le code « arena_… » devient { m: 'arena', game: … })
    ('arena_mur', 'Le Mur Magique (prendre la pose du trou)'),
    ('arena_soleil', '1, 2, 3… Nuage Grognon (statue quand il regarde)'),
    ('arena_pimprenelle', 'Pimprenelle a dit'),
    ('arena_neige', 'Bataille de boules de neige'),
    ('arena_potions', 'La cuisine des potions'),
    ('arena_duel', 'Duel de sorciers'),
    ('arena_corde', 'Tir à la corde magique'),
    ('arena_equilibre', "L'équilibriste (secondes sur un pied)"),
    ('arena_balai', 'La course de balais (anneaux)'),
    ('arena_photo', 'Le miroir magique (photos rigolotes)'),
]

# Jeux miroir : secondes par unité (même valeur que ARENA dans worlds.js)
ARENA_SECONDS = {'mur': 4.2, 'soleil': 32, 'pimprenelle': 4.5, 'neige': 3.2, 'potions': 18, 'duel': 9, 'corde': 24, 'equilibre': 1.8, 'balai': 2.8, 'photo': 7}

# Jeux sur place : secondes par réussite (même valeur que ACTS dans worlds.js)
ACT_SECONDS = {'grow': 5, 'clap': 4.5, 'swim': 1.5, 'launch': 6.5, 'stomp': 5, 'animals': 5}

# Gestes que le coach (danse / karaté) peut demander
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

COMBO_PARTS = ('jump', 'squat', 'smash', 'left', 'right')

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
