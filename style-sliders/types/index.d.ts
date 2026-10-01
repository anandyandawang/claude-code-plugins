export type DialId =
  | 'totalWords'
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
}

export type StyleReading = {
  stats: TextStats
  grades: Record<GradeFormula, number>
  readingEase: number
  isSmallSample: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'style-sliders': { settings: StyleSettings; last: StyleReading | null }
  }
}
