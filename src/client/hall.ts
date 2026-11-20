import { context, showShareSheet, getShareData, navigateTo } from '@devvit/web/client';
import { COMMUNITY_CONTRACT } from '../shared/community';
import { RULES_VERSION } from '../shared/game-logic';
import type { CitizenCertificate, DailyChampion, HeroEntry, HeroHall } from '../shared/heroes';
import { certificatePresentation, renderCertificate } from './certificate';
import { hallCanEnroll, mergeChampionHistory, mergeChampionPage, hallApiError, hallEnrollmentFailure, hallAchievementCopy, parseCitizenShareData, certificateImageUrl, hallCanExport } from './hall-markup';
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
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(path === 'hall/certificate/image' ? 45_000 : 15_000),
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
  private exportedImageUrl: string | null = null;
  private imageExporting = false;
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
    get('hall-image-consent').addEventListener('change', () => this.controls());
    get('hall-export').addEventListener('click', () => void this.exportImage());
    get('hall-open-image').addEventListener('click', () => {
      if (this.exportedImageUrl) navigateTo(this.exportedImageUrl);
    });
    document.querySelectorAll('.language-select').forEach(select => select.addEventListener('change', () => {
      if (this.certificate) void this.prepareCertificate(this.certificate);
    }));
    this.controls();
    if (this.enabled) void this.openSharedCertificate();
  }
  begin(): void { this.pendingRun = null; this.controls(); }
  accepted(runId: string, score: number, _demo: boolean): void {
    if (!this.enabled || !runId || this.revokedProofs.has(runId)) return;
    this.acceptedProofs.add(runId);
    this.pendingRun = runId; this.removed = false; get<HTMLDetailsElement>('hall-membership').open = true; this.controls();
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
    const ownId = this.hall?.me.enrolled ? this.hall.me.certificate?.id ?? null : null;
    get('hall-image-options').hidden = !ownId || ownId !== this.certificate?.id;
    get<HTMLButtonElement>('hall-export').disabled = !hallCanExport(this.enabled, ownId, this.certificate?.id ?? null,
      get<HTMLInputElement>('hall-image-consent').checked, Boolean(this.shareFile), this.busy || this.imageExporting);
    get('hall-open-image').hidden = !this.exportedImageUrl;
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
    if (!container.textContent?.trim()) {
      const empty = document.createElement('div'); empty.className = 'hall-empty';
      const heading = document.createElement('h3'); localizedText(heading, this.tab === 'million' ? '下一位百萬英雄，會是你嗎？' : this.tab === 'combos' ? '每一段長連擊，都值得記住。' : this.tab === 'champions' ? '今天的防線，等你寫下。' : '從你的第一場守城開始。');
      const explanation = document.createElement('p'); localizedText(explanation, this.tab === 'million' ? '單局突破 1,000,000 分，領取自己的新巴比倫公民證書。' : '完成守城、提交戰績，再選擇留下名字。每日榜不必加入英雄館也能參加。');
      const play = document.createElement('button'); play.type = 'button'; play.className = 'primary'; localizedText(play, '回到守城');
      play.addEventListener('click', () => get<HTMLDialogElement>('hall-dialog').close());
      empty.append(heading, explanation, play); container.append(empty);
    }
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
    say('hall-share-status', '');
    ++this.imageGeneration; this.certificate = null; this.shareFile = null;
    this.exportedImageUrl = null; this.imageExporting = false;
    get<HTMLInputElement>('hall-image-consent').checked = false;
    get('hall-image-options').hidden = true;
    get<HTMLButtonElement>('hall-export').disabled = true;
    get('hall-open-image').hidden = true;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    get<HTMLImageElement>('hall-preview').removeAttribute('src'); get('hall-preview').hidden = true;
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
      const blob = await renderCertificate(cert, currentLanguage(), this.postUrl);
      if (generation !== this.imageGeneration) return;
      this.certificate = cert; this.objectUrl = URL.createObjectURL(blob);
      this.shareFile = new File([blob], presentation.filename, { type: 'image/png' });
      get<HTMLInputElement>('hall-certificate-id').value = cert.id;
      const preview = get<HTMLImageElement>('hall-preview'); preview.src = this.objectUrl; preview.hidden = false;
      get<HTMLButtonElement>('hall-share').disabled = false; get<HTMLButtonElement>('hall-copy').disabled = false;
      this.controls();
      say('hall-certificate-status', cert.demo ? '有效證書 · AI 示範' : '有效的新巴比倫公民證書');
    } catch { if (generation === this.imageGeneration) say('hall-certificate-status', '暫時無法產生證書圖片，請重新查驗。'); }
  }
  private async openSharedCertificate(): Promise<void> {
    let id: string | null = null;
    try { id = parseCitizenShareData(getShareData()); } catch { return; }
    if (!id) return;
    await this.open();
    get<HTMLInputElement>('hall-certificate-id').value = id;
    await this.verify();
  }
  private async share(): Promise<void> {
    if (!this.enabled || !this.certificate || !this.shareFile) return;
    const presentation = certificatePresentation(this.certificate, this.postUrl);
    const generation = this.imageGeneration;
    // Clipboard starts in the user gesture; the host share effect has no completion signal.
    const copied = this.copy();
    try {
      await showShareSheet({ title: presentation.title, text: presentation.text,
        data: JSON.stringify({ kind: 'citizen', id: this.certificate.id }) });
    } catch {
      // The deterministic copy result remains available even if the host cannot share.
    }
    await copied;
    if (generation !== this.imageGeneration) return;
  }
  private async exportImage(): Promise<void> {
    const cert = this.certificate;
    const file = this.shareFile;
    const ownId = this.hall?.me.enrolled ? this.hall.me.certificate?.id ?? null : null;
    if (!cert || !file || !hallCanExport(this.enabled, ownId, cert.id, get<HTMLInputElement>('hall-image-consent').checked,
      true, this.busy || this.imageExporting)) return;
    const generation = this.imageGeneration;
    this.imageExporting = true; this.controls(); say('hall-certificate-status', '正在建立公開證書圖片…');
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('invalid-image'));
        reader.onerror = () => reject(new Error('invalid-image'));
        reader.onabort = () => reject(new Error('invalid-image'));
        reader.readAsDataURL(file);
      });
      if (generation !== this.imageGeneration || !get<HTMLInputElement>('hall-image-consent').checked) return;
      const result = await request<{ imageUrl: string }>('hall/certificate/image', 'POST', { id: cert.id, image, publicImageConsent: true });
      if (generation !== this.imageGeneration) return;
      const url = certificateImageUrl(result.imageUrl);
      if (!url) throw new Error('invalid-image');
      this.exportedImageUrl = url;
      say('hall-certificate-status', '公開圖片已建立。點選「開啟證書圖片」，可前往儲存或分享。');
    } catch (error) {
      if (generation !== this.imageGeneration) return;
      const code = error instanceof Error ? error.message : '';
      say('hall-certificate-status', code === 'image-processing' ? '圖片仍在準備中，請稍候再試。' :
        code === 'rate-limited' ? '操作太頻繁，請稍候再試。' :
        code === 'certificate-unavailable' ? '這張證書已無法匯出，請重新查驗。' :
        code === 'invalid-image' ? '這張圖片無法匯出，請重新查驗證書後再試。' :
        '暫時無法建立公開圖片，請稍後重試。');
    } finally {
      if (generation === this.imageGeneration) { this.imageExporting = false; this.controls(); }
    }
  }
  private async copy(): Promise<void> {
    if (!this.certificate) return;
    const generation = this.imageGeneration;
    const copy = certificatePresentation(this.certificate, this.postUrl).text;
    try { await navigator.clipboard.writeText(copy); if (generation !== this.imageGeneration) return; say('hall-share-status', '已複製證書與貼文連結，可自行分享。'); }
    catch {
      if (generation !== this.imageGeneration) return;
      const fallback = get<HTMLTextAreaElement>('hall-copy-fallback');
      localizedValue(fallback, [{ literal: copy }]); fallback.hidden = false; fallback.focus(); fallback.select();
      say('hall-share-status', '請選取下方文字並複製，再分享到社群。');
    }
  }
}
