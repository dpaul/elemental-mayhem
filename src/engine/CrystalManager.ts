// Elemental Mayhem - Crystal Garden, Garden Plots, Shop & Relic Crafting Engine
import { CrystalType, GardenPlot, CrystalInventory, RelicCraftingRecipe, SerializedGardenState, Unit, Ability, ElementType } from '../types';
import { HERO_CLASSES } from '../constants/classes';

export function getOrderedWeakestAbilities(abilities: Ability[]): Ability[] {
  // Sort abilities from weakest to strongest:
  // Lower damage and lower AP cost come first; 0-damage utility/shields are treated as basic starter moves.
  return [...abilities].sort((a, b) => {
    const powerA = (a.baseDamage > 0 ? a.baseDamage : 12) + (a.apCost || 1) * 4;
    const powerB = (b.baseDamage > 0 ? b.baseDamage : 12) + (b.apCost || 1) * 4;
    return powerA - powerB;
  });
}

export interface CrystalConfig {
  type: CrystalType;
  name: string;
  gemName: string;
  icon: string;
  seedIcon: string;
  color: string;
  description: string;
  seedCostEssence: number;
  sellValueEssence: number;
  growthRounds: number;
}

export const CRYSTAL_CONFIGS: Record<CrystalType, CrystalConfig> = {
  Fire: {
    type: 'Fire',
    name: 'Fire Ruby',
    gemName: 'Blazing Ruby',
    icon: '💎',
    seedIcon: '🔥',
    color: '#ef4444',
    description: 'Volatile pyrotechnic gemstone radiating incandescent warmth.',
    seedCostEssence: 20,
    sellValueEssence: 14,
    growthRounds: 2,
  },
  Water: {
    type: 'Water',
    name: 'Water Sapphire',
    gemName: 'Deep Sapphire',
    icon: '🔷',
    seedIcon: '💧',
    color: '#38bdf8',
    description: 'Fluctuating oceanic crystal containing aqueous pressure.',
    seedCostEssence: 20,
    sellValueEssence: 14,
    growthRounds: 2,
  },
  Earth: {
    type: 'Earth',
    name: 'Earth Emerald',
    gemName: 'Tectonic Emerald',
    icon: '🟢',
    seedIcon: '🪨',
    color: '#22c55e',
    description: 'Hardened terrestrial gemstone resonant with stone armor.',
    seedCostEssence: 20,
    sellValueEssence: 14,
    growthRounds: 2,
  },
  Lightning: {
    type: 'Lightning',
    name: 'Lightning Topaz',
    gemName: 'Storm Topaz',
    icon: '🟡',
    seedIcon: '⚡',
    color: '#eab308',
    description: 'High-voltage electric crystal crackling with kinetic arcs.',
    seedCostEssence: 25,
    sellValueEssence: 18,
    growthRounds: 2,
  },
  Void: {
    type: 'Void',
    name: 'Void Amethyst',
    gemName: 'Cosmic Amethyst',
    icon: '🟣',
    seedIcon: '🌌',
    color: '#a855f7',
    description: 'Dark matter singularity crystal warping local gravitational space.',
    seedCostEssence: 35,
    sellValueEssence: 25,
    growthRounds: 3,
  },
  Ice: {
    type: 'Ice',
    name: 'Ice Diamond',
    gemName: 'Glacial Diamond',
    icon: '💠',
    seedIcon: '❄️',
    color: '#06b6d4',
    description: 'Sub-zero cryo crystalline shard that chills nearby air.',
    seedCostEssence: 25,
    sellValueEssence: 18,
    growthRounds: 2,
  },
  Nature: {
    type: 'Nature',
    name: 'Nature Peridot',
    gemName: 'Verdant Peridot',
    icon: '🌿',
    seedIcon: '🍃',
    color: '#84cc16',
    description: 'Living chlorophyllic gemstone pulsing with biological regeneration.',
    seedCostEssence: 20,
    sellValueEssence: 14,
    growthRounds: 2,
  },
  Prismatic: {
    type: 'Prismatic',
    name: 'Astral Diamond',
    gemName: 'Prismatic Astral Gem',
    icon: '🔮',
    seedIcon: '✨',
    color: '#ec4899',
    description: 'Mythical omni-elemental crystal harmonizing all cosmic currents.',
    seedCostEssence: 60,
    sellValueEssence: 45,
    growthRounds: 4,
  },
};

