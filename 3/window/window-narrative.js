function openNarrativeWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;
    const existing = openWindows.find(w => w.id === fileId);
    if (existing) { if (existing.isMinimized) toggleMinimize(fileId); focusWindow(fileId); return; }

    zIndexCounter++;
    const winObj = { id: fileId, type: 'narrative', title: file.title, icon: 'sticky-note', zIndex: zIndexCounter, x: 150, y: 150 };
    createWindowDOM(winObj, { width: 500, height: 400 });
    openWindows.push(winObj);
    if (typeof NarrativeManager !== 'undefined') NarrativeManager.renderInWindow(fileId, fileId);
    if (typeof renderDock === 'function') renderDock();
}