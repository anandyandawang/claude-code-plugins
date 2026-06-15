#!/usr/bin/env node
// codecat — automated ASCII-cat companion. one entry, dispatched by a mode arg.
//   greet    (SessionStart)  cat wakes up and greets
//   react    (Stop)          cat occasionally loafs / zoomies / plays an animation between turns
//   tool     (PostToolUse)   cat celebrates git commit / push
//   farewell (SessionEnd)    cat curls up and says bye
//
// art lives in cats.txt. two kinds of art:
//   @@ <category>   single-shot frame, picked at random (greet/resume/idle/commit/push/farewell)
//   @@@ <name>      a flipbook ANIMATION: multiple frames separated by a line of `~~~`,
//                   played one frame per idle appearance so the cat appears to move over
//                   successive turns. (true frame-by-frame animation is impossible here:
//                   hooks run once with no TTY and no streaming — see README.)
//
// all user-facing art goes through the hook JSON `systemMessage` field — the one field
// shown directly to the human. on greet/farewell we ALSO emit a `terminalSequence` with an
// allowlisted OSC 9 desktop notification, so the cat is harder to miss (any surface that
// doesn't support it simply ignores the field).
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
// when an idle cat does show, prob it's an animation (vs a single-shot loaf).
const ANIM_CHANCE = num(process.env.CODECAT_ANIM_CHANCE, 0.6);
// while an animation is mid-play, frames bypass the chance roll and use this shorter
// cooldown, so the sequence reads as connected motion over the next few turns.
const ANIM_FRAME_COOLDOWN_MS = num(process.env.CODECAT_ANIM_FRAME_COOLDOWN, 15) * 1000;

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
    if (MODE === 'farewell') return emit(pick('farewell'), notify('codecat: see you soon'));
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
  s.anim = null; // fresh session: no animation in flight
  saveState(p, s);
  const resume = src === 'resume';
  const cat = resume ? (pick('resume') || pick('greet')) : pick('greet');
  return emit(cat, notify(resume ? 'codecat: welcome back' : 'codecat is awake'));
}

function react(input) {
  const p = statePath(input);
  const s = loadState(p);
  const now = Date.now();
  const inAnim = !!(s.anim && anims()[s.anim.name]);
  // mid-animation: shorter cooldown + no chance roll, so the frames actually play out.
  const cooldown = inAnim ? Math.min(IDLE_COOLDOWN_MS, ANIM_FRAME_COOLDOWN_MS) : IDLE_COOLDOWN_MS;
  if (now - (s.lastIdle || 0) < cooldown) return process.exit(0);          // cooldown
  if (!inAnim && Math.random() >= IDLE_CHANCE) return process.exit(0);     // chance (not mid-anim)
  s.lastIdle = now;
  const art = nextIdleFrame(s); // mutates s.anim
  saveState(p, s);
  return emit(art);
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

// pick the next idle frame, advancing/starting/finishing an animation as needed.
function nextIdleFrame(s) {
  const A = anims();
  // continue an animation already in flight
  if (s.anim && A[s.anim.name]) {
    const frames = A[s.anim.name];
    const idx = s.anim.next || 0;
    if (idx < frames.length) {
      s.anim = idx + 1 < frames.length ? { name: s.anim.name, next: idx + 1 } : null;
      return frames[idx];
    }
    s.anim = null; // ran off the end (e.g. art edited) — drop it
  }
  // not mid-animation: maybe start one, else fall back to a single-shot loaf
  const names = Object.keys(A);
  if (names.length && Math.random() < ANIM_CHANCE) {
    const name = names[Math.floor(Math.random() * names.length)];
    const frames = A[name];
    s.anim = frames.length > 1 ? { name, next: 1 } : null;
    return frames[0];
  }
  s.anim = null;
  return pick('idle');
}

// --- output ---

function emit(art, seq) {
  if (!art) process.exit(0);
  const out = { systemMessage: frame(art), suppressOutput: true };
  if (seq) out.terminalSequence = seq;
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

// build an allowlisted terminalSequence: an OSC 9 desktop notification (+ optional bell).
// surfaces that don't support it ignore the field harmlessly; anything non-allowlisted
// would just be dropped. control bytes are built via fromCharCode to keep this source clean.
// disable with CODECAT_NOTIFY=0; add an audible bell with CODECAT_BELL=1.
function notify(text) {
  if (process.env.CODECAT_NOTIFY === '0') return '';
  const ESC = String.fromCharCode(27), BEL = String.fromCharCode(7);
  const bell = process.env.CODECAT_BELL === '1' ? BEL : '';
  const safe = String(text).split(BEL).join(' ').split(ESC).join(' '); // no control chars in the OSC payload
  return ESC + ']9;' + safe + BEL + bell;
}

// fence the art so markdown surfaces (e.g. the desktop app) render it in monospace,
// keeping the ASCII aligned. plain-text surfaces just show the fences harmlessly.
function frame(art) { return '```\n' + art.replace(/\s+$/, '') + '\n```'; }

function fill(art, n) { return art ? art.replace(/\{N\}/g, n) : art; }

// --- per-session state (cooldown + commit/push counters + animation cursor) in a temp file ---

function statePath(input) {
  const id = input.session_id || input.cwd || 'default';
  const key = crypto.createHash('sha1').update(String(id)).digest('hex').slice(0, 16);
  const dir = path.join(os.tmpdir(), 'codecat');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return path.join(dir, key + '.json');
}

function loadState(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { commits: 0, pushes: 0, lastIdle: 0, anim: null }; }
}

function saveState(p, s) {
  try { fs.writeFileSync(p, JSON.stringify(s)); } catch {}
}

// --- art library: parse cats.txt into single-shots and animations ---
//   @@ <category>  -> DATA.single[category] = [art, ...]
//   @@@ <name>     -> DATA.anims[name]      = [frame, ...]   (frames split on a `~~~` line)

let DATA = null;
function data() {
  if (DATA) return DATA;
  DATA = { single: {}, anims: {} };
  try {
    const txt = fs.readFileSync(path.join(__dirname, 'cats.txt'), 'utf8');
    const trim = a => a.join('\n').replace(/^\n+|\n+$/g, '');
    let mode = null, cat = null, name = null, buf = [], frames = [], fbuf = [];
    const flushFrame = () => { const f = trim(fbuf); if (f.trim()) frames.push(f); fbuf = []; };
    const flush = () => {
      if (mode === 'single' && cat) {
        const art = trim(buf);
        if (art.trim()) (DATA.single[cat] = DATA.single[cat] || []).push(art);
      } else if (mode === 'anim' && name) {
        flushFrame();
        if (frames.length && !DATA.anims[name]) DATA.anims[name] = frames;
      }
      buf = []; frames = []; fbuf = [];
    };
    for (const line of txt.split(/\r?\n/)) {
      const ma = line.match(/^@@@\s*([\w-]+)\s*$/);
      const ms = line.match(/^@@\s*(\w+)\s*$/);
      if (ma) { flush(); mode = 'anim'; name = ma[1]; cat = null; }
      else if (ms) { flush(); mode = 'single'; cat = ms[1]; name = null; }
      else if (mode === 'anim' && /^\s*~{3,}\s*$/.test(line)) flushFrame();
      else if (mode === 'anim') fbuf.push(line);
      else if (mode === 'single') buf.push(line);
      // lines before the first header are ignored
    }
    flush();
  } catch {}
  return DATA;
}

function anims() { return data().anims; }

function pick(cat) {
  const a = data().single[cat] || [];
  return a.length ? a[Math.floor(Math.random() * a.length)] : '';
}
