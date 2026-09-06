// Elemental Mayhem - Automatic Turn-End Countdown Timer
// Triggers automatic turn completion after 10 seconds when out of Action Points (AP)

export type TurnTimerTickCallback = (secondsRemaining: number) => void;
export type TurnTimerExpireCallback = () => void;

export interface TurnTimerOptions {
  durationSeconds?: number;
  onTick?: TurnTimerTickCallback;
  onExpire?: TurnTimerExpireCallback;
}

export class TurnTimer {
  private durationSeconds: number;
  private remainingSeconds: number;
  private isRunning: boolean = false;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private endTime: number = 0;
  private lastReportedSeconds: number = -1;
  private onTickCallback?: TurnTimerTickCallback;
  private onExpireCallback?: TurnTimerExpireCallback;

  constructor(options?: TurnTimerOptions) {
    this.durationSeconds = options?.durationSeconds ?? 10;
    this.remainingSeconds = this.durationSeconds;
    this.onTickCallback = options?.onTick;
    this.onExpireCallback = options?.onExpire;
  }

  public setCallbacks(onTick?: TurnTimerTickCallback, onExpire?: TurnTimerExpireCallback): void {
    if (onTick !== undefined) this.onTickCallback = onTick;
    if (onExpire !== undefined) this.onExpireCallback = onExpire;
  }

  public start(durationSeconds?: number): void {
    if (durationSeconds !== undefined) {
      this.durationSeconds = durationSeconds;
    }
    this.stop();

    this.remainingSeconds = this.durationSeconds;
    this.lastReportedSeconds = this.durationSeconds;
    this.isRunning = true;
    const now = Date.now();
    this.endTime = now + this.durationSeconds * 1000;

    if (this.onTickCallback) {
      this.onTickCallback(this.remainingSeconds);
    }

    this.timerId = setInterval(() => {
      const current = Date.now();
      const secondsLeft = Math.max(0, Math.ceil((this.endTime - current) / 1000));
      this.remainingSeconds = secondsLeft;

      if (secondsLeft <= 0) {
        this.stop();
        if (this.onExpireCallback) {
          this.onExpireCallback();
        }
      } else if (secondsLeft !== this.lastReportedSeconds) {
        this.lastReportedSeconds = secondsLeft;
        if (this.onTickCallback) {
          this.onTickCallback(secondsLeft);
        }
      }
    }, 200);
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    this.remainingSeconds = this.durationSeconds;
    this.lastReportedSeconds = -1;
  }

  public reset(): void {
    this.stop();
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  public getRemainingSeconds(): number {
    return this.remainingSeconds;
  }

  public getDurationSeconds(): number {
    return this.durationSeconds;
  }

  /**
   * Manual time-stepping utility for unit tests and deterministic simulations
   */
  public step(deltaSeconds: number = 1): void {
    if (!this.isRunning) return;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaSeconds);
    if (this.remainingSeconds <= 0) {
      this.stop();
      if (this.onExpireCallback) {
        this.onExpireCallback();
      }
    } else {
      if (this.onTickCallback) {
        this.onTickCallback(this.remainingSeconds);
      }
    }
  }
}
