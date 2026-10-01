import type { Dial, DialId, GradeFormula, StyleReading, StyleSettings } from '../types'

export type DialSpec = {
  id: DialId
  label: string
  shortLabel: string
  bound: 'max' | 'min'
  steps: readonly number[]
  defaultValue: number
  unit: string
}

export type Breach = { dial: DialId; measured: number; limit: number }

export type SlidersCommand =
  | { kind: 'open' }
  | { kind: 'show' }
  | { kind: 'reset' }
  | { kind: 'all-off' }
  | { kind: 'help' }
  | { kind: 'set'; dial: DialId; value: number }
  | { kind: 'switch'; dial: DialId; isOn: boolean }
  | { kind: 'formula'; formula: GradeFormula }
  | { kind: 'error'; message: string }

const GRADE_STEPS: readonly number[] = Array.from({ length: 14 }, (_, index) => index + 3)

const SPECS_BY_ID: Record<DialId, DialSpec> = {
  totalWords: {
    id: 'totalWords',
    label: 'Total words',
    shortLabel: 'words',
    bound: 'max',
    steps: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000],
    defaultValue: 300,
    unit: 'words',
  },
  readTime: {
    id: 'readTime',
    label: 'Read time',
    shortLabel: 'read',
    bound: 'max',
    steps: [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 420, 600],
    defaultValue: 60,
    unit: 'seconds',
  },
  paragraphWords: {
    id: 'paragraphWords',
    label: 'Paragraph words',
    shortLabel: 'para',
    bound: 'max',
    steps: [15, 20, 25, 30, 40, 50, 60, 80, 100, 150],
    defaultValue: 60,
    unit: 'words',
  },
  sentenceWords: {
    id: 'sentenceWords',
    label: 'Sentence words',
    shortLabel: 'sentence',
    bound: 'max',
    steps: [8, 10, 12, 15, 18, 20, 25, 30, 40],
    defaultValue: 20,
    unit: 'words',
  },
  gradeLevel: {
    id: 'gradeLevel',
    label: 'Grade level',
    shortLabel: 'grade',
    bound: 'max',
    steps: GRADE_STEPS,
    defaultValue: 8,
    unit: 'grade',
  },
  readingEase: {
    id: 'readingEase',
    label: 'Reading ease',
    shortLabel: 'ease',
    bound: 'min',
    steps: [10, 20, 30, 40, 50, 60, 70, 80, 90],
    defaultValue: 60,
    unit: 'ease',
  },
}

export const DIAL_SPECS: readonly DialSpec[] = [
  SPECS_BY_ID.totalWords,
  SPECS_BY_ID.readTime,
  SPECS_BY_ID.paragraphWords,
  SPECS_BY_ID.sentenceWords,
  SPECS_BY_ID.gradeLevel,
  SPECS_BY_ID.readingEase,
]

export const GRADE_FORMULAS: readonly GradeFormula[] = [
  'flesch-kincaid',
  'gunning-fog',
  'smog',
  'coleman-liau',
  'automated-readability',
]

export const GRADE_FORMULA_LABELS: Record<GradeFormula, string> = {
  'flesch-kincaid': 'Flesch-Kincaid',
  'gunning-fog': 'Gunning Fog',
  smog: 'SMOG',
  'coleman-liau': 'Coleman-Liau',
  'automated-readability': 'ARI',
}

const GRADE_FORMULA_TAGS: Record<GradeFormula, string> = {
  'flesch-kincaid': 'FK',
  'gunning-fog': 'Fog',
  smog: 'SMOG',
  'coleman-liau': 'CLI',
  'automated-readability': 'ARI',
}

const GRADE_FORMULA_HINTS: Record<GradeFormula, string> = {
  'flesch-kincaid': 'Use short sentences and words of one or two syllables.',
  'gunning-fog': 'Avoid words of three or more syllables.',
  smog: 'Avoid words of three or more syllables.',
  'coleman-liau': 'Use short words.',
  'automated-readability': 'Use short words.',
}

