# Questra — Complete Build Kit

A D&D 5e (SRD 5.2.1) companion / VTT app, designed top to bottom and ready to build.
This repository contains everything needed to build the app start to end.

## What's here

```
CLAUDE.md                    Standing orders for every Claude Code session (read first)
docs/
  MASTER-PLAN.md             The start-to-end build sequence, M0–M8
  specs/    (10 files)       The design specs — what the app is and why (Layer 1)
  briefs/   (13 + roadmap)   Implementation briefs — exact shapes to build (Layer 3)
  adr/      (14 + index)     Architecture Decision Records — the locked calls
packages/
  contracts/                 The shared spine as tested TypeScript (Layer 2)
    src/rules/               expression language, effect hooks, entity schemas
    src/play/                event vocabulary, visibility filter, shared pure rules
    src/fixtures/            canonical data (Prone, Fireball, Goblin, Fighter, Torvald trace)
    test/                    19 passing tests — the golden suite's seed
```

## First run

```bash
cd packages/contracts
npm install
npm run check        # typecheck + 19 tests, all green
```

## How to build from here

1. Read `CLAUDE.md`, then `docs/MASTER-PLAN.md`.
2. **Design track (parallel):** take the player hub, DM screen, wizard, and map
   through Claude Design; transcribe the token set into the repo theme (ADR-0014).
3. **Code track:** point Claude Code at a milestone. Each session reads exactly
   ONE brief + the contracts package + the ADR index — never all ten specs.
4. Milestone 1 is the SRD ingestion; Milestone 2 is the vertical slice (the gate
   where the AI/sync bets are measured). Everything after repeats the loop.

## The three layers (why the docs are shaped this way)

- **Specs** lock decisions and philosophy. Read for context, not for field names.
- **Contracts** are enforceable code. Features conform to them; they change only
  by deliberate contract PR (types + fixtures + tests together). This is the
  primary defense against LLM build-drift.
- **Briefs** are the buildable detail: exact shapes, worked examples, and
  acceptance criteria that map 1:1 onto tests. One brief = roughly one milestone's
  worth of focused work.

Built on SRD 5.2.1 (CC-BY-4.0 — see ADR-0010; the attribution screen ships in v1).
