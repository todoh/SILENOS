// live gemini/ui.js
// ─── INIT & DOM EVENTS ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (apiKey) {
    document.getElementById('apiKeyInput').value = apiKey;
    showToast('API Key cargada ✓', 'success');
  }

  const savedPersonality = localStorage.getItem('gemini_personality') || '';
  const savedInstructions = localStorage.getItem('gemini_instructions') || '';
  if(document.getElementById('aiPersonalityInput')) document.getElementById('aiPersonalityInput').value = savedPersonality;
  if(document.getElementById('aiInstructionsInput')) document.getElementById('aiInstructionsInput').value = savedInstructions;

  if (typeof buildVoiceViz === 'function') buildVoiceViz();
  if (typeof animateIdleBars === 'function') animateIdleBars();
  
  makeDraggable(document.getElementById('webModal'), document.getElementById('webModalHeader'));

  // Inicializar Motor de Ventanas y Pestañas
  setupWindowManager();
});

function saveApiKey() {
  const val = document.getElementById('apiKeyInput').value.trim();
  if (!val) { showToast('Ingresa tu API Key', 'error'); return; }
  apiKey = val;
  localStorage.setItem('gemini_api_key', apiKey);
  showToast('API Key guardada ✓', 'success');
}

function savePersonalitySettings() {
  const personality = document.getElementById('aiPersonalityInput').value.trim();
  const instructions = document.getElementById('aiInstructionsInput').value.trim();
  localStorage.setItem('gemini_personality', personality);
  localStorage.setItem('gemini_instructions', instructions);
  showToast('Personalización guardada ✓', 'success');
}

// ─── DRAG LOGIC PARA EL MODAL ────────────────────────────────────────────

function makeDraggable(elmnt, header) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (header) {
    header.onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    if (elmnt.classList.contains('maximized') || elmnt.classList.contains('minimized')) return;
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// ─── UI WEB MODAL MANAGER ──────────────────

const uiWeb = {
  isMaximized: false,
  currentBlobUrl: null, 

  open(url) {
    const m = document.getElementById('webModal');
    m.classList.remove('hidden', 'minimized');
    if(!this.isMaximized) m.classList.remove('maximized');
    document.getElementById('webModalUrl').value = url;
    
    const container = document.querySelector('.web-modal-body');
    const oldIframe = document.getElementById('webIframe');
    
    if (oldIframe) {
        oldIframe.remove();
    }
    
    const newIframe = document.createElement('iframe');
    newIframe.id = 'webIframe';
    newIframe.setAttribute('allow', 'camera; microphone; display-capture; fullscreen');
    newIframe.src = url;
    container.appendChild(newIframe);

    if (this.currentBlobUrl && this.currentBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentBlobUrl);
    }
    this.currentBlobUrl = url;
  },

  close() {
    document.getElementById('webModal').classList.add('hidden');
    const iframe = document.getElementById('webIframe');
    if (iframe) iframe.src = '';
    
    if (this.currentBlobUrl && this.currentBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentBlobUrl);
        this.currentBlobUrl = null;
    }
  },

  minimize() {
    const m = document.getElementById('webModal');
    m.classList.remove('maximized');
    m.classList.toggle('minimized');
  },

  maximize() {
    const m = document.getElementById('webModal');
    m.classList.remove('minimized');
    m.classList.toggle('maximized');
    this.isMaximized = m.classList.contains('maximized');
  },

  reload() {
    const iframe = document.getElementById('webIframe');
    if (iframe) {
        iframe.src = iframe.src;
    }
  }
};

// ─── UI HELPERS & STATUS ─────────────────────────────────────────────────

