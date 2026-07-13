/* Lazy Jones remake — hotel world, state machine, rendering. */
(() => {
'use strict';

const cvs = document.getElementById('game');
const g = cvs.getContext('2d');
g.imageSmoothingEnabled = false;
const R = GFX.rect, TX = GFX.text, CL = GFX.clamp;

/* ── Input ─────────────────────────────────────────────── */
const held = { left: false, right: false, up: false, down: false, fire: false, enter: false };
let pressed = {};
const KEYMAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ' ': 'fire', Enter: 'enter'
};
addEventListener('keydown', e => {
  const k = KEYMAP[e.key];
  if (!k) return;
  if (e.target.tagName !== 'BUTTON') e.preventDefault();
  if (!held[k] && !e.repeat) pressed[k] = true;
  held[k] = true;
});
addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) held[k] = false; });

/* ── World constants ───────────────────────────────────── */
const FLOORS = [{ base: 196 }, { base: 134 }, { base: 72 }];   // 0 = ground
const DOOR_X = [44, 88, 132, 176, 220, 264];
const SHAFT_W = 30;
const GAME_TIME = 25;

/* ── State ─────────────────────────────────────────────── */
let state = 'title';           // title | hotel | mini | over
let score = 0, lives = 3;
let doors = [], jones = null, patrols = [], session = null;
let best = +(localStorage.getItem('lj_best') || 0);
let t = 0, track = null, helpOpen = false;

