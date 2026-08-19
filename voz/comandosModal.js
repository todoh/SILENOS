// SILENOS 5 VOZ / comandosModal.js

// Lista completa de comandos de voz que entiende el asistente VOZ SILENOS
const COMANDOS_VOZ = [
    {
        comando: "Listar archivos",
        descripcion: "Muestra la lista de todos los archivos válidos (.txt, .html, .css, .js, .json) presentes en la carpeta de trabajo conectada.",
        ejemplo: "«Muestra todos los archivos de la carpeta» o «Listar archivos»"
    },
    {
        comando: "Leer archivo",
        descripcion: "Lee y analiza el contenido completo de un archivo específico de la carpeta.",
        ejemplo: "«Lee el archivo index.html» o «Abre notas.txt»"
    },
    {
        comando: "Leer todos los archivos",
        descripcion: "Compila y lee por completo todos los archivos de la carpeta raíz de golpe para ofrecer una visión global del proyecto.",
        ejemplo: "«Lee todos los archivos de la carpeta»"
    },
    {
        comando: "Leer líneas",
        descripcion: "Inspecciona un rango específico de líneas dentro de un archivo sin necesidad de leer todo el documento.",
        ejemplo: "«Léeme de la línea 10 a la 50 de app.js»"
    },
    {
        comando: "Buscar en archivos",
        descripcion: "Busca una palabra, función, selector CSS o id en todos los archivos de la carpeta y devuelve las coincidencias.",
        ejemplo: "«Busca la función toggleConnection en los archivos»"
    },
    {
        comando: "Escribir o crear archivo",
        descripcion: "Crea un archivo nuevo o sobrescribe por completo uno existente con el contenido y formato indicados.",
        ejemplo: "«Crea un archivo llamado estiles.css con un fondo negro»"
    },
    {
        comando: "Reemplazar texto",
        descripcion: "Sustituye un fragmento exacto de código o texto por una versión nueva dentro de un archivo especifico.",
        ejemplo: "«Reemplaza la función abrirCarpeta por esta nueva versión...»"
    },
    {
        comando: "Agregar al final",
        descripcion: "Añade código o texto directamente al final de un archivo sin modificar lo que ya existe.",
        ejemplo: "«Añade este nuevo botón al final de index.html»"
    },
    {
        comando: "Renombrar archivo",
        descripcion: "Cambia el nombre o la extensión de un archivo existente en el espacio de trabajo.",
        ejemplo: "«Renombra notas.txt a ideas.txt»"
    },
    {
        comando: "Borrar archivo",
        descripcion: "Elimina permanentemente un archivo específico de la carpeta conectada.",
        ejemplo: "«Elimina el archivo borrador.txt»"
    },
    {
        comando: "Abrir en el editor",
        descripcion: "Muestra visualmente el archivo indicado dentro del panel del editor en la interfaz del usuario.",
        ejemplo: "«Abre index.html en el editor»"
    },
    {
        comando: "Crear carpeta",
        descripcion: "Crea una nueva subcarpeta dentro de la ruta especificada de tu espacio de trabajo.",
        ejemplo: "«Crea la carpeta src/componentes»"
    },
    {
        comando: "Renombrar carpeta",
        descripcion: "Cambia el nombre o desplaza una subcarpeta a una nueva ruta.",
        ejemplo: "«Renombra la carpeta src a codigo_fuente»"
    },
    {
        comando: "Borrar carpeta",
        descripcion: "Elimina permanentemente una subcarpeta y su contenido. Requiere confirmación verbal previa.",
        ejemplo: "«Elimina la carpeta temporales» (El asistente solicitará autorización)"
    },
    {
        comando: "Deshacer acción",
        descripcion: "Restaura el estado anterior deshaciendo la última modificación o borrado de archivos o carpetas.",
        ejemplo: "«Deshaz la última acción» o «Echa para atrás»"
    },
    {
        comando: "Rehacer acción",
        descripcion: "Rehace la acción que habías deshecho anteriormente.",
        ejemplo: "«Rehaz el cambio» o «Echa para adelante»"
    },
    {
        comando: "Análisis con Modelo Fuerte",
        descripcion: "Pide al modelo avanzado (Gemini 3.6 Flash) que realice una auditoría profunda o arquitectura global del proyecto.",
        ejemplo: "«Haz un análisis completo del proyecto con el modelo fuerte»"
    }
];

// Generación e Inyección Dinámica del Modal en el DOM
function inicializarModalComandos() {
    if (document.getElementById('comandosModal')) return;

    const modalHTML = `
    <div id="comandosModal" class="modal">
        <div class="modal-content" style="width: 600px; max-width: 90vw; max-height: 85vh; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-b: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 12px;">
                <h3 style="margin:0; font-size: 1.2rem; font-weight: 700; color: var(--text);">🎙️ Comandos de Voz del Asistente</h3>
                <button onclick="cerrarModalComandos()" style="background: transparent; border: none; font-size: 18px; cursor: pointer; color: var(--text-dim); font-weight: bold;">✕</button>
            </div>
            <p class="modal-desc" style="margin-bottom: 15px;">Listado de herramientas e instrucciones que el asistente puede ejecutar verbalmente durante la sesión:</p>
            
            <div id="comandosListaContainer" style="flex: 1; overflow-y: auto; padding-right: 6px; display: flex; flex-direction: column; gap: 12px;">
                ${COMANDOS_VOZ.map(item => `
                    <div style="background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px;">
                        <div style="font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                            <span>⚡</span> ${item.comando}
                        </div>
                        <div style="font-size: 12px; color: var(--text-dim); line-height: 1.4; margin-bottom: 6px;">
                            ${item.descripcion}
                        </div>
                        <div style="font-size: 11px; font-family: monospace; background: rgba(0,0,0,0.04); padding: 4px 8px; border-radius: 4px; color: var(--text);">
                            <strong>Ejemplo:</strong> ${item.ejemplo}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 15px; pt-3; border-top: 1px solid var(--border); display: flex; justify-content: flex-end;">
                <button onclick="cerrarModalComandos()" class="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all">ENTENDIDO</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function abrirModalComandos() {
    inicializarModalComandos();
    const modal = document.getElementById('comandosModal');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalComandos() {
    const modal = document.getElementById('comandosModal');
    if (modal) modal.style.display = 'none';
}

// Escuchar click fuera del contenido para cerrar
document.addEventListener('click', (e) => {
    const modal = document.getElementById('comandosModal');
    if (modal && e.target === modal) {
        cerrarModalComandos();
    }
});