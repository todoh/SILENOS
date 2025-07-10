/**
 * geminiasistente.js (Arquitectura Proactiva y Modular v3)
 * * Este script implementa un sistema de análisis narrativo avanzado.
 * - La IA ahora determina dinámicamente los atributos de personaje más relevantes para la historia.
 * - Genera un análisis detallado y un gráfico radar para CADA personaje identificado.
 * - Mantiene la arquitectura de múltiples llamadas y renderizado progresivo.
 */
let ultimoInformeGenerado = null;

document.addEventListener('DOMContentLoaded', () => {
    const botonAnalisis = document.getElementById('analizar-datos-btn');
    if (botonAnalisis) {
        botonAnalisis.addEventListener('click', generarInformeExtendido);
    }
});

// ... (la función recolectarDatos no cambia)
function recolectarDatos() {
    console.log("Iniciando recolección de datos desde el DOM...");

    // 1. Apuntar al contenedor principal de los datos.
    const contenedorDatos = document.getElementById('listapersonajes');
    if (!contenedorDatos) {
        console.error("Error crítico: No se encontró el contenedor de datos con id '#listapersonajes'.");
        return {}; // Devolver un objeto vacío si no hay contenedor.
    }

    // 2. Seleccionar todos los elementos de datos.
    const elementosDato = contenedorDatos.querySelectorAll('.personaje');
    console.log(`Se encontraron ${elementosDato.length} elementos .personaje en el DOM.`);

    // Objeto para almacenar los datos agrupados por su etiqueta.
    const datosAgrupados = {};

    // 3. Iterar sobre cada elemento del DOM para extraer y agrupar su información.
    elementosDato.forEach(elemento => {
        const nombreInput = elemento.querySelector('.nombreh');
        const descripcionTextarea = elemento.querySelector('textarea');
        const etiquetaBtn = elemento.querySelector('.change-tag-btn');

        const nombre = nombreInput ? nombreInput.value.trim() : '';
        const descripcion = descripcionTextarea ? descripcionTextarea.value.trim() : '';
        const etiqueta = etiquetaBtn ? (etiquetaBtn.dataset.etiqueta || 'indeterminado').toLowerCase() : 'indeterminado';

        // 4. Filtrar para excluir etiquetas no deseadas y elementos sin nombre.
        if (etiqueta !== 'indeterminado' && etiqueta !== 'visual' && nombre) {
            
            // Si la categoría (etiqueta) aún no existe en nuestro objeto, la creamos como un array vacío.
            if (!datosAgrupados[etiqueta]) {
                datosAgrupados[etiqueta] = [];
            }

            // 5. Añadir el dato a su categoría correspondiente.
            // Nótese que ya no añadimos la propiedad 'etiqueta' dentro del objeto,
            // pues la clave principal del grupo ya la define.
            datosAgrupados[etiqueta].push({
                nombre: nombre,
                descripcion: descripcion
            });
        }
    });

    const numCategorias = Object.keys(datosAgrupados).length;
    const numDatos = Object.values(datosAgrupados).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`${numDatos} datos analizables encontrados y agrupados en ${numCategorias} categorías.`);
    
    // 6. Devolver el objeto con los datos ya separados por su etiqueta.
    return datosAgrupados;
}


function crearPromptIdentificarCategoriasPersonajes(datos) {
    const schema = { "categorias_personajes": ["string"] };
    const categoriasDisponibles = Object.keys(datos);
    return `Dado el siguiente diccionario de datos de un proyecto narrativo, donde las claves son las categorías, necesito que identifiques cuáles de estas categorías representan "personajes". Un "personaje" es cualquier entidad con agencia que participa en la trama (ej: héroes, villanos, aliados, criaturas, razas inteligentes, etc.), en contraposición a lugares, objetos o conceptos.

Categorías disponibles: [${categoriasDisponibles.join(', ')}]

Analiza el contenido de cada categoría para tomar tu decisión.

Devuelve ÚNICAMENTE un objeto JSON que contenga un array con los nombres de las claves que identificaste como categorías de personajes. La estructura debe ser: ${JSON.stringify(schema)}.

Contexto de los datos:
${JSON.stringify(datos, null, 2)}`;
}



