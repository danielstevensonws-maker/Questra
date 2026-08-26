/**
 * The ADR-0017 measurement harness — `npm run metrics -w @questra/server`.
 *
 * WHY THIS EXISTS. ADR-0017 is the M2 go/no-go gate and every cell in its table
 * reads _TBD_. Its measurement procedure is five paragraphs of manual ritual —
 * wire a vendor, open two devices, drive the Playbook §7 script, read devtools,
 * fill the table by hand — and a gate that costs an afternoon to re-run is a
 * gate that gets run once and then quoted from memory. Three milestones are now
 * stacked on numbers nobody has.
 *
 * So the rows that need no vendor and no second device are measured HERE, on
 * demand, in one command; the rows that genuinely need a live model and a human
 * eye print what they still need instead of a number. The point is that the
 * distinction stops being a paragraph somebody has to remember and becomes
 * output you can read.
 *
 * WHY A SCRIPT AND NOT A TEST. These are timings on whatever hardware happens to
 * be running them, and a timing assertion in CI is a flake generator — it would
 * fail on a loaded runner and teach everyone to re-run red builds. The
 * CORRECTNESS these numbers sit on (replay determinism, fog cleanliness, the
 * fallback ladder) is already asserted in the golden suites and stays there.
 * This measures; it does not gate.
 */
import { performance } from 'node:perf_hooks';
import { SyncCore } from '../dist/sync-core.js';
import { connectMemory } from '../dist/transport.js';
import { fold, initialState } from '@questra/engine';

const SESSION = 'ps-metrics';
const TOKEN = 'tok-metrics';

/** Six clients and five hundred events — the Brief 05 load smoke's own numbers. */
const CLIENTS = 6;
const EVENTS = 500;

const resolveToken = (token, playSessionId) =>
  token === TOKEN && playSessionId === SESSION
    ? { accountId: 'acct-metrics', role: 'dm', playSessionId: SESSION }
    : null;

/**
 * One event per intent, alternating between an event the fold MUTATES STATE for
 * and one it does not.
 *
 * A log of pure narration would fan out honestly and fold in no time at all,
 * because narration never survives a fold — reporting that as "fold(log)" would
 * be reporting the cost of skipping five hundred events. A real session's log is
 * a mixture, so this is one.
 */
let seq = 0;
const resolveIntent = () => {
  seq++;
  const body = seq % 2 === 0
    ? { t: 'narration', text: `event ${seq}`, from: 'engine' }
    : { t: 'damage_applied', creatureId: TARGET.id, amount: 1, type: 'slashing', breakdown: [{ label: 'hit', value: 1 }], adjusted: {}, resultingHp: Math.max(0, TARGET.maxHp - Math.ceil(seq / 2)) };
  return {
    ok: true,
    events: [{
      seq,
      id: `e-${seq}`,
      at: new Date().toISOString(),
      actor: { kind: 'dm', accountId: 'acct-metrics' },
      visibility: 'public',
      body,
    }],
  };
};

/** Somebody for the damage to land on, so the fold has work to do. */
const TARGET = {
  id: 'npc-dummy', name: 'the practice dummy',
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  profBonus: 2, maxHp: 1000, hp: 1000, tempHp: 0, ac: 10,
  conditions: [], isPlayer: false,
};

const ms = (n) => `${n.toFixed(1)}ms`;

function measureReplay() {
  const core = new SyncCore({ resolveToken, resolveIntent, initialCombatants: () => [TARGET] });

  const clients = [];
  for (let i = 0; i < CLIENTS; i++) {
    const c = connectMemory(core, `c-${i}`);
    c.send({ m: 'hello', playSessionId: SESSION, token: TOKEN });
    clients.push(c);
  }

  const fanOutStart = performance.now();
  for (let i = 0; i < EVENTS; i++) {
    core.onMessage(clients[0], {
      m: 'intent',
      envelope: { idempotencyKey: `metrics-${i}-00000000`, intent: { kind: 'free_text', creatureId: 'c1', text: `event ${i}` } },
    });
  }
  const fanOutMs = performance.now() - fanOutStart;

  /* The replay a seventh client pays on joining a session already 500 events
     deep — the thing the load smoke actually asks about. */
  const replayStart = performance.now();
  const latecomer = connectMemory(core, 'c-late');
  latecomer.send({ m: 'hello', playSessionId: SESSION, token: TOKEN });
  const replayMs = performance.now() - replayStart;

  const log = core.logFor(SESSION);
  const foldStart = performance.now();
  fold(initialState([TARGET]), log);
  const foldMs = performance.now() - foldStart;

  return { fanOutMs, replayMs, foldMs, events: log.length };
}

const r = measureReplay();

console.log('');
console.log('ADR-0017 — what this machine can measure without a vendor');
console.log('─'.repeat(72));
console.log(`  Sync load smoke      ${CLIENTS} clients, ${r.events} events`);
console.log(`    fan-out            ${ms(r.fanOutMs)}  (${ms(r.fanOutMs / r.events)} per event, filtered to ${CLIENTS} viewers)`);
console.log(`    replay on join     ${ms(r.replayMs)}  ← the ADR row: target < 2000ms`);
console.log(`    fold(log)          ${ms(r.foldMs)}  (${r.events} events, half of them state-changing)`);
console.log(`    verdict            ${r.replayMs < 2000 ? 'PASS' : 'FAIL'}`);
console.log('');
console.log('    SERVER-SIDE ONLY. These run through the in-process transport, so');
console.log('    they are the cost the server pays and exclude the network a real');
console.log('    client is on. That is the honest half to measure here — the other');
console.log('    half is the round-trip row below, and it needs two devices.');
console.log('');
console.log('  Still needs the slice environment — these are not shy of a number,');
console.log('  they are waiting on something a script cannot provide:');
console.log('    Ruling first-token p95   a live RulingModel  (set QUESTRA_RULING_API_KEY)');
console.log('    Roll → narration         two physical devices on a real network');
console.log('    Asset acceptability      a live ImageGen + the C1 seed art, and a human eye');
console.log('    Map render fps           a browser, on the play-mode canvas');
console.log('');
console.log('  Record what you get in questra-blueprint/adr/0017-slice-metrics.md.');
console.log('');
