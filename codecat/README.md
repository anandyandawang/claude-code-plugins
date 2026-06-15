# codecat 🐱

> if it fits, it sits — in your terminal.

`codecat` drops a hand-drawn ASCII cat into your coding session. It shows up on
its own at the right moments — no command to run, no voice change. Claude talks
exactly like normal; the cat is pure art delivered straight to you by hooks.

```
 /\_/\
( o.o )   codecat reporting for duty. let's build.
 > ^ <
```

## when the cat shows up

| moment | hook | what the cat does |
|--------|------|-------------------|
| you start (or `/clear`) a session | `SessionStart` | wakes up, greets you, and (by default) fires a desktop notification |
| you resume a session | `SessionStart` | "welcome back, i kept your chair warm" + notification |
| between turns, now and then | `Stop` | loafs, **plays a short animation** (walks across, blinks, wags its tail, zoomies, chases yarn) |
| you `git commit` | `PostToolUse` | celebrates and counts your commits (`#3`) |
| you `git push` | `PostToolUse` | sees it off into the cloud |
| the session ends | `SessionEnd` | curls up and says bye |

The between-turns cat is **occasional on purpose** — it waits out a cooldown and
rolls the dice, so it's a pleasant surprise, never spam. Greetings, commits, and
pushes always show.

### "animated" cats 🎞️

Some between-turns appearances are **flipbook animations**: a multi-frame cat that
advances one frame each time it shows up, so it walks across your desk / blinks /
wags its tail over a few successive turns. Once an animation starts it plays its
frames back-to-back (a shorter cooldown, no dice roll) so the motion reads as
motion, then the cat goes back to its occasional rhythm. See
[animation & GIFs](#animation--gifs-the-honest-answer) for why it works this way.

## how it works

One tiny hook script, `hooks/codecat.js`, runs on each event and prints the art
through the hook `systemMessage` field — the one channel shown directly to you
(not injected into Claude's context). On greet/farewell it also emits a
`terminalSequence` carrying an allowlisted **OSC 9 desktop notification**, so the
greeting is harder to miss; surfaces that don't support it just ignore it.
No dependencies, just Node.

The art is wrapped in a code fence so it stays monospaced and aligned on the
desktop app and web. Best viewed in a monospace font.

### adding your own cats

Art lives in `hooks/cats.txt`. Two kinds:

- **single-shot** — a block under a `@@ <category>` header (`greet`, `resume`,
  `idle`, `commit`, `push`, `farewell`). Use `{N}` in a `commit` block for the
  running commit count.
- **animation** — a block under a `@@@ <name>` header, with frames separated by a
  line of `~~~`. Each frame is one "still"; they play one per idle appearance.
  Keep frames the same shape for clean motion, and don't make any frame-line just
  tildes (that's the separator).

```
@@@ blink
 /\_/\
( o.o )   the cat is watching your cursor.
 > ^ <
~~~
 /\_/\
( -.- )
 > ^ <
```

## tune it

All behavior is env-tunable — no config files:

| var | default | meaning |
|-----|---------|---------|
| `CODECAT_IDLE_COOLDOWN` | `120` | min seconds between idle cats |
| `CODECAT_IDLE_CHANCE` | `0.5` | chance (0–1) an eligible turn shows one |
| `CODECAT_ANIM_CHANCE` | `0.6` | when an idle cat shows, chance it's an animation vs a single still |
| `CODECAT_ANIM_FRAME_COOLDOWN` | `15` | min seconds between frames of an in-progress animation |
| `CODECAT_NOTIFY` | on | set `0` to suppress the greet/farewell desktop notification |
| `CODECAT_BELL` | off | set `1` to add an audible terminal bell to notifications |

Want a cat every chance you get? `CODECAT_IDLE_COOLDOWN=0 CODECAT_IDLE_CHANCE=1`.
Want them rare? Crank the cooldown. Want only animations, never single stills?
`CODECAT_ANIM_CHANCE=1`.

## animation & GIFs (the honest answer)

**Can it play a GIF, or a smooth frame-by-frame ASCII animation that redraws in
place?** No — and not because of effort, but because of how plugin hooks work:

- A hook **runs once, emits one blob of output, and exits.** There's no streaming
  or progressive output, so a single message can't redraw itself over time.
- As of Claude Code `v2.1.139`, command hooks **run without a controlling
  terminal** and can't write escape sequences (cursor moves, screen clears) to the
  UI — so the classic "animate by repainting the terminal" trick isn't available.
- The only escape sequences a hook may emit (`terminalSequence`) are a small
  **allowlist** — window/icon titles, desktop notifications, and the bell. Inline
  image protocols (iTerm's OSC 1337) are explicitly **rejected**, and `systemMessage`
  has no documented image support. So **GIFs / embedded images aren't possible**
  through this channel on any surface.

So codecat does the thing that *is* possible and still looks alive: a **flipbook**.
Each idle appearance shows the next frame, and an in-flight animation plays its
frames in quick succession. It's "animated ASCII" spread across turns rather than
rendered in place — which fits a cat that shows up now and then anyway.

## turn the cat off

The plugin is the cat. To stop it, disable or uninstall the plugin (`/plugin`).
That's the whole off-switch.

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install codecat@anandyandawang-plugins
```

*meow.*