function renderizarSeccionTrama(data) {
    const container = document.getElementById('platzhalter-trama');
    if (!container) return;
    const timelineStyles = `<style>.timeline-container-horizontal{position:relative;width:95%;margin:50px auto 20px auto;padding-top:20px;}.timeline-line{position:absolute;top:10px;left:0;width:100%;height:3px;background-color:#e0e0e0;border-radius:2px;}.timeline-events{position:relative;display:flex;justify-content:space-between;height:100%;}.timeline-event{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;width:100px;cursor:help;}.timeline-dot{position:absolute;top:0;width:15px;height:15px;background-color:#3498db;border-radius:50%;transform:translateY(-45%);border:2px solid white;box-shadow:0 0 5px rgba(0,0,0,0.2);}.timeline-label{margin-top:25px;font-size:0.8em;font-weight:500;color:#333;}.dark-theme .timeline-line{background-color:#444;}.dark-theme .timeline-label{color:#ccc;}</style>`;

    let content = `
        <h4>Puntos Clave de la Trama</h4><ul>${Object.entries(data.puntos_clave).map(([k, v]) => `<li><b>${k.replace(/_/g, ' ')}:</b> ${v}</li>`).join('')}</ul>
        <hr><h4>Subtramas Identificadas</h4><ul>${data.subtramas_identificadas.map(s => `<li><b>${s.titulo}:</b> ${s.descripcion}</li>`).join('')}</ul>
    `;

    let timelineHTML = '';
    if (data.linea_de_tiempo_eventos && data.linea_de_tiempo_eventos.length > 0) {
        timelineHTML += `<hr><h4>Línea de Tiempo de Eventos Clave</h4><div class="timeline-container-horizontal"><div class="timeline-line"></div><div class="timeline-events">`;
        data.linea_de_tiempo_eventos.forEach(evento => {
            const tooltipText = `${evento.descripcion_evento || ''} (Ritmo: ${evento.tipo_ritmo || 'N/A'})`;
            // CORREGIDO: Se usan comillas invertidas (`) para que la interpolación de variables funcione
            timelineHTML += `<div class="timeline-event" title="${tooltipText}"><div class="timeline-dot"></div><div class="timeline-label">${evento.nombre_evento}</div></div>`;
        });
        timelineHTML += `</div></div>`;
    }

    // CORREGIDO: Se usan comillas invertidas (`) para que la interpolación de variables funcione
container.innerHTML = `
        <h3>Análisis de Trama</h3>
        ${timelineStyles}
        ${content}
        ${timelineHTML}
    `;
}
/**
 * Función orquestadora principal.
 * Gestiona el ciclo de vida completo del análisis extendido.
 */
/**
 * Función orquestadora principal.
 * Gestiona el ciclo de vida completo del análisis extendido.
 */
