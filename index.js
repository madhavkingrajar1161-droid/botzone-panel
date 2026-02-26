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

// ================= FOLDERS =================
const botsDir = path.join(__dirname, "bots");
if (!fs.existsSync(botsDir)) fs.mkdirSync(botsDir);

// ================= USERS =================
const usersFile = path.join(__dirname, "users.json");
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));

function loadUsers() {
  return JSON.parse(fs.readFileSync(usersFile, "utf8"));
}
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// ================= RUNNING BOTS =================
const runningBots = {};

// ================= MULTER =================
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

// ================= STATUS =================
app.get("/status", (req, res) => {
  res.json({ status: "online", port: PORT });
});

// ================= REGISTER =================
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.send("Missing username or password");

  const users = loadUsers();
  if (users.find(u => u.username === username)) return res.send("User already exists");

  users.push({ username, password });
  saveUsers(users);

  fs.mkdirSync(path.join(botsDir, username), { recursive: true });

  res.send("Registered successfully");
});

// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.send("Invalid username or password");

  res.send("Login successful");
});

// ================= UPLOAD BOT (MULTI FILE) =================
app.post("/upload", upload.array("botfiles", 10), (req, res) => {
  const { username, botname } = req.body;
  if (!username || !botname) return res.send("Missing username or botname");

  res.send(`Bot ${botname} uploaded successfully`);
});

// ================= LIST BOTS =================
app.get("/bots/:username", (req, res) => {
  const userPath = path.join(botsDir, req.params.username);
  if (!fs.existsSync(userPath)) return res.json([]);

  const bots = fs.readdirSync(userPath).map(bot => ({
    name: bot,
    running: !!runningBots[`${req.params.username}_${bot}`]
  }));

  res.json(bots);
});

// ================= START BOT =================
app.post("/start", (req, res) => {
  const { username, botname } = req.body;
  const botPath = path.join(botsDir, username, botname);
  const key = `${username}_${botname}`;

  if (!fs.existsSync(botPath)) return res.send("Bot not found");
  if (runningBots[key]) return res.send("Bot already running");

  console.log("Installing dependencies for", botname);

  const npmInstall = spawn("npm", ["install"], { cwd: botPath, shell: true });

  npmInstall.stdout.on("data", d => console.log(`[npm] ${d}`));
  npmInstall.stderr.on("data", d => console.error(`[npm ERROR] ${d}`));

  npmInstall.on("close", () => {
    console.log("Starting bot:", botname);

    const botProcess = spawn("node", ["bot.js"], { cwd: botPath, shell: true });

    runningBots[key] = botProcess;

    botProcess.stdout.on("data", d => console.log(`[${botname}] ${d}`));
    botProcess.stderr.on("data", d => console.error(`[${botname} ERROR] ${d}`));

    botProcess.on("close", () => {
      console.log(`${botname} stopped`);
      delete runningBots[key];
    });

    res.send(`Bot ${botname} started`);
  });
});

// ================= STOP BOT =================
app.post("/stop", (req, res) => {
  const { username, botname } = req.body;
  const key = `${username}_${botname}`;

  if (!runningBots[key]) return res.send("Bot is not running");

  runningBots[key].kill();
  delete runningBots[key];

  res.send(`Bot ${botname} stopped`);
});

// ================= CREATE FILE =================
app.post("/create-file", (req, res) => {
  const { username, botname, filename, content } = req.body;
  const filePath = path.join(botsDir, username, botname, filename);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content || "");

  res.send("File created");
});

// ================= GET FILE =================
app.get("/get-file/:username/:botname/:filename", (req, res) => {
  const filePath = path.join(botsDir, req.params.username, req.params.botname, req.params.filename);
  if (!fs.existsSync(filePath)) return res.send("File not found");

  res.send(fs.readFileSync(filePath, "utf8"));
});

// ================= EDIT FILE =================
app.post("/edit-file", (req, res) => {
  const { username, botname, filename, content } = req.body;
  const filePath = path.join(botsDir, username, botname, filename);

  if (!fs.existsSync(filePath)) return res.send("File not found");

  fs.writeFileSync(filePath, content);
  res.send("File saved");
});

// ================= SERVER =================
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ BotZone Panel running on port", PORT);
});