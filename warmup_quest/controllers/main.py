import json
import re

from odoo import http
from odoo.exceptions import UserError
from odoo.http import request
from odoo.tools import file_open

GAME_BASE = '/warmup_quest/static/src/game/'


class WarmupQuestController(http.Controller):

    @http.route('/warmup', type='http', auth='user', methods=['GET'])
    def warmup_game(self, **kwargs):
        """Sert le jeu (copie de index.html) avec la configuration Odoo injectée."""
        with file_open('warmup_quest/static/src/game/index.html', 'r') as f:  # lu en UTF-8
            html = f.read()
        version = request.env['ir.module.module'].sudo().search(
            [('name', '=', 'warmup_quest')], limit=1).latest_version or '1'
        html = html.replace('src="js/', f'src="{GAME_BASE}js/')
        html = html.replace('href="css/', f'href="{GAME_BASE}css/')
        # cache-busting : nouvelle version du module => nouveaux fichiers
        html = html.replace('.js"></script>', f'.js?v={version}"></script>')
        html = html.replace('style.css"', f'style.css?v={version}"')

        config = request.env['warmup.player']._game_config()
        config_json = json.dumps(config, ensure_ascii=False).replace('</', '<\\/')
        inject = (
            f'<script>window.WUQ_CONFIG = {config_json};</script>\n'
            f'  <script src="/warmup_quest/static/src/odoo_bridge.js?v={version}"></script>'
        )
        html = html.replace('<!-- WUQ_BACKEND -->', inject)
        return request.make_response(html, headers=[
            ('Content-Type', 'text/html; charset=utf-8'),
            ('Cache-Control', 'no-store'),
        ])

    @http.route('/warmup/api/player', type='jsonrpc', auth='user', methods=['POST'])
    def warmup_create_player(self, name=None, color=None, look=None, **kwargs):
        """Ajoute un enfant directement depuis l'écran du jeu (prénom, couleur, dresseur)."""
        name = (name or '').strip()[:40]
        if not name:
            raise UserError("Indique le prénom de l'enfant.")
        vals = {'name': name}
        if isinstance(color, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', color):
            vals['color'] = color
        player = request.env['warmup.player'].create(vals)
        player._set_look(look)
        return player._game_data()

    @http.route('/warmup/api/player/look', type='jsonrpc', auth='user', methods=['POST'])
    def warmup_player_look(self, player_id=None, look=None, color=None, **kwargs):
        """Change l'apparence du dresseur d'un enfant depuis le jeu."""
        player = request.env['warmup.player'].browse(int(player_id or 0)).exists()
        if not player:
            raise UserError("Cet enfant n'existe plus.")
        player._set_look(look)
        if isinstance(color, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', color):
            player.color = color
        return player._game_data()

    @http.route('/warmup/api/player/companion', type='jsonrpc', auth='user', methods=['POST'])
    def warmup_player_companion(self, player_id=None, companion=None, **kwargs):
        """Choix de la créature compagnon depuis le jeu."""
        player = request.env['warmup.player'].browse(int(player_id or 0)).exists()
        if not player:
            raise UserError("Cet enfant n'existe plus.")
        player._set_companion(companion)
        return player._game_data()['companion']

    @http.route('/warmup/api/session', type='jsonrpc', auth='user', methods=['POST'])
    def warmup_save_session(self, **params):
        """Reçoit le résumé d'une partie terminée."""
        return request.env['warmup.session']._record_from_game(params)
