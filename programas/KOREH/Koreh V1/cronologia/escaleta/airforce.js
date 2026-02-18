// --- cronologia/escaleta/airforce.js ---
// PUENTE PARA API.AIRFORCE (GROK VIDEO PROXY) - V3.1 (METRALLETA ROBUSTA)

const AirforceBridge = {
baseUrl: "https://api.airforce/v1/images/generations",

// Estado interno para la rotación de claves
keyStore: [],
currentIndex: 0, 

// Inicializa o actualiza la lista de keys
initKeys(rawKeys) {
    if (!rawKeys) throw new Error("API Keys no definidas.");
    
    // Parsear: separar por comas, limpiar espacios, eliminar vacíos
    this.keyStore = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    if (this.keyStore.length === 0) throw new Error("La lista de API Keys está vacía.");
    
    // Aseguramos que el índice esté dentro de los límites
    if (this.currentIndex >= this.keyStore.length) {
        this.currentIndex = 0;
    }
    
    console.log(`✈️ Airforce Bridge: Cargadas ${this.keyStore.length} keys para rotación.`);
},

// Función principal (Wrapper del "Modo Metralleta")
async generateVideo(prompt, width, height, rawKeys, model = 'grok-imagine-video') {
    // 1. Inicializar keys
    this.initKeys(rawKeys);

    // 2. Configurar límites de reintento
    // Intentaremos rotar al menos 10 VECES, o dar 2 vueltas completas a la lista (lo que sea mayor)
    // Esto cumple tu requisito de "cambiar de api hasta 10 veces"
    const maxAttempts = Math.max(10, this.keyStore.length * 2);
    
    let attempts = 0;
    let lastError = null;

    console.log(`✈️ Iniciando Metralleta (Max Intentos: ${maxAttempts})`);

    while (attempts < maxAttempts) {
        const currentKey = this.keyStore[this.currentIndex];
        const maskedKey = currentKey.length > 8 ? currentKey.slice(0, 4) + '...' + currentKey.slice(-4) : '***';
        
        try {
            // Intentar generar con la key actual
            console.log(`🔫 [Intento ${attempts + 1}/${maxAttempts}] Key ${this.currentIndex + 1}/${this.keyStore.length} (${maskedKey})`);
            
            const blob = await this.performRequest(currentKey, prompt, width, height, model);
            
            // Si llegamos aquí, ¡ÉXITO!
            console.log("✅ Generación exitosa.");
            return blob;

        } catch (error) {
            lastError = error;
            const errMsg = (error.message || "").toLowerCase();

            // Detectar errores que sugieren cambiar de key
            const isRateLimit = errMsg.includes("429");
            const isPayment = errMsg.includes("402") || errMsg.includes("payment");
            const isAuthError = errMsg.includes("401") || errMsg.includes("unauthorized") || errMsg.includes("invalid api key");
            const isCredit = errMsg.includes("credit") || errMsg.includes("balance");

            if (isRateLimit || isPayment || isAuthError || isCredit) {
                console.warn(`⚠️ Fallo en Key ${this.currentIndex + 1} (${error.message}). ROTANDO...`);
                
                // Rotar índice al siguiente
                this.currentIndex = (this.currentIndex + 1) % this.keyStore.length;
                
                // Pequeña pausa táctica
                await new Promise(r => setTimeout(r, 500));
            } else {
                // Errores del servidor (500) o del Prompt (400)
                // Aun así, en modo metralleta, probamos la siguiente key por si acaso es un baneo silencioso
                console.warn(`⚠️ Error Genérico (${error.message}). Probando siguiente key por seguridad...`);
                this.currentIndex = (this.currentIndex + 1) % this.keyStore.length;
            }

            attempts++;
        }
    }

    // Si salimos del while, hemos agotado todos los intentos
    throw new Error(`METRALLETA AGOTADA: Se probaron ${attempts} veces rotando entre ${this.keyStore.length} keys. Último error: ${lastError ? lastError.message : 'Desconocido'}`);
},

// La petición HTTP individual
async performRequest(apiKey, prompt, width, height, model) {
    // Formatear resolución al estilo OpenAI ("1280x720")
    const sizeString = `${width}x${height}`;

    const payload = {
        model: model, 
        prompt: prompt,
        size: sizeString, 
        n: 1,
        response_format: "url" 
    };

    const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    let videoUrl = null;
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        videoUrl = data.data[0].url;
    }

    if (!videoUrl) {
        throw new Error("La API no devolvió una URL válida.");
    }

    // Descarga del video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error("No se pudo descargar el archivo de video generado.");

    return await videoResponse.blob();
}
};