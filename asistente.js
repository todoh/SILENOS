// =================================================================================
// CÓDIGO PARA CARGAR PROYECTOS DESDE UNA CARPETA (VERSIÓN CORREGIDA Y ROBUSTA)
// =================================================================================

// --- Variables Globales del Proyecto (Aseguramos que existan) ---
// Es probable que tu código ya las tenga, pero esto previene errores.
let proyecto = {};
let libros = [];
let personajes = [];
let guiones = [];
let momentos = [];
// ... (añade otras variables globales de datos si las tienes)

/**
 * Inicia el proceso de selección de carpeta haciendo clic en un input oculto.
 */
function seleccionarCarpeta() {
    if (typeof iniciarAnimacionSalida === 'function') iniciarAnimacionSalida();
    if (typeof cerrartodo === 'function') cerrartodo();
    if (typeof abrir === 'function') abrir('proyecto');
    document.getElementById('folder-loader').click();
}

/**
 * Procesa los datos de un JSON y los carga en las variables globales de la aplicación.
 * @param {object} datosCargados - El objeto JSON parseado del archivo.
 */
function procesarYRenderizarProyecto(datosCargados, nombreArchivo) {
    try {
        // 1. Validamos que los datos básicos existan
        if (!datosCargados || typeof datosCargados !== 'object') {
            throw new Error("El archivo JSON está vacío o no es un objeto válido.");
        }

        // 2. Cargamos los datos en las variables globales
        //    (Asignamos un array vacío si la propiedad no existe en el JSON)
        proyecto = datosCargados.proyecto || {};
        libros = datosCargados.libros || [];
        personajes = datosCargados.personajes || [];
        guiones = datosCargados.guiones || [];
        momentos = datosCargados.momentos || [];
        // ... (asigna aquí otras partes de tu proyecto)

        // Actualiza el título del proyecto en la interfaz si existe
        const tituloInput = document.getElementById('asistente-titulo-input');
        if (tituloInput && proyecto.titulo) {
            tituloInput.value = proyecto.titulo;
        }
        
        // 3. Guardamos en localStorage para persistencia
        localStorage.setItem('proyectoGuardado', JSON.stringify(datosCargados));

        // 4. Renderizamos la vista con los datos ya cargados en memoria
        if (typeof renderizarVisorDeLibros === 'function') {
            renderizarVisorDeLibros();
        } else {
            console.warn("La función 'renderizarVisorDeLibros' no se encontró. Recargando la página como alternativa.");
            location.reload();
        }

        alert(`Proyecto "${nombreArchivo}" cargado y procesado correctamente.`);

    } catch (error) {
        console.error("Error al procesar los datos del proyecto:", error);
        alert(`Hubo un error al procesar el archivo "${nombreArchivo}":\n${error.message}`);
    }
}


/**
 * Se ejecuta cuando el usuario ha seleccionado una carpeta.
 * Muestra una lista de archivos JSON para cargar.
 */
function handleFolderSelection(event) {
    const files = event.target.files;
    const carpetaDiv = document.getElementById('carpeta');
    carpetaDiv.innerHTML = '<h3>Archivos JSON en la carpeta:</h3>';
    
    const jsonFiles = Array.from(files).filter(file => file.name.endsWith('.json'));

    if (jsonFiles.length === 0) {
        carpetaDiv.innerHTML += '<p>No se encontraron archivos .json.</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.style.cssText = "list-style-type: none; padding: 0; max-height: 280px; overflow-y: auto; pointer-events: auto;";
    carpetaDiv.appendChild(ul);
    
    jsonFiles.sort((a, b) => a.name.localeCompare(b.name)).forEach(file => {
        const li = document.createElement('li');
        li.textContent = file.name;
        li.style.cssText = "cursor: pointer; padding: 8px; border-bottom: 1px solid #ddd;";
        li.addEventListener('mouseover', () => li.style.backgroundColor = 'rgba(0,0,0,0.05)');
        li.addEventListener('mouseout', () => li.style.backgroundColor = 'transparent');

        li.addEventListener('click', () => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    // AHORA LLAMAMOS A NUESTRA FUNCIÓN CENTRALIZADA
                    procesarYRenderizarProyecto(jsonData, file.name);
                } catch (error) {
                    alert(`El archivo "${file.name}" no es un JSON válido.`);
                    console.error("Error de parseo JSON:", error);
                }
            };
            reader.readAsText(file);
        });
        ul.appendChild(li);
    });
}

// Vincula el evento 'change' al input de carpeta cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const folderLoader = document.getElementById('folder-loader');
    if (folderLoader) {
        folderLoader.addEventListener('change', handleFolderSelection);
    }
});