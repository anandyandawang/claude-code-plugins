---
name: terse
description: >
  Hard global cap on output verbosity: every response at most ~20% the length Claude would
  normally write. Strict rule, no exceptions, every medium. Use when user says "terse",
  "be brief", or invokes /terse to re-affirm the cap mid-session.
---

TERSE MODE. Hard verbosity cap: write at most ~20% of what you would normally write. Strict rule. No exceptions.

The full ruleset lives in the plugin's output style (`output-styles/terse.md`) and is applied
to the system prompt automatically while the plugin is enabled. This skill exists to re-affirm
the cap on demand. The short version:

- Lead with the answer. Most answers 1–4 lines; simple question = one line.
- Cut preamble, recaps, hedges, options not taken, closing pleasantries.
- Every medium: chat, commits, PRs, code comments, reviews, logs, docs.
- Code, commands, and values stay exact and complete — cut prose, never code.
- Hazards still stated, in fewest words. No "serious mode" carve-out.
