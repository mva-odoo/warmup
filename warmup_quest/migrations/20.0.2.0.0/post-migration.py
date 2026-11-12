"""Ajoute le tunnel, les taupes et une suite de poses aux séquences par défaut existantes."""
from odoo import SUPERUSER_ID, api

from odoo.addons.warmup_quest.hooks import DEFAULT_SEQUENCES, FUN_STEPS


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    names = [name for _world, name, _steps in DEFAULT_SEQUENCES]
    for seq in env['warmup.sequence'].with_context(active_test=False).search([('name', 'in', names)]):
        steps = seq.step_ids.sorted('sequence')
        if not steps or steps.filtered(lambda s: s.move in ('tunnel', 'moles', 'posemix')):
            continue
        n = len(steps)
        cmds = []
        for step, frac in zip(FUN_STEPS, (0.25, 0.5, 0.75)):
            cmds.append((0, 0, dict(step, sequence=steps[min(n - 1, int(n * frac))].sequence - 1)))
        seq.write({'step_ids': cmds})
