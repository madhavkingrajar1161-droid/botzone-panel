const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 8080;

// Admin username
const ADMIN_USERNAME = "admin";

// Memory storage (resets on redeploy)
let users = [];

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// صفحات
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public/register.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

// Status
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    users: users.length,
    port: PORT
  });
});

// Register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) return res.send("Missing fields");

  const exists = users.find(u => u.username === username);
  if (exists) return res.send("User already exists");

  const hashed = await bcrypt.hash(password, 10);

  users.push({
    username,
    password: hashed,
    isAdmin: username === ADMIN_USERNAME
  });

  console.log("Registered:", username);
  res.redirect("/login");
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) return res.send("User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.send("Wrong password");

  console.log("Logged in:", username);

  if (user.isAdmin) return res.redirect("/admin");
  res.redirect("/dashboard");
});

// Admin APIs
app.get("/admin/users", (req, res) => {
  res.json(users);
});

app.post("/admin/delete", (req, res) => {
  const { username } = req.body;
  users = users.filter(u => u.username !== username);
  console.log("Deleted:", username);
  res.redirect("/admin");
});

// 404
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

// Start
app.listen(PORT, () => {
  console.log("=================================");
  console.log(" BotZone Panel Running");
  console.log(" Port:", PORT);
  console.log("=================================");
});