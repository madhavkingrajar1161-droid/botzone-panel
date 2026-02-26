const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 8080;

// In-memory users
let users = [];

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Pages
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

// REGISTER
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.send("Missing fields");
  }

  const exists = users.find(u => u.username === username);
  if (exists) {
    return res.send("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({
    username,
    password: hashedPassword,
    isAdmin: username === "admin" // admin username = admin
  });

  console.log("Registered:", username);

  // ✅ ALWAYS redirect to login
  return res.redirect("/login");
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.send("User not found");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.send("Wrong password");
  }

  console.log("Logged in:", username);

  // ✅ redirect correctly
  if (user.isAdmin) {
    return res.redirect("/admin");
  } else {
    return res.redirect("/dashboard");
  }
});

// Status
app.get("/status", (req, res) => {
  res.json({ status: "online", users: users.length });
});

// 404
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

app.listen(PORT, () => {
  console.log("BotZone Panel running on port", PORT);
});