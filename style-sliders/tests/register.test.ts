import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { DEFAULT_SETTINGS, DIAL_SPECS, dialSpec, formatLimit } from '../hooks/dials'
import { measureText } from '../hooks/metrics'
import type { StyleReading, StyleSettings } from '../types'

const SURFACES = ['terminal', 'desktop'] as const
const PLUGIN = 'style-sliders'
const PANE_ID = 'style-sliders'

const PANE_PROPS = {
  title: 'Output style',
  isFocused: true,
  bodyColumns: 80,
  placement: 'inline',
  scroll: { offset: 0, bodyRows: 20 },
  view: {},
} as const

const SHORT_SENTENCE = 'This is a plain sentence about nothing much.'
const LONG_ANSWER = Array.from({ length: 6 }, () => SHORT_SENTENCE).join(' ')
const CODE_TOKEN_COUNT = 120
const CODE_LINE = Array.from({ length: CODE_TOKEN_COUNT }, (_, index) => `token${index}`).join(' ')
const CODE_ANSWER = `${LONG_ANSWER}\n\n\`\`\`ts\n${CODE_LINE}\n\`\`\``
const LIMIT_WIDTH = 13

const STALE_READING = {
  stats: {
    words: 48,
    sentences: 6,
    paragraphs: 1,
    syllables: 78,
    letters: 190,
    polysyllables: 0,
    longestParagraphWords: 48,
    longestSentenceWords: 8,
  },
  grades: {
    'flesch-kincaid': 3,
    'gunning-fog': 4,
    smog: 5,
    'coleman-liau': 6,
    'automated-readability': 2,
  },
  readingEase: 90,
  isSmallSample: false,
} as const

const OLD_SHAPE_SETTINGS = {
  gradeFormula: 'flesch-kincaid',
  dials: {
    totalWords: { isOn: true, value: 150 },
    paragraphWords: { isOn: false, value: 80 },
    sentenceWords: { isOn: false, value: 20 },
    gradeLevel: { isOn: false, value: 8 },
    readingEase: { isOn: false, value: 60 },
  },
} as const

type Submitted = { text: string; context: readonly string[] | undefined; asUser: boolean }

type World = {
  statuses: (string | undefined)[]
  toasts: string[]
  submitted: Submitted[]
  closed: string[]
  opened: { id: string; focus?: true; rows?: number; columns?: number }[]
  stored: Map<string, unknown>
  settings: () => StyleSettings
  last: () => StyleReading | null
}