const DEFAULT_FORMULA: GradeFormula = 'flesch-kincaid'
const AVERAGE_WORDS_PER_MINUTE = 238
const SECONDS_PER_MINUTE = 60
const WORD_ESTIMATE_ROUNDING = 10
const MINUTE_DECIMAL_SCALE = 10
const FILLED_CELL = '█'
const EMPTY_CELL = '░'
const SMALL_SAMPLE_VERDICT =
  'Your last reply was short, so its grade and reading ease are rough. Do not adjust for them.'
const CLOSING_VERDICT = 'Aim to fit every limit this time.'
const SCORE_HINT = 'Use shorter sentences and plainer words.'

export const dialSpec = (id: DialId): DialSpec => SPECS_BY_ID[id]

const firstStep = (spec: DialSpec): number => Math.min(...spec.steps)

const lastStep = (spec: DialSpec): number => Math.max(...spec.steps)

const boundSymbol = (spec: DialSpec): string => (spec.bound === 'max' ? '≤' : '≥')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isGradeFormula = (value: unknown): value is GradeFormula =>
  GRADE_FORMULAS.some(formula => formula === value)

const mapDials = (change: (spec: DialSpec) => Dial): Record<DialId, Dial> =>
  Object.fromEntries(DIAL_SPECS.map(spec => [spec.id, change(spec)])) as Record<DialId, Dial>

const clampToRange = (spec: DialSpec, value: number): number =>
  Math.min(lastStep(spec), Math.max(firstStep(spec), Math.round(value)))

const readValue = (spec: DialSpec, raw: unknown): number =>
  typeof raw === 'number' && Number.isFinite(raw) ? clampToRange(spec, raw) : spec.defaultValue

export const DEFAULT_SETTINGS: StyleSettings = {
  dials: mapDials(spec => ({ isOn: false, value: spec.defaultValue })),
  gradeFormula: DEFAULT_FORMULA,
}

const sanitizeDial = (spec: DialSpec, raw: unknown): Dial =>
  isRecord(raw)
    ? { isOn: raw.isOn === true, value: readValue(spec, raw.value) }
    : { isOn: false, value: spec.defaultValue }

export const sanitizeSettings = (raw: unknown): StyleSettings => {
  const record = isRecord(raw) ? raw : {}
  const rawDials = isRecord(record.dials) ? record.dials : {}

  return {
    dials: mapDials(spec => sanitizeDial(spec, rawDials[spec.id])),
    gradeFormula: isGradeFormula(record.gradeFormula) ? record.gradeFormula : DEFAULT_FORMULA,
  }
}

const updateDial = (
  settings: StyleSettings,
  id: DialId,
  change: (dial: Dial) => Dial,
): StyleSettings => ({
  ...settings,
  dials: { ...settings.dials, [id]: change(settings.dials[id]) },
})

const nextStep = (spec: DialSpec, value: number, direction: 1 | -1): number => {
  const candidates =
    direction === 1 ? spec.steps.filter(step => step > value) : spec.steps.filter(step => step < value)
  const reached = direction === 1 ? candidates[0] : candidates[candidates.length - 1]
  return reached ?? (direction === 1 ? lastStep(spec) : firstStep(spec))
}

export const stepDial = (settings: StyleSettings, id: DialId, direction: 1 | -1): StyleSettings => {
  const spec = dialSpec(id)
  return updateDial(settings, id, dial => ({
    isOn: true,
    value: nextStep(spec, dial.value, direction),
  }))
}

export const toggleDial = (settings: StyleSettings, id: DialId): StyleSettings =>
  updateDial(settings, id, dial => ({ ...dial, isOn: !dial.isOn }))

export const setDialOn = (settings: StyleSettings, id: DialId, isOn: boolean): StyleSettings =>
  updateDial(settings, id, dial => ({ ...dial, isOn }))

export const setDialValue = (settings: StyleSettings, id: DialId, value: number): StyleSettings => {
  const spec = dialSpec(id)
  return updateDial(settings, id, () => ({ isOn: true, value: readValue(spec, value) }))
}

export const cycleGradeFormula = (settings: StyleSettings): StyleSettings => {
  const index = GRADE_FORMULAS.indexOf(settings.gradeFormula)
  const next = GRADE_FORMULAS[(index + 1) % GRADE_FORMULAS.length] ?? DEFAULT_FORMULA
  return { ...settings, gradeFormula: next }
}

