from odoo import api, fields, models

EVOLVE_AT = 3


class WarmupCreature(models.Model):
    _name = 'warmup.creature'
    _description = 'Créature Warm-Up Quest'
    _order = 'sequence, id'

    name = fields.Char(required=True, translate=True)
    code = fields.Char(required=True, help="Identifiant utilisé par le jeu pour dessiner la créature.")
    element = fields.Char(translate=True)
    sequence = fields.Integer(default=10)
    color = fields.Char(help='Couleur principale (hexadécimal).')
    active = fields.Boolean(default=True)

    _code_uniq = models.Constraint('UNIQUE(code)', 'Le code de la créature doit être unique.')


class WarmupCreatureCatch(models.Model):
    _name = 'warmup.creature.catch'
    _description = 'Créature amie d’un joueur (carnet)'
    _order = 'player_id, creature_id'

    player_id = fields.Many2one('warmup.player', required=True, ondelete='cascade', index=True)
    creature_id = fields.Many2one('warmup.creature', required=True, ondelete='cascade')
    element = fields.Char(related='creature_id.element')
    count = fields.Integer(string='Fois ami', default=0)
    evolved = fields.Boolean(string='Évoluée', compute='_compute_evolved', store=True)
    last_date = fields.Datetime(string='Dernière rencontre')

    _player_creature_uniq = models.Constraint(
        'UNIQUE(player_id, creature_id)',
        'Une seule ligne de carnet par joueur et par créature.',
    )

    @api.depends('count')
    def _compute_evolved(self):
        for rec in self:
            rec.evolved = rec.count >= EVOLVE_AT