const buildWorld = (
  on: On,
  entries: Record<string, unknown> = {},
  storedLast?: unknown,
  storedSettings?: unknown,
): World => {
  const stored = new Map<string, unknown>(Object.entries(entries))
  let settings: StyleSettings = DEFAULT_SETTINGS
  let last: StyleReading | null = null
  const world: World = {
    statuses: [],
    toasts: [],
    submitted: [],
    closed: [],
    opened: [],
    stored,
    settings: () => settings,
    last: () => last,
  }
  on('store.get', (_, e) => ({ value: stored.get(e.key) }))
  on('store.set', (_, e) => {
    stored.set(e.key, e.value)
    return { value: undefined }
  })
  on('state.set', (_, e, next) => {
    if (e.key === 'settings') settings = e.value as StyleSettings
    if (e.key === 'last') last = e.value as StyleReading | null
    return next(e)
  })
  if (storedSettings !== undefined) {
    on('state.get', (_, e, next) =>
      e.key === 'settings' ? { value: { value: storedSettings, version: 1 } } : next(e),
    )
  }
  if (storedLast !== undefined) {
    on('state.get', (_, e, next) =>
      e.key === 'last' ? { value: { value: storedLast, version: 1 } } : next(e),
    )
  }
  on('ui.status', (_, e) => {
    world.statuses.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', (_, e) => {
    world.toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.open', (_, e) => {
    world.opened.push({ id: e.id, focus: e.focus, rows: e.rows, columns: e.columns })
    return { value: { isPlaced: true } }
  })
  on('session.surfaces', () => ({ value: ['desktop'] }))
  on('ui.close', (_, e) => {
    world.closed.push(e.id)
    return { value: undefined }
  })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('prompt.submit', (_, e) => {
    world.submitted.push({ text: e.text, context: e.context, asUser: e.origin.kind === 'plugin' && e.origin.asUser === true })
    return { text: e.text, context: e.context }
  })
  on('prompt.compose', () => ({
    sections: [{ id: 'base', text: 'Base prompt.', scope: 'shared' }],
  }))
  on('turn.complete', () => ({ text: '' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  return world
}

const runSliders = ($: Engine, args: string) =>
  $.command.run({
    command: 'sliders',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })

const completeTurn = ($: Engine, answer: string, agentId?: string) =>
  $.turn.complete({
    answer,
    durationMs: 1000,
    isAborted: false,
    turnId: 'turn-1',
    reason: 'answer',
    ...(agentId === undefined ? {} : { agentId }),
  })

const submitPrompt = ($: Engine, text: string, context?: readonly string[]) =>
  $.prompt.submit({
    text,
    wait: false,
    origin: { kind: 'composer' },
    ...(context === undefined ? {} : { context }),
  })

const composePrompt = ($: Engine) =>
  $.prompt.compose({
    model: 'test-model',
    promptModel: 'test-model',
    surfaces: ['terminal'],
    tools: [],
    outputStyle: null,
    traits: [],
  })

const mountPane = ($: Engine, surface: (typeof SURFACES)[number]) =>
  $.ui.mount({
    plugin: PLUGIN,
    surface,
    component: 'Pane',
    props: PANE_PROPS,
    requestId: PANE_ID,
  })

const readStoredSettings = (world: World): unknown => world.stored.get('settings')

describe('pane', () => {
  for (const surface of SURFACES) {
    test(`draws every dial label on ${surface}`, async ($, on) => {
      buildWorld(on)
      const ui = await mountPane($, surface)

      for (const spec of DIAL_SPECS) {
        expect(await ui.find({ type: 'Text', text: spec.label })).toBeDefined()
        expect(await ui.find({ type: 'Button', key: `${spec.id}:up` })).toBeDefined()
        expect(await ui.find({ type: 'Button', key: `${spec.id}:down` })).toBeDefined()
        expect(await ui.find({ type: 'Button', key: `${spec.id}:toggle` })).toBeDefined()
      }
      expect(await ui.find({ type: 'Text', text: 'No reply measured yet.' })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: 'revise' })).toBeUndefined()
      await ui.unmount()
    })

    test(`up, down and toggle change settings and store on ${surface}`, async ($, on) => {
      const world = buildWorld(on)
      const ui = await mountPane($, surface)

      await ui.press({ key: 'totalWords:up' })
      expect(world.settings().dials.totalWords).toEqual({ isOn: true, value: 400 })
      expect(readStoredSettings(world)).toEqual(world.settings())
      expect((await ui.find({ key: 'totalWords:toggle' }))?.props.label).toBe('on')

      await ui.press({ key: 'totalWords:down' })
      await ui.press({ key: 'totalWords:down' })
      expect(world.settings().dials.totalWords.value).toBe(250)
      expect(readStoredSettings(world)).toEqual(world.settings())
      expect(await ui.find({ type: 'Text', text: '≤ 250 words' })).toBeDefined()

      await ui.press({ key: 'totalWords:toggle' })
      expect(world.settings().dials.totalWords).toEqual({ isOn: false, value: 250 })
      expect(readStoredSettings(world)).toEqual(world.settings())
      expect((await ui.find({ key: 'totalWords:toggle' }))?.props.label).toBe('off')
      expect(world.statuses.at(-1)).toBeUndefined()
      await ui.unmount()
    })

    test(`formula button cycles the grade formula on ${surface}`, async ($, on) => {
      const world = buildWorld(on)
      const ui = await mountPane($, surface)

      expect(world.settings().gradeFormula).toBe('flesch-kincaid')
      await ui.press({ key: 'formula' })
      expect(world.settings().gradeFormula).toBe('gunning-fog')
      expect(readStoredSettings(world)).toEqual(world.settings())
      expect(await ui.find({ type: 'Button', text: 'Formula: Gunning Fog' })).toBeDefined()
      expect(await ui.findAll({ type: 'Button', key: 'formula' })).toHaveLength(1)
      expect(await ui.find({ type: 'Text', text: /formula:/i })).toBeUndefined()
      await ui.unmount()
    })

    test(`all off and reset work on ${surface}`, async ($, on) => {
      const world = buildWorld(on)
      const ui = await mountPane($, surface)

      await ui.press({ key: 'sentenceWords:up' })
      await ui.press({ key: 'gradeLevel:up' })
      expect(world.settings().dials.sentenceWords.isOn).toBe(true)

      await ui.press({ key: 'all-off' })
      expect(world.settings().dials.sentenceWords).toEqual({ isOn: false, value: 25 })
      expect(world.settings().dials.gradeLevel.isOn).toBe(false)

      await ui.press({ key: 'reset' })
      expect(world.settings()).toEqual(DEFAULT_SETTINGS)
      expect(readStoredSettings(world)).toEqual(DEFAULT_SETTINGS)
      await ui.unmount()
    })

    test(`shows the last reply with marks and a revise button on ${surface}`, async ($, on) => {
      const world = buildWorld(on)
      await runSliders($, 'words 25')
      await runSliders($, 'sentence 40')
      await completeTurn($, LONG_ANSWER)
      const ui = await mountPane($, surface)

      expect(await ui.find({ type: 'Text', text: /Words\s+48/ })).toBeDefined()
      expect(await ui.find({ type: 'Box', text: /^Words\s+48 ✗$/ })).toBeDefined()
      expect(await ui.find({ type: 'Box', text: /^Longest sentence\s+8 ✓$/ })).toBeDefined()
      expect(await ui.find({ type: 'Box', text: /^Words\s+48 ✓$/ })).toBeUndefined()
      expect(await ui.find({ type: 'Box', text: /^Longest sentence\s+8 ✗$/ })).toBeUndefined()
      expect(await ui.find({ type: 'Box', text: /^Longest paragraph\s+48$/ })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: 'revise' })).toBeDefined()

      await ui.press({ key: 'revise' })
      expect(world.submitted.at(-1)?.text).toContain('rewrite your previous reply')
      expect(world.submitted.at(-1)?.asUser).toBe(true)
      expect(world.closed).toEqual([PANE_ID])
      await ui.unmount()
    })

    test(`formula button changes the grade row of the last reply on ${surface}`, async ($, on) => {
      buildWorld(on)
      await runSliders($, 'grade 6')
      await completeTurn($, LONG_ANSWER)
      const ui = await mountPane($, surface)
      const before = await ui.find({ type: 'Box', text: /^Grade \(Flesch-Kincaid\)\s*\d/ })
      expect(before).toBeDefined()

      await ui.press({ key: 'formula' })
      const after = await ui.find({ type: 'Box', text: /^Grade \(Gunning Fog\)\s*\d/ })
      expect(after).toBeDefined()
      expect(after?.text.replace(/^Grade \(Gunning Fog\)\s*/, '')).not.toBe(
        before?.text.replace(/^Grade \(Flesch-Kincaid\)\s*/, ''),
      )
      await ui.unmount()
    })

    test(`draws the read time row and its buttons on ${surface}`, async ($, on) => {
      buildWorld(on)
      const ui = await mountPane($, surface)

      expect(await ui.find({ type: 'Text', text: 'Read time' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: '≤ 1 min' })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: 'readTime:down' })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: 'readTime:up' })).toBeDefined()
      expect((await ui.find({ key: 'readTime:toggle' }))?.props.label).toBe('off')
      await ui.unmount()
    })

    test(`read time up, down and toggle change settings and store on ${surface}`, async ($, on) => {
      const world = buildWorld(on)
      const ui = await mountPane($, surface)

      await ui.press({ key: 'readTime:up' })
      expect(world.settings().dials.readTime).toEqual({ isOn: true, value: 90 })
      expect(readStoredSettings(world)).toEqual(world.settings())
      expect(await ui.find({ type: 'Text', text: '≤ 1.5 min' })).toBeDefined()
      expect((await ui.find({ key: 'readTime:toggle' }))?.props.label).toBe('on')

      await ui.press({ key: 'readTime:down' })
      await ui.press({ key: 'readTime:down' })
      expect(world.settings().dials.readTime.value).toBe(45)
      expect(await ui.find({ type: 'Text', text: '≤ 45 sec' })).toBeDefined()
      expect(world.statuses.at(-1)).toContain('read ≤45s')

      await ui.press({ key: 'readTime:toggle' })
      expect(world.settings().dials.readTime).toEqual({ isOn: false, value: 45 })
      expect(readStoredSettings(world)).toEqual(world.settings())
      expect((await ui.find({ key: 'readTime:toggle' }))?.props.label).toBe('off')
      expect(world.settings().dials.totalWords).toEqual(DEFAULT_SETTINGS.dials.totalWords)
      await ui.unmount()
    })

    test(`shows the read time of the last reply with a mark on ${surface}`, async ($, on) => {
      buildWorld(on)
      await runSliders($, 'read 10')
      await completeTurn($, LONG_ANSWER)
      const ui = await mountPane($, surface)
      const seconds = measureText(LONG_ANSWER)?.readSeconds ?? 0

      expect(seconds).toBeGreaterThan(10)
      expect(await ui.find({ type: 'Box', text: new RegExp(`^Read time\\s+${seconds} sec ✗$`) })).toBeDefined()
      expect(await ui.find({ type: 'Box', text: /^Words\s+48$/ })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: 'revise' })).toBeDefined()
      await ui.unmount()
    })

    test(`close button closes the pane on ${surface}`, async ($, on) => {
      const world = buildWorld(on)
      const ui = await mountPane($, surface)

      await ui.press({ key: 'close' })
      expect(world.closed).toEqual([PANE_ID])
      await ui.unmount()
    })
  }
})

