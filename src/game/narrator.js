const https = require("https");

function summarizeState(state) {
  const mission = state.campaign.mission;
  return {
    hero: state.hero.name,
    culture: state.hero.culture,
    hope: state.hero.hope,
    endurance: state.hero.endurance,
    shadow: state.hero.shadow,
    region: state.campaign.region,
    safeHaven: state.campaign.safeHaven,
    eyeAwareness: state.campaign.eyeAwareness,
    mission,
  };
}

function fallbackNarration(eventType, state, contextText) {
  const s = summarizeState(state);
  if (eventType === "intro") {
    return `The wind moves softly over ${s.safeHaven}. ${s.hero}, a ${s.culture}, feels the weight of the age. Your current charge is to ${s.mission.objective} near ${s.mission.location}, ${s.mission.urgency}.`;
  }
  if (eventType === "mission_progress") {
    return `You press onward in ${s.region} lands. Mission progress: ${s.mission.progress}/${s.mission.stepsRequired}. The Shadow does not sleep.`;
  }
  if (eventType === "journey_event") {
    return `On the road through ${s.region} lands, fate turns. ${contextText}`;
  }
  if (eventType === "action") {
    return `Your choice shapes the tale. ${contextText}`;
  }
  if (eventType === "dm_turn") {
    const lines = String(contextText || "").split("\n");
    const actionLine = lines.find((l) => l.startsWith("Hero action:")) || "";
    const resultLine = lines.find((l) => l.startsWith("Result:")) || "";
    const actionText = actionLine.replace("Hero action:", "").trim();
    const resultText = resultLine.replace("Result:", "").trim();
    const cleanResult = resultText.replace(/\.$/, "");
    const normalizedAction = actionText
      ? `${actionText.charAt(0).toUpperCase()}${actionText.slice(1)}`
      : "";
    const actionSentence = normalizedAction
      ? (/^i\s/i.test(normalizedAction)
          ? `${normalizedAction}.`
          : `You attempt to ${normalizedAction}.`)
      : "You move carefully, testing each choice against the long shadow.";

    return [
      `Mist gathers across the ${s.region} lands as ${s.hero} presses onward toward ${s.mission.location}.`,
      actionSentence,
      cleanResult ? `For now, fortune offers a ${cleanResult}.` : "For now, fate remains uncertain.",
      `Each step now may draw you closer to your goal, or closer to the Eye.`,
    ].join(" ");
  }
  if (eventType === "revelation") {
    return `A cold certainty settles over you: the Eye has turned your way. ${contextText}`;
  }
  return `${contextText}`;
}

function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) {
    return Promise.resolve(null);
  }

  const body = JSON.stringify({
    model,
    messages: [
      {
        role: "system",
        content: "You are a concise Tolkien-inspired RPG narrator. Keep tone atmospheric, grounded, and avoid modern slang.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.9,
    max_tokens: 220,
  });

  const options = {
    hostname: "api.openai.com",
    path: "/v1/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Authorization: `Bearer ${apiKey}`,
    },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const content =
            parsed &&
            parsed.choices &&
            parsed.choices[0] &&
            parsed.choices[0].message &&
            parsed.choices[0].message.content;
          resolve(content || null);
        } catch (err) {
          resolve(null);
        }
      });
    });

    req.on("error", () => resolve(null));
    req.write(body);
    req.end();
  });
}

async function narrate(eventType, state, contextText) {
  const fallback = fallbackNarration(eventType, state, contextText);
  const prompt = `Event: ${eventType}\nState: ${JSON.stringify(summarizeState(state))}\nContext: ${contextText}\nWrite 1-2 short paragraphs.`;
  const aiText = await callOpenAI(prompt);
  return aiText || fallback;
}

module.exports = {
  narrate,
};
