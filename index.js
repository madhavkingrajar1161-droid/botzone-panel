const express = require("express");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

let botProcess = null;

app.use(express.static("public"));

app.get("/start", (req, res) => {
  if (botProcess) return res.send("Bot is already running.");

  botProcess = spawn("node", ["bot.js"]);

  botProcess.stdout.on("data", data => {
    console.log(`[BOT]: ${data}`);
  });

  botProcess.stderr.on("data", data => {
    console.log(`[ERROR]: ${data}`);
  });

  botProcess.on("close", () => {
    botProcess = null;
    console.log("Bot stopped.");
  });

  res.send("Bot started successfully.");
});

app.get("/stop", (req, res) => {
  if (!botProcess) return res.send("Bot is not running.");

  botProcess.kill();
  botProcess = null;

  res.send("Bot stopped successfully.");
});

app.get("/status", (req, res) => {
  res.send(botProcess ? "Running" : "Stopped");
});

app.listen(PORT, () => {
  console.log(`BotZone Panel running on port ${PORT}`);
});
