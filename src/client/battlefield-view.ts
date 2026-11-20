import { meteorGeometry, METEOR_SPAWN_RADIUS, SHIELD_RADIUS } from '../shared/game-logic.ts';
import type { MeteorSpec } from '../shared/game-logic.ts';

export const DISPLAY_CENTER_Y=700;

/** A display transform only. Keep the entire near-shield collision region exact.
 * Far approaches enter through the visible upper sky, including side sectors.
 * Depend on centre distance, not melting radius, so a locked meteor stays still. */
export function projectBattlePoint<T extends { x:number; y:number }>(point:T, skyTop=140):T {
  const distance=Math.hypot(point.x,point.y);
  const near=SHIELD_RADIUS+25;
  if(distance<=near) return {...point};
  const angle=Math.atan2(point.y,point.x);
  const progress=Math.min(1,Math.max(0,(distance-near)/(METEOR_SPAWN_RADIUS-near)));
  const blend=progress*progress*(3-2*progress);
  const spawnX=Math.cos(angle)*200;
  const safeTop=Math.min(skyTop,DISPLAY_CENTER_Y-SHIELD_RADIUS-25-64);
  const spawnY=safeTop-DISPLAY_CENTER_Y+Math.abs(Math.cos(angle))*45;
  return {...point,
    x:point.x+(spawnX-Math.cos(angle)*METEOR_SPAWN_RADIUS)*blend,
    y:point.y+(spawnY-Math.sin(angle)*METEOR_SPAWN_RADIUS)*blend,
  };
}

export function displayedMeteorGeometry(spec:MeteorSpec & {arrestedMs?:number}, elapsed:number, mass:number, classic=false, skyTop=140) {
  const geometry=meteorGeometry(spec,elapsed,mass);
  if(classic) return geometry;
  const projected=projectBattlePoint(geometry,skyTop);
  const farther=projectBattlePoint({x:geometry.x+Math.cos(geometry.angle)*0.1,y:geometry.y+Math.sin(geometry.angle)*0.1},skyTop);
  return {...projected,angle:Math.atan2(farther.y-projected.y,farther.x-projected.x)};
}
