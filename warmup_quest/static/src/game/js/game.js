// Boucle principale : menu, calibration, déroulé des séquences, score.

const $ = (id) => document.getElementById(id);
const tracker = new Tracker();
// Tout le jeu se passe sur le chemin, personnage vu de dos (gauche = gauche).
// Les mondes « 3d » utilisent Scene3D (Three.js), qui garde exactement la même logique.
const sceneFlat = new DepthScene($('scene'));
const scene3d = new Scene3D($('scene'));
let scene = sceneFlat;
const video = $('video');
const camCtx = $('camOverlay').getContext('2d');
const pictoCtx = $('cardPicto').getContext('2d');

// Joueurs de la partie : 1, ou 2 en coopératif (chacun a sa couleur sur la vidéo)
const DUO_COLORS = ['#ff6b35', '#4ea8ff'];
let team = [{ name: '', color: null }];
let colors = [];
const duo = () => team.length > 1;
// Pastille de couleur du joueur (les petits ne lisent pas encore : couleur + initiale)
const whoTag = (i) => `<span class="who" style="--pc:${colors[i]}">${((team[i] && team[i].name) || String(i + 1)).charAt(0).toUpperCase()}</span>`;

// Réussi = ✔ vert, pas réussi = 🙂 orange : on voit tout de suite, sans gronder
const FEEDBACK = {
  perfect: ['✔ Parfait !', '✔ Génial !', '✔ Trop fort !'],
  good: ['✔ Bravo !', '✔ Super !', '✔ Bien joué !'],
  ok: ['👍 Presque !', '👍 Pas mal !'],
  miss: ['🙂 Pas cette fois !', '🙂 On continue !'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

let phase = 'menu'; // menu | loading | calib | countdown | play | results
let world = WORLDS[0];
let speed = SPEEDS[0];
let game = null;
let calibState = { stage: '', holdStart: 0 };
let lostSince = 0;

function store(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem('wuq_' + key));
    localStorage.setItem('wuq_' + key, JSON.stringify(val));
  } catch { return null; }
}

function show(id, on = true) { $(id).classList.toggle('hidden', !on); }

// ---------------- Menu ----------------
function buildMenu() {
  const wrap = $('worlds');
  wrap.innerHTML = '';
  const extra = $('menuExtra');
  extra.innerHTML = '';
  const ex = WUQStore.menuExtras(buildMenu);
  if (ex) extra.appendChild(ex);
  for (const w of WORLDS) {
    const best = WUQStore.getBest(w.id);
    const card = document.createElement('div');
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.className = 'worldCard';
    card.style.setProperty('--c1', w.sky[0]);
    card.style.setProperty('--c2', w.hero.body);
    card.innerHTML = `
      <canvas width="200" height="150"></canvas>
      <div class="wName">${w.name}</div>
      <div class="wBest">${'★'.repeat(best.stars)}${'☆'.repeat(3 - best.stars)}</div>`;
    card.title = w.tagline;
    const cctx = card.querySelector('canvas').getContext('2d');
    let drawn = false;
    const anim = (t) => {
      if (!card.isConnected) return;
      const hover = card.matches(':hover, :focus-visible');
      if (phase === 'menu' && (hover || !drawn)) { drawWorldPreview(cctx, 200, 150, w, t, hover); drawn = !hover; }
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
    const ce = WUQStore.cardExtra(w, buildMenu);
    if (ce) {
      ce.addEventListener('click', (e) => e.stopPropagation());
      ce.addEventListener('keydown', (e) => e.stopPropagation());
      card.appendChild(ce);
    }
    card.onclick = () => startWorld(w);
    card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startWorld(w); } };
    wrap.appendChild(card);
  }
  // Monde surprise : pour ceux qui n'arrivent pas à choisir
  const sur = document.createElement('div');
  sur.setAttribute('role', 'button'); sur.tabIndex = 0;
  sur.className = 'worldCard surprise';
  sur.innerHTML = '<div class="surpriseIcon">🎲</div><div class="wName">Surprise !</div><div class="wBest">Un monde au hasard</div>';
  const go = () => startWorld(WORLDS[Math.floor(Math.random() * WORLDS.length)]);
  sur.onclick = go;
  sur.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  wrap.appendChild(sur);
  const sp = $('speeds');
  sp.innerHTML = '';
  const saved = store('speed');
  speed = SPEEDS.find((s) => s.id === saved) || SPEEDS[0];
  for (const s of SPEEDS) {
    const b = document.createElement('button');
    b.className = 'btn small' + (s === speed ? '' : ' ghost');
    b.textContent = s.label;
    b.onclick = () => { speed = s; store('speed', s.id); buildMenu(); };
    sp.appendChild(b);
  }
  const short = store('short') !== false; // partie courte par défaut (petits)
  const sb = document.createElement('button');
  sb.className = 'btn small' + (short ? '' : ' ghost');
  sb.textContent = short ? '⏱️ Partie courte ✓' : '⏱️ Partie longue';
  sb.onclick = () => { store('short', !short); buildMenu(); };
  sp.appendChild(sb);
  const full = store('fullscreen') !== false; // plein écran au lancement (rien ne dépasse, pas de clic de travers)
  const fb = document.createElement('button');
  fb.className = 'btn small' + (full ? '' : ' ghost');
  fb.textContent = full ? '⛶ Plein écran ✓' : '⛶ Plein écran';
  fb.onclick = () => { store('fullscreen', !full); buildMenu(); };
  sp.appendChild(fb);
  const g3 = store('3d') !== false; // mondes en 3D (plus beau et plus fluide) ; sinon chemin 2D
  const gb = document.createElement('button');
  gb.className = 'btn small' + (g3 ? '' : ' ghost');
  gb.textContent = g3 ? '🎮 Graphismes 3D ✓' : '🎮 Graphismes 2D (léger)';
  gb.onclick = () => { store('3d', !g3); buildMenu(); };
  sp.appendChild(gb);
  $('simToggle').checked = !!store('sim');
  const dr = $('duoRow');
  dr.innerHTML = '';
  const dt = WUQStore.duoToggle(buildMenu);
  if (dt) dr.appendChild(dt);
}

$('simToggle').onchange = (e) => {
  store('sim', e.target.checked);
  if (!e.target.checked && tracker.sim) location.reload(); // repasser à la caméra
};

// Aperçu d'un monde dans le menu : son chemin, son décor et son héros vu de dos
function drawWorldPreview(ctx, W, H, w, t, hover) {
  const b = w.biomes[0], hy = H * 0.45;
  const g = ctx.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, b.sky0); g.addColorStop(1, b.sky1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 1);
  if (b.night) drawMoon(ctx, W * 0.78, H * 0.16, H * 0.07, b.sun);
  else drawSun(ctx, W * 0.78, H * 0.16, H * 0.075, t);
  ctx.fillStyle = b.mount0;
  ctx.beginPath(); ctx.moveTo(0, hy);
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, hy - H * (0.1 + 0.06 * Math.sin(x * 0.05 + 1) * Math.sin(x * 0.019)));
  ctx.lineTo(W, hy); ctx.fill();
  ctx.fillStyle = b.grass; ctx.fillRect(0, hy, W, H - hy);
  ctx.fillStyle = b.path;
  ctx.beginPath(); ctx.moveTo(W * 0.46, hy); ctx.lineTo(W * 0.54, hy); ctx.lineTo(W * 0.85, H); ctx.lineTo(W * 0.15, H); ctx.fill();
  // Bandes qui défilent (on avance quand la souris est dessus)
  ctx.fillStyle = b.path2;
  const off = hover ? (t * 0.0012) % 1 : 0;
  for (let i = 0; i < 4; i++) {
    const p0 = (i / 4 + off) % 1, p1 = p0 + 0.1, y0 = hy + (H - hy) * p0 * p0, y1 = hy + (H - hy) * Math.min(1, p1 * p1);
    const wAt = (y) => W * (0.04 + 0.31 * (y - hy) / (H - hy));
    ctx.beginPath(); ctx.moveTo(W / 2 - wAt(y0), y0); ctx.lineTo(W / 2 + wAt(y0), y0); ctx.lineTo(W / 2 + wAt(y1), y1); ctx.lineTo(W / 2 - wAt(y1), y1); ctx.fill();
  }
  ctx.font = `${H * 0.22}px serif`; ctx.textAlign = 'center';
  ctx.fillText(b.deco[0], W * 0.12, H * 0.82); ctx.fillText(b.deco[1], W * 0.9, H * 0.78);
  ctx.font = `${H * 0.13}px serif`;
  ctx.fillText(b.deco[2], W * 0.3, hy + H * 0.12); ctx.fillText(b.deco[3], W * 0.72, hy + H * 0.1);
  drawHeroBack(ctx, W / 2, H * 0.97, H * 0.42, w.hero, hover ? 'run' : 'idle', t);
}

