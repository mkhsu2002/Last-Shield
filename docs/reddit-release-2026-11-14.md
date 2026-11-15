# Reddit 首次發布｜2026-11-14

## 即時狀態

- 已合併並推送 main 與 v0.47 tag，package 0.47.1／UI v0.47，玩法仍 survival-6；0.47.0 是首次私人上傳，首次公開送審修補包為 0.47.1，同一個 v0.47 發布批次。
- 正式 Vercel 已為 v0.47／package 0.47.1；正式 alias、程式 bundle 與政策頁均已讀回，見下方證據。
- 已由 MK 指定改用 codex-mk-personal（mkhsu2002@gmail.com）及既有 https://developers.reddit.com/apps/last-shield；此當次明確指示覆蓋原專案預設 Neo Babylon lane。平台 Creator 與 CLI 帳號均已確認為 u/OwnDifference7782。
- MK 已親自完成 OAuth 並回覆已授權；CLI whoami 為 u/OwnDifference7782。0.47.0 已完整 upload／自動安裝，官方最初建立私人 r/last_shield_dev；本輪已依 MK 指示改為公開，讀回 2 名成員。0.47.1 已安裝，官方 app/version visibility PUBLIC、build READY、publish request APPROVED。
- 唯一公開遊戲貼文已查重並建立：https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/ ，作者為 app last-shield。首次建立後發現舊 handler 以完整 t3_ id 組網址，導向空白；改用 SDK post.permalink，已以 0.47.1 同步更新前端／server／安裝並保留同一貼文。
- 已找回 MK 原先保留的本機 onboarding 指令（ignored、0600），不得重貼 opaque setup payload 或在現有 checkout 重跑初始化；指令本身沒有指定社群，待平台讀回既有設定。原先「開發完成後再引導 Reddit」的時序已由本輪明確發布指示接續。

## 已準備

- 根 README 會被 CLI 當成公開 App Directory 說明，已改為英文玩家／管理員操作與必要的本機儲存說明。開發與歷史發布資料移至 development.md。
- 修正遺留 AEGIS 管理選單／貼文標題，統一 Last Shield。未改 API 回傳格式。
- 明確啟用建立遊戲貼文必要的 Reddit API 權限，關閉未使用的 HTTP plugin；未加入外部網域、Redis、付款或排程。
- 已以官方 CLI 完成 upload、指定版本安裝與 publish 送審，原生 Reddit iframe 已實際啟動。不得把 upload、playtest、送審當成核准上架，也不得把私人測試社群當成公開評審環境。
- 任何條款接受、CAPTCHA、帳號／安全或具約束力的確認，交由 MK 親自處理；不代按。

## 必要發布驗證

- [x] 47 測試、client/server 型別、standalone／Devvit 建置與公開兩語文案審查。
- [x] 正確目標分支 main 合併推送；Reddit 前端、server 與 permissions 同一完整 0.47.1 版本部署／安裝。
- [x] Devvit whoami、官方 OAuth me 與可見個人 lane 的帳號均為 OwnDifference7782；現有 App／貼文查重。
- [x] 0.47.1 原生 Reddit post；全新未登入 context 可開啟英文 splash／game、完成練習與正式擊碎、暫停／繼續。繁中沿用前輪驗證，本輪未重測。
- [x] App Directory／version PUBLIC、build READY、request APPROVED；Vercel 同版與 bundle/source 讀回。
- [x] docs、根 README、英文 Devpost 提交包與原生實錄截圖同步；不記錄 OAuth code/token。

## 政策頁與 App 設定補齊

- MK 已授權將條款／隱私政策直接上線，確認網址可開啟後更新並儲存 Directory listing。
- 新增 `public/terms/index.html`、`public/privacy/index.html`；生效日期 2026-11-14，正文只含終端使用者需要的條款與資料處理資訊。正式目標網址為 `https://last-shield.vercel.app/terms/`、`https://last-shield.vercel.app/privacy/`。
- 未來網域指定 `neobabylon.app`；本輪不變更 DNS 或宣稱已綁定，先保留正式可用的 Vercel 網址。
- 本輪 47 測試、client/server 型別、Devvit 與 standalone 建置已通過。
- 正式部署 `dpl_HcajNjPAcB914FFytgLwNWDDWqqp`，production alias `last-shield.vercel.app`，source `0c4af9f1ba89bed7a35e3b84659130f66d7ea27f`，READY。兩個政策頁匿名 HTTP 200、text/html，與 public 原始檔逐位元組一致。
- Terms SHA-256：`4d3bc7bcf9cf44da5017b6c6904649ef7f70b598ba04a0cfb36a8a2c22efc6fb`；Privacy SHA-256：`8fe0706ca8fbf3a1de0caed565e71545fd069845be8f0a01739b53650419cf82`。
- 正式 root HTTP 200；JS `index-YdKBIR4j.js` SHA-256 `be6ce200f17897a84ed6962e97ba19ce7aa4587fa7ac93036da780ca902e5ee7`；CSS `index-VaoL6ipG.css` SHA-256 `92a23308750a17ef46c35a49f26214ed9ae915ca8506a1e1040a368b82fb7571`，皆與本機建置相同。
- 官方 API 已儲存並 GetBySlug 讀回：名稱 Last Shield、162 字元英文簡介、上述兩個政策 URL，NSFW false；再重新載入 canonical personal lane 的 Developer Settings，四個公開欄位值均正確，未代替 MK 接受任何平台契約。

## 公開評審環境與提交包

- 2026-11-14 已經由 Reddit 官方社群類型變更介面提交公開要求，API 讀回 `public`、2 名成員、非 NSFW；原有內容與單一貼文保留。舊第三方 API 雖回成功但未改變類型，未將該回應誤標完成。
- MK 親自完成新未登入 context 的真人驗證後，原生 trusted click 開啟 Devvit 0.47.1 splash → game，英文 v0.47。完美練習完成、正式長按擊碎得分 100 並進入 wave 2、100% 護盾、暫停／捲動後繼續均可操作。
- `docs/media/last-shield-v0.47-reddit-gameplay.png` 為此輪未登入真實遊玩截圖；沒有合成或改分。
- 完整英文文案、必要連結、評審步驟與剩餘人工確認，見 `devpost-submission-2026-11-14.md`。尚未建立 Devpost 草稿／正式送件。
- 根 README 已補原生貼文、社群與 listing 連結、每日重玩、分享、本機紀錄及開發方式。文件變更不建立新遊戲版本、不觸發完整建置。
- 評審存取保留至 2026-12-16 18:00 PST；未建立關閉排程、付費限制或配額，也未建立持續監控任務。正式送件前仍需再次確認成員數。
