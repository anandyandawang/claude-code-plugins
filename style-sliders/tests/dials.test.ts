import { test, expect, describe } from 'claude-code/testing'
import type { DialId, StyleReading, StyleSettings } from '../types'
import {
  DEFAULT_SETTINGS,
  DIAL_SPECS,
  GRADE_FORMULAS,
  GRADE_FORMULA_LABELS,
  SLIDERS_USAGE,
  allDialsOff,
  applySlidersCommand,
  breachPhrase,
  composeRevisionPrompt,
  composeTargetsSection,
  composeTurnContext,
  cycleGradeFormula,
  describeSettings,
  dialSpec,
  findBreaches,
  formatDuration,
  formatLimit,
  formatStatusLine,
  hasActiveDials,
  measuredValue,
  parseSlidersCommand,
  sanitizeSettings,
  setDialOn,
  setDialValue,
  sliderBar,
  stepDial,
  toggleDial,
} from '../hooks/dials'
import type { Breach } from '../hooks/dials'

const FILLED = '█'
const EMPTY = '░'

const readingWith = (overrides: {
  words?: number
  paragraph?: number
  sentence?: number
  grade?: number
  ease?: number
  seconds?: number
  isSmallSample?: boolean
}): StyleReading => ({
  stats: {
    words: overrides.words ?? 100,
    sentences: 5,
    paragraphs: 2,
    syllables: 140,
    letters: 400,
    polysyllables: 5,
    longestParagraphWords: overrides.paragraph ?? 40,
    longestSentenceWords: overrides.sentence ?? 15,
    codeWords: 0,
    tableWords: 0,
  },
  grades: {
    'flesch-kincaid': overrides.grade ?? 6,
    'gunning-fog': 10,
    smog: 11,
    'coleman-liau': 12,
    'automated-readability': 13,
  },
  readingEase: overrides.ease ?? 70,
  readSeconds: overrides.seconds ?? 30,
  isSmallSample: overrides.isSmallSample ?? false,
})

const withDials = (...ids: DialId[]): StyleSettings =>
  ids.reduce((settings, id) => setDialOn(settings, id, true), DEFAULT_SETTINGS)

const allOn = (): StyleSettings =>
  withDials('totalWords', 'readTime', 'paragraphWords', 'sentenceWords', 'gradeLevel', 'readingEase')

describe('dial specs', () => {
  test('keep the agreed order, defaults and ranges', () => {
    expect(DIAL_SPECS.map(spec => spec.id)).toEqual([
      'totalWords',
      'readTime',
      'paragraphWords',
      'sentenceWords',
      'gradeLevel',
      'readingEase',
    ])
    expect(DIAL_SPECS.map(spec => spec.defaultValue)).toEqual([300, 60, 60, 20, 8, 60])
    expect(dialSpec('gradeLevel').steps).toHaveLength(14)
    expect(dialSpec('gradeLevel').steps[0]).toBe(3)
    expect(dialSpec('readingEase').bound).toBe('min')
    expect(dialSpec('totalWords').bound).toBe('max')
  })

  test('define the read time dial', () => {
    const spec = dialSpec('readTime')
    expect(spec.label).toBe('Read time')
    expect(spec.shortLabel).toBe('read')
    expect(spec.bound).toBe('max')
    expect(spec.unit).toBe('seconds')
    expect(spec.defaultValue).toBe(60)
    expect(spec.steps).toEqual([10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 420, 600])
  })

  test('have a default value that sits on a step', () => {
    for (const spec of DIAL_SPECS) expect(spec.steps).toContain(spec.defaultValue)
  })

  test('start with every dial off', () => {
    expect(hasActiveDials(DEFAULT_SETTINGS)).toBe(false)
    expect(DEFAULT_SETTINGS.gradeFormula).toBe('flesch-kincaid')
    expect(DEFAULT_SETTINGS.dials.totalWords).toEqual({ isOn: false, value: 300 })
    expect(DEFAULT_SETTINGS.dials.readTime).toEqual({ isOn: false, value: 60 })
  })

  test('label every grade formula', () => {
    expect(GRADE_FORMULAS.map(formula => GRADE_FORMULA_LABELS[formula])).toEqual([
      'Flesch-Kincaid',
      'Gunning Fog',
      'SMOG',
      'Coleman-Liau',
      'ARI',
    ])
  })
})

describe('stepDial', () => {
  test('steps up to the next step and turns the dial on', () => {
    const stepped = stepDial(DEFAULT_SETTINGS, 'totalWords', 1)
    expect(stepped.dials.totalWords).toEqual({ isOn: true, value: 400 })
  })

  test('steps down to the previous step', () => {
    const stepped = stepDial(DEFAULT_SETTINGS, 'totalWords', -1)
    expect(stepped.dials.totalWords).toEqual({ isOn: true, value: 250 })
  })

  test('snaps an off-step value to the neighbouring step in that direction', () => {
    const off = { ...DEFAULT_SETTINGS, dials: { ...DEFAULT_SETTINGS.dials, totalWords: { isOn: false, value: 320 } } }
    expect(stepDial(off, 'totalWords', 1).dials.totalWords.value).toBe(400)
    expect(stepDial(off, 'totalWords', -1).dials.totalWords.value).toBe(300)
  })

  test('stops at the top end', () => {
    const top = setDialValue(DEFAULT_SETTINGS, 'gradeLevel', 16)
    expect(stepDial(top, 'gradeLevel', 1).dials.gradeLevel.value).toBe(16)
  })

  test('stops at the bottom end', () => {
    const bottom = setDialValue(DEFAULT_SETTINGS, 'sentenceWords', 8)
    expect(stepDial(bottom, 'sentenceWords', -1).dials.sentenceWords.value).toBe(8)
  })

  test('steps the read time dial through its seconds', () => {
    expect(stepDial(DEFAULT_SETTINGS, 'readTime', 1).dials.readTime).toEqual({ isOn: true, value: 90 })
    expect(stepDial(DEFAULT_SETTINGS, 'readTime', -1).dials.readTime).toEqual({ isOn: true, value: 45 })
    expect(stepDial(setDialValue(DEFAULT_SETTINGS, 'readTime', 600), 'readTime', 1).dials.readTime.value).toBe(600)
    expect(stepDial(setDialValue(DEFAULT_SETTINGS, 'readTime', 10), 'readTime', -1).dials.readTime.value).toBe(10)
  })

  test('leaves the other dials and the input untouched', () => {
    const stepped = stepDial(DEFAULT_SETTINGS, 'readingEase', 1)
    expect(stepped.dials.totalWords).toEqual(DEFAULT_SETTINGS.dials.totalWords)
    expect(DEFAULT_SETTINGS.dials.readingEase.isOn).toBe(false)
    expect(stepped.dials.readingEase.value).toBe(70)
  })
})

