from odoo import api, fields, models
from odoo.exceptions import ValidationError

from .warmup_constants import ACT_SECONDS, ACTIVE_WORLD_IDS, ARENA_SECONDS, MIMIC_MOVES, MOVES, POSES, WORLDS

# Jeux miroir qui ne se jouent qu'en une manche (même règle que game.js)
SINGLE_ROUND_ARENAS = ('arena_course',)


# Durée d'une étape en secondes (même formule que le jeu, vitesse « Normal »)
def _step_seconds(step):
    m = step.move
    if m in ('run', 'shop', 'foam', 'rest', 'bubbles', 'freeze', 'catch', 'moles', 'slice'):
        return step.duration or 0
    if m == 'goal':
        return 2.5 + 3.0 * max(1, step.count)
    if m == 'kick':
        return 2 + 4.5 * max(1, step.count)
    if m and m.startswith('act_'):
        return 4 + ACT_SECONDS.get(m[4:], 5) * max(1, step.count)
    if m and m.startswith('arena_'):
        return 5 + ARENA_SECONDS.get(m[6:], 5) * step._arena_count()
    if m == 'cubes':
        return 1.5 + (step.hold or 1.4) * max(1, step.count) + 3
    if m == 'tunnel':
        return 3 + (step.duration or 0)
    if m == 'dance':
        return 2.6 + (step.hold or 1.8) * len(step._combo_parts())
    if m == 'jump':
        return 1.8 + 1.0 * max(1, step.count)
    if m == 'squat':
        return 2.0 + 1.6 * max(1, step.count)
    if m == 'smash':
        return 2.0 + 1.2 * max(1, step.count)
    if m in ('left', 'right'):
        return 2.6
    if m == 'pose':
        return 3 + (step.hold or 1.5)
    return 0


class WarmupSequence(models.Model):
    _name = 'warmup.sequence'
    _description = "Séquence d'échauffement"
    _order = 'world, sequence, id'

    name = fields.Char(required=True, translate=True)
    world = fields.Selection(WORLDS, string='Monde', required=True)
    sequence = fields.Integer(default=10, help='La première séquence active de chaque monde est jouée par défaut.')
    description = fields.Text()
    active = fields.Boolean(default=True)
    step_ids = fields.One2many('warmup.step', 'sequence_id', string='Étapes', copy=True)
    step_count = fields.Integer(string="Nombre d'étapes", compute='_compute_stats')
    est_duration = fields.Float(string='Durée estimée (min)', compute='_compute_stats', digits=(4, 1))
    session_count = fields.Integer(string='Parties', compute='_compute_session_count')

    @api.depends('step_ids.move', 'step_ids.count', 'step_ids.duration', 'step_ids.hold', 'step_ids.combo')
    def _compute_stats(self):
        for seq in self:
            seq.step_count = len(seq.step_ids)
            total = sum(_step_seconds(s) + 0.9 for s in seq.step_ids)
            seq.est_duration = total / 60.0

    def _compute_session_count(self):
        data = self.env['warmup.session']._read_group(
            [('sequence_id', 'in', self.ids)], ['sequence_id'], ['__count'])
        counts = {seq.id: n for seq, n in data}
        for seq in self:
            seq.session_count = counts.get(seq.id, 0)

    def _to_game(self):
        """Séquence au format attendu par le jeu JavaScript."""
        self.ensure_one()
        steps = [s._to_game() for s in self.step_ids]
        return {'id': self.id, 'name': self.name, 'steps': [s for s in steps if s]}

    @api.constrains('world')
    def _check_world(self):
        for seq in self:
            if seq.world not in ACTIVE_WORLD_IDS:
                raise ValidationError("Ce monde n'existe plus dans le jeu : choisis un des 8 mondes.")

    def action_play(self):
        return {'type': 'ir.actions.act_url', 'url': '/warmup', 'target': 'new'}


