// SILENOS 5 VOZ/fsCore.js

// ─── GESTOR DE ARCHIVOS LOCALES (FILE SYSTEM ACCESS API) ───
let directoryHandle = null;
let memoriaDirHandle = null; // Handler para la carpeta Memoria

// Historial para deshacer y rehacer
let historialDeshacer = [];
let historialRehacer = [];
let ejecutandoHistorial = false;

async function abrirCarpeta() {
    try {
        directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        document.getElementById('folderStatus').innerText = "📁 " + directoryHandle.name;
        
        // --- NUEVO: CREAR O ACCEDER A CARPETA "Memoria" ---
        memoriaDirHandle = await directoryHandle.getDirectoryHandle('Memoria', { create: true });
        
        // Iniciar los bucles paralelos de análisis con Gemma
        if (typeof iniciarAnalisisCognitivo === 'function') {
            iniciarAnalisisCognitivo();
        }

        await actualizarUIArchivos();
        
        document.getElementById('newFileBtn').style.display = 'block';
        
        if (typeof addMessage === 'function') {
            addMessage('system', `Carpeta "${directoryHandle.name}" vinculada. Subcarpeta "Memoria" activa y análisis cognitivo paralelo iniciado.`);
        }
    } catch (e) {
        console.error("Error al abrir carpeta:", e);
        if (typeof addMessage === 'function') {
            addMessage('system', 'Error o cancelación al abrir la carpeta.');
        }
    }
}

// ─── LECTURA Y ESCRITURA EXCLUSIVA PARA CARPETA "Memoria" ───
async function escribirMemoria(nombre, contenido) {
    if (!memoriaDirHandle) return;
    if (!nombre.toLowerCase().endsWith('.txt')) nombre += '.txt';
    try {
        const fileHandle = await memoriaDirHandle.getFileHandle(nombre, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(contenido);
        await writable.close();
    } catch (e) {
        console.error("Error escribiendo en memoria cognitiva:", e);
    }
}

async function leerMemoria(nombre) {
    if (!memoriaDirHandle) return "";
    if (!nombre.toLowerCase().endsWith('.txt')) nombre += '.txt';
    try {
        const fileHandle = await memoriaDirHandle.getFileHandle(nombre);
        const file = await fileHandle.getFile();
        return await file.text();
    } catch (e) {
        return ""; // Si aún no existe, devuelve vacío
    }
}

async function listarArchivos() {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    const archivos = [];
    for await (const entry of directoryHandle.values()) {
        // Solo lista los txt de la raíz, la carpeta Memoria queda oculta a la lista principal
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.txt')) {
            archivos.push(entry.name);
        }
    }
    return archivos;
}

async function leerArchivo(nombre) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    if (!nombre.toLowerCase().endsWith('.txt')) nombre += '.txt';
    try {
        const fileHandle = await directoryHandle.getFileHandle(nombre);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return text;
    } catch (e) {
        throw new Error(`No se pudo leer el archivo ${nombre}. ¿Existe?`);
    }
}

async function escribirArchivo(nombre, contenido) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    if (!nombre.toLowerCase().endsWith('.txt')) nombre += '.txt';
    
    // Guardar estado para historial si no estamos deshaciendo/rehaciendo
    if (!ejecutandoHistorial) {
        let contenidoAnterior = null;
        try {
            const fileHandle = await directoryHandle.getFileHandle(nombre);
            const file = await fileHandle.getFile();
            contenidoAnterior = await file.text();
        } catch (e) {
            // El archivo no existía, es nuevo
        }
        
        historialDeshacer.push({
            accion: 'escribir',
            nombre: nombre,
            contenidoAnterior: contenidoAnterior,
            contenidoNuevo: contenido
        });
        historialRehacer = []; // Se invalida el futuro al hacer un cambio nuevo
    }

    const fileHandle = await directoryHandle.getFileHandle(nombre, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contenido);
    await writable.close();
    await actualizarUIArchivos();
}