describe('toggles and setters', () => {
  test('toggleDial flips one dial and keeps its value', () => {
    const on = toggleDial(DEFAULT_SETTINGS, 'paragraphWords')
    expect(on.dials.paragraphWords).toEqual({ isOn: true, value: 60 })
    expect(toggleDial(on, 'paragraphWords').dials.paragraphWords.isOn).toBe(false)
  })

  test('setDialOn sets the state directly', () => {
    expect(setDialOn(DEFAULT_SETTINGS, 'gradeLevel', true).dials.gradeLevel.isOn).toBe(true)
    expect(setDialOn(allOn(), 'gradeLevel', false).dials.gradeLevel.isOn).toBe(false)
  })

  test('setDialValue clamps, rounds and turns the dial on', () => {
    expect(setDialValue(DEFAULT_SETTINGS, 'totalWords', 5).dials.totalWords).toEqual({ isOn: true, value: 25 })
    expect(setDialValue(DEFAULT_SETTINGS, 'totalWords', 99999).dials.totalWords.value).toBe(2000)
    expect(setDialValue(DEFAULT_SETTINGS, 'gradeLevel', 7.6).dials.gradeLevel.value).toBe(8)
    expect(setDialValue(DEFAULT_SETTINGS, 'gradeLevel', 7).dials.gradeLevel.isOn).toBe(true)
  })

  test('setDialValue clamps read time to its range', () => {
    expect(setDialValue(DEFAULT_SETTINGS, 'readTime', 5).dials.readTime).toEqual({ isOn: true, value: 10 })
    expect(setDialValue(DEFAULT_SETTINGS, 'readTime', 3600).dials.readTime.value).toBe(600)
    expect(setDialValue(DEFAULT_SETTINGS, 'readTime', 89.6).dials.readTime.value).toBe(90)
  })

  test('cycleGradeFormula walks the list and wraps', () => {
    let settings = DEFAULT_SETTINGS
    const seen = GRADE_FORMULAS.map(() => {
      settings = cycleGradeFormula(settings)
      return settings.gradeFormula
    })
    expect(seen).toEqual(['gunning-fog', 'smog', 'coleman-liau', 'automated-readability', 'flesch-kincaid'])
  })

  test('allDialsOff turns everything off and keeps values', () => {
    const tuned = setDialValue(allOn(), 'totalWords', 150)
    const off = allDialsOff(tuned)
    expect(hasActiveDials(off)).toBe(false)
    expect(off.dials.totalWords.value).toBe(150)
  })

  test('hasActiveDials sees a single dial', () => {
    expect(hasActiveDials(withDials('readingEase'))).toBe(true)
  })
})

describe('sanitizeSettings', () => {
  test('returns the defaults for garbage', () => {
    for (const garbage of [undefined, null, 5, 'text', [], true, () => 1]) {
      expect(sanitizeSettings(garbage)).toEqual(DEFAULT_SETTINGS)
    }
  })

  test('keeps valid fields and fills the rest from defaults', () => {
    const partial = { dials: { totalWords: { isOn: true, value: 150 } }, gradeFormula: 'smog' }
    const cleaned = sanitizeSettings(partial)
    expect(cleaned.dials.totalWords).toEqual({ isOn: true, value: 150 })
    expect(cleaned.dials.paragraphWords).toEqual({ isOn: false, value: 60 })
    expect(cleaned.gradeFormula).toBe('smog')
  })

  test('loads settings stored before read time existed with read time off at 60', () => {
    const stored = {
      dials: {
        totalWords: { isOn: true, value: 150 },
        paragraphWords: { isOn: false, value: 60 },
        sentenceWords: { isOn: true, value: 15 },
        gradeLevel: { isOn: false, value: 8 },
        readingEase: { isOn: false, value: 60 },
      },
      gradeFormula: 'smog',
    }
    const cleaned = sanitizeSettings(stored)
    expect(cleaned.dials.readTime).toEqual({ isOn: false, value: 60 })
    expect(cleaned.dials.totalWords).toEqual({ isOn: true, value: 150 })
    expect(cleaned.dials.sentenceWords).toEqual({ isOn: true, value: 15 })
    expect(cleaned.gradeFormula).toBe('smog')
  })

  test('keeps and clamps a stored read time', () => {
    expect(sanitizeSettings({ dials: { readTime: { isOn: true, value: 90 } } }).dials.readTime).toEqual({ isOn: true, value: 90 })
    expect(sanitizeSettings({ dials: { readTime: { isOn: true, value: 99999 } } }).dials.readTime.value).toBe(600)
    expect(sanitizeSettings({ dials: { readTime: { isOn: true, value: 1 } } }).dials.readTime.value).toBe(10)
  })

  test('clamps and rounds values', () => {
    const cleaned = sanitizeSettings({
      dials: {
        totalWords: { isOn: true, value: 1_000_000 },
        paragraphWords: { isOn: true, value: -4 },
        gradeLevel: { isOn: true, value: 9.4 },
      },
    })
    expect(cleaned.dials.totalWords.value).toBe(2000)
    expect(cleaned.dials.paragraphWords.value).toBe(15)
    expect(cleaned.dials.gradeLevel.value).toBe(9)
  })

  test('replaces bad values and flags', () => {
    const cleaned = sanitizeSettings({
      dials: {
        totalWords: { isOn: 'yes', value: 'lots' },
        sentenceWords: { isOn: true, value: Number.NaN },
        readingEase: 'broken',
        gradeLevel: { isOn: true, value: Number.POSITIVE_INFINITY },
      },
      gradeFormula: 'made-up',
    })
    expect(cleaned.dials.totalWords).toEqual({ isOn: false, value: 300 })
    expect(cleaned.dials.sentenceWords).toEqual({ isOn: true, value: 20 })
    expect(cleaned.dials.readingEase).toEqual({ isOn: false, value: 60 })
    expect(cleaned.dials.gradeLevel).toEqual({ isOn: true, value: 8 })
    expect(cleaned.gradeFormula).toBe('flesch-kincaid')
  })

  test('is stable on its own output', () => {
    const once = sanitizeSettings({ dials: { totalWords: { isOn: true, value: 77 } } })
    expect(sanitizeSettings(once)).toEqual(once)
  })
})

