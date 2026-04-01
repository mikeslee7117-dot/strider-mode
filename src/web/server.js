const http = require("http");
const fs = require("fs");
const path = require("path");
const { loadState, saveState } = require("../game/state");
const { initializeCampaignState, handleCommand } = require("../game/session");
const { runDmTurn, ensureDmState } = require("../game/dm");

const PORT = Number(process.env.PORT || 3030);
const PUBLIC_DIR = path.join(__dirname, "public");

const state = loadState();
if (!state.campaign.eyeAwareness || state.campaign.eyeAwareness < 0) {
  initializeCampaignState(state);
  saveState(state);
}
ensureDmState(state);

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8") || "{}";
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "text/plain; charset=utf-8";
}

function serveStatic(req, res) {
  const reqPath = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(reqPath).replace(/^\.\.(\/|\\|$)/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/state") {
      sendJson(res, 200, {
        hero: state.hero,
        campaign: {
          year: state.campaign.year,
          season: state.campaign.season,
          region: state.campaign.region,
          safeHaven: state.campaign.safeHaven,
          eyeAwareness: state.campaign.eyeAwareness,
          mission: state.campaign.mission,
          combat: state.campaign.combat || null,
          dm: state.campaign.dm || null,
          lastLog: state.campaign.log.slice(-16),
        },
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/play") {
      const body = await readJsonBody(req);
      const action = String(body.action || "").trim();
      if (!action) {
        sendJson(res, 400, { error: "Missing action" });
        return;
      }

      const result = await runDmTurn(state, action);
      saveState(state);
      sendJson(res, 200, {
        output: result.output,
        hero: state.hero,
        campaign: {
          region: state.campaign.region,
          eyeAwareness: state.campaign.eyeAwareness,
          mission: state.campaign.mission,
          combat: state.campaign.combat || null,
          dm: state.campaign.dm || null,
        },
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/command") {
      const body = await readJsonBody(req);
      const command = String(body.command || "").trim();
      if (!command) {
        sendJson(res, 400, { error: "Missing command" });
        return;
      }

      const output = await handleCommand(state, command);
      if (output === "__QUIT__") {
        saveState(state);
        sendJson(res, 200, {
          output: "Game saved. Farewell, traveler.",
          quit: true,
        });
        return;
      }

      saveState(state);
      sendJson(res, 200, {
        output,
        quit: false,
        hero: state.hero,
        campaign: {
          region: state.campaign.region,
          eyeAwareness: state.campaign.eyeAwareness,
          mission: state.campaign.mission,
          combat: state.campaign.combat || null,
        },
      });
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }

    res.writeHead(405);
    res.end("Method not allowed");
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Strider web server running at http://localhost:${PORT}`);
});
