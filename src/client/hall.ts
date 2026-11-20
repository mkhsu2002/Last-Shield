import { context } from '@devvit/web/client';
import { COMMUNITY_CONTRACT } from '../shared/community';
import { RULES_VERSION } from '../shared/game-logic';
import type { CitizenCertificate, DailyChampion, HeroEntry, HeroHall } from '../shared/heroes';
import { certificatePresentation, renderCertificate } from './certificate';
import { hallCanEnroll, mergeChampionHistory, mergeChampionPage, hallApiError, hallEnrollmentFailure, hallAchievementCopy } from './hall-markup';
import { currentLanguage, localizeTree, localizedAttribute, localizedText, localizedValue } from './i18n';

type Tab = 'champions' | 'scores' | 'combos' | 'million';
type Envelope = { contract: string; rules: string };
const get = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const say = (id: string, source: Parameters<typeof localizedText>[1]) => localizedText(get(id), source);
const format = (n: number) => n.toLocaleString('en-US');
const dayLabel = (day: number) => String(day).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');

async function request<T extends object>(path: string, method = 'GET', body?: unknown): Promise<T & Envelope> {
  const response = await fetch(`/api/community/${path}`, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15_000),
  });
  const value: unknown = await response.json();
  if (!value || typeof value !== 'object') throw new Error('hall-unavailable');
  const envelope = value as Envelope;
  if (envelope.contract !== COMMUNITY_CONTRACT || envelope.rules !== RULES_VERSION) throw new Error('version-mismatch');
  if (!response.ok) throw new Error(hallApiError(value));
  return value as T & Envelope;
}

export class HallController {
  private readonly enabled = Boolean(context?.postId);
  private readonly postUrl = context?.postId ? `https://www.reddit.com/comments/${context.postId.replace(/^t3_/, '')}` : '';
  private hall: HeroHall | null = null;
  private pendingRun: string | null = null;
  private readonly acceptedProofs = new Set<string>();
  private readonly revokedProofs = new Set<string>();
  private tab: Tab = 'champions';
  private busy = false;
  private loading = false;
  private generation = 0;
  private imageGeneration = 0;
  private objectUrl: string | null = null;
  private certificate: CitizenCertificate | null = null;
  private shareFile: File | null = null;
  private removed = false;
  private readonly championLoading = new Set<number>();

