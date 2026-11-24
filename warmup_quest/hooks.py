"""Crée la séquence d'échauffement par défaut de chacun des 8 mondes (même programme que worlds.js)."""


def _R(t):
    return {'move': 'run', 'duration': t}


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


def _K(t):
    return {'move': 'catch', 'duration': t}


def _MO(t, n):
    return {'move': 'foam', 'duration': t, 'count': n}


def _SH(t):
    return {'move': 'shop', 'duration': t}


def _SL(t, n):
    return {'move': 'slice', 'duration': t, 'count': n}


def _GO(n):
    return {'move': 'goal', 'count': n}


def _KI(n):
    return {'move': 'kick', 'count': n}


def _CU(n, beat=1.4):
    return {'move': 'cubes', 'count': n, 'hold': beat}


def _DN(*moves):
    return {'move': 'dance', 'combo': ','.join(moves), 'hold': 1.8}


def _AR(game, n):
    """Jeu miroir (Mur Magique, Pimprenelle a dit, boules de neige, grande course)."""
    return {'move': 'arena_' + game, 'count': n}


def _AC(game, n):
    """Jeu sur place (rayons, pingouins, nage, fusée, dinos)."""
    return {'move': 'act_' + game, 'count': n}


DEFAULT_SEQUENCES = [
    ('stade', 'Le match', [
        _Z(3, "C'est le match ! Dribble les joueurs, arrête les tirs et marque des buts !"),
        _R(18), _GO(5), _KI(4), _R(18), _GO(5), _KI(4),
        _Z(3, 'Quel match ! Respire bien, champion…'),
    ]),
    ('supermarche', 'Les courses', [
        _Z(3, 'On fait les courses ! Remplis ton caddie et range les rayons.'),
        _SH(14), _AC('shelf', 4), _SL(14, 8), _SH(14), _AC('shelf', 4), _SL(12, 6),
        _Z(3, 'Les courses sont faites ! Respire bien…'),
    ]),
    ('singes', "L'heure du bain", [
        _Z(3, "C'est l'heure du bain ! Mais les singes farceurs mettent de la mousse partout…"),
        _MO(16, 6), _B(12, 8), _AC('swim', 12), _MO(18, 8), _B(12, 8), _AC('swim', 12),
        _Z(3, 'Tout propre ! Respire bien…'),
    ]),
    ('chateau', 'Les défis du château', [
        _Z(3, "Bienvenue au château ! Madame Pimprenelle t'a préparé des défis."),
        _AR('mur', 6), _AR('pimprenelle', 6), _AR('course', 1), _AR('mur', 6), _AR('pimprenelle', 6),
        _Z(3, 'Bravo, chevalier ! Respire bien…'),
    ]),
    ('banquise', 'La banquise', [
        _Z(3, 'Brrr, la banquise ! Les pingouins veulent jouer avec toi.'),
        _AR('neige', 8), _AC('clap', 3), _R(16), _F(14), _AR('neige', 8), _AC('clap', 3),
        _Z(3, 'Bravo ! Souffle comme le vent du nord…'),
    ]),
    ('dinos', 'Les dinos', [
        _Z(3, 'Bienvenue chez les dinos ! Des œufs vont bientôt éclore…'),
        _AC('stomp', 3), _R(16), _U(4), _M(12, 6), _AC('stomp', 4), _R(14),
        _Z(3, 'Bravo ! Respire comme un grand dino…'),
    ]),
    ('espace', "Le voyage dans l'espace", [
        _Z(3, "Mets ton casque, on part dans l'espace !"),
        _AC('launch', 2), _R(16), _K(12), _AC('launch', 2), _R(14), _K(10),
        _Z(3, 'Atterrissage en douceur… respire.'),
    ]),
    ('disco', 'La disco', [
        _Z(3, 'Musique ! On danse avec Tempo.'),
        _DN('armsUp', 'squat', 'armsUp', 'squat', 'left', 'right', 'left', 'right'), _CU(12, 1.6), _F(14),
        _DN('star', 'jump', 'star', 'jump', 'airplane', 'armsUp'), _CU(16, 1.4),
        _Z(3, 'Bravo, quelle danse ! Respire bien…'),
    ]),
]


def create_default_sequences(env, missing='world'):
    """Crée les séquences par défaut.

    missing='world' : seulement pour les mondes qui n'ont encore aucune séquence (installation) ;
    missing='name'  : aussi dans les mondes qui ont des séquences perso, si celle du même nom manque (migration).
    """
    Sequence = env['warmup.sequence'].with_context(active_test=False)
    for world, name, steps in DEFAULT_SEQUENCES:
        domain = [('world', '=', world)] + ([('name', '=', name)] if missing == 'name' else [])
        if Sequence.search_count(domain):
            continue
        Sequence.create({
            'name': name,
            'world': world,
            'sequence': 1,  # (la séquence par défaut passe devant les séquences perso gardées : c'est elle que le jeu lance)
            'step_ids': [(0, 0, dict(step, sequence=(i + 1) * 10)) for i, step in enumerate(steps)],
        })


def post_init_hook(env):
    """Une séquence par monde qui n'en a pas encore."""
    create_default_sequences(env)
