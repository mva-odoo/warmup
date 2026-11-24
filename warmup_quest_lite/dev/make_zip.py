"""Fabrique warmup_quest_lite.zip, le module SANS Python, prêt pour « Applications › Importer un module ».

    python3 warmup_quest_lite/dev/make_zip.py          -> dist/warmup_quest_lite.zip        (≈ 25 Mo)
    python3 warmup_quest_lite/dev/make_zip.py --leger  -> dist/warmup_quest_lite_leger.zip  (≈ 11 Mo, sans les voix
                                                          enregistrées : le jeu parle avec la voix du navigateur)

Tout ce qui est commun avec le module Python (warmup_quest) est repris de lui au moment de fabriquer le zip, pour que
les deux versions restent identiques sans rien recopier dans le dépôt :
- le jeu (warmup_quest/static/src/game, sans tools/ ni recordings/) et le pont odoo_bridge.js ;
- les mondes, mouvements, poses… (warmup_quest/models/warmup_constants.py) -> data/models.xml (modèles x_wuq_…) ;
- l'apparence du personnage et les moments des messages perso (warmup_player.py, warmup_voice.py) ;
- les séquences par défaut (warmup_quest/hooks.py) -> data/sequences.xml ;
- les créatures (warmup_quest/data/warmup_creature_data.xml) -> data/creatures.xml.
Le reste (manifeste, vues, droits, lite_bridge.js) est dans warmup_quest_lite/.
"""
import ast
import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape, quoteattr

LITE = Path(__file__).resolve().parents[1]
REPO = LITE.parent
FULL = REPO / 'warmup_quest'
NAME = LITE.name
DIST = REPO / 'dist'


# ---------------------------------------------------------------- lecture du module Python
def literal_assigns(path, names):
    """Valeurs littérales de quelques variables d'un fichier Python (sans l'exécuter ni importer Odoo)."""
    tree = ast.parse(path.read_text(encoding='utf-8'))
    out = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name) and node.targets[0].id in names:
            out[node.targets[0].id] = ast.literal_eval(node.value)
    return out


def load_sources():
    consts = {}
    exec((FULL / 'models/warmup_constants.py').read_text(encoding='utf-8'), consts)  # (listes pures, sans Odoo)
    player = literal_assigns(FULL / 'models/warmup_player.py', {'AVATAR_MODELS', 'AVATAR_HATS', 'AVATAR_BACKS'})
    voice = literal_assigns(FULL / 'models/warmup_voice.py', {'MOMENTS'})
    hooks = {}
    exec((FULL / 'hooks.py').read_text(encoding='utf-8'), hooks)  # (n'importe que math)
    creatures = [{c.get('name'): (c.text or '') for c in rec} for rec in ET.parse(FULL / 'data/warmup_creature_data.xml').iter('record')]
    version = ast.literal_eval((LITE / '__manifest__.py').read_text(encoding='utf-8'))['version']
    return consts, player, voice, hooks, creatures, version


