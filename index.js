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
app.get("/status",(req,res)=>{
  res.json({status:"online",port:PORT});
});

// ---------- CREATE BOT ----------
app.post("/createBot",(req,res)=>{
  const {user,bot} = req.body;
  const dir = `bots/${user}/${bot}`;
  if(fs.existsSync(dir)) return res.send("Bot already exists");
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(`${dir}/index.js`,`console.log("Bot started");`);
  res.send("Created");
});

// ---------- UPLOAD FILES ----------
const storage = multer.diskStorage({
  destination:(req,file,cb)=>{
    const dir=`bots/${req.body.user}/${req.body.bot}`;
    if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
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

// ---------- LIST FILES ----------
app.get("/files/:user/:bot",(req,res)=>{
  const dir=`bots/${req.params.user}/${req.params.bot}`;
  if(!fs.existsSync(dir)) return res.json([]);
  res.json(fs.readdirSync(dir));
});

// ---------- READ FILE ----------
app.get("/file/:user/:bot/:file",(req,res)=>{
  const path=`bots/${req.params.user}/${req.params.bot}/${req.params.file}`;
  res.send(fs.readFileSync(path,"utf8"));
});

// ---------- SAVE FILE ----------
app.post("/saveFile",(req,res)=>{
  const {user,bot,file,content}=req.body;
  fs.writeFileSync(`bots/${user}/${bot}/${file}`,content);
  res.send("Saved");
});

// ---------- START BOT ----------
app.post("/start",(req,res