// ---------------- Choix de la voix ----------------
function buildVoices() {
  const sel = $('voiceSelect');
  const list = Audio8.voices();
  sel.innerHTML = list.length
    ? list.map((v) => `<option value="${v.name.replace(/"/g, '&quot;')}">${v.name.replace(/^Microsoft /, '').replace(/ - French.*$/, '')}${/natural|neural|google|online/i.test(v.name) ? ' ⭐' : ''}</option>`).join('')
    : '<option>Aucune voix française trouvée</option>';
  sel.value = Audio8.voiceName();
  show('voiceTip', list.length > 0 && !list.some((v) => /natural|neural/i.test(v.name)));
}
Audio8.onVoices(buildVoices);
buildVoices();
$('voiceSelect').onchange = (e) => { Audio8.setVoice(e.target.value); Audio8.say('Salut ! Prêt pour l\'échauffement ? Saute !'); };
$('voiceTest').onclick = () => Audio8.say('Salut ! Prêt pour l\'échauffement ? Cours sur place, puis saute !');

function goMenu() {
  phase = 'menu'; game = null; frozen = false;
  Audio8.music(false);
  ['loading', 'calib', 'hud', 'results', 'countdown', 'camBox', 'simHelp', 'carnet', 'pause'].forEach((id) => show(id, false));
  show('menu');
  scene.setWorld(null);
  buildMenu();
}

// ---------------- Lancement ----------------
async function startWorld(w) {
  const ok = WUQStore.canStart();
  if (ok !== true) { if (typeof ok === 'string') alert(ok); return; }
  world = w;
  if (store('fullscreen') !== false && !document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  team = WUQStore.players();
  if (!team.length) team = [{ name: '', color: null }];
  colors = duo() ? team.map((p, i) => (/^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : DUO_COLORS[i])) : [];
  tracker.setPlayers(team.length);
  $('camBox').classList.toggle('duo', duo());
  Audio8.unlock();
  Audio8.say(' ');
  // En duo, chaque joueur a son personnage, à sa couleur
  const pals = duo() ? colors.map((c) => ({ body: c, belly: shade(c, 0.7), limb: shade(c, -0.3), accent: '#ffd166' })) : null;
  const next = store('3d') !== false ? scene3d : sceneFlat;
  if (next !== scene) { scene.setWorld(null); scene = next; }
  show('menu', false);
  if (scene.load) {
    phase = 'loading';
    show('loading'); show('loadingError', false); show('loadingBack', false);
    try {
      await scene.load((t) => ($('loadingText').textContent = t));
    } catch (e) {
      console.error('3D indisponible, on joue sur le chemin classique', e);
      scene = sceneFlat;
    }
    show('loading', false);
  }
  scene.setWorld(w, pals);
  if ($('simToggle').checked) {
    tracker.enableSim();
    show('simHelp');
    document.body.classList.add('sim');
  }
  if (!tracker.sim && !tracker.landmarker) {
    phase = 'loading';
    show('loading'); show('loadingError', false); show('loadingBack', false);
    try {
      await tracker.start(video, (t) => ($('loadingText').textContent = t));
    } catch (e) {
      console.error(e);
      $('loadingText').textContent = 'Impossible de démarrer la caméra 😕';
      $('loadingError').innerHTML = cameraHelp(e);
      show('loadingError'); show('loadingBack');
      return;
    }
    show('loading', false);
  }
  startCalib();
}

function cameraHelp(e) {
  const name = e && e.name;
  let msg = '';
  if (!window.isSecureContext || !navigator.mediaDevices) {
    msg = `La caméra n'est disponible qu'en HTTPS (ou sur http://localhost). Cette page est ouverte sur ${location.origin} : ` +
      "ouvre Odoo via https:// ou via http://localhost:8069.";
  } else if (name === 'NotAllowedError') msg = "L'accès à la caméra a été refusé. Clique sur l'icône 🎥 dans la barre d'adresse et autorise la caméra.";
  else if (name === 'NotFoundError') msg = 'Aucune webcam détectée sur cet ordinateur.';
  else if (name === 'NotReadableError') msg = 'La webcam est déjà utilisée par une autre application (Teams, Zoom…).';
  else msg = 'Vérifie ta connexion internet (le modèle de détection se télécharge) et utilise Chrome ou Edge.';
  return msg + '<br><small>Astuce : coche « Mode clavier » dans le menu pour tester sans caméra.</small>';
}
$('loadingBack').onclick = goMenu;

// ---------------- Calibration ----------------
function startCalib() {
  phase = 'calib';
  calibState = { stage: '', holdStart: 0 };
  show('calib');
  show('camBox');
  $('camBox').classList.add('big');
}

function setCalibStage(stage, text, sub, speak) {
  if (calibState.stage === stage) return;
  calibState.stage = stage;
  $('calibText').textContent = text;
  $('calibSub').textContent = sub;
  if (speak) Audio8.say(speak);
}

function updateCalib(now) {
  const s = tracker.state;
  if (tracker.sim) {
    setCalibStage('sim', `Monde : ${world.name}`, "Appuie sur Entrée (ou 1 pour lever les bras) pour commencer", null);
    if (s.armsUp) holdCalib(now); else { calibState.holdStart = 0; $('calibBar').style.width = '0%'; }
    return;
  }
  if (duo() && !s.upperBody) {
    calibState.holdStart = 0;
    $('calibBar').style.width = '0%';
    const n = tracker.bodies.filter((b) => b.state.upperBody).length;
    setCalibStage('far' + n, 'Chacun dans sa couleur 👀',
      `Je vois ${n} joueur${n > 1 ? 's' : ''} sur 2 · un enfant de chaque côté du trait, assez loin l'un de l'autre`,
      n ? 'Je ne vois qu\'un joueur ! Mettez-vous chacun d\'un côté du trait, et écartez-vous bien.' : 'Mettez-vous à deux face à la caméra, chacun d\'un côté !');
  } else if (!s.upperBody) {
    calibState.holdStart = 0;
    $('calibBar').style.width = '0%';
    setCalibStage('far', 'Mets-toi face à la caméra 👀', 'On doit voir au moins ta tête et tes hanches', 'Mets-toi face à la caméra, recule un peu !');
  } else if (duo() && !s.armsUp) {
    calibState.holdStart = 0;
    $('calibBar').style.width = '0%';
    setCalibStage('arms2', 'Super ! Levez tous les deux les bras 🙌', 'Gardez les bras en l\'air pour commencer', 'Super ! Levez tous les deux les bras pour commencer !');
  } else if (!s.armsUp) {
    calibState.holdStart = 0;
    $('calibBar').style.width = '0%';
    const mode = s.anklesOK ? 'full' : s.kneesOK ? 'knees' : 'upper';
    const sub = { full: 'Mode corps entier ✓', knees: 'Mode jusqu\'aux genoux ✓', upper: 'Mode haut du corps ✓ (recule si tu peux, pour voir tes jambes)' }[mode];
    if (calibState.stage === 'arms') $('calibSub').textContent = 'Garde les bras en l\'air pour commencer · ' + sub;
    setCalibStage('arms', 'Super ! Lève les deux bras 🙌', 'Garde les bras en l\'air pour commencer · ' + sub, 'Super ! Lève les deux bras pour commencer !');
  } else {
    setCalibStage('hold', 'Ne bouge plus… ✨', '', null);
    holdCalib(now);
  }
}

function holdCalib(now) {
  if (!calibState.holdStart) calibState.holdStart = now;
  const p = Math.min(1, (now - calibState.holdStart) / 1000);
  $('calibBar').style.width = p * 100 + '%';
  if (p >= 1) { tracker.calibrate(); startCountdown(); }
}

addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && phase === 'calib' && tracker.sim) { tracker.calibrate(); startCountdown(); }
  if (e.key === 'Enter' && phase === 'results') $('againBtn').click();
  if ((e.key === 'b' || e.key === 'B') && tracker.sim && phase === 'play' && game && game.cur && game.cur.s.m === 'moles' && !game.cur.done) {
    const c = game.cur; c.bonked++; game.add(50, '+50'); Audio8.boing(); ui.setDetail(game.detail(c));
    if (c.bonked >= c.s.n) game.complete(performance.now());
  }
  if ((e.key === 'b' || e.key === 'B') && tracker.sim && phase === 'play' && game && game.cur && game.cur.s.m === 'bubbles' && !game.cur.done) {
    game.cur.bubbles.push({ hero: 0, u: 1, v: -0.5, r: 0.32, born: 0, p: 0 });
    game.popBubble(game.cur, game.cur.bubbles.length - 1, performance.now());
  }
  const pauseKey = e.key === 'Escape' || e.key === 'p' || e.key === 'P';
  if (pauseKey && phase === 'play') pauseGame();
  else if (pauseKey && phase === 'paused') resumeGame();
  else if (e.key === 'Escape' && phase === 'calib') goMenu();
});

