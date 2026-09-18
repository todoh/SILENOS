// element-script-runtime.js - MOTOR DE EJECUCIÓN Y PERSISTENCIA DIRECTA Y PROACTIVA DE SCRIPTS EN EDITOR
class ElementScriptRuntime {
    constructor() {
        this.compiledScripts = new Map();
        this.lastFrameTime = performance.now();
        this.animFrameId = null;
        this.initDirectListeners();
        this.startEditorLoop();
    }
    initDirectListeners() {
        const handleScriptInput = (e) => {
            const target = e.target;
            if (!target || target.tagName !== 'TEXTAREA') return;
                        
            const elem = this.getActiveTargetElement();
            if (!elem) return;
            const type = this.resolveScriptType(target);
            if (!type) return;
            const val = target.value;
            if (!elem.customScript) {
                elem.customScript = { init: '', update: '', interact: '', destroy: '' };
            }
            elem.customScript[type] = val;
                        
            if (type === 'init') elem.scriptInit = val;
            if (type === 'update') elem.scriptUpdate = val;
            if (type === 'interact') elem.scriptInteract = val;
            if (type === 'destroy') elem.scriptDestroy = val;
            if (elem.id) {
                this.compileElementScripts(elem);
            }
            if (typeof autoSaveJSON === 'function') {
                autoSaveJSON();
            }
        };
        document.addEventListener('input', handleScriptInput, true);
        document.addEventListener('change', handleScriptInput, true);
        document.addEventListener('keyup', handleScriptInput, true);
        document.addEventListener('paste', handleScriptInput, true);
        const initObserver = () => {
            const panel = document.getElementById('properties-panel') || document.body;
            if (!panel) return;
            const observer = new MutationObserver(() => {
                this.syncTextareasWithMemory();
            });
            observer.observe(panel, { childList: true, subtree: true });
            this.syncTextareasWithMemory();
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initObserver);
        } else {
            initObserver();
        }
        if (typeof window.updatePropertiesPanel === 'function' && !window.updatePropertiesPanel._scriptPatched) {
            const origUpdateProps = window.updatePropertiesPanel;
            window.updatePropertiesPanel = (...args) => {
                const res = origUpdateProps.apply(this, args);
                setTimeout(() => this.syncTextareasWithMemory(), 0);
                return res;
            };
            window.updatePropertiesPanel._scriptPatched = true;
        }
        // Recompilar todos los scripts al hacer clic en "Jugar"
        document.addEventListener('click', (e) => {
            const btnPlay = e.target.closest('#btn-mode-play');
            if (btnPlay) {
                this.compileAllSceneScripts();
            }
        });
    }
    startEditorLoop() {
        const loop = (now) => {
            const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
            this.lastFrameTime = now;
            if (typeof isPlayMode !== 'undefined' && isPlayMode && typeof projectData !== 'undefined' && projectData.scenes) {
                const currentScene = projectData.scenes[currentSceneId];
                if (currentScene && currentScene.elements) {
                    currentScene.elements.forEach(elem => {
                        this.runUpdate(elem, dt);
                    });
                }
            }
            this.animFrameId = requestAnimationFrame(loop);
        };
        this.lastFrameTime = performance.now();
        this.animFrameId = requestAnimationFrame(loop);
    }
    getActiveTargetElement() {
        if (typeof projectData === 'undefined') return null;
        if (typeof currentSceneId !== 'undefined' && typeof selectedElementId !== 'undefined' && selectedElementId) {
            const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
            if (scene && scene.elements) {
                const found = scene.elements.find(e => e.id === selectedElementId);
                if (found) return found;
            }
        }
        if (typeof selectedSavedElementKey !== 'undefined' && selectedSavedElementKey) {
            if (projectData.savedElementsConfig && projectData.savedElementsConfig[selectedSavedElementKey]) {
                return projectData.savedElementsConfig[selectedSavedElementKey];
            }
        }
        return null;
    }
    resolveScriptType(textarea) {
        if (!textarea) return null;
        if (textarea.dataset && textarea.dataset.scriptType) {
            return textarea.dataset.scriptType;
        }
        const id = (textarea.id || '').toLowerCase();
        const name = (textarea.name || '').toLowerCase();
        const placeholder = (textarea.placeholder || '').toLowerCase();
        const parentText = (textarea.parentElement ? textarea.parentElement.textContent : '').toLowerCase();
        if (id.includes('dialog') || name.includes('dialog') || id === 'prop-dialog') {
            return null;
        }
        let resolved = null;
        if (id.includes('init') || name.includes('init') || placeholder.includes('init') || placeholder.includes('cargar') || parentText.includes('init')) {
            resolved = 'init';
        } else if (id.includes('update') || name.includes('update') || placeholder.includes('update') || placeholder.includes('frame') || parentText.includes('update')) {
            resolved = 'update';
        } else if (id.includes('interact') || id.includes('click') || name.includes('interact') || placeholder.includes('interact') || placeholder.includes('clic') || parentText.includes('interact')) {
            resolved = 'interact';
        } else if (id.includes('destroy') || name.includes('destroy') || placeholder.includes('destroy') || placeholder.includes('destruir') || parentText.includes('destroy')) {
            resolved = 'destroy';
        }
        if (resolved) {
            textarea.dataset.scriptType = resolved;
        }
        return resolved;
    }
    syncTextareasWithMemory() {
        const elem = this.getActiveTargetElement();
        if (!elem) return;
        if (!elem.customScript) {
            elem.customScript = {
                init: elem.scriptInit || '',
                update: elem.scriptUpdate || '',
                interact: elem.scriptInteract || '',
                destroy: elem.scriptDestroy || ''
            };
        } else {
            if (elem.scriptInit !== undefined && !elem.customScript.init) elem.customScript.init = elem.scriptInit;
            if (elem.scriptUpdate !== undefined && !elem.customScript.update) elem.customScript.update = elem.scriptUpdate;
            if (elem.scriptInteract !== undefined && !elem.customScript.interact) elem.customScript.interact = elem.scriptInteract;
            if (elem.scriptDestroy !== undefined && !elem.customScript.destroy) elem.customScript.destroy = elem.scriptDestroy;
            elem.scriptInit = elem.customScript.init || '';
            elem.scriptUpdate = elem.customScript.update || '';
            elem.scriptInteract = elem.customScript.interact || '';
            elem.scriptDestroy = elem.customScript.destroy || '';
        }
        const container = document.getElementById('properties-panel') || document.body;
        const textareas = Array.from(container.querySelectorAll('textarea'));
        textareas.forEach(textarea => {
            const type = this.resolveScriptType(textarea);
            if (!type) return;
            if (document.activeElement !== textarea) {
                const val = elem.customScript[type] || '';
                if (textarea.value !== val) {
                    textarea.value = val;
                }
            }
            this.ensureSaveButton(textarea, type);
        });
    }
    ensureSaveButton(textarea, type) {
        if (!textarea || !textarea.parentNode) return;
        let btn = textarea.parentNode.querySelector(`.btn-save-script[data-script-type="${type}"]`);
        if (!btn) {
            btn = document.createElement('button');
            btn.className = 'btn btn-save-script';
            btn.dataset.scriptType = type;
            btn.textContent = '💾 Guardar Script';
            btn.style.cssText = 'font-size: 9.5px; padding: 4px 10px; margin-top: 4px; background: #0071e3; color: white; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; transition: all 0.2s ease;';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const elem = this.getActiveTargetElement();
                if (!elem) return;
                const val = textarea.value;
                if (!elem.customScript) {
                    elem.customScript = { init: '', update: '', interact: '', destroy: '' };
                }
                elem.customScript[type] = val;
                if (type === 'init') elem.scriptInit = val;
                if (type === 'update') elem.scriptUpdate = val;
                if (type === 'interact') elem.scriptInteract = val;
                if (type === 'destroy') elem.scriptDestroy = val;
                if (elem.id) {
                    this.compileElementScripts(elem);
                }
                if (typeof autoSaveJSON === 'function') {
                    autoSaveJSON();
                }
                const origText = btn.textContent;
                const origBg = btn.style.background;
                btn.textContent = '✓ Script Guardado';
                btn.style.background = '#34c759';
                setTimeout(() => {
                    btn.textContent = origText;
                    btn.style.background = origBg;
                }, 1200);
            });
            if (textarea.nextSibling) {
                textarea.parentNode.insertBefore(btn, textarea.nextSibling);
            } else {
                textarea.parentNode.appendChild(btn);
            }
        }
    }
    createSandboxEvaluator(codeString, parameterNames = ['self', 'scene', 'variables', 'input', 'audio', 'interface', 'dt']) {
        if (!codeString || !codeString.trim()) return null;
        try {
            return new Function(...parameterNames, codeString);
        } catch (e) {
            console.error("[ScriptSyntaxError] Error de sintaxis en el script del elemento:", e);
            return null;
        }
    }
    compileElementScripts(elem) {
        if (!elem) return;
        if (!elem.state || typeof elem.state !== 'object') elem.state = {};
        const scriptData = elem.customScript || {
            init: elem.scriptInit || '',
            update: elem.scriptUpdate || '',
            interact: elem.scriptInteract || '',
            destroy: elem.scriptDestroy || ''
        };
        elem.customScript = {
            init: scriptData.init || '',
            update: scriptData.update || '',
            interact: scriptData.interact || '',
            destroy: scriptData.destroy || ''
        };
        elem.scriptInit = elem.customScript.init;
        elem.scriptUpdate = elem.customScript.update;
        elem.scriptInteract = elem.customScript.interact;
        elem.scriptDestroy = elem.customScript.destroy;
        this.compiledScripts.set(elem.id, {
            onInit: elem.customScript.init ? this.createSandboxEvaluator(elem.customScript.init) : null,
            onUpdate: elem.customScript.update ? this.createSandboxEvaluator(elem.customScript.update, ['self', 'scene', 'variables', 'input', 'audio', 'interface', 'dt']) : null,
            onInteract: elem.customScript.interact ? this.createSandboxEvaluator(elem.customScript.interact, ['self', 'scene', 'variables', 'input', 'audio', 'interface', 'player']) : null,
            onDestroy: elem.customScript.destroy ? this.createSandboxEvaluator(elem.customScript.destroy) : null,
            initialized: false
        });
    }
    compileAllSceneScripts() {
        if (typeof projectData === 'undefined' || !projectData.scenes) return;
        Object.values(projectData.scenes).forEach(sc => {
            if (sc.elements) {
                sc.elements.forEach(elem => {
                    this.compileElementScripts(elem);
                });
            }
        });
    }
    buildContext(elem) {
        const currentScene = (typeof projectData !== 'undefined' && projectData.scenes) ? projectData.scenes[currentSceneId] : null;
        const selfObj = {
            get id() { return elem.id; },
            get x() { return elem.x; }, set x(v) { elem.x = Number(v) || 0; },
            get y() { return elem.y; }, set y(v) { elem.y = Number(v) || 0; },
            get width() { return elem.width; }, set width(v) { elem.width = Number(v) || 1; },
            get height() { return elem.height; }, set height(v) { elem.height = Number(v) || 1; },
            get rotation() { return elem.rotation || 0; }, set rotation(v) { elem.rotation = Number(v) || 0; },
            get opacity() { return elem.opacity !== undefined ? elem.opacity : 1; }, set opacity(v) { elem.opacity = Math.max(0, Math.min(1, Number(v))); },
            get state() { return elem.state; },
            setPosition: (x, y) => { elem.x = Number(x); elem.y = Number(y); },
            setSize: (w, h) => { elem.width = Number(w); elem.height = Number(h); }
        };
        const sceneAPI = {
            id: typeof currentSceneId !== 'undefined' ? currentSceneId : '',
            getElement: (id) => {
                const found = currentScene?.elements?.find(e => e.id === id);
                return found ? this.buildContext(found).self : null;
            }
        };
        const variablesAPI = {
            get: (key) => (typeof gameState !== 'undefined' && gameState.variables) ? gameState.variables[key] : undefined,
            set: (key, val) => {
                if (typeof gameState !== 'undefined') {
                    if (!gameState.variables) gameState.variables = {};
                    gameState.variables[key] = val;
                }
            }
        };
        const interfaceAPI = {
            showDialog: (text) => {
                const box = document.getElementById('dialog-box');
                const txt = document.getElementById('dialog-text');
                if (box && txt) {
                    txt.textContent = text;
                    box.style.display = 'block';
                }
            },
            hideDialog: () => {
                const box = document.getElementById('dialog-box');
                if (box) box.style.display = 'none';
            },
            toggleDialog: (text) => {
                const box = document.getElementById('dialog-box');
                const txt = document.getElementById('dialog-text');
                if (box && txt) {
                    if (box.style.display === 'block' && txt.textContent === text) {
                        box.style.display = 'none';
                    } else {
                        txt.textContent = text;
                        box.style.display = 'block';
                    }
                }
            }
        };
        return { self: selfObj, scene: sceneAPI, variables: variablesAPI, input: {}, audio: {}, interface: interfaceAPI };
    }
    runInit(elem) {
        if (!this.compiledScripts.has(elem.id)) this.compileElementScripts(elem);
        const compiled = this.compiledScripts.get(elem.id);
        if (compiled && compiled.onInit && !compiled.initialized) {
            try {
                const ctx = this.buildContext(elem);
                compiled.onInit(ctx.self, ctx.scene, ctx.variables, ctx.input, ctx.audio, ctx.interface);
            } catch (e) { console.error("[ScriptRuntimeInitError]", e); }
            compiled.initialized = true;
        }
    }
    runUpdate(elem, dt) {
        if (!this.compiledScripts.has(elem.id)) this.compileElementScripts(elem);
        const compiled = this.compiledScripts.get(elem.id);
        if (!compiled) return;
        if (!compiled.initialized && compiled.onInit) this.runInit(elem);
        if (compiled.onUpdate) {
            try {
                const ctx = this.buildContext(elem);
                compiled.onUpdate(ctx.self, ctx.scene, ctx.variables, ctx.input, ctx.audio, ctx.interface, dt);
                                
                // FORZAR LA SINCRONIZACIÓN VISUAL EN EL DOM CADA FRAME TRAS EL UPDATE DEL SCRIPT
                if (typeof movementEngine !== 'undefined' && movementEngine.syncElementDOM) {
                    movementEngine.syncElementDOM(elem);
                }
            } catch (e) { console.error("[ScriptRuntimeUpdateError]", e); }
        }
    }
    runInteract(elem, player) {
        if (!this.compiledScripts.has(elem.id)) this.compileElementScripts(elem);
        const compiled = this.compiledScripts.get(elem.id);
        if (compiled && compiled.onInteract) {
            try {
                const ctx = this.buildContext(elem);
                compiled.onInteract(ctx.self, ctx.scene, ctx.variables, ctx.input, ctx.audio, ctx.interface, player);
            } catch (e) { console.error("[ScriptRuntimeInteractError]", e); }
        }
    }
    runDestroy(elem) {
        if (!this.compiledScripts.has(elem.id)) return;
        const compiled = this.compiledScripts.get(elem.id);
        if (compiled && compiled.onDestroy) {
            try {
                const ctx = this.buildContext(elem);
                compiled.onDestroy(ctx.self, ctx.scene, ctx.variables, ctx.input, ctx.audio, ctx.interface);
            } catch (e) { console.error("[ScriptRuntimeDestroyError]", e); }
        }
        this.compiledScripts.delete(elem.id);
    }
}
const elementScriptRuntime = new ElementScriptRuntime();
function bindScriptPropertiesListeners() {
    if (typeof elementScriptRuntime !== 'undefined' && elementScriptRuntime.syncTextareasWithMemory) {
        elementScriptRuntime.syncTextareasWithMemory();
    }
}