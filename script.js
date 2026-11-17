// The Supabase client "db" is created in supabase-client.js,
// which index.html loads before this file.

// ---------- DATA ----------
// yaw = degrees the camera turns per mouse count at sensitivity 1.
// Filled from the Supabase "games" table by loadGames() below.
let games = [];

// ---------- MATH (pure functions: inputs in, number out, no page access) ----------
function cmPer360(sens, yaw, dpi) {
    return (360 / (sens * yaw * dpi)) * 2.54;
}

function convertSens(sens, fromYaw, toYaw) {
    return (sens * fromYaw) / toYaw;
}

// The ruler shows 0 to 80 cm. Returns how full it should be, capped at 100.
const RULER_MAX_CM = 80;

function rulerPercent(cm) {
    return Math.min((cm / RULER_MAX_CM) * 100, 100);
}

// ---------- PAGE ELEMENTS ----------
const fromGameSelect = document.getElementById("from-game");
const toGameSelect = document.getElementById("to-game");
const dpiInput = document.getElementById("dpi");
const sensitivityInput = document.getElementById("sensitivity");
const calculateButton = document.getElementById("calculate-button");
const edpiResult = document.getElementById("edpi-result");
const cmResult = document.getElementById("cm-result");
const convertedResult = document.getElementById("converted-result");
const errorMessage = document.getElementById("error-message");
const resultLabel = document.getElementById("result-label");
const rulerFill = document.getElementById("ruler-fill");
const swapButton = document.getElementById("swap-button");
const copyButton = document.getElementById("copy-button");

// ---------- FILL THE DROPDOWNS ----------
// For each game, create an <option> whose value is its index in games.
function fillGameSelect(select) {
    select.innerHTML = "";
    games.forEach(function (game, index) {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = game.name;
        select.appendChild(option);
    });
}

// async: this function can "await" (wait for) the network without freezing the page.
async function loadGames() {
    calculateButton.disabled = true;
    errorMessage.textContent = "Loading games...";

    const { data, error } = await db
        .from("games")
        .select("name, yaw")
        .order("name");

    // RLS blocking a read gives an EMPTY list, not an error, so check both.
    if (error || !data || data.length === 0) {
        console.error(error || "No games returned");
        errorMessage.textContent = "Could not load games. Please refresh and try again.";
        return; // button stays disabled: there is nothing to convert
    }

    games = data;
    fillGameSelect(fromGameSelect);
    fillGameSelect(toGameSelect);
    if (games.length > 1) {
        toGameSelect.value = 1; // start with a different game selected
    }

    // The games page links here as index.html?from=Valorant.
    // If the address has a "from" game we know, select it.
    const wanted = new URLSearchParams(window.location.search).get("from");
    const wantedIndex = games.findIndex(function (game) {
        return game.name === wanted;
    });
    if (wantedIndex !== -1) {
        fromGameSelect.value = wantedIndex;
        if (games.length > 1) {
            toGameSelect.value = wantedIndex === 0 ? 1 : 0; // keep "to" different
        }
    }
    errorMessage.textContent = "";
    calculateButton.disabled = false;
    swapButton.disabled = false;
}

loadGames();

// ---------- CONFETTI ----------
const CONFETTI_COLORS = ["#b57bff", "#d0a8ff", "#efe9f8", "#7a3fd6"];
const CONFETTI_COUNT = 45;

