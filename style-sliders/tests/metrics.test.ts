import { describe, expect, test } from 'claude-code/testing'
import {
  countSyllables,
  countWords,
  extractBlocks,
  extractProse,
  measureText,
  splitSentences,
} from '../hooks/metrics'

const SYLLABLE_TABLE: readonly (readonly [string, number])[] = [
  ['the', 1],
  ['cat', 1],
  ['make', 1],
  ['code', 1],
  ['jumped', 1],
  ['simple', 2],
  ['table', 2],
  ['people', 2],
  ['wanted', 2],
  ['created', 3],
  ['beautiful', 3],
  ['syllable', 3],
  ['information', 4],
  ['readability', 5],
  ['tables', 2],
  ['handled', 2],
  ['called', 1],
  ['boxes', 2],
  ['makes', 1],
  ['being', 2],
  ['dialogue', 3],
  ['usual', 3],
  ['Readability', 5],
  ["didn't", 2],
  ["couldn't", 2],
  ["isn't", 2],
  ["aren't", 1],
  ["weren't", 1],
  ["don't", 1],
  ['statement', 2],
  ['movement', 2],
  ['completely', 3],
  ['useful', 2],
  ['hopeless', 2],
  ['carefully', 3],
  ['something', 2],
  ['everything', 3],
  ['therefore', 2],
]

const FIXTURE =
  'Readability formulas estimate difficulty from sentence length and syllable counts. ' +
  'Shorter sentences and common words often produce simpler writing.'

const PLAIN_PARAGRAPH = 'The cat sat on the mat. The dog ran to the park. We like to play and run.'

const ACADEMIC_PARAGRAPH =
  'Notwithstanding considerable methodological heterogeneity, epidemiological investigations consistently ' +
  'demonstrate statistically significant associations between environmental contamination and ' +
  'cardiovascular morbidity.'

const SHORT_SENTENCE_REPEATS = 9

const EIGHT_WORD_SENTENCE = 'The river carried water over the old stones. '
const READ_TIME_SENTENCE_REPEATS = 30
const CODE_WORDS_PER_MINUTE_FIXTURE = 119
const CODE_LINE = 'a b c d e f g'
const CODE_LINE_WORDS = 7
const MIN_PLAIN_PARAGRAPH_SECONDS = 50
const MAX_PLAIN_PARAGRAPH_SECONDS = 70

const repeatLines = (line: string, count: number): string => Array.from({ length: count }, () => line).join('\n')

const codeBlock = (words: number): string => `\`\`\`js\n${repeatLines(CODE_LINE, words / CODE_LINE_WORDS)}\n\`\`\``

const tableWithOneCell = (words: number): string => `| ${repeatLines('word', words).replace(/\n/g, ' ')} |\n|---|`

const measure = (markdown: string) => {
  const reading = measureText(markdown)
  if (!reading) throw new Error('expected a reading')
  return reading
}

describe('countSyllables', () => {
  for (const [word, expected] of SYLLABLE_TABLE) {
    test(`${word} has ${expected}`, () => {
      expect(countSyllables(word)).toBe(expected)
    })
  }

  test('hyphenated words sum their parts', () => {
    expect(countSyllables('well-known')).toBe(2)
    expect(countSyllables('state-of-the-art')).toBe(4)
  })

  test('pure numbers count one', () => {
    expect(countSyllables('2024')).toBe(1)
    expect(countSyllables('3.5')).toBe(1)
  })

  test('contractions and abbreviations count by their letters', () => {
    expect(countSyllables("don't")).toBe(1)
    expect(countSyllables('U.S.')).toBe(1)
    expect(countSyllables('v1.2.3')).toBe(1)
  })

  test('silent e before a suffix is not counted', () => {
    expect(countSyllables('agreement')).toBe(3)
    expect(countSyllables('freely')).toBe(2)
    expect(countSyllables('achievement')).toBe(3)
  })
})

