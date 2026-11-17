// ---------- SENSITIVITY MATHS ----------
// Pure functions only: inputs in, a value out, no access to the page.
// That lets the same file run in the browser and in the tests (npm test).

// How many centimeters the mouse travels for one full 360 degree turn.
function cmPer360(sens, yaw, dpi) {
    return (360 / (sens * yaw * dpi)) * 2.54;
}

// The sensitivity in another game that gives the same turn per mouse count.
function convertSens(sens, fromYaw, toYaw) {
    return (sens * fromYaw) / toYaw;
}

// The ruler shows 0 to 80 cm. Returns how full it should be, capped at 100.
const RULER_MAX_CM = 80;

function rulerPercent(cm) {
    return Math.min((cm / RULER_MAX_CM) * 100, 100);
}

// ---------- RAINBOW SIX SIEGE ----------
// Siege differs from the other games in three ways:
//   1. Its sliders only take whole numbers from 1 to 100.
//   2. A hidden value in the settings file (MouseSensitivityMultiplierUnit,
//      normally 0.02) scales hip-fire.
//   3. Every scope has its own slider, and one more hidden value
//      (XFactorAiming) scales all of them.

const SIEGE_DEFAULT_MULTIPLIER = 0.02;
const SIEGE_SLIDER_MIN = 1;
const SIEGE_SLIDER_MAX = 100;

// An error smaller than this many percent is shown as an exact match.
const EXACT_TOLERANCE_PERCENT = 0.05;

// Rounds to a whole number and keeps it inside the slider's range.
function toSiegeSlider(value) {
    const rounded = Math.round(value);
    return Math.min(Math.max(rounded, SIEGE_SLIDER_MIN), SIEGE_SLIDER_MAX);
}

// Converting FROM Siege: the slider and the multiplier combine into one
// number that works like any other game's sensitivity.
function siegeEffectiveSens(slider, multiplier) {
    return (slider * multiplier) / SIEGE_DEFAULT_MULTIPLIER;
}

// Converting TO Siege. "needed" is the exact slider value that would match,
// for example 3.8399. The slider can only be 4, so:
//   slider       the closest whole number
//   multiplier   the settings file value that makes slider 4 behave like 3.8399
//   errorPercent how far off the slider is WITHOUT the multiplier
//                (positive = faster than an exact match)
//   exact        true when the slider alone is already right
function siegeHipFromNeeded(needed) {
    const slider = toSiegeSlider(needed);
    const errorPercent = (slider / needed - 1) * 100;

    return {
        slider: slider,
        multiplier: (SIEGE_DEFAULT_MULTIPLIER * needed) / slider,
        errorPercent: errorPercent,
        exact: Math.abs(errorPercent) < EXACT_TOLERANCE_PERCENT
    };
}

// Siege's FOV setting goes from 60 to 90.
function isValidSiegeFov(fov) {
    return fov >= 60 && fov <= 90;
}

function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

// Ubisoft's formula: how much a scope slows turning compared with hip-fire.
// fovMultiplier comes from Ubisoft's table (0.42 for the 2.5x scope).
// Math.tan works in radians, so the degrees are converted first.
function fovAdjustment(fovMultiplier, fov) {
    return (
        Math.tan(degreesToRadians((fovMultiplier * fov) / 2)) /
        Math.tan(degreesToRadians(fov / 2))
    );
}

// One XFactorAiming value has to serve every scope. The strongest scope
// needs the highest slider, so we pick the value that puts it exactly on 100.
// Every other scope then lands below 100.
function siegeXFactor(fovMultipliers, fov) {
    const adjustments = fovMultipliers.map(function (fovMultiplier) {
        return fovAdjustment(fovMultiplier, fov);
    });
    const smallest = Math.min.apply(null, adjustments);
    return 1 / (SIEGE_SLIDER_MAX * smallest);
}

