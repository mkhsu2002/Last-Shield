/// <reference types="vite/client" />
import type { CitizenCertificate } from '../shared/heroes.ts';

const PROOF_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Locale = 'en' | 'zh-Hant';

function validate(cert: CitizenCertificate): void {
  if (!Number.isFinite(cert.score) || cert.score <= 1_000_000) throw new Error('Certificate score must exceed 1,000,000.');
  if (!PROOF_ID.test(cert.id)) throw new Error('Invalid certificate proof ID.');
  if (!Number.isFinite(cert.issuedAt) || !Number.isFinite(new Date(cert.issuedAt).getTime())) throw new Error('Invalid certificate issuance date.');
}

function season(cert: CitizenCertificate, locale: Locale): string {
  const number = /^survival-(\d+)$/.exec(cert.rules)?.[1];
  if (!number) return locale === 'en' ? 'Current season' : '本賽季';
  return locale === 'en' ? `Season ${number}` : `第 ${number} 賽季`;
}
function challengeDay(day: number): string {
  const value = String(day);
  return /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}` : value;
}
function issuedDate(cert: CitizenCertificate): string { return new Date(cert.issuedAt).toISOString().slice(0, 10); }

/** Formats the server-issued certificate. The server remains the authority for eligibility and proof. */
export function certificatePresentation(cert: CitizenCertificate, postUrl: string): { filename: string; title: string; text: string } {
  validate(cert);
  const title = `Neo Babylon Citizen${cert.demo ? ' · AI demonstration' : ''}`;
  return {
    filename: `neo-babylon-citizen-${cert.id}.png`,
    title,
    text: [
      title,
      `Reddit: u/${cert.username}`,
      ...(cert.callsign ? [`Callsign: ${cert.callsign}`] : []),
      `Last Shield · ${cert.score.toLocaleString('en-US')} points · Best combo ${cert.bestCombo.toLocaleString('en-US')}`,
      `Challenge: ${challengeDay(cert.day)} · ${season(cert, 'en')}`,
      `Issued: ${issuedDate(cert)} (UTC)`,
      `Certificate ID: ${cert.id}`,
      ...(postUrl ? [postUrl] : []),
    ].join('\n'),
  };
}

/** Produces a portable PNG from the existing city artwork without changing the source asset. */
export async function renderCertificate(cert: CitizenCertificate, locale: Locale = 'en'): Promise<Blob> {
  validate(cert);
  const zh = locale === 'zh-Hant';
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(zh ? '無法建立證書圖片。' : 'Unable to create certificate image.');

  // Kept inside the browser entry point so pure presentation helpers also load in Node.
  const artwork = import.meta.glob<string>('./art/city.webp', { eager: true, query: '?url&inline', import: 'default' });
  const url = artwork['./art/city.webp'];
  if (!url) throw new Error(zh ? '無法載入城市圖像。' : 'Unable to load city artwork.');
  const city = new Image();
  city.src = url;
  await city.decode();
  const scale = Math.max(canvas.width / city.naturalWidth, canvas.height / city.naturalHeight);
  const width = city.naturalWidth * scale;
  const height = city.naturalHeight * scale;
  ctx.drawImage(city, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  const shade = ctx.createLinearGradient(0, 0, 0, 1000);
  shade.addColorStop(0, 'rgba(5,12,22,0.90)');
  shade.addColorStop(0.5, 'rgba(5,12,22,0.77)');
  shade.addColorStop(1, 'rgba(5,12,22,0.95)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 1600, 1000);
  ctx.strokeStyle = '#cba86b';
  ctx.lineWidth = 3;
  ctx.strokeRect(45, 45, 1510, 910);
  ctx.strokeStyle = 'rgba(203,168,107,0.48)';
  ctx.lineWidth = 1;
  ctx.strokeRect(58, 58, 1484, 884);

  const sans = '"Arial", "Noto Sans TC", sans-serif';
  const serif = '"Georgia", "Noto Serif TC", serif';
  const line = (text: string, y: number, size: number, color = '#eee7d6', family = sans, weight = '400', maxWidth = 1370) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    // Fit the actual identity/callsign without clipping or truncating it.
    let fitted = size;
    do { ctx.font = `${weight} ${fitted}px ${family}`; fitted -= 1; } while (ctx.measureText(text).width > maxWidth && fitted > 15);
    ctx.fillText(text, 800, y, maxWidth);
  };
  line('LAST SHIELD  /  NEO BABYLON', 115, 22, '#d2b47b', sans, '600');
  line(zh ? '新巴比倫公民證書' : 'Neo Babylon Citizen', 202, zh ? 64 : 73, '#e8cf99', serif);
  line(zh ? '守護城市，留下你的名字。' : 'For the defender who held the line.', 272, 24, '#c5c9cd');
  ctx.strokeStyle = '#b79a62';
  ctx.beginPath(); ctx.moveTo(555, 321); ctx.lineTo(1045, 321); ctx.stroke();
  line(`u/${cert.username}`, 391, 61, '#fff6e2', sans, '600');
  if (cert.callsign) line(zh ? `呼號：${cert.callsign}` : `Callsign: ${cert.callsign}`, 459, 29, '#d2b47b');
  line(cert.score.toLocaleString('en-US'), 555, 84, '#f3d99e', serif);
  line(zh ? '挑戰結束成績 · 分數突破 1,000,000' : 'Finished run · Beyond 1,000,000 points', 623, 25);
  line(zh ? `最高連擊 ${cert.bestCombo.toLocaleString('en-US')} · ${season(cert, locale)}` : `Best combo ${cert.bestCombo.toLocaleString('en-US')} · ${season(cert, locale)}`, 673, 25, '#c5c9cd');
  line(zh ? `挑戰日期 ${challengeDay(cert.day)} · 核發日期 ${issuedDate(cert)} (UTC)` : `Challenge ${challengeDay(cert.day)} · Issued ${issuedDate(cert)} (UTC)`, 725, 23, '#c5c9cd');
  if (cert.demo) {
    ctx.fillStyle = 'rgba(229,187,102,0.15)';
    ctx.fillRect(560, 773, 480, 47);
    line(zh ? 'AI 示範' : 'AI demonstration', 797, 25, '#f3d99e', sans, '700');
  }
  line(zh ? '公開證書編號' : 'PUBLIC CERTIFICATE ID', 860, 17, '#bba77d', sans, '600');
  line(cert.id, 895, 24, '#e1ded5');
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(zh ? '無法匯出證書。' : 'Unable to export certificate.')), 'image/png');
  });
}
