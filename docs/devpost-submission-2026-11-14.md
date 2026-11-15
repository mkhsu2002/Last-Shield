# Devpost 提交包｜Last Shield｜2026-11-14

狀態：英文提交資料已準備，尚未在 Devpost 建立或送出參賽表單。本輪未登入 Reddit 原生遊玩已實測通過；詳見末尾證據。以下英文區段可依實際表單欄位貼入。

## 必要連結

| 用途 | 正式連結 |
| --- | --- |
| Hackathon | https://redditgameofday2026.devpost.com/ |
| 官方規則 | https://redditgameofday2026.devpost.com/rules |
| Devvit app listing | https://developers.reddit.com/apps/last-shield |
| 公開測試 subreddit | https://www.reddit.com/r/last_shield_dev/ |
| 可直接遊玩的 Reddit 貼文 | https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/ |
| 公開原始碼 | https://github.com/mkhsu2002/Last-Shield |
| 根 README | https://github.com/mkhsu2002/Last-Shield/blob/main/README.md |
| 真實 Reddit 遊玩截圖 | https://github.com/mkhsu2002/Last-Shield/blob/main/docs/media/last-shield-v0.47-reddit-gameplay.png |
| Terms and Conditions | https://last-shield.vercel.app/terms/ |
| Privacy Policy | https://last-shield.vercel.app/privacy/ |

可選的 standalone 網頁：https://last-shield.vercel.app/ 。評審主要遊玩入口應填 Reddit 貼文，不能以 standalone 取代。

## Project name

```text
Last Shield
```

## Tagline

```text
One button. A falling sky. Catch the gold, chain perfect clears, and defend Neo Babylon in a new daily challenge on Reddit.
```

## Short description

```text
Last Shield is a one-button daily survival game played directly in a Reddit post. Time your first press, hold until the meteor shatters, and release to chain the next perfect clear. Bank Overdrive for the moment an escalating meteor storm threatens to overwhelm the city.
```

## Inspiration

We wanted a daily game that feels immediate: one city, one shield, and a falling sky. A single press-and-hold action should be easy to learn while leaving room for timing, recovery, and difficult decisions. Neo Babylon gives that compact challenge a place worth defending.

Reddit provides a natural home for a shared daily challenge. Players face the same day's meteor sequence, then bring their scores and survival strategies back to the post's comments.

## What it does

Last Shield runs inside a Reddit interactive post. Open the post, select **Start defending**, and play without visiting an external game website.

- **Press on gold, then keep holding.** A perfect start creates a 3× beam and arrests the selected meteor while you destroy it. Other meteors keep approaching.
- **Release and chain the next clear.** Each perfect clear opens a short gold relay, allowing a quick follow-up against another target.
- **Recover from a missed timing.** Gold returns every second, and damage already dealt stays. Release and retry instead of losing the target's entire progress.
- **Save your emergency move.** Three perfect clears charge Overdrive. It stays banked until you choose to clear the whole sky.
- **Survive an escalating storm.** Waves grow from single meteors to overlapping volleys of up to six. You can select a specific meteor, and partial destruction reduces impact damage.
- **Return for a new daily sequence.** A UTC-day seed gives everyone the same challenge for that day. Replay to improve your local best and compare choices with friends.
- **Learn before competing.** An interactive timing practice introduces the perfect lock. English is the default, with Traditional Chinese available from the language control.

The current release includes local best scores and manual result sharing. It does not include a shared leaderboard, community-wide score aggregation, or an overheating mechanic.

## How we built it

We built Last Shield with Devvit Web, TypeScript, Phaser, Vite, Hono, and Web Audio. A Reddit-hosted inline splash opens the expanded game through the Devvit client SDK. A moderator menu creates playable game posts through the Reddit API.

The gameplay state is separated from rendering and interface text. Daily seeded patterns, collision geometry, timing grades, beam damage, target selection, relay windows, and manually activated Overdrive are implemented in a shared rules module. The interface provides touch and keyboard controls, bilingual feedback, reduced-motion support, and recoverable local-storage and clipboard failures.

## Challenges we ran into

The hardest problem was making timing readable while several threats arrived together. Early iterations made it unclear whether to keep holding or press again. We separated the initial timing decision from the destruction phase: once a perfect beam locks, the timing bar becomes a progress bar, and the game explicitly asks the player to keep holding until the target shatters.

Multiple large meteors also needed a fair recovery path. Perfect arrest stops only the current target, while a short relay lets players release and catch the next one without waiting through another full timing cycle. We also made Overdrive a banked, manual decision so it remains an emergency tool rather than an automatic attack.

## Accomplishments we're proud of

Last Shield combines a small control vocabulary with real target-priority decisions. The game is running as a Reddit-native interactive post, supports English and Traditional Chinese, and provides a playable tutorial rather than relying only on instructions.

The current rules have 47 automated tests covering timing recovery, multi-target interactions, charge banking, collision damage, daily patterns, localization, and recoverable storage failures. We also tested the public Reddit post while logged out, completed the timing practice, and destroyed a meteor in a live run.

## What we learned

A timing mechanic needs to communicate both when to begin and when to stop. Adding more simultaneous threats creates useful pressure only when players can understand the available responses. Clear feedback, retained progress, and a deliberate release-and-press rhythm made the challenge easier to read without removing its decisions.

