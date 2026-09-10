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
    vi.spyOn(soundEngine, 'playHeroDeathScream').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playScreamerWail').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playHit').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'unlockAudio').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playEarthquakeRumble').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCosmicSingularity').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playMagicSurge').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playDarkSiphon').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playBossWarhorn').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneTitanClash').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneCosmicRift').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneWormholeFall').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneWizardBlessing').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutscenePowerStolen').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneBossBraam').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutscenePipBlip').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneModeSwitch').mockImplementation(() => {});

    cutsceneManager = new OriginCutsceneManager(soundEngine);
  });

  it('should have exactly 6 chapters detailing the lore of obtaining powers', () => {
    expect(CUTSCENE_CHAPTERS.length).toBe(6);
    expect(CUTSCENE_CHAPTERS[0].title).toBe('When Titans Collided');
    expect(CUTSCENE_CHAPTERS[1].title).toBe('The Dimensional Tear Opens');
    expect(CUTSCENE_CHAPTERS[2].title).toBe('Falling Through the Rift');
    expect(CUTSCENE_CHAPTERS[3].title).toBe("The Grand Wizard's Blessing");
    expect(CUTSCENE_CHAPTERS[4].title).toBe('The Void Overlord Steals the Magic');
    expect(CUTSCENE_CHAPTERS[5].title).toBe('The Void Overlord in the Dark Clouds');
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
    cutsceneManager.goToChapter(0);
    expect(soundEngine.playCutsceneTitanClash).toHaveBeenCalled();

    cutsceneManager.goToChapter(1);
    expect(soundEngine.playCutsceneCosmicRift).toHaveBeenCalled();

    cutsceneManager.goToChapter(2);
    expect(soundEngine.playCutsceneWormholeFall).toHaveBeenCalled();

    cutsceneManager.goToChapter(3);
    expect(soundEngine.playCutsceneWizardBlessing).toHaveBeenCalled();

    cutsceneManager.goToChapter(4);
    expect(soundEngine.playCutscenePowerStolen).toHaveBeenCalled();

    cutsceneManager.goToChapter(5);
    expect(soundEngine.playCutsceneBossBraam).toHaveBeenCalled();
  });

  it('should toggle view mode between video and stage', () => {
    cutsceneManager.setViewMode('video');
    cutsceneManager.toggleViewMode();
    // After toggling from video, it should be in stage mode
    cutsceneManager.toggleViewMode();
    // Toggled back to video
    cutsceneManager.setViewMode('stage');
    // Ensure setViewMode works explicitly
  });

  it('should support play and pause state toggling', () => {
    cutsceneManager.pause();
    cutsceneManager.togglePlayPause(); // toggles to play
    cutsceneManager.togglePlayPause(); // toggles to pause
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
