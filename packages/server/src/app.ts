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
  CLASSES, DRAFT_ITEMS, DRAFT_SPELLS,
  buildSheetRulesData, combatantFromCharacter, speciesSpeedFt,
} from '@questra/engine';
import { CharacterChoicesSchema } from '@questra/contracts';
import {
  AuthService, CampaignService, InMemoryAuthRepo, LogMailer, makeResolveToken,
  registerAuthRoutes, registerCampaignRoutes,
  verifySession, secretFromEnv, type AuthRepo, type TokenConfig,
} from './auth/index.js';
import { PostgresAuthRepo } from './auth/postgres-repo.js';
import type { ServerConfig } from './config.js';
import type { FastifyInstance } from 'fastify';

export interface App {
  core: SyncCore;
  /** Load a campaign's characters so the session can seat them (see below). */
  primeCampaignRoster: (playSessionId: string) => Promise<void>;
  auth: (app: FastifyInstance) => void;
  /** Release DB pools (if any). */
  close: () => Promise<void>;
}

let accountSeq = 0;
let campaignSeq = 0;
let playSessionSeq = 0;
let characterSeq = 0;
let roomSeq = 0;

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
  const campaigns = new CampaignService({
    repo,
    newCampaignId: () => `camp_${Date.now().toString(36)}_${(campaignSeq++).toString(36)}`,
    newPlaySessionId: () => `ps_${Date.now().toString(36)}_${(playSessionSeq++).toString(36)}`,
    newCharacterId: () => `char_${Date.now().toString(36)}_${(characterSeq++).toString(36)}`,
    newRoomId: () => `room_${Date.now().toString(36)}_${(roomSeq++).toString(36)}`,
  });

  /**
   * Seat the campaign's characters at the table.
   *
   * SyncCore takes `initialCombatants` as the base a session's event log folds
   * on top of, and nothing was supplying it — so every play session started
   * empty no matter who had made a character. This is the join between the
   * wizard's output and the engine's projection.
   *
   * Synchronous by necessity: the seam is called during session creation,
   * which is inside the hello path and cannot await. So the roster is loaded
   * ahead of time by `primeCampaignRoster` (below) and read from a cache
   * here. A session whose roster has not been primed yet seats nobody, which
   * is the same thing that happened before and is recoverable — the next
   * connection primes it.
   *
   * A character that fails validation is SKIPPED rather than thrown: one
   * corrupt row should cost that player their seat, not take the whole
   * table's session down with it.
   */
  const seatedByCampaign = new Map<string, Combatant[]>();

  const primeCampaignRoster = async (playSessionId: string): Promise<void> => {
    const campaignId = await repo.campaignIdForSession(playSessionId);
    if (!campaignId) return;
    const characters = await repo.charactersOfCampaign(campaignId);
    const seated: Combatant[] = [];
    for (const row of characters) {
      const parsed = CharacterChoicesSchema.safeParse(row.choices);
      if (!parsed.success) continue;
      const rules = buildSheetRulesData(
        [...CLASSES, ...DRAFT_ITEMS, ...DRAFT_SPELLS],
        speciesSpeedFt(parsed.data.speciesId),
      );
      seated.push(combatantFromCharacter({ id: row.id, choices: parsed.data }, rules));
    }
    seatedByCampaign.set(playSessionId, seated);
  };

  // --- SyncCore with the REAL resolveToken (stub is dead) + the slice resolver ---
  const core = new SyncCore({
    resolveToken: makeResolveToken(repo, tokens),
    resolveIntent: makeSliceResolver(),
    store: eventStore,
    initialCombatants: (playSessionId) => seatedByCampaign.get(playSessionId) ?? [],
  });

  const currentAccountId = async (authorization: string | undefined): Promise<string | null> => {
    const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!bearer) return null;
    const claims = await verifySession(bearer, tokens);
    return claims?.sub ?? null;
  };

  const mountAuth = (fastify: FastifyInstance): void => {
    registerAuthRoutes(fastify, auth, currentAccountId);
    registerCampaignRoutes(fastify, campaigns, currentAccountId);
  };

  return {
    core,
    primeCampaignRoster,
    auth: mountAuth,
    close: async () => {
      await eventStore.close();
      if (repo instanceof PostgresAuthRepo) await repo.close();
    },
  };
}

