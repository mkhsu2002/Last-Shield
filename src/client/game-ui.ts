export function mountGameUI(): void {
  const root = document.getElementById('game-container')!;
  root.innerHTML = `
    <div id="canvas-host" aria-hidden="true"></div>
    <div class="interface">
      <header class="topbar">
        <div><span class="eyebrow">NEO BABYLON / AEGIS</span><h1>LAST SHIELD<span class="title-dot">.</span></h1></div>
        <div class="tools"><button id="sound" class="icon-button" aria-label="Mute sound" aria-pressed="true">SOUND ON</button><button id="pause" class="icon-button" aria-label="Pause game" hidden>Ⅱ</button></div>
      </header>
      <div class="daily-line"><span id="day"></span><span>DAILY SURVIVAL</span></div>
      <section id="run-hud" class="run-hud" hidden aria-label="Run statistics">
        <div class="score-row"><div><span class="label">SCORE</span><strong id="score">0</strong></div><div class="clock"><span class="label">SHIELD INTEGRITY</span><strong id="clock">100%</strong></div></div>
        <div class="run-progress"><i id="run-progress"></i></div>
        <div class="stats-row"><span id="combo">0 COMBO</span><span id="wave">WAVE 01</span><span id="perfect-count">0 PERFECT</span></div>
        <p id="target" class="target"></p>
      </section>
      <section id="intro" class="panel intro" aria-labelledby="intro-title">
        <span class="eyebrow">THE CITY IS COUNTING ON YOU</span>
        <h2 id="intro-title">Hold the line.<br><em>Until it breaks.</em></h2>
        <p>Incoming meteors will crack your shield.<br>Hold to destroy them before they hit.</p>
        <div class="instructions"><span><b>01</b> WATCH THE INCOMING CORE</span><span><b>02</b> RING LIGHTS → HOLD</span><span><b>03</b> CORE BREAKS → RELEASE</span></div>
        <button id="start" class="primary">DEFEND THE CITY <span>↗</span></button>
        <p id="intro-best" class="fineprint"></p>
      </section>
      <section id="action" class="action" hidden>
        <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
        <div id="cue" class="cue">WATCH THE RINGS</div>
        <p id="cue-help">Press & hold when the rings meet.</p>
        <div class="bottom-stats"><div class="shield-meter"><span>SHIELD <b id="shield">100%</b></span><div class="meter"><i id="shield-fill"></i></div></div><div class="overdrive-meter"><span id="energy-label">OVERDRIVE</span><div id="energy" class="energy"><i></i><i></i><i></i></div></div></div>
        <p class="controls">HOLD ANYWHERE / SPACE <span>·</span> NO AIMING</p>
      </section>
      <section id="results" class="panel results" hidden aria-labelledby="result-title">
        <span id="result-kicker" class="eyebrow">RUN COMPLETE</span><h2 id="result-title">Shield shattered.</h2>
        <div id="result-score" class="result-score">0</div><p id="record-note" class="record-note"></p>
        <div class="result-stats"><div><strong id="result-perfect">0</strong><span>PERFECT</span></div><div><strong id="result-combo">0</strong><span>BEST COMBO</span></div><div><strong id="result-cleared">0</strong><span>CORES BROKEN</span></div></div>
        <p id="retry-hint" class="retry-hint"></p>
        <button id="retry" class="primary">ONE MORE RUN <span>↗</span></button>
        <button id="share" class="secondary">COPY CHALLENGE</button>
        <div id="share-box" hidden><label for="share-text">Your challenge · select to copy</label><textarea id="share-text" readonly rows="4"></textarea></div>
        <p id="share-status" class="fineprint" role="status"></p>
      </section>
      <section id="paused" class="panel pause-panel" hidden aria-labelledby="pause-title"><span class="eyebrow">TAKE A BREATH</span><h2 id="pause-title">City on hold.</h2><p>Your run is paused.<br>Release your controls, then resume.</p><button id="resume" class="primary">RESUME DEFENSE <span>↗</span></button></section>
      <footer id="footer">ONE CITY. ONE SHIELD. YOUR TIMING.</footer>
    </div>`;
}

export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
export function text(id: string, value: string): void {
  const el = element(id);
  if (el.textContent !== value) el.textContent = value;
}
export function show(id: string, visible: boolean): void { element(id).hidden = !visible; }
