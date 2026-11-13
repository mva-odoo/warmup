"""Les amis du héros deviennent des animaux (pack Cube Pets) : noms, éléments et couleurs mis à jour.
Les codes ne changent pas : les carnets des enfants sont conservés."""
from odoo import SUPERUSER_ID, api

CREATURES = {
    'flammeche': ('Flammèche', 'Feu', '#ff7b39'),
    'gouttin': ('Gouttin', 'Eau', '#4ea8ff'),
    'feuillou': ('Feuillou', 'Plante', '#5cc96b'),
    'volticube': ('Voltiplume', 'Air', '#7c8cff'),
    'rocaille': ('Rocaille', 'Roche', '#a3958a'),
    'nuagon': ('Nuagon', 'Air', '#ffe066'),
    'givrette': ('Givrette', 'Glace', '#9fe8f5'),
    'nocturne': ('Nocturne', 'Nuit', '#8d99ae'),
    'sablou': ('Sablou', 'Sable', '#e9c46a'),
    'coraline': ('Coraline', 'Eau', '#ff8fab'),
    'braisou': ('Braisou', 'Feu', '#f77f00'),
    'petalune': ('Pétalune', 'Fée', '#cdb4db'),
    'cosmino': ('Cosmino', 'Étoile', '#80ed99'),
    'sucrette': ('Sucrette', 'Sucre', '#d4a373'),
    'laineton': ('Meuglou', 'Ferme', '#8d99ae'),
    'lucibulle': ('Lucibulle', 'Lumière', '#b5e48c'),
    'lamalou': ('Girafou', 'Savane', '#f1c453'),
    'bzouille': ('Bzouille', 'Insecte', '#ffbe0b'),
    'glouglou': ('Glouglou', 'Eau', '#a47148'),
    'rocheron': ('Rocheron', 'Roche', '#8d99ae'),
    'dragounet': ('Rugissou', 'Feu', '#e9a23b'),
    'champilou': ('Grimpilou', 'Plante', '#a47148'),
    'gelouille': ('Rosinou', 'Ferme', '#ffafcc'),
    'bonbloub': ('Croquenoix', 'Sucre', '#e63946'),
    'piquito': ('Pandou', 'Plante', '#f8f9fa'),
    'calmaron': ('Toufou', 'Normal', '#c08552'),
    'tourbillon': ('Tourbillon', 'Glace', '#e9f5ff'),
    'fantomi': ('Fantômi', 'Nuit', '#e0e1dd'),
    'minouille': ('Minouille', 'Normal', '#f4a261'),
    'poilu': ('Poilu', 'Glace', '#a47148'),
}


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    for creature in env['warmup.creature'].with_context(active_test=False).search([('code', 'in', list(CREATURES))]):
        name, element, color = CREATURES[creature.code]
        creature.write({'name': name, 'element': element, 'color': color})
