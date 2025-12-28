function openTerminalWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    const winId = 'term-' + fileId;
    const existing = openWindows.find(w => w.id === winId);
    if (existing) { if (existing.isMinimized) toggleMinimize(winId); focusWindow(winId); return; }

    zIndexCounter++;
    const winObj = { id: winId, type: 'program-runner', title: ">_ " + file.title, icon: 'terminal', zIndex: zIndexCounter, x: 200, y: 200 };
    createWindowDOM(winObj, { width: 500, height: 350 });
    openWindows.push(winObj);

    const winContent = document.querySelector(`#window-${winId} .content-area`);
    if (winContent) {
        winContent.innerHTML = `<div class="flex h-full bg-black text-green-500 font-mono text-xs p-2"><div id="runner-console-${winId}" class="flex-1 overflow-y-auto"><div>> Iniciando...</div></div></div>`;
        setTimeout(() => { if (typeof ProgrammerManager !== 'undefined') ProgrammerManager.runHeadless(winId, fileId); }, 500);
    }
    if (typeof renderDock === 'function') renderDock();
}