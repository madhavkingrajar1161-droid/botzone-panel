// Dashboard JS with Edit feature
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('user') || 'guest';

const panelStatus = document.getElementById('panelStatus');
const botList = document.getElementById('botList');
const uploadForm = document.getElementById('uploadForm');
const createFileForm = document.getElementById('createFileForm');
const newFileNameInput = document.getElementById('newFileName');
const newFileContentInput = document.getElementById('newFileContent');
const usernameInput = document.getElementById('usernameInput');

const editSection = document.querySelector('.edit-file');
const editingFileNameSpan = document.getElementById('editingFileName');
const editFileContent = document.getElementById('editFileContent');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

usernameInput.value = username;
let currentEditingFile = null;

// Panel Status
function loadPanelStatus() {
  fetch('/status').then(res => res.json()).then(data => {
    panelStatus.textContent = `Panel Status: ${data.status}, Port: ${data.port}`;
  });
}

// Load Bots
function loadBots() {
  fetch(`/bots/${username}`)
    .then(res => res.json())
    .then(bots => {
      botList.innerHTML = '';
      if (bots.length === 0) { botList.innerHTML = '<li>No bots uploaded yet.</li>'; return; }

      bots.forEach(bot => {
        const li = document.createElement('li');
        li.className = 'bot-card';
        li.innerHTML = `
          <span>${bot.name}</span>
          <span>
            <button onclick="startBot('${bot.name}')">Start</button>
            <button onclick="stopBot('${bot.name}')">Stop</button>
            <button onclick="editBot('${bot.name}')">Edit</button>
            <span class="bot-status">${bot.running ? 'Running' : 'Stopped'}</span>
          </span>
        `;
        botList.appendChild(li);
      });
    });
}

// Start / Stop Bot
function startBot(botname) {
  fetch('/start', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username, botname}) })
    .then(res=>res.text()).then(msg=>{ alert(msg); loadBots(); });
}

function stopBot(botname) {
  fetch('/stop', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username, botname}) })
    .then(res=>res.text()).then(msg=>{ alert(msg); loadBots(); });
}

// Upload Bot
uploadForm.addEventListener('submit', function(e){
  e.preventDefault();
  const formData = new FormData(this);
  formData.append('username', username);
  fetch('/upload', { method:'POST', body:formData }).then(res=>res.text()).then(msg=>{
    alert(msg); loadBots();
  });
});

// Create new file
createFileForm.addEventListener('submit', function(e){
  e.preventDefault();
  const filename = newFileNameInput.value.trim();
  const content = newFileContentInput.value;
  if(!filename) return alert('Enter a filename with .js extension');
  fetch('/create-file', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username, filename, content}) })
    .then(res=>res.text()).then(msg=>{
      alert(msg); newFileNameInput.value=''; newFileContentInput.value='';
      loadBots();
    });
});

// ====== Edit Feature ======
function editBot(filename){
  currentEditingFile = filename;
  editingFileNameSpan.textContent = filename;
  // Fetch file content
  fetch(`/get-file/${username}/${filename}`)
    .then(res=>res.text())
    .then(content=>{
      editFileContent.value = content;
      editSection.style.display='block';
      window.scrollTo(0, document.body.scrollHeight);
    });
}

saveEditBtn.addEventListener('click', ()=>{
  if(!currentEditingFile) return;
  const content = editFileContent.value;
  fetch('/edit-file', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username, filename: currentEditingFile, content}) })
    .then(res=>res.text()).then(msg=>{
      alert(msg);
      editSection.style.display='none';
      currentEditingFile = null;
      loadBots();
    });
});

cancelEditBtn.addEventListener('click', ()=>{
  editSection.style.display='none';
  currentEditingFile = null;
});

// Initial load
loadPanelStatus();
loadBots();
setInterval(loadPanelStatus, 10000);
