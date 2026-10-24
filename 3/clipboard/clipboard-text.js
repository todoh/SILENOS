/* SILENOS 3/clipboard/clipboard-text.js */

const TextPasteHandler = {
    // [NUEVO] Capacidad de manejar texto directo
    // Devuelve true siempre, actuando como "red de seguridad" para cualquier texto
    canHandleText(text) {
        return true; 
    },

    // Lógica unificada para crear la nota desde texto o importar si es JSON
    async handleText(text, destParentId, mouseX = null, mouseY = null) {
        if (!text) return false;
        
        // --- 1. ANÁLISIS INTELIGENTE: ¿ES CÓDIGO/JSON DE SISTEMA? ---
        // Si el texto es realmente un archivo serializado (backup, ejecutable, etc.),
        // lo importamos como tal en vez de meterlo en una nota.
        if (typeof ImportCore !== 'undefined') {
            try {
                // Usamos el extractor inteligente del núcleo para buscar JSON entre basura/markdown
                let jsonData = null;
                
                // A. Intento Rápido
                const clean = text.trim();
                if ((clean.startsWith('{') || clean.startsWith('[')) && (clean.endsWith('}') || clean.endsWith(']'))) {
                    try { jsonData = JSON.parse(clean); } catch(e) {}
                }

                // B. Intento Profundo (si falla el rápido o hay texto alrededor)
                if (!jsonData && ImportCore._smartJsonExtract) {
                    jsonData = ImportCore._smartJsonExtract(text);
                }

                // C. Verificación de Integridad (¿Es algo de Silenos?)
                if (jsonData) {
                    const items = Array.isArray(jsonData) ? jsonData : [jsonData];
                    const isSystemItem = items.some(i => i && typeof i === 'object' && (i.type || i.id));

                    if (isSystemItem) {
                        console.log("📝 TextPasteHandler: Detectado JSON de Sistema dentro del texto. Importando...");
                        
                        // Si tenemos coordenadas del mouse, intentamos aplicarlas al primer elemento
                        // (solo si es un objeto único y no tiene posición fija, para mejorar UX)
                        if (items.length === 1 && mouseX !== null && mouseY !== null) {
                            // Convertimos coordenadas de pantalla a mundo si es necesario
                            if (destParentId === 'desktop' && typeof ThreeDesktop !== 'undefined') {
                                const world = ThreeDesktop.screenToWorld(mouseX, mouseY);
                                items[0].x = world.x;
                                items[0].y = world.y;
                            } else {
                                // En ventanas 2D
                                items[0].x = mouseX;
                                items[0].y = mouseY;
                            }
                        }

                        await ImportCore.importToSystem(items);
                        return true; // ¡Éxito! Detenemos aquí para NO crear la nota.
                    }
                }
            } catch (err) {
                console.warn("TextPasteHandler: Error al intentar detectar JSON, procediendo como texto plano.", err);
            }
        }

        // --- 2. CREACIÓN ESTÁNDAR DE NOTA (NARRATIVA) ---
        // Si no era JSON o falló la detección, creamos la nota clásica.
        console.log("📝 TextPasteHandler: Creando nota estándar.");
        
        // Cálculo de coordenadas
        let finalX, finalY;
        if (mouseX !== null && mouseY !== null) {
            if (destParentId === 'desktop' && typeof ThreeDesktop !== 'undefined') {
                const world = ThreeDesktop.screenToWorld(mouseX, mouseY);
                finalX = world.x;
                finalY = world.y;
            } else {
                // Si es carpeta, usamos una posición relativa o la del mouse directa
                finalX = mouseX; 
                finalY = mouseY;
            }
        }

        // Verificamos que exista la función, por seguridad
        if (typeof FileSystem !== 'undefined' && FileSystem.createNarrative) {
            FileSystem.createNarrative("Nota de Portapapeles", destParentId, finalX, finalY);
            
            // Obtenemos el ítem recién creado (el último del array)
            const lastItem = FileSystem.data[FileSystem.data.length - 1];
            if (lastItem && lastItem.content) {
                lastItem.content.text = text;
                FileSystem.save();
                return true;
            }
        }
        return false;
    },

    // Compatibilidad con el sistema de items (legacy)
    async canHandle(item) {
        return item.kind === "string" && item.type.match(/^text\/plain/);
    },

    async handle(item, destParentId, mouseX, mouseY) {
        return new Promise(resolve => {
            item.getAsString(async (text) => {
                const result = await this.handleText(text, destParentId, mouseX, mouseY);
                resolve(result);
            });
        });
    }
};

// [IMPORTANTE] Registramos con prioridad 0 (Baja)
// Esto asegura que YouTube, JSON o Links (prioridad defecto 10) intenten procesarlo primero.
// PERO ahora TextPasteHandler es inteligente y capturará JSON si los otros fallan.
ClipboardProcessor.registerHandler(TextPasteHandler, 0);