  constructor() {
    localizeTree(get('hall-dialog'));
    localizedAttribute(get('hall-preview'), 'alt', '新巴比倫公民證書預覽');
    for (const id of ['intro-hall', 'result-hall']) get(id).addEventListener('click', () => void this.open());
    get('hall-close').addEventListener('click', () => get<HTMLDialogElement>('hall-dialog').close());
    const tabs: Tab[] = ['champions', 'scores', 'combos', 'million'];
    for (const [index, tab] of tabs.entries()) {
      const button = get(`hall-${tab}`);
      button.addEventListener('click', () => this.selectTab(tab));
      button.addEventListener('keydown', event => {
        const key = (event as KeyboardEvent).key;
        const next = key === 'ArrowRight' ? (index + 1) % tabs.length : key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault(); this.selectTab(tabs[next]!); get(`hall-${tabs[next]}`).focus();
      });
    }
    get('hall-older').addEventListener('click', () => void this.refresh(true));
    get('hall-consent').addEventListener('change', () => this.controls());
    get('hall-enroll').addEventListener('click', () => void this.enroll());
    get('hall-remove').addEventListener('click', () => void this.remove());
    get('hall-verify').addEventListener('click', () => void this.verify());
    get('hall-share').addEventListener('click', () => void this.share());
    get('hall-copy').addEventListener('click', () => void this.copy());
    document.querySelectorAll('.language-select').forEach(select => select.addEventListener('change', () => {
      if (this.certificate) void this.prepareCertificate(this.certificate);
    }));
    this.controls();
  }
  begin(): void { this.pendingRun = null; this.controls(); }
  accepted(runId: string, score: number, _demo: boolean): void {
    if (!this.enabled || !runId || this.revokedProofs.has(runId)) return;
    this.acceptedProofs.add(runId);
    this.pendingRun = runId; this.removed = false; this.controls();
    if (Number.isFinite(score) && score > 1_000_000) void this.open();
    else if (this.hall?.me.enrolled || get<HTMLDialogElement>('hall-dialog').open) void this.refresh();
  }
  async open(): Promise<void> {
    const dialog = get<HTMLDialogElement>('hall-dialog');
    if (!dialog.open) dialog.showModal();
    await this.refresh();
  }
  private controls(): void {
    get<HTMLButtonElement>('hall-enroll').disabled = !hallCanEnroll(this.enabled, this.pendingRun, get<HTMLInputElement>('hall-consent').checked, this.busy);
    get<HTMLButtonElement>('hall-remove').disabled = this.busy || !this.enabled || !this.hall?.me.enrolled;
    get<HTMLButtonElement>('hall-verify').disabled = !this.enabled || this.busy;
    get<HTMLButtonElement>('hall-older').disabled = this.loading || this.busy;
    get('hall-older').hidden = this.tab !== 'champions' || this.hall?.historyCursor == null;
    say('hall-enroll', this.hall?.me.enrolled ? '更新我的英雄館展示' : '加入英雄館');
    say('hall-member-status', !this.enabled ? '英雄館請到 Reddit 遊戲貼文開啟；本頁仍可繼續遊玩。' : this.hall?.me.enrolled ? '你已加入英雄館，可更新呼號或移除自己的展示與證書。' : this.pendingRun ? '本局戰績已確認。勾選公開同意後，即可加入英雄館。' : this.removed ? '已移除展示與證書。完成並提交新的一局後，可重新選擇加入。' : '完成並提交一局戰績後，可選擇加入英雄館。');
  }
  private selectTab(tab: Tab): void {
    this.tab = tab;
    for (const name of ['champions', 'scores', 'combos', 'million']) {
      const button = get(`hall-${name}`);
      button.setAttribute('aria-selected', String(name === tab));
      button.tabIndex = name === tab ? 0 : -1;
    }
    get('hall-records').setAttribute('aria-labelledby', `hall-${tab}`);
    this.render(); this.controls();
  }
  private async refresh(older = false): Promise<void> {
    if (!this.enabled) { say('hall-status', '英雄館請到 Reddit 遊戲貼文開啟；本頁仍可繼續遊玩。'); return; }
    if (older && (this.loading || this.hall?.historyCursor == null)) return;
    const generation = ++this.generation;
    this.loading = true; this.controls(); say('hall-status', '正在讀取英雄館…');
    try {
      const result = await request<{ hall: HeroHall }>(`hall${older ? `?before=${this.hall!.historyCursor}` : ''}`);
      if (generation !== this.generation) return;
      const hall = result.hall;
      if (!hall || !Array.isArray(hall.champions) || !Array.isArray(hall.topScores) || !Array.isArray(hall.topCombos) || !Array.isArray(hall.million) || !hall.me) throw new Error('hall-unavailable');
      if (older && this.hall) hall.champions = mergeChampionHistory(this.hall.champions, hall.champions);
      const previousOwnCertificate = this.hall?.me.certificate?.id;
      if (previousOwnCertificate && this.certificate?.id === previousOwnCertificate && !hall.me.certificate) this.clearCertificate();
      this.hall = hall;
      const season = /^survival-(\d+)$/.exec(hall.season)?.[1] ?? /^survival-(\d+)$/.exec(RULES_VERSION)?.[1];
      say('hall-season', `第 ${season} 賽季`);
      if (hall.me.enrolled && document.activeElement !== get('hall-callsign')) get<HTMLInputElement>('hall-callsign').value = hall.me.callsign ?? '';
      this.render(); say('hall-status', '同分並列；英雄館只展示自願公開的守城者。');
      if (hall.me.certificate) await this.prepareCertificate(hall.me.certificate);
    } catch { if (generation === this.generation) say('hall-status', '暫時無法讀取英雄館，請稍後重新開啟。'); }
    finally { if (generation === this.generation) { this.loading = false; this.controls(); } }
  }
  private person(row: HeroEntry | CitizenCertificate): HTMLElement {
    const item = document.createElement('li');
    const name = document.createElement('strong'); name.textContent = `u/${row.username}`; item.append(name);
    if (row.callsign) { const call = document.createElement('span'); localizedText(call, ['呼號：', { literal: row.callsign }]); item.append(call); }
    const achieved = document.createElement('small'); localizedText(achieved, hallAchievementCopy(row)); item.append(achieved);
    const score = document.createElement('span'); localizedText(score, `${format(row.score)} 分 · 最高連擊 ${format(row.bestCombo)}`); item.append(score);
    if ('rank' in row && row.rank) { const rank = document.createElement('span'); localizedText(rank, `第 ${row.rank} 名`); item.prepend(rank); }
    if (row.demo) { const demo = document.createElement('small'); localizedText(demo, 'AI 示範'); item.append(demo); }
    return item;
  }
  private render(): void {
    const container = get('hall-records'); container.replaceChildren();
    if (!this.hall) return;
    if (this.tab === 'champions') {
      for (const day of this.hall.champions) {
        const section = document.createElement('section');
        const heading = document.createElement('h3'); localizedText(heading, [ { literal: dayLabel(day.day) }, day.finalized ? ' · 每日冠軍' : ' · 今日領先']); section.append(heading);
        const summary = document.createElement('p'); localizedText(summary, `${format(day.score)} 分 · ${day.tieCount} 位並列`); section.append(summary);
        const list = document.createElement('ol'); list.className = 'leaderboard';
        for (const winner of day.winners) list.append(this.person(winner));
        section.append(list);
        if (day.anonymousCount != null && day.anonymousCount > 0) { const note = document.createElement('p'); localizedText(note, `另有 ${day.anonymousCount} 位冠軍未公開名稱。`); section.append(note); }
        if (day.winnersCursor != null) {
          const more = document.createElement('button'); more.type = 'button'; more.className = 'secondary';
          more.disabled = this.championLoading.has(day.day) || this.busy;
          localizedText(more, this.championLoading.has(day.day) ? '正在讀取更多冠軍…' : '載入更多同日冠軍');
          localizedAttribute(more, 'aria-label', `載入 ${dayLabel(day.day)} 的更多冠軍`);
          more.addEventListener('click', () => void this.moreChampions(day.day)); section.append(more);
        } else if (day.moreTies) { const note = document.createElement('p'); localizedText(note, '還有其他同分冠軍。'); section.append(note); }
        container.append(section);
      }
    } else {
      const list = document.createElement('ol'); list.className = 'leaderboard';
      const rows = this.tab === 'scores' ? this.hall.topScores : this.tab === 'combos' ? this.hall.topCombos : this.hall.million;
      for (const row of rows) {
        const item = this.person(row);
        if ('id' in row) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; localizedText(button, '查看公民證書');
          localizedAttribute(button, 'aria-label', `查看 u/${row.username} 的公民證書`);
          button.addEventListener('click', () => { get<HTMLInputElement>('hall-certificate-id').value = row.id; void this.verify(); }); item.append(button);
        }
        list.append(item);
      }
      container.append(list);
    }
    if (!container.textContent?.trim()) { const empty = document.createElement('p'); localizedText(empty, '這個展區尚無公開紀錄。'); container.append(empty); }
  }
  private async moreChampions(day: number): Promise<void> {
    const current = this.hall?.champions.find(row => row.day === day);
    if (!this.enabled || this.busy || this.championLoading.has(day) || current?.winnersCursor == null) return;
    const generation = this.generation;
    this.championLoading.add(day); this.render();
    try {
      const result = await request<{ champion: DailyChampion }>(`hall/champion?day=${day}&after=${encodeURIComponent(current.winnersCursor)}`);
      if (generation !== this.generation || !this.hall) return;
      const page = result.champion;
      if (!page || page.day !== day || !Array.isArray(page.winners)) throw new Error('invalid-champion');
      this.hall.champions = this.hall.champions.map(row => row.day === day ? mergeChampionPage(row, page) : row);
      say('hall-status', '已載入更多同日冠軍。');
    } catch { if (generation === this.generation) say('hall-status', '暫時無法讀取更多冠軍，請重試。'); }
    finally { this.championLoading.delete(day); this.render(); }
  }
  private async enroll(): Promise<void> {
    if (!hallCanEnroll(this.enabled, this.pendingRun, get<HTMLInputElement>('hall-consent').checked, this.busy)) return;
    const runId = this.pendingRun!;
    this.busy = true; ++this.generation; this.loading = false; this.controls(); say('hall-status', '正在儲存你的展示…');
    try {
      const callsign = get<HTMLInputElement>('hall-callsign').value.trim();
      await request<{ hall: HeroHall }>('hall/enroll', 'POST', { runId, publicConsent: true, ...(callsign ? { callsign } : {}) });
      get<HTMLInputElement>('hall-consent').checked = false;
      await this.refresh(); say('hall-status', '你的守城紀錄已加入英雄館。');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'revoked-run') { this.revokedProofs.add(runId); this.pendingRun = null; }
      say('hall-status', hallEnrollmentFailure(code));
    }
    finally { this.busy = false; this.controls(); }
  }
  private async remove(): Promise<void> {
    if (!this.enabled || this.busy || !this.hall?.me.enrolled) return;
    this.busy = true; ++this.generation; this.loading = false; this.pendingRun = null;
    for (const proof of this.acceptedProofs) this.revokedProofs.add(proof);
    get<HTMLInputElement>('hall-consent').checked = false; this.clearCertificate(); this.controls();
    try {
      const result = await request<{ removed: boolean }>('hall', 'DELETE');
      if (result.removed !== true) throw new Error('removal-unconfirmed');
      this.removed = true;
      if (this.hall) this.hall.me = { enrolled: false, demo: false, certificate: null };
      await this.refresh(); say('hall-status', '已移除你的英雄館展示與證書。');
    } catch { say('hall-status', '暫時無法移除，請重試。'); }
    finally { this.busy = false; this.controls(); }
  }
  private clearCertificate(): void {
    ++this.imageGeneration; this.certificate = null; this.shareFile = null;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    get<HTMLImageElement>('hall-preview').removeAttribute('src'); get('hall-preview').hidden = true;
    get<HTMLAnchorElement>('hall-download').removeAttribute('href'); get('hall-download').hidden = true;
    get<HTMLButtonElement>('hall-share').disabled = true; get<HTMLButtonElement>('hall-copy').disabled = true;
    get<HTMLTextAreaElement>('hall-copy-fallback').value = ''; get('hall-copy-fallback').hidden = true;
    say('hall-certificate-status', '');
  }
  private async verify(): Promise<void> {
    if (!this.enabled || this.busy) return;
    const id = get<HTMLInputElement>('hall-certificate-id').value.trim().toLowerCase();
    this.clearCertificate(); const generation = this.imageGeneration;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) { say('hall-certificate-status', '請輸入完整的公開證書編號。'); return; }
    say('hall-certificate-status', '正在查驗證書…');
    try {
      const result = await request<{ certificate: CitizenCertificate }>(`hall/certificate?id=${encodeURIComponent(id)}`);
      if (generation !== this.imageGeneration) return;
      if (result.certificate.id !== id) throw new Error('invalid-proof');
      await this.prepareCertificate(result.certificate);
    } catch { if (generation === this.imageGeneration) say('hall-certificate-status', '找不到有效證書，可能已移除或暫時無法讀取。'); }
  }
  private async prepareCertificate(cert: CitizenCertificate): Promise<void> {
    this.clearCertificate(); const generation = this.imageGeneration;
    say('hall-certificate-status', '正在準備證書圖片…');
    try {
      const presentation = certificatePresentation(cert, this.postUrl);
      const blob = await renderCertificate(cert, currentLanguage());
      if (generation !== this.imageGeneration) return;
      this.certificate = cert; this.objectUrl = URL.createObjectURL(blob);
      this.shareFile = new File([blob], presentation.filename, { type: 'image/png' });
      get<HTMLInputElement>('hall-certificate-id').value = cert.id;
      const preview = get<HTMLImageElement>('hall-preview'); preview.src = this.objectUrl; preview.hidden = false;
      const download = get<HTMLAnchorElement>('hall-download'); download.href = this.objectUrl; download.download = presentation.filename; download.hidden = false;
      get<HTMLButtonElement>('hall-share').disabled = false; get<HTMLButtonElement>('hall-copy').disabled = false;
      say('hall-certificate-status', cert.demo ? '有效證書 · AI 示範' : '有效的新巴比倫公民證書');
    } catch { if (generation === this.imageGeneration) say('hall-certificate-status', '暫時無法產生證書圖片，請重新查驗。'); }
  }
  private async share(): Promise<void> {
    if (!this.certificate || !this.shareFile) return;
    const presentation = certificatePresentation(this.certificate, this.postUrl);
    try {
      // File is already rendered so the native share call retains the click activation.
      if (navigator.share && navigator.canShare?.({ files: [this.shareFile] })) {
        await navigator.share({ title: presentation.title, text: presentation.text, files: [this.shareFile] });
      } else { say('hall-certificate-status', '可下載證書圖片，或複製證書與貼文連結後自行分享。'); }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      say('hall-certificate-status', '可下載證書圖片，或複製證書與貼文連結後自行分享。');
    }
  }
  private async copy(): Promise<void> {
    if (!this.certificate) return;
    const copy = certificatePresentation(this.certificate, this.postUrl).text;
    try { await navigator.clipboard.writeText(copy); say('hall-certificate-status', '已複製證書與貼文連結，可自行分享。'); }
    catch {
      const fallback = get<HTMLTextAreaElement>('hall-copy-fallback');
      localizedValue(fallback, [{ literal: copy }]); fallback.hidden = false; fallback.focus(); fallback.select();
      say('hall-certificate-status', '請選取上方文字並複製。');
    }
  }
}
