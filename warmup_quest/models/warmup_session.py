from odoo import api, fields, models
from odoo.exceptions import UserError

from .warmup_constants import DETECTION_MODES, SPEEDS, WORLDS


class WarmupSession(models.Model):
    _name = 'warmup.session'
    _description = 'Partie de Warm-Up Quest'
    _order = 'date desc, id desc'

    player_id = fields.Many2one('warmup.player', string='Joueur', required=True, ondelete='cascade', index=True)
    date = fields.Datetime(default=fields.Datetime.now, required=True)
    world = fields.Selection(WORLDS, string='Monde', required=True)
    sequence_id = fields.Many2one('warmup.sequence', string='Séquence', ondelete='set null')
    score = fields.Integer()
    max_score = fields.Integer(string='Score maximum')
    score_percent = fields.Float(string='Réussite (%)', compute='_compute_percent', store=True, aggregator='avg')
    stars = fields.Integer(string='Étoiles', aggregator='avg')
    success = fields.Integer(string='Défis réussis')
    steps = fields.Integer(string='Défis')
    collected = fields.Integer(string='Objets ramassés')
    best_streak = fields.Integer(string='Meilleure série')
    duration = fields.Integer(string='Durée (s)')
    duration_min = fields.Float(string='Durée (min)', compute='_compute_percent', store=True, digits=(5, 1))
    mode = fields.Selection(DETECTION_MODES, string='Détection')
    speed = fields.Selection(SPEEDS, string='Vitesse')
    creature_ids = fields.Many2many('warmup.creature', string='Créatures devenues amies')

    @api.depends('score', 'max_score', 'duration')
    def _compute_percent(self):
        for s in self:
            s.score_percent = (100.0 * s.score / s.max_score) if s.max_score else 0.0
            s.duration_min = (s.duration or 0) / 60.0

    @api.depends('player_id', 'world', 'date')
    def _compute_display_name(self):
        worlds = dict(WORLDS)
        for s in self:
            s.display_name = f"{s.player_id.name or ''} · {worlds.get(s.world, '')} · {fields.Date.to_string(s.date) if s.date else ''}"

    @api.model
    def _record_from_game(self, data):
        """Enregistre une partie envoyée par le jeu et met à jour le carnet du joueur."""
        player = self.env['warmup.player'].browse(int(data.get('player_id') or 0)).exists()
        if not player:
            raise UserError("Joueur introuvable.")
        world = data.get('world')
        if world not in dict(WORLDS):
            raise UserError("Monde inconnu.")
        seq = self.env['warmup.sequence'].browse(int(data.get('sequence_id') or 0)).exists()

        def as_int(key, lo=0, hi=10 ** 6):
            try:
                return max(lo, min(hi, int(data.get(key) or 0)))
            except (TypeError, ValueError):
                return 0

        codes = [c for c in (data.get('catches') or []) if isinstance(c, str)][:50]
        creatures = self.env['warmup.creature'].search([('code', 'in', codes)])
        by_code = {c.code: c for c in creatures}
        mode = data.get('mode') if data.get('mode') in dict(DETECTION_MODES) else False
        speed = data.get('speed') if data.get('speed') in dict(SPEEDS) else False

        self.create({
            'player_id': player.id,
            'world': world,
            'sequence_id': seq.id or False,
            'score': as_int('score'),
            'max_score': as_int('max_score'),
            'stars': as_int('stars', 0, 3),
            'success': as_int('success', 0, 1000),
            'steps': as_int('steps', 0, 1000),
            'collected': as_int('collected'),
            'best_streak': as_int('best_streak', 0, 1000),
            'duration': as_int('duration', 0, 24 * 3600),
            'mode': mode,
            'speed': speed,
            'creature_ids': [fields.Command.set(creatures.ids)],
        })

        # Carnet : +1 pour chaque créature devenue amie
        Catch = self.env['warmup.creature.catch']
        now = fields.Datetime.now()
        for code in codes:
            creature = by_code.get(code)
            if not creature:
                continue
            line = Catch.search([('player_id', '=', player.id), ('creature_id', '=', creature.id)], limit=1)
            if line:
                line.write({'count': line.count + 1, 'last_date': now})
            else:
                Catch.create({'player_id': player.id, 'creature_id': creature.id, 'count': 1, 'last_date': now})

        data = player._game_data()
        return {'carnet': data['carnet'], 'best': data['best']}
