// ddgSearch.js - Extractor de búsquedas mediante DuckDuckGo API / Lite con Fallback
const ddgSearch = {
    async search(query) {
        if (!query || !query.trim()) return "Error: La consulta de búsqueda está vacía.";
        
        let cleanQuery = query.trim();

        // Extraer la palabra clave si la consulta es una URL de búsqueda completa
        try {
            if (cleanQuery.startsWith('http://') || cleanQuery.startsWith('https://')) {
                const urlObj = new URL(cleanQuery);
                const qParam = urlObj.searchParams.get('q') || urlObj.searchParams.get('query');
                if (qParam) {
                    cleanQuery = qParam;
                }
            }
        } catch (e) {}

        // INTENTO 1: DuckDuckGo Instant Answer API (JSON directo)
        try {
            const jsonUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
            const jsonRes = await fetch(jsonUrl);
            
            if (jsonRes.ok) {
                const data = await jsonRes.json();
                let apiResults = [];

                if (data.AbstractText) {
                    apiResults.push(`=== RESULTADO PRINCIPAL ===\nFuente: ${data.AbstractSource || 'DuckDuckGo'}\nTexto: ${data.AbstractText}\nURL: ${data.AbstractURL}\n`);
                }

                if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
                    data.RelatedTopics.slice(0, 5).forEach((topic) => {
                        if (topic.Text && topic.FirstURL) {
                            apiResults.push(`• ${topic.Text}\n  URL: ${topic.FirstURL}`);
                        }
                    });
                }

                if (apiResults.length > 0) {
                    return `=== RESULTADOS DE BÚSQUEDA DUCKDUCKGO (API) PARA: "${cleanQuery}" ===\n\n` + apiResults.join('\n\n');
                }
            }
        } catch (e) {
            console.warn("[ddgSearch] Falló el intento directo por API JSON, intentando proxy HTML...", e.message);
        }

        // INTENTO 2: Scraping de DuckDuckGo Lite a través de múltiples proxies CORS
        const targetUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(cleanQuery)}`;
        
        const proxyList = [
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
        ];

        let htmlContent = null;
        let lastError = null;

        for (const proxyUrl of proxyList) {
            try {
                const response = await fetch(proxyUrl, { method: 'GET' });
                if (!response.ok) continue;

                if (proxyUrl.includes('allorigins.win')) {
                    const data = await response.json();
                    if (data && data.contents) {
                        htmlContent = data.contents;
                        break;
                    }
                } else {
                    htmlContent = await response.text();
                    if (htmlContent && htmlContent.includes('table')) {
                        break;
                    }
                }
            } catch (err) {
                lastError = err;
                console.warn(`[ddgSearch] Falló intento con proxy (${proxyUrl}):`, err.message);
            }
        }

        // INTENTO 3: Fallback a Pollinations Search si existe en el entorno
        if (!htmlContent && typeof doPollinationsSearch === 'function' && typeof pollinationsKey !== 'undefined' && pollinationsKey) {
            try {
                const polResult = await doPollinationsSearch(cleanQuery, 'nova-fast');
                if (polResult && !polResult.startsWith('Error')) {
                    return `=== RESULTADOS DE BÚSQUEDA PARA: "${cleanQuery}" ===\n\n` + polResult;
                }
            } catch(e) {}
        }

        if (!htmlContent) {
            return `No se pudo completar la búsqueda para "${cleanQuery}". Todos los servicios de transporte o proxy fallaron o están bloqueados temporalmente. (${lastError ? lastError.message : 'Error de red'})`;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            const results = [];
            const rows = doc.querySelectorAll('table:nth-of-type(3) tr');
            let currentTitle = '';
            let currentUrl = '';

            rows.forEach(row => {
                const linkEl = row.querySelector('a.result-link');
                const snippetEl = row.querySelector('td.result-snippet');
                if (linkEl) {
                    currentTitle = linkEl.innerText.trim();
                    currentUrl = linkEl.getAttribute('href') || '';
                } else if (snippetEl && currentTitle) {
                    const snippet = snippetEl.innerText.trim();
                    results.push({
                        title: currentTitle,
                        url: currentUrl,
                        snippet: snippet
                    });
                    currentTitle = '';
                    currentUrl = '';
                }
            });

            if (results.length === 0) {
                return `No se encontraron resultados en DuckDuckGo para: "${cleanQuery}".`;
            }

            let formattedResult = `=== RESULTADOS DE BÚSQUEDA DUCKDUCKGO PARA: "${cleanQuery}" ===\n\n`;
            results.slice(0, 8).forEach((item, idx) => {
                formattedResult += `${idx + 1}. ${item.title}\n`;
                formattedResult += `   URL: ${item.url}\n`;
                formattedResult += `   Resumen: ${item.snippet}\n\n`;
            });

            return formattedResult;
        } catch (err) {
            console.error("Error procesando HTML de DuckDuckGo:", err);
            return `Error parseando respuesta de búsqueda: ${err.message}`;
        }
    }
};