const mountPaneAt = ($: Engine, bodyColumns: number) =>
  $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'Pane',
    props: { ...PANE_PROPS, bodyColumns },
    requestId: PANE_ID,
  })

const FIXED_ROW_WIDTH = 51

describe('pane width', () => {
  test('every limit text fits the limit column', () => {
    for (const spec of DIAL_SPECS) {
      for (const step of spec.steps) {
        expect(formatLimit(spec, step).length).toBeLessThanOrEqual(LIMIT_WIDTH)
      }
    }
    expect(formatLimit(dialSpec('readTime'), 90)).toBe('≤ 1.5 min')
    expect(formatLimit(dialSpec('readTime'), 45)).toBe('≤ 45 sec')
  })


  for (const bodyColumns of [57, 58, 70, 200]) {
    test(`a dial row fits ${bodyColumns} columns`, async ($, on) => {
      buildWorld(on)
      const ui = await mountPaneAt($, bodyColumns)
      const bars = await ui.findAll({ type: 'Text', text: /^[█░]+$/ })

      expect(bars).toHaveLength(DIAL_SPECS.length)
      for (const bar of bars) expect(FIXED_ROW_WIDTH + bar.text.length).toBeLessThanOrEqual(bodyColumns)
      await ui.unmount()
    })
  }

  test('every control is still drawn in 40 columns', async ($, on) => {
    buildWorld(on)
    const ui = await mountPaneAt($, 40)

    for (const spec of DIAL_SPECS) {
      expect(await ui.find({ type: 'Button', key: `${spec.id}:down` })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: `${spec.id}:up` })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: `${spec.id}:toggle` })).toBeDefined()
    }
    await ui.unmount()
  })

  test('dial rows are allowed to wrap on a narrow pane', async ($, on) => {
    buildWorld(on)
    const ui = await mountPaneAt($, 40)
    const rows = (await ui.findAll({ type: 'Box' })).filter(box => box.props.gap === 1 && /^Total words/.test(box.text))

    expect(rows).toHaveLength(1)
    expect(rows[0]?.props.flexWrap).toBe('wrap')
    await ui.unmount()
  })

  for (const [bodyColumns, barWidth] of [[20, 6], [70, 19], [200, 24]] as const) {
    test(`draws bars ${barWidth} cells wide in ${bodyColumns} columns`, async ($, on) => {
      buildWorld(on)
      const ui = await $.ui.mount({
        plugin: PLUGIN,
        surface: 'terminal',
        component: 'Pane',
        props: { ...PANE_PROPS, bodyColumns },
        requestId: PANE_ID,
      })
      const bars = await ui.findAll({ type: 'Text', text: /^[█░]+$/ })

      expect(bars).toHaveLength(DIAL_SPECS.length)
      for (const bar of bars) expect(bar.text).toHaveLength(barWidth)
      await ui.unmount()
    })
  }
})

