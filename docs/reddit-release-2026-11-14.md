# Reddit 首次發布｜2026-11-14

## 即時狀態

- 已合併本機 main，準備 package 0.47.1／UI v0.47，玩法仍 survival-6；0.47.0 是首次私人上傳，首次公開送審修補包為 0.47.1，同一個 v0.47 發布批次。
- 正式 Vercel 目前仍 v0.46，未把 Reddit 待部署狀態誤標成完成。
- 已由 MK 指定改用 codex-mk-personal（mkhsu2002@gmail.com）及既有 https://developers.reddit.com/apps/last-shield；此當次明確指示覆蓋原專案預設 Neo Babylon lane。平台 My apps 可見 u/OwnDifference7782 管理 last-shield、安裝 0 社群；App 頁顯示名稱已認領，待第一個 upload。
- MK 已親自完成 OAuth 並回覆已授權；CLI whoami 為 u/OwnDifference7782。0.47.0 已完整 upload／自動安裝，官方自動建立 r/last_shield_dev（私人內測社群）。尚未公開核准。
- 唯一內測貼文已查重並建立：https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/ ，作者為 app last-shield。首次建立後發現舊 handler 以完整 t3_ id 組網址，導向空白；改用 SDK post.permalink，將以 0.47.1 同步更新前端／server／安裝並保留同一貼文。
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
