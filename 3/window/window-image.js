async function openImageWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;
    const existing = openWindows.find(w => w.id === fileId);
    if (existing) { if (existing.isMinimized) toggleMinimize(fileId); focusWindow(fileId); return; }

    zIndexCounter++;
    const winObj = { id: fileId, type: 'image', title: file.title, icon: 'image', zIndex: zIndexCounter, x: 150 + (openWindows.length * 20), y: 150 + (openWindows.length * 20) };
    createWindowDOM(winObj, { width: 450, height: 450 });
    openWindows.push(winObj);

    const blobUrl = await FileSystem.getImageUrl(file.content);
    const winContent = document.querySelector(`#window-${fileId} .content-area`);
    if (winContent) {
        // [MEJORADO] Ajuste de fondo y visualización para "verlas bien"
        winContent.innerHTML = `<div class="w-full h-full bg-[#121212] flex items-center justify-center p-2 overflow-auto"><img src="${blobUrl || ''}" class="max-w-full max-h-full shadow-2xl rounded-md object-contain pointer-events-none"></div>`;
    }
    if (typeof renderDock === 'function') renderDock();
}