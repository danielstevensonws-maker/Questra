# Questra — Agent Instructions

Read this file first, every session. Then read `docs/` as needed. If a request conflicts with
this file, say so before writing code.

## What we're building

A single app that lets five friends who have never played D&D finish a real session together,
remotely, on the same night they decide to try. Not a toolbox. A session, start to finish.

**Platform: desktop web app. Browser only — no install.**
The MVP promise is "click a link and play tonight." An Electron download is 90 seconds of friction
at the exact moment we're asking five people to commit, and it will cost us groups. Desktop-first
layout (the DM needs a map and panels; players need a HUD). Phone as a second screen is a v2 idea,
not a v1 one.

## The five laws

1. **Automate the math, never the ruling.**
   The engine resolves dice, HP, ranges, spell slots, conditions, durations. The engine never
   decides *whether* a roll is needed, *what happens* on success, or *what the fiction is*. The
   DM does that. AI may *suggest* a DC or a roll type; the DM confirms or overrides in one tap.
   Violating this makes the DM a spectator at their own table. It is the fastest way to kill this
   product.

2. **The app must never say no.**
   Every screen has an escape hatch. Free-text "just describe what happens." DM can override any
   number, any result, any state, at any time. No rules engine can model D&D. If a player invents
   something the app doesn't support, the app gets out of the way. An app that says no is a jail,
   and tables abandon jails within one session.

3. **Everything is undoable.**
   Game state is an append-only event log. Every mutation is an event. Undo is a first-class,
   always-available action for the DM. Misclicks happen constantly and a table that can't undo
   stops trusting the app.

4. **Screen time is a cost, not a goal.**
   D&D is five people imagining together. If a player is looking at their phone during someone
   else's turn, we are losing. Nothing on screen may *require* reading while another player is
   talking. Prefer glanceable state, audio cues, and animation over text.

5. **Teach by doing, never by explaining.**
   No tutorial walls, no tooltips nobody reads. The interface teaches the rules by only ever
   offering legal actions and showing why. See `docs/09-onboarding.md`.

## Non-goals for v1

Stated so you don't drift. Do not build these unless explicitly asked:

- Map *editor* (we ship pre-made maps; see `docs/02-scope.md`)
- AI portrait / asset generation
- Voice chat (v1 assumes players are on Discord)
- Multiclassing, feats, variant rules, homebrew classes
- Encumbrance, food/water, ammunition tracking
- Matchmaking / finding strangers to play with
- Anything above level 5

## How to work

- **TypeScript, strict. No `any`.** Rules-engine code is pure functions with unit tests. If you
  can't test it, you've structured it wrong.
- **Server is authoritative.** Clients send intents, never state. See `docs/03-architecture.md`.
- **Build vertical slices, not layers.** "A goblin can be attacked and die, end to end" beats
  "the combat data model is complete."
- **When you're unsure about a rule, ask — don't guess.** Wrong D&D rules destroy trust with the
  exact users we're trying to win, because they *can't tell* the app is wrong. That's worse than
  a crash.
- **Content is CC-licensed SRD 5.2 only.** See `docs/11-content-pipeline.md`. Never use D&D
  trademarks or reserved IP (Beholder, Aasimar, Artificer, "Dungeons & Dragons") in content, the
  product, or marketing copy. Attribution notice ships in the app.

## Definition of done for any feature

- Works when a client disconnects and rejoins mid-session
- The DM can override or undo it
- It makes a sound
- A person who has never played D&D can use it without being told how
