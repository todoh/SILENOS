// --- 1. CONFIGURACIÓN Y ESTADO ---
const store = {
    apiKey: localStorage.getItem('pollinations_api_key') || null,
    cardsRevealed: 0,
    currentSpread: [],
    isReading: false
};

const ARCANOS = [
    { nombre: "El Loco", significado: "Inocencia, nuevos comienzos, espíritu libre.", color: "#facc15" },
    { nombre: "El Mago", significado: "Poder, habilidad, concentración, acción.", color: "#ef4444" },
    { nombre: "La Sacerdotisa", significado: "Intuición, subconsciente, misterio.", color: "#3b82f6" },
    { nombre: "La Emperatriz", significado: "Fertilidad, naturaleza, abundancia.", color: "#10b981" },
    { nombre: "El Emperador", significado: "Autoridad, estructura, padre.", color: "#b91c1c" },
    { nombre: "El Hierofante", significado: "Religión, grupos, conformidad, tradición.", color: "#a8a29e" },
    { nombre: "Los Enamorados", significado: "Amor, unión, relaciones, elecciones.", color: "#ec4899" },
    { nombre: "El Carro", significado: "Control, voluntad, victoria, asertividad.", color: "#eab308" },
    { nombre: "La Fuerza", significado: "Fuerza, coraje, paciencia, control suave.", color: "#f97316" },
    { nombre: "El Ermitaño", significado: "Introspección, búsqueda, soledad, guía.", color: "#6366f1" },
    { nombre: "Rueda de la Fortuna", significado: "Suerte, karma, ciclos, destino.", color: "#8b5cf6" },
    { nombre: "La Justicia", significado: "Justicia, verdad, ley, causa y efecto.", color: "#14b8a6" },
    { nombre: "El Colgado", significado: "Suspensión, restricción, dejar ir.", color: "#60a5fa" },
    { nombre: "La Muerte", significado: "Fin, transición, eliminación, cambio.", color: "#1e293b" },
    { nombre: "La Templanza", significado: "Equilibrio, moderación, paciencia.", color: "#38bdf8" },
    { nombre: "El Diablo", significado: "Esclavitud, adicción, sexualidad, materialismo.", color: "#7f1d1d" },
    { nombre: "La Torre", significado: "Desastre repentino, cambio, revelación.", color: "#991b1b" },
    { nombre: "La Estrella", significado: "Esperanza, espiritualidad, renovación.", color: "#fef08a" },
    { nombre: "La Luna", significado: "Ilusión, miedo, ansiedad, subconsciente.", color: "#475569" },
    { nombre: "El Sol", significado: "Diversión, calidez, éxito, positividad.", color: "#f59e0b" },
    { nombre: "El Juicio", significado: "Juicio, renacimiento, llamada interior.", color: "#94a3b8" },
    { nombre: "El Mundo", significado: "Integración, cumplimiento, viaje, final.", color: "#10b981" }
];

const POSICIONES = ["Pasado", "Presente", "Futuro"];