async function borrarArchivo(nombre) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    if (!nombre.toLowerCase().endsWith('.txt')) nombre += '.txt';
    
    // Guardar estado para historial si no estamos deshaciendo/rehaciendo
    if (!ejecutandoHistorial) {
        let contenidoAnterior = null;
        try {
            const fileHandle = await directoryHandle.getFileHandle(nombre);
            const file = await fileHandle.getFile();
            contenidoAnterior = await file.text();
        } catch (e) {
            throw new Error(`El archivo ${nombre} no existe o no se pudo leer.`);
        }
        
        historialDeshacer.push({
            accion: 'borrar',
            nombre: nombre,
            contenidoAnterior: contenidoAnterior
        });
        historialRehacer = []; 
    }

    await directoryHandle.removeEntry(nombre);
    await actualizarUIArchivos();
}

// ─── FUNCIONES PARA EDICIÓN PARCIAL ───

async function reemplazarTextoArchivo(nombre, textoBuscado, textoNuevo) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    if (!nombre.toLowerCase().endsWith('.txt')) nombre += '.txt';

    const contenidoActual = await leerArchivo(nombre);
    
    if (!contenidoActual.includes(textoBuscado)) {
        throw new Error(`El texto exacto a buscar no se encontró en el archivo ${nombre}. Asegúrate de que estás buscando la frase exacta.`);
    }

    const nuevoContenido = contenidoActual.replace(textoBuscado, textoNuevo);
    await escribirArchivo(nombre, nuevoContenido);
    return nuevoContenido;
}

async function agregarAlFinalArchivo(nombre, textoAgregar) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    if (!nombre.toLowerCase().endsWith('.txt')) nombre += '.txt';

    const contenidoActual = await leerArchivo(nombre);
    const prefijo = (contenidoActual && !contenidoActual.endsWith('\n')) ? '\n' : '';
    const nuevoContenido = contenidoActual + prefijo + textoAgregar;
    
    await escribirArchivo(nombre, nuevoContenido);
    return nuevoContenido;
}

// ─── NUEVAS FUNCIONES INTEGRADAS ───

async function leerLineas(nombre, lineaInicio, lineaFin) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    
    const contenido = await leerArchivo(nombre);
    const lineas = contenido.split('\n');
    
    const inicio = Math.max(1, lineaInicio) - 1;
    const fin = Math.min(lineas.length, lineaFin);
    
    if (inicio >= lineas.length) throw new Error("La línea de inicio solicitada está más allá del final del archivo.");
    
    const fragmento = lineas.slice(inicio, fin).join('\n');
    return `--- Líneas ${inicio + 1} a ${fin} de ${lineas.length} ---\n${fragmento}`;
}

async function buscarEnArchivos(textoBuscado) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    
    const archivos = await listarArchivos();
    let resultados = [];
    
    for (const arch of archivos) {
        try {
            const contenido = await leerArchivo(arch);
            if (contenido.toLowerCase().includes(textoBuscado.toLowerCase())) {
                resultados.push(arch);
            }
        } catch(e) {} // Ignorar silenciosamente si un archivo específico no se puede leer
    }
    
    if (resultados.length === 0) return `El texto "${textoBuscado}" no se encontró en ningún archivo.`;
    return `El texto "${textoBuscado}" aparece en: ${resultados.join(', ')}.`;
}

async function renombrarArchivoLocal(nombreAntiguo, nombreNuevo) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    if (!nombreAntiguo.toLowerCase().endsWith('.txt')) nombreAntiguo += '.txt';
    if (!nombreNuevo.toLowerCase().endsWith('.txt')) nombreNuevo += '.txt';
    
    const contenido = await leerArchivo(nombreAntiguo);
    await escribirArchivo(nombreNuevo, contenido);
    await directoryHandle.removeEntry(nombreAntiguo);
    await actualizarUIArchivos();
    
    return `Archivo renombrado con éxito de ${nombreAntiguo} a ${nombreNuevo}.`;
}