describe('countWords', () => {
  test('apostrophes, hyphens, dots and versions stay one word', () => {
    expect(countWords("don't well-known 3.5 v1.2.3 U.S.")).toBe(5)
  })

  test('punctuation-only tokens are not words', () => {
    expect(countWords('- -- ... ?! | ***')).toBe(0)
  })
})

describe('prose extraction', () => {
  test('fenced code is dropped for backtick and tilde fences with any info string', () => {
    const markdown = 'Before.\n\n```ts title="x"\nconst a = 1\n```\n\nMiddle.\n\n~~~\nlet b = 2\n~~~\n\nAfter.'
    expect(extractProse(markdown)).toBe('Before.\n\nMiddle.\n\nAfter.')
  })

  test('a longer fence is not closed by a shorter one', () => {
    const markdown = 'Before.\n\n````\n```\ninner\n```\n````\n\nAfter.'
    expect(extractProse(markdown)).toBe('Before.\n\nAfter.')
  })

  test('an unterminated fence runs to the end', () => {
    expect(extractProse('Keep this.\n\n```js\nconst a = 1\n\nstill code')).toBe('Keep this.')
  })

  test('inline code spans are dropped', () => {
    expect(measure('Use `npm install --save` now.').stats.words).toBe(2)
    expect(measure('Use ``a ` b`` now.').stats.words).toBe(2)
  })

  test('tables and separator rows are dropped', () => {
    const markdown = '| name | value |\n|------|-------|\n| one | two |\n\nOnly this text.'
    expect(extractProse(markdown)).toBe('Only this text.')
  })

  test('bare urls are dropped without eating the closing punctuation', () => {
    expect(extractProse('Visit https://example.com/path?x=1 today.')).toBe('Visit today.')
    expect(measure('See https://example.com/a. Then go.').stats.sentences).toBe(2)
  })

  test('html tags and images are dropped', () => {
    expect(extractProse('Some <b>bold</b> text <br> here.')).toBe('Some bold text here.')
    expect(extractProse('![diagram](http://x.com/a.png) Hello there.')).toBe('Hello there.')
  })

  test('links keep only their text', () => {
    expect(extractProse('Read the [style guide](https://example.com/guide) now.')).toBe('Read the style guide now.')
  })

  test('emphasis, strikethrough and underscores at word edges are stripped', () => {
    expect(extractProse('A **bold**, *slanted*, _quiet_ and ~~gone~~ word.')).toBe('A bold, slanted, quiet and gone word.')
    expect(extractProse('Keep snake_case together.')).toBe('Keep snake_case together.')
  })

  test('heading, blockquote and list markers are stripped', () => {
    const markdown = '## Heading ##\n\n> Quoted text\n\n- first\n+ second\n1. third\n2) fourth'
    expect(extractProse(markdown)).toBe('Heading\n\nQuoted text\n\nfirst\n\nsecond\n\nthird\n\nfourth')
  })

  test('task boxes and horizontal rules are removed', () => {
    const markdown = '- [ ] open task\n- [x] done task\n\n---\n***\n___\n\nEnd.'
    expect(extractProse(markdown)).toBe('open task\n\ndone task\n\nEnd.')
  })

  test('block kinds distinguish headings from paragraphs', () => {
    expect(extractBlocks('# Title\n\nBody text.')).toEqual([
      { kind: 'heading', text: 'Title' },
      { kind: 'paragraph', text: 'Body text.' },
    ])
  })
})

