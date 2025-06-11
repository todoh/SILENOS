// --- GESTOR DE LA BARRA DE PROGRESO GLOBAL ---
const progressBarManager = {
    container: null,
    label: null,
    fill: null,
    percentage: null,
    isActive: false,

    init() {
        if (this.container) return;
        this.container = document.getElementById('progress-bar-container');
        this.label = document.getElementById('progress-bar-label');
        this.fill = document.getElementById('progress-bar-fill');
        this.percentage = document.getElementById('progress-bar-percentage');
    },
    start(labelText) {
        this.init();
        if (this.isActive || !this.container) return;
        this.isActive = true;
        if (this.label) this.label.textContent = labelText;
        if (this.fill) this.fill.style.backgroundColor = '#28a745';
        this.set(0);
        this.container.classList.add('visible');
    },
    set(percent, newLabel) {
        if (!this.isActive || !this.container) return;
        const p = Math.min(100, Math.max(0, Math.round(percent)));
        if (this.fill) this.fill.style.width = `${p}%`;
        if (this.percentage) this.percentage.textContent = `${p}%`;
        if (newLabel && this.label) this.label.textContent = newLabel;
    },
    finish() {
        if (!this.isActive || !this.container) return;
        this.set(100, 'Completado');
        setTimeout(() => {
            if (this.container) this.container.classList.remove('visible');
            this.isActive = false;
        }, 1500);
    },
    error(errorMessage) {
        if (!this.isActive || !this.container) return;
        if (this.label) this.label.textContent = errorMessage || 'Error';
        if (this.fill) this.fill.style.backgroundColor = '#e74c3c';
        setTimeout(() => {
            if (this.container) this.container.classList.remove('visible');
            this.isActive = false;
        }, 4000);
    }
};

    document.addEventListener('DOMContentLoaded', () => {
        let apiCallCount = 0;
        const countDisplayElement = document.getElementById('api-call-count');
        const counterContainerElement = document.getElementById('api-call-counter-container');
        const googleApiUrl = 'generativelanguage.googleapis.com';
        const originalFetch = window.fetch;
        function updateApiCount() {
            apiCallCount++;
            if (countDisplayElement) {
                countDisplayElement.textContent = apiCallCount;
            }
            if (apiCallCount === 1 && counterContainerElement) {
                counterContainerElement.classList.add('visible');
            }
        }
        window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string' && url.includes(googleApiUrl)) {
                updateApiCount();
            }
            return originalFetch.apply(this, args);
        };
    });

    /**
     * Función de animación de entrada.
     * Desvanece la pantalla de inicio para revelar la app.
     */
    function flexear() {
        const principio = document.getElementById('principio');
        const esfera = document.getElementById('esfera');
        const menuPrincipio = document.getElementById('esfera2');
        const titulo1 = document.getElementById('titulo1');
        const asistenteBtn = document.getElementById('asistente-btn');

        // 1. Ocultar el contenido de la pantalla de inicio
        menuPrincipio.style.opacity = '0';
        titulo1.style.opacity = '0';

        // 2. Iniciar la expansión de la esfera
        esfera.classList.add('expandir');

        // 3. Programar la aparición del botón 'S'
        setTimeout(() => {
            asistenteBtn.classList.add('visible');
        }, 1000);

        // 4. Iniciar el desvanecimiento de TODA la pantalla de inicio
        setTimeout(() => {
            principio.style.opacity = '0';
        }, 1500); 

        // 5. Cuando el desvanecimiento termine, ocultar la pantalla de inicio 
        //    para que no bloquee los clics en la interfaz de abajo.
        setTimeout(() => {
            principio.style.display = 'none';
        }, 3000); // 1500ms de delay + 1500ms de transición de opacidad
    }

    /**
     * Función de animación para reiniciar y volver a la pantalla de inicio.
     */
    function animacionReiniciar() {
 
        const principio = document.getElementById('principio');
        const esfera = document.getElementById('esfera');
        const menuPrincipio = document.getElementById('menuprincipio');
        const titulo1 = document.getElementById('titulo1');
        const asistenteBtn = document.getElementById('asistente-btn');
        
        // Ocultar el botón 'S' al reiniciar
        if (asistenteBtn) asistenteBtn.classList.remove('visible');

        // 1. Asegurarse de que la pantalla de inicio esté en el DOM para la animación
        if (principio) {
            principio.style.display = 'flex';
        }
        
        // 2. Encoger la esfera (animación inversa)
        if (esfera) {
            esfera.classList.remove('expandir');
        }

        // 3. Forzar un pequeño delay y luego hacerla visible con transición
        //    Esto asegura que el navegador procese el display:flex antes de animar la opacidad.
        setTimeout(() => {
            if (principio) {
                principio.style.opacity = '1';
            }
        }, 50);

        // 4. A mitad de la animación, reaparecer el texto y menú
        setTimeout(() => {
            if (menuPrincipio) menuPrincipio.style.opacity = '1';
            if (titulo1) titulo1.style.opacity = '1';
        }, 1500); 
   limpiarCacheDelProyecto(); }