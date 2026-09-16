// Elemental Mayhem - Crystal Garden, Shop & Relic Crafting Altar Test Suite
import { describe, it, expect, beforeEach } from 'vitest';
import { CrystalGardenManager, CRYSTAL_CONFIGS } from '../engine/CrystalManager';
import { Unit } from '../types';
import { createHeroForElement } from '../constants/classes';

describe('Crystal Garden & Relic Crafting Altar', () => {
  let garden: CrystalGardenManager;
  let hero: Unit;

  beforeEach(() => {
    garden = new CrystalGardenManager();
    hero = createHeroForElement('Fire');
  });

  describe('Garden Plot Initialization', () => {
    it('should initialize 6 plots with 3 unlocked and 3 locked', () => {
      const plots = garden.getPlots();
      expect(plots.length).toBe(6);
      expect(plots[0].unlocked).toBe(true);
      expect(plots[1].unlocked).toBe(true);
      expect(plots[2].unlocked).toBe(true);
      expect(plots[3].unlocked).toBe(false);
      expect(plots[4].unlocked).toBe(false);
      expect(plots[5].unlocked).toBe(false);
    });

    it('should provide starter seeds in inventory', () => {
      const inv = garden.getInventory();
      expect(inv.seeds.Fire).toBeGreaterThanOrEqual(1);
      expect(inv.seeds.Water).toBeGreaterThanOrEqual(1);
      expect(inv.seeds.Earth).toBeGreaterThanOrEqual(1);
      expect(inv.seeds.Nature).toBeGreaterThanOrEqual(1);
      expect(inv.crystals.Fire).toBe(0);
    });
  });

  describe('Seed Planting and Plot Validation', () => {
    it('should plant a seed in an unlocked empty plot', () => {
      const initFireSeeds = garden.getInventory().seeds.Fire;
      const res = garden.plantSeed(1, 'Fire');
      expect(res.success).toBe(true);

      const plot = garden.getPlot(1);
      expect(plot?.seedType).toBe('Fire');
      expect(plot?.stage).toBe('Seed');
      expect(plot?.roundsRemaining).toBe(CRYSTAL_CONFIGS.Fire.growthRounds);
      expect(garden.getInventory().seeds.Fire).toBe(initFireSeeds - 1);
    });

    it('should reject planting in a locked plot', () => {
      const res = garden.plantSeed(4, 'Fire');
      expect(res.success).toBe(false);
      expect(res.message).toContain('locked');
    });

    it('should reject planting in an already occupied plot', () => {
      garden.plantSeed(1, 'Fire');
      const secondRes = garden.plantSeed(1, 'Water');
      expect(secondRes.success).toBe(false);
      expect(secondRes.message).toContain('already occupied');
    });

    it('should reject planting when player has 0 seeds', () => {
      const res = garden.plantSeed(2, 'Prismatic');
      expect(res.success).toBe(false);
      expect(res.message).toContain('Astral Diamond seeds');
    });
  });

  describe('Growth Progression and Harvesting', () => {
    it('should advance growth over rounds until mature', () => {
      garden.plantSeed(1, 'Fire'); // Fire needs 2 rounds
      const round1 = garden.advanceGrowth(1);
      expect(round1.maturedPlotIds).not.toContain(1);

      const plotMid = garden.getPlot(1);
      expect(plotMid?.roundsRemaining).toBe(1);
      expect(plotMid?.growthProgress).toBe(50);
      expect(plotMid?.stage).toBe('Sprout');

      const round2 = garden.advanceGrowth(1);
      expect(round2.maturedPlotIds).toContain(1);

      const plotMature = garden.getPlot(1);
      expect(plotMature?.roundsRemaining).toBe(0);
      expect(plotMature?.stage).toBe('Mature');
    });

    it('should harvest crystals from mature plot and yield to inventory', () => {
      garden.plantSeed(1, 'Fire');
      garden.advanceGrowth(CRYSTAL_CONFIGS.Fire.growthRounds);

      const harvestRes = garden.harvestPlot(1);
      expect(harvestRes.success).toBe(true);
      expect(harvestRes.crystalType).toBe('Fire');
      expect(harvestRes.count).toBeGreaterThanOrEqual(2);

      expect(garden.getInventory().crystals.Fire).toBe(harvestRes.count);
      const plot = garden.getPlot(1);
      expect(plot?.stage).toBe('Empty');
      expect(plot?.seedType).toBeUndefined();
    });

    it('should fail to harvest an immature crop', () => {
      garden.plantSeed(1, 'Fire');
      const harvestRes = garden.harvestPlot(1);
      expect(harvestRes.success).toBe(false);
      expect(harvestRes.message).toContain('not ready');
    });

    it('should instantly mature crops using Growth Elixir', () => {
      garden.addGrowthElixirs(1);
      garden.plantSeed(1, 'Fire');

      const elixirRes = garden.applyGrowthElixir(1);
      expect(elixirRes.success).toBe(true);

      const plot = garden.getPlot(1);
      expect(plot?.stage).toBe('Mature');
      expect(plot?.growthProgress).toBe(100);
      expect(garden.getGrowthElixirCount()).toBe(0);
    });
  });

  describe('Crystal Shop Transactions', () => {
    it('should purchase seeds with sufficient Essence', () => {
      const buyRes = garden.buySeed('Lightning', 2, 100);
      expect(buyRes.success).toBe(true);
      expect(buyRes.totalCost).toBe(CRYSTAL_CONFIGS.Lightning.seedCostEssence * 2);
      expect(garden.getInventory().seeds.Lightning).toBe(2);
    });

    it('should reject seed purchase if Essence is insufficient', () => {
      const buyRes = garden.buySeed('Prismatic', 1, 10);
      expect(buyRes.success).toBe(false);
      expect(buyRes.message).toContain('Insufficient Essence');
    });

    it('should purchase Growth Elixirs with Essence', () => {
      const res = garden.buyGrowthElixir(50);
      expect(res.success).toBe(true);
      expect(garden.getGrowthElixirCount()).toBe(1);
    });

    it('should unlock plots with escalating costs', () => {
      const resPlot4 = garden.unlockPlot(4, 50);
      expect(resPlot4.success).toBe(true);
      expect(garden.getPlot(4)?.unlocked).toBe(true);

      const resPlot5 = garden.unlockPlot(5, 100);
      expect(resPlot5.success).toBe(true);
      expect(garden.getPlot(5)?.unlocked).toBe(true);
    });

    it('should sell harvested crystals for Essence', () => {
      garden.addCrystals('Earth', 3);
      const sellRes = garden.sellCrystal('Earth', 2);
      expect(sellRes.success).toBe(true);
      expect(sellRes.earnedEssence).toBe(CRYSTAL_CONFIGS.Earth.sellValueEssence * 2);
      expect(garden.getInventory().crystals.Earth).toBe(1);
    });
  });

  describe('Relic Crafting Altar', () => {
    it('should list all relic blueprints', () => {
      const recipes = garden.getRecipes();
      expect(recipes.length).toBeGreaterThanOrEqual(7);
      expect(recipes.some((r) => r.id === 'relic_fire_heart')).toBe(true);
      expect(recipes.some((r) => r.id === 'relic_frostborn_aegis')).toBe(true);
      expect(recipes.some((r) => r.id === 'relic_storm_conduit')).toBe(true);
    });

    it('should correctly determine recipe crafting eligibility', () => {
      expect(garden.canCraftRecipe('relic_fire_heart')).toBe(false);
      garden.addCrystals('Fire', 3);
      garden.addCrystals('Earth', 1);
      expect(garden.canCraftRecipe('relic_fire_heart')).toBe(true);
    });

    it('should craft a relic, deduct crystals, and grant permanent hero stats, AP, and unlock moves', () => {
      garden.applyCraftedRelicsToHero(hero);
      expect(hero.abilities.length).toBe(3);
      const initialMaxHp = hero.stats.maxHp;
      const initialMaxAp = hero.stats.maxAp;
      const targetAbility = hero.abilities.find((a) => a.element === 'Fire');
      const initialFireDmg = targetAbility?.baseDamage || 0;

      garden.addCrystals('Fire', 3);
      garden.addCrystals('Earth', 1);

      const craftRes = garden.craftRelic('relic_fire_heart', hero);
      expect(craftRes.success).toBe(true);
      expect(garden.isRelicCrafted('relic_fire_heart')).toBe(true);

      // Crystals deducted
      expect(garden.getInventory().crystals.Fire).toBe(0);
      expect(garden.getInventory().crystals.Earth).toBe(0);

      // Hero empowered with HP, AP and unlocked moves
      expect(hero.stats.maxHp).toBe(initialMaxHp + 35);
      expect(hero.stats.maxAp).toBe(initialMaxAp + 1);
      expect(hero.abilities.length).toBe(4);
      const updatedAbility = hero.abilities.find((a) => a.id === targetAbility?.id);
      expect(updatedAbility?.baseDamage).toBe(initialFireDmg + 8);
    });

    it('should prevent crafting the same relic twice', () => {
      garden.addCrystals('Fire', 6);
      garden.addCrystals('Earth', 2);
      garden.craftRelic('relic_fire_heart', hero);

      const secondAttempt = garden.craftRelic('relic_fire_heart', hero);
      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.message).toContain('already been forged');
    });

    it('should re-apply crafted relics to new hero instances', () => {
      garden.addCrystals('Lightning', 3);
      garden.addCrystals('Void', 1);
      garden.craftRelic('relic_storm_conduit', hero);

      const newHero = createHeroForElement('Lightning');
      const baseAp = newHero.stats.maxAp;

      garden.applyCraftedRelicsToHero(newHero);
      expect(newHero.stats.maxAp).toBe(baseAp + 2);
      expect(newHero.abilities.length).toBe(4);
    });

    it('should start hero with 3 weakest moves and unlock all 10 moves + grant all AP bonuses when all 7 relics are forged', () => {
      const freshHero = createHeroForElement('Fire');
      garden.applyCraftedRelicsToHero(freshHero);
      expect(freshHero.abilities.length).toBe(3);

      freshHero.abilities.forEach((a) => {
        expect(a.apCost).toBeLessThanOrEqual(4);
      });

      const initialAp = freshHero.stats.maxAp;

      // Provide crystals for all 7 recipes
      garden.addCrystals('Fire', 20);
      garden.addCrystals('Earth', 20);
      garden.addCrystals('Ice', 20);
      garden.addCrystals('Water', 20);
      garden.addCrystals('Lightning', 20);
      garden.addCrystals('Void', 20);
      garden.addCrystals('Nature', 20);
      garden.addCrystals('Prismatic', 20);

      const recipes = garden.getRecipes();
      for (const recipe of recipes) {
        const res = garden.craftRelic(recipe.id, freshHero);
        expect(res.success).toBe(true);
      }

      // 3 starter moves + 7 relics = 10 moves
      expect(freshHero.abilities.length).toBe(10);
      // All 7 relics grant AP bonuses: +1, +1, +2, +1, +2, +1, +3 = +11 Max AP
      expect(freshHero.stats.maxAp).toBe(initialAp + 11);
      expect(garden.getUnlockedMoveCount()).toBe(10);
    });
  });

  describe('Serialization and Persistence', () => {
    it('should serialize and restore complete garden state', () => {
      garden.unlockPlot(4, 50);
      garden.plantSeed(1, 'Nature');
      garden.addCrystals('Prismatic', 2);
      garden.addGrowthElixirs(3);

      const serialized = garden.serialize();
      expect(serialized.plots[3].unlocked).toBe(true);
      expect(serialized.plots[0].seedType).toBe('Nature');
      expect(serialized.inventory.crystals.Prismatic).toBe(2);

      const freshGarden = new CrystalGardenManager();
      freshGarden.loadState(serialized);

      expect(freshGarden.getPlot(4)?.unlocked).toBe(true);
      expect(freshGarden.getPlot(1)?.seedType).toBe('Nature');
      expect(freshGarden.getInventory().crystals.Prismatic).toBe(2);
    });
  });
});
