// Elemental Mayhem - Crystal Garden, Shop & Relic Forge UI Manager
import { CrystalType, Unit, RelicCraftingRecipe } from '../types';
import { CrystalGardenManager, CRYSTAL_CONFIGS } from '../engine/CrystalManager';
import { SoundEngine } from '../audio/SoundEngine';

export interface CrystalGardenUIContext {
  getEssence: () => number;
  deductEssence: (amount: number) => boolean;
  addEssence: (amount: number) => void;
  getHero?: () => Unit | null;
}

export class CrystalGardenUI {
  private manager: CrystalGardenManager;
  private soundEngine: SoundEngine;
  private context: CrystalGardenUIContext;

  private modalEl: HTMLElement | null = null;
  private seedSelectorModalEl: HTMLElement | null = null;
  private selectedPlotIdForPlanting: number | null = null;
  private activeTab: 'plots' | 'forge' | 'shop' = 'plots';

  public onStateChanged?: () => void;

  public getSelectedPlotId(): number | null {
    return this.selectedPlotIdForPlanting;
  }

  constructor(manager: CrystalGardenManager, soundEngine: SoundEngine, context: CrystalGardenUIContext) {
    this.manager = manager;
    this.soundEngine = soundEngine;
    this.context = context;

    this.initDOM();
  }

  private initDOM(): void {
    if (typeof document === 'undefined') return;

    this.modalEl = document.getElementById('crystal-garden-modal');
    this.seedSelectorModalEl = document.getElementById('garden-seed-selector-modal');

    // Close buttons
    document.getElementById('close-garden-modal-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.close();
    });