describe('measuredValue and findBreaches', () => {
  test('measuredValue reads the matching field', () => {
    const reading = readingWith({ words: 11, paragraph: 22, sentence: 33, ease: 44 })
    expect(measuredValue(reading, 'totalWords', 'smog')).toBe(11)
    expect(measuredValue(reading, 'paragraphWords', 'smog')).toBe(22)
    expect(measuredValue(reading, 'sentenceWords', 'smog')).toBe(33)
    expect(measuredValue(reading, 'gradeLevel', 'smog')).toBe(11)
    expect(measuredValue(reading, 'gradeLevel', 'automated-readability')).toBe(13)
    expect(measuredValue(reading, 'readingEase', 'smog')).toBe(44)
  })

  test('measuredValue reads the read seconds', () => {
    expect(measuredValue(readingWith({ seconds: 78 }), 'readTime', 'smog')).toBe(78)
  })

  test('a read time breaks only above its limit', () => {
    const settings = withDials('readTime')
    expect(findBreaches(settings, readingWith({ seconds: 60 }))).toEqual([])
    expect(findBreaches(settings, readingWith({ seconds: 61 }))).toEqual([
      { dial: 'readTime', measured: 61, limit: 60 },
    ])
  })

  test('a max dial breaks only above its limit', () => {
    const settings = withDials('totalWords')
    expect(findBreaches(settings, readingWith({ words: 300 }))).toEqual([])
    expect(findBreaches(settings, readingWith({ words: 301 }))).toEqual([
      { dial: 'totalWords', measured: 301, limit: 300 },
    ])
  })

  test('a min dial breaks only below its limit', () => {
    const settings = withDials('readingEase')
    expect(findBreaches(settings, readingWith({ ease: 60 }))).toEqual([])
    expect(findBreaches(settings, readingWith({ ease: 48 }))).toEqual([
      { dial: 'readingEase', measured: 48, limit: 60 },
    ])
  })

  test('ignores dials that are off', () => {
    const reading = readingWith({ words: 5000, paragraph: 900, sentence: 90, grade: 15, ease: 5 })
    expect(findBreaches(DEFAULT_SETTINGS, reading)).toEqual([])
    expect(findBreaches(withDials('sentenceWords'), reading).map(breach => breach.dial)).toEqual(['sentenceWords'])
  })

  test('uses the chosen grade formula', () => {
    const settings = { ...withDials('gradeLevel'), gradeFormula: 'gunning-fog' as const }
    const breaches = findBreaches(settings, readingWith({ grade: 2 }))
    expect(breaches).toEqual([{ dial: 'gradeLevel', measured: 10, limit: 8 }])
  })

  test('reports every breach in dial order', () => {
    const reading = readingWith({ words: 400, seconds: 200, paragraph: 90, sentence: 30, grade: 12, ease: 30 })
    expect(findBreaches(allOn(), reading).map(breach => breach.dial)).toEqual([
      'totalWords',
      'readTime',
      'paragraphWords',
      'sentenceWords',
      'gradeLevel',
      'readingEase',
    ])
  })
})

describe('sliderBar', () => {
  const totalWords = dialSpec('totalWords')

  test('is always the requested width', () => {
    for (const width of [1, 5, 12, 30]) {
      expect(sliderBar(totalWords, 300, width)).toHaveLength(width)
    }
  })

  test('has at least one cell for a width below one', () => {
    expect(sliderBar(totalWords, 300, 0)).toHaveLength(1)
    expect(sliderBar(totalWords, 300, -3)).toHaveLength(1)
  })

  test('fills one cell at the first step', () => {
    expect(sliderBar(totalWords, 25, 10)).toBe(FILLED + EMPTY.repeat(9))
  })

  test('fills every cell at the last step', () => {
    expect(sliderBar(totalWords, 2000, 10)).toBe(FILLED.repeat(10))
  })

  test('fills the middle by step index', () => {
    const grade = dialSpec('gradeLevel')
    const bar = sliderBar(grade, 9, 11)
    const filled = [...bar].filter(cell => cell === FILLED).length
    expect(bar).toHaveLength(11)
    expect(filled).toBe(Math.round(1 + (6 / 13) * 10))
  })

  test('uses step index, not the raw number', () => {
    const uneven = sliderBar(totalWords, 300, 14)
    const filled = [...uneven].filter(cell => cell === FILLED).length
    expect(filled).toBe(Math.round(1 + (7 / 13) * 13))
  })

  test('interpolates between steps and clamps outside the range', () => {
    const grade = dialSpec('gradeLevel')
    const low = [...sliderBar(grade, 3, 14)].filter(cell => cell === FILLED).length
    const between = [...sliderBar(grade, 3.5, 27)].filter(cell => cell === FILLED).length
    expect(low).toBe(1)
    expect(between).toBe(Math.round(1 + 0.5 * (1 / 13) * 26))
    expect(sliderBar(grade, 99, 6)).toBe(FILLED.repeat(6))
    expect(sliderBar(grade, 0, 6)).toBe(FILLED + EMPTY.repeat(5))
  })

  test('never fills fewer cells as the value grows', () => {
    const counts = totalWords.steps.map(step => [...sliderBar(totalWords, step, 20)].filter(cell => cell === FILLED).length)
    expect([...counts].sort((a, b) => a - b)).toEqual(counts)
  })
})

