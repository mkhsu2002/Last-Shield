import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CitizenCertificate } from '../shared/heroes.ts';
import { certificatePresentation } from './certificate.ts';

const certificate: CitizenCertificate = {
  id: 'a6e9e417-f8e4-4f11-aaf5-9b9d9c95c464', username: 'Actual_User-7', callsign: 'K',
  score: 1_000_001, bestCombo: 98, day: 20261119, rules: 'survival-6', demo: false,
  issuedAt: Date.UTC(2026, 10, 19, 20, 30),
};
const postUrl = 'https://www.reddit.com/r/lastshield/comments/abc123/test/';

test('citizenship requires a finite score strictly above one million', () => {
  for (const score of [0, 999_999, 1_000_000, NaN, Infinity, -Infinity]) {
    assert.throws(() => certificatePresentation({ ...certificate, score }, postUrl), /score/i);
  }
  assert.match(certificatePresentation(certificate, postUrl).text, /1,000,001/);
});

test('certificate keeps the actual Reddit identity separate from the optional callsign', () => {
  const view = certificatePresentation(certificate, postUrl);
  assert.match(view.text, /Reddit: u\/Actual_User-7/);
  assert.match(view.text, /Callsign: K/);
  assert.doesNotMatch(view.title, /u\/K\b/);
  assert.doesNotMatch(certificatePresentation({ ...certificate, callsign: undefined }, postUrl).text, /Callsign:/);
});

test('public proof, day, season and issuance date remain readable and filename is path safe', () => {
  const view = certificatePresentation(certificate, postUrl);
  assert.equal(view.filename, `neo-babylon-citizen-${certificate.id}.png`);
  assert.match(view.title, /Neo Babylon Citizen/);
  for (const value of [certificate.id, '2026-11-19', 'Season 6', postUrl]) assert.ok(view.text.includes(value));
  for (const id of ['', '../proof', 'not-a-uuid', certificate.id + '.png', '00000000-0000-0000-0000-000000000000']) {
    assert.throws(() => certificatePresentation({ ...certificate, id }, postUrl), /proof/i);
  }
});

test('literal Reddit names are never rewritten as callsigns or embedded into paths', () => {
  const view = certificatePresentation({ ...certificate, username: 'Name_With-Hyphen', callsign: 'K / Nova' }, postUrl);
  assert.ok(view.text.includes('Reddit: u/Name_With-Hyphen'));
  assert.ok(view.text.includes('Callsign: K / Nova'));
  assert.equal(view.filename, `neo-babylon-citizen-${certificate.id}.png`);
});

test('AI demonstrations remain clearly labelled in share text and title', () => {
  const view = certificatePresentation({ ...certificate, demo: true }, postUrl);
  assert.match(view.text, /AI demonstration/);
  assert.match(view.title, /AI demonstration/);
  assert.doesNotMatch(certificatePresentation(certificate, postUrl).text, /AI demonstration/);
});

test('certificate source names the exact Reddit game post without query or credentials',async()=>{
 const {certificateSource}=await import('./certificate.ts');
 assert.equal(certificateSource('https://www.reddit.com/comments/1xximge'),'reddit.com/comments/1xximge');
 for(const value of ['https://evil.example/comments/1xximge','https://user:password@www.reddit.com/comments/1xximge','https://www.reddit.com/comments/1xximge?context=private','https://www.reddit.com/user/someone'])assert.equal(certificateSource(value),'');
});
