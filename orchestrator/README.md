# orchestrator

The heaviest model plans. Cheaper models code.

## The mentality

> Fable can do all the planning and delegation, but don't let it spawn more Fable agents.
> You don't need them coding. Its job is orchestrator only, then testing/review, allowing it
> to delegate and spawn subagents to fix things at the end. Little baby loop, and it won't
> waste the best coding agent punching lines.

Generalized: whatever model runs the main loop is the most capable — and most expensive —
agent in the session. Fable today, something else tomorrow. Its capability is for judgment
(planning, decomposition, delegation prompts, review), not for typing out routine
implementation.

## What it enforces

- **Orchestration only.** The main-loop model plans, decomposes, and writes rich delegation
  prompts. It does not write the code itself.
- **Never spawn your own tier.** Every coding subagent gets an explicit cheaper `model`
  override — `sonnet` for implementation, refactors, and tests; `haiku` for mechanical
  sweeps. An omitted override means the subagent inherits the top-tier model, so omitting
  it on a coding agent is forbidden.
- **Test and review yourself.** When subagents return, the orchestrator runs the tests and
  reviews the diffs — this is where the expensive tokens earn their cost. Failures become
  new delegation prompts to cheaper agents, looping until green.
- **Narrow escape hatch.** Direct edits are allowed only when delegating obviously costs
  more than the change: a one-line fix, a config flip, a typo.

## How it works

Always-on via hooks, same pattern as `grug-extremist` and `no-comments`:

- `SessionStart` injects the full ruleset from `skills/orchestrator/SKILL.md` (read at
  runtime, so edits to the skill propagate without touching the hook).
- `UserPromptSubmit` re-injects a compact reminder every turn so long sessions don't drift
  back into the main model writing code.

## Install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install orchestrator@anandyandawang-plugins
```
