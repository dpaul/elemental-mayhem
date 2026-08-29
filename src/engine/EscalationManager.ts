// Elemental Mayhem - 3-Round Escalation Manager
import { Unit, Ability, PassiveRelic } from '../types';

export class EscalationManager {
  public generateRoundEnemies(round: number): Unit[] {
    const enemies: Unit[] = [];

    if (round === 1) {
      enemies.push({
        id: 'enemy_r1_1',
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
            id: 'venom_spit',
            name: 'Venom Spit',
            element: 'Poison',
            icon: '🧪',
            apCost: 2,
            cooldown: 0,
            currentCooldown: 0,
            range: 3,
            aoeRadius: 0,
            targeting: 'SingleUnit',
            baseDamage: 16,
            appliesStatus: 'Poisoned',
            statusDuration: 3,
            createsHazard: 'ToxicMire',
            hazardDuration: 2,
            description: 'Spits corrosive venom.',
            level: 1,
          },
        ],
        statusEffects: [],
        isDead: false,
      });

      enemies.push({
        id: 'enemy_r1_2',
        name: 'Earth Sentinel',
        faction: 'Enemy',
        avatar: '🪨',
        coord: { x: 7, y: 7 },
        stats: {
          maxHp: 55,
          currentHp: 55,
          maxAp: 3,
          currentAp: 3,
          moveCostPerTile: 1,
          elementalAffinity: 'Earth',
        },
        abilities: [
          {
            id: 'stone_strike',
            name: 'Stone Strike',
            element: 'Earth',
            icon: '🪨',
            apCost: 2,
            cooldown: 0,
            currentCooldown: 0,
            range: 2,
            aoeRadius: 0,
            targeting: 'SingleUnit',
            baseDamage: 20,
            description: 'Strikes with hardened earth.',
            level: 1,
          },
        ],
        statusEffects: [],
        isDead: false,
      });
    } else if (round === 2) {
      enemies.push({
        id: 'enemy_r2_1',
        name: 'Pyroclast Sorcerer',
        faction: 'Enemy',
        avatar: '🔥',
        coord: { x: 8, y: 2 },
        stats: {
          maxHp: 60,
          currentHp: 60,
          maxAp: 5,
          currentAp: 5,
          moveCostPerTile: 1,
          elementalAffinity: 'Fire',
        },
        abilities: [
          {
            id: 'combustion_beam',
            name: 'Combustion Beam',
            element: 'Fire',
            icon: '🔥',
            apCost: 2,
            cooldown: 0,
            currentCooldown: 0,
            range: 4,
            aoeRadius: 0,
            targeting: 'SingleUnit',
            baseDamage: 24,
            appliesStatus: 'Burning',
            statusDuration: 3,
            createsHazard: 'Burning',
            hazardDuration: 2,
            description: 'Lethal beam of flame.',
            level: 2,
          },
        ],
        statusEffects: [],
        isDead: false,
      });

      enemies.push({
        id: 'enemy_r2_2',
        name: 'Hydrokinetic Monk',
        faction: 'Enemy',
        avatar: '💧',
        coord: { x: 7, y: 5 },
        stats: {
          maxHp: 55,
          currentHp: 55,
          maxAp: 4,
          currentAp: 4,
          moveCostPerTile: 1,
          elementalAffinity: 'Water',
        },
        abilities: [
          {
            id: 'tidal_surge',
            name: 'Tidal Surge',
            element: 'Water',
            icon: '💧',
            apCost: 2,
            cooldown: 0,
            currentCooldown: 0,
            range: 3,
            aoeRadius: 0,
            targeting: 'SingleUnit',
            baseDamage: 22,
            appliesStatus: 'Wet',
            statusDuration: 3,
            createsHazard: 'Puddle',
            hazardDuration: 3,
            description: 'Surging wave of pressurized water.',
            level: 2,
          },
        ],
        statusEffects: [],
        isDead: false,
      });

      enemies.push({
        id: 'enemy_r2_3',
        name: 'Storm Invoker',
        faction: 'Enemy',
        avatar: '⚡',
        coord: { x: 8, y: 8 },
        stats: {
          maxHp: 50,
          currentHp: 50,
          maxAp: 5,
          currentAp: 5,
          moveCostPerTile: 1,
          elementalAffinity: 'Lightning',
        },
        abilities: [
          {
            id: 'arc_discharge',
            name: 'Arc Discharge',
            element: 'Lightning',
            icon: '⚡',
            apCost: 3,
            cooldown: 0,
            currentCooldown: 0,
            range: 5,
            aoeRadius: 0,
            targeting: 'SingleUnit',
            baseDamage: 30,
            appliesStatus: 'Shocked',
            statusDuration: 2,
            description: 'Discharges chaining lightning.',
            level: 2,
          },
        ],
        statusEffects: [],
        isDead: false,
      });
    } else if (round === 3) {
      // BOSS ROUND: The Void Archon
      enemies.push({
        id: 'boss_void_archon',
        name: 'THE VOID ARCHON (Boss)',
        faction: 'Enemy',
        avatar: '👑',
        coord: { x: 8, y: 5 },
        stats: {
          maxHp: 180,
          currentHp: 180,
          maxAp: 6,
          currentAp: 6,
          moveCostPerTile: 1,
          elementalAffinity: 'Void',
        },
        abilities: [
          {
            id: 'cosmic_singularity',
            name: 'Cosmic Singularity',
            element: 'Void',
            icon: '🌌',
            apCost: 3,
            cooldown: 0,
            currentCooldown: 0,
            range: 5,
            aoeRadius: 1,
            targeting: 'SingleUnit',
            baseDamage: 35,
            appliesStatus: 'VoidMarked',
            statusDuration: 3,
            createsHazard: 'VoidRift',
            hazardDuration: 3,
            description: 'Tears a hole in reality, causing massive void rupture.',
            level: 3,
          },
          {
            id: 'nether_pulse',
            name: 'Nether Pulse',
            element: 'Void',
            icon: '🟣',
            apCost: 2,
            cooldown: 0,
            currentCooldown: 0,
            range: 4,
            aoeRadius: 0,
            targeting: 'SingleUnit',
            baseDamage: 25,
            description: 'Concentrated beam of anti-matter.',
            level: 3,
          },
        ],
        statusEffects: [],
        isDead: false,
        isBoss: true,
      });

      enemies.push({
        id: 'boss_minion_1',
        name: 'Void Shadow',
        faction: 'Enemy',
        avatar: '👻',
        coord: { x: 7, y: 2 },
        stats: {
          maxHp: 40,
          currentHp: 40,
          maxAp: 4,
          currentAp: 4,
          moveCostPerTile: 1,
          elementalAffinity: 'Void',
        },
        abilities: [
          {
            id: 'shadow_lash',
            name: 'Shadow Lash',
            element: 'Void',
            icon: '🖤',
            apCost: 2,
            cooldown: 0,
            currentCooldown: 0,
            range: 3,
            aoeRadius: 0,
            targeting: 'SingleUnit',
            baseDamage: 18,
            description: 'Lashes with dark tendrils.',
            level: 2,
          },
        ],
        statusEffects: [],
        isDead: false,
      });
    }

    return enemies;
  }

  public getAvailableUpgrades(): {
    abilities: Ability[];
    relics: PassiveRelic[];
  } {
    const abilities: Ability[] = [
      {
        id: 'toxic_cloud',
        name: 'Toxic Cloud',
        element: 'Poison',
        icon: '🧪',
        apCost: 2,
        cooldown: 1,
        currentCooldown: 0,
        range: 4,
        aoeRadius: 1,
        targeting: 'SingleUnit',
        baseDamage: 22,
        appliesStatus: 'Poisoned',
        statusDuration: 3,
        createsHazard: 'ToxicMire',
        hazardDuration: 3,
        description: 'Blasts an area with toxic spores.',
        level: 1,
      },
      {
        id: 'tectonic_quake',
        name: 'Tectonic Quake',
        element: 'Earth',
        icon: '🪨',
        apCost: 3,
        cooldown: 1,
        currentCooldown: 0,
        range: 4,
        aoeRadius: 1,
        targeting: 'SingleUnit',
        baseDamage: 30,
        appliesStatus: 'Rooted',
        statusDuration: 2,
        description: 'Shatters the ground, rooting enemies.',
        level: 1,
      },
      {
        id: 'void_rupture',
        name: 'Void Rupture',
        element: 'Void',
        icon: '🌌',
        apCost: 3,
        cooldown: 1,
        currentCooldown: 0,
        range: 5,
        aoeRadius: 1,
        targeting: 'SingleUnit',
        baseDamage: 38,
        appliesStatus: 'VoidMarked',
        statusDuration: 3,
        description: 'Ruptures reality for entropic burst.',
        level: 1,
      },
    ];

    const relics: PassiveRelic[] = [
      {
        id: 'arcane_battery',
        name: 'Arcane Battery',
        icon: '🔋',
        description: '+2 Max Action Points per turn',
        costEssence: 40,
        costXp: 50,
        applied: false,
        effect: (hero: Unit) => {
          hero.stats.maxAp += 2;
          hero.stats.currentAp += 2;
        },
      },
      {
        id: 'vitality_crystal',
        name: 'Vitality Crystal',
        icon: '💎',
        description: '+40 Max HP and restores full health',
        costEssence: 35,
        costXp: 40,
        applied: false,
        effect: (hero: Unit) => {
          hero.stats.maxHp += 40;
          hero.stats.currentHp = hero.stats.maxHp;
        },
      },
      {
        id: 'elemental_prism',
        name: 'Elemental Prism',
        icon: '🔮',
        description: 'Reduces AP cost of all spells by 1 (min 1)',
        costEssence: 60,
        costXp: 75,
        applied: false,
        effect: (hero: Unit) => {
          hero.abilities.forEach((a) => {
            a.apCost = Math.max(1, a.apCost - 1);
          });
        },
      },
    ];

    return { abilities, relics };
  }
}
