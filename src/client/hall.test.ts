import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hallMarkup, hallCanEnroll, mergeChampionHistory, mergeChampionPage, hallApiError, hallEnrollmentFailure, hallAchievementCopy, parseCitizenShareData, certificateImageUrl, hallCanExport } from './hall-markup.ts';

test('museum includes explicit consent and four separate collections', () => {
  const markup = hallMarkup();
  for (const id of ['hall-dialog','hall-champions','hall-scores','hall-combos','hall-million','hall-consent','hall-enroll','hall-remove','hall-certificate-id','hall-verify','hall-preview','hall-image-consent','hall-export','hall-open-image','hall-share','hall-share-status']) assert.ok(markup.includes(`id="${id}"`), id);
  assert.match(markup, /maxlength="24"/);
  assert.match(markup, /長期公開/);
  assert.doesNotMatch(markup, /type="checkbox"[^>]*checked/);
  assert.match(markup, /id="hall-share"[^>]*disabled/);
});
test('only an accepted run plus consent in a Reddit context permits enrollment', () => {
  assert.equal(hallCanEnroll(true, 'server-proof', true, false), true);
  assert.equal(hallCanEnroll(false, 'server-proof', true, false), false);
  assert.equal(hallCanEnroll(true, null, true, false), false);
  assert.equal(hallCanEnroll(true, 'server-proof', false, false), false);
  assert.equal(hallCanEnroll(true, 'server-proof', true, true), false);
});
test('history pagination retains newer records and never duplicates a day', () => {
  const first = { day: 20261119, score: 10 };
  const older = { day: 20261118, score: 9 };
  assert.deepEqual(mergeChampionHistory([first], [{ ...first, score: 1 }, older]), [first, older]);
});

const champion = {
  day: 20261119, score: 1_234_567, tieCount: 24, finalized: true,
  winners: [{ username: 'Keeper', score: 1_234_567, bestCombo: 20, day: 20261119, rules: 'survival-8', demo: false }],
  anonymousCount: null, moreTies: true, winnersCursor: '1234567:proof-20',
};
test('champion pagination deduplicates literal Reddit identities and keeps anonymous count authoritative', () => {
  const page = { ...champion, winnersCursor: null, anonymousCount: 2, moreTies: false,
    winners: [{ ...champion.winners[0]!, username: 'keeper' }, { ...champion.winners[0]!, username: 'Other_Name' }, { ...champion.winners[0]!, username: '' }] };
  const merged = mergeChampionPage(champion, page);
  assert.deepEqual(merged.winners.map(row => row.username), ['Keeper', 'Other_Name']);
  assert.equal(merged.anonymousCount, 2);
  assert.equal(merged.winnersCursor, null);
  assert.equal(mergeChampionPage(champion, { ...page, anonymousCount: null, winnersCursor: '1234567:proof-40' }).anonymousCount, null);
  assert.throws(() => mergeChampionPage(champion, { ...page, day: 20261118 }), /day/);
});
test('a changed daily leading score replaces old winners rather than mixing different results', () => {
  const changed = { ...champion, score: 2_000_000, winners: [{ ...champion.winners[0]!, username: 'NewLeader', score: 2_000_000 }] };
  assert.deepEqual(mergeChampionPage(champion, changed).winners.map(row => row.username), ['NewLeader']);
});
test('only whitelisted API errors survive and enrollment failures explain an available action', () => {
  for (const code of ['invalid-callsign', 'revoked-run', 'mode-mismatch', 'consent-required']) {
    assert.equal(hallApiError({ error: code }), code);
    assert.doesNotMatch(hallEnrollmentFailure(code), /尚未確認儲存/);
  }
  assert.equal(hallApiError({ error: 'internal database secret' }), 'hall-unavailable');
  assert.equal(hallApiError(null), 'hall-unavailable');
  assert.match(hallEnrollmentFailure('invalid-callsign'), /修改呼號/);
  assert.match(hallEnrollmentFailure('revoked-run'), /新的一局/);
  assert.match(hallEnrollmentFailure('mode-mismatch'), /移除/);
  assert.match(hallEnrollmentFailure('consent-required'), /勾選/);
});

test('each hero record carries a literal achievement date and a readable localized season', () => {
  assert.deepEqual(hallAchievementCopy({ day: 20261119, rules: 'survival-8' }), [
    '達成日期：', { literal: '2026-11-19' }, ' · ', '第 8 賽季',
  ]);
  assert.deepEqual(hallAchievementCopy({ day: 20261118, rules: 'survival-7' }), [
    '達成日期：', { literal: '2026-11-18' }, ' · ', '第 7 賽季',
  ]);
  assert.equal(JSON.stringify(hallAchievementCopy({ day: 20261119, rules: 'internal-rule' })).includes('internal-rule'), false);
});

test('shared certificates accept only a strict id envelope and reject unverified fields', () => {
  const id = 'a6e9e417-f8e4-4f11-aaf5-9b9d9c95c464';
  assert.equal(parseCitizenShareData(JSON.stringify({ kind: 'citizen', id })), id);
  for (const value of [undefined, null, '', '{}', '[]', '{', JSON.stringify({ kind: 'citizen', id, score: 9999999 }),
    JSON.stringify({ kind: 'citizen', id, imageUrl: 'https://evil.example/fake.png' }),
    JSON.stringify({ kind: 'citizen', id: 'https://evil.example/fake.png' }),
    JSON.stringify({ kind: 'citizen', id: '../fake' }), JSON.stringify({ kind: 'other', id }),
    JSON.stringify({ kind: 'citizen', id, username: 'Forged' })]) assert.equal(parseCitizenShareData(value), null);
});
test('public image export requires separate default-off consent and an own rendered certificate', () => {
  const markup = hallMarkup();
  assert.match(markup, /id="hall-image-consent"[^>]*type="checkbox"/);
  assert.doesNotMatch(markup, /id="hall-image-consent"[^>]*checked/);
  assert.match(markup, /已匯出或分享的圖片可能持續存在，移除英雄館不會刪除這些副本/);
  assert.doesNotMatch(markup, /hall-download|download=/);
  assert.match(markup, /id="hall-open-image"[^>]*hidden/);
  assert.equal(hallCanExport(true, 'own', 'own', true, true, false), true);
  for (const args of [[false,'own','own',true,true,false], [true,'own','other',true,true,false],
    [true,'own','own',false,true,false], [true,'own','own',true,false,false], [true,'own','own',true,true,true],
    [true,null,null,true,true,false]] as const) assert.equal(hallCanExport(args[0], args[1], args[2], args[3], args[4], args[5]), false);
});
test('public image links are restricted to direct Reddit image URLs', () => {
  assert.equal(certificateImageUrl('https://i.redd.it/abc123.png'), 'https://i.redd.it/abc123.png');
  for (const url of ['https://evil.example/abc.png','http://i.redd.it/abc.png','https://i.redd.it.evil.example/abc.png',
    'https://i.redd.it@evil.example/abc.png','javascript:alert(1)','https://i.redd.it/abc.png?redirect=evil',null]) {
    assert.equal(certificateImageUrl(url), null);
  }
  for (const error of ['image-processing', 'invalid-image', 'certificate-unavailable']) assert.equal(hallApiError({ error }), error);
});
