// --- LOGIC.JS (UTILIDADES PURAS) ---

function detectTextType(content) {
    const trimmed = content.trim();
    if (trimmed.startsWith('<') && trimmed.includes('>')) return 'html';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try { JSON.parse(trimmed); return 'json'; } catch(e){}
    }
    if (trimmed.includes('function') || trimmed.includes('const') || trimmed.includes('=>') || trimmed.includes(';')) return 'js';
    if (trimmed.includes('{') && trimmed.includes(':') && trimmed.includes(';')) return 'css';
    return 'txt';
}

function generateFilename(prefix, extension) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${prefix}_${timestamp}.${extension}`;
}