// ui_messages.js
// Renderizado de Mensajes, Bloques de Razonamiento, Búferes, Mime-Types de Descargas e Indicador de Métricas de Rendimiento (tokens/s)
import { conversations, activeConversationId, writeFileToDirectory, readFileFromDirectory } from './conversations.js';
import { getBufferContent } from './db.js';

export function getSystemCanvasContext() {
    const canvas = document.getElementById('canvas-procesado');
    return canvas ? canvas.getContext('2d') : null;
}

export function renderActiveConversationUI(chatHistory) {
    if (!chatHistory) return;
    chatHistory.innerHTML = '';
    
    const currentChat = conversations.find(c => c.id === activeConversationId);
    if (!currentChat) return;
    
    if (currentChat.messages.length === 0) {
        chatHistory.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-xl mx-auto my-auto select-none">
                <div class="space-y-1">
                    <h3 class="text-xl font-bold tracking-tight text-black font-mono">S I L E N <span class="text-red-500">O S</span></h3>
                    <p class="text-sm text-black leading-relaxed font-mono">C H A T</p>
                </div>
            </div>
        `;
    } else {
        currentChat.messages.forEach(m => {
            appendChatMessageToDOMUI(chatHistory, m.role, m.content, m.modelName || "Modelo", false, m.imageUrl, m.metrics);
        });
    }
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

export function formatModelOutput(text) {
    if (!text) return '';
    
    let formatted = text;
    const hasThinkStart = formatted.toLowerCase().includes('<think>');
    const hasThinkEnd = formatted.toLowerCase().includes('</think>');
    
    if (hasThinkStart) {
        formatted = formatted.replace(/<think>/gi, '<div class="think-block"><div class="think-header">Razonamiento Interno</div>');
        if (!hasThinkEnd) {
            formatted += '</div>';
        }
    }
    if (hasThinkEnd) {
        formatted = formatted.replace(/<\/think>/gi, '</div>');
    }
    return formatted;
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function highlightSyntax(code, lang) {
    const safeCode = escapeHTML(code);
    const l = (lang || '').toLowerCase();
    if (l === 'js' || l === 'javascript' || l === 'json') {
        return safeCode
            .replace(/("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)/g, '<span style="color: #ce9178;">$1$2$3</span>')
            .replace(/\b(const|let|var|function|return|async|await|if|else|for|while|import|export|from|try|catch|class|new|throw|typeof)\b/g, '<span style="color: #569cd6; font-weight: bold;">$1</span>')
            .replace(/\b(true|false|null|undefined|NaN)\b/g, '<span style="color: #569cd6;">$1</span>')
            .replace(/\b(\d+)\b/g, '<span style="color: #b5cea8;">$1</span>')
            .replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span style="color: #6a9955; font-style: italic;">$1</span>');
    } else if (l === 'html' || l === 'xml' || l === 'svg') {
        return safeCode
            .replace(/(&lt;\/?[a-zA-Z0-9-]+)/g, '<span style="color: #569cd6; font-weight: bold;">$1</span>')
            .replace(/([a-zA-Z0-9-]+)=&quot;/g, '<span style="color: #9cdcfe;">$1</span>=&quot;')
            .replace(/(&quot;[\s\S]*?&quot;)/g, '<span style="color: #ce9178;">$1</span>')
            .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color: #6a9955; font-style: italic;">$1</span>');
    } else if (l === 'css') {
        return safeCode
            .replace(/([a-zA-Z-.]+)(?=\s*\{)/g, '<span style="color: #d7ba7d;">$1</span>')
            .replace(/([a-zA-Z-]+)(?=\s*:)/g, '<span style="color: #9cdcfe;">$1</span>')
            .replace(/:\s*([^;]+);/g, ': <span style="color: #ce9178;">$1</span>;')
            .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #6a9955; font-style: italic;">$1</span>');
    }
    return safeCode;
}

export function appendChatMessageToDOMUI(chatHistory, role, text, modelName = "", autoScroll = true, imageUrl = "", metrics = null) {
    const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const card = document.createElement('div');
    card.id = messageId;
    card.className = "chat-card max-w-3xl mx-auto flex gap-4 items-start p-2 rounded-2xl transition-all text-black w-full overflow-hidden";
    
    let icon = "";
    let title = "";
    
    if (role === 'usuario') {
        icon = `<div class="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 text-black font-mono font-bold text-xs select-none">U</div>`;
        title = `<p class="text-xs text-black font-bold uppercase tracking-wider font-mono">TÚ</p>`;
    } else if (role === 'asistente') {
        icon = `<div class="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 text-white font-mono font-bold text-xs select-none">AI</div>`;
        title = `<p class="text-xs text-black font-bold uppercase tracking-wider font-mono">${modelName}</p>`;
    } else {
        icon = `<div class="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold font-mono text-xs select-none">!</div>`;
        title = `<p class="text-xs text-red-600 font-bold uppercase tracking-wider font-mono">Error de Red</p>`;
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = icon.trim();
    const iconNode = tempDiv.firstChild;
    
    const container = document.createElement('div');
    container.className = "space-y-1.5 flex-1 min-w-0 pt-1 text-black overflow-hidden";
    container.innerHTML = title;
    
    let textToShow = text || '';
    textToShow = textToShow.replace(/\[SVG_FILE:\s*([a-zA-Z0-9_.-]+)\]/gi, '');
    
    textToShow = textToShow.replace(/```(html|xml|javascript|js|css|json|svg)?[\s\S]*?(```|$)/gi, (match, lang) => {
        if (lang === 'svg' || match.includes('<svg')) {
            return '\n*(Renderizado vectorial SVG extraído en su propio contenedor aislador)*\n';
        }
        const cleanLang = (lang || 'código').toUpperCase();
        return `\n*(Bloque de ${cleanLang} extraído y disponible para descarga/copia)*\n`;
    });
    
    textToShow = textToShow.replace(/<svg[\s\S]*?<\/svg>/gi, '\n*(Renderizado SVG extraído)*\n');
    textToShow = textToShow.replace(/<!DOCTYPE html>|<html[\s\S]*?<\/html>/gi, '\n*(Documento HTML encapsulado)*\n');
    
    let safeParagraphHTML = formatModelOutput(escapeHTML(textToShow));
    
    const textParagraph = document.createElement('div');
    textParagraph.className = "msg-content text-sm text-black leading-relaxed whitespace-pre-wrap break-words font-normal overflow-hidden";
    textParagraph.innerHTML = safeParagraphHTML;
    container.appendChild(textParagraph);
    
    if (imageUrl) {
        const imgContainer = document.createElement('div');
        imgContainer.className = "mt-4 border border-neutral-200 bg-white rounded-2xl overflow-hidden p-4 space-y-3 max-w-lg shadow-xs";
        imgContainer.innerHTML = `
            <div class="flex justify-between items-center border-b border-neutral-200 pb-2 mb-2">
                <span class="text-[10px] font-bold text-black font-mono uppercase tracking-wider">Imagen Generada</span>
                <a href="${imageUrl}" download="generacion_${messageId}.png" class="btn-down text-[10px] bg-neutral-100 hover:bg-neutral-200 text-black px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all flex items-center gap-1 cursor-pointer">
                    Descargar Imagen
                </a>
            </div>
            <div class="flex items-center justify-center max-w-full rounded-lg overflow-hidden bg-neutral-50">
                <img src="${imageUrl}" class="w-full h-auto max-h-[512px] object-contain rounded" alt="Imagen Generada" />
            </div>
        `;
        container.appendChild(imgContainer);
    }
    
    detectSvgStructuresUI(text, container, messageId, role);
    detectGenericCodeStructuresUI(text, container, messageId);
    detectBufferStructuresUI(text, container, messageId);
    
    // RENDERIZADO DISCRETO DE MÉTRICAS (TOKENS Y TOKENS/S)
    if (role === 'asistente' && metrics && metrics.tokens !== undefined) {
        const metricsFooter = document.createElement('div');
        metricsFooter.className = "mt-2 pt-1 border-t border-neutral-100/50 flex items-center gap-3 text-[10px] font-mono text-neutral-400 select-none";
        metricsFooter.innerHTML = `
            <span><i class="fa-solid fa-bolt text-[9px] mr-0.5"></i> ${metrics.tokSec} tok/s</span>
            <span>•</span>
            <span>${metrics.tokens} tokens</span>
            ${metrics.timeSec ? `<span>•</span><span>${metrics.timeSec}s</span>` : ''}
        `;
        container.appendChild(metricsFooter);
    }
    
    card.appendChild(iconNode);
    card.appendChild(container);
    chatHistory.appendChild(card);
    
    if (autoScroll) {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

export function appendWaitingMessageUI(chatHistory, modelName, chatId) {
    const waitingId = `wait-${Date.now()}`;
    const card = document.createElement('div');
    card.id = waitingId;
    card.setAttribute('data-waiting-chat', chatId);
    card.className = "max-w-3xl mx-auto flex gap-4 items-start p-2 rounded-2xl text-black w-full overflow-hidden animate-pulse";
    card.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 font-mono text-xs font-bold select-none">
            <i class="fa-solid fa-circle-notch fa-spin text-xs"></i>
        </div>
        <div class="space-y-1 flex-1 min-w-0 pt-1 text-black">
            <div class="flex items-center gap-2">
                <p class="text-xs text-black font-bold uppercase tracking-wider font-mono">${modelName}</p>
                <span class="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                    <i class="fa-solid fa-spinner fa-spin text-[9px]"></i> procesando...
                </span>
            </div>
            <div class="space-y-1.5 mt-2"></div>
        </div>
    `;
    chatHistory.appendChild(card);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return waitingId;
}

export function detectSvgStructuresUI(rawText, container, messageId, role) {
    if (!rawText) return;
    
    let sanitizedText = rawText.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    
    const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
    const fileRefRegex = /\[SVG_FILE:\s*([a-zA-Z0-9_.-]+)\]/gi;
    
    const svgMatches = sanitizedText.match(svgRegex);
    let fileMatches = [];
    let match;
    while ((match = fileRefRegex.exec(sanitizedText)) !== null) {
        fileMatches.push(match[1]);
    }
    
    if (fileMatches.length > 0) {
        fileMatches.forEach(fileName => {
            readFileFromDirectory(fileName).then(svgData => {
                if (svgData) {
                    const cleanSvg = svgData.replace(/\\"/g, '"').trim();
                    renderSvgBox(container, fileName, cleanSvg);
                } else {
                    renderSvgBox(container, fileName, null, "No se pudo cargar el archivo SVG desde el disco.");
                }
            });
        });
    }
    else if (svgMatches && svgMatches.length > 0) {
        svgMatches.forEach((svgStr, idx) => {
            const fileName = `vector_${messageId}_${idx + 1}.svg`;
            const cleanSvg = svgStr.replace(/\\"/g, '"').trim();
            const blob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
            
            writeFileToDirectory(fileName, blob);
            
            const currentChat = conversations.find(c => c.id === activeConversationId);
            if (currentChat && currentChat.messages.length > 0) {
                const lastMsg = currentChat.messages[currentChat.messages.length - 1];
                if (lastMsg && !lastMsg.content.includes(`[SVG_FILE: ${fileName}]`)) {
                    lastMsg.content = lastMsg.content.replace(svgStr, `[SVG_FILE: ${fileName}]`);
                }
            }
            renderSvgBox(container, fileName, cleanSvg);
        });
    }
}

export function detectGenericCodeStructuresUI(rawText, container, messageId) {
    if (!rawText) return;
    
    let sanitizedText = rawText.replace(/\\"/g, '"');
    
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)([\s\S]*?)(```|$)/gi;
    let match;
    let idx = 0;
    
    while ((match = codeBlockRegex.exec(sanitizedText)) !== null) {
        const langTag = (match[1] || '').toLowerCase().trim();
        let codeContent = match[2].trim();
        
        if (!codeContent || codeContent.startsWith("*(Estructura HTML") || codeContent.startsWith("*(Bloque de")) continue;
        if (codeContent.toLowerCase().startsWith("<svg") && codeContent.toLowerCase().endsWith("</svg>")) {
            continue;
        }
        
        idx++;
        
        let mimeType = 'text/plain';
        let extension = 'txt';
        let labelTitle = `Código (${langTag || 'texto'}) #${idx}`;
        const isHtmlBlock = langTag === 'html' || codeContent.startsWith('<html') || codeContent.startsWith('<!DOCTYPE');
        
        if (langTag === 'svg' || codeContent.startsWith('<svg')) {
            mimeType = 'image/svg+xml';
            extension = 'svg';
            labelTitle = `Archivo Vectorial SVG #${idx}`;
        } else if (isHtmlBlock) {
            mimeType = 'text/html';
            extension = 'html';
            labelTitle = `Archivo Web HTML #${idx}`;
        } else if (langTag === 'json') {
            mimeType = 'application/json';
            extension = 'json';
            labelTitle = `Estructura JSON #${idx}`;
        } else if (langTag === 'css') {
            mimeType = 'text/css';
            extension = 'css';
            labelTitle = `Hoja de Estilos CSS #${idx}`;
        } else if (langTag === 'js' || langTag === 'javascript') {
            mimeType = 'application/javascript';
            extension = 'js';
            labelTitle = `Script JavaScript (${langTag}) #${idx}`;
        }
        
        const fileName = `archivo_${messageId}_${idx}.${extension}`;
        const blob = new Blob([codeContent], { type: `${mimeType};charset=utf-8` });
        writeFileToDirectory(fileName, blob);
        
        const previewBox = document.createElement('div');
        previewBox.className = "mt-4 border border-neutral-200 bg-white rounded-2xl overflow-hidden p-4 space-y-3 text-black w-full min-w-0 shadow-xs transition-all";
        
        const controlsHeader = isHtmlBlock ? `
            <div class="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-lg border border-neutral-200 select-none">
                <button class="btn-toggle-view text-[10px] bg-white text-black font-bold px-2 py-1 rounded shadow-xs transition-all cursor-pointer" data-mode="code">
                    <i class="fa-solid fa-code mr-1"></i>Código
                </button>
                <button class="btn-toggle-view text-[10px] text-neutral-500 hover:text-black font-bold px-2 py-1 rounded transition-all cursor-pointer" data-mode="preview">
                    <i class="fa-solid fa-eye mr-1"></i>Vista Previa
                </button>
            </div>
            <button class="btn-fullscreen text-[10px] bg-neutral-100 hover:bg-neutral-200 text-black px-2.5 py-1.5 rounded-lg font-bold font-mono transition-all cursor-pointer flex items-center gap-1 select-none" title="Maximizar Visualización">
                <i class="fa-solid fa-expand"></i>
            </button>
        ` : '';
        
        const highlightedCode = highlightSyntax(codeContent, langTag);
        previewBox.innerHTML = `
            <div class="flex justify-between items-center border-b border-neutral-200 pb-2 mb-2 gap-2 flex-wrap select-none">
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold text-black font-mono uppercase tracking-wider">${labelTitle}</span>
                    <span class="text-[9px] bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded font-mono text-neutral-600">${fileName}</span>
                </div>
                <div class="flex items-center gap-2">
                    ${controlsHeader}
                    <button class="btn-copy text-[10px] bg-neutral-100 hover:bg-neutral-200 text-black px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all cursor-pointer">
                        Copiar
                    </button>
                    <button class="btn-down text-[10px] bg-black text-white hover:bg-neutral-800 px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1">
                        Descargar .${extension}
                    </button>
                </div>
            </div>
            <div class="code-view-container bg-[#1e1e1e] p-3 rounded-lg max-h-60 overflow-auto border border-neutral-800 w-full font-mono text-xs text-[#d4d4d4] leading-relaxed">
                <pre class="whitespace-pre-wrap break-all"><code>${highlightedCode}</code></pre>
            </div>
            ${isHtmlBlock ? `
                <div class="preview-view-container hidden w-full h-80 bg-white rounded-lg border border-neutral-200 overflow-hidden relative">
                    <iframe class="w-full h-full border-none" sandbox="allow-scripts"></iframe>
                </div>
            ` : ''}
        `;
        
        if (isHtmlBlock) {
            const codeContainer = previewBox.querySelector('.code-view-container');
            const previewContainer = previewBox.querySelector('.preview-view-container');
            const iframe = previewContainer.querySelector('iframe');
            const toggleBtns = previewBox.querySelectorAll('.btn-toggle-view');
            const btnFullscreen = previewBox.querySelector('.btn-fullscreen');
            
            toggleBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.getAttribute('data-mode');
                    toggleBtns.forEach(b => {
                        b.className = "btn-toggle-view text-[10px] text-neutral-500 hover:text-black font-bold px-2 py-1 rounded transition-all cursor-pointer";
                    });
                    btn.className = "btn-toggle-view text-[10px] bg-white text-black font-bold px-2 py-1 rounded shadow-xs transition-all cursor-pointer";
                    
                    if (mode === 'preview') {
                        codeContainer.classList.add('hidden');
                        previewContainer.classList.remove('hidden');
                        iframe.srcdoc = codeContent;
                    } else {
                        previewContainer.classList.add('hidden');
                        codeContainer.classList.remove('hidden');
                    }
                });
            });
            
            btnFullscreen.addEventListener('click', () => {
                const targetView = previewContainer.classList.contains('hidden') ? codeContainer : previewContainer;
                const modalOverlay = document.createElement('div');
                modalOverlay.className = "fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-6 backdrop-blur-xs animate-fade-in";
                
                const modalContent = document.createElement('div');
                modalContent.className = "bg-white w-[90vw] h-[90vh] rounded-2xl border border-neutral-200 shadow-2xl flex flex-col overflow-hidden relative p-4";
                
                const closeBtn = document.createElement('button');
                closeBtn.className = "absolute top-3 right-3 text-xs font-bold font-mono bg-neutral-100 hover:bg-black hover:text-white text-black px-3 py-1.5 rounded-xl border border-neutral-200 transition-all cursor-pointer z-50 flex items-center gap-1.5 select-none";
                closeBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> Cerrar`;
                
                const modalHeader = document.createElement('div');
                modalHeader.className = "flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0 pr-24 select-none";
                modalHeader.innerHTML = `<span class="text-xs font-bold font-mono text-black uppercase tracking-wider">${labelTitle} - Vista Ampliada</span>`;
                
                const contentWrapper = document.createElement('div');
                contentWrapper.className = "flex-1 w-full h-full min-h-0 pt-3 overflow-hidden";
                
                if (targetView === previewContainer) {
                    const expandedIframe = document.createElement('iframe');
                    expandedIframe.className = "w-full h-full border-none rounded-xl bg-white";
                    expandedIframe.setAttribute('sandbox', 'allow-scripts');
                    expandedIframe.srcdoc = codeContent;
                    contentWrapper.appendChild(expandedIframe);
                } else {
                    const expandedCodeBox = document.createElement('div');
                    expandedCodeBox.className = "w-full h-full bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-xl font-mono text-xs overflow-auto border border-neutral-800 leading-relaxed";
                    expandedCodeBox.innerHTML = `<pre class="whitespace-pre-wrap break-all"><code>${highlightedCode}</code></pre>`;
                    contentWrapper.appendChild(expandedCodeBox);
                }
                
                modalContent.appendChild(closeBtn);
                modalContent.appendChild(modalHeader);
                modalContent.appendChild(contentWrapper);
                modalOverlay.appendChild(modalContent);
                document.body.appendChild(modalOverlay);
                
                const closeModal = () => modalOverlay.remove();
                closeBtn.addEventListener('click', closeModal);
                modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
            });
        }
        
        previewBox.querySelector('.btn-copy').addEventListener('click', () => {
            navigator.clipboard.writeText(codeContent).then(() => {
                const btn = previewBox.querySelector('.btn-copy');
                const origText = btn.textContent;
                btn.textContent = "¡Copiado!";
                setTimeout(() => btn.textContent = origText, 2000);
            });
        });
        
        previewBox.querySelector('.btn-down').addEventListener('click', () => {
            const downBlob = new Blob([codeContent], { type: `${mimeType};charset=utf-8` });
            const url = URL.createObjectURL(downBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        
        container.appendChild(previewBox);
    }
}

function renderSvgBox(container, fileName, svgRawData, errorMsg = null) {
    const previewBox = document.createElement('div');
    previewBox.className = "mt-4 border border-neutral-200 bg-white rounded-2xl overflow-hidden p-4 space-y-3 text-black w-full shadow-xs";
    
    if (errorMsg) {
        previewBox.innerHTML = `
            <div class="flex justify-between items-center border-b border-neutral-200 pb-2 mb-2 select-none">
                <span class="text-[10px] font-bold text-red-600 font-mono uppercase tracking-wider">Error SVG (${fileName})</span>
            </div>
            <div class="text-xs font-mono text-red-500 p-2">${escapeHTML(errorMsg)}</div>
        `;
    } else {
        previewBox.innerHTML = `
            <div class="flex justify-between items-center border-b border-neutral-200 pb-2 mb-2 select-none">
                <span class="text-[10px] font-bold text-black font-mono uppercase tracking-wider">Vector SVG (${fileName})</span>
                <button class="btn-down text-[10px] bg-neutral-100 hover:bg-neutral-200 text-black px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all flex items-center gap-1 cursor-pointer">
                    Descargar SVG
                </button>
            </div>
            <div class="svg-host-container bg-transparent flex items-center justify-center max-w-full overflow-auto min-h-[150px] p-2 rounded-lg" style="max-height: 400px;">
            </div>
        `;
        
        const host = previewBox.querySelector('.svg-host-container');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = `<style>:host{display:flex;justify-content:center;align-items:center;width:100%;}svg{max-width:100%;height:auto;display:block;}</style>${svgRawData}`;
        
        previewBox.querySelector('.btn-down').addEventListener('click', () => {
            const blob = new Blob([svgRawData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
    container.appendChild(previewBox);
}

export function detectBufferStructuresUI(rawText, container, messageId) {
    if (!rawText) return;
    const bufferRegex = /\[VER_BUFFER:\s*([a-zA-Z0-9_-]+)\]/gi;
    let match;
    while ((match = bufferRegex.exec(rawText)) !== null) {
        const bufferId = match[1];
        
        const previewBox = document.createElement('div');
        previewBox.className = "mt-4 border border-neutral-200 bg-neutral-50 rounded-2xl overflow-hidden p-5 space-y-4 text-black shadow-xs flex flex-col w-full";
        
        previewBox.innerHTML = `
            <div class="flex justify-between items-center border-b border-neutral-200 pb-3 select-none">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span class="text-xs font-bold text-black font-mono uppercase tracking-wider">VISOR DE BÚFER [${bufferId}]</span>
                </div>
                <div class="flex gap-2">
                    <button class="btn-copy-buffer text-[10px] bg-white border border-neutral-200 hover:bg-neutral-100 text-black px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all cursor-pointer">
                        Copiar Todo
                    </button>
                    <button class="btn-down-buffer text-[10px] bg-black text-white hover:bg-neutral-800 px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all cursor-pointer">
                        Descargar (.txt)
                    </button>
                </div>
            </div>
            <div class="book-viewport bg-white border border-neutral-200 rounded-xl p-6 overflow-y-auto font-serif text-sm leading-relaxed max-h-96 shadow-inner text-neutral-800 whitespace-pre-wrap">
                <span class="text-xs font-mono text-neutral-400">Cargando contenido desde disco local...</span>
            </div>
            <div class="flex justify-between items-center pt-2 text-[10px] text-neutral-400 font-mono select-none">
                <span>Estado: Autoconsolidado</span>
                <span class="buffer-metrics">Tamaño: 0 caracteres</span>
            </div>
        `;
        
        container.appendChild(previewBox);
        getBufferContent(bufferId).then(fullContent => {
            const viewport = previewBox.querySelector('.book-viewport');
            const metrics = previewBox.querySelector('.buffer-metrics');
            if (!fullContent) {
                viewport.innerHTML = `<span class="text-xs font-mono text-red-500">[!] Error: El búfer del agente '${bufferId}' está vacío o no se ha inicializado todavía.</span>`;
                return;
            }
            viewport.textContent = fullContent;
            metrics.textContent = `Tamaño: ${fullContent.length} caracteres (~${Math.round(fullContent.split(/\s+/).length)} palabras)`;
            previewBox.querySelector('.btn-copy-buffer').addEventListener('click', () => {
                navigator.clipboard.writeText(fullContent).then(() => {
                    const btn = previewBox.querySelector('.btn-copy-buffer');
                    const origText = btn.textContent;
                    btn.textContent = "¡Copiado!";
                    setTimeout(() => btn.textContent = origText, 2000);
                });
            });
            previewBox.querySelector('.btn-down-buffer').addEventListener('click', () => {
                const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${bufferId}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }).catch(err => {
            const viewport = previewBox.querySelector('.book-viewport');
            viewport.innerHTML = `<span class="text-xs font-mono text-red-500">[!] Error al cargar búfer: ${escapeHTML(err.message)}</span>`;
        });
    }
}