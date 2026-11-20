# 社群分享預覽圖

查核日期：2026-11-19（America/Vancouver）。本輪為 v0.52 候選新增；不是正式貼文分享設定已生效的證明。

## 平台限制與範圍

- [Reddit 官方 Custom Post Styles 文件](https://developers.reddit.com/docs/capabilities/creating_custom_post) 明載 `shareImageUrl` 是站外 Open Graph 分享預覽，必須為 `i.redd.it` 圖片，而且只適用公開 subreddit。
- `r/last_shield_stage` 為私人測試社群：將它的網址貼到站外，不能期待爬蟲取得自訂遊戲縮圖，也不應為了 OG 把私人社群公開。對外宣傳沿用[原正式公開遊戲貼文](https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/)。
- 既有 `submitCustomPost()` 原本只傳 title，沒有專屬分享圖設定。本輪新增 setter 與新帖預設值；不可把 WebView HTML 的 og:image 當成 Reddit 外層貼文 OG 已完成。

## 圖片與實作

- 新增 `public/share/last-shield-og-v052.png`，1734×907，約2.4MB。參考已核准的城市原畫製作新宣傳圖；不覆寫遊戲內原畫／音效。圖含 Last Shield 大標、藍白護盾與流星、Neo Babylon 城景及 Play on Reddit。
- 圖為宣傳插畫，不含虛構分數、排名、獎項或假遊戲畫面。文案／圖片已肉眼檢查。
- `ShareCardService` 將固定公開資產 URL 交給官方 `media.upload()`，只接受 HTTPS `i.redd.it` 結果並在 installation Redis 快取。圖片來源採不可變 Git commit URL；啟用前必須匿名抓回 HTTP200/image/png，避免把私庫或未push的URL交給Reddit。
- 新版加 `permissions.media=true`。新遊戲貼文建立時帶入 shareImageUrl；現有貼文以 moderator post menu「Update Last Shield share image」更新同一貼文。更新只傳 shareImageUrl，保留原背景與高度，並讀回確認。
- menu endpoint 只用平台 `context.postId`，拒絕跨社群與未登錄的非本App貼文，讀回現用帳號並檢查該社群 posts/all moderator 權限；不接受 client 自填圖片URL或目標postId。
- 獨立網站另有 OG/Twitter大圖標記，指向同輪部署的 `/share/last-shield-og-v052.png`。不改遊戲／證書分享的原貼文連結，不將測試成績轉去正式證書查驗。

## 驗證與未完成事項

- 本輪完整套件已upload並安裝 **0.52.0.2／PRIVATE** 至既有stage；官方API讀回正式仍 **0.50.0／PUBLIC**。候選CDN分享圖HTTP200/image/png、SHA-256與本機一致，見 [candidate readback](qa/v0.52/share-candidate-readback.json)。既有貼文styles與外部unfurl仍標記未驗證。

- ShareCardService 5項測試：同圖不重複上傳／不重設其他style、不可信URL拒絕、不一致readback不得回報成功、無關貼文不得觸發upload或寫入、建立成功後registry失敗仍回原貼文連結並有限重試，不誘導重建。完整114項測試、型別check、兩套build通過。
- 固定圖片來源已push；匿名抓回HTTP200/image/png，2,461,965bytes，SHA-256與本機一致，見 [source readback](qa/v0.52/share-source-readback.json)。
- 待候選部署後，從現有貼文執行menu action，確認上傳所得 `i.redd.it` 可公開讀取、`getPostStyles()`的shareImageUrl一致；私人stage本身不當作對外OG驗證。
- 正式完整發布後，在原公開貼文套用並讀回styles與匿名OG HTML／預覽；外部平台可能保留先前分享快取，不能承諾所有服務立即刷新。
- canonical個人瀏覽器目前仍有先前beforeunload阻塞，故未宣稱這輪已完成既有正式貼文setter、匿名OG讀回或社群快取刷新。
