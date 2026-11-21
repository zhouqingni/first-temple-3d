// 导览：平日分站讲解；献殿之日六个阶段（王上8；代下5-7）
import { state } from '../app/state.js';
import { Y } from '../core/layout.js';

const F = Y.floor;
const $ = (s) => document.querySelector(s);

export const DAILY = [
  { id: 'moriah', title: '摩利亚山', pos: [760, 300, 980], target: [60, -30, 300], text: '所罗门在耶路撒冷的摩利亚山上建殿，那里原是耶布斯人阿珥楠的禾场（代下3:1）。殿在城的最高处，南边山脊上是大卫城，东边隔着汲沦溪谷是橄榄山。“众山怎样围绕耶路撒冷”（诗125:2）。' },
  { id: 'palace', title: '所罗门的宫室', pos: [330, 110, 540], target: [70, -30, 320], text: '从大卫城往北上去，先经过所罗门的宫室：黎巴嫩林宫、柱廊、审判廊、王住的宫室和法老女儿的宫。宫室用了十三年才造成（王上7:1），殿用了七年（王上6:38）。各座宫室之间的布局是推测的。' },
  { id: 'great_court', title: '大院', pos: [272, 30, 46], target: [120, 4, 0], text: '大院围着殿和宫室，院墙是三层凿成的石头加一层香柏木（王上7:12）。百姓在这里聚集；一年三次的节期，以色列的男丁都要上来朝见耶和华（申16:16）。院子的大小经文没有记载，这里是推测的。' },
  { id: 'gate_east', title: '东门', pos: [190, 14, 22], target: [138, 6, 0], text: '殿坐西朝东，正门在东边。院门的门扇用铜包裹（代下4:9）。“当称谢进入他的门，当赞美进入他的院”（诗100:4）。' },
  { id: 'altar', title: '铜坛', pos: [142, 24, 48], target: [100, 6, 0], text: '铜坛长二十肘、宽二十肘、高十肘（代下4:1），筑在廊子前面（代下8:12）。这里原是阿珥楠的禾场，大卫曾在这里筑坛献祭，瘟疫就止住了（撒下24:25）。坛上的火要常常烧着，不可熄灭（利6:13）。上坛不可用台阶（出20:26），所以复原中做了坡道。' },
  { id: 'sea', title: '铜海', pos: [94, 11, 62], target: [72, 4, 38], text: '铜海直径十肘、高五肘，放在殿门右边，就是南边（王上7:23、39）。它驮在十二只铜牛背上，三只向北，三只向西，三只向南，三只向东，牛尾都朝里。海边下面有两行野瓜纹。铜海是给祭司沐浴用的（代下4:6）。' },
  { id: 'stands', title: '盆座与盆', pos: [34, 9, 52], target: [24, 3, 36], text: '十个铜盆座，每座长四肘、宽四肘、高三肘，有四个铜轮，侧板上刻着狮子、牛、基路伯和棕树（王上7:27-36）。每座上安一个铜盆，献燔祭用的东西都在盆里洗（代下4:6）。五座在殿的南边，五座在北边。' },
  { id: 'jachin', title: '雅斤与波阿斯', pos: [102, 14, 28], target: [64, 15, 0], text: '两根铜柱立在殿廊前头，右边（南）的叫雅斤，左边（北）的叫波阿斯（王上7:21）。柱高十八肘，围十二肘，是空心的，壁厚四指（耶52:21）。柱顶高五肘，上面有网子、七条链索、两行共二百个石榴和百合花（王上7:16-22）。' },
  { id: 'porch', title: '殿前的廊子', pos: [124, 44, 56], target: [52, 40, 0], text: '廊子长二十肘、进深十肘。历代志下说廊高一百二十肘，里面贴着精金（代下3:4）；列王纪没有记载廊高。这里默认按历代志的数字来做，可以在“设置”里改成与殿同高的三十肘。' },
  { id: 'hekhal', title: '圣所', pos: [37, F + 5.5, 0], target: [0, F + 4, 0], text: '走进殿门，就是长四十肘的外殿（王上6:17）。墙上全是香柏木，刻着基路伯、棕树和初开的花，都贴上金子（王上6:29、22）。两旁是十个金灯台和十张陈设饼的桌子（代下4:7-8），前方是金香坛（王上7:48）。光从高处严紧的窗棂照进来（王上6:4）。', inside: true },
  { id: 'veil', title: '幔子与金链子', pos: [9, F + 3.5, 3.2], target: [0, F + 3, 0], text: '内殿门前挂着金链子（王上6:21），门口挂着用蓝色、紫色、朱红色线和细麻织成的幔子，上面绣着基路伯（代下3:14）。幔子把圣所和至圣所隔开（出26:33）。', inside: true },
  { id: 'debir', title: '至圣所', pos: [-2.2, F + 4.3, 1.2], target: [-10, F + 3, 0], text: '内殿长、宽、高都是二十肘，四面贴着精金（王上6:20）。两个橄榄木包金的基路伯各高十肘，翅膀张开，外边的翅膀挨着两边的墙，里边的翅膀在殿中间相接（王上6:23-27）。约柜放在基路伯的翅膀底下，柜里只有两块石版（王上8:6-9）。“惟有大祭司一年一次独自进去”（来9:7）。', inside: true },
  { id: 'chambers', title: '三层旁屋', pos: [62, 34, 80], target: [10, 10, 22], text: '殿的南、北、西三面造了三层旁屋，每层高五肘，下层宽五肘，中层宽六肘，上层宽七肘（王上6:5-6、10）。殿墙每层往里收一肘，旁屋的梁木就搁在墙坎上，不插进殿墙。旁屋的门在南面正中，里面有旋螺的楼梯（王上6:8）。' },
  { id: 'upper_rooms', title: '揭开屋顶', pos: [72, 104, 84], target: [8, 6, 0], roof: false, text: '揭开屋顶，可以看清殿内的格局：东边是廊子，中间是长四十肘的外殿，西边是二十肘见方的内殿。殿高三十肘，内殿只有二十肘高，上面多出的十肘就是“楼房”（代下3:9）。' },
  { id: 'forest_house', title: '黎巴嫩林宫', pos: [22, -28, 402.5], target: [96, -22, 403], text: '黎巴嫩林宫长一百肘、宽五十肘、高三十肘，有香柏木柱三行，每行十五根（王上7:2-3）。所罗门用锤出来的金子打成二百面挡牌、三百面盾牌，都放在这宫里（王上10:16-17）。' },
  { id: 'throne', title: '象牙宝座', pos: [65, -18, 284], target: [65, -21, 262], text: '审判廊从地到顶都用香柏木遮蔽（王上7:7）。所罗门用象牙造了宝座，包上精金；宝座有六层台阶，每层左右各站着一个狮子，“在列国中没有这样做的”（王上10:18-20）。' },
  { id: 'glory', title: '献殿之日', pos: [250, 120, 170], target: [60, 0, 0], text: '所罗门献殿那天，约柜运进至圣所，云彩充满了殿，火从天降下。点“观看献殿”，按经文的次序一步一步观看（王上8章；代下5-7章）。', final: true },
];

