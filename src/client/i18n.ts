import { MESSAGES } from "./messages.ts";
import type { RecordStorage } from "./records.ts";

export type Language = "en" | "zh-Hant";
export const LANGUAGE_KEY = "last-shield:language";
export function readLanguage(storage: RecordStorage | null): Language {
  try { return storage?.getItem(LANGUAGE_KEY) === "zh-Hant" ? "zh-Hant" : "en"; }
  catch { return "en"; }
}
function storage(): RecordStorage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}
let language: Language = readLanguage(storage());
export function currentLanguage(): Language { return language; }
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
const exact = new Map(Object.entries(MESSAGES).map(([source, target]) => [normalize(source), target]));
const patterns = Object.entries(MESSAGES).filter(([source]) => /\{\d+\}/.test(source)).map(([source, target]) => {
  const slots: number[] = [];
  const expression = normalize(source).split(/(\{\d+\})/).map(part => {
    if (/^\{\d+\}$/.test(part)) { slots.push(Number(part.slice(1, -1))); return "(.+)"; }
    return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("");
  return { expression: new RegExp(`^${expression}$`, "u"), target, slots };
});
export function translate(source: string, locale: Language = language): string {
  if (locale === "zh-Hant" || !/[\p{Script=Han}]/u.test(source)) return source;
  const key = normalize(source);
  const entry = exact.get(key);
  let result = entry;
  if (!entry) {
    for (const pattern of patterns) {
      const match = pattern.expression.exec(key);
      if (!match) continue;
      const values = new Map(pattern.slots.map((slot, i) => [slot, translate(match[i + 1]!, locale)]));
      result = pattern.target.replace(/\{(\d+)\}/g, (_, slot: string) => values.get(Number(slot)) ?? "");
      break;
    }
  }
  if (result === undefined) return source;
  return (source.match(/^\s*/)?.[0] ?? "") + result + (source.match(/\s*$/)?.[0] ?? "");
}

type Copy = string | string[];
const staticText = new Map<Text, string>();
const dynamicText = new Map<HTMLElement, Copy>();
const attributes = new Map<Element, Map<string, string>>();
const values = new Map<HTMLTextAreaElement, Copy>();
const render = (copy: Copy) => Array.isArray(copy) ? copy.map(s => translate(s)).join("") : translate(copy);
export function localizedText(el: HTMLElement, copy: Copy): void {
  dynamicText.set(el, copy);
  const next = render(copy);
  if (el.textContent !== next) el.textContent = next;
}
export function localizedAttribute(el: Element, name: string, source: string): void {
  const entries = attributes.get(el) ?? new Map<string, string>();
  entries.set(name, source);
  attributes.set(el, entries);
  el.setAttribute(name, translate(source));
}
export function localizedValue(el: HTMLTextAreaElement, copy: Copy): void {
  values.set(el, copy);
  el.value = render(copy);
}
export function localizeTree(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest("[data-no-translate],script,style")) continue;
    if (/[\p{Script=Han}]/u.test(node.textContent ?? "")) {
      staticText.set(node as Text, node.textContent!);
    }
  }
  for (const el of [root, ...root.querySelectorAll("[aria-label],[title],[placeholder]")]) {
    if (el.closest("[data-no-translate]")) continue;
    for (const name of ["aria-label", "title", "placeholder"]) {
      const source = el.getAttribute(name);
      if (source && /[\p{Script=Han}]/u.test(source)) localizedAttribute(el, name, source);
    }
  }
  refreshLanguage();
}
function refreshLanguage(): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.title = translate("最後防線｜新巴比倫守城挑戰");
  document.querySelector('meta[name="description"]')?.setAttribute("content", translate("金色時機完美起手，迎戰同步逼近的碎星潮。保留超載能量，在危急時手動震爆全場，守護新巴比倫。"));
  for (const [node, source] of staticText) if (node.isConnected) node.textContent = translate(source);
  for (const [el, source] of dynamicText) if (el.isConnected) localizedText(el, source);
  for (const [el, entries] of attributes) if (el.isConnected)
    for (const [name, source] of entries) el.setAttribute(name, translate(source));
  for (const [el, source] of values) if (el.isConnected) localizedValue(el, source);
  document.querySelectorAll<HTMLSelectElement>(".language-select").forEach(el => { el.value = language; });
}
export function setLanguage(locale: Language, persist = true): void {
  language = locale;
  if (persist) try { storage()?.setItem(LANGUAGE_KEY, locale); } catch { /* Choice works for this session. */ }
  refreshLanguage();
}
export function bindLanguageSelect(): void {
  document.querySelectorAll<HTMLSelectElement>(".language-select").forEach(el => {
    localizedAttribute(el, "aria-label", "介面語言");
    el.value = language;
    el.addEventListener("change", () => setLanguage(el.value === "zh-Hant" ? "zh-Hant" : "en"));
  });
}
