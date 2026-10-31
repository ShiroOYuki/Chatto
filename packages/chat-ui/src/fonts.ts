/**
 * Loads every font the theme font stacks name (see `./fontStacks.ts`).
 * Imported only by pages that render chat (viewer, control panel); it pulls
 * in CSS, so keep it out of code that runs in the Electron main process.
 */
import '@fontsource/huninn';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource-variable/noto-sans-tc';
import '@fontsource-variable/noto-serif-tc';
