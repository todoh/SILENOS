function openProgramRunnerWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    const winId = 'runner-' + fileId;
    const existing = openWindows.find(w => w.id === winId);
    if (existing) { if (existing.isMinimized) toggleMinimize(winId); focusWindow(winId); return; }

    zIndexCounter++;
    const winObj = { id: winId, type: 'program-runner', title: file.title, icon: 'play-circle', zIndex: zIndexCounter, x: 200, y: 100 };
    createWindowDOM(winObj, { width: 500, height: 500 });
    openWindows.push(winObj);
    if (typeof ProgrammerManager !== 'undefined') ProgrammerManager.runHeadless(winId, fileId);
    if (typeof renderDock === 'function') renderDock();
}