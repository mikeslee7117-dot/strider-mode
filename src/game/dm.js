const { randomInt, pickOne } = require("./rng");
const { narrate } = require("./narrator");
const { advanceMission } = require("./missions");
const {
  calculateSoloTargetNumber,
  applyEyeAwarenessIncrease,
  huntThreshold,
  checkRevelationEpisode,
  revelationEpisodeFromFeat,
} = require("../engine/striderEngine");
const { appendLog } = require("./state");

const INTENT_SKILLS = [
  { words: ["track", "hunt", "trail", "follow"], skill: "hunting" },
  { words: ["sneak", "hide", "creep", "shadow"], skill: "stealth" },
  { words: ["fight", "attack", "strike", "duel"], skill: "battle" },
  { words: ["travel", "road", "journey", "cross"], skill: "travel" },
  { words: ["search", "scout", "look", "find"], skill: "awareness" },
  { words: ["speak", "parley", "convince", "plead"], skill: "courtesy" },
  { words: ["judge", "read", "sense", "discern"], skill: "insight" },
  { words: ["explore", "ruin", "path", "ford"], skill: "explore" },
];

const STRENGTH_SKILLS = new Set(["awe", "athletics", "awareness", "hunting", "song", "craft", "battle"]);
const HEART_SKILLS = new Set(["enhearten", "travel", "insight", "healing", "courtesy"]);

function ensureDmState(state) {
  if (!state.campaign.dm) {
    state.campaign.dm = {
      turn: 0,
      lastSummary: "",
    };
  }
}

function skillAttribute(skillName) {
  const skill = String(skillName || "").toLowerCase();
  if (STRENGTH_SKILLS.has(skill)) return "strength";
  if (HEART_SKILLS.has(skill)) return "heart";
  return "wits";
}

function featText(v) {
  if (v === 11) return "Gandalf Rune";
  if (v === 0) return "Eye of Sauron";
  return String(v);
}

function chooseSkillForAction(actionText) {
  const t = String(actionText || "").toLowerCase();
  for (const rule of INTENT_SKILLS) {
    for (const word of rule.words) {
      if (t.includes(word)) return rule.skill;
    }
  }
  return pickOne(["travel", "explore", "awareness", "insight"]);
}

function rollFeat() {
  return randomInt(0, 11);
}

function rollSuccessDie() {
  return randomInt(1, 6);
}

function rollAction(state, skill) {
  const rank = state.hero.skills[skill] || 0;
  const attr = skillAttribute(skill);
  const attrScore = state.hero.attributes[attr] || 5;
  const tn = calculateSoloTargetNumber(attrScore);

  const feat = rollFeat();
  const successDice = [];
  let icons = 0;
  let sum = 0;

  for (let i = 0; i < rank; i += 1) {
    const d = rollSuccessDie();
    successDice.push(d);
    if (d === 6) icons += 1;
    if (state.hero.weary && d <= 3) continue;
    sum += d;
  }

  const total = sum + (feat === 0 || feat === 11 ? 0 : feat);
  const success = feat === 11 ? true : (state.hero.miserable && feat === 0 ? false : total >= tn);

  return {
    skill,
    attr,
    tn,
    feat,
    featLabel: featText(feat),
    successDice,
    icons,
    total,
    success,
  };
}

function applyConsequences(state, action, roll) {
  const outcomes = [];

  if (roll.feat === 0) {
    state.campaign.eyeAwareness = applyEyeAwarenessIncrease(state.campaign.eyeAwareness, 1);
    outcomes.push("The Eye draws nearer (+1 Eye Awareness).");
  }

  if (roll.success) {
    if (action.includes("rest") || action.includes("camp")) {
      state.hero.hope.current = Math.min(state.hero.hope.max, state.hero.hope.current + 1);
      state.hero.fatigue = Math.max(0, state.hero.fatigue - 1);
      outcomes.push("You recover: +1 Hope and -1 Fatigue.");
    }

    if (randomInt(1, 100) <= 40) {
      advanceMission(state.campaign.mission);
      outcomes.push("You make mission progress.");
      if (state.campaign.mission.completed) {
        state.hero.milestones.adventurePoints += 1;
        state.hero.milestones.skillPoints += 1;
        outcomes.push("Mission completed: +1 AP, +1 SP.");
      }
    }
  } else {
    const enduranceLoss = randomInt(1, 3);
    state.hero.endurance.current = Math.max(0, state.hero.endurance.current - enduranceLoss);
    outcomes.push(`Setback: lose ${enduranceLoss} Endurance.`);

    if (randomInt(1, 100) <= 35) {
      state.hero.shadow += 1;
      state.hero.miserable = state.hero.shadow >= state.hero.hope.current;
      outcomes.push("Shadow rises by 1.");
    }
  }

  state.hero.weary = state.hero.endurance.current <= state.hero.fatigue;
  return outcomes;
}