# ---------------------------------------------------------------- data/models.xml
def build_models(consts, player, voice):
    worlds = consts['ACTIVE_WORLDS']  # (la version importable repart de zéro : seulement les 8 mondes)
    sel = {
        'world': worlds, 'move': consts['MOVES'], 'pose': consts['POSES'], 'mode': consts['DETECTION_MODES'],
        'speed': consts['SPEEDS'], 'avatar': player['AVATAR_MODELS'], 'hat': player['AVATAR_HATS'],
        'back': player['AVATAR_BACKS'], 'moment': voice['MOMENTS'],
    }
    # modèle -> (libellé, ordre, champs) ; champ : (nom, type, libellé, options)
    models = {
        'x_wuq_player': ('Joueur Warm-Up Quest', 'x_name', [
            ('x_name', 'char', 'Prénom', {'required': True}),
            ('x_color', 'char', 'Couleur', {'help': 'Couleur du joueur dans le jeu (hexadécimal, ex. #ff6b35).'}),
            ('x_birth_year', 'integer', 'Année de naissance', {}),
            ('x_avatar_model', 'selection', 'Tête', {'selection': 'avatar'}),
            ('x_avatar_body', 'selection', 'Corps', {'selection': 'avatar', 'help': 'Vide : celui de la tête.'}),
            ('x_avatar_legs', 'selection', 'Jambes', {'selection': 'avatar', 'help': 'Vide : celles du corps.'}),
            ('x_avatar_hat', 'selection', 'Chapeau', {'selection': 'hat'}),
            ('x_avatar_glasses', 'boolean', 'Lunettes', {}),
            ('x_avatar_back', 'selection', 'Dans le dos', {'selection': 'back'}),
            ('x_easy_mode', 'boolean', 'Mode petit (plus facile)', {'help': "Coché d'office pour un enfant de 5 ans ou moins."}),
            ('x_stickers', 'text', 'Gommettes (JSON)', {}),
            ('x_companion', 'text', 'Compagnon (JSON)', {'help': '{"id": code de la créature, "xp": parties}'}),
            ('x_session_ids', 'one2many', 'Parties', {'relation': 'x_wuq_session', 'relation_field': 'x_player_id'}),
            ('x_catch_ids', 'one2many', 'Album des créatures', {'relation': 'x_wuq_catch', 'relation_field': 'x_player_id'}),
            ('x_session_count', 'integer', 'Parties jouées', {'store': False, 'depends': 'x_session_ids',
                'compute': "for record in self:\n    record['x_session_count'] = len(record.x_session_ids)"}),
            ('x_best_score', 'integer', 'Meilleur score', {'store': False, 'depends': 'x_session_ids.x_score',
                'compute': "for record in self:\n    record['x_best_score'] = max(record.x_session_ids.mapped('x_score') or [0])"}),
            ('x_total_minutes', 'float', "Minutes d'échauffement", {'store': False, 'depends': 'x_session_ids.x_duration',
                'compute': "for record in self:\n    record['x_total_minutes'] = round(sum(record.x_session_ids.mapped('x_duration')) / 60.0, 1)"}),
            ('x_creature_count', 'integer', 'Créatures amies', {'store': False, 'depends': 'x_catch_ids.x_count',
                'compute': "for record in self:\n    record['x_creature_count'] = len(record.x_catch_ids.filtered(lambda c: c.x_count > 0))"}),
        ]),
        'x_wuq_session': ('Partie de Warm-Up Quest', 'x_date desc, id desc', [
            ('x_name', 'char', 'Partie', {'store': True, 'depends': 'x_player_id,x_world,x_date',
                # (le code calculé tourne dans safe_eval : pas d'attribut « _… », les libellés sont écrits dans le code)
                'compute': f"worlds = {dict(worlds)!r}\n"
                           "for record in self:\n"
                           "    record['x_name'] = '%s · %s · %s' % (record.x_player_id.x_name or '', worlds.get(record.x_world, ''), record.x_date and record.x_date.date() or '')"}),
            ('x_player_id', 'many2one', 'Joueur', {'relation': 'x_wuq_player', 'on_delete': 'cascade', 'required': True, 'index': True}),
            ('x_date', 'datetime', 'Date', {}),
            ('x_world', 'selection', 'Monde', {'selection': 'world'}),
            ('x_sequence_id', 'many2one', 'Séquence', {'relation': 'x_wuq_sequence', 'on_delete': 'set null'}),
            ('x_score', 'integer', 'Score', {}),
            ('x_max_score', 'integer', 'Score maximum', {}),
            ('x_stars', 'integer', 'Étoiles', {}),
            ('x_success', 'integer', 'Défis réussis', {}),
            ('x_steps', 'integer', 'Défis', {}),
            ('x_collected', 'integer', 'Objets ramassés', {}),
            ('x_best_streak', 'integer', 'Meilleure série', {}),
            ('x_duration', 'integer', 'Durée (s)', {}),
            ('x_mode', 'selection', 'Détection', {'selection': 'mode'}),
            ('x_speed', 'selection', 'Vitesse', {'selection': 'speed'}),
            ('x_creatures', 'char', 'Créatures devenues amies', {}),
            ('x_score_percent', 'float', 'Réussite (%)', {'store': True, 'depends': 'x_score,x_max_score',
                'compute': "for record in self:\n    record['x_score_percent'] = (100.0 * record.x_score / record.x_max_score) if record.x_max_score else 0.0"}),
            ('x_duration_min', 'float', 'Durée (min)', {'store': True, 'depends': 'x_duration',
                'compute': "for record in self:\n    record['x_duration_min'] = round((record.x_duration or 0) / 60.0, 1)"}),
        ]),
        'x_wuq_sequence': ("Séquence d'échauffement", 'x_world, x_sequence, id', [
            ('x_name', 'char', 'Nom', {'required': True}),
            ('x_world', 'selection', 'Monde', {'selection': 'world', 'required': True}),
            ('x_sequence', 'integer', 'Ordre', {'help': 'La première séquence de chaque monde est jouée par défaut.'}),
            ('x_description', 'text', 'Notes', {}),
            ('x_step_ids', 'one2many', 'Étapes', {'relation': 'x_wuq_step', 'relation_field': 'x_sequence_id', 'copied': True}),
            ('x_step_count', 'integer', "Nombre d'étapes", {'store': False, 'depends': 'x_step_ids',
                'compute': "for record in self:\n    record['x_step_count'] = len(record.x_step_ids)"}),
        ]),
        'x_wuq_step': ("Étape d'une séquence d'échauffement", 'x_sequence_id, x_sequence, id', [
            ('x_name', 'char', 'Étape', {'store': True, 'depends': 'x_move',
                'compute': f"moves = {dict(consts['MOVES'])!r}\nfor record in self:\n    record['x_name'] = moves.get(record.x_move, '')"}),
            ('x_sequence_id', 'many2one', "Séquence d'échauffement", {'relation': 'x_wuq_sequence', 'on_delete': 'cascade', 'required': True, 'index': True}),
            ('x_sequence', 'integer', 'Ordre', {}),
            ('x_move', 'selection', 'Mouvement', {'selection': 'move', 'required': True}),
            ('x_count', 'integer', 'Répétitions', {'help': 'Nombre de sauts, de bulles, de tirs, de réussites…'}),
            ('x_duration', 'float', 'Durée (s)', {}),
            ('x_pose', 'selection', 'Pose', {'selection': 'pose'}),
            ('x_hold', 'float', 'Tenir (s)', {'help': 'Pose : temps à tenir ; cubes : temps entre deux cubes ; danse : temps par geste.'}),
            ('x_combo', 'char', 'Gestes de la danse', {'help': 'Séparés par des virgules : armsUp, airplane, star, flamingo, squat, left, right, jump, smash'}),
            ('x_text', 'char', 'Message', {'help': 'Texte affiché pendant une pause.'}),
        ]),
        'x_wuq_creature': ('Créature Warm-Up Quest', 'x_sequence, id', [
            ('x_name', 'char', 'Nom', {'required': True}),
            ('x_code', 'char', 'Code', {'required': True, 'help': 'Identifiant utilisé par le jeu pour dessiner la créature.'}),
            ('x_element', 'char', 'Élément', {}),
            ('x_color', 'char', 'Couleur', {}),
            ('x_sequence', 'integer', 'Ordre', {}),
        ]),
        'x_wuq_catch': ("Créature amie d'un joueur", 'x_player_id, x_creature_id', [
            ('x_name', 'char', 'Nom', {'store': True, 'depends': 'x_creature_id',
                'compute': "for record in self:\n    record['x_name'] = record.x_creature_id.x_name or ''"}),
            ('x_player_id', 'many2one', 'Joueur', {'relation': 'x_wuq_player', 'on_delete': 'cascade', 'required': True, 'index': True}),
            ('x_creature_id', 'many2one', 'Créature', {'relation': 'x_wuq_creature', 'on_delete': 'cascade', 'required': True}),
            ('x_count', 'integer', 'Fois amie', {}),
            ('x_last_date', 'datetime', 'Dernière rencontre', {}),
            ('x_evolved', 'boolean', 'Évoluée', {'store': True, 'depends': 'x_count',
                'compute': "for record in self:\n    record['x_evolved'] = record.x_count >= 3"}),
        ]),
        'x_wuq_voice': ('Voix enregistrée (studio)', 'x_name', [
            ('x_name', 'char', 'Phrase', {'required': True}),
            ('x_key', 'char', 'Clé', {'required': True, 'index': True, 'help': 'Empreinte du texte, calculée par le jeu.'}),
            ('x_audio', 'binary', 'Enregistrement', {}),
            ('x_mimetype', 'char', 'Type', {}),
            ('x_moment', 'selection', 'Message perso', {'selection': 'moment', 'help': 'Vide : phrase du jeu. Sinon : quand le jeu dit ce message.'}),
            ('x_player_id', 'many2one', 'Pour', {'relation': 'x_wuq_player', 'on_delete': 'cascade', 'help': 'Vide : pour tous les enfants.'}),
        ]),
    }
    out = ['<?xml version="1.0" encoding="utf-8"?>', '<!-- Fabriqué par dev/make_zip.py : ne pas modifier à la main. -->',
           '<odoo>', '    <!-- Modèles manuels (x_…) : aucun fichier Python. -->']
    for model, (label, order, _f) in models.items():
        out += [f'    <record id="model_{model}" model="ir.model">',
                f'        <field name="name">{escape(label)}</field>',
                f'        <field name="model">{model}</field>',
                '        <field name="state">manual</field>', '    </record>']
    # (d'abord les champs simples et many2one, puis les one2many et les calculs, qui en dépendent)
    later = []
    for model, (_l, _o, fields) in models.items():
        for name, ttype, desc, opt in fields:
            (later if ttype == 'one2many' or 'compute' in opt else out).append(field_xml(model, name, ttype, desc, opt, sel))
    out += later
    out += selection_xml(models, sel)
    # (l'ordre de tri se pose à la fin : Odoo vérifie que les champs triés existent déjà)
    for model, (_l, order, _f) in models.items():
        out += [f'    <record id="model_{model}" model="ir.model">', f'        <field name="order">{order}</field>', '    </record>']
    out.append('</odoo>')
    return '\n'.join(out) + '\n'