describe('stale reading from a previous version', () => {
  test('the pane treats it as no reading', async ($, on) => {
    buildWorld(on, {}, STALE_READING)
    const ui = await mountPane($, 'terminal')

    expect(await ui.find({ type: 'Text', text: 'No reply measured yet.' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'revise' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /^Read time\s+NaN/ })).toBeUndefined()
    await ui.unmount()
  })

  test('the status line and the next prompt leave it out', async ($, on) => {
    const world = buildWorld(on, {}, STALE_READING)
    await runSliders($, 'words 25')
    await submitPrompt($, 'hello')
    const context = world.submitted.at(-1)?.context

    expect(world.statuses.at(-1)).toContain('≤25w')
    expect(world.statuses.at(-1)).not.toContain('last')
    expect(context).toHaveLength(1)
    expect(context?.[0]).toContain('Style limits for this reply')
    expect(context?.[0]).not.toContain('Last reply:')
  })

  test('show and the pane summary report no reply measured', async ($, on) => {
    buildWorld(on, {}, STALE_READING)
    const shown = await runSliders($, 'show')
    const opened = await runSliders($, '')

    expect(shown.text).toContain('No reply measured yet.')
    expect(shown.text).not.toContain('NaN')
    expect(opened.text).toContain('No reply measured yet.')
  })

  test('a command that changes settings reports no reply measured', async ($, on) => {
    buildWorld(on, {}, STALE_READING)
    const result = await runSliders($, 'words 100')

    expect(result.text).toContain('No reply measured yet.')
    expect(result.text).not.toContain('NaN')
  })

  test('a reading without a finite read time is ignored', async ($, on) => {
    const world = buildWorld(on, {}, { ...STALE_READING, readSeconds: null })
    await runSliders($, 'words 25')

    expect(world.statuses.at(-1)).not.toContain('last')
  })

  test('a reading with a read time is used', async ($, on) => {
    const world = buildWorld(on, {}, { ...STALE_READING, readSeconds: 20 })
    await runSliders($, 'words 25')

    expect(world.statuses.at(-1)).toContain('last 48w')
  })
})

