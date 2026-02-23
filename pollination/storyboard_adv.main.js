// --- storyboard_adv.main.js ---
// CONTROLADOR PRINCIPAL DEL STORYBOARD AVANZADO (SILENOS X POLLINATION)

const StoryboardAdv = {
    state: {
        prompt: "",
        format: "landscape",
        style: "",
        genre: "",
        sceneCount: 5,
        visualBible: [],
        globalArt: "",
        scenes: []
    },

    init() {
        console.log("Silenos Storyboard Adv v2.2 Initialized (English Elegance Update)");
        if (typeof SbAdvUI !== 'undefined') {
            SbAdvUI.init();
        } else {
            console.error("Error: SbAdvUI is undefined. Check storyboard_adv.ui.js.");
        }
    },

    async processStoryboard() {
        const inputs = SbAdvUI.getInputs();
        if (!inputs.prompt) return alert("Please input the foundational narrative script.");
        if (inputs.sceneCount < 1 || inputs.sceneCount > 50) return alert("Frame count must be between 1 and 50.");

        const apiKey = localStorage.getItem('pollinations_api_key');
        if (!apiKey) {
            alert("Please connect your Pollination API Key first.");
            const modal = document.getElementById('login-modal');
            if (modal) modal.classList.remove('hidden');
            return;
        }

        this.state = { ...this.state, ...inputs };
        
        SbAdvUI.toggleLoading(true, "PHASE I: ART DIRECTION", "Locking global aesthetic and character signatures...");

        try {
            // 1. Generar Biblia Visual y Dirección de Arte Global
            const extraction = await SbAdvAI.extractVisualBible(
                this.state.prompt, 
                this.state.style, 
                this.state.genre
            );
            
            this.state.visualBible = extraction.bible;
            this.state.globalArt = extraction.globalArt;
            
            console.log("Visual Bible Generated:", this.state.visualBible);

            // 2. Generar Escenas
            SbAdvUI.updateLoading("PHASE II: SCENE STRUCTURING", `Plotting ${this.state.sceneCount} keyframes with chromatic coherence...`);
            
            this.state.scenes = await SbAdvAI.generateScenes(
                this.state.prompt,
                this.state.style,
                this.state.genre,
                this.state.sceneCount,
                this.state.visualBible,
                this.state.globalArt
            );

            console.log("Scenes Generated:", this.state.scenes);

            if (!this.state.scenes || this.state.scenes.length === 0) {
                throw new Error("AI failed to return valid scenes.");
            }

            // 3. Renderizar Imágenes
            SbAdvUI.updateLoading("PHASE III: VISUAL RENDERING", "Initializing batch diffusion engines...");
            SbAdvUI.renderGallerySkeleton(this.state.scenes);

            const BATCH_SIZE = 10;
            
            for (let i = 0; i < this.state.scenes.length; i += BATCH_SIZE) {
                const batch = this.state.scenes.slice(i, i + BATCH_SIZE);
                const currentBatchEnd = Math.min(i + BATCH_SIZE, this.state.scenes.length);
                
                SbAdvUI.updateLoading(
                    "PHASE III: VISUAL RENDERING", 
                    `Synthesizing frames ${i + 1} to ${currentBatchEnd} (of ${this.state.scenes.length})...`
                );
                
                // Renderizar la tanda actual en paralelo
                await Promise.all(batch.map(async (scene, indexInBatch) => {
                    const globalIndex = i + indexInBatch;
                    try {
                        const base64Image = await SbAdvRenderer.generateImage(scene.visual_prompt, this.state.format);
                        scene.image64 = base64Image;
                        SbAdvUI.updateSceneCard(globalIndex, scene);
                    } catch (err) {
                        console.error(`Error rendering image for frame ${globalIndex + 1}:`, err);
                    }
                }));
            }

            SbAdvUI.toggleLoading(false);

        } catch (error) {
            console.error(error);
            SbAdvUI.toggleLoading(false);
            alert("Sequence synthesis failed: " + error.message);
        }
    }
};

window.addEventListener('DOMContentLoaded', () => StoryboardAdv.init());