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

// ---------- EXPORTS FOR THE TESTS ----------
// In the browser "module" does not exist, so this block is skipped and the
// functions above are simply global. In Node (the tests) it hands them over.
if (typeof module !== "undefined") {
    module.exports = {
        cmPer360,
        convertSens,
        rulerPercent
    };
}
