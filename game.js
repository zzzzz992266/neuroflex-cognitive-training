import {
  LEVEL_CONFIG,
  MODES,
  SEQUENCE_SYMBOLS,
  STROOP_COLORS,
  TOTAL_TRIALS,
  addPenalty,
  createSession,
  createStats,
  recordCorrect,
  recordCorrectRejection,
  recordError,
  summarizeStats,
} from './engine.js';

const STORAGE_KEY = 'neuroflex:v2';
const DEFAULT_STORE = {
  soundEnabled: true,
  lastMode: 'stroop',
  lastLevel: 2,
  best: {},
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const dom = {
  screens: $$('.screen'),
  homeScreen: $('#home-screen'),
  gameScreen: $('#game-screen'),
  resultsScreen: $('#results-screen'),
  setupForm: $('#setup-form'),
  modeCards: $$('[data-mode-card]'),
  selectedModeTitle: $('#selected-mode-title'),
  selectedModeDescription: $('#selected-mode-description'),
  bestScore: $('#best-score'),
  bestAccuracy: $('#best-accuracy'),
  levelHint: $('#level-hint'),
  soundToggle: $('#sound-toggle'),
  soundLabel: $('#sound-label'),
  howToButton: $('#how-to-button'),
  tutorialDialog: $('#tutorial-dialog'),
  sessionModeLabel: $('#session-mode-label'),
  sessionLevelLabel: $('#session-level-label'),
  liveScore: $('#live-score'),
  quitButton: $('#quit-button'),
  liveAccuracy: $('#live-accuracy'),
  accuracyMeter: $('#accuracy-meter'),
  liveCombo: $('#live-combo'),
  liveCorrect: $('#live-correct'),
  liveErrors: $('#live-errors'),
  trialCounter: $('#trial-counter'),
  modeKicker: $('#mode-kicker'),
  gameInstruction: $('#game-instruction'),
  questionCounter: $('#question-counter'),
  timerFill: $('#timer-fill'),
  modeStage: $('#mode-stage'),
  liveFeedback: $('#live-feedback'),
  countdownOverlay: $('#countdown-overlay'),
  countdownValue: $('#countdown-value'),
  countdownCaption: $('#countdown-caption'),
  resultGrade: $('#result-grade'),
  gradeOrbit: $('#grade-orbit'),
  resultScore: $('#result-score'),
  resultBest: $('#result-best'),
  resultAccuracy: $('#result-accuracy'),
  resultCorrect: $('#result-correct'),
  resultErrors: $('#result-errors'),
  resultTimeouts: $('#result-timeouts'),
  resultCombo: $('#result-combo'),
  resultReaction: $('#result-reaction'),
  recommendationTitle: $('#recommendation-title'),
  recommendationBody: $('#recommendation-body'),
  playAgainButton: $('#play-again-button'),
  homeButton: $('#home-button'),
};

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed) return structuredClone(DEFAULT_STORE);
    return {
      ...structuredClone(DEFAULT_STORE),
      ...parsed,
      best: parsed.best || {},
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

const store = readStore();

const state = {
  mode: store.lastMode in MODES ? store.lastMode : 'stroop',
  level: [1, 2, 3, 4].includes(Number(store.lastLevel)) ? Number(store.lastLevel) : 2,
  session: null,
  stats: null,
  details: null,
  trialIndex: 0,
  active: false,
  accepting: false,
  responded: false,
  timer: null,
  subTimers: new Set(),
  trialStartedAt: 0,
  sessionActive: false,
  soundEnabled: store.soundEnabled !== false,
  feedbackTimer: null,
  sequence: null,
  schulte: null,
};

class AudioEngine {
  constructor() {
    this.context = null;
    this.supported = Boolean(window.AudioContext || window.webkitAudioContext);
  }

  async unlock() {
    if (!this.supported) return;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextClass();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  tone(frequency, duration = 0.12, volume = 0.045, type = 'sine') {
    if (!state.soundEnabled || !this.supported) return;
    this.unlock();
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  correct() {
    this.tone(523.25, 0.08, 0.045);
    setTimeout(() => this.tone(659.25, 0.11, 0.04), 65);
  }

  wrong() {
    this.tone(146.83, 0.14, 0.035, 'square');
  }

  finish() {
    [392, 523.25, 659.25].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.18, 0.04), index * 90);
    });
  }
}

const audio = new AudioEngine();

