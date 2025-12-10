// --- MÓDULO DE EXPORTACIÓN DE JUEGOS (LOGICA LIBRO-JUEGO) ---
// T → Tramo (Segmentación numerada)
// J → Juegos (Dinámica de mezcla)

console.log("Módulo Exportación Juegos Cargado (Formatos Interactivos y Estáticos)");

/**
 * Función principal que decide qué exportador usar según el formato
 */
export function generateGameExport(game, format) {
    if (format === 'html') {
        return generateInteractiveHTML(game);
    } else {
        // Para TXT y DOC usamos la lógica de libro físico (numerado y mezclado)
        return generateStaticGamebook(game, format);
    }
}

/**
 * GENERADOR ESTÁTICO (TXT/DOC)
 * Convierte el grafo en un libro numerado linealmente pero con contenido barajado.
 */
function generateStaticGamebook(game, format) {
    const nodes = game.nodes || [];
    if (nodes.length === 0) return "El juego está vacío.";

    // 1. Identificar Nodo Inicial y Nodos Restantes
    let startNode = nodes.find(n => n.isStart);
    if (!startNode) startNode = nodes[0]; // Fallback si no hay start definido

    const otherNodes = nodes.filter(n => n.id !== startNode.id);

    // 2. Barajar los otros nodos (Algoritmo Fisher-Yates) para que no sean secuenciales
    // Esto es crucial en libros-juego para evitar "spoilers" por proximidad
    for (let i = otherNodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherNodes[i], otherNodes[j]] = [otherNodes[j], otherNodes[i]];
    }

    // 3. Crear el Mapa de Mapeo (ID Original -> Nuevo Número de Sección)
    // El inicio siempre es el 1. El resto sigue el orden barajado.
    const sectionMap = new Map();
    sectionMap.set(startNode.id, 1);

    otherNodes.forEach((node, index) => {
        sectionMap.set(node.id, index + 2); // +2 porque el 1 es el inicio
    });

    // 4. Reconstruir la lista ordenada para la impresión
    const orderedPrintList = [startNode, ...otherNodes];

    // 5. Generar el Texto
    let output = "";
    
    // Título Header
    output += `TÍTULO: ${game.title.toUpperCase()}\n`;
    output += `GENERADO POR SILENOS - ${new Date().toLocaleDateString()}\n`;
    output += `--------------------------------------------------\n\n`;

    orderedPrintList.forEach(node => {
        const sectionNum = sectionMap.get(node.id);
        
        // Cabecera de Sección
        output += `--- SECCIÓN ${sectionNum} ---\n`;
        // Opcional: Incluir el título interno del nodo como referencia, o ocultarlo para purismo
        // output += `(${node.title})\n`; 
        output += `\n${node.text || "..."}\n\n`;

        // Opciones
        if (node.choices && node.choices.length > 0) {
            node.choices.forEach(choice => {
                if (choice.targetId) {
                    const targetNum = sectionMap.get(parseInt(choice.targetId)) || sectionMap.get(String(choice.targetId));
                    if (targetNum) {
                        output += `   ➤ ${choice.text || "Continuar"}... (Pasa al ${targetNum})\n`;
                    } else {
                        output += `   ➤ ${choice.text} (Error: Referencia perdida)\n`;
                    }
                }
            });
        } else {
            output += `   *** FIN DE LA HISTORIA ***\n`;
        }
        
        output += `\n\n`;
    });

    // En formato DOC (HTML pseudo-word) necesitamos saltos de línea HTML
    if (format === 'doc') {
        // Convertir saltos de línea a <br> y envolver en estructura básica
        return output.replace(/\n/g, '<br>');
    }

    return output;
}

/**
 * GENERADOR INTERACTIVO (HTML SINGLE FILE)
 * Crea un archivo .html autónomo con todo el JS y CSS necesario para jugar.
 */
