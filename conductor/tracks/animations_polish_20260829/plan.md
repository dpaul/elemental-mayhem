# Implementation Plan: Smooth Movement & Spellcasting Animations with Sequential AI Turns

## Phase 1: Unit Movement Interpolation Engine
- [ ] Task: Unit Movement Interpolation Unit Tests (TDD Red)
  - [ ] Write unit tests for `AnimationManager` path queueing, waypoint interpolation calculations, and completion callbacks
- [ ] Task: Unit Movement Interpolation Implementation (TDD Green)
  - [ ] Implement `AnimationManager` handling smooth delta-time interpolation (160ms per tile)
  - [ ] Update `BattlefieldRenderer` to draw units using active render positions
  - [ ] Add movement glide dust particles during travel
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Projectile System & Deferred Combat Impact
- [ ] Task: Projectile Engine Unit Tests (TDD Red)
  - [ ] Write unit tests for `ProjectileManager` flight trajectory math, speed/duration, and arrival callbacks
- [ ] Task: Projectile Engine Implementation (TDD Green)
  - [ ] Implement `ProjectileManager` in `ParticleEngine` with signature elemental trails (Fire, Water, Lightning, Poison, Earth, Void)
  - [ ] Update ability casting flow to launch projectile and defer damage, floating text, and reactions until projectile arrives
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Sequential AI Turn Orchestration & Input Lock
- [ ] Task: Async Turn Queue Unit Tests (TDD Red)
  - [ ] Write unit tests for sequential action execution order and delay pacing
- [ ] Task: Async Turn Orchestration Implementation (TDD Green)
  - [ ] Refactor `GameController.endPlayerTurn` into an async sequential loop (highlight active enemy -> animate move -> pause -> animate spell -> pause -> next enemy)
  - [ ] Implement input locking during animation and AI phases
  - [ ] Update header banner with active unit name during enemy turns
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
