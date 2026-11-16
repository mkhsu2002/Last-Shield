# Last Shield Community Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task in this session. MK has authorized implementation and release without another approval round.

**Goal:** 讓每日固定風暴產生可信的同社群競爭與玩家討論。

**Architecture:** 共用操作紀錄與 DefenseRun 重播，Hono API 使用 Reddit context 與安裝隔離 Redis。客戶端獨立 community 模組處理提交、查榜、移除與分享面板；不改核心玩法。

**Tech Stack:** TypeScript、Node test runner、Devvit Web 0.15.3、Redis、Hono、Phaser。

---

### Task 1: 重播與契約
- [x] 新增 `src/shared/community.ts`：Trace tuple、契約型別、重播驗證；以 `new DefenseRun(day)` 執行原始 step 與 overdrive，拒絕未結束／超限。
- [x] 先新增 `src/shared/community.test.ts`，執行 `node --test src/shared/community.test.ts` 證明缺少功能，再實作並驗證。

### Task 2: 持久化與 API
- [x] 新增 `src/server/community-service.ts`：注入 Redis 與身分，run TTL、WATCH 原子最佳分/audit、日榜/鄰近/並列、自己的排名移除。
- [x] 新增 `src/server/community-service.test.ts`，測試 owner、重送、競態、較低分、跨日、到期與儲存失敗；先失敗再實作。
- [x] `src/server/index.ts` 接上 body 限制與四個路由；`devvit.json` 啟用 redis，保留最小權限。

### Task 3: 玩家介面
- [x] 新增 `src/client/community.ts`，把伺服器文字映射至本地化可見狀態；榜資料用 textContent，避免 HTML 注入。
- [x] 修改 `src/client/game.ts` 記錄每次 step/overdrive、開始時取得伺服器日期；不改既有規則，練習不記榜。
- [x] 修改 `src/client/game-ui.ts`、`game.css`、`messages.ts`：入口、可捲動榜、手動提交／重試、移除、戰績預覽與心得、原生貼文留言入口。

### Task 4: 驗證與發布
- [x] `package.json`/lock 升 0.48.0 並擴充 test script；跑 `npm test`、`npm run check`、`npm run build`、`npm run build:standalone`。
- [x] 更新 README、development、隱私條款、發布 checklist；歷史投稿文件只加版本狀態指引。
- [x] 官方 API/CLI 確認身分與既有 app/install；dev 驗證 Redis 實寫讀回、audit、匿名、跨日/重試、兩語手機/桌面。
- [x] 所有必要檢查通過後 commit/merge main/push、完整 Devvit 發布/安裝；讀回 deployed version、live behavior 與 standalone 政策。審核/帳號阻塞則回報確切錯誤，不硬切新前端。

完成狀態（2026-11-16）：main 已合併推送，Reddit 0.48.2 已核准公開並同版安裝到正式與 staging；驗證範圍與限制見 ../../community-release-2026-11-15.md。
