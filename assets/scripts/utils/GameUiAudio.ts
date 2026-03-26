import { GameScreen } from "../screens/GameScreen";

export function playBubblePop(): void {
  const scene = cc.director.getScene();
  if (!scene) return;
  const canvas = scene.getChildByName("Canvas");
  if (!canvas) return;
  const gameScreenNode = canvas.getChildByName("GameScreen");
  if (!gameScreenNode) return;
  const gameScreen = gameScreenNode.getComponent(GameScreen);
  gameScreen?.playBubblePop();
}
