import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildChallengeCode, parseChallengeCode, parseRivalShareData } from './challenge.ts';

const id = '8080019d-e381-4899-82fc-ff89af9109ed';
const code = `LS8:20261120:${id}`;

test('challenge codes contain only a real UTC day and a complete run UUID', () => {
  assert.equal(buildChallengeCode(20261120, id), code);
  assert.deepEqual(parseChallengeCode(code), { day: 20261120, runId: id });
  assert.equal(buildChallengeCode(20260230, id), null);
  assert.equal(buildChallengeCode(20261120, '../run'), null);
  for (const source of [null, {}, '', code + ':Alice:9999999', ' ' + code, code + '\n',
    code.replace('LS8', 'LS7'), code.replace('20261120', '20260230'), code.replace(id, '00000000-0000-0000-0000-000000000000'),
    code.replace(id, id + '.png'), 'x'.repeat(1025)]) {
    assert.equal(parseChallengeCode(source), null, String(source));
  }
});

test('native rival share data accepts only the strict code envelope, never scores or names', () => {
  assert.equal(parseRivalShareData(JSON.stringify({ kind: 'rival', code })), code);
  for (const source of [code, null, '{}', '[]', '{', JSON.stringify({ kind: 'citizen', code }),
    JSON.stringify({ kind: 'rival', code, score: 1000001 }), JSON.stringify({ kind: 'rival', code, username: 'Alice' }),
    JSON.stringify({ kind: 'rival', code: code + ':forged' }), ' '.repeat(1025)]) {
    assert.equal(parseRivalShareData(source), null);
  }
});
