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
  if(compact&&live) {
    if(ui.dataset.state==='playing'||ui.dataset.state==='breaking'||!wasCompact) {
      const bounds=root.getBoundingClientRect(),controls=action.getBoundingClientRect();
      const frame=fitCombatCanvas(bounds.width,bounds.height,controls.top-bounds.top);
      const value=`${frame.height}px`;
      if(root.style.getPropertyValue('--combat-canvas-height')!==value) {
        root.style.setProperty('--combat-canvas-height',value);resized=true;
      }
    }
    if(!wasCompact){root.dataset.compactBattle='true';resized=true;}
  } else if(wasCompact) {
    root.dataset.compactBattle='false';root.style.removeProperty('--combat-canvas-height');resized=true;
  }
  if(resized) refreshScale();
  const canvas=document.querySelector('canvas');
  const hud=document.getElementById('run-hud');
  if(!canvas||!hud||hud.hidden) return;
  const field=canvas.getBoundingClientRect();
  let overlay=hud.getBoundingClientRect();
  const shieldTop=field.top+568/1080*field.height;
  if(compact&&live) {
    const gap=shieldTop-overlay.bottom;
    const tight=root.dataset.tightBattle==='true';
    if(!tight&&gap<40){root.dataset.tightBattle='true';overlay=hud.getBoundingClientRect();}
    else if(tight&&gap>90){
      root.dataset.tightBattle='false';overlay=hud.getBoundingClientRect();
      // Restore details only if the expanded HUD itself has enough clearance.
      // Large text can otherwise toggle between layouts on consecutive frames.
      if(shieldTop-overlay.bottom<60){root.dataset.tightBattle='true';overlay=hud.getBoundingClientRect();}
    }
  } else if(root.dataset.tightBattle==='true') root.dataset.tightBattle='false';
  const intersects=overlay.left<field.right&&overlay.right>field.left;
  SKY_TOP=intersects&&field.width>0 ? Math.max(140,(overlay.bottom+50-field.top)*540/field.width) : 140;
}
