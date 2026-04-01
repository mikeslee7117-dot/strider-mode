const { randomInt } = require("./rng");

const actions = [
  "Aid", "Attack", "Defend", "Discover", "Explore", "Guard",
  "Journey", "Learn", "Persist", "Search", "Strengthen", "Withstand"
];

const aspects = [
  "Ancient", "Corrupted", "Dangerous", "Forgotten", "Hidden", "Ill-fated",
  "Mysterious", "Noble", "Ominous", "Ruined", "Twisted", "Wondrous"
];

const focuses = [
  "Battle", "Border", "Council", "Darkness", "Enemy", "Fellowship",
  "Journey", "Knowledge", "Peril", "Refuge", "Shadow", "Treasure"
];

function rollLorePrompt() {
  return {
    action: actions[randomInt(0, actions.length - 1)],
    aspect: aspects[randomInt(0, aspects.length - 1)],
    focus: focuses[randomInt(0, focuses.length - 1)],
  };
}

module.exports = {
  rollLorePrompt,
};
