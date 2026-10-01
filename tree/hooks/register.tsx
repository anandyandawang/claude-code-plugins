import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { TreeRow, TreeSelection, TreeView } from '../types'
import {
  anchorCursor,
  buildBranchMessages,
  buildRows,
  createSessionTree,
  currentTurnId,
  estimateTokens,
  findPrompt,
  formatTreeText,
  markerOf,
  syncConversation,
  syncNewMessages,
  turnEndOf,
} from './session-tree'
import type { SessionTree, TreeNode } from './session-tree'

const PANE_ID = 'tree'
const PANE_TITLE = 'Session tree'
const COMMAND_NAME = 'tree'
const COMPACT_COMMAND = 'compact'
const SWITCH_INSTRUCTIONS = 'tree: switch the conversation to another branch'
const ELLIPSIS = '…'
const USAGE = [
  '/tree            open the session tree pane',
  '/tree list       print the tree with turn numbers',
  '/tree go <n>     continue from the end of turn n',
  '/tree edit <n>   go back to just before turn n and put its prompt in the box',
].join('\n')

const EMPTY_VIEW: TreeView = { rows: [], selection: null, notice: null }

const view = atom({ plugin: 'tree', key: 'view' } as const, EMPTY_VIEW)

type SwitchKind = 'go' | 'edit'

type SwitchTarget = {
  kind: SwitchKind
  nodeId: string
  promptNumber: number
  refillText: string | null
}

type SessionState = {
  tree: SessionTree
  pendingTargetId: string | null
  switchedToId: string | null
  queuedSwitch: SwitchTarget | null
  isTurnRunning: boolean
  isSwitching: boolean
}

const session: SessionState = {
  tree: createSessionTree(),
  pendingTargetId: null,
  switchedToId: null,
  queuedSwitch: null,
  isTurnRunning: false,
  isSwitching: false,
}

const describeTarget = (target: SwitchTarget): string =>
  target.kind === 'go'
    ? `the end of turn ${target.promptNumber}`
    : `just before turn ${target.promptNumber}`

const formatTokens = (tokens: number): string =>
  tokens >= 1000 ? `${Math.round(tokens / 1000)}k tokens` : `${tokens} tokens`

const fitToColumns = (text: string, columns: number): string =>
  text.length <= columns ? text : `${text.slice(0, Math.max(0, columns - 1))}${ELLIPSIS}`

const rowLabel = (row: TreeRow, columns: number): string =>
  fitToColumns(`${row.prefix}${markerOf(row)} ${row.number}. ${row.preview}`, columns)

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const selectionFor = (id: string): TreeSelection | null => {
  const node = session.tree.nodes[id]

  if (node === undefined || node.promptNumber === null) {
    return null
  }

  return {
    id,
    number: node.promptNumber,
    estimatedTokens: estimateTokens(session.tree, turnEndOf(session.tree, id)),
    isCurrentTurn: id === currentTurnId(session.tree),
    canEdit: node.parentId !== null,
  }
}

const targetFor = (prompt: TreeNode, kind: SwitchKind): SwitchTarget | string => {
  const promptNumber = prompt.promptNumber!

  if (kind === 'go') {
    return { kind, nodeId: turnEndOf(session.tree, prompt.id), promptNumber, refillText: null }
  }

  if (prompt.parentId === null) {
    return `Turn ${promptNumber} is the first message. Use /clear to start over instead.`
  }

  return { kind, nodeId: prompt.parentId, promptNumber, refillText: prompt.message.text }
}

async function publish(
  $: EngineInterface,
  notice?: string | null,
  shouldClearSelection = false,
): Promise<void> {
  const rows = buildRows(session.tree)
  await update($, view, current => ({
    rows,
    selection:
      shouldClearSelection || current.selection === null
        ? null
        : selectionFor(current.selection.id),
    notice: notice === undefined ? current.notice : notice,
  }))
}

async function syncFromSession($: EngineInterface): Promise<void> {
  if (!session.isSwitching) {
    syncNewMessages(session.tree, await $.session.messages())
  }
}

async function openPane($: EngineInterface): Promise<void> {
  await $.ui.open({ id: PANE_ID, title: PANE_TITLE, focus: true })
}

async function switchTo($: EngineInterface, target: SwitchTarget): Promise<string> {
  if (session.isTurnRunning) {
    return 'Wait for the reply to finish, then switch.'
  }

  if (target.kind === 'go' && target.nodeId === session.tree.leafId) {
    return `Already at the end of turn ${target.promptNumber}.`
  }

  session.pendingTargetId = target.nodeId
  session.switchedToId = null
  session.isSwitching = true

  try {
    await $.command.run({ command: COMPACT_COMMAND, args: SWITCH_INSTRUCTIONS })
  } catch (error) {
    return `Switch failed: ${describeError(error)}`
  } finally {
    session.pendingTargetId = null
    anchorCursor(session.tree, await $.session.messages())
    session.isSwitching = false
  }

  if (session.switchedToId !== target.nodeId) {
    return 'Switch did not happen: another plugin or the engine handled the compaction.'
  }

  if (target.refillText !== null) {
    await $.prompt.fill({ text: target.refillText })
  }

  const cost = formatTokens(estimateTokens(session.tree, target.nodeId))

  return `Switched to ${describeTarget(target)}. Like /rewind, the next reply re-reads this branch without the prompt cache: about ${cost} of messages, plus the session's context.`
}

