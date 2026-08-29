// Elemental Mayhem - Main Application Controller
import './style.css';
import { Grid } from './engine/Grid';
import { TileHazardManager } from './engine/TileHazardManager';
import { CombatEngine } from './engine/CombatEngine';
import { TurnManager } from './engine/TurnManager';
import { EnemyAI } from './engine/EnemyAI';
import { BattlefieldRenderer } from './renderer/BattlefieldRenderer';
import { HUDManager } from './ui/HUDManager';
import { Unit, Ability, GridCoord } from './types';

class GameController {
  private grid: Grid;
  private hazardManager: TileHazardManager;
  private turnManager: TurnManager;
  private combatEngine: CombatEngine;
  private enemyAI: EnemyAI;
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

  constructor() {
    const canvas = document.getElementById('battlefield-canvas') as HTMLCanvasElement;
    this.grid = new Grid(10);
    this.hazardManager = new TileHazardManager(this.grid);
    this.turnManager = new TurnManager();

    this.hero = this.createHero();
    this.enemies = this.createRoundEnemies(1);

    this.combatEngine = new CombatEngine(this.grid, this.hazardManager, this.hero, this.enemies);
    this.enemyAI = new EnemyAI(this.combatEngine);
    this.renderer = new BattlefieldRenderer(canvas, this.combatEngine);
    this.hud = new HUDManager();

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

  private createRoundEnemies(round: number): Unit[] {
    const enemies: Unit[] = [];
    if (round === 1) {
      enemies.push({
        id: 'enemy_1',
        name: 'Toxic Mire Adept',
        faction: 'Enemy',
        avatar: '🧪',
        coord: { x: 8, y: 3 },
        stats: {
          maxHp: 45,
          currentHp: 45,
          maxAp: 4,
          currentAp: 4,
          moveCostPerTile: 1,
          elementalAffinity: 'Poison',
        },
        abilities: [
          {
            id: 'poison_spit',
            name: 'Venom Spit',
            element: 'Poison',
            icon: '🧪',
            apCost: 2,
            cooldown: 0,
            currentCooldown: 0,
            range: 3,
            aoeRadius: 0,
            targeting: 'SingleUnit',
            baseDamage: 18,
            appliesStatus: 'Poisoned',
            statusDuration: 3,
            createsHazard: 'ToxicMire',
            hazardDuration: 2,
            description: 'Spits venom.',
            level: 1,
          },
        ],
        statusEffects: [],
        isDead: false,
      });

      enemies.push({
        id: 'enemy_2',
        name: 'Earth Sentinel',
        faction: 'Enemy',
        avatar: '🪨',
        coord: { x: 7, y: 7 },
        stats: {
          maxHp: 60,
          currentHp: 60,
          maxAp: 3,
          currentAp: 3,
          moveCostPerTile: 1,
          elementalAffinity: 'Earth',
        },
        abilities: [
          {
            id: 'boulder_smash',
            name: 'Boulder Smash',
            element: 'Earth',
            icon: '🪨',
            apCost: 2,
            cooldown: 0,
            currentCooldown: 0,
            range: 2,
            aoeRadius: 0,
            targeting: 'SingleUnit',
            baseDamage: 22,
            description: 'Crushes with stone.',
            level: 1,
          },
        ],
        statusEffects: [],
        isDead: false,
      });
    }
    return enemies;
  }

  private setupObstacles(): void {
    // Generate tactical pillars on grid
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
        // Cast ability at target
        const res = this.combatEngine.executeAbility(this.hero, this.selectedAbility, gridCoord);
        if (res.success) {
          const screenPos = this.renderer.gridToScreen(gridCoord);
          this.renderer.particleEngine.emit(screenPos.x, screenPos.y, '#ffd000', 25, 4);
          this.selectedAbility = null;
          this.targetableTiles = [];
        }
      } else {
        // Move hero
        if (this.combatEngine.moveUnit(this.hero, gridCoord)) {
          const screenPos = this.renderer.gridToScreen(gridCoord);
          this.renderer.particleEngine.emit(screenPos.x, screenPos.y, '#38bdf8', 12, 2);
        }
      }

      this.updateReachableTiles();
      this.updateHUD();
      this.checkCombatState();
    });

    // End Turn Button
    document.getElementById('end-turn-btn')?.addEventListener('click', () => {
      this.endPlayerTurn();
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '4') {
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

    // Trigger Enemy AI Turns sequentially with small delay
    setTimeout(() => {
      this.turnManager.startEnemyTurn(this.enemies);
      for (const enemy of this.enemies) {
        if (!enemy.isDead) {
          this.enemyAI.takeTurn(enemy, this.hero);
        }
      }

      // Tick ground hazards and statuses
      this.hazardManager.tickHazards();
      this.combatEngine.statusManager.tickStatusEffects(this.hero);
      for (const enemy of this.enemies) {
        this.combatEngine.statusManager.tickStatusEffects(enemy);
      }

      // Resume player turn
      this.turnManager.startPlayerTurn([this.hero]);
      this.updateReachableTiles();
      this.updateHUD();
      this.checkCombatState();
    }, 600);
  }

  private checkCombatState(): void {
    if (this.hero.isDead) {
      this.combatEngine.addLog('system', '💀 You have fallen in combat! Game Over.');
      this.turnManager.setPhase('GAME_OVER');
      this.updateHUD();
      return;
    }

    if (this.combatEngine.areAllEnemiesDead()) {
      this.combatEngine.addLog('system', '🎉 Arena Cleared! Collect your Essence & XP rewards.');
      this.totalEssence += 50 + this.combatEngine.performance.reactionsTriggered * 10;
      this.totalXp += 100;
      this.updateHUD();
    }
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

// Start Game
window.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
