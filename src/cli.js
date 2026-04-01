const readline = require("readline");
const { loadState, saveState } = require("./game/state");
const { initializeCampaignState, handleCommand } = require("./game/session");

async function run() {
  const state = loadState();

  if (!state.campaign.eyeAwareness || state.campaign.eyeAwareness < 0) {
    initializeCampaignState(state);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "strider> ",
  });

  console.log("Strider Mode Solo RPG CLI");
  console.log("Type help for commands. Type intro to begin narrative play.");
  rl.prompt();

  rl.on("line", async (line) => {
    try {
      const out = await handleCommand(state, line);
      if (out === "__QUIT__") {
        saveState(state);
        console.log("Game saved. Farewell, traveler.");
        rl.close();
        return;
      }
      console.log(out);
      saveState(state);
      rl.prompt();
    } catch (err) {
      console.error("An error occurred:", err.message);
      saveState(state);
      rl.prompt();
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });
}

run();