async function generarInformeExtendido() {
    const informeContainer = document.getElementById('informe-container');
    const botonAnalisis = document.getElementById('analizar-datos-btn');
    if (botonAnalisis) botonAnalisis.disabled = true;

    renderizarPlatzhalters(informeContainer);

    try {
        if (typeof apiKey === 'undefined' || !apiKey) {
            throw new Error("La API Key de Gemini no está definida.");
        }

        const datosDelProyecto = recolectarDatos();
        if (!datosDelProyecto || Object.keys(datosDelProyecto).length === 0) {
            throw new Error("No se encontraron datos en el proyecto para analizar.");
        }

        actualizarPlatzhalter('platzhalter-nube', 'Identificando qué categorías son personajes...');
        const { categorias_personajes } = await ejecutarAnalisisModulo('identificarPersonajes', datosDelProyecto);

        if (!categorias_personajes || !Array.isArray(categorias_personajes) || categorias_personajes.length === 0) {
            throw new Error("La IA no pudo identificar ninguna categoría de personaje. No se puede continuar.");
        }

        actualizarPlatzhalter('platzhalter-nube', `Categorías identificadas: ${categorias_personajes.join(', ')}. Generando nube de relaciones...`);
        const datosSoloPersonajes = {};
        const listaPersonajesNombres = [];
        categorias_personajes.forEach(categoria => {
            if (datosDelProyecto[categoria]) {
                datosSoloPersonajes[categoria] = datosDelProyecto[categoria];
                listaPersonajesNombres.push(...datosDelProyecto[categoria].map(p => p.nombre));
            }
        });

        const analisisNube = await ejecutarAnalisisModulo('nubePersonajes', datosSoloPersonajes);
        const personajesOriginalesParaColor = Object.values(datosSoloPersonajes).flat();

        const { atributos_comparativos } = await ejecutarAnalisisModulo('definirAtributos', datosDelProyecto);
        actualizarPlatzhalter('platzhalter-personajes', `Atributos definidos: ${atributos_comparativos.join(', ')}. Analizando cada personaje...`);
        const analisisCompleto = await ejecutarAnalisisModulo('personajesAvanzado', datosDelProyecto, {
            listaPersonajes: listaPersonajesNombres,
            atributos: atributos_comparativos
        });

        const analisisTrama = await ejecutarAnalisisModulo('trama', datosDelProyecto);
        const analisisTematico = await ejecutarAnalisisModulo('analisisTematico', datosDelProyecto);
        const analisisTono = await ejecutarAnalisisModulo('analisisTono', datosDelProyecto);
        const analisisDiagnostico = await ejecutarAnalisisModulo('diagnostico', datosDelProyecto);

        // CORREGIDO: Se ha añadido la propiedad 'tono: analisisTono' al objeto.
        ultimoInformeGenerado = {
            nube: analisisNube,
            personajes: analisisCompleto,
            atributos: atributos_comparativos,
            personajesOriginales: personajesOriginalesParaColor,
            trama: analisisTrama,
            temas: analisisTematico,
            tono: analisisTono,
            diagnostico: analisisDiagnostico
        };

        renderizarInformeCompleto(ultimoInformeGenerado);

    } catch (error) {
        console.error("Error detallado durante la generación del informe extendido:", error);
        informeContainer.innerHTML = `<div><strong>¡Ha ocurrido un error!</strong><span>${error.message}</span><p>Revisa la consola del desarrollador para más detalles.</p></div>`;
    } finally {
        if (botonAnalisis) botonAnalisis.disabled = false;
    }
}

/**
 * Ejecuta el análisis para un módulo específico, pasando datos extra si es necesario.
 */
async function ejecutarAnalisisModulo(modulo, datos, datosExtra = {}) {
    let prompt;
    switch (modulo) {
        case 'identificarPersonajes': // <--- AÑADIR ESTA LÍNEA
            prompt = crearPromptIdentificarCategoriasPersonajes(datos); // <--- AÑADIR ESTA LÍNEA
            break; // <--- AÑADIR ESTA LÍNEA
        case 'nubePersonajes':
            prompt = crearPromptNubePersonajes(datos);
            break;
        // ... el resto de los cases no cambian
        case 'definirAtributos':
            prompt = crearPromptDefinirAtributos(datos);
            break;
        case 'personajesAvanzado':
            prompt = crearPromptAnalisisPersonajesAvanzado(datos, datosExtra.listaPersonajes, datosExtra.atributos);
            break;
        case 'trama':
            prompt = crearPromptTrama(datos);
            break;
             case 'analisisTematico':
            prompt = crearPromptAnalisisTematico(datos);
            break;
             case 'analisisTono':
            prompt = crearPromptTonoSentimiento(datos);
            break;
        case 'diagnostico':
            prompt = crearPromptDiagnostico(datos);
            break;
        default:
            throw new Error(`Módulo de análisis desconocido: ${modulo}`);
    }
    return await llamarApiGemini(prompt);
}


