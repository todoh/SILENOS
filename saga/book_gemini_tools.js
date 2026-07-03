/**  
 * BOOK GEMINI TOOLS
 * Módulo de utilidades, limpieza de datos y formateo de UI para el ensamblador Gemini.
 */
Object.assign(window.GeminiBookAssembler, {
    cleanJSON(str) {         
        if (!str) return "{}";         
        str = str.replace(/```json/g, '').replace(/```/g, '').trim();         
        const s = str.indexOf('{'); const e = str.lastIndexOf('}');         
        if (s !== -1 && e !== -1) return str.substring(s, e + 1);         
        return str;      
    },     
    extractText(response) {         
        if (!response) return "";         
        const match = response.match(/<texto>([\s\S]*?)<\/texto>/i);         
        let processed = match ? match[1].trim() : response.replace(/^```[\s\S]*?\n/gi, '').replace(/```$/g, '').trim();         
        return processed.trim();     
    },     
    mergeText(oldT, newT) {         
        if (!oldT) return newT.trim();         
        const text1 = oldT.trimEnd();         
        const text2 = newT.trimStart();         
        const minOverlap = 15;         
        const maxOverlap = Math.min(text1.length, text2.length, 300);         
        let bestOverlap = 0;                  
        for (let i = minOverlap; i <= maxOverlap; i++) {             
            const endOfOld = text1.substring(text1.length - i).toLowerCase().replace(/[^a-z0-9]/gi, '');             
            const startOfNew = text2.substring(0, i).toLowerCase().replace(/[^a-z0-9]/gi, '');             
            if (endOfOld === startOfNew) {                 
                bestOverlap = i;             
            }         
        }         
        let cleanNewText = text2;         
        if (bestOverlap > 0) {             
            let cutIndex = bestOverlap;             
            while (cutIndex < cleanNewText.length && cleanNewText[cutIndex].match(/[^a-zA-Z0-9]/)) {                 
                cutIndex++;             
            }             
            cleanNewText = cleanNewText.substring(cutIndex).trimStart();         
        }         
        return text1 + "\n\n" + cleanNewText;     
    },     
    forcePauseExecution() {         
        this.isPausedByError = true;         
        this.setInputsState(false);         
        const btn = document.getElementById('btn-gemini-book-generate');         
        if (btn) {             
            btn.disabled = false;             
            btn.innerText = "RETOMAR CONSTRUCCIÓN";         
        }         
        const statusUi = document.getElementById("gemini-book-engine-status");         
        if (statusUi) {             
            statusUi.innerText = "PAUSADO";             
            statusUi.className = "font-bold text-amber-500";         
        }     
    },     
    forceResetButtons() {         
        const btnGen = document.getElementById("btn-gemini-book-generate");         
        if (btnGen) {             
            btnGen.disabled = false;             
            btnGen.innerText = "COMPILAR CON GEMINI";         
        }         
        const finalStatus = document.getElementById("gemini-book-engine-status");         
        if (finalStatus) {             
            finalStatus.innerText = "FINALIZADO";             
            finalStatus.className = "font-bold text-green-500";         
        }         
        this.setInputsState(false);         
        if (window.TramasCanvas && typeof window.TramasCanvas.render === 'function') {             
            window.TramasCanvas.render();         
        }     
    },     
    setInputsState(lock) {         
        const inputs = ['gemini-book-title', 'gemini-book-author', 'gemini-book-style'];         
        inputs.forEach(id => {             
            const el = document.getElementById(id);             
            if (el) el.disabled = lock;         
        });         
        const keyEl = document.getElementById('gemini-book-api-key');         
        if (keyEl) keyEl.disabled = false;     
    },     
    log(msg, type = "info") {         
        const term = document.getElementById("gemini-book-terminal");         
        if (!term) return;         
        const div = document.createElement("div");         
        div.className = type === "error" ? "text-red-500 font-bold" : type === "success" || type === "emerald" ? "text-emerald-400 font-bold" : type === "warn" ? "text-amber-400" : "text-green-300";         
        div.innerHTML = `> [${new Date().toLocaleTimeString()}] ${msg}`;         
        term.appendChild(div);         
        term.scrollTop = term.scrollHeight;     
    },     
    updateProgressUI() {         
        if (!this.session) return;         
        const current = this.session.currentEventIndex;         
        const total = this.session.eventsQueue.length;         
        const pct = Math.floor((current / total) * 100) || 0;         
        const txt = document.getElementById("gemini-book-progress-text");         
        const bar = document.getElementById("gemini-book-progress-bar");         
        if (txt) txt.innerText = `${current} / ${total}`;         
        if (bar) bar.style.width = `${pct}%`;     
    },     
    async autoSaveIntermediateBackup() {         
        if (!window.app || !window.app.targetHandle) return;         
        try {             
            const cleanTitle = this.session.title.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();             
            const fileHandle = await window.app.targetHandle.getFileHandle(`backup_manuscript_${cleanTitle}.json`, { create: true });             
            const writable = await fileHandle.createWritable();             
            await writable.write(JSON.stringify(this.session, null, 2));             
            await writable.close();         
        } catch (e) {}     
    },     
    downloadBook() {         
        const textToDownload = this.session ? this.session.finalText : "";         
        if (!textToDownload) return alert("El búfer está vacío actualmente.");         
        const content = `TITULO: ${this.session.title}\nAUTOR: ${this.session.author}\n\n${textToDownload}`;         
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });         
        const url = URL.createObjectURL(blob);         
        const a = document.createElement("a");         
        a.href = url;         
        a.download = `Libro_Cronologia_Fuerte_${this.session.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;         
        document.body.appendChild(a);         
        a.click();         
        document.body.removeChild(a);         
        URL.revokeObjectURL(url);     
    }
});