export class CrystalGardenManager {
  private plots: GardenPlot[] = [];
  private inventory: CrystalInventory;
  private craftedRelicIds: Set<string> = new Set();
  private collectedRelicIds: Set<string> = new Set();
  private growthElixirCount: number = 0;
  private recipes: RelicCraftingRecipe[] = [];

  constructor() {
    this.inventory = {
      seeds: {
        Fire: 1,
        Water: 1,
        Earth: 1,
        Lightning: 0,
        Void: 0,
        Ice: 0,
        Nature: 1,
        Prismatic: 0,
      },
      crystals: {
        Fire: 0,
        Water: 0,
        Earth: 0,
        Lightning: 0,
        Void: 0,
        Ice: 0,
        Nature: 0,
        Prismatic: 0,
      },
      plantFood: 3,
    };

    this.initDefaultPlots();
    this.initRecipes();
  }

  private initDefaultPlots(): void {
    this.plots = [
      { id: 1, unlocked: true, stage: 'Empty', growthProgress: 0, roundsRemaining: 0, yieldCount: 0, isWatered: false, hasPlantFood: false },
      { id: 2, unlocked: true, stage: 'Empty', growthProgress: 0, roundsRemaining: 0, yieldCount: 0, isWatered: false, hasPlantFood: false },
      { id: 3, unlocked: true, stage: 'Empty', growthProgress: 0, roundsRemaining: 0, yieldCount: 0, isWatered: false, hasPlantFood: false },
      { id: 4, unlocked: false, stage: 'Empty', growthProgress: 0, roundsRemaining: 0, yieldCount: 0, isWatered: false, hasPlantFood: false },
      { id: 5, unlocked: false, stage: 'Empty', growthProgress: 0, roundsRemaining: 0, yieldCount: 0, isWatered: false, hasPlantFood: false },
      { id: 6, unlocked: false, stage: 'Empty', growthProgress: 0, roundsRemaining: 0, yieldCount: 0, isWatered: false, hasPlantFood: false },
    ];
  }