// --- SECCIÓN DE CREACIÓN DE PROMPTS MODULARES ---

function crearPromptNubePersonajes(datos) {
    const schema = { "nodos": [{ "id": "string", "relevancia": "number" }], "enlaces": [{ "origen": "string", "destino": "string", "tipo": "string" }] };
    return `Analiza todos los personajes y sus relaciones. Devuelve UNICAMENTE un objeto JSON con 'nodos' (personajes y su relevancia 1-10) y 'enlaces' (conexiones). Estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`;
}

function crearPromptDefinirAtributos(datos) {
    const schema = { "atributos_comparativos": ["string"] };
    return `Basado en la siguiente narrativa, define los 4 o 5 atributos más importantes y relevantes para comparar a los personajes (ej: "Astucia", "Habilidad en Combate", "Carisma", "Corrupción"). Devuelve UNICAMENTE un JSON con la estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`;
}

function crearPromptAnalisisPersonajesAvanzado(datos, listaPersonajes, atributos) {
    const schema = { "analisis_completo": [{ "nombre": "string", "descripcion": "string", "puntuaciones": { /* "Atributo1": number, ... */ } }] };
    atributos.forEach(attr => schema.analisis_completo[0].puntuaciones[attr] = "number (1-10)");
    return `Para CADA personaje en la lista [${listaPersonajes.join(', ')}], proporciona una descripción y una puntuación (1-10) para cada uno de los siguientes atributos: [${atributos.join(', ')}]. Devuelve UNICAMENTE un objeto JSON con la estructura: ${JSON.stringify(schema)}. Contexto de la historia: ${JSON.stringify(datos)}`;
}
// --- PROMPT DE TRAMA MODIFICADO ---
function crearPromptTrama(datos) {
    const schema = {
        "puntos_clave": { "incidente_detonante": "string", "nudo_principal": "string", "climax": "string", "resolucion": "string" },
        "subtramas_identificadas": [{ "titulo": "string", "descripcion": "string" }],
        "linea_de_tiempo_eventos": [{
            "nombre_evento": "string",
            "descripcion_evento": "Breve descripción del evento.",
            "tipo_ritmo": "string (Clasificar como 'Acción Intensa', 'Desarrollo de Personaje', 'Exposición' o 'Tensión Creciente')"
        }]
    };
    return `Analiza la trama. Identifica los puntos clave, subtramas y una línea de tiempo cronológica de eventos. Para cada evento en la línea de tiempo, clasifica su ritmo narrativo. Devuelve ÚNICAMENTE un objeto JSON con la estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`;
}

// --- NUEVO PROMPT PARA ANÁLISIS TEMÁTICO ---
function crearPromptAnalisisTematico(datos) {
    const schema = {
        "analisis_tematico": [{
            "tema": "string (ej: 'El Sacrificio', 'La Venganza', 'La Amistad')",
            "importancia": "number (1-10, qué tan central es el tema en la historia)"
        }]
    };
    return `Analiza el siguiente proyecto narrativo e identifica los 5 temas principales que explora. Para cada tema, asigna una puntuación de importancia del 1 al 10. Devuelve ÚNICAMENTE un objeto JSON con la estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`;
}
function crearPromptTonoSentimiento(datos) {
    const schema = {
        "tono_general": "string (ej: 'Oscuro y melancólico con momentos de esperanza')",
        "sentimiento_por_evento": [
            {
                "nombre_evento": "string (debe coincidir con un evento de la trama)",
                "puntuacion_sentimiento": "number (de -1.0 para muy negativo a 1.0 para muy positivo)"
            }
        ]
    };
    return `Analiza el tono y el sentimiento del proyecto. 
1. Describe el tono general de la narrativa en una frase.
2. Para cada evento principal implícito en los datos, asigna una puntuación de sentimiento entre -1.0 (muy negativo, triste, trágico) y 1.0 (muy positivo, alegre, triunfante). 0.0 es neutral.
Devuelve ÚNICAMENTE un objeto JSON con la estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`;
}

