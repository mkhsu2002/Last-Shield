# Devpost 草稿與提交前檢討｜2026-11-14

> 歷史快照：以下記錄送出前的草稿狀態。同日後續 MK 已親自提交成功，最新狀態為 SUBMITTED、5/5；見 [提交後確認](devpost-submission-confirmation-2026-11-14.md)。

## 外部平台狀態

查核日期：2026-11-14，America/Vancouver。僅準備並儲存草稿，agent 未操作條款核取方塊或正式提交。

- 使用 MK 本次指定的 codex-mk-personal；MK 親自登入後，可見 Devpost profile 為 mkhsu2002、參賽者 M.K. Hsu。
- 沿用既有 Untitled 草稿，未另建重複參賽作品：submission 1301583、software 1546455。
- [預覽](https://devpost.com/software/last-shield)
- [最終確認頁](https://devpost.com/submit-to/31644-reddit-s-game-of-the-day-hackathon/manage/submissions/1301583-last-shield/finalization)
- 最後讀回 DRAFT、4/5 steps done；Terms & conditions checkbox 已勾選，與初次到達頁面時的未勾選狀態不同。Agent 未操作此 checkbox，不推測狀態變更原因，未點 Submit project。瀏覽器停留 finalization。
- 未邀請隊員、未變動既有團隊；最終資格、權利聲明與條款由 MK 親自核對。

## 已儲存並重新讀回

- Project overview：Last Shield；英文 elevator pitch；1500×1000 原創封面。
- Project details：4984 字元英文 story，見 [實際文案](devpost-project-story-2026-11-14.md)。
- Built with：Devvit、TypeScript、Phaser.js、Vite、Hono、Web Audio API、HTML、CSS。Devpost 將 Phaser tag 正規化為 phaser.js。
- Try it out 五個連結依序為原生貼文、Devvit listing、公開社群、repo、根 README，完整 URL 見 [提交包](devpost-submission-2026-11-14.md)。
- 影片欄：https://www.youtube.com/watch?v=LVJTJTfkgRk 。預覽實際產生相同 ID 的 YouTube embed。
- 三張真實 Reddit 影片截圖：`demo/v0.47/reddit-post-launch.png`、`perfect-relay.png`、`overdrive-clear.png`。未重製遊戲畫面或改分。
- 重新載入 details 後，story、tags、五個 links、video 與三張 CDN 圖均存在；預覽三張不同 gallery 圖載入成功，完整英文 sections 與遊玩連結可見。
- Additional info：Reddit username `OwnDifference7782`、app listing、測試貼文均已儲存並重開讀回。
- Ported game 目前選 No，附註本次 hackathon 期間開發的新遊戲；既有 Neo Babylon 世界觀不等於既有遊戲移植。請 MK 最後核對分類。
- 選填獎項未勾選；沒有可核實的協助者提名，保留空白，未捏造社群貢獻或回饋調查成果。

## 提交前檢討

依官方四項評準 Delightful UX、Polish、Reddity、Daily Content 檢視；以下是改善方向，沒有在本輪改動玩法或宣稱已完成。

1. **社群性優先**：目前每日序列一致，但戰績留在裝置，分享需玩家複製。可補伺服器驗證的每日榜／社群共同目標，讓留言與重玩更有理由。
2. **每日內容變化**：日期 seed 改變隕石序列，仍使用同一組規則。輪替風暴修飾與每日小目標可提供更明顯的新內容。
3. **暫停與手機操作**：先前原生短視窗測試曾需捲動才能找到 Resume；可將繼續按鈕固定或縮短說明。觸控控制存在，但真實 iOS／Android 裝置的完整流程仍值得驗證，不能以桌面 viewport 代替。
4. **定位與事實一致**：本次 story 強調抓金色時機、長按完美鎖定、放開接力、手動保留 Overdrive，降低一般太空射擊遊戲印象。過熱、全站榜與社群任務尚未實作，未寫成現有功能。

原生貼文遊玩與實錄已有證據。本輪另以官方 API 讀回社群 public、2 members、SFW；Devvit 0.47.1 PUBLIC／READY；catalog assets 仍 PENDING。YouTube 匿名 oEmbed 回應成功。這些是本次快照，並非持續監控承諾。

官方來源：[比賽說明](https://redditgameofday2026.devpost.com/)、[規則](https://redditgameofday2026.devpost.com/rules)。截止為 2026-12-08 18:00 PST；保留免費無限制評審存取至 2026-12-16 18:00 PST。

## 版本與驗證界線

本輪僅外部草稿、媒體與文件變更；遊戲維持 UI v0.47／package 0.47.1，沒有新遊戲版本。未重跑 47 項遊戲測試；其通過證據屬前次遊戲發布。本輪驗證為 Devpost 儲存後重開、實際預覽與文件一致性檢查。Docs-only 不應觸發遊戲部署。
