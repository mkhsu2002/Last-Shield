# v0.42 中文、多顆隕石與視覺音效重製

Archived as of 2026-11-14: v0.43 replaces automatic overdrive, padded sequential deadlines, survival-3 records and the v0.42 gameplay acceptance assumption. Audio/Chinese art remain the accepted baseline. Current evidence: `docs/v0-43-verification-2026-11-14.md`; original measurements below remain historical.
2026-11-14。v0.41 為歷史基準，正式站改版前的部署來源已讀回確認為 `78435b2`。本次由 MK 要求：超載難懂、多顆來襲／難度、撞擊聲與整體美術檢討，並先提供中文介面。

## 完成內容

- 預設 `zh-Hant`，名稱「最後防線」。開場、戰鬥／超載／傷害／暫停、結算／建議、分享／備援、儲存錯誤、metadata、ARIA 與 Reddit 前端 splash 都改為繁體中文。保留必要 UTC 與版號。
- 依 frontend-design、ui-ux-pro-max 的視覺與觸控準則重新設計；手機填滿畫面，夜色天空／月牙／層次地形、城市天際線、網格光盾、熾熱核心／尾跡、明亮鎖定環、多道超載光束與各顆獨立碎片。六個碰撞防區移到天空半圓，裂痕與實際來襲角度一致。
- 超載數字 0／3、三格能量、完美擊破 +1、就緒／啟動狀態與持續顯示的中文效果說明。三次完美充滿，下一次有效開火雙倍威力並掃射所有場上核心；被撞扣未使用能量，放開／暫停不退款。旁支未判定核心給 GOOD，不憑空給完美；既有判定保持鎖定。
- 第 5 波首次雙顆，第 11 波起通常雙顆；第 31 波後密集段引入三顆（首次第 35 波），第 51 波起通常三顆。平靜段保留較低密度。同波核心同時出現、不同防區、就緒時間錯開；單鍵優先鎖定最近撞擊核心，按住不會自動跳目標，擊碎後須放開再按。
- 額外對數倍率讓第 80 波後仍繼續加快節奏，個別核心保有可行融解窗口，無計時勝利／波數上限。碰撞／部分融解仍共用幾何函式。
- 音效重做：六層低頻／中頻衝擊／三路濾波雜訊、較長餘震、壓縮主輸出；死亡音尾有區別。靜音與暫停停止音源。一般撞擊不再重複疊舊版 shatter 混音。
- 新規則 `survival-3` 隔離舊成績；紀錄容許每波多顆、上限三顆／波，仍只保留得分最佳一局及其波數。UI／分享／splash 共用 package 0.42.0 → v0.42。

## 已驗證證據

- Node.js 24.20.0；最終型別檢查、**32 項單元測試**、standalone／Devvit 建置與 whitespace 檢查通過。新波次／掃射／難度測試先觀察失敗後實作。測試涵蓋 30 日種子的規格／窗口、唯一防區、獨立傷害／致命停止、正常光束鎖定／重置、旁支集氣、超載退款防止、紀錄／失敗與中文超載說明。
- 發現並修正畫面更新率造成旁支融解餘量差異：光束在核心實際融解完成的精確邊界停止，10ms／16ms／整段時間切分得到相同旁支質量。額外驗證旁支撞擊不會打斷仍按住的主光束。
- 使用 canonical `codex-neo-babylon`，啟動工具回報 `mksaid2025@gmail.com`。以新測試分頁移除舊 clock mocks 干擾後，真實 Start click 正常，AudioContext 為 running；未使用其他瀏覽器身份。
- 受控操作跑到第 35 波／三顆同時出現，當時 100% 護盾、61 連擊、49 完美、61 顆擊碎、22,650 分。觀察第 3 次完美後顯示就緒、第 6 波雙顆超載同時有光束且核心減小。主／旁支擊碎後，按住不自動改打另一顆。
- 390×844 手機尺寸、320×568 小螢幕、1440×900 桌面截圖已肉眼檢查。小螢幕無水平溢位，發射鈕 292×48px，暫停鈕 44×44px；結果／備援文字可在面板內捲動。重新布局後資訊不擋一般手機的核心區。小螢幕使用較緊密配置。
- 暫停通過 5 秒受控時間後血量／波次不變。CDP 觸控模擬實際按住發射鈕產生「完美光束 35%」，取得 200 分與 1／3 能量。減少動態模式可玩；靜音控制中文狀態正常。
- 最終 standalone 撞擊 smoke：100% → 66%，顯示「護盾遭撞擊 −34%」及「護盾受創，準備迎擊」，不會再誤稱核心擊碎。停止操作會進入崩解／結果。
- 剪貼簿拒絕顯示中文選取備援，戰績含 v0.42、日期、波次／分數、無 localhost。localStorage 拒絕時顯示「本次戰績無法儲存，仍可繼續挑戰」，重試可用。多顆紀錄在重新載入後仍有效。
- 實際撞擊觀測到 3 個 noise source + 3 個衝擊 oscillator（另 1 個就緒提示 oscillator）。使用實作中的 `scheduleImpact`／`createMasterBus` 在 OfflineAudioContext 渲染：單次峰值 0.298764、前 200ms RMS 0.102703、400–800ms RMS 0.009204；三次同時撞擊峰值 0.568614，皆無 sample clipping。這證明輸出／尾音與限幅，不代表真實手機主觀聽感已驗收。
- 所有可見中文、metadata、分享、ARIA、錯誤與備援文案已檢查；搜尋英文提示只剩內部識別字／測試名稱。沒有 prompt、製作規格、供應商或內部實作策略被輸出到畫面。瀏覽器未報 JavaScript errors。

## 發布狀態

- 最終程式已 fast-forward 合併並推送 `main`：`dd66dad3ca0f1b6f7a13dbaae740019968bead63`。Annotated tag `v0.42` 指向此版本並已推送。
- 正式 Vercel deployment `dpl_BqfR4chLd3oZmACcdY2w9mr7SvgM` 為 READY，來源為上述 main SHA；alias `last-shield.vercel.app` 指向此部署。
- 公開頁面讀回 `zh-Hant`、「最後防線 v0.42」與完整中文教學。JS `/assets/index-atyOtoj9.js` SHA-256 `a355d90f24c76300d5a06765b129d5dc73e945ffc797dbe0532ccf5d2495ac2e`、CSS `/assets/index-IHV0YTmj.css` SHA-256 `5c04168214d6475801de65de0bf8b9fea2e975397b9873f1d6577784107ccb9b` 皆與最終本機建置完全相同。
- 正式站真實 Start click 後，受控操作跑到第 6 波／兩顆核心，顯示「超載掃射中」、兩道金色光束、1,550 分與 100% 護盾，無 JavaScript errors。驗證後暫停並重新載入回開場，恢復實際時鐘，未完成測試局以免寫入正式站本機戰績。
- `src/server/`、`devvit.json`、`vercel.json` 對本次基準無差異；沒有未同步的後端版本。發布證據補記僅為 docs 變更，沿用既有 ignored-build gate，不增加新遊戲版號。

沒有修改 server endpoint、API 回傳、schema、migration、Function、排程或 secret。Reddit 前端建置通過，平台仍未初始化／上傳／發布；此次只發布既有 Vercel 靜態獨立站。Phaser 大型 bundle 提示仍存在。真實 iOS／Android 觸控與人工試聽未執行。
