#!/usr/bin/env node
// codecat — automated ASCII-cat companion. one entry, dispatched by a mode arg.
//   greet    (SessionStart)  cat wakes up and greets
//   react    (Stop)          cat occasionally loafs / zoomies between turns
//   tool     (PostToolUse)   cat celebrates git commit / push
//   farewell (SessionEnd)    cat curls up and says bye
// art lives in cats.txt. all user-facing output goes through the hook JSON
// `systemMessage` field — the one field shown directly to the human user.
// never throws, never blocks: any failure -> exit 0 with no output.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const MODE = process.argv[2] || 'react';

// tunables (env override). cooldown = min seconds between idle cats; chance = prob an
// eligible Stop actually shows one. defaults keep the cat a pleasant surprise, not spam.
const IDLE_COOLDOWN_MS = num(process.env.CODECAT_IDLE_COOLDOWN, 120) * 1000;
const IDLE_CHANCE = num(process.env.CODECAT_IDLE_CHANCE, 0.5);

function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }

readStdin().then(run).catch(() => process.exit(0));

function readStdin() {
  return new Promise(res => {
    if (process.stdin.isTTY) return res({});
    let s = '';
    process.stdin.on('data', c => { s += c; });
    process.stdin.on('end', () => { try { res(JSON.parse(s || '{}')); } catch { res({}); } });
    process.stdin.on('error', () => res({}));
  });
}

function run(input) {
  try {
    if (MODE === 'greet') return greet(input);
    if (MODE === 'tool') return tool(input);
    if (MODE === 'farewell') return emit(pick('farewell'));
    return react(input); // Stop
  } catch { process.exit(0); }
}

// --- modes ---

function greet(input) {
  const src = input.source || 'startup';
  if (src === 'compact') return process.exit(0); // mid-session compaction: stay quiet
  // seed the idle cooldown so a Stop cat does not pile on right after the greeting
  const p = statePath(input);
  const s = loadState(p);
  s.lastIdle = Date.now();
  saveState(p, s);
  const cat = src === 'resume' ? (pick('resume') || pick('greet')) : pick('greet');
  return emit(cat);
}

function react(input) {
  const p = statePath(input);
  const s = loadState(p);
  const now = Date.now();
  if (now - (s.lastIdle || 0) < IDLE_COOLDOWN_MS) return process.exit(0); // cooldown
  if (Math.random() >= IDLE_CHANCE) return process.exit(0);               // chance
  s.lastIdle = now;
  saveState(p, s);
  return emit(pick('idle'));
}

function tool(input) {
  if ((input.tool_name || '') !== 'Bash') return process.exit(0);
  const cmd = (input.tool_input && input.tool_input.command) || '';
  const p = statePath(input);
  const s = loadState(p);
  if (/\bgit\s+commit\b/.test(cmd)) {
    s.commits = (s.commits || 0) + 1;
    saveState(p, s);
    return emit(fill(pick('commit'), s.commits));
  }
  if (/\bgit\s+push\b/.test(cmd)) {
    s.pushes = (s.pushes || 0) + 1;
    saveState(p, s);
    return emit(pick('push'));
  }
  return process.exit(0);
}

// --- output ---

function emit(art) {
  if (art) process.stdout.write(JSON.stringify({ systemMessage: frame(art), suppressOutput: true }));
  process.exit(0);
}

// fence the art so markdown surfaces (e.g. the desktop app) render it in monospace,
// keeping the ASCII aligned. plain-text surfaces just show the fences harmlessly.
function frame(art) { return '```\n' + art.replace(/\s+$/, '') + '\n```'; }

function fill(art, n) { return art ? art.replace(/\{N\}/g, n) : art; }

// --- per-session state (cooldown + commit/push counters) in a temp file ---

function statePath(input) {
  const id = input.session_id || input.cwd || 'default';
  const key = crypto.createHash('sha1').update(String(id)).digest('hex').slice(0, 16);
  const dir = path.join(os.tmpdir(), 'codecat');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return path.join(dir, key + '.json');
}

function loadState(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { commits: 0, pushes: 0, lastIdle: 0 }; }
}

function saveState(p, s) {
  try { fs.writeFileSync(p, JSON.stringify(s)); } catch {}
}

// --- art library: parse cats.txt into { category: [art, ...] } ---

let LIB = null;
function lib() {
  if (LIB) return LIB;
  LIB = {};
  try {
    const txt = fs.readFileSync(path.join(__dirname, 'cats.txt'), 'utf8');
    let cat = null, buf = [];
    const flush = () => {
      if (cat) {
        const art = buf.join('\n').replace(/^\n+|\n+$/g, '');
        if (art.trim()) (LIB[cat] = LIB[cat] || []).push(art);
      }
      buf = [];
    };
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^@@\s*(\w+)\s*$/);
      if (m) { flush(); cat = m[1]; } else { buf.push(line); }
    }
    flush();
  } catch {}
  return LIB;
}

function pick(cat) {
  const a = lib()[cat] || [];
  return a.length ? a[Math.floor(Math.random() * a.length)] : '';
}
