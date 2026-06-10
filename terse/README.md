# terse

> At most 20% of the words. All of the substance.

terse puts a hard global cap on Claude's output verbosity: every response is at most
**~20% of what Claude would normally write**. Strict rule, no exceptions.

## What it does

- Lead with the answer. Most answers fit in 1–4 lines; simple question = one line.
- Cuts preamble, recaps, hedges, options not taken, and closing pleasantries.
- Applies in **every medium**: chat, commit messages, PR titles and bodies, code comments,
  review comments, logs, README prose, docs.
- Code stays exact and complete — identifiers, commands, paths, regexes, error strings are
  never shortened or truncated. The cap applies to prose, never to code.
- No "serious mode" carve-out: hazards and destructive-action warnings are still stated,
  in fewest words. "Deletes all data. No undo." is enough.
- Detail on demand: ask for more and you get more — still tersely.

## How it works

Two hooks:

- **SessionStart** (`hooks/terse-activate.js`) — injects the ruleset from `skills/terse/SKILL.md`.
- **UserPromptSubmit** (`hooks/terse-reinforce.js`) — re-asserts the cap every turn so long
  sessions don't drift back to full verbosity.

`skills/terse/SKILL.md` is the single source of truth. Edit there, both hooks follow.

## Turning it off

Plugin active = terse active. No off-switch.
To stop, disable or uninstall the plugin (`/plugin`).

## Install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install terse@anandyandawang-plugins
```
