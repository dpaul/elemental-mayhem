import { describe, it, expect, beforeEach } from 'vitest';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { CombatEngine } from '../engine/CombatEngine';
import { EnemyAI } from '../engine/EnemyAI';
import { EscalationManager } from '../engine/EscalationManager';
import { createHeroForElement, createCPUChampion } from '../constants/classes';
import { HUDManager } from '../ui/HUDManager';

class MockHTMLElement {
  public id = '';
  public textContent = '';
  public innerHTML = '';
  public style: Record<string, string> = {};
  public addEventListener() {}
  public scrollBy() {}
}

const mockStore: Record<string, MockHTMLElement> = {};
function getMock(id: string) {
  if (!mockStore[id]) {
    mockStore[id] = new MockHTMLElement();
    mockStore[id].id = id;
  }
  return mockStore[id];
}

(globalThis as any).document = {
  getElementById: (id: string) => getMock(id),
  createElement: () => new MockHTMLElement(),
};

describe('CPU Player Champions (Opposing Elemental Champions)', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let escalation: EscalationManager;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);
    escalation = new EscalationManager();
  });

  it('should verify all round enemies spawn as full CPU Player Champions with 10 AP and 10+ abilities', () => {
    // Check multiple rounds (standard, mid, and late)
    const testRounds = [1, 2, 4, 7, 12, 25];

    for (const round of testRounds) {
      const enemies = escalation.generateRoundEnemies(round);
      expect(enemies.length).toBeGreaterThan(0);

      for (const cpu of enemies) {
        // Every CPU is marked as a player champion
        expect(cpu.isCPU).toBe(true);
        expect(cpu.championClass).toBeDefined();
        expect(cpu.faction).toBe('Enemy');

        // Stats match real players: 10 Action Points per turn!
        expect(cpu.stats.maxAp).toBeGreaterThanOrEqual(10);
        expect(cpu.stats.currentAp).toBe(cpu.stats.maxAp);

        // Player HP standard (at least 100 HP)
        expect(cpu.stats.maxHp).toBeGreaterThanOrEqual(100);
        expect(cpu.stats.currentHp).toBe(cpu.stats.maxHp);

        // Full spellbook: at least 10 abilities matching playable champion classes
        expect(cpu.abilities.length).toBeGreaterThanOrEqual(10);

        // Has an elemental shield/ward ability
        const hasShield = cpu.abilities.some(
          (a) =>
            a.targeting === 'Self' ||
            a.appliesStatus === 'Shielded' ||
            a.name.toLowerCase().includes('shield') ||
            a.name.toLowerCase().includes('aegis') ||
            a.name.toLowerCase().includes('ward') ||
            a.name.toLowerCase().includes('armor')
        );
        expect(hasShield).toBe(true);
      }
    }
  });

  it('should instantiate dedicated CPU Champions using createCPUChampion', () => {
    const cpuPyromancer = createCPUChampion('Fire', {
      name: 'CPU Flame Sorcerer',
      coord: { x: 5, y: 5 },
    });

    expect(cpuPyromancer.isCPU).toBe(true);
    expect(cpuPyromancer.name).toBe('CPU Flame Sorcerer');
    expect(cpuPyromancer.championClass).toBe('Pyromancer');
    expect(cpuPyromancer.stats.maxAp).toBe(10);
    expect(cpuPyromancer.stats.maxHp).toBe(100);
    expect(cpuPyromancer.abilities.length).toBe(10);
    expect(cpuPyromancer.abilities.some((a) => a.id === 'flame_shield')).toBe(true);
  });

  it('should enable CPU AI to cast defensive shields on itself with its 10 AP budget', () => {
    const hero = createHeroForElement('Water');
    hero.coord = { x: 2, y: 5 };

    const cpu = createCPUChampion('Fire', {
      coord: { x: 3, y: 5 }, // adjacent
    });

    // Injure CPU so it prioritizes defensive shielding
    cpu.stats.currentHp = 40; // 40/100 HP

    const engine = new CombatEngine(grid, hazardManager, hero, [cpu]);
    const ai = new EnemyAI(engine);

    const steps = ai.planTurnSteps(cpu, hero);
    expect(steps.length).toBeGreaterThan(0);

    // One of the steps should be casting its defensive shield on itself
    const shieldCast = steps.find(
      (s) => s.type === 'cast' && (s.ability.targeting === 'Self' || s.ability.appliesStatus === 'Shielded')
    );
    expect(shieldCast).toBeDefined();
    if (shieldCast && shieldCast.type === 'cast') {
      // Target coord should be the CPU's own coordinate, not the player's coordinate!
      expect(shieldCast.targetCoord.x).toBe(cpu.coord.x);
      expect(shieldCast.targetCoord.y).toBe(cpu.coord.y);
    }
  });

  it('should enable CPU AI to execute multi-ability combos within 10 AP without duplicate cooldown casts', () => {
    const hero = createHeroForElement('Earth');
    hero.coord = { x: 4, y: 5 };

    const cpu = createCPUChampion('Fire', {
      coord: { x: 6, y: 5 },
    });
    cpu.stats.currentAp = 10;

    const engine = new CombatEngine(grid, hazardManager, hero, [cpu]);
    const ai = new EnemyAI(engine);

    const steps = ai.planTurnSteps(cpu, hero);
    const casts = steps.filter((s) => s.type === 'cast');

    // With 10 AP, the CPU should execute multiple actions (moves and casts)
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(casts.length).toBeGreaterThanOrEqual(1);

    // Verify abilities with cooldown > 0 are not cast more than once during the same turn
    const cooldownAbilitiesCast = casts
      .map((c) => (c.type === 'cast' ? c.ability : null))
      .filter((a) => a && a.cooldown > 0)
      .map((a) => a!.id);

    const uniqueCooldownCasts = new Set(cooldownAbilitiesCast);
    expect(cooldownAbilitiesCast.length).toBe(uniqueCooldownCasts.size);
  });

  it('should display CPU Player Champion archetype and spell deck in Target Inspector', () => {
    const hud = new HUDManager();
    const cpu = createCPUChampion('Fire', {
      name: 'CPU Pyromancer Ignis',
      coord: { x: 5, y: 5 },
    });

    hud.inspectUnit(cpu, cpu.coord);

    const targetDetails = document.getElementById('target-details');
    expect(targetDetails?.innerHTML).toContain('Opposing CPU Player Champion');
    expect(targetDetails?.innerHTML).toContain('Pyromancer');
    expect(targetDetails?.innerHTML).toContain('Spell Deck (10 Powers)');
    expect(targetDetails?.innerHTML).toContain('Flame Strike');
    expect(targetDetails?.innerHTML).toContain('Flame Aegis (Shield)');
  });
});
