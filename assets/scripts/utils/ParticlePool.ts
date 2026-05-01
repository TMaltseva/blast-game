const TILE_COLORS = [
  cc.color(100, 160, 255),
  cc.color(100, 220, 100),
  cc.color(255, 100, 180),
  cc.color(255, 80, 80),
  cc.color(255, 200, 50),
];

const SMOKE_RES = "particles/particle-smoke";
const FX_Z_INDEX = 100;

let smokeSpriteFrame: cc.SpriteFrame | null = null;
let smokeLoadDone = false;
const smokeLoadWaiters: Array<(sf: cc.SpriteFrame | null) => void> = [];

function requestSmokeSpriteFrame(
  cb: (sf: cc.SpriteFrame | null) => void,
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
    },
  );
}

// ---------------------------------------------------------------------------
// Particle effect configuration
// ---------------------------------------------------------------------------

interface BurstConfig {
  totalParticles: number;
  duration: number;
  emissionRate: number;
  life: number;
  lifeVar: number;
  startSize: number;
  startSizeVar: number;
  endSize: number;
  endSizeVar?: number;
  startColor: cc.Color;
  startColorVar?: cc.Color;
  endColor: cc.Color;
  endColorVar?: cc.Color;
  angle: number;
  angleVar: number;
  speed: number;
  speedVar: number;
  radialAccel?: number;
  tangentialAccel?: number;
  gravity?: cc.Vec2;
  startSpin?: number;
  startSpinVar?: number;
  endSpin?: number;
  endSpinVar?: number;
  destroyAfterMs: number;
}

function burstConfigForColor(colorIndex: number): BurstConfig {
  const color = TILE_COLORS[colorIndex] ?? TILE_COLORS[0];
  return {
    totalParticles: 20,
    duration: 0.3,
    emissionRate: 200,
    life: 0.4,
    lifeVar: 0.1,
    startSize: 12,
    startSizeVar: 6,
    endSize: 4,
    endSizeVar: 2,
    startColor: color,
    startColorVar: cc.color(30, 30, 30, 0),
    endColor: cc.color(color.r, color.g, color.b, 0),
    endColorVar: cc.color(20, 20, 20, 0),
    angle: 90,
    angleVar: 180,
    speed: 120,
    speedVar: 60,
    radialAccel: -60,
    tangentialAccel: 0,
    destroyAfterMs: 800,
  };
}

const BOMB_FLASH_CONFIG: BurstConfig = {
  totalParticles: 48,
  duration: 0.28,
  emissionRate: 280,
  life: 0.42,
  lifeVar: 0.1,
  startSize: 36,
  startSizeVar: 14,
  endSize: 12,
  endSizeVar: 6,
  startColor: cc.color(255, 245, 220, 255),
  startColorVar: cc.color(25, 25, 25, 0),
  endColor: cc.color(255, 200, 120, 0),
  endColorVar: cc.color(30, 30, 30, 0),
  angle: 90,
  angleVar: 180,
  speed: 200,
  speedVar: 90,
  radialAccel: -95,
  tangentialAccel: 0,
  destroyAfterMs: 700,
};

const BOMB_SMOKE_CONFIG: BurstConfig = {
  totalParticles: 38,
  duration: 0.35,
  emissionRate: 190,
  life: 1.2,
  lifeVar: 0.4,
  startSize: 78,
  startSizeVar: 28,
  endSize: 155,
  endSizeVar: 42,
  startColor: cc.color(180, 180, 180, 200),
  startColorVar: cc.color(30, 30, 30, 30),
  endColor: cc.color(100, 100, 100, 0),
  endColorVar: cc.color(20, 20, 20, 0),
  angle: 90,
  angleVar: 40,
  speed: 85,
  speedVar: 32,
  gravity: cc.v2(0, 35),
  radialAccel: 10,
  tangentialAccel: 15,
  startSpin: 0,
  startSpinVar: 40,
  endSpin: 90,
  endSpinVar: 45,
  destroyAfterMs: 1800,
};

const PETARD_BASE_CONFIG: BurstConfig = {
  totalParticles: 50,
  duration: 0.3,
  emissionRate: 300,
  life: 0.8,
  lifeVar: 0.3,
  startSize: 14,
  startSizeVar: 6,
  endSize: 3,
  startColor: cc.color(255, 230, 50),
  endColor: cc.color(255, 100, 0, 0),
  angle: 0,
  angleVar: 60,
  speed: 250,
  speedVar: 100,
  destroyAfterMs: 1200,
};

