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
    siegeScopeSlider,
    siegeHipNote,
    siegeScopeResultText,
    siegeScopeNote,
    siegeSettingLine,
    minecraftYaw,
    minecraftFromYaw,
    minecraftNote
} = require("../site/sens-math.js");

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

// ---------- SIEGE WORDING ----------
// The short sentences the page shows. The example is Valorant 0.3143 at 800 DPI.
const SIEGE_YAW = 0.00572958;
const exampleNeeded = convertSens(0.3143, 0.07, SIEGE_YAW);

test("hip-fire note when the slider is not exact", function () {
    assert.strictEqual(
        siegeHipNote(siegeHipFromNeeded(exampleNeeded)),
        "4.2% faster than exact. Copy the settings line below for an exact match."
    );
});

test("hip-fire note when the slider is exact", function () {
    assert.strictEqual(siegeHipNote(siegeHipFromNeeded(10)), "Exact match.");
});

test("hip-fire note says slower when the slider rounds down", function () {
    assert.strictEqual(
        siegeHipNote(siegeHipFromNeeded(4.4)),
        "9.1% slower than exact. Copy the settings line below for an exact match."
    );
});

test("scope result text: suggested and exact", function () {
    const x = siegeXFactor(M, 90);
    assert.strictEqual(
        siegeScopeResultText("2.5x", siegeScopeSlider(0.42, 90, x)),
        "Suggested slider for 2.5x: 21"
    );
    assert.strictEqual(
        siegeScopeResultText("12.0x", siegeScopeSlider(0.092, 90, x)),
        "Slider for 12.0x: 100"
    );
});

test("scope note gives only the error", function () {
    const x = siegeXFactor(M, 90);
    assert.strictEqual(siegeScopeNote(siegeScopeSlider(0.42, 90, x)), "0.7% slower than exact");
});

test("scope note is empty when the slider is exact", function () {
    const x = siegeXFactor(M, 90);
    assert.strictEqual(siegeScopeNote(siegeScopeSlider(0.092, 90, x)), "");
});

test("settings file lines use the GameSettings.ini format", function () {
    assert.strictEqual(
        siegeSettingLine("MouseSensitivityMultiplierUnit", siegeHipFromNeeded(exampleNeeded).multiplier),
        "MouseSensitivityMultiplierUnit=0.019199"
    );
    assert.strictEqual(
        siegeSettingLine("XFactorAiming", siegeXFactor(M, 90)),
        "XFactorAiming=0.138155"
    );
});

// ---------- MINECRAFT ----------
// Minecraft's slider is a percentage on a curve, not a fixed yaw.

test("minecraftYaw at 0%, 100% and 200%", function () {
    near(minecraftYaw(0), 0.0096, 1e-12);
    near(minecraftYaw(100), 0.15, 1e-12);
    near(minecraftYaw(200), 0.6144, 1e-12);
});

test("minecraftFromYaw: 100% is exact", function () {
    const r = minecraftFromYaw(0.15);
    assert.strictEqual(r.percent, 100);
    near(r.setting, 0.5, 1e-12);
    assert.strictEqual(r.exact, true);
    assert.strictEqual(r.outOfRange, false);
});

test("minecraftFromYaw: CS2 sens 1 gives 21%", function () {
    const r = minecraftFromYaw(0.022);
    assert.strictEqual(r.percent, 21);
    near(r.setting, 0.106137, 1e-6);
    assert.strictEqual(r.exact, false);
});

test("minecraftFromYaw rounds to a whole percent and reports the error", function () {
    const r = minecraftFromYaw(minecraftYaw(87.3));
    assert.strictEqual(r.percent, 87);
    near(r.setting, 0.4365, 1e-9);
    assert.ok(r.errorPercent < 0, "87% turns slower than 87.3%");
    near(r.errorPercent, (minecraftYaw(87) / minecraftYaw(87.3) - 1) * 100, 1e-9);
});

test("minecraftFromYaw outside the slider range", function () {
    const high = minecraftFromYaw(1.0);
    assert.strictEqual(high.percent, 200);
    assert.strictEqual(high.outOfRange, true);

    const low = minecraftFromYaw(0.001);
    assert.strictEqual(low.percent, 0);
    assert.strictEqual(low.outOfRange, true);
});

test("minecraftNote wording", function () {
    assert.strictEqual(minecraftNote(minecraftFromYaw(0.15)), "Exact match.");
    assert.strictEqual(
        minecraftNote(minecraftFromYaw(minecraftYaw(87.3))),
        "0.6% slower than exact. For an exact match, set mouseSensitivity:0.436500 in options.txt."
    );
    assert.strictEqual(
        minecraftNote(minecraftFromYaw(1.0)),
        "Minecraft's slider can't go that fast. 200% is the closest."
    );
    assert.strictEqual(
        minecraftNote(minecraftFromYaw(0.001)),
        "Minecraft's slider can't go that slow. 0% is the closest."
    );
});
