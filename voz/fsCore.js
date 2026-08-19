// SILENOS 5 VOZ/fsCore.js

// ─── GESTOR DE ARCHIVOS LOCALES (FILE SYSTEM ACCESS API) ───
let directoryHandle = null;
let memoriaDirHandle = null;

// Historial unificado para deshacer y rehacer (archivos y carpetas)
let historialDeshacer = [];
let historialRehacer = [];
let ejecutandoHistorial = false;

async function abrirCarpeta() {
    try {
        directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        document.getElementById('folderStatus').innerText = "📁 " + directoryHandle.name;
        
        memoriaDirHandle = await directoryHandle.getDirectoryHandle('Memoria', { create: true });
        
        if (typeof iniciarAnalisisCognitivo === 'function') {
            iniciarAnalisisCognitivo();
        }

        await actualizarUIArchivos();
        
        document.getElementById('newFileBtn').style.display = 'block';
        
        if (typeof addMessage === 'function') {
            addMessage('system', `Carpeta "${directoryHandle.name}" vinculada con subcarpetas activas y análisis cognitivo paralelo iniciado.`);
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
        return "";
    }
}

// ─── HELPER DE RESOLUCIÓN DE RUTAS EN SUBCARPETAS ───
async function obtenerFileHandlePorRuta(ruta, crear = false) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    let partes = ruta.replace(/\\/g, '/').split('/').filter(p => p.length > 0 && p !== '.');
    if (partes.length === 0) throw new Error("Ruta de archivo inválida.");
    
    let actualHandle = directoryHandle;
    for (let i = 0; i < partes.length - 1; i++) {
        actualHandle = await actualHandle.getDirectoryHandle(partes[i], { create: crear });
    }
    
    const nombreArchivo = partes[partes.length - 1];
    return await actualHandle.getFileHandle(nombreArchivo, { create: crear });
}

async function obtenerDirHandlePorRuta(ruta, crear = false) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    let partes = ruta.replace(/\\/g, '/').split('/').filter(p => p.length > 0 && p !== '.');
    if (partes.length === 0) return directoryHandle;
    
    let actualHandle = directoryHandle;
    for (let i = 0; i < partes.length; i++) {
        actualHandle = await actualHandle.getDirectoryHandle(partes[i], { create: crear });
    }
    return actualHandle;
}

// Helper para respaldar carpetas completas antes de eliminarlas (necesario para deshacer)
async function capturarEstructuraDirectorio(dirHandle, rutaBase = '') {
    const estructura = [];
    for await (const entry of dirHandle.values()) {
        const relPath = rutaBase ? `${rutaBase}/${entry.name}` : entry.name;
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            const content = await file.text();
            estructura.push({ tipo: 'archivo', ruta: relPath, contenido: content });
        } else if (entry.kind === 'directory') {
            estructura.push({ tipo: 'carpeta', ruta: relPath });
            const subEstructura = await capturarEstructuraDirectorio(entry, relPath);
            estructura.push(...subEstructura);
        }
    }
    return estructura;
}

// ─── GESTIÓN DE CARPETAS ───

async function crearCarpeta(rutaCarpeta) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    
    if (!ejecutandoHistorial) {
        historialDeshacer.push({
            accion: 'crearCarpeta',
            rutaCarpeta: rutaCarpeta
        });
        historialRehacer = [];
    }

    await obtenerDirHandlePorRuta(rutaCarpeta, true);
    await actualizarUIArchivos();
    return `Carpeta '${rutaCarpeta}' creada correctamente.`;
}

async function copiarDirectorioRecursivo(origenHandle, destinoHandle) {
    for await (const entry of origenHandle.values()) {
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            const nuevoArchivo = await destinoHandle.getFileHandle(entry.name, { create: true });
            const writable = await nuevoArchivo.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();
        } else if (entry.kind === 'directory') {
            const nuevaSubCarpeta = await destinoHandle.getDirectoryHandle(entry.name, { create: true });
            await copiarDirectorioRecursivo(entry, nuevaSubCarpeta);
        }
    }
}

