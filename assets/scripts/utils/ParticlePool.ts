const TILE_COLORS = [
  cc.color(100, 160, 255),
  cc.color(100, 220, 100),
  cc.color(255, 100, 180),
  cc.color(255, 80, 80),
  cc.color(255, 200, 50),
];

const SMOKE_RES = "particles/particle-smoke";

let smokeSpriteFrame: cc.SpriteFrame | null = null;
let smokeLoadDone = false;
const smokeLoadWaiters: Array<(sf: cc.SpriteFrame | null) => void> = [];

function requestSmokeSpriteFrame(
  cb: (sf: cc.SpriteFrame | null) => void
): void {
  if (smokeLoadDone) {
    cb(smokeSpriteFrame);
    return;
  }
  smokeLoadWaiters.push(cb);
  if (smokeLoadWaiters.length > 1) return;

  cc.resources.load(
    SMOKE_RES,
    cc.SpriteFrame,
    (err, sf: cc.SpriteFrame | null) => {
      smokeLoadDone = true;
      if (!err && sf) {
        smokeSpriteFrame = sf;
      }
      const waiters = smokeLoadWaiters.splice(0, smokeLoadWaiters.length);
      for (const fn of waiters) {
        fn(smokeSpriteFrame);
      }
    }
  );
}

function setupBurstPs(ps: cc.ParticleSystem): void {
  ps.custom = true;
  ps.positionType = cc.ParticleSystem.PositionType.FREE;
  ps.emitterMode = cc.ParticleSystem.EmitterMode.GRAVITY;
}

const FX_Z_INDEX = 100;

function attachParticleNode(parent: cc.Node, node: cc.Node): void {
  parent.addChild(node, FX_Z_INDEX);
  parent.sortAllChildren();
}

export class ParticlePool {
  public static playBurst(
    parent: cc.Node,
    worldPos: cc.Vec2,
    colorIndex: number
  ): void {
    const node = new cc.Node("particle");
    const ps = node.addComponent(cc.ParticleSystem);
    setupBurstPs(ps);

    const color = TILE_COLORS[colorIndex] ?? TILE_COLORS[0];

    ps.totalParticles = 20;
    ps.duration = 0.3;
    ps.emissionRate = 200;
    ps.life = 0.4;
    ps.lifeVar = 0.1;

    ps.startSize = 12;
    ps.startSizeVar = 6;
    ps.endSize = 4;
    ps.endSizeVar = 2;

    ps.startColor = color;
    ps.startColorVar = cc.color(30, 30, 30, 0);
    ps.endColor = cc.color(color.r, color.g, color.b, 0);
    ps.endColorVar = cc.color(20, 20, 20, 0);

    ps.angle = 90;
    ps.angleVar = 180;
    ps.speed = 120;
    ps.speedVar = 60;

    ps.radialAccel = -60;
    ps.tangentialAccel = 0;

    const localPos = parent.convertToNodeSpaceAR(worldPos);
    node.setPosition(localPos);
    attachParticleNode(parent, node);

    setTimeout(() => {
      if (cc.isValid(node)) node.destroy();
    }, 800);
  }

  public static playBombBurst(parent: cc.Node, worldPos: cc.Vec2): void {
    ParticlePool.playBombFlash(parent, worldPos);
    setTimeout(() => {
      ParticlePool.playBombSmoke(parent, worldPos);
    }, 100);
  }

  private static playBombFlash(parent: cc.Node, worldPos: cc.Vec2): void {
    const node = new cc.Node("bomb-flash");
    const ps = node.addComponent(cc.ParticleSystem);
    setupBurstPs(ps);

    const c = cc.color(255, 245, 220, 255);

    ps.totalParticles = 48;
    ps.duration = 0.28;
    ps.emissionRate = 280;
    ps.life = 0.42;
    ps.lifeVar = 0.1;

    ps.startSize = 36;
    ps.startSizeVar = 14;
    ps.endSize = 12;
    ps.endSizeVar = 6;

    ps.startColor = c;
    ps.startColorVar = cc.color(25, 25, 25, 0);
    ps.endColor = cc.color(255, 200, 120, 0);
    ps.endColorVar = cc.color(30, 30, 30, 0);

    ps.angle = 90;
    ps.angleVar = 180;
    ps.speed = 200;
    ps.speedVar = 90;

    ps.radialAccel = -95;
    ps.tangentialAccel = 0;

    const localPos = parent.convertToNodeSpaceAR(worldPos);
    node.setPosition(localPos);
    attachParticleNode(parent, node);

    setTimeout(() => {
      if (cc.isValid(node)) node.destroy();
    }, 700);
  }

  public static playBombSmoke(parent: cc.Node, worldPos: cc.Vec2): void {
    requestSmokeSpriteFrame((sf) => {
      const node = new cc.Node("bomb-smoke");
      const ps = node.addComponent(cc.ParticleSystem);
      setupBurstPs(ps);
      if (sf) {
        ps.spriteFrame = sf;
      }

      ps.totalParticles = 38;
      ps.duration = 0.35;
      ps.emissionRate = 190;
      ps.life = 1.2;
      ps.lifeVar = 0.4;

      ps.startSize = 78;
      ps.startSizeVar = 28;
      ps.endSize = 155;
      ps.endSizeVar = 42;

      ps.startColor = cc.color(180, 180, 180, 200);
      ps.startColorVar = cc.color(30, 30, 30, 30);
      ps.endColor = cc.color(100, 100, 100, 0);
      ps.endColorVar = cc.color(20, 20, 20, 0);

      ps.angle = 90;
      ps.angleVar = 40;
      ps.speed = 85;
      ps.speedVar = 32;

      ps.gravity = cc.v2(0, 35);
      ps.radialAccel = 10;
      ps.tangentialAccel = 15;

      ps.startSpin = 0;
      ps.startSpinVar = 40;
      ps.endSpin = 90;
      ps.endSpinVar = 45;

      const localPos = parent.convertToNodeSpaceAR(worldPos);
      node.setPosition(localPos);
      attachParticleNode(parent, node);

      setTimeout(() => {
        if (cc.isValid(node)) node.destroy();
      }, 1800);
    });
  }
}
