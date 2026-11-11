"""Ajoute « Éclater des bulles » et « Statues musicales » aux séquences par défaut existantes."""
from odoo import SUPERUSER_ID, api

from odoo.addons.warmup_quest.hooks import DEFAULT_SEQUENCES


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    default_names = {name for _world, name, _steps in DEFAULT_SEQUENCES}
    sequences = env['warmup.sequence'].with_context(active_test=False).search([('name', 'in', list(default_names))])
    for seq in sequences:
        steps = seq.step_ids.sorted('sequence')
        if not steps or steps.filtered(lambda s: s.move in ('bubbles', 'freeze')):
            continue
        # Bulles vers le premier tiers, statues vers les deux tiers
        at_bubbles = steps[len(steps) // 3].sequence - 1
        at_freeze = steps[(2 * len(steps)) // 3].sequence - 1
        seq.write({'step_ids': [
            (0, 0, {'move': 'bubbles', 'duration': 10, 'count': 6, 'sequence': at_bubbles}),
            (0, 0, {'move': 'freeze', 'duration': 14, 'sequence': at_freeze}),
        ]})
