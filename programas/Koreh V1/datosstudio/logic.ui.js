// --- GESTIÓN DE UI ---
const ui = {
    toggleFolderModal: () => {
        const modal = document.getElementById('folder-modal');
        modal.classList.toggle('hidden');
        if(!modal.classList.contains('hidden')) app.scanRoot();
    },
    toggleNameModal: () => {
        const modal = document.getElementById('name-modal');
        const input = document.getElementById('new-item-name');
        modal.classList.toggle('hidden');
        if(!modal.classList.contains('hidden')) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
    },
    toggleGenerator: () => {
        document.getElementById('generator-sidebar').classList.toggle('open');
        document.getElementById('btn-toggle-gen').classList.toggle('bg-black');
        document.getElementById('btn-toggle-gen').classList.toggle('text-white');
    },
    openSidebar: () => document.getElementById('editor-sidebar').classList.add('open'),
    closeSidebar: () => {
        document.getElementById('editor-sidebar').classList.remove('open');
        app.currentFileHandle = null; 
    },
    setLoading: (loading, msg = "Procesando...") => {
        const loader = document.getElementById('sidebar-loader');
        loader.querySelector('span').innerText = msg;
        if(loading) loader.classList.add('active'); else loader.classList.remove('active');
    },
    updateAuthUI: () => {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        if (Sys && Sys.authKey) {
            indicator.className = "w-1.5 h-1.5 rounded-full bg-black"; text.innerText = "ONLINE";
            text.className = "text-[10px] font-medium text-black uppercase tracking-wider";
        } else {
            indicator.className = "w-1.5 h-1.5 rounded-full bg-gray-200"; text.innerText = "OFFLINE";
            text.className = "text-[10px] font-medium text-gray-300 uppercase tracking-wider";
        }
    },
    // Custom Alerts
    alert: (msg) => {
        const modal = document.getElementById('msg-modal');
        const content = document.getElementById('msg-content');
        const actions = document.getElementById('msg-actions');
        
        content.innerText = msg;
        actions.innerHTML = `
            <button onclick="document.getElementById('msg-modal').classList.add('hidden')" class="btn-primary w-24">OK</button>
        `;
        modal.classList.remove('hidden');
    },
    confirm: (msg, onYes) => {
        const modal = document.getElementById('msg-modal');
        const content = document.getElementById('msg-content');
        const actions = document.getElementById('msg-actions');
        
        content.innerText = msg;
        actions.innerHTML = '';

        const btnCancel = document.createElement('button');
        btnCancel.className = "btn-nordic text-gray-400 border-none hover:bg-gray-50";
        btnCancel.innerText = "CANCELAR";
        btnCancel.onclick = () => modal.classList.add('hidden');

        const btnOk = document.createElement('button');
        btnOk.className = "btn-primary w-24";
        btnOk.innerText = "ACEPTAR";
        btnOk.onclick = () => {
            modal.classList.add('hidden');
            onYes();
        };

        actions.appendChild(btnCancel);
        actions.appendChild(btnOk);
        modal.classList.remove('hidden');
    }
};