def field_xml(model, name, ttype, desc, opt, sel):
    lines = [f'    <record id="field_{model}_{name}" model="ir.model.fields">',
             f'        <field name="model_id" ref="model_{model}"/>',
             f'        <field name="name">{name}</field>',
             f'        <field name="field_description">{escape(desc)}</field>',
             f'        <field name="ttype">{ttype}</field>',
             '        <field name="state">manual</field>']
    for key in ('relation', 'relation_field', 'on_delete', 'help', 'depends'):
        if key in opt:
            lines.append(f'        <field name="{key}">{escape(str(opt[key]))}</field>')
    for key in ('required', 'index', 'store', 'copied'):
        if key in opt:
            lines.append(f'        <field name="{key}" eval="{opt[key]!r}"/>')
    if 'compute' in opt:
        lines.append(f'        <field name="compute"><![CDATA[{opt["compute"]}]]></field>')
        lines.append('        <field name="readonly" eval="True"/>')
    lines.append('    </record>')
    return '\n'.join(lines)


def selection_xml(models, sel):
    """Choix des listes : un enregistrement chacun, avec son identifiant (et pas « Command.create » dans le champ) ;
    en réimportant le zip, Odoo met à jour les choix existants au lieu de vouloir les recréer (valeur en double).
    Les bases où la toute première version (20.0.1.0.0, choix sans identifiant) est installée : une action rattache
    d'abord les choix déjà là à leur identifiant, sans rien supprimer (les valeurs enregistrées restent)."""
    recs, pairs = [], []
    for model, (_l, _o, fields) in models.items():
        for name, ttype, _d, opt in fields:
            if ttype != 'selection':
                continue
            for i, (v, n) in enumerate(sel[opt['selection']]):
                xid = 'sel_' + re.sub(r'[^a-z0-9_]', '_', f'{model}_{name}_{v}'.lower())
                pairs.append((xid, f'field_{model}_{name}', v))
                recs += [f'    <record id="{xid}" model="ir.model.fields.selection">',
                         f'        <field name="field_id" ref="field_{model}_{name}"/>',
                         f'        <field name="value">{escape(v)}</field>',
                         f'        <field name="name">{escape(n)}</field>',
                         f'        <field name="sequence">{i}</field>',
                         '    </record>']
    code = (f"pairs = {pairs!r}\n"
            f"module = '{NAME}'\n"
            "Data = env['ir.model.data'].sudo()\n"
            "for xid, fxid, value in pairs:\n"
            "    if Data.search_count([('module', '=', module), ('name', '=', xid)]):\n"
            "        continue\n"
            "    field = env.ref(module + '.' + fxid, raise_if_not_found=False)\n"
            "    old = field and env['ir.model.fields.selection'].sudo().search([('field_id', '=', field.id), ('value', '=', value)], limit=1)\n"
            "    if old:\n"
            "        Data.create({'module': module, 'name': xid, 'model': 'ir.model.fields.selection', 'res_id': old.id})\n")
    head = ['    <!-- (bases où la version 20.0.1.0.0 est installée : ses choix de listes reçoivent leur identifiant) -->',
            '    <record id="action_adopt_selection" model="ir.actions.server">',
            '        <field name="name">Warm-Up Quest : identifiants des choix (mise à jour)</field>',
            '        <field name="model_id" ref="base.model_ir_model_fields_selection"/>',
            '        <field name="state">code</field>',
            f'        <field name="code"><![CDATA[{code}]]></field>',
            '    </record>',
            '    <function model="ir.actions.server" name="run" eval="[ref(\'action_adopt_selection\')]"/>']
    return head + recs


