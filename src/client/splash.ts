import { requestExpandedMode } from '@devvit/web/client';

document.getElementById('start')?.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});
