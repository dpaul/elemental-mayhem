import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OriginCutsceneManager, CUTSCENE_CHAPTERS } from '../engine/OriginCutscene';
import { SoundEngine } from '../audio/SoundEngine';

describe('OriginCutsceneManager', () => {
  let soundEngine: SoundEngine;
  let cutsceneManager: OriginCutsceneManager;

  beforeEach(() => {
    soundEngine = new SoundEngine();
    // Spy on sound methods
    vi.spyOn(soundEngine, 'playClick').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playWarp').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playExplosion').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playSpellCast').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playUnlock').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playVictoryFanfare').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playLevelUp').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'unlockAudio').mockImplementation(() => {});

    cutsceneManager = new OriginCutsceneManager(soundEngine);
  });

  it('should have exactly 6 chapters detailing the lore of obtaining powers', () => {
    expect(CUTSCENE_CHAPTERS.length).toBe(6);
    expect(CUTSCENE_CHAPTERS[0].title).toBe('The Mortal Seeker in the Void');
    expect(CUTSCENE_CHAPTERS[1].title).toBe('The Shattering of the Core');
    expect(CUTSCENE_CHAPTERS[2].title).toBe('The Three Primal Embers Awaken');
    expect(CUTSCENE_CHAPTERS[3].title).toBe('The 50 Elements Converge');
    expect(CUTSCENE_CHAPTERS[4].title).toBe('The Eye of the Creator');
    expect(CUTSCENE_CHAPTERS[5].title).toBe('Rise, Elemental Master');
  });

  it('should navigate through chapters correctly', () => {
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(0);

    cutsceneManager.nextChapter();
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(1);

    cutsceneManager.goToChapter(4);
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(4);

    cutsceneManager.prevChapter();
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(3);

    // Bounds checking
    cutsceneManager.goToChapter(-1);
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(3);

    cutsceneManager.goToChapter(10);
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(3);
  });

  it('should trigger chapter specific sound effects', () => {
    cutsceneManager.goToChapter(1);
    expect(soundEngine.playExplosion).toHaveBeenCalled();

    cutsceneManager.goToChapter(2);
    expect(soundEngine.playSpellCast).toHaveBeenCalledWith('Fire');

    cutsceneManager.goToChapter(4);
    expect(soundEngine.playVictoryFanfare).toHaveBeenCalled();

    cutsceneManager.goToChapter(5);
    expect(soundEngine.playLevelUp).toHaveBeenCalled();
  });

  it('should execute callbacks when requested', () => {
    const arenaSpy = vi.fn();
    const sandboxSpy = vi.fn();
    const closeSpy = vi.fn();

    cutsceneManager.onEnterArena = arenaSpy;
    cutsceneManager.onOpenSandbox = sandboxSpy;
    cutsceneManager.onClose = closeSpy;

    cutsceneManager.close();
    expect(closeSpy).toHaveBeenCalled();
  });
});