export const allDialsOff = (settings: StyleSettings): StyleSettings => ({
  ...settings,
  dials: mapDials(spec => ({ ...settings.dials[spec.id], isOn: false })),
})

const activeSpecs = (settings: StyleSettings): DialSpec[] =>
  DIAL_SPECS.filter(spec => settings.dials[spec.id].isOn)

export const hasActiveDials = (settings: StyleSettings): boolean => activeSpecs(settings).length > 0

export const measuredValue = (reading: StyleReading, id: DialId, formula: GradeFormula): number => {
  if (id === 'totalWords') return reading.stats.words
  if (id === 'readTime') return reading.readSeconds
  if (id === 'paragraphWords') return reading.stats.longestParagraphWords
  if (id === 'sentenceWords') return reading.stats.longestSentenceWords
  if (id === 'gradeLevel') return reading.grades[formula]
  return reading.readingEase
}

const isBreached = (spec: DialSpec, measured: number, limit: number): boolean =>
  spec.bound === 'max' ? measured > limit : measured < limit

export const findBreaches = (settings: StyleSettings, reading: StyleReading): Breach[] =>
  activeSpecs(settings).flatMap(spec => {
    const measured = measuredValue(reading, spec.id, settings.gradeFormula)
    const limit = settings.dials[spec.id].value
    return isBreached(spec, measured, limit) ? [{ dial: spec.id, measured, limit }] : []
  })

const stepPosition = (spec: DialSpec, value: number): number => {
  const lastIndex = spec.steps.length - 1
  if (lastIndex <= 0 || value <= firstStep(spec)) return 0
  if (value >= lastStep(spec)) return 1
  const lowerIndex = spec.steps.findLastIndex(step => step <= value)
  const lower = spec.steps[lowerIndex] ?? value
  const upper = spec.steps[lowerIndex + 1] ?? lower
  const progress = upper === lower ? 0 : (value - lower) / (upper - lower)
  return (lowerIndex + progress) / lastIndex
}

export const sliderBar = (spec: DialSpec, value: number, width: number): string => {
  const cells = Math.max(1, Math.floor(width))
  const filled = Math.round(1 + stepPosition(spec, value) * (cells - 1))
  return FILLED_CELL.repeat(filled) + EMPTY_CELL.repeat(cells - filled)
}

const formatMinutes = (wholeSeconds: number): string =>
  String(Math.round((wholeSeconds / SECONDS_PER_MINUTE) * MINUTE_DECIMAL_SCALE) / MINUTE_DECIMAL_SCALE)

export const formatDuration = (seconds: number): string => {
  const whole = Math.round(seconds)
  return whole < SECONDS_PER_MINUTE ? `${whole} sec` : `${formatMinutes(whole)} min`
}

const formatCompactDuration = (seconds: number): string => {
  const whole = Math.round(seconds)
  return whole < SECONDS_PER_MINUTE ? `${whole}s` : `${formatMinutes(whole)}m`
}

export const formatLimit = (spec: DialSpec, value: number): string => {
  if (spec.id === 'gradeLevel') return `${boundSymbol(spec)} grade ${value}`
  if (spec.id === 'readTime') return `${boundSymbol(spec)} ${formatDuration(value)}`
  return `${boundSymbol(spec)} ${value} ${spec.unit}`
}

const formatDecimal = (value: number): string => value.toFixed(1)

const measuredPhrase = (id: DialId, measured: number): string => {
  if (id === 'totalWords') return `${Math.round(measured)} words`
  if (id === 'readTime') return `read time ${formatDuration(measured)}`
  if (id === 'paragraphWords') return `longest paragraph ${Math.round(measured)} words`
  if (id === 'sentenceWords') return `longest sentence ${Math.round(measured)} words`
  if (id === 'gradeLevel') return `grade ${formatDecimal(measured)}`
  return `reading ease ${formatDecimal(measured)}`
}

const limitPhrase = (id: DialId, limit: number): string =>
  id === 'readTime' ? formatDuration(limit) : String(limit)

