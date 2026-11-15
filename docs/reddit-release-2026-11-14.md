# Reddit 首次發布｜2026-11-14

## 即時狀態

- 工作分支 `codex/last-shield-v0-47-reddit`，準備版 package 0.47.0／UI v0.47，玩法仍 survival-6。
- 正式 Vercel 目前仍 v0.46，未把 Reddit 待部署狀態誤標成完成。
- 已由 MK 指定改用 codex-mk-personal（mkhsu2002@gmail.com）及既有 https://developers.reddit.com/apps/last-shield；此當次明確指示覆蓋原專案預設 Neo Babylon lane。平台 My apps 可見 u/OwnDifference7782 管理 last-shield、安裝 0 社群；App 頁顯示名稱已認領，待第一個 upload。
- CLI 0.15.3 的 whoami 回報未登入。已啟動官方 CLI OAuth，頁面顯示 OwnDifference7782／Devvit CLI，等待 MK 在可見 MK Personal 視窗親自 Accept 並確認。尚未 upload／install／publish／建立貼文。
- 已找回 MK 原先保留的本機 onboarding 指令（ignored、0600），不得重貼 opaque setup payload 或在現有 checkout 重跑初始化；指令本身沒有指定社群，待平台讀回既有設定。原先「開發完成後再引導 Reddit」的時序已由本輪明確發布指示接續。

## 已準備

- 根 README 會被 CLI 當成公開 App Directory 說明，已改為英文玩家／管理員操作與必要的本機儲存說明。開發與歷史發布資料移至 development.md。
- 修正遺留 AEGIS 管理選單／貼文標題，統一 Last Shield。未改 API 回傳格式。
- 明確啟用建立遊戲貼文必要的 Reddit API 權限，關閉未使用的 HTTP plugin；未加入外部網域、Redis、付款或排程。
- 待登入後以官方 CLI 確認 whoami／既有 App，完成 upload、指定版本安裝、Reddit 內實際啟動與發文去重、publish 送審及正式狀態讀回。不得把 upload、playtest、送審當成核准上架。
- 任何條款接受、CAPTCHA、帳號／安全或具約束力的確認，交由 MK 親自處理；不代按。

## 必要發布驗證

- [x] 47 測試、client/server 型別、standalone／Devvit 建置與公開兩語文案審查。
- [ ] 正確目標分支合併；Reddit 前端、server 與 permissions 同一完整版本部署／安裝。
- [ ] Devvit whoami 與可見個人 lane 的帳號一致；現有 App／貼文查重。
- [ ] 正確社群安裝與單一可玩貼文連結；普通玩家啟動、英文預設／繁中、遊戲功能 smoke。
- [ ] App Directory／送審或核准狀態準確讀回；Vercel 同版與 bundle/source 讀回。
- [ ] docs、README 相關即時狀態與歷史註記同步；不記錄 OAuth code/token。
