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
| you start (or `/clear`) a session | `SessionStart` | wakes up and greets you |
| you resume a session | `SessionStart` | "welcome back, i kept your chair warm" |
| between turns, now and then | `Stop` | loafs, does zoomies, knocks something off the desk |
| you `git commit` | `PostToolUse` | celebrates and counts your commits (`#3`) |
| you `git push` | `PostToolUse` | sees it off into the cloud |
| the session ends | `SessionEnd` | curls up and says bye |

The between-turns cat is **occasional on purpose** — it waits out a cooldown and
rolls the dice, so it's a pleasant surprise, never spam. Greetings, commits, and
pushes always show.

## how it works

One tiny hook script, `hooks/codecat.js`, runs on each event and prints the art
through the hook `systemMessage` field — the one channel shown directly to you
(not injected into Claude's context). Art lives in `hooks/cats.txt`; add your own
cats by dropping a block under a `@@ <category>` header. No dependencies, just Node.

The art is wrapped in a code fence so it stays monospaced and aligned on the
desktop app and web. Best viewed in a monospace font.

## tune the frequency

Two env vars control the between-turns cat:

| var | default | meaning |
|-----|---------|---------|
| `CODECAT_IDLE_COOLDOWN` | `120` | min seconds between idle cats |
| `CODECAT_IDLE_CHANCE` | `0.5` | chance (0–1) an eligible turn shows one |

Want a cat every chance you get? `CODECAT_IDLE_COOLDOWN=0 CODECAT_IDLE_CHANCE=1`.
Want them rare? Crank the cooldown.

## turn the cat off

The plugin is the cat. To stop it, disable or uninstall the plugin (`/plugin`).
That's the whole off-switch.

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install codecat@anandyandawang-plugins
```

*meow.*