function saveStore() {
  store.soundEnabled = state.soundEnabled;
  store.lastMode = state.mode;
  store.lastLevel = state.level;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Local persistence is optional; training should still work in private mode.
  }
}

function bestKey(mode = state.mode, level = state.level) {
  return `${mode}:${level}`;
}

function getBest(mode = state.mode, level = state.level) {
  return store.best[bestKey(mode, level)] || null;
}

function saveBest(summary) {
  const key = bestKey();
  const previous = store.best[key];
  if (!previous || summary.score > previous.score) {
    store.best[key] = {
      score: summary.score,
      accuracy: summary.accuracy,
      grade: summary.grade,
      sessions: (previous?.sessions || 0) + 1,
      lastPlayedAt: new Date().toISOString(),
      medianReaction: summary.medianReaction,
    };
  } else {
    store.best[key] = {
      ...previous,
      sessions: (previous.sessions || 0) + 1,
      lastPlayedAt: new Date().toISOString(),
    };
  }
  saveStore();
}

function formatScore(value) {
  return String(Math.max(0, Math.round(value || 0))).padStart(4, '0');
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—';
}

function formatReaction(value) {
  return Number.isFinite(value) ? `中位反应 ${Math.round(value)} ms` : '中位反应 —';
}

function refreshBest() {
  const best = getBest();
  dom.bestScore.textContent = best ? `${formatScore(best.score)} 分` : '还没有记录';
  dom.bestAccuracy.textContent = best
    ? `最佳正确率 ${formatPercent(best.accuracy)} · ${best.sessions} 局`
    : '完成任意一局后记录成绩';
}

function syncHomeSelection() {
  for (const card of dom.modeCards) {
    card.classList.toggle('is-selected', card.dataset.modeCard === state.mode);
  }
  const mode = MODES[state.mode];
  dom.selectedModeTitle.textContent = mode.label;
  dom.selectedModeDescription.textContent = mode.description;
  dom.levelHint.textContent = state.mode === 'mixed'
    ? `综合训练 Level ${state.level} · 五种玩法各 3 题`
    : `Level ${state.level} · 难度越高，速度和干扰越强`;
  refreshBest();
}

function setSoundEnabled(enabled) {
  state.soundEnabled = enabled;
  dom.soundToggle.setAttribute('aria-pressed', String(enabled));
  dom.soundLabel.textContent = enabled ? '声音开' : '声音静音';
  if (enabled) audio.unlock();
  saveStore();
}

