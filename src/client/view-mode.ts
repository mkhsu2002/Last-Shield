// Local comparison shares gameplay rules but restores the original presentation.
export const CLASSIC_VIEW=typeof window!=='undefined' && new URLSearchParams(window.location.search).get('view')==='classic';

export const COMPACT_WIDTH = 639;
export let SKY_TOP=140;
/** Measure once per frame. Render and pointer layers consume this same inset. */
export function refreshBattlefieldViewport():void {
  if(CLASSIC_VIEW) return;
  if (window.innerWidth <= COMPACT_WIDTH) { SKY_TOP = 140; return; }
  const canvas=document.querySelector('canvas');
  const hud=document.getElementById('run-hud');
  if(!canvas||!hud||hud.hidden) return;
  const field=canvas.getBoundingClientRect(),overlay=hud.getBoundingClientRect();
  const intersects=overlay.left<field.right&&overlay.right>field.left;
  SKY_TOP=intersects&&field.width>0 ? Math.max(140,(overlay.bottom+50-field.top)*540/field.width) : 140;
}
