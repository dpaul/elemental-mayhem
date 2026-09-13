// Elemental Mayhem - Ascent to the Dark Clouds Cutscene Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  DarkCloudsCutsceneManager,
  DARK_CLOUDS_PHASES,
  DARK_CLOUDS_DIALOGUE,
} from '../engine/DarkCloudsCutscene';
import { SoundEngine } from '../audio/SoundEngine';

class MockElement {
  public id: string = '';
  public textContent: string = '';
  public innerHTML: string = '';
  public src: string = '';
  public className: string = '';
  public style: Record<string, string> = {};
  public classList = {
    classes: new Set<string>(),
    add: (...c: string[]) => c.forEach((cls) => this.classList.classes.add(cls)),
    remove: (...c: string[]) => c.forEach((cls) => this.classList.classes.delete(cls)),
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
}

describe('DarkCloudsCutsceneManager (Ascent to the Dark Clouds)', () => {
  let cutscene: DarkCloudsCutsceneManager;
  let mockSoundEngine: SoundEngine;
  let elements: Record<string, MockElement> = {};

  beforeEach(() => {
    elements = {
      'dark-clouds-cutscene-overlay': new MockElement(),
      'dc-cutscene-badge': new MockElement(),
      'dc-cutscene-title': new MockElement(),
      'dc-cutscene-subtitle': new MockElement(),
      'dc-cutscene-narrative': new MockElement(),
      'dc-cutscene-bg-img': new MockElement(),
      'dc-hero-ascension': new MockElement(),
      'dc-boss-silhouette': new MockElement(),
      'dc-lightning-flash': new MockElement(),
      'dc-clouds-container': new MockElement(),
      'dc-subtitle-text': new MockElement(),
      'dc-speaker-badge': new MockElement(),
      'dc-speaker-name': new MockElement(),
      'dc-btn-play-pause': new MockElement(),
      'dc-btn-mute': new MockElement(),
      'dc-btn-skip': new MockElement(),
      'dc-btn-close': new MockElement(),
      'dc-btn-confront': new MockElement(),
    };

    elements['dark-clouds-cutscene-overlay'].classList.add('hidden');
    elements['dc-btn-confront'].classList.add('hidden');

    (globalThis as any).document = {
      getElementById: (id: string) => elements[id] || null,
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

  it('defines 3 distinct story phases for the Dark Clouds ascent', () => {
    expect(DARK_CLOUDS_PHASES.length).toBe(3);
    expect(DARK_CLOUDS_PHASES[0].title).toBe('The Sky Tears Open');
    expect(DARK_CLOUDS_PHASES[1].title).toBe('Ascension Through Dark Clouds');
    expect(DARK_CLOUDS_PHASES[2].title).toBe('Confronting the Void Overlord');
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

  it('updates narration text and phase classes when rendering phases', () => {
    cutscene.initDOM();
    cutscene.renderPhase(1);

    expect(cutscene.getCurrentPhase()).toBe(1);
    const badge = elements['dc-cutscene-badge'];
    const title = elements['dc-cutscene-title'];
    expect(badge.textContent).toBe(DARK_CLOUDS_PHASES[1].badge);
    expect(title.textContent).toBe('Ascension Through Dark Clouds');

    const heroAscension = elements['dc-hero-ascension'];
    expect(heroAscension.classList.contains('ascending-high')).toBe(true);
  });

  it('updates subtitle UI and triggers visual effects on character dialogue', () => {
    cutscene.initDOM();
    const overlay = elements['dark-clouds-cutscene-overlay'];
    overlay.classList.remove('hidden');

    // Simulate Seeker speaking
    cutscene.voiceManager.onDialogueLineStart?.(DARK_CLOUDS_DIALOGUE[1], {
      id: 'seeker',
      name: 'THE SEEKER',
      themeColor: '#38bdf8',
      glowColor: 'rgba(56, 189, 248, 0.8)',
    } as any);

    const subtitle = elements['dc-subtitle-text'];
    const speakerName = elements['dc-speaker-name'];
    expect(subtitle.textContent).toContain(DARK_CLOUDS_DIALOGUE[1].text);
    expect(speakerName.textContent).toBe('THE SEEKER');

    const heroAscension = elements['dc-hero-ascension'];
    expect(heroAscension.classList.contains('surge-light')).toBe(true);

    // Simulate Void Overlord speaking
    cutscene.voiceManager.onDialogueLineStart?.(DARK_CLOUDS_DIALOGUE[3], {
      id: 'void_overlord',
      name: 'VOID OVERLORD',
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

  it('toggles mute state across voice and music engines', () => {
    cutscene.initDOM();
    cutscene.toggleMute();

    const muteBtn = elements['dc-btn-mute'];
    expect(muteBtn.textContent).toBe('🔇 Audio: OFF');
    expect(cutscene.voiceManager.isMuted()).toBe(true);

    cutscene.toggleMute();
    expect(muteBtn.textContent).toBe('🔊 Audio: ON');
    expect(cutscene.voiceManager.isMuted()).toBe(false);
  });
});
