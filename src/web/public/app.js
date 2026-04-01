const outputEl = document.getElementById("output");
const formEl = document.getElementById("command-form");
const inputEl = document.getElementById("command-input");
const cardsEl = document.getElementById("state-cards");

function appendEntry(kind, text) {
  const div = document.createElement("div");
  div.className = `entry ${kind}`;

  const label = document.createElement("span");
  label.className = "entry-label";
  label.textContent = kind === "user" ? "You" : "Middle-earth";

  const body = document.createElement("div");
  body.textContent = text;

  div.appendChild(label);
  div.appendChild(body);
  outputEl.appendChild(div);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function renderStateCards(payload) {
  const hero = payload.hero;
  const campaign = payload.campaign;
  const mission = campaign.mission || {};

  const cards = [
    {
      title: "Hero",
      text: `${hero.name} | Endurance ${hero.endurance.current}/${hero.endurance.max} | Hope ${hero.hope.current}/${hero.hope.max}`,
    },
    {
      title: "Burden",
      text: `Shadow ${hero.shadow} | Fatigue ${hero.fatigue} | Weary ${hero.weary ? "yes" : "no"}`,
    },
    {
      title: "Campaign",
      text: `${campaign.season || "-"} ${campaign.year || "-"} | Region ${campaign.region} | Eye ${campaign.eyeAwareness}`,
    },
    {
      title: "Mission",
      text: `${mission.objective || "-"} @ ${mission.location || "-"} (${mission.progress || 0}/${mission.stepsRequired || 0})`,
    },
    {
      title: "Combat",
      text: campaign.combat && campaign.combat.active
        ? `Round ${campaign.combat.round} | Foes ${campaign.combat.foes.filter((f) => f.alive).length}`
        : "No active combat",
    },
  ];

  cardsEl.innerHTML = "";
  for (const card of cards) {
    const wrapper = document.createElement("div");
    wrapper.className = "card";
    const title = document.createElement("h3");
    title.textContent = card.title;
    const text = document.createElement("p");
    text.textContent = card.text;
    wrapper.appendChild(title);
    wrapper.appendChild(text);
    cardsEl.appendChild(wrapper);
  }
}

async function fetchState() {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error("Unable to load game state");
  const data = await res.json();
  renderStateCards(data);
  appendEntry("system", "The DM is ready. Describe what you do in plain language. Use /help for command mode.");
}

async function sendCommand(command) {
  const res = await fetch("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });

  const data = await res.json();
  if (!res.ok) {
    appendEntry("system", `Error: ${data.error || "unknown"}`);
    return;
  }

  appendEntry("system", data.output || "(No output)");
  if (data.hero && data.campaign) {
    renderStateCards(data);
  }
}

async function sendPlay(action) {
  const res = await fetch("/api/play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });

  const data = await res.json();
  if (!res.ok) {
    appendEntry("system", `Error: ${data.error || "unknown"}`);
    return;
  }

  appendEntry("system", data.output || "(No output)");
  if (data.hero && data.campaign) {
    renderStateCards(data);
  }
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const command = inputEl.value.trim();
  if (!command) return;

  appendEntry("user", command);
  inputEl.value = "";

  try {
    if (command.startsWith("/")) {
      await sendCommand(command.slice(1));
    } else {
      await sendPlay(command);
    }
  } catch (err) {
    appendEntry("system", `Error: ${err.message}`);
  }
});

fetchState().catch((err) => {
  appendEntry("system", `Error: ${err.message}`);
});
