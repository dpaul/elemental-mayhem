# Implementation Plan: MVP Core Tactical Grid Combat & Elemental Prototype

## Phase 1: Project Foundation & Test Harness [checkpoint: cd637c2]
- [x] Task: Project Scaffolding & Configuration [cd637c2]
  - [x] Initialize Vite + TypeScript project structure with strict config
  - [x] Configure Vitest test runner and npm scripts (`npm run dev`, `npm test`, `npm run build`)
  - [x] Create base styles, fonts, and container HTML layout
- [x] Task: Core Types & Data Models [cd637c2]
  - [x] Define TypeScript interfaces for Elements, Units, Grid, Tiles, Abilities, Status Effects, and GameState
  - [x] Define 6 core element constants, registry data, and base stat configurations
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [cd637c2]

## Phase 2: Grid Arena, Pathfinding & Tile Hazard State Engine [checkpoint: 99a8e73]
- [x] Task: Grid & Pathfinding Unit Tests (TDD Red) [99a8e73]
  - [x] Write unit tests for 10x10 coordinate maths, adjacency, obstacles, line-of-sight, and A* pathfinding
  - [x] Write unit tests for tile state transitions (Normal -> Burning -> Puddle -> Toxic)
- [x] Task: Grid & Pathfinding Implementation (TDD Green) [99a8e73]
  - [x] Implement `Grid` class, obstacle generator, distance calculators, and A* pathfinder
  - [x] Implement `TileHazardManager` handling persistent ground effects and duration ticks
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [99a8e73]

## Phase 3: Elemental Affinity Matrix & Reaction Engine [checkpoint: 4cea8d0]
- [x] Task: Elemental Reactions & Affinity Unit Tests (TDD Red) [4cea8d0]
  - [x] Write unit tests for attacker vs defender elemental damage multiplier formulas
  - [x] Write unit tests for 2-element emergent reactions (Vaporize, Superconduct, Toxic Explosion, Petrify, Void Collapse)
  - [x] Write unit tests for status effect applications (Burning, Wet, Shocked, Poisoned, Rooted)
- [x] Task: Elemental System Implementation (TDD Green) [4cea8d0]
  - [x] Implement `ElementalMatrix` with damage calculations and resistance curves
  - [x] Implement `ReactionEngine` to process character & tile element collisions
  - [x] Implement `StatusEffectManager` with tick/expire lifecycle
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [4cea8d0]

## Phase 4: Turn-Based State Machine, Units & Tactical AI
- [x] Task: Combat Engine & AI Unit Tests (TDD Red) [248e6f4]
  - [x] Write unit tests for AP consumption, turn order transitions (`PLAYER_TURN` -> `ENEMY_TURN` -> `ENVIRONMENT_TICK`)
  - [x] Write unit tests for ability execution, cooldown tracking, and unit death handling
  - [x] Write unit tests for Enemy AI behavior (evaluation of targets, distance, AP, spell choice)
- [x] Task: Combat Engine & AI Implementation (TDD Green) [248e6f4]
  - [x] Implement `TurnManager` and `CombatEngine` with AP validation and ability execution
  - [x] Implement `EnemyAI` controller for tactical movement and reactive ability casting
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Canvas Battlefield Renderer & Tactical Glassmorphism HUD
- [ ] Task: Battlefield Canvas 2D Renderer
  - [ ] Implement grid tile renderer with terrain texture, obstacle rendering, and hover reach highlights
  - [ ] Implement unit sprite rendering with health bars, AP pips, and element badges
  - [ ] Implement dynamic particle FX engine (projectiles, explosions, lightning arcs, vapor clouds)
- [ ] Task: Tactical HUD & Input Controller
  - [ ] Implement glassmorphism action bar with ability slots, AP cost preview, cooldown badges, and hotkeys
  - [ ] Implement target selection overlays, damage preview tooltip, and scrollable combat log
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6: Performance Scoring, Upgrade Armory & 3-Round Escalation Loop
- [ ] Task: Scoring & Progression Unit Tests (TDD Red)
  - [ ] Write unit tests for XP and Elemental Essence calculations based on turns taken, combo reactions, and damage dealt
  - [ ] Write unit tests for upgrade purchases, spell unlocking, and relic stat modifications
- [ ] Task: Scoring, Upgrade Armory & Escalation Loop Implementation (TDD Green)
  - [ ] Implement `PerformanceScorer` to evaluate round efficiency and award Essence
  - [ ] Implement `UpgradeArmory` UI modal with skill trees, spell upgrades, and passive relics
  - [ ] Implement `EscalationManager` with 3 rounds of increasing difficulty (including Round 3 Boss encounter)
  - [ ] Implement Victory and Defeat summary screens with full run statistics and instant restart
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