async function renombrarCarpeta(rutaAntigua, rutaNueva) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    
    const origenHandle = await obtenerDirHandlePorRuta(rutaAntigua, false);
    const destinoHandle = await obtenerDirHandlePorRuta(rutaNueva, true);
    
    await copiarDirectorioRecursivo(origenHandle, destinoHandle);
    
    let partes = rutaAntigua.replace(/\\/g, '/').split('/').filter(p => p.length > 0);
    let padreHandle = directoryHandle;
    for (let i = 0; i < partes.length - 1; i++) {
        padreHandle = await padreHandle.getDirectoryHandle(partes[i]);
    }
    await padreHandle.removeEntry(partes[partes.length - 1], { recursive: true });
    await actualizarUIArchivos();
    return `Carpeta '${rutaAntigua}' renombrada exitosamente a '${rutaNueva}'.`;
}

async function borrarCarpeta(rutaCarpeta, autorizacionExpresa = false) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta.");
    if (!autorizacionExpresa) {
        throw new Error("ACCESO DENEGADO: Se requiere confirmación y respuesta explícita del usuario en la charla.");
    }
    
    const carpetasProtegidas = ['Memoria', 'analisis_masivo', '.git', 'node_modules'];
    if (carpetasProtegidas.includes(rutaCarpeta)) {
        throw new Error(`ACCESO DENEGADO: La carpeta '${rutaCarpeta}' está protegida por el sistema y no puede ser eliminada.`);
    }

    let partes = rutaCarpeta.replace(/\\/g, '/').split('/').filter(p => p.length > 0);
    if (partes.length === 0) throw new Error("No puedes eliminar la carpeta raíz.");

    let padreHandle = directoryHandle;
    for (let i = 0; i < partes.length - 1; i++) {
        padreHandle = await padreHandle.getDirectoryHandle(partes[i]);
    }

    const carpetaTargetHandle = await padreHandle.getDirectoryHandle(partes[partes.length - 1]);
    
    // Si no proviene de una ejecución de deshacer/rehacer, hacemos respaldo completo
    if (!ejecutandoHistorial) {
        const respaldoContenido = await capturarEstructuraDirectorio(carpetaTargetHandle);
        historialDeshacer.push({
            accion: 'borrarCarpeta',
            rutaCarpeta: rutaCarpeta,
            respaldo: respaldoContenido
        });
        historialRehacer = [];
    }
    
    await padreHandle.removeEntry(partes[partes.length - 1], { recursive: true });
    await actualizarUIArchivos();
    return `Carpeta '${rutaCarpeta}' y todo su contenido han sido eliminados de forma permanente tras confirmación expresada.`;
}

// ─── OPERACIONES DE ARCHIVO Y NÚCLEO DESHACER/REHACER ───

async function deshacerAccionSistema() {
    if (!directoryHandle) throw new Error("Carpeta no conectada.");
    if (historialDeshacer.length === 0) return "No hay ninguna acción en el historial para deshacer.";
    
    const ultima = historialDeshacer.pop();
    ejecutandoHistorial = true;
    
    try {
        if (ultima.accion === 'escribir') {
            if (ultima.contenidoAnterior === null) {
                await borrarArchivo(ultima.nombre);
            } else {
                await escribirArchivo(ultima.nombre, ultima.contenidoAnterior);
            }
        } else if (ultima.accion === 'borrar') {
            await escribirArchivo(ultima.nombre, ultima.contenidoAnterior);
        } else if (ultima.accion === 'crearCarpeta') {
            await borrarCarpeta(ultima.rutaCarpeta, true);
        } else if (ultima.accion === 'borrarCarpeta') {
            await obtenerDirHandlePorRuta(ultima.rutaCarpeta, true);
            for (const item of ultima.respaldo) {
                const fullPath = `${ultima.rutaCarpeta}/${item.ruta}`;
                if (item.tipo === 'carpeta') {
                    await obtenerDirHandlePorRuta(fullPath, true);
                } else if (item.tipo === 'archivo') {
                    await escribirArchivo(fullPath, item.contenido);
                }
            }
        }
        await actualizarUIArchivos();
        historialRehacer.push(ultima);
    } finally {
        ejecutandoHistorial = false;
    }
    return `Se ha deshecho la acción (${ultima.accion}) con éxito. El estado anterior ha sido restaurado.`;
}

