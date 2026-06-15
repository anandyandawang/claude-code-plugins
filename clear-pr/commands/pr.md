---
description: Draft a PR title + description for the current branch in the clear-pr house style, then open the PR only after you confirm.
argument-hint: "[notes, optional]"
allowed-tools: Bash(git branch:*), Bash(git rev-parse:*), Bash(git symbolic-ref:*), Bash(git log:*), Bash(git diff:*), Bash(git status:*)
---

You are drafting a pull request for the current branch. Follow the **clear-pr** skill
(`skills/clear-pr/SKILL.md`) for the title and body format — it is the single source of truth. Do not
invent a different format.

## Context

Gather what you need about the branch yourself first — don't assume it's been collected for you. Using
your own tools (git via Bash), find out:

- the current branch, and the base branch it targets (the repo's default — usually `main` or `master`);
- the commits on this branch that aren't on the base (`git log <base>..HEAD`) and the files they touch
  (`git diff --stat <base>...HEAD`);
- the actual diff (`git diff <base>...HEAD`) for any file whose purpose isn't obvious from its name — the
  body has to explain *why*, so make sure you genuinely understand the change.

If you're not in a git repo or a lookup fails, say so and ask rather than guessing.

Extra notes from the user (may be empty): $ARGUMENTS

## What to do

1. **Draft the title and body** per the clear-pr skill:
   - Title: `<imperative, usually-lowercase summary>` — no issue-tracker prefix, like a commit subject.
     A conventional-commit / semver prefix (`feat:`, `fix:`, `feat!:`) is fine if the repo uses one.
   - `## What?`: lead with the change, then the why. Prose for a simple change, bullets for a multi-part
     one. Backtick every code identifier. Link evidence as `[text](url)` rather than pasting it; inline
     only the decisive error/payload if the change hinges on it. Name tradeoffs / alternatives honestly.
   - Size it to the change — a one-line `## What?` is correct for a trivial PR.
2. **Show the full draft** (title + body) to the user in a code block. Note anything you were unsure about
   or any placeholder you left.
3. **Do not open the PR yet.** Wait for the user to confirm or edit. Only after explicit confirmation,
   create the PR against the detected base branch (via `gh pr create` or the available GitHub tooling),
   pushing the branch first if needed.
