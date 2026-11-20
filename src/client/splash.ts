import { localizedText, bindLanguageSelect, setLanguage, currentLanguage } from "./i18n";
import { requestExpandedMode } from "@devvit/web/client";
import { GAME_VERSION } from "./version";
import { fire, peek, rockPosition, type Attempt } from "./inline-sampler";

const card = document.querySelector<HTMLElement>(".wrap")!;
const status = document.getElementById("splash-copy")!;
const start = document.querySelector<HTMLButtonElement>("#start")!;
const rock = document.querySelector<HTMLElement>(".rock")!;
const beam = document.querySelector<SVGLineElement>(".beam line")!;
let state: "idle" | "incoming" | "gold" | Attempt = "idle";
let elapsed = 0;
let previous: number | null = null;
let frame: number | null = null;
let inViewport = true;
const active = () => state === "incoming" || state === "gold";

function render(next: typeof state) {
  state = next;
  card.dataset.state = next;
  localizedText(start, active() ? "發射光束" : next === "idle" ? "點一下試擋一顆" : "再試一次");
  localizedText(status, {
    idle: "圓環變金色時點擊。",
    incoming: "隕石逼近，等圓環變金色。",
    gold: "金色！現在點擊。",
    clear: "隕石擊碎，護盾完好。",
    early: "早了一點。等金色再點。",
    impact: "慢了一點。金色時就點。",
  }[next]);
}

function paint(attempt: Attempt | null = null) {
  const {x, y} = rockPosition(elapsed, attempt);
  rock.style.setProperty("--x", x + "%");
  rock.style.setProperty("--y", y + "%");
  beam.setAttribute("x2", String(x));
  beam.setAttribute("y2", String(y));
}

function stopClock() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = previous = null;
}

function reconcile() {
  if (document.hidden || !inViewport || !active()) stopClock();
  else if (frame === null) frame = requestAnimationFrame(tick);
}

function tick(time: number) {
  frame = null;
  if (document.hidden || !inViewport || !active()) return stopClock();
  if (previous !== null) elapsed += time - previous;
  previous = time;
  const cue = peek(elapsed);
  if (cue !== state) render(cue);
  paint(cue === "impact" ? "impact" : null);
  reconcile();
}

// Clicks only (including keyboard/AT synthesized clicks); never capture feed
// pointers, prevent scroll, register drag gestures, or store/submit a score.
start.addEventListener("click", () => {
  if (active()) {
    const outcome = fire(elapsed);
    render(outcome);
    paint(outcome);
  } else {
    elapsed = 0;
    render("incoming");
    paint();
  }
  reconcile();
});

document.getElementById("expand")!.addEventListener("click", event => {
  if (active()) {
    stopClock();
    render("idle");
  }
  try {
    requestExpandedMode(event, "game", { title: "Last Shield" });
  } catch {
    localizedText(status, "暫時無法開啟完整遊戲。你仍可在這裡練習。");
  }
});

document.addEventListener("visibilitychange", reconcile);
if (typeof IntersectionObserver !== "undefined") {
  new IntersectionObserver(([entry]) => {
    inViewport = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.5);
    reconcile();
  }, { threshold: [0, 0.5] }).observe(card);
}

document.getElementById("version")!.textContent = GAME_VERSION;
localizedText(document.getElementById("splash-title")!, "最後防線");
localizedText(document.getElementById("splash-detail")!, "新巴比倫 ·");
localizedText(document.getElementById("practice-note")!, "點擊練習 · 不計排名");
localizedText(document.getElementById("expand")!, "開啟完整遊戲");
render("idle");
setLanguage(currentLanguage(), false);
bindLanguageSelect();
