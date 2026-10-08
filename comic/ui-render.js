// ui-render.js
Object.assign(window.ComicPipeline, {
    zoomLevel: 1.0,
    comicLayoutMode: 'pdf',
    currentHorizontalIndex: 0,
    boundHorizontalEvents: false,
    escapeAttr(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\r?\n/g, ' ');
    },
    escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },
    updateStepTag(stepNum, status) {
        const el = document.getElementById(`step-tag-${stepNum}`);
        if (el) el.className = `step-item ${status}`;
    },
    showModal(title, description, contentText) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-description').innerText = description;
        document.getElementById('modal-editor').value = contentText;
        document.getElementById('pipeline-modal').classList.remove('hidden');
        return new Promise((resolve) => {
            this.modalResolver = resolve;
        });
    },
    async closeModal(approved) {
        document.getElementById('pipeline-modal').classList.add('hidden');
        if (this.modalResolver) {
            const editedContent = document.getElementById('modal-editor').value;
            this.modalResolver(approved ? editedContent : null);
            this.modalResolver = null;
        }
        await this.autoSave();
    },
    renderIngredientsUI() {
        const container = document.getElementById('ingredients-container');
        if (!container) return;
        container.innerHTML = '';
        if (!this.state.ingredients) this.state.ingredients = [];
        let optionsHtml = '<option value="">(Asignar a...)</option>';
        if (this.state.bible) {
            const allElements = [
                ...(this.state.bible.personajes || []),
                ...(this.state.bible.props || []),
                ...(this.state.bible.vehiculos || []),
                ...(this.state.bible.entornos || [])
            ];
            allElements.forEach(e => {
                const name = e.nombre || e.objeto;
                if (name) {
                    optionsHtml += `<option value="${this.escapeAttr(name)}">${this.escapeHTML(name)}</option>`;
                }
            });
        }
        this.state.ingredients.forEach(ing => {
            const dropzone = document.createElement('div');
            dropzone.className = 'dropzone';
            dropzone.innerHTML = `
                <span style="font-size: 0.6rem; color: var(--text-dim); pointer-events: none;">Subir Imagen</span>
                <input type="file" accept="image/*" onchange="ComicPipeline.handleIngredientFile('${ing.id}', event)">
                <img src="${ing.base64 || ''}" style="display: ${ing.base64 ? 'block' : 'none'};">
                <button type="button" class="btn-remove" onclick="ComicPipeline.removeIngredientSlot('${ing.id}')">&times;</button>
                <select onchange="ComicPipeline.updateIngredientKey('${ing.id}', this.value)">
                    ${optionsHtml}
                </select>
            `;
            container.appendChild(dropzone);
            const select = dropzone.querySelector('select');
            if (select && ing.elementKey) select.value = ing.elementKey;
        });
    },
    addIngredientSlot() {
        if (!this.state.ingredients) this.state.ingredients = [];
        this.state.ingredients.push({
            id: Date.now() + "_" + Math.random().toString(36).substring(2, 7),
            elementKey: "",
            base64: ""
        });
        this.renderIngredientsUI();
        this.autoSave();
    },
    removeIngredientSlot(id) {
        this.state.ingredients = this.state.ingredients.filter(i => i.id !== id);
        this.renderIngredientsUI();
        this.autoSave();
    },
    handleIngredientFile(id, event) {
        const file = event.target.files[0];
        if (!file) return;
        const slot = this.state.ingredients.find(i => i.id === id);
        if (slot) {
            const reader = new FileReader();
            reader.onload = (e) => {
                slot.base64 = e.target.result;
                this.renderIngredientsUI();
                this.autoSave();
            };
            reader.readAsDataURL(file);
        }
    },
    updateIngredientKey(id, val) {
        const slot = this.state.ingredients.find(i => i.id === id);
        if (slot) {
            slot.elementKey = val;
            this.autoSave();
        }
    },
    getMatchedBibleElements(panelOrText) {
        const matched = [];
        if (!this.state.bible) return matched;
        let promptText = "";
        let elementsList = [];
        if (typeof panelOrText === 'string') {
            promptText = panelOrText;
        } else if (panelOrText && typeof panelOrText === 'object') {
            promptText = panelOrText.prompt || "";
            if (Array.isArray(panelOrText.elementos_presentes)) {
                elementsList = panelOrText.elementos_presentes;
            } else if (Array.isArray(panelOrText.elementos)) {
                elementsList = panelOrText.elementos;
            }
        }
        const textLower = promptText.toLowerCase();
        const allElements = [
            ...(this.state.bible.personajes || []),
            ...(this.state.bible.props || []),
            ...(this.state.bible.vehiculos || []),
            ...(this.state.bible.entornos || [])
        ];
        allElements.forEach(e => {
            const name = e.nombre || e.objeto;
            if (!name) return;
            const nameLower = name.toLowerCase();
            const anchor = e.anchor_en || "";
            const anchorLower = anchor.toLowerCase();
            const matchedExplicitly = elementsList.some(el => 
                el && (el.toLowerCase() === nameLower || nameLower.includes(el.toLowerCase()) || el.toLowerCase().includes(nameLower))
            );
            let matchedNameInPrompt = nameLower.length > 2 && textLower.includes(nameLower);
            if (!matchedNameInPrompt && nameLower.length > 3) {
                const nameWords = nameLower.split(/\s+/).filter(w => w.length > 3);
                if (nameWords.length > 0) {
                    const matchCount = nameWords.filter(w => textLower.includes(w)).length;
                    if (matchCount >= Math.min(2, nameWords.length)) {
                        matchedNameInPrompt = true;
                    }
                }
            }
            let matchedAnchorInPrompt = false;
            if (anchorLower) {
                if (textLower.includes(anchorLower)) {
                    matchedAnchorInPrompt = true;
                } else {
                    const anchorParts = anchorLower.split(',').map(s => s.trim()).filter(s => s.length > 5);
                    if (anchorParts.length > 0) {
                        const matchCount = anchorParts.filter(part => textLower.includes(part)).length;
                        if (matchCount >= 1) {
                            matchedAnchorInPrompt = true;
                        }
                    }
                }
            }
            if (matchedExplicitly || matchedNameInPrompt || matchedAnchorInPrompt) {
                if (!matched.some(m => m.name === name)) {
                    const ingSlot = (this.state.ingredients || []).find(i => i.elementKey === name);
                    matched.push({
                        name: name,
                        anchor: anchor,
                        base64: ingSlot ? ingSlot.base64 : null
                    });
                }
            }
        });
        return matched;
    },
    renderGenerationUI() {
        const previewArea = document.getElementById('comic-preview-area');
        if (!previewArea) return;
        const currentScale = this.state.imageScale || document.getElementById('comfy-image-scale')?.value || "1.0";
        previewArea.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h2 style="margin:0;">Paso 4: Selector de Renderizado ComfyUI</h2>
                    <p style="font-size:0.8rem; color:var(--text-dim); margin:4px 0 0 0;">Ajusta la resolución o edita los prompts antes de generar.</p>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.7); padding:4px 10px; border-radius:8px; border:1px solid var(--border-subtle);">
                        <label style="font-size:0.75rem; font-weight:700; color:var(--text-main);">Escala Imagen:</label>
                        <select id="comfy-image-scale-header" onchange="ComicPipeline.updateAllPanelDimensions(this.value)" style="font-size:0.75rem; padding:3px 6px; width:auto;">
                            <option value="2.0" ${currentScale === '2.0' ? 'selected' : ''}>x2 (Súper Res / 200%)</option>
                            <option value="1.0" ${currentScale === '1.0' ? 'selected' : ''}>x1 (Original HQ)</option>
                            <option value="0.5" ${currentScale === '0.5' ? 'selected' : ''}>x0.5 (Mitad / Prototipo)</option>
                            <option value="0.25" ${currentScale === '0.25' ? 'selected' : ''}>x0.25 (1/4 / Borrador)</option>
                        </select>
                    </div>
                    <button class="btn-secondary" onclick="ComicPipeline.selectAllForRender()">Marcar Todas</button>
                    <button class="btn-primary" onclick="ComicPipeline.generateSelected()">Generar Marcadas</button>
                    <button class="btn-primary" style="background:#10b981; border-color:#059669;" onclick="ComicPipeline.finishPipeline()">Ver Cómic Final</button>
                </div>
            </div>
            <div class="generation-grid" id="gen-grid-container"></div>
        `;
        const gridContainer = document.getElementById('gen-grid-container');
        if (!gridContainer || !this.state.prompts || !Array.isArray(this.state.prompts)) return;
        this.state.prompts.forEach((panel, index) => {
            const card = document.createElement('div');
            card.className = 'gen-card glass-panel';
            const pageNum = (panel.pagina !== undefined && panel.pagina !== null) ? panel.pagina : 1;
            const vinetaNum = (panel.vineta !== undefined && panel.vineta !== null) ? panel.vineta : (index + 1);
            const pageLabel = pageNum === 0 ? "PORTADA APARTE" : `Pág ${pageNum} - Viñeta ${vinetaNum}`;
            const safePrompt = this.escapeHTML(panel.prompt || '');
            const safeCartucho = this.escapeAttr(panel.cartucho || '');
            const safeDialogo = this.escapeAttr(panel.dialogo || '');
            const matchedElements = this.getMatchedBibleElements(panel);
            
            const scaleNum = parseFloat(currentScale) || 1.0;
            const origW = panel.originalWidth || Math.round(panel.width / scaleNum);
            const origH = panel.originalHeight || Math.round(panel.height / scaleNum);
            const spanNum = panel.grid_span || 12;

            let bibleBadgesHtml = '';
            if (matchedElements.length > 0) {
                bibleBadgesHtml = `
                    <div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                        <span style="font-size: 0.65rem; font-weight: 700; color: var(--text-dim);">Ingredientes Visuales:</span>
                        ${matchedElements.map(el => `
                            <div style="display: flex; align-items: center; gap: 4px; background: ${el.base64 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; border: 1px solid ${el.base64 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}; padding: 2px 6px; border-radius: 6px;">
                                ${el.base64 
                                    ? `<img src="${el.base64}" style="width: 18px; height: 18px; border-radius: 3px; object-fit: cover;">` 
                                    : `<span style="font-size: 0.65rem; color: #dc2626; font-weight:700;">⚠ Sin imagen</span>`}
                                <span style="font-size: 0.65rem; font-weight: 600; color: ${el.base64 ? '#047857' : '#b91c1c'};">${this.escapeHTML(el.name)}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                bibleBadgesHtml = `
                    <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 4px 8px; border-radius: 6px;">
                        <span style="font-size: 0.65rem; font-weight: 700; color: #b45309;">Viñeta sin ingredientes de la Biblia detectados</span>
                    </div>
                `;
            }
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <h4 style="margin:0; font-size:0.95rem; color: var(--text-color);">${pageLabel}</h4>
                    <span style="font-size:0.68rem; background: var(--accent-bg); color: var(--accent); padding: 4px 8px; border-radius:12px; font-weight:600; text-align:right;">
                        Span ${spanNum}/12 | Base: ${origW}x${origH}px &rarr; Escala x${currentScale}: ${panel.width}x${panel.height}px
                    </span>
                </div>
                ${bibleBadgesHtml}
                <label style="font-size:0.7rem; font-weight:700; color:var(--text-dim); margin-bottom:-6px; margin-top: 4px;">Prompt Visual (ComfyUI)</label>
                <textarea id="prompt-edit-${index}" style="height: 70px; font-size:0.75rem;" onchange="ComicPipeline.savePanelEdits(${index})">${safePrompt}</textarea>
                ${pageNum !== 0 ? `
                <div style="display:flex; gap:8px;">
                    <div style="flex:1;">
                        <label style="font-size:0.65rem; font-weight:700; color:#b45309;">Cartucho (Voz en Off)</label>
                        <input type="text" id="cartucho-edit-${index}" value="${safeCartucho}" style="font-size:0.75rem; padding:6px;" onchange="ComicPipeline.savePanelEdits(${index})">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.65rem; font-weight:700; color:#1d4ed8;">Diálogo (Bocadillo)</label>
                        <input type="text" id="dialogo-edit-${index}" value="${safeDialogo}" style="font-size:0.75rem; padding:6px;" onchange="ComicPipeline.savePanelEdits(${index})">
                    </div>
                </div>
                ` : ''}
                <div id="img-container-${index}" style="border-radius: 8px; overflow: hidden; position: relative; background: rgba(0,0,0,0.02); aspect-ratio: ${panel.width} / ${panel.height}; display: flex; align-items: center; justify-content: center;">
                    ${panel.imageUrl 
                        ? `<img src="${panel.imageUrl}" style="width:100%; height:100%; object-fit:cover;">` 
                        : `<div style="height:100%; min-height:160px; display:flex; align-items:center; justify-content:center; border: 1px dashed var(--border-solid); font-size:0.85rem; color:var(--text-dim); width:100%;">Sin imagen</div>`}
                </div>
                <div class="gen-controls">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem; color:var(--text-color); font-weight:500;">
                        <input type="checkbox" class="render-checkbox" data-index="${index}" ${!panel.imageUrl ? 'checked' : ''} style="width:16px; height:16px;">
                        Marcar
                    </label>
                    <button class="btn-secondary" style="padding: 6px 12px;" onclick="ComicPipeline.generateSingle(${index})">Generar</button>
                </div>
            `;
            gridContainer.appendChild(card);
        });
    },
    savePanelEdits(index) {
        if (!this.state.prompts || !this.state.prompts[index]) return;
        const panel = this.state.prompts[index];
        const promptEl = document.getElementById(`prompt-edit-${index}`);
        const cartuchoEl = document.getElementById(`cartucho-edit-${index}`);
        const dialogoEl = document.getElementById(`dialogo-edit-${index}`);
        if (promptEl) panel.prompt = promptEl.value;
        if (cartuchoEl) panel.cartucho = cartuchoEl.value;
        if (dialogoEl) panel.dialogo = dialogoEl.value;
        this.autoSave();
    },
    selectAllForRender() {
        document.querySelectorAll('.render-checkbox').forEach(cb => cb.checked = true);
    },
    async generateSingle(index) {
        this.savePanelEdits(index);
        if (!this.state.prompts || !this.state.prompts[index]) return;
        const panel = this.state.prompts[index];
        const imgContainer = document.getElementById(`img-container-${index}`);
        if (imgContainer) {
            imgContainer.innerHTML = `<div style="height:100%; min-height:160px; width:100%; display:flex; align-items:center; justify-content:center; border: 1px dashed var(--accent); font-size:0.9rem; color:var(--accent); font-weight:600; background:var(--accent-bg);">Pintando (${panel.width}x${panel.height})...</div>`;
        }
        const stepsEl = document.getElementById('comfy-steps');
        const steps = stepsEl ? parseInt(stepsEl.value, 10) : 4;
        try {
            const activeIngredients = [];
            const matchedElements = this.getMatchedBibleElements(panel);
            matchedElements.forEach(el => {
                if (el.base64) {
                    activeIngredients.push(el.base64);
                }
            });
            const blobUrl = await SagaComfy.renderPrompt(panel.prompt, panel.width, panel.height, steps, activeIngredients);
            panel.imageUrl = blobUrl;
            if (imgContainer) {
                imgContainer.innerHTML = `<img src="${blobUrl}" style="width:100%; height:100%; object-fit:cover;">`;
            }
            const checkbox = document.querySelector(`.render-checkbox[data-index="${index}"]`);
            if (checkbox) checkbox.checked = false;
            const imgName = panel.pagina === 0 ? "SAGA_Portada.png" : `SAGA_Pagina_${panel.pagina}_Vineta_${panel.vineta}.png`;
            await this.saveImageToFolder(imgName, blobUrl);
            await this.autoSave();
        } catch (err) {
            if (imgContainer) {
                imgContainer.innerHTML = `<div style="height:100%; min-height:160px; width:100%; display:flex; align-items:center; justify-content:center; background:#fee2e2; border: 1px dashed #ef4444; font-size:0.8rem; color:#b91c1c; text-align:center; padding:10px;">Error:<br>${err.message}</div>`;
            }
        }
    },
    async generateSelected() {
        const checkboxes = document.querySelectorAll('.render-checkbox:checked');
        for (const cb of checkboxes) {
            const index = parseInt(cb.getAttribute('data-index'), 10);
            await this.generateSingle(index);
        }
    },
    finishPipeline() {
        this.updateStepTag(4, 'completed');
        this.updateStepTag(5, 'active');
        this.renderFinalComic();
        this.updateStepTag(5, 'completed');
        this.autoSave();
    },
    async runAutoLetteringAll() {
        const btn = document.getElementById('btn-auto-lettering');
        const origText = btn ? btn.innerHTML : '';
        if (btn) { btn.innerText = "Analizando páginas con Gemini..."; btn.disabled = true; }
        try {
            await SagaLettering.processAllPagesLettering((pageNum, current, total) => {
                if (btn) btn.innerText = `Analizando Pág ${pageNum} (${current}/${total})...`;
            });
            alert("¡Colocación de diálogos e IA visual completada por Gemini!");
        } catch (e) {
            alert("Error durante la colocación de diálogos: " + e.message);
        } finally {
            if (btn) { btn.innerHTML = origText; btn.disabled = false; }
        }
    },
    async runAutoLetteringPage(pageNum) {
        const btn = document.getElementById(`btn-lettering-page-${pageNum}`);
        if (btn) { btn.innerText = "Analizando..."; btn.disabled = true; }
        try {
            await SagaLettering.processPageLettering(pageNum);
            this.renderFinalComic();
            alert(`¡Diálogos de la Página ${pageNum} reubicados por Gemini!`);
        } catch (e) {
            alert("Error al procesar la página: " + e.message);
        } finally {
            if (btn) { btn.innerText = "IA Auto-Colocar Textos"; btn.disabled = false; }
        }
    },
    async exportPagesToPNG() {
        const pages = document.querySelectorAll('.comic-page');
        if (pages.length === 0) return alert("No hay páginas para exportar.");
        const btn = document.getElementById('btn-export-png');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = "Exportando PNG HD...";
            btn.disabled = true;
        }
        const savedMode = this.comicLayoutMode;
        const savedZoom = this.zoomLevel;
        try {
            this.setComicLayoutMode('pdf');
            this.setZoom(0);
            await new Promise(r => setTimeout(r, 250));
            const targetPages = document.querySelectorAll('.comic-page');
            for (let i = 0; i < targetPages.length; i++) {
                const pageEl = targetPages[i];
                const isCover = pageEl.classList.contains('comic-cover-page');
                const isHorizontal = pageEl.classList.contains('format-horizontal');
                const targetWidth = isHorizontal ? 1100 : 850;
                const canvas = await html2canvas(pageEl, {
                    scale: 3, 
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    logging: false,
                    windowWidth: targetWidth + 100,
                    onclone: (clonedDoc) => {
                        const clonedPage = clonedDoc.getElementById(pageEl.id) || clonedDoc.querySelectorAll('.comic-page')[i];
                        if (clonedPage) {
                            clonedPage.style.width = `${targetWidth}px`;
                            clonedPage.style.maxWidth = 'none';
                            clonedPage.style.transform = 'none';
                            clonedPage.style.margin = '0 auto';
                            clonedPage.style.boxSizing = 'border-box';
                            const textNodes = clonedPage.querySelectorAll('.speech-bubble, .narrative-cartouche, .cover-title-overlay');
                            textNodes.forEach(el => {
                                el.style.webkitFontSmoothing = 'antialiased';
                                el.style.textRendering = 'optimizeLegibility';
                                el.style.wordBreak = 'break-word';
                                el.style.overflowWrap = 'break-word';
                                el.style.boxSizing = 'border-box';
                                el.style.lineHeight = '1.3';
                            });
                            const images = clonedPage.querySelectorAll('img');
                            images.forEach(img => {
                                img.style.maxWidth = '100%';
                                img.style.height = '100%';
                                img.style.objectFit = 'cover';
                            });
                        }
                    }
                });
                const filename = isCover ? `SAGA_Comic_00_Portada.png` : `SAGA_Comic_Pagina_${i}.png`;
                const dataUrl = canvas.toDataURL('image/png', 1.0);
                await this.saveImageToFolder(filename, dataUrl);
                const link = document.createElement('a');
                link.download = filename;
                link.href = dataUrl;
                link.click();
                await new Promise(r => setTimeout(r, 400));
            }
        } catch (err) {
            console.error("Error al exportar PNG:", err);
            alert("Hubo un error al exportar las imágenes: " + err.message);
        } finally {
            this.setComicLayoutMode(savedMode);
            if (savedZoom !== 1.0) {
                this.zoomLevel = savedZoom;
                const container = document.getElementById('pages-container');
                const badge = document.getElementById('zoom-percentage');
                if (container) container.style.transform = `scale(${this.zoomLevel})`;
                if (badge) badge.innerText = `${Math.round(this.zoomLevel * 100)}%`;
            }
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    },
    printComic() {
        window.print();
    },
    setZoom(change) {
        if (change === 0) {
            this.zoomLevel = 1.0;
        } else {
            this.zoomLevel = Math.max(0.3, Math.min(2.5, parseFloat((this.zoomLevel + change).toFixed(2))));
        }
        const container = document.getElementById('pages-container');
        const badge = document.getElementById('zoom-percentage');
        if (container) {
            container.style.transform = `scale(${this.zoomLevel})`;
        }
        if (badge) {
            badge.innerText = `${Math.round(this.zoomLevel * 100)}%`;
        }
    },
    setComicLayoutMode(mode) {
        this.comicLayoutMode = mode;
        const container = document.getElementById('pages-container');
        const navControls = document.getElementById('horizontal-nav-controls');
        document.getElementById('btn-layout-pdf')?.classList.toggle('active', mode === 'pdf');
        document.getElementById('btn-layout-horizontal')?.classList.toggle('active', mode === 'horizontal');
        document.getElementById('btn-layout-grid')?.classList.toggle('active', mode === 'grid');
        if (!container) return;
        container.className = '';
        container.classList.add(`view-layout-${mode}`);
        if (mode === 'horizontal') {
            if (navControls) navControls.style.display = 'flex';
            this.showHorizontalSlide(this.currentHorizontalIndex);
            this.setupHorizontalEvents();
        } else {
            if (navControls) navControls.style.display = 'none';
            const pageWrappers = container.querySelectorAll('.comic-page-wrapper');
            pageWrappers.forEach(w => w.style.display = '');
        }
    },
    showHorizontalSlide(index) {
        const pageWrappers = document.querySelectorAll('#pages-container .comic-page-wrapper');
        if (pageWrappers.length === 0) return;
        if (index < 0) index = 0;
        if (index >= pageWrappers.length) index = pageWrappers.length - 1;
        this.currentHorizontalIndex = index;
        pageWrappers.forEach((wrapper, i) => {
            if (i === index) {
                wrapper.classList.add('active-slide');
            } else {
                wrapper.classList.remove('active-slide');
            }
        });
        const label = document.getElementById('horizontal-page-indicator');
        if (label) {
            label.innerText = `Pág ${index + 1} / ${pageWrappers.length}`;
        }
    },
    navigateHorizontal(dir) {
        this.showHorizontalSlide(this.currentHorizontalIndex + dir);
    },
    setupHorizontalEvents() {
        if (this.boundHorizontalEvents) return;
        this.boundHorizontalEvents = true;
        window.addEventListener('keydown', (e) => {
            if (this.comicLayoutMode !== 'horizontal') return;
            if (e.key === 'ArrowLeft') {
                this.navigateHorizontal(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateHorizontal(1);
            }
        });
        const previewArea = document.getElementById('comic-preview-area');
        if (previewArea) {
            previewArea.addEventListener('wheel', (e) => {
                if (this.comicLayoutMode !== 'horizontal') return;
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                    if (e.deltaX > 20) this.navigateHorizontal(1);
                    else if (e.deltaX < -20) this.navigateHorizontal(-1);
                } else if (Math.abs(e.deltaY) > 20) {
                    if (e.deltaY > 0) this.navigateHorizontal(1);
                    else this.navigateHorizontal(-1);
                }
            }, { passive: true });
        }
    },
    renderFinalComic() {
        const previewArea = document.getElementById('comic-preview-area');
        if (!previewArea) return;
        previewArea.innerHTML = `
            <div class="viewer-toolbar">
                <div class="viewer-toolbar-group">
                    <span class="viewer-toolbar-title">Modo:</span>
                    <div class="view-mode-selector">
                        <button id="btn-layout-pdf" class="btn-toggle ${this.comicLayoutMode === 'pdf' ? 'active' : ''}" onclick="ComicPipeline.setComicLayoutMode('pdf')" title="Página tras página verticalmente">
                            PDF
                        </button>
                        <button id="btn-layout-horizontal" class="btn-toggle ${this.comicLayoutMode === 'horizontal' ? 'active' : ''}" onclick="ComicPipeline.setComicLayoutMode('horizontal')" title="Desplazamiento horizontal de izquierda a derecha">
                            Horizontal
                        </button>
                        <button id="btn-layout-grid" class="btn-toggle ${this.comicLayoutMode === 'grid' ? 'active' : ''}" onclick="ComicPipeline.setComicLayoutMode('grid')" title="Vista en cuadrícula / Galería">
                            Cuadrícula
                        </button>
                    </div>
                </div>
                <div id="horizontal-nav-controls" class="viewer-toolbar-group" style="display: ${this.comicLayoutMode === 'horizontal' ? 'flex' : 'none'};">
                    <button class="btn-secondary nav-arrow-btn" onclick="ComicPipeline.navigateHorizontal(-1)">&larr;</button>
                    <span id="horizontal-page-indicator" style="font-size:0.75rem; font-weight:700; color:var(--text-main); min-width:80px; text-align:center;">Pág 1 / 1</span>
                    <button class="btn-secondary nav-arrow-btn" onclick="ComicPipeline.navigateHorizontal(1)">&rarr;</button>
                </div>
                <div class="viewer-toolbar-group">
                    <span class="viewer-toolbar-title">Zoom:</span>
                    <button class="btn-secondary compact" onclick="ComicPipeline.setZoom(-0.1)" title="Alejar (Zoom Out)">-</button>
                    <span id="zoom-percentage" class="zoom-badge">${Math.round(this.zoomLevel * 100)}%</span>
                    <button class="btn-secondary compact" onclick="ComicPipeline.setZoom(0.1)" title="Acercar (Zoom In)">+</button>
                    <button class="btn-secondary compact" onclick="ComicPipeline.setZoom(0)" title="Restablecer Zoom">100%</button>
                </div>
                <div class="viewer-toolbar-group">
                    <button id="btn-export-png" class="btn-primary" style="padding: 6px 12px; font-size: 0.75rem;" onclick="ComicPipeline.exportPagesToPNG()">Exportar PNG</button>
                    <button id="btn-export-docx" class="btn-primary" style="padding: 6px 12px; font-size: 0.75rem; background: #2563eb; border-color: #1d4ed8;" onclick="ComicPipeline.exportComicToDocxA5()">DOCX A5 (KDP)</button>
                    <button id="btn-auto-lettering" class="btn-secondary" style="padding: 6px 12px; font-size: 0.75rem; border-color:#8b5cf6; color:#6d28d9;" onclick="ComicPipeline.runAutoLetteringAll()">IA Lettering</button>
                    <button class="btn-secondary compact" onclick="ComicPipeline.printComic()">PDF</button>
                    <button class="btn-secondary compact" onclick="ComicPipeline.renderGenerationUI()">Volver al Gestor</button>
                </div>
            </div>
            <div class="comic-viewport-wrapper">
                <div id="pages-container" class="view-layout-${this.comicLayoutMode}" style="transform: scale(${this.zoomLevel});"></div>
            </div>
        `;
        const pagesContainer = document.getElementById('pages-container');
        const pagesMap = {};
        if (!this.state.prompts || !Array.isArray(this.state.prompts)) return;
        this.state.prompts.forEach(item => {
            if (!pagesMap[item.pagina]) pagesMap[item.pagina] = [];
            pagesMap[item.pagina].push(item);
        });
        const formatEl = document.getElementById('comic-page-format');
        const pageFormat = formatEl ? formatEl.value : 'vertical';
        Object.keys(pagesMap).forEach(pageNumStr => {
            const pageNum = parseInt(pageNumStr, 10);
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'comic-page-wrapper';
            pageWrapper.style.marginBottom = "40px";
            const pageHeader = document.createElement('div');
            pageHeader.style.cssText = "display:flex; justify-content:center; align-items:center; gap:15px; margin-bottom:12px;";
            const pageTitle = document.createElement('h3');
            pageTitle.className = 'page-title';
            pageTitle.innerText = pageNum === 0 ? `PORTADA APARTE` : `PÁGINA ${pageNum}`;
            pageTitle.style.margin = '0';
            pageTitle.style.fontSize = '0.9rem';
            pageTitle.style.color = 'var(--text-color)';
            pageHeader.appendChild(pageTitle);
            if (pageNum > 0) {
                const pageBtn = document.createElement('button');
                pageBtn.id = `btn-lettering-page-${pageNum}`;
                pageBtn.className = 'btn-secondary';
                pageBtn.style.padding = '3px 8px';
                pageBtn.style.fontSize = '0.7rem';
                pageBtn.innerText = 'IA Auto-Colocar Textos';
                pageBtn.onclick = () => ComicPipeline.runAutoLetteringPage(pageNum);
                pageHeader.appendChild(pageBtn);
            }
            pageWrapper.appendChild(pageHeader);
            if (pageNum === 0) {
                const coverPanel = pagesMap[0][0];
                const coverPageDiv = document.createElement('div');
                coverPageDiv.className = `comic-page comic-cover-page format-${pageFormat}`;
                coverPageDiv.id = `render-page-0`;
                coverPageDiv.style.gridTemplateRows = '1fr';
                const box = document.createElement('div');
                box.className = `comic-cover-box col-span-12`;
                if (coverPanel && coverPanel.imageUrl) {
                    const img = document.createElement('img');
                    img.src = coverPanel.imageUrl;
                    img.crossOrigin = "anonymous";
                    box.appendChild(img);
                } else {
                    box.style.background = '#0f172a';
                    box.style.display = 'flex';
                    box.style.alignItems = 'center';
                    box.style.justifyContent = 'center';
                    box.innerHTML = '<span style="color:#94a3b8; font-size:0.9rem; font-weight:600;">Sin renderizar Portada</span>';
                }
                const titleOverlay = document.createElement('div');
                titleOverlay.className = 'cover-title-overlay';
                titleOverlay.innerText = this.state.comicCoverTitle || "SAGA COMIC";
                box.appendChild(titleOverlay);
                coverPageDiv.appendChild(box);
                pageWrapper.appendChild(coverPageDiv);
            } else {
                const pageDiv = document.createElement('div');
                pageDiv.className = `comic-page format-${pageFormat}`;
                pageDiv.id = `render-page-${pageNum}`;
                const layout = this.organizeAndBalancePagePanels(pagesMap[pageNum]);
                pageDiv.style.gridTemplateRows = `repeat(${layout.actualRows}, 1fr)`;
                layout.panels.forEach(panel => {
                    const box = document.createElement('div');
                    box.className = `comic-panel-box col-span-${panel.grid_span}`;
                    if (panel.imageUrl) {
                        const img = document.createElement('img');
                        img.src = panel.imageUrl;
                        img.crossOrigin = "anonymous";
                        box.appendChild(img);
                    } else {
                        box.style.background = '#e2e8f0';
                        box.style.display = 'flex';
                        box.style.alignItems = 'center';
                        box.style.justifyContent = 'center';
                        box.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem; font-weight:600;">Sin renderizar</span>';
                    }
                    if (panel.cartucho && panel.cartucho.trim() !== "") {
                        const cartouche = document.createElement('div');
                        cartouche.className = 'narrative-cartouche';
                        if (panel.cartuchoStyle) {
                            cartouche.style.cssText += ';' + panel.cartuchoStyle;
                        }
                        cartouche.innerText = panel.cartucho;
                        box.appendChild(cartouche);
                    }
                    if (panel.dialogo && panel.dialogo.trim() !== "") {
                        const bubble = document.createElement('div');
                        bubble.className = 'speech-bubble';
                        if (panel.tailPosition) {
                            bubble.setAttribute('data-tail', panel.tailPosition);
                        }
                        if (panel.dialogoStyle) {
                            bubble.style.cssText += ';' + panel.dialogoStyle;
                        }
                        bubble.innerText = panel.dialogo;
                        box.appendChild(bubble);
                    }
                    pageDiv.appendChild(box);
                });
                pageWrapper.appendChild(pageDiv);
            }
            pagesContainer.appendChild(pageWrapper);
        });
        if (this.comicLayoutMode === 'horizontal') {
            this.setComicLayoutMode('horizontal');
        }
    }
});