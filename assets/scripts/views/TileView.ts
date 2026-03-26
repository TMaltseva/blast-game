import { ParticlePool } from "../utils/ParticlePool";
const { ccclass, property } = cc._decorator;

@ccclass
export class TileView extends cc.Component {
  @property(cc.Sprite)
  sprite: cc.Sprite = null;

  @property(cc.Label)
  debugLabel: cc.Label = null;

  private tileId: number = -1;
  private colorIndex: number = 0;
  private isSuperTile: boolean = false;

  public setup(
    id: number,
    colorIndex: number,
    spriteFrames: cc.SpriteFrame[],
    isSuper = false,
    tileSize: number = 60
  ): void {
    this.tileId = id;
    this.colorIndex = colorIndex;
    this.isSuperTile = isSuper;
    this.sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    this.node.width = tileSize;
    this.node.height = tileSize;
    this.node.scaleX = 1;
    this.node.scaleY = 1;
    if (spriteFrames[colorIndex]) {
      this.sprite.spriteFrame = spriteFrames[colorIndex];
    }
  }

  public setupWithSprite(
    id: number,
    colorIndex: number,
    spriteFrame: cc.SpriteFrame,
    isSuper: boolean,
    tileSize: number = 60
  ): void {
    this.tileId = id;
    this.colorIndex = colorIndex;
    this.isSuperTile = isSuper;
    this.sprite.spriteFrame = spriteFrame;
    this.sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;

    const orig = spriteFrame.getOriginalSize();
    const ratio = Math.min(tileSize / orig.width, tileSize / orig.height);
    this.node.width = orig.width * ratio;
    this.node.height = orig.height * ratio;
    this.node.scaleX = 1;
    this.node.scaleY = 1;
  }

  public getColorIndex(): number {
    return this.colorIndex;
  }

  public getId(): number {
    return this.tileId;
  }

  public isSuper(): boolean {
    return this.isSuperTile;
  }

  public playSpawn(toRow: number, tileSize: number): Promise<void> {
    return new Promise((resolve) => {
      const endY = this.node.y;
      const startY = endY + tileSize * (toRow + 2);

      cc.Tween.stopAllByTarget(this.node);
      this.node.y = startY;
      this.node.opacity = 0;

      cc.tween(this.node).to(0.1, { opacity: 255 }).start();

      cc.tween(this.node)
        .to(0.3, { y: endY }, { easing: "quadIn" })
        .call(resolve)
        .start();
    });
  }

  public playBurn(colorIndex: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.node.active || !cc.isValid(this.node)) {
        resolve();
        return;
      }

      const worldPos = this.node.parent.convertToWorldSpaceAR(
        cc.v2(this.node.x, this.node.y)
      );
      ParticlePool.playBurst(this.node.parent, worldPos, colorIndex);

      cc.tween(this.node)
        .to(0.1, { scaleX: 1.2, scaleY: 1.2 })
        .to(0.15, { scaleX: 0, scaleY: 0, opacity: 0 })
        .call(() => {
          this.node.active = false;
          resolve();
        })
        .start();
    });
  }

  public playFall(toY: number, tileSize: number = 60): Promise<void> {
    return new Promise((resolve) => {
      cc.Tween.stopAllByTarget(this.node);

      const actualFromY = this.node.y;
      const distance = Math.abs(actualFromY - toY);

      if (distance < 1) {
        resolve();
        return;
      }

      const fallTiles = distance / tileSize;
      const intensity = Math.min(fallTiles / 4, 1.0);

      const squashX = 1 + 0.35 * intensity;
      const squashY = 1 - 0.35 * intensity;
      const stretchY = 1 + 0.18 * intensity;

      cc.tween(this.node)
        .to(0.25, { y: toY }, { easing: "sineIn" })
        .to(0.05, { scaleX: squashX, scaleY: squashY })
        .to(0.06, { scaleX: 0.95, scaleY: stretchY })
        .to(0.05, { scaleX: 1.0, scaleY: 1.0 })
        .call(resolve)
        .start();
    });
  }

  public playSuper(): void {
    cc.Tween.stopAllByTarget(this.node);
    cc.tween(this.node)
      .repeatForever(
        cc
          .tween()
          .to(0.5, { scaleX: 1.1, scaleY: 1.1 })
          .to(0.5, { scaleX: 1.0, scaleY: 1.0 })
      )
      .start();
  }

  public playInvalidTap(): void {
    if (!cc.isValid(this.node) || !this.node.active) {
      return;
    }
    cc.Tween.stopAllByTarget(this.node);

    const x = this.node.x;
    const a = 10;
    const dur = 0.06;

    cc.tween(this.node)
      .to(dur, { x: x - a })
      .to(dur, { x: x + a })
      .to(dur, { x: x - a })
      .to(dur, { x: x + a })
      .to(dur, { x: x })
      .start();
  }

  public reset(): void {
    cc.Tween.stopAllByTarget(this.node);
    this.node.active = true;
    this.node.opacity = 255;
    this.tileId = -1;
    this.isSuperTile = false;
  }
}
