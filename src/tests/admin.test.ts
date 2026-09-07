import { describe, it, expect, beforeEach } from 'vitest';
import { AdminManager } from '../engine/AdminManager';

describe('AdminManager Security & Privileges', () => {
  let adminManager: AdminManager;

  beforeEach(() => {
    // Clear localStorage simulation if exists
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    adminManager = new AdminManager();
  });

  it('should initialize unauthenticated by default when storage is empty', () => {
    expect(adminManager.isAuthenticated()).toBe(false);
  });

  it('should reject invalid passcodes and remain unauthenticated', () => {
    const success = adminManager.authenticate('wrongpassword');
    expect(success).toBe(false);
    expect(adminManager.isAuthenticated()).toBe(false);
  });

  it('should authenticate successfully with password 190846214', () => {
    expect(adminManager.authenticate('190846214')).toBe(true);
    expect(adminManager.isAuthenticated()).toBe(true);

    adminManager.logout();
    expect(adminManager.isAuthenticated()).toBe(false);

    // Old or default passwords should now be rejected
    expect(adminManager.authenticate('admin')).toBe(false);
    expect(adminManager.authenticate('dave')).toBe(false);
    expect(adminManager.authenticate('5423118')).toBe(false);
  });

  it('should allow admin commands only when authenticated with 190846214', () => {
    // Unauthenticated: cannot use commands
    expect(adminManager.canUseAdminCommands(false, 1)).toBe(false);

    // Authenticated in single player mode: allowed
    adminManager.authenticate('190846214');
    expect(adminManager.canUseAdminCommands(false, 1)).toBe(true);
  });

  it('should restrict admin commands in Hotseat mode so only Player 1 (Creator) can use them', () => {
    adminManager.authenticate('190846214');

    // Player 1 in Hotseat: allowed
    expect(adminManager.canUseAdminCommands(true, 1)).toBe(true);

    // Player 2 in Hotseat: forbidden!
    expect(adminManager.canUseAdminCommands(true, 2)).toBe(false);
  });

  it('should allow logging out to re-lock admin commands', () => {
    adminManager.authenticate('190846214');
    expect(adminManager.isAuthenticated()).toBe(true);

    adminManager.logout();
    expect(adminManager.isAuthenticated()).toBe(false);
    expect(adminManager.canUseAdminCommands(false, 1)).toBe(false);
  });
});

import { EscalationManager } from '../engine/EscalationManager';

describe('Last Level Encounter (Round 15 Boss)', () => {
  it('should generate THE VOID ARCHON (Supreme Boss) on Round 15', () => {
    const escalation = new EscalationManager();
    const enemies = escalation.generateRoundEnemies(15);
    expect(enemies.length).toBeGreaterThan(0);

    const voidArchon = enemies.find((e) => e.id === 'boss_void_archon');
    expect(voidArchon).toBeDefined();
    expect(voidArchon?.name).toContain('THE VOID ARCHON');
    expect(voidArchon?.stats.elementalAffinity).toBe('Void');
    expect(voidArchon?.stats.maxHp).toBeGreaterThanOrEqual(400);
  });
});

import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { CombatEngine } from '../engine/CombatEngine';
import { createHeroForElement, HERO_CLASSES } from '../constants/classes';

