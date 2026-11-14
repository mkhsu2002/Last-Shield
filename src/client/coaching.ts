import type { Mistakes, StormPhase } from '../shared/game-logic.ts';

export const PHASE_LABELS: Record<StormPhase, string> = {
  approach: 'INCOMING FRONT', surge: 'RAPID FRONT', breaker: 'HEAVY BREAKER', respite: 'CALM FRONT',
};
export const CITY_MESSAGES = ['The city lights are still shining.', 'Another storm held outside the walls.', 'Below the shield, life goes on.'];

export function milestone(cleared: number): { target: number; progress: number } {
  return { target: (Math.floor(cleared / 10) + 1) * 10, progress: cleared % 10 };
}

export function retryAdvice(run: { mistakes: Mistakes; early: number; late: number }): string {
  const causes = ['unarmed', 'released', 'late', 'untouched'] as const;
  const dominant = causes.reduce((best, cause) => run.mistakes[cause] > run.mistakes[best] ? cause : best);
  if (run.mistakes[dominant] > 0) {
    return {
      unarmed: 'Release after each core breaks, then start a fresh hold for the next meteor.',
      released: 'Keep holding until the core bursts. A smaller core can still hit the shield.',
      late: 'Start your hold sooner, as the rings meet. PERFECT beams melt faster.',
      untouched: 'When the ring lights up, press and hold anywhere until the core bursts.',
    }[dominant];
  }
  return run.early > run.late ? 'Press a little later, as the rings meet, for a faster PERFECT beam.' :
    run.late > 0 ? 'Meet the rings a little sooner to melt cores faster.' :
    'Three PERFECT clears charge your next beam with double-power OVERDRIVE.';
}
