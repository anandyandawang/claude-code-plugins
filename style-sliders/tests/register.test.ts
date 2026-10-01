import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { DEFAULT_SETTINGS, DIAL_SPECS } from '../hooks/dials'
import type { StyleReading, StyleSettings } from '../types'

const SURFACES = ['terminal', 'desktop'] as const
const PLUGIN = 'style-sliders'
const PANE_ID = 'style-sliders'

const PANE_PROPS = {
  title: 'Output style',
  isFocused: true,
  bodyColumns: 80,
  placement: 'inline',
  scroll: { offset: 0, bodyRows: 18 },
  view: {},
} as const

const SHORT_SENTENCE = 'This is a plain sentence about nothing much.'
const LONG_ANSWER = Array.from({ length: 6 }, () => SHORT_SENTENCE).join(' ')

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

const buildWorld = (on: On, entries: Record<string, unknown> = {}): World => {
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

    expect(result.text).toBe('Output style sliders opened.')
    expect(world.opened).toEqual([{ id: PANE_ID, focus: true, rows: 18, columns: 65 }])
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
