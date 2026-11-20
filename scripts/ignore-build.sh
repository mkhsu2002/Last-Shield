#!/bin/sh
# Vercel: 0 skips the build, 1 builds. Unknown history must build.
base=${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}
if ! git rev-parse --verify "$base^{commit}" >/dev/null 2>&1; then
  exit 1
fi
if git diff --quiet "$base" HEAD -- \
  src/ public/ scripts/phaser-core.ts scripts/ignore-build.sh index.html package.json package-lock.json \
  npm-shrinkwrap.json pnpm-lock.yaml yarn.lock bun.lockb bun.lock \
  .npmrc .nvmrc ':(glob)tsconfig*.json' ':(glob)vite*.ts' \
  devvit.json vercel.json; then
  exit 0
fi
exit 1
