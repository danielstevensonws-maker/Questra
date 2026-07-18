import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import {
  HPBar,
  StatBlock,
  Avatar,
  MapToken,
  AbilityCard,
  MenuItem,
  ReactionButton,
} from '../src/hud/index.js';

afterEach(cleanup);

const fillOf = (container: HTMLElement): string => {
  // HPBar = <wrap><track><fill/></track><text/></wrap>
  const track = container.firstElementChild!.firstElementChild as HTMLElement;
  const fill = track.firstElementChild as HTMLElement;
  return fill.style.background;
};

describe('HPBar', () => {
  it('reads warm when healthy (>= 40%)', () => {
    const { container } = render(<HPBar value={22} max={27} />);
    expect(fillOf(container)).toBe('var(--qa-hp-full)');
  });

  it('turns ember when bloodied (< 40%)', () => {
    const { container } = render(<HPBar value={4} max={12} />);
    expect(fillOf(container)).toBe('var(--qa-hp-low)');
  });

  it('foe bars read ember even at full health', () => {
    const { container } = render(<HPBar value={12} max={12} foe />);
    expect(fillOf(container)).toBe('var(--qa-hp-low)');
  });

  it('shows the mono readout by default and hides it when showText=false', () => {
    render(<HPBar value={22} max={27} />);
    expect(screen.getByText('22/27')).toBeDefined();
    cleanup();
    render(<HPBar value={22} max={27} showText={false} />);
    expect(screen.queryByText('22/27')).toBeNull();
  });
});

describe('StatBlock', () => {
  it('renders label, big modifier and optional score', () => {
    render(<StatBlock label="DEX" mod="+3" score={17} />);
    expect(screen.getByText('DEX')).toBeDefined();
    expect(screen.getByText('+3')).toBeDefined();
    expect(screen.getByText('17')).toBeDefined();
  });

  it('omits the sub-score when not provided', () => {
    render(<StatBlock label="AC" mod={14} size="lg" />);
    expect(screen.getByText('14')).toBeDefined();
    // only label + mod render; no third value
    expect(screen.queryByText('undefined')).toBeNull();
  });
});

describe('Avatar', () => {
  it('renders the initial and is square by default, circle on request', () => {
    const { container, rerender } = render(<Avatar initial="W" color="var(--qa-class-rogue)" />);
    let tile = container.firstElementChild as HTMLElement;
    expect(tile.textContent).toBe('W');
    expect(tile.style.borderRadius).toBe('var(--qa-radius-sm)');
    rerender(<Avatar initial="B" shape="circle" />);
    tile = container.firstElementChild as HTMLElement;
    expect(tile.style.borderRadius).toBe('50%');
  });
});

describe('MapToken', () => {
  it('active gets the vellum spotlight ring; inactive uses its colour', () => {
    const { container } = render(<MapToken label="W" color="var(--qa-class-rogue)" active />);
    const disk = container.firstElementChild as HTMLElement;
    expect(disk.style.border).toContain('var(--qa-vellum)');
  });

  it('renders an optional status tag', () => {
    render(<MapToken label="G1" color="var(--qa-danger)" foe tag="Bloodied" />);
    expect(screen.getByText('Bloodied')).toBeDefined();
  });
});

describe('AbilityCard', () => {
  it('legal card is enabled and shows the note (non-italic)', () => {
    render(<AbilityCard tag="ACTION" name="Dagger Strike" note="1d4 +3 piercing" />);
    const note = screen.getByText('1d4 +3 piercing');
    expect(note.style.fontStyle).toBe('normal');
    const btn = screen.getByText('Dagger Strike').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('illegal card (reason set) is disabled, dimmed, and italic — reason replaces note', () => {
    render(
      <AbilityCard tag="BONUS" name="Hide" note="Stealth vs Perception" reason="They've already seen you" />,
    );
    const btn = screen.getByText('Hide').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.style.opacity).toBe('0.55');
    // the note is replaced by the reason, shown italic
    expect(screen.queryByText('Stealth vs Perception')).toBeNull();
    const reason = screen.getByText("They've already seen you");
    expect(reason.style.fontStyle).toBe('italic');
  });
});

describe('MenuItem', () => {
  it('renders icon, label and sub-line, and fires onClick', () => {
    let clicked = 0;
    render(
      <MenuItem icon="↺" label="Undo & event log" sub="Every action is reversible" onClick={() => (clicked += 1)} />,
    );
    expect(screen.getByText('↺')).toBeDefined();
    expect(screen.getByText('Every action is reversible')).toBeDefined();
    fireEvent.click(screen.getByText('Undo & event log'));
    expect(clicked).toBe(1);
  });

  it.each([
    ['accent', 'var(--qa-ember)'],
    ['danger', 'var(--qa-danger)'],
    ['default', 'var(--qa-glass-text)'],
  ] as const)('tone %s colours the label', (tone, color) => {
    render(<MenuItem label="Row" tone={tone} />);
    expect(screen.getByText('Row').style.color).toBe(color);
  });
});

describe('ReactionButton', () => {
  it('renders the emoji and fires onClick', () => {
    let fired = '';
    render(<ReactionButton emoji="🔥" onClick={() => (fired = '🔥')} />);
    const btn = screen.getByText('🔥');
    fireEvent.click(btn);
    expect(fired).toBe('🔥');
  });

  it('is a round glass control', () => {
    render(<ReactionButton emoji="👏" />);
    const btn = screen.getByText('👏') as HTMLButtonElement;
    expect(btn.style.borderRadius).toBe('50%');
    expect(btn.style.background).toBe('var(--qa-glass)');
  });
});
