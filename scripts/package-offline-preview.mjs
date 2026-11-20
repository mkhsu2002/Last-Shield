// Pack the regular standalone build into a single locally playable file.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve('dist/standalone');
const target = process.argv[2];
if (!target) throw new Error('Usage: node scripts/package-offline-preview.mjs preview.html');
let html = readFileSync(resolve(dir, 'index.html'), 'utf8');
const script = /<script\b[^>]*type="module"[^>]*src="\/?(assets\/[^"]+\.js)"[^>]*><\/script>/;
const stylesheet = /<link\b[^>]*rel="stylesheet"[^>]*href="\/?(assets\/[^"]+\.css)"[^>]*>/;
if (!script.test(html) || !stylesheet.test(html)) throw new Error('Expected a single Vite JS and CSS entry; build the standalone first.');
html = html.replace(script, (_, path) => {
  const js = readFileSync(resolve(dir, path), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
}).replace(stylesheet, (_, path) => `<style>${readFileSync(resolve(dir, path), 'utf8')}</style>`);
if (/<link[^>]+modulepreload|<script[^>]+src=/i.test(html)) throw new Error('Unexpected external module dependency.');
writeFileSync(target, html);
