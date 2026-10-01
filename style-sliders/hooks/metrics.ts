import type { GradeFormula, StyleReading, TextStats } from '../types'

export type ProseBlock = { kind: 'paragraph' | 'heading'; text: string }

type Fence = { character: string; length: number }

type FenceSplit = { textLines: string[]; codeLines: string[] }

type Extraction = { blocks: ProseBlock[]; codeWords: number; tableWords: number }

type BlockStats = {
  kind: ProseBlock['kind']
  words: number
  syllables: number
  letters: number
  polysyllables: number
  sentenceWordCounts: readonly number[]
}

type Counts = Pick<TextStats, 'words' | 'sentences' | 'syllables' | 'letters' | 'polysyllables'>

const SMALL_SAMPLE_WORDS = 50
const POLYSYLLABLE_MIN_SYLLABLES = 3
const SHORT_WORD_LENGTH = 3
const MAX_READING_EASE = 100
const AVERAGE_WORDS_PER_MINUTE = 238
const TYPICAL_SYLLABLES_PER_WORD = 1.5
const CODE_WORDS_PER_MINUTE = AVERAGE_WORDS_PER_MINUTE / 2
const SECONDS_PER_MINUTE = 60
const PROSE_SYLLABLES_PER_SECOND = (AVERAGE_WORDS_PER_MINUTE * TYPICAL_SYLLABLES_PER_WORD) / SECONDS_PER_MINUTE
const CODE_WORDS_PER_SECOND = CODE_WORDS_PER_MINUTE / SECONDS_PER_MINUTE
const TABLE_WORDS_PER_SECOND = AVERAGE_WORDS_PER_MINUTE / SECONDS_PER_MINUTE