// The slider for one scope so that scoped aiming takes the same mouse travel
// as hip-fire. That happens when slider x xFactor x adjustment = 1.
//   errorPercent  how far off the whole-number slider is
//                 (positive = faster than an exact match)
function siegeScopeSlider(fovMultiplier, fov, xFactor) {
    const adjustment = fovAdjustment(fovMultiplier, fov);
    const slider = toSiegeSlider(1 / (xFactor * adjustment));
    const errorPercent = (slider * xFactor * adjustment - 1) * 100;

    return {
        slider: slider,
        errorPercent: errorPercent,
        exact: Math.abs(errorPercent) < EXACT_TOLERANCE_PERCENT
    };
}

// ---------- SIEGE WORDING ----------
// The sentences the page shows. They are here, not in script.js,
// so the tests can check the exact wording too.

// 4.17 becomes "4.2% faster", -0.66 becomes "0.7% slower".
function speedWords(errorPercent) {
    const direction = errorPercent > 0 ? "faster" : "slower";
    return Math.abs(errorPercent).toFixed(1) + "% " + direction;
}

// hip is the object returned by siegeHipFromNeeded.
function siegeHipNote(hip) {
    if (hip.exact) {
        return "Exact match.";
    }
    return (
        speedWords(hip.errorPercent) +
        " than exact. Copy the settings line below for an exact match."
    );
}

// scope is the object returned by siegeScopeSlider.
function siegeScopeResultText(label, scope) {
    const start = scope.exact ? "Slider for " : "Suggested slider for ";
    return start + label + ": " + scope.slider;
}

// Empty when the scope slider is exact, so the page shows nothing.
function siegeScopeNote(scope) {
    if (scope.exact) {
        return "";
    }
    return speedWords(scope.errorPercent) + " than exact";
}

// One line exactly as it is written in GameSettings.ini: Name=value
function siegeSettingLine(name, value) {
    return name + "=" + value.toFixed(6);
}

// ---------- MINECRAFT (JAVA) ----------
// Minecraft's slider is a percentage from 0 to 200, and it is not linear:
//   degrees per mouse count = 1.2 x (0.6 x s + 0.2) cubed, with s = percent / 200
// so 200% is far more than twice as fast as 100%.
// options.txt stores s itself as "mouseSensitivity:0.5" (that is 100%).

const MINECRAFT_MIN_PERCENT = 0;
const MINECRAFT_MAX_PERCENT = 200;

function minecraftYaw(percent) {
    const s = percent / 200;
    return 1.2 * Math.pow(0.6 * s + 0.2, 3);
}

// The reverse: which percent gives this many degrees per count?
//   percent      the whole number to set on the slider
//   setting      the exact options.txt value (s) for a perfect match
//   errorPercent how far off the whole percent is (positive = faster)
//   exact        true when the whole percent is already right
//   outOfRange   true when even 0% or 200% can't reach it
function minecraftFromYaw(targetYaw) {
    // Undo the formula step by step: divide by 1.2, cube root, undo 0.6s + 0.2.
    const s = (Math.cbrt(targetYaw / 1.2) - 0.2) / 0.6;
    const exactPercent = s * 200;

    const rounded = Math.round(exactPercent);
    const percent = Math.min(Math.max(rounded, MINECRAFT_MIN_PERCENT), MINECRAFT_MAX_PERCENT);
    const errorPercent = (minecraftYaw(percent) / targetYaw - 1) * 100;

    return {
        percent: percent,
        setting: s,
        errorPercent: errorPercent,
        exact: Math.abs(errorPercent) < EXACT_TOLERANCE_PERCENT,
        outOfRange: exactPercent < MINECRAFT_MIN_PERCENT || exactPercent > MINECRAFT_MAX_PERCENT
    };
}

function minecraftNote(result) {
    if (result.outOfRange) {
        const way = result.percent === MINECRAFT_MAX_PERCENT ? "fast" : "slow";
        return "Minecraft's slider can't go that " + way + ". " + result.percent + "% is the closest.";
    }
    if (result.exact) {
        return "Exact match.";
    }
    return (
        speedWords(result.errorPercent) + " than exact. For an exact match, set mouseSensitivity:" +
        result.setting.toFixed(6) + " in options.txt."
    );
}

// ---------- EXPORTS FOR THE TESTS ----------
// In the browser "module" does not exist, so this block is skipped and the
// functions above are simply global. In Node (the tests) it hands them over.
if (typeof module !== "undefined") {
    module.exports = {
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
    };
}
