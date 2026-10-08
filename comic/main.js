document.addEventListener("DOMContentLoaded", () => {
    const apiKey = localStorage.getItem('koreh_gemini_book_api_key') || '';
    const comfyUrl = localStorage.getItem('saga_comfy_url') || 'http://127.0.0.1:8188';
    const coverTitle = localStorage.getItem('saga_comic_cover_title') || '';
    
    const apiKeyInput = document.getElementById('gemini-api-key');
    const comfyUrlInput = document.getElementById('comfy-url');
    const coverTitleInput = document.getElementById('comic-cover-title');
    const bibleInput = document.getElementById('comic-bible');
    
    if (apiKeyInput) apiKeyInput.value = apiKey;
    if (comfyUrlInput) comfyUrlInput.value = comfyUrl;
    if (coverTitleInput) coverTitleInput.value = coverTitle;

    // Escuchar pegado o edición manual en la Biblia Visual para limpiar base64
    if (bibleInput) {
        bibleInput.addEventListener('paste', (e) => {
            setTimeout(() => {
                if (window.ComicPipeline && window.ComicPipeline.cleanBase64FromText) {
                    bibleInput.value = window.ComicPipeline.cleanBase64FromText(bibleInput.value);
                    if (typeof saveSettings === 'function') saveSettings();
                }
            }, 50);
        });

        bibleInput.addEventListener('change', () => {
            if (window.ComicPipeline && window.ComicPipeline.cleanBase64FromText) {
                bibleInput.value = window.ComicPipeline.cleanBase64FromText(bibleInput.value);
            }
        });
    }

    if (window.ComicPipeline) {
        window.ComicPipeline.resetSession();
    }

    // Inicializa la UI de ingredientes en caso de haber un state previo (aunque sea vacío)
    setTimeout(() => {
        if (window.ComicPipeline && window.ComicPipeline.renderIngredientsUI) {
            window.ComicPipeline.renderIngredientsUI();
        }
    }, 300);
});

function saveSettings() {
    const apiKeyInput = document.getElementById('gemini-api-key');
    const comfyUrlInput = document.getElementById('comfy-url');
    const coverTitleInput = document.getElementById('comic-cover-title');
    const bibleInput = document.getElementById('comic-bible');

    if (bibleInput && window.ComicPipeline && window.ComicPipeline.cleanBase64FromText) {
        bibleInput.value = window.ComicPipeline.cleanBase64FromText(bibleInput.value);
    }
    
    if (apiKeyInput) localStorage.setItem('koreh_gemini_book_api_key', apiKeyInput.value.trim());
    if (comfyUrlInput) localStorage.setItem('saga_comfy_url', comfyUrlInput.value.trim());
    if (coverTitleInput) localStorage.setItem('saga_comic_cover_title', coverTitleInput.value.trim());
    
    if (window.ComicPipeline && window.ComicPipeline.dirHandle) {
        ComicPipeline.autoSave();
    }
}
window.saveSettings = saveSettings;

function toggleSidebar(forceState) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    if (!sidebar) return;
    
    const isOpen = sidebar.classList.contains('open');
    const newState = (typeof forceState === 'boolean') ? forceState : !isOpen;
    
    if (newState) {
        sidebar.classList.remove('closed');
        sidebar.classList.add('open');
        backdrop?.classList.add('active');
    } else {
        sidebar.classList.remove('open');
        sidebar.classList.add('closed');
        backdrop?.classList.remove('active');
    }
}
window.toggleSidebar = toggleSidebar;

function setViewMode(mode) {
    const btnEditor = document.getElementById('btn-mode-editor');
    const btnViewer = document.getElementById('btn-mode-viewer');
    
    if (mode === 'viewer') {
        btnEditor?.classList.remove('active');
        btnViewer?.classList.add('active');
        if (window.ComicPipeline) {
            ComicPipeline.renderFinalComic();
        }
    } else {
        btnViewer?.classList.remove('active');
        btnEditor?.classList.add('active');
        if (window.ComicPipeline) {
            ComicPipeline.renderGenerationUI();
        }
    }
}
window.setViewMode = setViewMode;

function updateGlobalProgress(stepNumber, stepName) {
    const fill = document.getElementById('progress-fill');
    const textStep = document.getElementById('progress-step-text');
    const textPercent = document.getElementById('progress-percent-text');
    
    const totalSteps = 5;
    const percentage = Math.min(100, Math.round((stepNumber / totalSteps) * 100));
    
    if (fill) fill.style.width = `${percentage}%`;
    if (textStep) textStep.innerText = `Paso ${stepNumber + 1}: ${stepName}`;
    if (textPercent) textPercent.innerText = `${percentage}%`;
}
window.updateGlobalProgress = updateGlobalProgress;

if (window.ComicPipeline) {
    const originalUpdateStepTag = window.ComicPipeline.updateStepTag;
    window.ComicPipeline.updateStepTag = function(stepNum, status) {
        if (typeof originalUpdateStepTag === 'function') {
            originalUpdateStepTag.call(this, stepNum, status);
        }
        
        const stepNames = [
            "Plan de Argumento (Llamada 1/4)",
            "Biblia Visual v2 (Llamada 2/4)",
            "Guión Base (Llamada 3/4)",
            "Guión Técnico Master (Llamada 4/4)",
            "Prompts Visuales",
            "Renderizado & Cómic Final"
        ];
        
        if (status === 'active' || status === 'completed') {
            updateGlobalProgress(stepNum, stepNames[stepNum] || "Procesando");
        }
    };
}