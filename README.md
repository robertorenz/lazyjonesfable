# Lazy Jones — a C64 classic, remade for the browser

A fan-made remake of **Lazy Jones** (Terminal Software, 1984) by David Whittaker —
the Commodore 64 game where you play the laziest employee of the Hotel Magnificent,
sneaking into hotel rooms to play arcade machines instead of working.

Pure HTML5 canvas + vanilla JavaScript. No build step, no dependencies.

## Play

**▶ Play it now: [robertorenz.github.io/lazyjonesfable](https://robertorenz.github.io/lazyjonesfable/)**

Or run it locally — open `index.html` in any modern browser, or serve the folder:

```
npx serve .
```

## How it works

Walk the three corridors of the hotel, ride the lift on the left, and duck through
doors before the manager, the maid's trolley or the hotel ghost catch you.
Every one of the 18 doors hides a mini-game with a 25-second timer.
Play all 18 rooms to finish your shift; three collisions and you're fired.

### Controls

| Key | Action |
|-----|--------|
| ← → | Walk / move |
| ↑ | Enter a door · lift up |
| ↓ | Lift down |
| Space | Fire / action |
| Enter | Start game |

### The rooms

| Game | Inspired by |
|------|-------------|
| Wafer Invaders | Space Invaders |
| The Wall | Breakout |
| Grub Snake | Snake |
| Star Snatch | Catch-'em games |
| Night Driver | Vertical lane dodgers |
| 99 Balloons | Shooting galleries |
| The Turk | Whack-a-mole |
| Laser Jones | Side-scrolling shooters |
| Forty Winks | The original's bed room — do nothing, score anyway |
| The Oasis Bar | The original's bar room |

## Tech notes

- `js/main.js` — hotel world, state machine, HUD, title screen, rendering
- `js/minigames.js` — the ten mini-games behind the doors
- `js/audio.js` — WebAudio chiptune step-sequencer; every room gets its own tune,
  just like the original (all melodies here are original compositions)
- 320×200 internal resolution, pixel-scaled onto a CRT-styled monitor frame
- High score persists in `localStorage`

Debug shortcuts: open `index.html#play` to skip the title screen, or
`index.html#room=snake` (any game id) to jump straight into a room.

## Credits

Homage to the original *Lazy Jones* by David Whittaker / Terminal Software (1984).
All code, art and music in this remake are original work.
