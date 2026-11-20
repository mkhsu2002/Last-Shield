# v1.03 手機戰鬥視野改善

2026-11-20。狀態：v1.03 已正式發布並完成原貼文讀回。依使用者提供的 Android Reddit App 實際畫面改善嵌入遊戲，不新增貼文或更換影音。

## 改善

手機戰鬥 HUD 保留護盾、分數、波數、連擊與逼近時間；音效／暫停改圖示，完整本局資訊可在暫停查看。分數以向下取整 K／M 縮寫，精確值仍在無障礙 HUD、暫停、結算與排行榜。極短視窗優先保留護盾和分數，其餘資訊仍可暫停查看。

回饋與操作提示共用一列，發射及含蓄能數的超載按鈕並排。依實際按鈕高度縮放等比例畫布，將完整護罩與城市放在控制區上方；隕石顯示投影與點選使用同一實際畫布座標。大字級的 HUD 收合以展開後的間距確認能否還原，避免隔幀切換。

保留原美術、立體聲、碰撞、計分與 survival-8／community-3 契約，未更動後端、權限或 migration。

## 驗證

- Node24.22.3；check、183 tests、Devvit／standalone build 通過。
- 54 組尺寸／字級檢查：320×480、360×600、390×612、390×796、430×820、667×375、724×596、768×768、1420×660，乘以中英與100／150／200%文字壓力；操作按鈕至少44px、在視窗內，畫布比例不變，手機完整護罩與城市不碰 HUD／按鈕。
- 390×612 預設操作區約106px；城市底489.7px、按鈕區頂497.75px。150%文字時仍完整可見。
- 原生滑鼠點選金色隕石並持續按住：完美課通過；發射鈕釋放重按：雙隕石接力課通過，過早放開的失敗回饋正常。
- 超載練習原生點擊：危機前提早使用回饋正常；等到逼近0.9秒再點擊，清場與通過回饋正常。暫停完整資訊中英切換正常。
- 最終54組另連續取樣12個畫面幀，收合狀態穩定，無隔幀震盪。
- 獨立唯讀程式審查無阻塞；已補強大字級收合還原判斷。

字級／尺寸為瀏覽器模擬，不是 Android 實機回歸。QA 圖片留在本機 ignored attachments；不公開上傳使用者截圖。

## 發布讀回

- PR #16 合併 main `18ea0745fc73aed70318a7fde20c96868efdac32`，tag `v1.03`；合併版本183 tests通過。
- Devvit version `ad0d55bd-7a88-4ed3-906d-5f4bddf36e33` PUBLIC／READY；review `4104646c-6189-438a-9f56-9f3e84b82f3d` APPROVED。CLI identity為u/OwnDifference7782，兩既有社群完整安裝1.0.3。
- 原stage與正式貼文皆可從splash原生點擊開啟1.0.3並完成完美長按課。正式iframe390×612：action106.25px，完整城市底至操作區間距8.05px，護罩頂至HUD底間距194.89px。Stage由手機切桌機後恢復／暫停正常，1420×612畫布比例0.5，控制區在畫布右側。
- 兩社群versioned CDN的default.js／default.css／client.js／game.js／game.css均匿名HTTP200並與本機dist/client逐位元相同。game.css SHA-256 `9f24a2a0e1ce561413389f0561386c9786b3d5ac3c5e3f4121f111082483852f`。
- 正式board（帶UTC day=20261120）、hall及既有certificate GET皆HTTP200，community-3／survival-8。日榜total0，Score／Combo競爭榜空；K示範證書 `ac29c259-b90f-4519-b17a-03b109a2876c`／1,272,630保留，未新增正式測試分數。省略day的手動探測正確回傳400 invalid-day，補上必填參數後200。
- Vercel production `dpl_4W594T7bdaFvNDb1H25JnB7eiRem` READY，同一main merge來源；公開首頁v1.03、JS／CSS與本機standalone逐位元一致，privacy／terms同源相符。
- App Directory 1.0.3 about與README相同，validInstallTypes=[1]保留。YouTube／Devpost維持既有v1.0展示，本輪未操作。
- 最後讀回紀錄走docs-only PR，沿用既有ignore-build不額外觸發完整部署。
