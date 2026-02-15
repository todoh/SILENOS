// --- UTILIDADES ---
const Utils = {
    uuid: () => 'item-' + Date.now().toString(36),
    cleanJSON: (str) => {
        if(!str) return "[]";
        str = str.replace(/```json/g, '').replace(/```/g, '');
        const s = str.indexOf('['); const e = str.lastIndexOf(']');
        if (s !== -1 && e !== -1) return str.substring(s, e + 1);
        return str; 
    },
    blobToBase64: (blob) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    }),
    log: (msg, type='info') => {
        const c = document.getElementById('gen-logs');
        const d = document.createElement('div');
        d.className = `log-entry ${type}`;
        d.innerText = `> ${msg}`;
        c.prepend(d);
    }
};