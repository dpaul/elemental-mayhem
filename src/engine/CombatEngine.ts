import { Grid } from './Grid';
import { TileHazardManager } from './TileHazardManager';
import { ElementalMatrix } from './ElementalMatrix';
import { ReactionEngine } from './ReactionEngine';
import { StatusEffectManager } from './StatusEffectManager';
import { HERO_CLASSES } from '../constants/classes';
import { getOrderedWeakestAbilities } from './CrystalManager';
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
  TileHazardType,
  PassiveRelic,
} from '../types';

export const ZOMBIE_CLASS_FLOOR_REQUIREMENTS: Record<ZombieClass, TileHazardType[]> = {
  Frostbite: ['IceSurface'],
  Boomer: ['LavaPool', 'Burning'],
  Electro: ['ElectrifiedPuddle'],
  PlagueBearer: ['ToxicMire'],
  Spitter: ['AcidPool'],
  Wizard: ['VoidRift'],
  DeathKnight: ['BonePile'],
  Brute: ['MudWall'],
  Runner: ['Puddle'],
  Screamer: ['CrystalSpikes'],
  Walker: ['None'],
};

export const HAZARD_TO_ZOMBIE_CLASS: Partial<Record<TileHazardType, ZombieClass>> = {
  IceSurface: 'Frostbite',
  LavaPool: 'Boomer',
  Burning: 'Boomer',
  ElectrifiedPuddle: 'Electro',
  ToxicMire: 'PlagueBearer',
  AcidPool: 'Spitter',
  VoidRift: 'Wizard',
  BonePile: 'DeathKnight',
  MudWall: 'Brute',
  Puddle: 'Runner',
  CrystalSpikes: 'Screamer',
};

