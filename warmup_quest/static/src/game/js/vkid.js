// Enfant virtuel (mode test) : remplace la caméra ET la détection par un enfant simulé, pour tester le jeu « comme
// devant une webcam » sans personne. ?world=defis&vkid=1
// - Un squelette 3D d'enfant (taille, distance à la caméra réglables) est projeté comme le ferait une webcam 4:3 :
//   33 points dans l'image + les points 3D en mètres, exactement le format de MediaPipe, ~20 fois par seconde.
// - Bruit de détection : petits tremblements des points, poignets parfois mal vus.
// - Un « cerveau » d'enfant regarde l'écran et joue : il attrape les étoiles, vise les ingrédients avec un peu
//   d'imprécision qu'il corrige en regardant, lance des boules de neige, joint les mains, prend les poses… avec un
//   temps de réaction et des bras qui ne vont pas toujours au bout.
// - Mesures dans le titre de la page (VK {...}) : résultat de chaque jeu miroir, portée mesurée par l'échauffement,
//   erreur entre la main visée et la main magique.
// Réglages : vkidh (taille en m, 1.25), vkidd (distance en m, 2.4), vkidnoise (bruit, 1), vkidlag (réaction en ms, 300),
// vkidskill (0 à 1, 0.7 : précision et obéissance), vkidseed.

