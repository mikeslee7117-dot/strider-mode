const { randomInt, pickOne } = require("./rng");
const { randomThreat } = require("./content");

const STANCES = {
  forward: {
    hitBonus: 1,
    damageBonus: 1,
    incomingDamageMod: 1,
  },
  open: {
    hitBonus: 0,
    damageBonus: 0,
    incomingDamageMod: 0,
  },
  defensive: {
    hitBonus: -1,
    damageBonus: -1,
    incomingDamageMod: -1,
  },
  skirmish: {
    hitBonus: -1,
    damageBonus: 0,
    incomingDamageMod: -1,
  },
};

function templateForRegion(region) {
  const r = String(region || "wild").toLowerCase();
  if (r === "dark") {
    return [
      { name: "Great Orc Raider", endurance: 16, parry: 2, attack: 5, damage: 5, hate: 4 },
      { name: "Goblin Archer", endurance: 10, parry: 1, attack: 4, damage: 3, hate: 2 },
      { name: "Warg Hunter", endurance: 12, parry: 1, attack: 4, damage: 4, hate: 3 },
    ];
  }
  if (r === "border") {
    return [
      { name: "Ruffian Chief", endurance: 10, parry: 1, attack: 3, damage: 3, hate: 2 },
      { name: "Highway Robber", endurance: 8, parry: 0, attack: 3, damage: 3, hate: 1 },
      { name: "Footpad", endurance: 6, parry: 0, attack: 2, damage: 2, hate: 1 },
    ];
  }
  return [
    { name: "Orc Soldier", endurance: 10, parry: 1, attack: 3, damage: 3, hate: 2 },
    { name: "Goblin Sneak", endurance: 8, parry: 0, attack: 3, damage: 2, hate: 1 },
    { name: "Wild Wolf", endurance: 9, parry: 0, attack: 3, damage: 3, hate: 2 },
  ];
}

function foeCountByDifficulty(difficulty) {
  const d = String(difficulty || "normal").toLowerCase();
  if (d === "easy") return randomInt(1, 2);
  if (d === "hard") return randomInt(3, 4);
  return randomInt(2, 3);
}

function createEncounter(region, difficulty) {
  const templates = templateForRegion(region);
  const count = foeCountByDifficulty(difficulty);
  const foes = [];

  for (let i = 0; i < count; i += 1) {
    const t = { ...pickOne(templates) };
    const threatFlavor = randomThreat();
    foes.push({
      id: `foe_${Date.now()}_${i}`,
      name: `${t.name} (${threatFlavor})`,
      endurance: t.endurance,
      maxEndurance: t.endurance,
      parry: t.parry,
      attack: t.attack,
      damage: t.damage,
      hate: t.hate,
      alive: true,
    });
  }

  return {
    active: true,
    round: 1,
    difficulty: difficulty || "normal",
    region,
    heroStance: "open",
    foes,
    log: [],
    escaped: false,
    won: false,
    lost: false,
  };
}

function listAliveFoes(encounter) {
  return encounter.foes.filter((f) => f.alive);
}

function setStance(encounter, stance) {
  const s = String(stance || "").toLowerCase();
  if (!STANCES[s]) return false;
  encounter.heroStance = s;
  return true;
}

function heroAttack({ encounter, hero, attackRoll }) {
  const alive = listAliveFoes(encounter);
  if (alive.length === 0) return { text: "No foes remain." };

  const target = alive[0];
  const stance = STANCES[encounter.heroStance] || STANCES.open;
  const hitTarget = 12 + target.parry;

  const hitScore = attackRoll.total + stance.hitBonus;
  if (!attackRoll.success || hitScore < hitTarget) {
    return {
      hit: false,
      text: `You strike at ${target.name}, but fail to land a telling blow.`,
    };
  }

  const baseDamage = 4 + hero.valour + attackRoll.icons;
  const damage = Math.max(1, baseDamage + stance.damageBonus);
  target.endurance -= damage;
  if (target.endurance <= 0) {
    target.endurance = 0;
    target.alive = false;
  }

  return {
    hit: true,
    targetId: target.id,
    damage,
    killed: !target.alive,
    text: !target.alive
      ? `Your blow fells ${target.name}.`
      : `You wound ${target.name} for ${damage} endurance.`,
  };
}

function foeAttackHero({ encounter, hero }) {
  const stance = STANCES[encounter.heroStance] || STANCES.open;
  const alive = listAliveFoes(encounter);
  const events = [];
  const heroDefense = 11 + hero.valour + (encounter.heroStance === "defensive" ? 1 : 0);

  for (const foe of alive) {
    let roll = randomInt(1, 12) + foe.attack;

    if (foe.hate > 0 && randomInt(1, 100) <= 25) {
      foe.hate -= 1;
      roll += 2;
    }

    if (roll >= heroDefense) {
      const rawDamage = foe.damage + randomInt(0, 2) + stance.incomingDamageMod;
      const damage = Math.max(1, rawDamage);
      hero.endurance.current -= damage;
      events.push(`${foe.name} hits you for ${damage}.`);
    } else {
      events.push(`${foe.name} misses.`);
    }
  }

  if (hero.endurance.current <= 0) {
    hero.endurance.current = 0;
    encounter.lost = true;
    encounter.active = false;
  }

  if (listAliveFoes(encounter).length === 0) {
    encounter.won = true;
    encounter.active = false;
  }

  return events;
}

function fleeAttempt({ encounter, hero, roll }) {
  const stance = encounter.heroStance;
  let threshold = 14;
  if (stance === "skirmish") threshold = 11;
  if (stance === "defensive") threshold = 15;

  if (roll.success && roll.total >= threshold) {
    encounter.escaped = true;
    encounter.active = false;
    return { escaped: true, text: "You break from the melee and escape into the wild." };
  }

  const damage = randomInt(1, 4);
  hero.endurance.current = Math.max(0, hero.endurance.current - damage);
  if (hero.endurance.current === 0) {
    encounter.lost = true;
    encounter.active = false;
    return { escaped: false, text: "You are cut down while attempting to flee." };
  }

  return { escaped: false, text: `You fail to disengage and suffer ${damage} damage.` };
}

module.exports = {
  STANCES,
  createEncounter,
  setStance,
  heroAttack,
  foeAttackHero,
  fleeAttempt,
  listAliveFoes,
};