function crearPromptDiagnostico(datos) {
    const schema = { "puntos_fuertes": ["string"], "posibles_inconsistencias": [{ "tipo": "string", "descripcion": "string", "sugerencia_resolucion": "string" }], "oportunidades_narrativas": [{ "descripcion": "string", "sugerencia_desarrollo": "string" }] };
    return `Actúa como un editor experto. Analiza el proyecto en busca de inconsistencias y oportunidades. Devuelve UNICAMENTE un objeto JSON con la siguiente estructura: ${JSON.stringify(schema)}. Datos: ${JSON.stringify(datos)}`;
}

// --- SECCIÓN DE RENDERIZADO PROGRESIVO ---

function renderizarPlatzhalters(container) {
    container.innerHTML = `
        <div id="platzhalter-nube" class="platzhalter-card full-width-card"><h3>Generando Nube de Personajes...</h3><div class="spinner"></div></div>
        <div id="platzhalter-personajes" class="platzhalter-card full-width-card"><h3>Analizando Personajes...</h3><div class="spinner"></div></div>
        <div id="platzhalter-trama" class="platzhalter-card"><h3>Analizando Trama...</h3><div class="spinner"></div></div>
        <div id="platzhalter-ritmo-temas" class="platzhalter-card"><h3>Analizando Ritmo y Temas...</h3><div class="spinner"></div></div>
        <div id="platzhalter-tono" class="platzhalter-card full-width-card"><h3>Analizando Tono y Sentimiento...</h3><div class="spinner"></div></div>
        <div id="platzhalter-diagnostico" class="platzhalter-card full-width-card"><h3>Realizando Diagnóstico...</h3><div class="spinner"></div></div>
    `;
    // Los estilos de .platzhalter-card y .spinner ahora deberían estar en styles.css
}

function actualizarPlatzhalter(id, mensaje) {
    const container = document.getElementById(id);
    if (container) {
        container.innerHTML = `<h3>${mensaje}</h3><div class="spinner"></div>`;
    }
}

