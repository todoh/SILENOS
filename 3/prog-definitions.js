/* SILENOS 3/prog-definitions.js */

const NODE_REGISTRY = {
    "start": {
        title: "🏁 INICIO", color: "#2ea043", hasIn: false,
        execute: async (ctx) => ctx.input
    },
    "log": {
        title: "📝 LOG", color: "#007acc",
        fields: [{ name: "msg", type: "text", placeholder: "Mensaje..." }],
        execute: async (ctx) => {
            const val = ctx.fields.msg || "";
            const output = ctx.input ? `${val} ${ctx.input}` : val;
            ctx.log(`Log: ${output}`);
            return output;
        }
    },
    "alert": {
        title: "⚠️ ALERTA", color: "#eab308",
        fields: [{ name: "msg", type: "text", placeholder: "Mensaje..." }],
        execute: async (ctx) => {
            const val = ctx.fields.msg || "";
            alert(ctx.input ? `${val}\n${ctx.input}` : val);
            return ctx.input;
        }
    },
    "wait": {
        title: "⏳ ESPERAR", color: "#6a00ff",
        fields: [{ name: "sec", type: "number", value: 1 }],
        execute: async (ctx) => {
            const s = parseFloat(ctx.fields.sec) || 0;
            ctx.log(`Esperando ${s}s...`);
            await new Promise(r => setTimeout(r, s * 1000));
            return ctx.input;
        }
    },
    "if-logic": {
        title: "🔀 SI / IF", color: "#f59e0b", hasOut: false, customPorts: true,
        fields: [
            { name: "op", type: "select", options: ["==", "!=", "contains", ">"] },
            { name: "comp", type: "text", placeholder: "Valor ref." }
        ],
        execute: async (ctx) => {
            const { op, comp } = ctx.fields;
            const valA = ctx.input;
            let isTrue = false;
            
            if (op === '==') isTrue = (String(valA) == String(comp));
            else if (op === '!=') isTrue = (String(valA) != String(comp));
            else if (op === 'contains') isTrue = String(valA).includes(comp);
            else if (op === '>') isTrue = (parseFloat(valA) > parseFloat(comp));

            ctx.log(`IF: ${isTrue ? 'SI' : 'NO'}`);
            ctx.setBranch(isTrue ? 'true' : 'false');
            return valA;
        }
    },
    "logic-gate": {
        title: "⚖️ COMPUERTA", color: "#f59e0b", hasIn: false,
        fields: [{ name: "op", type: "select", options: ["AND", "OR", "XOR", "NONE"] }],
        execute: async (ctx) => {
            const op = ctx.fields.op;
            const inputs = ctx.runtime.gateInputs[ctx.nodeId] || {};
            const connectedPorts = ctx.graph.connections.filter(c => c.toNode === ctx.nodeId).map(c => c.toPort);
            const activeCount = Object.values(inputs).filter(v => v === true).length;
            
            let trigger = false;
            if (op === 'AND') trigger = (activeCount === connectedPorts.length && connectedPorts.length > 0);
            else if (op === 'OR') trigger = (activeCount > 0);
            else if (op === 'XOR') trigger = (activeCount === 1);
            else if (op === 'NONE') trigger = (activeCount === 0);

            if (!trigger) return null; 
            return ctx.input;
        }
    },
    "set-var": {
        title: "💾 SET VAR", color: "#06b6d4",
        fields: [{ name: "varName", type: "text", placeholder: "nombre" }],
        execute: async (ctx) => {
            ctx.runtime.vars[ctx.fields.varName] = ctx.input;
            return ctx.input;
        }
    },
    "get-var": {
        title: "📂 GET VAR", color: "#06b6d4",
        fields: [{ name: "varName", type: "text", placeholder: "nombre" }],
        execute: async (ctx) => ctx.runtime.vars[ctx.fields.varName]
    },
    "read-file": {
        title: "📂 LEER ARCHIVO", color: "#8b5cf6", hasIn: true,
        fields: [
            { name: "fileId", type: "file-drop", placeholder: "Arrastra Archivo aquí" },
            { name: "mode", type: "select", options: ["content", "title", "full_object"] }
        ],
        execute: async (ctx) => {
            // Prioridad: Input del nodo > Override UI > Valor interno
            const fid = ctx.input || ctx.fields.fileId;
            
            if (!fid) {
                ctx.log("⚠️ No hay archivo seleccionado (Input o Drop)");
                return null;
            }
            
            const item = FileSystem.getItem(fid);
            if (!item) {
                ctx.log(`❌ Archivo no encontrado: ${fid}`);
                return null;
            }

            ctx.log(`Leyendo: ${item.title}`);
            const mode = ctx.fields.mode;

            // --- LÓGICA DE CARPETA (Agrupación Narrativa) ---
            if (item.type === 'folder') {
                if (mode === 'title') return item.title;

                const grouped = {};
                
                // Función recursiva para recorrer subcarpetas y extraer narrativas
                const traverse = (folderId) => {
                    const children = FileSystem.getItems(folderId);
                    children.forEach(child => {
                        if (child.type === 'folder') {
                            traverse(child.id);
                        } else if (child.type === 'narrative') {
                            const rawTag = child.content.tag || "GENERAL";
                            const tag = rawTag.toUpperCase().trim();
                            
                            if (!grouped[tag]) grouped[tag] = [];
                            
                            grouped[tag].push({
                                title: child.title,
                                content: child.content.text || ""
                            });
                        }
                    });
                };
                
                traverse(item.id);

                // Ordenar alfabéticamente por etiqueta para el JSON final
                const orderedResult = {};
                Object.keys(grouped).sort().forEach(key => {
                    orderedResult[key] = grouped[key];
                });

                // Devolvemos el objeto JSON directo (que el usuario puede convertir a string luego si quiere)
                return orderedResult;
            }
            // --------------------------------------------------
            
            // Lógica para archivo individual
            if (mode === 'title') return item.title;
            if (mode === 'full_object') return item;
            
            if (typeof item.content === 'object') return JSON.stringify(item.content);
            return item.content;
        }
    },
    "ai-query": {
        title: "🧠 CONSULTA IA", color: "#3b82f6",
        fields: [{ name: "query", type: "textarea", placeholder: "Pregunta..." }],
        execute: async (ctx) => {
            const response = await AIService.callAI("Asistente SILENOS", `${ctx.fields.query} ${JSON.stringify(ctx.input || "")}`);
            return response;
        }
    },
    "buffer": {
        title: "📦 BUFFER", color: "#db2777", hasIn: false, hasOut: false,
        fields: [{ name: "name", type: "text", value: "main" }],
        execute: async (ctx) => {
            const name = ctx.fields.name;
            if (ctx.port === 'add') {
                ctx.runtime.buffers[name] = (ctx.runtime.buffers[name] || "") + ctx.input + "\n\n";
                return null;
            } else if (ctx.port === 'release') {
                return ctx.runtime.buffers[name];
            }
        }
    },
    "book-export": {
        title: "📕 EXPORTAR LIBRO", color: "#e11d48", hasIn: false, hasOut: false,
        execute: async (ctx) => { }
    },
    "json-export": {
        title: "💾 EXPORTAR JSON", color: "#16a34a", hasIn: false, hasOut: false,
        execute: async (ctx) => { }
    },
};