describe('settings from before read time existed', () => {
  test('show lists read time off at its default', async ($, on) => {
    buildWorld(on, {}, undefined, OLD_SHAPE_SETTINGS)
    const shown = await runSliders($, 'show')

    expect(shown.text).toContain('Read time: off, ≤ 1 min')
  })

  test('the pane mounts and lists the read time row', async ($, on) => {
    buildWorld(on, {}, undefined, OLD_SHAPE_SETTINGS)
    const ui = await mountPane($, 'terminal')

    expect(await ui.find({ type: 'Text', text: /^Read time/ })).toBeDefined()
    await ui.unmount()
  })

  test('prompt.compose still adds the targets section', async ($, on) => {
    buildWorld(on, {}, undefined, OLD_SHAPE_SETTINGS)
    const composed = await composePrompt($)

    expect(composed.sections.map(section => section.id)).toEqual(['base', 'style-sliders:targets'])
  })

  test('prompt.submit still attaches the total words limit', async ($, on) => {
    const world = buildWorld(on, {}, undefined, OLD_SHAPE_SETTINGS)
    await submitPrompt($, 'hello')

    expect(world.submitted.at(-1)?.context?.[0]).toContain('150 words')
  })
})

describe('prompt.compose', () => {
  test('adds no section while every dial is off', async ($, on) => {
    buildWorld(on)
    const composed = await composePrompt($)

    expect(composed.sections.map(section => section.id)).toEqual(['base'])
  })

  test('adds the targets section last, per session, once a dial is on', async ($, on) => {
    buildWorld(on)
    await runSliders($, 'words 100')
    const composed = await composePrompt($)
    const added = composed.sections.at(-1)

    expect(composed.sections.map(section => section.id)).toEqual(['base', 'style-sliders:targets'])
    expect(added?.scope).toBe('session')
    expect(added?.text).toContain('at most 100 words')
  })

  test('drops the section again when every dial goes off', async ($, on) => {
    buildWorld(on)
    await runSliders($, 'words 100')
    await runSliders($, 'off')
    const composed = await composePrompt($)

    expect(composed.sections.map(section => section.id)).toEqual(['base'])
  })
})

