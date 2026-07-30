export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private patches: Map<string, SynthPatch> = new Map();
  private currentMusic: OscillatorNode[] = [];
  private musicInterval: number | null = null;

  constructor() {
    this.initAudio();
    this.definePatches();
  }

  private initAudio(): void {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.gain.value = 0.7;
      this.musicGain.gain.value = 0.5;
      this.sfxGain.gain.value = 0.8;
    } catch (e) {
      console.warn('AudioContext init failed:', e);
    }
  }

  private definePatches(): void {
    // 引擎怠速
    this.patches.set('engine_idle', {
      oscillators: [
        { type: 'sawtooth', freq: 60, gain: 0.08, detune: 0 },
        { type: 'sawtooth', freq: 120, gain: 0.04, detune: -5 },
      ],
      filter: { type: 'lowpass', freq: 200, Q: 2 },
      envelope: { attack: 0.1, decay: 0.5, sustain: 0.8, release: 0.3 },
      loop: true,
    });

    // 引擎高转速
    this.patches.set('engine_high', {
      oscillators: [
        { type: 'square', freq: 120, gain: 0.12, detune: 0 },
        { type: 'sawtooth', freq: 240, gain: 0.08, detune: 3 },
        { type: 'triangle', freq: 360, gain: 0.05, detune: -2 },
      ],
      filter: { type: 'lowpass', freq: 800, Q: 3 },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.9, release: 0.2 },
      loop: true,
    });

    // 漂移开始
    this.patches.set('drift_start', {
      oscillators: [
        { type: 'sawtooth', freq: 0, gain: 0.3, noise: true },
      ],
      filter: { type: 'bandpass', freq: 2000, Q: 5 },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.5 },
    });

    // 漂移持续
    this.patches.set('drift_loop', {
      oscillators: [
        { type: 'sawtooth', freq: 0, gain: 0.15, noise: true },
        { type: 'sawtooth', freq: 180, gain: 0.08 },
      ],
      filter: { type: 'bandpass', freq: 1500, Q: 4 },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.3 },
      loop: true,
    });

    // 漂移结束
    this.patches.set('drift_end', {
      oscillators: [
        { type: 'sawtooth', freq: 0, gain: 0.2, noise: true },
      ],
      filter: { type: 'highpass', freq: 800, Q: 2 },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.2 },
    });

    // 撞击轻微
    this.patches.set('impact_light', {
      oscillators: [
        { type: 'sine', freq: 150, gain: 0.3 },
        { type: 'sine', freq: 0, gain: 0.1, noise: true },
      ],
      filter: { type: 'lowpass', freq: 800, Q: 1 },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
    });

    // 撞击重
    this.patches.set('impact_heavy', {
      oscillators: [
        { type: 'square', freq: 80, gain: 0.5 },
        { type: 'sine', freq: 0, gain: 0.3, noise: true },
        { type: 'sine', freq: 40, gain: 0.3 },
      ],
      filter: { type: 'lowpass', freq: 400, Q: 2 },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 },
    });

    // 拾取信用点
    this.patches.set('pickup_credit', {
      oscillators: [
        { type: 'sine', freq: 880, gain: 0.2 },
        { type: 'sine', freq: 1320, gain: 0.15 },
      ],
      filter: { type: 'lowpass', freq: 2000, Q: 1 },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
    });

    // 拾取氮气
    this.patches.set('pickup_boost', {
      oscillators: [
        { type: 'square', freq: 440, gain: 0.15 },
        { type: 'square', freq: 880, gain: 0.1 },
      ],
      filter: { type: 'lowpass', freq: 1500, Q: 2 },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.15 },
    });

    // 拾取修理
    this.patches.set('pickup_repair', {
      oscillators: [
        { type: 'sine', freq: 523, gain: 0.2 },
        { type: 'sine', freq: 659, gain: 0.15 },
        { type: 'sine', freq: 784, gain: 0.1 },
      ],
      filter: { type: 'lowpass', freq: 2000, Q: 1 },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
    });

    // 氮气喷射
    this.patches.set('boost_activate', {
      oscillators: [
        { type: 'sawtooth', freq: 220, gain: 0.2 },
        { type: 'sawtooth', freq: 0, gain: 0.15, noise: true },
      ],
      filter: { type: 'highpass', freq: 500, Q: 3 },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.3 },
    });

    // 菜单选择
    this.patches.set('ui_select', {
      oscillators: [
        { type: 'sine', freq: 800, gain: 0.15 },
      ],
      filter: { type: 'lowpass', freq: 1000, Q: 1 },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 },
    });

    // 菜单确认
    this.patches.set('ui_confirm', {
      oscillators: [
        { type: 'sine', freq: 600, gain: 0.2 },
        { type: 'sine', freq: 900, gain: 0.15 },
      ],
      filter: { type: 'lowpass', freq: 1500, Q: 1 },
      envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.08 },
    });

    // 背景音乐 - 合成器波
    this.patches.set('music_main', {
      oscillators: [
        { type: 'sawtooth', freq: 55, gain: 0.05 },
        { type: 'square', freq: 110, gain: 0.03 },
      ],
      filter: { type: 'lowpass', freq: 400, Q: 2 },
      envelope: { attack: 0.5, decay: 1, sustain: 0.6, release: 2 },
      loop: true,
      arpeggio: [0, 5, 7, 12, 7, 5],
      tempo: 140,
    });

    this.patches.set('music_boss', {
      oscillators: [
        { type: 'square', freq: 40, gain: 0.08 },
        { type: 'sawtooth', freq: 80, gain: 0.05 },
        { type: 'triangle', freq: 160, gain: 0.03 },
      ],
      filter: { type: 'lowpass', freq: 600, Q: 3 },
      envelope: { attack: 0.3, decay: 0.8, sustain: 0.7, release: 1.5 },
      loop: true,
      arpeggio: [0, 3, 7, 10, 12, 10, 7, 3],
      tempo: 160,
    });
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setMasterVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  setMusicVolume(v: number): void {
    if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, v));
  }

  setSfxVolume(v: number): void {
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v));
  }

  play(name: string, options: PlayOptions = {}): AudioNode | null {
    if (!this.ctx || !this.sfxGain) return null;
    const patch = this.patches.get(name);
    if (!patch) return null;

    const gain = this.ctx.createGain();
    gain.connect(this.sfxGain);
    gain.gain.value = options.volume ?? 1;

    const now = this.ctx.currentTime;
    const pitch = options.pitch ?? 1;

    for (const oscDef of patch.oscillators) {
      // 噪音源特殊处理
      if (oscDef.noise) {
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const noiseGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = patch.filter.type;
        filter.frequency.value = patch.filter.freq;
        filter.Q.value = patch.filter.Q;

        const env = patch.envelope;
        const t = now;
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(oscDef.gain, t + env.attack);
        noiseGain.gain.linearRampToValueAtTime(oscDef.gain * env.sustain, t + env.attack + env.decay);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(gain);

        noise.start(t);
        if (!patch.loop) {
          noiseGain.gain.linearRampToValueAtTime(0, t + env.attack + env.decay + env.sustain + env.release);
          noise.stop(t + env.attack + env.decay + env.sustain + env.release + 0.1);
        }
        continue;
      }

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = oscDef.type;
      osc.frequency.value = oscDef.freq * pitch;
      if (oscDef.detune) osc.detune.value = oscDef.detune;

      filter.type = patch.filter.type;
      filter.frequency.value = patch.filter.freq;
      filter.Q.value = patch.filter.Q;

      const env = patch.envelope;
      const t = now;
      oscGain.gain.setValueAtTime(0, t);
      oscGain.gain.linearRampToValueAtTime(oscDef.gain, t + env.attack);
      oscGain.gain.linearRampToValueAtTime(oscDef.gain * env.sustain, t + env.attack + env.decay);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(gain);

      osc.start(t);
      if (!patch.loop) {
        oscGain.gain.linearRampToValueAtTime(0, t + env.attack + env.decay + env.sustain + env.release);
        osc.stop(t + env.attack + env.decay + env.sustain + env.release + 0.1);
      } else {
        (osc as any)._gainNode = oscGain;
        (osc as any)._patch = patch;
        (osc as any)._startTime = t;
      }
    }

    if (!patch.loop) {
      setTimeout(() => gain.disconnect(), (patch.envelope.attack + patch.envelope.decay + patch.envelope.sustain + patch.envelope.release) * 1000 + 100);
    }

    return gain;
  }

  stopLoop(node: AudioNode): void {
    try { node.disconnect(); } catch {}
  }

  startMusic(track: string): void {
    this.stopMusic();
    if (!this.ctx || !this.musicGain) return;
    const patch = this.patches.get(track);
    if (!patch || !patch.loop) return;

    let noteIndex = 0;
    const baseFreq = patch.oscillators[0]?.freq || 55;
    const arpeggio = patch.arpeggio || [0];
    const tempo = patch.tempo || 120;
    const beatMs = 60000 / tempo;

    const playNote = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const semitones = arpeggio[noteIndex % arpeggio.length] ?? 0;
      const freq = baseFreq * Math.pow(2, semitones / 12);
      noteIndex++;

      for (const oscDef of patch.oscillators) {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = oscDef.type;
        osc.frequency.value = freq * (oscDef.freq / baseFreq);
        if (oscDef.detune) osc.detune.value = oscDef.detune;

        filter.type = patch.filter.type;
        filter.frequency.value = patch.filter.freq;
        filter.Q.value = patch.filter.Q;

        const env = patch.envelope;
        const now = this.ctx.currentTime;
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(oscDef.gain, now + env.attack);
        oscGain.gain.linearRampToValueAtTime(oscDef.gain * env.sustain, now + env.attack + env.decay);
        oscGain.gain.linearRampToValueAtTime(0, now + env.attack + env.decay + env.sustain + env.release);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.musicGain!);

        osc.start(now);
        osc.stop(now + env.attack + env.decay + env.sustain + env.release + 0.1);
        this.currentMusic.push(osc);
      }
    };

    playNote();
    this.musicInterval = window.setInterval(playNote, beatMs);
  }

  stopMusic(): void {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    for (const osc of this.currentMusic) {
      try { osc.stop(); osc.disconnect(); } catch {}
    }
    this.currentMusic = [];
  }

  dispose(): void {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export interface SynthPatch {
  oscillators: OscDef[];
  filter: { type: BiquadFilterType; freq: number; Q: number };
  envelope: { attack: number; decay: number; sustain: number; release: number };
  loop?: boolean;
  arpeggio?: number[];
  tempo?: number;
}

export interface OscDef {
  type: OscillatorType;
  freq: number;
  gain: number;
  detune?: number;
  noise?: boolean;
}

export interface PlayOptions {
  volume?: number;
  pitch?: number;
  pos?: { x: number; y: number };
}