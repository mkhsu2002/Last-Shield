# Last Shield｜In-app catalog｜2026-11-14

狀態：四項素材、英文短文案、分類及目的社群均已透過官方 API 儲存，並重新載入 Developer Settings 確認。素材變更已送審，目前 **PENDING**，不代表已出現在 Games catalog／推薦版位；遊戲本身的 0.47.1 公開核准不等於素材核准。

## 已儲存欄位

| 欄位 | 內容 |
| --- | --- |
| Promotional icon | [last-shield-icon.png](last-shield-icon.png)，512 × 512 |
| Featuring asset | [last-shield-featuring.mp4](last-shield-featuring.mp4)，1500 × 1000，12 秒，25 fps，H.264，704,924 bytes，靜音 |
| Fallback asset | [last-shield-fallback.png](last-shield-fallback.png)，1500 × 1000 |
| Tile image | [last-shield-tile.png](last-shield-tile.png)，560 × 256 |
| Featuring description | Catch gold. Hold. Defend the city. |
| Tile tagline | Hold. Time. Survive. |
| Category | Game → Arcade、Action、Daily |
| Featured subreddit | last_shield_dev（t5_kwzxmp） |
| Post sort | Hot；未加 flair 篩選 |

公開遊玩入口：[Last Shield Reddit post](https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/)。

## 素材來源與驗證

- 圖示沿用 `src/client/game-ui.ts` 的原創 SVG 盾牌，新增同色系隕石；備援／Tile 原創向量插畫使用相同城市、光盾與隕石題材。SVG 是可編輯來源，PNG 由 canonical browser 原生渲染輸出，三張均逐張肉眼檢查；沒有使用 Reddit 品牌或未授權素材。
- 影片為本輪 `https://last-shield.vercel.app/` 的英文 v0.47 真實、連續、12 秒螢幕錄製，原生按鍵長按與放開；實際完成 8 次完美擊破並在第 6 波手動 Overdrive，錄製結束第 7 波、3100 分、100% 護盾。未改遊戲時鐘／分數、未加速／剪接遊戲片段。左側為本輪原創宣傳插畫，右側為完整連續遊戲畫面。此素材不是 Reddit 原生介面錄影；原生貼文實玩證據仍見先前 Devpost 提交包。
- 以減少動態設定錄製；宣傳匯出為靜音。FFprobe 驗證 3:2、12 秒、25 fps、H.264、低於 3 MB；已檢查中間影格的實際畫面。
- Reddit 轉碼後的 HLS master 回傳 HTTP 200；portal 可讀影片 metadata（1080 × 720、12 秒，無 media error），與原始 3:2 比例一致，播放預覽已檢查後暫停。
- 圖片均低於 800 KB；上傳後三個公開圖片網址均 HTTP 200、image/png；重新載入 portal 可見三張圖片正確尺寸與載入狀態。
- 官方 GetAllCategories 讀回 GAME=1、ARCADE=4、ACTION=23、DAILY=57；SaveChanges／GetDisplay 完整回傳上述分類與社群、文字及四項 media id，未清除 Directory listing／政策設定。
- 素材 request `62c5467b-2a88-48f4-91d4-6eac5ecd6008`，SubmitForReview 後狀態 PENDING=4。詳細 checksum、asset id 與錄製操作時間點見 [manifest.json](manifest.json)，不含憑證。
- 本輪沒有修改遊戲程式或資料契約，維持 v0.47／package 0.47.1；素材與文件存於 docs，不觸發新的遊戲建置／發布。

## 官方規格

- https://developers.reddit.com/docs/guides/launch/in-app-assets
- 當前 portal 的影片欄位要求 MP4、3:2、寬 1000–1500 px、6–15 秒、最多 30 fps、最多 3 MB；本輪依實際編輯器要求完成。
