const { randomInt, pickOne } = require("./rng");
const { rollLorePrompt } = require("./loreTable");
const { narrate } = require("./narrator");
const { advanceMission, generateMission } = require("./missions");
const {
  calculateSoloTargetNumber,
  calculateStartingEyeAwareness,
  huntThreshold,
  applyEyeAwarenessIncrease,
  checkRevelationEpisode,
  rollTellingTable,
  soloJourneyEventFromFeat,
  revelationEpisodeFromFeat,
} = require("../engine/striderEngine");
const { appendLog } = require("./state");

const STRENGTH_SKILLS = new Set(["awe", "athletics", "awareness", "hunting", "song", "craft", "battle"]);
const HEART_SKILLS = new Set(["enhearten", "travel", "insight", "healing", "courtesy"]);

const RISK_LABELS = {
  standard: "Standard",
  hazardous: "Hazardous",
  foolish: "Foolish",
};

function skillAttribute(skillName) {
  const s = String(skillName || "").toLowerCase();
  if (STRENGTH_SKILLS.has(s)) return "strength";
  if (HEART_SKILLS.has(s)) return "heart";
  return "wits";
}

function featLabel(value) {
  if (value === 11) return "Gandalf Rune";
  if (value === 0) return "Eye of Sauron";
  return String(value);
}

function rollFeatDie() {
  return randomInt(0, 11);
}

function rollSuccessDie() {
  return randomInt(1, 6);
}

function chooseFeat({ favoured, illFavoured }) {
  if ((favoured && illFavoured) || (!favoured && !illFavoured)) {
    return rollFeatDie();
  }
  const a = rollFeatDie();
  const b = rollFeatDie();
  if (favoured) return Math.max(a, b);
  return Math.min(a, b);
}

function rollSkill(state, skillName, options = {}) {
  const skill = String(skillName || "").toLowerCase();
  const rank = state.hero.skills[skill] || 0;
  const attr = skillAttribute(skill);
  const attrScore = state.hero.attributes[attr] || 5;
  const tn = calculateSoloTargetNumber(attrScore);

  const feat = chooseFeat({ favoured: !!options.favoured, illFavoured: !!options.illFavoured });
  const bonusDice = options.bonusDice || 0;
  const diceCount = Math.max(0, rank + bonusDice);
  const successDice = [];
  let icons = 0;
  let successSum = 0;

  for (let i = 0; i < diceCount; i += 1) {
    const d = rollSuccessDie();
    successDice.push(d);
    if (d === 6) icons += 1;

    if (state.hero.weary && d <= 3) {
      continue;
    }
    successSum += d;
  }

  const total = successSum + (feat === 0 || feat === 11 ? 0 : feat);
  let success;

  if (state.hero.miserable && feat === 0) {
    success = false;
  } else if (feat === 11) {
    success = true;
  } else {
    success = total >= tn;
  }

  const degree = success ? (icons >= 2 ? "extraordinary" : icons === 1 ? "great" : "success") : "failure";

  return {
    skill,
    rank,
    attr,
    tn,
    feat,
    featText: featLabel(feat),
    successDice,
    icons,
    total,
    success,
    degree,
  };
}

function applyShadow(state, amount) {
  if (amount <= 0) return;
  state.hero.shadow += amount;
  state.campaign.eyeAwareness = applyEyeAwarenessIncrease(state.campaign.eyeAwareness, amount);
  state.hero.miserable = state.hero.shadow >= state.hero.hope.current;
}

function setupEyeAwareness(state) {
  const starting = calculateStartingEyeAwareness({
    valour: state.hero.valour,
    culture: state.hero.culture,
    hasHighElfCulture: !!state.hero.highElf,
    famousItemsCarried: state.hero.famousItemsCarried || 0,
  });
  state.campaign.eyeAwareness = starting;
}

function checkAndApplyRevelation(state) {
  const threshold = huntThreshold(state.campaign.region, 0);
  const result = checkRevelationEpisode({
    eyeAwareness: state.campaign.eyeAwareness,
    threshold,
  });
  if (!result.revealed) return null;

  const episode = revelationEpisodeFromFeat(rollFeatDie());
  setupEyeAwareness(state);
  return episode;
}

function journeyEventSkill(eventKey) {
  const map = {
    terrible_misfortune: ["awareness", "explore", "hunting"],
    despair: ["awareness", "explore", "hunting"],
    ill_choices: ["explore", "hunting", "awareness"],
    mishap: ["explore", "hunting", "awareness"],
    short_cut: ["explore", "awareness", "hunting"],
    chance_meeting: ["awareness", "explore", "hunting"],
    joyful_sight: ["awareness", "explore", "hunting"],
  };
  return pickOne(map[eventKey] || ["travel"]);
}

