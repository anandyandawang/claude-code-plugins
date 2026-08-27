#!/usr/bin/env node

const fs = require('fs');

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
  + 'Never trade accuracy for simplicity, and keep technical values byte-exact — code, identifiers, commands, paths, URLs, regexes, version numbers and quoted output are never reworded.';

const SMALL_SAMPLE_WORDS = 50;

const DENSE_CEILING = 50;
const TIGHTEN_CEILING = 60;
const ON_TARGET_CEILING = 70;

const VERDICT_TOO_DENSE = 'too dense, simplify hard this turn';
const VERDICT_SLIGHTLY_DENSE = 'slightly dense, tighten this turn';
const VERDICT_ON_TARGET = 'on target, hold it';
const VERDICT_VERY_EASY = 'very easy, fine';

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

function removeFencedCodeBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, ' ');
}

function removeTableLines(text) {
  return text
    .split('\n')
    .filter(line => !line.trim().startsWith('|'))
    .join('\n');
}

function removeInlineCodeSpans(text) {
  return text.replace(/`[^`]*`/g, ' ');
}

function removeUrls(text) {
  return text.replace(/https?:\/\/\S+/g, ' ');
}

function removeMarkdownMarkers(text) {
  return text
    .split('\n')
    .map(line => line.replace(/^\s*(?:[#>]+|[-*]+|\d+\.)\s*/, ''))
    .join('\n')
    .replace(/\*+/g, '');
}

function proseOf(text) {
  return removeMarkdownMarkers(removeUrls(removeInlineCodeSpans(removeTableLines(removeFencedCodeBlocks(text)))));
}

function countSentences(prose) {
  return prose.split(/[.!?]+/).filter(part => part.trim().length > 0).length;
}

function wordsOf(prose) {
  return prose.split(/\s+/).filter(token => /[a-zA-Z]/.test(token));
}

function countSyllables(word) {
  const letters = word.toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length === 0) {
    return 1;
  }
  const vowelGroups = letters.match(/[aeiouy]+/g);
  let syllables = vowelGroups ? vowelGroups.length : 0;
  if (letters.length > 2 && letters.endsWith('e') && !letters.endsWith('le')) {
    syllables -= 1;
  }
  return Math.max(1, syllables);
}

function totalSyllables(words) {
  return words.reduce((sum, word) => sum + countSyllables(word), 0);
}

function fleschReadingEase(wordsPerSentence, syllablesPerWord) {
  return Math.round(206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord);
}

function fleschKincaidGrade(wordsPerSentence, syllablesPerWord) {
  return Math.round((0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59) * 10) / 10;
}

function verdictFor(readingEase) {
  if (readingEase < DENSE_CEILING) {
    return VERDICT_TOO_DENSE;
  }
  if (readingEase < TIGHTEN_CEILING) {
    return VERDICT_SLIGHTLY_DENSE;
  }
  if (readingEase <= ON_TARGET_CEILING) {
    return VERDICT_ON_TARGET;
  }
  return VERDICT_VERY_EASY;
}

function scoreOf(text) {
  const prose = proseOf(text);
  const words = wordsOf(prose);
  if (words.length === 0) {
    return null;
  }
  const sentences = countSentences(prose);
  if (sentences === 0) {
    return null;
  }
  const wordsPerSentence = words.length / sentences;
  const syllablesPerWord = totalSyllables(words) / words.length;
  const readingEase = fleschReadingEase(wordsPerSentence, syllablesPerWord);
  return {
    readingEase,
    grade: fleschKincaidGrade(wordsPerSentence, syllablesPerWord),
    verdict: verdictFor(readingEase),
    wordCount: words.length
  };
}

function measurementSentence(score) {
  const measurement = 'Measured readability of your previous reply: Flesch Reading Ease '
    + score.readingEase + ', grade ' + score.grade.toFixed(1) + ' — ' + score.verdict + '. ';
  if (score.wordCount >= SMALL_SAMPLE_WORDS) {
    return measurement;
  }
  return measurement + 'The sample was only ' + score.wordCount + ' words, so treat the score as rough. ';
}

function scoreFromHookInput(rawInput) {
  try {
    const input = parseJsonOrNull(rawInput);
    if (!input || typeof input.transcript_path !== 'string') {
      return null;
    }
    const text = lastAssistantText(input.transcript_path);
    if (text.length === 0) {
      return null;
    }
    return scoreOf(text);
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
  const score = scoreFromHookInput(rawInput);
  emit(score ? measurementSentence(score) + STATIC_REMINDER : STATIC_REMINDER);
});
