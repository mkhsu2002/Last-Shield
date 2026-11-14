import { version } from '../../package.json';

// Package minor is the two-digit gameplay release (0.41.0 → v0.41).
export const GAME_VERSION = `v${version.split('.').slice(0, 2).join('.')}`;