const breachMeasuredPhrase = (breach: Breach): string =>
  breach.dial === 'readTime' && formatDuration(breach.measured) === formatDuration(breach.limit)
    ? `read time ${Math.round(breach.measured)} sec`
    : measuredPhrase(breach.dial, breach.measured)

export const breachPhrase = (breach: Breach): string =>
  `${breachMeasuredPhrase(breach)} (limit ${limitPhrase(breach.dial, breach.limit)})`

const statusTag = (spec: DialSpec, settings: StyleSettings): string => {
  const value = settings.dials[spec.id].value
  if (spec.id === 'totalWords') return `${boundSymbol(spec)}${value}w`
  if (spec.id === 'readTime') return `${spec.shortLabel} ${boundSymbol(spec)}${formatCompactDuration(value)}`
  if (spec.id === 'gradeLevel') {
    return `grade ${boundSymbol(spec)}${value} ${GRADE_FORMULA_TAGS[settings.gradeFormula]}`
  }
  return `${spec.shortLabel} ${boundSymbol(spec)}${value}`
}

const statusLastPart = (settings: StyleSettings, last: StyleReading): string => {
  const breaches = findBreaches(settings, last)
  const words = `last ${last.stats.words}w`
  if (breaches.length === 0) return `${words} ✓`
  return `${words} ✗ ${breaches.map(breach => dialSpec(breach.dial).shortLabel).join(', ')}`
}

export const formatStatusLine = (
  settings: StyleSettings,
  last: StyleReading | null,
): string | undefined => {
  const active = activeSpecs(settings)
  if (active.length === 0) return undefined
  const limits = `style ${active.map(spec => statusTag(spec, settings)).join(' · ')}`
  return last === null ? limits : `${limits} · ${statusLastPart(settings, last)}`
}

const approximateWords = (seconds: number): number =>
  Math.round((seconds * AVERAGE_WORDS_PER_MINUTE) / SECONDS_PER_MINUTE / WORD_ESTIMATE_ROUNDING) *
  WORD_ESTIMATE_ROUNDING

const readTimeBullet = (seconds: number): string =>
  `Read time: a person should be able to read your reply in ${formatDuration(seconds)} or less. That is about ${approximateWords(seconds)} words of plain prose. Long words take longer, and code and tables count too: code reads at about half speed.`

const limitBullet = (spec: DialSpec, settings: StyleSettings): string => {
  const value = settings.dials[spec.id].value
  const formulaLabel = GRADE_FORMULA_LABELS[settings.gradeFormula]
  if (spec.id === 'totalWords') return `Total length: at most ${value} words.`
  if (spec.id === 'paragraphWords') {
    return `Paragraphs: at most ${value} words each. Each list item counts as its own paragraph.`
  }
  if (spec.id === 'sentenceWords') return `Sentences: at most ${value} words each.`
  if (spec.id === 'readTime') return readTimeBullet(value)
  if (spec.id === 'gradeLevel') {
    return `Grade level: ${value} or lower on the ${formulaLabel} scale. ${GRADE_FORMULA_HINTS[settings.gradeFormula]}`
  }
  return `Reading ease: a Flesch Reading Ease score of ${value} or higher (higher is easier). Short sentences and short words raise it.`
}

const TARGETS_INTRO_LINES: readonly string[] = [
  'Output style sliders',
  'The person set these limits with sliders. They apply to every reply you write to the person in chat. A hook measures each reply after you send it.',
]

const COUNTING_OPENING =
  'Everything you write to the person counts, including headings, list items, bold labels and link text.'
const COUNTING_CLOSING = 'Keep code, URLs and tables complete and exact.'
const COUNTING_CLOSING_WITH_READ_TIME =
  'Keep URLs exact. Keep any code you include exact, but you may shorten or drop code and tables to fit the read time.'
const UNCOUNTED_RULE = 'Code blocks, inline code, URLs and tables are not counted.'
const UNCOUNTED_WITH_READ_TIME_RULE =
  'Code blocks, inline code, URLs and tables are not counted toward the word, paragraph, sentence, grade and ease limits. Code and tables do count toward read time, but URLs never do.'