const resolveTarget = (promptNumber: number, kind: SwitchKind): SwitchTarget | string => {
  const prompt = findPrompt(session.tree, promptNumber)

  return prompt === undefined
    ? `There is no turn ${promptNumber}. Run /tree list to see the turn numbers.`
    : targetFor(prompt, kind)
}

async function runQueuedSwitch($: EngineInterface): Promise<string | null> {
  const target = session.queuedSwitch

  if (target === null) {
    return null
  }

  session.queuedSwitch = null
  const message = await switchTo($, target)
  await publish($, message, session.tree.leafId === target.nodeId)
  $.ui.log(message)

  return message
}

function queueSwitch($: EngineInterface, target: SwitchTarget): void {
  session.queuedSwitch = target
  $.clock.after(0, () => void runQueuedSwitch($))
}

async function selectRow($: EngineInterface, id: string): Promise<void> {
  await update($, view, current => ({ ...current, selection: selectionFor(id), notice: null }))
}

async function cancelSelection($: EngineInterface): Promise<void> {
  await update($, view, current => ({ ...current, selection: null }))
}

async function actOnSelection(
  $: EngineInterface,
  chosen: TreeSelection,
  kind: SwitchKind,
): Promise<void> {
  const target = resolveTarget(chosen.number, kind)

  if (typeof target === 'string') {
    await publish($, target)

    return
  }

  await publish($, `Switching to ${describeTarget(target)}…`)
  queueSwitch($, target)
}

export const register: Register = on => {
  session.tree = createSessionTree()
  session.pendingTargetId = null
  session.switchedToId = null
  session.queuedSwitch = null
  session.isTurnRunning = false
  session.isSwitching = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND_NAME,
      description: 'See the branches of this conversation and jump to any earlier turn',
      argumentHint: '[list | go <n> | edit <n>]',
    })
    syncConversation(session.tree, await $.session.messages())
    await publish($, null)

    return next(e)
  })

  on('turn.start', (_$, e, next) => {
    session.isTurnRunning = true

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const completed = await next(e)

    if (e.agentId === undefined) {
      session.isTurnRunning = false
      await syncFromSession($)
      await publish($, null)
    }

    return completed
  })

  on('session.compact', async (_$, e, next) => {
    const targetId = session.pendingTargetId

    if (targetId === null || e.agentId !== undefined || e.instructions !== SWITCH_INSTRUCTIONS) {
      return next(e)
    }

    const messages = buildBranchMessages(session.tree, targetId, e.messages)
    session.tree.leafId = targetId
    session.switchedToId = targetId

    return { messages }
  })

  on('command.run', { command: COMMAND_NAME }, async ($, e) => {
    const [action = '', numberText = ''] = e.args.trim().split(/\s+/)
    await syncFromSession($)
    await publish($)

    if (action === '') {
      await openPane($)

      return {}
    }

    if (action === 'list') {
      return { text: formatTreeText(buildRows(session.tree)) }
    }

    if (action === 'go' || action === 'edit') {
      const target = resolveTarget(Number(numberText), action)

      if (typeof target === 'string') {
        return { text: target }
      }

      queueSwitch($, target)

      return { text: `Switching to ${describeTarget(target)}…` }
    }

    return { text: USAGE }
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const { rows, selection, notice } = await read($, view)
    const columns = e.props.bodyColumns

    return (
      <Box flexDirection="column">
        {rows.length === 0 && <Text dimColor>No turns yet. Send a prompt, then come back.</Text>}
        {rows.map(row => (
          <Button
            key={`row-${row.id}`}
            plain
            dimColor={!row.isOnPath}
            label={rowLabel(row, columns)}
            onPress={() => selectRow($, row.id)}
          />
        ))}
        {selection !== null && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>
              Turn {selection.number}
              {selection.isCurrentTurn ? ' (you are here)' : ''}
            </Text>
            <Text dimColor>
              Like /rewind, the next reply re-reads this branch without the prompt cache: about{' '}
              {formatTokens(selection.estimatedTokens)} of messages, plus the session's context.
            </Text>
            <Box gap={1}>
              {!selection.isCurrentTurn && (
                <Button
                  key="go"
                  hotkey="g"
                  variant="primary"
                  label="Continue from here"
                  onPress={() => actOnSelection($, selection, 'go')}
                />
              )}
              {selection.canEdit && (
                <Button
                  key="edit"
                  hotkey="e"
                  label="Edit this prompt"
                  onPress={() => actOnSelection($, selection, 'edit')}
                />
              )}
              <Button key="cancel" hotkey="c" label="Cancel" onPress={() => cancelSelection($)} />
            </Box>
          </Box>
        )}
        {notice !== null && <Text dimColor>{notice}</Text>}
      </Box>
    )
  })
}