describe('formatDuration', () => {
  test('shows seconds under a minute', () => {
    expect(formatDuration(0)).toBe('0 sec')
    expect(formatDuration(10)).toBe('10 sec')
    expect(formatDuration(45)).toBe('45 sec')
    expect(formatDuration(59)).toBe('59 sec')
    expect(formatDuration(44.6)).toBe('45 sec')
  })

  test('shows minutes with at most one decimal and no trailing zero', () => {
    expect(formatDuration(60)).toBe('1 min')
    expect(formatDuration(90)).toBe('1.5 min')
    expect(formatDuration(78)).toBe('1.3 min')
    expect(formatDuration(120)).toBe('2 min')
    expect(formatDuration(600)).toBe('10 min')
  })

  test('rounds to a whole second before choosing the unit', () => {
    expect(formatDuration(59.6)).toBe('1 min')
    expect(formatDuration(59.4)).toBe('59 sec')
  })
})

describe('formatLimit', () => {
  test('formats each kind of dial', () => {
    expect(formatLimit(dialSpec('totalWords'), 300)).toBe('≤ 300 words')
    expect(formatLimit(dialSpec('paragraphWords'), 60)).toBe('≤ 60 words')
    expect(formatLimit(dialSpec('sentenceWords'), 20)).toBe('≤ 20 words')
    expect(formatLimit(dialSpec('gradeLevel'), 8)).toBe('≤ grade 8')
    expect(formatLimit(dialSpec('readingEase'), 60)).toBe('≥ 60 ease')
  })

  test('formats read time as a duration', () => {
    expect(formatLimit(dialSpec('readTime'), 60)).toBe('≤ 1 min')
    expect(formatLimit(dialSpec('readTime'), 45)).toBe('≤ 45 sec')
    expect(formatLimit(dialSpec('readTime'), 90)).toBe('≤ 1.5 min')
  })
})

describe('formatStatusLine', () => {
  test('is undefined when no dial is on', () => {
    expect(formatStatusLine(DEFAULT_SETTINGS, null)).toBeUndefined()
    expect(formatStatusLine(DEFAULT_SETTINGS, readingWith({}))).toBeUndefined()
  })

  test('lists only active dials', () => {
    const line = formatStatusLine(withDials('totalWords', 'paragraphWords', 'gradeLevel'), null)
    expect(line).toBe('style ≤300w · para ≤60 · grade ≤8 FK')
  })

  test('adds a tick when the last reply fit', () => {
    const line = formatStatusLine(withDials('totalWords'), readingWith({ words: 212 }))
    expect(line).toBe('style ≤300w · last 212w ✓')
  })

  test('names the broken dials', () => {
    const settings = withDials('totalWords', 'gradeLevel')
    const line = formatStatusLine(settings, readingWith({ words: 412, grade: 9.4 }))
    expect(line).toBe('style ≤300w · grade ≤8 FK · last 412w ✗ words, grade')
  })

  test('shows a compact read time tag', () => {
    const tagFor = (seconds: number): string | undefined =>
      formatStatusLine(setDialValue(DEFAULT_SETTINGS, 'readTime', seconds), null)
    expect(tagFor(60)).toBe('style read ≤1m')
    expect(tagFor(45)).toBe('style read ≤45s')
    expect(tagFor(90)).toBe('style read ≤1.5m')
    expect(tagFor(600)).toBe('style read ≤10m')
  })

  test('puts read time after words and names it when broken', () => {
    const settings = withDials('totalWords', 'readTime')
    expect(formatStatusLine(settings, null)).toBe('style ≤300w · read ≤1m')
    const line = formatStatusLine(settings, readingWith({ words: 250, seconds: 80 }))
    expect(line).toBe('style ≤300w · read ≤1m · last 250w ✗ read')
  })

  test('shows the formula tag', () => {
    const settings = { ...withDials('gradeLevel'), gradeFormula: 'coleman-liau' as const }
    expect(formatStatusLine(settings, null)).toContain('grade ≤8 CLI')
  })
})