function renderizarSeccionNubePersonajes(data, personajesOriginales) {
    const container = document.getElementById('platzhalter-nube');
    if (!container) return;

    const canvasId = 'character-cloud-canvas';
    
    container.innerHTML = `
        <h3> </h3>
        <canvas id="${canvasId}" style="width: 100%; display: block; border: 1px solid #ccc;"></canvas>
    `;

    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');

    const anchoReal = canvas.clientWidth;
    canvas.width = anchoReal;
    canvas.height = anchoReal / 2;

    // --- CAMBIO 1: Nodos más pequeños ---
    // Se han reducido los valores en la fórmula del radio.
    // Originalmente era: 5 + n.relevancia * 2.5
    let nodos = data.nodos.map(n => ({ 
        id: n.id, 
        relevancia: n.relevancia, 
        x: Math.random() * canvas.width, 
        y: Math.random() * canvas.height, 
        vx: 0, 
        vy: 0, 
        radius: 5 + n.relevancia * 3.9 // <-- Radio ajustado para nodos más pequeños
    }));
    
    // La función de simulación no necesita cambios
    function simular() {
        for (let i = 0; i < nodos.length; i++) {
            const nodoA = nodos[i];
            for (let j = i + 1; j < nodos.length; j++) {
                const nodoB = nodos[j];
                const dx = nodoB.x - nodoA.x, dy = nodoB.y - nodoA.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1) dist = 1;
                const fuerza = -200 / (dist * dist);
                nodoA.vx += fuerza * dx / dist; nodoA.vy += fuerza * dy / dist;
                nodoB.vx -= fuerza * dx / dist; nodoB.vy -= fuerza * dy / dist;
            }
            nodoA.vx += (canvas.width / 2 - nodoA.x) * 0.0005;
            nodoA.vy += (canvas.height / 2 - nodoA.y) * 0.0005;
        }
        data.enlaces.forEach(enlace => {
            const origen = nodos.find(n => n.id === enlace.origen);
            const destino = nodos.find(n => n.id === enlace.destino);
            if (origen && destino) {
                const dx = destino.x - origen.x, dy = destino.y - origen.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const fuerza = 0.01 * (dist - 150);
                origen.vx += fuerza * dx / dist; origen.vy += fuerza * dy / dist;
                destino.vx -= fuerza * dx / dist; destino.vy -= fuerza * dy / dist;
            }
        });
        nodos.forEach(nodo => {
            nodo.x += nodo.vx; nodo.y += nodo.vy;
            nodo.vx *= 0.95; nodo.vy *= 0.95;
            nodo.x = Math.max(nodo.radius, Math.min(canvas.width - nodo.radius, nodo.x));
            nodo.y = Math.max(nodo.radius, Math.min(canvas.height - nodo.radius, nodo.y));
        });
    }

    function dibujar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;

        data.enlaces.forEach(enlace => {
            const origen = nodos.find(n => n.id === enlace.origen);
            const destino = nodos.find(n => n.id === enlace.destino);
            if (origen && destino) {
                ctx.beginPath();
                ctx.moveTo(origen.x, origen.y);
                ctx.lineTo(destino.x, destino.y);
                ctx.stroke();
            }
        });

        nodos.forEach(nodo => {
            const personajeOriginal = personajesOriginales.find(p => p.nombre === nodo.id);

            // --- CAMBIO 2: Añadir definición con una sombra ---
            // Se establecen las propiedades de la sombra antes de dibujar el círculo.
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'; // Color de la sombra
            ctx.shadowBlur = 6;                       // Desenfoque de la sombra
            ctx.shadowOffsetX = 2;                    // Desplazamiento X
            ctx.shadowOffsetY = 2;                    // Desplazamiento Y

            // Dibuja el círculo relleno, que ahora tendrá la sombra aplicada.
            ctx.beginPath();
            ctx.arc(nodo.x, nodo.y, nodo.radius, 0, 2 * Math.PI);
            ctx.fillStyle = personajeOriginal?.color || '#ffababff';
            ctx.fill();

            // Se resetea la sombra para que no afecte al borde ni al texto.
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Dibuja el borde y el texto sin sombra para que se vean nítidos.
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#000';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(nodo.id, nodo.x, nodo.y);
        });
    }

    function loop() {
        simular();
        dibujar();
        requestAnimationFrame(loop);
    }
    
    loop();
}
function renderizarSeccionPersonajesAvanzado(data, atributos) {
    const container = document.getElementById('platzhalter-personajes');
    if (!container) return;

    let content = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1em;">';
    
    data.analisis_completo.forEach((personaje, index) => {
        const canvasId = `personaje-radar-${index}`;
        content += `<div class="character-card" style="border: 1px solid #ccc; padding: 1em; border-radius: 8px;">
            <h4>${personaje.nombre}</h4>
            <p>${personaje.descripcion}</p>
            <div style="height:250px; width:100%;"><canvas id="${canvasId}"></canvas></div>
        </div>`;
    });
    content += '</div>';
    
    container.innerHTML = `<h3>Análisis de Personajes</h3>${content}`;

    // Renderizar los gráficos después de que el HTML esté en el DOM
    setTimeout(() => {
        data.analisis_completo.forEach((personaje, index) => {
            const canvasId = `personaje-radar-${index}`;
            // Asegurarnos de que los valores de las puntuaciones sean números
            const puntuaciones = atributos.map(attr => Number(personaje.puntuaciones[attr]) || 0);
            renderRadarChart(canvasId, atributos, puntuaciones, personaje.nombre);
        });
    }, 100);
}


