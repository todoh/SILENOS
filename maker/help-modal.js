// help-modal.js - MÓDULO DE AYUDA Y DOCUMENTACIÓN A PANTALLA COMPLETA CON 3 PESTAÑAS

(function () {
    // -------------------------------------------------------------------------
    // PLANO DE COMFYUI EMBEBIDO PARA DESCARGA DIRECTA
    // -------------------------------------------------------------------------
    const COMFY_WORKFLOW_DATA = {
        "id": "fd3f4ec3-d8ee-4d93-8f34-86fced7d0428",
        "revision": 0,
        "last_node_id": 12,
        "last_link_id": 11,
        "nodes": [
            {
                "id": 1,
                "type": "UnetLoaderGGUF",
                "pos": [100, 100],
                "size": [315, 104],
                "flags": {},
                "order": 0,
                "mode": 0,
                "inputs": [],
                "outputs": [{ "name": "MODEL", "type": "MODEL", "slot_index": 0, "links": [1] }],
                "properties": { "Node name for S&R": "UnetLoaderGGUF" },
                "widgets_values": ["flux-2-klein-4b-Q4_1.gguf"],
                "widgets_values_named": { "unet_name": "flux-2-klein-4b-Q4_1.gguf" }
            },
            {
                "id": 2,
                "type": "CLIPLoader",
                "pos": [100, 230],
                "size": [315, 144],
                "flags": {},
                "order": 1,
                "mode": 0,
                "inputs": [],
                "outputs": [{ "name": "CLIP", "type": "CLIP", "slot_index": 0, "links": [2, 3] }],
                "properties": { "Node name for S&R": "CLIPLoader" },
                "widgets_values": ["qwen_3_4b_fp8_mixed.safetensors", "sd3", "default"],
                "widgets_values_named": { "clip_name": "qwen_3_4b_fp8_mixed.safetensors", "type": "sd3", "device": "default" }
            },
            {
                "id": 3,
                "type": "VAELoader",
                "pos": [100, 390],
                "size": [315, 82],
                "flags": {},
                "order": 2,
                "mode": 0,
                "inputs": [],
                "outputs": [{ "name": "VAE", "type": "VAE", "slot_index": 0, "links": [4] }],
                "properties": { "Node name for S&R": "VAELoader" },
                "widgets_values": ["flux2-vae.safetensors"],
                "widgets_values_named": { "vae_name": "flux2-vae.safetensors" }
            },
            {
                "id": 4,
                "type": "CLIPTextEncode",
                "pos": [460, 100],
                "size": [400, 200],
                "flags": {},
                "order": 4,
                "mode": 0,
                "inputs": [{ "name": "clip", "type": "CLIP", "link": 2 }],
                "outputs": [{ "name": "CONDITIONING", "type": "CONDITIONING", "slot_index": 0, "links": [5] }],
                "properties": { "Node name for S&R": "CLIPTextEncode" },
                "widgets_values": ["a cinematic photo of a retro sci-fi studio room with glowing screens, detailed digital artwork, 8k resolution"],
                "widgets_values_named": { "text": "a cinematic photo of a retro sci-fi studio room with glowing screens, detailed digital artwork, 8k resolution" }
            },
            {
                "id": 5,
                "type": "CLIPTextEncode",
                "pos": [460, 340],
                "size": [400, 120],
                "flags": {},
                "order": 5,
                "mode": 0,
                "inputs": [{ "name": "clip", "type": "CLIP", "link": 3 }],
                "outputs": [{ "name": "CONDITIONING", "type": "CONDITIONING", "slot_index": 0, "links": [6] }],
                "properties": { "Node name for S&R": "CLIPTextEncode" },
                "widgets_values": [""],
                "widgets_values_named": { "text": "" }
            },
            {
                "id": 6,
                "type": "EmptySD3LatentImage",
                "pos": [460, 500],
                "size": [315, 144],
                "flags": {},
                "order": 3,
                "mode": 0,
                "inputs": [],
                "outputs": [{ "name": "LATENT", "type": "LATENT", "slot_index": 0, "links": [7] }],
                "properties": { "Node name for S&R": "EmptySD3LatentImage" },
                "widgets_values": [1024, 1024, 1],
                "widgets_values_named": { "width": 1024, "height": 1024, "batch_size": 1 }
            },
            {
                "id": 7,
                "type": "KSampler",
                "pos": [900, 100],
                "size": [315, 474],
                "flags": {},
                "order": 6,
                "mode": 0,
                "inputs": [
                    { "name": "model", "type": "MODEL", "link": 1 },
                    { "name": "positive", "type": "CONDITIONING", "link": 5 },
                    { "name": "negative", "type": "CONDITIONING", "link": 6 },
                    { "name": "latent_image", "type": "LATENT", "link": 7 }
                ],
                "outputs": [{ "name": "LATENT", "type": "LATENT", "slot_index": 0, "links": [8] }],
                "properties": { "Node name for S&R": "KSampler" },
                "widgets_values": [123456789, "fixed", 4, 1, "euler", "simple", 1],
                "widgets_values_named": { "seed": 123456789, "control_after_generate": "fixed", "steps": 4, "cfg": 1, "sampler_name": "euler", "scheduler": "simple", "denoise": 1 }
            },
            {
                "id": 8,
                "type": "VAEDecode",
                "pos": [1260, 100],
                "size": [225, 72],
                "flags": {},
                "order": 7,
                "mode": 0,
                "inputs": [
                    { "name": "samples", "type": "LATENT", "link": 8 },
                    { "name": "vae", "type": "VAE", "link": 4 }
                ],
                "outputs": [{ "name": "IMAGE", "type": "IMAGE", "slot_index": 0, "links": [9] }],
                "properties": { "Node name for S&R": "VAEDecode" }
            },
            {
                "id": 9,
                "type": "SaveImage",
                "pos": [1500, 100],
                "size": [310, 350],
                "flags": {},
                "order": 8,
                "mode": 0,
                "inputs": [{ "name": "images", "type": "IMAGE", "link": 9 }],
                "outputs": [{ "name": "images", "type": "IMAGE", "links": null }],
                "properties": { "Node name for S&R": "SaveImage" },
                "widgets_values": ["ComfyUI_FLUX_Klein"],
                "widgets_values_named": { "filename_prefix": "ComfyUI_FLUX_Klein" }
            }
        ],
        "links": [
            [1, 1, 0, 7, 0, "MODEL"],
            [2, 2, 0, 4, 0, "CLIP"],
            [3, 2, 0, 5, 0, "CLIP"],
            [4, 3, 0, 8, 1, "VAE"],
            [5, 4, 0, 7, 1, "CONDITIONING"],
            [6, 5, 0, 7, 2, "CONDITIONING"],
            [7, 6, 0, 7, 3, "LATENT"],
            [8, 7, 0, 8, 0, "LATENT"],
            [9, 8, 0, 9, 0, "IMAGE"]
        ],
        "groups": [],
        "config": {},
        "extra": {
            "ds": { "scale": 0.516836245783343, "offset": [799.9158444444448, 327.60285506944456] },
            "frontendVersion": "1.51.9",
            "VHS_latentpreview": false,
            "VHS_latentpreviewrate": 0,
            "VHS_MetadataImage": true,
            "VHS_KeepIntermediate": true
        },
        "version": 0.4
    };

    // -------------------------------------------------------------------------
    // INYECCIÓN DE ESTILOS CSS DEL MODAL DE AYUDA
    // -------------------------------------------------------------------------
    function injectHelpModalStyles() {
        if (document.getElementById('help-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'help-modal-styles';
        style.textContent = `
            #help-full-modal {
                position: fixed;
                inset: 0;
                z-index: 999999;
                background: #0d0e12;
                color: #f0f0f5;
                display: none;
                flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                overflow: hidden;
            }
            .help-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 28px;
                background: rgba(22, 24, 30, 0.95);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
            }
            .help-modal-title {
                font-size: 18px;
                font-weight: 700;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .help-nav-tabs {
                display: flex;
                gap: 8px;
                background: rgba(0, 0, 0, 0.4);
                padding: 4px;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .help-tab-btn {
                background: transparent;
                border: none;
                color: #a0a0b0;
                padding: 8px 18px;
                font-size: 13px;
                font-weight: 600;
                border-radius: 7px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .help-tab-btn:hover {
                color: #ffffff;
                background: rgba(255, 255, 255, 0.05);
            }
            .help-tab-btn.active {
                background: #0071e3;
                color: #ffffff;
                box-shadow: 0 4px 12px rgba(0, 113, 227, 0.35);
            }
            .help-close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: #ffffff;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            .help-close-btn:hover {
                background: #ff3b30;
            }
            .help-modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 32px 48px;
                max-width: 1200px;
                margin: 0 auto;
                width: 100%;
            }
            .help-tab-content {
                display: none;
                animation: helpFadeIn 0.25s ease-in-out;
            }
            .help-tab-content.active {
                display: block;
            }
            @keyframes helpFadeIn {
                from { opacity: 0; transform: translateY(6px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .help-section-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 14px;
                padding: 24px;
                margin-bottom: 24px;
            }
            .help-section-title {
                font-size: 20px;
                font-weight: 700;
                color: #389fff;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .help-sub-title {
                font-size: 15px;
                font-weight: 600;
                color: #ffffff;
                margin-top: 16px;
                margin-bottom: 8px;
            }
            .help-p {
                font-size: 13px;
                line-height: 1.7;
                color: #c0c0d0;
                margin-bottom: 12px;
            }
            .help-list {
                margin-left: 20px;
                margin-bottom: 16px;
            }
            .help-list li {
                font-size: 13px;
                line-height: 1.7;
                color: #d0d0e0;
                margin-bottom: 6px;
            }
            .help-btn-action {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #34c759;
                color: #ffffff;
                border: none;
                padding: 12px 22px;
                font-size: 14px;
                font-weight: 600;
                border-radius: 10px;
                cursor: pointer;
                text-decoration: none;
                transition: transform 0.15s, background 0.15s;
                margin-top: 10px;
                margin-right: 12px;
            }
            .help-btn-action:hover {
                transform: scale(1.02);
                background: #2ebd50;
            }
            .help-btn-blue {
                background: #0071e3;
            }
            .help-btn-blue:hover {
                background: #0062c4;
            }
            .help-code-block {
                background: #050508;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 12px 16px;
                font-family: monospace;
                font-size: 12px;
                color: #30d158;
                overflow-x: auto;
                margin: 10px 0;
            }
            .help-badge {
                background: rgba(0, 113, 227, 0.2);
                color: #389fff;
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }

    // -------------------------------------------------------------------------
    // CONSTRUCCIÓN DEL MODAL Y SUS CONTENIDOS
    // -------------------------------------------------------------------------
    function createHelpModalHTML() {
        let modal = document.getElementById('help-full-modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'help-full-modal';

        modal.innerHTML = `
            <div class="help-modal-header">
                <div class="help-modal-title">
                    <span>❓ Centro de Ayuda & Documentación</span>
                    <span class="help-badge">Silenos Maker v0.9</span>
                </div>
                <div class="help-nav-tabs">
                    <button class="help-tab-btn active" data-tab="help-tab-silenos">🎨 Silenos Maker</button>
                    <button class="help-tab-btn" data-tab="help-tab-comfy">⚡ ComfyUI Local</button>
                    <button class="help-tab-btn" data-tab="help-tab-gemini">✨ Gemini API</button>
                </div>
                <button class="help-close-btn" id="btn-close-help-modal" title="Cerrar Ayuda">&times;</button>
            </div>

            <div class="help-modal-body">
                <!-- ========================================================= -->
                <!-- PESTAÑA 1: SILENOS MAKER (EXPLICACIÓN EXTENSA DE SECCIONES) -->
                <!-- ========================================================= -->
                <div id="help-tab-silenos" class="help-tab-content active">
                    <div class="help-section-card">
                        <div class="help-section-title">🗺️ Visión General de Silenos Maker</div>
                        <p class="help-p">
                            Silenos Maker es un motor de desarrollo visual e interactivo diseñado para la creación de aventuras y videojuegos 2D y 2.5D (Mode 7).
                            Permite construir escenarios, definir físicas, programar lógica distribuida con variables y condiciones, integrar generación por IA y exportar el proyecto final como un ejecutable HTML autónomo.
                        </p>
                    </div>

                    <div class="help-section-card">
                        <div class="help-section-title">📂 Secciones del Menú Lateral</div>
                        
                        <div class="help-sub-title">1. Assets / Galería</div>
                        <p class="help-p">Gestión de recursos gráficos locales (imágenes PNG, JPG, WebP o código SVG). Permite registrar imágenes en memoria o vincular directamente el directorio local mediante la File System Access API.</p>

                        <div class="help-sub-title">2. Elementos Reutilizables Guardados</div>
                        <p class="help-p">Al copiar un objeto o entidad desde el escenario (Ctrl+C), puedes guardarlo en esta biblioteca con un nombre único. Preserva sus dimensiones, colisiones, diálogos y acciones para arrastrarlo y soltarlo (Drag & Drop) en cualquier zona.</p>

                        <div class="help-sub-title">3. Inventario / Ítems</div>
                        <p class="help-p">Configurador global de objetos coleccionables. Permite asignar identificadores únicos (IDs), nombres visibles e iconos asociados. Soporta acumulación en stacks y renderizado en tiempo de juego dentro de un baúl lateral interactivo.</p>

                        <div class="help-sub-title">4. Stats e Interfaz (UI)</div>
                        <p class="help-p">Ajustes visuales de la interfaz de usuario en tiempo de ejecución, controlando la visibilidad del botón de inventario, cajas de diálogo flotantes y barras de estado.</p>

                        <div class="help-sub-title">5. Generación de Assets con IA</div>
                        <p class="help-p">Módulo integrado con motores de Inteligencia Artificial para generar elementos gráficos sobre la marcha:</p>
                        <ul class="help-list">
                            <li><strong>ComfyUI (Local SD / Flux):</strong> Generación ultra-rápida y gratuita en tu GPU local.</li>
                            <li><strong>Gemini Image (Imagen 3 / Cloud):</strong> Generación fotorrealista e ilustraciones directamente en la nube de Google.</li>
                            <li><strong>Gemini SVG Vectorial:</strong> Creación directa de código vectorizado SVG autocontenido.</li>
                            <li><strong>Chroma Key & Suavizado:</strong> Algoritmo automático para eliminar fondos verdes, azules o blancos con tolerancia ajustable y suavizado de bordes (Feathering).</li>
                        </ul>

                        <div class="help-sub-title">6. Agente Creador ODS (Orquestador Secuencial)</div>
                        <p class="help-p">Agente inteligente autónomo que genera una aventura jugable completa a partir de una única premisa textual. Ejecuta un pipeline dividido en etapas con capacidad de pausar, reanudar (Resume/Retry) y guardar progreso:</p>
                        <ul class="help-list">
                            <li><strong>Etapa 1:</strong> Diseño del esqueleto general de la aventura y mapas.</li>
                            <li><strong>Etapa 2:</strong> Atomización de zonas, elementos interactivos, diálogos, puzles y variables.</li>
                            <li><strong>Etapa 3:</strong> Compilación de la estructura de juego y físicas.</li>
                            <li><strong>Etapa 4:</strong> Ilustración vectorizada batch de fondos, decoraciones, ítems y entidades en SVG.</li>
                        </ul>

                        <div class="help-sub-title">7. Lógica y Variables</div>
                        <p class="help-p">Creador de variables globales (Booleanas, Numéricas y Texto). Permite programar condicionales para que objetos del mapa aparezcan o desaparezcan dinámicamente según el estado del juego.</p>

                        <div class="help-sub-title">8. Entrada / Salida (IO)</div>
                        <p class="help-p">Exportación e importación de mapas completos en formato JSON. Incluye opciones para incrustar todas las imágenes en código Base64 para facilitar el intercambio de proyectos en un único archivo.</p>
                    </div>

                    <div class="help-section-card">
                        <div class="help-section-title">🎥 Modos de Vista: 2D Ortogonal vs 2.5D (Mode 7)</div>
                        <p class="help-p">Silenos Maker cuenta con dos motores de renderizado conmutables en tiempo real mediante el botón <strong>"Vista"</strong> de la barra superior:</p>
                        
                        <div class="help-sub-title">Modo 2D Ortogonal (Vista Cenital / Top-Down)</div>
                        <p class="help-p">Renderizado clásico bidimensional. La posición de los elementos sigue un ordenamiento en profundidad basado en su coordenada Y. Las colisiones se verifican mediante cajas AABB o selección de píxel opaco exacto.</p>

                        <div class="help-sub-title">Modo 2.5D Mode 7 (Perspectiva Tridimensional)</div>
                        <p class="help-p">Aplica una matriz de transformación CSS 3D (<code>rotateX</code>, <code>rotateZ</code>, <code>perspective</code>) sobre el mapa, imitando la clásica técnica Mode 7 de las consolas de 16 bits. Ofrece soporte para varios comportamientos visuales por objeto:</p>
                        <ul class="help-list">
                            <li><strong>Billboard (Cámara):</strong> Los sprites se mantienen erguidos a 90° girando siempre hacia la cámara.</li>
                            <li><strong>Cruz en X (Cross-X):</strong> Malla en cruz a 90° ideal para vegetación, árboles y farolas.</li>
                            <li><strong>Plano (Flat):</strong> Pegado directamente al suelo (charcos, alfombras, caminos).</li>
                            <li><strong>Muro 3D / Cubo Texturizado:</strong> Genera geometría cúbica tridimensional con caras sombreadas y profundidad real.</li>
                        </ul>
                    </div>

                    <div class="help-section-card">
                        <div class="help-section-title">🦴 Animación Esquelética, IK y Deformación 2D</div>
                        <p class="help-p">El motor integra un editor de esqueletos visual con las siguientes características avanzadas:</p>
                        <ul class="help-list">
                            <li><strong>Skinning Suave (Smooth Dual-Bone):</strong> Deformación de mallas regulares de triángulos mediante pesos de suavizado Gaussiano.</li>
                            <li><strong>Cinemática Inversa (2-Bone IK):</strong> Cálculo analítico para articular brazos y piernas con naturalidad.</li>
                            <li><strong>Físicas de Muelle (Spring Physics):</strong> Inercia y balanceo para colas, cabello o ropajes.</li>
                        </ul>
                    </div>

                    <div class="help-section-card">
                        <div class="help-section-title">🚀 Exportación a Juego Autoejecutable (.HTML)</div>
                        <p class="help-p">Al hacer clic en <strong>"Exportar Juego Autoejecutable (.html)"</strong>, el motor empaqueta absolutamente todo el proyecto (código fuente JS, motor de cámara, pathfinding A*, inventario, lógica de variables e imágenes en Base64) en un único archivo HTML autocontenido. El archivo resultante funciona inmediatamente en cualquier navegador moderno sin necesidad de instalar servidores web ni dependencias.</p>
                    </div>
                </div>

                <!-- ========================================================= -->
                <!-- PESTAÑA 2: COMFYUI LOCAL (DESCARGA DE PLANO Y CONFIGURACIÓN) -->
                <!-- ========================================================= -->
                <div id="help-tab-comfy" class="help-tab-content">
                    <div class="help-section-card">
                        <div class="help-section-title">⚡ ¿Qué es ComfyUI y por qué usarlo?</div>
                        <p class="help-p">
                            ComfyUI es una interfaz modular basada en nodos para ejecutar modelos de difusión (Stable Diffusion, FLUX, SDXL) de forma local en tu propia tarjeta gráfica.
                            Usar ComfyUI con Silenos Maker te permite generar cientos de assets e ilustraciones totalmente gratis, sin cuotas de la nube y con tiempos de generación ultra-rápidos.
                        </p>
                        <a href="https://comfy.org/" target="_blank" class="help-btn-action help-btn-blue">
                            🌐 Visitar la Web Oficial de ComfyUI (comfy.org)
                        </a>
                    </div>

                    <div class="help-section-card">
                        <div class="help-section-title">📄 Descargar el Plano / Workflow Optimizado</div>
                        <p class="help-p">
                            Hemos diseñado un plano de nodos (Workflow JSON) específico para ComfyUI que incluye carga optimizada mediante <strong>UnetGGUF FLUX Klein</strong> y codificación de texto ligera para integrarse con Silenos Maker a través de WebSocket en el puerto <code>http://127.0.0.1:8188</code>.
                        </p>
                        <button id="btn-download-comfy-json" class="help-btn-action">
                            ⬇️ Descargar Plano ComfyUI (plano confyui silenos maker.json)
                        </button>
                    </div>

                    <div class="help-section-card">
                        <div class="help-section-title">🛠️ Guía Paso a Paso para Configurar ComfyUI</div>
                        <ol class="help-list" style="margin-left: 20px;">
                            <li>Descarga e instala <strong>ComfyUI</strong> desde la web oficial <a href="https://comfy.org/" target="_blank" style="color: #389fff;">comfy.org</a>.</li>
                            <li>Ejecuta ComfyUI en tu ordenador. Por defecto se abrirá en tu navegador en <span class="help-badge">http://127.0.0.1:8188</span>.</li>
                            <li>Haz clic en el botón <strong>"Load"</strong> de ComfyUI o arrastra el archivo JSON que acabas de descargar dentro de la interfaz de ComfyUI.</li>
                            <li>Asegúrate de colocar los modelos correspondientes en las carpetas de ComfyUI:
                                <ul style="margin-top: 6px;">
                                    <li><code style="color: #30d158;">models/unet/flux-2-klein-4b-Q4_1.gguf</code></li>
                                    <li><code style="color: #30d158;">models/clip/qwen_3_4b_fp8_mixed.safetensors</code></li>
                                    <li><code style="color: #30d158;">models/vae/flux2-vae.safetensors</code></li>
                                </ul>
                            </li>
                            <li>En Silenos Maker, abre la pestaña <strong>"Generación"</strong>, selecciona el motor <strong>"ComfyUI (Local SD / Flux)"</strong>, verifica que la URL sea <code style="color: #30d158;">http://127.0.0.1:8188</code> y pulsa <strong>Generar Asset IA</strong>.</li>
                        </ol>
                    </div>
                </div>

                <!-- ========================================================= -->
                <!-- PESTAÑA 3: GEMINI API (CONFIGURACIÓN, APIKEY Y TIER GRATUITO) -->
                <!-- ========================================================= -->
                <div id="help-tab-gemini" class="help-tab-content">
                    <div class="help-section-card">
                        <div class="help-section-title">✨ Google Gemini API en Silenos Maker</div>
                        <p class="help-p">
                            Google Gemini es la suite de modelos de Inteligencia Artificial de última generación de Google. 
                            En Silenos Maker, la API Key de Gemini se utiliza para:
                        </p>
                        <ul class="help-list">
                            <li><strong>Agente Creador ODS:</strong> Diseñar la historia completa, mapa, zonas, lógica de puzles y variables.</li>
                            <li><strong>Generación SVG Vectorial:</strong> Producir imágenes vectoriales autocontenidas en código SVG para escenarios e ítems.</li>
                            <li><strong>Gemini Imagen 3:</strong> Generar imágenes rasterizadas en la nube a partir de texto.</li>
                            <li><strong>Traducción Automática:</strong> Traducir tus prompts del español al inglés para mejorar la precisión de generación.</li>
                        </ul>
                        <a href="https://aistudio.google.com/app/api-keys" target="_blank" class="help-btn-action help-btn-blue">
                            🔑 Obtener API Key en Google AI Studio (aistudio.google.com)
                        </a>
                    </div>

                    <div class="help-section-card">
                        <div class="help-section-title">🔑 ¿Cómo crear tu API Key Paso a Paso?</div>
                        <ol class="help-list" style="margin-left: 20px;">
                            <li>Entra en la web de Google AI Studio: <a href="https://aistudio.google.com/app/api-keys" target="_blank" style="color: #389fff;">https://aistudio.google.com/app/api-keys</a>.</li>
                            <li>Inicia sesión con tu cuenta de Google.</li>
                            <li>Haz clic en el botón azul <strong>"Create API key"</strong> (o "Get API Key").</li>
                            <li>Selecciona un proyecto de Google Cloud existente o elige la opción automática de crear uno nuevo en un clic.</li>
                            <li>Copia el código alfanumérico generado (empieza por caracteres como <code style="color: #30d158;">AIzaSy...</code>).</li>
                        </ol>
                    </div>

                    <div class="help-section-card">
                        <div class="help-section-title">🎁 Llamadas Gratuitas y Cuota del Tier Gratuito (Free Tier)</div>
                        <p class="help-p">
                            Google ofrece un <strong>Tier Gratuito (Free Tier)</strong> extremadamente generoso diseñado para desarrolladores, permitiendo usar sus modelos más potentes a <strong>coste 0€</strong>:
                        </p>
                        <div class="help-code-block">
• Modelo Gemini 3.5 Flash / Lite:
  - 15 Peticiones por Minuto (RPM - Requests Per Minute)
  - 1.000.000 de Tokens por Minuto (TPM)
  - 1.500 Peticiones al Día (RPD - Requests Per Day) ¡Totalmente Gratis!

• Modelo Imagen 3.0 Generate:
  - Cuota gratuita para pruebas y creación de assets gráficos sin tarjeta de crédito.
                        </div>
                        <p class="help-p">
                            Gracias a este Tier Gratuito, puedes hacer funcionar el Agente Creador de Aventuras y la generación de vectores SVG sin gastar dinero.
                        </p>
                    </div>

                    <div class="help-section-card">
                        <div class="help-section-title">⚙️ ¿Cómo configurar tu API Key en el Programa?</div>
                        <p class="help-p">
                            Para configurar tu clave en Silenos Maker:
                        </p>
                        <ol class="help-list" style="margin-left: 20px;">
                            <li>Haz clic en el botón <strong>"Config Gemini"</strong> situado arriba a la derecha en la barra de herramientas principal.</li>
                            <li>Pega tu clave en el campo de texto.</li>
                            <li>Haz clic en <strong>"Guardar Configuración"</strong>.</li>
                        </ol>
                        <p class="help-p" style="font-size: 11px; color: #a0a0b0; margin-top: 8px;">
                            🔒 <em>Nota de Seguridad: Tu API Key se almacena localmente de forma segura en el <code>localStorage</code> de tu propio navegador. Nunca se envía a ningún servidor externo salvo a las APIs oficiales de Google.</em>
                        </p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setupHelpModalEvents(modal);
        return modal;
    }

    // -------------------------------------------------------------------------
    // EVENTOS Y LÓGICA DE INTERACCIÓN DEL MODAL
    // -------------------------------------------------------------------------
    function setupHelpModalEvents(modal) {
        // Cierre del Modal
        const btnClose = modal.querySelector('#btn-close-help-modal');
        if (btnClose) {
            btnClose.onclick = () => {
                modal.style.display = 'none';
            };
        }

        // Navegación por Pestañas
        const tabBtns = modal.querySelectorAll('.help-tab-btn');
        const tabContents = modal.querySelectorAll('.help-tab-content');

        tabBtns.forEach(btn => {
            btn.onclick = () => {
                const targetTabId = btn.getAttribute('data-tab');

                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const targetContent = modal.querySelector(`#${targetTabId}`);
                if (targetContent) targetContent.classList.add('active');
            };
        });

        // Botón de Descarga del JSON de ComfyUI
        const btnDownloadComfy = modal.querySelector('#btn-download-comfy-json');
        if (btnDownloadComfy) {
            btnDownloadComfy.onclick = () => {
                const jsonStr = JSON.stringify(COMFY_WORKFLOW_DATA, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'plano confyui silenos maker.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            };
        }
    }

    // -------------------------------------------------------------------------
    // INYECCIÓN DEL BOTÓN DE AYUDA EN LA ESQUINA SUPERIOR DERECHA
    // -------------------------------------------------------------------------
    function initHelpButton() {
        injectHelpModalStyles();
        const modal = createHelpModalHTML();

        // Buscar el Toolbar o colocar el botón flotante en la esquina superior derecha
        const toolbar = document.getElementById('toolbar');

        const helpBtn = document.createElement('button');
        helpBtn.id = 'btn-open-help-modal';
        helpBtn.className = 'btn';
        helpBtn.style.cssText = `
            background: #5856d6;
            color: #ffffff;
            border-color: #5856d6;
            font-weight: 600;
            margin-left: 8px;
            padding: 6px 12px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(88, 86, 214, 0.3);
        `;
        helpBtn.innerHTML = '❓ Ayuda';

        helpBtn.onclick = () => {
            modal.style.display = 'flex';
        };

        if (toolbar) {
            toolbar.appendChild(helpBtn);
        } else {
            helpBtn.style.position = 'fixed';
            helpBtn.style.top = '12px';
            helpBtn.style.right = '12px';
            helpBtn.style.zIndex = '99999';
            document.body.appendChild(helpBtn);
        }
    }

    // Inicializar al cargar el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHelpButton);
    } else {
        initHelpButton();
    }
})();