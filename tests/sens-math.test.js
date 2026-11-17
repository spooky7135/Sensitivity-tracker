// Run with: npm test
// Uses Node's built-in test runner, so there is nothing to install.
const test = require("node:test");
const assert = require("node:assert");

const {
    cmPer360,
    convertSens,
    rulerPercent
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
