# readability

> Write for the least expert person who will read it.

readability makes Claude write plain English in everything it produces. The style follows
readability-score practice — Flesch Reading Ease, Flesch-Kincaid grade level, Gunning Fog, and SMOG.
The goal is simple: a grade 7-9 reader should follow every line without effort.

## what it does

It sets one target and holds you to it:

- **Flesch Reading Ease 60-70**, at a **grade 7-9** level.
- About 85% of readers understand grade-8 text.

Claude cannot score a reply while it writes it. So it checks the two drivers the formulas measure:
sentence length and word length. It also gets the measured score of its previous reply each turn, and
uses that to calibrate.

## the rules

**Sentences**

- Average under 20 words.
- Split any sentence over 25 words into two or three of 12-20 words.
- One idea per sentence, in subject-verb-object order.
- Active voice in at least 90% of sentences. "The AI analyzes the data", not "The data was analyzed
  by the AI."
- Vary the length for rhythm.

**Words**

- The short common word wins: `use` not `utilize`, `get` not `obtain`, `help` not `facilitate`,
  `clearly` not `it is evident that`.
- Cut filler, redundancy, and formal or archaic phrasing.
- Define jargon and acronyms in plain words at first use.
- Replace vague claims with specific outcomes.

**Structure**

- Paragraphs of 2-3 sentences.
- In long documents: a heading every 150-200 words, sections of 100-250 words, one idea per section.
- Lists for steps, tables for comparisons, bold only for terms that matter.
- Transitions between ideas, and one steady tone throughout.

**Self-audit**

Before delivering anything, Claude checks the sentence average, the active-voice share, paragraph
size, headings, filler, jargon, the read-aloud test, and the least expert reader.

## scope: everything, no exceptions

The rules cover every piece of prose Claude writes. Chat replies, plans, summaries, commit messages,
PR titles and bodies, issue and review comments, README and doc prose, code-comment prose where a
project mandates comments, log and error strings, artifact and UI text — all of it.

One carve-out is scope definition, not an exception. **Technical material stays byte-exact.** Code,
identifiers, commands, paths, URLs, regexes, version numbers, and quoted output are never reworded.
Only the prose around them gets simplified.

Accuracy never drops for simplicity. On a technical topic, the facts stay. The wording and structure
get simpler instead.

## how it works

Three hooks, always on.

- **SessionStart** (`hooks/readability-activate.js`) — loads the full ruleset at the start of the
  session.
- **UserPromptSubmit** (`hooks/readability-reinforce.js`) — repeats the rules every turn, so long
  sessions never drift back into dense prose. The same hook also scores the previous reply. It reads
  the last assistant message from the session transcript, strips code blocks, tables, inline code and
  URLs, and computes the Flesch Reading Ease and the Flesch-Kincaid grade on what is left. Every reply
  with any prose gets a score. A reply under 50 words is marked as a small sample, since tiny samples
  score noisily. The number comes back as a reference point, together with a list of any measurable
  rules the reply broke, so the next reply is calibrated against real feedback instead of a guess.
- **Stop** (`hooks/readability-enforce.js`) — enforces the measurable rules on every finished reply:
  average sentence length under 20 words, no sentence over 25 words, no paragraph over 3 sentences,
  Flesch Reading Ease at 60 or above for replies of 50 or more prose words, and no banned formal
  words like `utilize` or `in order to`. A reply that fails is blocked once, and Claude must rewrite
  it with every fix applied. Rules a script cannot judge, like tone and jargon definitions, stay on
  the self-audit.

The shared scoring lives in `hooks/prose-metrics.js`. The ruleset text comes from
[`skills/readability/SKILL.md`](./skills/readability/SKILL.md). That file is the single source of
truth. Edit it, and the hooks follow.

## turn off

Plugin active = readability active. There is no off-switch and no verbosity flag. To stop it, disable
or uninstall the plugin with `/plugin`.

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install readability@anandyandawang-plugins
```
