// Boucle principale : menu, calibration, déroulé des séquences, score.

const $ = (id) => document.getElementById(id);
const tracker = new Tracker();
const sceneSide = new Scene($('scene'));
const sceneDepth = new DepthScene($('scene'));
let scene = sceneSide;
const video = $('video');
const camCtx = $('camOverlay').getContext('2d');

// Joueurs de la partie : 1, ou 2 en coopératif (chacun a sa couleur sur la vidéo)
const DUO_COLORS = ['#ff6b35', '#4ea8ff'];
let team = [{ name: '', color: null }];
let colors = [];
const duo = () => team.length > 1;
// Pastille de couleur du joueur (les petits ne lisent pas encore : couleur + initiale)
const whoTag = (i) => `<span class="who" style="--pc:${colors[i]}">${((team[i] && team[i].name) || String(i + 1)).charAt(0).toUpperCase()}</span>`;

const FEEDBACK = {
  perfect: ['Parfait !', 'Génial !', 'Incroyable !', 'Trop fort !'],
  good: ['Bien joué !', 'Super !', 'Bravo !'],
  ok: ['Pas mal !', 'Continue !'],
  miss: ['On continue !', 'Presque !'],
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
      <canvas width="200" height="170"></canvas>
      <div class="wName">${w.name}</div>
      <div class="wTag">${w.tagline}</div>
      <div class="wBest">${'★'.repeat(best.stars)}${'☆'.repeat(3 - best.stars)}${best.score ? ' · ' + best.score + ' pts' : ''}</div>`;
    const cctx = card.querySelector('canvas').getContext('2d');
    const anim = (t) => {
      if (!card.isConnected) return;
      if (phase === 'menu') {
        cctx.clearRect(0, 0, 200, 170);
        drawHero(cctx, 100, 160, 120, w, card.matches(':hover') ? 'star' : 'idle', t);
      }
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
  $('simToggle').checked = !!store('sim');
  const dr = $('duoRow');
  dr.innerHTML = '';
  const dt = WUQStore.duoToggle(buildMenu);
  if (dt) dr.appendChild(dt);
}

$('simToggle').onchange = (e) => store('sim', e.target.checked);

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
  if (ok !== true) { alert(ok); return; }
  world = w;
  team = WUQStore.players();
  if (!team.length) team = [{ name: '', color: null }];
  colors = duo() ? team.map((p, i) => (/^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : DUO_COLORS[i])) : [];
  tracker.setPlayers(team.length);
  $('camBox').classList.toggle('duo', duo());
  Audio8.unlock();
  Audio8.say(' ');
  scene.setWorld(null);
  scene = w.view === 'depth' ? sceneDepth : sceneSide;
  scene.setWorld(w);
  show('menu', false);
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
    setCalibStage('far' + n, 'Mettez-vous à deux face à la caméra 👀',
      `Je vois ${n} joueur${n > 1 ? 's' : ''} sur 2 · on doit voir vos têtes et vos hanches`,
      n ? 'Je ne vois qu\'un joueur ! Mettez-vous côte à côte et reculez un peu.' : 'Mettez-vous à deux face à la caméra !');
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
  if ((e.key === 'b' || e.key === 'B') && tracker.sim && phase === 'play' && game && game.cur && game.cur.s.m === 'bubbles' && !game.cur.done) {
    game.cur.bubbles.push({ x: 0.5, y: 0.5, r: 0.1, born: 0, p: 0 });
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
  return [steps[0], ...mid.filter((st, i) => i % 2 === 0 || st.m === 'bubbles' || st.m === 'freeze'), steps[steps.length - 1]];
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
  }

  // Décale toutes les échéances après une pause
  shift(d) {
    if (this.cur) { this.cur.start += d; this.cur.end += d; this.cur.lastT += d; }
    if (this.gapUntil) this.gapUntil += d;
    this.pausedTotal += d;
  }

  // Adapte une étape au joueur (mode haut du corps) et au monde (rencontre de créature)
  adapt(s) {
    if (s.m === 'pose' && s.pose === 'flamingo' && tracker.mode === 'upper') s = { ...s, pose: 'armsUp' };
    if (s.m === 'pose' && this.world.view === 'depth') {
      s = { ...s, creature: Carnet.pick(this.team.map((c) => c.id)) };
    }
    return s;
  }

  nextStep(now) {
    this.i++;
    if (this.i >= this.steps.length) return this.finish();
    const s = this.adapt(this.steps[this.i]);
    const fixed = s.m === 'run' || s.m === 'rest' || s.m === 'freeze';
    const dur = stepDuration(s) * (fixed ? 1 : this.mul) * 1000 + (s.creature ? 1200 : 0);
    this.cur = { s, start: now, end: now + dur, dur, count: 0, done: false, hold: 0, lastT: now, part: 0,
      counts: Array(this.np).fill(0), parts: Array(this.np).fill(0),
      bubbles: [], pops: [], popped: 0, phase: null, okRounds: 0 };
    ui.showStep(s, this.steps[this.i + 1], this.i, this.steps.length);
    ui.setDetail(this.detail(this.cur));
    Audio8.say(s.creature ? `Oh ! ${s.creature.name} arrive ! ${POSES[s.pose].say} pour devenir son ami !` : stepSpeech(s));
    scene.onStep(s, dur);
    if (s.m === 'pose' && scene.setDemoPose) scene.setDemoPose(s.pose);
    if (scene.setProgress) scene.setProgress(this.i / this.steps.length);
  }

  add(points, text) {
    this.score += points;
    ui.setScore(this.score);
    if (text) scene.floatText(text, '#ffe066');
  }

  collect(n = 1) { this.collected += n; ui.setCollect(this.collected); }

  // Points d'un mouvement : partagés entre les joueurs (le score maximum reste le même)
  pts(n) { return Math.round(n / this.np); }

  onEvent(type, now, idx = 0) {
    const c = this.cur;
    if (!c || c.done || idx >= this.np) return;
    const s = c.s;
    if (s.m === 'run' && type === 'step') {
      c.count++;
      c.lastStep = now; c.tipped = false;
      if (c.count <= s.target * this.np) this.add(this.pts(10));
      this.collect();
      scene.action('step');
      Audio8.coin();
    } else if ((s.m === 'jump' || s.m === 'squat' || s.m === 'smash') && type === s.m) {
      if (c.counts[idx] >= s.n) return; // ce joueur a fini, on attend l'autre
      c.counts[idx]++;
      c.count++;
      this.add(this.pts(100), '+' + this.pts(100));
      scene.action(type);
      Audio8.good();
      ui.setDetail(this.detail(c));
      if (c.counts.every((n) => n >= s.n)) this.complete(now);
    } else if (s.m === 'combo') {
      if (c.parts[idx] < s.parts.length && type === s.parts[c.parts[idx]]) {
        c.parts[idx]++;
        c.part = Math.min(...c.parts);
        this.add(this.pts(100), '+' + this.pts(100));
        scene.action(type);
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
      case 'run': return runDetail(c.count, s.target * np);
      case 'jump': case 'squat': case 'smash':
        return s.n === 1 && np === 1 ? '' : rows((i) => dots(c.counts[i], s.n));
      case 'combo': return rows((i) => comboChips(s.parts, c.parts[i]));
      case 'pose': return holdBar(c.hold / (s.hold * 1000), s.creature);
      case 'bubbles': return `<div class="runCount"><b>${c.popped}</b> / ${s.n} 🫧</div>`;
      case 'freeze': return `<div class="bigIcon">${c.phase === 'freeze' ? '🗿 Statue !' : '💃 Danse !'}</div>`;
      default: return '';
    }
  }

  // ---------- Bulles à éclater avec les mains (coordonnées de la caméra, 0..1)
  spawnBubble(c, b, now) {
    const sh = mid(b.lm[11], b.lm[12]), T = b.T, ax = T * 0.75; // 0.75 = hauteur / largeur de l'image
    const side = Math.random() < 0.5 ? -1 : 1;
    c.bubbles.push({
      x: Math.max(0.08, Math.min(0.92, sh.x + side * (0.5 + Math.random() * 0.9) * ax)),
      y: Math.max(0.1, Math.min(0.9, sh.y + (-1.1 + Math.random() * 1.5) * T)),
      r: 0.2 * T, born: now, p: Math.random() * 6,
    });
  }

  popBubble(c, i, now) {
    const bb = c.bubbles.splice(i, 1)[0];
    c.pops.push({ x: bb.x, y: bb.y, r: bb.r, t: now });
    c.popped++;
    this.add(50, '+50');
    this.collect();
    Audio8.pop();
    ui.setDetail(this.detail(c));
    if (c.popped >= c.s.n) this.complete(now);
  }

  updateBubbles(c, now) {
    const bodies = tracker.bodies.filter((b) => b.lm && b.T && b.state.present);
    while (!tracker.sim && bodies.length && c.bubbles.length < 3) this.spawnBubble(c, bodies[Math.floor(Math.random() * bodies.length)], now);
    for (let i = c.bubbles.length - 1; i >= 0 && !c.done; i--) {
      const bb = c.bubbles[i];
      if (now - bb.born < 300) continue; // le temps de la voir apparaître
      const hit = bodies.some((b) => [15, 16, 19, 20].some((w) => (b.lm[w].visibility ?? 1) > 0.4 &&
        Math.hypot((b.lm[w].x - bb.x) * 640, (b.lm[w].y - bb.y) * 480) < bb.r * 480 + 18));
      if (hit) this.popBubble(c, i, now);
    }
    c.pops = c.pops.filter((p) => now - p.t < 400);
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
      if (phase === 'dance') { Audio8.music(true); Audio8.say(duo() ? 'Dansez !' : 'Danse !'); scene.targetSpeed = 1.3; }
      else { Audio8.music(false); Audio8.tick(); Audio8.say('Statue !'); scene.targetSpeed = 0; }
      ui.setDetail(this.detail(c));
    }
    if (phase === 'dance') {
      if (!Audio8.musicOn()) Audio8.music(true); // après une pause
      if (scene.setDemoPose) scene.setDemoPose(Math.floor(now / 450) % 2 ? 'star' : 'armsUp');
    } else {
      if (scene.setDemoPose) scene.setDemoPose(null);
      if (now - c.phaseAt > 400) { // un petit délai pour s'arrêter
        c.frames++;
        tracker.bodies.forEach((b, i) => { if (tracker.sim || b.motion < 0.02) c.still[i]++; });
      }
    }
  }

  scoreFreeze(c) {
    if (!c.frames) return;
    if (c.still.every((k) => k / c.frames >= 0.6)) {
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
    scene.action(this.cur.s.m);
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
    scene.resolve(true);
    scene.setHoldPose(null);
    if (!c.s.creature) this.gapUntil = now + 900;
  }

  timeout(now) {
    const c = this.cur, s = c.s;
    c.done = true;
    scene.setHoldPose(null);
    this.gapUntil = now + 900;
    if (s.m === 'rest') { this.gapUntil = now; return; }
    let rating;
    if (s.m === 'freeze') {
      if (c.phase === 'freeze') this.scoreFreeze(c);
      Audio8.music(false);
      scene.setDemoPose && scene.setDemoPose(null);
      const n = freezeRounds(s);
      rating = c.okRounds >= n ? 'perfect' : c.okRounds > 0 ? 'good' : 'ok';
      if (c.okRounds > 0) this.success++;
    } else if (s.m === 'bubbles') {
      const r = c.popped / s.n;
      rating = r >= 0.5 ? 'good' : 'ok';
      if (r >= 0.5) this.success++;
    } else if (s.m === 'run') {
      const r = c.count / s.target;
      rating = r >= 1 ? 'perfect' : r >= 0.5 ? 'good' : r > 0 ? 'ok' : 'miss';
      if (r >= 0.5) this.success++;
    } else {
      const partial = c.count > 0 || c.parts.some((n) => n > 0) || c.hold > 0;
      rating = partial ? 'ok' : 'miss';
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
      scene.setHoldPose(ok ? s.pose : null);
      c.hold = ok ? c.hold + dt : Math.max(0, c.hold - dt * 0.5);
      ui.setDetail(this.detail(c));
      if (scene.setHoldProgress) scene.setHoldProgress(Math.min(1, c.hold / (s.hold * 1000)));
      if (c.hold >= s.hold * 1000) { this.add(150, '+150'); return this.complete(now); }
    }
    if (s.m === 'bubbles') this.updateBubbles(c, now);
    if (s.m === 'freeze') this.updateFreeze(c, now);
    if (s.m === 'run' && now - (c.uiAt || 0) > 100) {
      c.uiAt = now;
      // Aucun pas compté depuis un moment : un conseil à voix haute
      if (now - (c.lastStep || c.start) > 2500 && !c.tipped && !tracker.sim) {
        c.tipped = true;
        const knees = tracker.mode !== 'upper';
        Audio8.say(duo() ? (knees ? 'Levez bien les genoux !' : 'Rebondissez sur place !') : (knees ? 'Lève bien les genoux !' : 'Rebondis sur place !'));
      }
      ui.setDetail(this.detail(c));
    }
    ui.setTimer(1 - (now - c.start) / c.dur, s.m === 'rest');
    if (now >= c.end) this.timeout(now);
  }

  finish() {
    this.over = true;
    const ratio = this.maxScore ? this.score / this.maxScore : 0;
    const stars = ratio >= 0.6 ? 3 : ratio >= 0.3 ? 2 : 1; // au moins 1 étoile : on a bougé, c'est gagné
    const id = this.world.id;
    const best = WUQStore.getBest(id);
    const isBest = this.score > best.score;
    if (isBest) WUQStore.setBest(id, { stars: Math.max(stars, best.stars), score: this.score });
    else if (stars > best.stars) WUQStore.setBest(id, { ...best, stars });
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
    showResults(this, stars, isBest, best);
  }
}

function startGame() {
  phase = 'play';
  game = new Game(world, speed.mul);
  show('hud');
  ui.reset(world);
  lostSince = 0;
}

const EVENT_ICONS = { jump: '🦘', squat: '🐸', smash: '💥', left: '⬅️', right: '➡️', step: '👟' };
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
  // En vue profondeur, le héros imite toujours les sauts/smashs du joueur
  if (scene === sceneDepth && (type === 'jump' || type === 'smash')) scene.action(type);
  game.onEvent(type, now, idx);
});

// ---------------- Interface ----------------
const dots = (n, total) => '<div class="dots">' + Array.from({ length: total }, (_, i) => `<span class="${i < n ? 'on' : ''}"></span>`).join('') + '</div>';
const runDetail = (n, target) => `<div class="runCount"><b>${n}</b> / ${target} pas</div>`;
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
    $('cardIcon').textContent = stepIcon(s);
    $('cardLabel').textContent = stepLabel(s);
    let d = '';
    if (s.m === 'run') d = runDetail(0, s.target);
    else if (s.n > 1) d = dots(0, s.n);
    else if (s.m === 'combo') d = comboChips(s.parts, 0);
    else if (s.m === 'pose') d = holdBar(0, s.creature);
    this.setDetail(d);
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

function showResults(g, stars, isBest, prevBest) {
  phase = 'results';
  Audio8.music(false);
  show('hud', false); show('camBox', false);
  show('results');
  $('resTitle').textContent = g.world.endText;
  $('resStars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.35}s">★</span>`).join('');
  $('resScore').textContent = g.score;
  $('resDetail').innerHTML = `${g.success} / ${g.scored} défis réussis · ${g.world.collectible} ${g.collected} ramassés · meilleure série 🔥 ${g.bestStreak}`;
  $('resBest').textContent = isBest ? '🏆 Nouveau record !' : `Record : ${prevBest.score} pts`;
  const team = $('resTeam');
  team.innerHTML = '';
  if (g.team.length) {
    const title = document.createElement('div');
    title.className = 'teamTitle';
    title.textContent = 'Tes nouveaux amis :';
    team.appendChild(title);
    for (const cr of g.team) team.appendChild(creatureCard(cr, true, Carnet.evolved(cr.id)));
  }
  // Gommette pour chaque joueur
  const won = team.map((p, i) => {
    const own = WUQStore.getStickers(i);
    const fresh = STICKERS.filter((st) => !own.includes(st));
    const st = (fresh.length ? fresh : STICKERS)[Math.floor(Math.random() * (fresh.length || STICKERS.length))];
    WUQStore.addSticker(i, st);
    return st;
  });
  $('resSticker').innerHTML = won.map((st, i) => `<span class="sticker" style="animation-delay:${1.4 + i * 0.3}s">${duo() ? whoTag(i) : ''}${st}</span>`).join('');
  celebrate();
  Audio8.win();
  const names = team.map((p) => p.name).filter(Boolean);
  const bravo = names.length ? `Bravo ${names.join(' et ')} !` : 'Bravo !';
  Audio8.say(`${bravo} ${duo() ? 'Vous avez' : 'Tu as'} gagné ${stars} étoile${stars > 1 ? 's' : ''} et ${duo() ? 'des nouvelles gommettes' : 'une nouvelle gommette'} !`);
  scene.targetSpeed = 0.2;
  scene.obs = null;
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

