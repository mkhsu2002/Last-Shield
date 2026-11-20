import { DISPLAY_CENTER_Y } from "./battlefield-view.ts";
import { SHIELD_RADIUS } from "../shared/game-logic.ts";

/** Presentation only: reserve the shield and the city below it above controls. */
export function fitCombatCanvas(width:number,height:number,actionTop:number) {
  const canvasHeight=Math.max(1,Math.floor(Math.min(height,1080,width*2,Math.max(1,actionTop-8)*1080/(DISPLAY_CENTER_Y+SHIELD_RADIUS+48))));
  return {width:canvasHeight/2,height:canvasHeight};
}

/** Floor compact labels so 999,999 never appears to have reached a million.
 * The exact score remains in the accessible HUD, pause details and results. */
export function compactHudScore(score:number):string {
  if(score<10000)return score.toLocaleString('en-US');
  if(score<1000000)return `${Math.floor(score/100)/10}K`;
  return `${Math.floor(score/10000)/100}M`;
}
