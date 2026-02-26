const express = require("express");
const fs = require("fs");
const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static("public"));

const USERS_FILE = "./users.json";

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// STATUS
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    port: PORT,
    time: new Date()
  });
});

// REGISTER
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  const users = loadUsers();

  if (users.find(u => u.username === username)) {
    return res.send("User already exists");
  }

  users.push({
    username,
    password,
    admin: false
  });

  saveUsers(users);
  res.send("Registered");
});

// LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) return res.send("Invalid login");

  if (user.admin) return res.send("Admin");

  res.send("User");
});

// START SERVER
app.listen(PORT, () => {
  console.log("BotZone Panel running on port " + PORT);
});