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
  composeRevisionPrompt,
  composeTargetsSection,
  composeTurnContext,
  cycleGradeFormula,
  describeSettings,
  dialSpec,
  findBreaches,
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

const FILLED = '█'
const EMPTY = '░'

const readingWith = (overrides: {
  words?: number
  paragraph?: number
  sentence?: number
  grade?: number
  ease?: number
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
  },
  grades: {
    'flesch-kincaid': overrides.grade ?? 6,
    'gunning-fog': 10,
    smog: 11,
    'coleman-liau': 12,
    'automated-readability': 13,
  },
  readingEase: overrides.ease ?? 70,
  isSmallSample: overrides.isSmallSample ?? false,
})

const withDials = (...ids: DialId[]): StyleSettings =>
  ids.reduce((settings, id) => setDialOn(settings, id, true), DEFAULT_SETTINGS)

const allOn = (): StyleSettings =>
  withDials('totalWords', 'paragraphWords', 'sentenceWords', 'gradeLevel', 'readingEase')

describe('dial specs', () => {
  test('keep the agreed order, defaults and ranges', () => {
    expect(DIAL_SPECS.map(spec => spec.id)).toEqual([
      'totalWords',
      'paragraphWords',
      'sentenceWords',
      'gradeLevel',
      'readingEase',
    ])
    expect(DIAL_SPECS.map(spec => spec.defaultValue)).toEqual([300, 60, 20, 8, 60])
    expect(dialSpec('gradeLevel').steps).toHaveLength(14)
    expect(dialSpec('gradeLevel').steps[0]).toBe(3)
    expect(dialSpec('readingEase').bound).toBe('min')
    expect(dialSpec('totalWords').bound).toBe('max')
  })

  test('have a default value that sits on a step', () => {
    for (const spec of DIAL_SPECS) expect(spec.steps).toContain(spec.defaultValue)
  })

  test('start with every dial off', () => {
    expect(hasActiveDials(DEFAULT_SETTINGS)).toBe(false)
    expect(DEFAULT_SETTINGS.gradeFormula).toBe('flesch-kincaid')
    expect(DEFAULT_SETTINGS.dials.totalWords).toEqual({ isOn: false, value: 300 })
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
    const reading = readingWith({ words: 400, paragraph: 90, sentence: 30, grade: 12, ease: 30 })
    expect(findBreaches(allOn(), reading).map(breach => breach.dial)).toEqual([
      'totalWords',
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

describe('formatLimit', () => {
  test('formats each kind of dial', () => {
    expect(formatLimit(dialSpec('totalWords'), 300)).toBe('≤ 300 words')
    expect(formatLimit(dialSpec('paragraphWords'), 60)).toBe('≤ 60 words')
    expect(formatLimit(dialSpec('sentenceWords'), 20)).toBe('≤ 20 words')
    expect(formatLimit(dialSpec('gradeLevel'), 8)).toBe('≤ grade 8')
    expect(formatLimit(dialSpec('readingEase'), 60)).toBe('≥ 60 ease')
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
    expect(text).toContain('Grade level: 8 or lower on the Flesch-Kincaid scale. Use short sentences and short, common words.')
    expect(text).toContain('Reading ease: a Flesch Reading Ease score of 60 or higher (higher is easier).')
  })

  test('leaves out dials that are off', () => {
    const text = composeTargetsSection(withDials('sentenceWords')) ?? ''
    expect(text).toContain('Sentences: at most 20 words each.')
    expect(text).not.toContain('Total length')
    expect(text).not.toContain('Grade level')
    expect(text).not.toContain('Reading ease')
    expect(text).not.toContain('Paragraphs')
  })

  test('uses the chosen formula and the set values', () => {
    const settings = setDialValue({ ...DEFAULT_SETTINGS, gradeFormula: 'gunning-fog' }, 'gradeLevel', 6)
    expect(composeTargetsSection(settings)).toContain('Grade level: 6 or lower on the Gunning Fog scale.')
  })

  test('says what is counted, what must not be lost and what is out of scope', () => {
    const text = composeTargetsSection(withDials('totalWords')) ?? ''
    expect(text).toContain('Code blocks, inline code, URLs and tables are not counted')
    expect(text).toContain('complete and exact')
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
    expect(text).toContain('Write this reply tighter.')
    expect(text).not.toContain('It fit every limit.')
  })

  test('puts a broken reading ease limit under Under', () => {
    const text = composeTurnContext(withDials('readingEase'), readingWith({ ease: 48 })) ?? ''
    expect(text).toContain('Under: reading ease 48.0 (limit 60).')
  })

  test('only reports the active dials in the last reading', () => {
    const text = composeTurnContext(withDials('totalWords'), readingWith({ words: 90, grade: 14 })) ?? ''
    expect(text).not.toContain('grade')
  })

  test('adds the small sample note only when a grade or ease dial is on', () => {
    const small = readingWith({ isSmallSample: true })
    expect(composeTurnContext(withDials('gradeLevel'), small)).toContain('(small sample)')
    expect(composeTurnContext(withDials('readingEase'), small)).toContain('(small sample)')
    expect(composeTurnContext(withDials('totalWords'), small)).not.toContain('(small sample)')
    expect(composeTurnContext(withDials('gradeLevel'), readingWith({}))).not.toContain('(small sample)')
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

  test('says to keep every fact and leave code unchanged', () => {
    const text = composeRevisionPrompt(withDials('totalWords'), readingWith({ words: 900 }))
    expect(text).toContain('Keep every fact')
    expect(text).toContain('Leave code')
    expect(text).toContain('unchanged')
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
    expect(text).toContain('Longest paragraph: 55 words')
    expect(text).toContain('Longest sentence: 18 words')
    expect(text).toContain('Grade level (SMOG): 11.0')
    expect(text).toContain('Reading ease: 64.3')
    expect(text).not.toContain('No reply measured yet.')
    expect(text).not.toContain('rough')
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

  test('the usage lists every command form on its own line', () => {
    const lines = SLIDERS_USAGE.split('\n')
    for (const form of ['/sliders show', '<dial> <number>', '<dial> on|off', 'formula <name>', '/sliders off', '/sliders reset', '/sliders help']) {
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