describe('composeTargetsSection', () => {
  test('is null when every dial is off', () => {
    expect(composeTargetsSection(DEFAULT_SETTINGS)).toBeNull()
  })

  test('starts with the title and explains the sliders', () => {
    const text = composeTargetsSection(withDials('totalWords')) ?? ''
    expect(text.split('\n')[0]).toBe('Output style sliders')
    expect(text).toContain('with sliders')
    expect(text).toContain('every reply you write to the person in chat')
    expect(text).toContain('measures each reply after you send it')
  })

  test('names each active limit', () => {
    const text = composeTargetsSection(allOn()) ?? ''
    expect(text).toContain('Total length: at most 300 words.')
    expect(text).toContain('Paragraphs: at most 60 words each. Each list item counts as its own paragraph.')
    expect(text).toContain('Sentences: at most 20 words each.')
    expect(text).toContain('Grade level: 8 or lower on the Flesch-Kincaid scale. Use short sentences and words of one or two syllables.')
    expect(text).toContain('Reading ease: a Flesch Reading Ease score of 60 or higher (higher is easier). Short sentences and short words raise it.')
  })

  test('describes the read time limit in plain sentences', () => {
    const text = composeTargetsSection(withDials('readTime')) ?? ''
    expect(text).toContain(
      '- Read time: a person should be able to read your reply in 1 min or less. That is about 240 words of plain prose. Long words take longer, and code and tables count too: code reads at about half speed.',
    )
  })

  test('turns the read time limit into a duration and a rounded word estimate', () => {
    const at = (seconds: number): string => composeTargetsSection(setDialValue(DEFAULT_SETTINGS, 'readTime', seconds)) ?? ''
    expect(at(45)).toContain('in 45 sec or less. That is about 180 words of plain prose.')
    expect(at(90)).toContain('in 1.5 min or less. That is about 360 words of plain prose.')
    expect(at(10)).toContain('in 10 sec or less. That is about 40 words of plain prose.')
    expect(at(600)).toContain('in 10 min or less. That is about 2380 words of plain prose.')
  })

  test('lists the read time bullet in dial order', () => {
    const lines = (composeTargetsSection(allOn()) ?? '').split('\n')
    const bullets = lines.filter(line => line.startsWith('- ')).map(line => line.split(':')[0])
    expect(bullets).toEqual(['- Total length', '- Read time', '- Paragraphs', '- Sentences', '- Grade level', '- Reading ease'])
  })

  test('says code and tables count toward read time only when read time is on', () => {
    const on = composeTargetsSection(withDials('readTime')) ?? ''
    expect(on).toContain(
      'Everything you write to the person counts, including headings, list items, bold labels and link text. Code blocks, inline code, URLs and tables are not counted toward the word, paragraph, sentence, grade and ease limits. Code and tables do count toward read time, but URLs never do. Keep URLs exact. Keep any code you include exact, but you may shorten or drop code and tables to fit the read time.',
    )
    const off = composeTargetsSection(withDials('totalWords')) ?? ''
    expect(off).toContain(
      'Everything you write to the person counts, including headings, list items, bold labels and link text. Code blocks, inline code, URLs and tables are not counted. Keep code, URLs and tables complete and exact.',
    )
    expect(off).not.toContain('read time')
    expect(off).not.toContain('Read time')
  })

  test('keeps every other rule line when read time is on', () => {
    const text = composeTargetsSection(allOn()) ?? ''
    expect(text).toContain('aim about 15 percent below each maximum')
    expect(text).toContain('Never drop a fact the person needs')
    expect(text).toContain('If you are a subagent, ignore these limits')
  })

  test('leaves out dials that are off', () => {
    const text = composeTargetsSection(withDials('sentenceWords')) ?? ''
    expect(text).toContain('Sentences: at most 20 words each.')
    expect(text).not.toContain('Read time')
    expect(text).not.toContain('Total length')
    expect(text).not.toContain('Grade level')
    expect(text).not.toContain('Reading ease')
    expect(text).not.toContain('Paragraphs')
  })

  test('gives a hint that matches the chosen formula', () => {
    const smog = composeTargetsSection({ ...withDials('gradeLevel'), gradeFormula: 'smog' }) ?? ''
    expect(smog).toContain('Grade level: 8 or lower on the SMOG scale. Avoid words of three or more syllables.')
    const ari = composeTargetsSection({ ...withDials('gradeLevel'), gradeFormula: 'automated-readability' }) ?? ''
    expect(ari).toContain('on the ARI scale. Use short words.')
  })

  test('uses the chosen formula and the set values', () => {
    const settings = setDialValue({ ...DEFAULT_SETTINGS, gradeFormula: 'gunning-fog' }, 'gradeLevel', 6)
    expect(composeTargetsSection(settings)).toContain('Grade level: 6 or lower on the Gunning Fog scale.')
  })

  test('says what is counted, what must not be lost and what is out of scope', () => {
    const text = composeTargetsSection(withDials('totalWords')) ?? ''
    expect(text).toContain('including headings, list items, bold labels and link text')
    expect(text).not.toContain('Only prose is counted')
    expect(text).toContain('Code blocks, inline code, URLs and tables are not counted')
    expect(text).toContain('complete and exact')
    expect(text).toContain('aim about 15 percent below each maximum')
    expect(text).toContain('Do not mention the limits or your word count unless the person asks')
    expect(text).toContain('Never drop a fact the person needs')
    expect(text).toContain('give the most important part and offer to continue')
    expect(text).toContain('tool inputs, files, code or commit messages')
    expect(text).toContain('If you are a subagent, ignore these limits')
  })

  test('does not depend on any measurement', () => {
    const settings = withDials('totalWords', 'gradeLevel')
    expect(composeTargetsSection(settings)).toBe(composeTargetsSection(settings))
    expect(composeTargetsSection(settings)).not.toContain('Last reply')
  })
})

