export const defaultLevelConfig = {
  rows: 9,
  cols: 7,
  targetScore: 1000,
  movesLimit: 30,
  minGroupSize: 2,
  superTileThreshold: 6,
  minMovesBeforeSuperAll: 10,
  boosterBombRadius: 2,
  tileColors: 5,
  tileSize: 80,
  maxShuffles: 3,
};

export type LevelConfig = typeof defaultLevelConfig;

export function getLevelConfig(custom: Partial<LevelConfig> = {}): LevelConfig {
  return { ...defaultLevelConfig, ...custom };
}
