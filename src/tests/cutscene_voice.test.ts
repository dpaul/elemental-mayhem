import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CutsceneVoiceManager,
  VOICE_PROFILES,
  CHAPTER_DIALOGUES,
  VoiceSpeakerId,
} from '../engine/CutsceneVoiceManager';
import { SoundEngine } from '../audio/SoundEngine';

class MockElement {
  public id: string = '';
  public textContent: string = '';
  public style: Record<string, string> = {};
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
  private listeners: Record<string, Function[]> = {};

  addEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  click() {
    this.listeners['click']?.forEach((fn) => fn());
  }
}

describe('CutsceneVoiceManager & Spoken Dialogue System', () => {
  let soundEngine: SoundEngine;
  let voiceManager: CutsceneVoiceManager;
  let elements: Record<string, MockElement> = {};

  beforeEach(() => {
    elements = {
      'cutscene-dialogue-card': new MockElement(),
      'cutscene-speaker-avatar': new MockElement(),
      'cutscene-voice-waves': new MockElement(),
      'cutscene-speaker-name': new MockElement(),
      'cutscene-speaker-voice-tag': new MockElement(),
      'cutscene-speech-text': new MockElement(),
      'cutscene-voice-speak-btn': new MockElement(),
      'cutscene-voice-toggle-btn': new MockElement(),
    };

    (globalThis as any).document = {
      getElementById: (id: string) => elements[id] || null,
    };

    (globalThis as any).window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {},
      },
    };

    soundEngine = new SoundEngine();
    vi.spyOn(soundEngine, 'playClick').mockImplementation(() => {});
    vi.spyOn(soundEngine, 'playCharacterVocalTone').mockImplementation(() => {});

    voiceManager = new CutsceneVoiceManager(soundEngine);
    voiceManager.initDOM();
  });

  it('should define distinct voice profiles for all 6 character roles', () => {
    const roles: VoiceSpeakerId[] = [
      'narrator',
      'titan_magma',
      'titan_void',
      'seeker',
      'wizard',
      'void_overlord',
    ];

    roles.forEach((r) => {
      const profile = VOICE_PROFILES[r];
      expect(profile).toBeDefined();
      expect(profile.name.length).toBeGreaterThan(0);
      expect(profile.tag.length).toBeGreaterThan(0);
      expect(profile.pitch).toBeGreaterThan(0);
      expect(profile.rate).toBeGreaterThan(0);
    });

    // Verify contrast in voice pitches
    expect(VOICE_PROFILES.void_overlord.pitch).toBeLessThan(VOICE_PROFILES.wizard.pitch);
    expect(VOICE_PROFILES.titan_magma.pitch).toBeLessThan(VOICE_PROFILES.narrator.pitch);
    expect(VOICE_PROFILES.seeker.pitch).toBeGreaterThan(VOICE_PROFILES.narrator.pitch);
  });

  it('should have scripted spoken dialogue for each chapter', () => {
    for (let ch = 0; ch < 6; ch++) {
      const lines = CHAPTER_DIALOGUES[ch];
      expect(lines).toBeDefined();
      expect(lines.length).toBeGreaterThanOrEqual(2);
      lines.forEach((line) => {
        expect(line.text.length).toBeGreaterThan(5);
        expect(VOICE_PROFILES[line.speakerId]).toBeDefined();
      });
    }
  });

  it('should feature Magma Colossus and Void Leviathan speaking in Chapter 1 with different voices', () => {
    const ch1Lines = CHAPTER_DIALOGUES[0];
    const speakers = ch1Lines.map((l) => l.speakerId);

    expect(speakers).toContain('narrator');
    expect(speakers).toContain('titan_magma');
    expect(speakers).toContain('titan_void');

    const magmaLine = ch1Lines.find((l) => l.speakerId === 'titan_magma')!;
    expect(magmaLine.text).toContain('eternal flame');

    const voidLine = ch1Lines.find((l) => l.speakerId === 'titan_void')!;
    expect(voidLine.text).toContain('infinite abyss');
  });

  it('should feature Void Overlord, Arch-Wizard, and Seeker dialogue in Chapter 5 & 6', () => {
    const ch5Lines = CHAPTER_DIALOGUES[4];
    const ch5Speakers = ch5Lines.map((l) => l.speakerId);
    expect(ch5Speakers).toContain('void_overlord');
    expect(ch5Speakers).toContain('wizard');
    expect(ch5Speakers).toContain('seeker');
    expect(ch5Speakers).toContain('narrator');

    const overlordLine = ch5Lines.find((l) => l.speakerId === 'void_overlord')!;
    expect(overlordLine.text).toContain('Foolish old wizard');

    const ch6Lines = CHAPTER_DIALOGUES[5];
    const ch6Speakers = ch6Lines.map((l) => l.speakerId);
    expect(ch6Speakers).toContain('wizard');
    expect(ch6Speakers).toContain('void_overlord');
    expect(ch6Speakers).toContain('seeker');
    expect(ch6Speakers).toContain('narrator');

    const wizardLine = ch6Lines.find((l) => l.speakerId === 'wizard')!;
    expect(wizardLine.text).toContain('Round 1000');
  });

  it('should trigger onChapterDialogueComplete when all lines in a chapter have spoken', async () => {
    const completeSpy = vi.fn();
    voiceManager.onChapterDialogueComplete = completeSpy;

    // Use fake timers or trigger playChapter
    voiceManager.playChapter(1); // Chapter 2 has 2 lines

    expect(voiceManager.getCurrentLine()).toBeDefined();
  });

  it('should update dialogue card DOM elements when a line speaks', () => {
    const line = CHAPTER_DIALOGUES[0][1]; // Magma Colossus line
    voiceManager.speakLine(line);

    expect(soundEngine.playCharacterVocalTone).toHaveBeenCalledWith('titan_magma');

    const nameEl = document.getElementById('cutscene-speaker-name');
    const textEl = document.getElementById('cutscene-speech-text');
    const tagEl = document.getElementById('cutscene-speaker-voice-tag');

    expect(nameEl?.textContent).toBe('MAGMA COLOSSUS');
    expect(textEl?.textContent).toBe(line.text);
    expect(tagEl?.textContent).toContain('Volcanic Monster');
  });

  it('should support toggling voiceover mute state', () => {
    expect(voiceManager.isMuted()).toBe(false);

    const mutedState = voiceManager.toggleVoice();
    expect(mutedState).toBe(false); // returned !isVoiceMuted -> false (muted)
    expect(voiceManager.isMuted()).toBe(true);

    const toggleBtn = document.getElementById('cutscene-voice-toggle-btn');
    expect(toggleBtn?.textContent).toContain('MUTED');

    const unmutedState = voiceManager.toggleVoice();
    expect(unmutedState).toBe(true);
    expect(voiceManager.isMuted()).toBe(false);
    expect(toggleBtn?.textContent).toContain('ON');
  });

  it('should trigger onDialogueLineStart callback', () => {
    const startSpy = vi.fn();
    voiceManager.onDialogueLineStart = startSpy;

    const line = CHAPTER_DIALOGUES[3][1]; // Grand Wizard line
    voiceManager.speakLine(line);

    expect(startSpy).toHaveBeenCalledWith(line, VOICE_PROFILES.wizard);
  });
});
