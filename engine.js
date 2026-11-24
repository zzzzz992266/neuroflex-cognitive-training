export const TOTAL_TRIALS = 15;
export const LEVELS = Object.freeze([1, 2, 3, 4]);

export const MODES = Object.freeze({
  stroop: {
    id: 'stroop',
    label: '色卡冲突',
    shortLabel: '色卡',
    ability: '抑制控制 · 注意选择',
    description: '忽略文字含义，只选择字体实际颜色。',
    accent: 'pink',
  },
  goNoGo: {
    id: 'goNoGo',
    label: 'Go / No-Go',
    shortLabel: '反应抑制',
    ability: '反应抑制 · 冲动控制',
    description: '看到 Go 立即反应，看到 No-Go 保持不动。',
    accent: 'mint',
  },
  spotDifference: {
    id: 'spotDifference',
    label: '找不同',
    shortLabel: '找不同',
    ability: '视觉搜索 · 细节辨别',
    description: '观察两幅程序生成的图形，点击唯一的差异区域。',
    accent: 'violet',
  },
  sequenceMemory: {
    id: 'sequenceMemory',
    label: '短时记忆',
    shortLabel: '短时记忆',
    ability: '序列记忆 · 信息保持',
    description: '记住图形出现顺序，再按相同顺序复现。',
    accent: 'amber',
  },
  schulte: {
    id: 'schulte',
    label: '弹珠舒尔特',
    shortLabel: '舒尔特',
    ability: '视觉搜索 · 加工速度',
    description: '在每个弹珠盘中按顺序找到目标数字。',
    accent: 'blue',
  },
  mixed: {
    id: 'mixed',
    label: '综合训练',
    shortLabel: '综合',
    ability: '认知灵活性 · 综合负荷',
    description: '五种玩法混合在一局，每种各 3 题，共 15 题。',
    accent: 'rainbow',
  },
});

export const MODE_ORDER = Object.freeze([
  'stroop',
  'goNoGo',
  'spotDifference',
  'sequenceMemory',
  'schulte',
]);

export const MODE_CARDS = Object.freeze([...MODE_ORDER, 'mixed']);

export const LEVEL_CONFIG = Object.freeze({
  stroop: [
    { level: 1, timeLimit: 2000, conflictRate: 0.5 },
    { level: 2, timeLimit: 1600, conflictRate: 0.6 },
    { level: 3, timeLimit: 1300, conflictRate: 0.7 },
    { level: 4, timeLimit: 1000, conflictRate: 0.8 },
  ],
  goNoGo: [
    { level: 1, goCount: 12, noGoCount: 3, stimulusMs: 700, responseMs: 1200, gapMs: 500 },
    { level: 2, goCount: 11, noGoCount: 4, stimulusMs: 550, responseMs: 1000, gapMs: 400 },
    { level: 3, goCount: 10, noGoCount: 5, stimulusMs: 450, responseMs: 850, gapMs: 300 },
    { level: 4, goCount: 9, noGoCount: 6, stimulusMs: 350, responseMs: 700, gapMs: 250 },
  ],
  spotDifference: [
    { level: 1, timeLimit: 12000, minElements: 4, maxElements: 6, sizeScale: 1 },
    { level: 2, timeLimit: 10000, minElements: 7, maxElements: 10, sizeScale: 0.9 },
    { level: 3, timeLimit: 8000, minElements: 11, maxElements: 14, sizeScale: 0.8 },
    { level: 4, timeLimit: 6000, minElements: 15, maxElements: 18, sizeScale: 0.7 },
  ],
  sequenceMemory: [
    { level: 1, minLength: 3, maxLength: 4, stimulusMs: 700, gapMs: 250 },
    { level: 2, minLength: 4, maxLength: 5, stimulusMs: 600, gapMs: 200 },
    { level: 3, minLength: 5, maxLength: 6, stimulusMs: 500, gapMs: 150 },
    { level: 4, minLength: 6, maxLength: 7, stimulusMs: 400, gapMs: 100 },
  ],
  schulte: [
    { level: 1, gridSize: 4, timeLimit: 25000 },
    { level: 2, gridSize: 4, timeLimit: 22000 },
    { level: 3, gridSize: 5, timeLimit: 20000 },
    { level: 4, gridSize: 5, timeLimit: 17000 },
  ],
});

export const STROOP_COLORS = Object.freeze([
  { id: 'red', name: '红', hex: '#e63a67' },
  { id: 'yellow', name: '黄', hex: '#d99a00' },
  { id: 'blue', name: '蓝', hex: '#3c6df0' },
  { id: 'green', name: '绿', hex: '#0b9f75' },
]);

