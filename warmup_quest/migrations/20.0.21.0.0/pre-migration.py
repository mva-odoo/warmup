"""Refonte « mondes à thème » : 8 mondes, moins de types d'étape.

Avant la mise à jour des champs Selection (sinon les valeurs retirées bloqueraient la mise à jour) :
- les étapes d'un type supprimé (combo, corde, boss, karaté, baguette, basket…) sont effacées ;
- les séquences des anciens mondes sont effacées. Les parties gardent leur monde (libellé « (ancien) ») ;
  leur lien vers la séquence passe à vide.
Pas d'import du module ici : ce script doit rester valable même si le code change encore."""

KEPT_MOVES = (
    'run', 'jump', 'squat', 'smash', 'left', 'right', 'pose', 'rest', 'bubbles', 'freeze', 'catch', 'tunnel', 'moles',
    'shop', 'foam', 'slice', 'cubes', 'dance', 'goal', 'kick',
    'act_shelf', 'act_clap', 'act_swim', 'act_launch', 'act_stomp',
    'arena_mur', 'arena_pimprenelle', 'arena_neige', 'arena_course',
)
ACTIVE_WORLDS = ('stade', 'supermarche', 'singes', 'chateau', 'banquise', 'dinos', 'espace', 'disco')


def migrate(cr, version):
    if not version:
        return
    cr.execute("DELETE FROM warmup_step WHERE move NOT IN %s", [KEPT_MOVES])
    cr.execute("""UPDATE warmup_session SET sequence_id = NULL
                   WHERE sequence_id IN (SELECT id FROM warmup_sequence WHERE world NOT IN %s)""", [ACTIVE_WORLDS])
    cr.execute("DELETE FROM warmup_step WHERE sequence_id IN (SELECT id FROM warmup_sequence WHERE world NOT IN %s)",
               [ACTIVE_WORLDS])
    cr.execute("DELETE FROM warmup_sequence WHERE world NOT IN %s", [ACTIVE_WORLDS])
