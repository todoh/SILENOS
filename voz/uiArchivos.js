// SILENOS 5 VOZ/uiArchivos.js

// ─── MANEJO MANUAL DE ARCHIVOS POR EL USUARIO Y ACTUALIZACIÓN UI ───

async function actualizarUIArchivos() {
    if (!directoryHandle) return;
    const panel = document.getElementById('fileList');
    panel.innerHTML = '';
    const archivos = await listarArchivos();
    archivos.forEach(arch => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerText = "📄 " + arch;
        div.onclick = () => abrirArchivoManual(arch);
        panel.appendChild(div);
    });

    // --- NUEVO: MANTENER A LA IA ACTUALIZADA CON LA LISTA DE ARCHIVOS ---
    if (ws && ws.readyState === WebSocket.OPEN) {
        const msg = `(AVISO DEL SISTEMA: La lista de archivos se ha actualizado automáticamente. Ahora hay: ${archivos.length > 0 ? archivos.join(', ') : 'ninguno'})`;
        ws.send(JSON.stringify({
            clientContent: {
                turns: [{ role: "user", parts: [{ text: msg }] }],
                turnComplete: true
            }
        }));
    }
}

async function abrirArchivoManual(nombre) {
    try {
        const contenido = await leerArchivo(nombre);
        document.getElementById('editorFilename').value = nombre;
        document.getElementById('editorContent').value = contenido;
        document.getElementById('editorPanel').style.display = 'flex';

        // --- NUEVO: INFORMAR A LA IA DE QUÉ ARCHIVO ESTÁS VIENDO ---
        if (ws && ws.readyState === WebSocket.OPEN) {
            const msg = `(AVISO DEL SISTEMA: El usuario acaba de abrir el archivo "${nombre}" y lo está viendo/editando en su pantalla en este momento.)`;
            ws.send(JSON.stringify({
                clientContent: {
                    turns: [{ role: "user", parts: [{ text: msg }] }],
                    turnComplete: true
                }
            }));
            if (typeof addMessage === 'function') {
                addMessage('system', `👀 IA informada silenciosamente de que estás viendo: ${nombre}`);
            }
        }
    } catch (e) {
        alert("Error al abrir para editar: " + e.message);
    }
}

function nuevoArchivoManual() {
    document.getElementById('editorFilename').value = '';
    document.getElementById('editorContent').value = '';
    document.getElementById('editorPanel').style.display = 'flex';
    document.getElementById('editorFilename').focus();

    // --- NUEVO: AVISAR DE QUE ESTÁS CREANDO ALGO NUEVO ---
    if (ws && ws.readyState === WebSocket.OPEN) {
        const msg = `(AVISO DEL SISTEMA: El usuario ha abierto la interfaz para crear un archivo nuevo vacío.)`;
        ws.send(JSON.stringify({
            clientContent: {
                turns: [{ role: "user", parts: [{ text: msg }] }],
                turnComplete: true
            }
        }));
    }
}

async function guardarManual() {
    const nombre = document.getElementById('editorFilename').value.trim();
    const contenido = document.getElementById('editorContent').value;
    
    if (!nombre) return alert("Debes darle un nombre al archivo (ej: lore.txt).");
    
    try {
        await escribirArchivo(nombre, contenido);
        const btn = document.querySelector('.editor-controls button');
        const oldText = btn.innerText;
        btn.innerText = "¡GUARDADO!";
        setTimeout(() => btn.innerText = oldText, 1000);

        // --- NUEVO: AVISAR A LA IA QUE EL USUARIO GUARDÓ MANUALMENTE ---
        if (ws && ws.readyState === WebSocket.OPEN) {
            const msg = `(AVISO DEL SISTEMA: El usuario ha guardado manualmente los cambios en el archivo "${nombre}".)`;
            ws.send(JSON.stringify({
                clientContent: {
                    turns: [{ role: "user", parts: [{ text: msg }] }],
                    turnComplete: true
                }
            }));
        }
    } catch (e) {
        alert("Error al guardar: " + e.message);
    }
}

async function borrarManual() {
    const nombre = document.getElementById('editorFilename').value.trim();
    if (!nombre) return;

    if (confirm(`¿Estás seguro de que quieres destruir "${nombre}" de forma permanente?`)) {
        try {
            await borrarArchivo(nombre);
            document.getElementById('editorPanel').style.display = 'none';
            document.getElementById('editorFilename').value = '';
            document.getElementById('editorContent').value = '';

            // --- NUEVO: AVISAR DE DESTRUCCIÓN MANUAL ---
            if (ws && ws.readyState === WebSocket.OPEN) {
                const msg = `(AVISO DEL SISTEMA: El usuario ha eliminado manualmente el archivo "${nombre}".)`;
                ws.send(JSON.stringify({
                    clientContent: {
                        turns: [{ role: "user", parts: [{ text: msg }] }],
                        turnComplete: true
                    }
                }));
            }
        } catch (e) {
            alert("Error al borrar: " + e.message);
        }
    }
}