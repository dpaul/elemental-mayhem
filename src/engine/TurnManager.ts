// Elemental Mayhem - Turn Phase & Turn Order Manager
import { TurnPhase, Unit } from '../types';

export class TurnManager {
  private phase: TurnPhase;
  private turnNumber: number;

  constructor() {
    this.phase = 'PLAYER_TURN';
    this.turnNumber = 1;
  }

  public getCurrentPhase(): TurnPhase {
    return this.phase;
  }

  public getTurnNumber(): number {
    return this.turnNumber;
  }

  public startPlayerTurn(units: Unit[]): void {
    this.phase = 'PLAYER_TURN';
    units.forEach((unit) => {
      if (!unit.isDead) {
        unit.stats.currentAp = unit.stats.maxAp;
        // Decrement ability cooldowns
        unit.abilities.forEach((ability) => {
          if (ability.currentCooldown > 0) {
            ability.currentCooldown -= 1;
          }
        });
      }
    });
  }

  public endPlayerTurn(): void {
    this.phase = 'ENEMY_TURN';
  }

  public startEnemyTurn(enemies: Unit[]): void {
    this.phase = 'ENEMY_TURN';
    enemies.forEach((enemy) => {
      if (!enemy.isDead) {
        enemy.stats.currentAp = enemy.stats.maxAp;
        enemy.abilities.forEach((ability) => {
          if (ability.currentCooldown > 0) {
            ability.currentCooldown -= 1;
          }
        });
      }
    });
  }

  public advanceToEnvironment(): void {
    this.phase = 'ENVIRONMENT_TICK';
  }

  public nextTurnRound(): void {
    this.turnNumber += 1;
  }

  public setPhase(phase: TurnPhase): void {
    this.phase = phase;
  }

  public getPhase(): TurnPhase {
    return this.phase;
  }

  public startCoopTurn(playerNum: 1 | 2, unit: Unit): void {
    this.phase = playerNum === 1 ? 'COOP_P1_TURN' : 'COOP_P2_TURN';
    if (!unit.isDead) {
      unit.stats.currentAp = unit.stats.maxAp;
      unit.abilities.forEach((ability) => {
        if (ability.currentCooldown > 0) {
          ability.currentCooldown -= 1;
        }
      });
    }
  }
}
