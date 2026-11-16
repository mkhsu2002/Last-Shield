# Last Shield 投稿展示同步

狀態（2026-11-16）：v0.49 已正式上線，README／遊戲簡介與 Devpost 已同步新版特點；此為營運狀態文件，公開文案來源為 README、presentation-copy.json、devpost-project-story-current.md。

## 已完成

- README 首屏新增每日挑戰、戰術時機、社群榜與策略交流；保留必要操作／隱私與正式 Reddit 遊玩入口。
- 官方 App.Update 已儲存 171 字元新版 description；AppVersion.Update 已把 0.48.2 about 同步 README，完整讀回一致。這是 metadata 更新，不用空 commit／新套件喚醒部署。
- Devpost 已登入 mkhsu2002，原 submission 1301583／Last Shield 查重後編輯。新版 story、121 字元 pitch、三張原生實玩圖的 caption 已以 Save & continue 儲存。新版 story 補上已完成的排行榜與伺服器重播，不再把它們列為未來功能。
- Additional info 已補選 Feedback Awards，重新進入 finalization 仍顯示 SUBMITTED／5/5、Project submitted!。沿用 MK 先前完成問卷的既有確認紀錄；本輪未讀取或重送問卷答案。Helper Award／協助者提名維持空白，沒有可核實人選。
- 0.47 catalog 素材本輪官方 GetDisplay 仍為 PENDING；保留原審核請求與四項素材，不為短文案重開審核。較短的新候選文字保存在 presentation-copy.json，未宣稱已獲推薦。

## 最後同步

- [x] v0.49 正式版本已核准並同版安裝到 staging／正式，圖片由公開原投稿貼文實際操作取得。
- [x] 已補兩張 v0.49 原生手機／榜單圖到 README 與 Devpost（gallery 原 3 張保留，共 5 張）；新圖逐張肉眼檢查，caption 與圖檔 byte size 配對核對。沒有改分、改時鐘、捏造玩家；拍攝後已移除測試用排名。舊 39 秒 v0.47 影片仍保留並在 README 標示展示範圍。
- [x] 新版 story 的手機操作段落／社群榜與新 pitch 已由 Devpost 公開頁讀回；舊「分數只留本機」段落不存在。Feedback Awards 已回到 additional info 讀回。
- [x] 最後 docs／圖片／README 已於 b7de3fd 合併推送，ignore-build gate 回傳 0；AppVersion.Update 已把 0.49.0 about 與完整 README 同步，讀回逐字一致。GitHub raw 的 README／兩張圖與本機 SHA-256 相同。

## 評估方向與界線

官方四個等權評分面向是 Delightful UX、Polish、Reddity、Daily Content。此次改善把每日共用風暴、可學習重玩、同社群競爭與自選策略分享放在開頭；遊戲功能與實際部署為描述邊界。新巴比倫是原創世界觀，重點展示目標選擇／完美定住／手動超載的具體決策，不宣稱既有題材本身足以形成差異。

現有 YouTube 影片為 39 秒 v0.47 真實 Reddit 玩法實錄，尚未包含新版排行榜與手機 dock。官方允許只依展示材料評審，因此新版社群功能需要實際截圖；後續若替換影片，應採小於一分鐘的英文原生實錄，包含 gameplay→結果→提交→社群榜，不以靜態宣傳字卡代替可玩畫面。

不捏造玩家、活躍數、留言、獎項或推薦狀態；不為了互動量群發、買讚、代玩家發言或修改已完成問卷。官方並不要求先公開 publish app 才參賽，既有核准上架不作為額外得獎保證，不為文案再走不必要的版本發布。

來源於 2026-11-16 實際重新閱讀：[官方規則](https://redditgameofday2026.devpost.com/rules)、[活動頁](https://redditgameofday2026.devpost.com/)。

## 素材與既有資料保護

新版圖：`media/last-shield-v0.49-mobile-controls.png`（390×602、93,180 bytes），`media/last-shield-v0.49-community-board.png`（390×602、51,757 bytes）。來源為 production 0.49.0 Reddit iframe，展示分數 200，由一次真實完美擊破取得。

Devpost 二次儲存曾回傳 optimistic-lock 訊息「This submission has changed since you’ve started editing it.」；重新讀回與已保存稿逐字比對後，只加入手機操作段落並成功保存，沒有覆寫未知變更。沒有再次按 Submit project 或切換既有條款 checkbox。

`.codex-attachments/` 已加入 gitignore，避免未來 source archive 自動包含使用者附圖；使用者原始附圖未加入 repo，對外使用本輪另行拍攝的遊戲畫面。

最終公開讀回：Devpost 新 pitch、手機操作段落、社群榜段落均存在，五張 gallery 圖載入成功，兩張新版 caption 正確；finalization 仍顯示 SUBMITTED／5/5 steps done／Project submitted!。
