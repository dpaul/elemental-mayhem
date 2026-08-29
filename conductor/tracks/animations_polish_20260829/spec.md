# Specification: Smooth Movement & Spellcasting Animations with Sequential AI Turns

## 1. Overview
Enhance tactical combat clarity and visual polish by replacing instantaneous coordinate warping and instant AI turn resolution with fluid, interpolated unit movement, traveling spell projectiles, and clearly paced sequential AI turns.

## 2. Functional Requirements

### 2.1 Unit Movement Interpolation
- Separate logical grid coordinate (`coord`) from visual render position (`renderX, renderY`).
- When a unit moves along an A* path, interpolate smoothly through each waypoint tile at ~160ms per tile step.
- Emit subtle dust/glide particles while moving.
- Lock player input during active movement animation.

### 2.2 Projectile & Spell Animation System
- When an ability is cast, spawn an animated projectile/beam traveling from caster to target tile (~250-350ms duration).
- Projectiles emit signature elemental particle trails (flame embers, water droplets, spark arcs, void motes).
- Defer damage application, status effect badges, tile hazard changes, and floating combat text until the projectile reaches the target tile.

### 2.3 Sequential AI Turn Execution
- Replace synchronous `setTimeout` enemy AI turn with an `async` sequential action runner:
  - Step 1: Announce active enemy in header banner (`ENEMY TURN: Toxic Mire Adept`).
  - Step 2: Highlight active enemy with glowing focus ring.
  - Step 3: If moving, animate movement along path tiles (160ms/tile) and pause ~300ms.
  - Step 4: If casting ability, animate projectile flying to target, wait for impact explosion (~300ms), update player HP & combat log.
  - Step 5: Pause ~350ms before transitioning to next enemy.
  - Step 6: Trigger environment hazard tick and status damage animations.
  - Step 7: Return turn to player with `PLAYER TURN` banner and unlocked inputs.

### 2.4 Input & State Safety
- Prevent tile clicks, ability hotkeys, and "End Turn" button triggers while animations or AI turns are resolving.

## 3. Acceptance Criteria
- [ ] Moving hero glides smoothly along the path instead of teleporting.
- [ ] Casting abilities fires a visible elemental projectile that flies to the target before damage/reactions appear.
- [ ] Enemy turns execute one enemy at a time with visible movement, spellcasting, and readable pauses.
- [ ] Vitest test suite passes and production build compiles cleanly.