# ---------------------------------------------------------------- data/sequences.xml et data/creatures.xml
def build_sequences(hooks):
    out = ['<?xml version="1.0" encoding="utf-8"?>', '<!-- Fabriqué par dev/make_zip.py : ne pas modifier à la main. -->',
           '<odoo>', '    <data noupdate="1">']
    for world, name, steps in hooks['DEFAULT_SEQUENCES']:
        out += [f'        <record id="sequence_{world}" model="x_wuq_sequence">',
                f'            <field name="x_name">{escape(name)}</field>',
                f'            <field name="x_world">{world}</field>',
                '            <field name="x_sequence">1</field>', '        </record>']
        for i, step in enumerate(steps):
            out.append(f'        <record id="step_{world}_{i + 1:02d}" model="x_wuq_step">')
            out.append(f'            <field name="x_sequence_id" ref="sequence_{world}"/>')
            out.append(f'            <field name="x_sequence">{(i + 1) * 10}</field>')
            for key, value in step.items():
                out.append(f'            <field name="x_{key}">{escape(str(value))}</field>')
            out.append('        </record>')
    out += ['    </data>', '</odoo>']
    return '\n'.join(out) + '\n'


def build_creatures(creatures):
    out = ['<?xml version="1.0" encoding="utf-8"?>', '<!-- Fabriqué par dev/make_zip.py : ne pas modifier à la main. -->',
           '<odoo>', '    <data noupdate="1">']
    for c in creatures:
        out.append(f'        <record id="creature_{c["code"]}" model="x_wuq_creature">')
        for key in ('code', 'name', 'element', 'color', 'sequence'):
            if c.get(key):
                out.append(f'            <field name="x_{key}">{escape(c[key])}</field>')
        out.append('        </record>')
    out += ['    </data>', '</odoo>']
    return '\n'.join(out) + '\n'


