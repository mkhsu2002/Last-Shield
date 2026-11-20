import pkg from '../../package.json' with { type: 'json' };
const { version } = pkg;

// Display major.minor; package patch and private-build numbers stay out of the UI.
export const GAME_VERSION = `v${version.split('.').slice(0, 2).join('.')}`;
