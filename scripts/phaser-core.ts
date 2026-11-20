import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// Phaser 4.2.1 ships this source entry for games that do not need physics,
// tilemaps or the full game-object catalog. Graphics and Image use Canvas.
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
      let code=source.replace(/\btypeof (CANVAS_RENDERER|WEBGL_RENDERER|WEBGL_DEBUG|FEATURE_SOUND)\b/g,
        (match,flag:string)=>(flag==='CANVAS_RENDERER'?'true':'false').padEnd(match.length))
        .replace('global.Phaser = Phaser;', 'globalThis.Phaser = Phaser;');
      if(id.replaceAll('\\','/').endsWith('/phaser/src/phaser-core.js')) {
        // This game creates only Image and Graphics objects and loads only images.
        // Core services (scene, camera, renderer, input and textures) remain intact.
        code=code.replace(/^\s*\w+: require\('\.\/(?:gameobjects\/(?:text|sprite|layer)\/[^']+|loader\/filetypes\/(?!ImageFile')[^']+)'\),?\r?$/gm,
          match=>match.replace(/[^\r\n]/g,' '));
      }
      if(code===source)return;
      return {code,map:{version:3,sources:[id],sourcesContent:[source],names:[],
        mappings:source.split('\n').map((_,line)=>line===0?'AAAA':'AACA').join(';')}};
    },
  };
}
