import { localizedText, bindLanguageSelect, setLanguage, currentLanguage } from "./i18n";
import { requestExpandedMode } from '@devvit/web/client';
import { GAME_VERSION } from './version';

document.getElementById('version')!.textContent = GAME_VERSION;

document.getElementById('start')?.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});

for (const [id, source] of Object.entries({
  "splash-brand": "新巴比倫 · 城市守衛", "splash-title": "最後防線",
  "splash-copy": "金色時按住，定住目標直到擊碎；放開再按，接續金色接力。集滿三格超載可保留，危急時手動清場。",
  "start": "開始守城", "splash-detail": "每日生存挑戰 · 按住發射 ·",
})) localizedText(document.getElementById(id)!, source);
setLanguage(currentLanguage(), false);
bindLanguageSelect();