function music(name) {
  if (track !== name) { track = name; AudioSys.playMusic(name); }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function reset() {
  score = 0; lives = 3;
  const action = MiniGames.ids.filter(id => id !== 'bed' && id !== 'bar');
  const pool = [...MiniGames.ids];
  while (pool.length < 18) pool.push(action[(Math.random() * action.length) | 0]);
  shuffle(pool);
  doors = [];
  let n = 0;
  for (let f = 0; f < 3; f++) for (let i = 0; i < 6; i++) {
    doors.push({ floor: f, x: DOOR_X[i], num: (f + 1) * 100 + i + 1, gameId: pool[n], tune: n, used: false });
    n++;
  }
  jones = { x: 40, floor: 0, dir: 1, walk: 0, inv: 0 };
  patrols = [
    { kind: 'manager', floor: 0, x: 250, v: -32 },
    { kind: 'trolley', floor: 1, x: 120, v: 40 },
    { kind: 'ghost',   floor: 2, x: 200, v: -26, t: 0 }
  ];
  session = null;
  state = 'hotel';
  music('hotel');
}

function loseLife() {
  lives--;
  AudioSys.sfx('hurt');
  if (lives <= 0) { gameOver(false); return; }
  jones.x = 8;
  jones.inv = 2.5;
}

function enterRoom(d) {
  session = { door: d, game: MiniGames.create(d.gameId), phase: 'intro', t: 0, timer: GAME_TIME };
  state = 'mini';
  AudioSys.sfx('door');
  music((d.gameId === 'bed' || d.gameId === 'bar') ? 'dreamy' : AudioSys.gameTune(d.tune));
}

function gameOver(won) {
  if (won) score += lives * 100;
  state = 'over';
  AudioSys.stopMusic(); track = null;
  AudioSys.sfx(won ? 'win' : 'over');
  if (score > best) { best = score; localStorage.setItem('lj_best', best); }
  document.getElementById('over-title').textContent = won ? 'Shift complete' : "You're fired";
  document.getElementById('over-text').textContent = won
    ? `Every room slacked in, every machine mastered. Bonus ${lives * 100} points for surviving with ${lives} warning${lives === 1 ? '' : 's'} to spare.`
    : 'Three warnings and the Hotel Magnificent has finally had enough of Jones.';
  document.getElementById('over-score').textContent = score;
  document.getElementById('over-best').textContent = best;
  document.getElementById('modal-over').classList.remove('hidden');
  document.getElementById('btn-restart').focus();
}

/* ── Update ────────────────────────────────────────────── */
function makeInp() {
  return { left: held.left, right: held.right, up: held.up, down: held.down, fire: held.fire, p: pressed };
}

function update(dt) {
  if (state === 'title') {
    if (pressed.enter) { AudioSys.ensure(); reset(); }
    return;
  }
  if (state === 'over') return;

  if (state === 'hotel') {
    const j = jones;
    if (held.left) { j.x -= 68 * dt; j.dir = -1; j.walk += dt; }
    else if (held.right) { j.x += 68 * dt; j.dir = 1; j.walk += dt; }
    else j.walk = 0;
    j.x = CL(j.x, 6, 308);
    if (j.inv > 0) j.inv -= dt;

    if (j.x < SHAFT_W) {
      if (pressed.up && j.floor < 2) { j.floor++; AudioSys.sfx('lift'); }
      if (pressed.down && j.floor > 0) { j.floor--; AudioSys.sfx('lift'); }
    } else if (pressed.up) {
      const d = doors.find(d => d.floor === j.floor && !d.used && Math.abs(d.x + 12 - j.x) < 11);
      if (d) { enterRoom(d); return; }
    }

    patrols.forEach(p => {
      p.x += p.v * dt;
      if (p.x < 38 || p.x > 300) p.v *= -1;
      p.t = (p.t || 0) + dt;
    });
    if (j.inv <= 0) {
      for (const p of patrols) {
        if (p.floor === j.floor && Math.abs(p.x - j.x) < 10) { loseLife(); break; }
      }
    }
    return;
  }

  if (state === 'mini') {
    const s = session;
    s.t += dt;
    if (s.phase === 'intro') {
      if (s.t > 1.7 || pressed.fire) { s.phase = 'play'; s.t = 0; }
    } else if (s.phase === 'play') {
      s.timer -= dt;
      s.game.update(dt, makeInp());
      if (s.game.done || s.timer <= 0) {
        s.phase = 'result'; s.t = 0;
        if (!s.game.done) AudioSys.sfx('coin');
      }
    } else if (s.t > 1.8) {
      score += s.game.score + 50;
      s.door.used = true;
      session = null;
      state = 'hotel';
      music('hotel');
      if (doors.every(d => d.used)) gameOver(true);
    }
  }
}

/* ── Sprites ───────────────────────────────────────────── */
function drawJones(x, y, dir, walk, inv) {
  if (inv > 0 && ((inv * 8) | 0) % 2) return;      // blink while invincible
  const step = walk > 0 ? ((walk * 8) | 0) % 2 : 0;
  R(g, '#3a2a1a', x - 4, y - 20, 8, 3);            // hair
  R(g, '#c98d4a', x - 4, y - 17, 8, 5);            // face
  R(g, '#0d1014', x + (dir > 0 ? 1 : -3), y - 16, 2, 2);  // eye
  R(g, '#e9e4d6', x - 5, y - 12, 10, 7);           // shirt
  R(g, '#ff6b5a', x - 5, y - 12, 2, 7);            // vest
  R(g, '#ff6b5a', x + 3, y - 12, 2, 7);
  R(g, '#2a323e', x - 4, y - 5, 8, 2);             // belt
  if (step) { R(g, '#2a323e', x - 4, y - 3, 3, 3); R(g, '#2a323e', x + 2, y - 4, 3, 4); }
  else { R(g, '#2a323e', x - 3, y - 4, 3, 4); R(g, '#2a323e', x + 1, y - 3, 3, 3); }
}

function drawPatrol(p) {
  const y = FLOORS[p.floor].base;
  if (p.kind === 'manager') {
    R(g, '#22262e', p.x - 5, y - 20, 10, 15);      // suit
    R(g, '#e9e4d6', p.x - 1, y - 19, 2, 6);        // shirt
    R(g, '#c98d4a', p.x - 3, y - 26, 7, 6);        // head
    R(g, '#5a626e', p.x - 3, y - 28, 7, 2);        // grey hair
    R(g, '#22262e', p.x - 4, y - 5, 3, 5); R(g, '#22262e', p.x + 1, y - 5, 3, 5);
  } else if (p.kind === 'trolley') {
    R(g, '#5a626e', p.x - 9, y - 14, 18, 11);
    R(g, '#e9e4d6', p.x - 7, y - 18, 6, 4); R(g, '#3ec5b4', p.x + 1, y - 18, 6, 4);
    R(g, '#22262e', p.x - 7, y - 3, 4, 3); R(g, '#22262e', p.x + 3, y - 3, 4, 3);
  } else {                                          // ghost
    const fy = y - 6 + Math.sin(p.t * 3) * 4;
    g.globalAlpha = 0.55 + Math.sin(p.t * 2.2) * 0.25;
    R(g, '#dfe6ef', p.x - 6, fy - 18, 12, 14);
    R(g, '#dfe6ef', p.x - 6, fy - 5, 3, 3); R(g, '#dfe6ef', p.x - 1, fy - 5, 3, 4); R(g, '#dfe6ef', p.x + 4, fy - 5, 2, 3);
    R(g, '#22262e', p.x - 4, fy - 14, 2, 3); R(g, '#22262e', p.x + 2, fy - 14, 2, 3);
    g.globalAlpha = 1;
  }
}

/* ── Hotel rendering ───────────────────────────────────── */
const WALLS = ['#26282c', '#2b2620', '#202b27'];
const STRIPES = ['#2b2d32', '#302b24', '#24302b'];

function drawHotel() {
  for (let f = 0; f < 3; f++) {
    const base = FLOORS[f].base, top = base - 58;
    R(g, WALLS[f], 0, top, 320, 58);
    for (let x = 34; x < 320; x += 16) R(g, STRIPES[f], x, top, 5, 58);
    R(g, '#6e2a24', 0, base, 320, 4);              // carpet
    for (let x = 0; x < 320; x += 12) R(g, '#7d342c', x + 4, base + 1, 4, 2);
    R(g, '#17191d', 0, base - 6, 320, 2);          // skirting shadow
  }

  // lift shaft
  R(g, '#131519', 0, 14, SHAFT_W, 186);
  R(g, '#2a323e', SHAFT_W - 2, 14, 2, 186);
  for (let y = 18; y < 200; y += 10) R(g, '#22262e', 13, y, 2, 5);   // cable
  const cy = FLOORS[jones && state !== 'title' ? jones.floor : 0].base;
  R(g, '#3a4250', 3, cy - 34, 24, 34);             // lift car
  R(g, '#171b22', 6, cy - 30, 18, 28);
  TX(g, 'LIFT', 15, 20, '#5a626e', 6, 'center');

  doors.forEach(d => {
    const base = FLOORS[d.floor].base;
    R(g, '#4a3a28', d.x - 2, base - 38, 28, 38);   // frame
    if (d.used) {
      R(g, '#0d0f13', d.x, base - 34, 24, 34);     // dark, spent room
    } else {
      R(g, '#8a6134', d.x, base - 34, 24, 34);
      R(g, '#75522b', d.x + 3, base - 30, 18, 12);
      R(g, '#75522b', d.x + 3, base - 15, 18, 12);
      R(g, '#ffe08a', d.x + 19, base - 19, 2, 3);  // knob
    }
    TX(g, String(d.num), d.x + 12, base - 46, d.used ? '#4a4f58' : '#9aa0a8', 6, 'center');
  });

  patrols.forEach(drawPatrol);
  drawJones(jones.x, FLOORS[jones.floor].base, jones.dir, jones.walk, jones.inv);
  drawHUD();
}

function drawHUD() {
  R(g, '#08090c', 0, 0, 320, 14);
  TX(g, 'SCORE ' + String(score).padStart(6, '0'), 6, 3, '#ffb347', 8);
  const left = doors.filter(d => !d.used).length;
  TX(g, 'ROOMS ' + left, 160, 3, '#3ec5b4', 8, 'center');
  for (let i = 0; i < 3; i++) {
    const c = i < lives ? '#c98d4a' : '#2a323e';
    R(g, c, 288 + i * 10, 4, 6, 6);
    R(g, i < lives ? '#3a2a1a' : '#2a323e', 288 + i * 10, 3, 6, 2);
  }
}

/* ── Mini-game overlay rendering ───────────────────────── */
function drawMini() {
  const s = session;
  s.game.draw(g);

  R(g, '#08090c', 0, 0, 320, 14);
  TX(g, s.game.name, 6, 3, '#3ec5b4', 8);
  TX(g, 'PTS ' + s.game.score, 160, 3, '#ffb347', 8, 'center');
  const w = Math.max(0, s.timer / GAME_TIME) * 80;
  R(g, '#2a323e', 234, 4, 80, 6);
  R(g, s.timer < 5 && ((s.timer * 4) | 0) % 2 ? '#ff6b5a' : '#3ec5b4', 234, 4, w, 6);

  if (s.phase === 'intro') {
    R(g, '#0d1014', 40, 60, 240, 84);
    R(g, '#3ec5b4', 40, 60, 240, 2); R(g, '#3ec5b4', 40, 142, 240, 2);
    TX(g, 'ROOM ' + s.door.num, 160, 70, '#9aa0a8', 8, 'center');
    TX(g, s.game.name, 160, 84, '#ffb347', 14, 'center');
    TX(g, s.game.hint, 160, 106, '#e9e4d6', 8, 'center');
    if (((s.t * 2) | 0) % 2) TX(g, 'SPACE TO START', 160, 126, '#3ec5b4', 8, 'center');
  } else if (s.phase === 'result') {
    R(g, '#0d1014', 60, 70, 200, 64);
    R(g, '#ffb347', 60, 70, 200, 2); R(g, '#ffb347', 60, 132, 200, 2);
    TX(g, s.game.done ? 'WIPED OUT!' : 'TIME UP!', 160, 80, '#e9e4d6', 10, 'center');
    TX(g, 'ROOM +' + s.game.score + '  DOOR BONUS +50', 160, 100, '#ffb347', 8, 'center');
    TX(g, 'BACK TO WORK...', 160, 116, '#9aa0a8', 7, 'center');
  }
}

/* ── Title screen ──────────────────────────────────────── */
function drawTitle() {
  R(g, '#0d1014', 0, 0, 320, 200);
  // hotel facade backdrop
  for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) {
    const lit = (r * 7 + c * 13) % 5 < 2;
    R(g, lit ? '#3d3524' : '#171b22', 24 + c * 28, 24 + r * 22, 12, 14);
  }
  R(g, 'rgba(13,16,20,0.72)', 0, 0, 320, 200);

  TX(g, 'LAZY JONES', 162, 52, '#1c4a44', 30, 'center');
  TX(g, 'LAZY JONES', 160, 50, '#ffb347', 30, 'center');
  TX(g, 'THE HOTEL MAGNIFICENT WELCOMES ITS WORST EMPLOYEE', 160, 90, '#9aa0a8', 7, 'center');
  TX(g, '18 DOORS · 10 WAYS TO SLACK OFF · 3 WARNINGS', 160, 104, '#3ec5b4', 7, 'center');
  if (((t * 2) | 0) % 2) TX(g, 'PRESS ENTER TO CLOCK IN', 160, 134, '#e9e4d6', 10, 'center');
  TX(g, 'HI SCORE ' + String(best).padStart(6, '0'), 160, 160, '#ffb347', 8, 'center');
  TX(g, 'A FAN REMAKE OF THE 1984 C64 CLASSIC', 160, 184, '#4a4f58', 6, 'center');
}

