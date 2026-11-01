import type { AppState } from '../../../../shared/ipc';
import { channelTone, StatusDot, Tile } from '../../components/kit';
import { RollingNumber } from '../../components/motion';
import { TeaCup, type TeaCupMood } from '../../components/TeaCup';
import { BorderBeam } from '../../components/ui/border-beam';

const STATE_LABEL: Record<AppState['channel']['state'], string> = {
  idle: '尚未連線',
  connecting: '連線中…',
  connected: '已連上聊天室',
  reconnecting: '重新連線中…',
  error: '連線出了點問題',
  closed: '已中斷',
};

function moodFor(state: AppState, rate: number): TeaCupMood {
  if (state.channel.state === 'error') return 'worried';
  if (state.channel.state !== 'connected') return 'sleepy';
  return rate >= 30 ? 'busy' : 'happy';
}

export function HeroTile({ state, rate }: { state: AppState; rate: number }) {
  const connected = state.channel.state === 'connected';
  return (
    <Tile className="relative row-span-2 min-h-min justify-between overflow-hidden bg-matcha-strong! text-on-matcha border-transparent!">
      {connected ? <BorderBeam size={140} duration={7} borderWidth={2} colorFrom="#f4f9ee" colorTo="#c0dd97" /> : null}
      <div className="flex items-center gap-2 text-lg font-medium">
        Chatto <span className="text-sm opacity-70">チャット</span>
      </div>
      <div className="flex justify-center py-2">
        <div className="rounded-full bg-[#f4f9ee] p-3">
          <TeaCup mood={moodFor(state, rate)} size={104} />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 text-sm opacity-90">
          <StatusDot tone={channelTone(state.channel.state, connected)} />
          {STATE_LABEL[state.channel.state]}
          {state.channel.login ? <span className="opacity-70">· {state.channel.login}</span> : null}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <RollingNumber value={rate} className="font-mono text-5xl font-semibold" />
          <span className="text-sm opacity-80">則／分鐘</span>
        </div>
      </div>
    </Tile>
  );
}