const VKid = (() => {
  const P = new URLSearchParams(location.search);
  const on = !!P.get('vkid');
  // Profils « vraie vie » : ?vkid=petit, grand, decale, biais, camhaute, cambasse, travers, bouge, proche, loin, pire
  const PROFILES = {
    petit: { h: 1.0, d: 2.0 }, grand: { h: 1.5, d: 2.9 }, decale: { x: 0.55 }, biais: { yaw: 30, x: -0.25 },
    camhaute: { cam: 1.7, tilt: -22 }, cambasse: { cam: 0.35, tilt: 10 }, travers: { roll: 9, x: 0.2 },
    bouge: { drift: 0.45 }, proche: { d: 1.55 }, loin: { d: 3.6, h: 1.1 },
    pire: { h: 1.05, d: 1.9, x: 0.4, yaw: 25, cam: 1.5, tilt: -18, roll: 6, drift: 0.35, noise: 1.8, skill: 0.45, lag: 450 },
  };
  // Caméra (commune aux deux enfants) : réglée par le profil du premier
  const PR1 = PROFILES[P.get('vkid')] || {};
  const g1 = (k, pk, def) => Number(P.get(k) ?? PR1[pk] ?? def);
  const CAM_H = g1('vkidcam', 'cam', 0.9), TILT = (g1('vkidtilt', 'tilt', 0) * Math.PI) / 180, ROLL = (g1('vkidroll', 'roll', 0) * Math.PI) / 180;
  const TAN_H = Math.tan((62 * Math.PI) / 360), TAN_V = TAN_H * 0.75;
  // Deux enfants : ?vkid2=1 (ou un profil : ?vkid2=petit), écart entre eux ?vkidgap=1.3 (m), réglages vkid2h, vkid2x…
  const DUO = !!P.get('vkid2'), GAP = Number(P.get('vkidgap') || 1.3), LEAVE = Number(P.get('vkid2leave') || 0), LEAVE1 = Number(P.get('vkid1leave') || 0); // (vkid1leave : c'est le joueur 1 qui part) // (vkid2leave=20 : le 2e enfant s'en va après 20 s de jeu)
  let playT = 0;
  const stats = { games: [], cal: null, err: [], frames: 0, swaps: 0, lost: 0, duoFrames: 0, stages: [] };

  function makeKid(idx) {
  const pre = idx ? 'vkid2' : 'vkid', PR = PROFILES[P.get(pre)] || (idx ? PROFILES[P.get('vkid')] || {} : {});
  const num = (k, pk, def) => Number(P.get(pre + k) ?? PR[pk] ?? def);
  const H = num('h', 'h', idx ? 1.15 : 1.25), D = num('d', 'd', 2.4), NOISE = num('noise', 'noise', 1);
  const LAG = num('lag', 'lag', 300 + idx * 80), SKILL = Math.max(0, Math.min(1, num('skill', 'skill', 0.7)));
  const X0 = num('x', 'x', 0) + (DUO ? (idx ? -GAP / 2 : GAP / 2) : 0); // (à deux : joueur 1 à gauche de l'écran = à droite de l'image)
  const YAW = (num('yaw', 'yaw', 0) * Math.PI) / 180, DRIFT = num('drift', 'drift', 0);
  let drift = { x: 0, z: 0, vx: 0, vz: 0 }, home = 0, back = 0; // (back : il a reculé quand le jeu le lui a demandé) // (home : là où l'enfant s'est placé, s'il a obéi à « écartez-vous »)
  // Proportions d'un enfant (part de la taille)
  const B = { hipY: 0.53, hipW: 0.075, torso: 0.27, shW: 0.12, upper: 0.17, fore: 0.15, hand: 0.07, thigh: 0.25, shin: 0.24 };
  const L = (k) => B[k] * H, ARM = L('upper') + L('fore'), TORSO = L('torso');
  let seed = Number(P.get('vkidseed') || 7) + idx * 1009;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const V = (x = 0, y = 0, z = 0) => ({ x, y, z });
  const add = (a, b, k = 1) => V(a.x + b.x * k, a.y + b.y * k, a.z + b.z * k);
  const sub = (a, b) => V(a.x - b.x, a.y - b.y, a.z - b.z);
  const len = (a) => Math.hypot(a.x, a.y, a.z);
  const norm = (a) => { const l = len(a) || 1; return V(a.x / l, a.y / l, a.z / l); };
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const lerpV = (a, b, k) => V(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);

  // État du corps (lissé) et intention (ce que le cerveau veut, appliquée après le temps de réaction)
  const rest = () => ({ bx: 0, lean: 0, drop: 0, jump: 0, spread: 0, kneeL: 0, kneeR: 0,
    wL: V(L('shW') + 0.02, -ARM * 0.95, 0.04), wR: V(-L('shW') - 0.02, -ARM * 0.95, 0.04) }); // (poignets, par rapport à l'épaule)
  let cur = rest(), queue = [], last = 0, jumpT = 0, aim = { key: null, bias: V(), t: 0 }, throwS = null, stirA = 0;

  // ---------- Squelette -> points (image et 3D)
  function ik(root, target, a, b, pole) { // deux os (épaule-coude-poignet, hanche-genou-cheville)
    const t = sub(target, root), d = Math.min(len(t), a + b - 1e-4), u = norm(t);
    const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    const n = norm(sub(pole, V(u.x * dot(pole, u), u.y * dot(pole, u), u.z * dot(pole, u))));
    return { mid: add(add(root, u, x), n, h), end: add(root, u, d) };
  }
  function joints(s) {
    const hip = V(s.bx, L('hipY') - s.drop * 0.2 * H + s.jump, 0);
    const sh = add(hip, V(s.lean * 0.12 * H, TORSO * (1 - Math.abs(s.lean) * 0.08), -s.drop * 0.05 * H)); // (penché : les épaules partent de côté)
    const J = {};
    J.hipL = add(hip, V(L('hipW'), 0, 0)); J.hipR = add(hip, V(-L('hipW'), 0, 0));
    J.shL = add(sh, V(L('shW'), 0, 0)); J.shR = add(sh, V(-L('shW'), 0, 0));
    J.nose = add(sh, V(0, 0.1 * H, 0.05 * H));
    for (const [k, sx] of [['L', 1], ['R', -1]]) {
      const shp = J['sh' + k], w = add(shp, s['w' + k]), r = ik(shp, w, L('upper'), L('fore'), V(sx * 0.3, -1, -0.4));
      J['el' + k] = r.mid; J['wr' + k] = r.end;
      const d = norm(sub(r.end, r.mid));
      J['ix' + k] = add(r.end, d, L('hand')); J['pk' + k] = add(add(r.end, d, L('hand') * 0.8), V(sx * 0.02, 0, 0)); J['th' + k] = add(add(r.end, d, L('hand') * 0.5), V(-sx * 0.02, 0, 0.02));
      // jambe : la cheville reste au sol (ou monte pour le genou levé)
      const hp = J['hip' + k], lift = s['knee' + k];
      const ank = lift > 0 ? add(hp, V(0, -L('thigh') * 0.6 - L('shin') * 0.55 * (1 - lift * 0.3), L('thigh') * 0.55 * lift)) : V(hp.x + sx * s.spread * 0.16 * H, 0.04 * H + s.jump, 0);
      const lr = ik(hp, ank, L('thigh'), L('shin'), V(0, 0.2, 1));
      J['kn' + k] = lr.mid; J['an' + k] = lr.end; J['he' + k] = add(lr.end, V(0, -0.02 * H, -0.03 * H)); J['ft' + k] = add(lr.end, V(0, -0.03 * H, 0.08 * H));
    }
    J.hip = hip;
    return J;
  }
  const ORDER = (J) => [J.nose, add(J.nose, V(0.015 * H, 0.02 * H, -0.01 * H)), add(J.nose, V(0.025 * H, 0.02 * H, -0.01 * H)), add(J.nose, V(0.035 * H, 0.02 * H, -0.015 * H)),
    add(J.nose, V(-0.015 * H, 0.02 * H, -0.01 * H)), add(J.nose, V(-0.025 * H, 0.02 * H, -0.01 * H)), add(J.nose, V(-0.035 * H, 0.02 * H, -0.015 * H)),
    add(J.nose, V(0.055 * H, 0.005 * H, -0.06 * H)), add(J.nose, V(-0.055 * H, 0.005 * H, -0.06 * H)), add(J.nose, V(0.015 * H, -0.025 * H, 0)), add(J.nose, V(-0.015 * H, -0.025 * H, 0)),
    J.shL, J.shR, J.elL, J.elR, J.wrL, J.wrR, J.pkL, J.pkR, J.ixL, J.ixR, J.thL, J.thR, J.hipL, J.hipR, J.knL, J.knR, J.anL, J.anR, J.heL, J.heR, J.ftL, J.ftR];
  // Placement réel : l'enfant est décalé, tourné de biais, il se balade ; la caméra est haute ou basse, penchée, de travers
  function place(p) {
    const c = Math.cos(YAW), sn = Math.sin(YAW);
    return V(p.x * c + p.z * sn + X0 + drift.x, p.y, -p.x * sn + p.z * c + drift.z - back);
  }
  function toCam(p) { // repère de la caméra (x à droite de l'image, y en haut, z vers l'arrière de la caméra)
    let x = p.x, y = p.y - CAM_H, z = p.z - D;
    const ct = Math.cos(-TILT), st = Math.sin(-TILT); [y, z] = [y * ct - z * st, y * st + z * ct]; // (inclinaison haut / bas)
    const cr = Math.cos(-ROLL), sr = Math.sin(-ROLL); [x, y] = [x * cr - y * sr, x * sr + y * cr]; // (caméra de travers)
    return V(x, y, z);
  }
  function project(q) { const dep = Math.max(0.3, -q.z); return { x: 0.5 + q.x / (2 * dep * TAN_H), y: 0.5 - q.y / (2 * dep * TAN_V), z: q.z / (2 * dep * TAN_H) }; }

  function frame(now) {
    const J = joints(cur), cams = ORDER(J).map((p) => toCam(place(p))), hipC = toCam(place(J.hip)), n = 0.004 * NOISE;
    const out = cams.map((cq, i) => {
      const q = project(cq), hand = i >= 15 && i <= 22, jit = hand ? 1.6 : 1;
      let vis = hand ? 0.82 + rnd() * 0.15 : 0.93 + rnd() * 0.07;
      if (q.x < 0 || q.x > 1 || q.y < 0 || q.y > 1) vis *= 0.25; // (hors de l'image : MediaPipe devine, avec peu de confiance)
      if (i === 19 || i === 20) vis -= 0.12; // (le bout des doigts est moins bien vu que le poignet)
      if (hand && rnd() < 0.03 * NOISE) vis = 0.2; // (poignet mal vu, de temps en temps)
      return { x: q.x + gauss() * n * jit, y: q.y + gauss() * n * jit, z: q.z, visibility: vis };
    });
    out.world = cams.map((p) => ({ x: p.x - hipC.x + gauss() * 0.008 * NOISE, y: -(p.y - hipC.y) + gauss() * 0.008 * NOISE, z: -(p.z - hipC.z) + gauss() * 0.012 * NOISE }));
    return out;
  }

  // ---------- Cerveau : ce que l'enfant essaie de faire, en regardant l'écran
  const reach = (vx, vy, ext = 0.95) => { // vecteur voulu à l'écran (en torses, miroir, y vers le bas) -> poignet par rapport à l'épaule
    const p = Math.hypot(vx, vy) * TORSO, mx = ARM * ext, k = p > mx ? mx / p : 1, px = -vx * TORSO * k, py = -vy * TORSO * k;
    return V(px, py, Math.sqrt(Math.max(0, mx * mx - (px * px + py * py))) * 0.6);
  };
  const POSES = {
    up: (s) => { s.wL = V(0.08, ARM * 0.95, 0.03); s.wR = V(-0.08, ARM * 0.95, 0.03); },
    plane: (s) => { s.wL = V(ARM * 0.97, 0.02, 0.03); s.wR = V(-ARM * 0.97, 0.02, 0.03); },
    star: (s) => { s.wL = V(ARM * 0.68, ARM * 0.68, 0.03); s.wR = V(-ARM * 0.68, ARM * 0.68, 0.03); s.spread = 1; },
    together: (s) => { s.wL = V(-L('shW') + 0.01, -0.1, ARM * 0.82); s.wR = V(L('shW') - 0.01, -0.1, ARM * 0.82); },
  };
  function pose(s, p) {
    if (p === 'armsUp') POSES.up(s); else if (p === 'airplane') POSES.plane(s); else if (p === 'star') POSES.star(s);
    else if (p === 'squat') s.drop = 1; else if (p === 'flamingo') { s.kneeL = 1; POSES.plane(s); }
    else if (p === 'left') s.bx = home + 0.42; else if (p === 'right') s.bx = home - 0.42; else if (p === 'handsTogether') POSES.together(s);
  }
  // Toucher un point de l'écran : bras du bon côté ; vise avec une erreur qui se corrige en regardant la main magique
  function touch(s, now, A, tx, ty, key) {
    const Bd = A.B; if (!Bd || !Bd.J || !Bd.J.sL) return;
    const left = tx < Bd.sh.x, s0 = left ? Bd.J.sL : Bd.J.sR, b0 = tracker.lead();
    const k = (typeof A3_REACH !== 'undefined' ? A3_REACH : 1.9) / ((b0 && b0.reachK) || 1.1);
    if (aim.key !== key) aim = { key, bias: V(gauss() * 0.35 * (1.2 - SKILL), gauss() * 0.35 * (1.2 - SKILL), 0), t: now };
    const decay = Math.exp(-(now - aim.t) / 1000 * (0.6 + SKILL * 1.4));
    const vx = (tx - s0.x) / (Bd.T * k) + aim.bias.x * decay, vy = (ty - s0.y) / (Bd.T * k) + aim.bias.y * decay;
    const w = reach(vx, vy, 0.85 + SKILL * 0.12);
    if (left) s.wL = w; else s.wR = w;
    // mesure : où la main magique arrive vraiment, par rapport à la cible (sans l'aide à la visée)
    if (!idx && now - aim.t > 500 && A.v3 && A.v3.lastVec) {
      const v = A.v3.lastVec[left ? 0 : 1]; if (v) stats.err.push(Math.hypot(s0.x + v[0] * Bd.T * k - tx, s0.y + v[1] * Bd.T * k - ty) / Bd.T);
    }
  }
  function brain(now) {
    const s = rest(), A = typeof arena !== 'undefined' ? arena : null, ph = typeof phase !== 'undefined' ? phase : '';
    s.bx = home; // (revient à sa place sauf si une consigne demande un pas)
    if (ph === 'play' && !playT) playT = now;
    const ap = Number(P.get(pre + 'approach') || 0); // (vkidapproach=10 : après 10 s de jeu, il s'approche tout près de l'écran)
    if (ap && playT && now - playT > ap * 1000) back = Math.max(-(D - 0.95), back - 0.01);
    const lv = idx ? LEAVE : LEAVE1;
    if (lv && playT && now - playT > lv * 1000) { const out = idx ? -(X0 + 3) : 3 - X0; home += (out - home) * 0.05; s.bx = home; return s; } // (il part en courant hors de l'image)
    if (ph === 'calib') {
      // il obéit aux conseils d'installation (« recule », « décale-toi ») ; la caméra mal placée, il n'y peut rien
      const cs = typeof calibState !== 'undefined' ? calibState.stage || '' : '';
      if (cs === 'fix-close' || cs === 'back') { back = Math.min(2.5, back + 0.02); return s; }
      if (cs === 'fix-offRight') { home += 0.015; s.bx = home; return s; }
      if (cs === 'fix-offLeft') { home -= 0.015; s.bx = home; return s; }
      if (cs.startsWith('fix-')) return s;
      // à deux, chacun va vers son rond (le jeu le demande : « écartez-vous », « chacun dans son rond »), puis lève les bras
      if (DUO && tracker.bodies.length === 2 && !(tracker.duoPlacement() || { ok: true }).ok) {
        const want = ((idx ? 0.28 : 0.72) - 0.5) * 2 * D * TAN_H; home += Math.max(-0.03, Math.min(0.03, (want - (X0 + home)) * 0.08)); s.bx = home;
      } else POSES.up(s);
      return s;
    }
    if (ph === 'paused') { POSES.up(s); return s; } // (« lève les bras pour reprendre »)
    if (!A || !A.s || ph !== 'play') return s;
    const st = A.st, g = A.s.game, obey = rnd() < 0.5 + SKILL * 0.5;
    if (A.cal) { const d = A.calDirs()[A.cal.i], n = Math.hypot(d[0], d[1]), w = reach(d[0] / n * 9, d[1] / n * 9, 0.86 + SKILL * 0.1); if (d[0] < 0) s.wL = w; else s.wR = w; return s; }
    if (A.intro || A.outro) return s;
    if (g === 'potions') {
      if (st.phase === 'pick') { const it = (st.items || []).find((x) => !x.taken && !x.bad && x.x != null); if (it) touch(s, now, A, it.x, it.y, it); }
      else { stirA += 0.11; s.wR = V(-L('shW') + Math.cos(stirA) * ARM * 0.6, Math.sin(stirA) * ARM * 0.6, 0.15); }
    } else if (g === 'neige') {
      const m = (st.men || []).find((x) => !x.hit && !x.gone && x.x != null && now - x.t0 > 400);
      if (m && (!throwS || now - throwS.t > 1400)) throwS = { t: now, left: m.x < A.B.sh.x };
      if (throwS) { const k = now - throwS.t, w = k < 450 ? V(0.05, ARM * 0.95, 0) : k < 800 ? V(0.05, -ARM * 0.6, ARM * 0.6) : null; if (w) { if (throwS.left) s.wL = V(w.x + L('shW') * 0, w.y, w.z); else s.wR = V(-w.x, w.y, w.z); } }
    } else if (g === 'duel') {
      if ((st.phase === 'charge' || st.phase === 'cast') && st.kind === 'shield') POSES.together(s);
      if (st.phase === 'cast' && st.kind === 'dodge') s.bx = home + 0.42;
      if (st.phase === 'counter') POSES.up(s);
    } else if (g === 'mur') { const w = st.wall; if (w && (now - w.t0) / w.dur > 0.3 && obey) pose(s, w.pose); }
    else if (g === 'pimprenelle') {
      const c = st.cur;
      if (c && now - c.t0 > 900 && (c.simon ? obey : rnd() < 0.02 * (1 - SKILL))) {
        if (c.o.g === 'jump') { if (now - jumpT > 900) jumpT = now; } else if (c.o.g === 'smash') { const k = (now - c.t0) % 900; s.wR = k < 450 ? V(-0.05, ARM * 0.95, 0) : V(-0.05, -ARM * 0.6, ARM * 0.6); } else pose(s, c.o.g);
      }
    } else if (g === 'soleil') {
      if (st.phase === 'dos' && now - st.at > LAG) { const k = Math.sin(now / 160); s.kneeL = Math.max(0, k) * 0.6; s.kneeR = Math.max(0, -k) * 0.6; s.wL = V(0.15, -ARM * (0.6 - k * 0.25), k * 0.25); s.wR = V(-0.15, -ARM * (0.6 + k * 0.25), -k * 0.25); }
    } else if (g === 'corde') { const k = Math.sin(now / 110); s.wL = V(L('shW') * 0.2, k * ARM * 0.7, ARM * 0.5); s.wR = V(-L('shW') * 0.2, -k * ARM * 0.7, ARM * 0.5); }
    else if (g === 'equilibre') { s.kneeL = 1; if (st.gust || tracker.mode === 'upper') POSES.plane(s); }
    else if (g === 'balai') { const r = (st.rings || []).find((x) => !x.res); if (r) { s.bx = home - r.gx * 0.15; s.lean = -r.gx; if (r.gy < 0) POSES.up(s); if (r.gy > 0) s.drop = 1; } }
    else if (g === 'photo') POSES.star(s);
    return s;
  }

  // ---------- Boucle (appelée à la place de la détection)
  function step(now) {
    const dt = Math.min(0.2, (now - (last || now)) / 1000); last = now;
    queue.push({ t: now, s: brain(now) });
    while (queue.length > 1 && queue[1].t <= now - LAG) queue.shift();
    const want = queue[0].s;
    const ka = 1 - Math.exp(-dt / (0.14 - SKILL * 0.04)), kb = 1 - Math.exp(-dt / 0.22);
    cur.wL = lerpV(cur.wL, want.wL, ka); cur.wR = lerpV(cur.wR, want.wR, ka);
    for (const k of ['bx', 'lean', 'drop', 'spread', 'kneeL', 'kneeR']) cur[k] += (want[k] - cur[k]) * kb;
    const jk = now - jumpT < 420 ? Math.sin(((now - jumpT) / 420) * Math.PI) : 0; cur.jump = jk * 0.14 * H;
    if (DRIFT) { // (un enfant ne reste pas en place : il se balade doucement, revient vers le milieu)
      drift.vx = drift.vx * 0.96 + gauss() * 0.006 * DRIFT - drift.x * 0.004; drift.vz = drift.vz * 0.96 + gauss() * 0.006 * DRIFT - drift.z * 0.004;
      drift.x = Math.max(-DRIFT, Math.min(DRIFT, drift.x + drift.vx)); drift.z = Math.max(-DRIFT, Math.min(DRIFT, drift.z + drift.vz));
    }
    return frame(now);
  }
  return { step, H, SKILL, ARM, TORSO };
  }

  const kids = on ? (DUO ? [makeKid(0), makeKid(1)] : [makeKid(0)]) : [];
  let lastF = 0, seenArena = null, arenaT0 = 0;
  function feed(tr, now) {
    if (now - lastF < 50) return; // (~20 analyses par seconde, comme la vraie détection)
    lastF = now;
    const list = kids.map((k) => k.step(now));
    if (list.length > 1 && Math.random() < 0.5) list.reverse(); // (MediaPipe rend les squelettes dans n'importe quel ordre)
    tr.assign(list, now);
    stats.frames++;
    if (DUO && tr.bodies.length === 2) { // qui est qui : le joueur 1 doit rester l'enfant de gauche de l'écran (droite de l'image)
      const [b0, b1] = tr.bodies; stats.duoFrames++;
      if (!b0.state.present || !b1.state.present) stats.lost++;
      else if (b0.center && b1.center && b0.center.x < b1.center.x) stats.swaps++;
    }
    measure(now);
  }
  function measure(now) {
    const A = typeof arena !== 'undefined' ? arena : null, b0 = tracker.lead();
    if (b0 && b0.reachK && !stats.cal) { const k0 = kids[0]; stats.cal = { reachK: +b0.reachK.toFixed(2), kidArm: +((k0.ARM * (0.86 + k0.SKILL * 0.1)) / k0.TORSO * 1.05).toFixed(2) }; }
    if (A && A.s && A.s !== seenArena) { seenArena = A.s; arenaT0 = now; }
    if (A && seenArena && (!A.s || A.st.over || A.outro) && !seenArena.done) {
      seenArena.done = true;
      stats.games.push({ g: seenArena.game, ratio: +A.ratio().toFixed(2), ok: A.st ? A.st.ok : 0, n: seenArena.n, s: Math.round((now - arenaT0) / 1000) });
    }
    if (stats.frames % 10 === 0) {
      const e = stats.err, m = e.length ? e.reduce((a, b) => a + b, 0) / e.length : null;
      const cs = typeof calibState !== 'undefined' ? calibState.stage : ''; if (cs && stats.stages[stats.stages.length - 1] !== cs) stats.stages.push(cs);
      const b0d = tracker.bodies[0], lmd = b0d && b0d.lm; if (P.get('vkiddbg') && lmd) stats.dbg = { pres: b0d.state.present, up: b0d.state.upperBody, nose: [+lmd[0].y.toFixed(2), +(lmd[0].visibility ?? 1).toFixed(2)], sh: +lmd[11].y.toFixed(2), hip: +lmd[23].y.toFixed(2), hipv: +(lmd[23].visibility ?? 1).toFixed(2) };
      document.title = 'VK ' + JSON.stringify({ dbg: stats.dbg, stages: stats.stages, phase: typeof phase !== 'undefined' ? phase : '', games: stats.games, cal: stats.cal, aimErr: m == null ? null : +m.toFixed(2), n: e.length, ...(DUO ? { duo: { frames: stats.duoFrames, swaps: stats.swaps, lost: stats.lost } } : {}) });
    }
  }
  return { on, feed, stats, profiles: PROFILES };
})();
