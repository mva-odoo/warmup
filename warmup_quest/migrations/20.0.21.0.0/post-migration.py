"""Refonte « mondes à thème » : les anciennes séquences par défaut des 8 mondes sont remplacées par les nouvelles.

Une séquence est « par défaut » si elle porte un nom donné par une ancienne version du module ; les séquences
perso d'un parent (autre nom) sont gardées, avec leurs étapes encore valides (celles d'un type supprimé ont été
effacées avant) ; une séquence perso restée sans aucune étape est effacée."""
from odoo import SUPERUSER_ID, api

from odoo.addons.warmup_quest.hooks import create_default_sequences

# Noms des séquences par défaut des anciennes versions de hooks.py, pour les mondes gardés
OLD_DEFAULT_NAMES = {
    'stade': ['Le match des créatures'],
    'supermarche': ['Les courses de Panier'],
    'singes': ['Les farces des singes'],
    'chateau': ['Échauffement Enchanté'],
    'banquise': ['Échauffement Glacé'],
    'dinos': ['Échauffement des Dinos'],
    'espace': ['Échauffement Spatial'],
    'disco': ['Chorégraphies de Tempo'],
}


def migrate(cr, version):
    if not version:
        return
    env = api.Environment(cr, SUPERUSER_ID, {})
    Sequence = env['warmup.sequence'].with_context(active_test=False)
    for world, names in OLD_DEFAULT_NAMES.items():
        Sequence.search([('world', '=', world), ('name', 'in', names)]).unlink()
    Sequence.search([('step_ids', '=', False)]).unlink()
    create_default_sequences(env, missing='name')
