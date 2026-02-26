// ---------------------------
// Dashboard JS - Fixed version
// ---------------------------

// Get username from URL
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('user') || 'guest';

// DOM elements
const panelStatus = document.getElementById('panelStatus');
const botList = document.getElementById('botList');
const uploadForm = document.getElementById('uploadForm');
const createFileForm = document.getElementById('createFileForm');
const newFileNameInput = document.getElementById('newFileName');
const newFileContentInput = document.getElementById('newFileContent');
const usernameInput = document.getElementById('usernameInput');

usernameInput.value = username;

// ---------------------------
// Load Panel Status
// ---------------------------
function loadPanelStatus() {
  fetch('/status')
    .then(res => res.json())
    .then(data => {
      panelStatus.textContent = `Panel Status: ${data.status}, Port: ${data.port}`;
    });
}

// ---------------------------
// Load Bots for User
// ---------------------------
function loadBots() {
  fetch(`/bots/${username}`)
    .then(res => res.json())
    .then(bots => {
      botList.innerHTML = '';
      if(bots.length === 0) {
        botList.innerHTML = '<li>No bots uploaded yet.</li>';
        return;
      }

      bots.forEach(bot => {
        const li = document.createElement('li');
        li.className = 'bot-card';
        li.innerHTML = `
          <span>${bot.name}</span>
          <span>
            <button onclick="startBot('${bot.name}')">Start</button>
            <button onclick="stopBot('${bot.name}')">Stop</button>
            <span class="bot-status">${bot.running ? 'Running' : 'Stopped'}</span>
          </span>
        `;
        botList.appendChild(li);
      });
    });
}

// ---------------------------
// Start Bot
// ---------------------------
function startBot(botname){
  fetch('/start', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username, botname})
  }).then(res => res.text())
    .then(msg => {
      alert(msg);
      loadBots();
    });
}

// ---------------------------
// Stop Bot
// ---------------------------
function stopBot(botname){
  fetch('/stop', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username, botname})
  }).then(res => res.text())
    .then(msg => {
      alert(msg);
      loadBots();
    });
}

// ---------------------------
// Upload Bot Form
// ---------------------------
uploadForm.addEventListener('submit', function(e){
  e.preventDefault();
  const formData = new FormData(this);
  formData.append('username', username);

  fetch('/upload', {
    method:'POST',
    body: formData
  }).then(res => res.text())
    .then(msg => {
      alert(msg);
      loadBots();
    });
});

// ---------------------------
// Create New File Form
// ---------------------------
createFileForm.addEventListener('submit', function(e){
  e.preventDefault();
  const filename = newFileNameInput.value.trim();
  const content = newFileContentInput.value;

  if(!filename) return alert('Enter a filename with .js extension');

  fetch('/create-file', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username, filename, content})
  }).then(res => res.text())
    .then(msg => {
      alert(msg);
      newFileNameInput.value = '';
      newFileContentInput.value = '';
      loadBots(); // Reload bot list immediately
    });
});

// ---------------------------
// Initial Load
// ---------------------------
loadPanelStatus();
loadBots();
setInterval(loadPanelStatus, 10000); // update panel status every 10 sec
