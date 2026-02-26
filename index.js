const express = require("express");
const fs = require("fs");
const multer = require("multer");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static("public"));

if (!fs.existsSync("bots")) fs.mkdirSync("bots");

let runningBots = {};
let botLogs = {};

// ---------- STATUS ----------
app.get("/status", (req,res)=>{
  res.json({status:"online", port:PORT});
});

// ---------- UPLOAD ----------
const storage = multer.diskStorage({
  destination: (req,file,cb)=>{
    const user = req.body.username;
    const dir = `bots/${user}`;
    if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
    cb(null, dir);
  },
  filename: (req,file,cb)=>{
    cb(null,file.originalname);
  }
});
const upload = multer({storage});

app.post("/upload", upload.array("files"), (req,res)=>{
  res.send("Uploaded");
});

// ---------- LIST BOTS ----------
app.get("/bots/:user",(req,res)=>{
  const dir = `bots/${req.params.user}`;
  if(!fs.existsSync(dir)) return res.json([]);
  res.json(fs.readdirSync(dir));
});

// ---------- START BOT ----------
app.post("/start",(req,res)=>{
  const {user,file} = req.body;
  const path = `bots/${user}/${file}`;

  if(!fs.existsSync(path)) return res.send("File not found");
  if(runningBots[file]) return res.send("Already running");

  const proc = spawn("node",[path]);
  runningBots[file] = proc;
  botLogs[file] = "";

  proc.stdout.on("data",data=>{
    botLogs[file] += data.toString();
  });
  proc.stderr.on("data",data=>{
    botLogs[file] += data.toString();
  });
  proc.on("close",()=>{
    delete runningBots[file];
  });

  res.send("Started");
});

// ---------- STOP BOT ----------
app.post("/stop",(req,res)=>{
  const {file} = req.body;
  if(!runningBots[file]) return res.send("Not running");

  runningBots[file].kill();
  delete runningBots[file];
  res.send("Stopped");
});

// ---------- LOGS ----------
app.get("/logs/:file",(req,res)=>{
  res.send(botLogs[req.params.file] || "");
});

// ---------- START SERVER ----------
app.listen(PORT,()=>{
  console.log("BotZone Panel running on port "+PORT);
});