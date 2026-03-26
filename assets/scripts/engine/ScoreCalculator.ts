export class ScoreCalculator {
  private readonly BASE_POINTS = 10;
  private readonly BONUS_PER_EXTRA = 5;
  private readonly BIG_GROUP_BONUS = 50;

  private minGroupSize: number;
  private superTileThreshold: number;

  constructor(minGroupSize: number, superTileThreshold: number) {
    this.minGroupSize = minGroupSize;
    this.superTileThreshold = superTileThreshold;
  }

  public calculate(groupSize: number): number {
    const base = groupSize * this.BASE_POINTS;
    const bonus =
      Math.max(0, groupSize - this.minGroupSize) * this.BONUS_PER_EXTRA;
    const bigGroupBonus =
      groupSize >= this.superTileThreshold ? this.BIG_GROUP_BONUS : 0;

    return base + bonus + bigGroupBonus;
  }
}