describe('composeTurnContext', () => {
  test('is null when every dial is off', () => {
    expect(composeTurnContext(DEFAULT_SETTINGS, null)).toBeNull()
    expect(composeTurnContext(DEFAULT_SETTINGS, readingWith({}))).toBeNull()
  })

  test('is a single line of limits without a last reading', () => {
    const text = composeTurnContext(withDials('totalWords', 'gradeLevel'), null) ?? ''
    expect(text.split('\n')).toHaveLength(1)
    expect(text).toContain('total at most 300 words')
    expect(text).toContain('grade 8 or lower (Flesch-Kincaid)')
    expect(text).not.toContain('Last reply')
  })

  test('says the last reply fit when nothing broke', () => {
    const settings = withDials('totalWords', 'paragraphWords')
    const text = composeTurnContext(settings, readingWith({ words: 212, paragraph: 40 })) ?? ''
    const lines = text.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('212 words')
    expect(lines[1]).toContain('longest paragraph 40 words')
    expect(lines[1]).toContain('It fit every limit.')
    expect(lines[1]).not.toContain('Over')
  })

  test('lists each broken limit with measured and limit', () => {
    const settings = withDials('totalWords', 'gradeLevel')
    const text = composeTurnContext(settings, readingWith({ words: 412, grade: 9.4 })) ?? ''
    expect(text).toContain('Over: 412 words (limit 300); grade 9.4 (limit 8).')
    expect(text).toContain('Use shorter sentences and plainer words. Aim to fit every limit this time.')
    expect(text).not.toContain('Write this reply tighter.')
    expect(text).not.toContain('It fit every limit.')
  })

  test('closes a length breach without the score hint', () => {
    const text = composeTurnContext(withDials('totalWords'), readingWith({ words: 412 })) ?? ''
    expect(text).toContain('Over: 412 words (limit 300). Aim to fit every limit this time.')
    expect(text).not.toContain('plainer words')
  })

  test('puts a broken reading ease limit under Under', () => {
    const text = composeTurnContext(withDials('readingEase'), readingWith({ ease: 48 })) ?? ''
    expect(text).toContain('Under: reading ease 48.0 (limit 60).')
  })

  test('lists read time in the limits and the last reading', () => {
    const settings = withDials('readTime')
    const limits = composeTurnContext(settings, null) ?? ''
    expect(limits).toBe('Style limits for this reply: read time 1 min or less.')
    const fit = composeTurnContext(settings, readingWith({ seconds: 45 })) ?? ''
    expect(fit).toContain('Last reply: read time 45 sec. It fit every limit.')
  })

  test('reports a read time breach as a duration', () => {
    const text = composeTurnContext(withDials('readTime'), readingWith({ seconds: 78 })) ?? ''
    expect(text).toContain('Over: read time 1.3 min (limit 1 min). Aim to fit every limit this time.')
    expect(text).not.toContain('plainer words')
    const seconds = composeTurnContext(setDialValue(DEFAULT_SETTINGS, 'readTime', 30), readingWith({ seconds: 42 })) ?? ''
    expect(seconds).toContain('Over: read time 42 sec (limit 30 sec).')
  })

  test('a small sample does not drop read time', () => {
    const small = readingWith({ isSmallSample: true, seconds: 120, grade: 20 })
    const text = composeTurnContext(withDials('readTime', 'gradeLevel'), small) ?? ''
    expect(text).toContain('Over: read time 2 min (limit 1 min).')
    expect(text).not.toContain('grade 20')
    const only = composeTurnContext(withDials('readTime'), small) ?? ''
    expect(only).toContain('Over: read time 2 min (limit 1 min).')
    expect(only).not.toContain('Do not adjust for them.')
  })

  test('only reports the active dials in the last reading', () => {
    const text = composeTurnContext(withDials('totalWords'), readingWith({ words: 90, grade: 14 })) ?? ''
    expect(text).not.toContain('grade')
  })

  test('explains a small sample only when a grade or ease dial is on', () => {
    const small = readingWith({ isSmallSample: true })
    const note = 'Your last reply was short, so its grade and reading ease are rough. Do not adjust for them.'
    expect(composeTurnContext(withDials('gradeLevel'), small)).toContain(note)
    expect(composeTurnContext(withDials('readingEase'), small)).toContain(note)
    expect(composeTurnContext(withDials('totalWords'), small)).not.toContain(note)
    expect(composeTurnContext(withDials('gradeLevel'), readingWith({}))).not.toContain(note)
    expect(composeTurnContext(withDials('gradeLevel'), small)).not.toContain('(small sample)')
  })

  test('a small sample leaves score breaches out of the verdict but keeps length breaches', () => {
    const small = readingWith({ isSmallSample: true, words: 400, grade: 20, ease: 5 })
    const scoresOnly = composeTurnContext(withDials('gradeLevel', 'readingEase'), small) ?? ''
    expect(scoresOnly).not.toContain('Over: grade')
    expect(scoresOnly).not.toContain('Under: reading ease')
    expect(scoresOnly).not.toContain('Aim to fit every limit this time.')
    expect(scoresOnly).toContain('Do not adjust for them.')
    const mixed = composeTurnContext(withDials('totalWords', 'gradeLevel'), small) ?? ''
    expect(mixed).toContain('Over: 400 words (limit 300).')
    expect(mixed).not.toContain('Over: 400 words (limit 300); grade')
    expect(mixed).not.toContain('plainer words')
    expect(mixed).toContain('Aim to fit every limit this time.')
  })
})

describe('composeRevisionPrompt', () => {
  test('lists each breach and every active limit', () => {
    const settings = withDials('totalWords', 'sentenceWords', 'gradeLevel')
    const text = composeRevisionPrompt(settings, readingWith({ words: 412, sentence: 31, grade: 6 }))
    expect(text).toContain('rewrite your previous reply')
    expect(text).toContain('- 412 words (limit 300)')
    expect(text).toContain('- longest sentence 31 words (limit 20)')
    expect(text).not.toContain('- grade 6.0 (limit 8)')
    expect(text).toContain('Total length: at most 300 words.')
    expect(text).toContain('Sentences: at most 20 words each.')
    expect(text).toContain('Grade level: 8 or lower')
    expect(text).not.toContain('Paragraphs')
  })

  test('names a read time breach and states the read time limit', () => {
    const text = composeRevisionPrompt(withDials('readTime'), readingWith({ seconds: 78 }))
    expect(text).toContain('- read time 1.3 min (limit 1 min)')
    expect(text).toContain('Read time: a person should be able to read your reply in 1 min or less.')
  })

  test('keeps a read time breach visible when rounded durations match the limit', () => {
    const reading = readingWith({ seconds: 62 })
    const [breach] = findBreaches(withDials('readTime'), reading)
    const phrase = breachPhrase(breach as Breach)
    const text = composeRevisionPrompt(withDials('readTime'), reading)

    expect(phrase).toBe('read time 62 sec (limit 1 min)')
    expect(text).toContain('62 sec')
    expect(text).not.toContain('1 min (limit 1 min)')
  })

  test('says to keep the needed facts and leave code unchanged', () => {
    const text = composeRevisionPrompt(withDials('totalWords'), readingWith({ words: 900 }))
    expect(text).toContain('Keep the facts I need. If they cannot all fit, keep the most important part and offer to continue.')
    expect(text).not.toContain('Keep every fact')
    expect(text).toContain('Leave code')
    expect(text).toContain('unchanged')
  })

  test('lets code and tables be trimmed only when read time is on', () => {
    const withReadTime = composeRevisionPrompt(withDials('readTime'), readingWith({ seconds: 78 }))
    const withoutReadTime = composeRevisionPrompt(withDials('totalWords'), readingWith({ words: 900 }))
    expect(withReadTime).toContain('you may shorten or drop them')
    expect(withReadTime).not.toContain('Leave code, inline code, URLs and tables unchanged.')
    expect(withoutReadTime).toContain('Leave code, inline code, URLs and tables unchanged.')
    expect(withoutReadTime).not.toContain('you may shorten or drop them')
  })

  test('still reads sensibly when nothing broke', () => {
    const text = composeRevisionPrompt(withDials('totalWords'), readingWith({ words: 10 }))
    expect(text).toContain('No limit was broken')
    expect(text).toContain('Total length: at most 300 words.')
  })
})