## What's next for Last Shield

We want to deepen the shared daily experience with community challenges, server-validated score comparisons, and rotating storm modifiers. These are future directions. We will continue balancing the core timing and survival loop with player feedback before adding more complexity.

## Built with

```text
Devvit Web, TypeScript, Phaser, Vite, Hono, Web Audio API, HTML, CSS
```

## Judge testing instructions

1. Open https://www.reddit.com/r/last_shield_dev/comments/1xwkbkk/last_shield_daily_meteor_defense/ . The subreddit is public; moderator approval is not required. Reddit may display its own security check.
2. Select **Start defending** on the inline game card. The game expands within Reddit. English is selected by default.
3. Choose **Practice perfect timing**. Wait for gold, then hold the fire button until the meteor shatters. Read the perfect-lock feedback and select **Start the challenge**.
4. On a phone, hold the fire button or a specific meteor. On a keyboard, hold **Space**. Release after each clear, then press for the next target.
5. Earn three perfect clears to charge Overdrive. Use its button or **E** when you want to clear the sky; filling the meter does not activate it automatically.
6. Use the pause control or **Esc** to pause and resume. After the shield falls, replay to improve your local daily best or copy your result to share manually.

The game is free to play and has no app purchase, invitation requirement, or usage quota. We will maintain judging access through **December 16, 2026 at 6:00 p.m. PST**.

## 提交前必須由 MK 確認的資料

- 參賽者姓名／團隊成員、所在司法管轄區、年齡與資格、所有權與授權聲明，不代填未確認的個人事實。
- 若表單詢問既有作品／參賽期間更新，依實際開發日期與既有 Neo Babylon 世界觀／素材來源填寫，不能把既有世界觀宣稱為本次新創。程式庫的本輪遊戲版本可由 Git 歷史核對。
- 可選影片目前沒有已驗證的公開影音平台 URL。既有 v0.46 本機 MP4 是 standalone 實錄，不能宣稱為本次 v0.47 Reddit 原生錄影，也不能把本機路徑填到 Devpost 影片網址欄。未上傳前可省略此可選欄位。
- 本文件是提交包，沒有宣稱 Devpost 草稿已儲存或正式參賽已完成。最終送出涉及官方規則的同意與聲明，依 MK 全域第 17 條須由 MK 在可見頁面親自確認。

## 本輪驗證與存取維持

- canonical lane：依 MK 當次明確指定使用 codex-mk-personal；可見 Reddit profile 與官方 OAuth me 均為 u/OwnDifference7782。
- 社群 ID t5_kwzxmp；唯一遊戲貼文 t3_1xwkbkk，作者 last-shield；先讀回查重，未建立重複貼文。
- 舊 `/api/site_admin` 對類型變更沒有實效；官方文件明載此操作不支援第三方 API。改走 Mod tools → General Settings → Privacy & Discovery → Community Type，提交 public 變更理由。官方 API 隨後讀回 public、2 名成員、非 NSFW。
- 外部公開讀取已看到貼文標題／作者與 Log In 選項；不是私人社群拒絕頁。
- 在同一 canonical browser 建立全新獨立未登入測試 context；遇真人驗證後停止，MK 親自完成並明確回覆後才繼續。未代解 CAPTCHA、未登入其他帳號。
- 未登入原生 splash 與 expanded game 的 host 均為 `last-shield-kwzxmp-0-47-1-webview.devvit.net`，路徑為 `/splash.html`、`/game.html`；可見 v0.47、英文預設。以原生點擊開啟 expanded game。
- 完成練習後顯示 “That’s a perfect lock.”；正式對局以原生長按擊碎隕石，得分 100、進入第 2 波、護盾 100%。暫停後以正常捲動找到繼續按鈕並恢復。截圖為真實 Reddit 畫面，未合成、未改分。
- 只有此輪建立的未登入測試 context 在結束時關閉；原本的個人 lane 頁面保留。
- Devvit 官方讀回 0.47.1 visibility PUBLIC、build READY；publish request status APPROVED。此為目前讀回狀態，非保證後續平台不再審查。
- GitHub 官方 API 匿名回傳 public repository、default branch main。
- 不設關閉日、不取消安裝、不把社群改回私人、不加入付費或評審配額，維持至上述評審截止。成員數是本輪快照，正式送件前仍應再確認少於 200；本輪沒有新增排程或假稱持續監控。

## In-app catalog

這是 Reddit Games catalog、分類瀏覽與推薦版位的宣傳素材／分類／點入目的地設定，不是遊戲內購商品。官方參賽規則未將 catalog assets 列為必要提交項目；申請官方 Featuring 則明確要求更新 catalog assets。後續 MK 已明確要求補齊：現已完成圖示、12 秒實錄 MP4、備援圖片、Tile、兩段短文案、Game／Arcade／Action／Daily 分類及 last_shield_dev 入口，已儲存並送審，素材狀態 PENDING；尚未送出獨立 Featuring 申請。詳見 [catalog 紀錄](catalog/v0.47/README.md)。

- 官方素材說明：https://developers.reddit.com/docs/guides/launch/in-app-assets
- 官方推薦條件：https://developers.reddit.com/docs/guides/launch/feature-guide
- 社群類型變更說明：https://support.reddithelp.com/hc/en-us/articles/23535789982868-Changing-your-Community-Type
