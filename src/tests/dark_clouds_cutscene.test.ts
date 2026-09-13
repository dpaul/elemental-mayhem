// Elemental Mayhem - Ascent to the Dark Clouds / Void Overlord Cutscene Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  DarkCloudsCutsceneManager,
  DARK_CLOUDS_CHAPTERS,
  DARK_CLOUDS_DIALOGUE,
} from '../engine/DarkCloudsCutscene';

class MockElement {
  public id: string = '';
  public textContent: string = '';
  public innerHTML: string = '';
  public src: string = '';
  public className: string = '';
  public style: Record<string, string> = {};
  public children: any[] = [];
  public classList = {
    classes: new Set<string>(),
    add: (...c: string[]) => c.forEach((cls) => this.classList.classes.add(cls)),
    remove: (...c: string[]) => c.forEach((cls) => this.classList.classes.delete(cls)),
    contains: (c: string) => this.classList.classes.has(c),
    toggle: (c: string, force?: boolean) => {
      if (force === undefined) {
        if (this.classList.classes.has(c)) this.classList.classes.delete(c);
        else this.classList.classes.add(c);
        return !this.classList.classes.has(c);
      } else if (force) {
        this.classList.classes.add(c);
        return true;
      } else {
        this.classList.classes.delete(c);
        return false;
      }
    },
  };
  private listeners: Record<string, Function[]> = {};

  appendChild(el: any) {
    this.children.push(el);
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 600, height: 40 };
  }

  addEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  getContext() {
    return {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
    };
  }

  click() {
    this.trigger('click');
  }

  trigger(event: string) {
    (this.listeners[event] || []).forEach((fn) => fn({ stopPropagation: () => {} }));
  }

  setAttribute(_name: string, _val: string) {}
}