# ---------------------------------------------------------------- le jeu
GAME_EXCLUDED = {'tools', 'recordings'}


def patch_index(html, version):
    """Page du jeu servie telle quelle (fichier statique) : lite_bridge.js lit les données d'Odoo puis lance le jeu."""
    v = f'?v={version}'
    html = re.sub(r'(src="js/[^"]+\.js)"', rf'\1{v}"', html)
    html = html.replace('href="css/style.css"', f'href="css/style.css{v}"')
    game = f'  <script src="js/game.js{v}"></script>\n'
    assert game in html and '<!-- WUQ_BACKEND -->' in html, 'index.html a changé : adapter patch_index()'
    html = html.replace(game, '')
    return html.replace('<!-- WUQ_BACKEND -->', f'<script src="../lite_bridge.js{v}" data-version="{version}"></script>')


GAME_URL = f'/{NAME}/static/src/game/'


def build_page(html):
    """Gabarit QWeb de la page du jeu (affiché par l'action serveur /website/action/warmup).

    Pourquoi pas le fichier index.html lui-même : un module importé sert ses fichiers statiques depuis la base, avec
    l'en-tête « Content-Security-Policy: default-src 'none' », qui empêche la page de lancer ses scripts. Les scripts,
    modèles 3D et voix restent des fichiers du module ; <base> fait pointer les chemins relatifs du jeu vers eux.
    """
    try:
        from lxml import etree, html as lhtml
    except ImportError as e:
        raise SystemExit('lxml est nécessaire pour fabriquer le zip (pip install lxml)') from e
    doc = lhtml.document_fromstring(html)
    head = doc.find('head')
    charset = head.find('meta[@charset]')
    at = list(head).index(charset) + 1 if charset is not None else 0  # (l'encodage reste la toute première balise)
    head.insert(at, etree.Element('meta', name='robots', content='noindex'))
    head.insert(at, etree.Element('base', href=GAME_URL))
    body = etree.tostring(doc, method='xml', encoding='unicode')
    return ('<?xml version="1.0" encoding="utf-8"?>\n<!-- Fabriqué par dev/make_zip.py depuis warmup_quest/static/src/game/index.html. -->\n'
            '<odoo>\n    <template id="page" name="Warm-Up Quest : le jeu">\n&lt;!DOCTYPE html&gt;\n' + body + '\n    </template>\n</odoo>\n')