function checkRevelation(state) {
  const threshold = huntThreshold(state.campaign.region, 0);
  const hit = checkRevelationEpisode({ eyeAwareness: state.campaign.eyeAwareness, threshold });
  if (!hit.revealed) return null;

  const episode = revelationEpisodeFromFeat(rollFeat());
  state.campaign.eyeAwareness = 0;
  return episode;
}

function buildNextOptions(state, action, roll) {
  const options = [];
  const mission = state.campaign.mission;

  if (!mission.completed) {
    options.push(`Press on toward ${mission.location} to advance your mission.`);
  }

  if (roll.success) {
    options.push("Use this momentum to scout ahead before danger regroups.");
  } else {
    options.push("Regain control with a cautious, low-risk approach.");
  }

  if (action.includes("fight") || action.includes("attack") || action.includes("orc")) {
    options.push("Shift position and prepare either an ambush or a retreat.");
  } else {
    options.push("Approach someone nearby and seek rumor, guidance, or shelter.");
  }

  while (options.length < 3) {
    options.push("Pause to rest, watch, and decide your next move.");
  }

  return options.slice(0, 3);
}

async function runDmTurn(state, actionText) {
  ensureDmState(state);

  const action = String(actionText || "").trim();
  if (!action) {
    return {
      output: "Describe what your hero does.",
      prompt: "Try actions like: I scout the ridge for Orc tracks.",
    };
  }

  const skill = chooseSkillForAction(action);
  const roll = rollAction(state, skill);
  const outcomes = applyConsequences(state, action.toLowerCase(), roll);
  const revelation = checkRevelation(state);

  state.campaign.dm.turn += 1;

  const mechanicalSummary = [
    `DM Turn ${state.campaign.dm.turn}`,
    `Action adjudicated with ${skill.toUpperCase()} (${roll.attr.toUpperCase()} TN ${roll.tn}).`,
    `Feat: ${roll.featLabel} | Success dice: [${roll.successDice.join(", ")}] | Total: ${roll.total}`,
    `Outcome: ${roll.success ? "SUCCESS" : "FAILURE"}`,
    ...outcomes,
    revelation ? `Revelation Episode: ${revelation.text}` : "",
  ].filter(Boolean).join("\n");

  const narrativePrompt = [
    `Hero action: ${action}`,
    `Result: ${roll.success ? "success" : "failure"}.`,
    `Current region: ${state.campaign.region}.`,
    `Mission: ${state.campaign.mission.objective} at ${state.campaign.mission.location}.`,
    outcomes.length ? `Consequences: ${outcomes.join(" ")}` : "",
    revelation ? `Ominous turn: ${revelation.text}` : "",
    "Narrate what the hero now sees, hears, and senses in the immediate scene.",
    "Keep it immersive and concrete. Do not mention rules, dice, or mechanics.",
  ].filter(Boolean).join("\n");

  const narration = await narrate("dm_turn", state, narrativePrompt);
  state.campaign.dm.lastSummary = mechanicalSummary;
  appendLog(state, `DM TURN ${state.campaign.dm.turn}: ${action}`);

  const nextOptions = buildNextOptions(state, action.toLowerCase(), roll);

  const playerPrompt = [
    "What do you do?",
    `1) ${nextOptions[0]}`,
    `2) ${nextOptions[1]}`,
    `3) ${nextOptions[2]}`,
    "Or describe any other action in your own words.",
  ].join("\n");

  return {
    output: `${narration}\n\n${playerPrompt}`,
    roll,
    outcomes,
    revelation: revelation ? revelation.text : null,
  };
}

module.exports = {
  ensureDmState,
  runDmTurn,
};
