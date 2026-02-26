const express = require("express");
const fs = require("fs");
const multer = require("multer");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static("public"));

if (!fs.existsSync("bots")) fs.mkdirSync("bots");

const USERS_FILE = "./users.json";

let runningBots = {};
let botLogs = {};

// ---------- USER FUNCTIONS ----------
function loadUsers(){
  if(!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}
function saveUsers(users){
  fs.writeFileSync(USERS_FILE, JSON.stringify(users,null,2));
}

// ---------- STATUS ----------
app.get("/status",(req,res)=>{
  res.json({status:"online",port:PORT});
});

// ---------- REGISTER ----------
app.post("/register",(req,res)=>{
  const {username,password}=req.body;
  let users = loadUsers();

  if(users.find(u=>u.username===username))
    return res.send("User exists");

  users.push({username,password,admin:false});
  saveUsers(users);

  fs.mkdirSync(`bots/${username}`,{recursive:true});
  res.send("Registered");
});

// ---------- LOGIN ----------
app.post("/login",(req,res)=>{
  const {username,password}=req.body;
  const users = loadUsers();

  const user = users.find(u=>u.username===username && u.password===password);
  if(!user) return res.send("Invalid");

  if(user.admin) return res.send("Admin");
  res.send("User");
});

// ---------- ADMIN: LIST USERS ----------
app.get("/admin/users",(req,res)=>{
  const users = loadUsers();
  res.json(users);
});

// ---------- ADMIN: DELETE USER ----------
app.post("/admin/deleteUser",(req,res)=>{
  const {username}=req.body;
  let users = loadUsers();

  users = users.filter(u=>u.username!==username);
  saveUsers(users);

  if(fs.existsSync(`bots/${username}`))
    fs.rmSync(`bots/${username}`,{recursive:true,force:true});

  res.send("Deleted");
});

// ---------- UPLOAD FILES ----------
const storage = multer.diskStorage({
  destination:(req,file,cb)=>{
    const dir=`bots/${req.body.user}/${req.body.bot}`;
    fs.mkdirSync(dir,{recursive:true});
    cb(null,dir);
  },
  filename:(req,file,cb)=>cb(null,file.originalname)
});
const upload = multer({storage});

app.post("/upload",upload.array("files"),(req,res)=>{
  res.send("Uploaded");
});

// ---------- LIST BOTS ----------
app.get("/bots/:user",(req,res)=>{
  const dir=`bots/${req.params.user}`;
  if(!fs.existsSync(dir)) return res.json([]);
  res.json(fs.readdirSync(dir));
});

// ---------- START BOT ----------
app.post("/start",(req,res)=>{
  const {user,bot}=req.body;
  const path=`bots/${user}/${bot}/index.js`;

  if(!fs.existsSync(path)) return res.send("No index.js");

  if(runningBots[bot]) return res.send("Already running");

  const proc = spawn("node",[path]);
  runningBots[bot]=proc;
  botLogs[bot]="";

  proc.stdout.on("data",d=>botLogs[bot]+=d.toString());
  proc.stderr.on("data",d=>botLogs[bot]+=d.toString());
  proc.on("close",()=>delete runningBots[bot]);

  res.send("Started");
});

// ---------- STOP BOT ----------
app.post("/stop",(req,res)=>{
  const {bot}=req.body;
  if(!runningBots[bot]) return res.send("Not running");

  runningBots[bot].kill();
  delete runningBots[bot];
  res.send("Stopped");
});

// ---------- LOGS ----------
app.get("/logs/:bot",(req,res)=>{
  res.send(botLogs[req.params.bot]||"");
});

// ---------- ADMIN: DELETE BOT ----------
app.post("/admin/deleteBot",(req,res)=>{
  const {user,bot}=req.body;
  const dir=`bots/${user}/${bot}`;

  if(fs.existsSync(dir))
    fs.rmSync(dir,{recursive:true,force:true});

  res.send("Bot deleted");
});

// ---------- START SERVER ----------
app.listen(PORT,()=>{
  console.log("BotZone Hosting Panel running on port "+PORT);
});