/* ── Main loop ─────────────────────────────────────────── */
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  t += dt;

  if (!helpOpen) update(dt);
  pressed = {};

  if (state === 'title') drawTitle();
  else if (state === 'mini') drawMini();
  else drawHotel();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ── Page wiring ───────────────────────────────────────── */
const helpModal = document.getElementById('modal-help');
document.getElementById('btn-help').addEventListener('click', e => {
  helpOpen = true;
  helpModal.classList.remove('hidden');
  e.target.blur();
});
helpModal.querySelector('[data-close]').addEventListener('click', () => {
  helpOpen = false;
  helpModal.classList.add('hidden');
});
document.getElementById('btn-restart').addEventListener('click', e => {
  document.getElementById('modal-over').classList.add('hidden');
  e.target.blur();
  reset();
});
/* Start the title theme on the first user gesture (autoplay policy). */
const kickMusic = () => { if (state === 'title') music('title'); };
addEventListener('keydown', kickMusic, { once: true });
addEventListener('pointerdown', kickMusic, { once: true });

/* Debug hooks for automated screenshots: #play jumps into the hotel,
   #room=<id> jumps straight into a mini-game. */
if (location.hash === '#play') reset();
else if (location.hash.startsWith('#room=')) {
  reset();
  const id = location.hash.slice(6);
  enterRoom(doors.find(d => d.gameId === id) || doors[0]);
}

let soundOn = true;
document.getElementById('btn-sound').addEventListener('click', e => {
  soundOn = !soundOn;
  AudioSys.setEnabled(soundOn);
  e.target.textContent = 'Sound: ' + (soundOn ? 'on' : 'off');
  e.target.setAttribute('aria-pressed', String(soundOn));
  e.target.blur();
});
})();
