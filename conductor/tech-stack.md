# Technology Stack: Elemental Mayhem

## Core Runtime & Language
- **Language:** TypeScript 5.x (Strict mode, ESNext target).
- **Runtime / Bundler:** Vite (instant HMR, optimized production builds, zero-config asset bundling).

## Game Architecture & Rendering
- **Engine / Battlefield Canvas:** HTML5 2D Canvas rendering engine with a dedicated particle & FX layer for dynamic spell animations and reactive tile hazards.
- **Architecture Pattern:** Lightweight Entity-Component-System (ECS) & Pure Data Model for turn-based state (units, tile grid, elemental reactions, active buffs/debuffs, AP pool).
- **UI Framework & Styling:** Vanilla HTML5/CSS3 with CSS Custom Properties, backdrop-filters, and glassmorphism styling for high-performance zero-overhead HUD overlays.

## Testing & Quality Assurance
- **Unit & Logic Testing:** Vitest (fast, native TypeScript runner for elemental affinity calculations, reaction matrices, and combat round simulators).
- **Code Quality:** ESLint with typescript-eslint rules, Prettier for code formatting.

## Audio & Asset Pipeline
- **Audio Engine:** Web Audio API / lightweight synth SFX engine for elemental spells, hit impacts, and round stingers.
- **Asset Pipeline:** SVG iconography and procedural sprite generation for elements and unit tokens.