function showScreen(name) {
  for (const screen of dom.screens) screen.hidden = true;
  ({ home: dom.homeScreen, game: dom.gameScreen, results: dom.resultsScreen })[name].hidden = false;
  document.body.dataset.screen = name;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function clearTimer() {
  if (state.timer !== null) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

function schedule(callback, delay) {
  clearTimer();
  state.timer = window.setTimeout(() => {
    state.timer = null;
    callback();
  }, delay);
}

function later(callback, delay) {
  const timer = window.setTimeout(() => {
    state.subTimers.delete(timer);
    callback();
  }, delay);
  state.subTimers.add(timer);
  return timer;
}

function clearSubTimers() {
  for (const timer of state.subTimers) clearTimeout(timer);
  state.subTimers.clear();
}

function clearAllTimers() {
  clearTimer();
  clearSubTimers();
  if (state.feedbackTimer) {
    clearTimeout(state.feedbackTimer);
    state.feedbackTimer = null;
  }
}

function showFeedback(message, tone = 'neutral') {
  if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
  dom.liveFeedback.textContent = message;
  dom.liveFeedback.className = `live-feedback is-visible is-${tone}`;
  state.feedbackTimer = window.setTimeout(() => {
    dom.liveFeedback.classList.remove('is-visible');
  }, 1100);
}

function updateLiveStats() {
  if (!state.stats) return;
  const summary = summarizeStats(state.stats);
  const decisions = state.stats.correct + state.stats.errors + state.stats.timeouts;
  dom.liveScore.textContent = formatScore(summary.score);
  dom.liveAccuracy.textContent = decisions ? formatPercent(state.stats.correct / decisions) : '—';
  dom.accuracyMeter.style.width = decisions
    ? `${Math.min(100, Math.max(0, (state.stats.correct / decisions) * 100))}%`
    : '0%';
  dom.liveCombo.textContent = String(summary.combo);
  dom.liveCorrect.textContent = String(summary.correct);
  dom.liveErrors.textContent = String(summary.errors + summary.timeouts);
}

function startTimerBar(duration) {
  dom.timerFill.style.transition = 'none';
  dom.timerFill.style.transform = 'scaleX(1)';
  void dom.timerFill.offsetWidth;
  dom.timerFill.style.transition = `transform ${duration}ms linear`;
  dom.timerFill.style.transform = 'scaleX(0)';
}

function resetTimerBar() {
  dom.timerFill.style.transition = 'none';
  dom.timerFill.style.transform = 'scaleX(0)';
}

function createDetails() {
  return {
    stroop: { conflictCorrect: 0, conflictTotal: 0, congruentCorrect: 0, congruentTotal: 0 },
    goNoGo: { goCorrect: 0, goTotal: 0, noGoCorrect: 0, noGoTotal: 0 },
    spot: { solved: 0, wrongClicks: 0, timeouts: 0, times: [] },
    sequence: { total: 0, correct: 0, times: [] },
    schulte: { completed: 0, timeouts: 0, wrongClicks: 0, boardTimes: [] },
  };
}

function setProgress(index) {
  const text = `${String(index + 1).padStart(2, '0')} / ${TOTAL_TRIALS}`;
  dom.trialCounter.textContent = text;
  dom.questionCounter.textContent = text;
}

function startSession() {
  clearAllTimers();
  state.session = createSession(state.mode, state.level);
  state.stats = createStats();
  state.details = createDetails();
  state.trialIndex = 0;
  state.sessionActive = true;
  state.active = false;
  state.accepting = false;
  state.responded = false;
  state.sequence = null;
  state.schulte = null;

  dom.sessionModeLabel.textContent = MODES[state.mode].label;
  dom.sessionLevelLabel.textContent = `LEVEL ${state.level}`;
  dom.liveScore.textContent = '0000';
  dom.liveAccuracy.textContent = '—';
  dom.accuracyMeter.style.width = '0%';
  dom.liveCombo.textContent = '0';
  dom.liveCorrect.textContent = '0';
  dom.liveErrors.textContent = '0';
  dom.modeStage.innerHTML = '';
  dom.liveFeedback.className = 'live-feedback';
  resetTimerBar();
  setProgress(0);
  saveStore();
  showScreen('game');
  runCountdown();
}

function runCountdown() {
  dom.countdownOverlay.hidden = false;
  const steps = ['3', '2', '1', '开始'];
  let index = 0;
  const tick = () => {
    if (!state.sessionActive) return;
    if (index >= steps.length) {
      dom.countdownOverlay.hidden = true;
      startTrial(0);
      return;
    }
    dom.countdownValue.textContent = steps[index];
    dom.countdownCaption.textContent = index === steps.length - 1
      ? '专注开始'
      : '放松肩颈，训练即将开始';
    index += 1;
    schedule(tick, index === steps.length ? 380 : 560);
  };
  tick();
}

function currentContext() {
  const entry = state.session.trials[state.trialIndex];
  if (state.session.mode === 'mixed') {
    return { mode: entry.mode, trial: entry.trial };
  }
  return { mode: state.session.mode, trial: entry };
}

function startTrial(index) {
  if (!state.sessionActive) return;
  if (index >= TOTAL_TRIALS) {
    finishSession();
    return;
  }
  state.trialIndex = index;
  state.active = true;
  state.accepting = false;
  state.responded = false;
  state.sequence = null;
  state.schulte = null;
  clearSubTimers();
  resetTimerBar();
  setProgress(index);

  const context = currentContext();
  dom.modeKicker.textContent = `${MODES[context.mode].label} · LEVEL ${state.level}`;
  dom.gameInstruction.textContent = MODES[context.mode].description;

  if (context.mode === 'stroop') startStroop(context.trial);
  else if (context.mode === 'goNoGo') startGoNoGo(context.trial);
  else if (context.mode === 'spotDifference') startSpotDifference(context.trial);
  else if (context.mode === 'sequenceMemory') startSequenceMemory(context.trial);
  else startSchulte(context.trial);
}

function finishTrial(delay = 380) {
  if (!state.sessionActive) return;
  state.active = false;
  state.accepting = false;
  clearSubTimers();
  updateLiveStats();
  resetTimerBar();
  const next = state.trialIndex + 1;
  schedule(() => {
    if (next >= TOTAL_TRIALS) finishSession();
    else startTrial(next);
  }, delay);
}

function disableButtons(container = dom.modeStage) {
  for (const button of container.querySelectorAll('button')) button.disabled = true;
}

/* Stroop */
function startStroop(trial) {
  const config = LEVEL_CONFIG.stroop[state.level - 1];
  dom.gameInstruction.textContent = '选择字体实际颜色，忽略文字含义';
  dom.modeStage.innerHTML = `
    <div class="stroop-stage">
      <div class="stroop-word" style="color:${trial.ink.hex}">${trial.word.name}</div>
      <div class="stroop-choices">
        ${STROOP_COLORS.map((color, index) => `
          <button class="color-choice" type="button" data-color="${color.id}">
            <i style="--choice-color:${color.hex}"></i>
            <strong>${color.name}</strong>
            <kbd>${index + 1}</kbd>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  state.accepting = true;
  state.trialStartedAt = performance.now();
  const group = trial.conflict ? 'conflict' : 'congruent';
  state.details.stroop[`${group}Total`] += 1;

  const answer = (colorId) => {
    if (!state.accepting) return;
    state.accepting = false;
    clearTimer();
    const reaction = performance.now() - state.trialStartedAt;
    const correct = colorId === trial.correct;
    if (correct) {
      state.details.stroop[`${group}Correct`] += 1;
      recordCorrect(state.stats, { reactionTime: reaction });
      showFeedback('正确', 'good');
      audio.correct();
    } else {
      recordError(state.stats, { reactionTime: reaction });
      showFeedback('选错颜色', 'bad');
      audio.wrong();
    }
    for (const button of dom.modeStage.querySelectorAll('.color-choice')) {
      button.disabled = true;
      if (button.dataset.color === trial.correct) button.classList.add('is-correct');
      if (button.dataset.color === colorId && !correct) button.classList.add('is-wrong');
    }
    finishTrial(420);
  };

  for (const button of dom.modeStage.querySelectorAll('.color-choice')) {
    button.addEventListener('click', () => answer(button.dataset.color));
  }

  startTimerBar(config.timeLimit);
  schedule(() => {
    if (!state.accepting) return;
    state.accepting = false;
    recordError(state.stats, { timeout: true });
    showFeedback('超时', 'bad');
    disableButtons();
    finishTrial(420);
  }, config.timeLimit);
}

/* Go / No-Go */
function startGoNoGo(trial) {
  const config = LEVEL_CONFIG.goNoGo[state.level - 1];
  const isGo = trial.kind === 'go';
  if (isGo) state.details.goNoGo.goTotal += 1;
  else state.details.goNoGo.noGoTotal += 1;
  dom.gameInstruction.textContent = 'Go 立即反应 · No-Go 保持不动';
  dom.modeStage.innerHTML = `
    <div class="gng-stage">
      <div class="gng-stimulus ${isGo ? 'is-go' : 'is-no-go'}">
        <span class="gng-symbol">${isGo ? '●' : '×'}</span>
      </div>
      <button class="go-button" type="button">GO</button>
      <p class="stage-copy">${isGo ? '看到 Go 时按空格或点击按钮' : '保持克制，不要按'}</p>
    </div>
  `;
  state.accepting = true;
  state.trialStartedAt = performance.now();
  const goButton = dom.modeStage.querySelector('.go-button');

  const respond = () => {
    if (!state.accepting || state.responded) return;
    state.responded = true;
    const reaction = performance.now() - state.trialStartedAt;
    goButton.disabled = true;
    if (isGo) {
      state.details.goNoGo.goCorrect += 1;
      recordCorrect(state.stats, { reactionTime: reaction });
      showFeedback('命中', 'good');
      audio.correct();
    } else {
      recordError(state.stats, { reactionTime: reaction });
      showFeedback('误报 · No-Go 不需要按', 'bad');
      audio.wrong();
    }
    updateLiveStats();
  };

  goButton.addEventListener('click', respond);
  state.goRespond = respond;
  later(() => {
    const stimulus = dom.modeStage.querySelector('.gng-stimulus');
    if (stimulus) stimulus.style.opacity = '0.16';
  }, config.stimulusMs);

  startTimerBar(config.responseMs);
  schedule(() => {
    if (!state.responded) {
      if (isGo) {
        recordError(state.stats, { timeout: true });
        showFeedback('漏报', 'bad');
      } else {
        state.details.goNoGo.noGoCorrect += 1;
        recordCorrectRejection(state.stats);
        showFeedback('正确克制', 'good');
        audio.tone(392, 0.09, 0.025);
      }
    }
    state.accepting = false;
    finishTrial(240);
  }, config.responseMs);
}

/* Spot the difference */
function starPoints(cx, cy, outer, inner) {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(' ');
}

function elementMarkup(element) {
  const { shape, color, size, x, y, rotation } = element;
  const transform = `translate(${x} ${y}) rotate(${rotation})`;
  if (shape === 'circle') return `<circle transform="${transform}" r="${size / 2}" fill="${color}" />`;
  if (shape === 'triangle') {
    const half = size / 2;
    return `<polygon transform="${transform}" points="0,${-half} ${half},${half} ${-half},${half}" fill="${color}" />`;
  }
  if (shape === 'square') {
    return `<rect transform="${transform}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size * 0.16}" fill="${color}" />`;
  }
  if (shape === 'star') {
    return `<polygon transform="${transform}" points="${starPoints(0, 0, size / 2, size / 4.6)}" fill="${color}" />`;
  }
  if (shape === 'diamond') {
    return `<polygon transform="${transform}" points="0,${-size / 2} ${size / 2},0 0,${size / 2} ${-size / 2},0" fill="${color}" />`;
  }
  const radius = size / 2;
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + (index * Math.PI) / 3;
    return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
  }).join(' ');
  return `<polygon transform="${transform}" points="${points}" fill="${color}" />`;
}

