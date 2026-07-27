#!/usr/bin/env node
const DIRECT_EDIT_LINE_BUDGET = 5;

const countLines = text => {
  if (!text) return 0;
  return String(text).split('\n').filter(line => line.trim() !== '').length;
};

const countWrittenLines = (toolName, toolInput) => {
  const input = toolInput || {};
  if (toolName === 'Write') return countLines(input.content);
  if (toolName === 'Edit') return countLines(input.new_string);
  if (toolName === 'MultiEdit') {
    const edits = Array.isArray(input.edits) ? input.edits : [];
    return edits.reduce((total, edit) => total + countLines(edit && edit.new_string), 0);
  }
  if (toolName === 'NotebookEdit') return countLines(input.new_source);
  return null;
};

const guardMessage = (toolName, lineCount) =>
  'ORCHESTRATOR GUARD: that ' + toolName + ' wrote ' + lineCount + ' lines of code directly — ' +
  'beyond the direct-edit escape hatch (a one-liner, a config flip). ' +
  'If you are the top-tier main-loop model, you are line-punching: stop, and delegate the remaining ' +
  'implementation to a cheaper subagent (explicit model override, one tier down) with a rich prompt — ' +
  'exact files, expected interfaces, constraints, self-verification steps. ' +
  'Batch any further small edits into that same delegation instead of making them yourself. ' +
  'If you are already a delegated subagent running on a cheaper tier, this guard does not bind you — continue.';

let input = '';
process.stdin.on('data', c => { input += c; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch (e) {
    return;
  }

  const toolName = payload && payload.tool_name;
  const lineCount = countWrittenLines(toolName, payload && payload.tool_input);
  if (lineCount === null || lineCount <= DIRECT_EDIT_LINE_BUDGET) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: guardMessage(toolName, lineCount)
    }
  }));
});
