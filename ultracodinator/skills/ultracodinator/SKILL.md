---
name: ultracodinator
description: >
  Ultracode's standing opt-in, run with right-sized agents. Binds only while ultracode is on for
  the session (a system-reminder says so); dormant otherwise. The main-loop model is the
  ultracodinator: it plans phases, authors workflow scripts, writes rich stage prompts, judges
  results, and synthesizes — and pushes essentially all execution into Workflow orchestrations.
  Every workflow agent() call and every subagent carries an explicit model override sized to its
  task — the heaviest model in the lineup is never spawned; it eats tokens like nothing else and
  exists for coordination alone: the mid tier is the workhorse and default for implementation,
  design, and verification; the high tier (one below the coordinator) is reserved for the most
  complex stages — the hardest design, debugging, and judge work; the low tier takes the
  simplest stages — bulk reading, sweeps, mechanical edits. Effort overrides follow the same
  sizing. Never omit the override — omitted
  means inherit, and inherit means the main-loop model. Direct edits only when orchestrating
  clearly costs more than the change. Always-on via hooks.
---

ULTRACODINATOR MODE. Ultracode says orchestrate everything. This plugin says: never with the heaviest model.

Ultracode is a standing opt-in into multi-agent orchestration — author and run a workflow for
every substantive task. Left alone, those fleets inherit the main-loop model — usually the
heaviest, most expensive agent in the lineup. That default turns every fan-out into a squadron
of top-tier agents doing work a cheaper tier carries just as well. The ultracodinator keeps
ultracode's scale and fixes its sizing: the heaviest model coordinates, and it never rides in
the fleet.

## The gate

This plugin binds only while ultracode is ON for the session — a system-reminder states it, or
the user's prompt carries the ultracode keyword. When ultracode is off, the ultracodinator is
dormant: follow the normal Workflow opt-in rules and ignore the rest of this document.

## Hard rules

1. **Workflows are the default vehicle.** Every substantive task — implement, migrate, review,
   research, audit — is structured as a Workflow orchestration: the coordinator scouts enough to
   scope, authors the script, and lets the fleet carry the execution. Multi-phase work runs as
   chained workflows with the coordinator reading results between phases. Solo work is for
   conversational turns and trivial mechanical edits only.
2. **Never spawn the heaviest model.** The top of the lineup eats tokens and usage like
   nothing else; it exists for one seat only — the main loop, planning and coordinating.
   Every workflow `agent()` call and every `Agent` spawn carries an explicit `model` override
   below that tier. Never omit it — omitted means inherit, and inherit means a fleet of
   main-loop-tier agents burning the scarcest budget in the session on stage work. There is no
   stage, however hard, that justifies spawning the heaviest model; the hardest stages get the
   high tier with a higher `effort` instead.
3. **Size every stage, by role not by name.** The mid tier is the workhorse: the default for
   implementation, design, debugging, and the judge/verify stages that need real judgment.
   One tier below the coordinator sits the high tier, reserved for the genuinely complex
   stages — the hardest design calls, the gnarliest debugging, the toughest adversarial
   verification — where the workhorse would plausibly need rework. The low tier takes the
   simplest stages — bulk reading, sweeps, find-and-replace-shaped edits, format checks — and
   never orchestrates. Resolve the roles against whatever lineup the session offers, and size
   `effort` the same way: low for mechanical stages, high only where the judgment is hardest.
   Don't over-downshift — rework from an underpowered stage costs more than the tier gap saves;
   when in doubt, the workhorse — and when the workhorse is in doubt, the high tier.
4. **The coordinator's own jobs:** decompose the task, author the workflow scripts, write rich
   stage prompts, read the fleet's returns between phases, run the final tests, review the final
   diff, and synthesize the answer. Failures and findings become the next workflow's stages, not
   the coordinator's keyboard.
5. **Narrow escape hatch:** work directly only when orchestrating obviously costs more than the
   change itself — a one-line fix, a config flip, a quick answer from a file already in context.
   If the work needs a fan-out or more than a few lines of change, it's a workflow.

## Stage prompts are the craft

A cheap stage with a rich prompt beats an expensive stage with a vague one. Every stage prompt
names the exact files or sources in play, the expected return shape (use `schema` for anything
downstream code consumes), the constraints and things not to touch, and how the stage verifies
its own work before returning. Skimping here is how a fleet turns into a rework loop.

## Why this shape

Ultracode multiplies agent count; this plugin keeps the multiplier off the top-tier meter.
Coordinator-tier tokens draw from the scarcest budget in the lineup — spending them only on
planning, scripts, prompts, and review while the high, mid, and low tiers carry the fleet keeps
ultracode's exhaustiveness affordable instead of exhausting.

## What this is not

Not a throttle on ultracode — fleet size, fan-out, and adversarial verify stay as ambitious as
ultracode asks. Not a ban on the coordinator reading, testing, or running commands — judgment
work stays home. And if the main loop is already running below the heaviest tier, the rules
relax: it may take stage work itself and spawn its own tier when a stage truly warrants it — but the
heaviest model in the lineup stays off-limits as a stage even then. The single invariant: the
heaviest model coordinates; it is never a stage.
