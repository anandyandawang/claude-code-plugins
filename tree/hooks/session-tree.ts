import type { SessionMessage } from 'claude-code'

import type { TreeRow } from '../types'

export type StoredToolUse = {
  tool_use_id: string
  tool: string
  input: Record<string, unknown>
}

export type StoredToolResult = {
  tool_use_id: string
  text: string
  isError: boolean
}

export type StoredMessage = {
  role: 'user' | 'assistant'
  text: string
  toolUses: StoredToolUse[]
  toolResults: StoredToolResult[]
}

export type TreeNode = {
  id: string
  parentId: string | null
  message: StoredMessage
  childIds: string[]
  promptNumber: number | null
}

export type SyncCursor = {
  count: number
  tail: StoredMessage[]
}

export type SessionTree = {
  nodes: Record<string, TreeNode>
  rootIds: string[]
  leafId: string | null
  createdNodes: number
  createdPrompts: number
  cursor: SyncCursor | null
}

const CHARS_PER_TOKEN = 4
const CURSOR_TAIL_LENGTH = 3
const PREVIEW_FALLBACK = '(empty prompt)'
const COMMAND_RECORD_PATTERN = /^\s*<(command-name|command-message|command-args|local-command-[a-z-]+)>/

export type MessageKind = 'prompt' | 'reply' | 'record'

export const createSessionTree = (): SessionTree => ({
  nodes: {},
  rootIds: [],
  leafId: null,
  createdNodes: 0,
  createdPrompts: 0,
  cursor: null,
})

export const toStoredMessage = (message: SessionMessage): StoredMessage => ({
  role: message.role,
  text: message.text,
  toolUses: message.toolUses.map(use => ({
    tool_use_id: use.tool_use_id,
    tool: use.tool,
    input: use.input,
  })),
  toolResults: (message.toolResults ?? []).map(result => ({
    tool_use_id: result.tool_use_id,
    text: result.text,
    isError: result.isError,
  })),
})

export const toSessionMessage = (message: StoredMessage): SessionMessage => ({
  role: message.role,
  text: message.text,
  toolUses: message.toolUses.map(use => ({ ...use })),
  ...(message.toolResults.length > 0
    ? { toolResults: message.toolResults.map(result => ({ ...result })) }
    : {}),
})

const isSameToolUse = (a: StoredToolUse, b: StoredToolUse): boolean =>
  a.tool_use_id === b.tool_use_id &&
  a.tool === b.tool &&
  JSON.stringify(a.input) === JSON.stringify(b.input)

const isSameToolResult = (a: StoredToolResult, b: StoredToolResult): boolean =>
  a.tool_use_id === b.tool_use_id && a.text === b.text && a.isError === b.isError

export const isSameMessage = (a: StoredMessage, b: StoredMessage): boolean =>
  a.role === b.role &&
  a.text === b.text &&
  a.toolUses.length === b.toolUses.length &&
  a.toolUses.every((use, index) => isSameToolUse(use, b.toolUses[index]!)) &&
  a.toolResults.length === b.toolResults.length &&
  a.toolResults.every((result, index) => isSameToolResult(result, b.toolResults[index]!))

export const kindOf = (message: StoredMessage): MessageKind => {
  if (message.role === 'assistant' || message.toolResults.length > 0) {
    return 'reply'
  }

  return message.text.trim() === '' || COMMAND_RECORD_PATTERN.test(message.text)
    ? 'record'
    : 'prompt'
}

export const isPrompt = (message: StoredMessage): boolean => kindOf(message) === 'prompt'

const childIdsOf = (tree: SessionTree, parentId: string | null): string[] =>
  parentId === null ? tree.rootIds : tree.nodes[parentId]!.childIds

const addNode = (tree: SessionTree, parentId: string | null, message: StoredMessage): string => {
  tree.createdNodes += 1
  const id = `n${tree.createdNodes}`
  const promptNumber = isPrompt(message) ? (tree.createdPrompts += 1) : null
  tree.nodes[id] = { id, parentId, message, childIds: [], promptNumber }
  childIdsOf(tree, parentId).push(id)

  return id
}

const appendFrom = (
  tree: SessionTree,
  parentId: string | null,
  messages: readonly SessionMessage[],
): void => {
  let currentId = parentId

  for (const message of messages) {
    const stored = toStoredMessage(message)
    const match: string | undefined = childIdsOf(tree, currentId).find(id =>
      isSameMessage(tree.nodes[id]!.message, stored),
    )
    currentId = match ?? addNode(tree, currentId, stored)
  }

  tree.leafId = currentId
}

export const anchorCursor = (tree: SessionTree, messages: readonly SessionMessage[]): void => {
  tree.cursor = {
    count: messages.length,
    tail: messages.slice(-CURSOR_TAIL_LENGTH).map(toStoredMessage),
  }
}

const tailEndsAt = (
  tail: readonly StoredMessage[],
  messages: readonly SessionMessage[],
  end: number,
): boolean =>
  end >= tail.length &&
  end <= messages.length &&
  tail.every((stored, index) =>
    isSameMessage(stored, toStoredMessage(messages[end - tail.length + index]!)),
  )

const resumeIndexOf = (cursor: SyncCursor, messages: readonly SessionMessage[]): number | null => {
  if (tailEndsAt(cursor.tail, messages, cursor.count)) {
    return cursor.count
  }

  for (let end = messages.length; end >= cursor.tail.length; end -= 1) {
    if (tailEndsAt(cursor.tail, messages, end)) {
      return end
    }
  }

  return null
}

