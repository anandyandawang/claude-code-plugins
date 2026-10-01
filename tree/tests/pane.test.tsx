import { expect, test } from 'claude-code/testing'
import type { On, SessionMessage } from 'claude-code'

const SURFACES = ['terminal', 'desktop'] as const

const conversation: SessionMessage[] = [
  { role: 'user', text: 'Remember APPLE', toolUses: [] },
  { role: 'assistant', text: 'noted', toolUses: [] },
  { role: 'user', text: 'Remember BANANA', toolUses: [] },
  { role: 'assistant', text: 'noted', toolUses: [] },
]

const answerAsEngine = (on: On) => {
  on('session.messages', () => ({ value: conversation }))
  on('command.register', () => ({ value: { command: 'tree' } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
}

const PANE = {
  plugin: 'tree',
  component: 'Pane',
  requestId: 'tree',
  props: {
    title: 'Session tree',
    isFocused: true,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('the pane lists every turn and offers a switch on an earlier one', async ($, on) => {
  answerAsEngine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect((await ui.findAll({ type: 'Button', text: /Remember/ })).length).toBe(2)
    expect((await ui.find({ type: 'Button', text: /2\. Remember BANANA/ }))?.text).toContain('▶')

    await ui.press({ key: 'row-n1' })
    expect(await ui.find({ key: 'go' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Turn 1/ })).toBeDefined()

    await ui.press({ key: 'cancel' })
    expect(await ui.find({ key: 'go' })).toBeUndefined()

    await ui.unmount()
  }
})

test('the current turn offers no switch', async ($, on) => {
  answerAsEngine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })

    await ui.press({ key: 'row-n3' })
    expect(await ui.find({ type: 'Text', text: /you are here/ })).toBeDefined()
    expect(await ui.find({ key: 'go' })).toBeUndefined()

    await ui.unmount()
  }
})