function sceneSvg(elements) {
  return `
    <svg viewBox="0 0 600 420" role="img" aria-label="找不同场景">
      <defs>
        <linearGradient id="scene-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fffdf9" />
          <stop offset="100%" stop-color="#f3efff" />
        </linearGradient>
      </defs>
      <rect width="600" height="420" rx="18" fill="url(#scene-bg)" />
      ${elements.map(elementMarkup).join('')}
    </svg>
  `;
}

function startSpotDifference(trial) {
  const config = LEVEL_CONFIG.spotDifference[state.level - 1];
  dom.gameInstruction.textContent = '点击任意一幅图中的差异区域';
  dom.modeStage.innerHTML = `
    <div class="spot-stage">
      <div class="spot-panels">
        <div class="scene-panel" data-panel="left">${sceneSvg(trial.left)}</div>
        <div class="scene-panel" data-panel="right">${sceneSvg(trial.right)}</div>
      </div>
      <p class="stage-copy">两幅图只有一处不同</p>
    </div>
  `;
  state.accepting = true;
  state.trialStartedAt = performance.now();

  const checkHit = (x, y) => trial.hotspot.some((spot) => {
    const dx = x - spot.x;
    const dy = y - spot.y;
    return Math.hypot(dx, dy) <= spot.radius;
  });

  const markFound = (panel, x, y) => {
    const marker = document.createElement('span');
    marker.className = 'spot-found';
    marker.style.left = `${(x / 600) * 100}%`;
    marker.style.top = `${(y / 420) * 100}%`;
    panel.append(marker);
  };

  for (const panel of dom.modeStage.querySelectorAll('.scene-panel')) {
    panel.addEventListener('click', (event) => {
      if (!state.accepting) return;
      const rect = panel.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 600;
      const y = ((event.clientY - rect.top) / rect.height) * 420;
      if (checkHit(x, y)) {
        state.accepting = false;
        clearTimer();
        const reaction = performance.now() - state.trialStartedAt;
        state.details.spot.solved += 1;
        state.details.spot.times.push(reaction);
        recordCorrect(state.stats, { reactionTime: reaction });
        markFound(panel, x, y);
        showFeedback('找到了', 'good');
        audio.correct();
        finishTrial(500);
      } else {
        addPenalty(state.stats, 25);
        state.details.spot.wrongClicks += 1;
        showFeedback('这里没有差异 · -25', 'bad');
        audio.wrong();
        updateLiveStats();
      }
    });
  }

  startTimerBar(config.timeLimit);
  schedule(() => {
    if (!state.accepting) return;
    state.accepting = false;
    state.details.spot.timeouts += 1;
    recordError(state.stats, { timeout: true });
    showFeedback('超时', 'bad');
    finishTrial(420);
  }, config.timeLimit);
}

