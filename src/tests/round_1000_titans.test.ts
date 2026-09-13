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

  it('kills both Primordial Titans on Round 1000 with killRound1000Titans', () => {
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
      abilities: [],
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
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    combatEngine.allies.push(magmaColossus, voidLeviathan);
    expect(combatEngine.getAllAllies().length).toBe(3); // Hero + 2 Titans

    // Execute killRound1000Titans
    const killed = combatEngine.killRound1000Titans('The Void Overlord Titan Slayer');
    expect(killed.length).toBe(2);
    expect(killed).toContain(magmaColossus);
    expect(killed).toContain(voidLeviathan);

    // Both titans must be dead with 0 HP
    expect(magmaColossus.isDead).toBe(true);
    expect(magmaColossus.stats.currentHp).toBe(0);
    expect(voidLeviathan.isDead).toBe(true);
    expect(voidLeviathan.stats.currentHp).toBe(0);

    // Hero stands alone now
    const remainingAllies = combatEngine.getAllAllies();
    expect(remainingAllies.length).toBe(1);
    expect(remainingAllies[0]).toBe(hero);

    // Dead titans no longer occupy tiles
    expect(combatEngine.getUnitAt({ x: 3, y: 2 })).toBeNull();
    expect(combatEngine.getUnitAt({ x: 3, y: 7 })).toBeNull();
  });

  it('executes the Titans last blow on The Void Overlord via triggerTitanFinalBlow, taking him out and sacrificing the Titans', () => {
    const enemies = escalation.generateRoundEnemies(1000);
    const combatEngine = new CombatEngine(grid, hazardManager, hero, enemies);
    combatEngine.currentRound = 1000;

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
      abilities: [],
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
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    combatEngine.allies.push(magmaColossus, voidLeviathan);
    const overlord = enemies[0];
    expect(overlord.isDead).toBe(false);
    expect(overlord.stats.currentHp).toBeGreaterThan(0);

    let callbackInvoked = false;
    let recordedColossusDmg = 0;
    let recordedLeviathanDmg = 0;
    combatEngine.onTitanLastBlow = (boss, cDmg, lDmg) => {
      callbackInvoked = true;
      expect(boss.id).toBe(overlord.id);
      recordedColossusDmg = cDmg;
      recordedLeviathanDmg = lDmg;
    };

    // Trigger the Titans' last blow
    const result = combatEngine.triggerTitanFinalBlow(overlord);
    expect(result).not.toBeNull();
    expect(result?.colossusDamage).toBe(50000);
    expect(result?.leviathanDamage).toBe(50000);

    // The Void Overlord must be taken out (0 HP and dead)
    expect(overlord.stats.currentHp).toBe(0);
    expect(overlord.isDead).toBe(true);

    // The Titans sacrificed themselves in the last blow
    expect(magmaColossus.isDead).toBe(true);
    expect(magmaColossus.stats.currentHp).toBe(0);
    expect(voidLeviathan.isDead).toBe(true);
    expect(voidLeviathan.stats.currentHp).toBe(0);

    // Callback fired
    expect(callbackInvoked).toBe(true);
    expect(recordedColossusDmg).toBe(50000);
    expect(recordedLeviathanDmg).toBe(50000);

    // Logs verify the last blow
    const hasLastBlowLog = combatEngine.logs.some((l) =>
      l.message.includes('PRIMORDIAL CATACLYSM: DUAL LAST BLOW') ||
      l.message.includes("TITANS' DECISIVE LAST BLOW")
    );
    expect(hasLastBlowLog).toBe(true);
  });

  it('automatically triggers the Titans decisive last blow when fatal damage is dealt to Round 1000 boss', () => {
    const enemies = escalation.generateRoundEnemies(1000);
    const combatEngine = new CombatEngine(grid, hazardManager, hero, enemies);
    combatEngine.currentRound = 1000;

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
      abilities: [],
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
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    combatEngine.allies.push(magmaColossus, voidLeviathan);
    const overlord = enemies[0];

    // Bring boss to low HP (1 HP)
    overlord.stats.currentHp = 1;
    hero.coord = { x: 7, y: 5 };

    // Hero deals fatal strike
    const fatalStrike = {
      id: 'fatal_strike',
      name: 'Fatal Strike',
      element: 'Fire' as const,
      icon: '🗡️',
      apCost: 1,
      cooldown: 0,
      currentCooldown: 0,
      range: 10,
      aoeRadius: 0,
      targeting: 'SingleUnit' as const,
      baseDamage: 100,
      description: 'Strike',
      level: 1,
    };

    const res = combatEngine.executeAbility(hero, fatalStrike, overlord.coord);
    expect(res.success).toBe(true);

    // Overlord is taken out
    expect(overlord.stats.currentHp).toBe(0);
    expect(overlord.isDead).toBe(true);

    // Titans unleashed last blow and sacrificed
    expect(magmaColossus.isDead).toBe(true);
    expect(voidLeviathan.isDead).toBe(true);
    expect(combatEngine.logs.some((l) => l.message.includes('DUAL LAST BLOW'))).toBe(true);
  });
});