def main():
    import sys
    light = '--leger' in sys.argv[1:]  # (sans voice/piper : 940 fichiers, 15 Mo ; Voice.init() passe alors à la synthèse)
    consts, player, voice, hooks, creatures, version = load_sources()
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / NAME
        # fichiers propres à la version importable (sans dev/)
        for path in LITE.rglob('*'):
            rel = path.relative_to(LITE)
            if path.is_file() and rel.parts[0] != 'dev' and '__pycache__' not in rel.parts and path.name != 'README.md':
                (root / rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, root / rel)
        (root / 'data').mkdir(exist_ok=True)
        (root / 'data/models.xml').write_text(build_models(consts, player, voice), encoding='utf-8')
        (root / 'data/sequences.xml').write_text(build_sequences(hooks), encoding='utf-8')
        (root / 'data/creatures.xml').write_text(build_creatures(creatures), encoding='utf-8')
        # le jeu et le pont, repris du module Python
        src = FULL / 'static/src/game'
        for path in src.rglob('*'):
            rel = path.relative_to(src)
            if path.is_file() and not GAME_EXCLUDED & set(rel.parts) and not (light and rel.parts[:2] == ('voice', 'piper')):
                dest = root / 'static/src/game' / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, dest)
        shutil.copy2(FULL / 'static/src/odoo_bridge.js', root / 'static/src/odoo_bridge.js')
        (root / 'static/description').mkdir(parents=True, exist_ok=True)
        shutil.copy2(FULL / 'static/description/icon.png', root / 'static/description/icon.png')
        index = root / 'static/src/game/index.html'
        page = patch_index(index.read_text(encoding='utf-8'), version)
        index.write_text(page, encoding='utf-8')
        (root / 'data/page.xml').write_text(build_page(page), encoding='utf-8')
        # (les données XML doivent rester lisibles par Odoo : on vérifie qu'elles sont bien formées)
        for xml in (root / 'data').glob('*.xml'):
            ET.parse(xml)
        DIST.mkdir(exist_ok=True)
        target = DIST / f'{NAME}{"_leger" if light else ""}.zip'
        with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(root.rglob('*')):
                if path.is_file():
                    archive.write(path, Path(NAME) / path.relative_to(root))
        with zipfile.ZipFile(target) as archive:
            names = archive.namelist()
        py = [n for n in names if n.endswith('.py') and not n.endswith('__manifest__.py')]
        print(f'{target} : {target.stat().st_size / 1024 / 1024:.1f} Mo, {len(names)} fichiers, '
              f'{len(py)} fichier(s) Python hors manifeste (0 attendu), version {version}')
        assert not py, py


if __name__ == '__main__':
    main()
