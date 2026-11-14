# 最後防線 · Last Shield

新巴比倫世界觀的單鍵隕石守城遊戲。[正式試玩](https://last-shield.vercel.app/)

## v0.43 主動超載與碎星危機

- **普通攻擊**：按住畫面、發射按鈕或空白鍵。預設鎖定最接近撞擊的目標，也可以直接按住指定隕石。擊碎後放開，再迎擊下一顆；按住期間不會自動換目標。
- **完美起手有明確時機**：圓環／指標變金色的前後 120 ms 內「按下」，就是完美起手。立刻顯示判定與偏早／偏晚秒數；完美光束 3 倍，GOOD 1 倍、偏早 .55 倍、過晚 .75 倍。必須真的擊碎，完美才給 1 格能量。有效融解後的判定鎖定，重複按壓不能洗成完美。
- **能量可以保留**：普通開火、放開、暫停或被撞都不會使用／扣除累積能量。三格充滿後，只有手動按「超載震爆」或 E 才會立即清除場上所有隕石。空場不浪費能量，暫停與練習不會啟動；一次扣三格，震爆擊碎不補完美能量。
- **危機提前出現**：前三波單顆，第 4 波兩顆、第 5 波三顆、第 6 波四顆碎星潮。之後六波一組，混合喘息、突擊、重型與碎星潮；第 24 波碎星潮五顆、第 42 波六顆。來襲防區不同，就緒與撞擊期限真正重疊，不再保證能依序打完。飛行加壓時，融解工作量不再一起縮小。
- **需要決定何時出招**：介面顯示實際最近撞擊秒數與同步逼近數量。保留超載可以清除危機，提早花掉也可能靠精準操作再集滿；不同日期的模式會改變代價。可選更早進入金色的目標，換取更多能量；不是只有自動瞄準一種順序。
- **可操作的練習**：開場「練習完美起手」會停在金色重合處等玩家按住，完成後說明判定，再進入正式守城。提早按住／太早放開也有對應說明。練習不寫入每日紀錄。
- **保留已認可的中文視覺與音效**：夜色城市、光盾、隕石尾跡、命中裂痕與重擊／餘震音效。金色只標示有效完美時機，超載有獨立可操作按鈕與全場震爆效果。減少動態模式停用震動／移動碎片；靜音、失焦與暫停保持一致。
- **碰撞與生存**：共用幾何判斷隕石外緣是否碰上護盾，部分融解可減傷，縮小後繼續前進至實際接觸。完整撞擊 34 點傷害；100 護盾歸零才結束。沒有計時勝利或波數上限，首局維持開始時的 UTC 日期。
- **本機每日紀錄**：只保留得分最高一局及其波數，不宣稱獨立最遠紀錄。`survival-4` 與舊規則分數隔離，紀錄容許每波最多六顆。結果呈現手動超載使用與清除數；儲存／複製失敗可恢復，分享備援全中文。

### 比較策略而非只驗證動畫

`npm run balance` 使用同一天的序列，比較保留救急、提早花掉、完全不用與一直提早按住四種控制策略，診斷範圍為前 24 波／最多 90 秒，並非遊戲結束限制。30 個日期種子的模擬比較中：第一場碎星潮於精準策略約 8.6–11.1 秒出現；保留震爆的策略沒有在該危機扣血，不使用超載的策略損失 68–84 點。提早花掉有些日期能再集滿、有些會損失大量護盾；不是所有日期都只有一個固定答案。

這些是可重現的壓力與選擇差異，不代表主觀遊戲性已通過 MK 的實際試玩。

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
Reddit 仍待完成正式平台導入；不要用 scaffold 覆蓋此專案。

- `src/shared/game-logic.ts`：日期序列、多顆波次、鎖定、融解、碰撞、能量與得分，無 Phaser／Reddit 依賴。
- `src/client/battlefield.ts`：城市／護盾／隕石／光束與多個同時發生的特效。繪製使用與碰撞相同的幾何。
- `src/client/game.ts`：場景生命週期、鍵盤／觸控／指定目標、手動超載、練習、中文狀態、暫停與分享。
- `src/client/game-ui.ts`、`game.css`：語意化中文介面與手機版配置。
- `src/client/audio.ts`：合成音效、壓縮主輸出、音源生命週期。`scheduleImpact`／`createMasterBus` 可供 OfflineAudioContext 重現實際撞擊混音。
- `src/client/coaching.ts`：中文風暴／城市／手動超載說明、里程碑與失誤建議。
- `scripts/balance-sim.ts`：重現策略、危機損傷及能量使用差異的診斷器。
- `src/client/records.ts`：可容錯的本機紀錄驗證與儲存。
- `src/client/version.ts`：由 package.json 產生公開版號。
- `src/server/index.ts`：既有 Reddit 管理員建文端點；此次未修改、未發布 Reddit 後端。

## 發布與驗證

Vercel 專案 `last-shield` 連接 GitHub `main`，正式站為 [last-shield.vercel.app](https://last-shield.vercel.app)。`vercel.json` 建置獨立前端，`scripts/ignore-build.sh` 對照前次部署 SHA，文件變更會跳過建置。沒有 cron 或 GitHub Actions。

即時狀態見 [v0.43 驗證紀錄](docs/v0-43-verification-2026-11-14.md)。[v0.42](docs/v0-42-verification-2026-11-14.md)、[v0.41](docs/v0-41-verification-2026-11-14.md)、[v0.40](docs/survival-verification-2026-11-14.md) 與 [v0.3](docs/mvp-verification-2026-11-14.md) 均是歷史版本，不代表新規則。

本次無後端 schema、migration、RPC、API 格式、Function、排程或 provider secret 變更，正式獨立站為靜態前端。Reddit 尚未初始化／上傳／發布，建置成功不代表已上線 Reddit。沒有跨裝置帳號、全球排行榜、伺服器驗證分數、城市共建或追蹤分析。真實 iOS／Android 與人工試聽仍待確認；瀏覽器音效輸出／波形通過不代表主觀聽感已驗收。Phaser 套件大小提示與先前記錄的 Devvit CLI 間接依賴 advisories 仍存在。

## 版本規則

每個完成驗證並推送的新遊戲版本增加 **v0.01**：v0.40 → v0.41 → v0.42 → v0.43。`package.json` 以 `0.43.0` 對應 v0.43，UI、Reddit 開場與分享共用該來源，發布建立相同 Git tag。文件驗證補記不另升遊戲版本；計分／玩法變動須隔離 `RULES_VERSION`，避免比較不相容紀錄。

## 原創權利

新巴比倫（Neo Babylon）的世界觀、角色、原創美術與視聽資產之權利保留予各自創作者。本專案未授予重用該等資產的權利；程式碼授權尚未選定。

為 Reddit Game of the Day 2026 挑戰開發。
