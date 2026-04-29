// --- CHAT-UI.JS (GESTOR GLOBAL DE INTERFAZ DE CHAT Y ESTADOS) ---
window.ChatUI = {
    clearHistory(storageKey, callback) {
        if(confirm("¿Borrar historial de forma permanente?")) {
            localStorage.removeItem(storageKey);
            if (callback) callback();
        }
    },

    handleKeydown(e, sendCallback) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendCallback();
        }
    },

    renderMessages(history, containerId, emptyIcon, emptyText) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        if (!history || history.length === 0) {
            container.innerHTML = `
                <div class="m-auto flex flex-col items-center justify-center text-gray-400 gap-4 opacity-70">
                    <i class="fa-solid ${emptyIcon} text-5xl text-indigo-200"></i>
                    <p class="text-sm font-medium tracking-wide">${emptyText}</p>
                </div>
            `;
            return;
        }

        history.forEach(msg => {
            const isUser = msg.role === 'user';
            const formattedContent = msg.content
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, "<br>");

            const msgDiv = document.createElement('div');
            msgDiv.className = `px-5 py-3.5 text-sm max-w-[85%] leading-relaxed shadow-sm ${isUser 
                ? 'self-end bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                : 'self-start bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm'}`;
            
            msgDiv.innerHTML = formattedContent;
            container.appendChild(msgDiv);
        });
        container.scrollTop = container.scrollHeight;
    },

    setLoading(btnId, isLoading, defaultHtml) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = isLoading;
        if (isLoading) {
            // Si defaultHtml no tiene tags HTML, asumimos que es texto plano
            if (defaultHtml && !defaultHtml.includes('<')) {
                btn.innerText = defaultHtml;
            } else {
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            }
        } else {
            if (defaultHtml && !defaultHtml.includes('<')) {
                btn.innerText = defaultHtml;
            } else {
                btn.innerHTML = defaultHtml || '<i class="fa-solid fa-paper-plane"></i>';
            }
        }
    },

    showTypingIndicator(containerId, text = "Pensando...") {
        const container = document.getElementById(containerId);
        if (!container) return null;
        const typingId = 'typing-' + Date.now();
        container.insertAdjacentHTML('beforeend', `
            <div id="${typingId}" class="self-start bg-white border border-gray-200 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-500 max-w-[80%] flex items-center gap-2">
                <i class="fa-solid fa-circle-notch fa-spin text-indigo-500"></i> ${text}
            </div>
        `);
        container.scrollTop = container.scrollHeight;
        return typingId;
    },

    removeTypingIndicator(typingId) {
        if (!typingId) return;
        const el = document.getElementById(typingId);
        if(el) el.remove();
    }
};