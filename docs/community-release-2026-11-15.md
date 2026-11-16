# v0.48 社群功能發布狀態

完成查核：2026-11-16（America/Vancouver，工作自 11-15 開始）。狀態：v0.48／0.48.2 已核准公開，正式與 staging 同版安裝，live 驗證完成。

## 範圍與現況

- 每日同社群榜、前十名、鄰近排名、並列與追分差距、手動提交及移除。
- 後端重播 gameplay inputs 重算分數；同帳號最高分與 submission audit 同一交易寫入，重試不重複上榜。
- 戰績預覽、選填心得、複製後開啟 Reddit 原生貼文，由玩家自行編輯送出。這版沒有 asUser 自動留言 API。
- UI v0.48／package 0.48.2 已完整安裝到私人 `r/last_shield_stage` 與公開 `r/last_shield_dev`。原投稿貼文保留，不另建公開遊戲貼文。
- 公開貼文已使用 v0.48／0.48.2；歷史 Devpost 提交欄位維持原狀。

## 資料契約

前端／後端 response 需同時符合 `contract=community-1`、`rules=survival-6`。GET board、POST start/submit、DELETE entry 均在 `/api/community/`。可信身分只來自 Devvit context，不接收 body userId／username／日期。

Redis 為 subreddit installation scope，啟用 `permissions.redis=true`。無 SQL migration、外部資料庫或 secrets。Run session 最多兩小時；排名、最佳分與 audit 使用挑戰日起 30 天的固定過期日。重播輸入不持久化。移除公開排名不刪 audit，以免舊提交重送復活排名。

## 發布檢查

- [x] 共用重播、HTTP 契約、匿名寫入拒絕、owner 綁定、跨日、並列、重複提交、較低分、鄰近排名、錯誤降級的本機測試。
- [x] 第一輪型別與 Devvit／standalone 建置通過。
- [x] 英文／繁中社群面板的本機桌面／手機初查。
- [x] 官方 CLI/OAuth 身分讀回 u/OwnDifference7782；私人 staging 0.48.0 完整安裝。
- [x] 完成程式自審、兩語公開輸出與政策檢查。56 測試、型別、Devvit／standalone build 通過。
- [x] MK 本輪明確授權 codex-mk-personal；可見 View Profile 讀回 u/OwnDifference7782。staging 真實 70 分操作經後端重算上榜，查榜及刷新可讀回；重送回傳相同 runId／acceptedAt 且總數維持 1。移除後重送舊局不復活排名。分享預覽與選填心得複製通過，未發送留言。
- [x] main 合併推送 `48b6df2`；所有 frontend/server/permissions 同版發布及安裝。官方 API 讀回 0.48.2 visibility PUBLIC、build READY、publish request APPROVED。
- [x] 公開原貼文 live readback：匿名完成一局與查榜成功；登入玩家真實 70 分經後端重算上榜，另一個未登入 lane 可讀到同一筆排名，隨後移除測試排名。英文／繁中面板與分享預覽檢查完成。政策兩頁 HTTP 200，內容與 public 原始檔雜湊一致。

MK 已在本輪授權專用個人 lane 完成 staging 驗證。私人 0.48.0／0.48.1 是中間驗證包，正式候選為 0.48.2；UI v0.48 與 survival-6 玩法規則不變。匿名與正式政策 live readback 已於本輪安裝後完成。

不新增 cron／自動化，每月排程觸發數為 0、空跑為 0；API 只在玩家開榜、開始正式局、手動提交／刷新／移除時呼叫。

## 正式位置與限制

- 原投稿遊戲：https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/
- Vercel production `dpl_4so39xfiuzqac94SP7YYkrtkvgzq`，READY，Git main／48b6df2；正式 alias last-shield.vercel.app。獨立站只提供本機玩法，不接 Reddit 社群 API。
- 正式包 0.48.2 最後再於 staging 提交／移除成功，新增的移除狀態與再參加提示正確。無 SQL migration／functions 漏部署項目。
- 實測為桌面瀏覽器與手機尺寸模擬，不宣稱真實 iOS／Android 裝置驗收；多使用者並列與鄰近排序由單元測試驗證，live 測試只使用既有擁有者帳號與匿名視窗。重播可排除任意分數上傳，不能證明真人操作。
- Devvit 原生頁有 Reddit／Google 的 CSP report-only 與平台警告；本輪遊戲 API 未出現失敗。standalone Phaser chunk-size 警告仍存在，建置成功。
