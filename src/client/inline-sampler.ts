/** One tap-based, deliberately unranked introduction. No ranked rules or storage. */
export const GOLD_AT = 2140;
export const IMPACT_AT = 2860;

export type Cue = 'incoming' | 'gold' | 'impact';
export type Attempt = 'clear' | 'early' | 'impact';

export function peek(elapsed: number): Cue {
  return elapsed >= IMPACT_AT ? 'impact' : elapsed >= GOLD_AT ? 'gold' : 'incoming';
}

export function fire(elapsed: number): Attempt {
  const cue = peek(elapsed);
  return cue === 'gold' ? 'clear' : cue === 'incoming' ? 'early' : 'impact';
}

export function rockPosition(elapsed: number, attempt: Attempt | null = null) {
  const progress = attempt === 'clear' ? Math.min(1, elapsed / IMPACT_AT)
    : attempt ? 1 : Math.min(1, Math.max(0, elapsed / IMPACT_AT));
  return { x: 75 - 12 * progress, y: 14 + 42 * progress, progress };
}