// ... (renderizarSeccionTrama y renderizarSeccionDiagnostico no cambian)
function renderizarSeccionRitmoYTemas(datosTrama, datosTemas) {
    const container = document.getElementById('platzhalter-ritmo-temas');
    if (!container) return;
    container.innerHTML = `
        <h3>Análisis de Ritmo y Temas</h3>
        <div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
            <div style="flex: 1; min-width: 300px;">
                <h4>Distribución del Ritmo</h4>
                <div class="chart-container">
                    <canvas id="pacing-chart"></canvas>
                </div>
            </div>
            <div style="flex: 1; min-width: 300px;">
                <h4>Temas Principales</h4>
                 <div class="chart-container">
                    <canvas id="themes-chart"></canvas>
                </div>
            </div>
        </div>
    `;
    const ritmoCounts = datosTrama.linea_de_tiempo_eventos.reduce((acc, evento) => {
        const tipo = evento.tipo_ritmo || 'Indefinido';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
    }, {});
    const temasLabels = datosTemas.analisis_tematico.map(t => t.tema);
    const temasData = datosTemas.analisis_tematico.map(t => t.importancia);
    setTimeout(() => {
        renderBarChart('pacing-chart', Object.keys(ritmoCounts), Object.values(ritmoCounts), 'Eventos por Tipo de Ritmo');
        renderDoughnutChart('themes-chart', temasLabels, temasData, 'Importancia de Temas');
    }, 100);
}

// --- NUEVA FUNCIÓN DE RENDERIZADO PARA RITMO Y TEMAS ---
function renderizarSeccionRitmoYTemas(datosTrama, datosTemas) {
    const container = document.getElementById('platzhalter-ritmo-temas');
    if (!container) return;

    // Se añaden contenedores con altura y posición relativas para los canvas
    container.innerHTML = `
        <h3>Análisis de Ritmo y Temas</h3>
        <div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
            <div style="flex: 1; min-width: 300px;">
                <h4>Distribución del Ritmo</h4>
                <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="pacing-chart"></canvas>
                </div>
            </div>
            <div style="flex: 1; min-width: 300px;">
                <h4>Temas Principales</h4>
                 <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="themes-chart"></canvas>
                </div>
            </div>
        </div>
    `;

    // El resto de la lógica de procesado y renderizado de gráficos no cambia
    const ritmoCounts = datosTrama.linea_de_tiempo_eventos.reduce((acc, evento) => {
        const tipo = evento.tipo_ritmo || 'Indefinido';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
    }, {});
    const temasLabels = datosTemas.analisis_tematico.map(t => t.tema);
    const temasData = datosTemas.analisis_tematico.map(t => t.importancia);
    setTimeout(() => {
        renderBarChart('pacing-chart', Object.keys(ritmoCounts), Object.values(ritmoCounts), 'Eventos por Tipo de Ritmo');
        renderDoughnutChart('themes-chart', temasLabels, temasData, 'Importancia de Temas');
    }, 100);
}

function renderizarSeccionTono(datosTono) {
    const container = document.getElementById('platzhalter-tono');
    if (!container) return;
    
    const labels = datosTono.sentimiento_por_evento.map(e => e.nombre_evento);
    const data = datosTono.sentimiento_por_evento.map(e => e.puntuacion_sentimiento);

    container.innerHTML = `
        <h3>Análisis de Tono y Sentimiento</h3>
        <p><strong>Tono General:</strong> ${datosTono.tono_general}</p>
        <h4>Viaje Emocional de la Trama</h4>
        <div class="chart-container">
            <canvas id="sentiment-chart"></canvas>
        </div>
    `;

    setTimeout(() => {
        renderLineChart('sentiment-chart', labels, data, 'Puntuación de Sentimiento');
    }, 100);
}

