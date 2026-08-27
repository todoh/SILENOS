// estadisticas.js
// Módulo de Análisis, Métricas y Estadísticas de Uso por Modelo y Tiempo
import { conversations } from './conversations.js';

export function getStatsData() {
    const rawCalls = [];

    conversations.forEach(chat => {
        if (!chat.messages || !Array.isArray(chat.messages)) return;

        chat.messages.forEach(msg => {
            if (msg.role === 'asistente' || msg.role === 'assistant') {
                const model = msg.modelName || 'Desconocido';
                const metrics = msg.metrics || {};
                const tokens = metrics.tokens || Math.ceil((msg.content || '').length / 4);
                const tokSec = metrics.tokSec || 0;
                const timeSec = parseFloat(metrics.timeSec || 0);

                // Extracción de timestamp a partir del id del mensaje o del chat
                let timestamp = Date.now();
                if (chat.id && chat.id.startsWith('chat-')) {
                    const tsParsed = parseInt(chat.id.replace('chat-', ''), 10);
                    if (!isNaN(tsParsed)) timestamp = tsParsed;
                }

                rawCalls.push({
                    chatTitle: chat.title || 'Sin título',
                    model: model,
                    tokens: tokens,
                    tokSec: tokSec,
                    timeSec: timeSec,
                    timestamp: timestamp,
                    date: new Date(timestamp)
                });
            }
        });
    });

    return rawCalls;
}

export function filterStatsByTimeframe(calls, timeframe) {
    const now = new Date();
    return calls.filter(call => {
        const diffMs = now - call.date;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (timeframe === 'dia') return diffDays <= 1;
        if (timeframe === 'semana') return diffDays <= 7;
        if (timeframe === 'mes') return diffDays <= 30;
        return true; // 'todos'
    });
}

export function aggregateStatsByModel(calls) {
    const map = {};

    calls.forEach(c => {
        if (!map[c.model]) {
            map[c.model] = {
                model: c.model,
                totalCalls: 0,
                totalTokens: 0,
                totalTimeSec: 0,
                sumTokSec: 0,
                validTokSecCount: 0
            };
        }

        map[c.model].totalCalls += 1;
        map[c.model].totalTokens += c.tokens;
        map[c.model].totalTimeSec += c.timeSec;
        if (c.tokSec > 0) {
            map[c.model].sumTokSec += c.tokSec;
            map[c.model].validTokSecCount += 1;
        }
    });

    return Object.values(map).map(m => ({
        model: m.model,
        totalCalls: m.totalCalls,
        totalTokens: m.totalTokens,
        avgTokensPerCall: Math.round(m.totalTokens / (m.totalCalls || 1)),
        avgTokSec: m.validTokSecCount > 0 ? (m.sumTokSec / m.validTokSecCount).toFixed(1) : 'N/A',
        totalTimeSec: m.totalTimeSec.toFixed(2)
    }));
}

