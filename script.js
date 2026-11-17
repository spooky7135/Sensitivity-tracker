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
        return;
    }
    errorMessage.textContent = "";

    const fromGame = games[fromGameSelect.value];
    const toGame = games[toGameSelect.value];

    edpiResult.textContent = (dpi * sens).toFixed(2);
    cmResult.textContent = cmPer360(sens, fromGame.yaw, dpi).toFixed(2) + " cm";
    convertedResult.textContent = convertSens(sens, fromGame.yaw, toGame.yaw).toFixed(4);
});