export const DEDICATION = [
  { id: 'ark', phase: 'stand', title: '约柜进殿', pos: [236, 22, 64], target: [100, 6, 0], text: '以他念月，就是七月，以色列众人都聚集到所罗门王那里（王上8:2）。祭司将耶和华的约柜从大卫城抬上来，抬进内殿，就是至圣所，放在两个基路伯的翅膀底下（王上8:4-6）。' },
  { id: 'singers', phase: 'praise', title: '吹号歌唱', pos: [134, 6.5, 27], target: [113, 3.5, 0], text: '歌唱的利未人都穿着细麻布衣服，站在坛的东边，敲钹、鼓瑟、弹琴，同着他们有一百二十个祭司吹号。他们一齐发声，赞美耶和华说：“耶和华本为善，他的慈爱永远长存！”（代下5:12-13）' },
  { id: 'glory', phase: 'cloud', title: '云彩充满殿', pos: [108, 16, 34], target: [50, 12, 0], text: '祭司从圣所出来的时候，有云充满耶和华的殿，甚至祭司不能站立供职，因为耶和华的荣光充满了殿（王上8:10-11）。' },
  { id: 'solomon', phase: 'pray', title: '所罗门祷告', pos: [142, 6.5, 9], target: [130, 4, 0], text: '所罗门站在铜台上，当着以色列会众跪下，向天举手（代下6:13），祷告说：“天和天上的天尚且不足你居住的，何况我所建的这殿呢？”（王上8:27）' },
  { id: 'altar_fire', phase: 'fire', title: '火从天降', pos: [176, 42, 74], target: [100, 16, 0], text: '所罗门祈祷已毕，就有火从天上降下来，烧尽燔祭和别的祭；耶和华的荣光充满了殿（代下7:1）。' },
  { id: 'pavement', phase: 'prostrate', title: '众民俯伏', pos: [236, 74, 124], target: [130, -4, 0], text: '以色列众人看见火降下、荣光在殿上，就在铺石地上俯伏叩拜，称谢耶和华说：“耶和华本为善，他的慈爱永远长存！”（代下7:3）', final: true },
];

