---
description: Draft a PR title + description for the current branch in the clear-pr house style, then open the PR only after you confirm.
argument-hint: "[notes, optional]"
allowed-tools: Bash(git branch:*), Bash(git rev-parse:*), Bash(git symbolic-ref:*), Bash(git log:*), Bash(git diff:*), Bash(git status:*)
---

You are drafting a pull request for the current branch. Follow the **clear-pr** skill
(`skills/clear-pr/SKILL.md`) for the title and body format — it is the single source of truth. Do not
invent a different format.

## Context (gathered for you)

- Current branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null`
- Base branch + commits on this branch:
  !`base=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@'); [ -z "$base" ] && { git rev-parse --verify --quiet main >/dev/null && base=main || base=master; }; echo "base=$base"; echo "--- commits ($base..HEAD) ---"; git log --no-merges "$base..HEAD" --pretty=format:'%h %s' 2>/dev/null | head -50`
- Files changed:
  !`base=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@'); [ -z "$base" ] && { git rev-parse --verify --quiet main >/dev/null && base=main || base=master; }; git diff --stat "$base...HEAD" 2>/dev/null | tail -60`

Extra notes from the user (may be empty): $ARGUMENTS

## What to do

1. **Understand the change.** Use the commits and diffstat above; read the actual diff
   (`git diff <base>...HEAD`) for any file whose purpose isn't obvious from its name. The body must
   explain *why*, so make sure you actually know why.
2. **Draft the title and body** per the clear-pr skill:
   - Title: `<imperative, usually-lowercase summary>` — no ticket prefix, like a commit subject.
   - `## What?`: lead with the change, then the why. Prose for a simple change, bullets for a multi-part
     one. Backtick every code identifier. Link evidence as `[text](url)` rather than pasting it; inline
     only the decisive error/payload if the change hinges on it. Fold any screenshot / example inline
     (you generally can't produce screenshots here, so add a `<!-- add screenshot -->` placeholder for
     the user where one belongs). Name tradeoffs / alternatives honestly.
   - Size it to the change — a one-line `## What?` is correct for a trivial PR.
3. **Show the full draft** (title + body) to the user in a code block. Note anything you were unsure about
   or any placeholder you left.
4. **Do not open the PR yet.** Wait for the user to confirm or edit. Only after explicit confirmation,
   create the PR against the detected base branch (via `gh pr create` or the available GitHub tooling),
   pushing the branch first if needed.