// ---------------- Pause ----------------
let frozen = false;     // le décor est figé (pause + compte à rebours de reprise)
let pausedAt = 0;
let resumeHold = 0;

function pauseGame(reason) {
  if (phase !== 'play') return;
  phase = 'paused';
  frozen = true;
  pausedAt = performance.now();
  resumeHold = 0;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  Audio8.music(false);
  $('pauseReason').textContent = reason === 'lost' ? '👀 Je ne te vois plus : pause automatique' : '';
  $('pauseBar').style.width = '0%';
  show('lost', false);
  show('pause');
  Audio8.say(reason === 'lost' ? 'Pause ! Reviens devant la caméra et lève les bras pour continuer.' : 'Pause !');
}

function resumeGame() {
  if (phase !== 'paused') return;
  show('pause', false);
  startCountdown(() => {
    const d = performance.now() - pausedAt;
    game.shift(d);
    scene.shift(d);
    frozen = false;
    lostSince = 0;
    phase = 'play';
  });
}

function updatePause(now) {
  // Reprise sans les mains : bras en l'air pendant 1,5 s
  const s = tracker.state;
  if (s.present && s.armsUp) {
    if (!resumeHold) resumeHold = now;
    const p = Math.min(1, (now - resumeHold) / 1500);
    $('pauseBar').style.width = p * 100 + '%';
    if (p >= 1) resumeGame();
  } else {
    resumeHold = 0;
    $('pauseBar').style.width = '0%';
  }
}

$('pauseBtn').onclick = () => pauseGame();
$('resumeBtn').onclick = resumeGame;
$('pauseQuitBtn').onclick = goMenu;

// ---------------- Compte à rebours ----------------
function startCountdown(done = startGame) {
  phase = 'countdown';
  show('calib', false);
  $('camBox').classList.remove('big');
  const el = $('countdown');
  show('countdown');
  let n = 3;
  const tick = () => {
    if (phase !== 'countdown') return;
    if (n > 0) {
      el.textContent = n; el.className = 'pop';
      Audio8.tick(); Audio8.say(String(n));
      n--;
      setTimeout(tick, 900);
      void el.offsetWidth; el.className = 'pop anim';
    } else {
      el.textContent = 'GO !'; el.className = 'pop anim';
      Audio8.go(); Audio8.say("C'est parti !");
      setTimeout(() => { show('countdown', false); done(); }, 700);
    }
  };
  tick();
}

// ---------------- Partie ----------------
// Partie courte : on garde l'intro, la fin, les nouveaux jeux, et une étape sur deux du reste
function shortSteps(steps) {
  if (steps.length < 8) return steps;
  const mid = steps.slice(1, -1);
  const special = ['bubbles', 'freeze', 'catch', 'rope', 'tunnel', 'moles', 'posemix', 'dance', 'karate'];
  return [steps[0], ...mid.filter((st, i) => i % 2 === 0 || special.includes(st.m)), steps[steps.length - 1]];
}

class Game {
  constructor(w, mul) {
    this.world = w;
    this.steps = store('short') !== false ? shortSteps(WUQStore.steps(w)) : WUQStore.steps(w);
    this.mul = mul;
    this.startedAt = performance.now();
    this.pausedTotal = 0;
    this.i = -1;
    this.score = 0;
    this.maxScore = this.steps.reduce((a, s) => a + maxPoints(s), 0);
    this.collected = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.success = 0;
    this.scored = this.steps.filter((s) => s.m !== 'rest').length;
    this.cur = null;
    this.over = false;
    this.team = [];
    this.np = tracker.bodies.length; // joueurs (coopératif : chaque défi doit être fait par tous)
    this.lastEv = { jump: [], squat: [], smash: [] }; // dernier saut / accroupi / frappe de chaque joueur
  }

  // Décale toutes les échéances après une pause
  shift(d) {
    const c = this.cur;
    if (c) {
      c.start += d; c.end += d; c.lastT += d; c.ropeT0 += d;
      if (c.phaseAt) c.phaseAt += d;
      for (const hz of c.hazards) hz.arrive += d; // (leur départ est décalé par la scène)
      for (const bb of c.bubbles) bb.born += d;
      for (const m of c.moles) { m.born += d; m.until += d; if (m.t) m.t += d; }
      if (c.lastMole) c.lastMole += d;
    }
    if (this.gapUntil) this.gapUntil += d;
    this.pausedTotal += d;
  }

  // Adapte une étape au joueur (mode haut du corps) et au monde (rencontre de créature)
  adapt(s) {
    if (s.m === 'pose' && s.pose === 'flamingo' && tracker.mode === 'upper') s = { ...s, pose: 'armsUp' };
    if (s.m === 'posemix' && tracker.mode === 'upper') s = { ...s, poses: s.poses.map((p) => (p === 'flamingo' ? 'armsUp' : p)) };
    if (s.m === 'pose' && this.world.creatures) {
      s = { ...s, creature: Carnet.pick(this.team.map((c) => c.id)) };
    }
    return s;
  }

  nextStep(now) {
    this.i++;
    if (this.i >= this.steps.length) return this.finish();
    const s = this.adapt(this.steps[this.i]);
    const fixed = s.m === 'rest' || s.m === 'freeze';
    let dur = stepDuration(s) * (fixed ? 1 : this.mul) * 1000 + (s.creature ? 1200 : 0);
    const ropePeriod = 1700 * Math.min(1.3, this.mul);
    if (s.m === 'rope') dur = 1200 + s.n * ropePeriod + 700;
    const beat = (s.beat || 1.8) * 1000 * Math.min(1.3, this.mul);
    if (s.m === 'dance' || s.m === 'karate') dur = 2000 + s.moves.length * beat + 600;
    this.cur = { s, start: now, end: now + dur, dur, count: 0, done: false, hold: 0, lastT: now, part: 0,
      counts: Array(this.np).fill(0), parts: Array(this.np).fill(0),
      bubbles: [], popped: 0, phase: null, okRounds: 0, hazards: [], dodges: [], caught: 0,
      ropeT0: now + 1200 - ropePeriod, ropePeriod, passes: 0, ropeOk: 0, moles: [], bonked: 0, pi: 0,
      beat, mi: -1, showI: -99, mimicRes: [], okF: [], frames: 0 };
    ui.showStep(s, this.steps[this.i + 1], this.i, this.steps.length);
    ui.setDetail(this.detail(this.cur));
    Audio8.say(s.creature ? `Oh ! ${s.creature.name} arrive ! ${POSES[s.pose].say} pour devenir son ami !` : stepSpeech(s));
    scene.onStep(s, dur);
    if (s.m === 'pose') scene.setDemoPose(s.pose);
    if (s.m === 'posemix') scene.setDemoPose(s.poses[0]);
    if (s.m === 'moles') scene.moles = this.cur.moles;
    if (s.m === 'dance' || s.m === 'karate') { Audio8.music(true, s.m); scene.setCoach({ move: null, style: s.m, pal: MIMIC[s.m].pal }); }
    if (s.m === 'bubbles') scene.bubbles = this.cur.bubbles;
    if (s.m === 'rope') scene.rope = { t0: this.cur.ropeT0, period: ropePeriod };
    scene.setProgress(this.i / this.steps.length);
  }