/* Short-term sequence memory */
function symbolSvg(id, className = '') {
  const symbol = SEQUENCE_SYMBOLS.find((item) => item.id === id) || SEQUENCE_SYMBOLS[0];
  const color = symbol.color;
  let shape = '';
  if (symbol.shape === 'circle') shape = `<circle cx="50" cy="50" r="34" fill="${color}" />`;
  else if (symbol.shape === 'triangle') shape = `<polygon points="50,12 90,84 10,84" fill="${color}" />`;
  else if (symbol.shape === 'square') shape = `<rect x="18" y="18" width="64" height="64" rx="12" fill="${color}" />`;
  else if (symbol.shape === 'star') shape = `<polygon points="${starPoints(50, 50, 42, 18)}" fill="${color}" />`;
  else if (symbol.shape === 'diamond') shape = `<polygon points="50,9 91,50 50,91 9,50" fill="${color}" />`;
  else if (symbol.shape === 'hexagon') shape = `<polygon points="76,25 76,75 50,92 24,75 24,25 50,8" fill="${color}" />`;
  else if (symbol.shape === 'heart') shape = `<path d="M50 88C20 67 10 49 17 33c7-16 29-17 33 2 4-19 26-18 33-2 7 16-3 34-33 55Z" fill="${color}" />`;
  else shape = `<path d="M40 12h20v28h28v20H60v28H40V60H12V40h28Z" fill="${color}" />`;
  return `<svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">${shape}</svg>`;
}

