# v1.06 原投稿同步

2026-11-20（America/Vancouver）；平台讀回 UTC 2026-11-21。此紀錄接續 [v1.06 發布與 QA](v1-06-presubmit-2026-11-20.md)，不改動遊戲程式、資料契約或安裝版本。

MK 已回報實機測驗通過，並授權全面重新提交。這是使用者的實機驗收回報；先前的瀏覽器模擬、離線音訊與 fixture 檢查仍各自保留證據界線。

## 已更新的展示

- 原 YouTube 頻道 **@neobabylon-mk**：影片 [cTGUG56bqfo](https://www.youtube.com/watch?v=cTGUG56bqfo)，標題「Last Shield v1.06 | 1.22M Defense, Daily Rivals & Overdrive」。公開播放回應 OK、可嵌入、同一頻道 `UCK_TQy_y3e-Q0fdOUBArRpQ`；平台長度 40 秒，公開音軌 2 聲道。
- 影片來自原正式 Reddit 貼文中的 v1.06 英文遊戲；完整自然結束的一局，3× 連續倍速，保留遊戲音效。成品 39.866667 秒、390×880、H.264／AAC、48kHz／雙聲道；左右聲道有實際差異，峰值約 0.670／0.697，未削波。
- 伺服器驗證示範：UTC 20261121、Relay Skies、**1,226,240 分／最高連擊 151／54 波**，`demo=true`。競技榜與個人每日成就排除此類示範。既有 K 的 1,272,630 分證書保持原紀錄。
- 原 [Devpost](https://devpost.com/software/last-shield)（software 1546455／submission 1301583／hackathon 31644）已替換影片、四張 v1.06 圖片及故事；管理頁仍顯示 **SUBMITTED／5 of 5**，公開頁嵌入 `/embed/cTGUG56bqfo`。
- 四張新圖為每日入口、Overdrive、這次百萬分結算及 K 既有市民卡。後台保留原五個試玩／原始碼連結、八個技術標籤與 Reddit 帳號。沒有另建 App、遊戲貼文或 Devpost 投稿。
- 文案補上手機滿寬戰場、資訊與操作分區；每日目標、分數／連擊榜、好友挑戰及可查驗市民卡保留清楚入口。錄影及 AI 協助揭露置於故事與 README 結尾。

## 文件與版本

README 的影片與截圖指向本輪展示；本輪正式公開圖片存於 `docs/media/v1.06/`。v1.0 影片與圖片保留為歷史素材。後續清理狀態：原速與倍速成片已備份至 [v1.06 GitHub Release](https://github.com/mkhsu2002/Last-Shield/releases/tag/v1.06) 並下載驗證；音軌及私人 QA 紀錄封存於本機 ignored 壓縮檔，產生用的逐幀暫存已移除。詳見 [本地儲存與恢復](local-storage-maintenance-2026-11-20.md)。

本輪只有文件與展示素材，未變更 `src/`、依賴、schema、API 或遊戲產物；正式與 stage 沿用已完整發布的 Devvit 1.0.6，Vercel 沿用相同程式來源。文件提交由既有 ignore-build 規則略過完整建置，不重發同一遊戲版本。