export const SEQUENCE_SYMBOLS = Object.freeze([
  { id: 'circle', name: '圆形', shape: 'circle', color: '#e63a67' },
  { id: 'triangle', name: '三角形', shape: 'triangle', color: '#f07b39' },
  { id: 'square', name: '方形', shape: 'square', color: '#6242f5' },
  { id: 'star', name: '星形', shape: 'star', color: '#d99a00' },
  { id: 'diamond', name: '菱形', shape: 'diamond', color: '#0b9f75' },
  { id: 'hexagon', name: '六边形', shape: 'hexagon', color: '#3c6df0' },
  { id: 'heart', name: '心形', shape: 'heart', color: '#c026d3' },
  { id: 'cross', name: '十字', shape: 'cross', color: '#1f8b9f' },
]);

export const SPOT_COLORS = Object.freeze([
  '#6242f5',
  '#e63a67',
  '#f07b39',
  '#0b9f75',
  '#3c6df0',
  '#c026d3',
  '#d99a00',
  '#1f8b9f',
]);

const SPOT_SHAPES = Object.freeze(['circle', 'triangle', 'square', 'star', 'diamond', 'hexagon']);
const DIFFERENCE_TYPES = Object.freeze(['missing', 'position', 'size', 'color', 'rotation', 'count']);

function normalizeRandom(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.999999999, Math.max(0, value));
}

function randomInt(count, rng) {
  return Math.floor(normalizeRandom(rng()) * count);
}

function pick(array, rng) {
  return array[randomInt(array.length, rng)];
}

export function shuffle(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1, rng);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function randomIntBetween(min, max, rng) {
  return min + randomInt(max - min + 1, rng);
}

function getLevelConfig(mode, level) {
  const configs = LEVEL_CONFIG[mode];
  if (!configs) throw new RangeError(`Unknown mode: ${mode}`);
  const config = configs[level - 1];
  if (!config) throw new RangeError(`Unknown level: ${level}`);
  return config;
}

function buildStroop(level, rng) {
  const config = getLevelConfig('stroop', level);
  const conflictCount = Math.round(TOTAL_TRIALS * config.conflictRate);
  const conflictFlags = shuffle(
    Array.from({ length: TOTAL_TRIALS }, (_, index) => index < conflictCount),
    rng,
  );
  const trials = [];
  let lastCorrect = null;
  let repeatCount = 0;

  for (let index = 0; index < TOTAL_TRIALS; index += 1) {
    let wordIndex = randomInt(STROOP_COLORS.length, rng);
    let inkIndex = conflictFlags[index]
      ? (wordIndex + randomIntBetween(1, STROOP_COLORS.length - 1, rng)) % STROOP_COLORS.length
      : wordIndex;

    if (lastCorrect === inkIndex && repeatCount >= 3) {
      inkIndex = (inkIndex + 1 + randomInt(STROOP_COLORS.length - 1, rng)) % STROOP_COLORS.length;
      wordIndex = conflictFlags[index] ? (inkIndex + 1) % STROOP_COLORS.length : inkIndex;
    }

    repeatCount = lastCorrect === inkIndex ? repeatCount + 1 : 1;
    lastCorrect = inkIndex;
    trials.push({
      word: STROOP_COLORS[wordIndex],
      ink: STROOP_COLORS[inkIndex],
      correct: STROOP_COLORS[inkIndex].id,
      conflict: wordIndex !== inkIndex,
    });
  }

  return { mode: 'stroop', level, config, trials };
}

function sequenceHasTripleNoGo(trials) {
  let run = 0;
  for (const trial of trials) {
    run = trial.kind === 'noGo' ? run + 1 : 0;
    if (run >= 3) return true;
  }
  return false;
}

function buildGoNoGo(level, rng) {
  const config = getLevelConfig('goNoGo', level);
  const trials = [
    { kind: 'go' },
    { kind: 'go' },
    { kind: 'go' },
  ];
  const rest = [
    ...Array.from({ length: config.goCount - 3 }, () => ({ kind: 'go' })),
    ...Array.from({ length: config.noGoCount }, () => ({ kind: 'noGo' })),
  ];

  let shuffled;
  do {
    shuffled = shuffle(rest, rng);
  } while (sequenceHasTripleNoGo(shuffled));

  trials.push(...shuffled);
  return { mode: 'goNoGo', level, config, trials };
}

