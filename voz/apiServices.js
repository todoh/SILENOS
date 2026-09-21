// apiServices.js - Servicios de APIs gratuitas integrados para SILENOS
const apiServices = {
    // 1. CLIMA (OpenMeteo)
    async obtenerClima(latitud, longitud) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&current_weather=true`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            const weather = data.current_weather;
            return `Clima actual: ${weather.temperature} °C, velocidad del viento: ${weather.windspeed} km/h (Código de tiempo: ${weather.weathercode}).`;
        } catch (error) {
            return `Error al consultar OpenMeteo: ${error.message}`;
        }
    },
    // 2. CRIPTOMONEDAS (CoinGecko)
    async obtenerPrecioCripto(ids = 'bitcoin,ethereum', divisas = 'usd,eur') {
        try {
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${divisas}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            return `Precios actualizados:\n` + JSON.stringify(data, null, 2);
        } catch (error) {
            return `Error al consultar CoinGecko: ${error.message}`;
        }
    },
    // 3. CRIPTOMONEDAS E HISTÓRICO (CoinPaprika)
    async obtenerDatosCoinPaprika(coinId = 'btc-bitcoin') {
        try {
            const url = `https://api.coinpaprika.com/v1/tickers/${coinId}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            return `Datos de ${data.name} (${data.symbol}): Precio USD: $${data.quotes?.USD?.price?.toFixed(2) || 'N/A'}, Cambio 24h: ${data.quotes?.USD?.percent_change_24h || 0}%, Mkt Cap: $${data.quotes?.USD?.market_cap || 'N/A'}.`;
        } catch (error) {
            return `Error al consultar CoinPaprika: ${error.message}`;
        }
    },
    // 4. BITCOIN MEMPOOL (Mempool.space)
    async obtenerEstadoMempool() {
        try {
            const res = await fetch('https://mempool.space/api/v1/fees/recommended');
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const fees = await res.json();
            return `Comisiones recomendadas de Bitcoin (sat/vB):\n- Rápida: ${fees.fastestFee}\n- Media: ${fees.halfHourFee}\n- Mínima: ${fees.minimumFee}`;
        } catch (error) {
            return `Error al consultar Mempool.space: ${error.message}`;
        }
    },
    // 5. DIVISAS (Frankfurter.app)
    async convertirDivisa(cantidad, desde = 'USD', hacia = 'EUR') {
        try {
            const url = `https://api.frankfurter.app/latest?amount=${cantidad}&from=${desde}&to=${hacia}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            return `${cantidad} ${desde} equivalen a ${data.rates[hacia]} ${hacia} (Fecha: ${data.date}).`;
        } catch (error) {
            return `Error al consultar Frankfurter: ${error.message}`;
        }
    },
    // 6. PAÍSES (RestCountries)
    async obtenerDatosPais(nombrePais) {
        try {
            const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(nombrePais)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`País no encontrado o error HTTP ${res.status}`);
            const data = await res.json();
            const pais = data[0];
            const capital = pais.capital ? pais.capital.join(', ') : 'Sin datos';
            const poblacion = pais.population ? pais.population.toLocaleString() : 'Sin datos';
            const monedas = pais.currencies ? Object.keys(pais.currencies).join(', ') : 'Sin datos';
            return `País: ${pais.name.official || pais.name.common}\nCapital: ${capital}\nPoblación: ${poblacion}\nMoneda(s): ${monedas}\nRegión: ${pais.region}`;
        } catch (error) {
            return `Error al consultar RestCountries: ${error.message}`;
        }
    },
    // 7. WIKIPEDIA (Resumen)
    async consultarWikipedia(termino, idioma = 'es') {
        try {
            const url = `https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termino)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Término no encontrado o error HTTP ${res.status}`);
            const data = await res.json();
            return `Título: ${data.title}\nExtracto: ${data.extract}`;
        } catch (error) {
            return `Error al consultar Wikipedia: ${error.message}`;
        }
    }
};