// 全部关键坐标与尺寸（唯一来源）。单位：肘。+X 东，-Z 北，+Y 上。内院地面 y = 0。
// 经文明载的数值旁注经节；其余为推测，依据见 文档/设计.md 与 catalog.json。

export const Y = {
  inner: 0,        // 内院（上院）
  great: -6,       // 大院（殿区）
  floor: 3,        // 殿内地面（殿基高 3 肘，推测）
  p1: -14,         // 王宫台地
  p2: -24,         // 审判廊、柱廊台地
  p3: -36,         // 黎巴嫩林宫台地
};

// 殿身（净尺寸：王上6:2、6:16-17、6:20）
export const HOUSE = {
  x0: -20,          // 至圣所西墙内皮
  xDiv: 0,          // 至圣所与圣所分界（香柏木隔板）
  x1: 40,           // 圣所东墙内皮
  halfW: 10,        // 宽 20
  h: 30,            // 高 30
  debirH: 20,       // 至圣所高 20（王上6:20）
  storyH: 5,        // 旁屋每层高 5（王上6:10）
  chamberW: [5, 6, 7], // 下中上层宽（王上6:6）
  wallT: [6, 5, 4], // 殿墙每层厚（推测，参结41:5），每层退 1 肘成"墙坎"
  outerT: 5,        // 旁屋外墙厚（推测，参结41:9）
  eastT: 6,         // 圣所东墙（廊与殿之间）厚
};
// 派生：殿墙外皮、旁屋外皮
HOUSE.westOuter = HOUSE.x0 - HOUSE.wallT[0];                 // -26
HOUSE.sideOuter = HOUSE.halfW + HOUSE.wallT[0];              // 16
HOUSE.chamberOuterZ = HOUSE.sideOuter + HOUSE.chamberW[0] + HOUSE.outerT; // 26
HOUSE.chamberOuterX = HOUSE.westOuter - HOUSE.chamberW[0] - HOUSE.outerT; // -36
HOUSE.eastOuter = HOUSE.x1 + HOUSE.eastT;                    // 46

// 廊（王上6:3：长 20、阔 10；代下3:4：高 120）
export const PORCH = {
  x0: HOUSE.eastOuter,      // 46 廊内西端
  x1: HOUSE.eastOuter + 10, // 56 廊内东端
  frontT: 4,                // 廊前墙厚（推测）
  halfW: 10,
  sideT: 6,
  openHalf: 7,              // 廊前开口半宽（推测，参结40:48）
  openH: 22,                // 开口高（推测）
  innerCeil: 30,            // 廊内顶高（推测）
  heights: { a: 120, b: 30 },
};
PORCH.front = PORCH.x1 + PORCH.frontT; // 60

// 门（王上6:31、33）
export const DOORS = {
  main: { w: 5, h: 10 },    // 墙的四分之一
  debir: { w: 4, h: 8 },    // 墙的五分之一
};

// 殿基（推测）与殿前台阶
export const PODIUM = { x0: -38, x1: 70, z0: -28, z1: 28, stepRise: 0.5, stepRun: 1 };
PODIUM.stepsX1 = PODIUM.x1 + (Y.floor - Y.inner) / PODIUM.stepRise * PODIUM.stepRun; // 76

// 两根铜柱（王上7:15-22）：右 = 南 = 雅斤，左 = 北 = 波阿斯
export const PILLARS = { x: 64, z: 10.5, circ: 12, capH: 5, capD: 4, heights: { a: 18, b: 35 } };
PILLARS.r = PILLARS.circ / (2 * Math.PI);

// 铜坛（代下4:1）与坡道（推测，出20:26）
export const ALTAR = { cx: 100, cz: 0, size: 20, h: 10 };
ALTAR.ramp = { x0: ALTAR.cx - 3.5, x1: ALTAR.cx + 3.5, z0: ALTAR.cz + ALTAR.size / 2, z1: ALTAR.cz + ALTAR.size / 2 + 30 };

// 铜海（王上7:23-26），放在殿门右边就是南边（王上7:39）
export const SEA = { cx: 72, cz: 38, d: 10, h: 5, oxBack: 2.8 };

// 十个盆座（王上7:27-39）：五个在南，五个在北
export const STANDS = { xs: [6, 16, 26, 36, 46], z: 36, size: 4, h: 3, basinD: 4 };

// 铜台（代下6:13）
export const PLATFORM = { cx: 130, cz: 0, size: 5, h: 3 };

// 内院（推测：会幕院子的两倍）
export const INNER = { x0: -60, x1: 140, z0: -50, z1: 50, wallT: 2.5, wallH: 5.6, y: Y.inner };

// 院门
export const GATES = [
  { id: 'gate_east', x: INNER.x1, z: 0, side: 'e', from: Y.inner, to: Y.great },
  { id: 'gate_north', x: 120, z: INNER.z0, side: 'n', from: Y.inner, to: Y.great },
  { id: 'gate_south', x: 120, z: INNER.z1, side: 's', from: Y.inner, to: Y.great },
];
export const GATE = { open: 10, depth: 10, towerW: 7, h: 14, stepRise: 0.5, stepRun: 1 };

// 大院（推测）：殿区 + 宫室台地，外墙一圈
export const GREAT = { x0: -110, x1: 210, z0: -100, z1: 124, y: Y.great, wallT: 3, wallH: 5.6 };
export const GREAT_GATES = [
  { id: 'great_gate_east', x: GREAT.x1, z: 0, side: 'e' },
  { id: 'great_gate_north', x: 40, z: GREAT.z0, side: 'n' },
];

// 宫室台地（推测布局，尺寸照王上7章）
export const TERRACES = [
  { id: 'p1', x0: -40, x1: 180, z0: GREAT.z1, z1: 246, y: Y.p1 },
  { id: 'p2', x0: -30, x1: 170, z0: 246, z1: 344, y: Y.p2 },
  { id: 'p3', x0: -40, x1: 170, z0: 344, z1: 486, y: Y.p3 },
];
export const PALACE = {
  forest: { x0: 15, x1: 115, z0: 384, z1: 434, h: 30 },          // 100×50×30（王上7:2）
  pillars: { x0: 40, x1: 90, z0: 300, z1: 330, porch: 8, h: 18 }, // 50×30（王上7:6）
  throne: { x0: 42, x1: 88, z0: 256, z1: 290, h: 24 },            // 尺寸未载
  king: { x0: -16, x1: 50, z0: 150, z1: 226, h: 22 },
  pharaoh: { x0: 96, x1: 156, z0: 156, z1: 220, h: 18 },
};
// 殿与王宫之间的台阶（王上10:5）
export const ASCENT = { x: 120, z0: GREAT.z1 - 2, w: 14 };

// 人物与视线（米）
export const HUMAN = { eye: 1.6, man: 1.68, woman: 1.57, child: 1.15, elder: 1.62 };

export const POI = {
  overview: { pos: [700, 150, 420], target: [40, -8, 80] },
};
