{
    'name': 'Warm-Up Quest',
    'version': '20.0.5.0.0',
    'summary': "Jeu d'échauffement pour enfants contrôlé par webcam (détection des mouvements)",
    'description': """
Warm-Up Quest
=============
Un jeu d'échauffement où l'enfant court, saute, s'accroupit, va à gauche / à droite,
fait des smashs et imite des poses devant la webcam. La détection des mouvements
(MediaPipe Pose) tourne dans le navigateur : aucune image n'est envoyée au serveur.

Le module ajoute :
* des profils de joueurs (un par enfant) ;
* des séquences d'échauffement modifiables (étapes, durées, poses, combos) ;
* l'historique des parties (score, étoiles, durée…) avec graphiques ;
* le carnet des créatures de chaque joueur ;
* le jeu lui-même, accessible depuis le menu (/warmup).

La webcam nécessite que Odoo soit servi en HTTPS (ou sur localhost).
""",
    'author': 'Warm-Up Quest',
    'category': 'Productivity',
    'license': 'LGPL-3',
    'depends': ['base', 'web'],
    'data': [
        'security/ir.access.csv',
        'data/warmup_creature_data.xml',
        'views/warmup_player_views.xml',
        'views/warmup_sequence_views.xml',
        'views/warmup_session_views.xml',
        'views/warmup_creature_views.xml',
        'views/warmup_menus.xml',
    ],
    'post_init_hook': 'post_init_hook',
    'application': True,
    'installable': True,
}