export function renderStatsUI(container, timeframe = 'todos', viewMode = 'modelos') {
    if (!container) return;

    const rawCalls = getStatsData();
    const filteredCalls = filterStatsByTimeframe(rawCalls, timeframe);
    const aggregated = aggregateStatsByModel(filteredCalls);

    const totalCallsCount = filteredCalls.length;
    const totalTokensCount = filteredCalls.reduce((acc, c) => acc + c.tokens, 0);
    const totalTime = filteredCalls.reduce((acc, c) => acc + c.timeSec, 0).toFixed(1);

    let tableHTML = '';

    if (viewMode === 'modelos') {
        tableHTML = `
            <table class="w-full text-left font-mono text-xs border-collapse">
                <thead>
                    <tr class="border-b border-neutral-200 bg-neutral-100 text-neutral-600 uppercase text-[10px] tracking-wider">
                        <th class="p-2.5">Modelo</th>
                        <th class="p-2.5 text-center">Llamadas</th>
                        <th class="p-2.5 text-right">Tokens Totales</th>
                        <th class="p-2.5 text-right">Prom. Tok/Llamada</th>
                        <th class="p-2.5 text-right">Prom. Tok/s</th>
                        <th class="p-2.5 text-right">Tiempo Total (s)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-neutral-100">
                    ${aggregated.length === 0 ? `
                        <tr>
                            <td colspan="6" class="p-4 text-center text-neutral-400 font-sans text-xs">No hay registros para este tramo temporal.</td>
                        </tr>
                    ` : aggregated.map(row => `
                        <tr class="hover:bg-neutral-50 transition-colors">
                            <td class="p-2.5 font-bold text-black">${row.model}</td>
                            <td class="p-2.5 text-center text-neutral-700">${row.totalCalls}</td>
                            <td class="p-2.5 text-right text-neutral-700">${row.totalTokens.toLocaleString()}</td>
                            <td class="p-2.5 text-right text-neutral-700">${row.avgTokensPerCall.toLocaleString()}</td>
                            <td class="p-2.5 text-right text-emerald-600 font-semibold">${row.avgTokSec}</td>
                            <td class="p-2.5 text-right text-neutral-700">${row.totalTimeSec}s</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        tableHTML = `
            <table class="w-full text-left font-mono text-xs border-collapse">
                <thead>
                    <tr class="border-b border-neutral-200 bg-neutral-100 text-neutral-600 uppercase text-[10px] tracking-wider">
                        <th class="p-2.5">Fecha y Hora</th>
                        <th class="p-2.5">Conversación</th>
                        <th class="p-2.5">Modelo</th>
                        <th class="p-2.5 text-right">Tokens</th>
                        <th class="p-2.5 text-right">Velocidad</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-neutral-100">
                    ${filteredCalls.length === 0 ? `
                        <tr>
                            <td colspan="5" class="p-4 text-center text-neutral-400 font-sans text-xs">No hay registros para este tramo temporal.</td>
                        </tr>
                    ` : filteredCalls.slice(-50).reverse().map(call => `
                        <tr class="hover:bg-neutral-50 transition-colors">
                            <td class="p-2.5 text-neutral-500 text-[11px]">${call.date.toLocaleString()}</td>
                            <td class="p-2.5 font-sans font-medium text-black max-w-[180px] truncate" title="${call.chatTitle}">${call.chatTitle}</td>
                            <td class="p-2.5 text-neutral-700 font-bold">${call.model}</td>
                            <td class="p-2.5 text-right text-neutral-700">${call.tokens.toLocaleString()}</td>
                            <td class="p-2.5 text-right text-emerald-600">${call.tokSec > 0 ? `${call.tokSec} tok/s` : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    container.innerHTML = `
        <div class="grid grid-cols-3 gap-3 mb-4 font-mono select-none">
            <div class="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-center">
                <span class="block text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Llamadas Totales</span>
                <span class="text-lg font-bold text-black">${totalCallsCount.toLocaleString()}</span>
            </div>
            <div class="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-center">
                <span class="block text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Tokens Consumidos</span>
                <span class="text-lg font-bold text-black">${totalTokensCount.toLocaleString()}</span>
            </div>
            <div class="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-center">
                <span class="block text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Tiempo Acumulado</span>
                <span class="text-lg font-bold text-black">${totalTime}s</span>
            </div>
        </div>

        <div class="flex items-center justify-between gap-4 mb-3 font-mono text-xs select-none flex-wrap">
            <div class="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                <button class="btn-stats-time px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${timeframe === 'dia' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'}" data-tf="dia">Hoy (24h)</button>
                <button class="btn-stats-time px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${timeframe === 'semana' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'}" data-tf="semana">Últimos 7 días</button>
                <button class="btn-stats-time px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${timeframe === 'mes' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'}" data-tf="mes">Último mes</button>
                <button class="btn-stats-time px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${timeframe === 'todos' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'}" data-tf="todos">Histórico Completo</button>
            </div>

            <div class="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                <button class="btn-stats-view px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${viewMode === 'modelos' ? 'bg-black text-white' : 'text-neutral-500 hover:text-black'}" data-vm="modelos">Por Modelo</button>
                <button class="btn-stats-view px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${viewMode === 'registros' ? 'bg-black text-white' : 'text-neutral-500 hover:text-black'}" data-vm="registros">Registros Detallados</button>
            </div>
        </div>

        <div class="border border-neutral-200 rounded-xl overflow-x-auto max-h-80 overflow-y-auto bg-white shadow-xs">
            ${tableHTML}
        </div>
    `;

    // Event listeners para los filtros
    container.querySelectorAll('.btn-stats-time').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextTf = btn.getAttribute('data-tf');
            renderStatsUI(container, nextTf, viewMode);
        });
    });

    container.querySelectorAll('.btn-stats-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextVm = btn.getAttribute('data-vm');
            renderStatsUI(container, timeframe, nextVm);
        });
    });
}