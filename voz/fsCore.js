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

// MODIFICADO: Ahora lista tanto .txt como formatos de desarrollo .html, .css y .js
async function listarArchivos() {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    const archivos = [];
    const extensionesPermitidas = ['.txt', '.html', '.css', '.js'];
    for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file') {
            const nombreMinuscula = entry.name.toLowerCase();
            if (extensionesPermitidas.some(ext => nombreMinuscula.endsWith(ext))) {
                archivos.push(entry.name);
            }
        }
    }
    return archivos;
}

// MODIFICADO: Auto-asigna .txt solo si no tiene ya una extensión web válida (.html, .css, .js)
async function leerArchivo(nombre) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    
    const nombreMinuscula = nombre.toLowerCase();
    if (!nombreMinuscula.endsWith('.txt') && !nombreMinuscula.endsWith('.html') && !nombreMinuscula.endsWith('.css') && !nombreMinuscula.endsWith('.js')) {
        nombre += '.txt';
    }
    
    try {
        const fileHandle = await directoryHandle.getFileHandle(nombre);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return text;
    } catch (e) {
        throw new Error(`No se pudo leer el archivo ${nombre}. ¿Existe?`);
    }
}

// MODIFICADO: Soporta escritura nativa de código web respetando su formato original
async function escribirArchivo(nombre, contenido) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    
    const nombreMinuscula = nombre.toLowerCase();
    if (!nombreMinuscula.endsWith('.txt') && !nombreMinuscula.endsWith('.html') && !nombreMinuscula.endsWith('.css') && !nombreMinuscula.endsWith('.js')) {
        nombre += '.txt';
    }
    
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
    
    const nombreMinuscula = nombre.toLowerCase();
    if (!nombreMinuscula.endsWith('.txt') && !nombreMinuscula.endsWith('.html') && !nombreMinuscula.endsWith('.css') && !nombreMinuscula.endsWith('.js')) {
        nombre += '.txt';
    }
    
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
    
    const nombreMinuscula = nombre.toLowerCase();
    if (!nombreMinuscula.endsWith('.txt') && !nombreMinuscula.endsWith('.html') && !nombreMinuscula.endsWith('.css') && !nombreMinuscula.endsWith('.js')) {
        nombre += '.txt';
    }

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
    
    const nombreMinuscula = nombre.toLowerCase();
    if (!nombreMinuscula.endsWith('.txt') && !nombreMinuscula.endsWith('.html') && !nombreMinuscula.endsWith('.css') && !nombreMinuscula.endsWith('.js')) {
        nombre += '.txt';
    }

    const contenidoActual = await leerArchivo(nombre);
    const prefijo = (contenidoActual && !contenidoActual.endsWith('\n')) ? '\n' : '';
    const nuevoContenido = contenidoActual + prefijo + textoAgregar;
    
    await escribirArchivo(nombre, nuevoContenido);
    return nuevoContenido;
}

// ─── OTRAS LOGÍSTICAS COMPLEMENTARIAS ───

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
        } catch(e) {}
    }
    
    if (resultados.length === 0) return `El texto "${textoBuscado}" no se encontró en ningún archivo.`;
    return `El texto "${textoBuscado}" aparece en: ${resultados.join(', ')}.`;
}

async function renombrarArchivoLocal(nombreAntiguo, nombreNuevo) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    
    const oldMin = nombreAntiguo.toLowerCase();
    if (!oldMin.endsWith('.txt') && !oldMin.endsWith('.html') && !oldMin.endsWith('.css') && !oldMin.endsWith('.js')) nombreAntiguo += '.txt';
    
    const newMin = nombreNuevo.toLowerCase();
    if (!newMin.endsWith('.txt') && !newMin.endsWith('.html') && !newMin.endsWith('.css') && !newMin.endsWith('.js')) nombreNuevo += '.txt';
    
    const contenido = await leerArchivo(nombreAntiguo);
    await escribirArchivo(nombreNuevo, contenido);
    await directoryHandle.removeEntry(nombreAntiguo);
    await actualizarUIArchivos();
    
    return `Archivo renombrado con éxito de ${nombreAntiguo} a ${nombreNuevo}.`;
}

