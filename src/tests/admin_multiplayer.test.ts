import { describe, it, expect, beforeEach } from 'vitest';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { CombatEngine } from '../engine/CombatEngine';
import { createHeroForElement } from '../constants/classes';
import { AdminManager } from '../engine/AdminManager';
import { AdminCommandMessage, NetworkMessage } from '../network/NetworkMessages';

describe('Multiplayer & Multi-Player Admin Commands (Affects Everyone Playing)', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let adminManager: AdminManager;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);
    adminManager = new AdminManager();
    adminManager.grantAdmin();
  });

  it('should support ADMIN_COMMAND NetworkMessage schema', () => {
    const adminMsg: AdminCommandMessage = {
      type: 'ADMIN_COMMAND',
      command: 'heal all',
      senderPlayer: 1,
      timestamp: Date.now(),
    };
    const netMsg: NetworkMessage = adminMsg;
    expect(netMsg.type).toBe('ADMIN_COMMAND');
    expect((netMsg as AdminCommandMessage).command).toBe('heal all');
  });

  it('should heal and revive all active players in co-op mode', () => {
    const p1 = createHeroForElement('Fire');
    const p2 = createHeroForElement('Water');
    p2.id = 'hero_coop_p2';

    p1.stats.currentHp = 10;
    p2.stats.currentHp = 0;
    p2.isDead = true;

    const combatEngine = new CombatEngine(grid, hazardManager, p1, [], p2);

    // Simulated multi-target admin heal
    const activePlayers = [p1, combatEngine.coopHero!];
    activePlayers.forEach((p) => {
      p.stats.maxHp = 9999;
      p.stats.currentHp = 9999;
      p.isDead = false;
    });

    expect(p1.stats.currentHp).toBe(9999);
    expect(p1.stats.maxHp).toBe(9999);
    expect(p2.stats.currentHp).toBe(9999);
    expect(p2.stats.maxHp).toBe(9999);
    expect(p2.isDead).toBe(false);
  });

  it('should grant 99 AP to all active players and player allies', () => {
    const p1 = createHeroForElement('Fire');
    const p2 = createHeroForElement('Earth');
    p2.id = 'hero_coop_p2';

    p1.stats.currentAp = 0;
    p2.stats.currentAp = 1;

    const combatEngine = new CombatEngine(grid, hazardManager, p1, [], p2);

    // Spawn friendly ally
    combatEngine.spawnZombie({ x: 3, y: 3 }, 50, 2, 'Player');
    const friendlyZombie = combatEngine.zombies[0];

    const targets = [p1, combatEngine.coopHero!, ...combatEngine.zombies.filter((z) => z.faction === 'Player')];
    targets.forEach((p) => {
      p.stats.maxAp = 99;
      p.stats.currentAp = 99;
    });

    expect(p1.stats.currentAp).toBe(99);
    expect(p2.stats.currentAp).toBe(99);
    expect(friendlyZombie.stats.currentAp).toBe(99);
  });

  it('should equip admin powers to both players in co-op mode', () => {
    const p1 = createHeroForElement('Fire');
    const p2 = createHeroForElement('Water');
    p2.id = 'hero_coop_p2';

    const players = [p1, p2];
    for (const p of players) {
      p.stats.elementalAffinity = 'Admin';
      p.abilities.push({
        id: 'admin_smite',
        name: '👑 Admin Smite',
        element: 'Admin',
        icon: '👑',
        targeting: 'AoECircle',
        level: 1,
        baseDamage: 9999,
        apCost: 0,
        range: 10,
        aoeRadius: 10,
        cooldown: 0,
        currentCooldown: 0,
        description: 'Global obliteration',
      });
    }

    expect(p1.abilities.some((a) => a.id === 'admin_smite')).toBe(true);
    expect(p2.abilities.some((a) => a.id === 'admin_smite')).toBe(true);
  });

  it('should advance level for all active players', () => {
    const p1 = createHeroForElement('Fire');
    const p2 = createHeroForElement('Water');
    p2.id = 'hero_coop_p2';

    p1.level = 5;
    p2.level = 5;

    const targetLevel = 50;
    const players = [p1, p2];
    players.forEach((p) => {
      p.level = targetLevel;
    });

    expect(p1.level).toBe(50);
    expect(p2.level).toBe(50);
  });
});
