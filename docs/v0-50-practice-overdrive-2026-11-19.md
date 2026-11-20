# v0.50 練習回饋與超載影音修訂

查核日期：2026-11-19，America/Vancouver。狀態：私人 **0.50.0.3** 已完成安裝與 Reddit 原生驗證，等待 MK 主觀複驗；正式 Reddit 仍為 0.49.0。沿用功能分支 `codex/v0.50.0-competition-av`。

## 變更與原因

MK 回報 Practice perfect timing 結束太快，來不及理解判定；並要求 Overdrive 使用更震撼的藍白雷射與爆裂聲。

- 原流程 clear／impact 直接進 trained，遮住戰場回饋。新增 practice-review 狀態，練習採半速並保留金色等待；結果停在戰場顯示成功、偏早或太早放開與原因。至少保留 1.8 秒閱讀時間，原滑鼠／手指／空白鍵放開後才可按獨立「繼續」。時間到不自動轉場，之後仍可再練或選擇正式局。
- 特別處理金色窗口內、尚未開始融解就放開的情況：立即顯示放開太早的教學回饋，不無限等待，也不誤標成成功。
- Overdrive 增加城市射向每顆目標的藍色光暈／白色光芯、發射源與命中光團、衝擊雙環及較長碎裂效果。reduced-motion 保留靜態光束／衝擊環與淡出，停用震動與移動碎片；沒有反覆全畫面閃白。
- 音效改為低頻衝擊、下降雷射與左右聲道碎裂／餘韻，沿用 limiter、靜音、暫停與音源清理。
- 只改 client／教學，保留已核准城市／隕石美術。src/shared、src/server、devvit.json、依賴及版本檔不變；正式規則 survival-6／社群契約 community-1 不變。UI／package 維持 v0.50／0.50.0，私人修訂用四段 Devvit 版號識別。

## 驗證

- Mac 既有 Node v24.22.3，以專案命令 PATH 暫時使用。
- client／server 型別檢查、**59 項測試**、Devvit build、standalone build 全數通過。standalone 仍有既有 Phaser chunk-size 提示；本輪沒有擴充依賴。
- 練習 helper 回歸涵蓋半速／金色等待、放開保護與最短閱讀時間；瀏覽器實玩涵蓋滑鼠及空白鍵成功、偏早、100ms 放開、雙語與不自動跳頁。
- 320×568／390×650，英文／繁中：結果卡底部皆距 viewport 底 10px；「繼續」高度至少 44px，無橫向溢出。不是手機硬體驗收。
- 新版單獨超載 OfflineAudioContext 訊號：2 聲道、peak 0.3850、左右 RMS 0.03987／0.04249、左右差 RMS 0.01336，無削波。此使用實際 scheduleOverdrive／createMasterBus，不以替代音效代測。
- 本機 reduced-motion 真實三次完美長按後手動清除兩顆，保留藍白光束畫面；未改分或時鐘。
- 所有新增可見文字與 ARIA 均有英文／繁中對應；i18n 測試通過，開場、練習、結果與超載實畫面已肉眼檢視。

## 私人發布與 live readback

- CLI whoami 與可見 View Profile 皆為 u/OwnDifference7782，使用 canonical codex-neo-babylon。舊頁曾回報 document.hidden=true，未把無動畫的操作視為成功；透過 canonical open 工具開啟可見分頁後 hidden=false 才進行實玩。
- 0.50.0.2 為中間上傳包，未安裝；最後的 ARIA 與提早放開修訂納入 **0.50.0.3**，才安裝到既有 r/last_shield_stage。沒有新增 App、社群或遊戲貼文。
- 官方 API 讀回 0.50.0.3 PRIVATE／READY；安裝完成後 CLI 重新讀回 staging 0.50.0.3、正式 r/last_shield_dev 0.49.0。前端／server／permissions 為同一完整私人套件；無 migration、外部 secrets 或排程。
- 原 staging 貼文重新載入後，splash／game host 均為 `last-shield-kxouki-0-50-0-3-webview.devvit.net`。
- Reddit 原生成功練習：擊碎後繼續按住兩秒，「繼續」仍 disabled；放開後可用，額外等待仍維持 practice-review，只有明確按繼續才進 trained。再練一次、按下 100ms 即放開，正確顯示 You released too soon。
- 接著正式局三次完美擊破、護盾 100%、蓄滿超載；兩顆逼近時清場，feedback 為 Overdrive! 2 meteors cleared，得分 1,300。實際畫面確認藍白雷射與雙環。
- 真實 Reddit master 輸出旁路錄音為 48 kHz stereo；解碼 peak 0.6578，左右 RMS 0.02875／0.02987、左右差 RMS 0.01120，無削波。未修改音效輸出、遊戲時鐘或分數。
- staging board live GET 為 HTTP 200、community-1／survival-6、total 0；本輪不提交分數。正式榜沒有操作。
- 截圖與 QA 錄音保存於 ignored `.playwright-mcp/v050-practice-reddit-final.png`、`v050-overdrive-reddit-final.png`、`v050-revised-audio.webm`；不是新的投稿素材。待 MK 再驗收練習節奏與主觀音效。

## 接續

[私人試玩仍為原貼文](https://www.reddit.com/r/last_shield_stage/comments/1xximge/last_shield_daily_meteor_defense/)。README／正式 App Directory 仍描述公開 v0.49；main 未合併，正式 Reddit、Vercel、YouTube、Devpost 均未更新。MK 通過私人複驗後，才接續既定正式發布、不到 60 秒英文立體聲實錄與原投稿更新清單。
