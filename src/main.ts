// Elemental Mayhem - Main Application Controller
import './style.css';
import { Grid } from './engine/Grid';
import { TileHazardManager } from './engine/TileHazardManager';
import { CombatEngine } from './engine/CombatEngine';
import { TurnManager } from './engine/TurnManager';
import { EnemyAI } from './engine/EnemyAI';
import { PerformanceScorer } from './engine/PerformanceScorer';
import { UpgradeManager } from './engine/UpgradeManager';
import { EscalationManager } from './engine/EscalationManager';
import { BattlefieldRenderer } from './renderer/BattlefieldRenderer';
import { HUDManager } from './ui/HUDManager';
import { Unit, Ability, GridCoord, PassiveRelic } from './types';

class GameController {
  private grid: Grid;
  private hazardManager: TileHazardManager;
  private turnManager: TurnManager;
  private combatEngine: CombatEngine;
  private enemyAI: EnemyAI;
  private scorer: PerformanceScorer;
  private upgradeManager: UpgradeManager;
  private escalationManager: EscalationManager;
  private renderer: BattlefieldRenderer;
  private hud: HUDManager;

  private hero: Unit;
  private enemies: Unit[];
  private currentRound: number = 1;
  private totalEssence: number = 0;
  private totalXp: number = 0;

  private selectedAbility: Ability | null = null;
  private hoveredCoord: GridCoord | null = null;
  private reachableTiles: GridCoord[] = [];
  private targetableTiles: GridCoord[] = [];

  // Modals
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

    this.hero = this.createHero();
    this.enemies = this.escalationManager.generateRoundEnemies(1);

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.enemyAI = new EnemyAI(this.combatEngine);
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.hud = new HUDManager();

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

    this.setupObstacles();
    this.setupEventListeners(canvas);
    this.updateReachableTiles();
    this.updateHUD();