function startSequenceMemory(trial) {
  const config = LEVEL_CONFIG.sequenceMemory[state.level - 1];
  state.details.sequence.total += 1;
  state.sequence = { trial, selected: [], responseStart: 0 };
  dom.gameInstruction.textContent = '记住图形出现顺序';
  dom.modeStage.innerHTML = `
    <div class="sequence-stage">
      <div class="sequence-display" id="sequence-display"></div>
      <p class="stage-copy" id="sequence-copy">注视图形，不要点击</p>
    </div>
  `;
  resetTimerBar();
  const display = dom.modeStage.querySelector('#sequence-display');
  let position = 0;

  const showNext = () => {
    if (!state.active) return;
    if (position >= trial.sequence.length) {
      showSequenceResponse(trial);
      return;
    }
    display.innerHTML = symbolSvg(trial.sequence[position], 'sequence-symbol');
    audio.tone(440 + position * 45, 0.08, 0.025);
    position += 1;
    schedule(() => {
      display.innerHTML = '';
      schedule(showNext, config.gapMs);
    }, config.stimulusMs);
  };
  schedule(showNext, 500);
}

function showSequenceResponse(trial) {
  dom.gameInstruction.textContent = '按出现顺序依次点击';
  dom.modeStage.innerHTML = `
    <div class="sequence-stage">
      <div class="sequence-display" id="sequence-display">
        <span class="stage-copy">请复现 ${trial.sequence.length} 个图形</span>
      </div>
      <div class="sequence-options">
        ${trial.options.map((id, index) => `
          <button class="symbol-option" type="button" data-symbol="${id}" data-index="${index}">
            <span class="option-symbol">${symbolSvg(id)}</span>
            <small>${index + 1}</small>
          </button>
        `).join('')}
      </div>
      <div class="sequence-tools">
        <button type="button" data-seq-tool="undo">撤销</button>
        <button type="button" data-seq-tool="reset">重选</button>
      </div>
    </div>
  `;
  state.accepting = true;
  state.sequence.responseStart = performance.now();
  state.sequence.selected = [];
  state.sequence.options = trial.options;

  const resetInactivity = () => {
    schedule(() => {
      if (!state.accepting) return;
      state.accepting = false;
      recordError(state.stats, { timeout: true });
      showFeedback('超时', 'bad');
      finishTrial(420);
    }, 30000);
  };

  const refreshSelection = () => {
    for (const button of dom.modeStage.querySelectorAll('.symbol-option')) {
      const order = state.sequence.selected.indexOf(button.dataset.symbol);
      button.disabled = order >= 0;
      button.querySelector('.option-order')?.remove();
      if (order >= 0) {
        const badge = document.createElement('span');
        badge.className = 'option-order';
        badge.textContent = String(order + 1);
        button.append(badge);
      }
    }
  };

  const evaluate = () => {
    state.accepting = false;
    clearTimer();
    const reaction = performance.now() - state.sequence.responseStart;
    const correct = state.sequence.selected.every((id, index) => id === trial.sequence[index]);
    if (correct) {
      state.details.sequence.correct += 1;
      state.details.sequence.times.push(reaction);
      recordCorrect(state.stats, { reactionTime: reaction });
      showFeedback('顺序正确', 'good');
      audio.correct();
    } else {
      recordError(state.stats, { penalty: 25, reactionTime: reaction });
      showFeedback('顺序错误 · -25', 'bad');
      audio.wrong();
    }
    disableButtons();
    finishTrial(520);
  };

  const choose = (id) => {
    if (!state.accepting || state.sequence.selected.includes(id)) return;
    state.sequence.selected.push(id);
    refreshSelection();
    resetInactivity();
    if (state.sequence.selected.length === trial.sequence.length) evaluate();
  };
  state.sequence.choose = choose;

  for (const button of dom.modeStage.querySelectorAll('.symbol-option')) {
    button.addEventListener('click', () => choose(button.dataset.symbol));
  }
  dom.modeStage.querySelector('[data-seq-tool="undo"]').addEventListener('click', () => {
    if (!state.accepting || !state.sequence.selected.length) return;
    state.sequence.selected.pop();
    refreshSelection();
    resetInactivity();
  });
  dom.modeStage.querySelector('[data-seq-tool="reset"]').addEventListener('click', () => {
    if (!state.accepting) return;
    state.sequence.selected = [];
    refreshSelection();
    resetInactivity();
  });
  resetInactivity();
}

