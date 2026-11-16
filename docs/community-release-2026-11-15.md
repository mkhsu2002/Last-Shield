# v0.48 社群功能發布狀態

更新：2026-11-15（America/Vancouver）。狀態：staging 玩家驗證通過；準備發布 0.48.2，正式安裝尚未切換。

## 範圍與現況

- 每日同社群榜、前十名、鄰近排名、並列與追分差距、手動提交及移除。
- 後端重播 gameplay inputs 重算分數；同帳號最高分與 submission audit 同一交易寫入，重試不重複上榜。
- 戰績預覽、選填心得、複製後開啟 Reddit 原生貼文，由玩家自行編輯送出。這版沒有 asUser 自動留言 API。
- UI v0.48／package 0.48.1 已私人上傳並完整安裝到新建私人 `r/last_shield_stage`；尚未發布或安裝到公開 `r/last_shield_dev`。
- 公開貼文仍使用 v0.47／0.47.1；歷史 Devpost 提交維持原狀。

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
- [ ] 正確目標 main 合併推送；所有 frontend/server/permissions 同版發布及公開社群安裝。
- [ ] 公開版本、匿名遊玩、登入上榜與政策 live readback。

MK 已在本輪授權專用個人 lane 完成 staging 驗證。私人 0.48.0／0.48.1 是中間驗證包，正式候選為 0.48.2；UI v0.48 與 survival-6 玩法規則不變。匿名與正式政策 live readback 將於安裝後補記。

不新增 cron／自動化，每月排程觸發數為 0、空跑為 0；API 只在玩家開榜、開始正式局、手動提交／刷新／移除時呼叫。
