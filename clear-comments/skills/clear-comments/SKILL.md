---
name: clear-comments
description: >
  Write code comments in anandyandawang's house style. Comment sparingly: the code says what, a comment
  says why. Vocabulary is `// TODO:` (with the unblocking condition, and the issue-tracker key in parens
  when the project uses one) and `// Note:` (an intentional, non-obvious decision); never FIXME/HACK/XXX,
  never `/* */` block comments, never commented-out code, never restating the line below. Backtick every
  code identifier. Doc comments (`/** … */` — KDoc/Javadoc/JSDoc) are a mini-spec for public interfaces
  and complex services — one-line summary, an enumerated state/transition table where it earns its keep,
  `@param` only when non-obvious. Inline `//` annotates mapping tables with the source system's own label.
  Tests get scenario/section banners and step narration. Voice: first person plural, plain, honest about
  temp hacks and working assumptions. Use whenever writing or editing code comments, doc comments, or
  TODOs, or when the user says "comment this", "add a comment", "clean up the comments", or references
  comment style.
---

# clear-comments — house style for code comments

Goal: a reader who already sees the code learns the **thing the code can't tell them** — the *why*, the
gotcha, the contract with another system, the condition under which this changes. Clear beats thorough.
Reasoning beats narration. **The best comment is often no comment** — name the function well and delete
the line instead.

Match this style when writing or editing comments.

## First rule: comment sparingly

Only about **1 line in 100** earns a standalone comment. The default is self-documenting code. Before
writing a comment, try to delete the need for it (better name, smaller function, an enum instead of a
magic value). Write the comment when — and only when — one of these is true:

- **Why, not what.** The *what* is in the code; the comment exists because the reason isn't.
- **A non-obvious decision** a future reader would otherwise "fix" and break (`// Note:`).
- **A failure mode / cross-system contract** that explains why the code is shaped this way.
- **A gotcha** in the language/DB/framework that isn't visible locally.
- **Deferred work** with a condition (`// TODO:`).
- **A source / spec link** for a mapping or algorithm you didn't invent.

If a line is just restating the code (`// increment i`, `// loop over the rows`), don't write it.

## The vocabulary (this is the whole set)

- `//` — line comment. The workhorse. Standalone above the code, or trailing on mapping rows.
- `/** … */` — doc comment (KDoc/Javadoc/JSDoc), for public interfaces and complex services. A mini-spec,
  not decoration.
- `// TODO:` — deferred work. State the unblocking condition; add the tracker key in parens
  (`// TODO(ABC-123):`) when the project tracks work that way.
- `// Note:` — flags an intentional, surprising decision.

**Not in the vocabulary — don't introduce them:** `/* … */` block comments, `FIXME`, `HACK`, `XXX`,
`WARNING`, `@author`/decorative banners in source, ASCII-art separators in production code, and
commented-out code (delete it; git remembers).

## Standalone `//` comments — explain why

- **Lead with the reason or the failure mode**, not a restatement. For example:
  - `// The upstream SMS gateway rejects US numbers when the leading "1" is included, so strip it for NANP (+1) numbers.`
  - `// Plain SQL "=" follows three-valued logic ("NULL = NULL" is unknown), and Postgres rejects the untyped bind with "could not determine data type of parameter".`
  - `// Must go through saveAndPublish (not a bare save) to cover the out-of-order webhook case.`
  - `// The credentials live on the Account row now — no longer on the record itself.`
- **Backtick every code identifier** — class, method, field, enum value, column, type, param, env name:
  `` `amountCents` ``, `` `is not distinct from` ``, `` `retryCount = 0` ``, `` `OrderStatus` ``.
  This is what makes a comment scannable.
- **Sentence case; a period when it's a sentence**, none when it's a fragment/label. Short label
  comments over a block are fine and common: `// network decline codes`, `// fast path:`.
- **Wrap a long reason across several `//` lines** rather than one 200-column line. Keep the prose flowing
  line to line.
- **Be honest about temporary code.** State that it's temporary and what replaces it:
  `// empty string is temporary until we funnel real tenant IDs through.` / a bare `// Temp` is acceptable
  for the obvious case.
- **Hedge real uncertainty plainly** — `// Working assumption — revisit if testing shows other regions
  need the "1".` Say what you're unsure of.
- **Link the source** for anything you didn't invent (vendor docs, a gist, a StackOverflow answer, a PR):
  `// See https://github.com/<owner>/<repo>/pull/72`. A bare URL on its own `//` line is fine.

## `// TODO` — deferred work, almost always with a condition

- **State the unblocking condition** — the "once X" / "until Y" / "pending Z" is the signature of a good
  TODO. A TODO without a trigger is just a complaint:
  - `// TODO: source the tenant ID from the request context once it's available`
  - `// TODO: revisit once Status gains a dedicated NEEDS_REVIEW value.`
  - `// TODO: notify the downstream service of the state change (mechanism still TBD).`
- **Add the tracker key when the project uses one**, in parens right after `TODO`:
  `// TODO(ABC-123): drop the legacy-reversal check once upstream sends reversed amounts directly`.
  The key is whatever the repo uses (`PROJ-123`, `GH-456`, …) — it's optional, the condition isn't.
- **Un-ticketed form** is the default when there's no tracker item: `// TODO: populate `customerId` once
  the lookup is wired here`.
- A tracked item can also be cited as a follow-up without `TODO`: `// ABC-123 follow-up: backfill the FK
  for rows the migration race missed.`

## `// Note:` — an intentional, surprising decision