describe('DarkCloudsCutsceneManager (Saga of the Void Overlord)', () => {
  let cutscene: DarkCloudsCutsceneManager;
  let mockSoundEngine: any;
  let elements: Record<string, MockElement>;

  beforeEach(() => {
    mockSoundEngine = {
      playClick: vi.fn(),
      playSpellCast: vi.fn(),
      playDarkCloudsWhirl: vi.fn(),
      playCutsceneWizardBlessing: vi.fn(),
      playCutsceneBossBraam: vi.fn(),
      playCharacterVocalTone: vi.fn(),
      unlockAudio: vi.fn(),
    };

    elements = {
      'dark-clouds-cutscene-overlay': new MockElement(),
      'dc-cutscene-badge': new MockElement(),
      'dc-cutscene-title': new MockElement(),
      'dc-cutscene-subtitle': new MockElement(),
      'dc-cutscene-narrative': new MockElement(),
      'dc-cutscene-bg-img': new MockElement(),
      'dc-visual-frame': new MockElement(),
      'dc-hero-ascension': new MockElement(),
      'dc-boss-silhouette': new MockElement(),
      'dc-lightning-flash': new MockElement(),
      'dc-lightning-canvas': new MockElement(),
      'dc-anamorphic-streak': new MockElement(),
      'dc-clouds-container': new MockElement(),
      'dc-stolen-elements': new MockElement(),
      'dc-title-card': new MockElement(),
      'dc-title-card-super': new MockElement(),
      'dc-title-card-main': new MockElement(),
      'dc-title-card-sub': new MockElement(),
      'dc-video-subtitles': new MockElement(),
      'dc-subtitle-text': new MockElement(),
      'dc-speaker-badge': new MockElement(),
      'dc-speaker-name': new MockElement(),
      'dc-speaker-avatar': new MockElement(),
      'dc-sub-equalizer': new MockElement(),
      'dc-chapter-pips': new MockElement(),
      'dc-video-progress': new MockElement(),
      'dc-video-scrubber': new MockElement(),
      'dc-time-display': new MockElement(),
      'dc-top-time-tag': new MockElement(),
      'dc-center-play-btn': new MockElement(),
      'dc-center-play-icon': new MockElement(),
      'dc-btn-play-pause': new MockElement(),
      'dc-btn-prev': new MockElement(),
      'dc-btn-next': new MockElement(),
      'dc-btn-mute': new MockElement(),
      'dc-btn-skip': new MockElement(),
      'dc-btn-close': new MockElement(),
      'dc-btn-confront': new MockElement(),
      'dc-btn-mode': new MockElement(),
      'dc-btn-voices': new MockElement(),
      'dc-btn-subtitles': new MockElement(),
      'dc-btn-theater': new MockElement(),
    };

    elements['dark-clouds-cutscene-overlay'].classList.add('hidden');
    elements['dc-btn-confront'].classList.add('hidden');

    (globalThis as any).document = {
      getElementById: (id: string) => elements[id] || null,
      createElement: () => new MockElement(),
    };

    (globalThis as any).window = {
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: vi.fn().mockReturnValue([]),
      },
    };

    mockSoundEngine = {
      unlockAudio: vi.fn(),
      playClick: vi.fn(),
      playDarkCloudsWhirl: vi.fn(),
      playSpellCast: vi.fn(),
      playCutsceneWizardBlessing: vi.fn(),
      playCharacterVocalTone: vi.fn(),
      playCharacterSpeechBabble: vi.fn().mockReturnValue({ stop: vi.fn() }),
    } as any;

    cutscene = new DarkCloudsCutsceneManager(mockSoundEngine);
  });

  afterEach(() => {
    cutscene.close();
    vi.restoreAllMocks();
  });

  it('defines 6 rich story chapters for the Saga of the Void Overlord', () => {
    expect(DARK_CLOUDS_CHAPTERS.length).toBe(6);
    expect(DARK_CLOUDS_CHAPTERS[0].title).toBe('Birth of the Void Overlord');
    expect(DARK_CLOUDS_CHAPTERS[1].title).toBe('The Grand Wizard Ambushed');
    expect(DARK_CLOUDS_CHAPTERS[2].title).toBe('Domain of the Dark Clouds');
    expect(DARK_CLOUDS_CHAPTERS[3].title).toBe("The Overlord's Decree");
    expect(DARK_CLOUDS_CHAPTERS[4].title).toBe('The Sky Sunders at Round 1,000');
    expect(DARK_CLOUDS_CHAPTERS[5].title).toBe('Confronting the Void Overlord');
  });

  it('scripted dialogue features Narrator, Seeker, Arch-Wizard, and Void Overlord', () => {
    const speakerIds = DARK_CLOUDS_DIALOGUE.map((d) => d.speakerId);
    expect(speakerIds).toContain('narrator');
    expect(speakerIds).toContain('seeker');
    expect(speakerIds).toContain('wizard');
    expect(speakerIds).toContain('void_overlord');
  });

  it('initializes DOM elements and reveals overlay when opened', () => {
    cutscene.initDOM();
    const overlay = elements['dark-clouds-cutscene-overlay'];
    expect(overlay.classList.contains('hidden')).toBe(true);

    cutscene.open();
    expect(overlay.classList.contains('hidden')).toBe(false);
    expect(cutscene.isCutscenePlaying()).toBe(true);
    expect(mockSoundEngine.unlockAudio).toHaveBeenCalled();
    expect(mockSoundEngine.playDarkCloudsWhirl).toHaveBeenCalled();
  });

  it('updates narration text and renders chapters accurately', () => {
    cutscene.initDOM();
    cutscene.renderChapter(1);

    expect(cutscene.getCurrentChapter()).toBe(1);
    const badge = elements['dc-cutscene-badge'];
    const title = elements['dc-cutscene-title'];
    expect(badge.textContent).toBe(DARK_CLOUDS_CHAPTERS[1].badge);
    expect(title.textContent).toBe('The Grand Wizard Ambushed');

    const pipsContainer = elements['dc-chapter-pips'];
    expect(pipsContainer.children.length).toBe(6);
  });

  it('navigates seamlessly across chapters using nextChapter and prevChapter', () => {
    cutscene.initDOM();
    cutscene.open(0);
    expect(cutscene.getCurrentChapter()).toBe(0);

    cutscene.nextChapter();
    expect(cutscene.getCurrentChapter()).toBe(1);

    cutscene.nextChapter();
    expect(cutscene.getCurrentChapter()).toBe(2);

    cutscene.prevChapter();
    expect(cutscene.getCurrentChapter()).toBe(1);
  });

  it('updates subtitle UI and triggers visual effects on character dialogue', () => {
    cutscene.initDOM();
    const overlay = elements['dark-clouds-cutscene-overlay'];
    overlay.classList.remove('hidden');

    // Simulate Seeker speaking
    const seekerLine = DARK_CLOUDS_DIALOGUE.find((d) => d.speakerId === 'seeker')!;
    cutscene.voiceManager.onDialogueLineStart?.(seekerLine, {
      id: 'seeker',
      name: 'THE SEEKER',
      avatar: '🧙‍♂️',
      themeColor: '#38bdf8',
      glowColor: 'rgba(56, 189, 248, 0.8)',
    } as any);

    const subtitle = elements['dc-subtitle-text'];
    const speakerName = elements['dc-speaker-name'];
    expect(subtitle.textContent).toContain(seekerLine.text);
    expect(speakerName.textContent).toBe('THE SEEKER');

    const heroAscension = elements['dc-hero-ascension'];
    expect(heroAscension.classList.contains('surge-light')).toBe(true);

    // Simulate Void Overlord speaking
    const overlordLine = DARK_CLOUDS_DIALOGUE.find((d) => d.speakerId === 'void_overlord')!;
    cutscene.voiceManager.onDialogueLineStart?.(overlordLine, {
      id: 'void_overlord',
      name: 'VOID OVERLORD',
      avatar: '👑🌌',
      themeColor: '#ec4899',
      glowColor: 'rgba(236, 72, 153, 0.9)',
    } as any);

    const bossSilhouette = elements['dc-boss-silhouette'];
    expect(bossSilhouette.classList.contains('pulse-menace')).toBe(true);
    expect(mockSoundEngine.playDarkCloudsWhirl).toHaveBeenCalled();
  });

  it('triggers lightning flash animation and sound effect', () => {
    cutscene.initDOM();
    const lightning = elements['dc-lightning-flash'];
    expect(lightning.classList.contains('flash-anim')).toBe(false);

    cutscene.triggerLightningFlash();
    expect(lightning.classList.contains('flash-anim')).toBe(true);
    expect(mockSoundEngine.playSpellCast).toHaveBeenCalledWith('Lightning');
  });

  it('skips the cutscene and invokes onComplete callback', () => {
    cutscene.initDOM();
    cutscene.open();

    const completeSpy = vi.fn();
    cutscene.onComplete = completeSpy;

    cutscene.skip();

    expect(cutscene.isCutscenePlaying()).toBe(false);
    const overlay = elements['dark-clouds-cutscene-overlay'];
    expect(overlay.classList.contains('hidden')).toBe(true);
    expect(completeSpy).toHaveBeenCalledTimes(1);
  });

  it('clicking confront button closes cutscene and invokes onComplete', () => {
    cutscene.initDOM();
    cutscene.open();

    const completeSpy = vi.fn();
    cutscene.onComplete = completeSpy;

    const confrontBtn = elements['dc-btn-confront'];
    confrontBtn.click();

    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect(cutscene.isCutscenePlaying()).toBe(false);
  });

  it('toggles playback, mute, mode, voices, subtitles, and theater', () => {
    cutscene.initDOM();
    cutscene.open();

    // Play/Pause
    cutscene.togglePlayPause();
    expect(cutscene.isCutscenePlaying()).toBe(false);
    cutscene.togglePlayPause();
    expect(cutscene.isCutscenePlaying()).toBe(true);

    // Mute
    cutscene.toggleMute();
    expect(cutscene.voiceManager.isMuted()).toBe(true);
    cutscene.toggleMute();
    expect(cutscene.voiceManager.isMuted()).toBe(false);

    // Mode
    cutscene.toggleMode();
    const overlay = elements['dark-clouds-cutscene-overlay'];
    expect(overlay.classList.contains('stage-view-active')).toBe(true);

    // Theater
    cutscene.toggleTheater();
    expect(overlay.classList.contains('theater-mode')).toBe(true);
  });
});