function generateInteractiveHTML(game) {
    const nodesSafe = JSON.stringify(game.nodes).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const titleSafe = (game.title || "Juego Silenos").replace(/</g, "&lt;");

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titleSafe}</title>
    <style>
        :root {
            --bg-color: #f2f2f2;
            --text-main: #333;
            --accent: #00acc1;
            --card-bg: #ffffff;
            --shadow: 10px 10px 30px #d1d1d1, -10px -10px 30px #ffffff;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background: var(--bg-color);
            color: var(--text-main);
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0; padding: 20px;
        }
        .game-container {
            width: 100%; max-width: 700px;
            background: var(--bg-color);
            border-radius: 20px;
            box-shadow: var(--shadow);
            padding: 40px;
            position: relative;
            min-height: 60vh;
            display: flex; flex-direction: column;
        }
        h1 { font-size: 1.5rem; text-align: center; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 30px; }
        .scene-text {
            font-size: 1.15rem; line-height: 1.8; margin-bottom: 40px; flex: 1;
            white-space: pre-line;
        }
        .choices-area { display: flex; flex-direction: column; gap: 15px; }
        button {
            padding: 18px 25px; border: none; background: var(--bg-color);
            border-radius: 12px; font-size: 1rem; color: #444; cursor: pointer;
            box-shadow: 5px 5px 10px #d9d9d9, -5px -5px 10px #ffffff;
            transition: transform 0.2s, color 0.2s; text-align: left;
        }
        button:hover { transform: translateY(-2px); color: var(--accent); }
        button:active { transform: translateY(0); box-shadow: inset 3px 3px 6px #d9d9d9, inset -3px -3px 6px #ffffff; }
        .history-btn {
            margin-top: 30px; align-self: center; font-size: 0.8rem; color: #999;
            background: transparent; box-shadow: none; text-align: center;
        }
        .history-btn:hover { color: #666; transform: none; text-decoration: underline; }
        .fade-in { animation: fadeIn 0.5s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="game-container">
        <h1 id="game-title">${titleSafe}</h1>
        <div id="scene-content" class="fade-in"></div>
        <div id="choices-content" class="choices-area"></div>
    </div>

    <script>
        // DATOS INYECTADOS
        const gameData = JSON.parse("${nodesSafe}");
        
        let historyStack = [];
        let currentNode = null;

        function start() {
            const startNode = gameData.find(n => n.isStart) || gameData[0];
            if(startNode) loadNode(startNode.id);
            else document.getElementById('scene-content').innerHTML = "<p>Error: No hay nodo de inicio.</p>";
        }

        function loadNode(id) {
            const node = gameData.find(n => n.id == id);
            if(!node) return;

            // Guardar historia si nos movemos hacia adelante
            if(currentNode && currentNode.id !== id) {
                // Verificar si estamos retrocediendo (simple check)
            }

            currentNode = node;
            
            // Render
            const textDiv = document.getElementById('scene-content');
            const choicesDiv = document.getElementById('choices-content');
            
            // Animación reset
            textDiv.classList.remove('fade-in');
            void textDiv.offsetWidth; // Trigger reflow
            textDiv.classList.add('fade-in');

            textDiv.innerHTML = \`<div class="scene-text">\${node.text ? node.text : "..."}</div>\`;
            choicesDiv.innerHTML = '';

            if(node.choices && node.choices.length > 0) {
                node.choices.forEach(c => {
                    if(c.targetId) {
                        const btn = document.createElement('button');
                        btn.innerHTML = \`➤ \${c.text || 'Continuar'}\`;
                        btn.onclick = () => {
                            historyStack.push(node.id);
                            loadNode(c.targetId);
                        };
                        choicesDiv.appendChild(btn);
                    }
                });
            } else {
                 const endMsg = document.createElement('div');
                 endMsg.style.textAlign = 'center'; endMsg.style.color = '#888';
                 endMsg.innerText = "― FIN ―";
                 choicesDiv.appendChild(endMsg);
                 
                 const restartBtn = document.createElement('button');
                 restartBtn.innerText = "Reiniciar Historia";
                 restartBtn.style.textAlign = "center";
                 restartBtn.onclick = () => { historyStack = []; start(); };
                 choicesDiv.appendChild(restartBtn);
            }

            // Botón volver
            if(historyStack.length > 0) {
                const backBtn = document.createElement('button');
                backBtn.className = 'history-btn';
                backBtn.innerText = "↶ Volver atrás";
                backBtn.onclick = () => {
                    const prev = historyStack.pop();
                    loadNode(prev);
                };
                choicesDiv.appendChild(backBtn);
            }
        }

        window.onload = start;
    </script>
</body>
</html>`;
}