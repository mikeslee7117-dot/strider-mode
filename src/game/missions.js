const { pickOne, randomInt } = require("./rng");

const patrons = [
  "Balin, son of Fundin",
  "Bilbo Baggins",
  "Cirdan the Shipwright",
  "Gandalf the Grey",
  "Gilraen, daughter of Dirhael",
  "Tom Bombadil and Lady Goldberry",
];

const objectives = [
  "recover a lost relic",
  "escort a messenger through dangerous lands",
  "track an Orc scout band",
  "secure a hidden refuge",
  "investigate a corrupted ruin",
  "deliver secret counsel to an ally",
];

const locations = [
  "the North Downs",
  "the Trollshaws",
  "the Weather Hills",
  "the South Downs",
  "the old roads near Tharbad",
  "the eaves of Moria",
  "a shadowed vale in the Lone-lands",
];

const stakes = [
  "before the Enemy's spies report your movements",
  "before winter closes the pass",
  "before villagers are taken",
  "before the trail vanishes",
  "before a rival company claims the prize",
  "before the Eye of Mordor turns toward your safe haven",
];

function generateMission() {
  const stepsRequired = randomInt(2, 4);
  return {
    patron: pickOne(patrons),
    objective: pickOne(objectives),
    location: pickOne(locations),
    urgency: pickOne(stakes),
    progress: 0,
    stepsRequired,
    completed: false,
  };
}

function advanceMission(mission) {
  if (!mission || mission.completed) return mission;
  mission.progress += 1;
  if (mission.progress >= mission.stepsRequired) {
    mission.completed = true;
  }
  return mission;
}

module.exports = {
  generateMission,
  advanceMission,
};
