import { describe, it, expect, beforeEach } from 'vitest';
import { ElementalMatrix } from '../engine/ElementalMatrix';
import { ReactionEngine } from '../engine/ReactionEngine';
import { StatusEffectManager } from '../engine/StatusEffectManager';
import { HERO_CLASSES, createHeroForElement } from '../constants/classes';
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
    // Iron -> Earth = strong (1.5x)
    expect(matrix.getAffinityMultiplier('Iron', 'Earth')).toBe(1.5);
    // War -> Order = strong (1.5x)
    expect(matrix.getAffinityMultiplier('War', 'Order')).toBe(1.5);
    // Rage -> Ice = strong (1.5x)
    expect(matrix.getAffinityMultiplier('Rage', 'Ice')).toBe(1.5);
    // Titan -> Earth = strong (1.5x)
    expect(matrix.getAffinityMultiplier('Titan', 'Earth')).toBe(1.5);
    // Blast -> Crystal = strong (1.5x)
    expect(matrix.getAffinityMultiplier('Blast', 'Crystal')).toBe(1.5);
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

  it('should trigger new elemental reactions (Melt, Shatter, Firestorm, Annihilation)', () => {
    // 4. Melt
    const melt = reactionEngine.evaluateUnitReaction('Fire', 'Frozen');
    expect(melt).not.toBeNull();
    expect(melt?.reactionName).toBe('Melt');

    // 5. Shatter
    const shatter = reactionEngine.evaluateUnitReaction('Metal', 'Frozen');
    expect(shatter).not.toBeNull();
    expect(shatter?.reactionName).toBe('Shatter');

    // 6. Firestorm
    const firestorm = reactionEngine.evaluateUnitReaction('Wind', 'Burning');
    expect(firestorm).not.toBeNull();
    expect(firestorm?.reactionName).toBe('Firestorm');

    // 7. Annihilation
    const annihilation = reactionEngine.evaluateUnitReaction('Light', 'VoidMarked');
    expect(annihilation).not.toBeNull();
    expect(annihilation?.reactionName).toBe('Annihilation');

    // 8. Holy Smite (Light on Undead)
    const holySmite = reactionEngine.evaluateUnitReaction('Undead', 'Blinded');
    expect(holySmite).not.toBeNull();
    expect(holySmite?.reactionName).toBe('Holy Smite');

    // 9. Necrosis (Undead on Poisoned)
    const necrosis = reactionEngine.evaluateUnitReaction('Undead', 'Poisoned');
    expect(necrosis).not.toBeNull();
    expect(necrosis?.reactionName).toBe('Necrosis');
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

describe('Hero Elemental Classes & Dedicated Move Kits (TDD Red -> Green)', () => {
  const requestedElements = [
    'Love', 'Sky', 'Nature', 'Ice', 'Metal', 'Darkness', 'Light',
    'Sound', 'Time', 'Death', 'Life', 'Chaos', 'Acid', 'Blood',
    'Soul', 'Spirit', 'Energy', 'Force', 'Space', 'Magnetism',
    'Wind', 'Storm', 'Thunder', 'Magma', 'Crystal', 'Undead',
    'Fire', 'Water', 'Lightning', 'Earth', 'Poison', 'Void'
  ] as const;

  it('should have dedicated classes for all requested elements with 4 abilities each', () => {
    requestedElements.forEach((elem) => {
      const config = HERO_CLASSES[elem];
      expect(config).toBeDefined();
      expect(config.element).toBe(elem);
      expect(config.abilities.length).toBeGreaterThanOrEqual(4);
      config.abilities.forEach((ab) => {
        expect(ab.element).toBe(elem);
      });
    });
  });

  it('should create hero with dedicated moves and attributes matching chosen element', () => {
    // 1. Amorist (Love)
    const amorist = createHeroForElement('Love');
    expect(amorist.name).toBe('Amorist');
    expect(amorist.avatar).toBe('💖');
    expect(amorist.stats.elementalAffinity).toBe('Love');
    expect(amorist.abilities.every((a) => a.element === 'Love')).toBe(true);

    // 2. Cryomancer (Ice)
    const cryomancer = createHeroForElement('Ice');
    expect(cryomancer.name).toBe('Cryomancer');
    expect(cryomancer.avatar).toBe('❄️');
    expect(cryomancer.stats.elementalAffinity).toBe('Ice');
    expect(cryomancer.abilities.every((a) => a.element === 'Ice')).toBe(true);

    // 3. Magmamancer (Magma)
    const magmamancer = createHeroForElement('Magma');
    expect(magmamancer.name).toBe('Magmamancer');
    expect(magmamancer.avatar).toBe('🌋');
    expect(magmamancer.stats.elementalAffinity).toBe('Magma');

    // 4. Chronomancer (Time)
    const chronomancer = createHeroForElement('Time');
    expect(chronomancer.name).toBe('Chronomancer');
    expect(chronomancer.avatar).toBe('⏳');

    // 5. Reaper (Death)
    const reaper = createHeroForElement('Death');
    expect(reaper.name).toBe('Reaper');
    expect(reaper.avatar).toBe('💀');

    // 6. Crystallomancer (Crystal)
    const crystallomancer = createHeroForElement('Crystal');
    expect(crystallomancer.name).toBe('Crystallomancer');
    expect(crystallomancer.avatar).toBe('💎');

    // 7. Thundercaller (Thunder)
    const thundercaller = createHeroForElement('Thunder');
    expect(thundercaller.name).toBe('Thundercaller');
    expect(thundercaller.stats.elementalAffinity).toBe('Thunder');

    // 8. Necromancer (Undead)
    const necromancer = createHeroForElement('Undead');
    expect(necromancer.name).toBe('Necromancer');
    expect(necromancer.avatar).toBe('🧟‍♂️');
    expect(necromancer.stats.elementalAffinity).toBe('Undead');
    expect(necromancer.abilities.every((a) => a.element === 'Undead')).toBe(true);

    // 9. Administrator (Admin) - Has ALL the powers!
    const adminHero = createHeroForElement('Admin');
    expect(adminHero.name).toBe('Administrator');
    expect(adminHero.avatar).toBe('👑⚡');
    expect(adminHero.stats.elementalAffinity).toBe('Admin');
    expect(adminHero.stats.maxHp).toBe(999);
    expect(adminHero.stats.currentHp).toBe(999);
    expect(adminHero.stats.maxAp).toBe(1000);
    expect(adminHero.stats.currentAp).toBe(1000);

    // Has signature Admin god powers
    expect(adminHero.abilities.some((a) => a.id === 'admin_ban_hammer')).toBe(true);
    expect(adminHero.abilities.some((a) => a.id === 'admin_server_smite')).toBe(true);
    expect(adminHero.abilities.some((a) => a.id === 'admin_god_barrier')).toBe(true);
    expect(adminHero.abilities.some((a) => a.id === 'admin_reality_warp')).toBe(true);
    expect(adminHero.abilities.some((a) => a.id === 'admin_screen_clear')).toBe(true);

    // Has powers from other elements as well (all powers!)
    expect(adminHero.abilities.some((a) => a.element === 'Fire')).toBe(true);
    expect(adminHero.abilities.some((a) => a.element === 'Water')).toBe(true);
    expect(adminHero.abilities.some((a) => a.element === 'Ice')).toBe(true);
    expect(adminHero.abilities.some((a) => a.element === 'Death')).toBe(true);
    expect(adminHero.abilities.some((a) => a.element === 'Titan')).toBe(true);
    expect(adminHero.abilities.some((a) => a.element === 'Blast')).toBe(true);

    // Contains over 450 abilities!
    expect(adminHero.abilities.length).toBeGreaterThan(450);
  });

  it('should calculate Admin elemental matrix supremacy (1.5x damage, 0.75x incoming damage)', () => {
    const matrix = new ElementalMatrix();
    expect(matrix.getAffinityMultiplier('Admin', 'Fire')).toBe(1.5);
    expect(matrix.getAffinityMultiplier('Admin', 'Water')).toBe(1.5);
    expect(matrix.getAffinityMultiplier('Admin', 'Void')).toBe(1.5);
    expect(matrix.getAffinityMultiplier('Fire', 'Admin')).toBe(0.75);
    expect(matrix.getAffinityMultiplier('Water', 'Admin')).toBe(0.75);
    expect(matrix.getAffinityMultiplier('Admin', 'Admin')).toBe(1.0);
  });
});
