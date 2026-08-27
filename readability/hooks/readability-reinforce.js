#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { SMALL_SAMPLE_WORDS, ruleCheckOf } = require(path.join(__dirname, 'prose-metrics'));

const STATIC_REMINDER =
  'READABILITY MODE. Every word you write this turn must be easy to read. The scope is ALL output, with no exceptions: '
  + 'chat replies, plans, summaries, commit messages, PR titles and bodies, issue and review comments, README and doc prose, '
  + 'code-comment prose where the project mandates comments, log and error strings, artifact and UI text. '
  + 'Aim for grade 7-9 and Flesch Reading Ease 60-70. Keep sentences under 20 words on average, and split any sentence over 25 words '
  + 'into two or three of 12-20 words. One idea per sentence, in subject-verb-object order. Use active voice in at least 90% of sentences, '
  + 'so hunt "was/is/were ... by" and flip it. Pick the short common word: use, not utilize; get, not obtain; help, not facilitate. '
  + 'Cut filler, redundancy, and formal or archaic phrasing. Define jargon and acronyms in plain words at first use. Replace vague claims with specific outcomes. '
  + 'Keep paragraphs to 2-3 sentences. In long documents add a heading every 150-200 words, use lists for steps, and use tables for comparisons. '
  + 'Before you deliver anything, audit it: average sentence length, 90% active voice, small paragraphs, headings where needed, filler cut, jargon defined, reads well aloud. '
  + 'Never trade accuracy for simplicity, and keep technical values byte-exact — code, identifiers, commands, paths, URLs, regexes, version numbers and quoted output are never reworded. '
  + 'A Stop hook re-checks the measurable rules on your finished reply and blocks it once for a rewrite when it fails, so write it clean the first time.';

function readAllStdin() {
  return new Promise(resolve => {
    let buffer = '';
    process.stdin.on('data', chunk => { buffer += chunk; });
    process.stdin.on('end', () => resolve(buffer));
  });
}

function parseJsonOrNull(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function textOfContent(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .filter(block => block && block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n');
}

function lastAssistantText(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const entry = parseJsonOrNull(lines[index]);
    if (!entry || entry.type !== 'assistant' || !entry.message) {
      continue;
    }
    const text = textOfContent(entry.message.content);
    if (text.trim().length > 0) {
      return text;
    }
  }
  return '';
}

function measurementSentence(check) {
  const scores = check.scores;
  let measurement = 'Measured readability of your previous reply: Flesch Reading Ease '
    + scores.readingEase + ', grade ' + scores.grade.toFixed(1) + ' — ' + verdictFor(scores.readingEase) + '. ';
  if (scores.wordCount < SMALL_SAMPLE_WORDS) {
    measurement += 'The sample was only ' + scores.wordCount + ' words, so treat the score as rough. ';
  }
  if (check.violations.length > 0) {
    measurement += 'Rule check on it: ' + check.violations.join('; ') + '. ';
  }
  return measurement;
}

const DENSE_CEILING = 50;
const TIGHTEN_CEILING = 60;
const ON_TARGET_CEILING = 70;

function verdictFor(readingEase) {
  if (readingEase < DENSE_CEILING) {
    return 'too dense, simplify hard this turn';
  }
  if (readingEase < TIGHTEN_CEILING) {
    return 'slightly dense, tighten this turn';
  }
  if (readingEase <= ON_TARGET_CEILING) {
    return 'on target, hold it';
  }
  return 'very easy, fine';
}

function checkFromHookInput(rawInput) {
  try {
    const input = parseJsonOrNull(rawInput);
    if (!input || typeof input.transcript_path !== 'string') {
      return null;
    }
    const text = lastAssistantText(input.transcript_path);
    if (text.length === 0) {
      return null;
    }
    const check = ruleCheckOf(text);
    return check.scores ? check : null;
  } catch (error) {
    return null;
  }
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext
    }
  }));
}

readAllStdin().then(rawInput => {
  const check = checkFromHookInput(rawInput);
  emit(check ? measurementSentence(check) + STATIC_REMINDER : STATIC_REMINDER);
});
