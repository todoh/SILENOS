function openProgrammerWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    const winId = 'prog-' + fileId;
    const existing = openWindows.find(w => w.id === winId);
    
    if (existing) { 
        if (existing.isMinimized) toggleMinimize(winId); 
        focusWindow(winId); 
        return; 
    }

    zIndexCounter++;
    const winObj = { 
        id: winId, 
        appId: 'programmer',
        type: 'programmer', 
        fileId: fileId, 
        title: "Editor: " + file.title, 
        icon: 'cpu', 
        zIndex: zIndexCounter, 
        isMinimized: false,
        isMaximized: false,
        x: 50 + (openWindows.length * 20), 
        y: 50 + (openWindows.length * 20) 
    };

    createWindowDOM(winObj, { width: 900, height: 650 });
    openWindows.push(winObj);
    
    if (typeof ProgrammerManager !== 'undefined') {
        ProgrammerManager.renderInWindow(winId, fileId);
    }
    
    if (typeof renderDock === 'function') renderDock();
    if (window.lucide) lucide.createIcons();
}