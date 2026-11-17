// The Supabase client "db" is created in supabase-client.js,
// which games.html loads before this file.

const gameList = document.getElementById("game-list");
const statusMessage = document.getElementById("status-message");

// The wedge shows the turn from this many mouse counts at sensitivity 1.
const WEDGE_COUNTS = 1000;

// Degrees turned = counts x sensitivity x yaw (sensitivity is 1 here).
function wedgeDegrees(yaw) {
    return Math.min(WEDGE_COUNTS * yaw, 360);
}

// Small helper: create an element with a class and some text.
// textContent (not innerHTML) means database text can never run as code.
function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text) {
        element.textContent = text;
    }
    return element;
}

// Builds one tile: wedge dial, name, numbers, and a link to the converter.
function buildGameTile(game) {
    const degrees = wedgeDegrees(game.yaw);
    const degreesText = Number(degrees.toFixed(2)) + "°";

    const tile = makeElement("li", "game");

    const dial = makeElement("div", "dial");
    dial.setAttribute("role", "img");
    dial.setAttribute("aria-label", "Wedge of " + degreesText);
    tile.appendChild(dial);

    tile.appendChild(makeElement("h2", "game-name", game.name));
    // Minecraft's slider is a percentage on a curve; its stored yaw is the value at 100%.
    const atWhat = game.calc_type === "minecraft" ? " at 100%" : "";
    tile.appendChild(makeElement("p", "game-turn", "Turns " + degreesText + " per 1,000 mouse counts" + atWhat));
    tile.appendChild(makeElement("p", "game-yaw", "Yaw " + game.yaw));

    if (game.notes) {
        tile.appendChild(makeElement("p", "game-notes", game.notes));
    }

    const link = makeElement("a", "game-link", "Convert from " + game.name);
    // encodeURIComponent makes names with spaces safe inside an address.
    link.href = "index.html?from=" + encodeURIComponent(game.name);
    tile.appendChild(link);

    // Set the wedge size a moment after the tile is on the page,
    // so the CSS transition can sweep it open from 0.
    setTimeout(function () {
        dial.style.setProperty("--turn", degrees + "deg");
    }, 60);

    return tile;
}

async function loadShowcase() {
    const { data, error } = await db
        .from("games")
        .select("name, yaw, notes, calc_type")
        .order("name");

    // RLS blocking a read gives an EMPTY list, not an error, so check both.
    if (error || !data || data.length === 0) {
        console.error(error || "No games returned");
        statusMessage.textContent = "Could not load games. Please refresh and try again.";
        return;
    }

    data.forEach(function (game) {
        gameList.appendChild(buildGameTile(game));
    });

    statusMessage.textContent = data.length + " games supported so far.";
}

loadShowcase();