describe('paragraphs', () => {
  test('each list item is its own paragraph', () => {
    const markdown = '- one\n- two words\n- three words here\n- four words go here\n- five words go here now'
    const { stats } = measure(markdown)
    expect(stats.paragraphs).toBe(5)
    expect(stats.longestParagraphWords).toBe(5)
  })

  test('lines of one block form one paragraph and blank lines separate paragraphs', () => {
    const { stats } = measure('one two\nthree four\n\nfive six seven')
    expect(stats.paragraphs).toBe(2)
    expect(stats.longestParagraphWords).toBe(4)
  })

  test('headings are not paragraphs but their words count and they end a sentence', () => {
    const { stats } = measure('# Big title here\nBody text follows now.')
    expect(stats.paragraphs).toBe(1)
    expect(stats.longestParagraphWords).toBe(4)
    expect(stats.words).toBe(7)
    expect(stats.sentences).toBe(2)
    expect(stats.longestSentenceWords).toBe(4)
  })

  test('list items without punctuation each end a sentence', () => {
    expect(measure('- alpha beta\n- gamma delta').stats.sentences).toBe(2)
  })
})

describe('sentences', () => {
  test('terminators followed by whitespace or the end split sentences', () => {
    const sentences = splitSentences('It works. It is fast! Is it? Yes?! Wait... Really.')
    expect(sentences.length).toBe(6)
  })

  test('abbreviations do not split', () => {
    expect(splitSentences('Dr. Smith met Mr. Jones, e.g. in St. Louis, i.e. at home.').length).toBe(1)
    expect(splitSentences('Inc. and Ltd. and Jr. and Sr. and vs. and etc. and cf. and approx. here.').length).toBe(1)
    expect(splitSentences('Mrs. Lee and Ms. Park work in the U.S. now.').length).toBe(1)
  })

  test('month and reference abbreviations do not split', () => {
    expect(splitSentences('See Fig. 3 for details.').length).toBe(1)
    expect(splitSentences('Version 2.1.287 was released on Jan. 5th.').length).toBe(1)
    expect(splitSentences('See Smith et al. for more.').length).toBe(1)
  })

  test('p.m. and etc. split only before a capital letter', () => {
    expect(splitSentences('Python, Ruby, etc. It is fast.').length).toBe(2)
    expect(splitSentences('It is at 5 p.m. now.').length).toBe(1)
    expect(splitSentences('We meet at 5 p.m. Please come.').length).toBe(2)
    expect(splitSentences('We meet at 5 p.m. Please come.')[0]).toBe('We meet at 5 p.m.')
  })

  test('No. only counts as an abbreviation before a number', () => {
    expect(splitSentences('See No. 5 for details.').length).toBe(1)
    expect(splitSentences('Is it ready? No. It is not.').length).toBe(3)
  })

  test('decimals and versions do not split', () => {
    expect(splitSentences('Version 3.5 and v1.2.3 are out and cost 4.99 each.').length).toBe(1)
    expect(splitSentences('It costs 3.5 dollars. Really.').length).toBe(2)
  })

  test('colons and semicolons do not split', () => {
    expect(splitSentences('First: one; second: two.').length).toBe(1)
  })

  test('a terminator inside closing quotes still splits', () => {
    expect(splitSentences('He said "stop." Then he left.').length).toBe(2)
  })

  test('text without terminators is one sentence', () => {
    expect(splitSentences('no punctuation here').length).toBe(1)
  })

  test('the longest sentence is tracked', () => {
    expect(measure('Short one. This sentence has six words. Tiny.').stats.longestSentenceWords).toBe(5)
  })
})

