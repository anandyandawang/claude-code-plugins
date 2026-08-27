const FLESCH_TARGET_FLOOR = 60;
const MAX_AVERAGE_SENTENCE_WORDS = 20;
const MAX_SENTENCE_WORDS = 25;
const MAX_PARAGRAPH_SENTENCES = 3;
const SMALL_SAMPLE_WORDS = 50;
const HEADING_ADVISORY_WORDS = 300;
const PASSIVE_ADVISORY_SHARE = 0.1;

const BANNED_WORD_SWAPS = {
  utilize: 'use',
  utilizes: 'uses',
  utilized: 'used',
  utilizing: 'using',
  obtain: 'get',
  obtains: 'gets',
  obtained: 'got',
  obtaining: 'getting',
  facilitate: 'help',
  facilitates: 'helps',
  facilitated: 'helped',
  facilitating: 'helping',
  ameliorate: 'improve',
  amelioration: 'improvement',
  necessitate: 'require',
  necessitates: 'requires',
  necessitated: 'required',
  aforementioned: 'that',
  subsequently: 'then',
  notwithstanding: 'despite',
  commence: 'start',
  commences: 'starts',
  commenced: 'started',
  endeavor: 'try',
  endeavors: 'tries'
};

const BANNED_PHRASE_SWAPS = {
  'it is evident that': 'clearly',
  'in order to': 'to'
};

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

function wordsOf(prose) {
  return prose.split(/\s+/).filter(token => /[a-zA-Z]/.test(token));
}

function sentencesOf(prose) {
  return prose
    .split(/[.!?]+(?:\s+|$)/)
    .map(part => part.trim())
    .filter(part => wordsOf(part).length > 0)
    .map(part => ({ text: part, wordCount: wordsOf(part).length }));
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

function fleschScoresOf(text) {
  const prose = proseOf(text);
  const words = wordsOf(prose);
  const sentences = sentencesOf(prose);
  if (words.length === 0 || sentences.length === 0) {
    return null;
  }
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = totalSyllables(words) / words.length;
  return {
    readingEase: Math.round(206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord),
    grade: Math.round((0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59) * 10) / 10,
    wordCount: words.length,
    averageSentenceWords: wordsPerSentence
  };
}

function isListLine(line) {
  return /^\s*(?:[-*]|\d+\.)\s/.test(line);
}

function isHeadingLine(line) {
  return /^\s*#{1,6}\s/.test(line);
}

function proseParagraphsOf(text) {
  return removeTableLines(removeFencedCodeBlocks(text))
    .split(/\n\s*\n/)
    .map(block => block.split('\n').filter(line => line.trim().length > 0))
    .filter(lines => lines.length > 0)
    .filter(lines => !lines.every(isHeadingLine))
    .filter(lines => lines.filter(isListLine).length < lines.length / 2)
    .map(lines => proseOf(lines.join('\n')));
}

function sentenceExcerpt(sentence) {
  const tokens = sentence.text.split(/\s+/);
  const head = tokens.slice(0, 12).join(' ');
  return tokens.length > 12 ? head + '...' : head;
}

function bannedFindingsOf(prose) {
  const lowered = prose.toLowerCase();
  const findings = [];
  for (const [word, swap] of Object.entries(BANNED_WORD_SWAPS)) {
    if (new RegExp('\\b' + word + '\\b').test(lowered)) {
      findings.push('swap "' + word + '" for "' + swap + '"');
    }
  }
  for (const [phrase, swap] of Object.entries(BANNED_PHRASE_SWAPS)) {
    if (lowered.includes(phrase)) {
      findings.push('swap "' + phrase + '" for "' + swap + '"');
    }
  }
  return findings;
}

function passiveShareOf(sentences) {
  if (sentences.length === 0) {
    return 0;
  }
  const passivePattern = /\b(am|is|are|was|were|be|been|being)\s+\w+(ed|en)\b/i;
  return sentences.filter(sentence => passivePattern.test(sentence.text)).length / sentences.length;
}

function ruleCheckOf(text) {
  const prose = proseOf(text);
  const sentences = sentencesOf(prose);
  const scores = fleschScoresOf(text);
  const violations = [];
  const advisories = [];
  if (!scores) {
    return { violations, advisories, scores };
  }
  if (scores.averageSentenceWords >= MAX_AVERAGE_SENTENCE_WORDS) {
    violations.push('the average sentence runs ' + Math.round(scores.averageSentenceWords)
      + ' words; keep the average under ' + MAX_AVERAGE_SENTENCE_WORDS);
  }
  const overlong = sentences.filter(sentence => sentence.wordCount > MAX_SENTENCE_WORDS);
  if (overlong.length > 0) {
    violations.push(overlong.length + ' sentence(s) run over ' + MAX_SENTENCE_WORDS
      + ' words; split each into two or three of 12-20 words (longest starts: "'
      + sentenceExcerpt(overlong[0]) + '")');
  }
  const oversizedParagraphs = proseParagraphsOf(text)
    .filter(paragraph => sentencesOf(paragraph).length > MAX_PARAGRAPH_SENTENCES);
  if (oversizedParagraphs.length > 0) {
    violations.push(oversizedParagraphs.length + ' paragraph(s) run over ' + MAX_PARAGRAPH_SENTENCES
      + ' sentences; break them up');
  }
  if (scores.wordCount >= SMALL_SAMPLE_WORDS && scores.readingEase < FLESCH_TARGET_FLOOR) {
    violations.push('Flesch Reading Ease is ' + scores.readingEase + ', below the '
      + FLESCH_TARGET_FLOOR + '-70 target; use shorter sentences and shorter words');
  }
  violations.push(...bannedFindingsOf(prose));
  const passiveShare = passiveShareOf(sentences);
  if (passiveShare > PASSIVE_ADVISORY_SHARE) {
    advisories.push('about ' + Math.round(passiveShare * 100)
      + '% of sentences look passive; flip toward active voice');
  }
  if (scores.wordCount > HEADING_ADVISORY_WORDS && !text.split('\n').some(isHeadingLine)) {
    advisories.push('a reply this long reads better with headings');
  }
  return { violations, advisories, scores };
}

module.exports = {
  SMALL_SAMPLE_WORDS,
  proseOf,
  wordsOf,
  sentencesOf,
  fleschScoresOf,
  ruleCheckOf
};
