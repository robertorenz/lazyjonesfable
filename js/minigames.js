/* Lazy Jones remake — the rooms.
   Every door hides one of these mini-games. Each game exposes:
     name, hint, update(dt, inp), draw(g), score, done
   inp = { left,right,up,down,fire, p:{left,right,up,down,fire} }  (p = just pressed)
   Play area: 320x200 with the top 14px reserved for the HUD. */

/* Shared low-res drawing helpers (also used by main.js). */
const GFX = {
  rect(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); },
  text(g, str, x, y, c, size = 8, align = 'left') {
    g.fillStyle = c;
    g.font = `bold ${size}px "Courier New", monospace`;
    g.textAlign = align;
    g.textBaseline = 'top';
    g.fillText(str, x, y);
    g.textAlign = 'left';
  },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
};

const MiniGames = (() => {
  const T = 14, H = 186, W = 320;   // play area: y 14..200
  const R = GFX.rect, TX = GFX.text, CL = GFX.clamp;

  /* ── 1. Wafer Invaders ── */
  function invaders() {
    const g = { name: 'WAFER INVADERS', hint: 'SHOOT THE BISCUIT FLEET', score: 0, done: false };
    let px = 160, bullets = [], bombs = [], aliens = [], dir = 1, vx = 22, bombT = 0, wave = 0;
    function spawn() {
      aliens = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++)
        aliens.push({ x: 70 + c * 32, y: 34 + r * 16 + wave * 4 });
      vx = 22 + wave * 8;
    }
    spawn();
    g.update = (dt, inp) => {
      if (inp.left) px -= 95 * dt;
      if (inp.right) px += 95 * dt;
      px = CL(px, 12, 308);
      if (inp.p.fire && bullets.length < 2) { bullets.push({ x: px, y: 186 }); AudioSys.sfx('shoot'); }
      bullets.forEach(b => b.y -= 170 * dt);
      bullets = bullets.filter(b => b.y > T);
      let edge = false;
      aliens.forEach(a => { a.x += dir * vx * dt; if (a.x < 14 || a.x > 306) edge = true; });
      if (edge) { dir *= -1; aliens.forEach(a => { a.y += 6; a.x += dir * 2; }); }
      bombT -= dt;
      if (bombT <= 0 && aliens.length) {
        const a = aliens[(Math.random() * aliens.length) | 0];
        bombs.push({ x: a.x, y: a.y + 6 });
        bombT = 1.1;
      }
      bombs.forEach(b => b.y += 65 * dt);
      bombs = bombs.filter(b => {
        if (b.y > 184 && Math.abs(b.x - px) < 7) { g.done = true; AudioSys.sfx('boom'); return false; }
        return b.y < 198;
      });
      bullets = bullets.filter(b => {
        const hit = aliens.findIndex(a => Math.abs(a.x - b.x) < 8 && Math.abs(a.y - b.y) < 6);
        if (hit >= 0) { aliens.splice(hit, 1); g.score += 20; AudioSys.sfx('pop'); return false; }
        return true;
      });
      if (aliens.some(a => a.y > 172)) g.done = true;
      if (!aliens.length) { g.score += 150; wave++; AudioSys.sfx('coin'); spawn(); }
    };
    g.draw = c => {
      R(c, '#0a0e1a', 0, T, W, H);
      aliens.forEach(a => {
        R(c, '#c98d4a', a.x - 6, a.y - 4, 12, 8);
        R(c, '#8a5a28', a.x - 4, a.y - 2, 2, 2); R(c, '#8a5a28', a.x + 2, a.y - 2, 2, 2);
        R(c, '#8a5a28', a.x - 2, a.y + 2, 4, 2);
      });
      bombs.forEach(b => R(c, '#ff6b5a', b.x - 1, b.y, 2, 5));
      bullets.forEach(b => R(c, '#ffe08a', b.x - 1, b.y, 2, 5));
      R(c, '#3ec5b4', px - 7, 188, 14, 6); R(c, '#3ec5b4', px - 2, 184, 4, 4);
    };
    return g;
  }

  /* ── 2. The Wall ── */
  function breakout() {
    const g = { name: 'THE WALL', hint: 'KNOCK IT ALL DOWN', score: 0, done: false };
    const COLORS = ['#ff6b5a', '#ffb347', '#ffe08a', '#3ec5b4'];
    let padX = 160, bricks = [], ball, speed = 115;
    function wall() {
      bricks = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++)
        bricks.push({ x: 12 + c * 37, y: 30 + r * 10, col: COLORS[r] });
    }
    function serve() { ball = { x: padX, y: 176, vx: (Math.random() < 0.5 ? -1 : 1) * speed * 0.6, vy: -speed }; }
    wall(); serve();
    g.update = (dt, inp) => {
      if (inp.left) padX -= 130 * dt;
      if (inp.right) padX += 130 * dt;
      padX = CL(padX, 22, 298);
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < 4 || ball.x > 316) { ball.vx *= -1; ball.x = CL(ball.x, 4, 316); AudioSys.sfx('bounce'); }
      if (ball.y < T + 2) { ball.vy = Math.abs(ball.vy); AudioSys.sfx('bounce'); }
      if (ball.vy > 0 && ball.y > 186 && ball.y < 194 && Math.abs(ball.x - padX) < 24) {
        ball.vy = -Math.abs(ball.vy);
        ball.vx = (ball.x - padX) * 6;
        AudioSys.sfx('bounce');
      }
      if (ball.y > 200) { g.done = true; AudioSys.sfx('boom'); }
      const hit = bricks.findIndex(b => ball.x > b.x - 2 && ball.x < b.x + 36 && ball.y > b.y - 2 && ball.y < b.y + 10);
      if (hit >= 0) {
        bricks.splice(hit, 1); g.score += 15; ball.vy *= -1; AudioSys.sfx('pop');
        if (!bricks.length) { g.score += 150; speed += 20; wall(); serve(); AudioSys.sfx('coin'); }
      }
    };
    g.draw = c => {
      R(c, '#101321', 0, T, W, H);
      bricks.forEach(b => { R(c, b.col, b.x, b.y, 34, 8); });
      R(c, '#e9e4d6', ball.x - 2, ball.y - 2, 4, 4);
      R(c, '#3ec5b4', padX - 22, 190, 44, 5);
    };
    return g;
  }

  /* ── 3. Grub Snake ── */
  function snake() {
    const g = { name: 'GRUB SNAKE', hint: 'EAT THE ROOM SERVICE', score: 0, done: false };
    const CS = 10, COLS = 32, ROWS = 18, OY = 16;
    let body = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
    let dir = { x: 1, y: 0 }, nextDir = dir, tick = 0, food = null, grow = 0;
    function placeFood() {
      do { food = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 }; }
      while (body.some(s => s.x === food.x && s.y === food.y));
    }
    placeFood();
    g.update = (dt, inp) => {
      if (inp.p.left && dir.x !== 1) nextDir = { x: -1, y: 0 };
      if (inp.p.right && dir.x !== -1) nextDir = { x: 1, y: 0 };
      if (inp.p.up && dir.y !== 1) nextDir = { x: 0, y: -1 };
      if (inp.p.down && dir.y !== -1) nextDir = { x: 0, y: 1 };
      tick += dt;
      if (tick < 0.11) return;
      tick = 0;
      dir = nextDir;
      const h = { x: body[0].x + dir.x, y: body[0].y + dir.y };
      if (h.x < 0 || h.x >= COLS || h.y < 0 || h.y >= ROWS ||
          body.some(s => s.x === h.x && s.y === h.y)) { g.done = true; AudioSys.sfx('boom'); return; }
      body.unshift(h);
      if (h.x === food.x && h.y === food.y) { g.score += 25; grow += 2; AudioSys.sfx('coin'); placeFood(); }
      if (grow > 0) grow--; else body.pop();
    };
    g.draw = c => {
      R(c, '#0d1a12', 0, T, W, H);
      R(c, '#ff6b5a', food.x * CS + 2, OY + food.y * CS + 2, 6, 6);
      body.forEach((s, i) => R(c, i === 0 ? '#8ee6c9' : '#3ec5b4', s.x * CS + 1, OY + s.y * CS + 1, 8, 8));
    };
    return g;
  }

  /* ── 4. Star Snatch ── */
  function catcher() {
    const g = { name: 'STAR SNATCH', hint: 'CATCH THEM · DROP 3 AND OUT', score: 0, done: false };
    let px = 160, stars = [], spawnT = 0, missed = 0, t = 0;
    g.update = (dt, inp) => {
      t += dt;
      if (inp.left) px -= 120 * dt;
      if (inp.right) px += 120 * dt;
      px = CL(px, 14, 306);
      spawnT -= dt;
      if (spawnT <= 0) {
        stars.push({ x: 14 + Math.random() * 292, y: T, v: 55 + Math.random() * 60 + t * 2 });
        spawnT = 0.65;
      }
      stars = stars.filter(s => {
        s.y += s.v * dt;
        if (s.y > 182 && s.y < 194 && Math.abs(s.x - px) < 13) { g.score += 25; AudioSys.sfx('coin'); return false; }
        if (s.y > 198) {
          missed++; AudioSys.sfx('hurt');
          if (missed >= 3) g.done = true;
          return false;
        }
        return true;
      });
    };
    g.draw = c => {
      R(c, '#131022', 0, T, W, H);
      stars.forEach(s => {
        R(c, '#ffe08a', s.x - 1, s.y - 3, 2, 6);
        R(c, '#ffe08a', s.x - 3, s.y - 1, 6, 2);
      });
      R(c, '#3ec5b4', px - 12, 188, 24, 4);
      R(c, '#3ec5b4', px - 12, 184, 3, 4); R(c, '#3ec5b4', px + 9, 184, 3, 4);
      for (let i = 0; i < 3; i++)
        R(c, i < 3 - missed ? '#ffe08a' : '#3a3f4a', 296 + i * 8, 18, 5, 5);
    };
    return g;
  }

  /* ── 5. Night Driver ── */
  function driver() {
    const g = { name: 'NIGHT DRIVER', hint: 'DODGE THE TRAFFIC', score: 0, done: false };
    const LANES = [122, 160, 198];
    let lane = 1, carX = LANES[1], cars = [], spawnT = 0, t = 0, scroll = 0;
    g.update = (dt, inp) => {
      t += dt;
      if (inp.p.left && lane > 0) lane--;
      if (inp.p.right && lane < 2) lane++;
      carX += (LANES[lane] - carX) * 12 * dt;
      const speed = 105 + t * 6;
      scroll = (scroll + speed * dt) % 24;
      spawnT -= dt;
      if (spawnT <= 0) {
        cars.push({ lane: (Math.random() * 3) | 0, y: T - 20 });
        spawnT = Math.max(0.45, 0.95 - t * 0.02);
      }
      cars = cars.filter(cr => {
        cr.y += speed * dt;
        if (cr.y > 158 && cr.y < 196 && Math.abs(LANES[cr.lane] - carX) < 16) {
          g.done = true; AudioSys.sfx('boom'); return false;
        }
        if (cr.y > 200) { g.score += 15; AudioSys.sfx('blip'); return false; }
        return true;
      });
    };
    g.draw = c => {
      R(c, '#101418', 0, T, W, H);
      R(c, '#1c222b', 100, T, 120, H);
      R(c, '#e9e4d6', 100, T, 2, H); R(c, '#e9e4d6', 218, T, 2, H);
      for (let y = T - 24 + scroll; y < 200; y += 24) {
        R(c, '#5a626e', 140, y, 2, 12); R(c, '#5a626e', 178, y, 2, 12);
      }
      cars.forEach(cr => {
        const x = LANES[cr.lane];
        R(c, '#ff6b5a', x - 7, cr.y, 14, 22);
        R(c, '#2a2f38', x - 5, cr.y + 4, 10, 6);
        R(c, '#ffe08a', x - 6, cr.y + 20, 3, 2); R(c, '#ffe08a', x + 3, cr.y + 20, 3, 2);
      });
      R(c, '#3ec5b4', carX - 7, 168, 14, 22);
      R(c, '#1c4a44', carX - 5, 172, 10, 6);
      R(c, '#ffe08a', carX - 6, 168, 3, 2); R(c, '#ffe08a', carX + 3, 168, 3, 2);
    };
    return g;
  }

  /* ── 6. 99 Balloons ── */
  function balloons() {
    const g = { name: '99 BALLOONS', hint: 'POP THEM BEFORE THEY FLY', score: 0, done: false };
    const COLORS = ['#ff6b5a', '#ffb347', '#3ec5b4', '#8ee6c9'];
    let cx = 160, cy = 100, bs = [], spawnT = 0, t = 0;
    g.update = (dt, inp) => {
      t += dt;
      if (inp.left) cx -= 140 * dt;
      if (inp.right) cx += 140 * dt;
      if (inp.up) cy -= 140 * dt;
      if (inp.down) cy += 140 * dt;
      cx = CL(cx, 8, 312); cy = CL(cy, T + 6, 194);
      spawnT -= dt;
      if (spawnT <= 0) {
        bs.push({ x: 20 + Math.random() * 280, y: 205, v: 28 + Math.random() * 34 + t,
                  ph: Math.random() * 6, col: COLORS[(Math.random() * 4) | 0] });
        spawnT = 0.7;
      }
      bs.forEach(b => { b.y -= b.v * dt; b.x += Math.sin(b.y / 14 + b.ph) * 18 * dt; });
      bs = bs.filter(b => b.y > T - 8);
      if (inp.p.fire) {
        const hit = bs.findIndex(b => (b.x - cx) ** 2 + (b.y - cy) ** 2 < 144);
        if (hit >= 0) { bs.splice(hit, 1); g.score += 30; AudioSys.sfx('pop'); }
        else { g.score = Math.max(0, g.score - 5); AudioSys.sfx('blip'); }
      }
    };
    g.draw = c => {
      R(c, '#14202e', 0, T, W, H);
      bs.forEach(b => {
        R(c, b.col, b.x - 5, b.y - 6, 10, 12);
        R(c, b.col, b.x - 3, b.y - 8, 6, 2);
        R(c, '#9aa0a8', b.x, b.y + 6, 1, 6);
      });
      R(c, '#ffe08a', cx - 6, cy - 1, 4, 2); R(c, '#ffe08a', cx + 2, cy - 1, 4, 2);
      R(c, '#ffe08a', cx - 1, cy - 6, 2, 4); R(c, '#ffe08a', cx - 1, cy + 2, 2, 4);
    };
    return g;
  }

  /* ── 7. The Turk ── */
  function turk() {
    const g = { name: 'THE TURK', hint: 'ZAP HIM WHEN HE PEEKS', score: 0, done: false };
    let cur = 4, target = -1, showT = 0, gapT = 0.6, t = 0;
    const wx = i => 88 + (i % 3) * 56, wy = i => 40 + ((i / 3) | 0) * 50;
    g.update = (dt, inp) => {
      t += dt;
      if (inp.p.left && cur % 3 > 0) cur--;
      if (inp.p.right && cur % 3 < 2) cur++;
      if (inp.p.up && cur > 2) cur -= 3;
      if (inp.p.down && cur < 6) cur += 3;
      if (target < 0) {
        gapT -= dt;
        if (gapT <= 0) {
          target = (Math.random() * 9) | 0;
          showT = Math.max(0.45, 0.9 - t * 0.015);
        }
      } else {
        showT -= dt;
        if (showT <= 0) { target = -1; gapT = 0.25 + Math.random() * 0.5; }
      }
      if (inp.p.fire) {
        if (cur === target) { g.score += 40; target = -1; gapT = 0.3; AudioSys.sfx('pop'); }
        else { g.score = Math.max(0, g.score - 10); AudioSys.sfx('blip'); }
      }
    };
    g.draw = c => {
      R(c, '#1a141e', 0, T, W, H);
      for (let i = 0; i < 9; i++) {
        const x = wx(i), y = wy(i);
        R(c, '#2a323e', x - 4, y - 4, 48, 44);
        R(c, i === target ? '#0d1014' : '#131822', x, y, 40, 36);
        if (i === target) {
          R(c, '#c98d4a', x + 14, y + 14, 12, 14);      // face
          R(c, '#ff6b5a', x + 13, y + 6, 14, 8);        // fez
          R(c, '#ffe08a', x + 19, y + 4, 2, 3);         // tassel
          R(c, '#0d1014', x + 17, y + 18, 2, 2); R(c, '#0d1014', x + 21, y + 18, 2, 2);
          R(c, '#3a2a1a', x + 16, y + 24, 8, 3);        // moustache
        }
        if (i === cur) {
          R(c, '#3ec5b4', x - 4, y - 4, 48, 2); R(c, '#3ec5b4', x - 4, y + 38, 48, 2);
          R(c, '#3ec5b4', x - 4, y - 4, 2, 44); R(c, '#3ec5b4', x + 42, y - 4, 2, 44);
        }
      }
    };
    return g;
  }

  /* ── 8. Laser Jones ── */
  function laser() {
    const g = { name: 'LASER JONES', hint: 'HOLD THE CORRIDOR', score: 0, done: false };
    let py = 100, bullets = [], foes = [], spawnT = 0, t = 0;
    g.update = (dt, inp) => {
      t += dt;
      if (inp.up) py -= 110 * dt;
      if (inp.down) py += 110 * dt;
      py = CL(py, T + 8, 192);
      if (inp.p.fire && bullets.length < 3) { bullets.push({ x: 30, y: py }); AudioSys.sfx('shoot'); }
      bullets.forEach(b => b.x += 190 * dt);
      bullets = bullets.filter(b => b.x < 322);
      spawnT -= dt;
      if (spawnT <= 0) {
        foes.push({ x: 330, y0: T + 20 + Math.random() * 150, ph: Math.random() * 6, y: 0 });
        spawnT = Math.max(0.4, 0.85 - t * 0.02);
      }
      foes.forEach(f => { f.x -= (72 + t * 4) * dt; f.y = f.y0 + Math.sin(f.x / 22 + f.ph) * 16; });
      foes = foes.filter(f => {
        if (Math.abs(f.x - 24) < 10 && Math.abs(f.y - py) < 8) { g.done = true; AudioSys.sfx('boom'); return false; }
        return f.x > -10;
      });
      bullets = bullets.filter(b => {
        const hit = foes.findIndex(f => Math.abs(f.x - b.x) < 8 && Math.abs(f.y - b.y) < 7);
        if (hit >= 0) { foes.splice(hit, 1); g.score += 30; AudioSys.sfx('pop'); return false; }
        return true;
      });
    };
    g.draw = c => {
      R(c, '#0e1420', 0, T, W, H);
      for (let i = 0; i < 14; i++) R(c, '#1c2430', ((i * 53 + ((t * 40) | 0) * -1) % 340 + 340) % 340 - 10, T + (i * 37) % 180, 2, 2);
      bullets.forEach(b => R(c, '#8ee6c9', b.x, b.y - 1, 6, 2));
      foes.forEach(f => {
        R(c, '#ff6b5a', f.x - 6, f.y - 4, 12, 8);
        R(c, '#ffb347', f.x - 2, f.y - 2, 4, 4);
      });
      R(c, '#3ec5b4', 16, py - 3, 14, 6); R(c, '#3ec5b4', 12, py - 6, 6, 12);
    };
    return g;
  }

  /* ── 9. Forty Winks ── */
  function bed() {
    const g = { name: 'FORTY WINKS', hint: 'DO ABSOLUTELY NOTHING', score: 0, done: false };
    let tick = 0, zs = [], t = 0;
    g.update = dt => {
      t += dt; tick += dt;
      if (tick > 0.6) { tick = 0; g.score += 5; zs.push({ x: 196, y: 96, a: 1 }); }
      zs.forEach(z => { z.y -= 14 * dt; z.x += 8 * dt; z.a -= 0.28 * dt; });
      zs = zs.filter(z => z.a > 0);
    };
    g.draw = c => {
      R(c, '#171420', 0, T, W, H);
      R(c, '#26202f', 0, 150, W, 50);
      R(c, '#2a323e', 60, 60, 60, 44);                       // window
      R(c, '#0d1014', 64, 64, 52, 36);
      R(c, '#ffe08a', 74, 70, 3, 3); R(c, '#ffe08a', 98, 82, 2, 2); R(c, '#ffe08a', 88, 92, 2, 2);
      R(c, '#5a4632', 130, 118, 110, 34);                    // bed frame
      R(c, '#5a4632', 126, 100, 8, 52); R(c, '#5a4632', 238, 108, 8, 44);
      R(c, '#3ec5b4', 134, 112, 102, 12);                    // blanket
      R(c, '#e9e4d6', 138, 104, 22, 10);                     // pillow
      R(c, '#c98d4a', 146, 100, 10, 8);                      // Jones' head
      R(c, '#3a2a1a', 146, 98, 10, 3);
      zs.forEach(z => TX(c, 'Z', z.x, z.y, `rgba(233,228,214,${z.a.toFixed(2)})`, 8 + ((1 - z.a) * 6) | 0));
      TX(c, 'THE PUREST LAZY JONES EXPERIENCE', 160, 176, '#9aa0a8', 7, 'center');
    };
    return g;
  }

  /* ── 10. The Oasis Bar ── */
  function bar() {
    const g = { name: 'THE OASIS BAR', hint: 'GRAB THE MUGS AS THEY SLIDE', score: 0, done: false };
    let mugs = [], spawnT = 0.4, t = 0;
    g.update = (dt, inp) => {
      t += dt;
      spawnT -= dt;
      if (spawnT <= 0) {
        mugs.push({ x: 320, v: 70 + Math.random() * 50 + t * 3 });
        spawnT = 0.9 + Math.random() * 0.6;
      }
      mugs.forEach(m => m.x -= m.v * dt);
      if (inp.p.fire) {
        const hit = mugs.findIndex(m => m.x > 52 && m.x < 92);
        if (hit >= 0) { mugs.splice(hit, 1); g.score += 25; AudioSys.sfx('coin'); }
        else AudioSys.sfx('blip');
      }
      mugs = mugs.filter(m => m.x > 30);
    };
    g.draw = c => {
      R(c, '#1e1712', 0, T, W, H);
      R(c, '#2a323e', 20, 40, 280, 50);                      // back bar
      for (let i = 0; i < 7; i++) {
        R(c, ['#3ec5b4', '#ffb347', '#ff6b5a'][i % 3], 34 + i * 38, 50, 8, 20);
      }
      R(c, '#5a4632', 20, 118, 300, 14);                     // bar top
      R(c, '#3a2d20', 20, 132, 300, 60);
      R(c, '#c98d4a', 58, 96, 10, 10);                       // Jones at the bar
      R(c, '#3a2a1a', 58, 94, 10, 3);
      R(c, '#e9e4d6', 56, 106, 14, 14);
      R(c, '#ff6b5a', 56, 108, 14, 4);                       // bellhop vest stripe
      mugs.forEach(m => {
        R(c, '#e9e4d6', m.x, 106, 10, 12);
        R(c, '#ffb347', m.x + 1, 109, 8, 8);
        R(c, '#e9e4d6', m.x + 10, 109, 3, 6);
      });
      R(c, '#3ec5b4', 52, 116, 40, 2);                       // catch zone marker
      TX(c, 'SPACE WHEN A MUG REACHES JONES', 160, 160, '#9aa0a8', 7, 'center');
    };
    return g;
  }

  const FACTORY = {
    invaders, breakout, snake, catcher, driver, balloons, turk, laser, bed, bar
  };
  const IDS = Object.keys(FACTORY);

  return {
    ids: IDS,
    create: id => FACTORY[id]()
  };
})();