function buildSpotScene(elementCount, sizeScale, rng) {
  const slots = shuffle(Array.from({ length: 24 }, (_, index) => index), rng).slice(0, elementCount);
  const elements = slots.map((slot, index) => {
    const col = slot % 6;
    const row = Math.floor(slot / 6);
    const size = randomIntBetween(36, 62, rng) * sizeScale;
    return {
      id: `el-${index}`,
      shape: pick(SPOT_SHAPES, rng),
      color: pick(SPOT_COLORS, rng),
      x: 55 + col * 98 + randomIntBetween(-12, 12, rng),
      y: 55 + row * 92 + randomIntBetween(-10, 10, rng),
      size,
      rotation: randomIntBetween(0, 3, rng) * 30,
    };
  });
  return elements;
}

function cloneElements(elements) {
  return elements.map((element) => ({ ...element }));
}

function buildSpotDifferenceTrial(level, rng) {
  const config = getLevelConfig('spotDifference', level);
  const count = randomIntBetween(config.minElements, config.maxElements, rng);
  const leftElements = buildSpotScene(count, config.sizeScale, rng);
  const rightElements = cloneElements(leftElements);
  const differenceType = pick(DIFFERENCE_TYPES, rng);
  const target = pick(rightElements, rng);
  const hotspots = [{ x: target.x, y: target.y, radius: Math.max(42, target.size * 0.8) }];

  if (differenceType === 'missing') {
    const index = rightElements.findIndex((element) => element.id === target.id);
    rightElements.splice(index, 1);
  } else if (differenceType === 'position') {
    const moved = rightElements.find((element) => element.id === target.id);
    moved.x += pick([-1, 1], rng) * randomIntBetween(22, 40, rng);
    moved.y += pick([-1, 1], rng) * randomIntBetween(16, 34, rng);
    hotspots.push({ x: moved.x, y: moved.y, radius: Math.max(42, target.size * 0.8) });
  } else if (differenceType === 'size') {
    const changed = rightElements.find((element) => element.id === target.id);
    changed.size *= pick([0.62, 0.7, 1.32, 1.42], rng);
  } else if (differenceType === 'color') {
    const changed = rightElements.find((element) => element.id === target.id);
    changed.color = pick(SPOT_COLORS.filter((color) => color !== target.color), rng);
  } else if (differenceType === 'rotation') {
    const changed = rightElements.find((element) => element.id === target.id);
    changed.rotation += pick([30, 45, 60], rng) * pick([-1, 1], rng);
  } else if (differenceType === 'count') {
    const offset = target.size * 0.62 + 8;
    const duplicate = {
      ...target,
      id: `${target.id}-copy`,
      x: target.x + offset > 548 ? target.x - offset : target.x + offset,
    };
    rightElements.push(duplicate);
    hotspots.length = 0;
    hotspots.push({ x: duplicate.x, y: duplicate.y, radius: Math.max(42, duplicate.size * 0.8) });
  }

  return {
    left: leftElements,
    right: rightElements,
    hotspot: hotspots,
    differenceType,
  };
}

function buildSpotDifference(level, rng) {
  const config = getLevelConfig('spotDifference', level);
  return {
    mode: 'spotDifference',
    level,
    config,
    trials: Array.from({ length: TOTAL_TRIALS }, () => buildSpotDifferenceTrial(level, rng)),
  };
}

function buildSequenceMemory(level, rng) {
  const config = getLevelConfig('sequenceMemory', level);
  const trials = Array.from({ length: TOTAL_TRIALS }, () => {
    const length = randomIntBetween(config.minLength, config.maxLength, rng);
    return {
      sequence: shuffle(SEQUENCE_SYMBOLS, rng).slice(0, length).map((symbol) => symbol.id),
      options: shuffle(SEQUENCE_SYMBOLS, rng).map((symbol) => symbol.id),
    };
  });
  return { mode: 'sequenceMemory', level, config, trials };
}

function schulteTargetForTrial(index) {
  if (index < 6) return 9;
  if (index < 11) return 12;
  return 16;
}

function buildSchulte(level, rng) {
  const config = getLevelConfig('schulte', level);
  const count = config.gridSize * config.gridSize;
  return {
    mode: 'schulte',
    level,
    config,
    trials: Array.from({ length: TOTAL_TRIALS }, (_, index) => ({
      numbers: shuffle(Array.from({ length: count }, (_, number) => number + 1), rng),
      target: schulteTargetForTrial(index),
    })),
  };
}