describe('describeSettings', () => {
  test('shows every dial with its state and limit', () => {
    const text = describeSettings(setDialOn(DEFAULT_SETTINGS, 'totalWords', true), null)
    expect(text).toContain('Total words: on, ≤ 300 words')
    expect(text).toContain('Read time: off, ≤ 1 min')
    expect(text).toContain('Paragraph words: off, ≤ 60 words')
    expect(text).toContain('Sentence words: off, ≤ 20 words')
    expect(text).toContain('Grade level: off, ≤ grade 8')
    expect(text).toContain('Reading ease: off, ≥ 60 ease')
    expect(text).toContain('Grade formula: Flesch-Kincaid')
  })

  test('says when no reply was measured', () => {
    expect(describeSettings(DEFAULT_SETTINGS, null)).toContain('No reply measured yet.')
  })

  test('shows the last reading under the chosen formula', () => {
    const settings = { ...DEFAULT_SETTINGS, gradeFormula: 'smog' as const }
    const text = describeSettings(settings, readingWith({ words: 212, paragraph: 55, sentence: 18, ease: 64.25 }))
    expect(text).toContain('Words: 212')
    expect(text).toContain('Read time: 30 sec')
    expect(text).toContain('Longest paragraph: 55 words')
    expect(text).toContain('Longest sentence: 18 words')
    expect(text).toContain('Grade level (SMOG): 11.0')
    expect(text).toContain('Reading ease: 64.3')
    expect(text).not.toContain('No reply measured yet.')
    expect(text).not.toContain('rough')
  })

  test('shows the last read time as a duration', () => {
    expect(describeSettings(DEFAULT_SETTINGS, readingWith({ seconds: 78 }))).toContain('  Read time: 1.3 min')
    expect(describeSettings(setDialValue(DEFAULT_SETTINGS, 'readTime', 90), null)).toContain('Read time: on, ≤ 1.5 min')
  })

  test('notes a small sample', () => {
    const text = describeSettings(DEFAULT_SETTINGS, readingWith({ isSmallSample: true }))
    expect(text).toContain('rough')
  })
})

describe('parseSlidersCommand', () => {
  test('opens the pane for empty input', () => {
    expect(parseSlidersCommand('')).toEqual({ kind: 'open' })
    expect(parseSlidersCommand('   ')).toEqual({ kind: 'open' })
  })

  test('parses the single word commands', () => {
    expect(parseSlidersCommand('show')).toEqual({ kind: 'show' })
    expect(parseSlidersCommand('status')).toEqual({ kind: 'show' })
    expect(parseSlidersCommand('reset')).toEqual({ kind: 'reset' })
    expect(parseSlidersCommand('off')).toEqual({ kind: 'all-off' })
    expect(parseSlidersCommand('help')).toEqual({ kind: 'help' })
  })

  test('ignores case and extra spaces', () => {
    expect(parseSlidersCommand('  SHOW  ')).toEqual({ kind: 'show' })
    expect(parseSlidersCommand('  Words    250 ')).toEqual({ kind: 'set', dial: 'totalWords', value: 250 })
    expect(parseSlidersCommand('GRADE  ON')).toEqual({ kind: 'switch', dial: 'gradeLevel', isOn: true })
  })

  test('sets a value for every dial alias', () => {
    const aliases: [string, DialId][] = [
      ['words', 'totalWords'],
      ['total', 'totalWords'],
      ['length', 'totalWords'],
      ['read', 'readTime'],
      ['readtime', 'readTime'],
      ['read-time', 'readTime'],
      ['time', 'readTime'],
      ['paragraph', 'paragraphWords'],
      ['paragraphs', 'paragraphWords'],
      ['para', 'paragraphWords'],
      ['sentence', 'sentenceWords'],
      ['sentences', 'sentenceWords'],
      ['grade', 'gradeLevel'],
      ['level', 'gradeLevel'],
      ['ease', 'readingEase'],
      ['readability', 'readingEase'],
      ['flesch', 'readingEase'],
    ]
    for (const [alias, dial] of aliases) {
      expect(parseSlidersCommand(`${alias} 40`)).toEqual({ kind: 'set', dial, value: 40 })
    }
  })

  test('parses read time with and without a unit', () => {
    const cases: [string, number][] = [
      ['read 90', 90],
      ['read 45s', 45],
      ['read 45 sec', 45],
      ['read 45 secs', 45],
      ['read 45 second', 45],
      ['read 45 seconds', 45],
      ['read 2m', 120],
      ['read 2 m', 120],
      ['read 2 min', 120],
      ['read 2 mins', 120],
      ['read 2 minute', 120],
      ['read 2 minutes', 120],
      ['read 1.5m', 90],
      ['read 1.5 minutes', 90],
      ['read 0.5m', 30],
      ['Read-Time   45S', 45],
      ['time 3 MIN', 180],
      ['readtime 5s', 5],
    ]
    for (const [input, value] of cases) {
      expect(parseSlidersCommand(input)).toEqual({ kind: 'set', dial: 'readTime', value })
    }
  })

  test('switches read time on or off', () => {
    expect(parseSlidersCommand('read on')).toEqual({ kind: 'switch', dial: 'readTime', isOn: true })
    expect(parseSlidersCommand('read off')).toEqual({ kind: 'switch', dial: 'readTime', isOn: false })
    expect(parseSlidersCommand('time ON')).toEqual({ kind: 'switch', dial: 'readTime', isOn: true })
  })

  test('rejects an invalid read time unit or shape', () => {
    const bad = ['read 5 hours', 'read 1h', 'read 45x', 'read 2 min extra', 'read min', 'read 1 2', 'read -5s', 'read 1e3', 'read 45 constructor', 'read 5 on']
    for (const input of bad) {
      const command = parseSlidersCommand(input)
      expect(command.kind).toBe('error')
      if (command.kind === 'error') expect(command.message).toContain(SLIDERS_USAGE)
    }
  })

  test('rejects a unit on a dial that is not a time', () => {
    const bad = ['words 45s', 'words 45 sec', 'words 2m', 'para 2 min', 'grade 8 s', 'ease 60m', 'sentence 10 words']
    for (const input of bad) expect(parseSlidersCommand(input).kind).toBe('error')
  })

  test('other dials still take a bare number only', () => {
    expect(parseSlidersCommand('words 250')).toEqual({ kind: 'set', dial: 'totalWords', value: 250 })
    expect(parseSlidersCommand('grade 7.5')).toEqual({ kind: 'set', dial: 'gradeLevel', value: 7.5 })
  })

  test('switches a dial on or off', () => {
    expect(parseSlidersCommand('para on')).toEqual({ kind: 'switch', dial: 'paragraphWords', isOn: true })
    expect(parseSlidersCommand('ease off')).toEqual({ kind: 'switch', dial: 'readingEase', isOn: false })
  })

  test('picks a grade formula by every alias', () => {
    const aliases: [string, string][] = [
      ['fk', 'flesch-kincaid'],
      ['flesch-kincaid', 'flesch-kincaid'],
      ['kincaid', 'flesch-kincaid'],
      ['fog', 'gunning-fog'],
      ['gunning-fog', 'gunning-fog'],
      ['gunning', 'gunning-fog'],
      ['smog', 'smog'],
      ['cli', 'coleman-liau'],
      ['coleman-liau', 'coleman-liau'],
      ['coleman', 'coleman-liau'],
      ['ari', 'automated-readability'],
      ['automated-readability', 'automated-readability'],
    ]
    for (const [alias, formula] of aliases) {
      expect(parseSlidersCommand(`formula ${alias}`)).toEqual({ kind: 'formula', formula })
    }
  })

  test('returns an error with the usage for anything else', () => {
    const bad = ['banana', 'words', 'words lots', 'words -5', 'words 10 20', 'formula', 'formula nope', 'show me', 'constructor 5', 'toString']
    for (const input of bad) {
      const command = parseSlidersCommand(input)
      expect(command.kind).toBe('error')
      if (command.kind === 'error') expect(command.message).toContain(SLIDERS_USAGE)
    }
  })

  test('the error message repeats what was typed', () => {
    const command = parseSlidersCommand('Banana split')
    expect(command.kind === 'error' && command.message.includes('Banana split')).toBe(true)
  })

  test('the usage describes read time and lists the read dial', () => {
    expect(SLIDERS_USAGE).toContain('/sliders read <time> - set the read time limit, like 45s, 90 or 2m')
    expect(SLIDERS_USAGE).toContain('Dials: words, read, paragraph, sentence, grade, ease')
  })

  test('the usage lists every command form on its own line', () => {
    const lines = SLIDERS_USAGE.split('\n')
    for (const form of ['/sliders show', '<dial> <number>', '/sliders read <time>', '<dial> on|off', 'formula <name>', '/sliders off', '/sliders reset', '/sliders help']) {
      expect(lines.some(line => line.includes(form))).toBe(true)
    }
  })
})

