# v1.05 手機寬戰場

2026-11-20。狀態：v1.05已正式發布，原貼文讀回完成。

## 問題與修正

v1.04雖分開HUD／arena／action，卻把固定824邏輯像素高的camera window完整縮入arena。390×612畫面中，可用arena寬370px，canvas僅238.5px，兩側留白明顯。

v1.05改為優先填滿可用寬度；畫布維持1:2比例，以城市底部為取景基準，上方隕石入口依arena可用高度調整。最短camera span500，保證隕石、護罩與城市不被裁切；只有高度極低或極大字級時才縮小寬度。手機側邊mask取消，資訊與按鈕仍各自成列。沒有修改計分、碰撞、時間、後端契約或素材。

## 驗證

- 先新增正常arena填滿寬度測試：舊版239不等於370，確認失敗後修正。
- Node24.22.3，check／184 tests／Devvit及standalone build通過。
- 所有6防區×3類隕石×21個進度取樣與護罩／城市邊界測試通過；獨立唯讀審查無阻塞，另檢查包含殘餘核心的18,360組幾何取樣皆可見。
- 54組viewport×中英×100／150／200%文字檢查通過。預設字級360×600、390×612、390×796、430×820皆填滿arena寬度；320×480因高度較短保留83.7%寬度。
- 390×612：arena370×364.55，canvas寬370，HUD底121.20、arena頂127.20／底491.75、action頂497.75，兩側不再留寬邊，分區不相交。
- 原生點擊金色隕石並長按、回饋前保持按住、釋放後繼續、雙隕石接力均通過。超載課暫停切桌機再回手機，等到0.9秒危機原生點擊清場成功。
- 上述為瀏覽器尺寸／字級模擬與實際原生滑鼠操作，不是使用者Android實機回歸。QA與使用者圖像留在本機ignored attachments。

## 發布讀回

- PR #20合併main `23d0c56c6cd2fc46cb0735803e84cbb1bfd12a5f`，tag `v1.05`；合併後184 tests通過。
- Devvit1.0.5 version `6af337f4-1b87-42f7-a3c0-9758ee65ea97` PUBLIC／READY；review `8decbdb4-4413-40df-97b5-f0e32bfd62be` APPROVED。兩既有社群完整安裝1.0.5。
- 原stage／正式貼文皆從splash原生點擊進入新版，390×612的arena與canvas同寬370px，HUD／action各距arena6px，完美長按練習成功。stage首輪等待因遊戲失焦正常暫停，bringToFront並原生Resume後成功，未修改遊戲狀態繞過。
- 兩社群default.js／default.css／client.js／game.js／game.css匿名HTTP200並與本機dist/client逐位元相同。
- 正式board／hall HTTP200，community-3／survival-8；讀回日榜有一筆11,140分，完整保留，沒有新增／刪除正式測試分數。Score／Combo Hall競爭榜空，K既有示範證書 `ac29c259-b90f-4519-b17a-03b109a2876c`／1,272,630保留。本輪正式只跑practice，程式路徑不建立競賽run session。
- Vercel production `dpl_2d9zJv65g4eWRsmTVQgSErgqUeaF` READY，同一source merge；公開首頁v1.05，JS／CSS與本機standalone逐位元一致，privacy／terms同源相符。
- App Directory1.0.5 about與README一致，validInstallTypes=[1]保留。本輪不更換YouTube／Devpost影音。
- 最後狀態紀錄採docs-only PR，既有ignore-build判定skip，不重新觸發完整部署。
