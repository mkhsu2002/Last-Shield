/** Shared scheduling functions also allow an OfflineAudioContext to render the actual mix. */
export function createMasterBus(ctx: BaseAudioContext): GainNode {
  const master = ctx.createGain();
  master.gain.value = 0.78;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  master.connect(limiter);
  limiter.connect(ctx.destination);
  return master;
}

function clampPan(pan: number): number {
  return Number.isFinite(pan) ? Math.max(-1, Math.min(1, pan)) : 0;
}

/** Equal-power stereo movement on transient detail; keep deep bass centered. */
function spatial(
  ctx: BaseAudioContext,
  output: AudioNode,
  pan: number,
  schedule: (bus: AudioNode) => AudioScheduledSourceNode[]
): AudioScheduledSourceNode[] {
  const panner = ctx.createStereoPanner();
  panner.pan.value = clampPan(pan);
  panner.connect(output);
  const sources = schedule(panner);
  let remaining = sources.length;
  for (const source of sources) {
    source.addEventListener(
      "ended",
      () => {
        if (--remaining === 0) panner.disconnect();
      },
      { once: true }
    );
  }
  return sources;
}

function tone(
  ctx: BaseAudioContext,
  output: AudioNode,
  from: number,
  to: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
  delay = 0
): OscillatorNode {
  const osc = ctx.createOscillator(),
    gain = ctx.createGain(),
    now = ctx.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(output);
  osc.start(now);
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
  damage = 34,
  pan = 0
): AudioScheduledSourceNode[] {
  const weight = 0.55 + (Math.min(34, Math.max(1, damage)) / 34) * 0.45;
  return [
    // A sub sweep gives weight on headphones; its tuned upper partial gives
    // small speakers a bass cue rather than just adding more low-end gain.
    tone(ctx, output, 76, 43, 0.58, 0.31 * weight),
    tone(ctx, output, 152, 86, 0.37, 0.17 * weight, "triangle"),
    ...spatial(ctx, output, pan, (side) => [
      tone(ctx, side, 457, 130, 0.16, 0.14 * weight, "triangle"),
      noise(ctx, side, 0.43, 0.3 * weight, 1300, "bandpass"),
      noise(ctx, side, 0.17, 0.16 * weight, 2850, "highpass"),
    ]),
    ...spatial(ctx, output, -pan * 0.64, (side) => [
      tone(ctx, side, 295, 146, 0.42, 0.055 * weight, "triangle", 0.032),
      noise(ctx, side, 0.57, 0.21 * weight, 510, "bandpass"),
    ]),
  ];
}

/** A single broad blast with centered weight and stereo laser/debris detail. */
export function scheduleOverdrive(ctx: BaseAudioContext, output: AudioNode): AudioScheduledSourceNode[] {
  return [
    tone(ctx, output, 91, 34, 0.85, 0.38),
    tone(ctx, output, 182, 68, 0.52, 0.19, "triangle"),
    noise(ctx, output, 0.85, 0.32, 450, "lowpass"),
    ...spatial(ctx, output, -0.8, side => [
      tone(ctx, side, 2400, 160, 0.48, 0.12, "sawtooth"),
      noise(ctx, side, 0.32, 0.22, 1900, "bandpass"),
      tone(ctx, side, 1250, 250, 0.65, 0.055, "triangle", 0.045),
    ]),
    ...spatial(ctx, output, 0.8, side => [
      tone(ctx, side, 2800, 210, 0.55, 0.12, "sawtooth", 0.018),
      noise(ctx, side, 0.52, 0.24, 2600, "bandpass"),
      tone(ctx, side, 1610, 330, 0.78, 0.055, "triangle", 0.075),
    ]),
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
    // Bound overlapping transients even when events are spammed.
    while (this.voices.size + nodes.length > 32 && this.voices.size) {
      const oldest = this.voices.values().next().value;
      if (!oldest) break;
      this.voices.delete(oldest);
      try {
        oldest.stop();
      } catch {
        /* Already ended. */
      }
    }
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
  clear(perfect: boolean, overdrive: boolean, pan = 0): void {
    this.stop();
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== "running")
      return;
    const ctx = this.ctx,
      output = this.master;
    this.track([
      ...spatial(ctx, output, pan, (side) => [
        tone(
          ctx,
          side,
          perfect ? 660 : 440,
          overdrive ? 1760 : 1120,
          0.24,
          0.075,
          "triangle"
        ),
        noise(ctx, side, 0.22, 0.12, 1900, "bandpass"),
      ]),
      ...spatial(ctx, output, -pan * 0.47, (side) => [
        tone(ctx, side, 2210, 530, 0.23, 0.032, "triangle", 0.028),
      ]),
      tone(ctx, output, 126, 72, 0.26, perfect ? 0.16 : 0.1, "triangle"),
      ...(perfect ? [tone(ctx, output, 990, 1480, 0.32, 0.04)] : []),
    ]);
  }
  overdrive(): void {
    this.stop();
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== "running") return;
    this.track(scheduleOverdrive(this.ctx, this.master));
  }
  impact(damage = 34, pan = 0): void {
    this.stop();
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== "running")
      return;
    this.track(scheduleImpact(this.ctx, this.master, damage, pan));
  }
  shatter(destroyed = false, pan = 0): void {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== "running")
      return;
    const ctx = this.ctx;
    const output = this.master;
    const origin = clampPan(pan);
    const fragments = [
      ...spatial(ctx, output, origin, (side) => [
        noise(
          ctx,
          side,
          destroyed ? 0.9 : 0.33,
          destroyed ? 0.22 : 0.1,
          1610,
          "bandpass"
        ),
        tone(ctx, side, 2600, 470, 0.23, 0.046, "triangle"),
      ]),
    ];
    for (let i = 0; i < 4; i++) {
      const spread = (i % 2 === 0 ? -1 : 1) * (0.52 + 0.1 * i);
      fragments.push(
        ...spatial(ctx, output, origin * 0.35 + spread, (side) => [
          tone(
            ctx,
            side,
            1660 + i * 430,
            330 + i * 95,
            0.33 + i * 0.08,
            0.038,
            "triangle",
            0.022 * i
          ),
        ])
      );
    }
    if (destroyed) {
      fragments.push(
        tone(ctx, output, 103, 41, 0.85, 0.26),
        tone(ctx, output, 206, 82, 0.52, 0.13, "triangle"),
        noise(ctx, output, 0.65, 0.15, 470, "lowpass")
      );
    }
    this.track(fragments);
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
      this.gain.gain.value = 0;
      this.gain.gain.setTargetAtTime(
        overdrive ? 0.055 : 0.03,
        ctx.currentTime,
        0.018
      );
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
