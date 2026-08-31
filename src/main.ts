// Elemental Mayhem - Main Application Controller (Smooth Animated Execution)
import './style.css';
import { Grid } from './engine/Grid';
import { TileHazardManager } from './engine/TileHazardManager';
import { CombatEngine } from './engine/CombatEngine';
import { TurnManager } from './engine/TurnManager';
import { EnemyAI } from './engine/EnemyAI';
import { PerformanceScorer } from './engine/PerformanceScorer';
import { UpgradeManager } from './engine/UpgradeManager';
import { EscalationManager } from './engine/EscalationManager';
import { UnlockManager } from './engine/UnlockManager';
import { BattlefieldRenderer } from './renderer/BattlefieldRenderer';
import { HUDManager } from './ui/HUDManager';
import { Unit, Ability, GridCoord, PassiveRelic, ElementType } from './types';
import { CORE_ELEMENTS } from './constants/elements';
import { HERO_CLASSES, createHeroForElement } from './constants/classes';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class GameController {
  private grid: Grid;
  private hazardManager: TileHazardManager;
  private turnManager: TurnManager;
  private combatEngine: CombatEngine;
  private enemyAI: EnemyAI;
  private scorer: PerformanceScorer;
  private upgradeManager: UpgradeManager;
  private escalationManager: EscalationManager;
  private unlockManager: UnlockManager;
  private renderer: BattlefieldRenderer;
  private hud: HUDManager;

  private selectedElement: ElementType = 'Fire';
  private selectedClassCategory: string = 'All';
  private hero: Unit;
  private enemies: Unit[];
  private currentRound: number = 1;
  private maxRounds: number = 15;
  private totalEssence: number = 0;
  private totalXp: number = 0;

  private selectedAbility: Ability | null = null;
  private hoveredCoord: GridCoord | null = null;
  private reachableTiles: GridCoord[] = [];
  private targetableTiles: GridCoord[] = [];

  private isBusy: boolean = false;
  private focusedUnitId: string | null = null;
  private lastFrameTime: number = performance.now();

  // Modals
  private characterSelectModal: HTMLElement;
  private classSelectContainer: HTMLElement;
  private changeElementBtn: HTMLElement;
  private upgradeModal: HTMLElement;
  private upgradeChoicesContainer: HTMLElement;
  private proceedNextRoundBtn: HTMLElement;
  private modalEssence: HTMLElement;
  private modalXp: HTMLElement;
  private gameOverModal: HTMLElement;
  private outcomeTitle: HTMLElement;
  private outcomeSubtitle: HTMLElement;
  private outcomeStatsList: HTMLElement;
  private restartGameBtn: HTMLElement;

  constructor() {
    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.turnManager = new TurnManager();
    this.scorer = new PerformanceScorer();
    this.upgradeManager = new UpgradeManager();
    this.escalationManager = new EscalationManager();
    this.unlockManager = new UnlockManager();

    this.characterSelectModal = document.getElementById('character-select-modal')!;
    this.classSelectContainer = document.getElementById('class-select-container')!;
    this.changeElementBtn = document.getElementById('change-element-btn')!;
    this.upgradeModal = document.getElementById('upgrade-modal')!;
    this.upgradeChoicesContainer = document.getElementById('upgrade-choices-container')!;
    this.proceedNextRoundBtn = document.getElementById('proceed-next-round-btn')!;
    this.modalEssence = document.getElementById('modal-essence')!;
    this.modalXp = document.getElementById('modal-xp')!;
    this.gameOverModal = document.getElementById('game-over-modal')!;
    this.outcomeTitle = document.getElementById('outcome-title')!;
    this.outcomeSubtitle = document.getElementById('outcome-subtitle')!;
    this.outcomeStatsList = document.getElementById('outcome-stats-list')!;
    this.restartGameBtn = document.getElementById('restart-game-btn')!;

    this.hero = this.createHero(this.selectedElement);
    this.enemies = this.escalationManager.generateRoundEnemies(1);

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.enemyAI = new EnemyAI(this.combatEngine);
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.hud = new HUDManager();

    this.setupCategoryTabs();
    this.renderCharacterSelectModal();
    this.setupObstacles();
    this.setupEventListeners(canvas);
    this.updateReachableTiles();
    this.updateHUD();

    // Start Game Loop
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private setupCategoryTabs(): void {
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        tabs.forEach((t) => t.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        this.selectedClassCategory = target.getAttribute('data-category') || 'All';
        this.renderCharacterSelectModal();
      });
    });
  }

  private createHero(element: ElementType = this.selectedElement): Unit {
    return createHeroForElement(element);
  }

  private renderCharacterSelectModal(): void {
    const allElements = Object.keys(HERO_CLASSES) as ElementType[];
    const filteredElements = allElements.filter((elem) => {
      if (elem === 'Neutral') return false;
      if (this.selectedClassCategory === 'All') return true;
      const config = HERO_CLASSES[elem];
      return config && config.category === this.selectedClassCategory;
    });

    this.classSelectContainer.innerHTML = '';

    filteredElements.forEach((elem) => {
      const config = HERO_CLASSES[elem];
      if (!config) return;
      const elemData = CORE_ELEMENTS[elem] || CORE_ELEMENTS.Fire;
      const isUnlocked = this.unlockManager.isElementUnlocked(elem);
      const card = document.createElement('div');
      card.className = `class-card ${isUnlocked ? '' : 'locked'}`;
      card.style.setProperty('--card-color', elemData.color);
      card.style.setProperty('--card-glow', elemData.glowColor);

      const abilityRows = config.abilities.map((ab) => `
        <div class="class-ability-row">
          <span class="class-ability-name">${ab.icon} ${ab.name}</span>
          <span class="class-ability-meta">${ab.apCost} AP | ${ab.baseDamage} DMG</span>
        </div>
      `).join('');

      const badgeHtml = isUnlocked
        ? `<span class="element-badge" style="background:${elemData.glowColor}; color:${elemData.color}; width:fit-content;">${elem}</span>`
        : `<span class="lock-badge">🔒 Locked</span>`;

      const actionHtml = isUnlocked
        ? `<button class="class-select-btn">Choose ${config.className}</button>`
        : `<div class="unlock-requirement-box">🔒 ${config.unlockRequirement || 'Defeat Boss to Unlock'}</div>`;

      card.innerHTML = `
        <div class="class-card-header">
          <span class="class-avatar">${config.avatar}</span>
          <div class="class-info">
            <div class="class-name">${config.className}</div>
            ${badgeHtml}
          </div>
        </div>
        <div class="class-tagline">${config.tagline}</div>
        <div class="class-abilities-title">Dedicated Spells:</div>
        <div class="class-ability-list">
          ${abilityRows}
        </div>
        ${actionHtml}
      `;

      if (isUnlocked) {
        card.onclick = () => {
          this.startGauntletWithElement(elem);
        };
      }

      this.classSelectContainer.appendChild(card);
    });
  }

  private startGauntletWithElement(element: ElementType): void {
    this.selectedElement = element;
    this.characterSelectModal.classList.add('hidden');
    this.restartGame(element);
    this.combatEngine.addLog(
      'system',
      `✨ Chosen Path: You enter the arena as the ${HERO_CLASSES[element].className} (${element})!`
    );
  }

  private setupObstacles(): void {
    const obstacleCoords = [
      { x: 3, y: 3 },
      { x: 3, y: 6 },
      { x: 6, y: 3 },
      { x: 6, y: 6 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];
    obstacleCoords.forEach((c) => this.grid.setObstacle(c, true));
  }

  private setupEventListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousemove', (e) => {
      if (this.isBusy) return;
      const gridCoord = this.renderer.screenToGrid(e.clientX, e.clientY);
      this.hoveredCoord = gridCoord;
      if (gridCoord) {
        const unit = this.combatEngine.getUnitAt(gridCoord);
        this.hud.inspectUnit(unit, gridCoord);
      }
    });

    canvas.addEventListener('click', async (e) => {
      if (this.isBusy || this.turnManager.getCurrentPhase() !== 'PLAYER_TURN') return;
      const gridCoord = this.renderer.screenToGrid(e.clientX, e.clientY);
      if (!gridCoord) return;

      if (this.selectedAbility) {
        await this.handlePlayerCast(this.selectedAbility, gridCoord);
      } else {
        await this.handlePlayerMove(gridCoord);
      }
    });

    document.getElementById('end-turn-btn')?.addEventListener('click', () => {
      if (!this.isBusy) {
        this.endPlayerTurn();
      }
    });

    this.proceedNextRoundBtn.addEventListener('click', () => {
      this.advanceToNextRound();
    });

    this.restartGameBtn.addEventListener('click', () => {
      this.restartGame(this.selectedElement);
    });

    this.changeElementBtn?.addEventListener('click', () => {
      this.gameOverModal.classList.add('hidden');
      this.renderCharacterSelectModal();
      this.characterSelectModal.classList.remove('hidden');
    });

    window.addEventListener('keydown', (e) => {
      if (this.isBusy) return;

      if (e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key) - 1;
        if (this.hero.abilities[idx]) {
          this.selectAbility(this.hero.abilities[idx]);
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.endPlayerTurn();
      } else if (e.key === 'Escape') {
        this.selectedAbility = null;
        this.targetableTiles = [];
        this.updateHUD();
      }
    });
  }

  private selectAbility(ability: Ability): void {
    if (this.isBusy || ability.apCost > this.hero.stats.currentAp || ability.currentCooldown > 0) return;

    if (this.selectedAbility?.id === ability.id) {
      this.selectedAbility = null;
      this.targetableTiles = [];
    } else {
      this.selectedAbility = ability;
      this.targetableTiles = this.grid.getReachableTiles(this.hero.coord, ability.range);
    }
    this.updateHUD();
  }

  private updateReachableTiles(): void {
    if (this.turnManager.getCurrentPhase() === 'PLAYER_TURN' && !this.isBusy) {
      const maxDist = Math.floor(this.hero.stats.currentAp / this.hero.stats.moveCostPerTile);
      this.reachableTiles = this.grid.getReachableTiles(this.hero.coord, maxDist);
    } else {
      this.reachableTiles = [];
    }
  }

  private async handlePlayerMove(destination: GridCoord): Promise<void> {
    const path = this.grid.findPath(this.hero.coord, destination);
    if (!path || path.length === 0) return;

    const apCost = path.length * this.hero.stats.moveCostPerTile;
    if (this.hero.stats.currentAp < apCost) return;

    this.isBusy = true;
    this.reachableTiles = [];
    this.targetableTiles = [];
    this.updateHUD();

    // Animate smooth movement
    const fullPath = [this.hero.coord, ...path];
    await new Promise<void>((resolve) => {
      this.renderer.animManager.animateMovement(this.hero.id, fullPath, 160, () => {
        this.combatEngine.moveUnit(this.hero, destination);
        resolve();
      });
    });

    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
    this.checkCombatState();
  }

  private async handlePlayerCast(ability: Ability, targetCoord: GridCoord): Promise<void> {
    const dist = this.grid.manhattanDistance(this.hero.coord, targetCoord);
    if (dist > ability.range || !this.grid.hasLineOfSight(this.hero.coord, targetCoord)) return;
    if (this.hero.stats.currentAp < ability.apCost || ability.currentCooldown > 0) return;

    this.isBusy = true;
    this.selectedAbility = null;
    this.targetableTiles = [];
    this.reachableTiles = [];
    this.updateHUD();

    const startPos = this.renderer.gridToScreen(this.hero.coord);
    const targetPos = this.renderer.gridToScreen(targetCoord);
    const elemData = CORE_ELEMENTS[ability.element];
    const color = elemData ? elemData.color : '#ffd000';

    // If beam/laser-type spell, also fire laser beam
    const isBeam = ability.name.toLowerCase().includes('beam') ||
      ability.name.toLowerCase().includes('ray') ||
      ability.name.toLowerCase().includes('lance') ||
      ability.name.toLowerCase().includes('flare');

    if (isBeam) {
      this.renderer.particleEngine.addBeam(startPos.x, startPos.y, targetPos.x, targetPos.y, color, 8, 320);
    }

    // Launch Projectile and await arrival
    await new Promise<void>((resolve) => {
      this.renderer.projManager.spawnProjectile(startPos, targetPos, ability.element, color, 260, () => {
        // Execute ability upon arrival
        const logCountBefore = this.combatEngine.logs.length;
        this.combatEngine.executeAbility(this.hero, ability, targetCoord);

        // Trigger spell impact with shockwave, particle burst & screen shake
        const isAoE = ability.aoeRadius > 0;
        this.renderer.triggerSpellImpact(targetCoord, ability.element, isAoE);

        // Check if a reaction was triggered
        const newLogs = this.combatEngine.logs.slice(logCountBefore);
        const reactionLog = newLogs.find((l) => l.type === 'reaction');

        this.renderer.particleEngine.addFloatingText(
          `-${ability.baseDamage}`,
          targetPos.x,
          targetPos.y - 15,
          color,
          22
        );

        if (reactionLog) {
          this.renderer.particleEngine.addFloatingText(
            reactionLog.message.split('!')[0] + '!',
            targetPos.x,
            targetPos.y - 38,
            '#fef08a',
            24
          );
        }

        resolve();
      });
    });

    await delay(250);

    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
    this.checkCombatState();
  }

  private async endPlayerTurn(): Promise<void> {
    if (this.turnManager.getCurrentPhase() !== 'PLAYER_TURN' || this.isBusy) return;

    this.isBusy = true;
    this.turnManager.endPlayerTurn();
    this.selectedAbility = null;
    this.targetableTiles = [];
    this.reachableTiles = [];
    this.hud.updatePhaseBanner('ENEMY TURN');
    this.updateHUD();

    await delay(350);

    // Sequential Enemy AI Turns
    this.turnManager.startEnemyTurn(this.enemies);

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      this.focusedUnitId = enemy.id;
      this.hud.updatePhaseBanner(`ENEMY: ${enemy.name.toUpperCase()}`);
      await delay(350);

      const steps = this.enemyAI.planTurnSteps(enemy, this.hero);

      for (const step of steps) {
        if (enemy.isDead || this.hero.isDead) break;

        if (step.type === 'move') {
          await new Promise<void>((resolve) => {
            this.renderer.animManager.animateMovement(enemy.id, step.path, 160, () => {
              this.combatEngine.moveUnit(enemy, step.destination);
              resolve();
            });
          });
          this.updateHUD();
          await delay(250);
        } else if (step.type === 'cast') {
          const startPos = this.renderer.gridToScreen(enemy.coord);
          const targetPos = this.renderer.gridToScreen(step.targetCoord);
          const elemData = CORE_ELEMENTS[step.ability.element];
          const color = elemData ? elemData.color : '#ef4444';

          const isBeam = step.ability.name.toLowerCase().includes('beam') ||
            step.ability.name.toLowerCase().includes('ray') ||
            step.ability.name.toLowerCase().includes('lance');

          if (isBeam) {
            this.renderer.particleEngine.addBeam(startPos.x, startPos.y, targetPos.x, targetPos.y, color, 8, 300);
          }

          await new Promise<void>((resolve) => {
            this.renderer.projManager.spawnProjectile(startPos, targetPos, step.ability.element, color, 260, () => {
              const logCountBefore = this.combatEngine.logs.length;
              this.combatEngine.executeAbility(enemy, step.ability, step.targetCoord);

              const isAoE = step.ability.aoeRadius > 0;
              this.renderer.triggerSpellImpact(step.targetCoord, step.ability.element, isAoE);

              const newLogs = this.combatEngine.logs.slice(logCountBefore);
              const reactionLog = newLogs.find((l) => l.type === 'reaction');

              this.renderer.particleEngine.addFloatingText(
                `-${step.ability.baseDamage}`,
                targetPos.x,
                targetPos.y - 15,
                color,
                22
              );

              if (reactionLog) {
                this.renderer.particleEngine.addFloatingText(
                  reactionLog.message.split('!')[0] + '!',
                  targetPos.x,
                  targetPos.y - 38,
                  '#f87171',
                  24
                );
              }

              resolve();
            });
          });

          this.updateHUD();
          await delay(350);
        }
      }

      this.focusedUnitId = null;
      await delay(250);
    }

    // Environment & Status Ticks
    this.hud.updatePhaseBanner('ENVIRONMENT TICK');
    this.hazardManager.tickHazards();
    this.combatEngine.statusManager.tickStatusEffects(this.hero);
    for (const enemy of this.enemies) {
      this.combatEngine.statusManager.tickStatusEffects(enemy);
    }
    await delay(300);

    // Return to Player Turn
    if (!this.hero.isDead && !this.combatEngine.areAllEnemiesDead()) {
      this.turnManager.startPlayerTurn([this.hero]);
      this.isBusy = false;
      this.updateReachableTiles();
      this.updateHUD();
    }

    this.checkCombatState();
  }

  private checkCombatState(): void {
    if (this.hero.isDead) {
      this.combatEngine.addLog('system', '💀 You have fallen in combat! Game Over.');
      this.turnManager.setPhase('GAME_OVER');
      this.showDefeatModal();
      return;
    }

    if (this.combatEngine.areAllEnemiesDead()) {
      if (this.currentRound >= this.maxRounds) {
        this.showVictoryModal();
      } else {
        this.openUpgradeModal();
      }
    }
  }

  private openUpgradeModal(): void {
    this.combatEngine.resetRoundState();
    const rewards = this.scorer.calculateRoundRewards(this.combatEngine.performance);
    this.totalEssence += rewards.essence;
    this.totalXp += rewards.xp;

    // Check if this was a Boss round and unlock elements
    if (this.currentRound % 5 === 0) {
      const newlyUnlocked = this.unlockManager.checkBossDefeatUnlocks(this.currentRound);
      if (newlyUnlocked.length > 0) {
        const names = newlyUnlocked.map((e) => `${e} (${HERO_CLASSES[e].className})`).join(' and ');
        this.combatEngine.addLog(
          'system',
          `👑 🔓 BOSS VANQUISHED! You absorbed the elemental core and unlocked ${names} for future gauntlets!`
        );
      }
    }

    this.updateHUD();

    this.modalEssence.textContent = `${this.totalEssence}`;
    this.modalXp.textContent = `${this.totalXp}`;

    const upgrades = this.escalationManager.getAvailableUpgrades();
    this.upgradeChoicesContainer.innerHTML = '';

    const gridDiv = document.createElement('div');
    gridDiv.className = 'upgrade-grid';

    // Upgrade existing abilities
    this.hero.abilities.forEach((ab) => {
      const card = document.createElement('div');
      card.className = 'upgrade-item';
      card.innerHTML = `
        <div style="font-weight:700; font-size:1rem;">Upgrade ${ab.icon} ${ab.name}</div>
        <div style="font-size:0.85rem; color:#94a3b8;">Level ${ab.level} -> ${ab.level + 1} (+30% Damage)</div>
        <button class="btn-primary" style="margin-top:auto; padding:6px 12px; font-size:0.8rem;">
          Upgrade (30 Essence, 40 XP)
        </button>
      `;
      card.querySelector('button')!.onclick = () => {
        if (this.totalEssence >= 30 && this.totalXp >= 40) {
          this.totalEssence -= 30;
          this.totalXp -= 40;
          this.upgradeManager.upgradeAbility(this.hero, ab.id);
          this.modalEssence.textContent = `${this.totalEssence}`;
          this.modalXp.textContent = `${this.totalXp}`;
          this.updateHUD();
          card.querySelector('div:nth-child(2)')!.textContent = `Level ${ab.level} -> ${ab.level + 1}`;
        }
      };
      gridDiv.appendChild(card);
    });

    // Unlock new abilities (only for unlocked elements or hero's active element)
    upgrades.abilities
      .filter(
        (newAb) =>
          this.unlockManager.isElementUnlocked(newAb.element) ||
          newAb.element === 'Neutral' ||
          newAb.element === this.hero.stats.elementalAffinity
      )
      .forEach((newAb) => {
        const alreadyOwned = this.hero.abilities.some((a) => a.id === newAb.id);
        if (alreadyOwned) return;

        const card = document.createElement('div');
        card.className = 'upgrade-item';
        card.innerHTML = `
          <div style="font-weight:700; font-size:1rem;">Unlock ${newAb.icon} ${newAb.name}</div>
          <div style="font-size:0.85rem; color:#94a3b8;">${newAb.description} (${newAb.element})</div>
          <button class="btn-primary" style="margin-top:auto; padding:6px 12px; font-size:0.8rem;">
            Unlock (45 Essence, 50 XP)
          </button>
        `;
        card.querySelector('button')!.onclick = () => {
          if (this.totalEssence >= 45 && this.totalXp >= 50) {
            this.totalEssence -= 45;
            this.totalXp -= 50;
            this.upgradeManager.unlockAbility(this.hero, newAb);
            this.modalEssence.textContent = `${this.totalEssence}`;
            this.modalXp.textContent = `${this.totalXp}`;
            this.updateHUD();
            card.remove();
          }
        };
        gridDiv.appendChild(card);
      });

    // Relics
    upgrades.relics.forEach((relic: PassiveRelic) => {
      const card = document.createElement('div');
      card.className = 'upgrade-item';
      card.innerHTML = `
        <div style="font-weight:700; font-size:1rem;">Relic: ${relic.icon} ${relic.name}</div>
        <div style="font-size:0.85rem; color:#94a3b8;">${relic.description}</div>
        <button class="btn-primary" style="margin-top:auto; padding:6px 12px; font-size:0.8rem;">
          Acquire (${relic.costEssence} Essence, ${relic.costXp} XP)
        </button>
      `;
      card.querySelector('button')!.onclick = () => {
        if (this.totalEssence >= relic.costEssence && this.totalXp >= relic.costXp) {
          this.totalEssence -= relic.costEssence;
          this.totalXp -= relic.costXp;
          this.upgradeManager.applyRelic(this.hero, relic);
          this.modalEssence.textContent = `${this.totalEssence}`;
          this.modalXp.textContent = `${this.totalXp}`;
          this.updateHUD();
          card.remove();
        }
      };
      gridDiv.appendChild(card);
    });

    this.upgradeChoicesContainer.appendChild(gridDiv);
    this.upgradeModal.classList.remove('hidden');
  }

  private advanceToNextRound(): void {
    this.upgradeModal.classList.add('hidden');
    this.currentRound += 1;

    // Reset Hero position and stats
    this.hero.coord = { x: 1, y: 1 };
    this.combatEngine.resetRoundState();

    // Generate new round enemies
    this.enemies = this.escalationManager.generateRoundEnemies(this.currentRound);
    this.combatEngine.enemies = this.enemies;

    const isBoss = this.currentRound % 5 === 0;
    if (isBoss) {
      const bossUnit = this.enemies.find((e) => e.isBoss);
      const bossName = bossUnit ? bossUnit.name : 'A Boss';
      this.combatEngine.addLog(
        'system',
        `👑 ⚠️ BOSS ENCOUNTER! Round ${this.currentRound}: ${bossName} enters the arena!`
      );
    } else {
      this.combatEngine.addLog(
        'system',
        `⚔️ Round ${this.currentRound} / ${this.maxRounds} Begins! Enemies incoming.`
      );
    }

    this.turnManager.startPlayerTurn([this.hero]);
    this.isBusy = false;
    this.updateReachableTiles();
    this.updateHUD();
  }

  private showVictoryModal(): void {
    this.combatEngine.resetRoundState();

    if (this.currentRound % 5 === 0) {
      const newlyUnlocked = this.unlockManager.checkBossDefeatUnlocks(this.currentRound);
      if (newlyUnlocked.length > 0) {
        const names = newlyUnlocked.map((e) => `${e} (${HERO_CLASSES[e].className})`).join(' and ');
        this.combatEngine.addLog(
          'system',
          `👑 🔓 SUPREME BOSS VANQUISHED! You unlocked ${names}!`
        );
      }
    }

    this.outcomeTitle.textContent = '👑 GAUNTLET CONQUERED!';
    this.outcomeSubtitle.textContent = `You have mastered the elements and vanquished all ${this.maxRounds} rounds including all Primordial Bosses!`;
    this.outcomeStatsList.innerHTML = `
      <div style="margin: 16px 0; font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.8;">
        <div>Rounds Conquered: <strong>${this.currentRound} / ${this.maxRounds}</strong></div>
        <div>Total Damage Dealt: <strong>${this.combatEngine.performance.damageDealt}</strong></div>
        <div>Reactions Triggered: <strong>${this.combatEngine.performance.reactionsTriggered}</strong></div>
        <div>Total Essence Earned: <strong>${this.totalEssence}</strong></div>
        <div>Total XP Earned: <strong>${this.totalXp}</strong></div>
      </div>
    `;
    this.gameOverModal.classList.remove('hidden');
  }

  private showDefeatModal(): void {
    this.outcomeTitle.textContent = '💀 DEFEAT';
    this.outcomeSubtitle.textContent = 'Your elemental essence has collapsed in the arena.';
    this.outcomeStatsList.innerHTML = `
      <div style="margin: 16px 0; font-family: var(--font-mono); font-size: 0.9rem;">
        <div>Fallen in Round: <strong>${this.currentRound} / ${this.maxRounds}</strong></div>
        <div>Reactions Triggered: <strong>${this.combatEngine.performance.reactionsTriggered}</strong></div>
      </div>
    `;
    this.gameOverModal.classList.remove('hidden');
  }

  private restartGame(element: ElementType = this.selectedElement): void {
    this.selectedElement = element;
    this.gameOverModal.classList.add('hidden');
    this.currentRound = 1;
    this.totalEssence = 0;
    this.totalXp = 0;
    this.isBusy = false;
    this.hazardManager.clearAllHazards();
    this.hero = this.createHero(this.selectedElement);
    this.enemies = this.escalationManager.generateRoundEnemies(1);
    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.enemyAI = new EnemyAI(this.combatEngine);
    this.renderer = new BattlefieldRenderer(
      document.getElementById('battlefield-canvas') as HTMLCanvasElement,
      this.combatEngine
    );
    this.turnManager.startPlayerTurn([this.hero]);
    this.updateReachableTiles();
    this.updateHUD();
  }

  private updateHUD(): void {
    this.hud.updateHeroStatus(this.hero);
    this.hud.renderAbilities(
      this.hero.abilities,
      this.selectedAbility?.id || null,
      this.hero.stats.currentAp,
      (ab) => this.selectAbility(ab)
    );
    this.hud.updatePhaseBanner(this.turnManager.getCurrentPhase());
    this.hud.updateCurrencies(this.totalEssence, this.totalXp, this.currentRound, this.maxRounds);
    this.hud.updateCombatLog(this.combatEngine.logs);
  }

  private gameLoop = (): void => {
    const now = performance.now();
    const dt = Math.min(100, now - this.lastFrameTime);
    this.lastFrameTime = now;

    this.renderer.update(dt);
    this.renderer.render(
      this.hoveredCoord,
      this.selectedAbility ? [] : this.reachableTiles,
      this.targetableTiles,
      this.focusedUnitId
    );
    requestAnimationFrame(this.gameLoop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
