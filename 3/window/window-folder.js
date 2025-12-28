function openDataWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    if (file.type === 'folder') { openFolderWindow(fileId); return; }
    if (file.type === 'image') { openImageWindow(fileId); return; }
    if (file.type === 'book') { openBookWindow(fileId); return; }
    if (file.type === 'narrative') { openNarrativeWindow(fileId); return; }
    if (file.type === 'executable') { if (typeof ProgrammerManager !== 'undefined') ProgrammerManager.runHeadless(null, fileId); return; }
    if (file.type === 'program') { openProgramRunnerWindow(fileId); return; }

    const existing = openWindows.find(w => w.id === fileId);
    if (existing) { if (existing.isMinimized) toggleMinimize(fileId); focusWindow(fileId); return; }

    zIndexCounter++;
    const winObj = { id: fileId, appId: 'data-viewer', type: 'data', fileId: fileId, title: file.title, icon: file.icon || 'file-json', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, x: 120 + (openWindows.length * 30), y: 120 + (openWindows.length * 30) };
    createWindowDOM(winObj, { width: 600, height: 500 });
    openWindows.push(winObj);
    if (typeof DataViewer !== 'undefined') DataViewer.renderInWindow(fileId, fileId);
    if (typeof renderDock === 'function') renderDock();
    if (window.lucide) lucide.createIcons();
}

function openFolderWindow(folderId) {
    const folder = FileSystem.getItem(folderId);
    if (!folder) return;
    const existing = openWindows.find(w => w.id === folderId);
    if (existing) { if (existing.isMinimized) toggleMinimize(folderId); focusWindow(folderId); return; }

    zIndexCounter++;
    const winObj = { id: folderId, type: 'folder', folderId: folderId, title: folder.title, icon: 'folder-open', zIndex: zIndexCounter, x: 100 + (openWindows.length * 30), y: 100 + (openWindows.length * 30) };
    createWindowDOM(winObj, { width: 500, height: 400 });
    openWindows.push(winObj);
    renderFolderContent(folderId, folderId);
    if (typeof renderDock === 'function') renderDock();
}




async function renderFolderContent(windowId, folderId) {
    const winContent = document.querySelector(`#window-${windowId} .content-area`);
    if (!winContent) return;
    winContent.innerHTML = `<div class="folder-window-content w-full h-full p-4 flex flex-wrap content-start gap-4 overflow-y-auto" data-folder-id="${folderId}"></div>`;
    const container = winContent.querySelector('.folder-window-content');
    const items = FileSystem.getItems(folderId);

    for (const item of items) {
        const el = document.createElement('div');
        el.className = `flex flex-col items-center gap-2 w-24 cursor-pointer relative ${item.type === 'folder' ? 'folder-drop-zone' : ''}`;
        el.dataset.id = item.id;
        el.onmousedown = (e) => { if (e.target.tagName !== 'INPUT') startIconDrag(e, item.id, folderId); };

        let iconContent = `<i data-lucide="${item.icon}" class="${item.color} w-7 h-7"></i>`;
        
        if (item.type === 'executable' || item.type === 'program') {
            const char = Array.from(item.title || " ")[0] || "⚙️";
            iconContent = `<span class="text-2xl font-black ${item.color} select-none">${char}</span>`;
        } else if (item.type === 'image' && item.content) {
            const blobUrl = await FileSystem.getImageUrl(item.content);
            if (blobUrl) iconContent = `<img src="${blobUrl}" class="w-full h-full object-cover rounded-lg pointer-events-none shadow-sm">`;
        }

        el.innerHTML = `
            <div class="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center shadow-sm hover:shadow-md transition-all overflow-hidden p-0">${iconContent}</div>
            <span class="text-xs text-gray-600 text-center line-clamp-3 break-words w-full font-bold px-1" onclick="showRenameModal(event, '${item.id}', '${item.title}')">${item.title}</span>`;
        container.appendChild(el);
    }
    if (window.lucide) lucide.createIcons();
}
