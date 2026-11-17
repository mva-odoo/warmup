"""Crée une séquence d'échauffement par défaut pour chaque monde (même programme que le jeu)."""


def _R(t):
    return {'move': 'run', 'duration': t}


def _J(n=1):
    return {'move': 'jump', 'count': n}


def _S(n=1):
    return {'move': 'squat', 'count': n}


def _X(n=1):
    return {'move': 'smash', 'count': n}


def _L():
    return {'move': 'left'}


def _D():
    return {'move': 'right'}


def _P(pose, hold=1.5):
    return {'move': 'pose', 'pose': pose, 'hold': hold}


def _C(*parts):
    return {'move': 'combo', 'combo': ','.join(parts)}


def _Z(t, text):
    return {'move': 'rest', 'duration': t, 'text': text}


def _B(t, n):
    return {'move': 'bubbles', 'duration': t, 'count': n}


def _F(t):
    return {'move': 'freeze', 'duration': t}


def _U(t):
    return {'move': 'tunnel', 'duration': t}


def _M(t, n):
    return {'move': 'moles', 'duration': t, 'count': n}


def _PM(*poses):
    return {'move': 'posemix', 'combo': ','.join(poses), 'hold': 0.8}


def _CA(t):
    return {'move': 'catch', 'duration': t}


def _RO(n):
    return {'move': 'rope', 'count': n}


def _DN(*moves):
    return {'move': 'dance', 'combo': ','.join(moves), 'hold': 1.8}


def _KA(*moves):
    return {'move': 'karate', 'combo': ','.join(moves), 'hold': 2.0}


def _BS(*poses):
    return {'move': 'boss', 'combo': ','.join(poses), 'hold': 0.9}


BOSS_POSES = [('star', 'airplane', 'armsUp'), ('armsUp', 'star', 'airplane'), ('airplane', 'armsUp', 'star')]


# Ordre des mondes dans worlds.js (le gardien de chaque monde y est choisi par sa position)
JS_WORLD_ORDER = ['ecole', 'jardin3d', 'disco', 'dojo', 'verger', 'rythmo', 'singes', 'supermarche', 'turbo', 'island', 'forest', 'banquise', 'ocean',
                  'espace', 'bonbons', 'ferme', 'dinos', 'chateau', 'sortileges', 'stade']


def _boss_step(world):
    """Gardien de fin de monde (même règle que worlds.js)."""
    i = JS_WORLD_ORDER.index(world) if world in JS_WORLD_ORDER else 0
    return _BS(*BOSS_POSES[i % 3])


def _with_boss(steps, world):
    """Ajoute le gardien juste avant la respiration finale."""
    steps = list(steps)
    steps.insert(len(steps) - 1, _boss_step(world))
    return steps


def _MO(t, n):
    return {'move': 'foam', 'duration': t, 'count': n}


def _SH(t):
    return {'move': 'shop', 'duration': t}


def _SL(t, n):
    return {'move': 'slice', 'duration': t, 'count': n}


def _WA(t, n):
    return {'move': 'wand', 'duration': t, 'count': n}


def _GO(n):
    return {'move': 'goal', 'count': n}


def _BK(n):
    return {'move': 'basket', 'count': n}


def _KI(n):
    return {'move': 'kick', 'count': n}


def _CU(n, beat=1.4):
    return {'move': 'cubes', 'count': n, 'hold': beat}


def _AC(game, n):
    """Jeu sur place d'un pays (fleurs, pingouins, dauphins, fusée, dinos, animaux)."""
    return {'move': 'act_' + game, 'count': n}


# Épreuves rigolotes ajoutées à chaque séquence par défaut (aussi utilisé par la migration 20.0.2.0.0)
FUN_STEPS = [_U(4), _M(12, 6), _PM('armsUp', 'star', 'airplane')]


