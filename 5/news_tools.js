// live gemini/news_tools.js
// ─── HERRAMIENTAS DE NOTICIAS (100% GRATIS SIN API KEY) ────────────────

async function getLatestNews(query = '') {
    try {
        if (typeof showToast === 'function') showToast(`Consultando noticias${query ? ' sobre ' + query : ''}...`, 'listening');
        
        // Utilizamos el feed RSS de Google News
        let rssUrl = 'https://news.google.com/rss?hl=es&gl=ES&ceid=ES:es';
        if (query && query.trim() !== '') {
            rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es&gl=ES&ceid=ES:es`;
        }

        // Utilizamos rss2json, un conversor dedicado que sortea los bloqueos 522 de origen 
        // y añade las cabeceras CORS correctamente sin necesidad de API Key.
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) throw new Error("No se pudo conectar con el servicio de conversión de noticias.");
        
        const data = await response.json();
        
        if (data.status !== 'ok' || !data.items) {
            throw new Error("El feed de noticias devolvió un error estructural o está vacío.");
        }

        const items = data.items;

        if (items.length === 0) {
            return `No se encontraron noticias recientes para la consulta: "${query}".`;
        }

        let newsReport = `=== BOLETÍN DE NOTICIAS ${query ? 'SOBRE: ' + query.toUpperCase() : 'DESTACADAS'} ===\n\n`;
        
        // Limitamos a las 5 noticias más relevantes para no saturar el contexto
        const limit = Math.min(5, items.length);
        for (let i = 0; i < limit; i++) {
            const item = items[i];
            
            // rss2json parsea automáticamente las etiquetas complejas a un JSON limpio
            const title = item.title || "Titular no disponible";
            const pubDate = item.pubDate || "";
            
            // Limpieza y formateo de la fecha a formato local
            let fechaLimpia = pubDate;
            if (pubDate) {
                try {
                    const d = new Date(pubDate.replace(/-/g, '/')); 
                    fechaLimpia = d.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
                } catch(e) {}
            }

            newsReport += `📰 ${title}\n`;
            newsReport += `🕒 ${fechaLimpia}\n`;
            newsReport += `--------------------------------------------------\n`;
        }

        return newsReport;
    } catch (err) {
        return `Error al consultar el servicio de noticias: ${err.message}.`;
    }
}