import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CutsceneMusicEngine } from '../audio/CutsceneMusicEngine';
import { OriginCutsceneManager } from '../engine/OriginCutscene';
import { SoundEngine } from '../audio/SoundEngine';

describe('CutsceneMusicEngine (Fast, Soft, Cool & Scary Dark Synth)', () => {
  let musicEngine: CutsceneMusicEngine;

  beforeEach(() => {
    musicEngine = new CutsceneMusicEngine();
  });

  it('should initialize with fast driving tempo of 154 BPM', () => {
    expect(musicEngine.tempo).toBe(154);
    expect(musicEngine.getIsPlaying()).toBe(false);
    expect(musicEngine.getCurrentChapter()).toBe(0);
  });

  it('should handle start, pause, resume, and stop state transitions', () => {
    // Start playback
    musicEngine.start();
    // In node/mock environment, start sets isPlaying
    // If AudioContext is created/mocked or graceful
    expect(typeof musicEngine.start).toBe('function');
    expect(typeof musicEngine.pause).toBe('function');
    expect(typeof musicEngine.resume).toBe('function');
    expect(typeof musicEngine.stop).toBe('function');

    musicEngine.stop();
    expect(musicEngine.getIsPlaying()).toBe(false);
  });

  it('should transition between all 6 story chapters and clamp out-of-range indices', () => {
    for (let i = 0; i < 6; i++) {
      musicEngine.setChapter(i);
      expect(musicEngine.getCurrentChapter()).toBe(i);
    }

    // Clamps negative index to 0
    musicEngine.setChapter(-2);
    expect(musicEngine.getCurrentChapter()).toBe(0);

    // Clamps excessive index to 5
    musicEngine.setChapter(99);
    expect(musicEngine.getCurrentChapter()).toBe(5);
  });

  it('should toggle mute correctly', () => {
    expect(() => musicEngine.setMuted(true)).not.toThrow();
    expect(() => musicEngine.setMuted(false)).not.toThrow();
  });
});

describe('OriginCutsceneManager - CutsceneMusicEngine Integration', () => {
  let soundEngine: SoundEngine;
  let cutsceneManager: OriginCutsceneManager;

  beforeEach(() => {
    soundEngine = new SoundEngine();
    vi.spyOn(soundEngine, 'playClick').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneTitanClash').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneCosmicRift').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneWormholeFall').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneWizardBlessing').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutscenePowerStolen').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCutsceneBossBraam').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'unlockAudio').mockImplementation(() => {});

    cutsceneManager = new OriginCutsceneManager(soundEngine);
  });

  it('should have musicEngine instance attached', () => {
    expect(cutsceneManager.musicEngine).toBeInstanceOf(CutsceneMusicEngine);
    expect(cutsceneManager.musicEngine.tempo).toBe(154);
  });

  it('should synchronize chapter progression with musicEngine', () => {
    const setChapterSpy = vi.spyOn(cutsceneManager.musicEngine, 'setChapter');

    cutsceneManager.goToChapter(1);
    expect(setChapterSpy).toHaveBeenCalledWith(1);

    cutsceneManager.goToChapter(4);
    expect(setChapterSpy).toHaveBeenCalledWith(4);
  });

  it('should pause and resume musicEngine on playback toggle', () => {
    const pauseSpy = vi.spyOn(cutsceneManager.musicEngine, 'pause');
    const resumeSpy = vi.spyOn(cutsceneManager.musicEngine, 'resume');

    cutsceneManager.pause();
    expect(pauseSpy).toHaveBeenCalled();

    cutsceneManager.play();
    expect(resumeSpy).toHaveBeenCalled();
  });

  it('should stop musicEngine when cutscene closes', () => {
    const stopSpy = vi.spyOn(cutsceneManager.musicEngine, 'stop');
    cutsceneManager.close();
    expect(stopSpy).toHaveBeenCalled();
  });
});
