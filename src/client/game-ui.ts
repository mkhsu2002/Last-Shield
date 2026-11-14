import { GAME_VERSION } from "./version";

const shieldIcon =
  '<svg viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M16 2 29 7v11c0 8-13 16-13 16S3 26 3 18V7L16 2Z" stroke="currentColor" stroke-width="2"/><path d="m9 18 5 5 9-12" stroke="currentColor" stroke-width="2"/></svg>';
const boltIcon =
  '<svg viewBox="0 0 20 24" fill="currentColor" aria-hidden="true"><path d="M12 0 1 14h7L6 24l13-15h-8L12 0Z"/></svg>';

export function mountGameUI(): void {
  const root = document.getElementById("game-container")!;
  root.innerHTML = `
    <div id="canvas-host" aria-hidden="true"></div>
    <div class="interface" data-energy="charging">
      <header class="topbar">
        <div class="brand">${shieldIcon}<div><span class="eyebrow">新巴比倫 · 城市守衛</span><h1>最後防線<span class="version">${GAME_VERSION}</span></h1></div></div>
        <div class="tools"><button id="sound" class="icon-button" aria-label="關閉音效" aria-pressed="true">音效開</button><button id="pause" class="icon-button" aria-label="暫停遊戲" hidden>暫停</button></div>
      </header>
      <section id="run-hud" class="run-hud" hidden aria-label="守城狀態">
        <div class="score-row"><div class="health-block"><span class="label">護盾完整度</span><strong id="clock">100<span>%</span></strong></div><div class="score-block"><span class="label">守城得分</span><strong id="score">0</strong></div></div>
        <div class="run-progress" aria-hidden="true"><i id="run-progress"></i></div>
        <div class="stats-row"><span id="wave">第 1 波</span><span id="combo">連擊 0</span><span id="perfect-count">完美 0</span></div>
        <div class="storm-strip"><span id="storm"></span><span id="next-core"></span></div>
        <p id="target" class="target"></p>
      </section>
      <section id="intro" class="intro" aria-labelledby="intro-title">
        <div class="intro-copy"><span class="chapter">每日生存挑戰 <span id="day"></span></span><h2 id="intro-title">守住這座城。<br><em>直到最後一刻。</em></h2><p>天際正在崩落。你，是城市最後的光。</p></div>
        <div class="launch-card">
          <div class="instructions"><div><b>01</b><span>金色時按下<span>完美起手：光束 3 倍，擊碎後超載 +1。</span></span></div><div><b>02</b><span>擊碎後放開<span>預設自動鎖定；也可按住隕石指定目標。</span></span></div><div><b>03</b><span>超載留給危機<span>滿氣可保留，按「超載震爆」才會使用。</span></span></div></div>
          <p class="power-tip">${boltIcon}<span><b>碎星潮，數顆隕石同步撞擊</b><br>用完美光束搶時間，或手動超載一口氣清場。</span></p>
          <button id="start" class="primary">開始守城 <span aria-hidden="true">↗</span></button>
          <button id="practice" class="secondary practice-button">練習完美起手</button>
          <p id="intro-best" class="fineprint"></p>
        </div>
      </section>
      <section id="action" class="action" hidden aria-label="光束操作">
        <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
        <div id="cue" class="cue">看準圓環</div>
        <p id="cue-help" class="cue-help">圓環變金色時按住，直到核心擊碎。</p>
        <div class="timing-display" aria-hidden="true"><div class="timing-track"><i class="perfect-zone"></i><b id="timing-marker"></b></div><div class="timing-labels"><span>等待</span><strong>金色＝完美起手</strong><span>太晚</span></div></div>
        <button id="fire" class="fire-button" aria-label="按住發射光束"><strong id="fire-label">按住發射</strong><span id="fire-detail">也可以按住畫面或空白鍵</span></button>
        <div class="energy-card"><div class="energy-controls"><div><div class="energy-heading">${boltIcon}<strong id="energy-label">超載蓄能 0／3</strong></div><div id="energy" class="energy" role="progressbar" aria-label="超載蓄能" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0"><i>1</i><i>2</i><i>3</i></div></div><button id="overdrive" class="overdrive-button" disabled aria-label="手動釋放超載震爆">超載震爆<span>手動釋放 · E</span></button></div><p id="energy-help">完美起手並擊碎 +1；集滿後，可手動震爆全場。</p></div>
        <div class="city-line"><span id="milestone">擊碎 0／10 顆</span><span id="city-message" role="status">城市正等你守護。</span></div>
        <div class="meter" aria-hidden="true"><i id="milestone-fill"></i></div>
      </section>
      <section id="results" class="panel results" hidden aria-labelledby="result-title">
        <span id="result-kicker" class="eyebrow">本次防守結束</span><h2 id="result-title">防線終於落下。</h2><p class="result-caption">你爭取的每一秒，城市都記得。</p>
        <div id="result-score" class="result-score">0</div><p id="record-note" class="record-note"></p>
        <div class="result-stats"><div><strong id="result-perfect">0</strong><span>完美擊破</span></div><div><strong id="result-combo">0</strong><span>最高連擊</span></div><div><strong id="result-cleared">0</strong><span>擊碎隕石</span></div></div>
        <p id="result-milestone" class="result-milestone"></p><p id="result-overdrive" class="result-milestone"></p><p id="retry-hint" class="retry-hint"></p>
        <button id="retry" class="primary">再守一次 <span aria-hidden="true">↗</span></button><button id="share" class="secondary">複製戰績，邀朋友挑戰</button>
        <div id="share-box" hidden><label for="share-text">請選取並複製戰績</label><textarea id="share-text" readonly rows="5"></textarea></div><p id="share-status" class="fineprint" role="status"></p>
      </section>
      <section id="paused" class="panel pause-panel" hidden aria-labelledby="pause-title"><span class="eyebrow">喘口氣，再繼續</span><h2 id="pause-title">城市，暫時安靜。</h2><p>遊戲已暫停，護盾與隕石都不會前進。<br>先放開手指，再繼續防守。</p><p class="pause-tip">金色重合時「按下」＝完美起手，光束 3 倍。保持按住直到擊碎，超載 +1。<br><br>超載滿氣後可以保留；按「超載震爆」或 E 才會清場。普通攻擊與撞擊不會消耗能量。<br><br>想改打別顆？先放開，再按住指定隕石。</p><button id="resume" class="primary">繼續防守 <span aria-hidden="true">↗</span></button></section>
      <section id="trained" class="panel practice-panel" hidden aria-labelledby="practice-title"><span class="eyebrow">完美起手練習</span><h2 id="practice-title">掌握金色時機。</h2><p id="practice-explanation"></p><button id="practice-again" class="secondary">再練一次</button><button id="practice-start" class="primary">開始正式守城 <span aria-hidden="true">↗</span></button></section>
    </div>`;
}

export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
export function text(id: string, value: string): void {
  const el = element(id);
  if (el.textContent !== value) el.textContent = value;
}
export function show(id: string, visible: boolean): void {
  element(id).hidden = !visible;
}
