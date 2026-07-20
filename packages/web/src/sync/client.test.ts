/**
 * SyncClient tests — the browser applies the server's truth and invents nothing.
 *
 * Drives the client over a fake WebSocket: hello on open, welcome adopts the
 * snapshot, events fold on top (the same engine `fold`), and a roll_made body
 * maps to the RollResultVM the DiceTray reveals (ADR-0008 — dice come from the
 * server, never a local roll).
 */
import { describe, it, expect, vi } from 'vitest';
import type { PlayEvent, ServerMsg, ProjectionSnapshot } from '@questra/contracts';
import { SyncClient, type SyncState } from './client.js';
import { rollMadeToVM } from './useSync.js';

/** A minimal fake WebSocket that captures sends and lets the test push messages. */
class FakeWebSocket {
  static OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  private listeners: Record<string, ((ev: unknown) => void)[]> = {};
  constructor(public url: string) {}
  addEventListener(type: string, fn: (ev: unknown) => void): void {
    (this.listeners[type] ??= []).push(fn);
  }
  removeEventListener(): void {}
  send(data: string): void { this.sent.push(data); }
  close(): void { this.emit('close', {}); }
  // test helpers
  open(): void { this.readyState = 1; this.emit('open', {}); }
  server(msg: ServerMsg): void { this.emit('message', { data: JSON.stringify(msg) }); }
  private emit(type: string, ev: unknown): void { (this.listeners[type] ?? []).forEach((f) => f(ev)); }
}

const SNAPSHOT = (): ProjectionSnapshot => ({
  combatants: {
    'pc-torvald': { id: 'pc-torvald', name: 'Torvald', abilities: { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }, profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 18, conditions: [], isPlayer: true },
    'npc-goblin-1': { id: 'npc-goblin-1', name: 'the goblin', abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 }, profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 15, conditions: [], isPlayer: false },
  },
  round: 1, activeCreatureId: 'pc-torvald', nextSeq: 42,
});

function setup() {
  let last: SyncState | undefined;
  const fake = new FakeWebSocket('ws://x');
  const client = new SyncClient({
    url: 'ws://x', playSessionId: 'ps', token: 'tok',
    onState: (s) => { last = s; },
    WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
  });
  client.connect();
  return { client, fake: (client as unknown as { ws: FakeWebSocket }).ws, getLast: () => last! };
}

describe('SyncClient', () => {
  it('sends hello on open with the token', () => {
    const { fake } = setup();
    fake.open();
    const hello = JSON.parse(fake.sent[0]!);
    expect(hello).toMatchObject({ m: 'hello', playSessionId: 'ps', token: 'tok' });
  });

  it('adopts the welcome snapshot as projection base', () => {
    const { fake, getLast } = setup();
    fake.open();
    fake.server({ m: 'welcome', viewer: { role: 'player' }, snapshotSeq: 41, snapshot: SNAPSHOT() });
    const s = getLast();
    expect(s.role).toBe('player');
    expect(s.lastSeq).toBe(41);
    expect(s.projection.combatants['npc-goblin-1']!.hp).toBe(10);
  });

  it('folds events onto the snapshot (server truth, one fold)', () => {
    const { fake, getLast } = setup();
    fake.open();
    fake.server({ m: 'welcome', viewer: { role: 'player' }, snapshotSeq: 41, snapshot: SNAPSHOT() });
    const dmg: PlayEvent = {
      seq: 43, id: 'e-dmg', at: '2026-07-20T09:00:00.000Z', actor: { kind: 'engine' }, visibility: 'public',
      // the server computed resultingHp; the client applies it (never recomputes).
      body: { t: 'damage_applied', creatureId: 'npc-goblin-1', amount: 9, type: 'slashing', breakdown: [], adjusted: {}, resultingHp: 1 },
    };
    fake.server({ m: 'event', event: dmg });
    const s = getLast();
    expect(s.projection.combatants['npc-goblin-1']!.hp).toBe(1); // the server's resultingHp
    expect(s.lastSeq).toBe(43);
    expect(s.log).toHaveLength(1);
  });

  it('surfaces an auth error as auth_failed, never a leaked state', () => {
    const { fake, getLast } = setup();
    fake.open();
    fake.server({ m: 'error', code: 'auth' });
    expect(getLast().status).toBe('auth_failed');
    expect(getLast().error).toBe('auth');
  });
});

describe('rollMadeToVM (ADR-0008 — dice reveal the server roll)', () => {
  it('maps a roll_made body to the RollResultVM the DiceTray reveals', () => {
    const event: PlayEvent = {
      seq: 42, id: 'e-roll', at: '2026-07-20T09:00:00.000Z', actor: { kind: 'player', accountId: 'acct-torvald' }, visibility: 'public',
      body: {
        t: 'roll_made', rollId: 'roll-1', kind: 'attack_roll', d20: 14, collapsed: 'straight',
        sources: [], modifiers: [{ label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }],
        total: 19, vs: { type: 'ac', value: 15 }, outcome: 'hit', entry: 'server',
      },
    };
    const vm = rollMadeToVM(event)!;
    expect(vm).toMatchObject({ rollId: 'roll-1', d20: 14, total: 19, outcome: 'hit', entry: 'server' });
    // the total is the server's; the client never recomputes it.
    expect(vm.total).toBe(19);
  });

  it('returns undefined for a non-roll event', () => {
    const narration: PlayEvent = {
      seq: 1, id: 'e-n', at: '2026-07-20T09:00:00.000Z', actor: { kind: 'engine' }, visibility: 'public',
      body: { t: 'narration', text: 'The blade bites.', from: 'engine' },
    };
    expect(rollMadeToVM(narration)).toBeUndefined();
  });
});
