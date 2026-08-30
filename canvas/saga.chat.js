// saga.chat.js
window.Saga = window.Saga || {};
window.Saga.Chat = {
    chatHistory: [],

    async loadHistory() {
        if (!window.Saga.Core.dirHandle) return this.chatHistory;
        try {
            const handle = await window.Saga.Core.dirHandle.getFileHandle('CHAT_HISTORY.json', { create: false });
            const file = await handle.getFile();
            const text = await file.text();
            if (text && text.trim()) {
                this.chatHistory = JSON.parse(text);
            }
        } catch (e) {
            this.chatHistory = [];
        }
        return this.chatHistory;
    },

    async saveHistory() {
        if (!window.Saga.Core.dirHandle) return;
        try {
            const handle = await window.Saga.Core.dirHandle.getFileHandle('CHAT_HISTORY.json', { create: true });
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(this.chatHistory, null, 2));
            await writable.close();
        } catch (e) {
            console.error("Error al guardar CHAT_HISTORY.json:", e);
        }
    },

    parseMarkdown(text) {
        if (!text) return '';
        
        let unescaped = text
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\/g, '');

        let html = unescaped
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        
        html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 text-gray-100 p-2 rounded my-2 overflow-x-auto font-mono text-[11px]"><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-pink-600 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>');
        html = html.replace(/^### (.*$)/gim, '<h3 class="text-xs font-bold text-teal-700 mt-2 mb-1 uppercase tracking-wide">$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2 class="text-sm font-bold text-gray-900 mt-3 mb-1 border-b border-gray-200 pb-1">$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1 class="text-base font-extrabold text-gray-900 mt-3 mb-1 border-b border-gray-300 pb-1">$1</h1>');
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
        
        html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-gray-700">$1</li>');
        html = html.replace(/((?:<li class="ml-4 list-disc text-gray-700">.*<\/li>\s*)+)/g, '<ul class="my-1 border-l-2 border-teal-500 pl-1">$1</ul>');
        html = html.replace(/\n\n+/g, '</p><p class="mt-2">');
        html = html.replace(/\n/g, '<br>');
        return `<div class="space-y-1">${html}</div>`;
    },

    async convertTextToDataNode(rawText) {
        const selection = window.getSelection().toString().trim();
        const contentToUse = selection.length > 0 ? selection : rawText;

        if (!contentToUse) return alert("Selecciona texto o asegúrate de que el mensaje contiene datos.");

        const firstLine = contentToUse.split('\n')[0].replace(/[#*]/g, '').trim();
        const dataName = firstLine.substring(0, 30) || "Dato del Chat";
        const filename = `dato_chat_${Date.now()}.json`;

        const newEmptyData = {
            name: dataName,
            type: "Dato Chat",
            tags: ["chat", "ia"],
            visualDesc: "",
            desc: contentToUse,
            imagen64: null,
            imageFile: null,
            connections: [],
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200
        };

        if (window.app) window.app.pushState();
        await window.Saga.Core.saveNodeData(filename, newEmptyData);
        await window.Saga.Core.scanFiles();
        
        const coreItem = window.Saga.Core.items.find(i => i.filename === filename);
        if (coreItem && window.app && window.app.openEditDataDrawer) {
            window.app.openEditDataDrawer(coreItem);
        }
    },

    async sendMessage(userMsgText, useCanvas, useLore) {
        if (!userMsgText) return;
        window.app.appendChatMessage('user', userMsgText);

        let contextText = "";

        if (useCanvas && window.Saga.Core.items.length > 0) {
            const itemsFormatted = window.Saga.Core.items.map(i => {
                const node = window.Saga.Canvas.nodes.find(n => n.id === i.filename);
                let spatialInfo = "";
                
                if (node) {
                    const region = window.Saga.Canvas.getNodeRegion(node);
                    const regionName = region ? region.name : "Sin Zona";
                    const calculatedDate = window.Saga.Canvas.worldXToDate(node.x);
                    const formattedDate = window.Saga.Canvas.formatDateLabel(calculatedDate, 'day');
                    
                    spatialInfo = ` [Posición: X=${Math.round(node.x)}, Y=${Math.round(node.y)} | Zona/Región: "${regionName}" | Fecha Asignada: ${formattedDate}]`;
                }
                
                return `- ${i.data.name} (${i.data.type || 'Dato'}): ${i.data.desc || ''}${spatialInfo}`;
            }).join("\n");

            // Información de las Zonas/Regiones declaradas en el Canvas
            const regionsFormatted = (window.Saga.Canvas.regions || []).map(r => 
                `- Zona: "${r.name}" [Área X: ${Math.round(r.x)} a ${Math.round(r.x + r.w)}, Y: ${Math.round(r.y)} a ${Math.round(r.y + r.h)}]`
            ).join("\n");

            contextText += `\n[CONTEXTO COMPLETO Y ESPACIAL DEL CANVAS]:\nZONAS/REGIONES:\n${regionsFormatted}\n\nNODOS DE DATOS Y UBICACIÓN ESPACIAL:\n${itemsFormatted}\n`;
        }

        if (useLore) {
            await window.Saga.Lore.loadLore();
            contextText += `\n${window.Saga.Lore.getLoreContext()}\n`;
        }

        const sysInstructionAnswer = "Eres un asistente creativo de worldbuilding e historiador especializado. Tienes conocimiento explícito de la ubicación espacial de los nodos en el canvas, sus zonas asociadas y su línea temporal basada en sus posiciones X, Y. Responde directamente en texto formateado Markdown limpio en español con negritas, títulos y listas. NUNCA respondas con una estructura JSON ni entrecomilles tu respuesta entera.";

        const contentsPayload = [
            { role: "user", parts: [{ text: `System Instructions: ${sysInstructionAnswer}\n\n${contextText}` }] },
            { role: "model", parts: [{ text: "Entendido. Procesaré tus consultas manteniendo el contexto espacial, temporal y el historial del proyecto." }] }
        ];

        this.chatHistory.forEach(msg => {
            contentsPayload.push({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            });
        });

        contentsPayload.push({
            role: "user",
            parts: [{ text: userMsgText }]
        });

        try {
            const apiKey = window.Saga.Gemini.getApiKey();
            if (!apiKey) throw new Error("API Key de Gemini no configurada.");

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
            const body = {
                contents: contentsPayload,
                generationConfig: { temperature: 0.7 }
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error(`Error Gemini: ${res.status}`);
            const data = await res.json();

            let rawAnswer = data.candidates[0].content.parts[0].text;
            if (rawAnswer.trim().startsWith('{') && rawAnswer.includes('"respuesta"')) {
                try {
                    const parsed = JSON.parse(rawAnswer);
                    rawAnswer = parsed.respuesta || parsed.content || rawAnswer;
                } catch(e) {}
            }

            this.chatHistory.push({ role: 'user', text: userMsgText });
            this.chatHistory.push({ role: 'model', text: rawAnswer });
            window.app.appendChatMessage('model', rawAnswer);
            await this.saveHistory();

            const sysInstructionSuggestions = "Eres un facilitador de brainstorming narrativo. Analiza la conversación y el contexto espacial de los nodos y devuelve strictly un JSON con 3 preguntas breves para continuar. Estructura: {\"suggestions\": [\"Pregunta 1\", \"Pregunta 2\", \"Pregunta 3\"]}";
            const fullPromptSuggestions = `Contexto:\n${contextText}\n\nPregunta: ${userMsgText}\n\nRespuesta dada: ${rawAnswer}`;

            try {
                const suggObj = await window.Saga.Agents.callGeminiRaw(sysInstructionSuggestions, fullPromptSuggestions, 0.8);
                const options = suggObj.suggestions || suggObj.options || [];
                if (Array.isArray(options) && options.length > 0) {
                    window.app.renderChatSuggestions(options.slice(0, 3));
                }
            } catch (errSugg) {
                console.warn("No se pudieron generar sugerencias continuas:", errSugg);
            }

        } catch (e) {
            window.app.appendChatMessage('model', "Error al procesar el mensaje con Gemini: " + e.message);
            await this.saveHistory();
        }
    },

    async clearHistory() {
        this.chatHistory = [];
        if (!window.Saga.Core.dirHandle) return;
        try {
            await window.Saga.Core.deleteNodeData('CHAT_HISTORY.json');
        } catch (e) {
            console.warn("No se pudo eliminar el archivo de historial:", e);
        }
    }
};