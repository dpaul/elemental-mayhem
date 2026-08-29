# Implementation Plan: Smooth Movement & Spellcasting Animations with Sequential AI Turns

## Phase 1: Unit Movement Interpolation Engine
- [x] Task: Unit Movement Interpolation Unit Tests (TDD Red) [6569316]
  - [x] Write unit tests for `AnimationManager` path queueing, waypoint interpolation calculations, and completion callbacks
- [x] Task: Unit Movement Interpolation Implementation (TDD Green) [6569316]
  - [x] Implement `AnimationManager` handling smooth delta-time interpolation (160ms per tile)
  - [x] Update `BattlefieldRenderer` to draw units using active render positions
  - [x] Add movement glide dust particles during travel
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [6569316]

## Phase 2: Projectile System & Deferred Combat Impact
- [x] Task: Projectile Engine Unit Tests (TDD Red) [6a05e5f]
  - [x] Write unit tests for `ProjectileManager` flight trajectory math, speed/duration, and arrival callbacks
- [x] Task: Projectile Engine Implementation (TDD Green) [6a05e5f]
  - [x] Implement `ProjectileManager` in `ParticleEngine` with signature elemental trails (Fire, Water, Lightning, Poison, Earth, Void)
  - [x] Update ability casting flow to launch projectile and defer damage, floating text, and reactions until projectile arrives
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [6a05e5f]

## Phase 3: Sequential AI Turn Orchestration & Input Lock
- [x] Task: Async Turn Queue Unit Tests (TDD Red) [9e476d7]
  - [x] Write unit tests for sequential action execution order and delay pacing
- [x] Task: Async Turn Orchestration Implementation (TDD Green) [9e476d7]
  - [x] Refactor `GameController.endPlayerTurn` into an async sequential loop (highlight active enemy -> animate move -> pause -> animate spell -> pause -> next enemy)
  - [x] Implement input locking during animation and AI phases
  - [x] Update header banner with active unit name during enemy turns
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [9e476d7]
