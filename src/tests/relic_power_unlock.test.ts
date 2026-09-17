// Elemental Mayhem - Relic Collection & Elemental Power Unlock Test Suite
import { describe, it, expect, beforeEach } from 'vitest';
import { CombatEngine } from '../engine/CombatEngine';
import { UpgradeManager } from '../engine/UpgradeManager';
import { CrystalGardenManager } from '../engine/CrystalManager';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { createHeroForElement } from '../constants/classes';
import { PassiveRelic } from '../types';

describe('Relic Collection & Elemental Power Unlocking (Max 10)', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let upgradeManager: UpgradeManager;
  let gardenManager: CrystalGardenManager;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);
    upgradeManager = new UpgradeManager();
    gardenManager = new CrystalGardenManager();
  });

  describe('UpgradeManager Relic Power Unlocking', () => {
    it('should unlock the next power in hero element upon applying a relic', () => {
      const hero = createHeroForElement('Fire');
      // Set to 3 starter moves
      gardenManager.applyCraftedRelicsToHero(hero);
      expect(hero.abilities.length).toBe(3);

      const relic: PassiveRelic = {
        id: 'test_relic_1',
        name: 'Flame Talisman',
        icon: '🔥',
        description: '+1 Max AP',
        costEssence: 20,
        costXp: 20,
        applied: false,
        effect: (h) => {
          h.stats.maxAp += 1;
        },
      };

      const unlocked = upgradeManager.applyRelic(hero, relic);
      expect(unlocked).not.toBeNull();
      expect(hero.abilities.length).toBe(4);
      expect(hero.abilities[hero.abilities.length - 1].id).toBe(unlocked?.id);
      expect(unlocked?.element).toBe('Fire');
      expect(unlocked?.currentCooldown).toBe(0);
      expect(hero.stats.maxAp).toBe(31);
    });

    it('should cap unlocked powers at exactly 10 when many relics are applied', () => {
      const hero = createHeroForElement('Water');
      gardenManager.applyCraftedRelicsToHero(hero);
      expect(hero.abilities.length).toBe(3);

      // Apply 12 relics (more than 7 needed to reach 10)
      for (let i = 1; i <= 12; i++) {
        const relic: PassiveRelic = {
          id: `relic_${i}`,
          name: `Ancient Relic #${i}`,
          icon: '💎',
          description: `+${i} Max HP`,
          costEssence: 10,
          costXp: 10,
          applied: false,
          effect: (h) => {
            h.stats.maxHp += 5;
          },
        };
        upgradeManager.applyRelic(hero, relic);
      }

      // Must never exceed 10 powers!
      expect(hero.abilities.length).toBe(10);
      hero.abilities.forEach((ab) => {
        expect(ab.element).toBe('Water');
      });
    });
  });

  describe('CombatEngine Battlefield Relic Pickups', () => {
    it('should pick up a relic from the battlefield and unlock the next power in hero element', () => {
      const hero = createHeroForElement('Lightning');
      hero.coord = { x: 1, y: 1 };
      gardenManager.applyCraftedRelicsToHero(hero);
      expect(hero.abilities.length).toBe(3);

      const engine = new CombatEngine(grid, hazardManager, hero, []);
      let collectedNotice = '';
      engine.onRelicCollected = (relic, _h, ab) => {
        collectedNotice = `${relic.name} -> ${ab?.name}`;
      };

      const relic: PassiveRelic = {
        id: 'storm_battery',
        name: 'Storm Battery',
        icon: '⚡',
        description: '+2 Max AP',
        costEssence: 30,
        costXp: 30,
        applied: false,
        effect: (h) => {
          h.stats.maxAp += 2;
        },
      };

      // Spawn relic at (1, 2)
      engine.spawnRelicDrop({ x: 1, y: 2 }, relic);
      const tile = grid.getTile({ x: 1, y: 2 });
      expect(tile?.relic).toBeDefined();

      // Hero moves onto tile (1, 2)
      const moved = engine.moveUnit(hero, { x: 1, y: 2 });
      expect(moved).toBe(true);

      // Relic consumed from tile
      expect(tile?.relic).toBeUndefined();

      // Hero has 4 abilities now (next Lightning ability unlocked)
      expect(hero.abilities.length).toBe(4);
      expect(hero.abilities[3].element).toBe('Lightning');
      expect(collectedNotice).toContain('Storm Battery');
    });

    it('should vacuum remaining battlefield relics at round end and cap at 10 powers', () => {
      const hero = createHeroForElement('Earth');
      hero.coord = { x: 0, y: 0 };
      gardenManager.applyCraftedRelicsToHero(hero);
      expect(hero.abilities.length).toBe(3);

      const engine = new CombatEngine(grid, hazardManager, hero, []);

      // Place 10 relics around the board
      for (let i = 0; i < 10; i++) {
        const relic: PassiveRelic = {
          id: `earth_shard_${i}`,
          name: `Tectonic Shard #${i}`,
          icon: '🪨',
          description: '+10 Max HP',
          costEssence: 10,
          costXp: 10,
          applied: false,
          effect: (h) => {
            h.stats.maxHp += 10;
          },
        };
        engine.spawnRelicDrop({ x: i, y: 5 }, relic);
      }

      // Vacuum all relics
      engine.vacuumAllBoardRelics(hero);

      // Must be capped at strictly 10 powers
      expect(hero.abilities.length).toBe(10);
      hero.abilities.forEach((ab) => {
        expect(ab.element).toBe('Earth');
      });

      // Board is cleared of all relics
      for (let y = 0; y < grid.size; y++) {
        for (let x = 0; x < grid.size; x++) {
          expect(grid.getTile({ x, y })?.relic).toBeUndefined();
        }
      }
    });
  });

  describe('CrystalGardenManager Relic Tracking & Sync', () => {
    it('should sync external collected relics and increase unlocked move count up to 10', () => {
      const hero = createHeroForElement('Ice');
      gardenManager.applyCraftedRelicsToHero(hero);
      expect(hero.abilities.length).toBe(3);
      expect(gardenManager.getUnlockedMoveCount()).toBe(3);

      // Add 2 external relics
      gardenManager.addCollectedRelic('battle_drop_1', hero);
      expect(hero.abilities.length).toBe(4);
      expect(gardenManager.getUnlockedMoveCount()).toBe(4);

      gardenManager.addCollectedRelic('battle_drop_2', hero);
      expect(hero.abilities.length).toBe(5);
      expect(gardenManager.getUnlockedMoveCount()).toBe(5);

      // Add 10 more relics
      for (let i = 3; i <= 12; i++) {
        gardenManager.addCollectedRelic(`battle_drop_${i}`, hero);
      }

      // Capped at 10
      expect(hero.abilities.length).toBe(10);
      expect(gardenManager.getUnlockedMoveCount()).toBe(10);
    });

    it('should correctly restore unlocked moves for different elements upon class change', () => {
      // Collect 4 relics total (3 starter + 4 = 7 powers)
      for (let i = 1; i <= 4; i++) {
        gardenManager.addCollectedRelic(`relic_${i}`);
      }
      expect(gardenManager.getUnlockedMoveCount()).toBe(7);

      // Apply to Fire Hero
      const fireHero = createHeroForElement('Fire');
      gardenManager.applyCraftedRelicsToHero(fireHero);
      expect(fireHero.abilities.length).toBe(7);
      fireHero.abilities.forEach((a) => expect(a.element).toBe('Fire'));

      // Apply to Void Hero
      const voidHero = createHeroForElement('Void');
      gardenManager.applyCraftedRelicsToHero(voidHero);
      expect(voidHero.abilities.length).toBe(7);
      voidHero.abilities.forEach((a) => expect(a.element).toBe('Void'));
    });
  });
});
