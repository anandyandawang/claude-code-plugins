#!/usr/bin/env node

let stdinBuffer = '';
process.stdin.on('data', chunk => { stdinBuffer += chunk; });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'READABILITY MODE. Every word you write this turn must be easy to read. The scope is ALL output, with no exceptions: '
        + 'chat replies, plans, summaries, commit messages, PR titles and bodies, issue and review comments, README and doc prose, '
        + 'code-comment prose where the project mandates comments, log and error strings, artifact and UI text. '
        + 'Aim for grade 7-9 and Flesch Reading Ease 60-70. Keep sentences under 20 words on average, and split any sentence over 25 words '
        + 'into two or three of 12-20 words. One idea per sentence, in subject-verb-object order. Use active voice in at least 90% of sentences, '
        + 'so hunt "was/is/were ... by" and flip it. Pick the short common word: use, not utilize; get, not obtain; help, not facilitate. '
        + 'Cut filler, redundancy, and formal or archaic phrasing. Define jargon and acronyms in plain words at first use. Replace vague claims with specific outcomes. '
        + 'Keep paragraphs to 2-3 sentences. In long documents add a heading every 150-200 words, use lists for steps, and use tables for comparisons. '
        + 'Before you deliver anything, audit it: average sentence length, 90% active voice, small paragraphs, headings where needed, filler cut, jargon defined, reads well aloud. '
        + 'Never trade accuracy for simplicity, and keep technical values byte-exact — code, identifiers, commands, paths, URLs, regexes, version numbers and quoted output are never reworded.'
    }
  }));
});