  add(points, text, idx = 0) {
    this.score += points;
    ui.setScore(this.score);
    if (text) scene.floatText(text, '#ffe066', idx);
  }

  collect(n = 1) { this.collected += n; ui.setCollect(this.collected); }

  // Points d'un mouvement : partagés entre les joueurs (le score maximum reste le même)
  pts(n) { return Math.round(n / this.np); }

  onEvent(type, now, idx = 0) {
    if (this.lastEv[type]) this.lastEv[type][idx] = now;
    const c = this.cur;
    if (!c || c.done || idx >= this.np) return;
    const s = c.s;
    if ((s.m === 'jump' || s.m === 'squat' || s.m === 'smash') && type === s.m) {
      if (c.counts[idx] >= s.n) return; // ce joueur a fini, on attend l'autre
      c.counts[idx]++;
      c.count++;
      this.add(this.pts(100), '+' + this.pts(100), idx);
      scene.flash(idx, true);
      Audio8.good();
      ui.setDetail(this.detail(c));
      if (c.counts.every((n) => n >= s.n)) this.complete(now);
    } else if (s.m === 'combo') {
      if (c.parts[idx] < s.parts.length && type === s.parts[c.parts[idx]]) {
        c.parts[idx]++;
        c.part = Math.min(...c.parts);
        this.add(this.pts(100), '+' + this.pts(100), idx);
        scene.flash(idx, true);
        Audio8.good();
        ui.setDetail(this.detail(c));
        if (c.parts.every((n) => n >= s.parts.length)) { this.add(200, 'COMBO +200'); this.complete(now); }
      }
    } else if ((s.m === 'left' || s.m === 'right') && type === s.m && tracker.state.side === s.m) {
      this.sideDone(now);
    }
  }

  // Progression sous la consigne : points, puces, barre (une ligne par joueur en coopératif)
  detail(c) {
    const s = c.s, np = this.np;
    const rows = (fn) => np === 1 ? fn(0) : c.counts.map((_, i) => `<div class="playerRow">${whoTag(i)}${fn(i)}</div>`).join('');
    switch (s.m) {
      case 'run': return dodgeDots(c, dodgeCount(s));
      case 'jump': case 'squat': case 'smash':
        return s.n === 1 && np === 1 ? '' : rows((i) => dots(c.counts[i], s.n));
      case 'combo': return rows((i) => comboChips(s.parts, c.parts[i]));
      case 'pose': return holdBar(c.hold / (s.hold * 1000), s.creature);
      case 'bubbles': return `<div class="runCount"><b>${c.popped}</b> / ${s.n} 🫧</div>`;
      case 'catch': return `<div class="runCount"><b>${c.caught}</b> / ${catchCount(s)} ${this.world.collectible}</div>`;
      case 'rope': return dots(c.ropeOk, s.n);
      case 'tunnel': return holdBar(c.hold / (s.t * 700));
      case 'moles': return `<div class="runCount"><b>${c.bonked}</b> / ${s.n} 🐹</div>`;
      case 'dance': case 'karate': return '<div class="chips">' + s.moves.map((m, i) =>
        `<span class="chip ${i < c.mimicRes.length ? (c.mimicRes[i] ? 'ok' : 'miss') : i === c.mi ? 'now' : ''}">${MIMIC_ICONS[m]}</span>`).join('') + '</div>';
      case 'posemix': return '<div class="chips">' + s.poses.map((p, i) =>
        `<span class="chip ${i < c.pi ? 'ok' : i === c.pi ? 'now' : ''}">${POSES[p].icon}</span>`).join('<i>›</i>') + '</div>' +
        (c.pi < s.poses.length ? holdBar(c.hold / (s.hold * 1000)) : '');
      case 'freeze': return `<div class="bigIcon">${c.phase === 'freeze' ? '🗿 Statue !' : '💃 Danse !'}</div>`;
      default: return '';
    }
  }

  // ---------- Bulles autour du personnage sur le chemin ; les mains du joueur y sont des gants lumineux.
  // Repère : épaules du joueur / du héros, unité = longueur du torse (x vers la droite de l'écran).
  handsOf(b) {
    if (!b.lm || !b.T || !b.state.present) return null;
    const sh = mid(b.lm[11], b.lm[12]);
    return [15, 16].filter((i) => (b.lm[i].visibility ?? 1) > 0.4)
      .map((i) => ({ u: -(b.lm[i].x - sh.x) / (b.T * 0.75), v: (b.lm[i].y - sh.y) / b.T }));
  }

  spawnBubble(c, hero, now) {
    for (let tries = 0; tries < 6; tries++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const bb = { hero, u: side * (0.8 + Math.random() * 0.6), v: -1.25 + Math.random() * 1.35, r: 0.32, born: now, p: Math.random() * 6 };
      if (c.bubbles.every((o) => o.hero !== hero || Math.hypot(o.u - bb.u, o.v - bb.v) > 0.8)) { c.bubbles.push(bb); return; }
    }
  }

  popBubble(c, i, now) {
    const bb = c.bubbles.splice(i, 1)[0];
    scene.pops.push({ hero: bb.hero, u: bb.u, v: bb.v, r: bb.r, t: now });
    c.popped++;
    this.add(50, '+50', bb.hero);
    this.collect();
    Audio8.pop();
    ui.setDetail(this.detail(c));
    if (c.popped >= c.s.n) this.complete(now);
  }

  updateBubbles(c, now) {
    const hands = tracker.bodies.map((b) => this.handsOf(b));
    scene.hands = hands;
    tracker.bodies.forEach((b, i) => {
      if (tracker.sim || !hands[i]) return;
      while (c.bubbles.filter((bb) => bb.hero === i).length < 2) this.spawnBubble(c, i, now);
    });
    for (let i = c.bubbles.length - 1; i >= 0 && !c.done; i--) {
      const bb = c.bubbles[i];
      if (now - bb.born < 300) continue; // le temps de la voir apparaître
      const hs = hands[bb.hero];
      if (hs && hs.some((hd) => Math.hypot(hd.u - bb.u, hd.v - bb.v) < bb.r + 0.2)) this.popBubble(c, i, now);
    }
  }

  // ---------- Évitements : rochers (changer de couloir), troncs (sauter), branches (se baisser)
  laneOf(i) { const sd = tracker.bodies[i].state.side; return sd === 'left' ? -1 : sd === 'right' ? 1 : 0; }

