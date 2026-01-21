/* SILENOS 3/window/window-code-editor.js */
function openCodeEditorWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    const winId = 'editor-' + fileId;
    const existing = openWindows.find(w => w.id === winId);
    
    if (existing) { 
        if (existing.isMinimized) toggleMinimize(winId); 
        focusWindow(winId); 
        return; 
    }

    zIndexCounter++;
    const winObj = { 
        id: winId, 
        appId: 'code-editor',
        type: 'custom', 
        fileId: fileId, 
        title: "JS Editor: " + file.title, 
        icon: 'file-code', 
        zIndex: zIndexCounter, 
        isMinimized: false,
        isMaximized: false,
        x: 100 + (openWindows.length * 20), 
        y: 100 + (openWindows.length * 20) 
    };

    createWindowDOM(winObj, { width: 800, height: 600 });
    openWindows.push(winObj);
    
    // Inyectar CSS si no existe
    if (!document.getElementById('code-editor-styles')) {
        const link = document.createElement('link');
        link.id = 'code-editor-styles';
        link.rel = 'stylesheet';
        link.href = '3/code-editor/editor-styles.css'; 
        document.head.appendChild(link);
    }

    const winContent = document.querySelector(`#window-${winId} .content-area`);
    if (winContent && typeof CodeEditorManager !== 'undefined') {
        const manager = new CodeEditorManager(winContent, fileId);
        manager.init();
    } else {
        winContent.innerHTML = `<div class="p-4 text-red-500">Error: CodeEditorManager no cargado.</div>`;
    }
    
    if (typeof renderDock === 'function') renderDock();
    if (window.lucide) lucide.createIcons();
}