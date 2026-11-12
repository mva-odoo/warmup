"""Une séquence modifiable pour chaque monde, et les étoiles / la corde dans les 3 anciennes séquences par défaut."""
from odoo import SUPERUSER_ID, api

from odoo.addons.warmup_quest.hooks import _CA, _RO, post_init_hook


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    # 1. Les mondes sans séquence reçoivent leur programme par défaut
    post_init_hook(env)
    # 2. Les anciennes séquences par défaut n'avaient ni « Attraper les étoiles » ni « Sauter à la corde »
    old = ['Échauffement Turbo', 'Échauffement Bondissant', 'Échauffement des Créatures']
    for seq in env['warmup.sequence'].with_context(active_test=False).search([('name', 'in', old)]):
        steps = seq.step_ids.sorted('sequence')
        if not steps or steps.filtered(lambda s: s.move in ('catch', 'rope')):
            continue
        n = len(steps)
        seq.write({'step_ids': [
            (0, 0, dict(_CA(10), sequence=steps[int(n * 0.4)].sequence - 1)),
            (0, 0, dict(_RO(3), sequence=steps[int(n * 0.6)].sequence - 1)),
        ]})
