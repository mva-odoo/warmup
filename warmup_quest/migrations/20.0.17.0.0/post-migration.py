"""Un jeu sur place par pays (fleurs, pingouins, dauphins, fusée, œufs de dino, animaux) : nouveaux parcours par défaut.

On ne remplace une séquence que si elle a encore exactement les épreuves, nombres et durées d'origine (une séquence modifiée
par un parent est gardée telle quelle)."""
from odoo import SUPERUSER_ID, api

from odoo.addons.warmup_quest.hooks import DEFAULT_SEQUENCES, NO_FUN, _with_boss, _with_fun

# Anciens parcours par défaut : (épreuve, nombre, durée) dans l'ordre (None : valeur non fixée par le parcours)
OLD_STEPS = {
    'jardin3d': (('rest', None, 4), ('run', None, 6), ('jump', 1, None), ('catch', None, 10), ('tunnel', None, 4), ('squat', 1, None), ('pose', None, None), ('left', None, None), ('right', None, None), ('moles', 6, 12), ('rope', 3, None), ('smash', 2, None), ('slice', 6, 12), ('bubbles', 6, 10), ('combo', None, None), ('posemix', None, None), ('pose', None, None), ('freeze', None, 14), ('run', None, 6), ('boss', None, None), ('rest', None, 3)),
    'forest': (('rest', None, 4), ('run', None, 5), ('pose', None, None), ('pose', None, None), ('squat', 1, None), ('jump', 1, None), ('tunnel', None, 4), ('pose', None, None), ('left', None, None), ('right', None, None), ('pose', None, None), ('bubbles', 6, 10), ('run', None, 6), ('moles', 6, 12), ('catch', None, 10), ('freeze', None, 14), ('combo', None, None), ('pose', None, None), ('cubes', 10, None), ('smash', 2, None), ('combo', None, None), ('pose', None, None), ('posemix', None, None), ('run', None, 6), ('squat', 2, None), ('jump', 2, None), ('pose', None, None), ('combo', None, None), ('boss', None, None), ('rest', None, 3)),
    'banquise': (('rest', None, 4), ('run', None, 6), ('jump', 1, None), ('catch', None, 10), ('tunnel', None, 4), ('squat', 1, None), ('left', None, None), ('right', None, None), ('pose', None, None), ('moles', 6, 12), ('rope', 3, None), ('bubbles', 6, 10), ('smash', 2, None), ('slice', 6, 12), ('combo', None, None), ('freeze', None, 14), ('posemix', None, None), ('pose', None, None), ('run', None, 6), ('catch', None, 8), ('boss', None, None), ('rest', None, 3)),
    'ocean': (('rest', None, 4), ('bubbles', 8, 12), ('run', None, 6), ('squat', 1, None), ('tunnel', None, 4), ('jump', 1, None), ('catch', None, 10), ('pose', None, None), ('left', None, None), ('moles', 6, 12), ('right', None, None), ('smash', 2, None), ('bubbles', 6, 10), ('cubes', 10, None), ('combo', None, None), ('freeze', None, 14), ('posemix', None, None), ('pose', None, None), ('rope', 3, None), ('run', None, 6), ('boss', None, None), ('rest', None, 3)),
    'espace': (('rest', None, 4), ('jump', 1, None), ('catch', None, 12), ('run', None, 6), ('tunnel', None, 4), ('squat', 1, None), ('pose', None, None), ('left', None, None), ('right', None, None), ('moles', 6, 12), ('rope', 4, None), ('smash', 2, None), ('bubbles', 6, 10), ('slice', 6, 12), ('combo', None, None), ('freeze', None, 14), ('posemix', None, None), ('pose', None, None), ('catch', None, 10), ('jump', 2, None), ('boss', None, None), ('rest', None, 3)),
    'dinos': (('rest', None, 4), ('jump', 1, None), ('run', None, 6), ('jump', 2, None), ('tunnel', None, 4), ('squat', 1, None), ('smash', 2, None), ('pose', None, None), ('catch', None, 10), ('moles', 6, 12), ('left', None, None), ('right', None, None), ('rope', 4, None), ('cubes', 10, None), ('combo', None, None), ('freeze', None, 14), ('posemix', None, None), ('pose', None, None), ('bubbles', 6, 10), ('run', None, 6), ('boss', None, None), ('rest', None, 3)),
}


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    new = {w: _with_boss(st if w in NO_FUN else _with_fun(st, w), w) for w, _n, st in DEFAULT_SEQUENCES if w in OLD_STEPS}
    for seq in env['warmup.sequence'].with_context(active_test=False).search([('world', 'in', list(OLD_STEPS))]):
        steps, old = seq.step_ids.sorted('sequence'), OLD_STEPS[seq.world]
        if len(steps) != len(old) or any(st.move != m or (n is not None and st.count != n) or (d is not None and abs(st.duration - d) > 0.01)
                                         for st, (m, n, d) in zip(steps, old)):
            continue
        seq.step_ids.unlink()
        seq.write({'step_ids': [(0, 0, dict(step, sequence=(i + 1) * 10)) for i, step in enumerate(new[seq.world])]})
