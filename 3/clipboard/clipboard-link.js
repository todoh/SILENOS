/* SILENOS 3/clipboard/clipboard-link.js */

const LinkPasteHandler = {
    urlRegex: /^(https?:\/\/[^\s]+)$/i,
    ytRegex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/i,

    canHandleText(text) {
        const cleanText = text.trim();
        return this.urlRegex.test(cleanText) && !this.ytRegex.test(cleanText);
    },

    // [CORRECCIÓN] Aceptamos mouseX y mouseY
    async handleText(text, destParentId, mouseX = null, mouseY = null) {
        const url = text.trim();
        
        // 1. OBTENER NOMBRE DEL SITIO
        let domain = "Sitio Web";
        try {
            domain = new URL(url).hostname.replace('www.', '');
        } catch (e) {
            console.error("Error parseando URL para título:", e);
        }
        const appTitle = "🔗 " + domain;

        const nameId = domain.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const instanceId = Math.random().toString(36).substring(2, 8);
        const uniqueId = `link-app-${nameId}-${instanceId}`;

        // 2. CÁLCULO DE COORDENADAS
        let finalX = 100, finalY = 100;
        if (mouseX !== null && mouseY !== null) {
            if (destParentId === 'desktop' && typeof ThreeDesktop !== 'undefined') {
                const world = ThreeDesktop.screenToWorld(mouseX, mouseY);
                finalX = world.x;
                finalY = world.y;
            } else {
                finalX = mouseX;
                finalY = mouseY;
            }
        }

        // 3. CREACIÓN DEL ITEM
        const newItem = {
            id: uniqueId,
            type: "executable", 
            title: appTitle,
            parentId: destParentId,
            x: finalX, y: finalY, z: 0, // [USADO]
            content: {
                nodes: [
                    { 
                        id: "node-start", 
                        type: "start", 
                        x: 50, y: 100, 
                        inputs: [], outputs: ["out"], 
                        values: {}, uiFlags: {} 
                    },
                    { 
                        id: "node-opener", 
                        type: "web-link-opener-v1", 
                        x: 250, y: 100, 
                        inputs: ["run"], outputs: ["done"], 
                        values: { "url": url }, 
                        uiFlags: {} 
                    }
                ],
                connections: [
                    { fromNode: "node-start", fromPort: "out", toNode: "node-opener", toPort: "run" }
                ],
                embeddedModules: [{
                    id: "web-link-opener-v1",
                    title: "Abrir Pestaña",
                    color: "#3b82f6", 
                    inputs: ["run"], outputs: ["done"],
                    fields: [{ "name": "url", "type": "text", "value": url }],
                    code: this.generateOpenerCode(url)
                }]
            }
        };
        
        FileSystem.data.push(newItem);
        FileSystem.save();
        console.log("🔗 Mini-App de enlace creada:", appTitle);
        return true;
    },

    generateOpenerCode(url) {
        return `
// --- LÓGICA DE APERTURA DE LINK ---
const targetUrl = "${url}";
window.open(targetUrl, '_blank');
console.log("Abriendo enlace externo:", targetUrl);
if (typeof outputs !== 'undefined' && outputs.done) {
    outputs.done();
}
`;
    }
};

ClipboardProcessor.registerHandler(LinkPasteHandler);