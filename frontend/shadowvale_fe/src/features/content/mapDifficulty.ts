import rawPresets from './map-layout-presets.json';
import type { JsonValue } from './types';

export const difficultyLevels = ['easy', 'normal', 'hard'] as const;
export type DifficultyLevel = typeof difficultyLevels[number];

export const difficultyLabels: Record<DifficultyLevel, string> = {
  easy: 'Dễ', normal: 'Thường', hard: 'Khó',
};

export const difficultyFields = {
  guard_damage_percent: 'Sát thương lính thường',
  guard_vision_percent: 'Tầm phát hiện',
  layout_preset_id: 'Bố trí',
} as const;

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  preview: number[][];
}

export interface DifficultyProfile {
  guard_damage_percent: number;
  guard_vision_percent: number;
  layout_preset_id: string;
}
export interface MapDifficulty {
  active_level: DifficultyLevel;
  levels: Record<DifficultyLevel, DifficultyProfile>;
}

export const defaultDifficultyProfile: DifficultyProfile = {
  guard_damage_percent: 100, guard_vision_percent: 100, layout_preset_id: 'original',
};

export const bundledLayoutPresets: Record<string, LayoutPreset[]> = rawPresets;

export function jsonObject(value: unknown): Record<string, JsonValue> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, JsonValue> : {};
}

export function readDifficulty(layout: unknown): MapDifficulty {
  const data = jsonObject(jsonObject(jsonObject(layout).game_rules).difficulty);
  const profiles = jsonObject(data.levels);
  function profile(level: DifficultyLevel): DifficultyProfile {
    const value = jsonObject(profiles[level]);
    return {
      guard_damage_percent: typeof value.guard_damage_percent === 'number' ? value.guard_damage_percent : 100,
      guard_vision_percent: typeof value.guard_vision_percent === 'number' ? value.guard_vision_percent : 100,
      layout_preset_id: typeof value.layout_preset_id === 'string' ? value.layout_preset_id : 'original',
    };
  }
  return {
    active_level: data.active_level === 'easy' || data.active_level === 'hard' ? data.active_level : 'normal',
    levels: { easy: profile('easy'), normal: profile('normal'), hard: profile('hard') },
  };
}

export function withDifficulty(layout: unknown, difficulty: MapDifficulty): JsonValue {
  const current = jsonObject(layout);
  return {
    ...current,
    game_rules: {
      ...jsonObject(current.game_rules),
      difficulty: {
        active_level: difficulty.active_level,
        levels: {
          easy: { ...difficulty.levels.easy },
          normal: { ...difficulty.levels.normal },
          hard: { ...difficulty.levels.hard },
        },
      },
    },
  };
}
