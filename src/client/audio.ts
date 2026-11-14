export class SynthAudio {
  muted = false;
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  unlock(): void {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
    } catch { /* Visual cues remain playable without audio. */ }
  }
  tone(from: number, to: number, duration = .12, volume = .06, type: OscillatorType = 'sine'): void {
    const ctx = this.ctx;
    if (this.muted || !ctx || ctx.state !== 'running') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration + .03);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  clear(perfect: boolean, overdrive: boolean): void {
    this.stop();
    this.tone(perfect ? 660 : 440, overdrive ? 1760 : 1120, .3, .10, 'triangle');
    if (perfect) this.tone(990, 1480, .42, .06);
  }
  impact(): void { this.stop(); this.tone(130, 35, .4, .12, 'sawtooth'); }
  beam(progress: number | null, overdrive: boolean): void {
    const ctx = this.ctx;
    if (progress === null || this.muted || !ctx || ctx.state !== 'running') { this.stop(); return; }
    if (!this.oscillator) {
      this.oscillator = ctx.createOscillator();
      this.gain = ctx.createGain();
      this.oscillator.type = 'triangle';
      this.gain.gain.value = .035;
      this.oscillator.connect(this.gain); this.gain.connect(ctx.destination);
      this.oscillator.start();
    }
    this.oscillator.frequency.setTargetAtTime(100 + progress * (overdrive ? 480 : 280), ctx.currentTime, .04);
  }
  stop(): void {
    const osc = this.oscillator;
    const gain = this.gain;
    const ctx = this.ctx;
    if (osc && gain && ctx) {
      gain.gain.setTargetAtTime(.0001, ctx.currentTime, .015);
      try { osc.stop(ctx.currentTime + .08); } catch { /* Already stopped. */ }
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
    this.oscillator = null; this.gain = null;
  }
}
