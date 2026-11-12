"""Crée les séquences d'échauffement par défaut (identiques au jeu autonome)."""


def _R(t, target):
    return {'move': 'run', 'duration': t, 'target': target}


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


# Épreuves rigolotes ajoutées à chaque séquence par défaut (aussi utilisé par la migration 20.0.2.0.0)
FUN_STEPS = [_U(4), _M(12, 6), _PM('armsUp', 'star', 'airplane')]


DEFAULT_SEQUENCES = [
    ('turbo', 'Échauffement Turbo', [
        _Z(2.5, "Prêt ? On s'échauffe !"),
        _R(6, 12), _J(), _R(5, 10),
        _L(), _D(), _L(), _D(),
        _S(), _J(2), _X(),
        _R(6, 12),
        _P('airplane'),
        _B(10, 6),
        _C('jump', 'squat'),
        _L(), _D(),
        _F(14),
        _R(8, 16),
        _C('left', 'jump', 'right', 'jump'),
        _S(2), _X(2),
        _P('star'),
        _R(6, 12),
        _C('jump', 'squat', 'smash'),
        _Z(3, 'Bravo ! Respire bien…'),
    ]),
    ('island', 'Échauffement Bondissant', [
        _Z(2.5, 'Prêt ? On saute !'),
        _R(5, 10), _J(), _J(2), _X(),
        _S(), _J(3),
        _P('armsUp'),
        _X(2), _L(), _D(),
        _B(10, 6),
        _R(6, 12),
        _C('jump', 'smash'),
        _F(14),
        _S(2), _J(2),
        _P('flamingo', 2),
        _C('squat', 'jump', 'smash'),
        _X(3),
        _R(6, 12),
        _C('left', 'smash', 'right', 'smash'),
        _J(3),
        _Z(3, 'Super ! Souffle un peu…'),
    ]),
    ('forest', 'Échauffement des Créatures', [
        _Z(2.5, 'Prêt ? On imite Lumi !'),
        _R(5, 10),
        _P('armsUp'), _P('star'),
        _S(), _J(),
        _P('airplane'),
        _L(), _D(),
        _P('flamingo', 2),
        _B(10, 6),
        _R(6, 12),
        _F(14),
        _C('squat', 'jump'),
        _P('star'),
        _X(2),
        _C('left', 'right', 'jump'),
        _P('airplane', 2),
        _R(6, 12),
        _S(2), _J(2),
        _P('armsUp', 2),
        _C('jump', 'squat', 'smash'),
        _Z(3, 'Magnifique… respire comme Lumi.'),
    ]),
]


def _with_fun(steps):
    """Insère tunnel, taupes et suite de poses à 1/4, 1/2 et 3/4 de la séquence."""
    steps = list(steps)
    n = len(steps)
    for step, at in zip(reversed(FUN_STEPS), (round(n * 0.75), round(n * 0.5), round(n * 0.25))):
        steps.insert(at, step)
    return steps


def post_init_hook(env):
    Sequence = env['warmup.sequence']
    for world, name, steps in DEFAULT_SEQUENCES:
        if Sequence.search_count([('world', '=', world)]):
            continue
        Sequence.create({
            'name': name,
            'world': world,
            'step_ids': [(0, 0, dict(step, sequence=(i + 1) * 10)) for i, step in enumerate(_with_fun(steps))],
        })
