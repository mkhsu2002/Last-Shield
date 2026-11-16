# v0.49 手機戰場與控制區

狀態（2026-11-16）：本機驗證完成，準備完整發布 package 0.49.0；正式目前仍為 0.48.2。

## 變更

- Overdrive 改為固定 56px 單列卡片，保留充能數字、三格與 44px 操作區。完整教學保留在暫停頁及輔助讀取描述。
- 發射鍵移至控制區最後，固定 64px 高，手機距底部約 10px 並尊重 safe-area。
- 手機精簡重複目標提示／里程碑／階段名稱，保留即時威脅、護盾、分數與波次統計。桌面仍可閱讀完整輔助提示。
- 窄畫面遊玩時隱藏 header 次要版本標示，維持語言／音效／暫停至少 44px 的操作空間；開場與結算仍可識別版本。
- 僅改 game-ui.ts、game.css 與版號，不改 survival-6 計分、遊戲規則或 community-1 契約。排行榜依原規則繼續可比。

## 驗證

- 390×650 英文：控制區約 279→208px，HUD 約 98→88px；兩者之間可視區約 197→282px。發射鍵底部約 518→640px。Canvas 原本已填滿 viewport，問題是介面覆蓋比例，未改碰撞或縮放座標。
- 320×568、360×640、390×650、430×780、540×900、1280×800；英文／繁中 × 充能／就緒／啟動，共 36 組本機佈局 fixture 檢查：Overdrive 56px、發射鍵 64px、無橫向溢出、HUD／控制區不重疊。fixture 只驗佈局，不是社群排名／真人分數證據。
- 本機 CDP 觸控模擬：金色時按住底部發射鍵，實際完美擊破得 200 分；放開、暫停與繼續成功。未改遊戲時鐘或分數。
- 56 自動化測試、client/server 型別、Devvit build、standalone build 通過。保留既有 Phaser chunk-size 警告。
- 真實 Android／iOS 裝置改善效果仍請 MK 複驗；不把手機尺寸或觸控模擬說成真機驗收。

## 發布檢查

- [ ] main 合併、commit/push。
- [ ] Reddit 0.49.0 build READY／review APPROVED；staging 與正式同版完整安裝。
- [ ] 原投稿貼文英文／繁中佈局、按住發射、匿名遊玩與排行榜 API 讀回。
- [ ] Vercel 正式 alias／版本與政策頁讀回。
- [ ] README、App Directory、Devpost 與新版展示素材同步，見 presentation-review-2026-11-16.md。
