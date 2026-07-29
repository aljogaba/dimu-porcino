const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/modules/calculators.js", "utf8"), context);
const c = context.window.SampleCalculators;

assert.strictEqual(c.prevalenceSample({ expectedPrevalence: 46.5, precision: 5, confidence: 0.95, populationSize: 256 }).final, 154);
assert.strictEqual(c.prevalenceSample({ expectedPrevalence: 50, precision: 5, confidence: 0.95, populationSize: 3500 }).final, 347);
assert.strictEqual(c.finiteDetectionSample({ populationSize: 4526, designPrevalence: 5, confidence: 0.95, testSensitivity: 90 }).final, 65);
assert.strictEqual(c.finiteDetectionSample({ populationSize: 4526, designPrevalence: 10, confidence: 0.95, testSensitivity: 90 }).final, 32);
assert.strictEqual(c.variantDetection({ variantFrequency: 5, confidence: 0.95 }).usableSequences, 59);
const funnel = c.laboratoryFunnel({ targetSequences: 59, startPositivity: 40, amplificationSuccess: 90, sequencingSuccess: 70, qualitySuccess: 100, confidence: 0.95 });
assert.strictEqual(funnel.guaranteedInitial, 279);
console.log("All calculator tests passed.");
