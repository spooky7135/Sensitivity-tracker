// Run with: npm test
const test = require("node:test");
const assert = require("node:assert");

const { filterGames } = require("../site/game-search.js");

const NAMES = [
    "Apex Legends",
    "Black Mesa",
    "Call of Duty: Black Ops 6",
    "Call of Duty: Modern Warfare (2019)",
    "Call of Duty: Warzone",
    "Escape from Tarkov",
    "Valorant",
    "Wolfenstein: Enemy Territory"
];

// filterGames returns positions in NAMES, so turn them back into names to read the tests.
function namesFor(query) {
    return filterGames(NAMES, query).map(function (i) { return NAMES[i]; });
}

test("empty search shows every game in order", function () {
    assert.deepStrictEqual(namesFor(""), NAMES);
    assert.deepStrictEqual(namesFor("   "), NAMES);
});

test("names that start with the text come first", function () {
    assert.deepStrictEqual(namesFor("e"), ["Escape from Tarkov", "Wolfenstein: Enemy Territory"]);
});

test("then names with a later word that starts with the text", function () {
    assert.deepStrictEqual(namesFor("black"), ["Black Mesa", "Call of Duty: Black Ops 6"]);
});

test("search ignores upper and lower case", function () {
    assert.deepStrictEqual(namesFor("CALL"), [
        "Call of Duty: Black Ops 6",
        "Call of Duty: Modern Warfare (2019)",
        "Call of Duty: Warzone"
    ]);
});

test("words after a colon or inside brackets count", function () {
    assert.deepStrictEqual(namesFor("warzone"), ["Call of Duty: Warzone"]);
    assert.deepStrictEqual(namesFor("2019"), ["Call of Duty: Modern Warfare (2019)"]);
});

test("text in the middle of a word does not match", function () {
    assert.deepStrictEqual(namesFor("lor"), []);
});

test("several words match from the start of the name", function () {
    assert.deepStrictEqual(namesFor("call of duty: w"), ["Call of Duty: Warzone"]);
});

test("no match gives an empty list", function () {
    assert.deepStrictEqual(namesFor("zzz"), []);
});