async function leerTodosLosArchivos() {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    
    const archivos = await listarArchivos();
    if (archivos.length === 0) return "La carpeta está vacía o no contiene archivos de texto/desarrollo válidos.";
    
    let compiladoTotal = "";
    for (const arch of archivos) {
        try {
            const contenido = await leerArchivo(arch);
            compiladoTotal += `\n========================================\n`;
            compiladoTotal += `ARCHIVO: ${arch}\n`;
            compiladoTotal += `========================================\n`;
            compiladoTotal += contenido + `\n`;
        } catch (e) {
            compiladoTotal += `\n[Error al leer el archivo ${arch}]\n`;
        }
    }
    return compiladoTotal;
}

// MODIFICADO: Ahora acepta el parámetro 'modelo' para alternar dinámicamente entre gemini-3.1-flash-lite y gemini-3.5-flash
async function analizarContenido(tipoAnalisis, objetivo, instrucciones, nombreResultado, modelo) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    
    const apiKey = localStorage.getItem('gemini_api_key_standalone');
    if (!apiKey) throw new Error("No hay API Key configurada.");

    let datosAEnviar = "";

    if (tipoAnalisis === 'archivo' || tipoAnalisis === 'carpeta_completa') {
        const archivosALeer = [];
        if (tipoAnalisis === 'carpeta_completa') {
            const todos = await listarArchivos();
            archivosALeer.push(...todos);
        } else {
            const lista = objetivo.split(',').map(s => s.trim());
            archivosALeer.push(...lista);
        }

        if (archivosALeer.length === 0) return "Error: No se especificaron archivos válidos para el análisis.";

        for (const arch of archivosALeer) {
            try {
                const contenido = await leerArchivo(arch);
                datosAEnviar += `\n--- CONTENIDO DEL ARCHIVO ${arch} ---\n${contenido}\n`;
            } catch (e) {
                datosAEnviar += `\n[Error al incluir archivo: ${arch}]\n`;
            }
        }
    } else if (tipoAnalisis === 'concepto') {
        datosAEnviar = `[CONCEPTO / CONTEXTO A PLANIFICAR O ANALIZAR]:\n${objetivo}`;
    }

    const promptFinal = `Actúa como un ingeniero de software experto de alta precisión. Procesa el siguiente contexto y genera el código o análisis estrictamente limpio, libre de explicaciones innecesarias o markdown invasivo fuera del formato solicitado.\n\nDIRECTRICES:\n"${instrucciones}"\n\n${datosAEnviar}\n\nResultado completo:`;

    // Selección inteligente del modelo basado en la orden del usuario
    let modeloId = "gemini-3.1-flash-lite";
    if (modelo === 'gemini-3.5-flash') {
        modeloId = "gemini-3.5-flash";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modeloId}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptFinal }] }]
        })
    });

    if (!response.ok) {
        throw new Error(`Error en la llamada paralela de ${modeloId}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No se obtuvo respuesta del modelo de análisis.");
    }

    let resultadoAnalisis = data.candidates[0].content.parts[0].text;
    
    // Limpieza opcional de bloques de código markdown que meta la API por error en archivos puros
    if (resultadoAnalisis.startsWith("```")) {
        const lineas = resultadoAnalisis.split("\n");
        if (lineas[0].startsWith("```")) lineas.shift();
        if (lineas[lineas.length - 1].startsWith("```")) lineas.pop();
        resultadoAnalisis = lineas.join("\n");
    }

    let nombreArchivoFinal = nombreResultado || "resultado_desarrollo.html";
    const oldMin = nombreArchivoFinal.toLowerCase();
    if (!oldMin.endsWith('.txt') && !oldMin.endsWith('.html') && !oldMin.endsWith('.css') && !oldMin.endsWith('.js')) {
        nombreArchivoFinal += '.html';
    }
    
    await escribirArchivo(nombreArchivoFinal, resultadoAnalisis);
    
    return `Generación y análisis finalizado utilizando ${modeloId}. Los datos estructurados han sido guardados con éxito en "${nombreArchivoFinal}".`;
}