// --- 2. SERVICIO IA (Pollinations + Gemini) ---
const ai = {
    login() {
        if (store.apiKey) {
            if(confirm("¿Desconectar?")) {
                localStorage.removeItem('pollinations_api_key');
                store.apiKey = null;
                this.updateAuthUI();
            }
            return;
        }
        const redirectUrl = encodeURIComponent(window.location.href); 
        window.open(`https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}`, 'PollinationsAuth', `width=500,height=700`);
    },

    updateAuthUI() {
        const btn = document.getElementById('auth-btn');
        if (store.apiKey) {
            btn.innerHTML = '<i class="fa-solid fa-link"></i> CONECTADO';
            btn.className = 'auth-btn auth-on';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-plug"></i> CONECTAR AI';
            btn.className = 'auth-btn auth-off';
        }
    },

    async interpreteTirada(cartas) {
        if (!store.apiKey) {
            return "⚠️ **IA Desconectada:** Por favor, pulsa el botón 'Conectar AI' arriba a la derecha para recibir tu lectura mística.";
        }

        const promptSistema = `
            Eres un Tarotista Místico experto y sabio. Tu tarea es interpretar una tirada de 3 cartas (Pasado, Presente, Futuro).
            - Usa un tono místico, empático y algo misterioso.
            - Conecta los significados de las cartas entre sí para crear una narrativa coherente.
            - Da un consejo final breve.
            - Usa formato Markdown (negritas, cursivas) para estructurar la respuesta.
            - Sé conciso pero profundo.
        `;

        const promptUsuario = `
            Interpreta esta tirada de Tarot:
            1. Pasado: ${cartas[0].nombre} (${cartas[0].significado})
            2. Presente: ${cartas[1].nombre} (${cartas[1].significado})
            3. Futuro: ${cartas[2].nombre} (${cartas[2].significado})
        `;

        try {
            const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${store.apiKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    model: 'gemini-fast', 
                    messages: [
                        { role: 'system', content: promptSistema }, 
                        { role: 'user', content: promptUsuario }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error("Error en la conexión con el oráculo.");
            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error(error);
            return "❌ **Error en el Oráculo:** No se pudo conectar con los espíritus digitales (Error de API). Inténtalo de nuevo.";
        }
    }
};

// --- 3. LÓGICA DEL JUEGO ---
const game = {
    init() {
        if(window.location.hash.includes('api_key') || window.location.hash.includes('access_token')) {
            const params = new URLSearchParams(window.location.hash.substring(1));
            const key = params.get('api_key') || params.get('access_token');
            
            if(key) {
                if(window.opener) {
                    try {
                        window.opener.postMessage({ type: 'POLLI_AUTH_SUCCESS', key: key }, '*');
                        window.close();
                        return;
                    } catch (e) { console.error(e); }
                } 
                
                store.apiKey = key;
                localStorage.setItem('pollinations_api_key', key);
                window.location.hash = ''; 
            }
        }

        ai.updateAuthUI();
        
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'POLLI_AUTH_SUCCESS' && event.data.key) {
                store.apiKey = event.data.key;
                localStorage.setItem('pollinations_api_key', store.apiKey);
                ai.updateAuthUI();
            }
        });
    },

    barajar(array) {
        const copia = [...array];
        for (let i = copia.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copia[i], copia[j]] = [copia[j], copia[i]];
        }
        return copia;
    },

    startSpread() {
        const area = document.getElementById('game-area');
        const resultContainer = document.getElementById('ai-result-container');
        
        area.innerHTML = '';
        resultContainer.style.display = 'none';
        document.getElementById('ai-content').innerHTML = '';
        store.cardsRevealed = 0;
        store.isReading = false;

        const mazo = this.barajar(ARCANOS);
        store.currentSpread = mazo.slice(0, 3);

        store.currentSpread.forEach((carta, index) => {
            const el = this.crearCartaDOM(carta, index, POSICIONES[index]);
            area.appendChild(el);
        });
    },

    crearCartaDOM(data, index, posicion) {
        const container = document.createElement('div');
        container.className = 'card-container';
        container.style.animationDelay = `${index * 0.2}s`;

        container.onclick = async function() {
            if (this.classList.contains('flipped') || store.isReading) return;

            this.classList.add('flipped');
            store.cardsRevealed++;

            if (store.cardsRevealed === 3) {
                await game.triggerAI();
            }
        };

        // Obtenemos el SVG correspondiente del diccionario global en svgs.js
        const ilustracion = TAROT_SVGS[data.nombre] || '';

        container.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <div class="pattern">☪</div>
                    <small>Click para revelar</small>
                </div>
                <div class="card-back" style="border-color:${data.color}">
                    <div class="card-position">${posicion}</div>
                    <div class="card-title" style="color:${data.color}">${data.nombre}</div>
                    <div class="card-illustration" style="color:${data.color}">
                        ${ilustracion}
                    </div>
                    <div class="card-meaning">${data.significado}</div>
                </div>
            </div>
        `;
        return container;
    },

    async triggerAI() {
        store.isReading = true;
        const container = document.getElementById('ai-result-container');
        const loader = document.getElementById('ai-loader');
        const status = document.getElementById('ai-status-text');
        const content = document.getElementById('ai-content');

        container.style.display = 'block';
        loader.style.display = 'inline-block';
        status.textContent = "Consultando al Universo...";
        content.innerHTML = ""; 

        const texto = await ai.interpreteTirada(store.currentSpread);

        loader.style.display = 'none';
        status.textContent = "Lectura Finalizada";
        content.innerHTML = marked.parse(texto); 
    }
};

// Iniciar app
game.init();