// True if the person turned animations off in their system settings.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// startX and startY are screen coordinates: where the burst begins.
function burstConfetti(startX, startY) {
    if (reduceMotion.matches) {
        return;
    }

    for (let i = 0; i < CONFETTI_COUNT; i++) {
        const piece = document.createElement("span");
        piece.className = "confetti";
        piece.style.left = startX + "px";
        piece.style.top = startY + "px";
        piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        document.body.appendChild(piece);

        // Random direction (angle) and random distance for each piece.
        const angle = Math.random() * 2 * Math.PI;
        const distance = 80 + Math.random() * 160;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const spin = Math.random() * 720 - 360;

        // Keyframes: shoot outward, then drift down and fade (the firework look).
        const animation = piece.animate(
            [
                { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
                { transform: `translate(${x}px, ${y}px) rotate(${spin}deg)`, opacity: 1, offset: 0.6 },
                { transform: `translate(${x}px, ${y + 70}px) rotate(${spin}deg)`, opacity: 0 }
            ],
            { duration: 900 + Math.random() * 500, easing: "ease-out" }
        );

        // Clean up: remove the piece from the page when its animation ends.
        animation.onfinish = function () {
            piece.remove();
        };
    }
}

// ---------- RESULTS ----------
// The last converted value as text, or null when there is nothing to show.
// The swap and copy buttons both read it.
let lastConverted = null;

// Reads the form and updates the result area.
// Returns true if a conversion was shown, false if the inputs aren't usable yet.
function updateResults() {
    if (games.length === 0) {
        return false; // games haven't loaded
    }

    const dpi = Number(dpiInput.value);
    const sens = Number(sensitivityInput.value);

    // Number("") is 0 and Number("abc") is NaN, so reject both.
    if (!(dpi > 0) || !(sens > 0)) {
        lastConverted = null;
        edpiResult.textContent = "---";
        cmResult.textContent = "---";
        convertedResult.textContent = "---";
        resultLabel.textContent = "Converted sensitivity";
        rulerFill.style.width = "0%";
        copyButton.disabled = true;
        return false;
    }

    const fromGame = games[fromGameSelect.value];
    const toGame = games[toGameSelect.value];
    const cm = cmPer360(sens, fromGame.yaw, dpi);

    lastConverted = convertSens(sens, fromGame.yaw, toGame.yaw).toFixed(4);

    edpiResult.textContent = (dpi * sens).toFixed(2);
    cmResult.textContent = cm.toFixed(2) + " cm";
    convertedResult.textContent = lastConverted;
    resultLabel.textContent = toGame.name + " sensitivity";
    rulerFill.style.width = rulerPercent(cm) + "%"; // CSS animates the change
    copyButton.disabled = false;
    return true;
}

// ---------- LIVE RESULTS ----------
// Runs on every keystroke and dropdown change. Quiet: no error text, no confetti.
function liveUpdate() {
    if (games.length === 0) {
        return;
    }
    errorMessage.textContent = "";
    updateResults();
}

dpiInput.addEventListener("input", liveUpdate);
sensitivityInput.addEventListener("input", liveUpdate);
fromGameSelect.addEventListener("change", liveUpdate);
toGameSelect.addEventListener("change", liveUpdate);

// ---------- CONVERT BUTTON ----------
// Same calculation, plus the error message or the confetti.
// "event" describes the click, including where the pointer was.
calculateButton.addEventListener("click", function (event) {
    if (updateResults()) {
        errorMessage.textContent = "";

        // Start at the mouse pointer.
        let x = event.clientX;
        let y = event.clientY;

        // Pressing Enter or Space on the button has no pointer position
        // (detail is 0), so use the middle of the button instead.
        if (event.detail === 0) {
            const box = calculateButton.getBoundingClientRect();
            x = box.left + box.width / 2;
            y = box.top + box.height / 2;
        }

        burstConfetti(x, y);
    } else {
        errorMessage.textContent = "Please enter a DPI and sensitivity greater than 0.";
    }
});

// ---------- SWAP BUTTON ----------
// Flips the two games. If there is a result, it becomes the new input,
// so swapping converts back the other way.
swapButton.addEventListener("click", function () {
    const oldFrom = fromGameSelect.value;
    fromGameSelect.value = toGameSelect.value;
    toGameSelect.value = oldFrom;

    if (lastConverted !== null) {
        sensitivityInput.value = lastConverted;
    }
    liveUpdate();
});

// ---------- COPY BUTTON ----------
copyButton.addEventListener("click", async function () {
    if (lastConverted === null) {
        return;
    }

    // The clipboard can refuse (old browser, blocked permission), so try/catch.
    try {
        await navigator.clipboard.writeText(lastConverted);
        copyButton.textContent = "Copied";
    } catch (err) {
        console.error(err);
        copyButton.textContent = "Copy failed";
    }

    // Put the normal label back after 1.5 seconds.
    setTimeout(function () {
        copyButton.textContent = "Copy";
    }, 1500);
});
