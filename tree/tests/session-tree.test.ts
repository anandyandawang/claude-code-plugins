import { describe, expect, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'

import {
  anchorCursor,
  buildBranchMessages,
  buildRows,
  createSessionTree,
  estimateTokens,
  findPrompt,
  formatTreeText,
  syncConversation,
  syncNewMessages,
  turnEndOf,
} from '../hooks/session-tree'

const user = (text: string): SessionMessage => ({ role: 'user', text, toolUses: [] })
const assistant = (text: string): SessionMessage => ({ role: 'assistant', text, toolUses: [] })

const toolCall = (id: string): SessionMessage => ({
  role: 'assistant',
  text: '',
  toolUses: [{ tool_use_id: id, tool: 'Read', input: { file_path: `/${id}.ts` } }],
})

const toolAnswer = (id: string): SessionMessage => ({
  role: 'user',
  text: '',
  toolUses: [],
  toolResults: [{ tool_use_id: id, text: `contents of ${id}`, isError: false }],
})

const apple = [user('Remember APPLE'), assistant('noted')]
const banana = [user('Remember BANANA'), assistant('noted')]
const cherry = [user('Remember CHERRY'), assistant('noted')]
const question = [user('Which words?'), assistant('APPLE')]

const branchedTree = () => {
  const tree = createSessionTree()
  syncConversation(tree, [...apple, ...banana, ...cherry])
  syncConversation(tree, [...apple, ...question])

  return tree
}

describe('syncConversation', () => {
  test('a linear chat becomes one chain with the leaf at the end', () => {
    const tree = createSessionTree()
    syncConversation(tree, [...apple, ...banana])

    expect(tree.rootIds.length).toBe(1)
    expect(Object.keys(tree.nodes).length).toBe(4)
    expect(tree.nodes[tree.leafId!]!.message.text).toBe('noted')
    expect(findPrompt(tree, 2)?.message.text).toBe('Remember BANANA')
  })

  test('syncing the same chat twice adds nothing', () => {
    const tree = createSessionTree()
    syncConversation(tree, [...apple, ...banana])
    syncConversation(tree, [...apple, ...banana])

    expect(Object.keys(tree.nodes).length).toBe(4)
  })

  test('a chat that diverges adds a sibling branch', () => {
    const tree = branchedTree()
    const appleReply = tree.nodes[findPrompt(tree, 1)!.childIds[0]!]!

    expect(appleReply.childIds.length).toBe(2)
    expect(findPrompt(tree, 4)?.message.text).toBe('Which words?')
  })
})

describe('syncNewMessages', () => {
  test('after a switch, re-stored copies in the transcript do not duplicate the tree', () => {
    const tree = createSessionTree()
    const record = (args: string) =>
      user(`<command-name>/tree</command-name>\n<command-args>${args}</command-args>`)
    const beforeSwitch = [...apple, ...banana, ...cherry, record('go 1')]
    syncConversation(tree, beforeSwitch)

    tree.leafId = turnEndOf(tree, findPrompt(tree, 1)!.id)
    const afterSwitch = [...beforeSwitch, ...apple, record('compact')]
    anchorCursor(tree, afterSwitch)
    syncNewMessages(tree, [...afterSwitch, ...question])

    expect(formatTreeText(buildRows(tree))).toBe(
      [
        '● 1. Remember APPLE',
        '├─ ○ 2. Remember BANANA',
        '│  ○ 3. Remember CHERRY',
        '└─ ▶ 4. Which words?',
      ].join('\n'),
    )
  })

  test('new messages land under the current leaf even when replies repeat', () => {
    const tree = createSessionTree()
    syncConversation(tree, [...apple, ...banana])
    syncNewMessages(tree, [...apple, ...banana, ...cherry])

    expect(buildRows(tree).map(row => row.number)).toEqual([1, 2, 3])
    expect(tree.nodes[tree.leafId!]!.parentId).toBe(findPrompt(tree, 3)!.id)
  })
})

describe('buildRows', () => {
  test('a linear chat stays flat', () => {
    const tree = createSessionTree()
    syncConversation(tree, [...apple, ...banana, ...cherry])

    expect(buildRows(tree).map(row => row.prefix)).toEqual(['', '', ''])
  })

  test('branches get connectors and the current path is marked', () => {
    const text = formatTreeText(buildRows(branchedTree()))

    expect(text).toBe(
      [
        '● 1. Remember APPLE',
        '├─ ○ 2. Remember BANANA',
        '│  ○ 3. Remember CHERRY',
        '└─ ▶ 4. Which words?',
      ].join('\n'),
    )
  })

  test('the preview is the first non-empty line', () => {
    const tree = createSessionTree()
    syncConversation(tree, [user('\n\n  Fix the login bug  \nmore details'), assistant('ok')])

    expect(buildRows(tree)[0]!.preview).toBe('Fix the login bug')
  })
})

describe('command records', () => {
  test('slash command rows are not turns and are left out of the turn end', () => {
    const tree = createSessionTree()
    const record = user(
      '<command-name>/tree</command-name>\n<command-message>tree</command-message>\n<command-args>list</command-args>',
    )
    syncConversation(tree, [...apple, record, ...banana])

    expect(buildRows(tree).map(row => row.number)).toEqual([1, 2])
    expect(tree.nodes[turnEndOf(tree, findPrompt(tree, 1)!.id)]!.message.text).toBe('noted')
  })
})

describe('turnEndOf', () => {
  test('follows tool calls to the final reply of the turn', () => {
    const tree = createSessionTree()
    syncConversation(tree, [
      user('Read two files'),
      toolCall('a'),
      toolAnswer('a'),
      toolCall('b'),
      toolAnswer('b'),
      assistant('done'),
      ...banana,
    ])
    const end = turnEndOf(tree, findPrompt(tree, 1)!.id)

    expect(tree.nodes[end]!.message.text).toBe('done')
  })
})

describe('buildBranchMessages', () => {
  test('keeps the shared start with its handles and rebuilds the rest', () => {
    const tree = branchedTree()
    const current = [...apple, ...question].map((message, index) => ({
      ...message,
      handle: `h${index}`,
    }))
    const target = turnEndOf(tree, findPrompt(tree, 3)!.id)
    const messages = buildBranchMessages(tree, target, current)

    expect(messages.map(message => message.text)).toEqual([
      'Remember APPLE',
      'noted',
      'Remember BANANA',
      'noted',
      'Remember CHERRY',
      'noted',
    ])
    expect(messages.map(message => message.handle)).toEqual([
      'h0',
      'h1',
      undefined,
      undefined,
      undefined,
      undefined,
    ])
  })

  test('rebuilt tool messages keep their tool calls and results', () => {
    const tree = createSessionTree()
    syncConversation(tree, [user('Read a'), toolCall('a'), toolAnswer('a'), assistant('done')])
    syncConversation(tree, [user('Something else'), assistant('ok')])
    const target = turnEndOf(tree, findPrompt(tree, 1)!.id)
    const messages = buildBranchMessages(tree, target, [user('Something else')])

    expect(messages[1]!.toolUses[0]!.tool_use_id).toBe('a')
    expect(messages[2]!.toolResults?.[0]?.text).toBe('contents of a')
  })
})

describe('estimateTokens', () => {
  test('counts about four characters per token along the path', () => {
    const tree = createSessionTree()
    syncConversation(tree, [user('x'.repeat(4000)), assistant('y'.repeat(400))])

    expect(estimateTokens(tree, tree.leafId)).toBe(1100)
  })
})
