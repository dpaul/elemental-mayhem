import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CutsceneVoiceManager, VOICE_PROFILES } from '../engine/CutsceneVoiceManager';
import { OriginCutsceneManager } from '../engine/OriginCutscene';
import { SoundEngine } from '../audio/SoundEngine';

class MockElement {
  public id: string = '';
  public textContent: string = '';
  public innerHTML: string = '';
  public style: Record<string, string> = {};
  public disabled: boolean = false;
  public classList = {
    classes: new Set<string>(),
    add: (c: string) => this.classList.classes.add(c),
    remove: (c: string) => this.classList.classes.delete(c),
    contains: (c: string) => this.classList.classes.has(c),
    toggle: (c: string, force?: boolean) => {
      if (force === undefined) {
        if (this.classList.classes.has(c)) this.classList.classes.delete(c);
        else this.classList.classes.add(c);
      } else if (force) {
        this.classList.classes.add(c);
      } else {
        this.classList.classes.delete(c);
      }
    },
  };
  public currentTime: number = 0;
  private listeners: Record<string, Function[]> = {};

  addEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  click() {
    this.trigger('click');
  }

  trigger(event: string) {
    this.listeners[event]?.forEach((fn) => fn());
  }

  setAttribute(_name: string, _val: string) {}
  appendChild(_child: any) {}
  pause() {}
  async play() {}
}

