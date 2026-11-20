# v1.01 Adaptive Sky Implementation Plan

**Goal:** Local-only adaptive portrait battlefield and deeper meteor approach with unchanged deterministic gameplay.
**Architecture:** Pure display projection shared by sprite, beam, effect and pointer layers; native responsive CSS and desktop side controls.
**Tech Stack:** Existing Phaser, TypeScript, Vite.

- [x] Add display projection tests for all sectors, spawn visibility, contact clearance and melting radii; verify failing before implementation.
- [x] Implement projection and integrate rendering, input and event geometry. Preserve shared/server code.
- [x] Add adaptive stylesheet, local classic comparison and v1.01 metadata.
- [x] Check types, full tests and both builds under project Node24.22.3.
- [x] Run local servers and browser play at desktop/mobile/short sizes; correct overlap and alignment findings.
- [x] Record local results and trial URLs; preserve local branch without deployment.

狀態：本地完成，等待 MK 主觀試玩；不推送或發布。證據見 ../../v1-01-local-preview-2026-11-20.md。
