const express = require("express");
const fs = require("fs");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { spawn } = require("child_process");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const upload = multer({ dest: "bots/" });
let bots = {};
let users = JSON.parse(fs.readFileSync("users.json"));

function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

app.post("/register", async (req,res)=>{
  const { username, password } = req.body;
  if(users.find(u=>u.username===username)) return res.send("User exists");
  const hash = await bcrypt.hash(password,10);
  users.push({username,password:hash});
  saveUsers();
  res.send("Registered");
});

app.post("/login",(req,res)=>{
  const { username, password } = req.body;
  const user = users.find(u=>u.username===username);
  if(!user) return res.send("Invalid user");
  bcrypt.compare(password,user.password,(err,ok)=>{
    if(ok) res.send("OK");
    else res.send("Wrong password");
  });
});

app.post("/upload", upload.single("bot"), (req,res)=>{
  res.send("Bot uploaded");
});

app.get("/start/:name",(req,res)=>{
  const name = req.params.name;
  if(bots[name]) return res.send("Already running");

  const bot = spawn("node", [`bots/${name}`]);
  bots[name] = bot;

  bot.stdout.on("data", data=>{
    io.emit("log", data.toString());
  });

  bot.stderr.on("data", data=>{
    io.emit("log", data.toString());
  });

  bot.on("close", ()=>{
    delete bots[name];
  });

  res.send("Bot started");
});

app.get("/stop/:name",(req,res)=>{
  if(!bots[req.params.name]) return res.send("Not running");
  bots[req.params.name].kill();
  delete bots[req.params.name];
  res.send("Bot stopped");
});

io.on("connection",()=>{
  console.log("User connected to console");
});

server.listen(process.env.PORT || 3000, ()=>{
  console.log("BotZone Panel running");
});
