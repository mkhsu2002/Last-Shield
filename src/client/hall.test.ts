import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hallMarkup, hallCanEnroll, mergeChampionHistory, mergeChampionPage, hallApiError, hallEnrollmentFailure, hallAchievementCopy } from './hall-markup.ts';

test('museum includes explicit consent and four separate collections', () => {
  const markup = hallMarkup();
  for (const id of ['hall-dialog','hall-champions','hall-scores','hall-combos','hall-million','hall-consent','hall-enroll','hall-remove','hall-certificate-id','hall-verify','hall-preview','hall-download','hall-share','hall-copy']) assert.ok(markup.includes(`id="${id}"`), id);
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