Use `Note:` when the code does something a careful reader would otherwise assume is a bug or try to
"simplify". Capital `N`, colon. Emphasize the surprising word in caps when it sharpens it.

- `// Note: we intentionally do NOT validate the amount here because the currency isn't known yet`
- `// Note: Kotlin's "internal" visibility compiles to PUBLIC in JVM bytecode, so the arch test cannot see it`

In a doc comment the same thing reads `* Note: …` or, for emphasis, `* **timeout note:** …`.

## Doc comments (`/**`) — a mini-spec, only where it earns it

Reserve doc comments for public interfaces and services with real domain complexity. Don't document
trivial classes, getters, or self-evident functions.

- **Open with a one-line summary** of what the type does, plus who calls it if that's the point:
  `* Manages the verification state machine for an account.` / `* Used by the enrollment flow to notify
  of completion events.`
- **Encode the rules as an enumerated table** when the logic is a state machine / mapping — the doc
  comment becomes the spec:
  ```kotlin
  /**
   * Manages the verification state machine for an account.
   *
   * Tracks two dimensions:
   * - status:    NOT_STARTED | IN_PROGRESS | PASSED | FAILED
   * - connected: true | false
   *
   * State maps to AccountState:
   * - (PASSED, false)                    -> PENDING_CONNECTION
   * - (IN_PROGRESS, true), attempts <= 0 -> BLOCKED
   * - (PASSED, true)                     -> ACTIVE
   */
  ```
- **`@param` only when the meaning isn't obvious from the name:**
  `* @param attemptsExhausted true if this was the last allowed attempt`.
  Skip `@param`/`@return` that just echo the signature.
- **An embedded `TODO:`/`Note:`** inside a doc comment is fine for a known refactor or a caveat.

## Inline (trailing) `//` — mostly mapping tables

The dominant inline use is annotating a code→enum mapping with the **source system's own label**, so the
mapping stays auditable against the upstream docs:

```kotlin
"0051"  -> DeclineReason.DO_NOT_HONOR    // upstream: InsufficientFunds
"E-204" -> DeclineReason.EXPIRED         // upstream: CARD_EXPIRED
```

Keep these terse — they're labels, not sentences. Outside mapping tables, prefer a standalone comment on
the line above; reach for a trailing comment only for a short aside (`id = UUID.randomUUID().toString(),
// TODO: generate this in the caller instead?`).

## Test comments — organize and narrate

Tests carry a bit more commenting than production, for navigation and intent:

- **Section / scenario banners** to chunk a big test file:
  `// ===== Scenario 1: Happy Path =====` / `// ===== Retry-Exhausted Cases =====`.
- **ALL-CAPS rule headers** in architecture tests: `// ADAPTER LAYER DEPENDENCY RULES`.
- **Step narration** of the expected sequence, as `-`/`->` bullets:
  ```
  // - handleConnected() sets connected = true
  // - handleVerified(passed = true) sets status = PASSED
  // - isReadyToActivate() = true, publishes ACTIVE
  ```
- **The intent of a non-obvious assertion** — why this proves what it claims:
  `// A rejecting filter proves the injected `SendFilter` is what gates the send`.

## Voice

First person plural, plain, conversational. "We", "we'll", "we should", "we preserve …". State tradeoffs
and temporariness honestly; hedge real uncertainty out loud. No emoji in source, no exclamation, no
filler. Clarity first, always.

## Worked examples

**Production — a why + gotcha comment:**
```kotlin
// Nullable dedupe fields use `is not distinct from` so that `null = null` matches.
// Plain SQL `=` follows three-valued logic (`NULL = NULL` is unknown), and an
// explicit `or :param is null` clause produces an untyped bind parameter that
// Postgres rejects with "could not determine data type of parameter".
```

**Production — a conditional TODO:**
```kotlin
// TODO(ABC-123): revisit how we compute `balance` from upstream responses once
//  the provider returns the available balance on their endpoints
```

**Production — an intentional decision:**
```kotlin
// Pre-migration rows have `verified` NULL; treat as false (preserve pre-feature behavior).
```

**A mapping table:**
```kotlin
"E-204" -> DeclineReason.EXPIRED          // upstream: CARD_EXPIRED
"E-205" -> DeclineReason.INVALID_EXPIRY   // upstream: EXP_DATE_MISMATCH
"E-301" -> DeclineReason.ISSUER_DECLINED  // upstream: ISSUER_REJECT
```

**What NOT to write:**
```kotlin
// ❌ restates the code
i++ // increment i
// ❌ block comment + decorative banner in source
/* ============ HELPERS ============ */
// ❌ untriaged complaint with no condition
// TODO: this is bad, fix later
// ❌ commented-out code left behind
// val old = legacyLookup(id)
```

## Checklist before leaving a comment in

- Could a better name / smaller function delete the need for it? If yes, do that instead.
- Does it say **why**, not restate **what**?
- Are all code identifiers backticked?
- If it's a `TODO`, does it have the unblocking condition (and the tracker key, when the project uses one)?
- If it's surprising-on-purpose, is it a `// Note:`?
- No `/* */`, no FIXME/HACK/XXX, no commented-out code, no decorative banners in production source.
- Doc comments only where they earn it; mapping rows annotated with the source label.
