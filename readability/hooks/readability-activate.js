#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const skillPath = path.join(__dirname, '..', 'skills', 'readability', 'SKILL.md');
const frontmatterPattern = /^---[\s\S]*?---\s*/;

const fallbackRules = 'READABILITY MODE. Everything you write must be easy to read. No exceptions.\n'
  + 'Scope: ALL prose — chat, plans, summaries, commits, PR titles and bodies, issue and review comments,\n'
  + 'docs, log and error strings, artifact and UI text. Technical material stays byte-exact: code,\n'
  + 'identifiers, commands, paths, URLs, regexes, versions, quoted output. Simplify the prose around them.\n'
  + 'Target: Flesch Reading Ease 60-70, grade level 7-9.\n'
  + 'Sentences: under 20 words on average. Split any sentence over 25 words. One idea per sentence.\n'
  + 'Voice: active in at least 90% of sentences. Subject, verb, object.\n'
  + 'Words: short and common. Use, not utilize. Get, not obtain. Cut filler and vague claims.\n'
  + 'Structure: paragraphs of 2-3 sentences. Headings and lists in long documents.\n'
  + 'Self-audit every output before you send it. Never trade accuracy for simplicity.';

let skillBody = '';
try {
  skillBody = fs.readFileSync(skillPath, 'utf8').replace(frontmatterPattern, '');
} catch (readError) {
  skillBody = '';
}

const activationBody = skillBody.trim() ? skillBody : fallbackRules;

process.stdout.write('READABILITY MODE ACTIVE\n\n' + activationBody);
