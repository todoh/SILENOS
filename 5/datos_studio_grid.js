// live gemini/datos_studio_grid.js

window.datosStudioGrid = {
    render() {
        const grid = document.getElementById('dsGridContainer');
        if (!grid) return;
        grid.innerHTML = '';

        if (datosStudioUI.items.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 40px; font-family: monospace; font-size: 11px;">No hay datos en la carpeta. Pídele a la IA por voz que cree algunos.</div>';
            return;
        }

        datosStudioUI.items.forEach(item => {
            const card = document.createElement('div');
            card.className = "ds-data-card";
            card.style.cssText = "background: var(--surface); border: 1px solid var(--text-dim); border-radius: 8px; cursor: pointer; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s;";
            card.onclick = () => { 
                if (typeof datosStudioEditor !== 'undefined') datosStudioEditor.openItem(item); 
            };

            let imgHTML = '<div style="height: 150px; background: var(--surface2); display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 10px; font-family: monospace;">SIN IMAGEN</div>';
            if (item.data.imagen64) {
                // Soporte robusto: Renderiza tanto SVGs inyectados crudos como Base64 (imágenes raster o svg)
                if (item.data.imagen64.trim().startsWith('<svg')) {
                    imgHTML = `<div style="width: 100%; height: 150px; overflow: hidden; display: flex; align-items: center; justify-content: center;">${item.data.imagen64}</div>`;
                } else {
                    imgHTML = `<img src="${item.data.imagen64}" style="width: 100%; height: 150px; object-fit: cover;">`;
                }
            }

            card.innerHTML = `
                <div style="position: relative;">
                    ${imgHTML}
                    <span style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-family: monospace; text-transform: uppercase;">${item.data.type || 'General'}</span>
                </div>
                <div style="padding: 12px; flex: 1;">
                    <h4 style="margin: 0 0 4px 0; font-size: 14px; font-family: 'Syne', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text);">${item.data.name || item.name}</h4>
                    <p style="margin: 0; font-size: 11px; font-family: 'Syne', sans-serif; color: var(--text-dim); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${item.data.desc || 'Sin descripción...'}</p>
                </div>
            `;
            grid.appendChild(card);
        });
    }
};