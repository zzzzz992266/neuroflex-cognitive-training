import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVEL_CONFIG,
  MODE_CARDS,
  MODE_ORDER,
  STROOP_COLORS,
  TOTAL_TRIALS,
  addPenalty,
  createSession,
  createStats,
  gradeFor,
  recordCorrect,
  recordCorrectRejection,
  recordError,
  summarizeStats,
} from '../engine.js';

function seededRandom(seed = 123456789) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('all six session types generate exactly 15 trials', () => {
  for (const mode of MODE_CARDS) {
    for (const level of [1, 2, 3, 4]) {
      const session = createSession(mode, level, seededRandom(42 + level));
      assert.equal(session.trials.length, TOTAL_TRIALS);
      assert.equal(session.mode, mode);
      assert.equal(session.level, level);
    }
  }
});

test('mixed sessions contain each game exactly three times', () => {
  for (const level of [1, 2, 3, 4]) {
    const session = createSession('mixed', level, seededRandom(2026 + level));
    assert.equal(session.trials.length, 15);
    for (const mode of MODE_ORDER) {
      assert.equal(session.trials.filter((entry) => entry.mode === mode).length, 3);
    }
    const schulteTargets = session.trials
      .filter((entry) => entry.mode === 'schulte')
      .map((entry) => entry.trial.target)
      .sort((a, b) => a - b);
    assert.deepEqual(schulteTargets, [9, 12, 16]);
    for (const entry of session.trials) assert.ok(entry.trial);
  }
});

test('all level parameters get faster and harder', () => {
  const stroop = LEVEL_CONFIG.stroop;
  for (let index = 1; index < 4; index += 1) {
    assert.ok(stroop[index].timeLimit < stroop[index - 1].timeLimit);
    assert.ok(stroop[index].conflictRate > stroop[index - 1].conflictRate);
  }

  const goNoGo = LEVEL_CONFIG.goNoGo;
  for (let index = 1; index < 4; index += 1) {
    assert.ok(goNoGo[index].noGoCount > goNoGo[index - 1].noGoCount);
    assert.ok(goNoGo[index].stimulusMs < goNoGo[index - 1].stimulusMs);
    assert.ok(goNoGo[index].responseMs < goNoGo[index - 1].responseMs);
    assert.ok(goNoGo[index].gapMs < goNoGo[index - 1].gapMs);
  }

  const spot = LEVEL_CONFIG.spotDifference;
  for (let index = 1; index < 4; index += 1) {
    assert.ok(spot[index].timeLimit < spot[index - 1].timeLimit);
    assert.ok(spot[index].minElements > spot[index - 1].minElements);
  }

  const sequence = LEVEL_CONFIG.sequenceMemory;
  for (let index = 1; index < 4; index += 1) {
    assert.ok(sequence[index].minLength > sequence[index - 1].minLength);
    assert.ok(sequence[index].stimulusMs < sequence[index - 1].stimulusMs);
    assert.ok(sequence[index].gapMs < sequence[index - 1].gapMs);
  }

  const schulte = LEVEL_CONFIG.schulte;
  for (let index = 1; index < 4; index += 1) {
    assert.ok(schulte[index].timeLimit < schulte[index - 1].timeLimit);
    assert.ok(schulte[index].gridSize >= schulte[index - 1].gridSize);
  }
});

test('stroop uses only known colors and valid conflict counts', () => {
  const session = createSession('stroop', 3, seededRandom(7));
  const conflicts = session.trials.filter((trial) => trial.conflict).length;
  assert.equal(conflicts, 11);
  for (const trial of session.trials) {
    assert.ok(STROOP_COLORS.some((color) => color.id === trial.correct));
    assert.equal(trial.correct, trial.ink.id);
    assert.equal(trial.conflict, trial.word.id !== trial.ink.id);
  }
});

test('go/no-go keeps the first three trials as go and uses the configured no-go count', () => {
  for (const level of [1, 2, 3, 4]) {
    const session = createSession('goNoGo', level, seededRandom(99 + level));
    assert.deepEqual(session.trials.slice(0, 3).map((trial) => trial.kind), ['go', 'go', 'go']);
    assert.equal(
      session.trials.filter((trial) => trial.kind === 'noGo').length,
      LEVEL_CONFIG.goNoGo[level - 1].noGoCount,
    );
    let run = 0;
    for (const trial of session.trials) {
      run = trial.kind === 'noGo' ? run + 1 : 0;
      assert.ok(run < 3);
    }
  }
});

test('spot the difference generates a valid hotspot and one scene change', () => {
  for (const level of [1, 2, 3, 4]) {
    const session = createSession('spotDifference', level, seededRandom(123 + level));
    for (const trial of session.trials) {
      assert.ok(trial.left.length >= LEVEL_CONFIG.spotDifference[level - 1].minElements);
      assert.ok(trial.hotspot.length >= 1);
      assert.notEqual(JSON.stringify(trial.left), JSON.stringify(trial.right));
    }
  }
});

test('sequence memory respects level length and offers all response symbols', () => {
  for (const level of [1, 2, 3, 4]) {
    const config = LEVEL_CONFIG.sequenceMemory[level - 1];
    const session = createSession('sequenceMemory', level, seededRandom(55 + level));
    for (const trial of session.trials) {
      assert.ok(trial.sequence.length >= config.minLength);
      assert.ok(trial.sequence.length <= config.maxLength);
      assert.equal(trial.options.length, 8);
    }
  }
});

test('schulte target ranges progress 1-9, then 1-12, then 1-16', () => {
  for (const level of [1, 2, 3, 4]) {
    const config = LEVEL_CONFIG.schulte[level - 1];
    const session = createSession('schulte', level, seededRandom(77 + level));
    assert.equal(session.trials.length, 15);
    assert.deepEqual(session.trials.map((trial) => trial.target), [
      ...Array(6).fill(9),
      ...Array(5).fill(12),
      ...Array(4).fill(16),
    ]);
    for (const trial of session.trials) {
      assert.equal(trial.numbers.length, config.gridSize * config.gridSize);
      assert.equal(new Set(trial.numbers).size, trial.numbers.length);
    }
  }
});

test('scoring, penalties, and accuracy are consistent', () => {
  const stats = createStats();
  assert.equal(recordCorrect(stats, { reactionTime: 500 }), 115);
  assert.equal(stats.combo, 1);
  assert.equal(recordCorrect(stats, { bonus: 30 }), 160);
  recordCorrectRejection(stats, { reactionTime: 600 });
  recordError(stats, { timeout: true });
  addPenalty(stats, 20);
  const summary = summarizeStats(stats);
  assert.equal(summary.correct, 3);
  assert.equal(summary.timeouts, 1);
  assert.equal(summary.accuracy, 0.2);
  assert.equal(summary.grade, 'D');
  assert.ok(summary.score >= 0);
});

test('grade thresholds are stable', () => {
  assert.equal(gradeFor(0.93), 'S');
  assert.equal(gradeFor(0.82), 'A');
  assert.equal(gradeFor(0.68), 'B');
  assert.equal(gradeFor(0.52), 'C');
  assert.equal(gradeFor(0.51), 'D');
});
