/**
 * Composition root (ADR-0015 dev-env). Wires the real pieces together and picks the
 * durable stores by config:
 *
 *   DATABASE_URL set   → PostgresEventStore + PostgresAuthRepo (durable)
 *   DATABASE_URL unset → InMemoryEventStore + InMemoryAuthRepo (bare dev / CI)
 *
 * This is where the resolveToken STUB finally dies: SyncCore gets the real
 * makeResolveToken(repo, tokenCfg), and /auth/* routes mount over the real
 * AuthService. The intent resolver here is the slice's attack path (mirrors the
 * persistence golden) — enough to run the end-to-end round-trip; the full
 * every-intent engine resolver is the play-slice's job, not the dev-env's.
 */
import {
  RulesEntitySchema, type PlayEvent,
} from '@questra/contracts';
import {
  buildRulesData, resolveAttack, CONDITIONS, type Combatant, type RulesData,
} from '@questra/engine';
import { SyncCore, type IntentResolver, type ResolvedToken } from './sync-core.js';
import { InMemoryEventStore, type EventStore } from './store/event-store.js';
import { PostgresEventStore } from './store/postgres-event-store.js';
import {
  AuthService, InMemoryAuthRepo, LogMailer, makeResolveToken, registerAuthRoutes,
  verifySession, secretFromEnv, type AuthRepo, type TokenConfig,
} from './auth/index.js';
import { PostgresAuthRepo } from './auth/postgres-repo.js';
import type { ServerConfig } from './config.js';
import type { FastifyInstance } from 'fastify';

export interface App {
  core: SyncCore;
  auth: (app: FastifyInstance) => void;
  /** Release DB pools (if any). */
  close: () => Promise<void>;
}

let accountSeq = 0;

/** Build the wired application from config. Does not start the HTTP server (main.ts does). */
export function createApp(config: ServerConfig): App {
  const usePg = Boolean(config.databaseUrl);

  // --- stores (durable vs in-memory) ---
  const eventStore: EventStore = usePg
    ? new PostgresEventStore(config.databaseUrl!)
    : new InMemoryEventStore();
  const repo: AuthRepo = usePg
    ? new PostgresAuthRepo(config.databaseUrl!)
    : new InMemoryAuthRepo();

  // --- auth ---
  if (!config.jwtSecret) {
    throw new Error('QUESTRA_JWT_SECRET is required to wire auth (set it in .env.local).');
  }
  const tokens: TokenConfig = { secret: secretFromEnv() };
  const auth = new AuthService({
    repo, mailer: new LogMailer(), tokens,
    newAccountId: () => `acc_${Date.now().toString(36)}_${(accountSeq++).toString(36)}`,
  });

  // --- SyncCore with the REAL resolveToken (stub is dead) + the slice resolver ---
  const core = new SyncCore({
    resolveToken: makeResolveToken(repo, tokens),
    resolveIntent: makeSliceResolver(),
    // seed the yard so a joining player's welcome snapshot has combatants to render
    // (matches web/src/screens/sliceConfig — Torvald + one goblin). The log folds
    // on top; a persisted session keeps its own state past the seed.
    initialCombatants: () => sliceCombatants(),
    store: eventStore,
  });

  const mountAuth = (fastify: FastifyInstance): void => {
    registerAuthRoutes(fastify, auth, async (authorization) => {
      const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
      if (!bearer) return null;
      const claims = await verifySession(bearer, tokens);
      return claims?.sub ?? null;
    });
  };

  return {
    core,
    auth: mountAuth,
    close: async () => {
      await eventStore.close();
      if (repo instanceof PostgresAuthRepo) await repo.close();
    },
  };
}

// -------------------------------------------------------------- slice content
/**
 * The yard's combatants — the projection a joining player's `welcome` snapshot
 * folds from. Ids match web/src/screens/sliceConfig (pc-torvald + npc-goblin-1) so
 * the client's hub finds its own creature and the map lines its tokens up.
 */
export function sliceCombatants(): Combatant[] {
  const pc = (id: string, name: string, hp: number, maxHp: number, ac: number): Combatant => ({
    id, name, abilities: { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    profBonus: 2, maxHp, hp, tempHp: 0, ac, conditions: [], isPlayer: true,
  });
  return [
    // the party (matches web/src/screens/sliceConfig's rail) — the slice's PC is Torvald
    pc('pc-torvald', 'Torvald', 12, 12, 18),
    pc('pc-wren', 'Wren', 22, 27, 14),
    pc('pc-mira', 'Mira', 18, 24, 16),
    pc('pc-ozren', 'Ozren', 9, 20, 12),
    {
      id: 'npc-goblin-1', name: 'the goblin',
      abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
      profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 15, conditions: [], isPlayer: false,
    },
  ];
}

// -------------------------------------------------------------- slice resolver
/**
 * The dev-env's intent resolver: the vertical-slice attack path (mirrors the
 * persistence golden). Legal `attack` intents produce the engine cascade; anything
 * else rejects with a plain-language reason (the greying string). The full
 * per-intent resolver is play-slice scope.
 */
export function makeSliceResolver(): IntentResolver {
  const rules: RulesData = buildRulesData(CONDITIONS.map((c) => RulesEntitySchema.parse(c)));
  // Rng = (sides) => an integer face in [1, sides]. Real dice for the dev server;
  // the golden tests script their own rng, so Math.random never touches a test.
  const rng = (sides: number): number => Math.floor(Math.random() * sides) + 1;
  let n = 0;
  return (envelope, state) => {
    const intent = envelope.intent as { kind?: string; attackerId?: string; targetId?: string; actionName?: string };
    if (intent.kind !== 'attack' || !intent.attackerId || !intent.targetId) {
      return { ok: false, reason: 'That action is not available yet.' };
    }
    const attacker = state.combatants[intent.attackerId];
    const target = state.combatants[intent.targetId];
    if (!attacker || !target) return { ok: false, reason: 'That target is not here.' };
    const base = state.nextSeq;
    const events: PlayEvent[] = resolveAttack(
      {
        kind: 'attack', attackerId: intent.attackerId, targetId: intent.targetId,
        actionName: intent.actionName ?? 'Attack', damageDice: '1d8 + 3', damageType: 'slashing',
        coverDegree: 'none',
      },
      state, rules, rng,
      {
        seq: base,
        // real ISO datetimes — PlayEventSchema requires z.string().datetime(); the
        // client's ServerMsgSchema drops any event whose `at` isn't ISO (a bad
        // placeholder here silently dropped every event client-side).
        timestamps: [new Date().toISOString(), new Date().toISOString(), new Date().toISOString()],
        ids: [`e-${n}-a`, `e-${n}-b`, `e-${n}-c`],
        rollId: `roll-${n}`,
        actor: { kind: 'player', accountId: attacker.id, creatureId: attacker.id },
      },
      `cause-attack-${n++}`,
    );
    return { ok: true, events };
  };
}
