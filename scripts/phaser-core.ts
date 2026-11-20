import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// Phaser 4.2.1 ships this source entry for games that do not need physics,
// tilemaps or the full game-object catalog. Keep WebGL and Canvas fallback.
export const phaserCoreAlias = {
  find: /^phaser$/,
  replacement: fileURLToPath(new URL('../node_modules/phaser/src/phaser-core.js', import.meta.url)),
};
export function phaserCoreFlags():Plugin {
  return {
    name:'last-shield-phaser-core-flags',enforce:'pre',
    transform(source,id) {
      if(!id.replaceAll('\\','/').includes('/node_modules/phaser/src/')) return;
      // Match the compile-time expressions in Phaser's own webpack DefinePlugin.
      // Audio is supplied by Last Shield's stereo synth; Spector is debug-only.
      const code=source.replace(/\btypeof (CANVAS_RENDERER|WEBGL_RENDERER|WEBGL_DEBUG|FEATURE_SOUND)\b/g,
        (match,flag:string)=>(flag==='WEBGL_DEBUG'||flag==='FEATURE_SOUND'?'false':'true').padEnd(match.length))
        .replace('global.Phaser = Phaser;', 'globalThis.Phaser = Phaser;');
      if(code===source)return;
      return {code,map:{version:3,sources:[id],sourcesContent:[source],names:[],
        mappings:source.split('\n').map((_,line)=>line===0?'AAAA':'AACA').join(';')}};
    },
  };
}
