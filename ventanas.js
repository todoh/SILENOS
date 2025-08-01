document.addEventListener('DOMContentLoaded', () => {
    const gestorLista = document.getElementById('lista-ventanas');
    let zIndexCounter = 1000;

    // --- FUNCIÓN PARA INICIALIZAR LAS VENTANAS ---
    const inicializarVentanas = () => {
        const ventanas = document.querySelectorAll('.pantalla');
        
        ventanas.forEach((ventana, index) => {
            // Evita reinicializar una ventana si ya tiene un título
            if (ventana.querySelector('.titulo-ventana')) {
                return;
            }

            // 1. CREACIÓN DINÁMICA DE LA ESTRUCTURA
            const tituloTexto = ventana.dataset.titulo || ventana.id || 'Ventana';
            const contenidoOriginal = Array.from(ventana.childNodes);

            ventana.innerHTML = `
                <div class="titulo-ventana">
                    <span class="titulo">${tituloTexto}</span>
                    <div class="botones-ventana">
                        <button class="minimizar" title="Minimizar">
                            <svg viewBox="0 0 24 24"><path d="M20 14H4v-4h16v4z"/></svg>
                        </button>
                        <button class="maximizar" title="Maximizar">
                            <svg class="svg-maximizar" viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/></svg>
                            <svg class="svg-restaurar" style="display:none;" viewBox="0 0 24 24"><path d="M8 8h10v10h-2V10H8v0zm-4 4v10h10v-2H6V12H4v0z"/></svg>
                        </button>
                        <button class="cerrar" title="Cerrar">
                            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="contenido-ventana"></div>
            `;

            const contenidoVentanaDiv = ventana.querySelector('.contenido-ventana');
            contenidoOriginal.forEach(nodo => contenidoVentanaDiv.appendChild(nodo));
// Crear y añadir el botón de cierre para el "modo claro"
        const clearModeCloseBtn = document.createElement('button');
        clearModeCloseBtn.className = 'clear-mode-close';
        clearModeCloseBtn.innerHTML = '&times;'; // El símbolo de 'X'
        clearModeCloseBtn.title = 'Cerrar';
        clearModeCloseBtn.onclick = () => window.cerrarVentana(ventana.id);
        ventana.appendChild(clearModeCloseBtn);
            // 2. LÓGICA DE LA VENTANA (Arrastre, botones, etc.)
            const tituloVentana = ventana.querySelector('.titulo-ventana');
            let isDragging = false, offsetX, offsetY;
            
            ventana.style.transform = `translate(-50%, -50%) translate(${index * 20}px, ${index * 20}px)`;

            const bringToFront = () => {
                zIndexCounter++;
                ventana.style.zIndex = zIndexCounter;
            };

            ventana.addEventListener('mousedown', bringToFront, { capture: true });

            tituloVentana.addEventListener('mousedown', (e) => {
                if (e.target.closest('button')) return;
                isDragging = true;
                
                const rect = ventana.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;

                if(getComputedStyle(ventana).transform !== 'none') {
                    ventana.style.top = `${rect.top}px`;
                    ventana.style.left = `${rect.left}px`;
                    ventana.style.transform = 'none';
                }
                document.body.style.userSelect = 'none';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                // *** INICIO DE LA CORRECCIÓN ***
                // Limita el movimiento dentro del viewport
                const bodyRect = document.body.getBoundingClientRect();
                let newTop = e.clientY - offsetY;
                let newLeft = e.clientX - offsetX;

                // Comprobar límite superior
                if (newTop < 0) newTop = 0;
                // Comprobar límite izquierdo
                if (newLeft < 0) newLeft = 0;
                // Comprobar límite derecho
                if (newLeft + ventana.offsetWidth > bodyRect.width) {
                    newLeft = bodyRect.width - ventana.offsetWidth;
                }
                // Comprobar límite inferior (dejando espacio para el gestor de ventanas si existe)
                const gestor = document.getElementById('gestor-ventanas');
                const limiteInferior = gestor ? bodyRect.height - gestor.offsetHeight : bodyRect.height;
                if (newTop + tituloVentana.offsetHeight > limiteInferior) {
                    newTop = limiteInferior - tituloVentana.offsetHeight;
                }
                
                ventana.style.top = `${newTop}px`;
                ventana.style.left = `${newLeft}px`;
                // *** FIN DE LA CORRECCIÓN ***
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
                document.body.style.userSelect = 'auto';
            });

            // Lógica de botones
            const btnMinimizar = ventana.querySelector('.minimizar');
            const btnMaximizar = ventana.querySelector('.maximizar');
            const btnCerrar = ventana.querySelector('.cerrar');
            const svgMaximizar = ventana.querySelector('.svg-maximizar');
            const svgRestaurar = ventana.querySelector('.svg-restaurar');
            let estadoAnterior = {};

            btnMinimizar.addEventListener('click', () => ventana.classList.toggle('minimizada'));
            btnCerrar.addEventListener('click', () => window.cerrarVentana(ventana.id));

            btnMaximizar.addEventListener('click', () => {
                 if (ventana.dataset.maximizada === 'true') {
                    Object.assign(ventana.style, estadoAnterior.style);
                    ventana.dataset.maximizada = 'false';
                    ventana.style.resize = 'both';
                    if (svgMaximizar) svgMaximizar.style.display = 'block';
                    if (svgRestaurar) svgRestaurar.style.display = 'none';
                } else {
                    estadoAnterior.style = { width: ventana.style.width, height: ventana.style.height, top: ventana.style.top, left: ventana.style.left, transform: ventana.style.transform };
                    Object.assign(ventana.style, { width: 'calc(100vw - 20px)', height: 'calc(100vh - 65px)', top: '10px', left: '10px', transform: 'none' });
                    ventana.dataset.maximizada = 'true';
                    ventana.style.resize = 'both';
                    if (svgMaximizar) svgMaximizar.style.display = 'none';
                    if (svgRestaurar) svgRestaurar.style.display = 'block';
                }
            });
        });
    };
    
    // --- FUNCIONES GLOBALES PARA MANEJAR VENTANAS ---

    window.actualizarGestor = () => {
        if (!gestorLista) return;
        gestorLista.innerHTML = '';
        document.querySelectorAll('.pantalla').forEach(ventana => {
            if (getComputedStyle(ventana).display !== 'none') {
                const titulo = ventana.querySelector('.titulo')?.textContent || ventana.id;
                const listItem = document.createElement('li');
                listItem.textContent = titulo;
                listItem.dataset.targetId = ventana.id;
                listItem.onclick = () => {
                    const v = document.getElementById(listItem.dataset.targetId);
                    if(v) {
                       zIndexCounter++;
                       v.style.zIndex = zIndexCounter;
                    }
                };
                gestorLista.appendChild(listItem);
            }
        });
    };

    window.abrirVentana = (id) => {
        
        const ventana = document.getElementById(id);
        if (ventana) {
            ventana.style.display = 'flex';
            zIndexCounter++;
            ventana.style.zIndex = zIndexCounter;
            window.actualizarGestor();
        }
       actualizarBotonContextual(id);   
    };

    window.cerrarVentana = (id) => {
        const ventana = document.getElementById(id);
        if (ventana) {
            ventana.style.display = 'none';
            window.actualizarGestor();
        }
    };

    // Inicializar todo al cargar
    inicializarVentanas();
    window.actualizarGestor();
});
