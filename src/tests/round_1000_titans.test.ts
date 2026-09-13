// Elemental Mayhem - Round 1000 Void Overlord & Titan Allies Verification Tests
import { describe, it, expect, beforeEach } from 'vitest';
import { EscalationManager } from '../engine/EscalationManager';
import { CombatEngine } from '../engine/CombatEngine';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { Unit } from '../types';

describe('Round 1000 Void Overlord & Primordial Titan Allies', () => {
  let escalation: EscalationManager;
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let hero: Unit;

  beforeEach(() => {
    escalation = new EscalationManager();
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);

    hero = {
      id: 'test_hero',
      name: 'Ascended Hero',
      faction: 'Player',
      avatar: '🧙‍♂️',
      coord: { x: 1, y: 1 },
      stats: {
        maxHp: 5000,
        currentHp: 5000,
        maxAp: 8,
        currentAp: 8,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };
  });

  it('generates The Void Overlord on Round 1000 with NO minions', () => {
    const enemies = escalation.generateRoundEnemies(1000);
    // Exactly 1 enemy (The Void Overlord alone)
    expect(enemies.length).toBe(1);

    const overlord = enemies[0];
    expect(overlord.id).toBe('boss_void_overlord_r1000');
    expect(overlord.name).toContain('THE VOID OVERLORD');
    expect(overlord.isBoss).toBe(true);
    expect(overlord.faction).toBe('Enemy');

    // No minions, escorts, or extra units
    const escorts = enemies.filter((e) => e.name.includes('Void Rift Colossus'));
    expect(escorts.length).toBe(0);
  });

  it('allows Magma Colossus and Void Leviathan to join as Player allies in CombatEngine', () => {
    const enemies = escalation.generateRoundEnemies(1000);
    const combatEngine = new CombatEngine(grid, hazardManager, hero, enemies);

    const magmaColossus: Unit = {
      id: 'ally_magma_colossus_r1000',
      name: 'MAGMA COLOSSUS (Primordial Titan)',
      faction: 'Player',
      avatar: '🗿🌋',
      coord: { x: 3, y: 2 },
      isBoss: true,
      stats: {
        maxHp: 15000,
        currentHp: 15000,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [
        {
          id: 'magma_colossus_slam',
          name: 'Molten Magma Slam',
          element: 'Fire',
          icon: '🌋',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 4,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 500,
          description: 'Slam',
          level: 15,
        },
      ],
      statusEffects: [],
      isDead: false,
    };

    const voidLeviathan: Unit = {
      id: 'ally_void_leviathan_r1000',
      name: 'VOID LEVIATHAN (Primordial Titan)',
      faction: 'Player',
      avatar: '🌌⚡',
      coord: { x: 3, y: 7 },
      isBoss: true,
      stats: {
        maxHp: 15000,
        currentHp: 15000,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Void',
      },
      abilities: [
        {
          id: 'void_leviathan_maw',
          name: 'Abyssal Singularity Maw',
          element: 'Void',
          icon: '🌌',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 4,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 520,
          description: 'Maw strike',
          level: 15,
        },
      ],
      statusEffects: [],
      isDead: false,
    };

    combatEngine.allies.push(magmaColossus, voidLeviathan);

    // Verify both are retrieved via getUnitAt
    expect(combatEngine.getUnitAt({ x: 3, y: 2 })).toBe(magmaColossus);
    expect(combatEngine.getUnitAt({ x: 3, y: 7 })).toBe(voidLeviathan);

    // Verify getAllAllies includes Hero, Magma Colossus, and Void Leviathan
    const allies = combatEngine.getAllAllies();
    expect(allies).toContain(hero);
    expect(allies).toContain(magmaColossus);
    expect(allies).toContain(voidLeviathan);
    expect(allies.length).toBe(3);
  });

  it('verifies Magma Colossus and Void Leviathan attacks damage The Void Overlord without boss immunity blocking them', () => {
    const enemies = escalation.generateRoundEnemies(1000);
    const overlord = enemies[0];
    const initialHp = overlord.stats.currentHp;
    const combatEngine = new CombatEngine(grid, hazardManager, hero, enemies);

    const magmaColossus: Unit = {
      id: 'ally_magma_colossus_r1000',
      name: 'MAGMA COLOSSUS (Primordial Titan)',
      faction: 'Player',
      avatar: '🗿🌋',
      coord: { x: 7, y: 5 },
      isBoss: true,
      stats: {
        maxHp: 15000,
        currentHp: 15000,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [
        {
          id: 'magma_colossus_slam',
          name: 'Molten Magma Slam',
          element: 'Fire',
          icon: '🌋',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 4,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 500,
          description: 'Slam',
          level: 15,
        },
      ],
      statusEffects: [],
      isDead: false,
    };

    combatEngine.allies.push(magmaColossus);

    // Attack the Void Overlord at (8, 5)
    const ability = magmaColossus.abilities[0];
    combatEngine.executeAbility(magmaColossus, ability, overlord.coord);

    // Health should be reduced (NOT immune)
    expect(overlord.stats.currentHp).toBeLessThan(initialHp);
    expect(initialHp - overlord.stats.currentHp).toBeGreaterThan(250);
  });
});