describe('Cinematic Video Player & Voice Acting System', () => {
  let soundEngine: SoundEngine;
  let voiceManager: CutsceneVoiceManager;
  let cutsceneManager: OriginCutsceneManager;
  let elements: Record<string, MockElement> = {};

  beforeEach(() => {
    elements = {
      'origin-cutscene-overlay': new MockElement(),
      'cutscene-mode-btn': new MockElement(),
      'cutscene-mute-btn': new MockElement(),
      'cutscene-skip-btn': new MockElement(),
      'cutscene-close-btn': new MockElement(),
      'cutscene-video-container': new MockElement(),
      'cutscene-video-player': new MockElement(),
      'cutscene-video-progress': new MockElement(),
      'cutscene-video-scrubber': new MockElement(),
      'video-time-tag': new MockElement(),
      'video-center-play-btn': new MockElement(),
      'video-chapter-title-card': new MockElement(),
      'video-title-card-super': new MockElement(),
      'video-title-card-main': new MockElement(),
      'video-title-card-sub': new MockElement(),
      'cutscene-video-subtitles': new MockElement(),
      'video-sub-avatar': new MockElement(),
      'video-sub-speaker-name': new MockElement(),
      'video-sub-equalizer': new MockElement(),
      'video-sub-text': new MockElement(),
      'cutscene-video-controls-hud': new MockElement(),
      'video-hud-play-btn': new MockElement(),
      'video-hud-rewind-btn': new MockElement(),
      'video-hud-forward-btn': new MockElement(),
      'video-hud-time-display': new MockElement(),
      'video-hud-voice-btn': new MockElement(),
      'video-hud-subtitles-btn': new MockElement(),
      'video-hud-theater-btn': new MockElement(),
      'cutscene-overall-timeline-wrap': new MockElement(),
      'cutscene-overall-timeline-bar': new MockElement(),
      'cutscene-overall-progress-fill': new MockElement(),
      'cutscene-overall-remaining-text': new MockElement(),
      'cutscene-overall-elapsed-text': new MockElement(),
      'cutscene-dialogue-card': new MockElement(),
      'cutscene-speaker-avatar': new MockElement(),
      'cutscene-voice-waves': new MockElement(),
      'cutscene-speaker-name': new MockElement(),
      'cutscene-speaker-voice-tag': new MockElement(),
      'cutscene-speech-text': new MockElement(),
      'cutscene-voice-speak-btn': new MockElement(),
      'cutscene-voice-toggle-btn': new MockElement(),
      'cutscene-chapter-badge': new MockElement(),
      'cutscene-chapter-title': new MockElement(),
      'cutscene-narrative-text': new MockElement(),
      'cutscene-chapter-pips': new MockElement(),
      'cutscene-prev-btn': new MockElement(),
      'cutscene-play-pause-btn': new MockElement(),
      'cutscene-next-btn': new MockElement(),
    };

    (globalThis as any).document = {
      getElementById: (id: string) => elements[id] || null,
      querySelectorAll: () => [],
      createElement: () => new MockElement(),
    };

    (globalThis as any).window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {},
      },
    };

    soundEngine = new SoundEngine();
    voiceManager = new CutsceneVoiceManager(soundEngine);
    cutsceneManager = new OriginCutsceneManager(soundEngine);
  });

  it('initializes in-video subtitles and synchronizes dialogue text with speaker badges', () => {
    voiceManager.initDOM();

    const testLine = {
      id: 'test_line',
      speakerId: 'titan_magma' as const,
      text: 'I am the eternal flame!',
      durationEstimateMs: 3000,
    };

    voiceManager.updateDialogueUI(testLine, false);

    const subAvatar = elements['video-sub-avatar'];
    const subName = elements['video-sub-speaker-name'];
    const subText = elements['video-sub-text'];

    expect(subAvatar?.textContent).toBe(VOICE_PROFILES.titan_magma.avatar);
    expect(subName?.textContent).toBe(VOICE_PROFILES.titan_magma.name);
    expect(subText?.textContent).toBe('“I am the eternal flame!”');
  });

  it('toggles in-video subtitles on and off with visual classes', () => {
    voiceManager.initDOM();
    const subtitlesEl = elements['cutscene-video-subtitles'];
    const subtitlesBtn = elements['video-hud-subtitles-btn'];

    expect(subtitlesEl?.classList.contains('subtitles-hidden')).toBe(false);

    // Toggle off
    voiceManager.toggleSubtitles(false);
    expect(subtitlesEl?.classList.contains('subtitles-hidden')).toBe(true);
    expect(subtitlesBtn?.textContent).toContain('Off');

    // Toggle on
    voiceManager.toggleSubtitles(true);
    expect(subtitlesEl?.classList.contains('subtitles-hidden')).toBe(false);
    expect(subtitlesBtn?.textContent).toContain('Subtitles');
  });

  it('triggers character speech babble when speaking a dialogue line', () => {
    const babbleSpy = vi.spyOn(soundEngine, 'playCharacterSpeechBabble');
    voiceManager.initDOM();

    const testLine = {
      id: 'test_line_babble',
      speakerId: 'wizard' as const,
      text: 'Awaken, champion of elements!',
      durationEstimateMs: 3000,
    };

    voiceManager.speakLine(testLine);

    expect(babbleSpy).toHaveBeenCalledWith('wizard', expect.any(Number));
    voiceManager.stopAll();
  });

  it('displays cinematic chapter title card with animated heading and theme glow', () => {
    cutsceneManager.initDOM();

    cutsceneManager.showChapterTitleCard(0);

    const superEl = elements['video-title-card-super'];
    const mainEl = elements['video-title-card-main'];
    const titleCard = elements['video-chapter-title-card'];

    expect(superEl?.textContent).toBe('CHAPTER I');
    expect(mainEl?.textContent).toBe('WHEN TITANS COLLIDED');
    expect(titleCard?.classList.contains('show-title-card')).toBe(true);
  });

  it('toggles widescreen theater mode on the video container', () => {
    cutsceneManager.initDOM();
    const videoContainer = elements['cutscene-video-container'];
    const theaterBtn = elements['video-hud-theater-btn'];

    expect(videoContainer?.classList.contains('theater-mode')).toBe(false);

    cutsceneManager.toggleTheaterMode();
    expect(videoContainer?.classList.contains('theater-mode')).toBe(true);
    expect(theaterBtn?.textContent).toBe('⛶ Default');

    cutsceneManager.toggleTheaterMode();
    expect(videoContainer?.classList.contains('theater-mode')).toBe(false);
    expect(theaterBtn?.textContent).toBe('⛶ Theater');
  });

  it('synchronizes HUD play/pause buttons and center play button states', () => {
    cutsceneManager.initDOM();
    const centerBtn = elements['video-center-play-btn'];
    const hudPlayBtn = elements['video-hud-play-btn'];

    cutsceneManager.pause();
    expect(centerBtn?.classList.contains('show')).toBe(true);
    expect(hudPlayBtn?.textContent).toBe('▶');

    cutsceneManager.play();
    expect(centerBtn?.classList.contains('show')).toBe(false);
    expect(hudPlayBtn?.textContent).toBe('⏸');
  });

  it('accurately represents how much longer the cutscene is on both video scrubber and bottom timeline bar', () => {
    cutsceneManager.initDOM();

    // Start at Chapter 1 (0 of 6)
    cutsceneManager.goToChapter(0, true);
    cutsceneManager.pause(); // Pause so time is fixed at start of Chapter 1

    const overallFill = elements['cutscene-overall-progress-fill'];
    const remainingText = elements['cutscene-overall-remaining-text'];
    const elapsedText = elements['cutscene-overall-elapsed-text'];
    const videoProgress = elements['cutscene-video-progress'];
    const hudTimeDisplay = elements['video-hud-time-display'];

    expect(overallFill?.style.width).toBe('0%');
    expect(videoProgress?.style.width).toBe('0%');
    expect(remainingText?.textContent).toBe('00:30 remaining');
    expect(elapsedText?.textContent).toContain('00:00 / 00:30');
    expect(hudTimeDisplay?.textContent).toContain('00:00 / 00:30 (-00:30)');

    // Advance to Chapter 4 (3 of 6, halfway through cutscene)
    cutsceneManager.goToChapter(3, true);
    cutsceneManager.pause();

    expect(overallFill?.style.width).toBe('50%');
    expect(videoProgress?.style.width).toBe('50%');
    expect(remainingText?.textContent).toBe('00:15 remaining');
    expect(elapsedText?.textContent).toContain('00:15 / 00:30');
    expect(hudTimeDisplay?.textContent).toContain('00:15 / 00:30 (-00:15)');

    // Advance to Chapter 6 (5 of 6, final chapter)
    cutsceneManager.goToChapter(5, true);
    cutsceneManager.pause();

    // At start of Chapter 6 (5/6 = ~83.33%)
    const fillWidth = parseFloat(overallFill?.style.width || '0');
    expect(fillWidth).toBeCloseTo(83.33, 1);
    expect(remainingText?.textContent).toBe('00:05 remaining');
  });

  it('stays on each scene long enough for the voiceover to finish before advancing', () => {
    vi.useFakeTimers();
    cutsceneManager.initDOM();
    cutsceneManager.goToChapter(0, true);
    cutsceneManager.play();

    expect(cutsceneManager.getCurrentChapterIndex()).toBe(0);

    // After 5 seconds (the old premature limit), it should STILL be on Chapter 0
    vi.advanceTimersByTime(5000);
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(0);

    // Even after 7 seconds, it remains on Chapter 0 while voiceover is speaking
    vi.advanceTimersByTime(2000);
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(0);

    // Now trigger voiceover dialogue completion for Chapter 0
    cutsceneManager.voiceManager.onChapterDialogueComplete?.(0);

    // Within the 1.8s post-dialogue savor period, it remains on Chapter 0
    vi.advanceTimersByTime(1000);
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(0);

    // After the 1.8s savor buffer elapses, it advances to Chapter 1!
    vi.advanceTimersByTime(850);
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(1);

    vi.useRealTimers();
  });

  it('prevents video from overshooting into the next chapter scene to eliminate image flicker', () => {
    cutsceneManager.initDOM();
    cutsceneManager.setViewMode('video');
    cutsceneManager.goToChapter(1, true); // Chapter 2: video slice 5.0s - 10.0s (scene 2)
    cutsceneManager.play();

    const video = elements['cutscene-video-player'];
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(1);

    // Simulate video playing near end of chapter 1 segment (9.8s)
    video.currentTime = 9.8;
    video.trigger('timeupdate');

    // It should hold at 9.5s (segHold) so it never touches 10.0s where the next image begins
    expect(video.currentTime).toBe(9.5);
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(1);

    // Ensure it also holds via enforceVideoSegmentBoundary called in updateProgressUI
    video.currentTime = 9.99;
    cutsceneManager.enforceVideoSegmentBoundary();
    expect(video.currentTime).toBe(9.5);
    expect(cutsceneManager.getCurrentChapterIndex()).toBe(1);
  });
});