export const BATTLE_RELIC_POOL: Omit<PassiveRelic, 'applied'>[] = [
  {
    id: 'relic_arcane_battery',
    name: 'Arcane Battery',
    icon: '🔋',
    description: '+2 Max Action Points per turn',
    costEssence: 40,
    costXp: 50,
    effect: (hero: Unit) => {
      hero.stats.maxAp += 2;
      hero.stats.currentAp += 2;
    },
  },
  {
    id: 'relic_vitality_crystal',
    name: 'Vitality Crystal',
    icon: '💎',
    description: '+40 Max HP and restores full health',
    costEssence: 35,
    costXp: 40,
    effect: (hero: Unit) => {
      hero.stats.maxHp += 40;
      hero.stats.currentHp = hero.stats.maxHp;
    },
  },
  {
    id: 'relic_elemental_prism',
    name: 'Elemental Prism',
    icon: '🔮',
    description: 'Reduces AP cost of all spells by 1 (min 1)',
    costEssence: 60,
    costXp: 75,
    effect: (hero: Unit) => {
      hero.abilities.forEach((a) => {
        a.apCost = Math.max(1, a.apCost - 1);
      });
    },
  },
  {
    id: 'relic_phoenix_feather',
    name: 'Phoenix Feather',
    icon: '🪶',
    description: '+50 Max HP and +1 Max AP',
    costEssence: 55,
    costXp: 60,
    effect: (hero: Unit) => {
      hero.stats.maxHp += 50;
      hero.stats.currentHp = hero.stats.maxHp;
      hero.stats.maxAp += 1;
      hero.stats.currentAp += 1;
    },
  },
  {
    id: 'relic_elemental_catalyst',
    name: 'Elemental Catalyst',
    icon: '⚡',
    description: 'Empowers all abilities with +8 Base Damage',
    costEssence: 50,
    costXp: 65,
    effect: (hero: Unit) => {
      hero.abilities.forEach((a) => {
        a.baseDamage += 8;
      });
    },
  },
  {
    id: 'relic_fire_heart',
    name: 'Heart of the Fire Ruby',
    icon: '❤️‍🔥',
    description: '+1 Max AP, +35 Max HP, +8 Fire Spell Damage',
    costEssence: 50,
    costXp: 50,
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
    description: '+1 Max AP, +45 Max HP',
    costEssence: 50,
    costXp: 50,
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
    description: '+2 Max AP per turn, +6 Lightning Damage',
    costEssence: 55,
    costXp: 55,
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
    description: '+1 Max AP, +30 Max HP',
    costEssence: 45,
    costXp: 45,
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
    description: '+2 Max AP, +25 Max HP',
    costEssence: 60,
    costXp: 60,
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
    description: '+1 Max AP, +75 Max HP',
    costEssence: 50,
    costXp: 50,
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
    description: '+3 Max AP, +60 Max HP, -1 AP ability cost',
    costEssence: 80,
    costXp: 80,
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

export class CombatEngine {
  public grid: Grid;
  public hazardManager: TileHazardManager;
  public matrix: ElementalMatrix;
  public reactionEngine: ReactionEngine;
  public statusManager: StatusEffectManager;
  public hero: Unit;
  public coopHero?: Unit;
  public enemies: Unit[];
  public allies: Unit[] = [];
  public zombies: Unit[] = [];
  public lifeBeings: Unit[] = [];
  public pendingReanimations: PendingReanimation[] = [];
  public logs: CombatLogEntry[];
  public performance: PerformanceStats;
  public currentRound: number = 1;
  public onZombieSpawn?: (zombie: Unit) => void;
  public onEssenceEarned?: (amount: number, coord: GridCoord) => void;
  public onElementalEssenceEarned?: (element: ElementType, amount: number, coord: GridCoord) => void;
  public getEssenceResonanceMultiplier?: (caster: Unit) => number;
  public onTitanLastBlow?: (boss: Unit, colossusDmg: number, leviathanDmg: number) => void;
  public onRelicCollected?: (relic: PassiveRelic, hero: Unit, newlyUnlockedAbility?: Ability) => void;
  public onRelicSpawned?: (relic: PassiveRelic, coord: GridCoord) => void;

  constructor(grid: Grid, hazardManager: TileHazardManager, hero: Unit, enemies: Unit[], coopHero?: Unit) {
    this.grid = grid;
    this.hazardManager = hazardManager;
    this.matrix = new ElementalMatrix();
    this.reactionEngine = new ReactionEngine();
    this.statusManager = new StatusEffectManager();
    this.hero = hero;
    this.coopHero = coopHero;
    this.enemies = enemies;
    this.allies = [];
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

  public isVoidOverlordZombieUsurpationActive(): boolean {
    if (this.currentRound === 100 || this.currentRound === 1000 || this.currentRound === 5000) {
      return true;
    }
    return this.enemies.some(
      (e) => !e.isDead && (e.id.toLowerCase().includes('void_overlord') || e.name.toLowerCase().includes('void overlord'))
    );
  }

  public usurpPlayerZombiesForVoidOverlord(): number {
    if (!this.isVoidOverlordZombieUsurpationActive()) return 0;
    let count = 0;
    for (const z of this.zombies) {
      if (!z.isDead && z.faction === 'Player') {
        z.faction = 'Enemy';
        z.isVoidUsurped = true;
        count++;
      }
    }
    if (count > 0) {
      this.addLog(
        'reaction',
        `🌌 [VOID DOMINION] The Void Overlord commands death! All ${count} zombie(s) on your side have been turned into loyal minions of the Void Overlord!`
      );
    }
    return count;
  }

  /**
   * Kills all Primordial Titans on Round 1000
   */
  public killRound1000Titans(reason: string = 'The Void Overlord unleashed a catastrophic Titan Execution'): Unit[] {
    const killedTitans: Unit[] = [];
    for (const ally of this.allies) {
      if (
        !ally.isDead &&
        (ally.id.includes('colossus') ||
          ally.id.includes('leviathan') ||
          ally.name.toLowerCase().includes('titan') ||
          ally.name.toLowerCase().includes('colossus') ||
          ally.name.toLowerCase().includes('leviathan'))
      ) {
        ally.stats.currentHp = 0;
        ally.isDead = true;
        killedTitans.push(ally);
        this.addLog(
          'system',
          `💀 [TITAN KILLED ON ROUND 1000] ${ally.name} was crushed and killed by ${reason}!`
        );
      }
    }
    return killedTitans;
  }

  /**
   * Triggers the Primordial Titans' decisive last blow against the Round 1000 Void Overlord boss.
   * Delivers 100,000 damage (50,000 from Magma Colossus + 50,000 from Void Leviathan),
   * permanently taking out and obliterating the boss, while sacrificing the Titans in the cosmic cataclysm.
   */
  public triggerTitanFinalBlow(targetBoss?: Unit): { boss: Unit; colossusDamage: number; leviathanDamage: number } | null {
    const boss =
      targetBoss ||
      this.enemies.find((e) => e.id === 'boss_void_overlord_r1000' || (e.isBoss && this.currentRound === 1000)) ||
      this.enemies.find((e) => e.isBoss);

    if (!boss) return null;

    const colossus = this.allies.find(
      (a) => a.id.includes('colossus') || a.name.toLowerCase().includes('colossus')
    );
    const leviathan = this.allies.find(
      (a) => a.id.includes('leviathan') || a.name.toLowerCase().includes('leviathan')
    );

    const colossusDamage = 50000;
    const leviathanDamage = 50000;
    const totalFinisherDamage = colossusDamage + leviathanDamage;

    (boss as any).titanLastBlowDelivered = true;
    boss.stats.currentHp = 0;
    boss.isDead = true;

    this.addLog(
      'system',
      `⚡ [PRIMORDIAL CATACLYSM: DUAL LAST BLOW] The Primordial Titans unleash their ultimate finisher upon ${boss.name}!`
    );

    if (colossus) {
      this.addLog(
        'system',
        `🌋 Magma Colossus strikes with Volcanic World-Shatter dealing ${colossusDamage.toLocaleString()} DMG!`
      );
    }
    if (leviathan) {
      this.addLog(
        'system',
        `🌌 Void Leviathan engulfs with Abyssal Singularity Maw dealing ${leviathanDamage.toLocaleString()} DMG!`
      );
    }

    this.addLog(
      'system',
      `💥 TITANS' DECISIVE LAST BLOW: ${totalFinisherDamage.toLocaleString()} TOTAL DAMAGE! ${boss.name} has been permanently taken out and destroyed!`
    );

    // The Titans sacrifice their ancient life essence to deliver this blow
    this.killRound1000Titans('channeling all primordial essence into the ultimate finishing blow');

    if (this.onTitanLastBlow) {
      this.onTitanLastBlow(boss, colossusDamage, leviathanDamage);
    }

    return { boss, colossusDamage, leviathanDamage };
  }

  public getUnitAt(coord: GridCoord): Unit | null {
    if (!this.hero.isDead && this.hero.coord.x === coord.x && this.hero.coord.y === coord.y) {
      return this.hero;
    }
    if (this.coopHero && !this.coopHero.isDead && this.coopHero.coord.x === coord.x && this.coopHero.coord.y === coord.y) {
      return this.coopHero;
    }
    for (const ally of this.allies) {
      if (!ally.isDead && ally.coord.x === coord.x && ally.coord.y === coord.y) {
        return ally;
      }
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
    const isUsurped = this.isVoidOverlordZombieUsurpationActive();
    return [
      this.hero,
      ...(this.coopHero && !this.coopHero.isDead ? [this.coopHero] : []),
      ...this.allies.filter((a) => !a.isDead && a.faction === 'Player'),
      ...(isUsurped ? [] : this.zombies.filter((z) => !z.isDead && z.faction === 'Player')),
      ...this.lifeBeings.filter((b) => !b.isDead && b.faction === 'Player'),
    ];
  }

  public spawnZombie(
    coord: GridCoord,
    baseHp: number,
    baseAp: number,
    faction: UnitFaction = 'Player',
    forcedClass?: ZombieClass,
    forceOverride: boolean = false
  ): Unit {
    let effectiveFaction = faction;
    let wasUsurped = false;
    if (effectiveFaction === 'Player' && this.isVoidOverlordZombieUsurpationActive()) {
      effectiveFaction = 'Enemy';
      wasUsurped = true;
    }

    const tile = this.grid.getTile(coord);
    const hazardType: TileHazardType = tile ? tile.hazard.type : 'None';

    let zClass: ZombieClass = 'Walker';

    if (forcedClass) {
      if (forceOverride) {
        zClass = forcedClass;
      } else {
        const allowedHazards = ZOMBIE_CLASS_FLOOR_REQUIREMENTS[forcedClass] || ['None'];
        if (allowedHazards.includes(hazardType)) {
          zClass = forcedClass;
        } else {
          // If tile does not meet floor requirements, adapt to tile hazard or fallback to Walker
          const fallbackClass = (hazardType !== 'None' && HAZARD_TO_ZOMBIE_CLASS[hazardType])
            ? HAZARD_TO_ZOMBIE_CLASS[hazardType]!
            : 'Walker';
          this.addLog(
            'system',
            `⚠️ ${forcedClass} Zombie requires ${allowedHazards.join(' or ')} on the floor! The tile has ${hazardType}, so a ${fallbackClass} Zombie was raised instead.`
          );
          zClass = fallbackClass;
        }
      }
    } else {
      // Natural emergence determined by floor condition on the tile:
      if (hazardType !== 'None' && HAZARD_TO_ZOMBIE_CLASS[hazardType]) {
        zClass = HAZARD_TO_ZOMBIE_CLASS[hazardType]!;
      } else {
        // Normal clean ground
        // 1 out of 10,000 to tear a miraculous Void Rift and rise as a Wizard Zombie!
        const roll = Math.random();
        if (roll < 0.0001) {
          zClass = 'Wizard';
          this.hazardManager.applyHazard(coord, 'VoidRift', 5, 20, 'Void');
          this.addLog(
            'system',
            '🌌 An abyssal void rift tore open on the floor! A legendary Wizard Zombie emerges from the Nether!'
          );
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
      faction: effectiveFaction,
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
      isVoidUsurped: wasUsurped,
    };

    if (zClass === 'Frostbite') {
      this.addLog('system', `❄️ An icy Frostbite Zombie condensed and rose from the frost on the floor!`);
    } else if (zClass === 'Boomer') {
      this.addLog('system', `💣 A volatile Boomer Zombie ignited and rose from the searing flames on the floor!`);
    } else if (zClass === 'Electro') {
      this.addLog('system', `⚡ An electrified Electro Zombie materialized from the energized puddle on the floor!`);
    } else if (zClass === 'PlagueBearer') {
      this.addLog('system', `🦠 A diseased Plague Bearer Zombie festered and rose from the toxic mire on the floor!`);
    } else if (zClass === 'Spitter') {
      this.addLog('system', `🧪 A caustic Spitter Zombie dissolved and rose from the acid pool on the floor!`);
    } else if (zClass === 'Wizard') {
      this.addLog('system', `🌌 A legendary Wizard Zombie emerged from the abyssal void rift on the floor!`);
    } else if (zClass === 'DeathKnight') {
      this.addLog('system', `⚔️ An armored Death Knight Zombie assembled and rose from the bone pile on the floor!`);
    } else if (zClass === 'Brute') {
      this.addLog('system', `🛡️ A colossal Brute Zombie solidified and rose from the heavy mud on the floor!`);
    } else if (zClass === 'Runner') {
      this.addLog('system', `🌊 A swift Runner Zombie surged and rose from the slick puddle on the floor!`);
    } else if (zClass === 'Screamer') {
      this.addLog('system', `😱 A shrieking Screamer Zombie resonated and rose from the crystal spikes on the floor!`);
    } else {
      this.addLog('system', `🧟 A standard Reanimated Zombie rose from the ground!`);
    }

    if (wasUsurped) {
      this.addLog(
        'reaction',
        `🌌 [VOID DOMINION] The Void Overlord usurped this zombie instantly! It refuses your command and joins the Void Overlord's ranks!`
      );
    }

    this.zombies.push(zombie);
    this.onZombieSpawn?.(zombie);
    return zombie;
  }

  public executeMassResurrection(
    _caster?: Unit,
    _targetCoord?: GridCoord
  ): { clearedWalls: number; clearedFloor: number; resurrectedCount: number } {
    // 1. Clear all walls, obstacles, and ground hazards on the floor across the entire arena
    const { clearedWalls, clearedFloor } = this.grid.clearWallsAndFloor();

    // 2. Revive hero or coop hero if fallen
    if (this.hero.isDead) {
      this.hero.isDead = false;
      this.hero.stats.currentHp = this.hero.stats.maxHp;
    }
    if (this.coopHero && this.coopHero.isDead) {
      this.coopHero.isDead = false;
      this.coopHero.stats.currentHp = this.coopHero.stats.maxHp;
    }

    // 3. User requested: DO NOT summon zombies!
    // No zombie minions are spawned on the battlefield.

    this.addLog(
      'system',
      `👑 ADMIN POWER: Mass Resurrection shattered & cleared ${clearedWalls} walls and removed ${clearedFloor} hazards from the floor!`
    );

    return { clearedWalls, clearedFloor, resurrectedCount: 0 };
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
        // Native floor hazard immunity: zombies thrive in their native floor condition
        if (unit.zombieClass && ZOMBIE_CLASS_FLOOR_REQUIREMENTS[unit.zombieClass]?.includes(tile.hazard.type)) {
          hazardDmg = 0;
        } else {
          const maxPerHit = Math.max(1, Math.floor(unit.stats.maxHp * 0.5));
          hazardDmg = Math.min(hazardDmg, maxPerHit);
          if (unit.stats.currentHp === unit.stats.maxHp && hazardDmg >= unit.stats.currentHp) {
            hazardDmg = unit.stats.currentHp - 1;
          }
        }
      }

      if (hazardDmg > 0) {
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
          if (unit.faction === 'Enemy') {
            this.performance.enemiesKilled += 1;
            const essenceDrop = unit.isBoss ? 150 : 25;
            this.performance.earnedEssence = (this.performance.earnedEssence || 0) + essenceDrop;
            this.addLog('system', `🔮 Harvested +${essenceDrop} Essence from ${unit.name}!`);
            if (this.onEssenceEarned) {
              this.onEssenceEarned(essenceDrop, unit.coord);
            }
            const elemAffinity = unit.stats.elementalAffinity;
            if (elemAffinity && elemAffinity !== 'Neutral' && elemAffinity !== 'Admin') {
              const elemDrop = unit.isBoss ? 2 : 1;
              this.addLog('system', `✨ Harvested +${elemDrop}x ${elemAffinity} Essence from ${unit.name}!`);
              if (this.onElementalEssenceEarned) {
                this.onElementalEssenceEarned(elemAffinity, elemDrop, unit.coord);
              }
            }
            if (unit.isBoss || Math.random() < 0.35) {
              const relic = this.getRandomRelic();
              this.spawnRelicDrop(unit.coord, relic);
              this.addLog('system', `✨ ${unit.name} dropped an ancient relic: [${relic.name}]!`);
            }
          }
        }
      } else if (unit.isZombie && unit.zombieClass && ZOMBIE_CLASS_FLOOR_REQUIREMENTS[unit.zombieClass]?.includes(tile.hazard.type)) {
        this.addLog(
          'system',
          `🧟 ${unit.name} is immune to native floor condition ${tile.hazard.type}!`
        );
      }
    }

    // Check if player stepped onto a relic drop
    if (unit.faction === 'Player' && tile && tile.relic) {
      const relic = tile.relic;
      tile.relic = undefined;
      this.collectRelic(unit, relic);
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

    const isMassRes =
      ability.id === 'admin_mass_resurrection' ||
      ability.name.toLowerCase() === 'mass resurrection';

    if (!isMassRes) {
      const dist = this.grid.manhattanDistance(caster.coord, targetCoord);
      if (dist > ability.range && ability.targeting !== 'Self') return { success: false, message: 'Target out of range.' };

      if (ability.targeting !== 'Self' && !this.grid.hasLineOfSight(caster.coord, targetCoord)) {
        return { success: false, message: 'Line of sight blocked by obstacle.' };
      }
    }

    // Deduct AP and set cooldown
    caster.stats.currentAp -= ability.apCost;
    ability.currentCooldown = ability.cooldown;

    this.addLog(
      caster.faction === 'Player' ? 'player' : 'enemy',
      `${caster.name} casts ${ability.name} (${ability.element})!`
    );

    // 0. Special Ability: Mass Resurrection (Admin Power: Clears all walls & raises allied minions)
    if (
      ability.id === 'admin_mass_resurrection' ||
      ability.name.toLowerCase() === 'mass resurrection'
    ) {
      this.executeMassResurrection(caster, targetCoord);
      return { success: true };
    }

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
            if (unit && unit.isZombie && !unit.isBoss && !unit.isDead) {
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
        if (zUnit && zUnit.isZombie && !zUnit.isBoss && !zUnit.isDead) {
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
                  if (affectedUnit.isZombie && !affectedUnit.isBoss && !visited.has(`${nc.x},${nc.y}`)) {
                    queue.push(nc);
                  } else if (affectedUnit.faction !== caster.faction) {
                    if (affectedUnit.isBoss) {
                      this.addLog(
                        'system',
                        `🛡️ [BOSS IMMUNITY] ${affectedUnit.name} is a Boss and completely unaffected by the Life blast!`
                      );
                      continue;
                    }
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
        if (targetUnit.isBoss) {
          this.addLog(
            'system',
            `🛡️ [BOSS IMMUNITY] ${targetUnit.name} is a Boss and cannot be transmuted!`
          );
          return { success: false, message: 'Bosses are unaffected.' };
        }
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
        // BOSS IMMUNITY: Bosses are completely unaffected by Zombies and Beings of Life!
        if (targetUnit.isBoss && (caster.isZombie || caster.isLifeBeing)) {
          this.addLog(
            'system',
            `🛡️ [BOSS IMMUNITY] ${targetUnit.name} is a Boss and completely unaffected by ${caster.name}!`
          );
          continue;
        }

        // Calculate affinity damage
        let finalDamage = this.matrix.calculateDamage(
          ability.baseDamage,
          ability.element,
          targetUnit.stats.elementalAffinity
        );

        // Apply Essence Resonance power scaling (+15% per Level, +5% per 100 Essence)
        if (finalDamage > 0 && this.getEssenceResonanceMultiplier) {
          const mult = this.getEssenceResonanceMultiplier(caster);
          if (mult > 1) {
            finalDamage = Math.round(finalDamage * mult);
          }
        }

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

        // 1 in 5 (20%) chance the target panics and flees when attacked by a Zombie (unless Rooted to the spot or Boss!)
        if (caster.isZombie && targetUnit.faction !== caster.faction && !targetUnit.isDead && !targetUnit.isBoss) {
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

          // If target is Void Overlord on Round 1000 and Titans are present, trigger Titans' decisive last blow!
          if (
            (targetUnit.id === 'boss_void_overlord_r1000' || (targetUnit.isBoss && this.currentRound === 1000)) &&
            !(targetUnit as any).titanLastBlowDelivered &&
            this.allies.some(
              (a) =>
                !a.isDead &&
                (a.id.includes('colossus') ||
                  a.id.includes('leviathan') ||
                  a.name.toLowerCase().includes('colossus') ||
                  a.name.toLowerCase().includes('leviathan'))
            )
          ) {
            this.triggerTitanFinalBlow(targetUnit);
          } else {
            this.addLog('system', `☠️ ${targetUnit.name} has been defeated!`);
          }

          if (targetUnit.faction === 'Enemy') {
            this.performance.enemiesKilled += 1;
            const essenceDrop = targetUnit.isBoss ? 150 : 25;
            this.performance.earnedEssence = (this.performance.earnedEssence || 0) + essenceDrop;
            this.addLog('system', `🔮 Harvested +${essenceDrop} Essence from ${targetUnit.name}!`);
            if (this.onEssenceEarned) {
              this.onEssenceEarned(essenceDrop, targetUnit.coord);
            }
            const elemAffinity = targetUnit.stats.elementalAffinity;
            if (elemAffinity && elemAffinity !== 'Neutral' && elemAffinity !== 'Admin') {
              const elemDrop = targetUnit.isBoss ? 2 : 1;
              this.addLog('system', `✨ Harvested +${elemDrop}x ${elemAffinity} Essence from ${targetUnit.name}!`);
              if (this.onElementalEssenceEarned) {
                this.onElementalEssenceEarned(elemAffinity, elemDrop, targetUnit.coord);
              }
            }
            if (targetUnit.isBoss || Math.random() < 0.35) {
              const relic = this.getRandomRelic();
              this.spawnRelicDrop(targetUnit.coord, relic);
              this.addLog('system', `✨ ${targetUnit.name} dropped an ancient relic: [${relic.name}]!`);
            }
          }

          // --- NECROMANCER REANIMATION MECHANIC ---
          // Bosses can NEVER be turned into Zombies!
          if (!targetUnit.isBoss) {
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
          }
        } else if (caster.isZombie && targetUnit.faction !== caster.faction && !targetUnit.isDead && !targetUnit.isBoss) {
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

  public areAllHeroesDead(): boolean {
    if (this.coopHero) {
      return this.hero.isDead && this.coopHero.isDead;
    }
    return this.hero.isDead;
  }

  public resetRoundState(): void {
    // Collect any remaining relics on the battlefield before advancing
    this.vacuumAllBoardRelics();

    // 1. Restore hero health and AP (mana) to full
    if (this.hero) {
      this.hero.isDead = false;
      this.hero.stats.currentHp = this.hero.stats.maxHp;
      this.hero.stats.currentAp = this.hero.stats.maxAp;
      // 2. Clear all status effects on hero
      this.statusManager.clearStatusEffects(this.hero);
      // 3. Reset all ability cooldowns
      this.hero.abilities?.forEach((ability) => {
        ability.currentCooldown = 0;
      });
    }

    if (this.coopHero) {
      this.coopHero.isDead = false;
      this.coopHero.stats.currentHp = this.coopHero.stats.maxHp;
      this.coopHero.stats.currentAp = this.coopHero.stats.maxAp;
      this.statusManager.clearStatusEffects(this.coopHero);
      this.coopHero.abilities?.forEach((ability) => {
        ability.currentCooldown = 0;
      });
    }

    // 4. Clear all hazards from the battlefield
    this.hazardManager?.clearAllHazards();

    // 5. Clear summons, allies, and pending reanimations
    this.allies = [];
    this.zombies = [];
    this.lifeBeings = [];
    this.pendingReanimations = [];

    this.addLog(
      'system',
      this.coopHero
        ? '✨ Round completed! Heroes restored to full Health & AP, cooldowns reset, and hazards cleared.'
        : '✨ Round completed! Hero restored to full Health & AP, cooldowns reset, and hazards cleared.'
    );
  }

  public getRandomRelic(): PassiveRelic {
    const template = BATTLE_RELIC_POOL[Math.floor(Math.random() * BATTLE_RELIC_POOL.length)];
    return {
      ...template,
      applied: false,
    };
  }

  public spawnRelicDrop(coord: GridCoord, relic?: PassiveRelic): boolean {
    const tile = this.grid.getTile(coord);
    const dropRelic = relic || this.getRandomRelic();

    if (!tile || tile.isObstacle) {
      const neighbors = this.grid.getNeighbors(coord);
      for (const n of neighbors) {
        const neighborTile = this.grid.getTile(n);
        if (neighborTile && !neighborTile.isObstacle && !neighborTile.relic) {
          neighborTile.relic = dropRelic;
          if (this.onRelicSpawned) this.onRelicSpawned(dropRelic, n);
          return true;
        }
      }
      return false;
    }

    tile.relic = dropRelic;
    if (this.onRelicSpawned) this.onRelicSpawned(dropRelic, coord);
    return true;
  }

  public collectRelic(hero: Unit, relic: PassiveRelic): Ability | null {
    if (!hero || hero.isDead) return null;

    relic.applied = true;
    if (typeof relic.effect === 'function') {
      relic.effect(hero);
    }

    // Unlock next elemental power
    let newlyUnlockedAbility: Ability | null = null;
    if (hero.stats.elementalAffinity !== 'Admin' && hero.abilities && hero.abilities.length < 10) {
      const config = HERO_CLASSES[hero.stats.elementalAffinity] || HERO_CLASSES.Fire;
      const fullAbilities = config.abilities.slice(0, 10);
      const ordered = getOrderedWeakestAbilities(fullAbilities);
      const nextAb = ordered.find((candidate) => !hero.abilities.some((a) => a.id === candidate.id));
      if (nextAb) {
        newlyUnlockedAbility = { ...nextAb, currentCooldown: 0 };
        hero.abilities.push(newlyUnlockedAbility);
      }
    }

    // Strictly enforce 10 powers maximum cap
    if (hero.stats.elementalAffinity !== 'Admin' && hero.abilities && hero.abilities.length > 10) {
      hero.abilities = hero.abilities.slice(0, 10);
    }

    const moveCount = hero.abilities ? hero.abilities.length : 0;
    const unlockMsg = newlyUnlockedAbility
      ? ` & Unlocked new ${hero.stats.elementalAffinity} power: [${newlyUnlockedAbility.name}]!`
      : '';
    this.addLog(
      'system',
      `✨ [RELIC COLLECTED] ${hero.name} gathered ${relic.name}! ${relic.description}${unlockMsg} (${Math.min(10, moveCount)}/10 Powers Active)`
    );

    if (this.onRelicCollected) {
      this.onRelicCollected(relic, hero, newlyUnlockedAbility || undefined);
    }

    return newlyUnlockedAbility;
  }

  public vacuumAllBoardRelics(hero?: Unit): void {
    const targetHero = hero || this.hero;
    if (!targetHero) return;

    for (let y = 0; y < this.grid.size; y++) {
      for (let x = 0; x < this.grid.size; x++) {
        const tile = this.grid.getTile({ x, y });
        if (tile && tile.relic) {
          const relic = tile.relic;
          tile.relic = undefined;
          this.collectRelic(targetHero, relic);
        }
      }
    }
  }
}