describe('measureText', () => {
  test('hand-computed fixture', () => {
    const reading = measure(FIXTURE)
    expect(reading.stats).toEqual({
      words: 19,
      sentences: 2,
      paragraphs: 1,
      syllables: 41,
      letters: 128,
      polysyllables: 6,
      longestParagraphWords: 19,
      longestSentenceWords: 10,
      codeWords: 0,
      tableWords: 0,
    })
    expect(reading.readSeconds).toBe(7)
    expect(reading.readingEase).toBe(14.6)
    expect(reading.grades).toEqual({
      'flesch-kincaid': 13.6,
      'gunning-fog': 16.4,
      smog: 13,
      'coleman-liau': 20.7,
      'automated-readability': 15.1,
    })
    expect(reading.isSmallSample).toBe(true)
  })

  test('code, tables and urls do not change the prose numbers', () => {
    const noisy = measure(
      `${FIXTURE}\n\n\`\`\`js\nconst veryLongIdentifierName = 1\n\`\`\`\n\n| a | b |\n|---|---|\n| c | d |\n\nhttps://example.com/x`,
    )
    const plain = measure(FIXTURE)
    expect(noisy.grades).toEqual(plain.grades)
    expect(noisy.readingEase).toBe(plain.readingEase)
    expect(noisy.stats).toEqual({ ...plain.stats, codeWords: 3, tableWords: 4 })
  })

  test('dense academic prose scores a higher grade and a lower ease than plain prose', () => {
    const plain = measure(PLAIN_PARAGRAPH)
    const dense = measure(ACADEMIC_PARAGRAPH)
    expect(dense.grades['flesch-kincaid']).toBeGreaterThan(plain.grades['flesch-kincaid'])
    expect(dense.grades['gunning-fog']).toBeGreaterThan(plain.grades['gunning-fog'])
    expect(dense.grades['coleman-liau']).toBeGreaterThan(plain.grades['coleman-liau'])
    expect(dense.grades['automated-readability']).toBeGreaterThan(plain.grades['automated-readability'])
    expect(dense.readingEase).toBeLessThan(plain.readingEase)
  })

  test('grades clamp at zero and reading ease at one hundred', () => {
    const reading = measure('The cat sat.')
    expect(reading.readingEase).toBe(100)
    expect(reading.grades['flesch-kincaid']).toBe(0)
    expect(reading.grades['coleman-liau']).toBe(0)
    expect(reading.grades['automated-readability']).toBe(0)
  })

  test('reading ease clamps at zero for very dense text', () => {
    const reading = measure('Immunohistochemical characterization notwithstanding.')
    expect(reading.readingEase).toBe(0)
  })

  test('samples of 50 words or more are not small', () => {
    const fiftyFour = 'The cat sat on the mat. '.repeat(SHORT_SENTENCE_REPEATS)
    const reading = measure(fiftyFour)
    expect(reading.stats.words).toBe(54)
    expect(reading.isSmallSample).toBe(false)
  })

  test('empty and unreadable replies return null', () => {
    expect(measureText('')).toBeNull()
    expect(measureText('   \n\n  ')).toBeNull()
    expect(measureText('| --- | --- |\n|:---:|---|')).toBeNull()
    expect(measureText('https://example.com')).toBeNull()
    expect(measureText('---\n\n***')).toBeNull()
    expect(measureText('```\n+++ ---\n```')).toBeNull()
    expect(measureText('` ` ``')).toBeNull()
  })

  test('code-only replies return a reading without prose numbers', () => {
    const reading = measure('```js\nconst a = 1\n```')
    expect(reading.stats).toEqual({
      words: 0,
      sentences: 0,
      paragraphs: 0,
      syllables: 0,
      letters: 0,
      polysyllables: 0,
      longestParagraphWords: 0,
      longestSentenceWords: 0,
      codeWords: 3,
      tableWords: 0,
    })
    expect(reading.grades).toEqual({
      'flesch-kincaid': 0,
      'gunning-fog': 0,
      smog: 0,
      'coleman-liau': 0,
      'automated-readability': 0,
    })
    expect(reading.readingEase).toBe(100)
    expect(reading.isSmallSample).toBe(true)
    expect(reading.readSeconds).toBe(2)
  })

  test('unterminated code and inline-only code are readable', () => {
    expect(measure('```js\nunterminated code').stats.codeWords).toBe(2)
    expect(measure('`inline` `code`').stats.codeWords).toBe(2)
  })
})