describe('turn.complete', () => {
  test('stores a reading for a main loop answer', async ($, on) => {
    const world = buildWorld(on)
    await completeTurn($, LONG_ANSWER)

    expect(world.last()?.stats.words).toBe(48)
    expect(world.toasts).toEqual([])
  })

  test('stores the read time of a plain answer', async ($, on) => {
    const world = buildWorld(on)
    await completeTurn($, LONG_ANSWER)

    expect(world.last()?.readSeconds).toBe(measureText(LONG_ANSWER)?.readSeconds)
    expect(world.last()?.readSeconds).toBeGreaterThan(0)
  })

  test('an answer with a code block reads longer than its prose alone', async ($, on) => {
    const world = buildWorld(on)
    await completeTurn($, LONG_ANSWER)
    const proseSeconds = world.last()?.readSeconds ?? 0
    await completeTurn($, CODE_ANSWER)

    expect(world.last()?.stats.codeWords).toBe(CODE_TOKEN_COUNT)
    expect(world.last()?.stats.words).toBe(48)
    expect(world.last()?.readSeconds).toBeGreaterThan(proseSeconds)
  })

  test('a code block alone breaks a read time limit that its words would not', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'read 30')
    await runSliders($, 'words 100')
    await completeTurn($, CODE_ANSWER)

    expect(world.toasts).toHaveLength(1)
    expect(world.toasts[0]).toContain('read time')
    expect(world.toasts[0]).toContain('(limit 30 sec)')
    expect(world.toasts[0]).not.toContain('words (limit')
  })

  test('stores nothing for a subagent turn', async ($, on) => {
    const world = buildWorld(on)
    await completeTurn($, LONG_ANSWER, 'agent-1')

    expect(world.last()).toBeNull()
  })

  test('stores nothing for an empty answer', async ($, on) => {
    const world = buildWorld(on)
    await completeTurn($, '')

    expect(world.last()).toBeNull()
  })

  test('stores nothing for an aborted turn', async ($, on) => {
    const world = buildWorld(on)
    await $.turn.complete({
      answer: LONG_ANSWER,
      durationMs: 10,
      isAborted: true,
      turnId: 'turn-2',
      reason: 'aborted',
    })

    expect(world.last()).toBeNull()
  })

  test('returns what the engine answered, unchanged', async ($, on) => {
    buildWorld(on)
    const result = await completeTurn($, LONG_ANSWER)

    expect(result).toEqual({ text: '' })
  })

  test('toasts what was over and updates the status line', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'words 25')
    await completeTurn($, LONG_ANSWER)

    expect(world.toasts).toHaveLength(1)
    expect(world.toasts[0]).toContain('48 words (limit 25)')
    expect(world.statuses.at(-1)).toContain('last 48w')
  })
})

