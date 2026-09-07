// Elemental Mayhem - Arena Builder & Entity Placement Engine
import {
  GridCoord,
  Unit,
  ElementType,
  PlacementCategory,
  PlacementItem,
} from '../types';
import { Grid } from './Grid';
import { TileHazardManager } from './TileHazardManager';
import { CombatEngine } from './CombatEngine';
import { HERO_CLASSES } from '../constants/classes';

export class PlacementManager {
  private items: Map<string, PlacementItem> = new Map();

  constructor() {
    this.initCatalog();
  }

  private initCatalog(): void {
    // ==========================================
    // 1. WALLS & BARRIERS
    // ==========================================
    const walls: PlacementItem[] = [
      {
        id: 'wall_rock',
        name: 'Rock Pillar',
        category: 'wall',
        icon: '🪨',
        color: '#94a3b8',
        description: 'Impassable granite stone pillar.',
        wallConfig: { name: 'Rock Pillar', icon: '🪨', description: 'Impassable granite stone pillar.' },
      },
      {
        id: 'wall_obsidian',
        name: 'Obsidian Monolith',
        category: 'wall',
        icon: '⬛',
        color: '#64748b',
        description: 'Dense, indestructible volcanic glass.',
        wallConfig: { name: 'Obsidian Monolith', icon: '⬛', description: 'Dense volcanic glass barrier.' },
      },
      {
        id: 'wall_crystal',
        name: 'Crystal Barrier',
        category: 'wall',
        icon: '💎',
        color: '#38bdf8',
        description: 'Resonant arcane crystalline formation.',
        wallConfig: { name: 'Crystal Barrier', icon: '💎', description: 'Arcane crystal formation.' },
      },
      {
        id: 'wall_iron',
        name: 'Iron Barricade',
        category: 'wall',
        icon: '🛡️',
        color: '#cbd5e1',
        description: 'Fortified military barricade.',
        wallConfig: { name: 'Iron Barricade', icon: '🛡️', description: 'Fortified barricade.' },
      },
      {
        id: 'wall_obelisk',
        name: 'Ancient Obelisk',
        category: 'wall',
        icon: '🗿',
        color: '#f59e0b',
        description: 'Ancient titan relic standing sentinel.',
        wallConfig: { name: 'Ancient Obelisk', icon: '🗿', description: 'Ancient titan relic pillar.' },
      },
      {
        id: 'wall_wood',
        name: 'Wooden Barricade',
        category: 'wall',
        icon: '🪵',
        color: '#b45309',
        description: 'Reinforced timber obstacle.',
        wallConfig: { name: 'Wooden Barricade', icon: '🪵', description: 'Reinforced timber obstacle.' },
      },
    ];
    walls.forEach((w) => this.items.set(w.id, w));

    // ==========================================
    // 2. TILE HAZARDS
    // ==========================================
    const hazards: PlacementItem[] = [
      {
        id: 'hazard_burning',
        name: 'Burning Ground',
        category: 'hazard',
        icon: '🔥',
        element: 'Fire',
        color: '#ef4444',
        description: 'Scorching fire (15 Fire dmg/turn, 3 turns).',
        hazardConfig: { type: 'Burning', duration: 3, damage: 15, element: 'Fire' },
      },
      {
        id: 'hazard_lava',
        name: 'Lava Pool',
        category: 'hazard',
        icon: '🌋',
        element: 'Fire',
        color: '#dc2626',
        description: 'Molten magma (25 Fire dmg/turn, 4 turns).',
        hazardConfig: { type: 'LavaPool', duration: 4, damage: 25, element: 'Fire' },
      },
      {
        id: 'hazard_puddle',
        name: 'Water Puddle',
        category: 'hazard',
        icon: '💧',
        element: 'Water',
        color: '#38bdf8',
        description: 'Wet puddle (conducts shock, extinguishes fire, 3 turns).',
        hazardConfig: { type: 'Puddle', duration: 3, damage: 0, element: 'Water' },
      },
      {
        id: 'hazard_electrified',
        name: 'Electrified Puddle',
        category: 'hazard',
        icon: '⚡',
        element: 'Lightning',
        color: '#fde047',
        description: 'Surging shock pool (18 Lightning dmg/turn, 3 turns).',
        hazardConfig: { type: 'ElectrifiedPuddle', duration: 3, damage: 18, element: 'Lightning' },
      },
      {
        id: 'hazard_toxic',
        name: 'Toxic Mire',
        category: 'hazard',
        icon: '🧪',
        element: 'Poison',
        color: '#22c55e',
        description: 'Corrosive poison slime (14 Poison dmg/turn, 3 turns).',
        hazardConfig: { type: 'ToxicMire', duration: 3, damage: 14, element: 'Poison' },
      },
      {
        id: 'hazard_void',
        name: 'Void Rift',
        category: 'hazard',
        icon: '🌌',
        element: 'Void',
        color: '#d946ef',
        description: 'Spatial tear causing disintegration (22 Void dmg/turn, 3 turns).',
        hazardConfig: { type: 'VoidRift', duration: 3, damage: 22, element: 'Void' },
      },
      {
        id: 'hazard_ice',
        name: 'Ice Surface',
        category: 'hazard',
        icon: '❄️',
        element: 'Ice',
        color: '#67e8f9',
        description: 'Slick frozen floor (Freezes wet units, 3 turns).',
        hazardConfig: { type: 'IceSurface', duration: 3, damage: 0, element: 'Ice' },
      },
      {
        id: 'hazard_acid',
        name: 'Acid Pool',
        category: 'hazard',
        icon: '☣️',
        element: 'Poison',
        color: '#84cc16',
        description: 'Fuming acid pool (20 Acid dmg/turn, 3 turns).',
        hazardConfig: { type: 'AcidPool', duration: 3, damage: 20, element: 'Poison' },
      },
      {
        id: 'hazard_crystal_spikes',
        name: 'Crystal Spikes',
        category: 'hazard',
        icon: '💎',
        element: 'Earth',
        color: '#a855f7',
        description: 'Jagged earthen spikes (16 Earth dmg/turn, 3 turns).',
        hazardConfig: { type: 'CrystalSpikes', duration: 3, damage: 16, element: 'Earth' },
      },
      {
        id: 'hazard_bone_pile',
        name: 'Bone Pile',
        category: 'hazard',
        icon: '🦴',
        element: 'Undead',
        color: '#94a3b8',
        description: 'Charnel bones for necromantic summons (4 turns).',
        hazardConfig: { type: 'BonePile', duration: 4, damage: 0, element: 'Undead' },
      },
    ];
    hazards.forEach((h) => this.items.set(h.id, h));

    // ==========================================
    // 3. ERASER TOOL
    // ==========================================
    this.items.set('tool_eraser', {
      id: 'tool_eraser',
      name: 'Tile Eraser',
      category: 'eraser',
      icon: '🧹',
      color: '#f43f5e',
      description: 'Clear any enemy, wall, or hazard on the clicked tile.',
    });

    // ==========================================
    // 4. ENEMIES: ELEMENTAL DUMMIES
    // ==========================================
    const dummyTypes: { elem: ElementType; icon: string; color: string; hp: number }[] = [
      { elem: 'Neutral', icon: '🎯', color: '#94a3b8', hp: 300 },
      { elem: 'Water', icon: '💧', color: '#38bdf8', hp: 300 },
      { elem: 'Fire', icon: '🔥', color: '#ef4444', hp: 300 },
      { elem: 'Ice', icon: '❄️', color: '#67e8f9', hp: 300 },
      { elem: 'Lightning', icon: '⚡', color: '#eab308', hp: 300 },
      { elem: 'Earth', icon: '🪨', color: '#ca8a04', hp: 300 },
      { elem: 'Poison', icon: '🧪', color: '#22c55e', hp: 300 },
      { elem: 'Void', icon: '🌌', color: '#a855f7', hp: 300 },
      { elem: 'Titan', icon: '🦾', color: '#d97706', hp: 5000 },
    ];

    dummyTypes.forEach((d) => {
      const isColossal = d.hp >= 1000;
      const id = `dummy_${d.elem.toLowerCase()}${isColossal ? '_colossal' : ''}`;
      const name = isColossal ? `Colossal ${d.elem} Dummy` : `${d.elem} Dummy`;
      this.items.set(id, {
        id,
        name,
        category: 'enemy',
        subcategory: 'dummy',
        icon: d.icon,
        element: d.elem,
        color: d.color,
        hp: d.hp,
        description: `Elemental target dummy with ${d.hp} HP (${d.elem} affinity).`,
        enemyFactory: (coord: GridCoord) => this.createDummy(d.elem, d.hp, coord, name, d.icon),
      });
    });

    // ==========================================
    // 5. ENEMIES: CAMPAIGN MONSTERS & CHOSEN
    // ==========================================
    const campaignEnemies: {
      id: string;
      name: string;
      avatar: string;
      element: ElementType;
      color: string;
      hp: number;
      ap: number;
      desc: string;
      abilityName: string;
      damage: number;
      range: number;
      hazard?: any;
    }[] = [
      {
        id: 'enemy_toxic_mire_adept',
        name: 'Toxic Mire Adept',
        avatar: '🧪',
        element: 'Poison',
        color: '#22c55e',
        hp: 45,
        ap: 4,
        desc: 'Poison caster that sprays toxic slime.',
        abilityName: 'Venom Spit',
        damage: 16,
        range: 3,
        hazard: { type: 'ToxicMire', duration: 2 },
      },
      {
        id: 'enemy_earth_sentinel',
        name: 'Earth Sentinel',
        avatar: '🪨',
        element: 'Earth',
        color: '#ca8a04',
        hp: 55,
        ap: 3,
        desc: 'Heavily armored stone guardian.',
        abilityName: 'Stone Strike',
        damage: 20,
        range: 2,
      },
      {
        id: 'enemy_pyroclast_sorcerer',
        name: 'Pyroclast Sorcerer',
        avatar: '🔥',
        element: 'Fire',
        color: '#ef4444',
        hp: 60,
        ap: 5,
        desc: 'Blazing sorcerer who launches incendiary beams.',
        abilityName: 'Combustion Beam',
        damage: 22,
        range: 4,
        hazard: { type: 'Burning', duration: 2 },
      },
      {
        id: 'enemy_hydrokinetic_monk',
        name: 'Hydrokinetic Monk',
        avatar: '💧',
        element: 'Water',
        color: '#38bdf8',
        hp: 65,
        ap: 4,
        desc: 'Fluid martial artist commanding tidal waves.',
        abilityName: 'Tidal Surge',
        damage: 20,
        range: 3,
        hazard: { type: 'Puddle', duration: 2 },
      },
      {
        id: 'enemy_storm_invoker',
        name: 'Storm Invoker',
        avatar: '⚡',
        element: 'Lightning',
        color: '#eab308',
        hp: 70,
        ap: 5,
        desc: 'Electrifying spellcaster firing chain bolts.',
        abilityName: 'Arc Discharge',
        damage: 24,
        range: 4,
      },
      {
        id: 'enemy_frost_archer',
        name: 'Frost Archer',
        avatar: '🏹',
        element: 'Ice',
        color: '#67e8f9',
        hp: 75,
        ap: 4,
        desc: 'Marksman firing piercing ice arrows.',
        abilityName: 'Frost Arrow',
        damage: 24,
        range: 5,
      },
      {
        id: 'enemy_shadow_assassin',
        name: 'Shadow Assassin',
        avatar: '🌑',
        element: 'Darkness',
        color: '#9333ea',
        hp: 85,
        ap: 6,
        desc: 'Lethal stalker striking from the darkness.',
        abilityName: 'Shadow Strike',
        damage: 28,
        range: 2,
      },
      {
        id: 'enemy_void_reaper',
        name: 'Void Reaper',
        avatar: '🌌',
        element: 'Void',
        color: '#a855f7',
        hp: 95,
        ap: 5,
        desc: 'Entropic executioner slicing through reality.',
        abilityName: 'Void Scythe',
        damage: 32,
        range: 3,
      },
      {
        id: 'enemy_titan_guard',
        name: 'Titan Guard',
        avatar: '🗿',
        element: 'Titan',
        color: '#f59e0b',
        hp: 140,
        ap: 4,
        desc: 'Massive fortress guard with colossal endurance.',
        abilityName: 'Titan Shield Slam',
        damage: 26,
        range: 2,
      },
      {
        id: 'enemy_blood_cultist',
        name: 'Blood Cultist',
        avatar: '🩸',
        element: 'Blood',
        color: '#e11d48',
        hp: 110,
        ap: 4,
        desc: 'Sinister acolyte siphoning lifeforce.',
        abilityName: 'Siphon Life',
        damage: 25,
        range: 3,
      },
      {
        id: 'enemy_solar_priest',
        name: 'Solar Priest',
        avatar: '☀️',
        element: 'Light',
        color: '#fde047',
        hp: 105,
        ap: 5,
        desc: 'Radiant inquisitor channeling solar radiance.',
        abilityName: 'Holy Smite',
        damage: 28,
        range: 4,
      },
      {
        id: 'enemy_chrono_shifter',
        name: 'Chrono Shifter',
        avatar: '⏳',
        element: 'Time',
        color: '#38bdf8',
        hp: 115,
        ap: 6,
        desc: 'Temporal weaver distorting movement and flow.',
        abilityName: 'Temporal Warp',
        damage: 26,
        range: 4,
      },
    ];

    campaignEnemies.forEach((ce) => {
      this.items.set(ce.id, {
        id: ce.id,
        name: ce.name,
        category: 'enemy',
        subcategory: 'campaign',
        icon: ce.avatar,
        element: ce.element,
        color: ce.color,
        hp: ce.hp,
        description: `${ce.desc} (${ce.hp} HP, ${ce.element})`,
        enemyFactory: (coord: GridCoord) => ({
          id: `${ce.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: ce.name,
          faction: 'Enemy',
          avatar: ce.avatar,
          coord,
          stats: {
            maxHp: ce.hp,
            currentHp: ce.hp,
            maxAp: ce.ap,
            currentAp: ce.ap,
            moveCostPerTile: 1,
            elementalAffinity: ce.element,
          },
          abilities: [
            {
              id: `${ce.id}_ab1`,
              name: ce.abilityName,
              element: ce.element,
              icon: ce.avatar,
              apCost: 2,
              cooldown: 0,
              currentCooldown: 0,
              range: ce.range,
              aoeRadius: 0,
              targeting: 'SingleUnit',
              baseDamage: ce.damage,
              createsHazard: ce.hazard ? ce.hazard.type : 'None',
              hazardDuration: ce.hazard ? ce.hazard.duration : 0,
              description: `Standard combat ability of ${ce.name}.`,
              level: 1,
            },
          ],
          statusEffects: [],
          isDead: false,
        }),
      });
    });

    // ==========================================
    // 6. ENEMIES: UNDEAD LEGION & SUMMONS
    // ==========================================
    const undeadTypes: {
      id: string;
      name: string;
      avatar: string;
      zClass?: any;
      hp: number;
      ap: number;
      desc: string;
      elem: ElementType;
      color: string;
      isLifeBeing?: boolean;
    }[] = [
      { id: 'undead_walker', name: 'Walker Zombie', avatar: '🧟', zClass: 'Walker', hp: 100, ap: 4, desc: 'Relentless flesh-eating zombie walker.', elem: 'Undead', color: '#84cc16' },
      { id: 'undead_runner', name: 'Runner Zombie', avatar: '🏃', zClass: 'Runner', hp: 80, ap: 6, desc: 'Frenzied high-speed sprinter.', elem: 'Undead', color: '#a3e635' },
      { id: 'undead_brute', name: 'Brute Zombie', avatar: '🦍', zClass: 'Brute', hp: 200, ap: 3, desc: 'Heavy hulking behemoth.', elem: 'Undead', color: '#65a30d' },
      { id: 'undead_spitter', name: 'Spitter Zombie', avatar: '🤮', zClass: 'Spitter', hp: 90, ap: 4, desc: 'Ranged corrosive spit shooter.', elem: 'Poison', color: '#22c55e' },
      { id: 'undead_boomer', name: 'Boomer Zombie', avatar: '💣', zClass: 'Boomer', hp: 70, ap: 4, desc: 'Explosive bloated abomination.', elem: 'Fire', color: '#f97316' },
      { id: 'undead_frostbite', name: 'Frostbite Zombie', avatar: '❄️', zClass: 'Frostbite', hp: 120, ap: 4, desc: 'Sub-zero frozen corpse radiating chill.', elem: 'Ice', color: '#67e8f9' },
      { id: 'undead_death_knight', name: 'Death Knight', avatar: '⚔️', zClass: 'DeathKnight', hp: 240, ap: 5, desc: 'Heavily armored master of black steel.', elem: 'Undead', color: '#475569' },
      { id: 'undead_screamer', name: 'Screamer Zombie', avatar: '😱', zClass: 'Screamer', hp: 80, ap: 5, desc: 'Ear-splitting shriek that deafens opponents.', elem: 'Undead', color: '#f43f5e' },
      { id: 'undead_plague_bearer', name: 'Plague Bearer', avatar: '☣️', zClass: 'PlagueBearer', hp: 130, ap: 4, desc: 'Pestilence vector leaving toxic trails.', elem: 'Poison', color: '#4ade80' },
      { id: 'undead_electro', name: 'Electro Zombie', avatar: '⚡', zClass: 'Electro', hp: 110, ap: 5, desc: 'Electrocuted corpse pulsing high voltage.', elem: 'Lightning', color: '#fde047' },
      { id: 'undead_wizard', name: 'Wizard Zombie', avatar: '🧙‍♂️', zClass: 'Wizard', hp: 150, ap: 6, desc: 'Legendary undead mage casting binding curses.', elem: 'Undead', color: '#c084fc' },
      { id: 'summon_life_being', name: 'Being of Life', avatar: '🌿', isLifeBeing: true, hp: 120, ap: 5, desc: 'Rejuvenating spirit of pure vitality.', elem: 'Life', color: '#34d399' },
    ];

    undeadTypes.forEach((u) => {
      this.items.set(u.id, {
        id: u.id,
        name: u.name,
        category: 'enemy',
        subcategory: 'undead',
        icon: u.avatar,
        element: u.elem,
        color: u.color,
        hp: u.hp,
        description: `${u.desc} (${u.hp} HP)`,
        enemyFactory: (coord: GridCoord) => ({
          id: `${u.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: u.name,
          faction: 'Enemy',
          avatar: u.avatar,
          coord,
          isZombie: !u.isLifeBeing,
          zombieClass: u.zClass,
          isLifeBeing: u.isLifeBeing,
          stats: {
            maxHp: u.hp,
            currentHp: u.hp,
            maxAp: u.ap,
            currentAp: u.ap,
            moveCostPerTile: 1,
            elementalAffinity: u.elem,
          },
          abilities: [
            {
              id: `${u.id}_attack`,
              name: u.zClass === 'Wizard' ? 'Necrotic Binding' : 'Zombie Strike',
              element: u.elem,
              icon: u.avatar,
              apCost: 2,
              cooldown: 0,
              currentCooldown: 0,
              range: u.zClass === 'Wizard' ? 5 : 1,
              aoeRadius: 0,
              targeting: 'SingleUnit',
              baseDamage: u.zClass === 'Wizard' ? 28 : 22,
              appliesStatus: u.zClass === 'Wizard' ? 'Rooted' : undefined,
              statusDuration: 2,
              description: 'Attacks target unit.',
              level: 1,
            },
          ],
          statusEffects: [],
          isDead: false,
        }),
      });
    });

    // ==========================================
    // 7. ENEMIES: EPIC BOSSES
    // ==========================================
    const bosses: {
      id: string;
      name: string;
      avatar: string;
      element: ElementType;
      color: string;
      hp: number;
      ap: number;
      desc: string;
      abilities: any[];
    }[] = [
      {
        id: 'boss_void_archon',
        name: 'THE VOID ARCHON (Supreme Boss)',
        avatar: '👑',
        element: 'Void',
        color: '#ec4899',
        hp: 480,
        ap: 7,
        desc: 'Supreme Overlord of the Void from Round 15.',
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
            baseDamage: 48,
            appliesStatus: 'VoidMarked',
            statusDuration: 3,
            createsHazard: 'VoidRift',
            hazardDuration: 3,
            description: 'Tears a massive singularity in reality.',
            level: 5,
          },
          {
            id: 'event_horizon_pulse',
            name: 'Event Horizon Pulse',
            element: 'Void',
            icon: '🌀',
            apCost: 2,
            cooldown: 0,
            currentCooldown: 0,
            range: 4,
            aoeRadius: 1,
            targeting: 'SingleUnit',
            baseDamage: 38,
            appliesStatus: 'Stunned',
            statusDuration: 1,
            description: 'Gravitational shockwave that stuns.',
            level: 5,
          },
        ],
      },
      {
        id: 'boss_titan_golem',
        name: 'Titan Golem Boss',
        avatar: '🗿',
        element: 'Titan',
        color: '#f59e0b',
        hp: 2500,
        ap: 6,
        desc: 'Colossal mountain guardian with 2,500 HP.',
        abilities: [
          {
            id: 'titanic_stomp',
            name: 'Titanic Stomp',
            element: 'Titan',
            icon: '💥',
            apCost: 3,
            cooldown: 0,
            currentCooldown: 0,
            range: 3,
            aoeRadius: 1,
            targeting: 'SingleUnit',
            baseDamage: 45,
            appliesStatus: 'Stunned',
            statusDuration: 1,
            description: 'Earth-shattering stomp that crushes foes.',
            level: 5,
          },
        ],
      },
      {
        id: 'boss_ignis_colossus',
        name: 'Ignis Colossus',
        avatar: '🔥',
        element: 'Fire',
        color: '#ef4444',
        hp: 350,
        ap: 6,
        desc: 'Living inferno casting volcanic cataclysms.',
        abilities: [
          {
            id: 'magma_cataclysm',
            name: 'Magma Cataclysm',
            element: 'Fire',
            icon: '🌋',
            apCost: 3,
            cooldown: 0,
            currentCooldown: 0,
            range: 5,
            aoeRadius: 1,
            targeting: 'SingleUnit',
            baseDamage: 40,
            createsHazard: 'LavaPool',
            hazardDuration: 3,
            description: 'Bathes the arena in rivers of magma.',
            level: 4,
          },
        ],
      },
      {
        id: 'boss_glacius_tyrant',
        name: 'Glacius Frost Tyrant',
        avatar: '❄️',
        element: 'Ice',
        color: '#38bdf8',
        hp: 380,
        ap: 6,
        desc: 'Lord of absolute zero and cryogenic storms.',
        abilities: [
          {
            id: 'blizzard_annihilation',
            name: 'Blizzard Annihilation',
            element: 'Ice',
            icon: '🌨️',
            apCost: 3,
            cooldown: 0,
            currentCooldown: 0,
            range: 5,
            aoeRadius: 1,
            targeting: 'SingleUnit',
            baseDamage: 38,
            appliesStatus: 'Frozen',
            statusDuration: 2,
            createsHazard: 'IceSurface',
            hazardDuration: 3,
            description: 'Freezes target in deep cryogenic frost.',
            level: 4,
          },
        ],
      },
    ];

