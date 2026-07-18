import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Button, Chip, Label, Panel } from '../src/core/index.js';

afterEach(cleanup);

describe('Button', () => {
  it('renders children and fires onClick when enabled', () => {
    let clicked = 0;
    render(<Button onClick={() => (clicked += 1)}>Start a game</Button>);
    const btn = screen.getByText('Start a game');
    fireEvent.click(btn);
    expect(clicked).toBe(1);
  });

  it('does not fire onClick when disabled', () => {
    let clicked = 0;
    render(
      <Button disabled onClick={() => (clicked += 1)}>
        Nope
      </Button>,
    );
    fireEvent.click(screen.getByText('Nope'));
    expect(clicked).toBe(0);
  });

  it.each(['primary', 'hex', 'secondary', 'ghost'] as const)('renders the %s variant', (variant) => {
    render(<Button variant={variant}>Act</Button>);
    expect(screen.getByText('Act')).toBeDefined();
  });

  it('primary carries the ember background (the one accent)', () => {
    render(<Button variant="primary">Commit</Button>);
    const btn = screen.getByText('Commit') as HTMLButtonElement;
    expect(btn.style.background).toContain('var(--qa-ember)');
  });

  it('ghost uses the italic body font, not an ember fill', () => {
    render(<Button variant="ghost">Open the Chronicle ›</Button>);
    const btn = screen.getByText('Open the Chronicle ›') as HTMLButtonElement;
    expect(btn.style.fontStyle).toBe('italic');
    expect(btn.style.background).toBe('none');
  });
});

describe('Chip', () => {
  it('defaults to the dim vellum tone', () => {
    render(<Chip>CR ¼</Chip>);
    const chip = screen.getByText('CR ¼');
    expect(chip.style.color).toBe('var(--qa-vellum-dim)');
    expect(chip.style.background).toBe('var(--qa-vellum-ghost)');
  });

  it.each([
    ['danger', 'var(--qa-danger)'],
    ['heal', 'var(--qa-heal)'],
    ['arcane', 'var(--qa-arcane)'],
    ['steel', 'var(--qa-steel)'],
    ['gold', 'var(--qa-gold)'],
  ] as const)('tone %s maps to its semantic hue', (tone, hue) => {
    render(<Chip tone={tone}>x</Chip>);
    expect(screen.getByText('x').style.color).toBe(hue);
  });

  it('outline drops the fill for a hairline border', () => {
    render(
      <Chip tone="accent" outline>
        New entry
      </Chip>,
    );
    const chip = screen.getByText('New entry');
    expect(chip.style.background).toBe('transparent');
    expect(chip.style.border).toContain('1px solid');
  });
});

describe('Label', () => {
  it('is uppercase wide-tracked mono', () => {
    render(<Label>Party · 4</Label>);
    const el = screen.getByText('Party · 4');
    expect(el.style.fontFamily).toBe('var(--qa-font-mono)');
    expect(el.style.textTransform).toBe('uppercase');
  });

  it('accent tone is ember; explicit accent prop overrides', () => {
    render(<Label tone="accent">Turn</Label>);
    expect(screen.getByText('Turn').style.color).toBe('var(--qa-ember)');
    cleanup();
    render(<Label accent="var(--qa-danger)">Bloodied</Label>);
    expect(screen.getByText('Bloodied').style.color).toBe('var(--qa-danger)');
  });
});

describe('Panel', () => {
  it('renders the mono label header and children', () => {
    render(
      <Panel label="WHAT ONLY YOU KNOW">
        <span>secret</span>
      </Panel>,
    );
    expect(screen.getByText('WHAT ONLY YOU KNOW')).toBeDefined();
    expect(screen.getByText('secret')).toBeDefined();
  });

  it('collapsed hides children and toggles via the control', () => {
    let toggled = 0;
    render(
      <Panel label="X" collapsible collapsed onToggle={() => (toggled += 1)}>
        <span>body</span>
      </Panel>,
    );
    expect(screen.queryByText('body')).toBeNull();
    fireEvent.click(screen.getByTitle('Expand'));
    expect(toggled).toBe(1);
  });

  it('raised uses the heavier glass fill', () => {
    const { container } = render(<Panel raised>menu</Panel>);
    const shell = container.firstElementChild as HTMLElement;
    expect(shell.style.background).toBe('var(--qa-glass-raised)');
  });
});
