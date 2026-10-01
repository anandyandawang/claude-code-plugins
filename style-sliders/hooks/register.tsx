import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { DialId, StyleReading, StyleSettings } from '../types'
import {
  DEFAULT_SETTINGS,
  DIAL_SPECS,
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
  formatLimit,
  formatStatusLine,
  measuredValue,
  parseSlidersCommand,
  sanitizeSettings,
  sliderBar,
  stepDial,
  toggleDial,
} from './dials'
import type { Breach, SlidersCommand } from './dials'
import { measureText } from './metrics'

type Engine = Pick<EngineInterface, 'state' | 'store' | 'ui' | 'prompt'>

const PANE_ID = 'style-sliders'
const STORE_KEY = 'settings'
const TARGETS_SECTION_ID = 'style-sliders:targets'
const PANE_ROWS = 18

const LABEL_WIDTH = 16
const LAST_LABEL_WIDTH = 20
const LIMIT_WIDTH = 13
const STEP_BUTTON_WIDTH = 5
const TOGGLE_BUTTON_WIDTH = 7
const ROW_GAP_COUNT = 5
const FIXED_ROW_WIDTH =
  LABEL_WIDTH + LIMIT_WIDTH + 2 * STEP_BUTTON_WIDTH + TOGGLE_BUTTON_WIDTH + ROW_GAP_COUNT
const MIN_BAR_WIDTH = 6
const MAX_BAR_WIDTH = 24
const PANE_COLUMNS = FIXED_ROW_WIDTH + MIN_BAR_WIDTH + 8

const PASS_MARK = ' ✓'
const FAIL_MARK = ' ✗'

const settings = atom({ plugin: 'style-sliders', key: 'settings' } as const, DEFAULT_SETTINGS)
const last = atom({ plugin: 'style-sliders', key: 'last' } as const, null)

const refreshStatus = async ($: Engine): Promise<void> => {
  $.ui.status(formatStatusLine(await read($, settings), await read($, last)))
}

const changeSettings = async (
  $: Engine,
  change: (current: StyleSettings) => StyleSettings,
): Promise<StyleSettings> => {
  const changed = await update($, settings, change)
  await $.store.set(STORE_KEY, changed)
  await refreshStatus($)
  return changed
}

const loadSettings = async ($: Engine): Promise<void> => {
  const stored = await $.store.get(STORE_KEY)
  await update($, settings, () => sanitizeSettings(stored))
  await refreshStatus($)
}

const recordReading = async ($: Engine, reading: StyleReading): Promise<void> => {
  await update($, last, () => reading)
  await refreshStatus($)
}

const breachToast = (breaches: readonly Breach[]): string =>
  `style: reply was ${breaches.map(breachPhrase).join(', ')}`

const measureAnswer = async ($: Engine, answer: string): Promise<void> => {
  const reading = measureText(answer)
  if (reading === null) return
  await recordReading($, reading)
  const breaches = findBreaches(await read($, settings), reading)
  if (breaches.length > 0) $.ui.toast(breachToast(breaches))
}

const confirmationFor = (command: SlidersCommand, changed: StyleSettings): string => {
  if (command.kind === 'set') {
    const spec = dialSpec(command.dial)
    return `${spec.label} set to ${formatLimit(spec, changed.dials[command.dial].value)}.`
  }
  if (command.kind === 'switch') {
    return `${dialSpec(command.dial).label} turned ${command.isOn ? 'on' : 'off'}.`
  }
  if (command.kind === 'formula') {
    return `Grade formula set to ${GRADE_FORMULA_LABELS[changed.gradeFormula]}.`
  }
  if (command.kind === 'reset') return 'Sliders reset to the defaults.'
  if (command.kind === 'all-off') return 'All dials turned off.'
  return 'Sliders updated.'
}

const openPane = async ($: Engine): Promise<string> => {
  const opened = await $.ui.open({
    id: PANE_ID,
    title: 'Output style',
    focus: true,
    closeOnEscape: true,
    rows: PANE_ROWS,
    columns: PANE_COLUMNS,
  })
  return opened.isPlaced
    ? 'Output style sliders opened.'
    : `Output style sliders are open but not drawn yet: ${opened.reason}`
}

const runSlidersCommand = async ($: Engine, args: string): Promise<{ text: string }> => {
  const command = parseSlidersCommand(args)
  if (command.kind === 'open') return { text: await openPane($) }
  if (command.kind === 'help') return { text: SLIDERS_USAGE }
  if (command.kind === 'error') return { text: command.message }
  if (command.kind === 'show') {
    return { text: describeSettings(await read($, settings), await read($, last)) }
  }
  const changed = await changeSettings($, current => applySlidersCommand(current, command))
  const description = describeSettings(changed, await read($, last))
  return { text: `${confirmationFor(command, changed)}\n${description}` }
}

const reviseLastReply = async ($: Engine): Promise<void> => {
  const reading = await read($, last)
  if (reading === null) return
  const current = await read($, settings)
  await $.prompt.submit({ text: composeRevisionPrompt(current, reading), asUser: true })
  await $.ui.close({ id: PANE_ID })
}

const barWidthFor = (bodyColumns: number): number =>
  Math.min(MAX_BAR_WIDTH, Math.max(MIN_BAR_WIDTH, bodyColumns - FIXED_ROW_WIDTH))

type LastStatus = 'pass' | 'fail' | 'untracked'

type LastLine = { id: DialId; text: string; status: LastStatus }

