// --- cronologia/escaleta/generators.core.js ---
// NÚCLEO Y CONFIGURACIÓN DE VOCES - V5.1

const Generators = {
    selectedVoice: 'alloy',
    voiceProvider: 'openai', // 'openai' | 'google'
    googleVoices: [],
    selectedGoogleVoice: null,
    selectedGoogleLang: null,

    setVoice(voice) {
        this.selectedVoice = voice;
        document.querySelectorAll('.voice-btn').forEach(btn => {
            if(btn.dataset.voice === voice) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    },

    setVoiceProvider(provider) {
        this.voiceProvider = provider;
        const btnOpenAI = document.getElementById('tab-voice-openai');
        const btnGoogle = document.getElementById('tab-voice-google');
        const contOpenAI = document.getElementById('voice-container-openai');
        const contGoogle = document.getElementById('voice-container-google');

        if (provider === 'openai') {
            btnOpenAI.className = "px-2 py-1 bg-white shadow-sm rounded text-indigo-600 transition-colors";
            btnGoogle.className = "px-2 py-1 text-gray-400 hover:text-gray-600 transition-colors";
            contOpenAI.classList.remove('hidden');
            contGoogle.classList.add('hidden');
        } else {
            btnGoogle.className = "px-2 py-1 bg-white shadow-sm rounded text-indigo-600 transition-colors";
            btnOpenAI.className = "px-2 py-1 text-gray-400 hover:text-gray-600 transition-colors";
            contGoogle.classList.remove('hidden');
            contOpenAI.classList.add('hidden');
            
            // Cargar voces de Google la primera vez que se abre la pestaña
            if (this.googleVoices.length === 0) {
                this.loadGoogleVoices();
            }
        }
    },

    async loadGoogleVoices() {
        const select = document.getElementById('google-voice-select');
        const errorMsg = document.getElementById('google-voice-error');
        
        // Coge la API Key de LocalStorage (donde Silenos la guarda en config-window.js) o del parent
        const apiKey = localStorage.getItem('googlecloud_api_key') || (window.parent && window.parent.googlecloudapikey);

        if (!apiKey) {
            select.innerHTML = '<option disabled selected>Falta API Key</option>';
            errorMsg.classList.remove('hidden');
            return;
        }

        errorMsg.classList.add('hidden');
        select.innerHTML = '<option>Cargando voces...</option>';

        try {
            const response = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`);
            const data = await response.json();
            
            if (data.error) throw new Error(data.error.message);

            this.googleVoices = data.voices;
            this.filterGoogleVoices();

        } catch (e) {
            console.error(e);
            select.innerHTML = '<option>Error al cargar voces</option>';
            errorMsg.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error API: ${e.message}`;
            errorMsg.classList.remove('hidden');
        }
    },

    filterGoogleVoices() {
        const lang = document.getElementById('google-lang-select').value;
        const select = document.getElementById('google-voice-select');
        select.innerHTML = '';

        let filtered = this.googleVoices.filter(v => 
            lang === 'all' || v.languageCodes.some(code => code.includes(lang.split('-')[0]))
        );

        // Ordenar: Chirp arriba
        filtered.sort((a, b) => {
            const isChirpA = a.name.toLowerCase().includes('chirp');
            const isChirpB = b.name.toLowerCase().includes('chirp');
            return isChirpB - isChirpA;
        });

        filtered.forEach(v => {
            const option = document.createElement('option');
            option.value = v.name;
            option.dataset.lang = v.languageCodes[0];
            
            let label = v.name.split('-').pop(); // Simplificar nombre
            let type = "Standard";
            
            if (v.name.toLowerCase().includes('chirp')) {
                type = "🔥 CHIRP";
                option.style.fontWeight = 'bold';
                option.style.color = '#b91c1c';
            } else if (v.name.toLowerCase().includes('wavenet')) {
                type = "🌊 WaveNet";
            }

            option.text = `[${type}] ${label} (${v.ssmlGender})`;
            select.appendChild(option);
        });
        
        // Establecer la primera como seleccionada por defecto
        if (select.options.length > 0) {
            this.setGoogleVoice();
        }
    },

    setGoogleVoice() {
        const select = document.getElementById('google-voice-select');
        if(select.selectedIndex >= 0) {
            const selectedOption = select.options[select.selectedIndex];
            this.selectedGoogleVoice = selectedOption.value;
            this.selectedGoogleLang = selectedOption.dataset.lang;
        }
    }
};