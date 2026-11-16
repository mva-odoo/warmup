import base64
import re

from odoo import api, fields, models
from odoo.tools.binary import BinaryBytes


MOMENTS = [('start', 'Au début de la partie'), ('success', 'Après une réussite'), ('miss', 'Quand c\'est raté'), ('end', 'À la fin')]


class WarmupVoice(models.Model):
    """Studio voix : phrase du jeu enregistrée par un parent (elle remplace la voix du jeu sur tous les postes),
    ou message perso (moment renseigné) que le jeu dit au début, après une réussite, après un raté ou à la fin."""
    _name = 'warmup.voice'
    _description = 'Voix enregistrée (studio)'
    _order = 'text'

    key = fields.Char(string='Clé', required=True, index=True, help='Empreinte du texte, calculée par le jeu.')
    text = fields.Char(string='Phrase', required=True)
    audio = fields.Binary(string='Enregistrement', attachment=True)
    mimetype = fields.Char(default='audio/webm')
    moment = fields.Selection(MOMENTS, string='Message perso', help='Vide : phrase du jeu. Sinon : quand le jeu dit ce message.')
    player_id = fields.Many2one('warmup.player', string='Pour', ondelete='cascade', help='Vide : pour tous les enfants.')

    _key_uniq = models.Constraint('UNIQUE(key)', 'Cette phrase est déjà enregistrée.')

    MAX_BYTES = 600 * 1024  # (10 s de voix compressée tiennent largement)

    @api.model
    def _game_list(self):
        return [v._game_list_one() for v in self.search([('audio', '!=', False)])]

    @api.model
    def _game_messages(self):
        return [{**(v._game_list_one() if v.audio else {'key': v.key, 'url': None}), 'text': v.text, 'moment': v.moment,
                 'player': v.player_id.id or None} for v in self.search([('moment', '!=', False)])]

    @api.model
    def _game_save(self, key, text, data, mimetype, moment=None, player_id=None):
        if not (isinstance(key, str) and re.fullmatch(r'[0-9a-f]{8}', key)):
            raise ValueError('clé invalide')
        if moment not in (None, False, *dict(MOMENTS)):
            raise ValueError('moment inconnu')
        vals = {'text': (text or '')[:300] or key}
        if data:
            raw = base64.b64decode(data, validate=True)
            if not 1000 < len(raw) <= self.MAX_BYTES:
                raise ValueError('enregistrement trop court ou trop long')
            mt = mimetype if isinstance(mimetype, str) and re.fullmatch(r'audio/[\w.+-]+(;\s*codecs=[\w.]+)?', mimetype) else 'audio/webm'
            ext = {'audio/ogg': 'ogg', 'audio/mp4': 'm4a'}.get(mt.split(';')[0], 'webm')
            vals.update(audio=BinaryBytes(raw, filename=f'voix-{key}.{ext}'), mimetype=mt.split(';')[0])
        elif not moment:
            raise ValueError('enregistrement manquant')
        if moment:
            player = self.env['warmup.player'].browse(int(player_id)).exists() if player_id else self.env['warmup.player']
            vals.update(moment=moment, player_id=player.id or False)
        rec = self.search([('key', '=', key)], limit=1)
        if rec:
            rec.write(vals)
        else:
            rec = self.create({'key': key, **vals})
        return rec._game_list_one()

    def _game_list_one(self):
        self.ensure_one()
        return {'key': self.key, 'url': f'/web/content/warmup.voice/{self.id}/audio?unique={int(self.write_date.timestamp())}' if self.audio else None}
