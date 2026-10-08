/**
 * SAGA Anime Studio - Cliente de Voz Local Qwen3-TTS
 * Se conecta al servidor local Qwen3-TTS (http://127.0.0.1:8000)
 */
const SagaQwenTTS = {
    getBaseUrl() {
        const input = document.getElementById('qwen-url');
        return input ? input.value.replace(/\/$/, '') : 'http://127.0.0.1:8000';
    },

    async fetchVoices() {
        const baseUrl = this.getBaseUrl();
        try {
            const res = await fetch(`${baseUrl}/api/voices`);
            if (!res.ok) throw new Error("No se pudo obtener la lista de voces de Qwen3-TTS.");
            return await res.json();
        } catch (err) {
            console.warn("[Qwen3-TTS] Servidor offline o no alcanzable:", err);
            return { presets: [{ id: "Ryan", name: "Ryan (Predeterminado)" }], custom: [] };
        }
    },

    async generateVoice(text, voice = "Ryan", instruct = "", language = "Spanish") {
        if (!text || text.trim() === "") return null;
        const baseUrl = this.getBaseUrl();

        const defaultInstruct = instruct || "Habla en español de España con acento castellano peninsular neutro, articulación clara y ritmo natural.";

        const response = await fetch(`${baseUrl}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text.trim(),
                instruct: defaultInstruct,
                voice: voice || "Ryan",
                language: language || "Spanish"
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({ detail: "Error en la síntesis TTS." }));
            throw new Error(errData.detail || `Error Qwen3-TTS HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);

        // Calcular duración exacta del archivo de audio
        const duration = await new Promise((resolve) => {
            const audio = new Audio(audioUrl);
            audio.onloadedmetadata = () => resolve(audio.duration);
            audio.onerror = () => resolve(3.5); // Fallback de tiempo por defecto
        });

        return { blob, audioUrl, duration };
    }
};

window.SagaQwenTTS = SagaQwenTTS;