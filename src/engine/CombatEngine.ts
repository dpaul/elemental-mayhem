// Elemental Mayhem - Combat Resolution & Ability Execution Engine
import { Grid } from './Grid';
import { TileHazardManager } from './TileHazardManager';
import { ElementalMatrix } from './ElementalMatrix';
import { ReactionEngine } from './ReactionEngine';
import { StatusEffectManager } from './StatusEffectManager';
import { Unit, Ability, GridCoord, CombatLogEntry, PerformanceStats } from '../types';

export class CombatEngine {
  public grid: Grid;
  public hazardManager: TileHazardManager;
  public matrix: ElementalMatrix;
  public reactionEngine: ReactionEngine;
  public statusManager: StatusEffectManager;
  public hero: Unit;
  public enemies: Unit[];
  public logs: CombatLogEntry[];
  public performance: PerformanceStats;

  constructor(grid: Grid, hazardManager: TileHazardManager, hero: Unit, enemies: Unit[]) {
    this.grid = grid;
    this.hazardManager = hazardManager;
    this.matrix = new ElementalMatrix();
    this.reactionEngine = new ReactionEngine();
    this.statusManager = new StatusEffectManager();
    this.hero = hero;
    this.enemies = enemies;
    this.logs = [];
    this.performance = {
      turnsUsed: 0,
      damageDealt: 0,
      damageTaken: 0,
      reactionsTriggered: 0,
      enemiesKilled: 0,
      flawlessBonus: true,
      earnedEssence: 0,
      earnedXp: 0,
    };
  }

  public getUnitAt(coord: GridCoord): Unit | null {
    if (!this.hero.isDead && this.hero.coord.x === coord.x && this.hero.coord.y === coord.y) {
      return this.hero;
    }
    for (const enemy of this.enemies) {
      if (!enemy.isDead && enemy.coord.x === coord.x && enemy.coord.y === coord.y) {
        return enemy;
      }
    }
    return null;
  }

  public moveUnit(unit: Unit, targetCoord: GridCoord): boolean {
    if (unit.isDead) return false;
    if (this.statusManager.hasStatus(unit, 'Rooted')) {
      this.addLog('system', `${unit.name} is Rooted and cannot move!`);
      return false;
    }

    const path = this.grid.findPath(unit.coord, targetCoord);
    if (!path || path.length === 0) return false;

    // Check if destination has another unit
    if (this.getUnitAt(targetCoord) !== null) return false;

    const apCost = path.length * unit.stats.moveCostPerTile;
    if (unit.stats.currentAp < apCost) return false;

    unit.stats.currentAp -= apCost;
    unit.coord = { ...targetCoord };

    // Check if stepping into hazard
    const tile = this.grid.getTile(targetCoord);
    if (tile && tile.hazard.type !== 'None' && tile.hazard.damagePerTurn > 0) {
      unit.stats.currentHp = Math.max(0, unit.stats.currentHp - tile.hazard.damagePerTurn);
      this.addLog(
        'hazard',
        `${unit.name} stepped into ${tile.hazard.type} taking ${tile.hazard.damagePerTurn} hazard damage!`
      );
      if (unit.faction === 'Player') {
        this.performance.damageTaken += tile.hazard.damagePerTurn;
        this.performance.flawlessBonus = false;
      }
      if (unit.stats.currentHp === 0) {
        unit.isDead = true;
        this.addLog('system', `${unit.name} perished in ${tile.hazard.type}!`);
      }
    }

    return true;
  }

