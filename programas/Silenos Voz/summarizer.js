// ─── SUMMARIZER (NOVA-FAST / AHORA OPENAI-LARGE) ─────────────────────────
const summarizer = {
    async generate() {
        if (!pollinationsKey || !fullConversationText.trim()) return;
        try {
            if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-novafast', true);
            
            const res = await fetch(POLLINATIONS_API_URL, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${pollinationsKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    model: 'nova-fast', 
                    messages: [
                        { role: 'system', content: 'Eres un asistente experto. Resume la siguiente conversación de forma muy breve y concisa, destacando de qué se está hablando en este preciso momento. Máximo 2 líneas de texto.'}, 
                        { role: 'user', content: fullConversationText }
                    ],
                    seed: Math.floor(Math.random() * 1000)
                })
            });
            const data = await res.json();
            if (data.choices && data.choices.length > 0) {
                const summary = data.choices[0].message.content;
                const el = document.getElementById('summaryText');
                el.textContent = summary;
                el.classList.add('active');
            }
        } catch(e) {
            console.error("Error al resumir con Pollinations", e);
        } finally {
            if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-novafast', false);
        }
    }
};

function startSummarizer() {
    if (summaryInterval) clearInterval(summaryInterval);
    summaryInterval = setInterval(() => {
        if (isConnected && pollinationsKey) summarizer.generate();
    }, 180000); // 3 minute as solicitaste
}

function stopSummarizer() {
    if (summaryInterval) clearInterval(summaryInterval);
}