import assert from "node:assert/strict";
import { test } from "node:test";
import { translate, readLanguage, LANGUAGE_KEY, renderCopy } from "./i18n.ts";
import { MESSAGES } from "./messages.ts";
import { dailyStorm } from '../shared/daily-storm.ts';

test("English is the default regardless of missing, malformed or denied storage", () => {
  assert.equal(readLanguage(null), "en");
  for (const value of [null, "", "fr", "zh", "en"])
    assert.equal(readLanguage({ getItem: () => value, setItem() {} }), "en");
  assert.equal(readLanguage({ getItem() { throw new Error("denied"); }, setItem() {} }), "en");
  assert.equal(readLanguage({ getItem(key) { assert.equal(key, LANGUAGE_KEY); return "zh-Hant"; }, setItem() {} }), "zh-Hant");
});

test("live numeric cues and nested target labels translate without changing gameplay values", () => {
  assert.equal(translate("完美鎖定 · 擊破 47%", "en"), "Perfect lock · 47% cleared");
  assert.equal(translate("超載蓄能 2／3", "en"), "Overdrive 2/3");
  assert.equal(translate("目前目標：重型核心 · 可按住別顆換目標。", "en"), "Target: Heavy core · Hold another meteor to switch.");
  assert.equal(translate("護盾遭撞擊　−34%", "en"), "Shield impact −34%");
  assert.equal(translate("完美鎖定 · 擊破 47%", "zh-Hant"), "完美鎖定 · 擊破 47%");
});

test("all catalog messages render in English with their interpolation values intact", () => {
  for (const source of Object.keys(MESSAGES)) {
    const sample = source.replace(/\{(\d+)\}/g, (_, slot: string) => `VALUE${slot}`);
    const result = translate(sample, "en");
    assert.doesNotMatch(result, /\p{Script=Han}|\{\d+\}/u, source);
    for (const slot of sample.match(/VALUE\d+/g) ?? []) assert.ok(result.includes(slot), source);
  }
});

test("English sharing preserves the challenge date, score and line breaks", () => {
  const source = "最後防線 v0.46 · 2026-11-14 UTC\n1,234 分 · 完美擊破 8 次 · 擊碎 12 顆隕石\n守到第 7 波 · 最高連擊 9。同一片天空，換你守守看！";
  const result = translate(source, "en");
  assert.equal(result, "Last Shield v0.46 · 2026-11-14 UTC\n1,234 points · Perfect clears: 8 · Meteors cleared: 12\nWave 7 · Best combo 9. Same sky. Your turn to defend!");
  assert.equal(translate(source, "zh-Hant"), source);
});

test("clear feedback keeps the charge bonus separate from awarded points", () => {
  assert.equal(translate("完美擊破 · 超載 +1　+200", "en"), "Perfect clear · Charge +1 +200");
  assert.equal(translate("核心擊碎　+110", "en"), "Core shattered +110");
});
test('daily profile and rival copy remain meaningful in both languages',()=>{
  for(const day of [20261118,20261119,20261120]) {
    const profile=dailyStorm(day);
    assert.doesNotMatch(translate(profile.title,'en'),/\p{Script=Han}/u);
    assert.doesNotMatch(translate(profile.description,'en'),/\p{Script=Han}/u);
    assert.equal(translate(profile.title,'zh-Hant'),profile.title);
  }
  assert.equal(translate('再得 201 分，超過 u/Near','en'),'201 more points to pass u/Near');
  assert.equal(translate('追平 u/Near 的 500 分','en'),'Tied u/Near at 500 points');
  assert.equal(translate('本局已超過 u/Near 的 500 分','en'),'This run passed u/Near’s 500 points');
});
test('language changes retain literal player notes and links in the complete share preview',()=>{
  const copy=['重核雨','\n\n',{literal:'繼續'},'\n',{literal:'https://www.reddit.com/comments/1xximge'}];
  assert.equal(renderCopy(copy,'en'),'Heavy Rain\n\n繼續\nhttps://www.reddit.com/comments/1xximge');
  assert.equal(renderCopy(copy,'zh-Hant'),'重核雨\n\n繼續\nhttps://www.reddit.com/comments/1xximge');
});
