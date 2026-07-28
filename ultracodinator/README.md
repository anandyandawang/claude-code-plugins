# ultracodinator

Ultracode orchestrates everything. This plugin makes sure the heaviest model in the lineup
never rides in the fleet.

## The mentality

> Ultracode is a standing opt-in: author and run a workflow for every substantive task. But
> left alone, every workflow agent inherits the session's model — the heaviest, most
> expensive agent in the lineup — so every fan-out becomes a squadron of top-tier agents
> doing work a cheaper tier carries just as well. Keep ultracode's scale, fix its sizing:
> the coordinator stays top-tier, the fleet never is.

## What it enforces

- **Conditional on ultracode.** The rules bind only while ultracode is on for the session
  (a system-reminder says so, or the prompt carries the keyword). Ultracode off, plugin
  dormant.
- **Workflows as the default vehicle.** Every substantive task — implement, migrate,
  review, research, audit — runs as a Workflow orchestration. The coordinator scouts
  enough to scope, authors the script, and reads results between chained phases. Solo work
  is for conversational turns and trivial mechanical edits.
- **Never the heaviest model in the fleet.** The top of the lineup eats tokens and usage
  like nothing else; it belongs in exactly one seat — the main loop, planning and
  coordinating. Every workflow `agent()` call and every subagent carries an explicit
  `model` override below that tier. An omitted override means inherit, and inherit means
  the main-loop model — forbidden. No stage, however hard, justifies it; the hardest
  stages get the workhorse with a higher `effort` instead.
- **Per-task sizing, by role not by name.** Resolved against whatever lineup the session
  offers:
  - **Heaviest tier** — the coordinator: plans, authors scripts, judges, synthesizes.
    Never a stage, even when a lighter model runs the main loop.
  - **One tier down, the workhorse** — implementation, design, debugging, and the
    judge/verify stages that need real judgment.
  - **Mid tier** — tightly-scoped mechanical stages: bulk reading, sweeps,
    find-and-replace-shaped edits, format checks. Never orchestrates.
  - **Lowest tier** — essentially unused.

  `effort` follows the same sizing. Don't over-downshift — rework from an underpowered
  stage costs more than the tier gap saves; when in doubt, the workhorse.
- **Narrow escape hatch.** Direct work only when orchestrating obviously costs more than
  the change: a one-line fix, a config flip, a quick answer from a file already in context.

## Why this shape

Ultracode multiplies agent count; this plugin keeps the multiplier off the top-tier meter.
Coordinator-tier tokens draw from the scarcest budget in the lineup — spending them only on
planning, scripts, prompts, and review while the cheaper tiers carry the fleet keeps
ultracode's exhaustiveness affordable instead of exhausting.

## How it works

Always-on via hooks, same pattern as `orchestrator` and `no-comments`:

- `SessionStart` injects the full ruleset from `skills/ultracodinator/SKILL.md` (read at
  runtime, so edits to the skill propagate without touching the hook).
- `UserPromptSubmit` re-injects a compact reminder every turn so long ultracode sessions
  don't drift back into coordinator-tier fleets.

## Install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install ultracodinator@anandyandawang-plugins
```
