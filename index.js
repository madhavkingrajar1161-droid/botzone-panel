const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Ensure folders/files exist
if (!fs.existsSync("users.json")) fs.writeFileSync("users.json", "[]");
if (!fs.existsSync("bots")) fs.mkdirSync("bots");

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const user = req.body.username;
    const userPath = path.join("bots", user);
    if (!fs.existsSync(userPath)) fs.mkdirSync(userPath, { recursive: true });
    cb(null, userPath);
  },
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Keep track of running bots
const runningBots = {}; // { username_botname: child_process }

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "public/dashboard.html")));
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    app: "BotZone Panel",
    port: PORT,
    time: new Date().toISOString()
  });
});

// Register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.send("Missing fields");

  const users = JSON.parse(fs.readFileSync("users.json"));
  if (users.find(u => u.username === username)) return res.send("User exists");

  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash });
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

  fs.mkdirSync(`bots/${username}`, { recursive: true });
  res.send("Registered successfully");
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync("users.json"));
  const user = users.find(u => u.username === username);

  if (!user) return res.send("User not found");
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.send("Wrong password");

  res.redirect(`/dashboard.html?user=${username}`);
});

// Upload bot
app.post("/upload", upload.single("botfile"), (req, res) => {
  if (!req.file) return res.send("No file uploaded");
  res.send("Bot uploaded successfully");
});

// Get user bots (AJAX)
app.get("/bots/:username", (req, res) => {
  const userPath = path.join("bots", req.params.username);
  if (!fs.existsSync(userPath)) return res.json([]);
  const bots = fs.readdirSync(userPath);
  const botStatus = bots.map(bot => ({
    name: bot,
    running: runningBots[`${req.params.username}_${bot}`] ? true : false
  }));
  res.json(botStatus);
});

// Start bot
app.post("/start", (req, res) => {
  const { username, botname } = req.body;
  const botPath = path.join(__dirname, "bots", username, botname);
  if (!fs.existsSync(botPath)) return res.send("Bot not found");
  const key = `${username}_${botname}`;
  if (runningBots[key]) return res.send("Bot already running");

  const child = spawn("node", [botPath], { stdio: "ignore", detached: true });
  child.unref();
  runningBots[key] = child;
  res.send("Bot started");
});

// Stop bot
app.post("/stop", (req, res) => {
  const { username, botname } = req.body;
  const key = `${username}_${botname}`;
  const child = runningBots[key];
  if (!child) return res.send("Bot not running");

  process.kill(-child.pid);
  delete runningBots[key];
  res.send("Bot stopped");
});

app.listen(PORT, () => {
  console.log("==================================");
  console.log("BotZone Panel is running");
  console.log("Listening on PORT:", PORT);
  console.log("==================================");
});
