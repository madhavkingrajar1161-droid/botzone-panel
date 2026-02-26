const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const botsDir = path.join(__dirname, "bots");
if (!fs.existsSync(botsDir)) fs.mkdirSync(botsDir);

const runningBots = {}; // store running processes

// ===== Multer storage (multi-file upload) =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { username, botname } = req.body;
    const botPath = path.join(botsDir, username, botname);
    fs.mkdirSync(botPath, { recursive: true });
    cb(null, botPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// ===== Status =====
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    port: PORT
  });
});

// ===== Upload bot (multiple files) =====
app.post("/upload", upload.array("botfiles", 10), (req, res) => {
  const { username, botname } = req.body;
  if (!username || !botname) return res.send("Missing username or botname");

  res.send(`Bot ${botname} uploaded successfully`);
});

// ===== List bots =====
app.get("/bots/:username", (req, res) => {
  const userPath = path.join(botsDir, req.params.username);
  if (!fs.existsSync(userPath)) return res.json([]);

  const bots = fs.readdirSync(userPath).map(bot => ({
    name: bot,
    running: !!runningBots[`${req.params.username}_${bot}`]
  }));

  res.json(bots);
});

// ===== Start bot =====
app.post("/start", (req, res) => {
  const { username, botname } = req.body;
  const botPath = path.join(botsDir, username, botname);

  if (!fs.existsSync(botPath)) return res.send("Bot not found");

  const key = `${username}_${botname}`;
  if (runningBots[key]) return res.send("Bot already running");

  console.log("Installing dependencies for", botname);

  const npmInstall = spawn("npm", ["install"], { cwd: botPath, shell: true });

  npmInstall.stdout.on("data", data => console.log(`[npm install] ${data}`));
  npmInstall.stderr.on("data", data => console.error(`[npm install error] ${data}`));

  npmInstall.on("close", () => {
    console.log("Starting bot:", botname);

    const botProcess = spawn("node", ["bot.js"], { cwd: botPath, shell: true });

    runningBots[key] = botProcess;

    botProcess.stdout.on("data", data => console.log(`[${botname}] ${data}`));
    botProcess.stderr.on("data", data => console.error(`[${botname} ERROR] ${data}`));

    botProcess.on("close", () => {
      console.log(`${botname} stopped`);
      delete runningBots[key];
    });

    res.send(`Bot ${botname} started`);
  });
});

// ===== Stop bot =====
app.post("/stop", (req, res) => {
  const { username, botname } = req.body;
  const key = `${username}_${botname}`;

  if (!runningBots[key]) return res.send("Bot is not running");

  runningBots[key].kill();
  delete runningBots[key];

  res.send(`Bot ${botname} stopped`);
});

// ===== Create file inside bot folder =====
app.post("/create-file", (req, res) => {
  const { username, botname, filename, content } = req.body;

  const filePath = path.join(botsDir, username, botname, filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  fs.writeFileSync(filePath, content || "");
  res.send("File created");
});

// ===== Get file =====
app.get("/get-file/:username/:botname/:filename", (req, res) => {
  const filePath = path.join(botsDir, req.params.username, req.params.botname, req.params.filename);
  if (!fs.existsSync(filePath)) return res.send("File not found");

  res.send(fs.readFileSync(filePath, "utf8"));
});

// ===== Edit file =====
app.post("/edit-file", (req, res) => {
  const { username, botname, filename, content } = req.body;
  const filePath = path.join(botsDir, username, botname, filename);

  fs.writeFileSync(filePath, content);
  res.send("File saved");
});

// ===== Server start =====
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ BotZone Panel running on port", PORT);
});