const inside = (p) => p[0] > -20 && p[0] < 60 && Math.abs(p[2]) < 10 && p[1] < F + 28;

export class Tour {
  constructor(controls, ui, people, fx) {
    Object.assign(this, { controls, ui, people, fx });
    this.active = false; this.i = 0; this.auto = false; this.list = DAILY;
    $('#tour-next').addEventListener('click', () => this.next());
    $('#tour-prev').addEventListener('click', () => this.go(this.i - 1));
    $('#tour-play').addEventListener('click', () => { this.auto = !this.auto; this.syncPlay(); if (this.auto) this.armAuto(); });
    $('#tour-more').addEventListener('click', () => this.ui.open(this.list[this.i].id));
  }

  start(list = DAILY, i = 0) {
    this.active = true; this.list = list;
    if (list === DEDICATION && state.get('scene') !== 'dedication') state.set('scene', 'dedication');
    if (list === DAILY && state.get('scene') !== 'daily') state.set('scene', 'daily');
    this.ui.syncSettings();
    this.go(i);
  }

  stop() { this.active = false; this.auto = false; this.flying = false; this.controls.fly = null; this.syncPlay(); clearTimeout(this.timer); try { speechSynthesis.cancel(); } catch { /* 无语音 */ } if (this.controls.mode === 'tour') this.controls.setMode('orbit', { force: true }); this.ui.syncMode(); }

  pauseAuto() { if (this.auto) { this.auto = false; this.syncPlay(); clearTimeout(this.timer); } }
  syncPlay() { $('#tour-play').setAttribute('aria-pressed', String(this.auto)); $('#tour-play').textContent = this.auto ? '暂停' : '自动播放'; }

  next() {
    const s = this.list[this.i];
    if (s.final && this.list === DAILY) { this.start(DEDICATION, 0); return; }
    if (s.final && this.list === DEDICATION) { this.start(DAILY, 0); return; }
    this.go(this.i + 1);
  }

  go(i) {
    const L = this.list;
    this.i = Math.max(0, Math.min(L.length - 1, i));
    const s = L[this.i];
    $('#tour-step').textContent = `${L === DEDICATION ? '献殿 ' : ''}${this.i + 1} / ${L.length}`;
    $('#tour-title').textContent = s.title;
    $('#tour-text').textContent = s.text;
    $('#tour-prev').disabled = this.i === 0;
    $('#tour-next').textContent = s.final ? (L === DAILY ? '观看献殿 ›' : '回到平日 ›') : '下一站 ›';
    state.set('roof', s.roof ?? true); state.set('doors', true); this.ui.syncToggles();
    if (s.phase) { this.people.setPhase(s.phase); this.fx.setPhase(s.phase); }
    // 进出殿内时经过殿门，不穿墙
    const from = this.controls.camera.position.toArray();
    const legs = [];
    const door = [72, F + 6, 0], doorIn = [42, F + 5, 0];
    if (inside(s.pos) && !inside(from)) legs.push({ pos: door, target: [0, F + 5, 0] }, { pos: doorIn, target: [0, F + 5, 0], arc: false });
    if (!inside(s.pos) && inside(from)) legs.push({ pos: doorIn, target: [80, F + 6, 0], arc: false }, { pos: door, target: [120, F + 8, 0], arc: false });
    legs.push({ pos: s.pos, target: s.target, arc: !(inside(s.pos) && inside(from)) && !inside(s.pos) });
    this.flying = true;
    const run = (k) => {
      const leg = legs[k];
      this.controls.flyTo({ pos: leg.pos, target: leg.target, then: 'tour', duration: k < legs.length - 1 ? 1.5 : 2.8, arc: leg.arc !== false, interruptible: false, onDone: () => { if (k + 1 < legs.length) run(k + 1); else { this.flying = false; this.arrived(); } } });
    };
    run(0);
    this.ui.syncMode();
    clearTimeout(this.timer);
  }

  arrived() {
    const s = this.list[this.i];
    if (state.get('speech')) {
      const u = this.ui.speak(`${s.title}。${s.text}`);
      if (u && this.auto) u.onend = () => this.armAuto(1500);
      else if (this.auto) this.armAuto();
    } else if (this.auto) this.armAuto();
  }

  armAuto(delay) {
    clearTimeout(this.timer);
    const s = this.list[this.i];
    const ms = delay ?? Math.max(9000, s.text.length * 190);
    this.timer = setTimeout(() => { if (this.active && this.auto && !this.flying) { if (s.final) { this.auto = false; this.syncPlay(); } else this.next(); } }, ms);
  }

  update() {}
}
