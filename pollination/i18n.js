// i18n.js

const translations = {
    es: {
        "tool_video": "Video",
        "tool_image": "Imagen",
        "tool_music": "Música",
        "tool_voice": "Voz",
        "tool_chat": "Chat",
        "tool_storyboard": "Storyboard",
        "status_disconnected": "Desconectado",
        "status_connected": "Conectado",
        "login_button_header": "Conectar API",
        "placeholder_canvas": "El lienzo de generación aparecerá aquí.",
        "login_title": "Conectar a Pollination",
        "login_subtitle": "Introduce tu token para usar la IA.",
        "login_placeholder": "Token...",
        "login_button": "Iniciar Sesión",
        "login_footer": "La clave se guarda localmente de forma segura.",
        "model_label": "Modelo IA",
        "format_label": "Formato",
        "seed_label": "Semilla",
        "seed_random": "Aleatoria",
        "seed_placeholder": "ID...",
        "btn_processing": "PROCESANDO...",
        "alert_api_key": "Por favor, conecta tu API Key de Pollination primero.",
        "video_prompt_label": "Prompt de Video",
        "video_prompt_placeholder": "Describe la acción, cinemática, iluminación...",
        "video_duration_label": "Duración (Bloques)",
        "video_btn_generate": "Generar Video",
        "video_empty_text": "Tus videos generados aparecerán aquí.",
        "image_prompt_label": "Prompt de Imagen",
        "image_prompt_placeholder": "Describe la imagen visualmente, iluminación, estilo...",
        "image_batch_label": "Cantidad",
        "image_chroma_label": "Chroma Key",
        "image_seed_batch_label": "Semilla (Lote 1)",
        "image_btn_generate": "Generar Imágenes",
        "image_empty_text": "Tus imágenes generadas aparecerán aquí.",
        "music_prompt_label": "Prompt / Letra",
        "music_prompt_placeholder": "Describe la música o escribe la letra...",
        "music_voice_label": "Tono / Voz Base",
        "music_voice_note": "* Requisito técnico de la API, se requiere seleccionar voz.",
        "music_btn_generate": "Generar Música",
        "music_empty_text": "Tus pistas de música aparecerán aquí.",
        "voice_prompt_label": "Texto a Narrar",
        "voice_prompt_placeholder": "Escribe el texto que deseas que la IA narre...",
        "voice_model_label": "Voz",
        "voice_btn_generate": "Generar Voz",
        "voice_empty_text": "Tus narraciones generadas aparecerán aquí.",
        "chat_model_label": "Modelo de Chat",
        "chat_system_label": "Instrucciones del Sistema (Contexto)",
        "chat_system_placeholder": "Define la personalidad, format, rol o instrucciones generales...",
        "chat_btn_clear": "Borrar Memoria",
        "chat_input_placeholder": "Escribe un mensaje... (Shift+Enter para nueva línea)",
        "chat_empty_text": "Comienza una nueva conversación.",
        "confirm_clear_chat": "¿Estás seguro de que quieres borrar el historial de chat de la memoria?",
        "btn_enter_app": "Entrar al Entorno",
        "sb_prompt_label": "Historia Base / Guion",
        "sb_prompt_placeholder": "Describe la historia detalladamente...",
        "sb_scenes": "Escenas",
        "sb_style_label": "Estilo Visual",
        "sb_style_placeholder": "Ej: Cinematic, Anime, Noir...",
        "sb_genre_label": "Género",
        "sb_genre_placeholder": "Ej: Sci-Fi, Cyberpunk...",
        "sb_btn_generate": "Generar Storyboard",
        "sb_empty_text": "El Storyboard inmersivo aparecerá aquí.",
        "sb_scene_label": "Escena",
        "sb_prompt_klein": "Prompt (Klein)"
    },
    en: {
        "tool_video": "Video",
        "tool_image": "Image",
        "tool_music": "Music",
        "tool_voice": "Voice",
        "tool_chat": "Chat",
        "tool_storyboard": "Storyboard",
        "status_disconnected": "Disconnected",
        "status_connected": "Connected",
        "login_button_header": "Connect API",
        "placeholder_canvas": "The generation canvas will appear here.",
        "login_title": "Connect to Pollination",
        "login_subtitle": "Enter your token to use AI.",
        "login_placeholder": "Token...",
        "login_button": "Log In",
        "login_footer": "The key is securely saved locally.",
        "model_label": "AI Model",
        "format_label": "Format",
        "seed_label": "Seed",
        "seed_random": "Random",
        "seed_placeholder": "ID...",
        "btn_processing": "PROCESSING...",
        "alert_api_key": "Please connect your Pollination API Key first.",
        "video_prompt_label": "Video Prompt",
        "video_prompt_placeholder": "Describe action, kinematics, lighting...",
        "video_duration_label": "Duration (Blocks)",
        "video_btn_generate": "Generate Video",
        "video_empty_text": "Your generated videos will appear here.",
        "image_prompt_label": "Image Prompt",
        "image_prompt_placeholder": "Describe the image visually, lighting, style...",
        "image_batch_label": "Amount",
        "image_chroma_label": "Chroma Key",
        "image_seed_batch_label": "Seed (Batch 1)",
        "image_btn_generate": "Generate Images",
        "image_empty_text": "Your generated images will appear here.",
        "music_prompt_label": "Prompt / Lyrics",
        "music_prompt_placeholder": "Describe the music or write the lyrics...",
        "music_voice_label": "Tone / Base Voice",
        "music_voice_note": "* API technical requirement, voice selection is required.",
        "music_btn_generate": "Generate Music",
        "music_empty_text": "Your music tracks will appear here.",
        "voice_prompt_label": "Text to Narrate",
        "voice_prompt_placeholder": "Write the text you want the AI to narrate...",
        "voice_model_label": "Voice",
        "voice_btn_generate": "Generate Voice",
        "voice_empty_text": "Your generated narrations will appear here.",
        "chat_model_label": "Chat Model",
        "chat_system_label": "System Instructions (Context)",
        "chat_system_placeholder": "Define personality, format, role or general instructions...",
        "chat_btn_clear": "Clear Memory",
        "chat_input_placeholder": "Type a message... (Shift+Enter for new line)",
        "chat_empty_text": "Start a new conversation.",
        "confirm_clear_chat": "Are you sure you want to clear the chat history from memory?",
        "btn_enter_app": "Enter Environment",
        "sb_prompt_label": "Base Story / Script",
        "sb_prompt_placeholder": "Describe the story in detail...",
        "sb_scenes": "Scenes",
        "sb_style_label": "Visual Style",
        "sb_style_placeholder": "Ex: Cinematic, Anime, Noir...",
        "sb_genre_label": "Genre",
        "sb_genre_placeholder": "Ex: Sci-Fi, Cyberpunk...",
        "sb_btn_generate": "Generate Storyboard",
        "sb_empty_text": "The immersive Storyboard will appear here.",
        "sb_scene_label": "Scene",
        "sb_prompt_klein": "Prompt (Klein)"
    },
    ca: {
        "tool_video": "Vídeo",
        "tool_image": "Imatge",
        "tool_music": "Música",
        "tool_voice": "Veu",
        "tool_chat": "Xat",
        "tool_storyboard": "Storyboard",
        "status_disconnected": "Desconnectat",
        "status_connected": "Connectat",
        "login_button_header": "Connectar API",
        "placeholder_canvas": "El llenç de generació apareixerà aquí.",
        "login_title": "Connectar a Pollination",
        "login_subtitle": "Introdueix el teu token per usar la IA.",
        "login_placeholder": "Token...",
        "login_button": "Iniciar Sessió",
        "login_footer": "La clau es desa localment de forma segura.",
        "model_label": "Model IA",
        "format_label": "Format",
        "seed_label": "Llavor",
        "seed_random": "Aleatòria",
        "seed_placeholder": "ID...",
        "btn_processing": "PROCESSANT...",
        "alert_api_key": "Si us plau, connecta la teva API Key de Pollination primer.",
        "video_prompt_label": "Prompt de Vídeo",
        "video_prompt_placeholder": "Descriu l'acció, cinemàtica, il·luminació...",
        "video_duration_label": "Durada (Blocs)",
        "video_btn_generate": "Generar Vídeo",
        "video_empty_text": "Els teus vídeos generats apareixeran aquí.",
        "image_prompt_label": "Prompt d'Imatge",
        "image_prompt_placeholder": "Descriu la imatge visualment, il·luminació, estil...",
        "image_batch_label": "Quantitat",
        "image_chroma_label": "Croma Key",
        "image_seed_batch_label": "Llavor (Lot 1)",
        "image_btn_generate": "Generar Imatges",
        "image_empty_text": "Les teves imatges generades apareixeran aquí.",
        "music_prompt_label": "Prompt / Lletra",
        "music_prompt_placeholder": "Descriu la música o escriu la lletra...",
        "music_voice_label": "To / Veu Base",
        "music_voice_note": "* Requisit tècnic de l'API, cal seleccionar veu.",
        "music_btn_generate": "Generar Música",
        "music_empty_text": "Les teves pistes de música apareixeran aquí.",
        "voice_prompt_label": "Text a Narrar",
        "voice_prompt_placeholder": "Escriu el text que vols que la IA narri...",
        "voice_model_label": "Veu",
        "voice_btn_generate": "Generar Veu",
        "voice_empty_text": "Les teves narracions generades apareixeran aquí.",
        "chat_model_label": "Model de Xat",
        "chat_system_label": "Instruccions del Sistema (Context)",
        "chat_system_placeholder": "Defineix la personalitat, format, rol o instruccions generals...",
        "chat_btn_clear": "Esborrar Memòria",
        "chat_input_placeholder": "Escriu un missatge... (Shift+Enter per nova línia)",
        "chat_empty_text": "Comença una nova conversa.",
        "confirm_clear_chat": "Estàs segur que vols esborrar l'historial de xat de la memòria?",
        "btn_enter_app": "Entrar a l'Entorn",
        "sb_prompt_label": "Història Base / Guió",
        "sb_prompt_placeholder": "Descriu la història detalladament...",
        "sb_scenes": "Escenes",
        "sb_style_label": "Estil Visual",
        "sb_style_placeholder": "Ex: Cinematic, Anime, Noir...",
        "sb_genre_label": "Gènere",
        "sb_genre_placeholder": "Ex: Sci-Fi, Cyberpunk...",
        "sb_btn_generate": "Generar Storyboard",
        "sb_empty_text": "L'Storyboard immersiu apareixerà aquí.",
        "sb_scene_label": "Escena",
        "sb_prompt_klein": "Prompt (Klein)"
    },
    fr: {
        "tool_video": "Vidéo",
        "tool_image": "Image",
        "tool_music": "Musique",
        "tool_voice": "Voix",
        "tool_chat": "Chat",
        "tool_storyboard": "Storyboard",
        "status_disconnected": "Déconnecté",
        "status_connected": "Connecté",
        "login_button_header": "Connecter l'API",
        "placeholder_canvas": "La toile de génération apparaîtra ici.",
        "login_title": "Se connecter à Pollination",
        "login_subtitle": "Entrez votre jeton pour utiliser l'IA.",
        "login_placeholder": "Jeton...",
        "login_button": "Se connecter",
        "login_footer": "La clé est stockée localement en toute sécurité.",
        "model_label": "Modèle IA",
        "format_label": "Format",
        "seed_label": "Graine",
        "seed_random": "Aléatoire",
        "seed_placeholder": "ID...",
        "btn_processing": "TRAITEMENT...",
        "alert_api_key": "Veuillez d'abord connecter votre clé API Pollination.",
        "video_prompt_label": "Prompt Vidéo",
        "video_prompt_placeholder": "Décrivez l'action, la cinématique, l'éclairage...",
        "video_duration_label": "Durée (Blocs)",
        "video_btn_generate": "Générer Vidéo",
        "video_empty_text": "Vos vidéos générées apparaîtront ici.",
        "image_prompt_label": "Prompt Image",
        "image_prompt_placeholder": "Décrivez l'image visuellement, éclairage, style...",
        "image_batch_label": "Quantité",
        "image_chroma_label": "Incrustation",
        "image_seed_batch_label": "Graine (Lot 1)",
        "image_btn_generate": "Générer des Images",
        "image_empty_text": "Vos images générées apparaîtront ici.",
        "music_prompt_label": "Prompt / Paroles",
        "music_prompt_placeholder": "Décrivez la musique ou écrivez les paroles...",
        "music_voice_label": "Tonalité / Voix de Base",
        "music_voice_note": "* Exigence technique de l'API, la sélection de la voix est requise.",
        "music_btn_generate": "Générer Musique",
        "music_empty_text": "Vos pistes musicales apparaîtront ici.",
        "voice_prompt_label": "Texte à Narrer",
        "voice_prompt_placeholder": "Écrivez le texte que vous souhaitez que l'IA narre...",
        "voice_model_label": "Voix",
        "voice_btn_generate": "Générer Voix",
        "voice_empty_text": "Vos narrations générées apparaîtront ici.",
        "chat_model_label": "Modèle de Chat",
        "chat_system_label": "Instructions Système (Contexte)",
        "chat_system_placeholder": "Définir la personnalité, le format, le rôle ou les instructions générales...",
        "chat_btn_clear": "Effacer la Mémoire",
        "chat_input_placeholder": "Écrivez un message... (Shift+Enter pour nouvelle ligne)",
        "chat_empty_text": "Commencez une nouvelle conversation.",
        "confirm_clear_chat": "Êtes-vous sûr de vouloir effacer l'historique du chat de la mémoire ?",
        "btn_enter_app": "Entrer dans l'Environnement",
        "sb_prompt_label": "Histoire de Base / Scénario",
        "sb_prompt_placeholder": "Décrivez l'histoire en détail...",
        "sb_scenes": "Scènes",
        "sb_style_label": "Style Visuel",
        "sb_style_placeholder": "Ex: Cinematic, Anime, Noir...",
        "sb_genre_label": "Genre",
        "sb_genre_placeholder": "Ex: Sci-Fi, Cyberpunk...",
        "sb_btn_generate": "Générer Storyboard",
        "sb_empty_text": "Le Storyboard immersif apparaîtra ici.",
        "sb_scene_label": "Scène",
        "sb_prompt_klein": "Prompt (Klein)"
    }
};

