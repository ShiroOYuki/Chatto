import type { SoundSetting } from '@chatto/core';
import { Play } from 'lucide-react';
import { alerts, previewSound } from '../../services/alerts';
import { Button, Hint, Select, Slider, Toggle } from '../../components/kit';
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
  /** Accessible name, e.g. 「小奇點的提示音」. */
  label: string;
}) {
  const choose = (next: string) => {
    const sound = soundFromValue(next, value.sound);
    if (sound) return onChange({ ...value, sound });
    void alerts.importSound().then((imported) => imported && onChange({ ...value, sound: imported }));
  };
  return (
    <div className="flex items-center gap-3">
      <Toggle checked={value.enabled} label={label} onChange={(enabled) => onChange({ ...value, enabled })} />
      <Select className="w-36" value={soundValue(value.sound)} options={soundOptions(value.sound)} onChange={choose} />
      <div className="min-w-28 flex-1">
        <Slider
          value={Math.round(value.volume * 100)}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(volume) => onChange({ ...value, volume: volume / 100 })}
        />
      </div>
      <Hint label="試聽">
        <Button size="sm" variant="ghost" aria-label={`試聽${label}`} onClick={() => previewSound(value, port)}>
          <Play />
        </Button>
      </Hint>
    </div>
  );
}