    bosses.forEach((b) => {
      this.items.set(b.id, {
        id: b.id,
        name: b.name,
        category: 'enemy',
        subcategory: 'boss',
        icon: b.avatar,
        element: b.element,
        color: b.color,
        hp: b.hp,
        description: `${b.desc} (${b.hp} HP Boss)`,
        enemyFactory: (coord: GridCoord) => ({
          id: `${b.id}_${Date.now()}`,
          name: b.name,
          faction: 'Enemy',
          avatar: b.avatar,
          coord,
          isBoss: true,
          stats: {
            maxHp: b.hp,
            currentHp: b.hp,
            maxAp: b.ap,
            currentAp: b.ap,
            moveCostPerTile: 1,
            elementalAffinity: b.element,
          },
          abilities: b.abilities,
          statusEffects: [],
          isDead: false,
        }),
      });
    });
  }

  private createDummy(
    element: ElementType,
    hp: number,
    coord: GridCoord,
    name: string,
    avatar: string
  ): Unit {
    const config = HERO_CLASSES[element] || HERO_CLASSES.Neutral;
    return {
      id: `dummy_${element.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name,
      faction: 'Enemy',
      avatar,
      coord,
      stats: {
        maxHp: hp,
        currentHp: hp,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: element,
      },
      abilities: config?.abilities ? [config.abilities[0]] : [],
      statusEffects: [],
      isDead: false,
    };
  }

  public getAllItems(): PlacementItem[] {
    return Array.from(this.items.values());
  }

  public getItemsByCategory(category: PlacementCategory): PlacementItem[] {
    return Array.from(this.items.values()).filter((i) => i.category === category);
  }

  public getItemById(id: string): PlacementItem | undefined {
    return this.items.get(id);
  }

  /**
   * Validates if the selected placement item can be placed at the target coordinate.
   */
  public canPlaceAt(
    item: PlacementItem,
    coord: GridCoord,
    grid: Grid,
    combatEngine: CombatEngine
  ): { valid: boolean; reason?: string } {
    if (!grid.isInBounds(coord)) {
      return { valid: false, reason: 'Tile out of arena bounds' };
    }

    const tile = grid.getTile(coord);
    if (!tile) {
      return { valid: false, reason: 'Tile not found' };
    }

    const existingUnit = combatEngine.getUnitAt(coord);

    if (item.category === 'eraser') {
      // Eraser can be used anywhere in bounds
      return { valid: true };
    }

    if (item.category === 'wall') {
      if (existingUnit) {
        return { valid: false, reason: 'Cannot place wall on an occupied tile' };
      }
      return { valid: true };
    }

    if (item.category === 'hazard') {
      if (tile.isObstacle) {
        return { valid: false, reason: 'Cannot apply hazard onto an obstacle wall' };
      }
      return { valid: true };
    }

    if (item.category === 'enemy') {
      if (tile.isObstacle) {
        return { valid: false, reason: 'Cannot place enemy on a wall' };
      }
      if (existingUnit) {
        return { valid: false, reason: 'Tile already occupied by another unit' };
      }
      return { valid: true };
    }

    return { valid: true };
  }

  /**
   * Executes placement of the item onto the grid / combat engine.
   */
  public executePlacement(
    item: PlacementItem,
    coord: GridCoord,
    grid: Grid,
    hazardManager: TileHazardManager,
    combatEngine: CombatEngine
  ): { success: boolean; message: string; effectType: string; spawnedUnit?: Unit } {
    const check = this.canPlaceAt(item, coord, grid, combatEngine);
    if (!check.valid) {
      return { success: false, message: check.reason || 'Invalid placement', effectType: 'error' };
    }

    const tile = grid.getTile(coord)!;

    // 1. ERASER
    if (item.category === 'eraser') {
      const unit = combatEngine.getUnitAt(coord);
      let erasedDetails: string[] = [];

      if (unit) {
        // Prevent deleting player hero to keep game loop intact
        if (unit.id === combatEngine.hero.id || (combatEngine.coopHero && unit.id === combatEngine.coopHero.id)) {
          return { success: false, message: 'Cannot erase the Player Hero!', effectType: 'error' };
        }
        unit.isDead = true;
        combatEngine.enemies = combatEngine.enemies.filter((e) => e.id !== unit.id);
        combatEngine.zombies = combatEngine.zombies.filter((z) => z.id !== unit.id);
        combatEngine.lifeBeings = combatEngine.lifeBeings.filter((l) => l.id !== unit.id);
        erasedDetails.push(unit.name);
      }

      if (tile.isObstacle) {
        grid.setObstacle(coord, false);
        erasedDetails.push('Wall');
      }

      if (tile.hazard.type !== 'None') {
        erasedDetails.push(tile.hazard.type);
        tile.hazard = {
          type: 'None',
          duration: 0,
          damagePerTurn: 0,
          element: 'Neutral',
        };
      }

      const summary = erasedDetails.length > 0 ? erasedDetails.join(' & ') : 'Tile (Empty)';
      return { success: true, message: `Cleared ${summary} at (${coord.x}, ${coord.y})`, effectType: 'eraser' };
    }

    // 2. WALL
    if (item.category === 'wall') {
      const wallIcon = item.wallConfig?.icon || item.icon || '🪨';
      grid.setObstacle(coord, true, wallIcon);
      return {
        success: true,
        message: `Built ${item.name} at (${coord.x}, ${coord.y})`,
        effectType: 'wall',
      };
    }

    // 3. HAZARD
    if (item.category === 'hazard' && item.hazardConfig) {
      const h = item.hazardConfig;
      const reaction = hazardManager.applyHazard(coord, h.type, h.duration, h.damage, h.element);
      const msg = reaction
        ? `Placed ${item.name} at (${coord.x}, ${coord.y}) -> Reaction: ${reaction}!`
        : `Placed ${item.name} at (${coord.x}, ${coord.y})`;
      return {
        success: true,
        message: msg,
        effectType: 'hazard',
      };
    }

    // 4. ENEMY
    if (item.category === 'enemy' && item.enemyFactory) {
      const newUnit = item.enemyFactory(coord);
      combatEngine.enemies.push(newUnit);
      return {
        success: true,
        message: `Summoned ${newUnit.name} (${newUnit.stats.maxHp} HP) at (${coord.x}, ${coord.y})`,
        effectType: 'enemy',
        spawnedUnit: newUnit,
      };
    }

    return { success: false, message: 'Unknown item type', effectType: 'error' };
  }
}
