/** Practice slows observation without changing the rules used by ranked runs. */
export function practiceDelta(
  dt: number, elapsed: number, goldAt: number, holding: boolean, engaged: boolean
): number {
  const slow = dt * 0.5;
  return !holding && !engaged ? Math.min(slow, Math.max(0, goldAt - elapsed)) : slow;
}

export class PracticeReview {
  private remainingMs = 1800;
  advance(dt: number): void { this.remainingMs = Math.max(0, this.remainingMs - Math.max(0, dt)); }
  canContinue(holding: boolean): boolean { return this.remainingMs === 0 && !holding; }
}
