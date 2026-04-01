const fs = require("fs");
const path = require("path");
const { generateMission } = require("./missions");

const SAVE_PATH = path.resolve(process.cwd(), "savegame.json");

function createNewState() {
  return {
    hero: {
      name: "Strider",
      culture: "Ranger of the North",
      valour: 1,
      wisdom: 1,
      attributes: {
        strength: 6,
        heart: 5,
        wits: 7,
      },
      skills: {
        travel: 2,
        explore: 2,
        awareness: 2,
        hunting: 2,
        stealth: 2,
        battle: 1,
        courtesy: 1,
        persuade: 1,
        insight: 1,
      },
      endurance: {
        current: 26,
        max: 26,
      },
      hope: {
        current: 11,
        max: 11,
      },
      shadow: 0,
      fatigue: 0,
      weary: false,
      miserable: false,
      wounded: false,
      milestones: {
        adventurePoints: 0,
        skillPoints: 0,
      },
      famousItemsCarried: 0,
      highElf: false,
    },
    campaign: {
      year: 2965,
      season: "Autumn",
      region: "wild",
      safeHaven: "Bree",
      eyeAwareness: 0,
      mission: generateMission(),
      log: [],
    },
  };
}

function loadState() {
  if (!fs.existsSync(SAVE_PATH)) {
    const state = createNewState();
    saveState(state);
    return state;
  }
  const raw = fs.readFileSync(SAVE_PATH, "utf-8");
  return JSON.parse(raw);
}

function saveState(state) {
  fs.writeFileSync(SAVE_PATH, JSON.stringify(state, null, 2));
}

function appendLog(state, text) {
  state.campaign.log.push(text);
  if (state.campaign.log.length > 120) {
    state.campaign.log = state.campaign.log.slice(-120);
  }
}

module.exports = {
  SAVE_PATH,
  createNewState,
  loadState,
  saveState,
  appendLog,
};
