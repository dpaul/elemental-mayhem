# Specification: MVP Core Tactical Grid Combat & Elemental Prototype

## 1. Overview
This track delivers the playable Minimum Viable Product (MVP) for Elemental Mayhem—a web-based turn-based tactical arena game. The MVP features a 10x10 grid arena, a core roster of 6 reactive elements (Fire, Water, Lightning, Earth, Poison, Void), an Action Point (AP) combat loop, intelligent enemy AI, combat performance scoring, a post-round upgrade shop, and a 3-round escalation gauntlet.

## 2. Functional Requirements

### 2.1 Project Infrastructure & Scaffolding
- Initialize a TypeScript + Vite web project with Vitest test runner.
- Build a modular HTML5 Canvas 2D tactical battlefield renderer paired with modern glassmorphism CSS HUD overlays.

### 2.2 10x10 Grid & Tactical Battlefield
- 10x10 tile grid with coordinate system, obstacle generation (rocks/pillars), and A* pathfinding.
- Interactive tile states: Normal, Burning (Fire), Puddle (Water), Electrified Puddle (Lightning+Water), Toxic Mire (Poison), Void Rift (Void), Mud/Stone Wall (Earth).
- Tile hover previews for movement range, path cost, ability AoE footprints, and line-of-sight.

### 2.3 Turn-Based State Machine & Units
- Turn phases: `ROUND_START` -> `PLAYER_TURN` -> `ENEMY_TURN` -> `ENVIRONMENT_TICK` -> `ROUND_END`.
- Units have Health (HP), Action Points (AP: default 6 per turn), Movement Speed (AP per tile), and Elemental Affinity.
- Player controls 1 Elemental Hero with 4 selectable abilities (Basic Strike + 3 Elemental Spells).
- Enemy AI turns: Evaluate distances, pick optimal spell/attack, move and execute tactics against the player.

### 2.4 6-Element Affinity & Reaction Engine
- **Elements:** Fire, Water, Lightning, Earth, Poison, Void.
- **Affinities:** Elemental damage multipliers based on attacker vs target affinity (e.g., Water deals 1.5x to Fire, Fire deals 1.5x to Poison, Earth resists Lightning).
- **Emergent Reactions:**
  - *Vaporize (Fire + Water):* Deals bonus steam burst damage and clears tile.
  - *Superconduct (Water + Lightning):* Electrifies water tiles, dealing chain damage to adjacent units.
  - *Toxic Explosion (Fire + Poison):* Detonates poisoned targets/tiles for AoE burst.
  - *Petrify / Entomb (Earth + Poison / Earth + Water):* Roots target or forms hardened mud.
  - *Void Collapse (Void + Any):* Amplifies debuffs and pulls surrounding entities closer.
- **Status Effects:** Burning (DoT), Wet (conductivity/slow), Shocked (AP penalty), Poisoned (stacking DoT), Stunned/Rooted.

### 2.5 Round Progression & Performance Scoring
- Combat scoring system awarding:
  - Base XP & Elemental Essence per round win.
  - Bonus Essence for triggering multi-element reactions.
  - Bonus Essence for flawless rounds or efficient turn counts.

### 2.6 Post-Round Upgrade Armory
- Between-round shop interface where players spend earned XP and Elemental Essence:
  - Unlock new spells from the 6 elements.
  - Upgrade active spell power, reduce AP cost, or expand AoE radius.
  - Purchase passive relics (e.g., +2 Max AP, Elemental Shielding, Extended Move Range).

### 2.7 3-Round Escalation Gauntlet
- **Round 1:** 2 Apprentice Adepts (Basic elements).
- **Round 2:** 3 Adepts with combo spells and hazardous arena layout.
- **Round 3:** Elemental Boss / High Adept with multi-phase mechanics and elite summons.
- Victory screen with complete run statistics, and Game Over / Retry screen on defeat.

## 3. Non-Functional Requirements
- 60 FPS smooth canvas rendering for animations and particle FX.
- Strict TypeScript type safety with comprehensive unit tests for core game logic and reaction matrices (>80% coverage).
- Keyboard hotkeys (`1`-`4` for abilities, `Space` for End Turn, `Esc` for cancel).

## 4. Acceptance Criteria
- [ ] Project builds and runs cleanly with `npm run dev`.
- [ ] Unit tests for grid pathfinding, damage formulas, elemental affinities, and reaction combinations pass with Vitest.
- [ ] Player can move hero, cast spells, see previews, and trigger elemental reactions on enemies and tiles.
- [ ] AI enemies take tactical turns and attack/react appropriately.
- [ ] Clearing a round triggers the performance reward screen and opens the customizable upgrade armory.
- [ ] Player can complete all 3 rounds to achieve victory or restart upon defeat.