  private initRecipes(): void {
    this.recipes = [
      {
        id: 'relic_fire_heart',
        name: 'Heart of the Fire Ruby',
        icon: '❤️‍🔥',
        description: 'Forged from blazing rubies. Imbues champion with ferocious vitality, burning conflagration, and enhanced AP.',
        statBonusText: '+1 Max AP, +35 Max HP, +8 Fire Spell Damage, and unlocks +1 move',
        requiredCrystals: { Fire: 3, Earth: 1 },
        crafted: false,
        effect: (hero: Unit) => {
          hero.stats.maxAp += 1;
          hero.stats.currentAp += 1;
          hero.stats.maxHp += 35;
          hero.stats.currentHp += 35;
          hero.abilities.forEach((a) => {
            if (a.element === 'Fire') a.baseDamage += 8;
          });
        },
      },
      {
        id: 'relic_frostborn_aegis',
        name: 'Aegis of the Frostborn',
        icon: '🛡️❄️',
        description: 'Crystalline bulwark etched with sub-zero glacial diamonds. Fortifies physical form and stamina.',
        statBonusText: '+1 Max AP, +45 Max HP, +30 Shield at combat round start, and unlocks +1 move',
        requiredCrystals: { Ice: 3, Water: 1 },
        crafted: false,
        effect: (hero: Unit) => {
          hero.stats.maxAp += 1;
          hero.stats.currentAp += 1;
          hero.stats.maxHp += 45;
          hero.stats.currentHp += 45;
        },
      },
      {
        id: 'relic_storm_conduit',
        name: 'Storm Conduit Signet',
        icon: '⚡💍',
        description: 'Superconductive band infused with high-voltage topaz and void gravity.',
        statBonusText: '+2 Max AP per turn, +6 Lightning Damage, and unlocks +1 move',
        requiredCrystals: { Lightning: 3, Void: 1 },
        crafted: false,
        effect: (hero: Unit) => {
          hero.stats.maxAp += 2;
          hero.stats.currentAp += 2;
          hero.abilities.forEach((a) => {
            if (a.element === 'Lightning') a.baseDamage += 6;
          });
        },
      },
      {
        id: 'relic_verdant_brooch',
        name: 'Verdant Rejuvenation Brooch',
        icon: '🌿✨',
        description: 'Living blossom containing ancient chlorophyllic peridot sap. Continually knits wounds and invigorates reflexes.',
        statBonusText: '+1 Max AP, +30 Max HP, +10 HP/round regen, and unlocks +1 move',
        requiredCrystals: { Nature: 3, Water: 1 },
        crafted: false,
        effect: (hero: Unit) => {
          hero.stats.maxAp += 1;
          hero.stats.currentAp += 1;
          hero.stats.maxHp += 30;
          hero.stats.currentHp += 30;
        },
      },
      {
        id: 'relic_void_chalice',
        name: 'Void Singularity Chalice',
        icon: '🌌🏆',
        description: 'Vessel containing condensed cosmic dark matter. Siphons vitality from fallen foes and warps action limits.',
        statBonusText: '+2 Max AP, +25 Max HP, restores 15 HP on enemy defeat, and unlocks +1 move',
        requiredCrystals: { Void: 3, Prismatic: 1 },
        crafted: false,
        effect: (hero: Unit) => {
          hero.stats.maxAp += 2;
          hero.stats.currentAp += 2;
          hero.stats.maxHp += 25;
          hero.stats.currentHp += 25;
        },
      },
      {
        id: 'relic_granite_colossus',
        name: 'Granite Colossus Core',
        icon: '🪨🗿',
        description: 'Dense core forged from tectonic emeralds. Makes the body immovable as a mountain and provides enduring stamina.',
        statBonusText: '+1 Max AP, +75 Max HP, +20% all damage resistance, and unlocks +1 move',
        requiredCrystals: { Earth: 4 },
        crafted: false,
        effect: (hero: Unit) => {
          hero.stats.maxAp += 1;
          hero.stats.currentAp += 1;
          hero.stats.maxHp += 75;
          hero.stats.currentHp += 75;
        },
      },
      {
        id: 'relic_archon_crown',
        name: 'Prismatic Archon Crown',
        icon: '👑💎',
        description: 'Masterwork diademed relic harmonizing all primordial crystal facets.',
        statBonusText: '+3 Max AP, +60 Max HP, -1 AP ability cost, and unlocks +1 move',
        requiredCrystals: {
          Fire: 1,
          Water: 1,
          Earth: 1,
          Lightning: 1,
          Void: 1,
          Ice: 1,
        },
        crafted: false,
        effect: (hero: Unit) => {
          hero.stats.maxAp += 3;
          hero.stats.currentAp += 3;
          hero.stats.maxHp += 60;
          hero.stats.currentHp += 60;
          hero.abilities.forEach((a) => {
            a.apCost = Math.max(1, a.apCost - 1);
          });
        },
      },
    ];
  }

  // ==========================================================================
  // GARDEN PLOTS & CROP LIFECYCLE
  // ==========================================================================

  public getPlots(): GardenPlot[] {
    return this.plots;
  }

  public getPlot(plotId: number): GardenPlot | undefined {
    return this.plots.find((p) => p.id === plotId);
  }

  public plantSeed(plotId: number, seedType: CrystalType): { success: boolean; message: string } {
    const plot = this.getPlot(plotId);
    if (!plot) return { success: false, message: 'Invalid garden plot.' };
    if (!plot.unlocked) return { success: false, message: 'This garden plot is locked. Unlock it in the shop!' };
    if (plot.stage !== 'Empty') return { success: false, message: 'Plot is already occupied by a growing crystal.' };

    const availableSeeds = this.inventory.seeds[seedType] || 0;
    if (availableSeeds <= 0) {
      return { success: false, message: `You have no ${CRYSTAL_CONFIGS[seedType].name} seeds in your inventory.` };
    }

    // Deduct seed and initialize plot
    this.inventory.seeds[seedType] -= 1;
    const config = CRYSTAL_CONFIGS[seedType];

    plot.seedType = seedType;
    plot.stage = 'Seed';
    plot.growthProgress = 0;
    plot.roundsRemaining = config.growthRounds;
    plot.yieldCount = Math.floor(Math.random() * 2) + 2; // Yields 2-3 crystals
    plot.isWatered = false;
    plot.hasPlantFood = false;

    return {
      success: true,
      message: `Planted ${config.name} seed in Plot #${plotId}. Remember to water it and provide Elemental Plant Food!`,
    };
  }