  updateDodge(c, now) {
    const n = dodgeCount(c.s), travel = 2300 * Math.min(1.3, this.mul);
    const gap = n > 1 ? Math.max(900, (c.dur - travel - 900) / (n - 1)) : 0;
    // Nouvel obstacle
    if (c.hazards.length < n && now >= c.start + 400 + c.hazards.length * gap) {
      const kinds = duo() ? ['log', 'arch'] : ['rock', 'log', 'rock', 'arch'];
      const kind = kinds[c.hazards.length % kinds.length];
      const hz = { kind, lane: kind === 'rock' ? this.laneOf(0) : 0, born: now, dur: travel, arrive: now + travel };
      c.hazards.push(hz);
      scene.addHazard(hz);
    }
    for (const hz of c.hazards) {
      // Petit rappel à la voix juste avant l'obstacle
      if (!hz.cued && now >= hz.arrive - 1100) {
        hz.cued = true;
        Audio8.say(hz.kind === 'rock' ? 'Va à côté !' : hz.kind === 'log' ? 'Saute !' : 'Baisse-toi !');
      }
      if (hz.done || now < hz.arrive + 150) continue;
      hz.done = true;
      const oks = tracker.bodies.map((b, i) => {
        if (hz.kind === 'log') return b.state.jumpUp || now - (this.lastEv.jump[i] || 0) < 1200;
        if (hz.kind === 'arch') return b.state.squat || now - (this.lastEv.squat[i] || 0) < 1200;
        return this.laneOf(i) !== hz.lane;
      });
      const all = oks.every(Boolean);
      c.dodges.push(all);
      scene.resolveHazard(hz, all);
      oks.forEach((ok, i) => { scene.flash(i, ok); if (ok) this.add(this.pts(60), '+' + this.pts(60), i); });
      all ? Audio8.good() : Audio8.soft();
      ui.setDetail(this.detail(c));
    }
  }

  // ---------- Attraper les étoiles : se mettre sous l'étoile (couloir gauche, milieu ou droite)
  updateCatch(c, now) {
    const n = catchCount(c.s), travel = 2200 * Math.min(1.3, this.mul);
    const gap = n > 1 ? Math.max(700, (c.dur - travel - 700) / (n - 1)) : 0;
    if (c.hazards.length < n && now >= c.start + 400 + c.hazards.length * gap) {
      const k = c.hazards.length, heroes = scene.heroes;
      let lane;
      if (heroes.length > 1) { const h = heroes[k % 2]; lane = h.base + (Math.floor(Math.random() * 3) - 1) * 0.45; }
      else { const prev = c.hazards.length ? c.hazards[k - 1].lane : 0; const opts = [-1, 0, 1].filter((l) => l !== prev); lane = opts[Math.floor(Math.random() * opts.length)]; }
      const it = { kind: 'star', lane, born: now, dur: travel, arrive: now + travel };
      c.hazards.push(it);
      scene.addHazard(it);
    }
    for (const it of c.hazards) {
      if (it.done || now < it.arrive + 80) continue;
      it.done = true;
      const j = scene.heroes.findIndex((h) => Math.abs(h.lane - it.lane) < 0.42);
      if (j >= 0) {
        c.caught++;
        this.add(50, '+50', j);
        this.collect();
        Audio8.coin();
        scene.resolveHazard(it, true, j);
      } else scene.resolveHazard(it, false);
      ui.setDetail(this.detail(c));
    }
  }

  // ---------- Corde à sauter : sauter quand la corde passe sous les pieds
  updateRope(c, now) {
    const pass = c.ropeT0 + (c.passes + 1) * c.ropePeriod;
    if (!c.ticked && now >= pass - 150) { c.ticked = true; Audio8.tick(); }
    if (now < pass + 250) return;
    c.passes++; c.ticked = false;
    const oks = tracker.bodies.map((b, i) => b.state.jumpUp || now - (this.lastEv.jump[i] || 0) < 950);
    oks.forEach((ok, i) => { scene.flash(i, ok); if (ok) this.add(this.pts(100), '+' + this.pts(100), i); });
    if (oks.every(Boolean)) c.ropeOk++;
    oks.every(Boolean) ? Audio8.good() : Audio8.soft();
    ui.setDetail(this.detail(c));
    if (c.passes >= c.s.n) {
      scene.rope = null;
      if (c.ropeOk >= c.s.n) this.complete(now); else this.timeout(now);
    }
  }

  // ---------- Tunnel : rester baissé pendant qu'on le traverse
  updateTunnel(c, now, dt) {
    if (now - c.start < 1500) return; // le tunnel arrive
    const ok = tracker.state.squat;
    tracker.bodies.forEach((b, i) => scene.setHoldPose(b.state.squat ? 'duck' : null, i));
    c.hold = ok ? c.hold + dt : Math.max(0, c.hold - dt * 0.3);
    if (!ok && !c.tipped && now - c.start > 2600) { c.tipped = true; Audio8.say(duo() ? 'Baissez-vous dans le tunnel !' : 'Baisse-toi dans le tunnel !'); }
    ui.setDetail(this.detail(c));
    if (c.hold >= c.s.t * 700) { this.add(150, '+150'); this.complete(now); }
  }

  // ---------- Taupes : elles sortent à gauche / à droite, en haut / en bas ; on les tape avec la main
  updateMoles(c, now) {
    const SPOTS = [[-1.55, -0.95], [1.55, -0.95], [-1.65, 0.7], [1.65, 0.7]];
    const up = 1700 * Math.min(1.3, this.mul), gap = 900 * Math.min(1.3, this.mul);
    const hands = tracker.bodies.map((b) => this.handsOf(b));
    scene.hands = hands;
    // Une nouvelle taupe de temps en temps (2 maximum par joueur)
    if (!tracker.sim && now - (c.lastMole || 0) > gap) {
      const i = (c.moleTurn = ((c.moleTurn || 0) + 1) % this.np);
      const busy = c.moles.filter((m) => m.hero === i && m.state === 'up');
      if (hands[i] && busy.length < 2) {
        const free = SPOTS.filter(([u, v]) => !busy.some((m) => m.u === u && m.v === v));
        const [u, v] = free[Math.floor(Math.random() * free.length)];
        c.moles.push({ hero: i, u, v, born: now, until: now + up, state: 'up' });
        c.lastMole = now;
      }
    }
    for (const m of c.moles) {
      if (m.state !== 'up') continue;
      const hs = hands[m.hero];
      if (now - m.born > 200 && hs && hs.some((hd) => Math.hypot(hd.u - m.u, hd.v - (m.v - 0.3)) < 0.8)) {
        m.state = 'bonk'; m.t = now; c.bonked++;
        this.add(50, '+50', m.hero); this.collect(); Audio8.boing(); scene.flash(m.hero, true);
        ui.setDetail(this.detail(c));
        if (c.bonked >= c.s.n) { this.complete(now); return; }
      } else if (now > m.until) { m.state = 'hide'; m.t = now; }
    }
    c.moles = c.moles.filter((m) => m.state === 'up' || now - m.t < 500);
    scene.moles = c.moles;
  }

  // ---------- Copie les poses : une suite de poses à tenir un court instant chacune
  updatePosemix(c, now, dt) {
    const s = c.s, pose = s.poses[c.pi];
    tracker.bodies.forEach((b, i) => scene.setHoldPose(b.state[pose] ? pose : null, i));
    c.hold = tracker.state[pose] ? c.hold + dt : Math.max(0, c.hold - dt * 0.5);
    if (c.hold >= s.hold * 1000) {
      c.pi++; c.hold = 0;
      this.add(this.pts(100) * this.np, '+100');
      scene.flash(null, true);
      if (c.pi >= s.poses.length) { this.complete(now); return; }
      Audio8.good();
      scene.setDemoPose(s.poses[c.pi]);
      Audio8.say(POSES[s.poses[c.pi]].label);
    }
    ui.setDetail(this.detail(c));
  }

  // ---------- Imite le coach (danse / karaté) : un geste par temps, noté à la fin de chaque temps
  mimicOk(b, move, k, c) {
    if (move === 'jump') return b.state.jumpUp || (this.lastEv.jump[k] || 0) >= c.winStart - 250;
    if (move === 'smash') return (this.lastEv.smash[k] || 0) >= c.winStart - 250;
    if (move === 'squat') return b.state.squat;
    if (move === 'left' || move === 'right') return b.state.side === move;
    return !!b.state[move];
  }