/* Marble Schulte */
function startSchulte(trial) {
  const config = LEVEL_CONFIG.schulte[state.level - 1];
  state.schulte = {
    target: 1,
    targetLimit: trial.target,
    wrongClicks: 0,
    startedAt: performance.now(),
    config,
  };
  dom.gameInstruction.textContent = `按顺序点击 1 → ${trial.target}`;
  renderSchulteBoard(trial);
  state.accepting = true;
  startTimerBar(config.timeLimit);
  schedule(() => {
    if (!state.accepting) return;
    state.accepting = false;
    state.details.schulte.timeouts += 1;
    recordError(state.stats, { timeout: true });
    showFeedback('本盘超时', 'bad');
    disableButtons();
    finishTrial(450);
  }, config.timeLimit);
}

function renderSchulteBoard(trial) {
  const config = state.schulte.config;
  dom.modeStage.innerHTML = `
    <div class="schulte-stage">
      <p class="schulte-target">目标数字 <strong id="schulte-target">${state.schulte.target}</strong></p>
      <div class="schulte-board" style="--grid-size:${config.gridSize}">
        ${trial.numbers.map((number) => `<button class="marble" type="button" data-number="${number}">${number}</button>`).join('')}
      </div>
      <p class="stage-copy">按顺序找到 1 → ${state.schulte.targetLimit}</p>
    </div>
  `;

  const targetLabel = dom.modeStage.querySelector('#schulte-target');
  for (const marble of dom.modeStage.querySelectorAll('.marble')) {
    marble.addEventListener('click', () => {
      if (!state.accepting) return;
      const value = Number(marble.dataset.number);
      if (value === state.schulte.target) {
        marble.classList.add('is-cleared');
        marble.disabled = true;
        audio.tone(430 + state.schulte.target * 20, 0.055, 0.024);
        state.schulte.target += 1;
        if (state.schulte.target > state.schulte.targetLimit) {
          completeSchulteBoard();
        } else {
          targetLabel.textContent = String(state.schulte.target);
        }
      } else {
        state.schulte.wrongClicks += 1;
        state.details.schulte.wrongClicks += 1;
        addPenalty(state.stats, 20);
        marble.classList.remove('is-wrong');
        void marble.offsetWidth;
        marble.classList.add('is-wrong');
        showFeedback('顺序错误 · -20', 'bad');
        audio.wrong();
        updateLiveStats();
      }
    });
  }
}

function completeSchulteBoard() {
  state.accepting = false;
  clearTimer();
  const elapsed = performance.now() - state.schulte.startedAt;
  const config = state.schulte.config;
  const bonus = Math.max(0, Math.floor(((config.timeLimit - elapsed) / 1000) * 10));
  state.details.schulte.completed += 1;
  state.details.schulte.boardTimes.push(elapsed);
  const points = recordCorrect(state.stats, { reactionTime: elapsed, bonus });
  showFeedback(`盘面完成 +${points}`, 'good');
  audio.correct();
  disableButtons();
  finishTrial(520);
}

