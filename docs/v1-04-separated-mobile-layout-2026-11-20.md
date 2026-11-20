# v1.04 手機選單與戰場分區

2026-11-20。狀態：v1.04已正式發布，原貼文讀回完成。使用者補充沒有播放器工具列的 Android Reddit App 截圖後，確認需處理遊戲本身的配置，不能只歸因錄影播放器。

## 已確認原因

v1.03選單仍以固定top／bottom分開定位標題與風暴卡片。390×612、150%文字時，headerBottom86.59高於copyTop76，copyBottom247超過cardTop214，兩處真實重疊。預設字級雖可捲動卡片，開始／練習藏在每日資訊下方。戰鬥雖將護罩留在按鈕上方，HUD／操作仍疊在同一大畫布上，未達使用者期待的分區呈現。

## 修正

- 手機／直向選單改header加單一捲動區；標題、卡片依內容高度排列，開始／練習先於每日詳細資訊。暫停、練習完成與結算使用相同的header下方面板，避免大字級碰撞。
- 手機戰鬥改為header、HUD、獨立arena、action四列，HUD與按鈕不再覆蓋arena。
- 畫布同比例縮放；arena顯示source y96..920，包含隕石入場、完整護罩y568..832與發光城市y880，只讓外側裝飾留在視野外。pointer照實際canvas矩形換算。桌機保留原旁欄配置。
- 未更動server/shared、權限、migration、survival-8／community-3或影音素材。未合併PR #15的點擊試玩。

## 驗證

- Node24.22.3，check／183 tests／Devvit及standalone build通過。
- 選單／暫停54組尺寸×中英×100/150/200%文字：無header／標題／卡片相交，開始練習可捲動到並點擊，面板留在視窗內。
- 戰鬥54組同尺寸文字矩陣：操作>=44px且完整可見，arena不碰HUD或action，入場／護罩／城市取樣座標皆在arena內，畫布比例0.5。極窄200%時已修正grid預設min-content造成的水平外溢。
- 原生點擊實際金色隕石並保持長按：完美課通過；仍按住時Continue禁用，放開後可繼續；雙隕石放開重按接力通過。
- 超載課中暫停切桌機、恢復後再切手機，待逼近0.9秒原生點擊超載，通過危機清場回饋。練習完成／自然失敗結算面板已檢查。
- 獨立唯讀審查無阻塞；所有使用者／QA圖像留在本機ignored attachments。

尺寸與字級為瀏覽器模擬，未宣稱已在使用者的Android裝置完成回歸。實機仍以重新開啟原貼文的結果確認。

## 發布讀回

- PR #18合併main `2f4b4c51ee1e939500b24587678a2f4572b86742`，tag `v1.04`；合併後183 tests通過。
- Devvit 1.0.4 version `7387b19a-e3c0-49f1-93c9-8a21b425017a` PUBLIC／READY，review `73003417-9db3-4989-9267-ac27a3275233` APPROVED。既有stage／正式完整安裝1.0.4。
- 兩原貼文native點擊splash可開啟新版game.html，手機390×612長按練習成功。正式HUD底121.20、arena頂127.20／底491.75、action頂497.75，分區間隔各6px，沒有彼此相交。
- Stage選單390×612：header底54、copy頂68／底147、card頂159；練習鈕底222、開始鈕底278，初始視窗即看得到操作。
- Stage／正式default.js、default.css、client.js、game.js、game.css匿名HTTP200並與本機dist/client逐位元一致。
- 正式board／hall HTTP200，community-3／survival-8；日榜total0、Score／Combo競爭榜空。K示範證書 `ac29c259-b90f-4519-b17a-03b109a2876c`／1,272,630保留，沒有加入正式測試分數。
- Vercel production `dpl_J2ffHchMffZ7YtTyJY9uS8FussNo` READY，同一source merge；公開首頁v1.04、JS／CSS與本機standalone相同；privacy／terms同源相符。
- App Directory 1.0.4 about讀回與README一致，validInstallTypes=[1]保留。YouTube／Devpost本輪未操作。
- 最後記錄走docs-only PR，既有ignore-build判定skip，不額外觸發完整部署。
