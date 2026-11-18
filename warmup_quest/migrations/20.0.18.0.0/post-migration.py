"""Jeux miroir (Mur Magique, 1, 2, 3 Nuage Grognon, Pimprenelle a dit, boules de neige, potions, duel, tir à la corde,
équilibriste, course de balais, photos) dans les cours et les aventures, et la nouvelle Salle des Défis.

On ne remplace une séquence que si elle a encore exactement les épreuves, nombres et durées d'origine (une séquence
modifiée par un parent est gardée telle quelle) ; la Salle des Défis reçoit sa séquence si elle n'en a pas."""
from odoo import SUPERUSER_ID, api

from odoo.addons.warmup_quest.hooks import DEFAULT_SEQUENCES, NO_FUN, _with_boss, _with_fun, post_init_hook

# Parcours par défaut d'avant : (épreuve, nombre, durée) dans l'ordre (None : valeur non fixée par le parcours)
OLD_STEPS = {
    'jardin3d': (('rest', None, 4), ('act_grow', 3, None), ('catch', None, 10), ('bubbles', 6, 10), ('act_grow', 3, None), ('pose', None, None), ('moles', 6, 12), ('freeze', None, 14), ('act_grow', 4, None), ('boss', None, None), ('rest', None, 3)),
    'disco': (('rest', None, 4), ('dance', None, None), ('dance', None, None), ('freeze', None, 14), ('dance', None, None), ('dance', None, None), ('boss', None, None), ('rest', None, 3)),
    'dojo': (('rest', None, 4), ('karate', None, None), ('karate', None, None), ('pose', None, None), ('karate', None, None), ('moles', 6, 12), ('karate', None, None), ('boss', None, None), ('rest', None, 3)),
    'verger': (('rest', None, 4), ('slice', 8, 14), ('jump', 2, None), ('slice', 10, 14), ('pose', None, None), ('squat', 2, None), ('slice', 12, 16), ('pose', None, None), ('slice', 10, 14), ('boss', None, None), ('rest', None, 3)),
    'singes': (('rest', None, 4), ('foam', 6, 16), ('jump', 2, None), ('run', None, 6), ('foam', 8, 18), ('pose', None, None), ('squat', 2, None), ('foam', 8, 18), ('catch', None, 10), ('foam', 10, 20), ('boss', None, None), ('rest', None, 3)),
    'sortileges': (('rest', None, 4), ('wand', 3, 16), ('run', None, 6), ('jump', 2, None), ('pose', None, None), ('wand', 4, 18), ('squat', 2, None), ('bubbles', 6, 10), ('wand', 5, 20), ('catch', None, 10), ('boss', None, None), ('rest', None, 3)),
    'stade': (('rest', None, 4), ('run', None, 6), ('goal', 5, None), ('jump', 2, None), ('basket', 3, None), ('squat', 2, None), ('kick', 4, None), ('pose', None, None), ('goal', 6, None), ('left', None, None), ('right', None, None), ('basket', 3, None), ('kick', 4, None), ('boss', None, None), ('rest', None, 3)),
    'banquise': (('rest', None, 4), ('act_clap', 3, None), ('tunnel', None, 4), ('catch', None, 10), ('rope', 3, None), ('act_clap', 4, None), ('smash', 2, None), ('bubbles', 6, 10), ('freeze', None, 14), ('posemix', None, None), ('act_clap', 4, None), ('boss', None, None), ('rest', None, 3)),
    'chateau': (('rest', None, 4), ('run', None, 6), ('pose', None, None), ('jump', 1, None), ('tunnel', None, 4), ('squat', 1, None), ('catch', None, 10), ('left', None, None), ('right', None, None), ('moles', 6, 12), ('bubbles', 6, 10), ('smash', 2, None), ('pose', None, None), ('slice', 6, 12), ('combo', None, None), ('rope', 3, None), ('posemix', None, None), ('freeze', None, 14), ('pose', None, None), ('run', None, 6), ('boss', None, None), ('rest', None, 3)),
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
    post_init_hook(env)  # (la Salle des Défis, qui n'a pas encore de séquence)
