/**
 * Generador Automático de Librojuegos con gemini-fast
 */
const Generator = {
    async generateBook() {
        const premise = document.getElementById('ai-premise').value;
        const nodeCount = parseInt(document.getElementById('ai-nodes').value) || 5;

        if (!premise) {
            alert("Debes escribir una premisa para que la IA sepa qué escribir.");
            return;
        }

        UI.setLoading(true, "Escribiendo libro...");

        const systemPrompt = "Eres un escritor experto en ficción interactiva y librojuegos (estilo Elige tu propia aventura). Devuelve ESTRICTAMENTE JSON PURO.";
        const userPrompt = `
            Genera un librojuego completo basado en esta premisa: "${premise}".
            Debe estar estructurado exactamente en ${nodeCount} nodos de historia.
            
            REGLAS:
            1. El nodo inicial DEBE tener el id "start".
            2. Cada nodo debe tener una descripción narrativa rica, inmersiva y en segunda persona ("Tú haces...").
            3. Todos los nodos deben tener entre 1 y 3 opciones ("choices"), EXCEPTO los nodos que representen un final (muerte o victoria), que tendrán un array "choices" vacío.
            4. Asegúrate de que los "targetId" de las opciones apunten a ids que existan realmente en el array que generes.

            FORMATO JSON ESPERADO:
            {
                "title": "Título Épico del Juego",
                "nodes": [
                    {
                        "id": "start",
                        "text": "Narrativa extensa del primer nodo...",
                        "choices": [
                            { "text": "Hacer esto", "targetId": "nodo_2" },
                            { "text": "Hacer lo otro", "targetId": "nodo_3" }
                        ]
                    },
                    {
                        "id": "nodo_2",
                        "text": "Narrativa de consecuencia o final...",
                        "choices": [] 
                    }
                ]
            }
        `;

        try {
            // Utilizamos el modelo gemini-fast como fue requerido
            const generatedData = await window.Koreh.Text.generate(systemPrompt, userPrompt, {
                model: 'gemini-fast',
                jsonMode: true,
                temperature: 0.8
            });

            if (generatedData && generatedData.nodes) {
                Core.loadBook(generatedData);
                document.getElementById('manual-title').value = Core.bookData.title;
                UI.renderNodeList();
                UI.switchView('player');
            } else {
                throw new Error("La IA no devolvió la estructura esperada.");
            }

        } catch (error) {
            console.error(error);
            alert("Error al forjar el librojuego: " + error.message);
        } finally {
            UI.setLoading(false);
        }
    }
};