async function handleCommand(state, input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "Type help to see commands.";

  const [cmdRaw, ...rest] = trimmed.split(" ");
  const cmd = cmdRaw.toLowerCase();

  if (cmd === "help") {
    return [
      "Commands:",
      "  intro                         - opening scene",
      "  status                        - character + campaign state",
      "  mission                       - current patron mission",
      "  advance                       - advance mission progress",
      "  roll <skill> [risk]           - make a Strider skill roll",
      "  tell <chance> <question>      - ask the Telling Table",
      "  lore                          - generate a Lore Table prompt",
      "  travel <border|wild|dark>     - trigger a solo journey event",
      "  narrate <free text>           - request AI narration",
      "  rest                          - recover 1 Hope, reduce fatigue by 1",
      "  newmission                    - generate a new mission",
      "  quit                          - save and exit",
    ].join("\n");
  }

  if (cmd === "intro") {
    const text = await narrate("intro", state, "Begin the solo tale in Middle-earth.");
    appendLog(state, `INTRO: ${text}`);
    return text;
  }

  if (cmd === "status") {
    const mission = state.campaign.mission;
    return [
      `Hero: ${state.hero.name} (${state.hero.culture})`,
      `Endurance: ${state.hero.endurance.current}/${state.hero.endurance.max}`,
      `Hope: ${state.hero.hope.current}/${state.hero.hope.max}`,
      `Shadow: ${state.hero.shadow} | Fatigue: ${state.hero.fatigue}`,
      `Conditions: weary=${state.hero.weary} miserable=${state.hero.miserable} wounded=${state.hero.wounded}`,
      `Region: ${state.campaign.region} | Safe Haven: ${state.campaign.safeHaven}`,
      `Eye Awareness: ${state.campaign.eyeAwareness}`,
      `Mission: ${mission.objective} at ${mission.location} (${mission.progress}/${mission.stepsRequired})`,
      `Milestones: AP=${state.hero.milestones.adventurePoints} SP=${state.hero.milestones.skillPoints}`,
    ].join("\n");
  }

  if (cmd === "mission") {
    const m = state.campaign.mission;
    return [
      `Patron: ${m.patron}`,
      `Objective: ${m.objective}`,
      `Location: ${m.location}`,
      `Urgency: ${m.urgency}`,
      `Progress: ${m.progress}/${m.stepsRequired}${m.completed ? " (COMPLETED)" : ""}`,
    ].join("\n");
  }

  if (cmd === "newmission") {
    state.campaign.mission = generateMission();
    appendLog(state, `NEW MISSION: ${state.campaign.mission.objective}`);
    return "A new mission is set before you.";
  }

  if (cmd === "advance") {
    advanceMission(state.campaign.mission);
    if (state.campaign.mission.completed) {
      state.hero.milestones.adventurePoints += 1;
      state.hero.milestones.skillPoints += 1;
      const text = await narrate("mission_progress", state, "You have completed your patron mission.");
      appendLog(state, `MISSION COMPLETE: ${state.campaign.mission.objective}`);
      return `${text}\nMilestone gained: +1 Adventure Point, +1 Skill Point.`;
    }
    const text = await narrate("mission_progress", state, "You make meaningful progress on your mission.");
    appendLog(state, `MISSION ADVANCE: ${state.campaign.mission.progress}/${state.campaign.mission.stepsRequired}`);
    return text;
  }

  if (cmd === "roll") {
    const skill = (rest[0] || "").toLowerCase();
    if (!skill) return "Usage: roll <skill> [standard|hazardous|foolish]";

    const risk = (rest[1] || "standard").toLowerCase();
    const roll = rollSkill(state, skill);

    if (roll.feat === 0) {
      state.campaign.eyeAwareness = applyEyeAwarenessIncrease(state.campaign.eyeAwareness, 1);
    }

    let extra = "";
    if (risk === "hazardous" && !roll.success) {
      extra = "\nFailure with Woe: add a severe complication.";
    } else if (risk === "foolish" && !roll.success) {
      extra = "\nDisaster: the worst plausible consequence occurs.";
    } else if (risk === "standard" && !roll.success) {
      extra = "\nStandard failure: fail plainly, or succeed with woe if dramatically appropriate.";
    }

    const revelation = checkAndApplyRevelation(state);
    if (revelation) {
      extra += `\nREVELATION EPISODE: ${revelation.text}`;
      appendLog(state, `REVELATION: ${revelation.text}`);
    }

    appendLog(state, `ROLL ${skill.toUpperCase()}: ${roll.success ? "success" : "failure"}, feat=${roll.featText}`);
    return [
      `Skill: ${skill} (${roll.attr.toUpperCase()} TN ${roll.tn})`,
      `Feat: ${roll.featText} | Success dice: [${roll.successDice.join(", ")}] | Icons: ${roll.icons}`,
      `Total: ${roll.total} | Outcome: ${roll.success ? "SUCCESS" : "FAILURE"} (${roll.degree})`,
      `Risk: ${RISK_LABELS[risk] || "Standard"}`,
      extra.trim(),
    ].filter(Boolean).join("\n");
  }

  if (cmd === "tell") {
    const chance = (rest[0] || "middling").toLowerCase();
    const question = rest.slice(1).join(" ") || "Unstated question";
    const feat = rollFeatDie();
    const result = rollTellingTable({ chance, featResult: feat });
    appendLog(state, `TELL ${chance}: ${question} => ${result.yes ? "yes" : "no"}`);
    return [
      `Question: ${question}`,
      `Chance: ${chance}`,
      `Feat: ${featLabel(feat)}`,
      `Answer: ${result.yes ? "YES" : "NO"}${result.twist ? " (with twist)" : ""}`,
    ].join("\n");
  }

  if (cmd === "lore") {
    const r = rollLorePrompt();
    appendLog(state, `LORE: ${r.action} / ${r.aspect} / ${r.focus}`);
    return `Lore prompt: ${r.action} - ${r.aspect} - ${r.focus}`;
  }

  if (cmd === "travel") {
    const region = (rest[0] || "wild").toLowerCase();
    if (!["border", "wild", "dark"].includes(region)) {
      return "Usage: travel <border|wild|dark>";
    }

    state.campaign.region = region;

    const feat = rollFeatDie();
    const event = soloJourneyEventFromFeat(feat);
    const skill = journeyEventSkill(event.key);
    const roll = rollSkill(state, skill);
    state.hero.fatigue += event.fatigue;

    let consequence = "";
    if (!roll.success && event.fail) {
      consequence = `Consequence (failed): ${event.fail}`;
      if (event.fail.includes("shadow")) {
        const gain = event.fail.includes("gain_2") ? 2 : 1;
        applyShadow(state, gain);
      }
      if (event.fail.includes("wounded")) {
        state.hero.wounded = true;
      }
    } else if (roll.success && event.success) {
      consequence = `Consequence (success): ${event.success}`;
      if (event.success.includes("regain_1_hope")) {
        state.hero.hope.current = Math.min(state.hero.hope.max, state.hero.hope.current + 1);
      }
      if (event.success.includes("minus_1_day_journey")) {
        advanceMission(state.campaign.mission);
      }
    }

    if (roll.feat === 0) {
      state.campaign.eyeAwareness = applyEyeAwarenessIncrease(state.campaign.eyeAwareness, 1);
    }

    const revelation = checkAndApplyRevelation(state);
    if (revelation) {
      appendLog(state, `REVELATION: ${revelation.text}`);
    }

    const flavor = await narrate("journey_event", state, `${event.key} while travelling in ${region} lands.`);
    appendLog(state, `TRAVEL ${region}: ${event.key}`);

    return [
      flavor,
      `Journey event: ${event.key}`,
      `Feat: ${featLabel(feat)} | Skill tested: ${skill}`,
      `Roll outcome: ${roll.success ? "SUCCESS" : "FAILURE"}`,
      consequence,
      revelation ? `REVELATION EPISODE: ${revelation.text}` : "",
      `Fatigue now: ${state.hero.fatigue}`,
    ].filter(Boolean).join("\n");
  }

  if (cmd === "narrate") {
    const contextText = rest.join(" ");
    if (!contextText) return "Usage: narrate <free text scene/action>";
    const text = await narrate("action", state, contextText);
    appendLog(state, `NARRATE: ${contextText}`);
    return text;
  }

  if (cmd === "rest") {
    state.hero.hope.current = Math.min(state.hero.hope.max, state.hero.hope.current + 1);
    state.hero.fatigue = Math.max(0, state.hero.fatigue - 1);
    state.hero.weary = state.hero.endurance.current <= state.hero.fatigue;
    appendLog(state, "REST");
    return "You rest by firelight. Hope rises by 1 and Fatigue drops by 1.";
  }

  if (cmd === "quit" || cmd === "exit") {
    return "__QUIT__";
  }

  return "Unknown command. Type help to list commands.";
}

function initializeCampaignState(state) {
  setupEyeAwareness(state);
}

module.exports = {
  initializeCampaignState,
  handleCommand,
};