  public waterPlot(plotId: number): { success: boolean; message: string } {
    const plot = this.getPlot(plotId);
    if (!plot) return { success: false, message: 'Invalid garden plot.' };
    if (!plot.unlocked) return { success: false, message: 'This garden plot is locked. Unlock it in the shop!' };
    if (plot.stage === 'Empty' || !plot.seedType) {
      return { success: false, message: 'Plot is empty. Sow a seed before watering.' };
    }
    if (plot.stage === 'Mature') {
      return { success: false, message: 'Crop is already fully mature and ready to harvest!' };
    }
    if (plot.isWatered) {
      return { success: false, message: `Plot #${plotId} is already well-watered for this round.` };
    }

    plot.isWatered = true;
    return {
      success: true,
      message: `💧 Watered Plot #${plotId}! The soil is soaked and ready for the next growth cycle.`,
    };
  }

  public feedPlantFood(plotId: number): { success: boolean; message: string } {
    const plot = this.getPlot(plotId);
    if (!plot) return { success: false, message: 'Invalid garden plot.' };
    if (!plot.unlocked) return { success: false, message: 'This garden plot is locked. Unlock it in the shop!' };
    if (plot.stage === 'Empty' || !plot.seedType) {
      return { success: false, message: 'Plot is empty. Sow a seed before applying plant food.' };
    }
    if (plot.stage === 'Mature') {
      return { success: false, message: 'Crop is already fully mature and ready to harvest!' };
    }
    if (plot.hasPlantFood) {
      return { success: false, message: `Plot #${plotId} is already energized with Elemental Plant Food.` };
    }
    if ((this.inventory.plantFood || 0) <= 0) {
      return { success: false, message: 'No Elemental Plant Food in inventory. Purchase some in the Crystal Shop!' };
    }

    this.inventory.plantFood -= 1;
    plot.hasPlantFood = true;
    plot.yieldCount = (plot.yieldCount || 2) + 2; // Extra yield bonus
    return {
      success: true,
      message: `🧪 Nourished Plot #${plotId} with Elemental Plant Food! Crop energized (+2 crystal harvest yield)!`,
    };
  }

  public advanceGrowth(roundsCount: number = 1): {
    maturedPlotIds: number[];
    unwateredPlotIds: number[];
    unfedPlotIds: number[];
  } {
    const maturedPlotIds: number[] = [];
    const unwateredPlotIds: number[] = [];
    const unfedPlotIds: number[] = [];

    for (const plot of this.plots) {
      if (!plot.unlocked || plot.stage === 'Empty' || plot.stage === 'Mature' || !plot.seedType) {
        continue;
      }

      let canGrow = true;
      if (!plot.isWatered) {
        unwateredPlotIds.push(plot.id);
        canGrow = false;
      }
      if (!plot.hasPlantFood) {
        unfedPlotIds.push(plot.id);
        canGrow = false;
      }

      if (!canGrow) {
        continue;
      }

      const config = CRYSTAL_CONFIGS[plot.seedType];
      plot.roundsRemaining = Math.max(0, plot.roundsRemaining - roundsCount);

      const totalRounds = config.growthRounds;
      const completedRounds = totalRounds - plot.roundsRemaining;
      plot.growthProgress = Math.min(100, Math.round((completedRounds / totalRounds) * 100));

      // Moisture is consumed this round, requiring re-watering for the next cycle
      plot.isWatered = false;

      if (plot.roundsRemaining === 0) {
        plot.stage = 'Mature';
        maturedPlotIds.push(plot.id);
      } else if (plot.growthProgress >= 50) {
        plot.stage = 'Sprout';
      }
    }

    return { maturedPlotIds, unwateredPlotIds, unfedPlotIds };
  }

  public harvestPlot(plotId: number): {
    success: boolean;
    crystalType?: CrystalType;
    count?: number;
    message: string;
  } {
    const plot = this.getPlot(plotId);
    if (!plot) return { success: false, message: 'Invalid plot.' };
    if (plot.stage !== 'Mature' || !plot.seedType) {
      return { success: false, message: 'This crystal is still growing and not ready to harvest.' };
    }

    const type = plot.seedType;
    const count = plot.yieldCount || 2;
    const config = CRYSTAL_CONFIGS[type];

    // Add to crystal inventory
    this.inventory.crystals[type] = (this.inventory.crystals[type] || 0) + count;

    // Reset plot
    plot.stage = 'Empty';
    plot.seedType = undefined;
    plot.growthProgress = 0;
    plot.roundsRemaining = 0;
    plot.yieldCount = 0;
    plot.isWatered = false;
    plot.hasPlantFood = false;

    return {
      success: true,
      crystalType: type,
      count,
      message: `✨ Harvested ${count}x ${config.gemName}! Added to your Crystal Bag.`,
    };
  }

