"""Le gardien de fin de monde est ajouté aux séquences par défaut existantes (avant la respiration finale)."""
from odoo import SUPERUSER_ID, api

from odoo.addons.warmup_quest.hooks import DEFAULT_SEQUENCES, _boss_step


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    for world, name, _steps in DEFAULT_SEQUENCES:
        for seq in env['warmup.sequence'].with_context(active_test=False).search([('world', '=', world), ('name', '=', name)]):
            steps = seq.step_ids.sorted('sequence')
            if not steps or steps.filtered(lambda s: s.move == 'boss'):
                continue
            last = steps[-1]
            seq.write({'step_ids': [(0, 0, dict(_boss_step(world), sequence=last.sequence - 1))]})
