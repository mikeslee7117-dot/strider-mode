const fs = require("fs");
const path = require("path");
const { pickOne } = require("./rng");

const SOURCE_FILES = [
  path.resolve(process.cwd(), "sourcebooks/lone_lands_extracted.txt"),
  path.resolve(process.cwd(), "sourcebooks/moria_extracted.txt"),
];

let cache = null;

const LOCATION_HINTS = [
  "Bree", "Weathertop", "North Downs", "South Downs", "Trollshaws", "Tharbad",
  "Moria", "Doors of Durin", "Redhorn Gate", "Chamber of Mazarbul", "Goblin Village",
  "Lone-lands", "Weather Hills", "Dimrill", "Rath Sereg", "Amon Guruthos", "Sennas Gaer",
  "Hidden Valley", "Haunted Isle", "Garth Tauron", "Vale of Gold",
];

const THREAT_HINTS = [
  "Orc", "Goblin", "Troll", "Warg", "Wight", "Balrog", "Spider", "Nameless", "Bandit",
  "Ruffian", "Wolves", "Watcher", "Drake", "Shadow", "Corrupted",
];

function readAllText() {
  let all = "";
  for (const fp of SOURCE_FILES) {
    if (fs.existsSync(fp)) {
      all += "\n" + fs.readFileSync(fp, "utf-8");
    }
  }
  return all;
}

function extractHeadings(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 4 || trimmed.length > 90) continue;
    if (!/[A-Za-z]/.test(trimmed)) continue;
    const isUpperish = trimmed === trimmed.toUpperCase();
    const isTitleish = /^[A-Z][A-Za-z0-9'\- ,:;&]+$/.test(trimmed);
    if (isUpperish || isTitleish) {
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        out.push(trimmed);
      }
    }
  }
  return out;
}

function buildPools() {
  if (cache) return cache;

  const text = readAllText();
  const headings = extractHeadings(text);

  const locations = new Set(LOCATION_HINTS);
  const threats = new Set(THREAT_HINTS);

  for (const h of headings) {
    const hl = h.toLowerCase();

    if (
      hl.includes("gate") ||
      hl.includes("hall") ||
      hl.includes("tower") ||
      hl.includes("valley") ||
      hl.includes("isle") ||
      hl.includes("road") ||
      hl.includes("downs") ||
      hl.includes("moria") ||
      hl.includes("tharbad") ||
      hl.includes("ruin") ||
      hl.includes("cave")
    ) {
      locations.add(h.replace(/\s+/g, " ").trim());
    }

    if (
      hl.includes("orc") ||
      hl.includes("goblin") ||
      hl.includes("troll") ||
      hl.includes("wight") ||
      hl.includes("balrog") ||
      hl.includes("spider") ||
      hl.includes("watcher") ||
      hl.includes("shadow")
    ) {
      threats.add(h.replace(/\s+/g, " ").trim());
    }
  }

  cache = {
    headings,
    locations: Array.from(locations),
    threats: Array.from(threats),
  };

  return cache;
}

function randomLocation() {
  const pools = buildPools();
  return pickOne(pools.locations);
}

function randomThreat() {
  const pools = buildPools();
  return pickOne(pools.threats);
}

function randomHeading() {
  const pools = buildPools();
  return pickOne(pools.headings);
}

module.exports = {
  buildPools,
  randomLocation,
  randomThreat,
  randomHeading,
};
