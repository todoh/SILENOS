// agent-scale-guide.js - SISTEMA DE ESCALA Y ARMONIZACIÓN (PIXELES A METROS) Y PLANOS DE ELEMENTOS
class AgentScaleGuide {
    constructor() {
        this.pxPerMeter = 64; // Estándar base por defecto: 64 píxeles = 1 metro
        
        // Guía de proporcionalidad por categoría (en metros)
        this.categoryScales = {
            npc: { minMeters: 1.5, maxMeters: 1.9, defaultMeters: 1.75, name: 'NPC / Personaje' },
            animal: { minMeters: 0.5, maxMeters: 2.2, defaultMeters: 1.0, name: 'Animal / Criatura' },
            mueble: { minMeters: 0.6, maxMeters: 2.0, defaultMeters: 1.2, name: 'Mueble / Utensilio' },
            artefacto: { minMeters: 0.4, maxMeters: 1.5, defaultMeters: 0.8, name: 'Artefacto / Objeto' },
            item: { minMeters: 0.3, maxMeters: 0.5, defaultMeters: 0.4, name: 'Ítem de Inventario' },
            planta: { minMeters: 0.8, maxMeters: 6.0, defaultMeters: 3.0, name: 'Planta / Árbol / Vegetación' },
            vehiculo: { minMeters: 2.5, maxMeters: 8.0, defaultMeters: 4.5, name: 'Vehículo / Transportes' },
            maquina: { minMeters: 1.5, maxMeters: 5.0, defaultMeters: 2.5, name: 'Maquinaria / Aparato' },
            decoracion: { minMeters: 0.5, maxMeters: 3.0, defaultMeters: 1.5, name: 'Decoración General' }
        };

        // Mapeo de planos espaciales visuales
        this.planeModes = {
            'plano_x': { billboardMode: 'cross_x', label: 'Plano en X (Proyección en X / Cross-X)' },
            'plano_fijo': { billboardMode: 'fixed', label: 'Plano Fijo 90°' },
            'suelo': { billboardMode: 'flat', label: 'Suelo / Pavimento' },
            'muro': { billboardMode: 'muro', label: 'Muro / Pared 3D' }
        };

        // Preajustes de mapas por tamaño en metros
        this.mapPresets = {
            pequeno: { metersW: 15, metersH: 10, label: 'Interior / Habitación (15m x 10m)' },
            mediano: { metersW: 30, metersH: 20, label: 'Zona Exterior / Plaza (30m x 20m)' },
            grande: { metersW: 60, metersH: 40, label: 'Pueblo / Bosque (60m x 40m)' },
            gigante: { metersW: 120, metersH: 80, label: 'Región Extensa (120m x 80m)' }
        };
    }

    // Configurar relación PX/Metro dinámicamente
    setPxPerMeter(val) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) {
            this.pxPerMeter = parsed;
        }
    }

    // Conversión de Metros a Píxeles
    metersToPx(meters) {
        return Math.round(meters * this.pxPerMeter);
    }

    // Conversión de Píxeles a Metros
    pxToMeters(px) {
        return Math.round((px / this.pxPerMeter) * 100) / 100;
    }

    // Obtener dimensiones recomendadas en PX para una categoría
    getCategoryDimensions(category, customMeters = null) {
        const cat = this.categoryScales[category] || this.categoryScales.decoracion;
        const meters = customMeters || cat.defaultMeters;
        const pxSize = this.metersToPx(meters);
        return {
            meters: meters,
            pxWidth: pxSize,
            pxHeight: pxSize,
            minPx: this.metersToPx(cat.minMeters),
            maxPx: this.metersToPx(cat.maxMeters)
        };
    }

    // Calcular dimensiones finales de mapa en PX según preajuste en metros
    getMapPixelDimensions(presetKey) {
        const preset = this.mapPresets[presetKey] || this.mapPresets.mediano;
        return {
            widthPx: this.metersToPx(preset.metersW),
            heightPx: this.metersToPx(preset.metersH),
            widthMeters: preset.metersW,
            heightMeters: preset.metersH
        };
    }

    // Normalizar la entrada textual del plano visual del elemento
    resolveBillboardMode(rawMode) {
        if (!rawMode) return 'fixed';
        const str = String(rawMode).toLowerCase().trim();
        if (str.includes('plano_x') || str.includes('plano x') || str.includes('cross')) {
            return 'cross_x';
        }
        if (str.includes('camera') || str.includes('cámara') || str.includes('camara')) {
            return 'camera';
        }
        if (str.includes('fijo') || str.includes('fixed') || str.includes('90')) {
            return 'fixed';
        }
        if (str.includes('suelo') || str.includes('flat') || str.includes('plano')) {
            return 'flat';
        }
        if (str.includes('muro') || str.includes('wall') || str.includes('pared')) {
            return 'muro';
        }
        return 'fixed';
    }

    // Prompt de sistema para instruir a Gemini sobre reglas de escala y plano
    getSystemPromptGuide() {
        return `REGLAS DE ESCALA, PLANOS Y ARMONIZACIÓN VISUAL (RELACIÓN: ${this.pxPerMeter} PÍXELES = 1 METRO):
1. Todos los elementos deben respetar estrictamente las dimensiones en píxeles según su tamaño real en metros:
   - Personajes / NPCs / Animales: ~1.5m a 1.8m (${this.metersToPx(1.5)}px a ${this.metersToPx(1.8)}px de alto).
   - Muebles / Utensilios / Artefactos: ~0.5m a 1.2m (${this.metersToPx(0.5)}px a ${this.metersToPx(1.2)}px).
   - Plantas / Árboles / Arbustos / Farolas / Postes: ~1.0m a 5.0m (${this.metersToPx(1.0)}px a ${this.metersToPx(5.0)}px).
   - Máquinas / Vehículos / Estructuras: ~2.5m a 8.0m (${this.metersToPx(2.5)}px a ${this.metersToPx(8.0)}px).
   - Ítems de inventario: Iconos fijos de 64x64px.
2. CONFIGURACIÓN DEL PLANO VISUAL (planeMode / billboardMode):
   - "plano_x": OBLIGATORIO para árboles, flores, plantas, farolas, postes y prácticamente cualquier objeto vertical, redondo, esférico, cilíndrico o similar, para darle más volumen con proyección en X (cross_x).
   - "plano_fijo": Para TODO LO DEMÁS (personajes, NPCs, muebles, objetos, estructuras, carteles) posicionado en ÁNGULO FIJO recto de 90° con respecto al suelo.
   - "suelo": Para alfombras, charcos, hierba baja, baldosas o senderos pegados al terreno.
   - "muro": Para paredes, cajas tridimensionales, columnas sólidas o bloques con volumen.
3. PROPORCIONES DE PERSONAJES Y NPCS:
   - Los personajes DEBEN tener proporciones anatómicas realistas y estilizadas (cuerpo humano estilizado de 7-8 cabezas de alto).
   - NUNCA usar estilo de videojuego chibi, chubi, cabezón ni proporciones infantiles/deformadas.`;
    }
}

const agentScaleGuide = new AgentScaleGuide();