describe('prompt.submit', () => {
  test('attaches no context while every dial is off', async ($, on) => {
    const world = buildWorld(on)
    await submitPrompt($, 'hello')

    expect(world.submitted.at(-1)?.context).toBeUndefined()
  })

  test('attaches the style limits once a dial is on', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'words 100')
    await submitPrompt($, 'hello')
    const sent = world.submitted.at(-1)

    expect(sent?.text).toBe('hello')
    expect(sent?.context).toHaveLength(1)
    expect(sent?.context?.[0]).toContain('Style limits for this reply')
    expect(sent?.context?.[0]).toContain('100 words')
  })

  test('keeps context that was already attached', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'words 100')
    await submitPrompt($, 'hello', ['earlier note'])

    expect(world.submitted.at(-1)?.context?.[0]).toBe('earlier note')
    expect(world.submitted.at(-1)?.context).toHaveLength(2)
  })
})

describe('prompt.submit with a reading', () => {
  test('attaches the last reply measurement after a measured turn', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'words 25')
    await completeTurn($, LONG_ANSWER)
    await submitPrompt($, 'hi')
    const context = world.submitted.at(-1)?.context

    expect(context).toHaveLength(1)
    expect(context?.[0]).toContain('Last reply: 48 words')
    expect(context?.[0]).toContain('Over:')
  })
})

describe('prompt.submit with a read time reading', () => {
  test('attaches the read time measurement of the last reply', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'read 10')
    await completeTurn($, LONG_ANSWER)
    await submitPrompt($, 'hi')
    const context = world.submitted.at(-1)?.context?.[0]

    expect(context).toContain('read time 10 sec or less')
    expect(context).toContain('Last reply: read time')
    expect(context).toContain('(limit 10 sec)')
  })
})

describe('revise', () => {
  test('lets the model trim code and tables when read time is on', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'read 30')
    await completeTurn($, CODE_ANSWER)
    const ui = await mountPane($, 'terminal')
    await ui.press({ key: 'revise' })

    expect(world.submitted.at(-1)?.text).toContain('read time')
    expect(world.submitted.at(-1)?.text).toContain('you may shorten or drop them')
    await ui.unmount()
  })
})

describe('session.end', () => {
  const endSession = ($: Engine, reason: 'clear' | 'resume' | 'prompt_input_exit') =>
    $.session.end({ reason, sessionId: 'session-1', resume: { id: 'session-1' } })

  test('clear drops the stale reading from the status line and the next prompt', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'words 25')
    await completeTurn($, LONG_ANSWER)
    expect(world.last()?.stats.words).toBe(48)
    expect(world.statuses.at(-1)).toContain('last 48w')

    await endSession($, 'clear')
    await submitPrompt($, 'fresh start')
    const context = world.submitted.at(-1)?.context

    expect(world.last()).toBeNull()
    expect(world.statuses.at(-1)).not.toContain('last')
    expect(world.statuses.at(-1)).toContain('≤25w')
    expect(context).toHaveLength(1)
    expect(context?.[0]).toContain('Style limits for this reply')
    expect(context?.[0]).not.toContain('Last reply:')
  })

  test('resume drops the stale reading as well', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'words 25')
    await completeTurn($, LONG_ANSWER)
    await endSession($, 'resume')

    expect(world.last()).toBeNull()
  })

  test('leaving the app keeps the reading', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'words 25')
    await completeTurn($, LONG_ANSWER)
    await endSession($, 'prompt_input_exit')

    expect(world.last()?.stats.words).toBe(48)
    expect(world.statuses.at(-1)).toContain('last 48w')
  })

  test('clear leaves the settings alone', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'words 25')
    await endSession($, 'clear')

    expect(world.settings().dials.totalWords).toEqual({ isOn: true, value: 25 })
  })
})

