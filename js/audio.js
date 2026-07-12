/* Lazy Jones remake — chiptune audio engine.
   A tiny step sequencer over WebAudio oscillators. Every room gets its own
   tune, just like the original. All melodies here are original compositions. */

const AudioSys = (() => {
  let ctx = null, master = null, musicBus = null;
  let enabled = true;
  let seqTimer = null, cur = null, step = 0, nextT = 0;

  const freq = n => 440 * Math.pow(2, (n - 69) / 12);

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.3;
      musicBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(t, dur, f0, type, vol, bus, f1) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(t, dur, vol, bus) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    const g = ctx.createGain();
    s.buffer = noiseBuf;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(g); g.connect(bus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  /* ── Tunes ──────────────────────────────────────────────
     16-step patterns, 0 = rest. bass = triangle, lead = square. */
  const TUNES = {
    title: { tempo: 118,
      bass: [33,0,33,0,36,0,38,0, 33,0,33,0,40,0,38,36],
      lead: [57,0,60,57,64,0,60,57, 55,0,59,55,62,0,59,55] },
    hotel: { tempo: 126,
      bass: [33,33,0,33,0,33,36,0, 31,31,0,31,0,31,35,0],
      lead: [69,0,64,0,67,64,60,0, 67,0,62,0,65,62,59,0] },
    groove: { tempo: 132,
      bass: [29,0,29,41,29,0,29,41, 34,0,34,46,32,0,32,44],
      lead: [65,65,0,68,0,65,63,0, 70,0,68,0,65,0,63,61] },
    bounce: { tempo: 140,
      bass: [36,0,43,0,36,0,43,0, 34,0,41,0,39,0,41,43],
      lead: [72,0,0,67,71,0,67,0, 70,0,65,0,69,67,65,64] },
    creep: { tempo: 110,
      bass: [28,0,0,28,31,0,28,0, 26,0,0,26,33,0,31,0],
      lead: [64,0,63,64,0,59,0,55, 62,0,61,62,0,57,0,52] },
    sunny: { tempo: 136,
      bass: [31,0,38,0,31,0,38,0, 36,0,43,0,33,0,40,0],
      lead: [67,71,74,0,71,0,67,0, 72,0,69,0,71,69,67,66] },
    dreamy: { tempo: 96,
      bass: [26,0,0,0,33,0,0,0, 24,0,0,0,31,0,0,0],
      lead: [62,0,66,0,69,0,66,0, 60,0,64,0,67,0,71,0] }
  };
  const GAME_TUNES = ['groove', 'bounce', 'creep', 'sunny'];

  function scheduleSteps() {
    if (!cur) return;
    const stepDur = 60 / cur.tempo / 2;   // 8th notes
    while (nextT < ctx.currentTime + 0.15) {
      const b = cur.bass[step % 16];
      const l = cur.lead[step % 16];
      if (b) tone(nextT, stepDur * 0.9, freq(b), 'triangle', 0.5, musicBus);
      if (l) tone(nextT, stepDur * 0.8, freq(l), 'square', 0.22, musicBus);
      if (step % 2 === 0) noise(nextT, 0.03, step % 8 === 4 ? 0.12 : 0.05, musicBus);
      nextT += stepDur;
      step++;
    }
  }

  function playMusic(name) {
    if (!enabled) { cur = TUNES[name] || null; return; }
    ensure();
    cur = TUNES[name];
    if (!cur) return;
    step = 0;
    nextT = ctx.currentTime + 0.05;
    if (!seqTimer) seqTimer = setInterval(scheduleSteps, 40);
  }

  function stopMusic() {
    cur = null;
    if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
  }

  function gameTune(i) { return GAME_TUNES[i % GAME_TUNES.length]; }

  /* ── SFX ── */
  function sfx(kind) {
    if (!enabled) return;
    ensure();
    const t = ctx.currentTime;
    switch (kind) {
      case 'shoot':  tone(t, 0.12, 880, 'square', 0.15, master, 220); break;
      case 'boom':   noise(t, 0.25, 0.3, master); tone(t, 0.2, 160, 'sawtooth', 0.2, master, 40); break;
      case 'pop':    tone(t, 0.08, 660, 'square', 0.2, master, 1320); break;
      case 'blip':   tone(t, 0.06, 990, 'square', 0.12, master); break;
      case 'coin':   tone(t, 0.07, 1046, 'square', 0.18, master); tone(t + 0.08, 0.18, 1568, 'square', 0.18, master); break;
      case 'door':   tone(t, 0.1, 220, 'triangle', 0.3, master, 330); tone(t + 0.1, 0.1, 330, 'triangle', 0.3, master, 440); break;
      case 'lift':   tone(t, 0.25, 260, 'triangle', 0.25, master, 520); break;
      case 'hurt':   tone(t, 0.35, 440, 'sawtooth', 0.3, master, 80); noise(t, 0.2, 0.2, master); break;
      case 'bounce': tone(t, 0.05, 440, 'square', 0.15, master, 660); break;
      case 'over':
        [392, 330, 262, 196].forEach((f, i) => tone(t + i * 0.22, 0.3, f, 'triangle', 0.3, master));
        break;
      case 'win':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(t + i * 0.13, 0.2, f, 'square', 0.2, master));
        break;
    }
  }

  function setEnabled(on) {
    enabled = on;
    ensure();
    master.gain.value = on ? 0.5 : 0;
    if (on && cur && !seqTimer) {
      step = 0; nextT = ctx.currentTime + 0.05;
      seqTimer = setInterval(scheduleSteps, 40);
    }
  }

  return { playMusic, stopMusic, gameTune, sfx, setEnabled, ensure };
})();
