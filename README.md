# 最後防線 · Last Shield

新巴比倫世界觀的單鍵隕石守城遊戲。[正式試玩](https://last-shield.vercel.app/)

## v0.42 中文守城

- **完整繁體中文介面**：教學、戰鬥提示、超載說明、結果、戰績分享、錯誤／儲存提示與無障礙標籤皆為中文。預設語系 `zh-Hant`，沒有尚未完成的語系切換。
- **單鍵操作**：圓環重合亮起時，按住畫面、發射按鈕或空白鍵。持續按到核心擊碎，再放開、重新按住。光束自動鎖定最接近撞擊的隕石；按住期間不會自行切換目標。
- **精準與超載**：最佳時機前後 120 ms 為完美；完美光束速度為 1.25 倍，每次完美擊破 +1 格能量。累積三次（不必連續）集滿後，下一次有效光束自動雙倍加強，並同時融解場上所有隕石。能量在開火時消耗，暫停／放開不會退款。旁支新目標判定為 GOOD，不會白拿完美集氣；已經取得的判定保持鎖定。超載參與過的擊破另加 200 分。
- **多顆同時來襲**：前四波單顆教學；第 5 波起，密集／重型段引入雙顆。第 11 波起通常雙顆、平靜段單顆；第 31 波起密集段可三顆；第 51 波起通常三顆、平靜段雙顆。每波所有隕石同時出現，來自不同天空防區，鎖定時機錯開，保留依次攔截的窗口。
- **持續加壓**：十波一組，包含推進、密集、重型與平靜段。原本的基礎速度成長延續到第 80 波，額外對數倍率會繼續加快飛行、融解與波間節奏；沒有固定通關波數或時間上限。UTC 日期決定相同的隨機序列，每局使用開始時的日期。
- **真正碰撞**：所有隕石都從天空接近護盾，共用幾何函式判斷外緣接觸。完整撞擊造成 34 點傷害，部分融解可以減傷，縮小後會再前進到實際接觸才撞擊。護盾從 100 開始，歸零才結束；撞擊斷連擊、扣一格未使用的超載能量。各顆傷害分別計算，致命撞擊立刻終止模擬。
- **重新設計畫面與聲音**：夜色層次、城市天際線、發光網格護盾、熾熱核心／尾跡、多束掃射、撞擊裂痕與碎片。撞擊使用低頻、手機可表現的中頻破裂與雜訊餘震，通過壓縮主輸出；靜音及暫停會停止音效。首次操作後才啟用音訊。
- **更容易讀懂**：數字「超載蓄能 0／3」、三格進度、明確完美 +1 說明、就緒／啟動狀態與大面積按住按鈕。操作按鈕至少 44px。每十顆推進里程碑與城市訊息，結果依實際失誤給下一次建議。
- **本機每日紀錄**：按得分保留最佳一局與該局波數，不宣稱獨立最遠波數。使用 `survival-3`，舊 v0.40／v0.41 規則分數不混用；每波最多三顆的紀錄邊界已更新。儲存被拒絕仍可遊玩；複製被拒絕則顯示可選取的中文戰績。
- **暫停與減少動態**：Escape、暫停按鈕、失焦／隱藏頁面會暫停並釋放操作。減少動態模式停用震動、移動碎片與護盾崩解位移。觸控模擬不等於真實手機驗收。

## 開發與檔案

Reddit Devvit Web、Phaser 4、TypeScript、Vite、Hono。Node.js **24.18.0 以上**。

```sh
npm ci
npm run check
npm test
npm run build:standalone
npm run build
```

開發獨立站：`npx vite --config vite.standalone.config.ts`。
建置預覽：`npx vite preview --config vite.standalone.config.ts --host 127.0.0.1 --port 4173`。
Reddit 仍待完成正式平台導入；不要用 scaffold 覆蓋此專案。

- `src/shared/game-logic.ts`：日期序列、多顆波次、鎖定、融解、碰撞、能量與得分，無 Phaser／Reddit 依賴。
- `src/client/battlefield.ts`：城市／護盾／隕石／光束與多個同時發生的特效。繪製使用與碰撞相同的幾何。
- `src/client/game.ts`：場景生命週期、鍵盤／觸控／按鈕操作、中文狀態、暫停、結果與分享。
- `src/client/game-ui.ts`、`game.css`：語意化中文介面與手機版配置。
- `src/client/audio.ts`：合成音效、壓縮主輸出、音源生命週期。`scheduleImpact`／`createMasterBus` 可供 OfflineAudioContext 重現實際撞擊混音。
- `src/client/coaching.ts`：中文風暴／城市／超載說明、里程碑與失誤建議。
- `src/client/records.ts`：可容錯的本機紀錄驗證與儲存。
- `src/client/version.ts`：由 package.json 產生公開版號。
- `src/server/index.ts`：既有 Reddit 管理員建文端點；此次未修改、未發布 Reddit 後端。

## 發布與驗證

Vercel 專案 `last-shield` 連接 GitHub `main`，正式站為 [last-shield.vercel.app](https://last-shield.vercel.app)。`vercel.json` 建置獨立前端，`scripts/ignore-build.sh` 對照前次部署 SHA，文件變更會跳過建置。沒有 cron 或 GitHub Actions。

即時狀態見 [v0.42 驗證紀錄](docs/v0-42-verification-2026-11-14.md)。[v0.41](docs/v0-41-verification-2026-11-14.md)、[v0.40](docs/survival-verification-2026-11-14.md) 與 [v0.3](docs/mvp-verification-2026-11-14.md) 均是歷史版本，不代表新規則。

本次無後端 schema、migration、RPC、API 格式、Function、排程或 provider secret 變更，正式獨立站為靜態前端。Reddit 尚未初始化／上傳／發布，建置成功不代表已上線 Reddit。沒有跨裝置帳號、全球排行榜、伺服器驗證分數、城市共建或追蹤分析。真實 iOS／Android 與人工試聽仍待確認；瀏覽器音效輸出／波形通過不代表主觀聽感已驗收。Phaser 套件大小提示與先前記錄的 Devvit CLI 間接依賴 advisories 仍存在。

## 版本規則

每個完成驗證並推送的新遊戲版本增加 **v0.01**：v0.40 → v0.41 → v0.42 → v0.43。`package.json` 以 `0.42.0` 對應 v0.42，UI、Reddit 開場與分享共用該來源，發布建立相同 Git tag。文件驗證補記不另升遊戲版本；計分／玩法變動須隔離 `RULES_VERSION`，避免比較不相容紀錄。

## 原創權利

新巴比倫（Neo Babylon）的世界觀、角色、原創美術與視聽資產之權利保留予各自創作者。本專案未授予重用該等資產的權利；程式碼授權尚未選定。

為 Reddit Game of the Day 2026 挑戰開發。
