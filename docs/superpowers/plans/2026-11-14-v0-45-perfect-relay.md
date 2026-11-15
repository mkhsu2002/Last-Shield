# v0.45 實作安排

> Historical release note, 2026-11-14：v0.46 改為預設英文／可切繁中；以下保留 v0.45 發布證據，survival-6 玩法仍沿用。

依 writing-plans 的先驗證、再實作步驟執行；沿用既有工作目錄與中文視覺。

- [x] 在正式 v0.44 以真實鍵盤試玩，記錄首潮傷害與操作間隔。
- [x] 在 game-logic.test.ts 新增並觀察大型完美鎖定／三顆接力失敗；修改 game-logic.ts 的單顆定身、重型工作量與 750ms 接力。
- [x] 同步 game.ts、battlefield.ts、game-ui.ts、game.css：鎖定後進度尺，擊碎後提示放開接下一顆；保留失手補救與手動超載。
- [x] 完成 30 日期含反應間隔模擬、測試／型別／兩種建置、手機與桌面實際操作、暫停與接力邊界。
- [x] 更新 README／驗證紀錄，封存 v0.44 假設；main／tag v0.45 推送，交叉查核正式來源、資產與即時行為，再補記 docs-only 證據。
