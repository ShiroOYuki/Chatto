import { defineMessages } from '../define';

/** The outputs page: desktop overlay, OBS browser source and the alert overlay. */
export default defineMessages({
  'zh-TW': {
    title: '輸出',
    description: '同一份聊天內容，同時送到桌面 Overlay 和 OBS，兩邊可以用不同主題',
    theme: '主題',
    desktopOverlay: '桌面 Overlay',
    overlayIntro:
      '給自己看的透明聊天室，浮在所有視窗上方，滑鼠可以直接穿過。OBS 若使用「顯示器擷取」會一起錄到，建議改用遊戲或視窗擷取。',
    positionAndSize: '位置與大小',
    finishAdjusting: '完成調整',
    adjust: '調整',
    resetPosition: '移回右下角',
    adjustingHint: '直接拖曳 Overlay 移動位置、拖曳邊緣調整大小，完成後按「完成調整」',
    borderlessHint: '遊戲請使用「無邊框視窗」模式；獨佔全螢幕會蓋過所有置頂視窗',
    obsSource: 'OBS 瀏覽器來源',
    autoTransparent: '背景自動透明',
    obsIntro: '把聊天室放進直播畫面，觀眾會看到這個版本',
    sourceUrl: '來源網址',
    obsSteps: [
      '在 OBS 的來源新增「瀏覽器」',
      '貼上上面的網址，建議寬 420、高 600',
      '勾選「場景啟用時重新整理瀏覽器」更穩定',
    ],
    alertsOverlay: '事件 Overlay',
    alertsIntro: '訂閱、小奇點、揪團等事件在桌面右上角跳出卡片，只有你看得到',
    resetAlertsPosition: '移回右上角',
    alertsAdjustingHint: '直接拖曳事件 Overlay 移動位置、拖曳邊緣調整大小，完成後按「完成調整」',
    alertRules: '提醒規則',
  },
  en: {
    title: 'Outputs',
    description: 'The same chat goes to the desktop overlay and OBS at once, and each can use its own theme',
    theme: 'Theme',
    desktopOverlay: 'Desktop overlay',
    overlayIntro:
      'A transparent chat just for you. It floats above every window and lets the mouse click through. OBS display capture records it too, so use game or window capture instead.',
    positionAndSize: 'Position and size',
    finishAdjusting: 'Finish adjusting',
    adjust: 'Adjust',
    resetPosition: 'Move back to bottom right',
    adjustingHint:
      'Drag the overlay to move it and drag its edges to resize. Click “Finish adjusting” when you’re done.',
    borderlessHint: 'Run games in borderless window mode; exclusive fullscreen covers every always-on-top window',
    obsSource: 'OBS browser source',
    autoTransparent: 'Transparent background',
    obsIntro: 'Put the chat in your stream. This is the version viewers see.',
    sourceUrl: 'Source URL',
    obsSteps: [
      'In OBS, add a “Browser” source',
      'Paste the URL above. 420 wide by 600 tall works well.',
      'Check “Refresh browser when scene becomes active” for more stability',
    ],
    alertsOverlay: 'Alert overlay',
    alertsIntro: 'Subs, bits, raids and other events pop up as cards in the top-right corner, just for you',
    resetAlertsPosition: 'Move back to top right',
    alertsAdjustingHint:
      'Drag the alert overlay to move it and drag its edges to resize. Click “Finish adjusting” when you’re done.',
    alertRules: 'Alert rules',
  },
});
