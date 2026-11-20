import { fitCombatCanvas } from "./combat-layout.ts";

// Local comparison shares gameplay rules but restores the original presentation.
export const CLASSIC_VIEW=typeof window!=='undefined' && new URLSearchParams(window.location.search).get('view')==='classic';

export let SKY_TOP=140;
/** Measure once per frame. Render and pointer layers consume this same inset. */
export function refreshBattlefieldViewport(refreshScale:()=>void=()=>{}):void {
  if(CLASSIC_VIEW) return;
  const root=document.getElementById('game-container');
  const ui=root?.querySelector<HTMLElement>('.interface');
  const action=document.getElementById('action');
  if(!root||!ui||!action) return;
  const compact=window.matchMedia('(max-width: 639px), (max-aspect-ratio: 1/1)').matches;
  const live=ui.dataset.combat==='true';
  const wasCompact=root.dataset.compactBattle==='true';
  let resized=false;
  const active=live&&ui.dataset.state!=='paused';
  if(compact&&active) {
    const arena=document.getElementById('battlefield')!.getBoundingClientRect();
    const frame=fitCombatCanvas(arena.width,arena.height);
    for(const [property,value] of [['--combat-canvas-height',`${frame.height}px`],['--combat-canvas-top',`${frame.top}px`]]) {
      if(root.style.getPropertyValue(property)!==value){root.style.setProperty(property,value);resized=true;}
    }
    if(!wasCompact){root.dataset.compactBattle='true';resized=true;}
  } else if(wasCompact) {
    root.dataset.compactBattle='false';root.style.removeProperty('--combat-canvas-height');root.style.removeProperty('--combat-canvas-top');resized=true;
  }
  if(resized) refreshScale();
  const canvas=document.querySelector('canvas');
  const hud=document.getElementById('run-hud');
  if(!canvas||!hud||hud.hidden) return;
  const field=canvas.getBoundingClientRect();
  const overlay=hud.getBoundingClientRect();
  if(compact&&active) { SKY_TOP=140;return; }
  if(root.dataset.tightBattle==='true')root.dataset.tightBattle='false';
  const intersects=overlay.left<field.right&&overlay.right>field.left;
  SKY_TOP=intersects&&field.width>0 ? Math.max(140,(overlay.bottom+50-field.top)*540/field.width) : 140;
}
