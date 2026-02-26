const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ensure folders exist
if (!fs.existsSync("bots")) fs.mkdirSync("bots");
if (!fs.existsSync("users.json")) fs.writeFileSync("users.json", "[]");

// storage for bots
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "bots"),
  filename: (req, file, cb) => cb(null, uuidv4() + "-" + file.originalname)
});
const upload = multer({ storage });

// routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync("users.json"));

  if (users.find(u => u.username === username)) {
    return res.send("User already exists");
  }
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    app: "BotZone Panel",
    time: new Date().toISOString()
  });
});
  
  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed });
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

  fs.mkdirSync(`bots/${username}`, { recursive: true });

  res.redirect("/login.html");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync("users.json"));

  const user = users.find(u => u.username === username);
  if (!user) return res.send("User not found");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.send("Wrong password");

  res.redirect("/dashboard.html");
});

app.post("/upload", upload.single("botfile"), (req, res) => {
  res.send("Bot uploaded successfully");
});

app.listen(PORT, () => {
  console.log("BotZone Panel running on port " + PORT);
});
