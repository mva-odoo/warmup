"""L'histoire de l'Académie des Petits Mages : nouveaux textes d'ouverture et de fin des séquences par défaut.

On ne remplace que les textes encore identiques à ceux d'origine (un texte modifié par un parent est gardé)."""
from odoo import SUPERUSER_ID, api

STORY = {'jardin3d': {'old': ['Prêt ? On découvre le jardin !', 'Bravo ! Respire bien…'], 'new': ["Cours de botanique ! Bouton, le jardinier, te fait visiter le jardin magique de l'Académie.", 'Bravo, petit sorcier ! Respire le parfum des fleurs…']},
    'disco': {'old': ['Prêt ? Musique !', 'Bravo ! Salue le public…'], 'new': ['Cours de danse ! Chez les petits sorciers, on danse pour lancer des sorts. Musique !', 'Bravo ! Salue la classe…']},
    'dojo': {'old': ['Salue le maître… Prêt ? Kiaï !', 'Salue le maître… et respire.'], 'new': ['Cours de défense avec Maître Bambou : on apprend à arrêter les mauvais sorts. Salue le maître… Kiaï !', 'Salue le maître… et respire.']},
    'verger': {'old': ['Prêt, petit ninja ? Les fruits arrivent !', 'Bravo ninja ! Respire bien…'], 'new': ['Atelier des potions ! Kiwi a besoin de fruits magiques coupés en deux pour sa potion. Prêt ?', 'La potion bouillonne… Bravo ! Respire bien.']},
    'stade': {'old': ['Bienvenue au stade ! Échauffe-toi avec les créatures…', 'Fin du match ! Respire bien, champion…'], 'new': ["Dring ! C'est la récré ! On joue au ballon avec les créatures de l'Académie.", 'Dring ! La récré est finie. Respire bien, champion…']},
    'singes': {'old': ['Chut… des singes farceurs se cachent dans la jungle !', 'Bravo ! Tout est propre… respire bien.'], 'new': ["Oh non ! Le Nuage Grognon a ensorcelé les singes de l'Académie : ils couvrent les vitres de la tour de mousse !", 'Bravo ! La tour brille… respire bien.']},
    'supermarche': {'old': ['Bienvenue au Super Marché ! Prends ton caddie…', 'Les courses sont faites ! Respire bien…'], 'new': ["Au marché aux ingrédients ! Remplis ton caddie pour l'atelier des potions… et attention aux chapardeurs !", 'Les courses sont faites ! Respire bien…']},
    'sortileges': {'old': ['Chut… le Nuage Grognon rôde dans le bois. Prépare ta baguette !', 'Bravo, magicien ! Respire bien…'], 'new': ["Ta première aventure hors de l'Académie ! Chut… le Nuage Grognon rôde dans le bois. Prépare ta baguette !", 'Bravo, petit sorcier ! Respire bien…']},
    'forest': {'old': ['Prêt ? On imite Lumi !', 'Magnifique… respire comme Lumi.'], 'new': ["Le portail magique t'emmène dans la Vallée des Créatures. Le Nuage Grognon les a effrayées : imite-les pour devenir leur ami !", 'Magnifique… respire comme Lumi.']},
    'banquise': {'old': ['Prêt ? On glisse !', 'Bravo ! Souffle comme le vent du nord…'], 'new': ['Brrr ! Le Nuage Grognon a soufflé un vent glacé sur la banquise. Bouge bien pour la réchauffer !', 'Bravo ! Souffle comme le vent du nord…']},
    'ocean': {'old': ['Prêt ? On plonge !', 'Super ! Respire comme une baleine…'], 'new': ["Le portail magique s'ouvre… sous la mer ! Le Nuage Grognon a fait peur aux créatures de l'océan. On plonge !", 'Super ! Respire comme une baleine…']},
    'dinos': {'old': ["Prêt ? Les dinos t'attendent !", 'Bravo ! Respire comme un grand dino…'], 'new': ['Le Nuage Grognon a caché les œufs de la Vallée des Dinos ! Aide Croc à les retrouver.', 'Bravo ! Respire comme un grand dino…']},
    'espace': {'old': ['Prêt pour le décollage ? 3, 2, 1…', 'Atterrissage en douceur… respire.'], 'new': ["Le portail magique t'envoie dans l'espace ! Le Nuage Grognon a éteint les étoiles. 3, 2, 1… décollage !", 'Atterrissage en douceur… respire.']},
    'chateau': {'old': ['Prêt ? Abracadabra !', 'Magnifique ! Fais une révérence…'], 'new': ["Voici le château du Nuage Grognon ! C'est la dernière aventure. Courage, petit sorcier !", 'Le ciel est tout bleu… Magnifique ! Fais une révérence.']}}


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    for seq in env['warmup.sequence'].with_context(active_test=False).search([('world', 'in', list(STORY))]):
        rests = seq.step_ids.filtered(lambda s: s.move == 'rest')
        if not rests:
            continue
        old, new = STORY[seq.world]['old'], STORY[seq.world]['new']
        first, last = rests[0], rests[-1]
        if first.text == old[0]:
            first.write({'text': new[0], 'duration': max(first.duration, 4)})
        if last != first and last.text == old[1]:
            last.text = new[1]
