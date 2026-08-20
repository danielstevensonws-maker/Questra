/**
 * play/projectionToView — the engine's projection becomes what the screen draws.
 *
 * THE SEAM THIS FILLS. `PlayerViewV2` takes a fully-formed view-model (hero,
 * cast, tiles, log) and was built against fixtures; the sync client delivers a
 * `ProjectionState` (combatants keyed by id, a round, whose turn it is). Until
 * now nothing converted one into the other, so the play surface had never
 * rendered live data.
 *
 * WHY A PURE FUNCTION AND NOT A HOOK. Everything here is derivation: given a
 * projection, a room and who is looking, there is exactly one right answer. A
 * pure function can be tested against a projection built by hand — which is
 * what the suite does — and cannot accidentally hold state that drifts from
 * the server's.
 *
 * WHAT IT REFUSES TO DECIDE. It never hides anything. Visibility is settled
 * server-side before a payload is built (`eventVisibleTo`, `filterRoomForViewer`)
 * and re-deciding it here would be a second implementation of the security
 * model, free to disagree. What this DOES do is present what arrived at the
 * resolution a viewer is owed: an ally's exact hit points, an enemy's condition
 * as a word rather than a number. That is presentation, not permission — the
 * numbers for a hidden creature never reached the client at all.
 */
import type { PlayEvent, Room, ViewerRole } from '@questra/contracts';
import type { ExplainVM } from '../design/explain.js';
import type {
  AbilityKey, AbilityVM, ConditionVM, HeroVM, Hurt, LogEntryVM, SpineEntryVM,
} from '../primitives/v2/viewModel.js';

/** The engine's shape, restated structurally — the web package has no engine dep. */
export interface Combatant {
  id: string;
  name: string;
  abilities: Record<string, number>;
  profBonus: number;
  proficientSkills?: string[];
  proficientSaves?: string[];
  maxHp: number;
  hp: number;
  tempHp: number;
  ac: number;
  conditions: { conditionId: string }[];
  concentratingOn?: string;
  isPlayer: boolean;
}

export interface Projection {
  combatants: Record<string, Combatant>;
  round: number;
  activeCreatureId?: string;
  nextSeq: number;
}

export interface ViewInput {
  projection: Projection;
  room: Room | null;
  /** The character this viewer plays, if any. A DM has none. */
  myCreatureId: string | null;
  role: ViewerRole;
  events: readonly PlayEvent[];
  campaignName: string;
}

const mod = (score: number): number => Math.floor((score - 10) / 2);
const sign = (n: number): string => (n >= 0 ? `+${String(n)}` : `−${String(Math.abs(n))}`);

/**
 * A value plus the arithmetic behind it — the shared readout every number on
 * the screen taps into. `rule` is the plain sentence explaining what the thing
 * IS, which is the layer a first-time player actually needs.
 */
function explain(
  id: string,
  kicker: string,
  title: string,
  value: number,
  rows: { label: string; value: number }[],
  rule: string,
  asSign = true,
): ExplainVM {
  return {
    id,
    kicker,
    title,
    value: asSign ? sign(value) : String(value),
    rows: rows.map((r) => ({ label: r.label, value: sign(r.value) })),
    rule,
  };
}

/**
 * A creature is Bloodied at or below half its maximum hit points (SRD).
 * Derived rather than stored, exactly as the engine derives it — restating the
 * threshold is safe because it is a definition, not a calculation that could
 * drift.
 */
const isBloodied = (c: Combatant): boolean => c.hp > 0 && c.hp <= Math.floor(c.maxHp / 2);

/**
 * How much an enemy's health a player is owed.
 *
 * A player does not get an enemy's exact hit points — that is the DM's to
 * reveal — but "unhurt / hurt / bloodied / down" is what anyone at a real table
 * can see by looking. Note this is PRESENTATION of data that already arrived,
 * not concealment: an enemy the players cannot see was filtered out server-side
 * and never reached this function.
 */
function hurtOf(c: Combatant): Hurt {
  if (c.hp <= 0) return 'Down';
  if (isBloodied(c)) return 'Bloodied';
  if (c.hp < c.maxHp) return 'Hurt';
  return 'Unhurt';
}