// Bulles sur la vidéo (le canvas est en miroir : pas de texte ici)
function drawBubbles(ctx, c, now) {
  for (const bb of c.bubbles) {
    const grow = Math.min(1, (now - bb.born) / 300);
    const x = bb.x * 640, y = bb.y * 480 + Math.sin(now * 0.003 + bb.p) * 6, r = bb.r * 480 * grow;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    g.addColorStop(0.7, 'rgba(173, 232, 255, 0.25)');
    g.addColorStop(1, 'rgba(255, 170, 230, 0.6)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of c.pops) {
    const k = (now - p.t) / 400, x = p.x * 640, y = p.y * 480, r = p.r * 480;
    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - k})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r * (1 + k), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(173, 232, 255, ${1 - k})`;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * (1 + k * 1.5), y + Math.sin(a) * r * (1 + k * 1.5), 5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

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
  if (scene.setLive) scene.setLive(phase === 'play' || phase === 'countdown' ? tracker.state : { side: 'center', squat: false });
  if (!frozen) scene.render(now);
  if (!$('camBox').classList.contains('hidden')) {
    const cur = phase === 'play' && game && game.cur;
    const posing = !!(cur && cur.s.m === 'pose' && !cur.done);
    const bubbling = !!(cur && cur.s.m === 'bubbles' && !cur.done);
    tracker.draw(camCtx, 640, 480, { colors, target: posing ? cur.s.pose : null });
    if (cur && cur.s.m === 'bubbles') drawBubbles(camCtx, cur, now);
    $('camBox').classList.toggle('pose', posing || bubbling);
    updateCamStatus(now);
  }
}

buildMenu();
requestAnimationFrame(loop);
