import { localizedText, bindLanguageSelect, setLanguage, currentLanguage } from "./i18n";
import { requestExpandedMode } from '@devvit/web/client';
import { GAME_VERSION } from './version';

document.getElementById('version')!.textContent = GAME_VERSION;

document.getElementById('start')?.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});

for (const [id, source] of Object.entries({
  "splash-brand": "新巴比倫 · 城市守衛", "splash-title": "最後防線",
  "splash-copy": "金色時按住，擊碎隕石，守住新巴比倫。",
  "start": "開始守城", "splash-detail": "每日新風暴 ·",
})) localizedText(document.getElementById(id)!, source);
setLanguage(currentLanguage(), false);
bindLanguageSelect();
