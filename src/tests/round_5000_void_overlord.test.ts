import { describe, it, expect, beforeEach } from 'vitest';
import { EscalationManager } from '../engine/EscalationManager';
import { CombatEngine } from '../engine/CombatEngine';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { Unit } from '../types';

describe('Round 5000 10x Void Overlord Ascension', () => {
  let escalation: EscalationManager;
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let combatEngine: CombatEngine;
  let hero: Unit;

  beforeEach(() => {
    escalation = new EscalationManager();
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);

    hero = {
      id: 'hero',
      name: 'Arch-Mage',
      faction: 'Player',
      avatar: '🧙',
      coord: { x: 1, y: 1 },
      stats: {
        maxHp: 50000,
        currentHp: 50000,
        maxAp: 10,
        currentAp: 10,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    combatEngine = new CombatEngine(grid, hazardManager, hero, []);
  });

  it('should verify Round 5000 spawns The 10x Void Overlord with 0 minions and 10x stats', () => {
    const r5000 = escalation.generateRoundEnemies(5000);
    expect(r5000.length).toBe(1);

    const overlord = r5000[0];
    expect(overlord.id).toBe('boss_void_overlord_r5000');
    expect(overlord.name).toContain('VOID OVERLORD');
    expect(overlord.name).toContain('10x');
    expect(overlord.isBoss).toBe(true);

    // 10x HP: 25,000 * 10 = 250,000
    expect(overlord.stats.maxHp).toBe(250000);
    expect(overlord.stats.currentHp).toBe(250000);
    expect(overlord.stats.elementalAffinity).toBe('Void');

    // Abilities should deal 10x damage compared to Round 1000
    const r1000 = escalation.generateRoundEnemies(1000);
    const overlord1000 = r1000[0];

    const r5000Siphon = overlord.abilities.find((a) => a.id.includes('siphon'))!;
    const r1000Siphon = overlord1000.abilities.find((a) => a.id.includes('siphon'))!;
    expect(r5000Siphon.baseDamage).toBe(r1000Siphon.baseDamage * 10);
    expect(r5000Siphon.baseDamage).toBe(1200);

    const r5000Singularity = overlord.abilities.find((a) => a.id.includes('singularity'))!;
    const r1000Singularity = overlord1000.abilities.find((a) => a.id.includes('singularity'))!;
    expect(r5000Singularity.baseDamage).toBe(r1000Singularity.baseDamage * 10);
    expect(r5000Singularity.baseDamage).toBe(1500);

    const r5000Cataclysm = overlord.abilities.find((a) => a.id.includes('cataclysm'))!;
    const r1000Cataclysm = overlord1000.abilities.find((a) => a.id.includes('cataclysm'))!;
    expect(r5000Cataclysm.baseDamage).toBe(r1000Cataclysm.baseDamage * 10);
    expect(r5000Cataclysm.baseDamage).toBe(1800);
  });

  it('should enforce zombie usurpation on Round 5000', () => {
    combatEngine.currentRound = 5000;
    expect(combatEngine.isVoidOverlordZombieUsurpationActive()).toBe(true);

    const zombie = combatEngine.spawnZombie({ x: 3, y: 3 }, 50, 4, 'Player', 'Walker', true);
    expect(zombie.faction).toBe('Enemy');
    expect(zombie.isVoidUsurped).toBe(true);
    expect(combatEngine.getAllAllies().find((a) => a.id === zombie.id)).toBeUndefined();
  });

  it('should verify 10x Primordial Titans can damage the 10x Void Overlord on Round 5000', () => {
    const r5000 = escalation.generateRoundEnemies(5000);
    const overlord = r5000[0];
    combatEngine.enemies = [overlord];
    combatEngine.currentRound = 5000;

    const initialHp = overlord.stats.currentHp;
    expect(initialHp).toBe(250000);

    // 10x Magma Colossus
    const magmaColossus10x: Unit = {
      id: 'ally_magma_colossus_r5000',
      name: 'MAGMA COLOSSUS (10x Ascended Titan)',
      faction: 'Player',
      avatar: '🗿🌋',
      coord: { x: 7, y: 5 },
      stats: {
        maxHp: 150000,
        currentHp: 150000,
        maxAp: 8,
        currentAp: 8,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [
        {
          id: 'magma_colossus_slam_10x',
          name: '10x Molten Magma Slam',
          element: 'Fire',
          icon: '🌋',
          apCost: 2,
          cooldown: 0,
          currentCooldown: 0,
          range: 4,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 5000,
          description: 'Slam',
          level: 25,
        },
      ],
      statusEffects: [],
      isDead: false,
    };

    combatEngine.allies.push(magmaColossus10x);

    // Strike 10x Void Overlord
    const ability = magmaColossus10x.abilities[0];
    combatEngine.executeAbility(magmaColossus10x, ability, overlord.coord);

    expect(overlord.stats.currentHp).toBeLessThan(initialHp);
    expect(initialHp - overlord.stats.currentHp).toBeGreaterThan(2500);
  });
});
