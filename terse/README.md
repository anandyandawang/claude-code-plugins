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

- **Output style** (`output-styles/terse.md`) — the ruleset, applied directly to the system
  prompt. `force-for-plugin: true` means it activates automatically whenever the plugin is
  enabled — no `/config` step. `keep-coding-instructions: true` keeps Claude Code's default
  engineering behavior intact; only the verbosity changes. The system prompt isn't subject
  to context compaction, so the rules can't drift out of a long session.
- **UserPromptSubmit hook** (`hooks/terse-reinforce.js`) — re-asserts the cap every turn as
  a cheap anchor against drift.
- **Skill** (`skills/terse/SKILL.md`) — `/terse` re-affirms the cap on demand mid-session.

`output-styles/terse.md` is the single source of truth for the full ruleset.

Note: because the output style is forced, it overrides any output style you selected
yourself while the plugin is enabled. That's the point — no exceptions.

## Turning it off

Plugin active = terse active. No off-switch.
To stop, disable or uninstall the plugin (`/plugin`). Your previous output style returns.

## Where it applies

Works in the CLI, the desktop app (local sessions), and the VS Code / JetBrains extensions —
they all share the same `~/.claude` plugin configuration. Cloud sessions (claude.ai/code,
desktop cloud sessions) don't load user plugins; only repo-committed `.claude/settings.json`
hooks run there.

## Install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install terse@anandyandawang-plugins
```

Takes effect on the next session (or after `/clear`) — the system prompt is read at session start.
