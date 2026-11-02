import type { SoundSetting } from '@chatto/core';
import { FolderOpen, Play } from 'lucide-react';
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
  return (
    <div className="flex items-center gap-3">
      <Toggle checked={value.enabled} label={label} onChange={(enabled) => onChange({ ...value, enabled })} />
      <Select
        className="w-36"
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
      <Hint label={m.preview}>
        <Button size="sm" variant="ghost" aria-label={m.previewFor(label)} onClick={() => previewSound(value, port)}>
          <Play />
        </Button>
      </Hint>
    </div>
  );
}
