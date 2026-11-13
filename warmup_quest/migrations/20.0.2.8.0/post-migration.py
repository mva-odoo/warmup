"""Les séquences par défaut des mondes classiques reçoivent les nouveaux jeux (fruits ou cubes)."""
from odoo import SUPERUSER_ID, api

from odoo.addons.warmup_quest.hooks import DEFAULT_SEQUENCES, NO_FUN, _new_game


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    for world, name, _steps in DEFAULT_SEQUENCES:
        if world in NO_FUN:
            continue
        for seq in env['warmup.sequence'].with_context(active_test=False).search([('world', '=', world), ('name', '=', name)]):
            steps = seq.step_ids.sorted('sequence')
            if not steps or steps.filtered(lambda s: s.move in ('slice', 'cubes')):
                continue
            at = steps[min(len(steps) - 1, round(len(steps) * 0.62))]
            seq.write({'step_ids': [(0, 0, dict(_new_game(world), sequence=at.sequence - 1))]})