const countingRule = (settings: StyleSettings): string => {
  const uncounted = settings.dials.readTime.isOn ? UNCOUNTED_WITH_READ_TIME_RULE : UNCOUNTED_RULE
  const closing = settings.dials.readTime.isOn ? COUNTING_CLOSING_WITH_READ_TIME : COUNTING_CLOSING
  return `${COUNTING_OPENING} ${uncounted} ${closing}`
}

const TARGETS_RULES: readonly string[] = [
  'You cannot count words exactly, so aim about 15 percent below each maximum. Do not mention the limits or your word count unless the person asks.',
  'Never drop a fact the person needs to meet a limit. If the answer cannot fit, give the most important part and offer to continue.',
  'The limits cover replies to the person only. They do not cover tool inputs, files, code or commit messages. They do not cover reports a subagent writes for another agent. If you are a subagent, ignore these limits.',
]

export const composeTargetsSection = (settings: StyleSettings): string | null => {
  const active = activeSpecs(settings)
  if (active.length === 0) return null
  const bullets = active.map(spec => `- ${limitBullet(spec, settings)}`)
  return [...TARGETS_INTRO_LINES, '', ...bullets, '', countingRule(settings), ...TARGETS_RULES].join('\n')
}

const compactLimit = (spec: DialSpec, settings: StyleSettings): string => {
  const value = settings.dials[spec.id].value
  const formulaLabel = GRADE_FORMULA_LABELS[settings.gradeFormula]
  if (spec.id === 'totalWords') return `total at most ${value} words`
  if (spec.id === 'paragraphWords') return `paragraphs at most ${value} words`
  if (spec.id === 'sentenceWords') return `sentences at most ${value} words`
  if (spec.id === 'readTime') return `read time ${formatDuration(value)} or less`
  if (spec.id === 'gradeLevel') return `grade ${value} or lower (${formulaLabel})`
  return `reading ease ${value} or higher`
}

const hasScoreDial = (settings: StyleSettings): boolean =>
  settings.dials.gradeLevel.isOn || settings.dials.readingEase.isOn

const isScoreDial = (id: DialId): boolean => id === 'gradeLevel' || id === 'readingEase'

const hasScoreBreach = (breaches: readonly Breach[]): boolean =>
  breaches.some(breach => isScoreDial(breach.dial))

const verdictText = (breaches: Breach[]): string => {
  if (breaches.length === 0) return 'It fit every limit.'
  const over = breaches.filter(breach => dialSpec(breach.dial).bound === 'max')
  const under = breaches.filter(breach => dialSpec(breach.dial).bound === 'min')
  const parts = [
    ...(over.length > 0 ? [`Over: ${over.map(breachPhrase).join('; ')}.`] : []),
    ...(under.length > 0 ? [`Under: ${under.map(breachPhrase).join('; ')}.`] : []),
    ...(hasScoreBreach(breaches) ? [SCORE_HINT] : []),
  ]
  return `${parts.join(' ')} ${CLOSING_VERDICT}`
}

const lastReplyLine = (settings: StyleSettings, last: StyleReading): string => {
  const isRough = last.isSmallSample && hasScoreDial(settings)
  const isCounted = (id: DialId): boolean => !(isRough && isScoreDial(id))
  const values = activeSpecs(settings)
    .filter(spec => isCounted(spec.id))
    .map(spec => measuredPhrase(spec.id, measuredValue(last, spec.id, settings.gradeFormula)))
    .join(', ')
  if (values === '') return SMALL_SAMPLE_VERDICT
  const breaches = findBreaches(settings, last).filter(breach => isCounted(breach.dial))
  const exactPart = `Last reply: ${values}. ${verdictText(breaches)}`
  return isRough ? `${exactPart} ${SMALL_SAMPLE_VERDICT}` : exactPart
}

export const composeTurnContext = (
  settings: StyleSettings,
  last: StyleReading | null,
): string | null => {
  const active = activeSpecs(settings)
  if (active.length === 0) return null
  const limits = `Style limits for this reply: ${active.map(spec => compactLimit(spec, settings)).join('; ')}.`
  return last === null ? limits : `${limits}\n${lastReplyLine(settings, last)}`
}

