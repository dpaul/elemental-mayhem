import { describe, it, expect, beforeEach } from 'vitest';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { CombatEngine } from '../engine/CombatEngine';
import { TurnManager } from '../engine/TurnManager';
import { NetworkManager } from '../network/NetworkManager';
import { createHeroForElement } from '../constants/classes';

describe('Online Co-op Arena & Networking', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let turnManager: TurnManager;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);
    turnManager = new TurnManager();
  });

  describe('NetworkManager', () => {
    it('should generate human-friendly 5-character room codes with EM- prefix', () => {
      const code1 = NetworkManager.generateRoomCode();
      const code2 = NetworkManager.generateRoomCode();
      expect(code1).toMatch(/^EM-[2-9A-Z]{5}$/);
      expect(code2).toMatch(/^EM-[2-9A-Z]{5}$/);
      expect(code1).not.toBe(code2);
    });

    it('should start in disconnected state with None role', () => {
      const net = new NetworkManager();
      expect(net.getRole()).toBe('None');
      expect(net.getStatus()).toBe('disconnected');
      expect(net.isConnected()).toBe(false);
    });
  });

  describe('CombatEngine Dual Hero Support', () => {
    it('should track both Player 1 and Player 2 heroes and return correct unit at coords', () => {
      const p1 = createHeroForElement('Fire');
      p1.coord = { x: 2, y: 4 };

      const p2 = createHeroForElement('Water');
      p2.coord = { x: 2, y: 6 };

      const combatEngine = new CombatEngine(grid, hazardManager, p1, [], p2);

      expect(combatEngine.getUnitAt({ x: 2, y: 4 })).toBe(p1);
      expect(combatEngine.getUnitAt({ x: 2, y: 6 })).toBe(p2);
      expect(combatEngine.getUnitAt({ x: 5, y: 5 })).toBeNull();
    });

    it('should include coopHero in getAllAllies', () => {
      const p1 = createHeroForElement('Fire');
      const p2 = createHeroForElement('Water');
      const combatEngine = new CombatEngine(grid, hazardManager, p1, [], p2);

      const allies = combatEngine.getAllAllies();
      expect(allies).toContain(p1);
      expect(allies).toContain(p2);
      expect(allies.length).toBe(2);
    });

    it('should only report team defeat when BOTH heroes are dead', () => {
      const p1 = createHeroForElement('Fire');
      const p2 = createHeroForElement('Water');
      const combatEngine = new CombatEngine(grid, hazardManager, p1, [], p2);

      expect(combatEngine.areAllHeroesDead()).toBe(false);

      // P1 dies, P2 still alive
      p1.isDead = true;
      expect(combatEngine.areAllHeroesDead()).toBe(false);

      // P2 dies as well -> team defeat
      p2.isDead = true;
      expect(combatEngine.areAllHeroesDead()).toBe(true);
    });

    it('should fully restore and revive both heroes upon resetRoundState', () => {
      const p1 = createHeroForElement('Fire');
      const p2 = createHeroForElement('Water');
      const combatEngine = new CombatEngine(grid, hazardManager, p1, [], p2);

      // Damage P1 and kill P2
      p1.stats.currentHp = 20;
      p1.stats.currentAp = 1;
      p2.stats.currentHp = 0;
      p2.isDead = true;
      p2.abilities[0].currentCooldown = 3;

      combatEngine.resetRoundState();

      expect(p1.stats.currentHp).toBe(p1.stats.maxHp);
      expect(p1.stats.currentAp).toBe(p1.stats.maxAp);
      expect(p2.isDead).toBe(false);
      expect(p2.stats.currentHp).toBe(p2.stats.maxHp);
      expect(p2.stats.currentAp).toBe(p2.stats.maxAp);
      expect(p2.abilities[0].currentCooldown).toBe(0);
    });
  });

  describe('TurnManager Co-op Turn Flow', () => {
    it('should switch between COOP_P1_TURN and COOP_P2_TURN and reset AP', () => {
      const p1 = createHeroForElement('Fire');
      const p2 = createHeroForElement('Water');

      p1.stats.currentAp = 0;
      p2.stats.currentAp = 0;
      p1.abilities[0].currentCooldown = 2;
      p2.abilities[0].currentCooldown = 2;

      // Start P1 turn
      turnManager.startCoopTurn(1, p1);
      expect(turnManager.getPhase()).toBe('COOP_P1_TURN');
      expect(p1.stats.currentAp).toBe(p1.stats.maxAp);
      expect(p1.abilities[0].currentCooldown).toBe(1);

      // Start P2 turn
      turnManager.startCoopTurn(2, p2);
      expect(turnManager.getPhase()).toBe('COOP_P2_TURN');
      expect(p2.stats.currentAp).toBe(p2.stats.maxAp);
      expect(p2.abilities[0].currentCooldown).toBe(1);
    });
  });
});
