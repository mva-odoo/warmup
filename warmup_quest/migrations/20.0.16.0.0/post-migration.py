"""L'histoire « Les Étoiles de l'Arc-en-ciel » : chaque aventure annonce l'Étoile cachée dans son pays.

On ne remplace que les textes d'ouverture encore identiques à ceux d'origine (un texte modifié par un parent est gardé)."""
from odoo import SUPERUSER_ID, api

INTRO = {'sortileges': ("Ta première aventure hors de l'Académie ! Chut… le Nuage Grognon rôde dans le bois. Prépare ta baguette !", "Ta première aventure ! Le Nuage Grognon a caché l'Étoile violette dans le Bois des Sortilèges. Chut… prépare ta baguette !"),
    'forest': ("Le portail magique t'emmène dans la Vallée des Créatures. Le Nuage Grognon les a effrayées : imite-les pour devenir leur ami !", "Le portail t'emmène dans la Vallée des Créatures. L'Étoile verte est cachée ici : imite les créatures, elles t'aideront à la trouver !"),
    'banquise': ('Brrr ! Le Nuage Grognon a soufflé un vent glacé sur la banquise. Bouge bien pour la réchauffer !', "Brrr ! Le Nuage Grognon a tout gelé, et il a caché l'Étoile orange sous la glace. Bouge bien pour réchauffer la banquise !"),
    'ocean': ("Le portail magique s'ouvre… sous la mer ! Le Nuage Grognon a fait peur aux créatures de l'océan. On plonge !", "Le portail s'ouvre… sous la mer ! L'Étoile bleue brille quelque part au fond de l'océan. On plonge !"),
    'dinos': ('Le Nuage Grognon a caché les œufs de la Vallée des Dinos ! Aide Croc à les retrouver.', "Dans la Vallée des Dinos, le Nuage Grognon a caché l'Étoile rouge au milieu des œufs ! Aide Croc à la retrouver."),
    'espace': ("Le portail magique t'envoie dans l'espace ! Le Nuage Grognon a éteint les étoiles. 3, 2, 1… décollage !", "Le Nuage Grognon a emporté l'Étoile jaune tout là-haut, dans l'espace ! 3, 2, 1… décollage !"),
    'chateau': ("Voici le château du Nuage Grognon ! C'est la dernière aventure. Courage, petit sorcier !", "Voici le château du Nuage Grognon. Le cœur de l'arc-en-ciel est caché ici. Courage, petit sorcier… et sois gentil avec lui !")}


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    for seq in env['warmup.sequence'].with_context(active_test=False).search([('world', 'in', list(INTRO))]):
        old, new = INTRO[seq.world]
        first = seq.step_ids.filtered(lambda s: s.move == 'rest')[:1]
        if first and first.text == old:
            first.text = new
