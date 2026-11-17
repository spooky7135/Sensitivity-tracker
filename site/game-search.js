// ---------- GAME SEARCH ----------
// A typeable dropdown ("combobox") for picking a game, plus the rule that
// decides which games match what was typed.

// Characters that separate words in a game name: spaces, ":", brackets, etc.
const WORD_SEPARATOR = /[\s:()\-.,']/;

// True when "query" appears at the start of a word somewhere after the start.
// "warzone" matches "Call of Duty: Warzone", but "lor" does not match "Valorant".
function matchesLaterWord(name, query) {
    let i = name.indexOf(query, 1);
    while (i !== -1) {
        if (WORD_SEPARATOR.test(name[i - 1])) {
            return true;
        }
        i = name.indexOf(query, i + 1);
    }
    return false;
}

// Returns the positions (in "names") of the games that match, best first:
//   1. names that START with the typed text
//   2. names with a later word that starts with it
// Within each group the original (alphabetical) order is kept.
function filterGames(names, query) {
    const q = query.trim().toLowerCase();
    const allPositions = names.map(function (name, index) { return index; });
    if (q === "") {
        return allPositions;
    }

    const startMatches = [];
    const wordMatches = [];
    names.forEach(function (name, index) {
        const lower = name.toLowerCase();
        if (lower.startsWith(q)) {
            startMatches.push(index);
        } else if (matchesLaterWord(lower, q)) {
            wordMatches.push(index);
        }
    });
    return startMatches.concat(wordMatches);
}

// ---------- THE COMBOBOX ----------
// Connects a text input and a list to a hidden <select>.
// The <select> stays the "source of truth": the rest of the page keeps reading
// select.value, and picking a game here sets it and fires a "change" event.
//   getNames  a function returning the current list of game names
// Returns { sync }: call sync() after the select changes in code (e.g. Swap).
function createGameCombobox(select, input, list, getNames) {
    let shown = [];      // positions of the games currently in the list
    let active = -1;     // which row the arrow keys are on (-1 = none)

    function selectedName() {
        const names = getNames();
        return names[select.value] || "";
    }

    function close() {
        list.hidden = true;
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
        active = -1;
    }

    // Puts the chosen game's name in the box. Skipped while the list is open,
    // so it never overwrites what someone is in the middle of typing.
    function sync() {
        if (list.hidden) {
            input.value = selectedName();
        }
    }

    function choose(position) {
        const changed = String(position) !== select.value;
        select.value = position;
        input.value = getNames()[position];
        close();
        if (changed) {
            select.dispatchEvent(new Event("change"));
        }
    }

    function highlight(row) {
        const items = list.querySelectorAll("[role=option]");
        items.forEach(function (item, i) {
            item.classList.toggle("active", i === row);
        });
        active = row;
        if (row >= 0 && items[row]) {
            input.setAttribute("aria-activedescendant", items[row].id);
            items[row].scrollIntoView({ block: "nearest" });
        } else {
            input.removeAttribute("aria-activedescendant");
        }
    }

    // Builds one row. The typed part is bold when it is at the start of the name.
    function buildRow(position, query, rowNumber) {
        const name = getNames()[position];
        const item = document.createElement("li");
        item.id = list.id + "-option-" + rowNumber;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(String(position) === select.value));

        const q = query.trim();
        if (q && name.toLowerCase().startsWith(q.toLowerCase())) {
            const bold = document.createElement("strong");
            bold.textContent = name.slice(0, q.length);
            item.appendChild(bold);
            item.appendChild(document.createTextNode(name.slice(q.length)));
        } else {
            item.textContent = name;
        }

        // mousedown (not click) so it runs before the input loses focus.
        item.addEventListener("mousedown", function (event) {
            event.preventDefault();
            choose(position);
        });
        return item;
    }

    function open(query) {
        shown = filterGames(getNames(), query);
        list.innerHTML = "";

        if (shown.length === 0) {
            const empty = document.createElement("li");
            empty.className = "combobox-empty";
            empty.textContent = "No games found";
            list.appendChild(empty);
        } else {
            shown.forEach(function (position, rowNumber) {
                list.appendChild(buildRow(position, query, rowNumber));
            });
        }

        list.hidden = false;
        input.setAttribute("aria-expanded", "true");
        // While typing, the best match is ready for Enter.
        highlight(query.trim() && shown.length > 0 ? 0 : -1);
    }

    // Clicking or tabbing into the box shows every game, with the text selected
    // so typing replaces it.
    input.addEventListener("focus", function () {
        input.select();
        open("");
    });

    input.addEventListener("input", function () {
        open(input.value);
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (list.hidden) {
                open(input.value);
                return;
            }
            const step = event.key === "ArrowDown" ? 1 : -1;
            const next = Math.min(Math.max(active + step, 0), shown.length - 1);
            highlight(next);
        } else if (event.key === "Enter") {
            if (!list.hidden && active >= 0) {
                event.preventDefault();
                choose(shown[active]);
            }
        } else if (event.key === "Escape") {
            close();
            input.value = selectedName();
            input.select();
        }
    });

    // Leaving the box: keep a game that was typed out in full, otherwise
    // go back to the game that was already chosen.
    input.addEventListener("blur", function () {
        const typed = input.value.trim().toLowerCase();
        const names = getNames();
        const exact = names.findIndex(function (name) {
            return name.toLowerCase() === typed;
        });
        close();
        if (exact !== -1 && String(exact) !== select.value) {
            choose(exact);
        } else {
            input.value = selectedName();
        }
    });

    return { sync: sync };
}

// ---------- EXPORTS FOR THE TESTS ----------
if (typeof module !== "undefined") {
    module.exports = { filterGames };
}
