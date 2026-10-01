export type DialId =
  | 'totalWords'
  | 'readTime'
  | 'paragraphWords'
  | 'sentenceWords'
  | 'gradeLevel'
  | 'readingEase'

export type GradeFormula =
  | 'flesch-kincaid'
  | 'gunning-fog'
  | 'smog'
  | 'coleman-liau'
  | 'automated-readability'

export type Dial = { isOn: boolean; value: number }

export type StyleSettings = {
  dials: Record<DialId, Dial>
  gradeFormula: GradeFormula
}

export type TextStats = {
  words: number
  sentences: number
  paragraphs: number
  syllables: number
  letters: number
  polysyllables: number
  longestParagraphWords: number
  longestSentenceWords: number
  codeWords: number
  tableWords: number
}

export type StyleReading = {
  stats: TextStats
  grades: Record<GradeFormula, number>
  readingEase: number
  readSeconds: number
  isSmallSample: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'style-sliders': { settings: StyleSettings; last: StyleReading | null }
  }
}
