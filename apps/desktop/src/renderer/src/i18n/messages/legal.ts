import { APP_DISCLAIMER } from '@chatto/share';
import { defineMessages } from '../define';

/**
 * The disclaimer and license dialog (settings → About). The disclaimer itself is in `@chatto/share`
 * (`legalText.ts`), shared with the website. The GPL text stays in English: only the original is legally binding.
 */
export default defineMessages({
  'zh-TW': {
    title: '免責聲明與授權',
    description: 'Chatto 以 GPL-3.0-or-later 授權釋出',
    tabs: {
      disclaimer: '免責聲明',
      license: 'GPL-3.0',
      thirdParty: '第三方授權',
    },
    disclaimer: APP_DISCLAIMER['zh-TW'],
    licenseNote: '以下為具法律效力的英文原文',
    thirdPartyNote: 'Chatto 使用的字型、音效、OBS 外掛基礎與函式庫，以及它們的授權',
  },
  en: {
    title: 'Disclaimer and licenses',
    description: 'Chatto is released under GPL-3.0-or-later',
    tabs: {
      disclaimer: 'Disclaimer',
      license: 'GPL-3.0',
      thirdParty: 'Third-party licenses',
    },
    disclaimer: APP_DISCLAIMER.en,
    licenseNote: 'The legally binding English original',
    thirdPartyNote: 'The fonts, sounds, OBS plugin base and libraries Chatto uses, and their licenses',
  },
});
