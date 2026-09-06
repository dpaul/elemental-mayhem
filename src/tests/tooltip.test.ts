// Elemental Mayhem - Spell Tooltip Unit Tests
import { describe, it, expect, beforeEach } from 'vitest';
import { SpellTooltipManager } from '../ui/SpellTooltip';
import { Ability, Unit } from '../types';

class MockHTMLElement {
  public id = '';
  public className = '';
  public innerHTML = '';
  public offsetWidth = 320;
  public offsetHeight = 220;
  public style: Record<string, string> = {};
  public attributes: Record<string, string> = {};
  public classList = {
    classes: new Set<string>(),
    add: (c: string) => this.classList.classes.add(c),
    remove: (c: string) => this.classList.classes.delete(c),
    contains: (c: string) => this.classList.classes.has(c),
  };
  private listeners: Record<string, Function[]> = {};

  setAttribute(k: string, v: string) {
    this.attributes[k] = v;
  }
  getAttribute(k: string) {
    return this.attributes[k];
  }
  addEventListener(evt: string, fn: Function) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }
  dispatchEvent(evt: { type: string }) {
    this.listeners[evt.type]?.forEach((fn) => fn(evt));
  }
  getBoundingClientRect() {
    return { left: 100, top: 400, width: 80, height: 40, right: 180, bottom: 440, x: 100, y: 400 };
  }
}