DEFAULT_SEQUENCES = [
    ('jardin3d', 'Échauffement du Jardin', [
        _Z(4, 'Cours de botanique ! Bouton, le jardinier, te confie des graines magiques. On les fait pousser ?'),
        _AC('grow', 3), _CA(10), _B(10, 6), _AC('grow', 3), _P('star'), _M(12, 6), _F(14), _AC('grow', 4),
        _Z(3, 'Bravo, petit sorcier ! Respire le parfum des fleurs…'),
    ]),
    ('disco', 'Chorégraphies de Tempo', [
        _Z(4, 'Cours de danse ! Chez les petits sorciers, on danse pour lancer des sorts. Musique !'),
        _DN('armsUp', 'squat', 'armsUp', 'squat', 'left', 'right', 'left', 'right'),
        _DN('star', 'jump', 'star', 'jump', 'airplane', 'armsUp'), _F(14),
        _DN('left', 'armsUp', 'right', 'armsUp', 'squat', 'jump', 'star', 'airplane'),
        _DN('flamingo', 'armsUp', 'squat', 'jump', 'left', 'right'), _Z(3, 'Bravo ! Salue la classe…'),
    ]),
    ('dojo', 'Leçon de Maître Bambou', [
        _Z(4, 'Cours de défense avec Maître Bambou : on apprend à arrêter les mauvais sorts. Salue le maître… Kiaï !'), _KA('armsUp', 'squat', 'armsUp', 'squat', 'smash', 'smash'),
        _KA('flamingo', 'squat', 'left', 'right', 'smash', 'jump'), _P('airplane'),
        _KA('squat', 'armsUp', 'smash', 'flamingo', 'jump', 'star'), _M(12, 6),
        _KA('left', 'smash', 'right', 'smash', 'squat', 'jump'), _Z(3, 'Salue le maître… et respire.'),
    ]),
    ('verger', 'Entraînement des Ninjas', [
        _Z(4, 'Atelier des potions ! Kiwi a besoin de fruits magiques coupés en deux pour sa potion. Prêt ?'), _SL(14, 8), _J(2), _SL(14, 10), _P('star'),
        _S(2), _SL(16, 12), _P('airplane'), _SL(14, 10), _Z(3, 'La potion bouillonne… Bravo ! Respire bien.'),
    ]),
    ('rythmo', 'Rythmes de Bip', [
        _Z(2.5, 'Prêt ? Musique !'), _CU(12, 1.6), _S(2), _CU(16, 1.4), _P('armsUp'),
        _CU(16, 1.3), _J(2), _CU(20, 1.2), _Z(3, 'Bravo ! Quel rythme…'),
    ]),
    ('singes', 'Les farces des singes', [
        _Z(4, "Oh non ! Le Nuage Grognon a ensorcelé les singes de l'Académie : ils couvrent les vitres de la tour de mousse !"), _MO(16, 6), _J(2), _R(6), _MO(18, 8), _P('armsUp'),
        _S(2), _MO(18, 8), _CA(10), _MO(20, 10), _Z(3, 'Bravo ! La tour brille… respire bien.'),
    ]),
    ('sortileges', 'Les sortilèges du Nuage Grognon', [
        _Z(4, "Ta première aventure ! Le Nuage Grognon a caché l'Étoile violette dans le Bois des Sortilèges. Chut… prépare ta baguette !"), _WA(16, 3), _R(6), _J(2), _P('armsUp'),
        _WA(18, 4), _S(2), _B(10, 6), _WA(20, 5), _CA(10), _Z(3, 'Bravo, petit sorcier ! Respire bien…'),
    ]),
    ('stade', 'Le match des créatures', [
        _Z(4, "Dring ! C'est la récré ! On joue au ballon avec les créatures de l'Académie."), _R(6), _GO(5), _J(2), _BK(3), _S(2), _KI(4),
        _P('star'), _GO(6), _L(), _D(), _BK(3), _KI(4), _Z(3, 'Dring ! La récré est finie. Respire bien, champion…'),
    ]),
    ('supermarche', 'Les courses de Panier', [
        _Z(4, "Au marché aux ingrédients ! Remplis ton caddie pour l'atelier des potions… et attention aux chapardeurs !"), _SH(12), _J(2), _SH(14), _P('armsUp'), _S(2),
        _SH(16), _X(2), _SH(14), _Z(3, 'Les courses sont faites ! Respire bien…'),
    ]),
    ('turbo', 'Échauffement Turbo', [
        _Z(2.5, "Prêt ? On s'échauffe !"), _R(6), _J(), _R(5), _L(), _D(), _L(), _D(), _S(), _J(2), _X(),
        _R(6), _P('airplane'), _B(10, 6), _CA(10), _C('jump', 'squat'), _L(), _D(), _F(14), _R(8),
        _C('left', 'jump', 'right', 'jump'), _S(2), _X(2), _P('star'), _R(6), _C('jump', 'squat', 'smash'),
        _Z(3, 'Bravo ! Respire bien…'),
    ]),
    ('island', 'Échauffement Bondissant', [
        _Z(2.5, 'Prêt ? On saute !'), _R(5), _J(), _J(2), _X(), _S(), _J(3), _P('armsUp'), _X(2), _L(), _D(),
        _B(10, 6), _RO(3), _R(6), _C('jump', 'smash'), _F(14), _S(2), _J(2), _P('flamingo', 2),
        _C('squat', 'jump', 'smash'), _X(3), _R(6), _C('left', 'smash', 'right', 'smash'), _J(3),
        _Z(3, 'Super ! Souffle un peu…'),
    ]),
    ('forest', 'Échauffement des Créatures', [
        _Z(4, "Le portail t'emmène dans la Vallée des Créatures. L'Étoile verte est cachée ici : imite les animaux, ils t'aideront à la trouver !"),
        _AC('animals', 4), _B(10, 6), _P('flamingo', 2), _C('squat', 'jump'),
        _AC('animals', 5), _CA(10), _M(12, 6), _P('star'),
        _AC('animals', 5), _F(14), _PM('armsUp', 'star', 'airplane'), _J(2),
        _Z(3, 'Magnifique… respire comme Lumi.'),
    ]),
    ('banquise', 'Échauffement Glacé', [
        _Z(4, "Brrr ! Le Nuage Grognon a tout gelé, et il a caché l'Étoile orange sous la glace. Les bébés pingouins ont besoin de toi !"),
        _AC('clap', 3), _U(4), _CA(10), _RO(3), _AC('clap', 4),
        _X(2), _B(10, 6), _F(14), _PM('airplane', 'armsUp', 'star'), _AC('clap', 4),
        _Z(3, 'Bravo ! Souffle comme le vent du nord…'),
    ]),
    ('ocean', 'Échauffement Plongée', [
        _Z(4, "Le portail s'ouvre… sous la mer ! L'Étoile bleue brille au fond de l'océan. Les dauphins vont nager avec toi !"),
        _AC('swim', 12), _B(12, 8), _U(4), _P('airplane'),
        _AC('swim', 14), _CA(10), _M(12, 6), _S(2),
        _AC('swim', 16), _CU(10, 1.5), _F(14), _P('star'),
        _Z(3, 'Super ! Respire comme une baleine…'),
    ]),
    ('espace', 'Échauffement Spatial', [
        _Z(4, "Le Nuage Grognon a emporté l'Étoile jaune tout là-haut, dans l'espace ! Prépare ta fusée…"),
        _AC('launch', 2), _CA(12), _P('star'), _J(2),
        _AC('launch', 3), _F(14), _B(10, 6), _C('left', 'right', 'jump'),
        _AC('launch', 3), _SL(12, 6), _PM('star', 'airplane', 'armsUp'), _P('airplane'),
        _Z(3, 'Atterrissage en douceur… respire.'),
    ]),
    ('bonbons', 'Échauffement Sucré', [
        _Z(2.5, 'Prêt ? Miam, on y va !'), _R(6), _CA(10), _J(), _S(), _X(2), _P('armsUp'), _B(10, 6), _L(),
        _D(), _RO(3), _C('jump', 'squat', 'smash'), _F(14), _P('flamingo', 2), _R(6),
        _Z(3, 'Bravo ! Souffle comme sur un gâteau…'),
    ]),
    ('ferme', 'Échauffement à la Ferme', [
        _Z(2.5, 'Prêt ? Bonjour la ferme !'), _R(6), _J(), _S(), _CA(10), _P('armsUp'), _L(), _D(), _X(2),
        _RO(3), _B(10, 6), _C('squat', 'jump'), _F(14), _P('flamingo', 2), _R(6),
        _Z(3, 'Bravo ! Les animaux te disent merci…'),
    ]),
    ('dinos', 'Échauffement des Dinos', [
        _Z(4, "Dans la Vallée des Dinos, le Nuage Grognon a caché l'Étoile rouge au milieu des œufs ! Marche comme un dino pour les faire éclore."),
        _AC('stomp', 3), _X(2), _J(2), _M(12, 6), _AC('stomp', 4),
        _RO(4), _CU(10, 1.5), _P('flamingo', 2), _AC('stomp', 4), _F(14),
        _Z(3, 'Bravo ! Respire comme un grand dino…'),
    ]),
    ('chateau', 'Échauffement Enchanté', [
        _Z(4, "Voici le château du Nuage Grognon. Le cœur de l'arc-en-ciel est caché ici. Courage, petit sorcier… et sois gentil avec lui !"), _R(6), _P('star'), _J(), _S(), _CA(10), _L(), _D(), _B(10, 6), _X(2),
        _P('armsUp'), _C('squat', 'jump'), _RO(3), _F(14), _P('flamingo', 2), _R(6),
        _Z(3, 'Le ciel est tout bleu… Magnifique ! Fais une révérence.'),
    ]),
]

