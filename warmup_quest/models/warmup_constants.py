WORLDS = [
    ('jardin3d', 'Jardin Fleuri'),
    ('turbo', 'Vallée Turbo'),
    ('island', 'Île Bondissante'),
    ('forest', 'Monde des Créatures'),
    ('banquise', 'Banquise Glacée'),
    ('ocean', "Fond de l'Océan"),
    ('espace', "Voyage dans l'Espace"),
    ('bonbons', 'Pays des Bonbons'),
    ('ferme', 'La Ferme Joyeuse'),
    ('dinos', 'Vallée des Dinos'),
    ('chateau', 'Château Enchanté'),
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
]

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