// -------------------------------------------------------------- slice resolver
/**
 * The dev-env's intent resolver: the vertical-slice attack path (mirrors the
 * persistence golden). Legal `attack` intents produce the engine cascade; anything
 * else rejects with a plain-language reason (the greying string). The full
 * per-intent resolver is play-slice scope.
 */
/** Exported so its behaviour can be asserted directly — the alternative is
    driving a socket to observe a pure function. */
export function makeSliceResolver(): IntentResolver {
  const rules: RulesData = buildRulesData(CONDITIONS.map((c) => RulesEntitySchema.parse(c)));
  // a deterministic-enough rng for a dev server (not a golden; real rolls in play)
  const rng = () => 0.5;
  let n = 0;

  return (envelope, state) => {
    const intent = envelope.intent as {
      kind?: string;
      attackerId?: string; targetId?: string; actionName?: string;
      creatureId?: string; text?: string;
      tokenId?: string; path?: { x: number; y: number }[];
    };
    const seq = state.nextSeq;
    const stamp = (i = 0) => ({
      seq: seq + i,
      id: `e-${n}-${String(i)}`,
      at: new Date().toISOString(),
    });

    /**
     * FREE TEXT IS THE ESCAPE HATCH THE WHOLE PRODUCT RESTS ON (Law 2, Brief 10
     * §4.1). A player who cannot find the right button types what they want to
     * do, and it becomes part of the table's record rather than being refused.
     * A DM narrating uses the same path — one composer, one event, no separate
     * chat channel to keep in sync.
     *
     * It resolves to narration rather than escalating to a Ruling because the
     * AI ruling tier is not wired to this server yet; saying the words out loud
     * to everybody is the honest subset of that behaviour, and it is what makes
     * a table feel live today.
     */
    if (intent.kind === 'free_text' && intent.text) {
      n++;
      return {
        ok: true,
        events: [{
          ...stamp(),
          causeId: `cause-say-${n}`,
          /* The envelope carries no account — SyncCore knows who sent it, the
             resolver does not. Attributing to the creature is both what the event
             body records and what a reader of the log actually wants. */
          actor: { kind: 'player', accountId: intent.creatureId ?? 'table', creatureId: intent.creatureId },
          visibility: 'public',
          body: { t: 'narration', text: intent.text, from: 'dm' },
        }] as PlayEvent[],
      };
    }

    /**
     * Moving a token. The path is trusted as declared for now — legality
     * (movement budget, difficult terrain, opportunity attacks) is checkIntent's
     * job and wiring it is the next piece. What matters here is that a move
     * REACHES EVERYONE: a table where one person drags a token and nobody else
     * sees it move is not a shared table.
     */
    if (intent.kind === 'move' && intent.tokenId && intent.path?.length) {
      const to = intent.path[intent.path.length - 1]!;
      const from = intent.path[0] ?? to;
      n++;
      return {
        ok: true,
        events: [{
          ...stamp(),
          causeId: `cause-move-${n}`,
          actor: { kind: 'player', accountId: intent.tokenId ?? 'table' },
          visibility: 'public',
          body: {
            t: 'token_moved',
            tokenId: intent.tokenId,
            from, to,
            path: intent.path,
            forced: false,
            /* Chebyshev, five feet a square (ADR-0012) — the same metric the
               engine's own geometry uses. */
            costFt: 5 * Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)),
          },
        }] as PlayEvent[],
      };
    }

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
      state, rules, () => rng(),
      {
        seq: base,
        timestamps: [`t-${n}-a`, `t-${n}-b`, `t-${n}-c`],
        ids: [`e-${n}-a`, `e-${n}-b`, `e-${n}-c`],
        rollId: `roll-${n}`,
        actor: { kind: 'player', accountId: attacker.id, creatureId: attacker.id },
      },
      `cause-attack-${n++}`,
    );
    return { ok: true, events };
  };
}