const FENCE_LINE = /^\s*(`{3,}|~{3,})(.*)$/
const HORIZONTAL_RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/
const HEADING_LINE = /^\s{0,3}#{1,6}(?:\s+(.*))?$/
const LIST_ITEM_LINE = /^\s*(?:[-*+]|\d{1,9}[.)])\s+(.*)$/
const BLOCKQUOTE_PREFIX = /^\s*>\s?/
const REFERENCE_DEFINITION = /^\s{0,3}\[[^\]]+\]:\s*\S+/
const TASK_BOX = /^\[[ xX]\]\s+/
const CLOSING_HASHES = /\s+#+\s*$/
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’._-][\p{L}\p{N}]+)*/gu
const CODE_TOKEN = /[A-Za-z0-9_]+/g
const INLINE_CODE_SPAN = /(`+)([\s\S]*?)\1/g
const TOKEN_PATTERN = /[\p{L}\p{N}]+(?:['’._-][\p{L}\p{N}]+)*|[.!?…]+/gu
const TERMINATOR_START = /^[.!?…]/
const CLOSING_QUOTES = /["'”’)\]»]/
const WHITESPACE = /\s/
const NUMBER_REFERENCE = /^\s*[#\d]/
const STARTS_NEW_SENTENCE = /^\s+[\p{Lu}]/u

const ABBREVIATIONS: ReadonlySet<string> = new Set([
  'e.g',
  'i.e',
  'vs',
  'mr',
  'mrs',
  'ms',
  'dr',
  'st',
  'approx',
  'cf',
  'inc',
  'ltd',
  'jr',
  'sr',
  'u.s',
  'u.s.a',
  'fig',
  'al',
  'prof',
  'gen',
  'vol',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',
])

const CONTEXTUAL_ABBREVIATIONS: ReadonlySet<string> = new Set(['a.m', 'p.m', 'etc'])

const NUMBERED_ABBREVIATION = 'no'

type InlineRule = readonly [RegExp, string]

const HIDDEN_CONTENT_RULES: readonly InlineRule[] = [
  [/<!--[\s\S]*?-->/g, ' '],
  [/!\[[^\]]*\]\((?:[^()]|\([^()]*\))*\)/g, ' '],
]

const TEXT_RULES: readonly InlineRule[] = [
  [/(`+)[\s\S]*?\1/g, ' '],
  [/\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1'],
  [/\[([^\]]+)\]\[[^\]]*\]/g, '$1'],
  [/\[\^[^\]]*\]/g, ''],
  [/<\/?(?:br|p|div|li|ul|ol|tr|td|th|table|hr|h[1-6])(?:\s[^<>]*)?\/?>/gi, ' '],
  [/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>/g, ''],
  [/&(?:[a-z]+|#\d+);/gi, ' '],
  [/https?:\/\/[^\s<>]*[^\s<>.,;:!?)\]'"]/g, ' '],
  [/~~/g, ''],
  [/\*/g, ''],
  [/(?<![\p{L}\p{N}])_+|_+(?![\p{L}\p{N}])/gu, ''],
]

const INLINE_RULES: readonly InlineRule[] = [...HIDDEN_CONTENT_RULES, ...TEXT_RULES]

const IRREGULAR_SYLLABLES: ReadonlyMap<string, number> = new Map([
  ['area', 3],
  ['idea', 3],
  ['recipe', 3],
  ['maybe', 2],
  ['business', 2],
  ['hundred', 2],
  ['naked', 2],
  ['sacred', 2],
  ['wicked', 2],
  ['didnt', 2],
  ['isnt', 2],
  ['wasnt', 2],
  ['doesnt', 2],
  ['couldnt', 2],
  ['wouldnt', 2],
  ['shouldnt', 2],
  ['hasnt', 2],
  ['hadnt', 2],
  ['mustnt', 2],
  ['neednt', 2],
  ['arent', 1],
  ['werent', 1],
  ['havent', 2],
  ['mightnt', 2],
  ['something', 2],
  ['sometimes', 2],
  ['everything', 3],
  ['therefore', 2],
  ['somewhere', 2],
])

const EXTRA_SYLLABLE_PATTERNS: readonly RegExp[] = [
  /cre(?=at(?!ur))/g,
  /(?<![cgstx])ia|(?<=[cgstx])ia(?![ln])/g,
  /(?<![gq])ua/g,
  /[aeiouy](?=ing$)/g,
  /ism$/g,
]

const SYLLABIC_L = /[bcdfgkpstz]l$/
const SILENT_E_BEFORE_SUFFIX = /[^aeiouy]e(?=(?:ment|ly|ful|fully|less|ness)$)/
const VOWEL_GROUPS = /[aeiouy]+/g
const LEADING_CONSONANT_Y = /^y(?=[aeiou])/
const SOFT_PLURAL_STEM = /(?:[sxzcg]|[cs]h)$/
const SILENT_E_AFTER_GUTTURAL = /[gq]ue$/
const SYLLABLE_PART_SEPARATOR = /[-_]/

const isBlank = (line: string): boolean => line.trim() === ''

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0)

const stripBlockquote = (line: string): string => {
  let stripped = line
  while (BLOCKQUOTE_PREFIX.test(stripped)) stripped = stripped.replace(BLOCKQUOTE_PREFIX, '')
  return stripped
}

const openingFence = (line: string): Fence | null => {
  const match = FENCE_LINE.exec(line)
  const marker = match?.[1]
  if (!marker) return null
  const hasBacktickInInfo = marker.startsWith('`') && (match?.[2] ?? '').includes('`')
  if (hasBacktickInInfo) return null
  return { character: marker.charAt(0), length: marker.length }
}

const isClosingFence = (line: string, fence: Fence): boolean => {
  const trimmed = line.trim()
  return trimmed.length >= fence.length && trimmed === fence.character.repeat(trimmed.length)
}

const splitFencedCode = (lines: readonly string[]): FenceSplit => {
  const textLines: string[] = []
  const codeLines: string[] = []
  let openFence: Fence | null = null
  for (const line of lines) {
    if (openFence) {
      if (isClosingFence(line, openFence)) openFence = null
      else codeLines.push(line)
      continue
    }
    openFence = openingFence(line)
    textLines.push(openFence ? '' : line)
  }
  return { textLines, codeLines }
}

const isTableLine = (line: string): boolean => {
  const trimmed = line.trim()
  if (trimmed.startsWith('|')) return true
  return /^[\s|:-]+$/.test(trimmed) && trimmed.includes('-') && trimmed.includes('|')
}

const isIgnoredLine = (line: string): boolean =>
  isTableLine(line) || HORIZONTAL_RULE.test(line) || REFERENCE_DEFINITION.test(line)

const applyRules = (text: string, rules: readonly InlineRule[]): string =>
  rules.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text)

const cleanInline = (text: string): string => applyRules(text, INLINE_RULES)

const countCodeTokens = (text: string): number => text.match(CODE_TOKEN)?.length ?? 0

const countInlineCodeWords = (text: string): number =>
  sum(
    Array.from(applyRules(text, HIDDEN_CONTENT_RULES).matchAll(INLINE_CODE_SPAN), (match) =>
      countCodeTokens(match[2] ?? ''),
    ),
  )

export const extractWords = (text: string): string[] => Array.from(text.matchAll(WORD_PATTERN), (match) => match[0])

export const countWords = (text: string): number => extractWords(text).length

const collectBlocks = (lines: readonly string[]): ProseBlock[] => {
  const blocks: ProseBlock[] = []
  let pending: string[] = []
  const flushParagraph = () => {
    if (pending.length > 0) blocks.push({ kind: 'paragraph', text: pending.join(' ') })
    pending = []
  }
  for (const rawLine of lines) {
    const line = stripBlockquote(rawLine)
    if (isBlank(line) || isIgnoredLine(line)) {
      flushParagraph()
      continue
    }
    const heading = HEADING_LINE.exec(line)
    if (heading) {
      flushParagraph()
      blocks.push({ kind: 'heading', text: (heading[1] ?? '').replace(CLOSING_HASHES, '') })
      continue
    }
    const listItem = LIST_ITEM_LINE.exec(line)
    if (listItem) {
      flushParagraph()
      pending = [(listItem[1] ?? '').replace(TASK_BOX, '')]
      continue
    }
    pending.push(line.trim())
  }
  flushParagraph()
  return blocks
}

const cleanBlock = (block: ProseBlock): ProseBlock => ({
  kind: block.kind,
  text: cleanInline(block.text).replace(/\s+/g, ' ').trim(),
})

const hasWords = (block: ProseBlock): boolean => countWords(block.text) > 0

const countTableWords = (line: string): number => countWords(cleanInline(line))

export const extractContent = (markdown: string): Extraction => {
  const { textLines, codeLines } = splitFencedCode(markdown.replace(/\r\n?/g, '\n').split('\n'))
  const rawBlocks = collectBlocks(textLines)
  const tableLines = textLines.map(stripBlockquote).filter(isTableLine)
  return {
    blocks: rawBlocks.map(cleanBlock).filter(hasWords),
    codeWords:
      sum(codeLines.map(countCodeTokens)) +
      sum(rawBlocks.map((block) => countInlineCodeWords(block.text))) +
      sum(tableLines.map(countInlineCodeWords)),
    tableWords: sum(tableLines.map(countTableWords)),
  }
}

export const extractBlocks = (markdown: string): ProseBlock[] => extractContent(markdown).blocks

export const extractProse = (markdown: string): string =>
  extractBlocks(markdown)
    .map((block) => block.text)
    .join('\n\n')

const isAbbreviation = (word: string, followingText: string): boolean => {
  if (word === NUMBERED_ABBREVIATION) return NUMBER_REFERENCE.test(followingText)
  if (CONTEXTUAL_ABBREVIATIONS.has(word)) return !STARTS_NEW_SENTENCE.test(followingText)
  return ABBREVIATIONS.has(word)
}

const skipClosingQuotes = (text: string, from: number): number => {
  let index = from
  while (index < text.length && CLOSING_QUOTES.test(text.charAt(index))) index += 1
  return index
}

const endsAtBoundary = (text: string, index: number): boolean =>
  index >= text.length || WHITESPACE.test(text.charAt(index))

export const splitSentences = (text: string): string[] => {
  const sentences: string[] = []
  let sentenceStart = 0
  let previousWord: { lowered: string; end: number } | null = null
  for (const token of text.matchAll(TOKEN_PATTERN)) {
    const start = token.index ?? 0
    const end = start + token[0].length
    if (!TERMINATOR_START.test(token[0])) {
      previousWord = { lowered: token[0].toLowerCase(), end }
      continue
    }
    const sentenceEnd = skipClosingQuotes(text, end)
    if (!endsAtBoundary(text, sentenceEnd)) continue
    const followsAbbreviation =
      token[0] === '.' &&
      previousWord !== null &&
      previousWord.end === start &&
      isAbbreviation(previousWord.lowered, text.slice(sentenceEnd))
    if (followsAbbreviation) continue
    sentences.push(text.slice(sentenceStart, sentenceEnd))
    sentenceStart = sentenceEnd
  }
  sentences.push(text.slice(sentenceStart))
  return sentences.filter((sentence) => countWords(sentence) > 0)
}

const countVowelGroups = (letters: string): number => letters.match(VOWEL_GROUPS)?.length ?? 0

const countPatternMatches = (letters: string, pattern: RegExp): number => letters.match(pattern)?.length ?? 0

const stripPastTense = (letters: string): string => {
  const stem = letters.slice(0, -2)
  return /[td]$/.test(stem) ? letters : stem
}

const stripPlural = (letters: string): string => {
  const stem = letters.slice(0, -2)
  return SOFT_PLURAL_STEM.test(stem) ? letters : stem
}

const stripSilentE = (letters: string): string =>
  letters.slice(0, SILENT_E_AFTER_GUTTURAL.test(letters) ? -2 : -1)

const stripSilentEnding = (letters: string): string => {
  if (letters.endsWith('ed')) return stripPastTense(letters)
  if (letters.endsWith('es')) return stripPlural(letters)
  if (letters.endsWith('e')) return stripSilentE(letters)
  return letters
}

const countLetterSyllables = (letters: string): number => {
  if (letters.length <= SHORT_WORD_LENGTH) return 1
  const irregular = IRREGULAR_SYLLABLES.get(letters)
  if (irregular !== undefined) return irregular
  const stem = stripSilentEnding(letters)
  const base = stem.replace(SILENT_E_BEFORE_SUFFIX, (match) => match.slice(0, -1))
  const baseGroups = countVowelGroups(base.replace(LEADING_CONSONANT_Y, ''))
  const syllabicL = stem !== letters && SYLLABIC_L.test(stem) ? 1 : 0
  const extra = EXTRA_SYLLABLE_PATTERNS.reduce((total, pattern) => total + countPatternMatches(letters, pattern), 0)
  return Math.max(1, baseGroups + syllabicL + extra)
}

const toPlainLetters = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z]/g, '')

export const countSyllables = (word: string): number => {
  if (toPlainLetters(word) === '') return 1
  return word
    .split(SYLLABLE_PART_SEPARATOR)
    .reduce((total, part) => total + countLetterSyllables(toPlainLetters(part)), 0)
}

const countLetters = (word: string): number => Array.from(word.replace(/[^\p{L}\p{N}]/gu, '')).length

const describeBlock = (block: ProseBlock): BlockStats => {
  const words = extractWords(block.text)
  const syllableCounts = words.map(countSyllables)
  return {
    kind: block.kind,
    words: words.length,
    syllables: syllableCounts.reduce((total, count) => total + count, 0),
    letters: words.reduce((total, word) => total + countLetters(word), 0),
    polysyllables: syllableCounts.filter((count) => count >= POLYSYLLABLE_MIN_SYLLABLES).length,
    sentenceWordCounts: splitSentences(block.text).map(countWords),
  }
}

export const computeStats = ({ blocks, codeWords, tableWords }: Extraction): TextStats => {
  const described = blocks.map(describeBlock)
  const paragraphs = described.filter((block) => block.kind === 'paragraph')
  return {
    words: sum(described.map((block) => block.words)),
    sentences: sum(described.map((block) => block.sentenceWordCounts.length)),
    paragraphs: paragraphs.length,
    syllables: sum(described.map((block) => block.syllables)),
    letters: sum(described.map((block) => block.letters)),
    polysyllables: sum(described.map((block) => block.polysyllables)),
    longestParagraphWords: Math.max(0, ...paragraphs.map((block) => block.words)),
    longestSentenceWords: Math.max(0, ...described.flatMap((block) => block.sentenceWordCounts)),
    codeWords,
    tableWords,
  }
}

export const computeReadSeconds = (stats: TextStats): number =>
  Math.round(
    stats.syllables / PROSE_SYLLABLES_PER_SECOND +
      stats.codeWords / CODE_WORDS_PER_SECOND +
      stats.tableWords / TABLE_WORDS_PER_SECOND,
  )

const round1 = (value: number): number => Math.round(value * 10) / 10

const toGrade = (value: number): number => round1(Math.max(0, value))

const toReadingEase = (value: number): number => round1(Math.min(MAX_READING_EASE, Math.max(0, value)))

const wordsPerSentence = (counts: Counts): number => counts.words / counts.sentences

const syllablesPerWord = (counts: Counts): number => counts.syllables / counts.words

const GRADE_FORMULA_FUNCTIONS: Record<GradeFormula, (counts: Counts) => number> = {
  'flesch-kincaid': (counts) => 0.39 * wordsPerSentence(counts) + 11.8 * syllablesPerWord(counts) - 15.59,
  'gunning-fog': (counts) =>
    0.4 * (wordsPerSentence(counts) + 100 * (counts.polysyllables / counts.words)),
  smog: (counts) => 1.043 * Math.sqrt(counts.polysyllables * (30 / counts.sentences)) + 3.1291,
  'coleman-liau': (counts) =>
    0.0588 * ((100 * counts.letters) / counts.words) -
    0.296 * ((100 * counts.sentences) / counts.words) -
    15.8,
  'automated-readability': (counts) =>
    4.71 * (counts.letters / counts.words) + 0.5 * wordsPerSentence(counts) - 21.43,
}

const fleschReadingEase = (counts: Counts): number =>
  206.835 - 1.015 * wordsPerSentence(counts) - 84.6 * syllablesPerWord(counts)

const computeGrades = (counts: Counts): Record<GradeFormula, number> =>
  Object.fromEntries(
    Object.entries(GRADE_FORMULA_FUNCTIONS).map(([formula, compute]) => [formula, toGrade(compute(counts))]),
  ) as Record<GradeFormula, number>

const NO_PROSE_GRADES: Record<GradeFormula, number> = {
  'flesch-kincaid': 0,
  'gunning-fog': 0,
  smog: 0,
  'coleman-liau': 0,
  'automated-readability': 0,
}

const hasNothingToRead = (stats: TextStats): boolean =>
  stats.words === 0 && stats.codeWords === 0 && stats.tableWords === 0

export const measureText = (markdown: string): StyleReading | null => {
  const stats = computeStats(extractContent(markdown))
  if (hasNothingToRead(stats)) return null
  const hasProse = stats.words > 0
  return {
    stats,
    grades: hasProse ? computeGrades(stats) : { ...NO_PROSE_GRADES },
    readingEase: hasProse ? toReadingEase(fleschReadingEase(stats)) : MAX_READING_EASE,
    readSeconds: computeReadSeconds(stats),
    isSmallSample: stats.words < SMALL_SAMPLE_WORDS,
  }
}
