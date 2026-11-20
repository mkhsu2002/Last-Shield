/** Prefer full width, adapting the camera's upper sky to the available height.
 * Only exceptionally short arenas reduce the scale, preserving complete targets. */
const MIN_CAMERA_SPAN = 500;
const CITY_BOTTOM = 920;
export function fitCombatCanvas(width:number,height:number) {
  const canvasWidth=Math.max(1,Math.min(width,height*540/MIN_CAMERA_SPAN));
  const scale=canvasWidth/540;
  const top=Math.min(0,height-CITY_BOTTOM*scale);
  return {width:canvasWidth,height:canvasWidth*2,top,skyTop:Math.max(140,-top/scale+40)};
}

/** Floor compact labels so 999,999 never appears to have reached a million.
 * The exact score remains in the accessible HUD, pause details and results. */
export function compactHudScore(score:number):string {
  if(score<10000)return score.toLocaleString('en-US');
  if(score<1000000)return `${Math.floor(score/100)/10}K`;
  return `${Math.floor(score/10000)/100}M`;
}
