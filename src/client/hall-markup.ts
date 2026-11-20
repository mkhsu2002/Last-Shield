import type { DailyChampion } from '../shared/heroes.ts';

export function hallAchievementCopy(row: { day: number; rules: string }): (string | { literal: string })[] {
  const day = String(row.day).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  const season = /^survival-(\d+)$/.exec(row.rules)?.[1];
  return ['達成日期：', { literal: day }, ' · ', season ? `第 ${season} 賽季` : '本賽季'];
}

const API_ERRORS = new Set(['login-required', 'invalid-context', 'rate-limited', 'invalid-session', 'expired-session',
  'invalid-day', 'retry-submit', 'invalid-request', 'consent-required', 'invalid-callsign', 'invalid-certificate',
  'certificate-unavailable', 'revoked-run', 'mode-mismatch']);
export function hallApiError(value: unknown): string {
  if (!value || typeof value !== 'object' || !('error' in value) || typeof value.error !== 'string') return 'hall-unavailable';
  return API_ERRORS.has(value.error) ? value.error : 'hall-unavailable';
}
export function hallEnrollmentFailure(code: string): string {
  switch (code) {
    case 'invalid-callsign': return '請修改呼號：最多 24 個字，可用文字、數字、空格、底線、句點與連字號。';
    case 'revoked-run': return '這局戰績已隨展示撤回，請完成並提交新的一局，再重新加入。';
    case 'mode-mismatch': return 'AI 示範與正式戰績無法混用。請先移除目前展示，再完成並提交新的一局。';
    case 'consent-required': return '請先勾選長期公開同意，再加入或更新展示。';
    case 'login-required': return '請先登入 Reddit，再加入英雄館。';
    case 'expired-session':
    case 'invalid-session': return '這局戰績已無法使用，請完成並提交新的一局。';
    case 'rate-limited': return '操作太頻繁，請稍候再試。';
    default: return '尚未確認儲存，請重試。重試不會重複加入。';
  }
}
export function mergeChampionPage(current: DailyChampion, page: DailyChampion): DailyChampion {
  if (current.day !== page.day) throw new Error('champion-day-mismatch');
  const winners = current.score === page.score ? [...current.winners, ...page.winners] : page.winners;
  const seen = new Set<string>();
  return { ...page, winners: winners.filter(row => {
    if (typeof row.username !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(row.username)) return false;
    const key = row.username.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }) };
}

export function hallCanEnroll(enabled: boolean, runId: string | null, consent: boolean, busy: boolean): boolean {
  return enabled && Boolean(runId) && consent && !busy;
}
export function mergeChampionHistory<T extends { day: number }>(current: readonly T[], older: readonly T[]): T[] {
  const seen = new Set(current.map(row => row.day));
  return [...current, ...older.filter(row => { if (seen.has(row.day)) return false; seen.add(row.day); return true; })];
}
export function hallMarkup(): string {
  return `<dialog id="hall-dialog" class="community-dialog hall-dialog" aria-labelledby="hall-title">
    <div class="dialog-heading"><h2 id="hall-title">守城英雄館</h2><button id="hall-close" class="secondary">關閉</button></div>
    <p id="hall-season" class="eyebrow"></p>
    <div class="hall-tabs" role="tablist" aria-label="英雄館展區">
      <button id="hall-champions" role="tab" aria-selected="true" aria-controls="hall-records" type="button">每日冠軍</button>
      <button id="hall-scores" role="tab" aria-selected="false" aria-controls="hall-records" type="button" tabindex="-1">分數前百</button>
      <button id="hall-combos" role="tab" aria-selected="false" aria-controls="hall-records" type="button" tabindex="-1">連擊前百</button>
      <button id="hall-million" role="tab" aria-selected="false" aria-controls="hall-records" type="button" tabindex="-1">百萬英雄</button>
    </div>
    <p id="hall-status" class="fineprint" role="status" aria-live="polite"></p>
    <section id="hall-records" role="tabpanel" aria-labelledby="hall-champions" tabindex="0"></section>
    <button id="hall-older" class="secondary" hidden>更早的每日冠軍</button>
    <section class="hall-membership" aria-labelledby="hall-membership-title">
      <h3 id="hall-membership-title">留下守城之名</h3>
      <p id="hall-member-status" class="record-note"></p>
      <label for="hall-callsign">呼號（選填，不取代 Reddit 名稱）</label>
      <input id="hall-callsign" type="text" maxlength="24" autocomplete="off">
      <label class="hall-consent-label"><input id="hall-consent" type="checkbox">我同意將 Reddit 名稱、呼號與戰績長期公開於英雄館；可隨時移除自己的展示與證書。</label>
      <button id="hall-enroll" class="primary" disabled>加入英雄館</button>
      <button id="hall-remove" class="secondary" disabled>移除我的英雄館展示與證書</button>
      <p class="fineprint">完成並提交戰績後，可自願加入。單局分數超過 1,000,000 分的英雄，可領取新巴比倫公民證書。</p>
    </section>
    <section class="hall-certificate" aria-labelledby="hall-certificate-title">
      <h3 id="hall-certificate-title">新巴比倫公民證書</h3>
      <label for="hall-certificate-id">公開證書編號</label>
      <input id="hall-certificate-id" type="text" maxlength="36" autocomplete="off" spellcheck="false">
      <button id="hall-verify" class="secondary">查驗證書</button>
      <p id="hall-certificate-status" class="fineprint" role="status" aria-live="polite"></p>
      <img id="hall-preview" class="hall-certificate-preview" alt="新巴比倫公民證書預覽" hidden>
      <a id="hall-download" class="secondary" hidden>下載證書 PNG</a>
      <button id="hall-share" class="primary" disabled>分享證書</button>
      <button id="hall-copy" class="secondary" disabled>複製證書與貼文連結</button>
      <textarea id="hall-copy-fallback" readonly rows="7" aria-label="證書與貼文連結" hidden></textarea>
    </section>
  </dialog>`;
}
