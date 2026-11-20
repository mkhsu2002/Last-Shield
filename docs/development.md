> 最新正式狀態（2026-11-20）：**v1.0 已發布並完成原投稿同步**。main／tag v1.0、Reddit 正式與 staging 同為 1.0.0，Vercel production 同源；新版影片及四張截圖已更新至原 Devpost，SUBMITTED／5/5。以 [v1.0 發布紀錄](v1-0-release-2026-11-20.md) 與根目錄 README 為準。以下版本狀態皆為帶日期的歷史，先前的暫緩已由 MK 本輪正式發布授權取代。

> 正式版歷史紀錄（2026-11-19，America/Vancouver）：MK 已通過 v0.50 人工驗收；PR #1 已合併 main、tag v0.50，Reddit 0.50.0 已核准公開並同版安裝到 staging／正式，Vercel production 同版讀回通過。新版英文立體聲實錄與截圖已完成；YouTube 新版已公開發布並通過播放驗證；原 Devpost 投稿已同步新版影片、四張截圖與第一人稱 story，讀回 SUBMITTED／5/5。見 [正式發布紀錄](v0-50-release-2026-11-19.md)。

> 2026-11-20 狀態更新：前一輪紀錄保留為歷史證據。依 MK 最新指示，正式發布與參賽更新暫緩，優先完成[第二輪品質強化](v0-52-quality-round-2-2026-11-20.md)。本輪三次修正後內部複核四軸各 9.0；正式交付仍暫緩。評分與證據範圍見該紀錄，不能推論真人留存或得獎。


> 2026-11-19 狀態：本文件前段版本功能為歷史描述。v0.52 候選採 survival-8／community-3，連擊倍率與 Hero Hall 的目前契約、留存與部署進度，以 [v0.52 計畫](superpowers/plans/2026-11-19-v0-52-heroes.md) 及 [本輪紀錄](v0-52-round-1-2026-11-19.md) 為準；正式版尚未更新。

> 後續精進（同日）：MK 已核准[每日風暴與對手挑戰設計](superpowers/specs/2026-11-19-v0-51-daily-rival-design.md)，要求四項評分各 9 分以上。候選功能已在功能分支實作，本機 72 測試及建置通過；私人 staging 0.51.0.5 已完成同版 CDN／契約／驗分／冪等與效能查核，真人初玩／多人／跨日證據仍待完成；見 [第一輪驗證紀錄](v0-51-round-1-2026-11-19.md)。正式及參賽提交仍為 v0.50，不可將候選或模擬當成已達 9 分。

> 新增需求提案（同日）：每日冠軍歷史、歷史前百、榜首 HUD、百萬公民證書與 K 完整實玩錄影，見 [v0.52 英雄館設計](superpowers/specs/2026-11-19-v0-52-hall-of-fame-design.md)。尚待設計核准，未改計分或長期留存；約 114–134 萬只是候選連擊模型的離線投影，沒有真實百萬紀錄或證書，不能用於英雄榜或投稿。

> 正式發布基準（2026-11-16 的歷史證據）：v0.49 手機控制改善與正式驗證見 [v0.49 紀錄](v0-49-mobile-controls-2026-11-16.md)，對外展示同步見 [展示紀錄](presentation-review-2026-11-16.md)。本輪只重新查核 Reddit 安裝版本，不將舊 Vercel／Devpost 證據日期更新為今天。

> 狀態補記（2026-11-16）：v0.48／0.48.2 已於 Reddit 核准公開並完整安裝到正式與 staging，main 已合併；目前即時狀態見 [發布紀錄](community-release-2026-11-15.md)。下方 v0.47 段落為歷史紀錄，不能作為新 API 的 live 驗證。

# 開發與發布參考

Status: 2026-11-14 從 README 移入。v0.46 的 Vercel 段落為歷史證據；目前 Vercel 已部署 v0.47／0.47.1 與政策頁，Reddit v0.47／package 0.47.1 已核准為公開版本並安裝；r/last_shield_dev 已公開，未登入原生實玩驗證通過，詳見 `devpost-submission-2026-11-14.md`。v0.47 發布歷史見 `reddit-release-2026-11-14.md`；目前開發與發布狀態以 `community-release-2026-11-15.md` 為準。根目錄 README 會成為 Reddit App Directory 對外說明，因此僅保留玩家與管理員需要的內容。

# 最後防線 · Last Shield

