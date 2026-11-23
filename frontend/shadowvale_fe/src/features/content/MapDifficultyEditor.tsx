import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { NumericControl } from '../shared/NumericControl';
import { gameCatalogApi } from './gameCatalogApi';
import {
  defaultDifficultyProfile, difficultyFields, difficultyLabels, difficultyLevels,
  readDifficulty, withDifficulty, type DifficultyLevel, type DifficultyProfile, type LayoutPreset,
} from './mapDifficulty';
import type { JsonValue } from './types';

function LayoutPreview({ preset, mapCode }: { preset: LayoutPreset; mapCode: string }) {
  return <div role="img" aria-label={'Sơ đồ cụm trang trí · ' + preset.name}
    className={'relative h-24 overflow-hidden rounded-md border ' + (mapCode === 'map01' ? 'bg-[#253a2b]' : 'bg-[#253b38]')}>
    <div aria-hidden className="absolute inset-y-0 left-[49%] w-1/6 -skew-x-12 bg-black/20" />
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,#ffffff10_1px,transparent_1px),linear-gradient(90deg,#ffffff10_1px,transparent_1px)] bg-[size:16px_16px]" />
    {preset.preview.map(([x, y], index) =>
      <span aria-hidden key={index} className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b7d693]"
        style={{ left: x + '%', top: y + '%' }} />)}
  </div>;
}

export function MapDifficultyEditor({ mapCode, layout, savedLayout, editable, onChange, onError, errors }: {
  mapCode: string; layout: JsonValue | undefined; savedLayout?: JsonValue; editable: boolean;
  onChange: (value: JsonValue) => void; onError: (key: string, message: string) => void;
  errors: Record<string, string>;
}) {
  const { data, isPending, error } = useQuery({
    queryKey: ['game-catalog'],
    queryFn: ({ signal }) => gameCatalogApi.get(signal),
    staleTime: 60_000,
  });
  const presets = data?.layoutPresets?.[mapCode];
  const difficulty = readDifficulty(layout);
  const saved = savedLayout === undefined ? null : readDifficulty(savedLayout);
  const [selected, setSelected] = useState<DifficultyLevel>(difficulty.active_level);
  const [resetCounts, setResetCounts] = useState({ easy: 0, normal: 0, hard: 0 });
  const numericFields = ['guard_damage_percent', 'guard_vision_percent'] as const;
  const edit = (level: DifficultyLevel, patch: Partial<DifficultyProfile>) =>
    onChange(withDifficulty(layout, {
      ...difficulty, levels: { ...difficulty.levels, [level]: { ...difficulty.levels[level], ...patch } },
    }));

  return <section className="space-y-5 rounded-lg border bg-muted/20 p-4 sm:p-5" aria-labelledby="map-difficulty-title">
    <h3 id="map-difficulty-title" className="font-semibold">Độ khó &amp; Bố trí</h3>
    {!presets?.length ? <p role="status" className="text-sm text-muted-foreground">
      {error ? 'Không tải được bố trí từ Unity Catalog.' : isPending ? 'Đang tải bố trí…' : 'Unity Catalog chưa có bố trí cho map này.'}
    </p> : <>
      <label className="block max-w-xs text-sm">Mức áp dụng khi publish
        <NativeSelect className="mt-1 w-full" disabled={!editable} value={difficulty.active_level}
          onChange={event => onChange(withDifficulty(layout, { ...difficulty, active_level: event.target.value as DifficultyLevel }))}>
          {difficultyLevels.map(level => <NativeSelectOption key={level} value={level}>{difficultyLabels[level]}</NativeSelectOption>)}
        </NativeSelect>
      </label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Mức đang chỉnh">
        {difficultyLevels.map(level => <Button type="button" key={level} size="sm"
          variant={selected === level ? 'default' : 'outline'} aria-pressed={selected === level}
          onClick={() => setSelected(level)}>{difficultyLabels[level]}</Button>)}
      </div>
      {difficultyLevels.map(level => {
        const profile = difficulty.levels[level];
        return <fieldset key={level} hidden={selected !== level}>
          <legend className="mb-3 text-sm font-medium">Đang chỉnh mức {difficultyLabels[level]}</legend>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            {numericFields.map(field => <NumericControl key={field + ':' + resetCounts[level]}
              label={difficultyFields[field]} value={profile[field]} savedValue={editable ? saved?.levels[level][field] ?? null : undefined} unit="%" disabled={!editable}
              min={50} max={150} sliderMin={50} sliderMax={150} step={1}
              serverError={errors[level + '.' + field]}
              onError={message => onError(difficultyLabels[level] + ' · ' + difficultyFields[field], message)}
              onChange={value => { if (value !== null) edit(level, { [field]: value }); }} />)}
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Sơ đồ các cụm trang trí có thể thay đổi</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="group" aria-label="Bố trí">
            {presets.map(preset => <button type="button" key={preset.id}
              className="grid content-start gap-2 rounded-lg border bg-background p-2 text-left aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary disabled:cursor-default"
              disabled={!editable} aria-pressed={profile.layout_preset_id === preset.id}
              onClick={() => edit(level, { layout_preset_id: preset.id })}>
              <LayoutPreview preset={preset} mapCode={mapCode} />
              <strong className="text-sm">{preset.name}</strong>
              <span className="text-xs text-muted-foreground">{preset.description}</span>
            </button>)}
          </div>
          {(errors[level + '.layout_preset_id'] || !presets.some(preset => preset.id === profile.layout_preset_id)) &&
            <p role="alert" className="mt-2 text-sm text-destructive">{errors[level + '.layout_preset_id'] || 'Chọn một bố trí có sẵn cho map này.'}</p>}
          {editable && <Button className="mt-4" type="button" size="sm" variant="outline" onClick={() => {
            for (const field of numericFields) onError(difficultyLabels[level] + ' · ' + difficultyFields[field], '');
            setResetCounts(value => ({ ...value, [level]: value[level] + 1 }));
            edit(level, defaultDifficultyProfile);
          }}>Khôi phục mặc định mức {difficultyLabels[level]}</Button>}
        </fieldset>;
      })}
    </>}
  </section>;
}
