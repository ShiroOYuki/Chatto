import type { AppState } from '../../../../shared/ipc';
import { channelTone, StatusDot, Tile } from '../../components/kit';
import { RollingNumber } from '../../components/motion';
import { useMessages } from '../../i18n';
import { TeaCup, type TeaCupMood } from '../../components/TeaCup';
import { BorderBeam } from '../../components/ui/border-beam';

function moodFor(state: AppState, rate: number): TeaCupMood {
  if (state.channel.state === 'error') return 'worried';
  if (state.channel.state !== 'connected') return 'sleepy';
  return rate >= 30 ? 'busy' : 'happy';
}

export function HeroTile({ state, rate }: { state: AppState; rate: number }) {
  const m = useMessages().compact;
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
          {m.channelState[state.channel.state]}
          {state.channel.login ? <span className="opacity-70">· {state.channel.login}</span> : null}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <RollingNumber value={rate} className="font-mono text-5xl font-semibold" />
          <span className="text-sm opacity-80">{m.perMinute}</span>
        </div>
      </div>
    </Tile>
  );
}