  public executeAbility(
    caster: Unit,
    ability: Ability,
    targetCoord: GridCoord
  ): { success: boolean; message?: string } {
    if (caster.isDead) return { success: false, message: 'Caster is dead.' };
    if (caster.stats.currentAp < ability.apCost) return { success: false, message: 'Not enough AP.' };
    if (ability.currentCooldown > 0) return { success: false, message: 'Ability on cooldown.' };

    const dist = this.grid.manhattanDistance(caster.coord, targetCoord);
    if (dist > ability.range) return { success: false, message: 'Target out of range.' };

    if (!this.grid.hasLineOfSight(caster.coord, targetCoord)) {
      return { success: false, message: 'Line of sight blocked by obstacle.' };
    }

    // Deduct AP and set cooldown
    caster.stats.currentAp -= ability.apCost;
    ability.currentCooldown = ability.cooldown;

    this.addLog(
      caster.faction === 'Player' ? 'player' : 'enemy',
      `${caster.name} casts ${ability.name} (${ability.element})!`
    );

    // Collect affected coordinates (single target or AoE)
    const affectedCoords: GridCoord[] = [];
    if (ability.aoeRadius > 0) {
      for (let x = targetCoord.x - ability.aoeRadius; x <= targetCoord.x + ability.aoeRadius; x++) {
        for (let y = targetCoord.y - ability.aoeRadius; y <= targetCoord.y + ability.aoeRadius; y++) {
          const c = { x, y };
          if (this.grid.isInBounds(c) && this.grid.manhattanDistance(targetCoord, c) <= ability.aoeRadius) {
            affectedCoords.push(c);
          }
        }
      }
    } else {
      affectedCoords.push(targetCoord);
    }

    // Apply damage and reactions to each affected tile and unit
    for (const coord of affectedCoords) {
      const targetUnit = this.getUnitAt(coord);

      if (targetUnit && !targetUnit.isDead) {
        // Calculate affinity damage
        let finalDamage = this.matrix.calculateDamage(
          ability.baseDamage,
          ability.element,
          targetUnit.stats.elementalAffinity
        );

        // Check for active status reactions
        const primaryStatus = targetUnit.statusEffects.length > 0 ? targetUnit.statusEffects[0].type : null;
        const reaction = this.reactionEngine.evaluateUnitReaction(ability.element, primaryStatus);

        if (reaction) {
          finalDamage += reaction.bonusDamage;
          this.performance.reactionsTriggered += 1;
          this.addLog('reaction', `⚡ ${reaction.description}`);

          if (reaction.statusApplied) {
            this.statusManager.applyStatus(targetUnit, {
              type: reaction.statusApplied,
              stacks: 1,
              duration: 2,
              element: ability.element,
            });
          }

          if (reaction.hazardCreated) {
            this.hazardManager.applyHazard(coord, reaction.hazardCreated, 2, 15, ability.element);
          }
        }

        // Apply direct damage
        targetUnit.stats.currentHp = Math.max(0, targetUnit.stats.currentHp - finalDamage);

        if (caster.faction === 'Player') {
          this.performance.damageDealt += finalDamage;
        } else {
          this.performance.damageTaken += finalDamage;
          this.performance.flawlessBonus = false;
        }

        this.addLog(
          caster.faction === 'Player' ? 'player' : 'enemy',
          `💥 ${targetUnit.name} takes ${finalDamage} damage from ${ability.name} (${targetUnit.stats.currentHp}/${targetUnit.stats.maxHp} HP remaining).`
        );

        // Apply status effect if defined on ability
        if (ability.appliesStatus && !targetUnit.isDead) {
          this.statusManager.applyStatus(targetUnit, {
            type: ability.appliesStatus,
            stacks: 1,
            duration: ability.statusDuration || 2,
            tickDamage: 10,
            element: ability.element,
          });
        }

        // Check for unit death
        if (targetUnit.stats.currentHp === 0) {
          targetUnit.isDead = true;
          this.addLog('system', `☠️ ${targetUnit.name} has been defeated!`);
          if (targetUnit.faction === 'Enemy') {
            this.performance.enemiesKilled += 1;
          }
        }
      }

      // Create ground hazard if specified
      if (ability.createsHazard) {
        const hazardReaction = this.hazardManager.applyHazard(
          coord,
          ability.createsHazard,
          ability.hazardDuration || 2,
          10,
          ability.element
        );
        if (hazardReaction) {
          this.addLog('reaction', `Tile reaction triggered: ${hazardReaction}!`);
        }
      }
    }

    return { success: true };
  }

  public addLog(type: 'player' | 'enemy' | 'reaction' | 'hazard' | 'system', message: string): void {
    this.logs.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      turn: 1,
      type,
      message,
      timestamp: Date.now(),
    });
  }

  public areAllEnemiesDead(): boolean {
    return this.enemies.every((e) => e.isDead);
  }

  public resetRoundState(): void {
    // 1. Restore hero health and AP (mana) to full
    this.hero.stats.currentHp = this.hero.stats.maxHp;
    this.hero.stats.currentAp = this.hero.stats.maxAp;

    // 2. Clear all status effects on hero
    this.statusManager.clearStatusEffects(this.hero);

    // 3. Reset all ability cooldowns
    this.hero.abilities.forEach((ability) => {
      ability.currentCooldown = 0;
    });

    // 4. Clear all hazards from the battlefield
    this.hazardManager.clearAllHazards();

    this.addLog(
      'system',
      '✨ Round completed! Hero restored to full Health & AP, cooldowns reset, and hazards cleared.'
    );
  }
}
