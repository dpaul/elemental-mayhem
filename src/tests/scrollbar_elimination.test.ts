// Elemental Mayhem - Scrollbar Elimination Tests
// Verifies that scrollbars are completely eliminated across:
// 1. Home Screen (.home-screen-overlay, .home-container)
// 2. Background (html, body, .game-container)
// 3. CPU Battle Arena (.battlefield-layout, .action-bar, .log-entries, .canvas-wrapper)

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Scrollbar Elimination Verification', () => {
  const cssPath = path.resolve(__dirname, '../style.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('eliminates scrollbars on html and body background', () => {
    expect(cssContent).toMatch(/html\s*\{[^}]*overflow:\s*hidden\s*!important/);
    expect(cssContent).toMatch(/html\s*\{[^}]*scrollbar-width:\s*none/);
    expect(cssContent).toMatch(/body\s*\{[^}]*overflow:\s*hidden\s*!important/);
    expect(cssContent).toMatch(/body\s*\{[^}]*scrollbar-width:\s*none/);
    expect(cssContent).toContain('html::-webkit-scrollbar');
    expect(cssContent).toContain('body::-webkit-scrollbar');
  });

  it('eliminates scrollbars on the home screen and its container', () => {
    expect(cssContent).toMatch(/\.home-screen-overlay\s*\{[^}]*scrollbar-width:\s*none/);
    expect(cssContent).toContain('.home-screen-overlay::-webkit-scrollbar');
    expect(cssContent).toMatch(/\.home-container\s*\{[^}]*scrollbar-width:\s*none/);
    expect(cssContent).toContain('.home-container::-webkit-scrollbar');
  });

  it('eliminates scrollbars on the CPU combat battlefield and action bar', () => {
    // Battlefield layout
    expect(cssContent).toMatch(/\.battlefield-layout\s*\{[^}]*scrollbar-width:\s*none/);
    expect(cssContent).toContain('.battlefield-layout::-webkit-scrollbar');

    // Action bar (where abilities are displayed during CPU combat)
    expect(cssContent).toMatch(/\.action-bar\s*\{[^}]*scrollbar-width:\s*none/);
    expect(cssContent).toContain('.action-bar::-webkit-scrollbar');
    // Ensure pink/thin visible scrollbar is gone
    expect(cssContent).not.toMatch(/\.action-bar\s*\{[^}]*scrollbar-width:\s*thin/);

    // Combat log entries
    expect(cssContent).toMatch(/\.log-entries\s*\{[^}]*scrollbar-width:\s*none/);
    expect(cssContent).toContain('.log-entries::-webkit-scrollbar');
  });

  it('includes universal global scrollbar suppression block', () => {
    expect(cssContent).toContain('GLOBAL SCROLLBAR ELIMINATION: HOME SCREEN, BACKGROUND & CPU BATTLE ARENA');
    expect(cssContent).toContain('scrollbar-width: none !important');
    expect(cssContent).toContain('display: none !important');
  });
});