  updateMimic(c, now) {
    const s = c.s, n = s.moves.length, t = now - c.start - 2000;
    if (!Audio8.musicOn()) Audio8.music(true, s.m); // après une pause
    // Le coach montre chaque geste un peu en avance, pour avoir le temps de le copier
    const showI = Math.floor((t + 350) / c.beat);
    if (showI !== c.showI) {
      c.showI = showI;
      const move = showI >= 0 && showI < n ? s.moves[showI] : null;
      scene.setCoach({ move, style: s.m, pal: MIMIC[s.m].pal, t0: now });
      if (move) Audio8.say(MIMIC[s.m].say[move]);
    }
    if (t < 0) return;
    const i = Math.floor(t / c.beat);
    if (i !== c.mi) {
      if (c.mi >= 0 && c.mi < n) this.scoreMimic(c);
      c.mi = i; c.okF = Array(this.np).fill(0); c.frames = 0; c.winStart = now;
      if (i >= n) {
        scene.setCoach(null);
        Audio8.music(false);
        if (c.mimicRes.every(Boolean)) this.complete(now); else this.timeout(now);
        return;
      }
      Audio8.tick();
      ui.setDetail(this.detail(c));
    }
    const move = s.moves[i];
    c.frames++;
    tracker.bodies.forEach((b, k) => {
      const ok = this.mimicOk(b, move, k, c);
      if (ok) c.okF[k]++;
      scene.setHoldPose(ok && POSES[move] ? move : null, k);
    });
  }

  scoreMimic(c) {
    const move = c.s.moves[c.mi], event = move === 'jump' || move === 'smash';
    const oks = c.okF.map((f) => (event ? f > 0 : c.frames && f / c.frames >= 0.35));
    oks.forEach((ok, k) => { scene.flash(k, ok); if (ok) this.add(this.pts(100), '+' + this.pts(100), k); });
    const all = oks.every(Boolean);
    c.mimicRes.push(all);
    all ? Audio8.good() : Audio8.soft();
    ui.setDetail(this.detail(c));
  }

  // ---------- Statues musicales : danse quand la musique joue, statue quand elle s'arrête
  updateFreeze(c, now) {
    const n = freezeRounds(c.s), cyc = c.dur / n, t = now - c.start;
    const round = Math.min(n - 1, Math.floor(t / cyc));
    const phase = t - round * cyc < cyc * 0.6 ? 'dance' : 'freeze';
    if (phase !== c.phase || round !== c.round) {
      if (c.phase === 'freeze') this.scoreFreeze(c);
      c.phase = phase; c.round = round;
      c.still = Array(this.np).fill(0); c.frames = 0; c.phaseAt = now;
      if (phase === 'dance') { Audio8.music(true); Audio8.say(duo() ? 'Dansez !' : 'Danse !'); scene.targetSpeed = 1; }
      else { Audio8.music(false); Audio8.tick(); Audio8.say('Statue !'); scene.targetSpeed = 0; }
      ui.setDetail(this.detail(c));
    }
    if (phase === 'dance') {
      if (!Audio8.musicOn()) Audio8.music(true); // après une pause
      scene.setDemoPose(Math.floor(now / 450) % 2 ? 'star' : 'armsUp');
    } else {
      scene.setDemoPose(null);
      if (now - c.phaseAt > 400) { // un petit délai pour s'arrêter
        c.frames++;
        tracker.bodies.forEach((b, i) => { if (tracker.sim || b.motion < 0.02) c.still[i]++; });
      }
    }
  }

  scoreFreeze(c) {
    if (!c.frames) return;
    const oks = c.still.map((k) => k / c.frames >= 0.6);
    oks.forEach((ok, i) => scene.flash(i, ok));
    if (oks.every(Boolean)) {
      c.okRounds++;
      this.add(150, '+150');
      Audio8.perfect();
      ui.feedback(duo() ? 'Super statues !' : 'Super statue !', 'perfect');
    } else {
      Audio8.soft();
      ui.feedback('Presque !', 'ok');
    }
  }

  sideDone(now) {
    this.add(100, '+100');
    this.complete(now);
  }

  complete(now) {
    const c = this.cur;
    c.done = true;
    const frac = Math.max(0, (c.end - now) / c.dur);
    if (c.s.m !== 'combo') {
      const bonus = Math.round(50 * frac);
      if (bonus > 0) this.add(bonus);
    }
    this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.success++;
    this.collect(c.s.m === 'combo' ? 3 : 2);
    const rating = c.s.m === 'combo' || frac > 0.45 ? 'perfect' : 'good';
    rating === 'perfect' ? Audio8.perfect() : Audio8.good();
    if (c.s.creature) {
      const cr = c.s.creature;
      const n = Carnet.add(cr.id);
      this.team.push(cr);
      const evolvedNow = n === EVOLVE_AT;
      const msg = evolvedNow ? `${cr.name} a évolué !` : `${cr.name} est ton ami !`;
      ui.feedback(msg, 'perfect');
      Audio8.say(evolvedNow ? `Incroyable ! ${cr.name} a évolué !` : `Bravo ! ${cr.name} est ton ami !`);
      this.gapUntil = now + 1600;
    } else {
      ui.feedback(pick(FEEDBACK[rating]), rating);
    }
    ui.setStreak(this.streak);
    scene.flash(null, true);
    scene.resolve(true);
    scene.setHoldPose(null);
    scene.bubbles = []; scene.hands = []; scene.moles = [];
    if (!c.s.creature) this.gapUntil = now + 1100;
  }