    document.getElementById('close-seed-selector-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.closeSeedSelector();
    });

    // Tab buttons
    document.getElementById('garden-tab-garden-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.switchTab('plots');
    });

    document.getElementById('garden-tab-forge-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.switchTab('forge');
    });

    document.getElementById('garden-tab-shop-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.switchTab('shop');
    });
  }

  public open(tab: 'plots' | 'forge' | 'shop' = 'plots'): void {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('hidden');
    this.switchTab(tab);
    this.render();
  }

  public close(): void {
    if (!this.modalEl) return;
    this.modalEl.classList.add('hidden');
    this.closeSeedSelector();
  }

  public isOpen(): boolean {
    return !!this.modalEl && !this.modalEl.classList.contains('hidden');
  }

  public switchTab(tab: 'plots' | 'forge' | 'shop'): void {
    this.activeTab = tab;

    // Update tab button classes
    const tabPlotsBtn = document.getElementById('garden-tab-garden-btn');
    const tabForgeBtn = document.getElementById('garden-tab-forge-btn');
    const tabShopBtn = document.getElementById('garden-tab-shop-btn');

    tabPlotsBtn?.classList.toggle('active', tab === 'plots');
    tabForgeBtn?.classList.toggle('active', tab === 'forge');
    tabShopBtn?.classList.toggle('active', tab === 'shop');

    // Toggle views
    const viewPlots = document.getElementById('garden-view-plots');
    const viewForge = document.getElementById('garden-view-forge');
    const viewShop = document.getElementById('garden-view-shop');

    viewPlots?.classList.toggle('hidden', tab !== 'plots');
    viewPlots?.classList.toggle('active', tab === 'plots');

    viewForge?.classList.toggle('hidden', tab !== 'forge');
    viewForge?.classList.toggle('active', tab === 'forge');

    viewShop?.classList.toggle('hidden', tab !== 'shop');
    viewShop?.classList.toggle('active', tab === 'shop');

    this.render();
  }

  public render(): void {
    if (typeof document === 'undefined') return;
    if (!this.isOpen()) return;

    // 1. Update Essence, Elixir, and Plant Food counters
    const essenceEl = document.getElementById('garden-essence-counter');
    if (essenceEl) essenceEl.textContent = this.context.getEssence().toString();

    const elixirEl = document.getElementById('garden-elixir-counter');
    if (elixirEl) elixirEl.textContent = this.manager.getGrowthElixirCount().toString();

    const plantFoodEl = document.getElementById('garden-plant-food-counter');
    if (plantFoodEl) plantFoodEl.textContent = this.manager.getPlantFoodCount().toString();

    // 2. Render active tab
    if (this.activeTab === 'plots') {
      this.renderInventoryChips();
      this.renderGardenPlots();
    } else if (this.activeTab === 'forge') {
      this.renderRelicForge();
    } else if (this.activeTab === 'shop') {
      this.renderShop();
    }
  }

  private renderInventoryChips(): void {
    const container = document.getElementById('garden-inventory-chips');
    if (!container) return;

    const inventory = this.manager.getInventory();
    const chips: string[] = [];

    // Seeds
    (Object.entries(inventory.seeds) as [CrystalType, number][]).forEach(([type, count]) => {
      if (count > 0) {
        const cfg = CRYSTAL_CONFIGS[type];
        chips.push(`
          <div class="garden-chip chip-seed" style="border-color: ${cfg.color};">
            <span>${cfg.seedIcon}</span>
            <span>${type} Seed: <strong>x${count}</strong></span>
          </div>
        `);
      }
    });

    // Crystals
    (Object.entries(inventory.crystals) as [CrystalType, number][]).forEach(([type, count]) => {
      if (count > 0) {
        const cfg = CRYSTAL_CONFIGS[type];
        chips.push(`
          <div class="garden-chip chip-crystal" style="border-color: ${cfg.color}; background: rgba(255,255,255,0.05);">
            <span>${cfg.icon}</span>
            <span style="color: ${cfg.color}; font-weight: 700;">${cfg.name}: <strong>x${count}</strong></span>
          </div>
        `);
      }
    });

    // Plant Food
    const plantFood = this.manager.getPlantFoodCount();
    if (plantFood > 0) {
      chips.push(`
        <div class="garden-chip chip-plant-food" style="border-color: #a855f7;">
          <span>🌱🧪</span>
          <span style="color: #c084fc; font-weight: 700;">Plant Food: <strong>x${plantFood}</strong></span>
        </div>
      `);
    }

    // Elixirs
    const elixirs = this.manager.getGrowthElixirCount();
    if (elixirs > 0) {
      chips.push(`
        <div class="garden-chip chip-elixir" style="border-color: #38bdf8;">
          <span>🧪</span>
          <span style="color: #7dd3fc; font-weight: 700;">Growth Elixir: <strong>x${elixirs}</strong></span>
        </div>
      `);
    }

    if (chips.length === 0) {
      container.innerHTML = `<span class="empty-inventory-note">Seed and crystal satchel is currently empty. Visit the Crystal Shop to get seeds!</span>`;
    } else {
      container.innerHTML = chips.join('');
    }
  }

  private renderGardenPlots(): void {
    const container = document.getElementById('garden-plots-grid');
    if (!container) return;

    container.innerHTML = '';
    const plots = this.manager.getPlots();
    const essence = this.context.getEssence();
    const elixirs = this.manager.getGrowthElixirCount();
    const plantFoodCount = this.manager.getPlantFoodCount();

    plots.forEach((plot) => {
      const card = document.createElement('div');
      card.className = `garden-plot-card ${plot.unlocked ? 'unlocked' : 'locked'}`;

      if (!plot.unlocked) {
        const costBySlot: Record<number, number> = { 4: 50, 5: 100, 6: 150 };
        const unlockCost = costBySlot[plot.id] || 75;
        const canUnlock = essence >= unlockCost;
        card.innerHTML = `
          <div class="plot-header">
            <span class="plot-number">PLOT #${plot.id}</span>
            <span class="plot-status-badge badge-locked">🔒 LOCKED</span>
          </div>
          <div class="plot-body plot-body-locked">
            <div class="plot-locked-icon">🔒</div>
            <p class="plot-locked-desc">Expand your garden capacity to cultivate more elemental crystals.</p>
            <div class="plot-cost-tag">Cost: 🔮 <strong>${unlockCost}</strong> Essence</div>
            <button class="btn-primary plot-action-btn btn-unlock-plot" ${!canUnlock ? 'disabled' : ''}>
              ${canUnlock ? `Unlock Plot 🔮` : `Need ${unlockCost} Essence`}
            </button>
          </div>
        `;

        card.querySelector('.btn-unlock-plot')?.addEventListener('click', () => {
          const res = this.manager.unlockPlot(plot.id, this.context.getEssence());
          if (res.success) {
            this.context.deductEssence(res.essenceCost);
            this.soundEngine.playUnlock();
            this.notifyStateChanged();
          }
        });
      } else if (!plot.seedType || plot.stage === 'Empty') {
        // Unlocked and Empty
        card.innerHTML = `
          <div class="plot-header">
            <span class="plot-number">PLOT #${plot.id}</span>
            <span class="plot-status-badge badge-empty">🌱 EMPTY SOIL</span>
          </div>
          <div class="plot-body plot-body-empty">
            <div class="plot-soil-mound">
              <span class="plot-soil-icon">🪴</span>
            </div>
            <p class="plot-empty-desc">Rich fertile soil waiting for an elemental seed.</p>
            <button class="btn-primary plot-action-btn btn-plant-seed">
              Plant Seed 🌱
            </button>
          </div>
        `;

        card.querySelector('.btn-plant-seed')?.addEventListener('click', () => {
          this.soundEngine.playClick();
          this.openSeedSelector(plot.id);
        });
      } else {
        // Planted plot
        const cfg = CRYSTAL_CONFIGS[plot.seedType];
        const isMature = plot.stage === 'Mature';
        const progressPct = Math.min(100, plot.growthProgress);

        let stageBadge = '🌱 Seedling';
        let stageClass = 'badge-seed';
        let visualIcon = cfg.seedIcon;

        if (plot.stage === 'Sprout') {
          stageBadge = '🌿 Sprouting';
          stageClass = 'badge-sprout';
          visualIcon = '🌿';
        } else if (plot.stage === 'Mature') {
          stageBadge = '💎 READY TO HARVEST';
          stageClass = 'badge-mature';
          visualIcon = cfg.icon;
        }

        card.innerHTML = `
          <div class="plot-header">
            <span class="plot-number">PLOT #${plot.id}</span>
            <span class="plot-status-badge ${stageClass}">${stageBadge}</span>
          </div>
          <div class="plot-body plot-body-growing" style="border-top: 2px solid ${cfg.color};">
            <div class="crystal-stage-display ${isMature ? 'crystal-mature-pulse' : ''}">
              <span class="crystal-stage-icon" style="text-shadow: 0 0 16px ${cfg.color};">${visualIcon}</span>
              <span class="crystal-stage-name" style="color: ${cfg.color};">${cfg.name}</span>
            </div>

            ${
              !isMature
                ? `
                <div class="plot-care-status-row">
                  <span class="plot-care-badge ${plot.isWatered ? 'care-watered' : 'care-parched'}">
                    ${plot.isWatered ? '💧 Watered' : '⚠️ Needs Water'}
                  </span>
                  <span class="plot-care-badge ${plot.hasPlantFood ? 'care-nourished' : 'care-hungry'}">
                    ${plot.hasPlantFood ? '✨ Nourished (+2)' : '🌱🧪 Needs Food'}
                  </span>
                </div>
                `
                : `
                <div class="plot-care-status-row">
                  <span class="plot-care-badge care-nourished">💎 Yield: ${plot.yieldCount} crystals</span>
                </div>
                `
            }

            <div class="growth-progress-box">
              <div class="growth-progress-labels">
                <span>Rounds Remaining: ${plot.roundsRemaining}</span>
                <span>${progressPct}%</span>
              </div>
              <div class="growth-progress-track">
                <div class="growth-progress-fill" style="width: ${progressPct}%; background: ${cfg.color};"></div>
              </div>
            </div>

            <div class="plot-actions-row">
              ${
                isMature
                  ? `<button class="btn-primary plot-action-btn btn-harvest" style="background: linear-gradient(135deg, ${cfg.color}, #f59e0b); font-weight: 800;">
                      Harvest 💎
                    </button>`
                  : `
                    <button class="btn-secondary plot-action-btn btn-water-plot" ${plot.isWatered ? 'disabled' : ''} style="${plot.isWatered ? 'opacity: 0.6;' : 'background: rgba(56, 189, 248, 0.2); border-color: #38bdf8; color: #38bdf8; font-weight: 700;'}" title="${plot.isWatered ? 'Plot is already watered for this round' : 'Water this plot to allow growth next round'}">
                      💧 ${plot.isWatered ? 'Watered' : 'Water'}
                    </button>
                    <button class="btn-secondary plot-action-btn btn-feed-food" ${plot.hasPlantFood || plantFoodCount <= 0 ? 'disabled' : ''} style="${plot.hasPlantFood ? 'opacity: 0.6;' : 'background: rgba(168, 85, 247, 0.2); border-color: #a855f7; color: #c084fc; font-weight: 700;'}" title="${plot.hasPlantFood ? 'Plot is nourished (+2 harvest crystals)' : (plantFoodCount > 0 ? 'Nourish with Elemental Plant Food (+2 harvest yield)' : 'No plant food in satchel (Buy in Shop)')}">
                      🌱🧪 ${plot.hasPlantFood ? 'Fed' : `Feed (${plantFoodCount})`}
                    </button>
                    <button class="btn-secondary plot-action-btn btn-use-elixir" ${elixirs <= 0 ? 'disabled' : ''} title="${elixirs > 0 ? 'Instantly mature with Growth Elixir' : 'No Elixirs in bag (Buy in Shop)'}">
                      🧪 (${elixirs})
                    </button>
                  `
              }
            </div>
          </div>
        `;

        if (isMature) {
          card.querySelector('.btn-harvest')?.addEventListener('click', () => {
            const res = this.manager.harvestPlot(plot.id);
            if (res.success) {
              this.soundEngine.playUnlock();
              this.notifyStateChanged();
            }
          });
        } else {
          card.querySelector('.btn-water-plot')?.addEventListener('click', () => {
            const res = this.manager.waterPlot(plot.id);
            if (res.success) {
              this.soundEngine.playSpellCast('Water');
              this.notifyStateChanged();
            }
          });

          card.querySelector('.btn-feed-food')?.addEventListener('click', () => {
            const res = this.manager.feedPlantFood(plot.id);
            if (res.success) {
              this.soundEngine.playMagicSurge();
              this.notifyStateChanged();
            }
          });

          card.querySelector('.btn-use-elixir')?.addEventListener('click', () => {
            const res = this.manager.applyGrowthElixir(plot.id);
            if (res.success) {
              this.soundEngine.playMagicSurge();
              this.notifyStateChanged();
            }
          });
        }
      }

      container.appendChild(card);
    });
  }

  private openSeedSelector(plotId: number): void {
    this.selectedPlotIdForPlanting = plotId;
    if (!this.seedSelectorModalEl) return;

    const list = document.getElementById('seed-selector-list');
    const title = document.getElementById('seed-selector-title');
    if (title) title.textContent = `🌱 Choose a Seed for Plot #${plotId}`;

    if (list) {
      list.innerHTML = '';
      const inventory = this.manager.getInventory();
      let hasAnySeeds = false;

      (Object.keys(inventory.seeds) as CrystalType[]).forEach((type) => {
        const count = inventory.seeds[type] || 0;
        if (count > 0) {
          hasAnySeeds = true;
          const cfg = CRYSTAL_CONFIGS[type];
          const item = document.createElement('div');
          item.className = 'seed-selector-item glass-card';
          item.style.borderColor = cfg.color;
          item.innerHTML = `
            <div class="seed-item-left">
              <span class="seed-item-icon">${cfg.seedIcon}</span>
              <div>
                <div class="seed-item-name" style="color: ${cfg.color}; font-weight: 700;">${type} Seed (${cfg.name})</div>
                <div class="seed-item-meta" style="font-size: 0.8rem; color: #94a3b8;">Growth Time: ${cfg.growthRounds} rounds • ${cfg.description}</div>
              </div>
            </div>
            <div class="seed-item-right">
              <span class="seed-count-badge">x${count}</span>
              <button class="btn-primary seed-sow-btn" style="background: ${cfg.color};">Sow 🌱</button>
            </div>
          `;

          item.querySelector('.seed-sow-btn')?.addEventListener('click', () => {
            const res = this.manager.plantSeed(plotId, type);
            if (res.success) {
              this.soundEngine.playMagicSurge();
              this.closeSeedSelector();
              this.notifyStateChanged();
            }
          });

          list.appendChild(item);
        }
      });

      if (!hasAnySeeds) {
        list.innerHTML = `
          <div class="empty-seed-notice" style="text-align: center; padding: 24px;">
            <p style="font-size: 1.1rem; color: #fca5a5;">No seeds available in your inventory!</p>
            <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 16px;">Head over to the Crystal Shop tab to purchase seeds with Essence.</p>
            <button id="btn-goto-shop" class="btn-primary" style="padding: 8px 18px;">Go to Crystal Shop 💎</button>
          </div>
        `;
        document.getElementById('btn-goto-shop')?.addEventListener('click', () => {
          this.soundEngine.playClick();
          this.closeSeedSelector();
          this.switchTab('shop');
        });
      }
    }

    this.seedSelectorModalEl.classList.remove('hidden');
  }

  private closeSeedSelector(): void {
    if (!this.seedSelectorModalEl) return;
    this.seedSelectorModalEl.classList.add('hidden');
    this.selectedPlotIdForPlanting = null;
  }

  private renderRelicForge(): void {
    const container = document.getElementById('garden-recipes-grid');
    if (!container) return;

    container.innerHTML = '';
    const recipes = this.manager.getRecipes();
    const inventory = this.manager.getInventory();
    const hero = this.context.getHero ? this.context.getHero() : null;
    const unlockedMoves = this.manager.getUnlockedMoveCount();
    const heroMoves = hero?.abilities ? hero.abilities.length : unlockedMoves;
    const heroAp = hero?.stats ? hero.stats.maxAp : 30 + (this.manager.getCraftedRelicIds().length > 0 ? 1 : 0);

    // Moves & AP Empowerment Banner
    const banner = document.createElement('div');
    banner.className = 'relic-moves-status-banner glass-card';
    banner.innerHTML = `
      <div class="moves-banner-left">
        <span class="moves-banner-icon">⚡</span>
        <div>
          <div class="moves-banner-title">
            HERO SPELL KIT: <strong style="color: #38bdf8;">${heroMoves} / 10 Active Moves</strong> • MAX AP: <strong style="color: #fbbf24;">${heroAp} AP</strong>
          </div>
          <div class="moves-banner-desc">
            You start with 3 of the weakest moves. Each forged relic increases your AP and unlocks the next powerful spell in your kit!
          </div>
        </div>
      </div>
      <div class="moves-banner-right">
        <span class="moves-count-badge ${heroMoves === 10 ? 'all-unlocked' : ''}">
          ${heroMoves === 10 ? '👑 ALL 10 MOVES UNLOCKED' : `+${10 - heroMoves} MORE LOCKED`}
        </span>
      </div>
    `;
    container.appendChild(banner);

    recipes.forEach((recipe: RelicCraftingRecipe) => {
      const card = document.createElement('div');
      const isCrafted = this.manager.isRelicCrafted(recipe.id);
      const canCraft = !isCrafted && this.manager.canCraftRecipe(recipe.id);

      card.className = `relic-recipe-card ${isCrafted ? 'crafted' : canCraft ? 'ready' : 'missing'}`;

      // Build requirement badges
      const costHtml = Object.entries(recipe.requiredCrystals)
        .map(([typeStr, required]) => {
          const type = typeStr as CrystalType;
          const cfg = CRYSTAL_CONFIGS[type];
          const owned = inventory.crystals[type] || 0;
          const reqCount = typeof required === 'number' ? required : 0;
          const met = owned >= reqCount;
          return `
            <div class="recipe-cost-badge ${met ? 'met' : 'unmet'}" style="border-color: ${cfg.color};">
              <span>${cfg.icon}</span>
              <span>${cfg.name}: <strong>${owned}/${reqCount}</strong></span>
            </div>
          `;
        })
        .join('');

      card.innerHTML = `
        <div class="relic-card-header">
          <div class="relic-icon-wrapper">
            <span class="relic-icon">${recipe.icon}</span>
          </div>
          <div class="relic-header-text">
            <h4 class="relic-name">${recipe.name}</h4>
            <span class="relic-tier-badge">PERMANENT PASSIVE RELIC</span>
          </div>
          <div class="relic-status-badge ${isCrafted ? 'badge-crafted' : canCraft ? 'badge-ready' : 'badge-unmet'}">
            ${isCrafted ? '✅ FORGED' : canCraft ? '⚡ READY' : '🔒 MISSING GEMS'}
          </div>
        </div>

        <p class="relic-desc">${recipe.description}</p>

        <div class="relic-stat-bonus-box">
          <span class="bonus-label">Stat Empowerments:</span>
          <span class="bonus-value">${recipe.statBonusText}</span>
        </div>

        <div class="relic-materials-box">
          <span class="materials-label">Required Elemental Crystals:</span>
          <div class="relic-materials-row">
            ${costHtml}
          </div>
        </div>

        <div class="relic-action-row">
          ${
            isCrafted
              ? `<button class="btn-secondary relic-forge-btn" disabled>Already Forged ✨</button>`
              : `<button class="btn-primary relic-forge-btn btn-forge-action" ${!canCraft ? 'disabled' : ''}>
                  Forge Relic ⚡
                </button>`
          }
        </div>
      `;

      if (canCraft) {
        card.querySelector('.btn-forge-action')?.addEventListener('click', () => {
          const res = this.manager.craftRelic(recipe.id, hero || undefined);
          if (res.success) {
            this.soundEngine.playLevelUp();
            this.notifyStateChanged();
          }
        });
      }

      container.appendChild(card);
    });
  }

  private renderShop(): void {
    const essence = this.context.getEssence();
    const inventory = this.manager.getInventory();

    // 1. Seeds Grid
    const seedsContainer = document.getElementById('shop-seeds-grid');
    if (seedsContainer) {
      seedsContainer.innerHTML = '';
      (Object.keys(CRYSTAL_CONFIGS) as CrystalType[]).forEach((type) => {
        const cfg = CRYSTAL_CONFIGS[type];
        const card = document.createElement('div');
        const canAfford = essence >= cfg.seedCostEssence;
        card.className = 'shop-item-card glass-card';
        card.style.borderColor = cfg.color;
        card.innerHTML = `
          <div class="shop-card-top">
            <span class="shop-item-icon" style="text-shadow: 0 0 12px ${cfg.color};">${cfg.seedIcon}</span>
            <div class="shop-item-title-group">
              <h5 class="shop-item-title" style="color: ${cfg.color};">${cfg.name} Seed</h5>
              <span class="shop-item-rounds">Grows in ${cfg.growthRounds} rounds</span>
            </div>
          </div>
          <p class="shop-item-desc">${cfg.description}</p>
          <div class="shop-card-bottom">
            <div class="shop-price-tag">🔮 <strong>${cfg.seedCostEssence}</strong> Essence</div>
            <button class="btn-primary shop-buy-btn btn-buy-seed" ${!canAfford ? 'disabled' : ''}>
              ${canAfford ? 'Buy Seed 🌱' : 'Need Essence'}
            </button>
          </div>
        `;

        card.querySelector('.btn-buy-seed')?.addEventListener('click', () => {
          const res = this.manager.buySeed(type, 1, this.context.getEssence());
          if (res.success) {
            this.context.deductEssence(res.totalCost);
            this.soundEngine.playUnlock();
            this.notifyStateChanged();
          }
        });

        seedsContainer.appendChild(card);
      });
    }

    // 2. Alchemical Supplies & Garden Expansion
    const suppliesContainer = document.getElementById('shop-supplies-grid');
    if (suppliesContainer) {
      suppliesContainer.innerHTML = '';

      // Elemental Plant Food Card
      const foodCost = 10;
      const canAffordFood = essence >= foodCost;
      const foodCard = document.createElement('div');
      foodCard.className = 'shop-item-card glass-card';
      foodCard.style.borderColor = '#a855f7';
      foodCard.innerHTML = `
        <div class="shop-card-top">
          <span class="shop-item-icon">🌱🧪</span>
          <div class="shop-item-title-group">
            <h5 class="shop-item-title" style="color: #c084fc;">Elemental Plant Food</h5>
            <span class="shop-item-rounds">Vital Nutrient</span>
          </div>
        </div>
        <p class="shop-item-desc">Vital elemental nutrient blend. Feed to a growing crop to enable growth progression and grant +2 bonus crystal harvest yield!</p>
        <div class="shop-card-bottom">
          <div class="shop-price-tag">🔮 <strong>${foodCost}</strong> Essence</div>
          <button class="btn-primary shop-buy-btn btn-buy-food" ${!canAffordFood ? 'disabled' : ''}>
            ${canAffordFood ? 'Buy Food 🌱' : 'Need Essence'}
          </button>
        </div>
      `;
      foodCard.querySelector('.btn-buy-food')?.addEventListener('click', () => {
        const res = this.manager.buyPlantFood(1, this.context.getEssence());
        if (res.success) {
          this.context.deductEssence(res.totalCost);
          this.soundEngine.playMagicSurge();
          this.notifyStateChanged();
        }
      });
      suppliesContainer.appendChild(foodCard);

      // Growth Elixir Card
      const elixirCost = 35;
      const canAffordElixir = essence >= elixirCost;
      const elixirCard = document.createElement('div');
      elixirCard.className = 'shop-item-card glass-card';
      elixirCard.style.borderColor = '#38bdf8';
      elixirCard.innerHTML = `
        <div class="shop-card-top">
          <span class="shop-item-icon">🧪</span>
          <div class="shop-item-title-group">
            <h5 class="shop-item-title" style="color: #38bdf8;">Growth Elixir</h5>
            <span class="shop-item-rounds">Instant Catalyst</span>
          </div>
        </div>
        <p class="shop-item-desc">Miracle alchemical tonic that instantly advances any planted crystal plot directly to full maturity!</p>
        <div class="shop-card-bottom">
          <div class="shop-price-tag">🔮 <strong>${elixirCost}</strong> Essence</div>
          <button class="btn-primary shop-buy-btn btn-buy-elixir" ${!canAffordElixir ? 'disabled' : ''}>
            ${canAffordElixir ? 'Buy Elixir 🧪' : 'Need Essence'}
          </button>
        </div>
      `;
      elixirCard.querySelector('.btn-buy-elixir')?.addEventListener('click', () => {
        const res = this.manager.buyGrowthElixir(this.context.getEssence());
        if (res.success) {
          this.context.deductEssence(res.cost);
          this.soundEngine.playMagicSurge();
          this.notifyStateChanged();
        }
      });
      suppliesContainer.appendChild(elixirCard);

      // Plot Expansion Card
      const nextLockedPlot = this.manager.getPlots().find((p) => !p.unlocked);
      if (nextLockedPlot) {
        const costBySlot: Record<number, number> = { 4: 50, 5: 100, 6: 150 };
        const unlockCost = costBySlot[nextLockedPlot.id] || 75;
        const canUnlock = essence >= unlockCost;
        const expansionCard = document.createElement('div');
        expansionCard.className = 'shop-item-card glass-card';
        expansionCard.style.borderColor = '#4ade80';
        expansionCard.innerHTML = `
          <div class="shop-card-top">
            <span class="shop-item-icon">🪴</span>
            <div class="shop-item-title-group">
              <h5 class="shop-item-title" style="color: #4ade80;">Unlock Plot #${nextLockedPlot.id}</h5>
              <span class="shop-item-rounds">Permanent Expansion</span>
            </div>
          </div>
          <p class="shop-item-desc">Unlock another fertile plot in the Crystal Garden to sow and grow simultaneous elemental crystals.</p>
          <div class="shop-card-bottom">
            <div class="shop-price-tag">🔮 <strong>${unlockCost}</strong> Essence</div>
            <button class="btn-primary shop-buy-btn btn-unlock-expansion" ${!canUnlock ? 'disabled' : ''}>
              ${canUnlock ? `Unlock Plot 🪴` : 'Need Essence'}
            </button>
          </div>
        `;
        expansionCard.querySelector('.btn-unlock-expansion')?.addEventListener('click', () => {
          const res = this.manager.unlockPlot(nextLockedPlot.id, this.context.getEssence());
          if (res.success) {
            this.context.deductEssence(res.essenceCost);
            this.soundEngine.playUnlock();
            this.notifyStateChanged();
          }
        });
        suppliesContainer.appendChild(expansionCard);
      }
    }

    // 3. Gem Exchange (Sell crystals)
    const sellContainer = document.getElementById('shop-sell-grid');
    if (sellContainer) {
      sellContainer.innerHTML = '';
      (Object.keys(CRYSTAL_CONFIGS) as CrystalType[]).forEach((type) => {
        const cfg = CRYSTAL_CONFIGS[type];
        const owned = inventory.crystals[type] || 0;
        const card = document.createElement('div');
        card.className = 'shop-item-card glass-card';
        card.style.borderColor = cfg.color;
        card.innerHTML = `
          <div class="shop-card-top">
            <span class="shop-item-icon" style="text-shadow: 0 0 12px ${cfg.color};">${cfg.icon}</span>
            <div class="shop-item-title-group">
              <h5 class="shop-item-title" style="color: ${cfg.color};">${cfg.name}</h5>
              <span class="shop-item-rounds">Owned in Satchel: x${owned}</span>
            </div>
          </div>
          <p class="shop-item-desc">Exchange a harvested ${cfg.gemName} for raw magical Essence.</p>
          <div class="shop-card-bottom">
            <div class="shop-price-tag" style="color: #34d399;">+🔮 <strong>${cfg.sellValueEssence}</strong> Essence</div>
            <button class="btn-primary shop-buy-btn btn-sell-gem" ${owned <= 0 ? 'disabled' : ''} style="background: rgba(16, 185, 129, 0.2); border-color: #34d399; color: #6ee7b7;">
              ${owned > 0 ? 'Sell 1 Gem 💰' : 'None to Sell'}
            </button>
          </div>
        `;

        card.querySelector('.btn-sell-gem')?.addEventListener('click', () => {
          const res = this.manager.sellCrystal(type, 1);
          if (res.success) {
            this.context.addEssence(res.earnedEssence);
            this.soundEngine.playUnlock();
            this.notifyStateChanged();
          }
        });

        sellContainer.appendChild(card);
      });
    }
  }

  private notifyStateChanged(): void {
    this.render();
    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }
}