class WarmupStep(models.Model):
    _name = 'warmup.step'
    _description = "Étape d'une séquence d'échauffement"
    _order = 'sequence_id, sequence, id'

    sequence_id = fields.Many2one('warmup.sequence', string='Séquence d\'échauffement', required=True,
                                  ondelete='cascade', index=True)
    sequence = fields.Integer(default=10)
    move = fields.Selection(MOVES, string='Mouvement', required=True, default='jump')
    count = fields.Integer(string='Répétitions', default=1,
                           help='Nombre de sauts, accroupis ou smashs à faire, ou de bulles à éclater.')
    duration = fields.Float(string='Durée (s)', default=6,
                            help='Durée pour « Éviter les obstacles », « Pause / respiration », '
                                 '« Éclater des bulles » et « Statues musicales » (une manche ≈ 7 s).')
    pose = fields.Selection(POSES, default='armsUp')
    hold = fields.Float(string='Tenir (s)', default=1.5, help='Temps pendant lequel la pose doit être tenue (cubes : temps entre deux cubes ; danse : temps par geste).')
    combo = fields.Char(string='Enchaînement',
                        help="Danse : gestes séparés par des virgules parmi : " + ', '.join(MIMIC_MOVES) + ". "
                             "Exemple : armsUp,squat,left,right")
    text = fields.Char(string='Message', translate=True, help='Texte affiché pendant une pause.')
    summary = fields.Char(string='Résumé', compute='_compute_summary')

    @api.depends('move', 'count', 'duration', 'pose', 'hold', 'combo', 'text')
    def _compute_summary(self):
        moves = dict(MOVES)
        poses = dict(POSES)
        for s in self:
            if s.move == 'run':
                s.summary = f"Éviter les obstacles pendant {s.duration:g} s"
            elif s.move == 'foam':
                s.summary = f"Nettoyer la mousse des singes pendant {s.duration:g} s"
            elif s.move == 'goal':
                s.summary = f"Arrêter les tirs (gardien de but) : {max(1, s.count)} ballons"
            elif s.move == 'kick':
                s.summary = f"Marquer {max(1, s.count)} buts (penalty)"
            elif s.move and s.move.startswith('arena_'):
                s.summary = f"{moves.get(s.move, '')} ×{s._arena_count()}"
            elif s.move and s.move.startswith('act_'):
                s.summary = f"{moves.get(s.move, '')} ×{max(1, s.count)}"
            elif s.move == 'shop':
                s.summary = f"Remplir le caddie pendant {s.duration:g} s"
            elif s.move in ('jump', 'squat', 'smash'):
                s.summary = f"{moves[s.move]} ×{max(1, s.count)}"
            elif s.move == 'pose':
                s.summary = f"{poses.get(s.pose, '')} pendant {s.hold:g} s"
            elif s.move == 'rest':
                s.summary = f"Pause {s.duration:g} s : {s.text or ''}"
            elif s.move == 'bubbles':
                s.summary = f"Éclater {max(1, s.count)} bulles en {s.duration:g} s"
            elif s.move == 'catch':
                s.summary = f"Attraper les étoiles pendant {s.duration:g} s"
            elif s.move == 'tunnel':
                s.summary = f"Rester baissé {s.duration:g} s dans le tunnel"
            elif s.move == 'moles':
                s.summary = f"Taper {max(1, s.count)} taupes en {s.duration:g} s"
            elif s.move == 'slice':
                s.summary = f"Couper {max(1, s.count)} fruits en {s.duration:g} s"
            elif s.move == 'cubes':
                s.summary = f"Taper {max(1, s.count)} cubes en rythme (un toutes les {s.hold:g} s)"
            elif s.move == 'dance':
                s.summary = 'Danse : ' + ' → '.join(MIMIC_MOVES.get(p, p) for p in s._combo_parts())
            elif s.move == 'freeze':
                s.summary = f"Statues musicales {s.duration:g} s"
            else:
                s.summary = moves.get(s.move, '')

    def _arena_count(self):
        """Nombre de manches d'un jeu miroir (la grande course : toujours une seule)."""
        self.ensure_one()
        return 1 if self.move in SINGLE_ROUND_ARENAS else max(1, self.count)

    def _combo_parts(self):
        self.ensure_one()
        return [p.strip() for p in (self.combo or '').split(',') if p.strip()]

    @api.constrains('move', 'combo')
    def _check_mimic(self):
        for s in self.filtered(lambda r: r.move == 'dance'):
            parts = s._combo_parts()
            if len(parts) < 2:
                raise ValidationError("Il faut au moins 2 gestes (ex. : armsUp,squat,left,right).")
            bad = [p for p in parts if p not in MIMIC_MOVES]
            if bad:
                raise ValidationError(
                    "Geste inconnu : %s. Autorisés : %s." % (', '.join(bad), ', '.join(MIMIC_MOVES)))

    @api.constrains('count', 'duration', 'hold')
    def _check_values(self):
        for s in self:
            if s.move in ('jump', 'squat', 'smash') and not 1 <= s.count <= 10:
                raise ValidationError('Le nombre de répétitions doit être entre 1 et 10.')
            if s.move in ('bubbles', 'moles', 'slice', 'foam') and not 1 <= s.count <= 30:
                raise ValidationError('Le nombre de bulles, de taupes ou de fruits doit être entre 1 et 30.')
            if s.move in ('run', 'shop', 'rest') and not 1 <= s.duration <= 60:
                raise ValidationError('La durée doit être entre 1 et 60 secondes.')
            if s.move in ('bubbles', 'freeze', 'catch', 'moles', 'slice', 'foam') and not 5 <= s.duration <= 60:
                raise ValidationError('La durée doit être entre 5 et 60 secondes.')
            if s.move == 'tunnel' and not 2 <= s.duration <= 20:
                raise ValidationError('La durée du tunnel doit être entre 2 et 20 secondes.')
            if s.move == 'cubes' and not 2 <= s.count <= 40:
                raise ValidationError('Le nombre de cubes doit être entre 2 et 40.')
            if s.move == 'cubes' and not 0.8 <= s.hold <= 3:
                raise ValidationError('Le temps entre deux cubes doit être entre 0,8 et 3 secondes.')
            if s.move and (s.move.startswith('act_') or s.move.startswith('arena_')) and not 1 <= s.count <= 30:
                raise ValidationError('Le nombre de réussites doit être entre 1 et 30.')
            if s.move in ('goal', 'kick') and not 1 <= s.count <= 20:
                raise ValidationError('Le nombre de ballons doit être entre 1 et 20.')
            if s.move in ('pose', 'dance') and not 0.5 <= s.hold <= 10:
                raise ValidationError('Le temps de pose doit être entre 0,5 et 10 secondes.')

    def _to_game(self):
        self.ensure_one()
        m = self.move
        if m == 'run':
            return {'m': 'run', 't': self.duration or 6}
        if m == 'foam':
            return {'m': 'foam', 't': self.duration or 16, 'n': max(1, self.count)}
        if m in ('goal', 'kick'):
            return {'m': m, 'n': max(1, self.count)}
        if m and m.startswith('act_') and m[4:] in ACT_SECONDS:
            return {'m': 'act', 'game': m[4:], 'n': max(1, self.count)}
        if m and m.startswith('arena_') and m[6:] in ARENA_SECONDS:
            return {'m': 'arena', 'game': m[6:], 'n': self._arena_count()}
        if m == 'shop':
            return {'m': 'shop', 't': self.duration or 12}
        if m in ('jump', 'squat', 'smash'):
            return {'m': m, 'n': max(1, self.count)}
        if m in ('left', 'right'):
            return {'m': m}
        if m == 'pose':
            return {'m': 'pose', 'pose': self.pose or 'armsUp', 'hold': self.hold or 1.5}
        if m == 'rest':
            return {'m': 'rest', 't': self.duration or 3, 'text': self.text or 'Respire…'}
        if m == 'bubbles':
            return {'m': 'bubbles', 't': self.duration or 10, 'n': max(1, self.count)}
        if m == 'freeze':
            return {'m': 'freeze', 't': self.duration or 14}
        if m == 'catch':
            return {'m': 'catch', 't': self.duration or 10}
        if m == 'tunnel':
            return {'m': 'tunnel', 't': self.duration or 4}
        if m == 'moles':
            return {'m': 'moles', 't': self.duration or 12, 'n': max(1, self.count)}
        if m == 'slice':
            return {'m': 'slice', 't': self.duration or 14, 'n': max(1, self.count)}
        if m == 'cubes':
            return {'m': 'cubes', 'n': max(2, self.count), 'beat': self.hold or 1.4}
        if m == 'dance':
            parts = [p for p in self._combo_parts() if p in MIMIC_MOVES]
            return {'m': 'dance', 'moves': parts, 'beat': self.hold or 1.8} if len(parts) >= 2 else None
        return None
