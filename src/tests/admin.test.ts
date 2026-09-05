import { describe, it, expect, beforeEach } from 'vitest';
import { AdminManager } from '../engine/AdminManager';

describe('AdminManager Security & Privileges', () => {
  let adminManager: AdminManager;

  beforeEach(() => {
    // Clear localStorage simulation if exists
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    adminManager = new AdminManager();
  });

  it('should initialize unauthenticated by default when storage is empty', () => {
    expect(adminManager.isAuthenticated()).toBe(false);
  });

  it('should reject invalid passcodes and remain unauthenticated', () => {
    const success = adminManager.authenticate('wrongpassword');
    expect(success).toBe(false);
    expect(adminManager.isAuthenticated()).toBe(false);
  });

  it('should authenticate successfully with password 190846214', () => {
    expect(adminManager.authenticate('190846214')).toBe(true);
    expect(adminManager.isAuthenticated()).toBe(true);

    adminManager.logout();
    expect(adminManager.isAuthenticated()).toBe(false);

    // Old or default passwords should now be rejected
    expect(adminManager.authenticate('admin')).toBe(false);
    expect(adminManager.authenticate('dave')).toBe(false);
    expect(adminManager.authenticate('5423118')).toBe(false);
  });

  it('should allow admin commands only when authenticated with 190846214', () => {
    // Unauthenticated: cannot use commands
    expect(adminManager.canUseAdminCommands(false, 1)).toBe(false);

    // Authenticated in single player mode: allowed
    adminManager.authenticate('190846214');
    expect(adminManager.canUseAdminCommands(false, 1)).toBe(true);
  });

  it('should restrict admin commands in Hotseat mode so only Player 1 (Creator) can use them', () => {
    adminManager.authenticate('190846214');

    // Player 1 in Hotseat: allowed
    expect(adminManager.canUseAdminCommands(true, 1)).toBe(true);

    // Player 2 in Hotseat: forbidden!
    expect(adminManager.canUseAdminCommands(true, 2)).toBe(false);
  });

  it('should allow logging out to re-lock admin commands', () => {
    adminManager.authenticate('190846214');
    expect(adminManager.isAuthenticated()).toBe(true);

    adminManager.logout();
    expect(adminManager.isAuthenticated()).toBe(false);
    expect(adminManager.canUseAdminCommands(false, 1)).toBe(false);
  });
});
