"""Nouveau monde « Super Marché Rigolo » : sa séquence par défaut (avec le gardien)."""
from odoo import SUPERUSER_ID, api

from odoo.addons.warmup_quest.hooks import post_init_hook


def migrate(cr, version):
    post_init_hook(api.Environment(cr, SUPERUSER_ID, {}))