function onConnected() {
  document.getElementById('connectBtn').textContent = '';
  document.getElementById('connectBtn').innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/>
    </svg> ACTIVO`;
  document.getElementById('disconnectBtn').style.display = 'flex';
  document.getElementById('disconnectBtn').disabled = false;
  document.getElementById('micBtn').disabled = false;
  document.getElementById('videoBtn').disabled = false;
  document.getElementById('screenBtn').disabled = false;
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('emptyState').style.display = 'none';
  audioContext = new AudioContext({ sampleRate: 24000 });
  
  if (typeof startParallelAgents === 'function') startParallelAgents();
}

function onDisconnected() {
  document.getElementById('connectBtn').innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
    </svg> CONECTAR`;
  document.getElementById('disconnectBtn').style.display = 'none';
  document.getElementById('disconnectBtn').disabled = true;
  document.getElementById('micBtn').disabled = true;
  document.getElementById('videoBtn').disabled = true;
  document.getElementById('screenBtn').disabled = true;
  document.getElementById('sendBtn').disabled = true;
  
  if (typeof stopParallelAgents === 'function') stopParallelAgents();
}

function setStatus(text, type) {
  document.getElementById('statusText').textContent = text;
  const dot = document.getElementById('statusDot');
  dot.className = 'status-dot' + (type ? ' ' + type : '');
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = 'toast', 2800);
}

function updateProcessStatus(id, isActive) {
  const el = document.getElementById(id);
  if (el) {
    if (isActive) el.classList.add('active');
    else el.classList.remove('active');
  }
}

function toggleSettingsMenu() {
  const menu = document.getElementById('settingsMenu');
  if (menu) {
    menu.classList.toggle('open');
  }
}

// ─── WINDOW & TASKBAR MANAGER ──────────────

let topZIndex = 2000;
const windowNames = {
    'webModal': 'Navegador IA',
    'coderStudioModal': 'Coder Studio',
    'svgStudioModal': 'SVG Studio',
    'gamebookModal': 'Librojuego',
    'datosStudioModal': 'Datos Studio',
    'visualizerModal': 'Visualizador / Editor'
};

function bringToFront(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && !modal.classList.contains('hidden')) {
        topZIndex++;
        modal.style.zIndex = topZIndex;
        updateTaskbar();
    }
}

function setupWindowManager() {
    document.querySelectorAll('.web-modal').forEach(modal => {
        if(modal.style.zIndex) modal.style.zIndex = '';
        modal.addEventListener('mousedown', () => {
            bringToFront(modal.id);
        });
    });

    const observer = new MutationObserver((mutations) => {
        let taskbarNeedsUpdate = false;
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                taskbarNeedsUpdate = true;
                const target = mutation.target;
                if (!target.classList.contains('hidden')) {
                    setTimeout(() => bringToFront(target.id), 10);
                }
            }
        });
        if (taskbarNeedsUpdate) {
            updateTaskbar();
        }
    });

    document.querySelectorAll('.web-modal').forEach(modal => {
        observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });

    updateTaskbar(); 
}

function updateTaskbar() {
    let taskbar = document.getElementById('window-taskbar');
    if (!taskbar) return;

    taskbar.innerHTML = '';
    let openModals = [];

    document.querySelectorAll('.web-modal').forEach(modal => {
        if (!modal.classList.contains('hidden')) {
            openModals.push(modal);
        }
    });

    if (openModals.length > 0) {
        taskbar.style.display = 'flex';
        document.body.classList.add('taskbar-active');
        
        let highestZ = 0;
        let activeModalId = null;
        openModals.forEach(m => {
            let z = parseInt(m.style.zIndex) || 0;
            if (z > highestZ) { highestZ = z; activeModalId = m.id; }
        });

        openModals.forEach(modal => {
            const tab = document.createElement('button');
            tab.className = 'taskbar-tab';
            
            if (modal.id === activeModalId) {
                tab.classList.add('active');
            }
            
            tab.innerText = windowNames[modal.id] || modal.id.replace('Modal', '');
            
            tab.onclick = () => {
                if (modal.classList.contains('minimized')) {
                    if(modal.id === 'webModal' && typeof uiWeb !== 'undefined') uiWeb.minimize(); 
                    else modal.classList.remove('minimized');
                }
                bringToFront(modal.id);
            };
            taskbar.appendChild(tab);
        });
    } else {
        taskbar.style.display = 'none';
        document.body.classList.remove('taskbar-active');
    }
}