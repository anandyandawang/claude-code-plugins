---
description: Audit the code comments added on the current branch against the clear-comments house style, then apply fixes only after you confirm.
argument-hint: "[path or notes, optional]"
allowed-tools: Bash(git branch:*), Bash(git rev-parse:*), Bash(git symbolic-ref:*), Bash(git diff:*), Bash(git status:*)
---

You are reviewing the **code comments** introduced on the current branch. Follow the **clear-comments**
skill (`skills/clear-comments/SKILL.md`) for the house style — it is the single source of truth. Do not
invent a different style.

## Context (gathered for you)

- Current branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null`
- Added comment lines on this branch (vs base):
  !`base=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@'); [ -z "$base" ] && { git rev-parse --verify --quiet main >/dev/null && base=main || base=master; }; echo "base=$base"; git diff "$base...HEAD" --no-color 2>/dev/null | grep -nE '^\+' | grep -vE '^\+\+\+' | grep -E '//|/\*|^\+\s*\*' | head -120`
- Working-tree comment changes (unstaged + staged):
  !`git diff HEAD --no-color 2>/dev/null | grep -E '^\+' | grep -vE '^\+\+\+' | grep -E '//|/\*' | head -60`

Extra scope / notes from the user (may be empty): $ARGUMENTS

## What to do

1. **Find the comments that changed.** Use the diff above; if a path is in `$ARGUMENTS`, restrict to it.
   Read the surrounding code (`git diff <base>...HEAD -- <file>`) so you judge each comment in context —
   you can't tell if a comment is redundant without seeing the line it sits on.
2. **Score each comment against the skill**, flagging:
   - **Redundant** — restates the code; recommend deleting it (and, if a rename would remove the need,
     say so).
   - **Wrong marker** — `/* */` block comment, `FIXME`/`HACK`/`XXX`, decorative banner, or commented-out
     code; convert to `//`/KDoc or delete.
   - **Weak TODO** — missing the `EX-####` (when a ticket exists) or missing the unblocking condition.
   - **Should be a `// Note:`** — an intentional, surprising decision written as a plain comment.
   - **Missing backticks** on code identifiers.
   - **Restating *what* instead of *why*** — rewrite to give the reason / failure mode / contract.
   - **A genuinely missing comment** — a non-obvious gotcha or cross-system contract that has no comment
     and should.
3. **Show your findings** as a short list: `file:line` → the issue → the suggested rewrite (in a code
   block). Keep it tight; don't pad. If the comments already match the style, say so plainly and stop.
4. **Do not edit yet.** Wait for the user to confirm. Only after explicit confirmation, apply the
   rewrites with the editing tools. Never touch comments outside the diff unless the user asks.
