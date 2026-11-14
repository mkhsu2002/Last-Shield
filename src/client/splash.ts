import { requestExpandedMode } from '@devvit/web/client';
import { GAME_VERSION } from './version';

document.getElementById('version')!.textContent = GAME_VERSION;

document.getElementById('start')?.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});
