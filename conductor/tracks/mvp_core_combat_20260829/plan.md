# Implementation Plan: MVP Core Tactical Grid Combat & Elemental Prototype

## Phase 1: Project Foundation & Test Harness
- [ ] Task: Project Scaffolding & Configuration
  - [ ] Initialize Vite + TypeScript project structure with strict config
  - [ ] Configure Vitest test runner and npm scripts (`npm run dev`, `npm test`, `npm run build`)
  - [ ] Create base styles, fonts, and container HTML layout
- [ ] Task: Core Types & Data Models
  - [ ] Define TypeScript interfaces for Elements, Units, Grid, Tiles, Abilities, Status Effects, and GameState
  - [ ] Define 6 core element constants, registry data, and base stat configurations
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Grid Arena, Pathfinding & Tile Hazard State Engine
- [ ] Task: Grid & Pathfinding Unit Tests (TDD Red)
  - [ ] Write unit tests for 10x10 coordinate maths, adjacency, obstacles, line-of-sight, and A* pathfinding
  - [ ] Write unit tests for tile state transitions (Normal -> Burning -> Puddle -> Toxic)
- [ ] Task: Grid & Pathfinding Implementation (TDD Green)
  - [ ] Implement `Grid` class, obstacle generator, distance calculators, and A* pathfinder
  - [ ] Implement `TileHazardManager` handling persistent ground effects and duration ticks
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Elemental Affinity Matrix & Reaction Engine
- [ ] Task: Elemental Reactions & Affinity Unit Tests (TDD Red)
  - [ ] Write unit tests for attacker vs defender elemental damage multiplier formulas
  - [ ] Write unit tests for 2-element emergent reactions (Vaporize, Superconduct, Toxic Explosion, Petrify, Void Collapse)
  - [ ] Write unit tests for status effect applications (Burning, Wet, Shocked, Poisoned, Rooted)
- [ ] Task: Elemental System Implementation (TDD Green)
  - [ ] Implement `ElementalMatrix` with damage calculations and resistance curves
  - [ ] Implement `ReactionEngine` to process character & tile element collisions
  - [ ] Implement `StatusEffectManager` with tick/expire lifecycle
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Turn-Based State Machine, Units & Tactical AI
- [ ] Task: Combat Engine & AI Unit Tests (TDD Red)
  - [ ] Write unit tests for AP consumption, turn order transitions (`PLAYER_TURN` -> `ENEMY_TURN` -> `ENVIRONMENT_TICK`)
  - [ ] Write unit tests for ability execution, cooldown tracking, and unit death handling
  - [ ] Write unit tests for Enemy AI behavior (evaluation of targets, distance, AP, spell choice)
- [ ] Task: Combat Engine & AI Implementation (TDD Green)
  - [ ] Implement `TurnManager` and `CombatEngine` with AP validation and ability execution
  - [ ] Implement `EnemyAI` controller for tactical movement and reactive ability casting
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