新巴比倫世界觀的單鍵隕石守城遊戲。[正式試玩](https://last-shield.vercel.app/)

## v0.46 雙語介面，預設英文

- **英文／繁體中文**：首次使用預設英文，不依瀏覽器語言自動切中文。頁首 EN／繁中可即時切換，包含開場、練習、操作回饋、暫停、結果、失敗提示、分享與 ARIA；選擇保存在本機 `last-shield:language`。儲存被拒絕時，仍可在當次工作階段切換。語言切換不重置對局／分數／能量；沿用 v0.45 的 `survival-6`，既有相容戰績不會因翻譯失效。HTML 初始標題、描述與 lang 預設英文，Reddit splash 也有同一語言選擇。
- **普通攻擊**：按住畫面、發射按鈕或空白鍵。預設鎖定最接近撞擊的目標，也可以直接按住指定隕石。擊碎後放開，再迎擊下一顆；按住期間不會自動換目標。
- **出手與持續發射分開**：等待時，金色窗口 ±180ms、每 1000ms 循環；失手可等下一輪放開重按補救。完美命中後，游標隱藏，時機尺改成擊破進度，明確提示「持續按住、擊碎才放開」。放開後仍保留已取得的完美判定與融解進度，按住即可接續，不必再追金色。
- **完美光束定住單顆**：3 倍光束發射期間，選中的隕石停止前進；放開恢復飛行，其餘隕石繼續逼近。大型核心工作量由 1400 降至 1050ms，完美融解時間由約 467 降至 350ms。GOOD 1.15×／偏早 .85×／過晚 1×維持。必須真的擊碎才給 1 格能量，一顆最多一次。
- **完美擊破接力**：完美擊碎後，同波剩餘目標有 750ms 金色接力，不必等待它原本的下一輪金色。先放開再按下一顆，接上下一道完美光束；持續壓住不會自動換目標／連殺。接力過期恢復循環窗口，清場後不帶到下一波。
- **能量可以保留**：普通開火、放開、暫停或被撞都不會使用／扣除累積能量。三格充滿後，只有手動按「超載震爆」或 E 才會立即清除場上所有隕石。空場不浪費能量，暫停與練習不會啟動；一次扣三格，震爆擊碎不補完美能量。
- **前段逐步加壓**：前三波單顆，第 4／5 波兩顆，第 6 波首場碎星潮三顆，第 12 波四顆、第 24 波五顆、第 42 波六顆。前 24 波逐步收回飛行寬限；首波飛行 3750 ms（原 3000 ms），早期碎星潮飛行額外寬限為 1200ms × max(0, 1-index/24)，讓連續出手有反應時間。後段仍有重疊期限、不同防區與持續加壓，融解工作量不跟著縮小。
- **需要決定何時出招**：介面顯示實際最近撞擊秒數與同步逼近數量。保留超載可以清除危機，提早花掉也可能靠精準操作再集滿；不同日期的模式會改變代價。可指定先處理的目標；完美接力讓不同的合理順序都有補救空間。
- **可操作的練習**：開場「練習完美起手」會停在金色重合處等玩家按住，完成後說明判定，再進入正式守城。提早按住／太早放開也有對應說明。練習不寫入每日紀錄。
- **保留已認可的城市視覺與音效**：夜色城市、光盾、隕石尾跡、命中裂痕與重擊／餘震音效。金色標示完美窗口、接力與已鎖定的完美光束，超載有獨立可操作按鈕與全場震爆效果。減少動態模式停用震動／移動碎片；靜音、失焦與暫停保持一致。
- **碰撞與生存**：共用幾何判斷隕石外緣是否碰上護盾，部分融解可減傷，縮小後繼續前進至實際接觸。完整撞擊 34 點傷害；100 護盾歸零才結束。沒有計時勝利或波數上限，首局維持開始時的 UTC 日期。
- **本機每日紀錄**：只保留得分最高一局及其波數，不宣稱獨立最遠紀錄。`survival-6` 與舊規則分數隔離，紀錄容許每波最多六顆。結果呈現手動超載使用與清除數；儲存／複製失敗可恢復，分享與備援依目前語言顯示。

### 比較策略而非只驗證動畫

`npm run balance` 比較保留救急、提早花掉、完全不用、一直提早按住、慢按後補救、含反應延遲（使用／不用超載）七種控制策略，目前診斷上限為 240 波／600 秒，實際自然結束結果見 `qa/v0.52/balance.json`；以下 48 波數據屬 v0.46 歷史紀錄，不能套用 survival-8 計分。20261101–20261130 共 30 個日期中，含 120ms 出手／擊破反應與 160ms 放開間隔的控制器，均能在首場碎星潮不扣血；不用超載於第 18 波結束，使用超載則到第 18–29 波。理想操作保留救急到第 49 波診斷停止點；理想操作不用超載則於第 24–36 波結束。

另外以相同實際鍵盤節奏、無模擬時鐘在 390×844 瀏覽器比較：看見金色後等 120ms、按住 520ms、放開 160ms，不用超載。v0.44 首場碎星潮後剩 66%；v0.45 三顆皆完美擊破，剩 100%。三顆大型核心的壓力案例也以逐顆擊碎／放開 180ms 再按驗證，能保留滿盾。
這些是可重現的壓力與選擇差異，不代表主觀遊戲性已通過 MK 的實際試玩。

## 政策頁與網域

- `public/terms/index.html` 與 `public/privacy/index.html` 由 Vite 複製到 standalone 輸出，分別提供 `/terms/`、`/privacy/`；正式連結使用 `https://last-shield.vercel.app`；兩頁均匿名 HTTP 200 且與原始檔相同，Reddit Directory listing 已儲存並重新載入驗證。
- MK 指定未來使用 `neobabylon.app`，本輪不變更 DNS、不宣稱已綁定。網域切換時須先驗證政策頁，再同步 Reddit Developer Settings、README 與本文件，舊政策網址仍應可存取或有正確轉址。

## 開發與檔案

Reddit Devvit Web、Phaser 4、TypeScript、Vite、Hono。Node.js **24.18.0 以上**。

```sh
npm ci
npm run check
npm test
npm run balance
npm run build:standalone
npm run build
```

開發獨立站：`npx vite --config vite.standalone.config.ts`。
建置預覽：`npx vite preview --config vite.standalone.config.ts --host 127.0.0.1 --port 4173`。
Reddit 已完成 Devvit 0.47.1 安裝與公開貼文驗證；不要用 scaffold 覆蓋此專案。

- `src/shared/game-logic.ts`：日期序列、多顆波次、鎖定、融解、碰撞、能量與得分，無 Phaser／Reddit 依賴。
- `src/client/battlefield.ts`：城市／護盾／隕石／光束與多個同時發生的特效。繪製使用與碰撞相同的幾何。
- `src/client/game.ts`：場景生命週期、鍵盤／觸控／指定目標、手動超載、練習、雙語狀態、暫停與分享。
- `src/client/game-ui.ts`、`game.css`：語意化雙語介面與手機版配置。
- `src/client/audio.ts`：合成音效、壓縮主輸出、音源生命週期。`scheduleImpact`／`createMasterBus` 可供 OfflineAudioContext 重現實際撞擊混音。
- `src/client/coaching.ts`：風暴／城市／手動超載說明、里程碑與失誤建議。
- `src/client/messages.ts`、`i18n.ts`：本機雙語字串、數值訊息、語言偏好、文字／ARIA／分享備援更新；不依賴外部翻譯服務。
- `scripts/balance-sim.ts`：重現策略、危機損傷及能量使用差異的診斷器。
- `src/client/records.ts`：可容錯的本機紀錄驗證與儲存。
- `src/client/version.ts`：由 package.json 產生公開版號。
- `src/server/index.ts`：Reddit 管理員建文端點；0.47.1 已使用 post.permalink 並與 client／permissions 同步部署安裝。

## 發布與驗證

Vercel 專案 `last-shield` 連接 GitHub `main`，正式站為 [last-shield.vercel.app](https://last-shield.vercel.app)。`vercel.json` 建置獨立前端，`scripts/ignore-build.sh` 對照前次部署 SHA，文件變更會跳過建置。沒有 cron 或 GitHub Actions。

即時狀態見 [Reddit 發布紀錄](reddit-release-2026-11-14.md) 與 [Devpost 提交包](devpost-submission-2026-11-14.md)。[v0.46 驗證紀錄](v0-46-verification-2026-11-14.md)、[v0.45](v0-45-verification-2026-11-14.md)、[v0.44](v0-44-verification-2026-11-14.md)、[v0.43](v0-43-verification-2026-11-14.md)、[v0.42](v0-42-verification-2026-11-14.md)、[v0.41](v0-41-verification-2026-11-14.md)、[v0.40](survival-verification-2026-11-14.md) 與 [v0.3](mvp-verification-2026-11-14.md) 均是歷史版本，不代表新規則。

以下為 v0.47 歷史範圍，已被 v0.48 社群功能取代，不能作為目前架構說明：當時 Reddit 0.47.1 的 client、server 與 permissions 已完整部署安裝，公開貼文已由未登入玩家實際啟動；當時尚無社群榜或伺服器重算分數。現在的排行榜、重播與 audit 架構見下方 Community development；v0.50 CLI 間接依賴 audit 見最新私人候選紀錄。獨立站仍為靜態前端；真實 iOS／Android 與人工主觀試聽仍待確認。

## 版本規則

每個完成驗證並推送的新遊戲版本增加 **v0.01**：v0.40 → v0.41 → v0.42 → v0.43 → v0.44 → v0.45 → v0.46 → v0.47。`package.json` 以 `0.47.1` 對應 v0.47（首次 Reddit 發布同批修補），UI、Reddit 開場與分享共用該來源，發布建立相同 Git tag。文件驗證補記不另升遊戲版本；計分／玩法變動須隔離 `RULES_VERSION`，避免比較不相容紀錄。

## 原創權利

新巴比倫（Neo Babylon）的世界觀、角色、原創美術與視聽資產之權利保留予各自創作者。本專案未授予重用該等資產的權利；程式碼授權尚未選定。

為 Reddit Game of the Day 2026 挑戰開發。

## v0.48 development reference

## Development

Requires Node.js 24.18 or newer.

```sh
npm ci
npm run check
npm test
npm run build
```

`npm run dev` starts the Devvit playtest workflow for a community you moderate after Devvit CLI authentication. `npm run build:standalone` builds the optional web preview into `dist/standalone`; the Reddit client and server build is separate.

The project uses TypeScript, Devvit Web, Phaser, Vite, Hono, and Web Audio. Gameplay rules live in `src/shared/game-logic.ts`; `src/client/` contains the rendered game, controls, localization, audio, and local records; `src/server/index.ts` handles moderator-created playable posts and mounts the community API. `src/server/community-router.ts` defines its HTTP contract; `community-service.ts` owns sessions, daily rankings, and submission records; `hall-service.ts` maintains opt-in long-term best records, champion summaries, certificates and revocation. `src/shared/heroes.ts` defines the public Hall DTOs. `src/shared/community.ts` replays submitted gameplay using the same rules as the client. `devvit.json` defines the inline splash, expanded game, and moderator menu.


## Community development

The default playtest target is the private `r/last_shield_stage`, separate from the public judging post in `r/last_shield_dev`. Do not playtest over the judging installation. The v0.52 candidate uses `community-3` and `survival-8`, with score multipliers and an installation-local Hero Hall. All client/server routes must deploy together. Public v0.50 remains on its original contract until the candidate release is verified. The server recalculates scores from gameplay inputs, which prevents arbitrary score submissions but does not establish that a human performed the inputs. No external database, new scheduled job, or comment-as-user permission is required.

## Social preview images (v0.52 candidate)

`src/server/share-card.ts` uploads the versioned public card through Reddit media, caches its i.redd.it URL and updates only the selected managed post’s shareImageUrl. The moderator menu checks the current account and posts/all permissions. New post creation includes the image; existing posts require the menu action once. `permissions.media` is enabled; client/server/config and the image must ship together. Standalone OG/Twitter metadata lives in index.html. Private staging does not support external unfurls; see [sharing verification](social-sharing-2026-11-19.md). Existing formal post activation is pending, not a completed external-state change.

## Native certificate sharing and public image export

Reddit iframe restrictions block Blob-anchor downloads and navigator.share. The candidate now uses the official showShareSheet/getShareData bridge with only a strict certificate ID; receiving clients query the existing certificate API. No signed request context or credential is shared.

POST /api/community/hall/certificate/image accepts only id, rendered PNG and publicImageConsent:true. CertificateImageService binds the actor’s own active certificate, validates PNG size/dimensions, claims an idempotent upload under WATCH, and rechecks ownership/revision before saving the Reddit media URL. Same-image requests reuse the cache; changed image/language requests follow a 60-second cooldown. Agreement time and hash are stored with the URL; withdrawal erases this cache. media.upload provides no image-delete API, so the additional public-image agreement explains that exported copies can remain. Images are presentations; the server certificate lookup remains authoritative.

The frontend and this endpoint must deploy together in the full Devvit package. Native share and public-image navigation still require candidate live testing before formal release. No new provider secret, external service or scheduler was added.

## v0.52 第三輪候選契約（2026-11-20，已完整私人部署 0.52.0.7）

新增 additive 只讀 `GET /api/community/challenge?code=LS8:<YYYYMMDD>:<UUID>`，沿用 `community-3 / survival-8` envelope，返回 `{target:{username,score,day,rules,kind}}`。僅解析既有 index、accepted audit、當日目前 public best 與榜單成員資格；不回傳 userId、audit 或 trace，不新增伺服器儲存 key、migration 或背景任務。格式錯誤 400，示範／移除／過期／不存在為 404。原生 share data 僅接受 `{kind:"rival",code}`，桌面複製同一 code 為備援。接收端重新查驗、確認日期才設定 rival；舊日改玩今日。接受後開局再次查驗，不依賴只含前十的排行榜來維持好友目標。

每日目標另存最多七個 UTC 遊玩日的單局最大進度，local／verified 分開，依 rules／post／user 隔離；只有成功 submit 回應可記 verified。示範與練習不推進個人成就，也不覆蓋個人本機最佳。這些快取不作為排名或證書依據。
