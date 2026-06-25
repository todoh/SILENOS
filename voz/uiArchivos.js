// SILENOS 5 VOZ/uiArchivos.js

// Variable global interna para recordar sobre qué archivo se hizo clic derecho
let archivoSeleccionadoContextual = null;

// Evitar que el menú contextual se quede abierto al hacer clic en otro sitio
document.addEventListener('click', () => {
    const menu = document.getElementById('customContextMenu');
    if (menu) menu.style.display = 'none';
});

async function actualizarUIArchivos() {
    if (!directoryHandle) return;
    const panel = document.getElementById('fileList');
    panel.innerHTML = '';
    const archivos = await listarArchivos();
    archivos.forEach(arch => {
        const div = document.createElement('div');
        div.className = 'file-item';
        
        // Icono dinámico según la extensión
        let icono = "📄 ";
        const ext = arch.split('.').pop().toLowerCase();
        if (ext === 'html') icono = "🌐 ";
        else if (ext === 'css') icono = "🎨 ";
        else if (ext === 'js') icono = "⚡ ";
        
        div.innerText = icono + arch;
        
        // Clic normal: abrir editor
        div.onclick = () => abrirArchivoManual(arch);
        
        // Clic derecho: Menú contextual personalizado (Previsualizar si es HTML)
        div.oncontextmenu = (e) => {
            const extension = arch.split('.').pop().toLowerCase();
            if (extension === 'html') {
                e.preventDefault(); // Bloquear menú nativo del navegador
                archivoSeleccionadoContextual = arch;
                
                const menu = document.getElementById('customContextMenu');
                menu.style.left = `${e.pageX}px`;
                menu.style.top = `${e.pageY}px`;
                menu.style.display = 'block';
            }
        };
        
        panel.appendChild(div);
    });

    // --- MANTENER A LA IA ACTUALIZADA CON LA LISTA DE ARCHIVOS ---
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

        // --- INFORMAR A LA IA DE QUÉ ARCHIVO ESTÁS VIENDO ---
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

    // --- AVISAR DE QUE ESTÁS CREANDO ALGO NUEVO ---
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
    
    if (!nombre) return alert("Debes darle un nombre al archivo (ej: index.html, styles.css, app.js, lore.txt).");
    
    try {
        await escribirArchivo(nombre, contenido);
        const btn = document.querySelector('.editor-controls button');
        const oldText = btn.innerText;
        btn.innerText = "¡GUARDADO!";
        setTimeout(() => btn.innerText = oldText, 1000);

        // --- AVISAR A LA IA QUE EL USUARIO GUARDÓ MANUALMENTE ---
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

            // --- AVISAR DE DESTRUCCIÓN MANUAL ---
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

// ─── NUEVAS FUNCIONES PARA EL SERVIDOR VIRTUAL LOCAL Y PREVISUALIZACIÓN ───

async function ejecutarPrevisualizarDesdeMenu() {
    if (!archivoSeleccionadoContextual) return;
    await previsualizarHtmlVirtual(archivoSeleccionadoContextual);
}

async function previsualizarHtmlVirtual(nombreArchivo) {
    try {
        let htmlContenido = await leerArchivo(nombreArchivo);
        
        // Parsear el HTML a objetos DOM virtuales para poder mapear sus recursos enlazados
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContenido, 'text/html');

        // 1. Reemplazar Hojas de Estilo Vinculadas (<link rel="stylesheet">)
        const links = doc.querySelectorAll('link[rel="stylesheet"]');
        for (let link of links) {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('data:')) {
                try {
                    const cssContenido = await leerArchivo(href);
                    const blob = new Blob([cssContenido], { type: 'text/css' });
                    const blobUrl = URL.createObjectURL(blob);
                    link.setAttribute('href', blobUrl);
                } catch (err) {
                    console.warn(`No se pudo cargar el recurso CSS vinculado: ${href}`, err);
                }
            }
        }

        // 2. Reemplazar Scripts Vinculados (<script src="...">)
        const scripts = doc.querySelectorAll('script[src]');
        for (let script of scripts) {
            const src = script.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                try {
                    const jsContenido = await leerArchivo(src);
                    const blob = new Blob([jsContenido], { type: 'application/javascript' });
                    const blobUrl = URL.createObjectURL(blob);
                    script.setAttribute('src', blobUrl);
                } catch (err) {
                    console.warn(`No se pudo cargar el recurso Script vinculado: ${src}`, err);
                }
            }
        }

        // 3. Reemplazar Imágenes (<img src="...">)
        const imagenes = doc.querySelectorAll('img[src]');
        for (let img of imagenes) {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                try {
                    // Usamos el lector original adaptado a tipo Blob/ArrayBuffer si hace falta, 
                    // o leemos el archivo crudo si tu fsCore maneja la lectura como texto o blob.
                    // Asumiendo que leerArchivo devuelve texto, si son imágenes necesitarías leer binario.
                    // Si tus imágenes están guardadas en formato texto o base64 funcionará directo:
                    const imgContenido = await leerArchivo(src);
                    
                    // Si tu leerArchivo devuelve un string plano de datos binarios, lo transformamos.
                    // Si devuelve base64 directamente, lo inyectamos. Ajustamos el tipo de imagen dinámicamente:
                    const ext = src.split('.').pop().toLowerCase();
                    let mime = 'image/png';
                    if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
                    else if (ext === 'gif') mime = 'image/gif';
                    else if (ext === 'svg') mime = 'image/svg+xml';

                    const blob = new Blob([imgContenido], { type: mime });
                    const blobUrl = URL.createObjectURL(blob);
                    img.setAttribute('src', blobUrl);
                } catch (err) {
                    console.warn(`No se pudo cargar la imagen vinculada: ${src}`, err);
                }
            }
        }

        // Serializar de nuevo el documento modificado con los recursos locales inyectados
        const htmlFinal = doc.documentElement.outerHTML;

        // Crear el Blob maestro para el archivo HTML ejecutable
        const mainBlob = new Blob([htmlFinal], { type: 'text/html' });
        const mainBlobUrl = URL.createObjectURL(mainBlob);

        // Actualizar UI del Modal de Previsualización e Inyectar en el Iframe
        document.getElementById('previewTitle').innerText = `Servidor Virtual: ${nombreArchivo}`;
        const iframe = document.getElementById('previewFrame');
        iframe.src = mainBlobUrl;

        // Mostrar el modal en pantalla
        document.getElementById('previewModal').style.display = 'flex';

    } catch (e) {
        alert("Error al generar la previsualización del servidor local virtual: " + e.message);
    }
}

function cerrarPrevisualizacion() {
    document.getElementById('previewModal').style.display = 'none';
    const iframe = document.getElementById('previewFrame');
    // Limpiar el contenido al cerrar para detener procesos del script del iframe
    iframe.src = 'about:blank'; 
}