    // Start Game Loop
    this.gameLoop();
  }

  private createHero(): Unit {
    const basicStrike: Ability = {
      id: 'strike',
      name: 'Elemental Strike',
      element: 'Neutral',
      icon: '⚔️',
      apCost: 1,
      cooldown: 0,
      currentCooldown: 0,
      range: 1,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 15,
      description: 'Quick physical blow.',
      level: 1,
    };

    const fireball: Ability = {
      id: 'fireball',
      name: 'Fireball',
      element: 'Fire',
      icon: '🔥',
      apCost: 2,
      cooldown: 0,
      currentCooldown: 0,
      range: 4,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 25,
      description: 'Hurls a fiery orb that scorches targets and ignites tiles.',
      appliesStatus: 'Burning',
      statusDuration: 3,
      createsHazard: 'Burning',
      hazardDuration: 2,
      level: 1,
    };

    const waterTorrent: Ability = {
      id: 'water_torrent',
      name: 'Water Torrent',
      element: 'Water',
      icon: '💧',
      apCost: 2,
      cooldown: 0,
      currentCooldown: 0,
      range: 4,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 20,
      description: 'Blasts pressurized water, soaking targets and creating puddles.',
      appliesStatus: 'Wet',
      statusDuration: 3,
      createsHazard: 'Puddle',
      hazardDuration: 3,
      level: 1,
    };

    const lightningBolt: Ability = {
      id: 'lightning_bolt',
      name: 'Lightning Bolt',
      element: 'Lightning',
      icon: '⚡',
      apCost: 3,
      cooldown: 1,
      currentCooldown: 0,
      range: 5,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 35,
      description: 'Strikes ionized lightning, shocking targets and electrifying water.',
      appliesStatus: 'Shocked',
      statusDuration: 2,
      level: 1,
    };

    return {
      id: 'hero',
      name: 'Arch-Elementalist',
      faction: 'Player',
      avatar: '🧙‍♂️',
      coord: { x: 1, y: 1 },
      stats: {
        maxHp: 100,
        currentHp: 100,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [basicStrike, fireball, waterTorrent, lightningBolt],
      statusEffects: [],
      isDead: false,
    };
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
      const gridCoord = this.renderer.screenToGrid(e.clientX, e.clientY);
      this.hoveredCoord = gridCoord;
      if (gridCoord) {
        const unit = this.combatEngine.getUnitAt(gridCoord);
        this.hud.inspectUnit(unit, gridCoord);
      }
    });

    canvas.addEventListener('click', (e) => {
      const gridCoord = this.renderer.screenToGrid(e.clientX, e.clientY);
      if (!gridCoord || this.turnManager.getCurrentPhase() !== 'PLAYER_TURN') return;

      if (this.selectedAbility) {
        const res = this.combatEngine.executeAbility(this.hero, this.selectedAbility, gridCoord);
        if (res.success) {
          const screenPos = this.renderer.gridToScreen(gridCoord);
          this.renderer.particleEngine.emit(screenPos.x, screenPos.y, '#ffd000', 25, 4);
          this.selectedAbility = null;
          this.targetableTiles = [];
        }
      } else {
        if (this.combatEngine.moveUnit(this.hero, gridCoord)) {
          const screenPos = this.renderer.gridToScreen(gridCoord);
          this.renderer.particleEngine.emit(screenPos.x, screenPos.y, '#38bdf8', 12, 2);
        }
      }

      this.updateReachableTiles();
      this.updateHUD();
      this.checkCombatState();
    });

    document.getElementById('end-turn-btn')?.addEventListener('click', () => {
      this.endPlayerTurn();
    });

    this.proceedNextRoundBtn.addEventListener('click', () => {
      this.advanceToNextRound();
    });

    this.restartGameBtn.addEventListener('click', () => {
      this.restartGame();
    });

    window.addEventListener('keydown', (e) => {
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
    if (ability.apCost > this.hero.stats.currentAp || ability.currentCooldown > 0) return;

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
    if (this.turnManager.getCurrentPhase() === 'PLAYER_TURN') {
      const maxDist = Math.floor(this.hero.stats.currentAp / this.hero.stats.moveCostPerTile);
      this.reachableTiles = this.grid.getReachableTiles(this.hero.coord, maxDist);
    } else {
      this.reachableTiles = [];
    }
  }

  private endPlayerTurn(): void {
    if (this.turnManager.getCurrentPhase() !== 'PLAYER_TURN') return;

    this.turnManager.endPlayerTurn();
    this.selectedAbility = null;
    this.targetableTiles = [];
    this.reachableTiles = [];
    this.updateHUD();

    setTimeout(() => {
      this.turnManager.startEnemyTurn(this.enemies);
      for (const enemy of this.enemies) {
        if (!enemy.isDead) {
          this.enemyAI.takeTurn(enemy, this.hero);
        }
      }

      this.hazardManager.tickHazards();
      this.combatEngine.statusManager.tickStatusEffects(this.hero);
      for (const enemy of this.enemies) {
        this.combatEngine.statusManager.tickStatusEffects(enemy);
      }

      this.turnManager.startPlayerTurn([this.hero]);
      this.updateReachableTiles();
      this.updateHUD();
      this.checkCombatState();
    }, 500);
  }

  private checkCombatState(): void {
    if (this.hero.isDead) {
      this.combatEngine.addLog('system', '💀 You have fallen in combat! Game Over.');
      this.turnManager.setPhase('GAME_OVER');
      this.showDefeatModal();
      return;
    }

    if (this.combatEngine.areAllEnemiesDead()) {
      if (this.currentRound >= 3) {
        this.showVictoryModal();
      } else {
        this.openUpgradeModal();
      }
    }
  }

  private openUpgradeModal(): void {
    const rewards = this.scorer.calculateRoundRewards(this.combatEngine.performance);
    this.totalEssence += rewards.essence;
    this.totalXp += rewards.xp;
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

    // Unlock new abilities
    upgrades.abilities.forEach((newAb) => {
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
    this.hero.stats.currentAp = this.hero.stats.maxAp;

    // Generate new round enemies
    this.enemies = this.escalationManager.generateRoundEnemies(this.currentRound);
    this.combatEngine.enemies = this.enemies;

    this.combatEngine.addLog(
      'system',
      `⚔️ Round ${this.currentRound} Begins! Enemies incoming.`
    );

    this.turnManager.startPlayerTurn([this.hero]);
    this.updateReachableTiles();
    this.updateHUD();
  }

  private showVictoryModal(): void {
    this.outcomeTitle.textContent = '👑 GAUNTLET CONQUERED!';
    this.outcomeSubtitle.textContent = 'You have mastered the elements and vanquished the Void Archon.';
    this.outcomeStatsList.innerHTML = `
      <div style="margin: 16px 0; font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.8;">
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
        <div>Fallen in Round: <strong>${this.currentRound}</strong></div>
        <div>Reactions Triggered: <strong>${this.combatEngine.performance.reactionsTriggered}</strong></div>
      </div>
    `;
    this.gameOverModal.classList.remove('hidden');
  }

  private restartGame(): void {
    this.gameOverModal.classList.add('hidden');
    this.currentRound = 1;
    this.totalEssence = 0;
    this.totalXp = 0;
    this.hero = this.createHero();
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
    this.hud.updateCurrencies(this.totalEssence, this.totalXp, this.currentRound);
    this.hud.updateCombatLog(this.combatEngine.logs);
  }

  private gameLoop = (): void => {
    this.renderer.render(
      this.hoveredCoord,
      this.selectedAbility ? [] : this.reachableTiles,
      this.targetableTiles
    );
    requestAnimationFrame(this.gameLoop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