  public applyGrowthElixir(plotId: number): { success: boolean; message: string } {
    const plot = this.getPlot(plotId);
    if (!plot) return { success: false, message: 'Invalid plot.' };
    if (plot.stage === 'Empty' || plot.stage === 'Mature' || !plot.seedType) {
      return { success: false, message: 'Plot has no active growing crystal.' };
    }
    if (this.growthElixirCount <= 0) {
      return { success: false, message: 'No Growth Elixirs available. Purchase one in the Crystal Shop!' };
    }

    this.growthElixirCount -= 1;
    plot.stage = 'Mature';
    plot.growthProgress = 100;
    plot.roundsRemaining = 0;
    plot.isWatered = true;
    plot.hasPlantFood = true;

    return {
      success: true,
      message: `🧪 Growth Elixir applied to Plot #${plotId}! Crystal instantly matured to full bloom!`,
    };
  }

  public unlockPlot(plotId: number, currentEssence: number): {
    success: boolean;
    essenceCost: number;
    message: string;
  } {
    const plot = this.getPlot(plotId);
    if (!plot) return { success: false, essenceCost: 0, message: 'Invalid plot.' };
    if (plot.unlocked) return { success: false, essenceCost: 0, message: 'Plot is already unlocked.' };

    const costBySlot: Record<number, number> = {
      4: 50,
      5: 100,
      6: 150,
    };
    const cost = costBySlot[plotId] || 75;

    if (currentEssence < cost) {
      return {
        success: false,
        essenceCost: cost,
        message: `Need ${cost} Essence to unlock Plot #${plotId} (you have ${currentEssence}).`,
      };
    }

    plot.unlocked = true;
    return {
      success: true,
      essenceCost: cost,
      message: `🎉 Garden Plot #${plotId} unlocked! You can now plant additional crystal seeds.`,
    };
  }

  // ==========================================================================
  // INVENTORY & SHOP
  // ==========================================================================

  public getInventory(): CrystalInventory {
    return this.inventory;
  }

  public getGrowthElixirCount(): number {
    return this.growthElixirCount;
  }

  public addGrowthElixirs(count: number): void {
    this.growthElixirCount += count;
  }

  public addSeeds(type: CrystalType, count: number): void {
    this.inventory.seeds[type] = (this.inventory.seeds[type] || 0) + count;
  }

  public addCrystals(type: CrystalType, count: number): void {
    this.inventory.crystals[type] = (this.inventory.crystals[type] || 0) + count;
  }

  public buySeed(
    type: CrystalType,
    count: number,
    currentEssence: number
  ): { success: boolean; totalCost: number; message: string } {
    const config = CRYSTAL_CONFIGS[type];
    if (!config) return { success: false, totalCost: 0, message: 'Unknown crystal type.' };

    const totalCost = config.seedCostEssence * count;
    if (currentEssence < totalCost) {
      return {
        success: false,
        totalCost,
        message: `Insufficient Essence. ${count}x ${config.name} seeds cost ${totalCost} Essence (you have ${currentEssence}).`,
      };
    }

    this.addSeeds(type, count);
    return {
      success: true,
      totalCost,
      message: `Purchased ${count}x ${config.name} seeds for ${totalCost} Essence!`,
    };
  }

  public sellCrystal(
    type: CrystalType,
    count: number
  ): { success: boolean; earnedEssence: number; message: string } {
    const config = CRYSTAL_CONFIGS[type];
    if (!config) return { success: false, earnedEssence: 0, message: 'Unknown crystal type.' };

    const available = this.inventory.crystals[type] || 0;
    if (available < count) {
      return {
        success: false,
        earnedEssence: 0,
        message: `You only have ${available}x ${config.gemName} to sell.`,
      };
    }

    this.inventory.crystals[type] -= count;
    const earnedEssence = config.sellValueEssence * count;

    return {
      success: true,
      earnedEssence,
      message: `Sold ${count}x ${config.gemName} for +${earnedEssence} Essence!`,
    };
  }

