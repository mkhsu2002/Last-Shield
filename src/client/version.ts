import pkg from '../../package.json' with { type: 'json' };
const { version } = pkg;

// Trial labels can use an explicit display version without altering semantic package numbering.
export const GAME_VERSION = pkg.displayVersion ?? `v${version.split('.').slice(0, 2).join('.')}`;
