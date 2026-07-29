(function (global) {
  "use strict";

  const EPS = 1e-12;
  const ceil = value => Math.ceil(Number(value) - EPS);
  const clampProbability = value => Math.min(0.999999999, Math.max(0.000000001, Number(value)));
  const toProbability = percent => clampProbability(Number(percent) / 100);

  function zScore(confidence) {
    const table = {
      "0.90": 1.6448536269514722,
      "0.95": 1.959963984540054,
      "0.99": 2.5758293035489004
    };
    return table[Number(confidence).toFixed(2)] || table["0.95"];
  }

  function prevalenceSample({ expectedPrevalence, precision, confidence, populationSize, lossRate = 0 }) {
    const p = toProbability(expectedPrevalence);
    const d = toProbability(precision);
    const z = zScore(confidence);
    const infinite = (z * z * p * (1 - p)) / (d * d);
    const N = Number(populationSize);
    const finite = Number.isFinite(N) && N > 0
      ? (N * infinite) / (N + infinite - 1)
      : infinite;
    const loss = Math.min(0.95, Math.max(0, Number(lossRate) / 100));
    return {
      methodId: "EPI-PREV-001",
      nominal: ceil(infinite),
      finite: ceil(finite),
      final: ceil(finite / (1 - loss)),
      p,
      d,
      z,
      populationSize: Number.isFinite(N) && N > 0 ? N : null
    };
  }

  function logGamma(z) {
    const coefficients = [
      676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012,
      9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    let x = 0.99999999999980993;
    coefficients.forEach((coefficient, index) => { x += coefficient / (z + index + 1); });
    const t = z + coefficients.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function logChoose(n, k) {
    if (k < 0 || k > n) return -Infinity;
    if (k === 0 || k === n) return 0;
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  }

  function finiteDetectionProbability({ populationSize, sampleSize, designPrevalence, testSensitivity }) {
    const N = Math.max(1, Math.floor(Number(populationSize)));
    const n = Math.min(N, Math.max(0, Math.floor(Number(sampleSize))));
    const D = Math.min(N, Math.max(1, Math.ceil(N * toProbability(designPrevalence))));
    const se = toProbability(testSensitivity);
    const minK = Math.max(0, n - (N - D));
    const maxK = Math.min(n, D);
    const denominator = logChoose(N, n);
    let noDetection = 0;

    for (let k = minK; k <= maxK; k += 1) {
      const logHyper = logChoose(D, k) + logChoose(N - D, n - k) - denominator;
      const missed = k === 0 ? 1 : Math.pow(1 - se, k);
      noDetection += Math.exp(logHyper) * missed;
    }
    return Math.min(1, Math.max(0, 1 - noDetection));
  }

  function approximateDetectionSample({ designPrevalence, confidence, testSensitivity }) {
    const p = toProbability(designPrevalence);
    const se = toProbability(testSensitivity);
    const C = clampProbability(confidence);
    return ceil(Math.log(1 - C) / Math.log(1 - p * se));
  }

  function finiteDetectionSample({ populationSize, designPrevalence, confidence, testSensitivity, lossRate = 0 }) {
    const N = Number(populationSize);
    const C = clampProbability(confidence);
    const baseApprox = approximateDetectionSample({ designPrevalence, confidence, testSensitivity });
    let base = baseApprox;
    let achieved;

    if (Number.isFinite(N) && N > 0) {
      let low = 1;
      let high = Math.min(Math.max(baseApprox, 1), Math.floor(N));
      while (finiteDetectionProbability({ populationSize: N, sampleSize: high, designPrevalence, testSensitivity }) < C && high < N) {
        high = Math.min(N, high * 2);
      }
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        const probability = finiteDetectionProbability({ populationSize: N, sampleSize: mid, designPrevalence, testSensitivity });
        if (probability >= C) high = mid;
        else low = mid + 1;
      }
      base = low;
      achieved = finiteDetectionProbability({ populationSize: N, sampleSize: base, designPrevalence, testSensitivity });
    } else {
      const p = toProbability(designPrevalence) * toProbability(testSensitivity);
      achieved = 1 - Math.pow(1 - p, base);
    }

    const loss = Math.min(0.95, Math.max(0, Number(lossRate) / 100));
    return {
      methodId: Number.isFinite(N) && N > 0 ? "EPI-DET-FIN-001" : "EPI-DET-001",
      base,
      final: ceil(base / (1 - loss)),
      achieved,
      populationSize: Number.isFinite(N) && N > 0 ? N : null
    };
  }

  function herdSpecificity(individualSpecificity, sampleSize, positiveThreshold = 1) {
    const sp = toProbability(individualSpecificity);
    const n = Math.max(1, Math.floor(Number(sampleSize)));
    const threshold = Math.max(1, Math.floor(Number(positiveThreshold)));
    if (threshold === 1) return Math.pow(sp, n);
    const falsePositive = 1 - sp;
    let probabilityBelowThreshold = 0;
    for (let k = 0; k < threshold; k += 1) {
      probabilityBelowThreshold += binomialPmf(k, n, falsePositive);
    }
    return Math.min(1, probabilityBelowThreshold);
  }

  function binomialPmf(k, n, p) {
    if (p <= 0) return k === 0 ? 1 : 0;
    if (p >= 1) return k === n ? 1 : 0;
    const logCombination = logChoose(n, k);
    return Math.exp(logCombination + k * Math.log(p) + (n - k) * Math.log(1 - p));
  }

  function binomialCdf(k, n, p) {
    if (k < 0) return 0;
    if (k >= n) return 1;
    let total = 0;
    for (let i = 0; i <= k; i += 1) total += binomialPmf(i, n, p);
    return Math.min(1, Math.max(0, total));
  }

  function probabilityAtLeast(target, trials, successProbability) {
    return 1 - binomialCdf(target - 1, trials, successProbability);
  }

  function minimumTrialsForTarget(target, successProbability, confidence) {
    const k = Math.max(1, Math.ceil(Number(target)));
    const p = clampProbability(successProbability);
    const C = clampProbability(confidence);
    let low = k;
    let high = Math.max(k, ceil(k / p));
    while (probabilityAtLeast(k, high, p) < C) {
      high *= 2;
      if (high > 10000000) throw new Error("Los parámetros generan un tamaño excesivo.");
    }
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (probabilityAtLeast(k, mid, p) >= C) high = mid;
      else low = mid + 1;
    }
    return { trials: low, achieved: probabilityAtLeast(k, low, p) };
  }

  function variantDetection({ variantFrequency, confidence }) {
    const p = toProbability(variantFrequency);
    const C = clampProbability(confidence);
    const n = Math.log(1 - C) / Math.log(1 - p);
    return { methodId: "MOL-DET-001", usableSequences: ceil(n), p, confidence: C };
  }

  function laboratoryFunnel({ targetSequences, startPositivity = 100, amplificationSuccess = 100, sequencingSuccess = 100, qualitySuccess = 100, confidence = 0.95 }) {
    const target = Math.max(1, Math.ceil(Number(targetSequences)));
    const rates = [startPositivity, amplificationSuccess, sequencingSuccess, qualitySuccess].map(toProbability);
    const overall = rates.reduce((acc, value) => acc * value, 1);
    const expectedInitial = ceil(target / overall);
    const guaranteed = minimumTrialsForTarget(target, overall, confidence);
    return {
      methodId: "MOL-FUN-001",
      target,
      rates,
      overall,
      expectedInitial,
      guaranteedInitial: guaranteed.trials,
      achievedConfidence: guaranteed.achieved,
      stagesExpected: [
        guaranteed.trials,
        guaranteed.trials * rates[0],
        guaranteed.trials * rates[0] * rates[1],
        guaranteed.trials * rates[0] * rates[1] * rates[2],
        guaranteed.trials * overall
      ]
    };
  }

  function proportionalAllocation(totalSample, groups) {
    const valid = groups.filter(group => Number(group.population) > 0);
    const totalPopulation = valid.reduce((sum, group) => sum + Number(group.population), 0);
    if (!valid.length || totalPopulation <= 0) return [];
    const target = Math.min(Math.max(0, Math.ceil(Number(totalSample))), totalPopulation);
    const raw = valid.map(group => {
      const exact = target * Number(group.population) / totalPopulation;
      return { ...group, exact, sample: Math.min(Number(group.population), Math.floor(exact)) };
    });
    let assigned = raw.reduce((sum, row) => sum + row.sample, 0);
    raw.sort((a, b) => (b.exact - b.sample) - (a.exact - a.sample));
    let index = 0;
    while (assigned < target) {
      const row = raw[index % raw.length];
      if (row.sample < Number(row.population)) {
        row.sample += 1;
        assigned += 1;
      }
      index += 1;
      if (index > raw.length * target * 2) break;
    }
    return raw.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  global.SampleCalculators = {
    zScore,
    prevalenceSample,
    approximateDetectionSample,
    finiteDetectionProbability,
    finiteDetectionSample,
    herdSpecificity,
    variantDetection,
    laboratoryFunnel,
    probabilityAtLeast,
    minimumTrialsForTarget,
    proportionalAllocation
  };
})(window);
