// live gemini/agents.js

// ─── PARALLEL AGENTS SYSTEM ──────────────────────────────────────────────
const parallelAgents = {
    isAnalyzing: false,

    cleanJSON(str) {
        if(!str) return "{}";
        str = str.replace(/```json/g, '').replace(/```/g, '');
        const firstBracket = str.indexOf('[');
        const firstBrace = str.indexOf('{');
        const lastBracket = str.lastIndexOf(']');
        const lastBrace = str.lastIndexOf('}');
        
        if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
            return str.substring(firstBracket, lastBracket + 1);
        }
        if (firstBrace !== -1 && lastBrace !== -1) {
            return str.substring(firstBrace, lastBrace + 1);
        }
        return str; 
    },

    async callAgent(systemPrompt, userText) {
        try {
            const res = await fetch(POLLINATIONS_API_URL, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${pollinationsKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    model: 'nova-fast', 
                    messages: [
                        { 
                            role: 'system', 
                            content: systemPrompt + ' OBLIGATORIO: Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido. No incluyas bloques de código markdown (como ```json), ni saludos, ni texto adicional.' 
                        }, 
                        { role: 'user', content: userText }
                    ],
                    jsonMode: true,
                    seed: Math.floor(Math.random() * 1000)
                })
            });
            
            if (!res.ok) return null;
            
            const data = await res.json();
            if (data.choices && data.choices.length > 0) {
                let content = data.choices[0].message.content.trim();
                content = this.cleanJSON(content);
                return JSON.parse(content);
            }
            return null;
        } catch(e) {
            console.error("Error en llamada al agente Pollinations:", e);
            return null;
        }
    },

    async classify(text) {
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-classifier', true);
        const prompt = `Eres un agente clasificador trabajando para el asistente principal "VOZ SILENOS". Analiza la conversación y devuelve un JSON con las siguientes claves: 
        "tema_principal" (string), "emocion_dominante" (string), "etiquetas" (array de strings, max 5).`;
        const result = await this.callAgent(prompt, text);
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-classifier', false);
        return result;
    },

    async summarizeInternal(text) {
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-summarizer', true);
        const prompt = `Eres un agente de estructuración interna para el asistente "VOZ SILENOS". Analiza la conversación y extrae los datos clave para guardarlos en su memoria a corto/medio plazo. 
        Devuelve un JSON con: "entidades_mencionadas" (array), "hechos_clave" (array), "requiere_seguimiento" (booleano).`;
        const result = await this.callAgent(prompt, text);
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-summarizer', false);
        return result;
    },

    async generateVoiceReport(text) {
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-voicereport', true);
        const prompt = `Eres un agente consultor psicológico para "VOZ SILENOS", el modelo de voz principal. Crea un reporte detallado sobre cómo debe comportarse VOZ en su próxima respuesta en base al contexto emocional. 
        Devuelve un JSON con: "tono_sugerido" (string), "contexto_inmediato" (string, resumen de 1 linea de lo último hablado), "instruccion_secreta" (string, consejo interno para el modelo).`;
        const result = await this.callAgent(prompt, text);
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-voicereport', false);
        return result;
    },

    async updateLongTermMemory(text, existingMemory) {
        const prompt = `Eres el Agente Bibliotecario de la Memoria a Largo Plazo de "VOZ SILENOS". 
        Tu objetivo es construir un perfil humano, profundo y persistente del usuario a través del tiempo.
        MEMORIA ACTUAL EXISTENTE: ${JSON.stringify(existingMemory)}
        NUEVA CONVERSACIÓN A ANALIZAR: "${text}"
        Instrucciones: Fusiona la memoria existente con los nuevos datos. Actualiza gustos, detalles personales, proyectos en curso o hechos vitales. Si hay información antigua irrelevante, descártala. 
        Devuelve un JSON exacto con estas claves: "perfil_psicologico" (string), "datos_personales" (array), "preferencias_y_gustos" (array), "proyectos_historia" (array).`;
        const result = await this.callAgent(prompt, "Analiza y consolida la memoria a largo plazo.");
        return result;
    },

    async saveAnalysisFile(filename, jsonData) {
        if (!analysisHandle || !jsonData) return;
        try {
            const fileHandle = await analysisHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(jsonData, null, 2));
            await writable.close();
        } catch (e) {
            console.error(`Error guardando ${filename}:`, e);
        }
    },

    async runAll() {
        if (!pollinationsKey || !fullConversationText.trim() || this.isAnalyzing) return;
        this.isAnalyzing = true;

        try {
            let existingCoreMemory = {};
            if (analysisHandle) {
                try {
                    const memHandle = await analysisHandle.getFileHandle('memoria_core.json');
                    const memFile = await memHandle.getFile();
                    existingCoreMemory = JSON.parse(await memFile.text());
                } catch(e) {}
            }

            const [clasificacion, resumenInterno, informeVoz, memoriaCore] = await Promise.all([
                this.classify(fullConversationText),
                this.summarizeInternal(fullConversationText),
                this.generateVoiceReport(fullConversationText),
                this.updateLongTermMemory(fullConversationText, existingCoreMemory)
            ]);

            const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
            
            if (clasificacion) await this.saveAnalysisFile(`clasificacion-${dateStr}.json`, clasificacion);
            if (resumenInterno) await this.saveAnalysisFile(`resumen_interno-${dateStr}.json`, resumenInterno);
            if (informeVoz) await this.saveAnalysisFile(`informe_voz-${dateStr}.json`, informeVoz);
            if (memoriaCore) await this.saveAnalysisFile('memoria_core.json', memoriaCore);

        } catch (err) {
            console.error('Error en la ejecución de agentes paralelos:', err);
        } finally {
            this.isAnalyzing = false;
        }
    }
};

