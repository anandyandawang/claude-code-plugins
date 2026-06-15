---
name: clear-comments
description: >
  Write code comments in anandyandawang's house style — the way comments are actually written across
  paywithextend repos like wex-integrator, fis-integrator, and astrada-integrator. Comment sparingly:
  the code says what, a comment says why. Vocabulary is `// TODO(EX-####):` (always with the unblocking
  condition) and `// Note:` (an intentional, non-obvious decision); never FIXME/HACK/XXX, never `/* */`
  block comments, never commented-out code, never restating the line below. Backtick every code
  identifier. KDoc (`/**`) is a mini-spec for public ports and complex services — one-line summary, an
  enumerated state/transition table where it earns its keep, `@param` only when non-obvious. Inline `//`
  annotates mapping tables with the source system's own label. Tests get scenario/section banners and
  step narration. Voice: first person plural, plain, honest about temp hacks and working assumptions.
  Use whenever writing or editing code comments, KDoc/Javadoc, or TODOs, or when the user runs
  /comments, says "comment this", "add a comment", "clean up the comments", or references comment style.
---

# clear-comments — house style for code comments

Goal: a reader who already sees the code learns the **thing the code can't tell them** — the *why*, the
gotcha, the contract with another system, the condition under which this changes. Clear beats thorough.
Reasoning beats narration. **The best comment is often no comment** — name the function well and delete
the line instead.

This is the style used across `paywithextend` repos (`wex-integrator`, `fis-integrator`,
`astrada-integrator`, `mastercard-bpc-integrator`, …). Match it when writing or editing comments.

## First rule: comment sparingly

In this codebase only **~1% of production lines** are standalone comments. The default is
self-documenting code. Before writing a comment, try to delete the need for it (better name, smaller
function, an enum instead of a magic value). Write the comment when — and only when — one of these is true:

- **Why, not what.** The *what* is in the code; the comment exists because the reason isn't.
- **A non-obvious decision** a future reader would otherwise "fix" and break (`// Note:`).
- **A failure mode / cross-system contract** that explains why the code is shaped this way.
- **A gotcha** in the language/DB/framework that isn't visible locally.
- **Deferred work** with a ticket and a condition (`// TODO(EX-####):`).
- **A source / spec link** for a mapping or algorithm you didn't invent.

If a line is just restating the code (`// increment i`, `// loop over cards`), don't write it.

## The vocabulary (this is the whole set)

- `//` — line comment. The workhorse. Standalone above the code, or trailing on mapping rows.
- `/** … */` — KDoc, for public ports/interfaces and complex services. A mini-spec, not decoration.
- `// TODO(EX-####):` / `// TODO:` — deferred work. **Ticketed whenever a ticket exists.**
- `// Note:` — flags an intentional, surprising decision.

**Not in the vocabulary — don't introduce them:** `/* … */` block comments, `FIXME`, `HACK`, `XXX`,
`WARNING`, `@author`/decorative banners in source, ASCII-art separators in production code, and
commented-out code (delete it; git remembers).

## Standalone `//` comments — explain why

- **Lead with the reason or the failure mode**, not a restatement. Real examples:
  - `// FIS fraud-alert delivery fails when the "1" country code is included, so drop it for any NANP (+1) number`
  - `// Plain JPQL "=" follows SQL three-valued logic (NULL = NULL is unknown), and PostgreSQL rejects with "could not determine data type of parameter".`
  - `// Must use upsertAndPublishIfConnected (not bare upsert) to cover the webhook-reorder case`
  - `// The credentials live on the SubAccount row — no longer on the credit card.`
- **Backtick every code identifier** — class, method, field, enum value, column, type, param, env name:
  `` `amountCents` ``, `` `is not distinct from` ``, `` `skipCvs=true` ``, `` `PhysicalCardStatus` ``.
  This is what makes a comment scannable.
- **Sentence case; a period when it's a sentence**, none when it's a fragment/label. Short label
  comments over a block are fine and common: `// MC decline codes`, `// Phone-only update path:`.
- **Wrap a long reason across several `//` lines** rather than one 200-column line. Keep the prose flowing
  line to line.
- **Be honest about temporary code.** State that it's temporary and what replaces it:
  `// "" is temp until we actually funnel orgFingerprint values through.` / a bare `// Temp` is acceptable
  for the obvious case.
- **Hedge real uncertainty plainly** — `// Working assumption — revisit if FIS or sandbox testing shows
  Canadian / other NANP numbers need the "1".` Same voice as a PR body: say what you're unsure of.
- **Link the source** for anything you didn't invent (vendor docs, a gist, a StackOverflow answer, a PR):
  `// See https://github.com/paywithextend/astrada-integrator/pull/72`. A bare URL on its own `//` line is fine.

## `// TODO` — deferred work, almost always with a condition

- **Ticket it when a ticket exists:** `// TODO(EX-38708): remove this AUTH_REVERSAL check once wex sends
  us reversals with reversed amounts`. The `EX-####` goes in parentheses right after `TODO`.
- **Un-ticketed form** for genuinely ticketless notes: `// TODO: populate customDataGuid once CDF
  creation is wired here`.
- **State the unblocking condition** — the "once X" / "until Y" / "pending Z" is the signature of these
  TODOs. A TODO without a trigger is just a complaint:
  - `// TODO: source the org fingerprint from PhysicalCardIn / org context once available`
  - `// TODO: revisit once PhysicalCreditCardStatus gains a dedicated NEEDS_API_VERIFICATION value.`
  - `// TODO: notify extend-api of the state change (mechanism pending Octopod Discovery).`
- A ticket can also be cited as a follow-up without `TODO`: `// EX-39338 follow-up: backfill sub_account
  FK for rows the migration race missed.`

