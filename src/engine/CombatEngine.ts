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
  ZombieClass,
  ElementType,
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
  public onZombieSpawn?: (zombie: Unit) => void;

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

  public spawnZombie(
    coord: GridCoord,
    baseHp: number,
    baseAp: number,
    faction: UnitFaction = 'Player',
    forcedClass?: ZombieClass
  ): Unit {
    let zClass: ZombieClass = forcedClass || 'Walker';

    if (!forcedClass) {
      // 1 out of 10,000 to be a Wizard Zombie!
      const roll = Math.random();
      if (roll < 0.0001) {
        zClass = 'Wizard';
      } else {
        const subRoll = Math.random();
        if (subRoll < 0.18) {
          zClass = 'Runner';
        } else if (subRoll < 0.30) {
          zClass = 'Brute';
        } else if (subRoll < 0.40) {
          zClass = 'Spitter';
        } else if (subRoll < 0.50) {
          zClass = 'Boomer';
        } else if (subRoll < 0.60) {
          zClass = 'Frostbite';
        } else if (subRoll < 0.70) {
          zClass = 'DeathKnight';
        } else if (subRoll < 0.80) {
          zClass = 'Screamer';
        } else if (subRoll < 0.90) {
          zClass = 'PlagueBearer';
        } else if (subRoll < 0.96) {
          zClass = 'Electro';
        } else {
          zClass = 'Walker';
        }
      }
    }

    let name = 'Reanimated Zombie';
    let avatar = '🧟';
    let affinity: ElementType = 'Undead';
    const maxHp = baseHp * 4; // Quadruple health for all zombies
    let maxAp = Math.max(2, Math.floor(baseAp * 0.5)); // Half speed
    let abilities: Ability[] = [
      {
        id: 'zombie_bite',
        name: 'Zombie Bite',
        element: 'Undead',
        icon: '🧟',
        apCost: 1,
        cooldown: 0,
        currentCooldown: 0,
        range: 1,
        aoeRadius: 0,
        targeting: 'SingleUnit',
        baseDamage: 28,
        description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
        level: 1,
      },
    ];

    if (zClass === 'Wizard') {
      name = 'Wizard Zombie';
      avatar = '🧟🧙‍♂️';
      affinity = 'Undead';
      maxAp = 6;
      abilities = [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
        {
          id: 'wizard_zombie_shadow_bolt',
          name: 'Necrotic Shadow Bolt',
          element: 'Undead',
          icon: '🔮',
          apCost: 2,
          cooldown: 0,
          currentCooldown: 0,
          range: 7, // Attacks from afar!
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 36,
          description: 'Hurls an undulating orb of ancient necrotic sorcery from afar, dealing heavy dark damage.',
          level: 1,
        },
        {
          id: 'wizard_zombie_grave_bind',
          name: 'Grave Binding (Root)',
          element: 'Undead',
          icon: '⛓️',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 6, // Ranged binding!
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 22,
          appliesStatus: 'Rooted',
          statusDuration: 3,
          description: 'Summons grasping skeletal arms from the underworld that bind the target to the spot so they cannot run away!',
          level: 1,
        },
      ];
    } else if (zClass === 'Runner') {
      name = 'Runner Zombie';
      avatar = '🧟⚡';
      affinity = 'Undead';
      abilities = [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
        {
          id: 'runner_frenzied_pounce',
          name: 'Frenzied Pounce',
          element: 'Undead',
          icon: '⚡',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 3,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 22,
          description: 'Pounces rapidly upon the target with frantic feral momentum.',
          level: 1,
        },
      ];
    } else if (zClass === 'Brute') {
      name = 'Brute Zombie';
      avatar = '🧟🛡️';
      affinity = 'Earth';
      abilities = [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
        {
          id: 'brute_ground_slam',
          name: 'Ground Slam',
          element: 'Earth',
          icon: '💥',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 1,
          targeting: 'SingleUnit',
          baseDamage: 35,
          description: 'Slams the ground with colossal force, shattering enemies in an area.',
          level: 1,
        },
      ];
    } else if (zClass === 'Spitter') {
      name = 'Spitter Zombie';
      avatar = '🧟🧪';
      affinity = 'Poison';
      abilities = [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
        {
          id: 'spitter_toxic_bile',
          name: 'Caustic Bile Spit',
          element: 'Poison',
          icon: '🧪',
          apCost: 2,
          cooldown: 0,
          currentCooldown: 0,
          range: 4,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 22,
          appliesStatus: 'Poisoned',
          statusDuration: 3,
          description: 'Spits corrosive toxic bile from range, inflicting Poison.',
          level: 1,
        },
      ];
    } else if (zClass === 'Boomer') {
      name = 'Boomer Zombie';
      avatar = '🧟💣';
      affinity = 'Fire';
      abilities = [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
        {
          id: 'boomer_detonation',
          name: 'Putrid Self-Destruct',
          element: 'Fire',
          icon: '💣',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 2,
          aoeRadius: 1,
          targeting: 'SingleUnit',
          baseDamage: 40,
          createsHazard: 'LavaPool',
          hazardDuration: 2,
          description: 'Detonates volatile necrotic corpse gases into a searing 3x3 fiery explosion.',
          level: 1,
        },
      ];
    } else if (zClass === 'Frostbite') {
      name = 'Frostbite Zombie';
      avatar = '🧟❄️';
      affinity = 'Cold';
      abilities = [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
        {
          id: 'frostbite_freeze',
          name: 'Subzero Chill',
          element: 'Cold',
          icon: '❄️',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 3,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 24,
          appliesStatus: 'Frozen',
          statusDuration: 2,
          description: 'Exhales a freezing subzero wind that encases the target solid in ice.',
          level: 1,
        },
      ];
    } else if (zClass === 'DeathKnight') {
      name = 'Death Knight Zombie';
      avatar = '🧟⚔️';
      affinity = 'Metal';
      abilities = [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
        {
          id: 'deathknight_cleave',
          name: 'Rusted Cleave',
          element: 'Metal',
          icon: '⚔️',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 1,
          targeting: 'SingleUnit',
          baseDamage: 36,
          appliesStatus: 'Bleeding',
          statusDuration: 2,
          description: 'Swings an ancient corrupted greatsword in a wide arc, inflicting Bleeding.',
          level: 1,
        },
        {
          id: 'deathknight_shield',
          name: 'Bone Aegis',
          element: 'Metal',
          icon: '🛡️',
          apCost: 1,
          cooldown: 2,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'Self',
          baseDamage: 0,
          appliesStatus: 'Shielded',
          statusDuration: 3,
          description: 'Hardens decayed bone plates to absorb up to 35 damage.',
          level: 1,
        },
      ];
    } else if (zClass === 'Screamer') {
      name = 'Screamer Zombie';
      avatar = '🧟😱';
      affinity = 'Sound';
      abilities = [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
        {
          id: 'screamer_wail',
          name: 'Banshee Shriek',
          element: 'Sound',
          icon: '🔊',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 4,
          aoeRadius: 1,
          targeting: 'SingleUnit',
          baseDamage: 22,
          appliesStatus: 'Confused',
          statusDuration: 2,
          description: 'Emits a piercing necrotic shriek that reverberates across the field, Confusing nearby targets.',
          level: 1,
        },
      ];
    } else if (zClass === 'PlagueBearer') {
      name = 'Plague Bearer Zombie';
      avatar = '🧟🦠';
      affinity = 'Poison';
      abilities = [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
        {
          id: 'plague_contagion',
          name: 'Contagion Outburst',
          element: 'Poison',
          icon: '🦠',
          apCost: 2,
          cooldown: 1,
          currentCooldown: 0,
          range: 3,
          aoeRadius: 1,
          targeting: 'SingleUnit',
          baseDamage: 20,
          appliesStatus: 'Poisoned',
          statusDuration: 3,
          createsHazard: 'ToxicMire',
          hazardDuration: 3,
          description: 'Ruptures infectious pestilence nodes, drenching the ground in toxic mire and poisoning victims.',
          level: 1,
        },
      ];
    } else if (zClass === 'Electro') {
      name = 'Electro Zombie';
      avatar = '🧟⚡';
      affinity = 'Lightning';
      abilities = [
        {
          id: 'zombie_bite',
          name: 'Zombie Bite',
          element: 'Undead',
          icon: '🧟',
          apCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          range: 1,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 28,
          description: 'Lethal melee bite that infects target to rise in 1 turn or immediately upon death.',
          level: 1,
        },
        {
          id: 'electro_shock',
          name: 'Galvanic Arc',
          element: 'Lightning',
          icon: '⚡',
          apCost: 2,
          cooldown: 0,
          currentCooldown: 0,
          range: 5,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 30,
          appliesStatus: 'Shocked',
          statusDuration: 2,
          description: 'Channels high-voltage undead static that jolts the target, inflicting Shocked.',
          level: 1,
        },
      ];
    }

    const zombie: Unit = {
      id: `zombie_${Date.now()}_${Math.random()}`,
      name,
      faction,
      avatar,
      coord: { ...coord },
      stats: {
        maxHp,
        currentHp: maxHp,
        maxAp,
        currentAp: maxAp,
        moveCostPerTile: 1,
        elementalAffinity: affinity,
      },
      abilities,
      statusEffects: [],
      isDead: false,
      isZombie: true,
      zombieClass: zClass,
      zombieLifetime: 4,
    };

    this.zombies.push(zombie);
    this.onZombieSpawn?.(zombie);
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
      let hazardDmg = tile.hazard.damagePerTurn;
      if (unit.isZombie) {
        const maxPerHit = Math.max(1, Math.floor(unit.stats.maxHp * 0.5));
        hazardDmg = Math.min(hazardDmg, maxPerHit);
        if (unit.stats.currentHp === unit.stats.maxHp && hazardDmg >= unit.stats.currentHp) {
          hazardDmg = unit.stats.currentHp - 1;
        }
      }
      unit.stats.currentHp = Math.max(0, unit.stats.currentHp - hazardDmg);
      this.addLog(
        'hazard',
        `${unit.name} stepped into ${tile.hazard.type} taking ${hazardDmg} hazard damage!`
      );
      if (unit.faction === 'Player') {
        this.performance.damageTaken += hazardDmg;
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

    // 4. Self-targeting Buffs and Shield Spells
    if (ability.targeting === 'Self') {
      if (ability.appliesStatus) {
        this.statusManager.applyStatus(caster, {
          type: ability.appliesStatus,
          stacks: 1,
          duration: ability.statusDuration || 3,
          element: ability.element,
        });
        this.addLog(
          'system',
          `🛡️ ${caster.name} is now protected by ${ability.name} (${ability.appliesStatus})!`
        );
      }
      return { success: true };
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

        // Check for Elemental Shield absorption
        if (finalDamage > 0 && this.statusManager.hasStatus(targetUnit, 'Shielded')) {
          const absorbed = Math.min(finalDamage, 35);
          finalDamage -= absorbed;
          this.addLog('system', `🛡️ ${targetUnit.name}'s Elemental Shield absorbed ${absorbed} damage!`);
        }

        // UNDEAD TENACITY: Nothing can 1-tap a zombie!
        if (targetUnit.isZombie) {
          // Rule 1: A single hit cannot deal more than 50% of the zombie's max HP
          const maxAllowedDamage = Math.max(1, Math.floor(targetUnit.stats.maxHp * 0.5));
          if (finalDamage > maxAllowedDamage) {
            finalDamage = maxAllowedDamage;
            this.addLog(
              'system',
              `🧟 UNDEAD RESILIENCE: ${targetUnit.name}'s necrotic flesh absorbed the lethal blow! (Damage capped to ${finalDamage} - Nothing can 1-tap a zombie!)`
            );
          }

          // Rule 2: If the zombie is at full HP, no single hit can reduce it to 0 HP
          if (targetUnit.stats.currentHp === targetUnit.stats.maxHp && finalDamage >= targetUnit.stats.currentHp) {
            finalDamage = targetUnit.stats.currentHp - 1;
            this.addLog(
              'system',
              `🧟 UNDEAD TENACITY: ${targetUnit.name} endured a fatal strike with 1 HP remaining!`
            );
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
            tickDamage: ability.appliesStatus === 'Confused' ? 0 : 10,
            element: ability.element,
          });
        }

        // 1 in 5 (20%) chance the target panics and flees when attacked by a Zombie (unless Rooted to the spot!)
        if (caster.isZombie && targetUnit.faction !== caster.faction && !targetUnit.isDead) {
          if (this.statusManager.hasStatus(targetUnit, 'Rooted')) {
            this.addLog('system', `⛓️ ${targetUnit.name} is Rooted to the spot and cannot run away!`);
          } else {
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
