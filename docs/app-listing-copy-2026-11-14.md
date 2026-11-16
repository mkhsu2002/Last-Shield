> 存檔狀態（2026-11-16）：本文是 v0.47 原始 listing／政策草稿。現在遊戲簡介來源為 [presentation-copy.json](presentation-copy.json)，政策來源為 public/；最新平台同步與素材審核狀態見 [展示同步](presentation-review-2026-11-16.md)。

# App Directory 欄位與政策草稿｜2026-11-14

狀態：MK 已授權將政策頁上線並儲存 Reddit 設定。公開頁正文以 `public/terms/index.html`、`public/privacy/index.html` 為準；本文件保留原始文案供對照。兩頁已正式上線且匿名 HTTP 200、內容比對一致；官方 API 已儲存，Developer Settings 重新載入確認四個公開欄位正確、NSFW false。詳細證據見 `reddit-release-2026-11-14.md`。

## Directory listing

**Display name**

```text
Last Shield
```

**Description**（162 字元；欄位上限 200）

```text
Defend Neo Babylon with one-button timing. Hold to shatter meteors, chain perfect clears, and unleash Overdrive when the storm closes in. Play directly on Reddit.
```

**Terms and conditions**：`https://last-shield.vercel.app/terms/`（已驗證並儲存）。

**Privacy policy**：`https://last-shield.vercel.app/privacy/`（已驗證並儲存）。

**Is this app NSFW?**：保持關閉。

以下為原始政策草稿存檔；公開頁生效日期為 2026-11-14，隱私政策另補 standalone 網站必要連線資訊說明。未加入尚未實作的過熱、雲端排行榜或社群累計功能。

未來網域依 MK 指定為 `neobabylon.app`，本輪不變更 DNS、不填入尚未驗證的網域。切換時須保留既有政策網址可用或正確轉址，並同步 Reddit 設定與文件。

## Terms and Conditions — English draft

# Last Shield — Terms and Conditions

Last Shield is a free meteor-defense game maintained by Reddit user u/OwnDifference7782. These terms cover your use of Last Shield. Your use of Reddit is also subject to Reddit’s User Agreement, applicable platform policies, and the rules of the community where you play.

### Playing the game

You may play Last Shield for personal entertainment. No purchase is required, and scores do not have cash value or create an entitlement to prizes. Please follow community rules when sharing results. Do not use the app to harass others, distribute spam, disrupt the service, or bypass Reddit’s safeguards.

### Scores and availability

Daily best scores are stored on your device when storage is available. They may be lost if storage is cleared, unavailable, or changed. Last Shield currently has no global leaderboard or account-based score recovery. Gameplay and features may be updated; bugs, platform outages, or device limitations may affect a session.

### Creative work

Last Shield and the Neo Babylon setting include original creative work. Playing the game does not transfer ownership of its artwork, audio, characters, or other protected material. You may share your own gameplay screenshots, recordings, and scores, subject to applicable law and Reddit’s rules. This permission does not cover redistribution of standalone game assets.

### Your rights and contact

Nothing in these terms limits rights that cannot be limited under applicable law. For support or questions about these terms, contact u/OwnDifference7782 on Reddit: https://www.reddit.com/user/OwnDifference7782/

## Privacy Policy — English draft

# Last Shield — Privacy Policy

This policy explains how Last Shield, maintained by Reddit user u/OwnDifference7782, handles information in its current version.

### Information stored on your device

Last Shield uses browser or app storage, when available, to remember your language preference and daily best result. A saved result contains the challenge day, gameplay rules version, score, perfect clears, cleared meteors, best combo, and wave reached. The game remains playable if this storage is unavailable.

### Reddit platform information

Reddit hosts the Reddit version of Last Shield and provides the account, community, post, and technical context needed to run apps. Last Shield uses the current post identifier to include a game link when you copy a result. When a moderator chooses to create a game post, the app uses Reddit’s API to create that post. Reddit handles platform authentication; Last Shield does not ask you for your Reddit password.

### Scores and sharing

Last Shield does not upload gameplay scores to a developer-operated leaderboard or score database. Selecting the copy-results control writes result text and an available game link to your clipboard, or displays selectable text if clipboard access is unavailable. It does not automatically publish a Reddit post or comment. If you share that text yourself, the destination’s rules and privacy practices apply.

### Other services

The current app does not add advertising trackers, third-party analytics, or payment processing. Reddit may process technical information and usage data under its own Privacy Policy: https://www.reddit.com/policies/privacy-policy

### Removing information and contacting us

You can remove saved preferences and scores by clearing the relevant browser or app site storage. This does not delete Reddit posts, comments, or information held by Reddit; manage those through Reddit’s controls. For questions about Last Shield’s handling of information, contact u/OwnDifference7782: https://www.reddit.com/user/OwnDifference7782/

## 查核依據

- 文案依本機 v0.47／package 0.47.1 的 src/client/records.ts、i18n.ts、game.ts、src/server/index.ts 與 devvit.json 核對；不把本機檢查描述成政策頁已上線。
- Reddit FAQ：https://developers.reddit.com/docs/guides/faq
- Reddit Devvit Rules：https://developers.reddit.com/docs/devvit_rules
