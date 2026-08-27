#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { ruleCheckOf } = require(path.join(__dirname, 'prose-metrics'));

function readAllStdin() {
  return new Promise(resolve => {
    let buffer = '';
    process.stdin.on('data', chunk => { buffer += chunk; });
    process.stdin.on('end', () => resolve(buffer));
  });
}

function parseJsonOrNull(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function textOfContent(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .filter(block => block && block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n');
}

function lastAssistantText(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const entry = parseJsonOrNull(lines[index]);
    if (!entry || entry.type !== 'assistant' || !entry.message) {
      continue;
    }
    const text = textOfContent(entry.message.content);
    if (text.trim().length > 0) {
      return text;
    }
  }
  return '';
}

function blockReason(check) {
  const numbered = check.violations
    .map((violation, index) => (index + 1) + ') ' + violation)
    .join(' ');
  const advisoryTail = check.advisories.length > 0
    ? ' Also mind: ' + check.advisories.join('; ') + '.'
    : '';
  return 'READABILITY ENFORCEMENT. Your last reply broke these rules: ' + numbered
    + '. Rewrite that full reply now with every fix applied. Keep every fact, and keep code, '
    + 'identifiers, commands, paths, URLs and quoted values byte-exact.' + advisoryTail;
}

readAllStdin().then(rawInput => {
  try {
    const input = parseJsonOrNull(rawInput);
    if (!input || input.stop_hook_active || typeof input.transcript_path !== 'string') {
      return;
    }
    const text = lastAssistantText(input.transcript_path);
    if (text.length === 0) {
      return;
    }
    const check = ruleCheckOf(text);
    if (check.violations.length === 0) {
      return;
    }
    process.stdout.write(JSON.stringify({ decision: 'block', reason: blockReason(check) }));
  } catch (error) {
    return;
  }
});
