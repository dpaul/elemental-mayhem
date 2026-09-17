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

  describe('Growth Progression, Watering, and Elemental Plant Food', () => {
    it('should prevent growth progression if plot is unwatered or missing elemental plant food', () => {
      garden.plantSeed(1, 'Fire');
      const plot = garden.getPlot(1);
      expect(plot?.isWatered).toBe(false);
      expect(plot?.hasPlantFood).toBe(false);

      // Attempt advance while both unwatered and unfed
      const unmanagedAdvance = garden.advanceGrowth(1);
      expect(unmanagedAdvance.maturedPlotIds).toHaveLength(0);
      expect(unmanagedAdvance.unwateredPlotIds).toContain(1);
      expect(unmanagedAdvance.unfedPlotIds).toContain(1);
      expect(plot?.growthProgress).toBe(0);
      expect(plot?.roundsRemaining).toBe(CRYSTAL_CONFIGS.Fire.growthRounds);

      // Water the plot, but still missing plant food
      const waterRes = garden.waterPlot(1);
      expect(waterRes.success).toBe(true);
      expect(plot?.isWatered).toBe(true);

      const unfedAdvance = garden.advanceGrowth(1);
      expect(unfedAdvance.unwateredPlotIds).toHaveLength(0);
      expect(unfedAdvance.unfedPlotIds).toContain(1);
      expect(plot?.growthProgress).toBe(0);
    });

    it('should advance growth when properly watered and fed with Elemental Plant Food', () => {
      garden.plantSeed(1, 'Fire'); // Fire takes 2 rounds
      const initialYield = garden.getPlot(1)?.yieldCount || 2;

      // Water and feed plant food
      expect(garden.waterPlot(1).success).toBe(true);
      const feedRes = garden.feedPlantFood(1);
      expect(feedRes.success).toBe(true);

      const plot = garden.getPlot(1);
      expect(plot?.hasPlantFood).toBe(true);
      expect(plot?.yieldCount).toBe(initialYield + 2); // Boosted yield!

      // Advance round 1
      const round1 = garden.advanceGrowth(1);
      expect(round1.maturedPlotIds).not.toContain(1);
      expect(plot?.roundsRemaining).toBe(1);
      expect(plot?.growthProgress).toBe(50);
      expect(plot?.stage).toBe('Sprout');

      // Water was consumed during the round!
      expect(plot?.isWatered).toBe(false);

      // Attempting to advance without watering for round 2 fails
      const unwateredRound2 = garden.advanceGrowth(1);
      expect(unwateredRound2.unwateredPlotIds).toContain(1);
      expect(plot?.roundsRemaining).toBe(1);

      // Water for round 2 (plant food persists!)
      expect(garden.waterPlot(1).success).toBe(true);
      const round2 = garden.advanceGrowth(1);
      expect(round2.maturedPlotIds).toContain(1);
      expect(plot?.roundsRemaining).toBe(0);
      expect(plot?.stage).toBe('Mature');
    });

    it('should harvest crystals from mature plot and yield boosted crystals to inventory', () => {
      garden.plantSeed(1, 'Fire');
      garden.feedPlantFood(1);
      garden.waterPlot(1);
      garden.advanceGrowth(1);
      garden.waterPlot(1);
      garden.advanceGrowth(1);

      const harvestRes = garden.harvestPlot(1);
      expect(harvestRes.success).toBe(true);
      expect(harvestRes.crystalType).toBe('Fire');
      expect(harvestRes.count).toBeGreaterThanOrEqual(4); // 2-3 base + 2 bonus = 4-5

      expect(garden.getInventory().crystals.Fire).toBe(harvestRes.count);
      const plot = garden.getPlot(1);
      expect(plot?.stage).toBe('Empty');
      expect(plot?.seedType).toBeUndefined();
      expect(plot?.isWatered).toBe(false);
      expect(plot?.hasPlantFood).toBe(false);
    });

    it('should fail to harvest an immature crop', () => {
      garden.plantSeed(1, 'Fire');
      const harvestRes = garden.harvestPlot(1);
      expect(harvestRes.success).toBe(false);
      expect(harvestRes.message).toContain('not ready');
    });

    it('should instantly mature crops using Growth Elixir and satisfy water and nutrient needs', () => {
      garden.addGrowthElixirs(1);
      garden.plantSeed(1, 'Fire');

      const elixirRes = garden.applyGrowthElixir(1);
      expect(elixirRes.success).toBe(true);

      const plot = garden.getPlot(1);
      expect(plot?.stage).toBe('Mature');
      expect(plot?.growthProgress).toBe(100);
      expect(plot?.isWatered).toBe(true);
      expect(plot?.hasPlantFood).toBe(true);
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

    it('should purchase Elemental Plant Food with Essence', () => {
      const initialFood = garden.getPlantFoodCount();
      const buyRes = garden.buyPlantFood(2, 50);
      expect(buyRes.success).toBe(true);
      expect(buyRes.totalCost).toBe(20);
      expect(garden.getPlantFoodCount()).toBe(initialFood + 2);
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
    it('should serialize and restore complete garden state including watering and plant food', () => {
      garden.unlockPlot(4, 50);
      garden.plantSeed(1, 'Nature');
      garden.waterPlot(1);
      garden.feedPlantFood(1);
      garden.addCrystals('Prismatic', 2);
      garden.addGrowthElixirs(3);
      garden.addPlantFood(5);

      const serialized = garden.serialize();
      expect(serialized.plots[3].unlocked).toBe(true);
      expect(serialized.plots[0].seedType).toBe('Nature');
      expect(serialized.plots[0].isWatered).toBe(true);
      expect(serialized.plots[0].hasPlantFood).toBe(true);
      expect(serialized.inventory.crystals.Prismatic).toBe(2);
      expect(serialized.inventory.plantFood).toBe(7); // 3 start - 1 fed + 5 added = 7

      const freshGarden = new CrystalGardenManager();
      freshGarden.loadState(serialized);

      expect(freshGarden.getPlot(4)?.unlocked).toBe(true);
      expect(freshGarden.getPlot(1)?.seedType).toBe('Nature');
      expect(freshGarden.getPlot(1)?.isWatered).toBe(true);
      expect(freshGarden.getPlot(1)?.hasPlantFood).toBe(true);
      expect(freshGarden.getInventory().crystals.Prismatic).toBe(2);
      expect(freshGarden.getPlantFoodCount()).toBe(7);
    });
  });
});
