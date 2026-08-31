// Elemental Mayhem - Combat Resolution, Necromancy & Life Entity Engine
import { Grid } from './Grid';
import { TileHazardManager } from './TileHazardManager';
import { ElementalMatrix } from './ElementalMatrix';
import { ReactionEngine } from './ReactionEngine';
import { StatusEffectManager } from './StatusEffectManager';
import {
  Unit,
  Ability,
  GridCoord,
  CombatLogEntry,
  PerformanceStats,
  PendingReanimation,
  UnitFaction,
} from '../types';

export class CombatEngine {
  public grid: Grid;
  public hazardManager: TileHazardManager;
  public matrix: ElementalMatrix;
  public reactionEngine: ReactionEngine;
  public statusManager: StatusEffectManager;
  public hero: Unit;
  public enemies: Unit[];
  public zombies: Unit[] = [];
  public lifeBeings: Unit[] = [];
  public pendingReanimations: PendingReanimation[] = [];
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
    this.zombies = [];
    this.lifeBeings = [];
    this.pendingReanimations = [];
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
    for (const zombie of this.zombies) {
      if (!zombie.isDead && zombie.coord.x === coord.x && zombie.coord.y === coord.y) {
        return zombie;
      }
    }
    for (const being of this.lifeBeings) {
      if (!being.isDead && being.coord.x === coord.x && being.coord.y === coord.y) {
        return being;
      }
    }
    for (const enemy of this.enemies) {
      if (!enemy.isDead && enemy.coord.x === coord.x && enemy.coord.y === coord.y) {
        return enemy;
      }
    }
    return null;
  }

  public getAllAllies(): Unit[] {
    return [
      this.hero,
      ...this.zombies.filter((z) => !z.isDead && z.faction === 'Player'),
      ...this.lifeBeings.filter((b) => !b.isDead && b.faction === 'Player'),
    ];
  }

  public spawnZombie(coord: GridCoord, baseHp: number, baseAp: number, faction: UnitFaction = 'Player'): Unit {
    const maxHp = baseHp * 4; // Quadruple health
    const maxAp = Math.max(2, Math.floor(baseAp * 0.5)); // Half speed

    const zombie: Unit = {
      id: `zombie_${Date.now()}_${Math.random()}`,
      name: 'Reanimated Zombie',
      faction,
      avatar: '🧟',
      coord: { ...coord },
      stats: {
        maxHp,
        currentHp: maxHp,
        maxAp,
        currentAp: maxAp,
        moveCostPerTile: 1,
        elementalAffinity: 'Undead',
      },
      abilities: [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1, // Only attacks when adjacent
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
      ],
      statusEffects: [],
      isDead: false,
      isZombie: true,
      zombieLifetime: 4, // Only lasts 4 turns
    };

    this.zombies.push(zombie);
    return zombie;
  }

  public spawnLifeBeing(coord: GridCoord, faction: UnitFaction = 'Player'): Unit {
    const being: Unit = {
      id: `lifebeing_${Date.now()}_${Math.random()}`,
      name: 'Being of Life',
      faction,
      avatar: '🧚',
      coord: { ...coord },
      stats: {
        maxHp: 120,
        currentHp: 120,
        maxAp: 12, // 3x movement / speed (12 AP)
        currentAp: 12,
        moveCostPerTile: 1,
        elementalAffinity: 'Life',
      },
      abilities: [
        {
          id: 'transmute_zombie',
          name: 'Touch of Life',
          element: 'Life',
          icon: '✨',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 3,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 0,
          description: 'Transmutes a targeted Zombie directly into an allied Being of Life.',
          level: 1,
        },
        {
          id: 'vital_spark',
          name: 'Vital Spark',
          element: 'Life',
          icon: '🌱',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 2,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 22,
          description: 'Radiant pulse of life energy.',
          level: 1,
        },
      ],
      statusEffects: [],
      isDead: false,
      isLifeBeing: true,
    };

    this.lifeBeings.push(being);
    return being;
  }

  public tickZombies(): void {
    // 1. Tick active zombies
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i];
      if (zombie.isDead) {
        this.zombies.splice(i, 1);
        continue;
      }

      if (zombie.zombieLifetime !== undefined) {
        zombie.zombieLifetime -= 1;
        if (zombie.zombieLifetime <= 0) {
          zombie.isDead = true;
          this.zombies.splice(i, 1);

          // Turn into a pile of bones on the battlefield
          this.hazardManager.applyHazard(zombie.coord, 'BonePile', 3, 0, 'Undead');

          // Grant the player +3 AP
          if (zombie.faction === 'Player') {
            this.hero.stats.currentAp = Math.min(
              this.hero.stats.maxAp + 6,
              this.hero.stats.currentAp + 3
            );
          }

          this.addLog(
            'system',
            `🦴 Reanimated Zombie expired after 4 turns into a pile of bones, granting +3 AP!`
          );
        }
      }
    }

    // 2. Tick pending reanimations
    for (let i = this.pendingReanimations.length - 1; i >= 0; i--) {
      const p = this.pendingReanimations[i];
      p.turnsRemaining -= 1;

      if (p.turnsRemaining <= 0) {
        this.pendingReanimations.splice(i, 1);

        // Find available tile at or adjacent to grave
        let spawnTile: GridCoord = { ...p.coord };
        if (this.getUnitAt(spawnTile) !== null) {
          const adj = this.grid
            .getNeighbors(spawnTile)
            .find((n) => !this.grid.getTile(n)?.isObstacle && this.getUnitAt(n) === null);
          if (adj) spawnTile = adj;
        }

        const newZombie = this.spawnZombie(spawnTile, p.baseHp, p.baseAp);
        this.addLog(
          'system',
          `🧟 An infected corpse has reanimated into an allied Zombie (${newZombie.stats.maxHp} HP, ${newZombie.stats.maxAp} AP) after 1 turn!`
        );
      } else {
        this.addLog(
          'system',
          `⏳ Corpse of ${p.victimName} is festering (${p.turnsRemaining} turns until reanimating)...`
        );
      }
    }
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
  ): { success: boolean; message?: string; targetFled?: boolean } {
    if (caster.isDead) return { success: false, message: 'Caster is dead.' };
    if (caster.stats.currentAp < ability.apCost) return { success: false, message: 'Not enough AP.' };
    if (ability.currentCooldown > 0) return { success: false, message: 'Ability on cooldown.' };

    const dist = this.grid.manhattanDistance(caster.coord, targetCoord);
    if (dist > ability.range && ability.targeting !== 'Self') return { success: false, message: 'Target out of range.' };

    if (ability.targeting !== 'Self' && !this.grid.hasLineOfSight(caster.coord, targetCoord)) {
      return { success: false, message: 'Line of sight blocked by obstacle.' };
    }

    // Deduct AP and set cooldown
    caster.stats.currentAp -= ability.apCost;
    ability.currentCooldown = ability.cooldown;

    this.addLog(
      caster.faction === 'Player' ? 'player' : 'enemy',
      `${caster.name} casts ${ability.name} (${ability.element})!`
    );

    // 1. Special Ability: Raise Undead Horde (raises 4 zombies in adjacent free tiles)
    if (ability.id === 'raise_undead_horde') {
      const neighbors = this.grid.getNeighbors(caster.coord);
      const diagonals = [
        { x: caster.coord.x - 1, y: caster.coord.y - 1 },
        { x: caster.coord.x + 1, y: caster.coord.y - 1 },
        { x: caster.coord.x - 1, y: caster.coord.y + 1 },
        { x: caster.coord.x + 1, y: caster.coord.y + 1 },
      ].filter((c) => this.grid.isInBounds(c));

      const candidates = [...neighbors, ...diagonals];
      const validTiles = candidates.filter(
        (c) => !this.grid.getTile(c)?.isObstacle && this.getUnitAt(c) === null
      );

      const spawnCount = Math.min(4, validTiles.length);
      for (let i = 0; i < spawnCount; i++) {
        this.spawnZombie(validTiles[i], 50, 4, caster.faction);
      }

      this.addLog(
        'system',
        `⚰️ ${caster.name} raises ${spawnCount} Reanimated Zombies from the ground adjacent to them!`
      );
      return { success: true };
    }

    // 2. Special Ability: Unzombify Explosion (Life 3x3 AoE unzombifies, cascades explosions, summons Being of Life)
    if (ability.id === 'unzombify_burst') {
      const queue: GridCoord[] = [];
      for (let x = targetCoord.x - 1; x <= targetCoord.x + 1; x++) {
        for (let y = targetCoord.y - 1; y <= targetCoord.y + 1; y++) {
          const c = { x, y };
          if (this.grid.isInBounds(c)) {
            const unit = this.getUnitAt(c);
            if (unit && unit.isZombie && !unit.isDead) {
              queue.push(c);
            }
          }
        }
      }

      const visited = new Set<string>();
      let unzombifiedCount = 0;

      while (queue.length > 0) {
        const c = queue.shift()!;
        const key = `${c.x},${c.y}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const zUnit = this.getUnitAt(c);
        if (zUnit && zUnit.isZombie && !zUnit.isDead) {
          zUnit.isDead = true;
          unzombifiedCount++;
          this.addLog(
            'system',
            `🌟 ${zUnit.name} was UNZOMBIFIED and exploded in a radiant blast of Life!`
          );

          // 3x3 Explosion dealing 40 damage and triggering chain reactions on other zombies
          for (let nx = c.x - 1; nx <= c.x + 1; nx++) {
            for (let ny = c.y - 1; ny <= c.y + 1; ny++) {
              const nc = { x: nx, y: ny };
              if (this.grid.isInBounds(nc)) {
                const affectedUnit = this.getUnitAt(nc);
                if (affectedUnit && !affectedUnit.isDead) {
                  if (affectedUnit.isZombie && !visited.has(`${nc.x},${nc.y}`)) {
                    queue.push(nc);
                  } else if (affectedUnit.faction !== caster.faction) {
                    affectedUnit.stats.currentHp = Math.max(0, affectedUnit.stats.currentHp - 40);
                    if (affectedUnit.stats.currentHp === 0) {
                      affectedUnit.isDead = true;
                      this.addLog('system', `☠️ ${affectedUnit.name} was purified by the Life blast!`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Summons a Being of Life (3x Speed)
      let spawnTile = { ...targetCoord };
      if (this.getUnitAt(spawnTile) !== null) {
        const adj = this.grid.getNeighbors(spawnTile).find(
          (n) => !this.grid.getTile(n)?.isObstacle && this.getUnitAt(n) === null
        );
        if (adj) spawnTile = adj;
      }

      const lifeBeing = this.spawnLifeBeing(spawnTile, caster.faction);
      this.addLog(
        'system',
        `🧚 A luminous Being of Life materialized on the battlefield with 3x Speed (${lifeBeing.stats.maxAp} AP)!`
      );
      return { success: true };
    }

    // 3. Special Ability: Transmute Zombie to Being of Life
    if (ability.id === 'transmute_zombie') {
      const targetUnit = this.getUnitAt(targetCoord);
      if (targetUnit && targetUnit.isZombie && !targetUnit.isDead) {
        targetUnit.isDead = true;
        const newBeing = this.spawnLifeBeing(targetUnit.coord, caster.faction);
        this.addLog(
          'system',
          `✨ Touch of Life transmuted a Zombie into an allied Being of Life (${newBeing.stats.maxHp} HP, ${newBeing.stats.maxAp} AP)!`
        );
        return { success: true };
      }
    }

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

    let enemyFledFlag = false;

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

        // 1 in 5 (20%) chance the target panics and flees when attacked by a Zombie
        if (caster.isZombie && targetUnit.faction !== caster.faction && !targetUnit.isDead) {
          const fleeRoll = Math.random();
          if (fleeRoll < 0.2) {
            // Find free neighboring tile further away from zombie
            const fleeNeighbors = this.grid.getNeighbors(targetUnit.coord).filter(
              (n) =>
                !this.grid.getTile(n)?.isObstacle &&
                this.getUnitAt(n) === null &&
                this.grid.manhattanDistance(n, caster.coord) > this.grid.manhattanDistance(targetUnit.coord, caster.coord)
            );
            if (fleeNeighbors.length > 0) {
              targetUnit.coord = { ...fleeNeighbors[0] };
              enemyFledFlag = true;
              this.addLog(
                'system',
                `😱 ${targetUnit.name} panicked and fled in terror from the Zombie! The Zombie focuses on another target.`
              );
            }
          }
        }

        // Check for unit death vs damaged by zombie
        if (targetUnit.stats.currentHp === 0) {
          targetUnit.isDead = true;
          this.addLog('system', `☠️ ${targetUnit.name} has been defeated!`);
          if (targetUnit.faction === 'Enemy') {
            this.performance.enemiesKilled += 1;
          }

          // --- NECROMANCER REANIMATION MECHANIC ---
          if (caster.isZombie && targetUnit.faction !== caster.faction) {
            // Killed by a Zombie -> reanimates IMMEDIATELY!
            const newZombie = this.spawnZombie(
              targetUnit.coord,
              targetUnit.stats.maxHp,
              targetUnit.stats.maxAp,
              caster.faction
            );
            this.addLog(
              'system',
              `🧟 ${targetUnit.name} was slain by a Zombie and immediately rises as an allied Zombie (${newZombie.stats.maxHp} HP, ${newZombie.stats.maxAp} Half-Speed)!`
            );
          } else {
            // Direct kill by Necromancer hero or Undead element ability:
            const isNecromancerKill =
              (caster.stats.elementalAffinity === 'Undead' || ability.element === 'Undead') &&
              targetUnit.faction !== caster.faction;

            if (isNecromancerKill) {
              const zombie = this.spawnZombie(
                targetUnit.coord,
                targetUnit.stats.maxHp,
                targetUnit.stats.maxAp,
                caster.faction
              );
              this.addLog(
                'system',
                `🧟 ${targetUnit.name} was slain by Necromancy and immediately rises as an allied Zombie with ${zombie.stats.maxHp} HP (4x) and ${zombie.stats.maxAp} Speed (Half-Speed)!`
              );
            }
          }
        } else if (caster.isZombie && targetUnit.faction !== caster.faction && !targetUnit.isDead) {
          // Damaged by a zombie but survived -> reanimates in 1 turn!
          this.pendingReanimations.push({
            id: `reanim_${Date.now()}_${Math.random()}`,
            coord: { ...targetUnit.coord },
            turnsRemaining: 1,
            baseHp: targetUnit.stats.maxHp,
            baseAp: targetUnit.stats.maxAp,
            victimName: targetUnit.name,
          });
          this.addLog(
            'system',
            `☣️ ${targetUnit.name} was infected by the Zombie's attack and will reanimate in 1 turn!`
          );
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

    return { success: true, targetFled: enemyFledFlag };
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

    // 5. Clear summons and pending reanimations
    this.zombies = [];
    this.lifeBeings = [];
    this.pendingReanimations = [];

    this.addLog(
      'system',
      '✨ Round completed! Hero restored to full Health & AP, cooldowns reset, and hazards cleared.'
    );
  }
}
