const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Ensure folders/files exist
if (!fs.existsSync("users.json")) fs.writeFileSync("users.json", "[]");
if (!fs.existsSync("bots")) fs.mkdirSync("bots");

// Multer storage for bot uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "bots"),
  filename: (req, file, cb) => cb(null, uuidv4() + "-" + file.originalname)
});
const upload = multer({ storage });

// Home
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

// Status
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
  if (users.find(u => u.username === username)) return res.send("User already exists");

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

  res.redirect("/dashboard.html");
});

// Upload bot
app.post("/upload", upload.single("botfile"), (req, res) => {
  if (!req.file) return res.send("No file uploaded");
  res.send("Bot uploaded successfully");
});

// Start server
app.listen(PORT, () => {
  console.log("==================================");
  console.log("BotZone Panel is running");
  console.log("Listening on PORT:", PORT);
  console.log("==================================");
});