const formatMeasured = (id: DialId, measured: number): string =>
  id === 'gradeLevel' || id === 'readingEase' ? measured.toFixed(1) : `${Math.round(measured)}`

const lastLabel = (id: DialId, current: StyleSettings): string => {
  if (id === 'totalWords') return 'Words'
  if (id === 'paragraphWords') return 'Longest paragraph'
  if (id === 'sentenceWords') return 'Longest sentence'
  if (id === 'gradeLevel') return `Grade (${GRADE_FORMULA_LABELS[current.gradeFormula]})`
  return 'Reading ease'
}

const lastStatus = (id: DialId, current: StyleSettings, breaches: readonly Breach[]): LastStatus => {
  if (!current.dials[id].isOn) return 'untracked'
  return breaches.some(breach => breach.dial === id) ? 'fail' : 'pass'
}

const lastLines = (current: StyleSettings, reading: StyleReading): LastLine[] => {
  const breaches = findBreaches(current, reading)
  return DIAL_SPECS.map(spec => ({
    id: spec.id,
    text: `${lastLabel(spec.id, current).padEnd(LAST_LABEL_WIDTH)}${formatMeasured(spec.id, measuredValue(reading, spec.id, current.gradeFormula))}`,
    status: lastStatus(spec.id, current, breaches),
  }))
}

const markFor = (status: LastStatus): string => (status === 'pass' ? PASS_MARK : FAIL_MARK)

const markColor = (status: LastStatus): string => (status === 'pass' ? 'green' : 'red')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'sliders',
      description: 'Tune output style sliders: word limits, grade level, reading ease',
    })
    await loadSettings($)

    return next(e)
  }).catch((_, e, next) => next(e))

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear' || e.reason === 'resume') {
      await update($, last, () => null)
      await refreshStatus($)
    }

    return next(e)
  }).catch((_, e, next) => next(e))

  on('command.run', { command: 'sliders' }, ($, e) => runSlidersCommand($, e.args))

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const text = composeTargetsSection(await read($, settings))
    if (text === null) return composed

    return {
      ...composed,
      sections: [...composed.sections, { id: TARGETS_SECTION_ID, text, scope: 'session' }],
    }
  }).catch((_, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    const text = composeTurnContext(await read($, settings), await read($, last))

    return text === null ? next(e) : next({ ...e, context: [...(e.context ?? []), text] })
  }).catch((_, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const completed = await next(e)
    const isMainReply = e.agentId === undefined && e.reason === 'answer' && e.answer !== ''
    if (isMainReply) await measureAnswer($, e.answer)

    return completed
  }).catch((_, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const current = await read($, settings)
    const reading = await read($, last)
    const barWidth = barWidthFor(e.props.bodyColumns)
    const lines = reading === null ? [] : lastLines(current, reading)
    const hasBreaches = reading !== null && findBreaches(current, reading).length > 0

    return (
      <Box flexDirection="column">
        {DIAL_SPECS.map(spec => {
          const dial = current.dials[spec.id]

          return (
            <Box flexDirection="column">
              <Box gap={1} flexWrap="wrap">
                <Text dimColor={!dial.isOn}>{spec.label.padEnd(LABEL_WIDTH)}</Text>
                <Button
                  key={`${spec.id}:down`}
                  label="-"
                  dimColor={!dial.isOn}
                  onPress={() => changeSettings($, value => stepDial(value, spec.id, -1))}
                />
                <Text dimColor={!dial.isOn}>{sliderBar(spec, dial.value, barWidth)}</Text>
                <Button
                  key={`${spec.id}:up`}
                  label="+"
                  dimColor={!dial.isOn}
                  onPress={() => changeSettings($, value => stepDial(value, spec.id, 1))}
                />
                <Text dimColor={!dial.isOn}>{formatLimit(spec, dial.value).padEnd(LIMIT_WIDTH)}</Text>
                <Button
                  key={`${spec.id}:toggle`}
                  label={dial.isOn ? 'on' : 'off'}
                  onPress={() => changeSettings($, value => toggleDial(value, spec.id))}
                />
              </Box>
              {spec.id === 'gradeLevel' && (
                <Box>
                  <Text>{' '.repeat(LABEL_WIDTH + 1)}</Text>
                  <Button
                    key="formula"
                    label={`Formula: ${GRADE_FORMULA_LABELS[current.gradeFormula]}`}
                    onPress={() => changeSettings($, cycleGradeFormula)}
                  />
                </Box>
              )}
            </Box>
          )
        })}
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Last reply</Text>
          {reading === null && <Text dimColor>No reply measured yet.</Text>}
          {lines.map(line => (
            <Box>
              <Text dimColor={line.status === 'untracked'}>{line.text}</Text>
              {line.status !== 'untracked' && (
                <Text color={markColor(line.status)}>{markFor(line.status)}</Text>
              )}
            </Box>
          ))}
          {reading !== null && reading.isSmallSample && <Text dimColor>(small sample)</Text>}
        </Box>
        <Box marginTop={1} gap={1} flexWrap="wrap">
          {hasBreaches && (
            <Button key="revise" label="Revise last reply" onPress={() => reviseLastReply($)} />
          )}
          <Button key="all-off" label="All off" onPress={() => changeSettings($, allDialsOff)} />
          <Button key="reset" label="Reset" onPress={() => changeSettings($, () => DEFAULT_SETTINGS)} />
          <Button key="close" label="Close" role="dismiss" onPress={() => $.ui.close({ id: PANE_ID })} />
        </Box>
      </Box>
    )
  })
}