  timeout(now) {
    const c = this.cur, s = c.s;
    c.done = true;
    scene.setHoldPose(null);
    scene.bubbles = []; scene.hands = []; scene.moles = [];
    this.gapUntil = now + 1100;
    if (s.m === 'rest') { this.gapUntil = now; return; }
    let rating;
    if (s.m === 'freeze') {
      if (c.phase === 'freeze') this.scoreFreeze(c);
      Audio8.music(false);
      scene.setDemoPose(null);
      const n = freezeRounds(s);
      rating = c.okRounds >= n ? 'perfect' : c.okRounds > 0 ? 'good' : 'ok';
      if (c.okRounds > 0) this.success++;
    } else if (s.m === 'bubbles') {
      const r = c.popped / s.n;
      rating = r >= 0.5 ? 'good' : 'ok';
      if (r >= 0.5) this.success++;
    } else if (['catch', 'rope', 'moles', 'posemix', 'tunnel', 'dance', 'karate'].includes(s.m)) {
      const mimic = () => c.mimicRes.filter(Boolean).length / s.moves.length;
      const r = { catch: () => c.caught / catchCount(s), rope: () => c.ropeOk / s.n, moles: () => c.bonked / s.n,
        posemix: () => c.pi / s.poses.length, tunnel: () => c.hold / (s.t * 700), dance: mimic, karate: mimic }[s.m]();
      if (s.m === 'dance' || s.m === 'karate') { Audio8.music(false); scene.setCoach(null); }
      rating = r >= 1 ? 'perfect' : r >= 0.5 ? 'good' : r > 0 ? 'ok' : 'miss';
      if (r >= 0.5) this.success++;
      scene.rope = null;
    } else if (s.m === 'run') {
      const r = c.dodges.length ? c.dodges.filter(Boolean).length / c.dodges.length : 0;
      rating = r >= 1 ? 'perfect' : r >= 0.5 ? 'good' : r > 0 ? 'ok' : 'miss';
      if (r >= 0.5) this.success++;
    } else {
      const partial = c.count > 0 || c.parts.some((n) => n > 0) || c.hold > 0;
      rating = partial ? 'ok' : 'miss';
      // Qui a réussi sa part ? (vert pour lui, orange pour l'autre)
      const mine = (i) => (s.m === 'combo' ? c.parts[i] >= s.parts.length : s.n ? c.counts[i] >= s.n : false);
      tracker.bodies.forEach((b, i) => scene.flash(i, mine(i)));
      scene.resolve(false);
    }
    if (rating === 'miss' || rating === 'ok') { this.streak = 0; ui.setStreak(0); }
    else { this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); ui.setStreak(this.streak); }
    rating === 'perfect' ? Audio8.perfect() : rating === 'good' ? Audio8.good() : Audio8.soft();
    ui.feedback(pick(FEEDBACK[rating]), rating === 'miss' ? 'ok' : rating);
  }

  update(now) {
    if (this.over) return;
    const c = this.cur;
    if (!c) return this.nextStep(now);
    if (c.done) { if (now >= this.gapUntil) this.nextStep(now); return; }
    const s = c.s, st = tracker.state;
    const dt = now - c.lastT;
    c.lastT = now;
    if ((s.m === 'left' || s.m === 'right') && st.side === s.m) return this.sideDone(now);
    if (s.m === 'pose') {
      const ok = st[s.pose];
      // Chaque héros s'entoure de vert quand SON joueur tient la pose
      tracker.bodies.forEach((b, i) => scene.setHoldPose(b.state[s.pose] ? s.pose : null, i));
      c.hold = ok ? c.hold + dt : Math.max(0, c.hold - dt * 0.5);
      ui.setDetail(this.detail(c));
      if (scene.setHoldProgress) scene.setHoldProgress(Math.min(1, c.hold / (s.hold * 1000)));
      if (c.hold >= s.hold * 1000) { this.add(150, '+150'); return this.complete(now); }
    }
    if (s.m === 'bubbles') this.updateBubbles(c, now);
    if (s.m === 'freeze') this.updateFreeze(c, now);
    if (s.m === 'run') this.updateDodge(c, now);
    if (s.m === 'catch') this.updateCatch(c, now);
    if (s.m === 'rope') { this.updateRope(c, now); if (c.done) return; }
    if (s.m === 'tunnel') { this.updateTunnel(c, now, dt); if (c.done) return; }
    if (s.m === 'moles') this.updateMoles(c, now);
    if (s.m === 'posemix') { this.updatePosemix(c, now, dt); if (c.done) return; }
    if (s.m === 'dance' || s.m === 'karate') { this.updateMimic(c, now); if (c.done) return; }
    ui.setTimer(1 - (now - c.start) / c.dur, s.m === 'rest');
    if (now >= c.end) this.timeout(now);
  }

  finish() {
    this.over = true;
    const ratio = this.maxScore ? this.score / this.maxScore : 0;
    const stars = ratio >= 0.6 ? 3 : ratio >= 0.3 ? 2 : 1; // au moins 1 étoile : on a bougé, c'est gagné
    const id = this.world.id;
    // Record de chaque joueur (la partie compte pour tous en coopératif)
    this.records = team.map((p, i) => {
      const best = WUQStore.getBest(id, i);
      const isBest = this.score > best.score;
      if (isBest) WUQStore.setBest(id, { stars: Math.max(stars, best.stars), score: this.score }, i);
      else if (stars > best.stars) WUQStore.setBest(id, { ...best, stars }, i);
      return { name: p.name, isBest, prev: best.score };
    });
    // Gommette de chaque joueur, choisie avant l'enregistrement pour qu'elle parte dans Odoo
    this.won = team.map((p, i) => {
      const own = WUQStore.getStickers(i);
      const fresh = STICKERS.filter((st) => !own.includes(st));
      const st = (fresh.length ? fresh : STICKERS)[Math.floor(Math.random() * (fresh.length || STICKERS.length))];
      WUQStore.addSticker(i, st);
      return st;
    });
    WUQStore.finish({
      world: id,
      score: this.score,
      max_score: this.maxScore,
      stars,
      success: this.success,
      steps: this.scored,
      collected: this.collected,
      best_streak: this.bestStreak,
      duration: Math.round((performance.now() - this.startedAt - this.pausedTotal) / 1000),
      mode: tracker.mode || 'full',
      speed: speed.id,
      catches: this.team.map((c) => c.id),
    });
    showResults(this, stars);
  }
}

function startGame() {
  phase = 'play';
  game = new Game(world, speed.mul);
  show('hud');
  ui.reset(world);
  lostSince = 0;
}

const EVENT_ICONS = { jump: '⬆️', squat: '⬇️', smash: '👊', left: '⬅️', right: '➡️' };
let camEventTimer = 0;
tracker.on((type, now, idx) => {
  if (phase !== 'play' && phase !== 'calib') return;
  const el = $('camEvent');
  el.textContent = EVENT_ICONS[type] || '';
  el.style.background = duo() ? colors[idx] : '';
  el.className = 'show';
  clearTimeout(camEventTimer);
  camEventTimer = setTimeout(() => (el.className = ''), 600);
});

tracker.on((type, now, idx) => {
  if (phase !== 'play' || !game) return;
  // Le personnage du joueur imite toujours ses sauts, accroupis et frappes
  if (type === 'jump' || type === 'smash' || type === 'squat') scene.action(type, idx);
  game.onEvent(type, now, idx);
});

// ---------------- Interface ----------------
const dots = (n, total) => '<div class="dots">' + Array.from({ length: total }, (_, i) => `<span class="${i < n ? 'on' : ''}"></span>`).join('') + '</div>';
// Évitements : un rond par obstacle (vert = évité, orange = touché, gris = à venir)
const dodgeDots = (c, n) => '<div class="dots">' + Array.from({ length: n }, (_, i) =>
  `<span class="${i < c.dodges.length ? (c.dodges[i] ? 'on' : 'miss') : ''}"></span>`).join('') + '</div>';
const holdBar = (p, cr) => `<div class="holdbar small"><div style="width:${Math.min(100, p * 100)}%"></div></div>${cr ? `<div class="hint">${cr.name} (${cr.element})</div>` : ''}`;
const comboChips = (parts, done) => '<div class="chips">' + parts.map((p, i) =>
  `<span class="chip ${i < done ? 'ok' : i === done ? 'now' : ''}">${MOVE_ICONS[p]} ${MOVE_SHORT[p]}</span>`).join('<i>›</i>') + '</div>';

const ui = {
  reset(w) {
    $('hudWorld').textContent = w.name;
    this.setScore(0); this.setCollect(0); this.setStreak(0);
    $('feedback').className = 'feedback';
  },
  setScore(v) { $('hudScore').textContent = v; },
  setCollect(n) { $('hudCollect').textContent = `${world.collectible} ${n}`; },
  setStreak(n) { $('hudStreak').textContent = n >= 3 ? `🔥 x${n}` : ''; },
  setDetail(html) { $('cardDetail').innerHTML = html; },
  setTimer(p, rest) {
    const el = $('cardTimer');
    el.style.width = Math.max(0, p * 100) + '%';
    el.className = rest ? 'rest' : '';
  },
  showStep(s, next, i, total) {
    const card = $('card');
    card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter');
    card.classList.toggle('isRest', s.m === 'rest');
    $('cardLabel').textContent = stepLabel(s);
    $('hudProgress').style.width = (i / total) * 100 + '%';
    $('next').innerHTML = next ? `Ensuite : ${stepIcon(next)} ${stepLabel(next)}` : '🏁 Dernière étape !';
  },
  feedback(text, rating) {
    const el = $('feedback');
    el.textContent = text;
    el.className = 'feedback'; void el.offsetWidth;
    el.className = 'feedback show ' + rating;
  },
};

// Gommettes à collectionner
const STICKERS = ['🦄', '🐳', '🦖', '🌈', '🚀', '🍦', '🐙', '🦋', '🌟', '🍉', '🐢', '🎈', '🦊', '🐝', '🍭', '🏆', '🐼', '🦜', '🌻', '🎨', '🐬', '🍓', '🦁', '🪁'];

// Pluie de confettis sur le décor
function celebrate() {
  const colors = ['#ff6b9a', '#ffd166', '#4ade80', '#7bdff2', '#b388eb', '#ff9f1c'];
  for (let i = 0; i < 8; i++) {
    setTimeout(() => scene.burst(innerWidth * (0.1 + Math.random() * 0.8), innerHeight * (0.15 + Math.random() * 0.3), 36, colors), i * 280);
  }
}

