# 本地儲存清理與恢復

2026-11-20（America/Vancouver）。使用者在 v1.06 投稿更新完成後，授權清理本地目錄並確認 GitHub 必要備份。

## 備份與保留

- `main`、全部本地分支均有對應 GitHub 遠端；沒有未提交原始碼或 stash。v1.06 tag 已存在遠端。
- [v1.06 Release](https://github.com/mkhsu2002/Last-Shield/releases/tag/v1.06) 新增原速與 3× 成片。兩檔從 GitHub 下載後，SHA-256 與原檔一致；影音不放入 Git 原始碼歷史。
- v1.0 成片的既有 Release 備份保留。原始碼、公開圖片、既有正式影音與 Git 歷史保留。
- 私人測試紀錄、音軌、腳本、其餘成片及診斷附件封存於 ignored `.codex-attachments/retained-private-records-2026-11-20.tar.gz`，不公開上傳。封存內有逐檔清單、SHA-256、重複檔對照及 GitHub 備份位置；551 個唯一檔案已逐檔從壓縮檔讀回驗證。
- 使用者提供的原始附件與最後一份本機驗收報告另保留原路徑；清理期間仍寫入的三份瀏覽器 log 也保留，避免刪除未封存的新資料。

## 已清除

- 12,743 張產生用的錄影 JPEG 影格、已備份或封存的重複附件與舊測試工作副本。
- 可重建的 `node_modules/` 與 `dist/`；停止本專案 4173 埠的本機預覽服務。
- 清理後目錄約 144 MiB（其中私人封存檔約 108 MiB），原約 2 GiB，釋放約 93%。沒有改動正式部署、資料、帳號憑證、瀏覽器設定或全域快取。

## 重新開發

僅在本專案使用 Node >=24.18.0，先用 `node -v` 確認。再執行：

```sh
npm ci
npm run qa:prepare
```

`npm ci` 使用現有 lockfile 還原依賴；`qa:prepare` 執行型別檢查、測試及 Devvit／standalone 建置。清理本身沒有改動程式或依賴，無須為文件變更重新部署。

需要查看私人封存內容時，先列出清單，再解開至獨立資料夾；不要直接覆蓋現有 checkout。封存的診斷腳本及歷史狀態不代表即時平台狀態。

```sh
tar -tzf .codex-attachments/retained-private-records-2026-11-20.tar.gz
mkdir -p /tmp/last-shield-records
tar -xzf .codex-attachments/retained-private-records-2026-11-20.tar.gz -C /tmp/last-shield-records
```

## v1.06 影片校驗

| 成片 | 長度 | SHA-256 |
| --- | --- | --- |
| [原速 MP4](https://github.com/mkhsu2002/Last-Shield/releases/download/v1.06/last-shield-v106-gameplay-1x.mp4) | 119.6 秒 | `0f4b826b2993978b0a7ec83c841b06235d9a8712be94abe90c454cd57ab6ff6f` |
| [3× MP4](https://github.com/mkhsu2002/Last-Shield/releases/download/v1.06/last-shield-v106-gameplay-3x.mp4) | 39.866667 秒 | `b49260c24af9c5af40dd18d2f2be15a8ac1d155c7d02cde63be5863fc13c875f` |
