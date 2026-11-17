// Run with: npm test
// Uses Node's built-in test runner, so there is nothing to install.
const test = require("node:test");
const assert = require("node:assert");

const {
    cmPer360,
    convertSens,
    rulerPercent,
    SIEGE_DEFAULT_MULTIPLIER,
    siegeEffectiveSens,
    siegeHipFromNeeded,
    isValidSiegeFov,
    fovAdjustment,
    siegeXFactor,
    siegeScopeSlider
} = require("../sens-math.js");

// Passes when two numbers are within "tolerance" of each other.
// Decimals in JavaScript are rarely exactly equal, so we compare this way.
function near(actual, expected, tolerance) {
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        "expected " + actual + " to be within " + tolerance + " of " + expected
    );
}

// ---------- EXISTING MATHS ----------
test("cmPer360: CS2 sens 1 at 800 DPI", function () {
    near(cmPer360(1, 0.022, 800), 51.95, 0.01);
});

test("convertSens: CS2 1 to Valorant", function () {
    near(convertSens(1, 0.022, 0.07), 0.3143, 0.0001);
});

test("convertSens round trip", function () {
    near(convertSens(convertSens(1, 0.022, 0.07), 0.07, 0.022), 1, 1e-9);
});

test("rulerPercent", function () {
    near(rulerPercent(40), 50, 1e-9);
    near(rulerPercent(200), 100, 1e-9);
});

// ---------- RAINBOW SIX SIEGE ----------
// Ubisoft's FOV multipliers for the scopes 1.0x, 1.5x, 2.0x, 2.5x, 3.0x, 4.0x, 5.0x, 12.0x.
const M = [0.9, 0.59, 0.49, 0.42, 0.35, 0.3, 0.22, 0.092];

test("default multiplier is 0.02", function () {
    assert.strictEqual(SIEGE_DEFAULT_MULTIPLIER, 0.02);
});

test("fovAdjustment matches Ubisoft's own example", function () {
    near(fovAdjustment(0.9, 60), 0.8825, 0.0001);
});

test("fovAdjustment: 2.5x at FOV 90", function () {
    near(fovAdjustment(0.42, 90), 0.3424, 0.0001);
});

test("siegeXFactor at FOV 90 and FOV 60", function () {
    near(siegeXFactor(M, 90), 0.138155, 1e-6);
    near(siegeXFactor(M, 60), 0.119761, 1e-6);
});

test("scope sliders at FOV 90", function () {
    const x = siegeXFactor(M, 90);
    const sliders = M.map(function (m) { return siegeScopeSlider(m, 90, x).slider; });
    assert.deepStrictEqual(sliders, [8, 14, 18, 21, 26, 30, 41, 100]);
});

test("scope sliders at FOV 60", function () {
    const x = siegeXFactor(M, 60);
    const sliders = M.map(function (m) { return siegeScopeSlider(m, 60, x).slider; });
    assert.deepStrictEqual(sliders, [9, 15, 18, 22, 26, 30, 42, 100]);
});

test("scope error and exact flag", function () {
    const x = siegeXFactor(M, 90);
    near(siegeScopeSlider(0.9, 90, x).errorPercent, -5.6, 0.1);
    near(siegeScopeSlider(0.42, 90, x).errorPercent, -0.7, 0.1);
    assert.strictEqual(siegeScopeSlider(0.092, 90, x).exact, true);
    assert.strictEqual(siegeScopeSlider(0.9, 90, x).exact, false);
});

test("hip-fire: Valorant 0.3143 needs 3.8399", function () {
    const r = siegeHipFromNeeded(3.8399);
    assert.strictEqual(r.slider, 4);
    near(r.multiplier, 0.0191995, 1e-6);
    near(r.errorPercent, 4.2, 0.1);
    assert.strictEqual(r.exact, false);
});

test("hip-fire: a whole number is exact", function () {
    const r = siegeHipFromNeeded(10);
    assert.strictEqual(r.slider, 10);
    near(r.multiplier, 0.02, 1e-12);
    assert.strictEqual(r.exact, true);
});

test("hip-fire: below and above the slider range", function () {
    const low = siegeHipFromNeeded(0.3);
    assert.strictEqual(low.slider, 1);
    near(low.multiplier, 0.006, 1e-9);

    const high = siegeHipFromNeeded(250);
    assert.strictEqual(high.slider, 100);
    near(high.multiplier, 0.05, 1e-9);
});

test("siegeEffectiveSens", function () {
    near(siegeEffectiveSens(10, 0.02), 10, 1e-12);
    near(siegeEffectiveSens(4, 0.0191995), 3.8399, 1e-4);
});

test("hip-fire round trip is exact with the multiplier", function () {
    const r = siegeHipFromNeeded(3.8399);
    near(siegeEffectiveSens(r.slider, r.multiplier), 3.8399, 1e-9);
});

test("isValidSiegeFov", function () {
    [60, 75, 90].forEach(function (f) { assert.strictEqual(isValidSiegeFov(f), true); });
    [59.9, 90.1, 0, NaN, -5].forEach(function (f) { assert.strictEqual(isValidSiegeFov(f), false); });
});
