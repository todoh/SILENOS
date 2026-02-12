// --- UI.JS (INTERFAZ DE USUARIO) ---

// Elementos DOM Globales
const btnSelectDir = document.getElementById('btn-select-dir');
const btnPasteTrigger = document.getElementById('btn-paste-trigger');
const btnCreateFolder = document.getElementById('btn-create-folder');
const btnRefresh = document.getElementById('btn-refresh');

const introScreen = document.getElementById('intro-screen');
const appInterface = document.getElementById('app-interface');
const fileTreeEl = document.getElementById('file-tree');
const currentPathEl = document.getElementById('current-path');
const mobilePathEl = document.getElementById('mobile-path'); // Puede ser null si se quita del HTML
const errorMsg = document.getElementById('error-msg');
const toastEl = document.getElementById('toast');
const lastActionEl = document.getElementById('last-action');

// Viewer Elements
const contentViewerEl = document.getElementById('content-viewer');

// Rename Modal Elements
const renameModal = document.getElementById('rename-modal');
const renameInput = document.getElementById('rename-input');
const btnCancelRename = document.getElementById('btn-cancel-rename');
const btnConfirmRename = document.getElementById('btn-confirm-rename');

let pendingRenameCallback = null;

function log(message) {
    console.log(`[SYS]: ${message}`);
}

function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}

function updatePathDisplay(subpath = '', rootName = 'UNKNOWN') {
    const text = `ROOT/${rootName.toUpperCase()}${subpath ? '/' + subpath.toUpperCase() : ''}`;
    
    // Blindaje contra nulos: Solo actualiza si el elemento existe en el HTML
    if (currentPathEl) currentPathEl.textContent = text;
    if (mobilePathEl) mobilePathEl.textContent = text; 
}

function showLastAction(filename) {
    if (!lastActionEl) return;
    lastActionEl.textContent = `// SAVED: ${filename}`;
    lastActionEl.style.display = 'block';
    setTimeout(() => lastActionEl.style.display = 'none', 3000);
}

function toggleInterface(showApp) {
    if (showApp) {
        if(introScreen) introScreen.style.display = 'none';
        if(appInterface) {
            appInterface.style.display = 'grid'; 
            appInterface.classList.add('animate-entry');
        }
    } else {
        if(introScreen) introScreen.style.display = 'flex';
        if(appInterface) appInterface.style.display = 'none';
    }
}

// --- MODAL LOGIC ---

function openRenameModal(currentName, onConfirm) {
    if (!renameModal) {
        console.error("ERROR CRÍTICO: No se encuentra el elemento #rename-modal en el HTML.");
        return;
    }

    if(renameInput) renameInput.value = currentName;
    pendingRenameCallback = onConfirm;
    renameModal.classList.remove('hidden');
    if(renameInput) {
        renameInput.focus();
        const lastDotIndex = currentName.lastIndexOf('.');
        if (lastDotIndex > 0) {
            renameInput.setSelectionRange(0, lastDotIndex);
        } else {
            renameInput.select();
        }
    }
}

function closeRenameModal() {
    if (!renameModal) return;
    renameModal.classList.add('hidden');
    if(renameInput) renameInput.value = '';
    pendingRenameCallback = null;
}

if (btnCancelRename) {
    btnCancelRename.addEventListener('click', closeRenameModal);
}

if (btnConfirmRename) {
    btnConfirmRename.addEventListener('click', () => {
        const newName = renameInput ? renameInput.value.trim() : null;
        if (newName && pendingRenameCallback) {
            pendingRenameCallback(newName);
        }
        closeRenameModal();
    });
}

if (renameInput) {
    renameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const newName = renameInput.value.trim();
            if (newName && pendingRenameCallback) {
                pendingRenameCallback(newName);
            }
            closeRenameModal();
        }
    });
}