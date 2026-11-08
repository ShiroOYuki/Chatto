import { playSound } from '@chatto/chat-ui/sounds';
import type { SoundSetting } from '@chatto/core';

/**
 * Entry of the hidden sound player window (`main/sound-player.ts`): plays one
 * reminder sound given in the query (`sound`: JSON setting, `port`: local
 * server). Only a few kilobytes, unlike loading the whole control panel.
 */
const params = new URLSearchParams(location.search);
const port = Number(params.get('port'));
const sound = JSON.parse(params.get('sound') ?? 'null') as SoundSetting | null;

if (sound) {
  // The title tells tests (and DevTools) how it went.
  playSound({ ...sound, enabled: true }, (id) => `http://localhost:${port}/sounds/${encodeURIComponent(id)}`).then(
    () => (document.title = 'played'),
    (error: unknown) => {
      document.title = 'failed';
      console.error('[chatto] sound failed', error);
    },
  );
}
