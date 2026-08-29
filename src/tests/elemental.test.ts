import { describe, it, expect, beforeEach } from 'vitest';
import { ElementalMatrix } from '../engine/ElementalMatrix';
import { ReactionEngine } from '../engine/ReactionEngine';
import { StatusEffectManager } from '../engine/StatusEffectManager';
import { Unit } from '../types';

describe('ElementalMatrix & Affinities (TDD Red -> Green)', () => {
  let matrix: ElementalMatrix;

  beforeEach(() => {
    matrix = new ElementalMatrix();
  });

  it('should calculate correct affinity multipliers (1.5x for strong, 0.75x for weak, 1.0x for neutral)', () => {
    // Water -> Fire = strong (1.5x)
    expect(matrix.getAffinityMultiplier('Water', 'Fire')).toBe(1.5);
    // Fire -> Water = weak (0.75x)
    expect(matrix.getAffinityMultiplier('Fire', 'Water')).toBe(0.75);
    // Lightning -> Water = strong (1.5x)
    expect(matrix.getAffinityMultiplier('Lightning', 'Water')).toBe(1.5);
    // Neutral -> Fire = 1.0x
    expect(matrix.getAffinityMultiplier('Neutral', 'Fire')).toBe(1.0);
  });

  it('should calculate base damage factoring attacker & defender affinities', () => {
    const rawDamage = 20;
    const finalDmg = matrix.calculateDamage(rawDamage, 'Water', 'Fire');
    expect(finalDmg).toBe(30); // 20 * 1.5 = 30
  });
});

describe('ReactionEngine (TDD Red -> Green)', () => {
  let reactionEngine: ReactionEngine;

  beforeEach(() => {
    reactionEngine = new ReactionEngine();
  });

  it('should trigger Vaporize when Fire hits Wet target', () => {
    const reaction = reactionEngine.evaluateUnitReaction('Fire', 'Wet');
    expect(reaction).not.toBeNull();
    expect(reaction?.reactionName).toBe('Vaporize');
    expect(reaction?.bonusDamage).toBeGreaterThan(0);
  });

  it('should trigger Superconduct when Lightning hits Wet target', () => {
    const reaction = reactionEngine.evaluateUnitReaction('Lightning', 'Wet');
    expect(reaction).not.toBeNull();
    expect(reaction?.reactionName).toBe('Superconduct');
    expect(reaction?.statusApplied).toBe('Shocked');
  });

  it('should trigger Toxic Explosion when Fire hits Poisoned target', () => {
    const reaction = reactionEngine.evaluateUnitReaction('Fire', 'Poisoned');
    expect(reaction).not.toBeNull();
    expect(reaction?.reactionName).toBe('Toxic Explosion');
    expect(reaction?.aoeRadius).toBeGreaterThan(0);
  });

  it('should trigger Void Collapse when Void hits any affected target', () => {
    const reaction = reactionEngine.evaluateUnitReaction('Void', 'Burning');
    expect(reaction).not.toBeNull();
    expect(reaction?.reactionName).toBe('Void Collapse');
  });
});

describe('StatusEffectManager (TDD Red -> Green)', () => {
  let statusManager: StatusEffectManager;
  let testUnit: Unit;

  beforeEach(() => {
    statusManager = new StatusEffectManager();
    testUnit = {
      id: 'unit_1',
      name: 'Adeptus',
      faction: 'Enemy',
      avatar: '👺',
      coord: { x: 2, y: 2 },
      stats: {
        maxHp: 100,
        currentHp: 100,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };
  });

  it('should apply and stack status effects correctly', () => {
    statusManager.applyStatus(testUnit, {
      type: 'Burning',
      stacks: 1,
      duration: 3,
      tickDamage: 10,
      element: 'Fire',
    });

    expect(testUnit.statusEffects.length).toBe(1);
    expect(testUnit.statusEffects[0].type).toBe('Burning');

    // Add another stack
    statusManager.applyStatus(testUnit, {
      type: 'Burning',
      stacks: 1,
      duration: 3,
      tickDamage: 10,
      element: 'Fire',
    });

    expect(testUnit.statusEffects.length).toBe(1);
    expect(testUnit.statusEffects[0].stacks).toBe(2);
  });

  it('should tick status damage and decrement durations', () => {
    statusManager.applyStatus(testUnit, {
      type: 'Burning',
      stacks: 1,
      duration: 2,
      tickDamage: 15,
      element: 'Fire',
    });

    // Tick 1
    const logs = statusManager.tickStatusEffects(testUnit);
    expect(testUnit.stats.currentHp).toBe(85); // 100 - 15 = 85
    expect(testUnit.statusEffects[0].duration).toBe(1);
    expect(logs.length).toBeGreaterThan(0);

    // Tick 2 (expires after tick)
    statusManager.tickStatusEffects(testUnit);
    expect(testUnit.stats.currentHp).toBe(70);
    expect(testUnit.statusEffects.length).toBe(0);
  });
});
