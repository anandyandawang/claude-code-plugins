# plan-big-execute-small

The heavy model plans and synthesizes. Cheap workers do the reading.

## The idea

The pattern comes from Anthropic's cookbook notebook
[Coordinator pattern: big models for planning, small models for execution](https://github.com/anthropics/claude-cookbooks/blob/main/managed_agents/CMA_plan_big_execute_small.ipynb).

Most agent workloads are a little planning and judgment plus a lot of mechanical, token-heavy
reading. The frontier coordinator plans the work, writes the briefs, and synthesizes the answer,
but never touches the raw pages itself. Cheap workers read in their own parallel context windows
and report back distilled findings, so the bulk tokens bill at the cheap rate and the frontier
context stays clean. On the cookbook's own runs the split team came out roughly 2.5x cheaper and
3x faster than the single frontier agent, with 84-98% of input tokens billed at the worker rate.

## What it enforces

- **Never bulk-read in your own context.** Long files, log dumps, broad grep sweeps, generated
  output, web pages, vendored code — all of it goes to a cheap worker subagent with an explicit
  cheaper `model` override, in its own context window.
- **Workers report distilled findings, never dumps.** Every brief specifies the return format:
  the answer, the evidence behind it (file:line references, exact quotes, URLs), and an explicit
  statement of what remains uncertain or wasn't found.
- **Fan out coverage work in parallel.** N independent sub-questions means N workers running
  concurrently. Verify-each-of-these, sweep-these-files, check-all-usages shapes are exactly
  where the pattern pays.
- **Briefs have a floor cost — bundle, don't shred.** Each delegation pays fixed overhead, so
  group related lookups into one worker's brief and split only along genuinely independent lines.
- **Planning, judgment, and synthesis stay with the coordinator.** Decompose, brief, weigh the
  reports against each other, follow up when a report is thin rather than reading the source
  yourself, re-brief a fresh worker on infrastructure failures, and write the synthesis.
- **Verify the premise, not just the facts.** When the enumeration matters, spend one worker
  confirming the list of things-to-check instead of drawing it from memory.
- **Never spawn a reading worker at your own tier**, and never omit the model override — omitted
  means inherit, and inherit means coordinator tier.

## When not to split

Small reads that inform planning stay with the coordinator: a config peek, a directory listing, a
50-line file is cheaper done directly. Narrow tasks with little reading have nothing to
arbitrage. And when the task needs frontier judgment applied to the raw material itself — subtle
document analysis, tricky code comprehension where a summary would flatten exactly what matters —
read it yourself. The test is whether the value is in the reading or in the judgment about what
was read.

## How it works

Always-on via hooks, same pattern as `orchestrator` and `no-comments`:

- `SessionStart` injects the full ruleset from `skills/plan-big-execute-small/SKILL.md` (read at
  runtime, so edits to the skill propagate without touching the hook).
- `UserPromptSubmit` re-injects a compact reminder every turn so long sessions don't drift back
  into the coordinator reading everything itself.

## Install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install plan-big-execute-small@anandyandawang-plugins
```
