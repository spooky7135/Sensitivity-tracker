// ---------- SUPABASE ----------
// Both values are PUBLIC by design. Row Level Security protects the data.
// NEVER put a secret / service_role key in this file.
const SUPABASE_URL = "https://srfalmsrlmfgmhnfimow.supabase.co";
const SUPABASE_KEY = "sb_publishable__EDQX1-o-38PIHakzfTg7g_UMCSnBXi";

// The CDN script created a global called "supabase", so our client gets another name.
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    errorMessage.textContent = "";
    calculateButton.disabled = false;
}

loadGames();

// ---------- CONFETTI ----------
const CONFETTI_COLORS = ["#3dff7c", "#7dffa8", "#e6f5ec", "#1fae55"];
const CONFETTI_COUNT = 45;

// True if the person turned animations off in their system settings.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function burstConfetti(originElement) {
    if (reduceMotion.matches) {
        return;
    }

    // Where is the button on screen? Start every piece at its center.
    const box = originElement.getBoundingClientRect();
    const startX = box.left + box.width / 2;
    const startY = box.top + box.height / 2;

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

// ---------- BUTTON CLICK ----------
calculateButton.addEventListener("click", function () {
    const dpi = Number(dpiInput.value);
    const sens = Number(sensitivityInput.value);

    // Number("") is 0 and Number("abc") is NaN, so reject both.
    if (!(dpi > 0) || !(sens > 0)) {
        errorMessage.textContent = "Please enter a DPI and sensitivity greater than 0.";
        edpiResult.textContent = "---";
        cmResult.textContent = "---";
        convertedResult.textContent = "---";
        resultLabel.textContent = "Converted sensitivity";
        rulerFill.style.width = "0%";
        return;
    }
    errorMessage.textContent = "";

    const fromGame = games[fromGameSelect.value];
    const toGame = games[toGameSelect.value];

    const cm = cmPer360(sens, fromGame.yaw, dpi);

    edpiResult.textContent = (dpi * sens).toFixed(2);
    cmResult.textContent = cm.toFixed(2) + " cm";
    convertedResult.textContent = convertSens(sens, fromGame.yaw, toGame.yaw).toFixed(4);
    resultLabel.textContent = toGame.name + " sensitivity";
    rulerFill.style.width = rulerPercent(cm) + "%"; // CSS animates the change
    burstConfetti(calculateButton);
});