function petardConfigForDirection(direction: "row" | "col"): BurstConfig {
  return { ...PETARD_BASE_CONFIG, angle: direction === "row" ? 0 : 90 };
}

// ---------------------------------------------------------------------------
// Particle effect mechanics
// ---------------------------------------------------------------------------

function setupBurstPs(ps: cc.ParticleSystem): void {
  ps.custom = true;
  ps.positionType = cc.ParticleSystem.PositionType.FREE;
  ps.emitterMode = cc.ParticleSystem.EmitterMode.GRAVITY;
}

function attachParticleNode(parent: cc.Node, node: cc.Node): void {
  parent.addChild(node, FX_Z_INDEX);
  parent.sortAllChildren();
}

function applyConfig(ps: cc.ParticleSystem, config: BurstConfig): void {
  ps.totalParticles = config.totalParticles;
  ps.duration = config.duration;
  ps.emissionRate = config.emissionRate;
  ps.life = config.life;
  ps.lifeVar = config.lifeVar;
  ps.startSize = config.startSize;
  ps.startSizeVar = config.startSizeVar;
  ps.endSize = config.endSize;
  if (config.endSizeVar !== undefined) ps.endSizeVar = config.endSizeVar;
  ps.startColor = config.startColor;
  if (config.startColorVar !== undefined) ps.startColorVar = config.startColorVar;
  ps.endColor = config.endColor;
  if (config.endColorVar !== undefined) ps.endColorVar = config.endColorVar;
  ps.angle = config.angle;
  ps.angleVar = config.angleVar;
  ps.speed = config.speed;
  ps.speedVar = config.speedVar;
  if (config.radialAccel !== undefined) ps.radialAccel = config.radialAccel;
  if (config.tangentialAccel !== undefined) ps.tangentialAccel = config.tangentialAccel;
  if (config.gravity !== undefined) ps.gravity = config.gravity;
  if (config.startSpin !== undefined) ps.startSpin = config.startSpin;
  if (config.startSpinVar !== undefined) ps.startSpinVar = config.startSpinVar;
  if (config.endSpin !== undefined) ps.endSpin = config.endSpin;
  if (config.endSpinVar !== undefined) ps.endSpinVar = config.endSpinVar;
}

function playEffect(
  parent: cc.Node,
  worldPos: cc.Vec2,
  config: BurstConfig,
  sf?: cc.SpriteFrame | null,
): void {
  const node = new cc.Node("particle");
  const ps = node.addComponent(cc.ParticleSystem);
  setupBurstPs(ps);
  if (sf) ps.spriteFrame = sf;
  applyConfig(ps, config);
  node.setPosition(parent.convertToNodeSpaceAR(worldPos));
  attachParticleNode(parent, node);
  setTimeout(() => {
    if (cc.isValid(node)) node.destroy();
  }, config.destroyAfterMs);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class ParticlePool {
  public static preloadSharedParticleSprite(): void {
    requestSmokeSpriteFrame(() => {});
  }

  public static playBurst(
    parent: cc.Node,
    worldPos: cc.Vec2,
    colorIndex: number,
  ): void {
    playEffect(parent, worldPos, burstConfigForColor(colorIndex));
  }

  public static playBombBurst(parent: cc.Node, worldPos: cc.Vec2): void {
    playEffect(parent, worldPos, BOMB_FLASH_CONFIG);
    setTimeout(() => {
      ParticlePool.playBombSmoke(parent, worldPos);
    }, 100);
  }

  public static playLinePetardBurst(
    parent: cc.Node,
    worldPos: cc.Vec2,
    direction: "row" | "col",
  ): void {
    requestSmokeSpriteFrame((sf) => {
      playEffect(parent, worldPos, petardConfigForDirection(direction), sf);
    });
  }

  public static playBombSmoke(parent: cc.Node, worldPos: cc.Vec2): void {
    requestSmokeSpriteFrame((sf) => {
      playEffect(parent, worldPos, BOMB_SMOKE_CONFIG, sf);
    });
  }
}