export const syncConversation = (
  tree: SessionTree,
  messages: readonly SessionMessage[],
): void => {
  appendFrom(tree, null, messages)
  anchorCursor(tree, messages)
}

export const syncNewMessages = (
  tree: SessionTree,
  messages: readonly SessionMessage[],
): void => {
  const resumeAt = tree.cursor === null ? null : resumeIndexOf(tree.cursor, messages)

  if (resumeAt === null) {
    syncConversation(tree, messages)

    return
  }

  appendFrom(tree, tree.leafId, messages.slice(resumeAt))
  anchorCursor(tree, messages)
}

export const pathTo = (tree: SessionTree, nodeId: string | null): TreeNode[] => {
  const path: TreeNode[] = []

  for (let id = nodeId; id !== null; id = tree.nodes[id]!.parentId) {
    path.push(tree.nodes[id]!)
  }

  return path.reverse()
}

const pathIds = (tree: SessionTree): Set<string> =>
  new Set(pathTo(tree, tree.leafId).map(node => node.id))

export const turnEndOf = (tree: SessionTree, promptId: string): string => {
  const onPath = pathIds(tree)
  let id = promptId

  for (;;) {
    const replies = tree.nodes[id]!.childIds.filter(
      childId => kindOf(tree.nodes[childId]!.message) === 'reply',
    )
    const next = replies.find(childId => onPath.has(childId)) ?? replies.at(-1)

    if (next === undefined) {
      return id
    }

    id = next
  }
}

export const promptChildrenOf = (tree: SessionTree, nodeId: string | null): string[] => {
  const prompts: string[] = []
  const pending = [...childIdsOf(tree, nodeId)]

  while (pending.length > 0) {
    const id = pending.shift()!
    const node = tree.nodes[id]!

    if (node.promptNumber !== null) {
      prompts.push(id)
    } else {
      pending.unshift(...node.childIds)
    }
  }

  return prompts
}

export const currentTurnId = (tree: SessionTree): string | null =>
  pathTo(tree, tree.leafId)
    .filter(node => node.promptNumber !== null)
    .at(-1)?.id ?? null

export const findPrompt = (tree: SessionTree, promptNumber: number): TreeNode | undefined =>
  Object.values(tree.nodes).find(node => node.promptNumber === promptNumber)

const previewOf = (text: string): string =>
  text
    .split('\n')
    .map(line => line.trim())
    .find(line => line !== '') ?? PREVIEW_FALLBACK

export const buildRows = (tree: SessionTree): TreeRow[] => {
  const onPath = pathIds(tree)
  const currentTurn = currentTurnId(tree)
  const rows: TreeRow[] = []

  const emitRow = (id: string, prefix: string): void => {
    const node = tree.nodes[id]!
    rows.push({
      id,
      number: node.promptNumber!,
      prefix,
      preview: previewOf(node.message.text),
      isOnPath: onPath.has(id),
      isCurrentTurn: id === currentTurn,
    })
  }

  const emitSiblings = (ids: string[], indent: string): void => {
    ids.forEach((id, index) => {
      const isLast = index === ids.length - 1
      const connector = ids.length === 1 ? '' : isLast ? '└─ ' : '├─ '
      const childIndent = ids.length === 1 ? indent : indent + (isLast ? '   ' : '│  ')
      emitChain(id, indent + connector, childIndent)
    })
  }

  const emitChain = (firstId: string, firstPrefix: string, indent: string): void => {
    let id = firstId
    let prefix = firstPrefix

    for (;;) {
      emitRow(id, prefix)
      const children = promptChildrenOf(tree, id)

      if (children.length !== 1) {
        emitSiblings(children, indent)

        return
      }

      id = children[0]!
      prefix = indent
    }
  }

  emitSiblings(promptChildrenOf(tree, null), '')

  return rows
}

const messageChars = (message: StoredMessage): number =>
  message.text.length +
  message.toolUses.reduce((sum, use) => sum + JSON.stringify(use.input).length, 0) +
  message.toolResults.reduce((sum, result) => sum + result.text.length, 0)

export const estimateTokens = (tree: SessionTree, nodeId: string | null): number =>
  Math.round(
    pathTo(tree, nodeId).reduce((sum, node) => sum + messageChars(node.message), 0) /
      CHARS_PER_TOKEN,
  )

export const buildBranchMessages = (
  tree: SessionTree,
  targetId: string,
  current: readonly SessionMessage[],
): SessionMessage[] => {
  const path = pathTo(tree, targetId)
  const kept: SessionMessage[] = []
  let shared = 0

  while (
    shared < path.length &&
    shared < current.length &&
    isSameMessage(path[shared]!.message, toStoredMessage(current[shared]!))
  ) {
    kept.push(current[shared]!)
    shared += 1
  }

  return [...kept, ...path.slice(shared).map(node => toSessionMessage(node.message))]
}

export const markerOf = (row: TreeRow): string =>
  row.isCurrentTurn ? '▶' : row.isOnPath ? '●' : '○'

export const formatTreeText = (rows: readonly TreeRow[]): string =>
  rows.length === 0
    ? 'No turns yet.'
    : rows.map(row => `${row.prefix}${markerOf(row)} ${row.number}. ${row.preview}`).join('\n')
