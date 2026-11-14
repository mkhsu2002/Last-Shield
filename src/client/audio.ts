/** Shared scheduling functions also allow an OfflineAudioContext to render the actual mix. */
export function createMasterBus(ctx: BaseAudioContext): GainNode {
  const master = ctx.createGain();
  master.gain.value = 0.85;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -9;
  limiter.knee.value = 5;
  limiter.ratio.value = 10;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  master.connect(limiter);
  limiter.connect(ctx.destination);
  return master;
}

function tone(
  ctx: BaseAudioContext,
  output: AudioNode,
  from: number,
  to: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine"
): OscillatorNode {
  const osc = ctx.createOscillator(),
    gain = ctx.createGain(),
    now = ctx.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(output);
  osc.start();
  osc.stop(now + duration + 0.03);
  osc.addEventListener(
    "ended",
    () => {
      osc.disconnect();
      gain.disconnect();
    },
    { once: true }
  );
  return osc;
}

function noise(
  ctx: BaseAudioContext,
  output: AudioNode,
  duration: number,
  volume: number,
  frequency: number,
  type: BiquadFilterType
): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * duration),
    ctx.sampleRate
  );
  const data = buffer.getChannelData(0);
  // Fixed noise makes the diagnostic sample reproducible; this is sound texture, not gameplay RNG.
  let seed = 93813;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] =
      (seed / 2147483648 - 1) *
      Math.min(1, i / (ctx.sampleRate * 0.002)) *
      Math.pow(1 - i / data.length, 1.5);
  }
  const source = ctx.createBufferSource(),
    filter = ctx.createBiquadFilter(),
    gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = 0.7;
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start();
  source.addEventListener(
    "ended",
    () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    },
    { once: true }
  );
  return source;
}

export function scheduleImpact(
  ctx: BaseAudioContext,
  output: AudioNode,
  damage = 34
): AudioScheduledSourceNode[] {
  const weight = 0.55 + (Math.min(34, Math.max(1, damage)) / 34) * 0.45;
  return [
    tone(ctx, output, 155, 38, 0.72, 0.34 * weight),
    tone(ctx, output, 310, 80, 0.24, 0.17 * weight, "triangle"),
    tone(ctx, output, 680, 140, 0.11, 0.13 * weight, "sawtooth"),
    noise(ctx, output, 0.82, 0.32 * weight, 430, "lowpass"),
    noise(ctx, output, 0.35, 0.3 * weight, 1250, "bandpass"),
    noise(ctx, output, 0.46, 0.14 * weight, 2100, "highpass"),
  ];
}

export class SynthAudio {
  private mutedValue = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  get muted(): boolean {
    return this.mutedValue;
  }
  set muted(value: boolean) {
    this.mutedValue = value;
    if (value) this.stopAll();
  }
  unlock(): void {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = createMasterBus(this.ctx);
      }
      if (this.ctx.state === "suspended")
        void this.ctx.resume().catch(() => {});
    } catch {
      /* Every audio cue has a visual equivalent. */
    }
  }
  private track(nodes: AudioScheduledSourceNode[]): void {
    for (const node of nodes) {
      this.voices.add(node);
      node.addEventListener("ended", () => this.voices.delete(node), {
        once: true,
      });
    }
  }
  tone(
    from: number,
    to: number,
    duration = 0.12,
    volume = 0.06,
    type: OscillatorType = "sine"
  ): void {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== "running")
      return;
    this.track([tone(this.ctx, this.master, from, to, duration, volume, type)]);
  }
  clear(perfect: boolean, overdrive: boolean): void {
    this.stop();
    this.tone(
      perfect ? 660 : 440,
      overdrive ? 1760 : 1120,
      0.24,
      0.075,
      "triangle"
    );
    if (perfect) this.tone(990, 1480, 0.32, 0.04);
  }
  overdrive(): void {
    this.tone(120, 750, 0.35, 0.14, "triangle");
    this.tone(240, 1500, 0.25, 0.07);
  }
  impact(damage = 34): void {
    this.stop();
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== "running")
      return;
    this.track(scheduleImpact(this.ctx, this.master, damage));
  }
  shatter(destroyed = false): void {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== "running")
      return;
    const ctx = this.ctx,
      output = this.master;
    this.track([
      noise(
        ctx,
        output,
        destroyed ? 1.3 : 0.4,
        destroyed ? 0.26 : 0.1,
        1100,
        "bandpass"
      ),
      noise(
        ctx,
        output,
        destroyed ? 1.6 : 0.4,
        destroyed ? 0.22 : 0.08,
        350,
        "lowpass"
      ),
    ]);
    for (let i = 0; i < 4; i++)
      this.tone(1700 + i * 410, 350 + i * 90, 0.5 + i * 0.14, 0.018);
    if (destroyed) this.tone(95, 25, 1.3, 0.26, "triangle");
  }
  beam(progress: number | null, overdrive: boolean): void {
    const ctx = this.ctx;
    if (
      progress === null ||
      this.muted ||
      !ctx ||
      !this.master ||
      ctx.state !== "running"
    ) {
      this.stop();
      return;
    }
    if (!this.oscillator) {
      this.oscillator = ctx.createOscillator();
      this.gain = ctx.createGain();
      this.oscillator.type = "triangle";
      this.gain.gain.value = overdrive ? 0.055 : 0.03;
      this.oscillator.connect(this.gain);
      this.gain.connect(this.master);
      this.oscillator.start();
    }
    this.oscillator.frequency.setTargetAtTime(
      100 + progress * (overdrive ? 480 : 280),
      ctx.currentTime,
      0.04
    );
  }
  stop(): void {
    const osc = this.oscillator,
      gain = this.gain,
      ctx = this.ctx;
    if (osc && gain && ctx) {
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.015);
      try {
        osc.stop(ctx.currentTime + 0.06);
      } catch {
        /* Already stopped. */
      }
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
    this.oscillator = null;
    this.gain = null;
  }
  stopAll(): void {
    this.stop();
    for (const source of this.voices) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.voices.clear();
  }
}