  public buyGrowthElixir(
    currentEssence: number
  ): { success: boolean; cost: number; message: string } {
    const cost = 35;
    if (currentEssence < cost) {
      return {
        success: false,
        cost,
        message: `Growth Elixir costs ${cost} Essence (you have ${currentEssence}).`,
      };
    }

    this.growthElixirCount += 1;
    return {
      success: true,
      cost,
      message: 'Purchased 1x Growth Elixir! Use it in the garden to mature any plant instantly.',
    };
  }

  public getPlantFoodCount(): number {
    return this.inventory.plantFood || 0;
  }

  public addPlantFood(count: number): void {
    this.inventory.plantFood = (this.inventory.plantFood || 0) + count;
  }

  public buyPlantFood(
    count: number,
    currentEssence: number
  ): { success: boolean; totalCost: number; message: string } {
    const costPerItem = 10;
    const totalCost = costPerItem * count;
    if (currentEssence < totalCost) {
      return {
        success: false,
        totalCost,
        message: `Elemental Plant Food costs ${totalCost} Essence for ${count}x (you have ${currentEssence}).`,
      };
    }

    this.addPlantFood(count);
    return {
      success: true,
      totalCost,
      message: `Purchased ${count}x Elemental Plant Food for ${totalCost} Essence!`,
    };
  }

  // ==========================================================================
  // RELIC CRAFTING ALTAR
  // ==========================================================================

  public getRecipes(): RelicCraftingRecipe[] {
    return this.recipes;
  }

  public getCraftedRelicIds(): string[] {
    return Array.from(this.craftedRelicIds);
  }

  public getCollectedRelicIds(): string[] {
    const all = new Set([...this.craftedRelicIds, ...this.collectedRelicIds]);
    return Array.from(all);
  }

  public getUnlockedMoveCount(): number {
    // Players start with 3 of the weakest moves + 1 move per collected/crafted relic (up to 10)
    const totalRelics = new Set([...this.craftedRelicIds, ...this.collectedRelicIds]).size;
    return Math.min(10, 3 + totalRelics);
  }

  public addCollectedRelic(relicId: string, hero?: Unit): { newlyUnlockedAbility?: Ability } {
    const prevMoveCount = hero?.abilities ? hero.abilities.length : this.getUnlockedMoveCount();
    this.collectedRelicIds.add(relicId);
    if (hero) {
      this.applyCraftedRelicsToHero(hero);
    }
    const newMoveCount = hero?.abilities ? hero.abilities.length : this.getUnlockedMoveCount();
    const newlyUnlockedAbility = hero?.abilities && newMoveCount > prevMoveCount ? hero.abilities[newMoveCount - 1] : undefined;
    return { newlyUnlockedAbility };
  }

  public getHeroAbilities(element: ElementType): Ability[] {
    const config = HERO_CLASSES[element] || HERO_CLASSES.Fire;
    if (element === 'Admin' || config.element === 'Admin') {
      return config.abilities.map((a) => ({ ...a, currentCooldown: 0 }));
    }

    const fullAbilities = config.abilities.slice(0, 10);
    const ordered = getOrderedWeakestAbilities(fullAbilities);
    const count = this.getUnlockedMoveCount();
    return ordered.slice(0, count).map((a) => ({ ...a, currentCooldown: 0 }));
  }

  public isRelicCrafted(recipeId: string): boolean {
    return this.craftedRelicIds.has(recipeId);
  }

  public canCraftRecipe(recipeId: string): boolean {
    const recipe = this.recipes.find((r) => r.id === recipeId);
    if (!recipe || this.isRelicCrafted(recipeId)) return false;

    for (const [crystalType, reqCount] of Object.entries(recipe.requiredCrystals)) {
      const type = crystalType as CrystalType;
      const count = reqCount || 0;
      if ((this.inventory.crystals[type] || 0) < count) {
        return false;
      }
    }
    return true;
  }