describe('sliders command', () => {
  test('words 100 sets the limit, turns it on and saves it', async ($, on) => {
    const world = buildWorld(on)
    const result = await runSliders($, 'words 100')

    expect(world.settings().dials.totalWords).toEqual({ isOn: true, value: 100 })
    expect(readStoredSettings(world)).toEqual(world.settings())
    expect(result.text).toContain('Total words set to ≤ 100 words.')
    expect(world.statuses.at(-1)).toContain('≤100w')
  })

  test('read 2m sets 120 seconds, turns it on and saves it', async ($, on) => {
    const world = buildWorld(on)
    const result = await runSliders($, 'read 2m')

    expect(world.settings().dials.readTime).toEqual({ isOn: true, value: 120 })
    expect(readStoredSettings(world)).toEqual(world.settings())
    expect(result.text).toContain('Read time set to ≤ 2 min.')
    expect(world.statuses.at(-1)).toContain('read ≤2m')
  })

  test('read with seconds, a bad unit and off', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'read 45 sec')
    expect(world.settings().dials.readTime).toEqual({ isOn: true, value: 45 })

    const rejected = await runSliders($, 'words 100 sec')
    expect(rejected.text).toContain('I did not understand')
    expect(world.settings().dials.totalWords.isOn).toBe(false)

    await runSliders($, 'read off')
    expect(world.settings().dials.readTime).toEqual({ isOn: false, value: 45 })
  })

  test('formula and switch arguments are applied', async ($, on) => {
    const world = buildWorld(on)
    await runSliders($, 'formula smog')
    await runSliders($, 'grade 6')
    await runSliders($, 'grade off')

    expect(world.settings().gradeFormula).toBe('smog')
    expect(world.settings().dials.gradeLevel).toEqual({ isOn: false, value: 6 })
  })

  test('show and help answer without changing anything', async ($, on) => {
    const world = buildWorld(on)
    const shown = await runSliders($, 'show')
    const help = await runSliders($, 'help')

    expect(shown.text).toContain('Total words: off')
    expect(help.text).toContain('/sliders formula')
    expect(world.settings()).toEqual(DEFAULT_SETTINGS)
    expect(world.stored.size).toBe(0)
  })

  test('an unknown argument answers with the usage', async ($, on) => {
    const world = buildWorld(on)
    const result = await runSliders($, 'banana')

    expect(result.text).toContain('I did not understand "banana".')
    expect(world.settings()).toEqual(DEFAULT_SETTINGS)
  })

  test('no argument opens the pane', async ($, on) => {
    const world = buildWorld(on)
    const result = await runSliders($, '')

    expect(result.text).toContain('Output style sliders opened (drawn on: desktop).')
    expect(result.text).toContain('If you do not see the pane, use commands instead')
    expect(result.text).toContain('Grade formula: Flesch-Kincaid')
    expect(world.opened).toEqual([{ id: PANE_ID, focus: true, rows: 20, columns: 65 }])
  })
})

describe('session.start', () => {
  test('loads sanitized settings from the store and shows the status line', async ($, on) => {
    const world = buildWorld(on, {
      settings: {
        dials: { totalWords: { isOn: true, value: 99999 }, gradeLevel: { isOn: true, value: 5 } },
        gradeFormula: 'smog',
      },
    })
    await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

    expect(world.settings().dials.totalWords).toEqual({ isOn: true, value: 2000 })
    expect(world.settings().dials.gradeLevel).toEqual({ isOn: true, value: 5 })
    expect(world.settings().gradeFormula).toBe('smog')
    expect(world.statuses.at(-1)).toContain('≤2000w')
  })

  test('falls back to the defaults when the store holds junk', async ($, on) => {
    const world = buildWorld(on, { settings: 'junk' })
    await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

    expect(world.settings()).toEqual(DEFAULT_SETTINGS)
  })
})