# Mondes qui ont leur propre programme (pas d'épreuves rigolotes ajoutées)
NO_FUN = {'disco', 'dojo', 'verger', 'rythmo', 'supermarche', 'singes', 'sortileges', 'stade',
          'jardin3d', 'forest', 'banquise', 'ocean', 'espace', 'dinos'}  # (ces pays ont leur jeu sur place)


def _new_game(world):
    """Fruits ou cubes, un monde classique sur deux (même règle que worlds.js)."""
    order = [w for w, _n, _s in DEFAULT_SEQUENCES if w not in NO_FUN]
    return _CU(10, 1.5) if order.index(world) % 2 else _SL(12, 6)


def _with_fun(steps, world=None):
    """Insère tunnel, taupes, fruits / cubes et suite de poses dans la séquence."""
    steps = list(steps)
    n = len(steps)
    extra = [(FUN_STEPS[2], round(n * 0.75))]
    if world:
        extra.append((_new_game(world), round(n * 0.62)))
    extra += [(FUN_STEPS[1], round(n * 0.5)), (FUN_STEPS[0], round(n * 0.25))]
    for step, at in extra:  # (de la fin vers le début : les positions restent justes)
        steps.insert(at, step)
    return steps


def post_init_hook(env):
    """Une séquence par monde qui n'en a pas encore (aussi appelé par la migration 20.0.2.2.0)."""
    Sequence = env['warmup.sequence'].with_context(active_test=False)
    for world, name, steps in DEFAULT_SEQUENCES:
        if Sequence.search_count([('world', '=', world)]):
            continue
        steps = _with_boss(steps if world in NO_FUN else _with_fun(steps, world), world)
        Sequence.create({
            'name': name,
            'world': world,
            'step_ids': [(0, 0, dict(step, sequence=(i + 1) * 10)) for i, step in enumerate(steps)],
        })