async function rehacerAccionSistema() {
    if (!directoryHandle) throw new Error("Carpeta no conectada.");
    if (historialRehacer.length === 0) return "No hay ninguna acción en el historial para rehacer.";
    
    const siguiente = historialRehacer.pop();
    ejecutandoHistorial = true;
    
    try {
        if (siguiente.accion === 'escribir') {
            await escribirArchivo(siguiente.nombre, siguiente.contenidoNuevo);
        } else if (siguiente.accion === 'borrar') {
            await borrarArchivo(siguiente.nombre);
        } else if (siguiente.accion === 'crearCarpeta') {
            await crearCarpeta(siguiente.rutaCarpeta);
        } else if (siguiente.accion === 'borrarCarpeta') {
            await borrarCarpeta(siguiente.rutaCarpeta, true);
        }
        await actualizarUIArchivos();
        historialDeshacer.push(siguiente);
    } finally {
        ejecutandoHistorial = false;
    }
    return `Se ha rehecho la acción (${siguiente.accion}) con éxito.`;
}

// Lista recursivamente todos los archivos válidos
async function listarArchivos(dirHandle = directoryHandle, rutaRelativa = '') {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    const archivos = [];
    const extensionesPermitidas = ['.txt', '.html', '.css', '.js', '.json'];
    const carpetasIgnoradas = ['Memoria', 'analisis_masivo', '.git', 'node_modules', 'dist', 'build', '.next', 'vendor'];

    for await (const entry of dirHandle.values()) {
        if (carpetasIgnoradas.includes(entry.name)) continue;

        const pathActual = rutaRelativa ? `${rutaRelativa}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
            const nombreMinuscula = entry.name.toLowerCase();
            if (extensionesPermitidas.some(ext => nombreMinuscula.endsWith(ext))) {
                archivos.push(pathActual);
            }
        } else if (entry.kind === 'directory') {
            const subArchivos = await listarArchivos(entry, pathActual);
            archivos.push(...subArchivos);
        }
    }
    return archivos;
}

async function leerArchivo(nombre) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    try {
        const fileHandle = await obtenerFileHandlePorRuta(nombre, false);
        const file = await fileHandle.getFile();
        return await file.text();
    } catch (e) {
        throw new Error(`No se pudo leer el archivo ${nombre}. ¿Existe?`);
    }
}

async function escribirArchivo(nombre, contenido) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    if (!ejecutandoHistorial) {
        let contenidoAnterior = null;
        try {
            const fileHandle = await obtenerFileHandlePorRuta(nombre, false);
            const file = await fileHandle.getFile();
            contenidoAnterior = await file.text();
        } catch (e) {}
        
        historialDeshacer.push({
            accion: 'escribir',
            nombre: nombre,
            contenidoAnterior: contenidoAnterior,
            contenidoNuevo: contenido
        });
        historialRehacer = [];
    }

    const fileHandle = await obtenerFileHandlePorRuta(nombre, true);
    const writable = await fileHandle.createWritable();
    await writable.write(contenido);
    await writable.close();
    await actualizarUIArchivos();
}

async function borrarArchivo(nombre) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    if (!ejecutandoHistorial) {
        let contenidoAnterior = null;
        try {
            contenidoAnterior = await leerArchivo(nombre);
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

    let partes = nombre.replace(/\\/g, '/').split('/').filter(p => p.length > 0);
    let dirHandle = directoryHandle;
    for (let i = 0; i < partes.length - 1; i++) {
        dirHandle = await dirHandle.getDirectoryHandle(partes[i]);
    }
    await dirHandle.removeEntry(partes[partes.length - 1]);
    await actualizarUIArchivos();
}

async function reemplazarTextoArchivo(nombre, textoBuscado, textoNuevo) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    const contenidoActual = await leerArchivo(nombre);
    if (!contenidoActual.includes(textoBuscado)) {
        throw new Error(`El texto exacto a buscar no se encontró en el archivo ${nombre}.`);
    }

    const nuevoContenido = contenidoActual.replace(textoBuscado, textoNuevo);
    await escribirArchivo(nombre, nuevoContenido);
    return nuevoContenido;
}

async function agregarAlFinalArchivo(nombre, textoAgregar) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    const contenidoActual = await leerArchivo(nombre);
    const prefijo = (contenidoActual && !contenidoActual.endsWith('\n')) ? '\n' : '';
    const nuevoContenido = contenidoActual + prefijo + textoAgregar;
    
    await escribirArchivo(nombre, nuevoContenido);
    return nuevoContenido;
}

async function leerLineas(nombre, lineaInicio, lineaFin) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    const contenido = await leerArchivo(nombre);
    const lineas = contenido.split('\n');
    
    const inicio = Math.max(1, lineaInicio) - 1;
    const fin = Math.min(lineas.length, lineaFin);
    
    if (inicio >= lineas.length) throw new Error("La línea de inicio solicitada está más allá del final del archivo.");
    
    const fragmento = lineas.slice(inicio, fin).join('\n');
    return `--- Líneas ${inicio + 1} a ${fin} de ${lineas.length} ---\n${fragmento}`;
}

async function buscarEnArchivos(textoBuscado) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
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
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    const contenido = await leerArchivo(nombreAntiguo);
    await escribirArchivo(nombreNuevo, contenido);
    await borrarArchivo(nombreAntiguo);
    await actualizarUIArchivos();
    
    return `Archivo renombrado con éxito de ${nombreAntiguo} a ${nombreNuevo}.`;
}

async function leerTodosLosArchivos() {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
    const archivos = await listarArchivos();
    if (archivos.length === 0) return "La carpeta está vacía o no contiene archivos válidos.";
    
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

async function analizarContenido(tipoAnalisis, objetivo, instrucciones, nombreResultado, modelo) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta.");
    
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

    const promptFinal = `Actúa como un ingeniero de software experto de alta precisión. Procesa el siguiente contexto y genera el código o análisis strictly limpio, libre de explicaciones innecesarias o markdown invasivo fuera del formato solicitado.\n\nDIRECTRICES:\n"${instrucciones}"\n\n${datosAEnviar}\n\nResultado completo:`;

    let modeloId = "gemini-3.5-flash-lite";
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
    
    if (resultadoAnalisis.startsWith("```")) {
        const lineas = resultadoAnalisis.split("\n");
        if (lineas[0].startsWith("```")) lineas.shift();
        if (lineas[lineas.length - 1].startsWith("```")) lineas.pop();
        resultadoAnalisis = lineas.join("\n");
    }

    let nombreArchivoFinal = nombreResultado || "resultado_desarrollo.html";
    await escribirArchivo(nombreArchivoFinal, resultadoAnalisis);
    
    return `Generación y análisis finalizado utilizando ${modeloId}. Los datos estructurados han sido guardados con éxito en "${nombreArchivoFinal}".`;
}

