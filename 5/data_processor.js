// live gemini/data_processor.js
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
            
            if (typeof showToast === 'function') showToast("Análisis estructural completado (Modo IA Desactivado)", "success");
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

        if (typeof showToast === 'function') showToast(`Acondicionando ${batchedPayloads.length} paquetes...`, "listening");

        let completedCount = 0;
        const apiTasks = batchedPayloads.map(payload => async () => {
            await this.analyzePayloadWithGemini(payload.id, payload.content);
            completedCount++;
            if (typeof showToast === 'function') showToast(`Paquetes procesados: ${completedCount} / ${batchedPayloads.length}`, "listening");
        });

        await runWithConcurrency(apiTasks, this.CONCURRENCY_LIMIT);
    },

    async analyzePayloadWithGemini(batchId, batchContent) {
        // LLAMADA REST DESACTIVADA.
        const resultText = "(Análisis estructural por IA externa desactivado)";
        await this.saveResult(`Analisis_Bloque_Estructural_${batchId}`, resultText);
        this.chunkSummaries.push(`=== BLOQUE ESTRUCTURAL ${batchId} ===\n${resultText}`);
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
        if (!conversationsHandle) return;
        if (typeof showToast === 'function') showToast("Compilando Arquitectura Global...", "success");
        
        try {
            const analisisMasivoHandle = await conversationsHandle.getDirectoryHandle('analisis_masivo', { create: true });
            const treeHandle = await analisisMasivoHandle.getFileHandle('ARBOL_ESTRUCTURAL_COMPLETO.txt', { create: true });
            const treeWritable = await treeHandle.createWritable();
            await treeWritable.write("=== ÁRBOL COMPLETO DE DIRECTORIOS Y ARCHIVOS ===\n\n" + this.fullTree.join('\n'));
            await treeWritable.close();
        } catch(e) {}

        if (this.chunkSummaries.length === 0) return;

        // LLAMADA REST DESACTIVADA.
        const masterReport = "=== ÍNDICE GENERAL DECANTADO (IA REST DESACTIVADA) ===\n\n" + this.chunkSummaries.join('\n\n').substring(0, 60000);
        
        try {
            const analisisMasivoHandle = await conversationsHandle.getDirectoryHandle('analisis_masivo', { create: true });
            const fileHandle = await analisisMasivoHandle.getFileHandle('INDICE_GENERAL_DECANTADO.txt', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(masterReport);
            await writable.close();
        } catch(e) {
            console.error("Error generando Master Report:", e);
        }
    }
};