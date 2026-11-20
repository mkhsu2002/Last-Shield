# v1.02 Reddit App 啟動畫面修正

2026-11-20。狀態：v1.02 已正式發布，原貼文讀回完成。使用者提供 Android Reddit App 實際截圖，開始按鈕遭裁切、語言選單遮住品牌。延續已授權的正式問題修正，完成驗證後發布至原 App 與原貼文。

## 原因與修正方向

舊 splash 使用 min-height:100dvh 加上固定110px圖示、17px間距、72px上下padding與長說明，內容可高於固定的Reddit iframe；語言選單absolute佔住品牌區。前一輪驗證集中在expanded遊戲畫面，未覆蓋此啟動畫面的內容高度與字級組合。

保持現有盾牌與色系。改成固定viewport內三列：正常排版的品牌／語言列、可縮小的主視覺／短說明、不可壓縮的開始按鈕／版本列。短卡片依可用高度縮小或省略圖示；空間更少時省略次要說明，保留主要操作。不以裁字、關閉字級調整或捲動才能找到按鈕作為解法。維持同步trusted click的requestExpandedMode，遊戲、計分、排行榜與後端不變。

## 驗證與部署

- [x] 舊版344×512、150%字級重現：content643px、buttonBottom572.875px，按鈕超出512px卡片；預設字級仍有品牌／語言重疊
- [x] 60組瀏覽器檢查：288×320、344×320、344×420、344×512、360×640、375×594、390×796、880×320、880×512、320×240 ×中英×100/150/200%文字壓力，開始按鈕>=44px且完整可見、品牌不碰選單、主文字不碰header/footer。短卡裝飾／次要說明依可用高度讓位，沒有強制縮小文字。
- [x] Node24.22.3、check、179tests、Devvit／standalone建置通過，獨立唯讀審查無阻塞。
- [x] PR合併、tag、public review核准及兩社群完整同版安裝
- [x] 原正式貼文啟動至遊戲、CDN／API／Vercel同源讀回

字級壓力測試為瀏覽器模擬；不等於已重測使用者的Android實機。

## 正式發布讀回

- PR #13 合併 main `2ac693b0985294a9fcabf97c316e1b871cb5bead`，tag `v1.02`；合併結果179tests通過。
- 官方 review `6f78f0e9-2d90-486b-a0d3-09757f101c2f` APPROVED；1.0.2 version `4d7c74cc-e53e-446c-a1e4-c121eb162f04` PUBLIC／READY。既有last_shield_stage與last_shield_dev完整安裝1.0.2。
- 原stage／正式貼文的390×512啟動iframe：開始按鈕top428、bottom476、height48，在卡片內完整可見，品牌與選單不重疊。原生trusted click可開啟game.html並顯示v1.02。Stage另完成完美長按課。
- 正式與stage的default.js／default.css／client.js／game.js／game.css皆匿名HTTP200、與本機dist/client逐位元一致。default.js SHA-256 `3972f49061eb2487fcf9c44f2b60de5836525e08a28857be9036caaacd08f11f`，default.css `f63ab0129cc4ad024f0565a67183eaf64a205268d6c1e2ca78e59c697aa4fd3b`。
- 正式board／hall HTTP200，community-3／survival-8；日榜total0，既有K示範證書 `ac29c259-b90f-4519-b17a-03b109a2876c`／1,272,630分保留，沒有新增正式試玩成績。未更動server/shared、permissions或migration。
- Vercel production `dpl_DmrAywYmsNZiGkH8ss7nJ9PbDyMG` READY、git source同一main merge；公開首頁v1.02、JS／CSS與本機standalone相同，privacy／terms HTTP200且逐位元相同。
- App Directory的1.0.2 about已更新並讀回與README一致，原validInstallTypes=[1]保留。YouTube／Devpost本輪未操作。
- 使用者提供的原始截圖與QA截圖均保留本機ignored attachments，不公開上傳。最後更新狀態紀錄採docs-only PR，不額外觸發完整部署。

已驗證的是固定尺寸／字級壓力模擬與Reddit原生web版入口；使用者Android App實機仍需重開原貼文後確認，不能把模擬宣稱為已完成實機回歸。