let resultsAt = 0, againHold = 0, againSaid = false;
function updateResults(now) {
  if (now - resultsAt < 4000) return; // on laisse le temps de fêter (les bras en l'air !)
  if (!againSaid) { againSaid = true; Audio8.say(duo() ? 'Levez les bras pour rejouer !' : 'Lève les bras pour rejouer !'); }
  const s = tracker.state;
  if (s.present && s.armsUp) {
    if (!againHold) againHold = now;
    const p = Math.min(1, (now - againHold) / 2000);
    $('againBar').style.width = p * 100 + '%';
    if (p >= 1) $('againBtn').click();
  } else { againHold = 0; $('againBar').style.width = '0%'; }
}

function showResults(g, stars) {
  phase = 'results';
  resultsAt = performance.now(); againHold = 0; againSaid = false;
  $('againBar').style.width = '0%';
  Audio8.music(false);
  show('hud', false); show('camBox', false);
  show('results');
  $('resTitle').textContent = g.world.endText;
  $('resStars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.35}s">★</span>`).join('');
  $('resScore').textContent = g.score;
  $('resDetail').innerHTML = `${g.success} / ${g.scored} défis réussis · ${g.world.collectible} ${g.collected} ramassés · meilleure série 🔥 ${g.bestStreak}`;
  $('resBest').textContent = g.records.map((r, i) => (duo() ? (r.name || 'Joueur ' + (i + 1)) + ' : ' : '') +
    (r.isBest ? '🏆 nouveau record !' : `record ${r.prev} pts`)).join(' · ');
  const friends = $('resTeam');
  friends.innerHTML = '';
  if (g.team.length) {
    const title = document.createElement('div');
    title.className = 'teamTitle';
    title.textContent = 'Tes nouveaux amis :';
    friends.appendChild(title);
    for (const cr of g.team) friends.appendChild(creatureCard(cr, true, Carnet.evolved(cr.id)));
  }
  // Gommette de chaque joueur (choisie dans finish)
  $('resSticker').innerHTML = g.won.map((st, i) => `<span class="sticker" style="animation-delay:${1.4 + i * 0.3}s">${duo() ? whoTag(i) : ''}${st}</span>`).join('');
  celebrate();
  Audio8.win();
  const names = team.map((p) => p.name).filter(Boolean);
  const bravo = names.length ? `Bravo ${names.join(' et ')} !` : 'Bravo !';
  Audio8.say(`${bravo} ${duo() ? 'Vous avez' : 'Tu as'} gagné ${stars} étoile${stars > 1 ? 's' : ''} et ${duo() ? 'des nouvelles gommettes' : 'une nouvelle gommette'} !`);
  scene.targetSpeed = 0.2;
  scene.obs = null;
  scene.hazards = [];
  scene.setCoach(null);
  scene.setHoldPose('armsUp');
}

// ---------------- Carnet des créatures ----------------
function creatureCard(cr, known, evolved, count) {
  const el = document.createElement('div');
  el.className = 'crCard' + (known ? '' : ' unknown');
  el.innerHTML = `<canvas width="140" height="130"></canvas>
    <div class="crName">${known ? cr.name + (evolved ? ' ★' : '') : '???'}</div>
    <div class="crElem">${known ? cr.element + (count ? ` · vu ${count}×` : '') : 'Pas encore rencontré'}</div>`;
  const cctx = el.querySelector('canvas').getContext('2d');
  const anim = (t) => {
    if (!el.isConnected) return;
    cctx.clearRect(0, 0, 140, 130);
    drawCreature(cctx, 70, 122, evolved ? 78 : 92, cr, known ? 'idle' : 'idle', t, evolved, !known);
    requestAnimationFrame(anim);
  };
  requestAnimationFrame(anim);
  return el;
}

function openCarnet() {
  const data = Carnet.get();
  const grid = $('carnetGrid');
  grid.innerHTML = '';
  for (const cr of CREATURES) {
    const n = data[cr.id] || 0;
    grid.appendChild(creatureCard(cr, n > 0, n >= EVOLVE_AT, n));
  }
  const met = CREATURES.filter((c) => data[c.id]).length;
  $('carnetInfo').textContent = `${met} / ${CREATURES.length} créatures rencontrées · deviens ${EVOLVE_AT} fois ami avec une créature pour la faire évoluer !`;
  const players = WUQStore.players();
  $('stickerAlbum').innerHTML = players.map((p, i) => {
    const own = WUQStore.getStickers(i);
    return `<div class="album">${players.length > 1 || p.name ? `<div class="albumName">${p.name || 'Joueur ' + (i + 1)}</div>` : ''}<div class="albumGrid">` +
      STICKERS.map((st) => `<span class="${own.includes(st) ? 'got' : ''}">${own.includes(st) ? st : '?'}</span>`).join('') + '</div></div>';
  }).join('');
  show('menu', false);
  show('carnet');
}
$('carnetBtn').onclick = openCarnet;
$('carnetBack').onclick = () => { show('carnet', false); show('menu'); };

$('againBtn').onclick = () => { show('results', false); startWorld(world); };
$('menuBtn').onclick = goMenu;

// ---------------- Boucle ----------------
function updateCamStatus(now) {
  const s = tracker.state;
  const el = $('camStatus');
  if (tracker.sim) { el.textContent = '⌨️ Mode clavier'; el.className = 'ok'; return; }
  if (duo()) {
    const n = tracker.bodies.filter((b) => b.state.present).length;
    if (n === 2) { el.textContent = '✅ 2 joueurs'; el.className = 'ok'; }
    else { el.textContent = `👀 ${n} joueur${n > 1 ? 's' : ''} sur 2`; el.className = n ? 'warn' : 'bad'; }
  } else if (s.fullBody) { el.textContent = '✅ Corps entier'; el.className = 'ok'; }
  else if (s.upperBody) { el.textContent = s.kneesOK ? '✅ Jusqu\'aux genoux' : '✅ Haut du corps'; el.className = 'ok'; }
  else if (s.present) { el.textContent = '↔️ Recule un peu'; el.className = 'warn'; }
  else { el.textContent = '❓ Personne'; el.className = 'bad'; }
  $('camPerf').textContent = tracker.perfLabel();
  $('camPerf').classList.toggle('slow', tracker.perf.fps > 0 && tracker.perf.fps < 15);
  if (phase === 'play') {
    if (!s.present) { if (!lostSince) lostSince = now; } else lostSince = 0;
    show('lost', lostSince && now - lostSince > 1200);
    if (lostSince && now - lostSince > 3000) pauseGame('lost');
  }
}

function loop(now) {
  requestAnimationFrame(loop);
  if (phase !== 'menu') tracker.update(video, now);
  if (phase === 'calib') updateCalib(now);
  if (phase === 'play' && game) game.update(now);
  if (phase === 'paused') updatePause(now);
  if (phase === 'results') updateResults(now);
  scene.setLive(phase === 'play' || phase === 'countdown' ? tracker.bodies.map((b) => b.state) : [{ side: 'center', squat: false }]);
  if (!frozen) scene.render(now);
  if (phase === 'play' && game && game.cur) {
    const c = game.cur;
    if (c.s.m === 'posemix') drawPicto(pictoCtx, 150, 150, { m: 'pose', pose: c.s.poses[Math.min(c.pi, c.s.poses.length - 1)] }, now);
    else if (c.s.m === 'dance' || c.s.m === 'karate') {
      const mv = c.s.moves[Math.max(0, Math.min(c.s.moves.length - 1, c.showI))];
      drawPicto(pictoCtx, 150, 150, POSES[mv] ? { m: 'pose', pose: mv } : { m: mv === 'squat' ? 'squat' : mv }, now);
    }
    else drawPicto(pictoCtx, 150, 150, c.s, now, c.s.m === 'combo' ? c.s.parts[Math.min(c.s.parts.length - 1, Math.min(...c.parts))] : null);
  }
  if (!$('camBox').classList.contains('hidden')) {
    const cur = phase === 'play' && game && game.cur;
    const posing = !!(cur && cur.s.m === 'pose' && !cur.done);
    tracker.draw(camCtx, 640, 480, { colors, target: posing ? cur.s.pose : null });
    $('camBox').classList.toggle('pose', posing);
    updateCamStatus(now);
  }
}

buildMenu();
requestAnimationFrame(loop);