describe('read time', () => {
  test('prose reads at 5.95 syllables per second', () => {
    const reading = measure(EIGHT_WORD_SENTENCE.repeat(READ_TIME_SENTENCE_REPEATS))
    expect(reading.stats.words).toBe(240)
    expect(reading.stats.syllables).toBe(360)
    expect(reading.readSeconds).toBe(61)
  })

  test('a 240-word plain paragraph reads in about a minute', () => {
    const { readSeconds } = measure(EIGHT_WORD_SENTENCE.repeat(READ_TIME_SENTENCE_REPEATS))
    expect(readSeconds).toBeGreaterThanOrEqual(MIN_PLAIN_PARAGRAPH_SECONDS)
    expect(readSeconds).toBeLessThanOrEqual(MAX_PLAIN_PARAGRAPH_SECONDS)
  })

  test('longer words read slower than short ones at the same word count', () => {
    const short = measure('The cat sat on the mat and ran.')
    const long = measure('Notwithstanding considerable methodological heterogeneity, epidemiological investigations persist.')
    expect(long.readSeconds).toBeGreaterThan(short.readSeconds)
  })

  test('fenced code reads at half the word rate', () => {
    const reading = measure(codeBlock(CODE_WORDS_PER_MINUTE_FIXTURE))
    expect(reading.stats.codeWords).toBe(CODE_WORDS_PER_MINUTE_FIXTURE)
    expect(reading.readSeconds).toBe(60)
  })

  test('code seconds add to prose seconds', () => {
    const reading = measure(`${FIXTURE}\n\n${codeBlock(CODE_WORDS_PER_MINUTE_FIXTURE)}`)
    expect(reading.stats.words).toBe(19)
    expect(reading.stats.codeWords).toBe(CODE_WORDS_PER_MINUTE_FIXTURE)
    expect(reading.readSeconds).toBe(67)
  })

  test('identifiers, numbers and punctuation in code split into tokens', () => {
    const reading = measure('```ts\nconst total_cost = items.map((x) => x.price * 2)\n```')
    expect(reading.stats.codeWords).toBe(8)
  })

  test('inline code counts as code and not as prose', () => {
    const reading = measure('Use `alpha_beta` and ``gamma ` 2`` now.')
    expect(reading.stats.words).toBe(3)
    expect(reading.stats.codeWords).toBe(3)
    expect(reading.readSeconds).toBe(2)
  })

  test('tables count their cell words at the word rate', () => {
    const reading = measure(tableWithOneCell(CODE_WORDS_PER_MINUTE_FIXTURE))
    expect(reading.stats.tableWords).toBe(CODE_WORDS_PER_MINUTE_FIXTURE)
    expect(reading.stats.words).toBe(0)
    expect(reading.readSeconds).toBe(30)
  })

  test('separator rows add nothing and every cell is counted', () => {
    const reading = measure('| name | kind |\n|:-----|:----:|\n| one two | three |\n| four | five six |')
    expect(reading.stats.tableWords).toBe(8)
    expect(reading.readSeconds).toBe(2)
  })

  test('inline code inside a table cell counts as code', () => {
    const reading = measure('| name | call |\n|---|---|\n| run | `go fast` |')
    expect(reading.stats.tableWords).toBe(3)
    expect(reading.stats.codeWords).toBe(2)
  })

  test('urls, html tags and image urls add nothing', () => {
    const plain = measure('Read this now.')
    const noisy = measure(
      'Read <b>this</b> now. ![chart](https://example.com/very/long/image/path.png) https://example.com/a/b/c?d=e',
    )
    expect(noisy.stats).toEqual(plain.stats)
    expect(noisy.readSeconds).toBe(plain.readSeconds)
  })

  test('link text is read and its target is not', () => {
    const plain = measure('Read the style guide now.')
    const linked = measure('Read the [style guide](https://example.com/guide/with/many/parts) now.')
    expect(linked.readSeconds).toBe(plain.readSeconds)
    expect(linked.stats.codeWords).toBe(0)
  })
})