// POR DEFECTO EN INGLÉS ('en')
let currentLanguage = localStorage.getItem('silenos_lang') || 'en';

function t(key) {
    if (!translations[currentLanguage]) return key;
    return translations[currentLanguage][key] || translations['en'][key] || key;
}

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLanguage = lang;
    localStorage.setItem('silenos_lang', lang);
    updateDOM();
}

function updateDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLanguage][key]) {
            const icon = el.querySelector('i');
            if (icon && el.childNodes.length > 1) {
                const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '');
                if (textNode) textNode.textContent = ' ' + translations[currentLanguage][key];
            } else {
                el.textContent = translations[currentLanguage][key];
            }
        }
    });

    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLanguage][key]) {
            el.setAttribute('placeholder', translations[currentLanguage][key]);
        }
    });

    const langSelect = document.getElementById('language-selector');
    if (langSelect) langSelect.value = currentLanguage;
}

document.addEventListener('DOMContentLoaded', () => {
    updateDOM();
    
    const langSelect = document.getElementById('language-selector');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            setLanguage(e.target.value);
            const ev = new Event('input');
            const vs = document.getElementById('video-seed'); if(vs) vs.dispatchEvent(ev);
            const is = document.getElementById('image-seed'); if(is) is.dispatchEvent(ev);
            if (typeof renderChat === 'function') renderChat();
        });
    }
});