  public craftRelic(
    recipeId: string,
    hero?: Unit
  ): { success: boolean; relic?: RelicCraftingRecipe; newlyUnlockedAbility?: Ability; message: string } {
    const recipe = this.recipes.find((r) => r.id === recipeId);
    if (!recipe) return { success: false, message: 'Unknown relic blueprint.' };
    if (this.isRelicCrafted(recipeId)) {
      return { success: false, message: `${recipe.name} has already been forged!` };
    }

    if (!this.canCraftRecipe(recipeId)) {
      return { success: false, message: `Missing required elemental crystals to forge ${recipe.name}.` };
    }

    // Deduct crystals
    for (const [crystalType, reqCount] of Object.entries(recipe.requiredCrystals)) {
      const type = crystalType as CrystalType;
      const count = reqCount || 0;
      this.inventory.crystals[type] = (this.inventory.crystals[type] || 0) - count;
    }

    const prevMoveCount = hero?.abilities ? hero.abilities.length : 3;

    // Mark crafted
    this.craftedRelicIds.add(recipeId);
    recipe.crafted = true;

    // Apply relic bonuses, increase AP, and unlock the next move on the hero if present
    if (hero) {
      this.applyCraftedRelicsToHero(hero);
    }

    const newMoveCount = hero?.abilities ? hero.abilities.length : this.getUnlockedMoveCount();
    const newlyUnlockedAbility = hero?.abilities && newMoveCount > prevMoveCount ? hero.abilities[newMoveCount - 1] : undefined;

    const moveInfo = newlyUnlockedAbility
      ? ` & Unlocked move: [${newlyUnlockedAbility.name}]! (${newMoveCount}/10 moves active)`
      : ` (${newMoveCount}/10 moves active)`;

    return {
      success: true,
      relic: recipe,
      newlyUnlockedAbility,
      message: `⚒️ FORGED RELIC: ${recipe.name}! ${recipe.statBonusText}${moveInfo}`,
    };
  }

  // Re-apply all crafted relics to hero (e.g. after load/new game) and ensure moves & AP are in sync
  public applyCraftedRelicsToHero(hero: Unit): void {
    if (!hero) return;

    // 1. Equip moves based on crafted relics count (starts with 3 weakest moves)
    if (hero.stats.elementalAffinity !== 'Admin') {
      const config = HERO_CLASSES[hero.stats.elementalAffinity] || HERO_CLASSES.Fire;
      const fullAbilities = config.abilities.slice(0, 10);
      const orderedAbilities = getOrderedWeakestAbilities(fullAbilities);
      const targetCount = this.getUnlockedMoveCount();
      const unlockedAbilities = orderedAbilities.slice(0, targetCount);

      // Preserve existing currentCooldowns if ability was already in hero kit
      hero.abilities = unlockedAbilities.map((targetAb) => {
        const existing = hero.abilities?.find((a) => a.id === targetAb.id);
        return {
          ...targetAb,
          currentCooldown: existing ? existing.currentCooldown : 0,
        };
      });
    }

    // 2. Track applied relics per hero instance to avoid double-applying stats
    const heroAny = hero as any;
    if (!heroAny._appliedRelics) {
      heroAny._appliedRelics = new Set<string>();
    }

    for (const recipe of this.recipes) {
      if (this.craftedRelicIds.has(recipe.id) && !heroAny._appliedRelics.has(recipe.id)) {
        recipe.crafted = true;
        recipe.effect(hero);
        heroAny._appliedRelics.add(recipe.id);
      }
    }
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  public serialize(): SerializedGardenState {
    return {
      plots: JSON.parse(JSON.stringify(this.plots)),
      inventory: JSON.parse(JSON.stringify(this.inventory)),
      craftedRelicIds: Array.from(this.craftedRelicIds),
      collectedRelicIds: Array.from(this.collectedRelicIds),
    };
  }

  public loadState(data?: SerializedGardenState): void {
    if (!data) return;

    if (Array.isArray(data.plots)) {
      this.plots = data.plots.map((p) => ({
        ...p,
        isWatered: typeof p.isWatered === 'boolean' ? p.isWatered : false,
        hasPlantFood: typeof p.hasPlantFood === 'boolean' ? p.hasPlantFood : false,
      }));
    }
    if (data.inventory) {
      this.inventory = {
        seeds: { ...this.inventory.seeds, ...data.inventory.seeds },
        crystals: { ...this.inventory.crystals, ...data.inventory.crystals },
        plantFood: typeof data.inventory.plantFood === 'number' ? data.inventory.plantFood : 3,
      };
    }
    if (Array.isArray(data.craftedRelicIds)) {
      this.craftedRelicIds = new Set(data.craftedRelicIds);
      for (const recipe of this.recipes) {
        if (this.craftedRelicIds.has(recipe.id)) {
          recipe.crafted = true;
        }
      }
    }
    if (Array.isArray(data.collectedRelicIds)) {
      this.collectedRelicIds = new Set(data.collectedRelicIds);
    }
  }
}
