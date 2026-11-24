{
    'name': 'Warm-Up Quest (module importable)',
    'version': '20.0.1.0.0',
    'summary': "Jeu d'échauffement pour enfants contrôlé par webcam — version sans Python, à importer",
    'description': """
Warm-Up Quest, en module de données (XML + fichiers statiques, sans Python) : il s'installe avec
« Applications › Importer un module », y compris sur Odoo Online.

8 mondes à thème (Stade, Magasin, Bain, Château, Banquise, Dinos, Espace, Disco), commandes aux bras,
profils des enfants, historique des parties, créatures amies, gommettes, séquences modifiables, studio voix.
La détection des mouvements tourne dans le navigateur : aucune image n'est envoyée au serveur.

Le jeu : menu Warm-Up Quest › ▶ Jouer (page /website/action/warmup, utilisateur connecté). Dépend du module Site web,\npour cette page (comme runner_live).
La webcam nécessite qu'Odoo soit servi en HTTPS (ou sur localhost).
""",
    'author': 'mva-odoo',
    'category': 'Productivity',
    'license': 'LGPL-3',
    'depends': ['website'],
    'data': [
        'data/models.xml',
        'security/access.xml',
        'data/creatures.xml',
        'data/sequences.xml',
        'data/page.xml',
        'data/actions.xml',
        'views/views.xml',
        'views/menus.xml',
    ],
    'application': True,
    'installable': True,
}
