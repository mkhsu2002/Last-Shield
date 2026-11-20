/** Keep the complete approach, shield and lit city inside a dedicated arena.
 * Source rows outside this camera window contain only decorative sky/city. */
export const ARENA_TOP = 96;
export const ARENA_BOTTOM = 920;
export function fitCombatCanvas(width:number,height:number) {
  const canvasHeight=Math.max(1,Math.floor(Math.min(1080,width*2,height*1080/(ARENA_BOTTOM-ARENA_TOP))));
  return {width:canvasHeight/2,height:canvasHeight,top:-ARENA_TOP*canvasHeight/1080};
}

/** Floor compact labels so 999,999 never appears to have reached a million.
 * The exact score remains in the accessible HUD, pause details and results. */
export function compactHudScore(score:number):string {
  if(score<10000)return score.toLocaleString('en-US');
  if(score<1000000)return `${Math.floor(score/100)/10}K`;
  return `${Math.floor(score/10000)/100}M`;
}
