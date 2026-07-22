/**
 * InfoPanel + its contracts adapter.
 *
 * The adapter tests parse REAL fixtures through RulesEntitySchema, so they
 * fail if the panel's view of an entity ever drifts from the spine.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RulesEntitySchema } from '@questra/contracts';
import { InfoPanel } from './InfoPanel.js';
import { entityToInfoPanel, kindLabel } from './entityToInfoPanel.js';

import prone from '@questra/contracts/src/fixtures/prone.json';
import fireball from '@questra/contracts/src/fixtures/fireball.json';
import goblin from '@questra/contracts/src/fixtures/goblin-warrior.json';
import fighter from '@questra/contracts/src/fixtures/fighter.json';

afterEach(cleanup);

describe('entityToInfoPanel — the contracts seam', () => {
  it('maps a condition: plain → summary, srd_text → rulesText', () => {
    const vm = entityToInfoPanel(RulesEntitySchema.parse(prone));
    expect(vm.name).toBe('Prone');
    expect(vm.kind).toBe('Condition');
    expect(vm.summary).toContain("You're on the ground");
    expect(vm.rulesText).toContain('Restricted Movement');
    expect(vm.homebrew).toBe(false);
    // Derivation is the caller's job, never the adapter's.
    expect(vm.derivation).toBeUndefined();
  });

  it('builds the spell kind line from meta', () => {
    const vm = entityToInfoPanel(RulesEntitySchema.parse(fireball));
    expect(vm.kind).toBe('Spell — Level 3 Evocation');
  });

  it('builds the creature kind line from the CR string', () => {
    expect(kindLabel(RulesEntitySchema.parse(goblin))).toBe('Creature — CR 1/4');
  });

  it('builds the class kind line from complexity', () => {
    const entity = RulesEntitySchema.parse((fighter as { class: unknown }).class);
    expect(kindLabel(entity)).toBe('Class — Low complexity');
  });
});

describe('InfoPanel — the three layers', () => {
  const proneVm = entityToInfoPanel(RulesEntitySchema.parse(prone));

  it('layer 1 is always visible', () => {
    render(<InfoPanel data={proneVm} open onClose={() => {}} />);
    expect(screen.getByText(/You're on the ground/)).toBeDefined();
  });

  it('layer 3 is collapsed by default and opens on demand', () => {
    render(<InfoPanel data={proneVm} open onClose={() => {}} />);
    const toggle = screen.getByRole('button', { name: /Full rules text/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    // The verbatim text isn't in the DOM until the layer is opened.
    expect(screen.queryByText(/Restricted Movement/)).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/Restricted Movement/)).toBeDefined();
  });

  it('omits the derivation layer entirely when there is none', () => {
    render(<InfoPanel data={proneVm} open onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /Where the numbers come from/ })).toBeNull();
  });

  it('renders derivation lines with their breakdown parts', () => {
    render(
      <InfoPanel
        data={{
          ...proneVm,
          derivation: [{ label: 'Hit points', value: 12, parts: ['10 hit die (max)', '2 CON mod'] }],
        }}
        open
        onClose={() => {}}
        defaultExpanded={{ derivation: true }}
      />,
    );
    expect(screen.getByText('Hit points')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('10 hit die (max) + 2 CON mod')).toBeDefined();
  });
});

describe('InfoPanel — selecting', () => {
  const vm = entityToInfoPanel(RulesEntitySchema.parse(fireball));

  it('hides the footer entirely without onChoose (pure reference)', () => {
    render(<InfoPanel data={vm} open onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull();
  });

  it('offers Choose inside the panel when the caller can select', () => {
    const onChoose = vi.fn();
    render(<InfoPanel data={vm} open onClose={() => {}} onChoose={onChoose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
    expect(onChoose).toHaveBeenCalledOnce();
  });
});

describe('InfoPanel — homebrew is never second-class', () => {
  it('renders the identical panel plus a quiet badge', () => {
    render(
      <InfoPanel
        data={{ name: 'Spellblade', kind: 'Class', summary: 'A duelist.', homebrew: true }}
        open
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Homebrew')).toBeDefined();
    // Same dialog, same structure — nothing downgraded.
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('A duelist.')).toBeDefined();
  });
});

describe('InfoPanel — dialog behaviour', () => {
  it('renders nothing when closed', () => {
    render(<InfoPanel data={{ name: 'X', kind: 'Y', summary: 'Z' }} open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a labelled modal dialog', () => {
    render(<InfoPanel data={{ name: 'Prone', kind: 'Condition', summary: 'On the ground.' }} open onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<InfoPanel data={{ name: 'X', kind: 'Y', summary: 'Z' }} open onClose={onClose} />);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