let agentsInterval = null;

function startParallelAgents() {
    if (agentsInterval) clearInterval(agentsInterval);
    agentsInterval = setInterval(() => {
        if (isConnected && pollinationsKey) parallelAgents.runAll();
    }, 20000); 
    
    // Disparamos el bucle de imaginación al conectar (requiere que imagination.js esté cargado)
    if (typeof imaginationEngine !== 'undefined') {
        imaginationEngine.start();
    }
}

function stopParallelAgents() {
    if (agentsInterval) clearInterval(agentsInterval);
    if (typeof imaginationEngine !== 'undefined') {
        imaginationEngine.stop();
    }
}

// ─── DATA PROCESSOR (Inteligencia Estructural y Filtrado Local de Alta Precisión) ─────────────────
const dataProcessor = {
    isProcessing: false,
    chunkSummaries: [], 
    filesQueue: [], 
    fullTree: [], 
    MAX_FILES: 5000, 
    CONCURRENCY_LIMIT: 90,
    PAYLOAD_MAX_SIZE: 10000,

    async start(workspaceHandle) {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast("Selecciona una carpeta primero", "error");
            return;
        }
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.chunkSummaries = []; 
        this.filesQueue = [];
        this.fullTree = [];
        
        if (typeof showToast === 'function') showToast("Extrayendo firmas computacionales localmente...", "success");
        
        try {
            await this.scanDirectory(workspaceHandle, workspaceHandle.name);
            const batchedPayloads = await this.buildSmartPayloads();

            if (batchedPayloads.length === 0) {
                if (typeof showToast === 'function') showToast("No hay datos útiles para procesar.", "error");
                this.isProcessing = false;
                return;
            }
            
            await this.processBatches(batchedPayloads);
            await this.generateMasterReport(); 
            
            if (typeof showToast === 'function') showToast("Análisis estructural completado con máxima precisión", "success");
        } catch (err) {
            console.error("Error en procesamiento masivo:", err);
            if (typeof showToast === 'function') showToast("Error en análisis", "error");
        } finally {
            this.isProcessing = false;
        }
    },

    async scanDirectory(dirHandle, path) {
        if (this.filesQueue.length >= this.MAX_FILES) return;

        for await (const entry of dirHandle.values()) {
            if (this.filesQueue.length >= this.MAX_FILES) break;

            if (entry.kind === 'directory') {
                const ignoredDirs = ['analisis_masivo', '.git', 'node_modules', 'dist', 'build', '.next', 'vendor'];
                if (ignoredDirs.includes(entry.name)) continue;
                this.fullTree.push(`[CARPETA] ${path}/${entry.name}`);
                await this.scanDirectory(entry, `${path}/${entry.name}`);
            } else if (entry.kind === 'file') {
                this.fullTree.push(`[ARCHIVO] ${path}/${entry.name}`);
                if (entry.name.includes('.min.') || entry.name === 'package-lock.json') continue;

                const validExts = ['.txt', '.json', '.js', '.html', '.md', '.css', '.py', '.ts', '.xml', '.jsx', '.tsx'];
                const ext = validExts.find(e => entry.name.toLowerCase().endsWith(e));
                
                if (ext) {
                    this.filesQueue.push({ handle: entry, fullPath: `${path}/${entry.name}`, ext: ext });
                }
            }
        }
    },

    extractSignatures(content, ext) {
        let text = content.replace(/\r\n/g, '\n');
        const lines = text.split('\n');
        let summary = "";

        try {
            if (ext === '.json') {
                const obj = JSON.parse(text);
                const keys = Object.keys(obj).slice(0, 80).join(', '); 
                summary = `Estructura JSON (Top keys): ${keys}`;
            } else if (['.js', '.ts', '.jsx', '.tsx', '.py'].includes(ext)) {
                const signatures = [];
                const regex = /(?:function\s+([a-zA-Z0-9_]+))|(?:class\s+([a-zA-Z0-9_]+))|(?:(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)|(?:(import|export)\s+.*)/g;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    signatures.push(match[0].trim().substring(0, 150));
                }
                const uniqueSigs = [...new Set(signatures)].slice(0, 100);
                const head = lines.slice(0, 20).join('\n');
                summary = `[CABECERA]\n${head}\n\n[FIRMAS ESTRUCTURALES DETECTADAS]\n${uniqueSigs.join('\n') || 'Ninguna entidad mayor detectada.'}`;
            } else if (ext === '.html') {
                const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
                const ids = [...text.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
                const scripts = [...text.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]);
                summary = `Título HTML: ${titleMatch ? titleMatch[1] : 'N/A'}\nScripts referenciados: ${scripts.join(', ')}\nIDs detectados: ${[...new Set(ids)].slice(0,60).join(', ')}`;
            } else if (ext === '.md' || ext === '.txt') {
                const headers = lines.filter(l => l.startsWith('#')).slice(0, 40);
                summary = `Titulares del documento:\n${headers.join('\n')}\nPrimeras 10 lineas:\n${lines.slice(0,10).join('\n')}`;
            } else {
                summary = `Fragmento representativo:\n${lines.slice(0, 25).join('\n')}`;
            }
        } catch(e) {
            summary = "No se pudo extraer firma computacional. Lectura parcial: " + text.substring(0, 400);
        }

        return summary.substring(0, 6000); 
    },

    async buildSmartPayloads() {
        if (typeof showToast === 'function') showToast("Decantando estructura (Computación Local)...", "listening");
        
        let batchedPayloads = [];
        let currentBatch = "";
        let batchIndex = 1;

        for (const fileObj of this.filesQueue) {
            try {
                const file = await fileObj.handle.getFile();
                const chunk = file.slice(0, 5 * 1024 * 1024); 
                const text = await chunk.text();
                const localSummary = this.extractSignatures(text, fileObj.ext);
                const block = `\n--- ARCHIVO: ${fileObj.fullPath} ---\n${localSummary}\n`;

                if (currentBatch.length + block.length > this.PAYLOAD_MAX_SIZE) {
                    batchedPayloads.push({ id: batchIndex++, content: currentBatch });
                    currentBatch = block;
                } else {
                    currentBatch += block;
                }
            } catch(e) {
                console.warn(`Error leyendo/parseando localmente ${fileObj.fullPath}`, e);
            }
        }
        
        if (currentBatch.trim().length > 0) batchedPayloads.push({ id: batchIndex, content: currentBatch });
        return batchedPayloads;
    },

    async processBatches(batchedPayloads) {
        const runWithConcurrency = async (tasks, limit) => {
            const results = [];
            const executing = new Set();
            for (const task of tasks) {
                const p = Promise.resolve().then(() => task());
                results.push(p);
                executing.add(p);
                const clean = () => executing.delete(p);
                p.then(clean).catch(clean);
                if (executing.size >= limit) {
                    await Promise.race(executing);
                }
            }
            return Promise.all(results);
        };

        if (typeof showToast === 'function') showToast(`IA analizando ${batchedPayloads.length} paquetes con precisión extrema...`, "listening");

        let completedCount = 0;
        const apiTasks = batchedPayloads.map(payload => async () => {
            await this.analyzePayloadWithNovaFast(payload.id, payload.content);
            completedCount++;
            if (typeof showToast === 'function') showToast(`IA: ${completedCount} / ${batchedPayloads.length} paquetes...`, "listening");
        });

        await runWithConcurrency(apiTasks, this.CONCURRENCY_LIMIT);
    },

    async analyzePayloadWithNovaFast(batchId, batchContent) {
        if (!pollinationsKey) return;
        const systemPrompt = `Eres un Arquitecto de Software de Élite y un investigador hiper-preciso.
        He pre-procesado localmente un lote de archivos, extrayendo únicamente sus FIRMAS ESTRUCTURALES (funciones, clases, metadatos, cabeceras, etc.).
        OBJETIVO: Lee este paquete de firmas altamente concentrado y devuelve un análisis profundo de la finalidad de estos archivos. Detecta flujos de datos, dependencias de sistema y variables de estado clave. No omitas información vital. Sé directo y técnico.`;

        try {
            const res = await fetch(POLLINATIONS_API_URL, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${pollinationsKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    model: 'nova-fast', 
                    messages: [
                        { role: 'system', content: systemPrompt }, 
                        { role: 'user', content: batchContent } 
                    ],
                    jsonMode: false,
                    seed: Math.floor(Math.random() * 1000)
                })
            });
            
            if (!res.ok) return;
            const data = await res.json();

            if (data.choices && data.choices.length > 0) {
                const resultText = data.choices[0].message.content;
                await this.saveResult(`Analisis_Bloque_Estructural_${batchId}`, resultText);
                this.chunkSummaries.push(`=== BLOQUE ESTRUCTURAL ${batchId} ===\n${resultText}`);
            }
        } catch(e) {
            console.warn(`Error de red procesando Bloque ${batchId}:`, e.message);
        }
    },

    async saveResult(filename, content) {
        if (!conversationsHandle) return;
        try {
            const analisisMasivoHandle = await conversationsHandle.getDirectoryHandle('analisis_masivo', { create: true });
            const fileHandle = await analisisMasivoHandle.getFileHandle(`${filename}.txt`, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
        } catch (e) {
            console.error("Error guardando bloque de análisis:", e);
        }
    },

    async generateMasterReport() {
        if (!pollinationsKey || !conversationsHandle) return;
        if (typeof showToast === 'function') showToast("Compilando Arquitectura Global...", "success");
        
        try {
            const analisisMasivoHandle = await conversationsHandle.getDirectoryHandle('analisis_masivo', { create: true });
            const treeHandle = await analisisMasivoHandle.getFileHandle('ARBOL_ESTRUCTURAL_COMPLETO.txt', { create: true });
            const treeWritable = await treeHandle.createWritable();
            await treeWritable.write("=== ÁRBOL COMPLETO DE DIRECTORIOS Y ARCHIVOS ===\n\n" + this.fullTree.join('\n'));
            await treeWritable.close();
        } catch(e) {}

        if (this.chunkSummaries.length === 0) return;

        const systemPrompt = `Eres el Coordinador Supremo de Arquitectura de Datos. Redacta el "Índice General y Mapa de Contenido" combinando el conocimiento de todos los bloques analizados con precisión milimétrica. 
        MANDAMIENTOS: 
        1. Explica el ecosistema del proyecto (de qué trata la carpeta).
        2. Resume la función de los archivos principales y sus dependencias cruzadas.
        3. Identifica variables, IDs o métodos de alta importancia detectados.
        4. Sé altamente estructurado y útil para una IA que deba consultar esta información después.`;
        
        const promptContent = this.chunkSummaries.join('\n\n').substring(0, 60000);
        
        try {
            const res = await fetch(POLLINATIONS_API_URL, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${pollinationsKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    model: 'nova-fast', 
                    messages: [
                        { role: 'system', content: systemPrompt }, 
                        { role: 'user', content: promptContent }
                    ],
                    jsonMode: false,
                    seed: Math.floor(Math.random() * 1000)
                })
            });
            
            if (!res.ok) return;

            const data = await res.json();
            if (data.choices && data.choices.length > 0) {
                const masterReport = data.choices[0].message.content;
                const analisisMasivoHandle = await conversationsHandle.getDirectoryHandle('analisis_masivo', { create: true });
                const fileHandle = await analisisMasivoHandle.getFileHandle('INDICE_GENERAL_DECANTADO.txt', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(masterReport);
                await writable.close();
            }
        } catch(e) {
            console.error("Error generando Master Report:", e);
        }
    }
};