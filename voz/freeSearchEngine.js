// freeSearchEngine.js - Motor Unificado de Búsquedas sin API Key para SILENOS
const freeSearchEngine = {
    // 1. BÚSQUEDA WEB (DuckDuckGo Instant API + DuckDuckGo Lite vía Proxies CORS)
    async searchWeb(query) {
        if (!query || !query.trim()) return "Error: La consulta de búsqueda está vacía.";
        
        let cleanQuery = query.trim();
        try {
            if (cleanQuery.startsWith('http://') || cleanQuery.startsWith('https://')) {
                const urlObj = new URL(cleanQuery);
                const qParam = urlObj.searchParams.get('q') || urlObj.searchParams.get('query');
                if (qParam) cleanQuery = qParam;
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
                            apiResults.push(`  ${topic.Text}\n  URL: ${topic.FirstURL}`);
                        }
                    });
                }
                if (apiResults.length > 0) {
                    return `=== RESULTADOS DE BÚSQUEDA DUCKDUCKGO PARA: "${cleanQuery}" ===\n\n` + apiResults.join('\n\n');
                }
            }
        } catch (e) {
            console.warn("[freeSearchEngine] Falló intento directo por API JSON, ejecutando proxies CORS...", e.message);
        }

        // INTENTO 2: HTML Scraping de DuckDuckGo Lite a través de Proxies CORS públicos
        const targetLiteUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(cleanQuery)}`;
        const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
        
        const proxyList = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetLiteUrl)}`,
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(targetLiteUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetLiteUrl)}`
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
                    if (htmlContent && (htmlContent.includes('table') || htmlContent.includes('result'))) {
                        break;
                    }
                }
            } catch (err) {
                lastError = err;
                console.warn(`[freeSearchEngine] Falló proxy (${proxyUrl}):`, err.message);
            }
        }

        if (!htmlContent) {
            return `No se pudo completar la búsqueda para "${cleanQuery}". Se intentará búsqueda en Wikipedia o local. (${lastError ? lastError.message : 'Error de red'})`;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const results = [];

            // Estrategia A: DuckDuckGo Lite (filas de tabla)
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

            // Estrategia B: DuckDuckGo HTML estándar (.result)
            if (results.length === 0) {
                const resultBlocks = doc.querySelectorAll('.result');
                resultBlocks.forEach(block => {
                    const linkEl = block.querySelector('.result__a');
                    const snippetEl = block.querySelector('.result__snippet');
                    if (linkEl) {
                        results.push({
                            title: linkEl.innerText.trim(),
                            url: linkEl.getAttribute('href') || '',
                            snippet: snippetEl ? snippetEl.innerText.trim() : ''
                        });
                    }
                });
            }

            if (results.length === 0) {
                return `No se encontraron resultados parseables para: "${cleanQuery}".`;
            }

            let formattedResult = `=== RESULTADOS DE BÚSQUEDA WEB PARA: "${cleanQuery}" ===\n\n`;
            results.slice(0, 8).forEach((item, idx) => {
                formattedResult += `${idx + 1}. ${item.title}\n`;
                formattedResult += `   URL: ${item.url}\n`;
                formattedResult += `   Resumen: ${item.snippet}\n\n`;
            });
            return formattedResult;

        } catch (err) {
            console.error("Error procesando HTML:", err);
            return `Error parseando respuesta de búsqueda: ${err.message}`;
        }
    },

    // 2. BÚSQUEDA EN WIKIPEDIA (API REST Pública)
    async searchWikipedia(termino, idioma = 'es') {
        if (!termino || !termino.trim()) return "Error: Término de Wikipedia no especificado.";
        try {
            const url = `https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termino.trim())}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Término no encontrado o error HTTP ${res.status}`);
            const data = await res.json();
            return `=== RESULTADO DE WIKIPEDIA (${idioma.toUpperCase()}) ===\nTítulo: ${data.title}\nExtracto: ${data.extract}\nURL: ${data.content_urls?.desktop?.page || ''}`;
        } catch (error) {
            return `Error al consultar Wikipedia: ${error.message}`;
        }
    },

    // 3. BÚSQUEDA LOCAL EN ARCHIVOS DEL PROYECTO
    async searchLocalFiles(textoBuscado) {
        if (typeof directoryHandle === 'undefined' || !directoryHandle) {
            return "AVISO DEL SISTEMA: El usuario no ha conectado ninguna carpeta local aún.";
        }
        if (typeof buscarEnArchivos === 'function') {
            return await buscarEnArchivos(textoBuscado);
        }
        return "Error: La función de búsqueda local no está inicializada.";
    },

    // 4. ROUTER PRINCIPAL DE BÚSQUEDAS SIN API KEY
    async search(query, type = 'auto', lang = 'es') {
        if (!query || !query.trim()) return "Error: Consulta vacía.";

        if (type === 'wiki' || type === 'wikipedia') {
            return await this.searchWikipedia(query, lang);
        } else if (type === 'local' || type === 'archivos') {
            return await this.searchLocalFiles(query);
        } else if (type === 'web') {
            return await this.searchWeb(query);
        }

        // Modo 'auto': Intenta web y si falla, recurre a Wikipedia
        let result = await this.searchWeb(query);
        if (result.includes("No se pudo completar") || result.includes("No se encontraron resultados")) {
            const wikiRes = await this.searchWikipedia(query, lang);
            if (!wikiRes.startsWith("Error")) {
                return wikiRes;
            }
        }
        return result;
    }
};