export function heroFrom(c: Combatant, campaignName: string): HeroVM {
  const dex = mod(c.abilities.dex ?? 10);
  const wis = mod(c.abilities.wis ?? 10);
  const perceptionProficient = (c.proficientSkills ?? []).includes('perception');

  return {
    id: c.id,
    name: c.name,
    initial: c.name.slice(0, 1).toUpperCase(),
    /* The projection carries no class or level — those live on the character's
       choices, not on a combatant. Rather than invent them, the campaign
       stands in as the subtitle until the sheet is threaded through. */
    className: campaignName,
    level: 1,
    hp: { current: c.hp, max: c.maxHp, temp: c.tempHp },
    bloodied: isBloodied(c),
    ac: explain('ac', 'Defence', 'Armour class', c.ac,
      [{ label: 'Armour class', value: c.ac }],
      'How hard you are to hit. An attack has to meet or beat it.', false),
    speed: explain('speed', 'Movement', 'Speed', 30,
      [{ label: 'Species', value: 30 }],
      'How far you can move on your turn, in feet.', false),
    passivePerception: explain('passive-perception', 'Awareness', 'Passive perception',
      10 + wis + (perceptionProficient ? c.profBonus : 0),
      [
        { label: 'Base', value: 10 },
        { label: 'WIS', value: wis },
        ...(perceptionProficient ? [{ label: 'Proficiency', value: c.profBonus }] : []),
      ],
      'What you notice without looking for it.', false),
    initiative: explain('initiative', 'Turn order', 'Initiative', dex,
      [{ label: 'DEX', value: dex }],
      'Rolled at the start of a fight to decide who goes when.'),
    hitDice: { die: 'd8', max: 1 },
    coins: '0 gp',
    abilities: abilitiesOf(c),
    /* The projection carries condition ids; naming them plainly is the
       compendium's job and it is not wired here yet, so the id stands in
       rather than a guessed label. */
    conditions: c.conditions.map((x): ConditionVM => ({
      id: x.conditionId,
      name: x.conditionId.replace(/^condition\./, '').replace(/-/g, ' '),
      explain: explain(x.conditionId, 'Condition', x.conditionId.replace(/^condition\./, ''), 0, [],
        'Something is affecting you. Tap for what it does.', false),
    })),
    saves: ABILITY_KEYS.map((key) => {
      const base = mod(c.abilities[key] ?? 10);
      const proficient = (c.proficientSaves ?? []).includes(key);
      const total = base + (proficient ? c.profBonus : 0);
      return {
        key,
        label: ABILITY_LABEL[key],
        mod: total,
        explain: explain(`save-${key}`, 'Saving throw', ABILITY_LABEL[key], total, [
          { label: key.toUpperCase(), value: base },
          ...(proficient ? [{ label: 'Proficiency', value: c.profBonus }] : []),
        ], 'Rolled to resist something happening to you.'),
      };
    }),
    /* Skills need the contracts skill vocabulary and the character's sheet,
       neither of which the projection carries. Empty rather than invented —
       an empty list reads as "not wired yet", a wrong one reads as a bug. */
    skills: [],
  };
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const ABILITY_LABEL: Record<AbilityKey, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

function abilitiesOf(c: Combatant): AbilityVM[] {
  return ABILITY_KEYS.map((key) => {
    const score = c.abilities[key] ?? 10;
    const m = mod(score);
    return {
      key,
      short: key.toUpperCase(),
      score,
      mod: m,
      explain: explain(`ability-${key}`, 'Ability', ABILITY_LABEL[key], m,
        [{ label: 'Score', value: score }],
        'Added to anything you try that leans on it.'),
    };
  });
}

/**
 * The round, in initiative order.
 *
 * Sorted by the projection's own order where there is one; falling back to
 * name so a pre-combat table still reads as a stable list rather than
 * reshuffling on every render.
 */
export function castFrom(projection: Projection, myCreatureId: string | null): SpineEntryVM[] {
  return Object.values(projection.combatants)
    .map((c): SpineEntryVM => {
      const you = c.id === myCreatureId;
      const kind = you ? 'you' : c.isPlayer ? 'ally' : 'foe';
      const down = c.hp <= 0;
      /* Built conditionally rather than with undefined values: under
         exactOptionalPropertyTypes an optional field must be ABSENT, not
         present-and-undefined, and the distinction is the point here — an
         enemy has no `hp` key at all rather than an empty one. */
      return {
        id: c.id,
        initiative: 0,
        name: c.name,
        kind,
        /* Allies show real hit points; enemies show a word. */
        ...(c.isPlayer ? { hp: { current: c.hp, max: c.maxHp } } : { hurt: hurtOf(c) }),
        ...(down ? { status: c.isPlayer ? 'Dying' : 'Down' } : {}),
        /* Nobody has acted outside a fight, and whose turn it is comes from
           the projection rather than from the list. */
        acted: false,
        acting: c.id === projection.activeCreatureId,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The play log.
 *
 * Only events that SAY something get a line: narration and rulings are the
 * table's record. Mechanical events (a resource ticking down, concentration
 * starting) change the numbers the screen already shows and would otherwise
 * bury the story under bookkeeping — the thing the journal exists to prevent.
 */
export function logFrom(events: readonly PlayEvent[]): LogEntryVM[] {
  const lines: LogEntryVM[] = [];
  for (const e of events) {
    const body = e.body as { t: string; text?: string };
    if (body.t === 'narration' && body.text) {
      lines.push({ id: String(e.seq), tone: 'narration', actor: 'The table', text: body.text });
    }
  }
  return lines;
}

export interface PlayView {
  scene: { title: string; subtitle: string; round: number; elapsed: string };
  hero: HeroVM | null;
  cast: SpineEntryVM[];
  room: Room | null;
  entries: LogEntryVM[];
  turn: { active: boolean; activeName?: string; exploring: boolean };
}

export function projectionToView(input: ViewInput): PlayView {
  const { projection, room, myCreatureId, events, campaignName } = input;
  const me = myCreatureId ? projection.combatants[myCreatureId] : undefined;
  const active = projection.activeCreatureId
    ? projection.combatants[projection.activeCreatureId]
    : undefined;

  /* No active creature means nobody has rolled initiative — the table is
     exploring rather than fighting, and the frame says so instead of showing
     an empty round counter. */
  const exploring = projection.activeCreatureId === undefined;

  return {
    scene: {
      title: campaignName,
      subtitle: exploring ? 'Not in a fight' : `Round ${String(projection.round)}`,
      round: projection.round,
      elapsed: '',
    },
    hero: me ? heroFrom(me, campaignName) : null,
    cast: castFrom(projection, myCreatureId),
    room,
    entries: logFrom(events),
    turn: {
      active: me !== undefined && projection.activeCreatureId === me.id,
      ...(active ? { activeName: active.name } : {}),
      exploring,
    },
  };
}