describe('SpellTooltipManager', () => {
  let tooltipManager: SpellTooltipManager;
  let mockEl: MockHTMLElement;

  const mockFireball: Ability = {
    id: 'fireball',
    name: 'Fireball',
    element: 'Fire',
    icon: '🔥',
    apCost: 2,
    cooldown: 0,
    currentCooldown: 0,
    range: 4,
    aoeRadius: 1,
    targeting: 'SingleUnit',
    baseDamage: 28,
    description: 'Hurls a fiery sphere dealing damage and scorching the target.',
    appliesStatus: 'Burning',
    statusDuration: 2,
    createsHazard: 'LavaPool',
    hazardDuration: 3,
    level: 1,
  };

  const mockShield: Ability = {
    id: 'flame_ward',
    name: 'Flame Ward',
    element: 'Fire',
    icon: '🛡️',
    apCost: 1,
    cooldown: 3,
    currentCooldown: 0,
    range: 0,
    aoeRadius: 0,
    targeting: 'Self',
    baseDamage: 0,
    description: 'Envelops self in blazing armor to absorb incoming damage.',
    appliesStatus: 'Shielded',
    statusDuration: 2,
    level: 1,
  };

  const mockNatureEnemy: Unit = {
    id: 'enemy_nature_1',
    name: 'Treant Warden',
    faction: 'Enemy',
    avatar: '🌲',
    coord: { x: 3, y: 3 },
    stats: {
      maxHp: 100,
      currentHp: 80,
      maxAp: 3,
      currentAp: 3,
      moveCostPerTile: 1,
      elementalAffinity: 'Nature',
    },
    abilities: [],
    statusEffects: [],
    isDead: false,
  };

  const mockWaterEnemy: Unit = {
    id: 'enemy_water_1',
    name: 'Tide Serpent',
    faction: 'Enemy',
    avatar: '🐍',
    coord: { x: 2, y: 2 },
    stats: {
      maxHp: 100,
      currentHp: 90,
      maxAp: 3,
      currentAp: 3,
      moveCostPerTile: 1,
      elementalAffinity: 'Water',
    },
    abilities: [],
    statusEffects: [],
    isDead: false,
  };

  beforeEach(() => {
    mockEl = new MockHTMLElement();
    mockEl.className = 'spell-tooltip hidden';
    mockEl.classList.add('hidden');
    tooltipManager = new SpellTooltipManager(mockEl as unknown as HTMLElement);
  });

  it('should generate rich HTML containing spell damage, AP cost, range, and description', () => {
    const html = tooltipManager.generateTooltipHTML(mockFireball);

    expect(html).toContain('Fireball');
    expect(html).toContain('28');
    expect(html).toContain('DMG');
    expect(html).toContain('2 AP');
    expect(html).toContain('4 Tiles');
    expect(html).toContain('AoE: 1 Tile Radius');
    expect(html).toContain('Hurls a fiery sphere');
    expect(html).toContain('Burning');
    expect(html).toContain('LavaPool');
  });

  it('should display Support / Utility for zero-damage abilities', () => {
    const html = tooltipManager.generateTooltipHTML(mockShield);

    expect(html).toContain('Flame Ward');
    expect(html).toContain('Support / Utility');
    expect(html).toContain('1 AP');
    expect(html).toContain('Self');
    expect(html).toContain('3 Turns CD');
  });

  it('should display elemental advantages and disadvantages from CORE_ELEMENTS', () => {
    const html = tooltipManager.generateTooltipHTML(mockFireball);

    // Fire is strong against Nature / Ice / Glass and weak against Water / Earth
    expect(html).toContain('Strong vs');
    expect(html).toContain('Nature');
    expect(html).toContain('Weak vs');
    expect(html).toContain('Water');
  });

  it('should calculate dynamic damage against target units with elemental advantage', () => {
    // Fire vs Nature -> 1.5x multiplier -> 28 * 1.5 = 42
    const html = tooltipManager.generateTooltipHTML(mockFireball, {
      targetUnit: mockNatureEnemy,
    });

    expect(html).toContain('Treant Warden');
    expect(html).toContain('42 DMG');
    expect(html).toContain('+50% Advantage!');
  });

  it('should calculate dynamic damage against target units with elemental resistance', () => {
    // Fire vs Water -> 0.75x multiplier -> 28 * 0.75 = 21
    const html = tooltipManager.generateTooltipHTML(mockFireball, {
      targetUnit: mockWaterEnemy,
    });

    expect(html).toContain('Tide Serpent');
    expect(html).toContain('21 DMG');
    expect(html).toContain('-25% Resisted');
  });

  it('should display insufficient AP warning when player AP is below ability cost', () => {
    const html = tooltipManager.generateTooltipHTML(mockFireball, {
      currentAp: 1, // Fireball costs 2 AP
    });

    expect(html).toContain('Insufficient AP');
    expect(html).toContain('Needs 1 more AP');
  });

  it('should display on cooldown warning when ability currentCooldown > 0', () => {
    const coolingDownFireball: Ability = {
      ...mockFireball,
      currentCooldown: 2,
    };

    const html = tooltipManager.generateTooltipHTML(coolingDownFireball);

    expect(html).toContain('On Cooldown');
    expect(html).toContain('2 turns left');
  });

  it('should show and position the tooltip element in the DOM', () => {
    const targetRect = {
      left: 100,
      top: 500,
      width: 120,
      height: 60,
      right: 220,
      bottom: 560,
      x: 100,
      y: 500,
      toJSON: () => {},
    } as DOMRect;

    tooltipManager.show(mockFireball, targetRect);

    const tooltipEl = tooltipManager.getElement()!;
    expect(tooltipEl.classList.contains('hidden')).toBe(false);
    expect(tooltipEl.getAttribute('aria-hidden')).toBe('false');
    expect(tooltipEl.innerHTML).toContain('Fireball');
    expect(tooltipEl.style.display).toBe('block');

    tooltipManager.hide();
    expect(tooltipEl.classList.contains('hidden')).toBe(true);
    expect(tooltipEl.getAttribute('aria-hidden')).toBe('true');
  });

  it('should attach mouseenter and mouseleave listeners to trigger elements', () => {
    const button = new MockHTMLElement();

    tooltipManager.attach(button as unknown as HTMLElement, mockFireball);

    button.dispatchEvent({ type: 'mouseenter' });
    const tooltipEl = tooltipManager.getElement()!;
    expect(tooltipEl.classList.contains('hidden')).toBe(false);
    expect(tooltipEl.innerHTML).toContain('Fireball');

    button.dispatchEvent({ type: 'mouseleave' });
    expect(tooltipEl.classList.contains('hidden')).toBe(true);
  });
});
