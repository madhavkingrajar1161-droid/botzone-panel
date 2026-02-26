const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();

// ===== CONFIG =====
const PORT = process.env.PORT || 8080;
const ADMIN_USERNAME = "admin"; // your admin username

// In-memory storage (resets on redeploy)
let users = [];

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ===== ROUTES =====

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Register page
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Admin panel
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Status
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    message: "BotZone Panel is running",
    port: PORT,
    users: users.length
  });
});

// ===== REGISTER =====
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.send("Missing username or password");

  const exists = users.find(u => u.username === username);
  if (exists) return res.send("User already exists");

  const hashed = await bcrypt.hash(password, 10);

  users.push({
    username,
    password: hashed,
    isAdmin: username === ADMIN_USERNAME
  });

  console.log("New user:", username);
  res.redirect("/login");
});

// ===== LOGIN =====
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) return res.send("User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.send("Wrong password");

  console.log("User logged in:", username);

  // Redirect admin to admin panel
  if (user.isAdmin) {
    return res.redirect("/admin");
  } else {
    return res.redirect("/dashboard");
  }
});

// ===== ADMIN API =====

// List users
app.get("/admin/users", (req, res) => {
  res.json(users);
});

// Delete user
app.post("/admin/delete", (req, res) => {
  const { username } = req.body;

  users = users.filter(u => u.username !== username);

  console.log("Deleted user:", username);
  res.redirect("/admin");
});

// ===== 404 =====
app.use((req, res) => {
  res.status(404).send("404 - Page not found");
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log("==============================");
  console.log(" BotZone Panel Running 🚀");
  console.log(" Port:", PORT);
  console.log("==============================");
});