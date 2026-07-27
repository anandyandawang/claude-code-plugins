#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const DIRECT_EDIT_LINE_BUDGET = 5;
const RETRY_WINDOW_MS = 5 * 60 * 1000;
const ALLOW_WINDOW_MS = 10 * 60 * 1000;

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

const statePathFor = sessionId => {
  const sanitizedSessionId = String(sessionId || 'default').replace(/[^A-Za-z0-9_-]/g, '-');
  return path.join(os.tmpdir(), 'orchestrator-gate-' + sanitizedSessionId + '.json');
};

const targetKeyFor = (toolName, toolInput) => {
  const input = toolInput || {};
  return toolName + ':' + (input.file_path || input.notebook_path || '');
};

const loadState = statePath => {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch (e) {
    return {};
  }
};

const pruneState = (state, now) => {
  const cutoff = now - ALLOW_WINDOW_MS;
  const pruned = {};
  Object.keys(state).forEach(key => {
    const entry = state[key];
    if (!entry || typeof entry !== 'object') return;
    const deniedAt = Number(entry.deniedAt) || 0;
    const allowedUntil = Number(entry.allowedUntil) || 0;
    if (deniedAt < cutoff && allowedUntil < cutoff) return;
    pruned[key] = { deniedAt: deniedAt, allowedUntil: allowedUntil };
  });
  return pruned;
};

const saveState = (statePath, state) => {
  try {
    fs.writeFileSync(statePath, JSON.stringify(state));
  } catch (e) {
    return;
  }
};

const denyMessage = (toolName, lineCount) =>
  'ORCHESTRATOR GATE: this ' + toolName + ' would write ' + lineCount + ' lines directly — ' +
  'beyond the direct-edit escape hatch (a one-liner, a config flip). ' +
  'If you are the top-tier main-loop model, do not retry: delegate this implementation to a ' +
  'cheaper subagent (explicit model override, one tier down) with a rich prompt — exact files, ' +
  'expected interfaces, constraints, self-verification steps. ' +
  'If you are a delegated subagent on a cheaper tier (or this genuinely must be a direct edit), ' +
  'retry the exact same call — the gate will let it through.';

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
  const toolInput = payload && payload.tool_input;
  const lineCount = countWrittenLines(toolName, toolInput);
  if (lineCount === null || lineCount <= DIRECT_EDIT_LINE_BUDGET) return;

  const now = Date.now();
  const statePath = statePathFor(payload && payload.session_id);
  const state = pruneState(loadState(statePath), now);
  const targetKey = targetKeyFor(toolName, toolInput);
  const entry = state[targetKey];

  if (entry && entry.allowedUntil > now) {
    saveState(statePath, state);
    return;
  }

  if (entry && now - entry.deniedAt <= RETRY_WINDOW_MS) {
    entry.allowedUntil = now + ALLOW_WINDOW_MS;
    saveState(statePath, state);
    return;
  }

  state[targetKey] = { deniedAt: now, allowedUntil: 0 };
  saveState(statePath, state);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: denyMessage(toolName, lineCount)
    }
  }));
});
