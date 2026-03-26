import { playBubblePop } from "../utils/GameUiAudio";

const { ccclass, property } = cc._decorator;

@ccclass
export class BoosterPanel extends cc.Component {
  @property(cc.Node)
  bombButton: cc.Node = null;

  @property(cc.Node)
  teleportButton: cc.Node = null;

  @property(cc.Label)
  bombCountLabel: cc.Label = null;

  @property(cc.Label)
  teleportCountLabel: cc.Label = null;

  private bombCount: number = 3;
  private teleportCount: number = 5;
  private activeBooster: "bomb" | "teleport" | null = null;
  private teleportIconPulseActive: boolean = false;
  private inputEnabled: boolean = true;

  public onBoosterStateChanged: (() => void) | null = null;

  onLoad() {
    this.bombButton.on(cc.Node.EventType.TOUCH_END, this.onBombClick, this);
    this.teleportButton.on(
      cc.Node.EventType.TOUCH_END,
      this.onTeleportClick,
      this
    );
    this.updateUI();
  }

  onDestroy() {
    this.unschedule(this.onTeleportIconPulse);
    const icon = this.getTeleportIconNode();
    if (icon) {
      cc.Tween.stopAllByTarget(icon);
      icon.angle = 0;
      icon.scaleX = 1;
      icon.scaleY = 1;
    }
  }

  private onTeleportIconPulse = (): void => {
    if (!this.teleportIconPulseActive) return;
    const icon = this.getTeleportIconNode();
    if (!icon) return;
    cc.tween(icon)
      .to(0.22, { scaleX: 1.07, scaleY: 1.07 }, { easing: "sineInOut" })
      .to(0.22, { scaleX: 1.0, scaleY: 1.0 }, { easing: "sineInOut" })
      .start();
  };

  public setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    const a = enabled ? 255 : 100;
    if (this.bombButton) this.bombButton.opacity = a;
    if (this.teleportButton) this.teleportButton.opacity = a;
  }

  private onBombClick(): void {
    if (!this.inputEnabled) return;
    playBubblePop();
    if (this.bombCount <= 0) return;
    this.activeBooster = this.activeBooster === "bomb" ? null : "bomb";
    this.updateUI();
  }

  private onTeleportClick(): void {
    if (!this.inputEnabled) return;
    playBubblePop();
    if (this.teleportCount <= 0) return;
    this.activeBooster = this.activeBooster === "teleport" ? null : "teleport";
    this.updateUI();
  }

  public spendBooster(type: "bomb" | "teleport"): void {
    if (type === "bomb") this.bombCount--;
    if (type === "teleport") this.teleportCount--;
    this.activeBooster = null;
    this.updateUI();
  }

  public getActiveBooster(): "bomb" | "teleport" | null {
    return this.activeBooster;
  }

  public deactivate(): void {
    this.activeBooster = null;
    this.updateUI();
  }

  private getTeleportIconNode(): cc.Node | null {
    if (!this.teleportButton) return null;
    const onButton = this.teleportButton.getChildByName("Icon");
    if (onButton) return onButton;
    return this.teleportButton.parent?.getChildByName("Icon") ?? null;
  }

  private stopTeleportIconPulse(): void {
    if (!this.teleportIconPulseActive) return;
    this.teleportIconPulseActive = false;
    this.unschedule(this.onTeleportIconPulse);
    const icon = this.getTeleportIconNode();
    if (!icon) return;
    cc.Tween.stopAllByTarget(icon);
    icon.angle = 0;
    icon.scaleX = 1;
    icon.scaleY = 1;
  }

  private startTeleportIconPulse(): void {
    if (this.teleportIconPulseActive) return;
    const icon = this.getTeleportIconNode();
    if (!icon) return;
    this.teleportIconPulseActive = true;
    this.schedule(
      this.onTeleportIconPulse,
      0.65,
      cc.macro.REPEAT_FOREVER,
      0.12
    );
  }

  private updateUI(): void {
    this.bombCountLabel.string = `${this.bombCount}`;
    this.teleportCountLabel.string = `${this.teleportCount}`;

    const bombBg = this.bombButton.getChildByName("BtnBg");
    const teleportBg = this.teleportButton.getChildByName("BtnBg");

    if (bombBg) {
      bombBg.color =
        this.activeBooster === "bomb"
          ? cc.color(255, 255, 100)
          : cc.color(255, 255, 255);
    }
    if (teleportBg) {
      teleportBg.color =
        this.activeBooster === "teleport"
          ? cc.color(255, 255, 100)
          : cc.color(255, 255, 255);
    }

    if (this.activeBooster === "teleport") {
      this.startTeleportIconPulse();
    } else {
      this.stopTeleportIconPulse();
    }

    this.onBoosterStateChanged?.();
  }
}