function takeMixedModeTrials(mode, level, rng) {
  const source = createSession(mode, level, rng);
  if (mode === 'schulte') {
    return shuffle([source.trials[0], source.trials[6], source.trials[11]], rng)
      .map((trial) => ({ ...trial }));
  }
  if (mode !== 'goNoGo') {
    return shuffle(source.trials, rng).slice(0, 3).map((trial) => ({ ...trial }));
  }

  const initialGo = source.trials.slice(0, 3).filter((trial) => trial.kind === 'go');
  const laterGo = source.trials.slice(3).filter((trial) => trial.kind === 'go');
  const noGo = source.trials.filter((trial) => trial.kind === 'noGo');
  return shuffle([
    pick(laterGo, rng),
    pick(noGo, rng),
    pick([...initialGo, ...laterGo], rng),
  ], rng).map((trial) => ({ ...trial }));
}

function buildMixed(level, rng) {
  const queues = {};
  for (const mode of MODE_ORDER) queues[mode] = takeMixedModeTrials(mode, level, rng);

  const cycles = [];
  let previousLast = null;
  for (let cycle = 0; cycle < 3; cycle += 1) {
    let order;
    do {
      order = shuffle(MODE_ORDER, rng);
    } while (previousLast && order[0] === previousLast);
    previousLast = order[order.length - 1];
    cycles.push(order);
  }

  return {
    mode: 'mixed',
    level,
    config: { components: [...MODE_ORDER], perMode: 3 },
    trials: cycles.flatMap((order) => order.map((mode) => ({
      mode,
      trial: queues[mode].shift(),
    }))),
  };
}

export function createSession(mode, level, rng = Math.random) {
  if (!MODES[mode]) throw new RangeError(`Unknown mode: ${mode}`);
  if (!LEVELS.includes(level)) throw new RangeError(`Unknown level: ${level}`);
  if (mode === 'stroop') return buildStroop(level, rng);
  if (mode === 'goNoGo') return buildGoNoGo(level, rng);
  if (mode === 'spotDifference') return buildSpotDifference(level, rng);
  if (mode === 'sequenceMemory') return buildSequenceMemory(level, rng);
  if (mode === 'schulte') return buildSchulte(level, rng);
  if (mode === 'mixed') return buildMixed(level, rng);
  throw new RangeError(`Unknown mode: ${mode}`);
}

export function createStats() {
  return {
    score: 0,
    combo: 0,
    bestCombo: 0,
    correct: 0,
    errors: 0,
    timeouts: 0,
    reactionTimes: [],
  };
}

export function recordCorrect(stats, { reactionTime = null, bonus = 0 } = {}) {
  stats.correct += 1;
  stats.combo += 1;
  stats.bestCombo = Math.max(stats.bestCombo, stats.combo);
  const points = 100 + Math.min(stats.combo, 10) * 15 + Math.max(0, Math.round(bonus));
  stats.score += points;
  if (Number.isFinite(reactionTime)) stats.reactionTimes.push(reactionTime);
  return points;
}

export function recordCorrectRejection(stats, { reactionTime = null } = {}) {
  stats.correct += 1;
  if (Number.isFinite(reactionTime)) stats.reactionTimes.push(reactionTime);
}

export function recordError(stats, { timeout = false, penalty = 50, reactionTime = null } = {}) {
  if (timeout) stats.timeouts += 1;
  else stats.errors += 1;
  stats.combo = 0;
  stats.score = Math.max(0, stats.score - Math.max(0, penalty));
  if (Number.isFinite(reactionTime)) stats.reactionTimes.push(reactionTime);
}

export function addPenalty(stats, penalty) {
  stats.combo = 0;
  stats.score = Math.max(0, stats.score - Math.max(0, penalty));
}

export function summarizeStats(stats, totalTrials = TOTAL_TRIALS) {
  const accuracy = totalTrials > 0 ? stats.correct / totalTrials : 0;
  const sortedReactions = [...stats.reactionTimes].sort((a, b) => a - b);
  return {
    ...stats,
    totalTrials,
    accuracy,
    medianReaction: sortedReactions.length
      ? sortedReactions[Math.floor(sortedReactions.length / 2)]
      : null,
    grade: gradeFor(accuracy),
  };
}

export function gradeFor(accuracy) {
  if (accuracy >= 0.93) return 'S';
  if (accuracy >= 0.82) return 'A';
  if (accuracy >= 0.68) return 'B';
  if (accuracy >= 0.52) return 'C';
  return 'D';
}

export function gradeSummary(grade) {
  return {
    S: { title: '神经同步', body: '速度与准确率都非常稳定，可以继续挑战同一模式。' },
    A: { title: '稳定输出', body: '整体表现稳定，继续保持当前节奏。' },
    B: { title: '正在成形', body: '基础表现可靠，进一步减少错误会更稳定。' },
    C: { title: '建立基线', body: '先保证准确率，再逐步提升速度。' },
    D: { title: '降低干扰', body: '本次负荷偏高，可以先降低 Level 再练一次。' },
  }[grade];
}
