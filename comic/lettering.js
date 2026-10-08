const SagaLettering = {
    /**
     * Procesa la colocación avanzada mediante IA Multimodal para una página específica.
     * Analiza zonas limpias, rostros y asigna posicionamiento y estilos expresivos a diálogos y FX.
     */
    async processPageLettering(pageNum) {
        const pageEl = document.getElementById(`render-page-${pageNum}`);
        if (!pageEl) {
            throw new Error(`No se encontró el elemento HTML de la página ${pageNum}. Asegúrate de haber renderizado la vista previa del cómic.`);
        }

        // 1. Captura de la página montada usando html2canvas
        const canvas = await html2canvas(pageEl, {
            scale: 1,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false
        });
        const base64Image = canvas.toDataURL('image/jpeg', 0.85);

        // 2. Extraer las viñetas y datos correspondientes a esta página
        const pagePanels = ComicPipeline.state.prompts.filter(p => p.pagina === pageNum);
        if (!pagePanels || pagePanels.length === 0) {
            throw new Error(`No hay datos de viñetas cargados para la página ${pageNum}.`);
        }

        const dialogsData = pagePanels.map(p => ({
            vineta: p.vineta,
            cartucho: p.cartucho || "",
            dialogo: p.dialogo || "",
            onomatopeya: p.onomatopeya || ""
        }));

        // 3. Prompt multimodal de análisis de visión y lettering
        const prompt = `Eres un Máster Letterer y Maquetador Profesional de Cómics y Manga.
Analiza la imagen adjunta correspondiente a la PÁGINA ${pageNum} del cómic.

Lista de textos por viñeta:
${JSON.stringify(dialogsData, null, 2)}

INSTRUCCIONES DE DETECCIÓN Y UBICACIÓN INTELIGENTE (LETTERING-AWARE):
1. **REGLA INVIOLABLE**: QUEDA PROHIBIDO TAPAR ROSTROS, EXPRESIONES FACIALES, OJOS O ELEMENTOS CLAVE DE ACCIÓN.
2. **DETECCIÓN DE ESPACIOS NEUTROS**: Localiza áreas sin detalles importantes (cielos, paredes, sombras suaves).
3. **DIÁLOGOS (BOCADILLOS)**:
   - Colócalos sobre espacios neutros detectados.
   - Ajusta "dialogo_style" con propiedades CSS válidas (ej: "top: 10%; left: 15%; max-width: 45%; font-size: 0.85rem;").
   - Identifica la boca o cabeza del personaje hablante ("boca_x" y "boca_y" de 0 a 100) y ajusta "tail_position" ("bottom-left", "bottom-right", "top-left", "top-right").
4. **CARTUCHOS NARRATIVOS**:
   - Ubícalos preferentemente en la esquina superior izquierda o inferior derecha ("top: 6px; left: 6px; max-width: 70%;").
5. **ONOMATOPEYAS (FX)**:
   - Si existe una onomatopeya, colócala cerca del punto de impacto/acción con un estilo llamativo ("top: 40%; left: 35%; font-size: 1.4rem; color: #dc2626; transform: rotate(-8deg);").

Responde ÚNICAMENTE con un JSON puro con esta estructura:
{
  "vinetas": [
    {
      "vineta": 1,
      "cartucho_style": "top: 8px; left: 8px; max-width: 75%;",
      "dialogo_style": "top: 12%; left: 50%; max-width: 40%; font-size: 0.85rem;",
      "fx_style": "top: 45%; left: 30%; font-size: 1.5rem; color: #e11d48;",
      "boca_x": 35,
      "boca_y": 55,
      "tail_position": "bottom-left"
    }
  ]
}`;

        // 4. Llamada multimodal a Gemini (Imagen + Texto)
        const resultText = await SagaGemini.generateMultimodal(prompt, base64Image, "image/jpeg");
        let parsedResult;
        try {
            parsedResult = JSON.parse(SagaGemini.cleanJson(resultText));
        } catch (e) {
            throw new Error("Respuesta JSON inválida devuelta por Gemini al calcular el lettering: " + resultText);
        }

        // 5. Guardar estilos y coordenadas en el estado del pipeline
        if (parsedResult && Array.isArray(parsedResult.vinetas)) {
            parsedResult.vinetas.forEach(v => {
                const targetPanel = ComicPipeline.state.prompts.find(p => p.pagina === pageNum && p.vineta === v.vineta);
                if (targetPanel) {
                    targetPanel.cartuchoStyle = v.cartucho_style || "";
                    targetPanel.dialogoStyle = v.dialogo_style || "";
                    targetPanel.fxStyle = v.fx_style || "";
                    targetPanel.bocaX = v.boca_x ?? null;
                    targetPanel.bocaY = v.boca_y ?? null;
                    targetPanel.tailPosition = v.tail_position || "bottom-left";
                }
            });
            await ComicPipeline.autoSave();
        }

        return parsedResult;
    },

    async processAllPagesLettering(progressCallback) {
        if (!ComicPipeline.state.prompts || ComicPipeline.state.prompts.length === 0) {
            alert("Primero debes generar la estructura y las viñetas del cómic.");
            return;
        }

        const pages = [...new Set(ComicPipeline.state.prompts.map(p => p.pagina))]
            .filter(pg => pg > 0)
            .sort((a, b) => a - b);

        for (let i = 0; i < pages.length; i++) {
            const pageNum = pages[i];
            if (progressCallback) progressCallback(pageNum, i + 1, pages.length);
            try {
                await this.processPageLettering(pageNum);
            } catch (err) {
                console.error(`Error procesando Lettering en página ${pageNum}:`, err);
            }
        }
        ComicPipeline.renderFinalComic();
    }
};

window.SagaLettering = SagaLettering;