describe('applySlidersCommand', () => {
  test('set clamps, rounds and turns the dial on', () => {
    const next = applySlidersCommand(DEFAULT_SETTINGS, { kind: 'set', dial: 'totalWords', value: 120 })
    expect(next.dials.totalWords).toEqual({ isOn: true, value: 120 })
    const clamped = applySlidersCommand(DEFAULT_SETTINGS, { kind: 'set', dial: 'gradeLevel', value: 40 })
    expect(clamped.dials.gradeLevel.value).toBe(16)
  })

  test('a read time command sets whole seconds and clamps', () => {
    const minutes = applySlidersCommand(DEFAULT_SETTINGS, parseSlidersCommand('read 1.5m'))
    expect(minutes.dials.readTime).toEqual({ isOn: true, value: 90 })
    const tooShort = applySlidersCommand(DEFAULT_SETTINGS, parseSlidersCommand('read 5s'))
    expect(tooShort.dials.readTime.value).toBe(10)
    const tooLong = applySlidersCommand(DEFAULT_SETTINGS, parseSlidersCommand('read 60m'))
    expect(tooLong.dials.readTime.value).toBe(600)
  })

  test('switch changes only the state', () => {
    const on = applySlidersCommand(DEFAULT_SETTINGS, { kind: 'switch', dial: 'readingEase', isOn: true })
    expect(on.dials.readingEase).toEqual({ isOn: true, value: 60 })
    const off = applySlidersCommand(on, { kind: 'switch', dial: 'readingEase', isOn: false })
    expect(off.dials.readingEase.isOn).toBe(false)
  })

  test('formula changes the grade formula', () => {
    const next = applySlidersCommand(DEFAULT_SETTINGS, { kind: 'formula', formula: 'smog' })
    expect(next.gradeFormula).toBe('smog')
  })

  test('reset restores the defaults', () => {
    const tuned = setDialValue(allOn(), 'totalWords', 75)
    expect(applySlidersCommand(tuned, { kind: 'reset' })).toEqual(DEFAULT_SETTINGS)
  })

  test('all-off turns dials off and keeps values and formula', () => {
    const tuned = { ...setDialValue(allOn(), 'totalWords', 75), gradeFormula: 'smog' as const }
    const off = applySlidersCommand(tuned, { kind: 'all-off' })
    expect(hasActiveDials(off)).toBe(false)
    expect(off.dials.totalWords.value).toBe(75)
    expect(off.gradeFormula).toBe('smog')
  })

  test('open, show, help and error leave the settings unchanged', () => {
    const tuned = allOn()
    for (const command of [
      { kind: 'open' },
      { kind: 'show' },
      { kind: 'help' },
      { kind: 'error', message: 'nope' },
    ] as const) {
      expect(applySlidersCommand(tuned, command)).toBe(tuned)
    }
  })

  test('a parsed command round trips through apply', () => {
    const next = applySlidersCommand(DEFAULT_SETTINGS, parseSlidersCommand('paragraph 30'))
    expect(next.dials.paragraphWords).toEqual({ isOn: true, value: 30 })
  })
})
