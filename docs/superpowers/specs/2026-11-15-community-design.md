# v0.48 社群每日挑戰設計

狀態：已於 2026-11-16 完成 v0.48／0.48.2 發布，驗證與限制見 ../../community-release-2026-11-15.md。設計核准：2026-11-15，依 MK「規劃好就開始執行優化」核准執行。v0.47 投稿內容為歷史版本，不改寫其驗證結果。

## 範圍

同 subreddit、UTC 日期、survival-6 規則的每日榜；前十名、自己前後兩位、同分並列與追分差距。匿名與 standalone 維持本機遊玩。玩家主動提交戰績才公開 Reddit 名稱與分數，可移除自己的今日排名。

## 成績信任與資料契約

後端從可信 context 取 userId、username、postId。開始時建立隨機 runId、伺服器日期、開始時間；保存兩小時。客戶端逐次記錄原有 step(delta, holding, target) 與 overdrive 操作，不改動 survival-6；結束提交操作紀錄，伺服器使用 DefenseRun 重播，只有 finished 的重算成績可上榜。限制 180000 操作、3 MB request、兩小時模擬時間與實際經過時間。此驗證不保證真人、不可宣稱能防機器人。

同帳號最高分與 run audit 以 WATCH/MULTI/EXEC 原子更新，重送同 runId 回傳相同結果，較低分不覆寫。榜與 audit 最長保存到挑戰日後 30 天。資料屬安裝社群，不設外部資料庫、不建 cron。

API：GET /api/community/board?day=YYYYMMDD；POST /api/community/start；POST /api/community/submit {runId, trace}；DELETE /api/community/entry?day=YYYYMMDD。所有 response 含 contract=community-1、rules=survival-6。

## 討論

賽後打開分享面板，預覽戰績並可選填心得。使用 Reddit 原生留言編輯入口：玩家複製文字、前往目前遊戲貼文留言，再由 Reddit 自行送出。此版本不新增代使用者發言權限，避免權限審核阻擋，也不由 app 帳號代發。純戰績提示回覆置頂戰績串；含個人心得可一般留言。下一階段才評估 asUser 一鍵發送，須驗證一般玩家授權與去重。

## 驗收與發布

有意義測試涵蓋篡改/未結束重播、日期歸屬、跨帳號、重試、競態、同分排名、失敗降級。Devvit 前端/server/Redis 權限完整同版，dev 與公開測試社群分開驗證；standalone 明確只提供本機玩法。逐項審查兩語文字、ARIA、政策。未完成 live verification 不標記正式完成，遇平台阻塞保留已投稿 0.47.1。
