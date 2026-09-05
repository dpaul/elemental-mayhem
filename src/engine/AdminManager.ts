// Elemental Mayhem - Creator & Admin Security Access Manager

export class AdminManager {
  private authenticated: boolean = false;
  private readonly storageKey = 'elemental_mayhem_admin_auth';
  public static readonly MASTER_PASSCODE: string = '190846214';
  private readonly validPasscodes = new Set<string>([
    '190846214',
  ]);

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.authenticated = window.localStorage.getItem(this.storageKey) === 'true';
      }
    } catch {
      this.authenticated = false;
    }
  }

  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  public authenticate(passcode: string): boolean {
    const cleaned = passcode.trim().toLowerCase();
    if (this.validPasscodes.has(cleaned)) {
      this.authenticated = true;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(this.storageKey, 'true');
        }
      } catch {
        // Storage unavailable
      }
      return true;
    }
    return false;
  }

  public logout(): void {
    this.authenticated = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.storageKey);
      }
    } catch {
      // Storage unavailable
    }
  }

  public canUseAdminCommands(isHotseat: boolean, hotseatPlayer: number): boolean {
    if (!this.authenticated) {
      return false;
    }
    // In Hotseat mode, only Player 1 (the host / creator) can use admin commands
    if (isHotseat && hotseatPlayer === 2) {
      return false;
    }
    return true;
  }

  public addValidPasscode(code: string): void {
    if (code.trim()) {
      this.validPasscodes.add(code.trim().toLowerCase());
    }
  }
}