## `// Note:` — an intentional, surprising decision

Use `Note:` when the code does something a careful reader would otherwise assume is a bug or try to
"simplify". Capital `N`, colon. Emphasize the surprising word in caps when it sharpens it.

- `// Note: We intentionally do NOT check the amount because currency is not properly passed`
- `// Note: Kotlin's "internal" visibility compiles to PUBLIC in JVM bytecode, so ArchUnit cannot …`

In KDoc the same thing reads `* Note: …` or, for emphasis, `* **SQS note:** …`.

## KDoc (`/**`) — a mini-spec, only where it earns it

Reserve KDoc for public ports/interfaces and services with real domain complexity. Don't KDoc trivial
classes, getters, or self-evident functions.

- **Open with a one-line summary** of what the type does, plus who calls it if that's the point:
  `* Interface for the verification state machine service.` / `* Used by AstradaIntegrator to notify of
  CVS completion events.`
- **Encode the domain rules as an enumerated table** when the logic is a state machine / mapping — the
  KDoc becomes the spec:
  ```kotlin
  /**
   * Default implementation that manages the verification state machine for physical cards.
   *
   * The verification state machine tracks two dimensions:
   * - verificationStatus: NOT_VERIFIED | COMPLETED_3DS | PENDING_CVS | COMPLETED_CVS
   * - astradaConnected: true | false
   *
   * State transitions map to PhysicalCardStatus:
   * - (COMPLETED_3DS, false) -> NEEDS_VERIFICATION
   * - (PENDING_CVS, true) with attempts <= 0 -> BLOCKED
   * - (COMPLETED_CVS, true) -> ACTIVE
   */
  ```
- **`@param` only when the meaning isn't obvious from the name:**
  `* @param attemptsExhausted true if this was the last allowed attempt (tracked by integrator-common)`.
  Skip `@param`/`@return` that just echo the signature.
- **An embedded `TODO:`/`Note:`** inside KDoc is fine for a known refactor or a caveat.

## Inline (trailing) `//` — mostly mapping tables

The dominant inline use is annotating a code→enum mapping with the **source system's own label**, so the
mapping stays auditable against the vendor's docs:

```kotlin
"0051" -> DeclineCode.DO_NOT_HONOR             // InsufficientFunds
"A-24" -> DeclineCode.VIRTUAL_CARD_INVALID_CVC // CVV_DECLINE
```

Keep these terse — they're labels, not sentences. Outside mapping tables, prefer a standalone comment on
the line above; reach for a trailing comment only for a short aside (`id = UUID.randomUUID().toString(),
// TODO: generate in idempotency module?`).

## Test comments — organize and narrate

Tests carry a bit more commenting than production, for navigation and intent:

- **Section / scenario banners** to chunk a big test file:
  `// ===== Scenario 1: Happy Path - 3DS Frictionless Flow =====` / `// ===== CVS Completed Event Tests =====`.
- **ALL-CAPS rule headers** in architecture tests: `// ADAPTER LAYER DEPENDENCY RULES`.
- **Step narration** of the expected sequence, as `-`/`->` bullets:
  ```
  // - handleAstradaEnrollment sets astradaConnected = true
  // - handleCVSCompleted(verified = true) sets verificationStatus = COMPLETED_CVS
  // - isReadyForActivation() = true, publishes ACTIVE
  ```
- **The intent of a non-obvious assertion** — why this proves what it claims:
  `// A rejecting filter proves the injected SendFilter is what gates the send`.

## Voice

First person plural, plain, conversational. "We", "we'll", "we should", "we preserve …". State tradeoffs
and temporariness honestly; hedge real uncertainty out loud. No emoji in source, no exclamation, no
filler. Clarity first, always.

## Worked examples

**Production — a why + gotcha comment:**
```kotlin
// Nullable dedupe fields use `is not distinct from` so that `null = null` matches.
// Plain JPQL `=` follows SQL three-valued logic (`NULL = NULL` is unknown), and an
// explicit `or :param is null` clause produces an untyped bind parameter that
// PostgreSQL rejects with "could not determine data type of parameter".
```

**Production — a conditional TODO:**
```kotlin
// TODO(EX-38712): we'll revisit updating `balanceCents` according to wex responses once
//  wex sends us the available balance on their endpoints
```

**Production — an intentional decision:**
```kotlin
// Pre-migration rows have `skip_cvs` NULL; treat as false (preserve pre-feature behavior).
```

**A mapping table:**
```kotlin
"A-12" -> DeclineCode.VIRTUAL_CARD_EXPIRED        // EXPIRED
"A-13" -> DeclineCode.VIRTUAL_CARD_INVALID_EXPIRY // EXP_DATE_MISMATCH
"A-23" -> DeclineCode.ISSUER_DECLINED             // AVS_DECLINE
```

**What NOT to write:**
```kotlin
// ❌ restates the code
i++ // increment i
// ❌ block comment + decorative banner in source
/* ============ HELPERS ============ */
// ❌ untriaged complaint with no condition or ticket
// TODO: this is bad, fix later
// ❌ commented-out code left behind
// val old = legacyLookup(id)
```

## Checklist before leaving a comment in

- Could a better name / smaller function delete the need for it? If yes, do that instead.
- Does it say **why**, not restate **what**?
- Are all code identifiers backticked?
- If it's a `TODO`, does it have the `EX-####` (when one exists) **and** the unblocking condition?
- If it's surprising-on-purpose, is it a `// Note:`?
- No `/* */`, no FIXME/HACK/XXX, no commented-out code, no decorative banners in production source.
- KDoc only where it earns it; mapping rows annotated with the source label.