function renderizarSeccionDiagnostico(data) {
    const container = document.getElementById('platzhalter-diagnostico');
    if (!container) return;
    const content = `<h4>Puntos Fuertes</h4><ul>${data.puntos_fuertes.map(p => `<li>${p}</li>`).join('')}</ul><hr><h4>Posibles Inconsistencias</h4><ul>${data.posibles_inconsistencias.map(i => `<li><b>${i.tipo}:</b> ${i.descripcion} <br><i>Sugerencia: ${i.sugerencia_resolucion}</i></li>`).join('')}</ul><hr><h4>Oportunidades Narrativas</h4><ul>${data.oportunidades_narrativas.map(o => `<li>${o.descripcion} <br><i>Sugerencia: ${o.sugerencia_desarrollo}</i></li>`).join('')}</ul>`;
    container.innerHTML = `<h3>Diagnóstico Proactivo</h3>${content}`;
}


// --- SECCIÓN DE UTILIDADES (API Y GRÁFICOS) ---

// ... (llamarApiGemini no cambia)
async function llamarApiGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    if (!response.ok) throw new Error(`Error de API: ${response.status}. Detalles: ${await response.text()}`);
    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) throw new Error("La respuesta de la IA estaba vacía o no tenía el formato esperado.");
    let textoJsonLimpio = replyText.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || replyText;
    const inicioJson = textoJsonLimpio.indexOf('{');
    const finJson = textoJsonLimpio.lastIndexOf('}');
    if (inicioJson === -1 || finJson <= inicioJson) throw new Error("No se pudo encontrar un objeto JSON en la respuesta.");
    textoJsonLimpio = textoJsonLimpio.substring(inicioJson, finJson + 1);
    try { return JSON.parse(textoJsonLimpio); } catch (e) { console.error("Fallo al parsear JSON:", textoJsonLimpio); throw new Error(`Error al analizar el JSON de la IA: ${e.message}`); }
}


// ... (renderRadarChart no cambia)
function renderRadarChart(canvasId, labels, data, label) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
            datasets: [{
                label: label, data: data, fill: true,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgb(54, 162, 235)',
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { r: { suggestedMin: 0, suggestedMax: 10 } }
        }
    });
}
// --- NUEVAS FUNCIONES PARA LOS NUEVOS GRÁFICOS ---
function renderBarChart(canvasId, labels, data, label) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Hace las barras horizontales para mejor legibilidad
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false // El título es suficiente
                }
            }
        }
    });
}

function renderDoughnutChart(canvasId, labels, data, label) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}

function renderLineChart(canvasId, labels, data, label) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                fill: true,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1, // Suaviza la línea
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    suggestedMin: -1,
                    suggestedMax: 1
                }
            }
        }
    });
}
/**
 * Renderiza el informe completo en la sección Vista General a partir de un objeto de datos.
 * @param {object} datosInforme - El objeto que contiene todos los datos del análisis.
 */
function renderizarInformeCompleto(datosInforme) {
    const informeContainer = document.getElementById('informe-container');
    if (!informeContainer) return;

    if (!datosInforme) {
        informeContainer.innerHTML = '<p style="text-align: center; margin-top: 2rem;">No hay informe para mostrar. Haz clic en "Analizar Datos del Proyecto" para generar uno nuevo.</p>';
        return;
    }

    // Crea la estructura de Platzhalters para que las funciones de renderizado las encuentren y reemplacen.
    renderizarPlatzhalters(informeContainer);

    // Llama a las funciones de renderizado específicas con los datos guardados.
    if (datosInforme.nube && datosInforme.personajesOriginales) {
        renderizarSeccionNubePersonajes(datosInforme.nube, datosInforme.personajesOriginales);
    }
    if (datosInforme.personajes && datosInforme.atributos) {
        renderizarSeccionPersonajesAvanzado(datosInforme.personajes, datosInforme.atributos);
    }
    if (datosInforme.trama) {
        renderizarSeccionTrama(datosInforme.trama);
    }

     if (datosInforme.trama && datosInforme.temas) {
        renderizarSeccionRitmoYTemas(datosInforme.trama, datosInforme.temas);
    }
  if (datosInforme.tono) {
        renderizarSeccionTono(datosInforme.tono);
    }
    if (datosInforme.diagnostico) {
        renderizarSeccionDiagnostico(datosInforme.diagnostico);
    }
}

