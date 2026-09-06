// Elemental Mayhem - Network Message Protocol for Online Co-op
import { ElementType, GridCoord, Unit, TileState, CombatLogEntry, TurnPhase } from '../types';

export interface LobbyUpdateMessage {
  type: 'LOBBY_UPDATE';
  hostElement?: ElementType;
  guestElement?: ElementType;
  guestReady?: boolean;
  hostReady?: boolean;
}

export interface StartMatchMessage {
  type: 'START_MATCH';
  hostElement: ElementType;
  guestElement: ElementType;
}

export interface StateSyncMessage {
  type: 'STATE_SYNC';
  currentRound: number;
  phase: TurnPhase;
  p1Hero: Unit;
  p2Hero: Unit;
  enemies: Unit[];
  zombies: Unit[];
  lifeBeings: Unit[];
  tiles: TileState[][];
  logs: CombatLogEntry[];
}

export interface IntentMoveMessage {
  type: 'INTENT_MOVE';
  playerNum: 1 | 2;
  targetCoord: GridCoord;
}

export interface IntentCastMessage {
  type: 'INTENT_CAST';
  playerNum: 1 | 2;
  abilityId: string;
  targetCoord: GridCoord;
}

export interface IntentEndTurnMessage {
  type: 'INTENT_END_TURN';
  playerNum: 1 | 2;
}

export interface EventMoveMessage {
  type: 'EVENT_MOVE';
  unitId: string;
  path: GridCoord[];
  destination: GridCoord;
}

export interface EventCastMessage {
  type: 'EVENT_CAST';
  casterId: string;
  abilityId: string;
  targetCoord: GridCoord;
}

export interface EventPhaseChangeMessage {
  type: 'EVENT_PHASE_CHANGE';
  phase: TurnPhase;
  activePlayer: 1 | 2;
}

export interface EventDamageMessage {
  type: 'EVENT_DAMAGE';
  targetId: string;
  damage: number;
  element: ElementType;
  isCrit: boolean;
}

export interface CursorHoverMessage {
  type: 'CURSOR_HOVER';
  playerNum: 1 | 2;
  coord: GridCoord | null;
}

export interface TacticalPingMessage {
  type: 'TACTICAL_PING';
  playerNum: 1 | 2;
  coord: GridCoord;
  label?: string;
}

export interface QuickChatMessage {
  type: 'QUICK_CHAT';
  playerNum: 1 | 2;
  text: string;
}

export interface EventRoundVictoryMessage {
  type: 'EVENT_ROUND_VICTORY';
  nextRound: number;
}

export interface EventGameOverMessage {
  type: 'EVENT_GAME_OVER';
  reason: string;
}

export type NetworkMessage =
  | LobbyUpdateMessage
  | StartMatchMessage
  | StateSyncMessage
  | IntentMoveMessage
  | IntentCastMessage
  | IntentEndTurnMessage
  | EventMoveMessage
  | EventCastMessage
  | EventPhaseChangeMessage
  | EventDamageMessage
  | CursorHoverMessage
  | TacticalPingMessage
  | QuickChatMessage
  | EventRoundVictoryMessage
  | EventGameOverMessage;
