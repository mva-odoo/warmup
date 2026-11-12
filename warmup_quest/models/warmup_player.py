from odoo import api, fields, models

from .warmup_constants import WORLDS

PLAYER_COLORS = ['#ff6b35', '#4ea8ff', '#5cc96b', '#b388eb', '#ffb703', '#ef476f', '#2ec4b6', '#7c8cff']


class WarmupPlayer(models.Model):
    _name = 'warmup.player'
    _description = 'Joueur Warm-Up Quest'
    _order = 'name'

    name = fields.Char(string='Prénom', required=True)
    image_128 = fields.Image(string='Photo', max_width=128, max_height=128)
    color = fields.Char(string='Couleur', default=lambda self: self._default_color(),
                        help='Couleur du joueur dans le jeu (hexadécimal, ex. #ff6b35).')
    user_id = fields.Many2one('res.users', string='Utilisateur Odoo',
                              help='Optionnel : utilisateur Odoo associé à ce joueur.')
    birth_year = fields.Integer(string='Année de naissance')
    active = fields.Boolean(default=True)
    session_ids = fields.One2many('warmup.session', 'player_id', string='Parties')
    catch_ids = fields.One2many('warmup.creature.catch', 'player_id', string='Carnet')

    stickers = fields.Json(string='Gommettes', default=list, help='Gommettes gagnées (émojis), dans l\'ordre.')
    sticker_count = fields.Integer(string='Nombre de gommettes', compute='_compute_stickers')
    sticker_display = fields.Char(string='Album', compute='_compute_stickers')
    session_count = fields.Integer(string='Parties jouées', compute='_compute_stats')
    best_score = fields.Integer(string='Meilleur score', compute='_compute_stats')
    total_minutes = fields.Float(string="Minutes d'échauffement", compute='_compute_stats', digits=(6, 1))
    creature_count = fields.Integer(string='Créatures amies', compute='_compute_stats')
    evolved_count = fields.Integer(string='Créatures évoluées', compute='_compute_stats')

    def _default_color(self):
        return PLAYER_COLORS[self.search_count([]) % len(PLAYER_COLORS)]

    @api.depends('session_ids.score', 'session_ids.duration', 'catch_ids.count', 'catch_ids.evolved')
    def _compute_stats(self):
        for p in self:
            p.session_count = len(p.session_ids)
            p.best_score = max(p.session_ids.mapped('score') or [0])
            p.total_minutes = sum(p.session_ids.mapped('duration')) / 60.0
            p.creature_count = len(p.catch_ids.filtered(lambda c: c.count > 0))
            p.evolved_count = len(p.catch_ids.filtered('evolved'))

    @api.depends('stickers')
    def _compute_stickers(self):
        for p in self:
            items = p.stickers if isinstance(p.stickers, list) else []
            p.sticker_count = len(items)
            p.sticker_display = ' '.join(items)

    def _set_stickers(self, items):
        """Album envoyé par le jeu : liste de petits textes (émojis), longueur raisonnable."""
        clean = [s for s in (items or []) if isinstance(s, str) and 0 < len(s) <= 8][:300]
        self.write({'stickers': clean})

    def action_view_sessions(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Parties de {self.name}',
            'res_model': 'warmup.session',
            'view_mode': 'list,graph,form',
            'domain': [('player_id', '=', self.id)],
            'context': {'default_player_id': self.id},
        }

    def action_play(self):
        return {'type': 'ir.actions.act_url', 'url': '/warmup', 'target': 'new'}

    # ------------------------------------------------------------------
    # Données envoyées au jeu
    # ------------------------------------------------------------------
    def _game_data(self):
        """Profil d'un joueur pour le jeu : carnet et records par monde."""
        self.ensure_one()
        carnet = {c.creature_id.code: c.count for c in self.catch_ids if c.count}
        best = {}
        for world, _label in WORLDS:
            sessions = self.session_ids.filtered(lambda s, w=world: s.world == w)
            if sessions:
                best[world] = {
                    'score': max(sessions.mapped('score')),
                    'stars': max(sessions.mapped('stars')),
                }
        return {
            'id': self.id,
            'name': self.name,
            'color': self.color or '#ff6b35',
            'avatar': f'/web/image/warmup.player/{self.id}/image_128' if self.image_128 else False,
            'carnet': carnet,
            'best': best,
            'stickers': self.stickers if isinstance(self.stickers, list) else [],
        }

    @api.model
    def _game_config(self):
        players = self.search([])
        sequences = {}
        for world, _label in WORLDS:
            seqs = self.env['warmup.sequence'].search([('world', '=', world)])
            sequences[world] = [s._to_game() for s in seqs if s.step_ids]
        return {
            'players': [p._game_data() for p in players],
            'sequences': sequences,
            'backUrl': '/odoo/action-warmup_quest.action_warmup_player',
        }
