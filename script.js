// The Supabase client "db" is created in supabase-client.js,
// which index.html loads before this file.

// ---------- DATA ----------
// yaw = degrees the camera turns per mouse count at sensitivity 1.
// Filled from the Supabase "games" table by loadGames() below.
let games = [];

// Scope rows from the "game_scopes" table. Only Rainbow Six Siege has any.
let scopes = [];

// Games with calc_type "siege" need the Siege handling below.
function isSiege(game) {
    return game.calc_type === "siege";
}

// Minecraft's slider is a percentage on a curve, handled in sens-math.js.
function isMinecraft(game) {
    return game.calc_type === "minecraft";
}

// The maths (cmPer360, convertSens, rulerPercent and the Siege functions)
// lives in sens-math.js, which index.html also loads before this file.

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

// Rainbow Six Siege parts of the page
const sensitivityLabel = document.getElementById("sensitivity-label");
const siegeFrom = document.getElementById("siege-from");
const siegeMultiplierInput = document.getElementById("siege-multiplier");
const hipNote = document.getElementById("hip-note");
const siegeScopes = document.getElementById("siege-scopes");
const siegeFovInput = document.getElementById("siege-fov");
const siegeScopeSelect = document.getElementById("siege-scope");
const scopeResult = document.getElementById("scope-result");
const scopeNote = document.getElementById("scope-note");
const settingsBox = document.getElementById("settings-box");
const hipSetting = document.getElementById("hip-setting");
const xFactorRow = document.getElementById("xfactor-row");
const xFactorSetting = document.getElementById("xfactor-setting");

// ---------- GAME SEARCH BOXES ----------
// Typeable pickers on top of the two hidden <select> elements (game-search.js).
function gameNames() {
    return games.map(function (game) { return game.name; });
}

const fromCombobox = createGameCombobox(
    fromGameSelect,
    document.getElementById("from-game-input"),
    document.getElementById("from-game-list"),
    gameNames
);
const toCombobox = createGameCombobox(
    toGameSelect,
    document.getElementById("to-game-input"),
    document.getElementById("to-game-list"),
    gameNames
);

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
        .select("id, name, yaw, calc_type")
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
    // Scopes are a second request. If it fails, hip-fire still converts
    // and the scope section says it could not load them.
    const scopeResponse = await db
        .from("game_scopes")
        .select("game_id, label, fov_multiplier, sort_order")
        .order("sort_order");

    if (scopeResponse.error || !scopeResponse.data) {
        console.error(scopeResponse.error || "No scopes returned");
        scopes = [];
    } else {
        scopes = scopeResponse.data;
    }
    fillScopeSelect();

    errorMessage.textContent = "";
    calculateButton.disabled = false;
    swapButton.disabled = false;

    // Show or hide the Siege parts for the games selected at the start.
    liveUpdate();
}

