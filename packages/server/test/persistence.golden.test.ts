/**
 * ADR-0015 exit criterion — the event log survives a server restart.
 *
 * A session's events are appended through the Postgres store; then a FRESH
 * SyncCore (simulating a process restart, its in-memory mirror empty) hydrates
 * from Postgres and must reach byte-identical projection state:
 *   fold(reloaded log) === fold(pre-restart log).
 *
 * This test needs a real Postgres. It SKIPS cleanly when DATABASE_URL is unset or
 * unreachable, so `check:all`/CI stay green without a database; it runs for real
 * against the docker-compose dev Postgres (or any DATABASE_URL) once one is up.
 * Bring it up:  docker compose up -d  &&  npm run migrate:up -w @questra/server
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RulesEntitySchema, type PlayEvent } from '@questra/contracts';
import { buildRulesData, resolveAttack, initialState, fold, CONDITIONS, type Combatant } from '@questra/engine';
import { SyncCore, PostgresEventStore, type ResolvedToken, type IntentResolver } from '../src/index.js';
import { connectMemory } from '../src/transport.js';
import { DATABASE_URL, WANTS_POSTGRES, requirePostgres } from './postgres.js';

const PS = `ps-persist-${Date.now()}`; // unique per run so re-runs don't collide

const torvald: Combatant = {
  id: 'pc-torvald', name: 'Torvald',
  abilities: { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 18, conditions: [{ conditionId: 'condition.prone' }], isPlayer: true,
};
const goblin: Combatant = {
  id: 'npc-goblin-1', name: 'the goblin',
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 15, conditions: [], isPlayer: false,
};

const engineRules = buildRulesData(CONDITIONS.map((c) => RulesEntitySchema.parse(c)));
const scriptedRng = (seq: number[]) => { let i = 0; return () => seq[i++]!; };

const resolveIntent: IntentResolver = (envelope, state) => {
  const intent = envelope.intent as { kind: string };
  if (intent.kind !== 'attack') return { ok: false, reason: 'no' };
  const events = resolveAttack(
    { kind: 'attack', attackerId: 'pc-torvald', targetId: 'npc-goblin-1', actionName: 'Longsword', damageDice: '1d8 + 3', damageType: 'slashing', coverDegree: 'half', attackModHooks: [{ label: 'Bless (1d4)', dice: '1d4', sourceId: 'spell.bless' }] },
    state, engineRules, scriptedRng([3, 14, 9, 6]),
    { seq: state.nextSeq, timestamps: ['t1', 't2', 't3'], ids: ['e-a', 'e-b', 'e-c'], rollId: 'roll-1', actor: { kind: 'player', accountId: 'acct-torvald', creatureId: 'pc-torvald' } },
    'cause-attack',
  );
  return { ok: true, events };
};
const resolveToken = (token: string, playSessionId: string): ResolvedToken | null =>
  token === 'tok-torvald' && playSessionId === PS ? { accountId: 'acct-torvald', role: 'player', playSessionId: PS } : null;

const initialCombatants = () => [{ ...torvald }, { ...goblin }];

describe.skipIf(!WANTS_POSTGRES)('ADR-0015 — the event log survives a server restart', () => {
  let store: PostgresEventStore | null = null;

  beforeAll(async () => {
    /* DATABASE_URL was set, so a database that is not there is the news —
       never a quiet pass. See test/postgres.ts. */
    await requirePostgres();
    store = new PostgresEventStore(DATABASE_URL!);
  });
  afterAll(async () => { await store?.close(); });

  it('fold(reloaded) === fold(pre-restart)', async () => {
    // --- server instance #1: drive the attack, persist, capture pre-restart state ---
    const core1 = new SyncCore({ resolveToken, resolveIntent, initialCombatants, store: store! });
    const player = connectMemory(core1, 'c-persist');
    player.send({ m: 'hello', playSessionId: PS, token: 'tok-torvald' });
    player.send({ m: 'intent', envelope: { idempotencyKey: 'persist-attack-1', intent: { kind: 'attack', attackerId: 'pc-torvald', targetId: 'npc-goblin-1', actionName: 'Longsword' } } });
    await core1.flush(PS);

    const preRestartLog = core1.logFor(PS) as PlayEvent[];
    const preRestartState = fold(initialState(initialCombatants()), preRestartLog);
    expect(preRestartState.combatants['npc-goblin-1']!.hp).toBe(1); // the hit landed

    // --- server instance #2: fresh process, empty memory, hydrate from Postgres ---
    const core2 = new SyncCore({ resolveToken, resolveIntent, initialCombatants, store: new PostgresEventStore(DATABASE_URL!) });
    await core2.hydrate(PS);
    const reloadedLog = core2.logFor(PS) as PlayEvent[];

    // the durable log reloads identically, and folds to identical state
    expect(reloadedLog).toEqual(preRestartLog);
    const reloadedState = fold(initialState(initialCombatants()), reloadedLog);
    expect(reloadedState).toEqual(preRestartState);
    expect(reloadedState.combatants['npc-goblin-1']!.hp).toBe(1);

    // idempotency survives too: replaying the same key re-acks, no re-emit
    const player2 = connectMemory(core2, 'c-persist-2');
    player2.send({ m: 'hello', playSessionId: PS, token: 'tok-torvald' });
    player2.send({ m: 'intent', envelope: { idempotencyKey: 'persist-attack-1', intent: { kind: 'attack', attackerId: 'pc-torvald', targetId: 'npc-goblin-1', actionName: 'Longsword' } } });
    await core2.flush(PS);
    expect((core2.logFor(PS) as PlayEvent[]).length).toBe(preRestartLog.length); // no duplicate cascade
  });
});
