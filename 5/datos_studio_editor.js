// live gemini/datos_studio_editor.js

window.datosStudioEditor = {
    openItem(item) {
        datosStudioUI.currentFileHandle = item.handle;
        datosStudioUI.currentData = item.data;
        
        const panel = document.getElementById('dsEditorPanel');
        if (panel) panel.classList.remove('hidden');

        const titleInp = document.getElementById('dsInpTitle');
        if (titleInp) titleInp.value = item.data.name || '';
        
        const typeInp = document.getElementById('dsInpType');
        if (typeInp) typeInp.value = item.data.type || 'General';
        
        const descInp = document.getElementById('dsInpDesc');
        if (descInp) descInp.value = item.data.desc || '';
        
        const visualInp = document.getElementById('dsInpVisual');
        if (visualInp) visualInp.value = item.data.visualDesc || '';

        const imgPreview = document.getElementById('dsImgPreview');
        if (imgPreview) {
            if (item.data.imagen64) {
                if (item.data.imagen64.trim().startsWith('<svg')) {
                    imgPreview.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">${item.data.imagen64}</div>`;
                } else {
                    imgPreview.innerHTML = `<img src="${item.data.imagen64}" style="width:100%; height:100%; object-fit:contain; border-radius: 4px;">`;
                }
            } else {
                imgPreview.innerHTML = `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-dim); border: 1px dashed var(--text-dim); border-radius: 4px; font-family: monospace; font-size: 10px;">SIN IMAGEN</div>`;
            }
        }
    },

    closeItem() {
        datosStudioUI.currentFileHandle = null;
        datosStudioUI.currentData = null;
        const panel = document.getElementById('dsEditorPanel');
        if (panel) panel.classList.add('hidden');
    },

    saveUIEdits() {
        if (!datosStudioUI.currentData) return;
        
        const titleInp = document.getElementById('dsInpTitle');
        if (titleInp) datosStudioUI.currentData.name = titleInp.value;
        
        const typeInp = document.getElementById('dsInpType');
        if (typeInp) datosStudioUI.currentData.type = typeInp.value;
        
        const descInp = document.getElementById('dsInpDesc');
        if (descInp) datosStudioUI.currentData.desc = descInp.value;
        
        const visualInp = document.getElementById('dsInpVisual');
        if (visualInp) datosStudioUI.currentData.visualDesc = visualInp.value;

        datosStudioUI.saveCurrentItem();
    }
};