const REVISION_KEEP_RULE = 'Leave code, inline code, URLs and tables unchanged.'
const REVISION_KEEP_RULE_WITH_READ_TIME =
  'Leave URLs unchanged. Code and tables count toward read time, so you may shorten or drop them, but keep any code you leave exact.'

const revisionKeepRule = (settings: StyleSettings): string =>
  settings.dials.readTime.isOn ? REVISION_KEEP_RULE_WITH_READ_TIME : REVISION_KEEP_RULE

export const composeRevisionPrompt = (settings: StyleSettings, reading: StyleReading): string => {
  const breaches = findBreaches(settings, reading)
  const breachLines =
    breaches.length > 0
      ? ['These limits were broken:', ...breaches.map(breach => `- ${breachPhrase(breach)}`)]
      : ['No limit was broken, but check it once more.']
  const limitLines = activeSpecs(settings).map(spec => `- ${limitBullet(spec, settings)}`)
  return [
    'Please rewrite your previous reply so it fits my style limits.',
    '',
    ...breachLines,
    '',
    'All the limits:',
    ...limitLines,
    '',
    `Keep the facts I need. If they cannot all fit, keep the most important part and offer to continue. ${revisionKeepRule(settings)} Send only the rewritten reply.`,
  ].join('\n')
}

const describeDial = (spec: DialSpec, settings: StyleSettings): string => {
  const dial = settings.dials[spec.id]
  return `${spec.label}: ${dial.isOn ? 'on' : 'off'}, ${formatLimit(spec, dial.value)}`
}

const describeLast = (settings: StyleSettings, last: StyleReading | null): string[] => {
  if (last === null) return ['No reply measured yet.']
  const formulaLabel = GRADE_FORMULA_LABELS[settings.gradeFormula]
  const sampleNote = last.isSmallSample
    ? ['  This reply was short, so the grade and ease scores are rough.']
    : []
  return [
    'Last reply:',
    `  Words: ${last.stats.words}`,
    `  Read time: ${formatDuration(last.readSeconds)}`,
    `  Longest paragraph: ${last.stats.longestParagraphWords} words`,
    `  Longest sentence: ${last.stats.longestSentenceWords} words`,
    `  Grade level (${formulaLabel}): ${formatDecimal(last.grades[settings.gradeFormula])}`,
    `  Reading ease: ${formatDecimal(last.readingEase)}`,
    ...sampleNote,
  ]
}

export const describeSettings = (settings: StyleSettings, last: StyleReading | null): string =>
  [
    'Output style sliders',
    ...DIAL_SPECS.map(spec => describeDial(spec, settings)),
    `Grade formula: ${GRADE_FORMULA_LABELS[settings.gradeFormula]}`,
    ...describeLast(settings, last),
  ].join('\n')

const DIAL_ALIASES: Readonly<Record<string, DialId>> = {
  words: 'totalWords',
  total: 'totalWords',
  length: 'totalWords',
  read: 'readTime',
  readtime: 'readTime',
  'read-time': 'readTime',
  time: 'readTime',
  paragraph: 'paragraphWords',
  paragraphs: 'paragraphWords',
  para: 'paragraphWords',
  sentence: 'sentenceWords',
  sentences: 'sentenceWords',
  grade: 'gradeLevel',
  level: 'gradeLevel',
  ease: 'readingEase',
  readability: 'readingEase',
  flesch: 'readingEase',
}

const FORMULA_ALIASES: Readonly<Record<string, GradeFormula>> = {
  fk: 'flesch-kincaid',
  'flesch-kincaid': 'flesch-kincaid',
  kincaid: 'flesch-kincaid',
  fog: 'gunning-fog',
  'gunning-fog': 'gunning-fog',
  gunning: 'gunning-fog',
  smog: 'smog',
  cli: 'coleman-liau',
  'coleman-liau': 'coleman-liau',
  coleman: 'coleman-liau',
  ari: 'automated-readability',
  'automated-readability': 'automated-readability',
}