describe('Admin Mass Resurrection Power', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let combatEngine: CombatEngine;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);
    const hero = createHeroForElement('Admin');
    combatEngine = new CombatEngine(grid, hazardManager, hero, []);
  });

  it('should clear all walls and obstacles from the battlefield when Mass Resurrection is executed', () => {
    // Place walls across the arena
    grid.setObstacle({ x: 3, y: 3 }, true);
    grid.setObstacle({ x: 4, y: 4 }, true);
    grid.setObstacle({ x: 5, y: 5 }, true);
    grid.setObstacle({ x: 6, y: 6 }, true);

    expect(grid.getTile({ x: 3, y: 3 })?.isObstacle).toBe(true);
    expect(grid.getTile({ x: 4, y: 4 })?.isObstacle).toBe(true);

    const result = combatEngine.executeMassResurrection();
    expect(result.clearedWalls).toBe(4);
    expect(result.resurrectedCount).toBeGreaterThan(0);

    // All walls must be gone
    expect(grid.getTile({ x: 3, y: 3 })?.isObstacle).toBe(false);
    expect(grid.getTile({ x: 4, y: 4 })?.isObstacle).toBe(false);
    expect(grid.getTile({ x: 5, y: 5 })?.isObstacle).toBe(false);
    expect(grid.getTile({ x: 6, y: 6 })?.isObstacle).toBe(false);

    // Allied minions must be raised
    expect(combatEngine.zombies.length).toBeGreaterThan(0);
    expect(combatEngine.zombies[0].faction).toBe('Player');
  });

  it('should clear all walls and wall hazards across the board when casting admin_mass_resurrection ability', () => {
    // Place standard walls
    grid.setObstacle({ x: 2, y: 2 }, true);
    grid.setObstacle({ x: 7, y: 7 }, true);
    grid.setObstacle({ x: 3, y: 4 }, true, '⬛');
    grid.setObstacle({ x: 6, y: 5 }, true, '🗿');

    // Place a MudWall hazard
    hazardManager.applyHazard({ x: 4, y: 4 }, 'MudWall', 3, 0, 'Earth');
    expect(grid.getTile({ x: 4, y: 4 })?.hazard.type).toBe('MudWall');

    const massResAbility = HERO_CLASSES.Admin.abilities.find((a) => a.id === 'admin_mass_resurrection');
    expect(massResAbility).toBeDefined();
    expect(massResAbility?.createsHazard).toBeUndefined();

    const castRes = combatEngine.executeAbility(combatEngine.hero, massResAbility!, { x: 5, y: 5 });
    expect(castRes.success).toBe(true);

    // All walls completely cleared!
    expect(grid.getTile({ x: 2, y: 2 })?.isObstacle).toBe(false);
    expect(grid.getTile({ x: 7, y: 7 })?.isObstacle).toBe(false);
    expect(grid.getTile({ x: 3, y: 4 })?.isObstacle).toBe(false);
    expect(grid.getTile({ x: 6, y: 5 })?.isObstacle).toBe(false);
    // MudWall hazard also completely cleared!
    expect(grid.getTile({ x: 4, y: 4 })?.hazard.type).toBe('None');

    // Allied legion resurrected
    expect(combatEngine.zombies.length).toBeGreaterThan(0);
    expect(combatEngine.zombies.every((z) => z.faction === 'Player')).toBe(true);
  });
});

describe('Administrator Class (Admin Access Only)', () => {
  it('should designate Administrator as isStarter false and require admin access', () => {
    expect(HERO_CLASSES.Admin.isStarter).toBe(false);
    expect(HERO_CLASSES.Admin.unlockRequirement).toContain('Admin Access Only');
  });

  it('should restrict Administrator to authenticated users only', () => {
    const adminMgr = new AdminManager();
    // Default: not authenticated
    expect(adminMgr.isAuthenticated()).toBe(false);
    expect(adminMgr.canUseAdminCommands(false, 1)).toBe(false);
    expect(adminMgr.canUseAdminCommands(true, 1)).toBe(false);
    expect(adminMgr.canUseAdminCommands(true, 2)).toBe(false);

    // Authenticate
    adminMgr.authenticate('190846214');
    expect(adminMgr.isAuthenticated()).toBe(true);
    expect(adminMgr.canUseAdminCommands(false, 1)).toBe(true);
    expect(adminMgr.canUseAdminCommands(true, 1)).toBe(true);
    expect(adminMgr.canUseAdminCommands(true, 2)).toBe(false); // Player 2 cannot use admin commands
  });
});


