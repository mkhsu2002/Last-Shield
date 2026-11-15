# v0.46 預設英文與雙語驗證

2026-11-14。MK 要求英文版或雙語、預設英文。本版採英文／繁體中文即時切換，保留 v0.45 survival-6 玩法、音效與相容最佳紀錄。

## 實作範圍

- 本機 catalog、文字／數值／巢狀目標名稱與 ARIA 更新，頁首 EN／繁中選擇。初始英文，不依 navigator 語言猜測；有效繁中偏好才套用 zh-Hant。儲存拒絕時仍可當次切換。
- 原始來源文字保留於對應節點／欄位登記，切換時重新翻譯而非重建遊戲；動態 HUD／回饋／教學／暫停／結果／建議，以及已開啟的分享 textarea 均跟隨選擇。語言控制 Space／E 不會觸發遊戲。
- title／description／html lang／main ARIA 初始英文並隨語言更新；splash 源碼同樣支援語言，未宣稱已發布 Reddit。
- package 0.46.0／可見 v0.46；RULES_VERSION 仍 survival-6。無後端 schema、migration、Functions、API 格式、帳本、排程、provider secret 或部署設定變動；audio.ts、shared/game-logic.ts 與 server 無差異。

## 驗證

- Node 24.20.0：47 項測試、client/server 型別、standalone 與 Devvit 建置、git diff --check 通過。新測試包含預設／非法／拒絕儲存、巢狀與數值提示、字串參數保留、分享日期／換行、+1 能量與 +200 得分的組合提示。
- 實際操作發現組合回饋的參數切分使「超載 +1」未翻譯；先新增回歸案例並觀察失敗，再修正。重玩回饋為「Perfect clear · Charge +1 +200」，英文畫面掃描（排除語言選項繁中）與所有 ARIA 文字沒有漢字殘留。
- canonical codex-neo-babylon 已啟動與身份標示確認為 mksaid2025@gmail.com。390×844 英文開場／練習可用，練習完美完成顯示英文說明。切繁中、重載仍為 zh-Hant，再切回英文成功。
- 英文正式流程實際按鍵到第七波，首潮三顆仍全完美、100% 護盾、2550 分。暫停時英文→繁中→英文，護盾與分數未改；鎖定、接力、能量、城市訊息與暫停說明皆同步翻譯。
- 320×568 及 390×844 無水平溢位，控制鈕在畫面內；截圖已肉眼檢查。小螢幕 Last Shield 保持完整，版號另行，語言／音效／暫停均可見。
- 專用本機測試頁拒絕 Storage getItem/setItem 與 clipboard.writeText：仍以英文開場；結束顯示「Score could not be saved. You can still play again.」。分享顯示可選取英文，沒有 localhost URL；切繁中後 textarea 與結果標題即時變中文，再切回英文恢復。
- 本機測試頁曾因未在前景導致 native click 的 rAF stability／結果等待逾時；bringToFront 後重新實際操作通過。沒有把未推進的嘗試當成功證據。生存中會因切到其他 tab 自動暫停，這是保留的產品行為。
- 已審查兩語開場／玩法與教學／光束判定／超載／暫停／結算／儲存與複製失敗／分享／ARIA／metadata／splash 公開文字，沒有內部提示、驗收流程或供應商語言。語言選項使用其本身語言標示。

## 發布狀態

待 main／tag v0.46 推送後讀回 Vercel 來源、正式 alias、公開資產 SHA-256 與即時語言切換。

僅靜態獨立站發布；Reddit 尚未初始化／上傳／發布。既有 Phaser bundle 大小提示仍存在。真實手機硬體主觀手感沿用待確認狀態，本輪沒有重新人工試聽。