export const SLIDERS_USAGE: string = [
  '/sliders - open the sliders pane',
  '/sliders show - show the settings and the last reading',
  '/sliders <dial> <number> - set a limit and turn it on',
  '/sliders read <time> - set the read time limit, like 45s, 90 or 2m',
  '/sliders <dial> on|off - turn one dial on or off',
  '/sliders formula <name> - pick the grade formula (fk, fog, smog, cli, ari)',
  '/sliders off - turn every dial off',
  '/sliders reset - go back to the defaults',
  '/sliders help - show this help',
  'Dials: words, read, paragraph, sentence, grade, ease',
].join('\n')

const lookup = <Value>(table: Readonly<Record<string, Value>>, key: string): Value | undefined =>
  Object.hasOwn(table, key) ? table[key] : undefined

const SINGLE_WORD_COMMANDS: Readonly<Record<string, SlidersCommand>> = {
  show: { kind: 'show' },
  status: { kind: 'show' },
  reset: { kind: 'reset' },
  off: { kind: 'all-off' },
  help: { kind: 'help' },
}

const NUMBER_PATTERN = /^\d+(\.\d+)?$/
const TIME_PATTERN = /^(\d+(?:\.\d+)?)\s*([a-z]*)$/

const SECONDS_PER_UNIT: Readonly<Record<string, number>> = {
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
  m: SECONDS_PER_MINUTE,
  min: SECONDS_PER_MINUTE,
  mins: SECONDS_PER_MINUTE,
  minute: SECONDS_PER_MINUTE,
  minutes: SECONDS_PER_MINUTE,
}

const errorCommand = (args: string): SlidersCommand => ({
  kind: 'error',
  message: `I did not understand "${args.trim()}".\n${SLIDERS_USAGE}`,
})

const parseSeconds = (argument: string): number | undefined => {
  const [, amount, unit = ''] = TIME_PATTERN.exec(argument) ?? []
  if (amount === undefined) return undefined
  const secondsPerUnit = unit === '' ? 1 : lookup(SECONDS_PER_UNIT, unit)
  return secondsPerUnit === undefined ? undefined : Math.round(Number(amount) * secondsPerUnit)
}

const parseNumber = (argument: string): number | undefined =>
  NUMBER_PATTERN.test(argument) ? Number(argument) : undefined

const parseDialCommand = (dial: DialId, argument: string): SlidersCommand | undefined => {
  if (argument === 'on') return { kind: 'switch', dial, isOn: true }
  if (argument === 'off') return { kind: 'switch', dial, isOn: false }
  const value = dial === 'readTime' ? parseSeconds(argument) : parseNumber(argument)
  return value === undefined ? undefined : { kind: 'set', dial, value }
}

const parseFormulaCommand = (name: string): SlidersCommand | undefined => {
  const formula = lookup(FORMULA_ALIASES, name)
  return formula === undefined ? undefined : { kind: 'formula', formula }
}

const parseWithArgument = (first: string, argument: string): SlidersCommand | undefined => {
  if (first === 'formula') return parseFormulaCommand(argument)
  const dial = lookup(DIAL_ALIASES, first)
  return dial === undefined ? undefined : parseDialCommand(dial, argument)
}

export const parseSlidersCommand = (args: string): SlidersCommand => {
  const words = args.toLowerCase().split(/\s+/).filter(word => word !== '')
  const [first, ...rest] = words
  if (first === undefined) return { kind: 'open' }
  const parsed =
    rest.length === 0 ? lookup(SINGLE_WORD_COMMANDS, first) : parseWithArgument(first, rest.join(' '))
  return parsed ?? errorCommand(args)
}

export const applySlidersCommand = (
  settings: StyleSettings,
  command: SlidersCommand,
): StyleSettings => {
  if (command.kind === 'set') return setDialValue(settings, command.dial, command.value)
  if (command.kind === 'switch') return setDialOn(settings, command.dial, command.isOn)
  if (command.kind === 'formula') return { ...settings, gradeFormula: command.formula }
  if (command.kind === 'reset') return DEFAULT_SETTINGS
  if (command.kind === 'all-off') return allDialsOff(settings)
  return settings
}