// One <option> per scope, with its position in "scopes" as the value.
function fillScopeSelect() {
    siegeScopeSelect.innerHTML = "";
    scopes.forEach(function (scope, index) {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = scope.label;
        siegeScopeSelect.appendChild(option);
    });
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

// When the "to" game is Siege: the settings file multiplier that goes with
// the slider in lastConverted. The swap button uses it. Otherwise null.
let lastMultiplier = null;

// Reads the form and updates the result area.
// Returns true if a conversion was shown, false if the inputs aren't usable yet.
function updateResults() {
    if (games.length === 0) {
        return false; // games haven't loaded
    }

    // Show the chosen games' names in the search boxes (needed after Swap).
    fromCombobox.sync();
    toCombobox.sync();

    const fromGame = games[fromGameSelect.value];
    const toGame = games[toGameSelect.value];
    const fromIsSiege = isSiege(fromGame);
    const toIsSiege = isSiege(toGame);
    const fromIsMinecraft = isMinecraft(fromGame);
    const toIsMinecraft = isMinecraft(toGame);

    // Siege's extra input appears only when converting FROM Siege.
    siegeFrom.hidden = !fromIsSiege;
    if (fromIsSiege) {
        sensitivityLabel.textContent = "Current hip-fire slider";
    } else if (fromIsMinecraft) {
        sensitivityLabel.textContent = "Current sensitivity (%)";
    } else {
        sensitivityLabel.textContent = "Current sensitivity";
    }

    const dpi = Number(dpiInput.value);
    let sens = Number(sensitivityInput.value);

    // Number("") is 0 and Number("abc") is NaN, so reject both.
    let valid = dpi > 0 && sens > 0;

    // degreesPerCount: how far the "from" game turns for one mouse count.
    // Every game reduces to this one number, which makes the rest simple.
    let degreesPerCount;

    if (fromIsSiege) {
        // Siege's real sensitivity is the slider combined with the multiplier.
        const multiplier = Number(siegeMultiplierInput.value);
        valid = valid && multiplier > 0;
        sens = siegeEffectiveSens(sens, multiplier);
        degreesPerCount = sens * fromGame.yaw;
    } else if (fromIsMinecraft) {
        // Minecraft's percent goes through its curve instead of a fixed yaw.
        valid = valid && sens <= 200;
        degreesPerCount = minecraftYaw(sens);
    } else {
        degreesPerCount = sens * fromGame.yaw;
    }

    if (!valid) {
        lastConverted = null;
        lastMultiplier = null;
        edpiResult.textContent = "---";
        cmResult.textContent = "---";
        convertedResult.textContent = "---";
        resultLabel.textContent = "Converted sensitivity";
        rulerFill.style.width = "0%";
        copyButton.disabled = true;
        hipNote.hidden = true;
        siegeScopes.hidden = true;
        return false;
    }

    // cmPer360(1, degreesPerCount, dpi): sensitivity 1 with the turn per count.
    const cm = cmPer360(1, degreesPerCount, dpi);

    // For games with a fixed yaw: the sensitivity that turns the same amount.
    const needed = degreesPerCount / toGame.yaw;

    if (toIsMinecraft) {
        // Minecraft's slider shows whole percents, so show the closest one and
        // the exact options.txt value.
        const mc = minecraftFromYaw(degreesPerCount);
        lastConverted = String(mc.percent);
        lastMultiplier = null;
        const suggested = mc.exact && !mc.outOfRange ? "" : "Suggested ";
        resultLabel.textContent = suggested + toGame.name + " sensitivity (%)";
        hipNote.textContent = minecraftNote(mc);
        hipNote.hidden = false;
    } else if (toIsSiege) {
        // Siege only takes whole numbers, so show the closest slider and say
        // how to make it exact with the settings file.
        const hip = siegeHipFromNeeded(needed);
        lastConverted = String(hip.slider);
        lastMultiplier = hip.multiplier;
        resultLabel.textContent = (hip.exact ? "" : "Suggested ") + toGame.name + " slider";
        hipNote.textContent = siegeHipNote(hip);
        hipNote.hidden = false;
        hipSetting.textContent = siegeSettingLine("MouseSensitivityMultiplierUnit", hip.multiplier);
    } else {
        lastConverted = needed.toFixed(4);
        lastMultiplier = null;
        resultLabel.textContent = toGame.name + " sensitivity";
        hipNote.hidden = true;
    }

    // eDPI is DPI x sensitivity. A Minecraft percent isn't that kind of number.
    edpiResult.textContent = fromIsMinecraft ? "---" : (dpi * sens).toFixed(2);
    cmResult.textContent = cm.toFixed(2) + " cm";
    convertedResult.textContent = lastConverted;
    rulerFill.style.width = rulerPercent(cm) + "%"; // CSS animates the change
    copyButton.disabled = false;

    updateScopes(toIsSiege, toGame);
    return true;
}

// ---------- SIEGE SCOPES ----------
// Shows the slider for the chosen scope and the one XFactorAiming value.
function updateScopes(show, toGame) {
    siegeScopes.hidden = !show;
    if (!show) {
        return;
    }

    // Cleared first; filled in below only when there is a valid scope result.
    scopeNote.textContent = "";
    xFactorRow.hidden = true;

    const gameScopes = scopes.filter(function (scope) {
        return scope.game_id === toGame.id;
    });
    const selected = scopes[siegeScopeSelect.value];

    if (gameScopes.length === 0 || !selected) {
        scopeResult.textContent = "Could not load scopes.";
        return;
    }

    const fov = Number(siegeFovInput.value);
    if (!isValidSiegeFov(fov)) {
        scopeResult.textContent = "Enter a FOV between 60 and 90.";
        return;
    }

    const multipliers = gameScopes.map(function (scope) {
        return scope.fov_multiplier;
    });
    const xFactor = siegeXFactor(multipliers, fov);
    const scope = siegeScopeSlider(selected.fov_multiplier, fov, xFactor);

    scopeResult.textContent = siegeScopeResultText(selected.label, scope);
    scopeNote.textContent = siegeScopeNote(scope);
    xFactorSetting.textContent = siegeSettingLine("XFactorAiming", xFactor);
    xFactorRow.hidden = false;
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
siegeMultiplierInput.addEventListener("input", liveUpdate);
siegeFovInput.addEventListener("input", liveUpdate);
siegeScopeSelect.addEventListener("change", liveUpdate);

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
        errorMessage.textContent = "Please enter a DPI, sensitivity and multiplier greater than 0.";
    }
});

// ---------- SWAP BUTTON ----------
// Flips the two games. If there is a result, it becomes the new input,
// so swapping converts back the other way.
swapButton.addEventListener("click", function () {
    // Remember the multiplier before the swap changes the results.
    const multiplierForSwap = lastMultiplier;

    const oldFrom = fromGameSelect.value;
    fromGameSelect.value = toGameSelect.value;
    toGameSelect.value = oldFrom;

    if (lastConverted !== null) {
        sensitivityInput.value = lastConverted;
    }

    // If the result was a Siege slider, its multiplier comes along too,
    // so swapping back gives the original sensitivity. Otherwise reset it.
    if (multiplierForSwap !== null) {
        siegeMultiplierInput.value = multiplierForSwap.toFixed(6);
    } else {
        siegeMultiplierInput.value = String(SIEGE_DEFAULT_MULTIPLIER);
    }

    liveUpdate();
});

// ---------- COPY BUTTONS ----------
// Copies text and briefly shows "Copied" on the button that was clicked.
// Used by the main Copy button and by each settings file line.
async function copyText(button, text) {
    // The clipboard can refuse (old browser, blocked permission), so try/catch.
    try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
    } catch (err) {
        console.error(err);
        button.textContent = "Copy failed";
    }

    // Put the normal label back after 1.5 seconds.
    setTimeout(function () {
        button.textContent = "Copy";
    }, 1500);
}

copyButton.addEventListener("click", function () {
    if (lastConverted !== null) {
        copyText(copyButton, lastConverted);
    }
});

// One listener for the whole settings box ("event delegation").
// It checks which Copy button was clicked, then copies the line that button
// points at through its data-copy-target attribute.
settingsBox.addEventListener("click", function (event) {
    const button = event.target.closest(".copy-line");
    if (!button) {
        return; // the click was somewhere else in the box
    }
    const line = document.getElementById(button.dataset.copyTarget).textContent;
    copyText(button, line);
});
