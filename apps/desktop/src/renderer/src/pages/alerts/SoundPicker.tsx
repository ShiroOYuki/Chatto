import type { SoundSetting } from '@chatto/core';
import { FolderOpen, Play, Volume2, VolumeX } from 'lucide-react';
import { alerts, previewSound } from '../../services/alerts';
import { Button, Hint, Select, Slider, Toggle } from '../../components/kit';
import { useMessages } from '../../i18n';
import { soundFromValue, soundOptions, soundValue } from './draft';

/** On/off, which sound, volume and a preview button for one alert sound. */
export function SoundPicker({
  value,
  onChange,
  port,
  label,
}: {
  value: SoundSetting;
  onChange: (value: SoundSetting) => void;
  port: number;
  /** Accessible name, e.g. "Bits sound". */
  label: string;
}) {
  const m = useMessages().alerts.sound;
  const pickFile = () =>
    void alerts.importSound().then((imported) => imported && onChange({ ...value, sound: imported }));
  const choose = (next: string) => {
    const sound = soundFromValue(next, value.sound);
    if (sound) onChange({ ...value, sound });
    else pickFile();
  };
  const SoundIcon = value.enabled ? Volume2 : VolumeX;
  // Still adjustable while muted, but faded so it does not look like it will play.
  const muted = value.enabled ? undefined : '';
  const fade = 'transition-opacity data-muted:opacity-50';
  return (
    // Wraps in narrow tiles: the volume and preview move to a line of their own.
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="flex items-center gap-2">
        {/* Marks the switch as the sound's, so it does not read as a second "on" switch for the alert. */}
        <SoundIcon aria-hidden className={`size-4 ${value.enabled ? 'text-matcha' : 'text-ink-faint'}`} />
        <Toggle checked={value.enabled} label={label} onChange={(enabled) => onChange({ ...value, enabled })} />
      </span>
      <div data-muted={muted} className={`flex shrink-0 items-center gap-3 ${fade}`}>
        <Select
          className="w-36 shrink-0"
          value={soundValue(value.sound)}
          options={soundOptions(value.sound, m)}
          onChange={choose}
        />
        {value.sound.kind === 'file' ? (
          <Hint label={m.changeFile}>
            <Button size="sm" variant="ghost" aria-label={m.changeFileFor(label)} onClick={pickFile}>
              <FolderOpen />
            </Button>
          </Hint>
        ) : null}
      </div>
      <div data-muted={muted} className={`flex min-w-0 flex-1 basis-44 items-center gap-3 ${fade}`}>
        <div className="min-w-20 flex-1">
          <Slider
            value={Math.round(value.volume * 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(volume) => onChange({ ...value, volume: volume / 100 })}
          />
        </div>
        <Hint label={m.preview}>
          <Button size="sm" variant="ghost" aria-label={m.previewFor(label)} onClick={() => previewSound(value, port)}>
            <Play />
          </Button>
        </Hint>
      </div>
    </div>
  );
}
