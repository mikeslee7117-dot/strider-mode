// Strider Mode helper engine for The One Ring 2E solo play.
// This module is system-agnostic and can be used by a CLI, web app, or API layer.

const REGION_HUNT_THRESHOLD = {
  border: 18,
  wild: 16,
  dark: 14,
};

const TELLING_MIN = {
  certain: 1,
  likely: 4,
  middling: 6,
  doubtful: 8,
  unthinkable: 10,
};

const REVELATION_EPISODES = [
  "Internal strife or an external threat puts your Safe Haven in peril.",
  "Unexpected danger arises on the path ahead, forcing you to seek a new route.",
  "Nature is corrupted and turns against you.",
  "Spies of the Enemy carry word of your mission.",
  "Enemy minions launch an ambush or lay a trap.",
  "Enemy minions pick up your trail.",
  "An important location is overtaken by an enemy.",
  "An item you carry holds a curse, or is hunted by an enemy.",
  "You are tempted by something greatly desired, to the detriment of your mission.",
  "Malicious lies cause others to mistrust or fear you.",
  "Conflict brews between allies.",
  "An important ally is put in danger.",
];

const SOLO_JOURNEY_EVENTS = {
  0: { key: "terrible_misfortune", fatigue: 3, fail: "wounded" }, // Eye icon
  1: { key: "despair", fatigue: 2, fail: "gain_2_shadow_dread" },
  2: { key: "ill_choices", fatigue: 2, fail: "gain_1_shadow_dread" },
  3: { key: "ill_choices", fatigue: 2, fail: "gain_1_shadow_dread" },
  4: { key: "mishap", fatigue: 2, fail: "plus_1_day_journey_plus_1_fatigue" },
  5: { key: "mishap", fatigue: 2, fail: "plus_1_day_journey_plus_1_fatigue" },
  6: { key: "mishap", fatigue: 2, fail: "plus_1_day_journey_plus_1_fatigue" },
  7: { key: "mishap", fatigue: 2, fail: "plus_1_day_journey_plus_1_fatigue" },
  8: { key: "short_cut", fatigue: 1, success: "minus_1_day_journey" },
  9: { key: "short_cut", fatigue: 1, success: "minus_1_day_journey" },
  10: { key: "chance_meeting", fatigue: 1, success: "no_fatigue_and_favorable_encounter" },
  11: { key: "joyful_sight", fatigue: 0, success: "regain_1_hope" }, // Gandalf rune
};

// Feat die normalization used by this module:
// 0 = Eye of Sauron, 1..10 = numeric results, 11 = Gandalf rune
export function normalizeFeatResult(result) {
  if (result < 0 || result > 11) {
    throw new Error("Feat die result must be in range 0..11");
  }
  return result;
}

export function calculateSoloTargetNumber(attributeScore) {
  return 18 - attributeScore;
}

export function calculateStartingEyeAwareness({
  valour,
  culture,
  hasHighElfCulture = false,
  famousItemsCarried = 0,
}) {
  let score = 0;
  if (valour >= 4) score += 1;

  const c = String(culture || "").toLowerCase();
  if (c.includes("dwarf")) score += 1;
  if (c.includes("elf") || c.includes("dunedain") || c.includes("ranger")) score += 2;
  if (hasHighElfCulture) score += 3;

  score += Math.max(0, famousItemsCarried);
  return score;
}

export function huntThreshold(region, modifier = 0) {
  const base = REGION_HUNT_THRESHOLD[String(region).toLowerCase()];
  if (typeof base !== "number") {
    throw new Error("Region must be one of: border, wild, dark");
  }
  return base + modifier;
}

export function applyEyeAwarenessIncrease(current, delta) {
  return Math.max(0, current + delta);
}

export function checkRevelationEpisode({ eyeAwareness, threshold }) {
  if (eyeAwareness < threshold) {
    return { revealed: false };
  }
  return {
    revealed: true,
    instruction: "Trigger a Revelation Episode and reset Eye Awareness to starting value.",
  };
}

export function rollTellingTable({ chance, featResult }) {
  const f = normalizeFeatResult(featResult);

  if (f === 11) return { yes: true, twist: true, reason: "gandalf_rune" };
  if (f === 0) return { yes: false, twist: true, reason: "eye_of_sauron" };

  const min = TELLING_MIN[String(chance).toLowerCase()];
  if (!min) {
    throw new Error("Chance must be one of: certain, likely, middling, doubtful, unthinkable");
  }

  return { yes: f >= min, twist: false };
}

export function soloJourneyEventFromFeat(featResult) {
  const f = normalizeFeatResult(featResult);
  const event = SOLO_JOURNEY_EVENTS[f];
  if (!event) throw new Error("Invalid feat result");
  return event;
}

export function revelationEpisodeFromFeat(featResult) {
  const f = normalizeFeatResult(featResult);
  const index = f === 11 ? 11 : f === 0 ? 0 : Math.min(10, Math.max(1, f));
  return {
    index,
    text: REVELATION_EPISODES[index],
  };
}

export function skirmishStanceModifiers() {
  return {
    yourRangedAttacks: -1,
    incomingMeleeAgainstYou: -1,
    incomingRangedAgainstYou: 0,
    canOnlyUseRangedWeapons: true,
    escapeRule: "On successful ranged attack (without skirmish penalty), leave combat and deal no damage.",
    task: "gain_ground",
  };
}
