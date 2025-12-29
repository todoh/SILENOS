function openBookWindow(bookId) {
    const book = FileSystem.getItem(bookId);
    if (!book) return;
    const existing = openWindows.find(w => w.id === bookId);
    if (existing) { if (existing.isMinimized) toggleMinimize(bookId); focusWindow(bookId); return; }

    zIndexCounter++;
    const winObj = { id: bookId, type: 'book', title: book.title, icon: 'book', zIndex: zIndexCounter, x: 80, y: 80 };
    createWindowDOM(winObj, { width: 700, height: 600 });
    openWindows.push(winObj);
    if (typeof BookManager !== 'undefined') BookManager.renderInWindow(bookId, bookId);
    if (typeof renderDock === 'function') renderDock();
}