async function ejecutarAnalisisCompletoModeloFuerte(objetivo, instrucciones) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: El usuario no ha conectado la carpeta de trabajo.");

    const apiKey = localStorage.getItem('gemini_api_key_standalone');
    if (!apiKey) throw new Error("No hay API Key configurada.");

    let compiladoArchivos = "";
    const todosLosArchivos = await listarArchivos();

    if (!objetivo || objetivo.toUpperCase() === 'PROYECTO_COMPLETO') {
        for (const arch of todosLosArchivos) {
            try {
                const txt = await leerArchivo(arch);
                compiladoArchivos += `\n--- ARCHIVO: ${arch} ---\n${txt}\n`;
            } catch(e) {}
        }
    } else {
        const listaTargets = objetivo.split(',').map(s => s.trim().toLowerCase());
        for (const arch of todosLosArchivos) {
            const archLower = arch.toLowerCase();
            const coincide = listaTargets.some(t => archLower === t || archLower.startsWith(t + '/'));
            if (coincide) {
                try {
                    const txt = await leerArchivo(arch);
                    compiladoArchivos += `\n--- ARCHIVO: ${arch} ---\n${txt}\n`;
                } catch(e) {}
            }
        }
    }

    if (!compiladoArchivos.trim()) {
        compiladoArchivos = `[Aviso: No se encontraron archivos bajo el objetivo indicado: "${objetivo}"]`;
    }

    const promptFinal = `[ANALISIS COMPLETO - MODELO FUERTE]\n\nINSTRUCCIONES DE ANÁLISIS:\n${instrucciones}\n\nCONTENIDO Y ESTRUCTURA RECOPILADA:\n${compiladoArchivos}\n\nProporciona un análisis exhaustivo, técnico y completo:`;

    const url = `[https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=$){apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptFinal }] }]
        })
    });

    if (!response.ok) {
        throw new Error(`Error en llamada al modelo fuerte (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("El modelo de análisis no devolvió una respuesta válida.");
    }

    return data.candidates[0].content.parts[0].text;
}