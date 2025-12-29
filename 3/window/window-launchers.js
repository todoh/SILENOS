/* SILENOS 3/window-launchers.js */

function showRenameModal(e, itemId, oldTitle) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const existing = document.getElementById('rename-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'rename-modal';
    modal.className = 'fixed z-[10001] bg-[#e0e5ec]/95 backdrop-blur-md border border-white/50 shadow-2xl rounded-2xl p-4 pop-in';
    
    const x = e ? e.clientX : window.innerWidth / 2 - 100;
    const y = e ? e.clientY : window.innerHeight / 2 - 50;
    modal.style.left = `${Math.min(x, window.innerWidth - 250)}px`;
    modal.style.top = `${Math.min(y, window.innerHeight - 150)}px`;
    modal.style.width = '240px';

    modal.innerHTML = `
        <div class="flex flex-col gap-3">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Renombrar Materia</label>
            <input type="text" id="rename-input" value="${oldTitle}" 
                class="neumorph-in w-full p-3 text-xs font-bold text-gray-700 outline-none border-none"
                autocomplete="off">
            <div class="flex gap-2">
                <button id="rename-confirm"  class="flex-1 py-2 bg-indigo-500 text-white text-[10px] font-bold rounded-lg shadow-lg active:scale-95 transition-transform">GUARDAR</button>
                <button id="rename-cancel" class="flex-1 py-2 bg-gray-200 text-gray-600 text-[10px] font-bold rounded-lg active:scale-95 transition-transform">CANCELAR</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const input = document.getElementById('rename-input');
    input.focus();
    input.select();

    const confirm = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== oldTitle) {
            FileSystem.updateItem(itemId, { title: newTitle });
            if (window.refreshSystemViews) window.refreshSystemViews();
            if (window.refreshAllViews) window.refreshAllViews();
        }
        modal.remove();
   
    };

    document.getElementById('rename-confirm').onclick = confirm;
    document.getElementById('rename-cancel').onclick = () => modal.remove();
    
    input.onkeydown = (ke) => {
        if (ke.key === 'Enter') confirm();
        if (ke.key === 'Escape') modal.remove();
    };
}