function finishSession() {
  if (!state.sessionActive) return;
  clearAllTimers();
  state.sessionActive = false;
  state.accepting = false;
  state.active = false;
  const summary = summarizeStats(state.stats, TOTAL_TRIALS);
  saveBest(summary);

  dom.resultGrade.textContent = summary.grade;
  dom.resultScore.textContent = formatScore(summary.score);
  const best = getBest();
  dom.resultBest.textContent = `本机最佳 ${formatScore(best?.score || summary.score)}`;
  dom.resultAccuracy.textContent = formatPercent(summary.accuracy);
  dom.resultCorrect.textContent = String(summary.correct);
  dom.resultErrors.textContent = String(summary.errors);
  dom.resultTimeouts.textContent = String(summary.timeouts);
  dom.resultCombo.textContent = String(summary.bestCombo);
  dom.resultReaction.textContent = formatReaction(summary.medianReaction);
  renderRecommendation(summary);
  refreshBest();
  showScreen('results');
  audio.finish();
}

function renderRecommendation(summary) {
  if (summary.accuracy >= 0.86) {
    dom.recommendationTitle.textContent = '保持当前 Level';
    dom.recommendationBody.textContent = '准确率已经稳定，继续在同一难度下提高速度。';
  } else if (summary.accuracy >= 0.65) {
    dom.recommendationTitle.textContent = '优先保证准确';
    dom.recommendationBody.textContent = '减少误答和超时，稳定后再追求更快的反应。';
  } else {
    dom.recommendationTitle.textContent = `尝试 Level ${Math.max(1, state.level - 1)}`;
    dom.recommendationBody.textContent = '当前节奏可能偏高，先降低一级难度建立稳定表现。';
  }
}

function returnHome() {
  clearAllTimers();
  state.sessionActive = false;
  state.active = false;
  state.accepting = false;
  state.session = null;
  state.stats = null;
  state.sequence = null;
  state.schulte = null;
  dom.countdownOverlay.hidden = true;
  dom.modeStage.innerHTML = '';
  dom.liveFeedback.className = 'live-feedback';
  refreshBest();
  showScreen('home');
}

function quitSession() {
  if (!state.sessionActive) {
    returnHome();
    return;
  }
  if (window.confirm('结束本轮训练？本轮成绩不会保存。')) returnHome();
}

function handleKeyboard(event) {
  if (event.repeat || !state.sessionActive || document.body.dataset.screen !== 'game') return;
  if (event.code === 'Escape') {
    event.preventDefault();
    quitSession();
    return;
  }
  const context = currentContext();
  if (context.mode === 'stroop' && state.accepting && /^Digit[1-4]$/.test(event.code)) {
    event.preventDefault();
    const color = STROOP_COLORS[Number(event.code.at(-1)) - 1];
    dom.modeStage.querySelector(`[data-color="${color.id}"]`)?.click();
  } else if (context.mode === 'goNoGo' && state.accepting && (event.code === 'Space' || event.code === 'Enter')) {
    event.preventDefault();
    state.goRespond?.();
  } else if (context.mode === 'sequenceMemory' && state.accepting && /^Digit[1-8]$/.test(event.code)) {
    event.preventDefault();
    const option = state.sequence?.options[Number(event.code.at(-1)) - 1];
    if (option) state.sequence.choose?.(option);
  }
}

for (const card of dom.modeCards) {
  card.addEventListener('click', () => {
    state.mode = card.dataset.modeCard;
    syncHomeSelection();
    saveStore();
  });
}

dom.setupForm.addEventListener('change', (event) => {
  if (event.target.name === 'level') {
    state.level = Number(event.target.value);
    syncHomeSelection();
    saveStore();
  }
});

dom.setupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  startSession();
});

dom.soundToggle.addEventListener('click', () => setSoundEnabled(!state.soundEnabled));
dom.howToButton.addEventListener('click', () => dom.tutorialDialog.showModal());
dom.quitButton.addEventListener('click', quitSession);
dom.playAgainButton.addEventListener('click', startSession);
dom.homeButton.addEventListener('click', returnHome);
window.addEventListener('keydown', handleKeyboard);
dom.tutorialDialog.addEventListener('click', (event) => {
  if (event.target === dom.tutorialDialog) dom.tutorialDialog.close();
});

const levelInput = dom.setupForm.querySelector(`input[name="level"][value="${state.level}"]`);
if (levelInput) levelInput.checked = true;
setSoundEnabled(state.soundEnabled);
syncHomeSelection();
showScreen('home');
