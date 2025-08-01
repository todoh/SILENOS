document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const mainScriptInput = document.getElementById('main-script-input');
    const imageGalleryInput = document.getElementById('image-gallery-input');
    const imageThumbnailContainer = document.getElementById('image-thumbnail-container');
    
    const previewCanvas = document.getElementById('preview-canvas');
    const startRecordBtn = document.getElementById('start-record-btn');
    const stopRecordBtn = document.getElementById('stop-record-btn');
    const downloadLink = document.getElementById('download-link');
    const statusEl = document.getElementById('status');
    const ctx = previewCanvas.getContext('2d');

    // --- CONFIGURACIÓN Y ESTADO ---
    const canvasWidth = 720;
    const canvasHeight = 1280;
    previewCanvas.width = canvasWidth;
    previewCanvas.height = canvasHeight;

    let recorder;
    let animationFrameId;
    let uploadedImageFiles = []; // Almacenará los archivos de imagen subidos

    const hiddenAudioEl = document.createElement('audio');
    hiddenAudioEl.crossOrigin = "anonymous";

    // --- MANEJO DE LA GALERÍA DE IMÁGENES ---
    imageGalleryInput.addEventListener('change', (event) => {
        uploadedImageFiles = Array.from(event.target.files);
        imageThumbnailContainer.innerHTML = ''; // Limpiar miniaturas anteriores
        
        if (uploadedImageFiles.length === 0) {
            imageThumbnailContainer.innerHTML = '<p class="text-gray-500 text-sm">Ninguna imagen seleccionada.</p>';
            return;
        }

        uploadedImageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.title = file.name;
                img.classList.add('thumbnail-img');
                imageThumbnailContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });

    // --- FUNCIONES DE RENDERIZADO Y PRECARGA ---

    // Dibuja una imagen en el canvas (simplificado, ya no dibuja texto)
    const drawImageOnCanvas = (imgObject) => {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        if (!imgObject || !imgObject.complete || imgObject.naturalHeight === 0) return;

        const canvasAspect = canvasWidth / canvasHeight;
        const imgAspect = imgObject.naturalWidth / imgObject.naturalHeight;
        let sx, sy, sWidth, sHeight;

        if (imgAspect > canvasAspect) {
            sHeight = imgObject.naturalHeight;
            sWidth = sHeight * canvasAspect;
            sx = (imgObject.naturalWidth - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = imgObject.naturalWidth;
            sHeight = sWidth / canvasAspect;
            sx = 0;
            sy = (imgObject.naturalHeight - sHeight) / 2;
        }
        ctx.drawImage(imgObject, sx, sy, sWidth, sHeight, 0, 0, canvasWidth, canvasHeight);
    };
    
    // Precarga las imágenes para que estén listas para el dibujado
    const preloadImages = (scenes) => {
        statusEl.textContent = 'Cargando imágenes...';
        const promises = scenes.map(scene => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => { scene.imgObject = img; resolve(); };
                img.onerror = () => { console.error("No se pudo precargar la imagen:", scene.imgSrc); resolve(); };
                img.src = scene.imgSrc;
            });
        });
        return Promise.all(promises);
    };

    // --- LÓGICA DE AUDIO ---
    
    // Genera un único audio para todo el texto y devuelve su duración en segundos.
    const generateFullAudioTrack = async (text) => {
        statusEl.textContent = 'Generando narración de audio...';
        if (!text || text.trim() === '') return 0;

        try {
            const response = await fetch(`https://api.streamelements.com/kappa/v2/speech?voice=Mia&text=${encodeURIComponent(text)}`);
            if (!response.ok) throw new Error('El servicio de voz falló.');

            const audioBlob = await response.blob();
            hiddenAudioEl.src = URL.createObjectURL(audioBlob);
            
            // Espera a que los metadatos del audio (incluida la duración) se carguen
            await new Promise((resolve, reject) => {
                hiddenAudioEl.onloadedmetadata = () => resolve();
                hiddenAudioEl.onerror = () => reject('No se pudo cargar el audio.');
            });
            
            console.log(`Audio generado. Duración: ${hiddenAudioEl.duration} segundos.`);
            return hiddenAudioEl.duration; // Devuelve la duración total

        } catch (error) {
            console.error(error);
            statusEl.textContent = `Error al generar audio: ${error.message}`;
            return 0;
        }
    };
    
    // --- LÓGICA DE GRABACIÓN PRINCIPAL ---

    const handleRecordingStop = () => {
        if (!recorder) return;
        recorder.stopRecording(() => {
            const blob = recorder.getBlob();
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.download = `video_generado_${Date.now()}.webm`; // .webm es el formato correcto
            downloadLink.classList.remove('hidden');

            startRecordBtn.classList.remove('hidden');
            stopRecordBtn.classList.add('hidden');
            startRecordBtn.disabled = false;
            statusEl.textContent = "¡Grabación finalizada! Archivo .webm generado.";
            
            recorder.destroy();
            recorder = null;
        });
    };

    startRecordBtn.addEventListener('click', async () => {
        const fullText = mainScriptInput.value;
        if (uploadedImageFiles.length === 0) {
            statusEl.textContent = "Por favor, sube al menos una imagen.";
            return;
        }
        if (!fullText.trim()) {
            statusEl.textContent = "Por favor, escribe un guion para la narración.";
            return;
        }

        // 1. Configurar UI y deshabilitar botones
        startRecordBtn.disabled = true;
        stopRecordBtn.classList.remove('hidden');
        startRecordBtn.classList.add('hidden');
        downloadLink.classList.add('hidden');
        if(animationFrameId) cancelAnimationFrame(animationFrameId);

        // 2. FASE 1: Generar audio para obtener la duración total
        const totalDurationInSeconds = await generateFullAudioTrack(fullText);
        if (totalDurationInSeconds <= 0) {
            statusEl.textContent = "No se pudo generar el video sin audio.";
            startRecordBtn.disabled = false;
            stopRecordBtn.classList.add('hidden');
            startRecordBtn.classList.remove('hidden');
            return;
        }
        
        // 3. Calcular la duración de cada imagen
        const durationPerImageInMs = (totalDurationInSeconds * 1000) / uploadedImageFiles.length;
        const totalDurationInMs = totalDurationInSeconds * 1000;

        // 4. Crear la estructura de datos para el renderizado
        let scenesData = uploadedImageFiles.map(file => ({
            imgSrc: URL.createObjectURL(file),
            imgObject: null,
            duration: durationPerImageInMs
        }));
        
        // 5. FASE 2: Precargar imágenes
        await preloadImages(scenesData);
        
        // 6. Combinar streams de video (canvas) y audio (del elemento oculto)
        const canvasStream = previewCanvas.captureStream(30); // 30 FPS
        const audioStream = hiddenAudioEl.captureStream ? hiddenAudioEl.captureStream() : hiddenAudioEl.mozCaptureStream();

        recorder = RecordRTC([canvasStream, audioStream], {
            type: 'video',
            mimeType: 'video/webm;codecs=vp9,opus',
            disableLogs: true,
            videoBitsPerSecond: 3000000, // Calidad de video
            audioBitsPerSecond: 128000  // Calidad de audio
        });
        
        // 7. FASE 3: Iniciar grabación y bucle de renderizado
        recorder.startRecording();
        hiddenAudioEl.play(); // Reproducir el audio completo desde el inicio
        
        let startTime = Date.now();
        const renderLoop = () => {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime >= totalDurationInMs) {
                if (recorder && recorder.getState() === 'recording') { handleRecordingStop(); }
                cancelAnimationFrame(animationFrameId);
                return;
            }

            // Determinar qué imagen mostrar según el tiempo transcurrido
            const currentImageIndex = Math.min(
                Math.floor(elapsedTime / durationPerImageInMs),
                scenesData.length - 1
            );
            
            statusEl.textContent = `Grabando imagen ${currentImageIndex + 1} de ${scenesData.length}...`;
            const currentScene = scenesData[currentImageIndex];
            drawImageOnCanvas(currentScene.imgObject);

            animationFrameId = requestAnimationFrame(renderLoop);
        };
        renderLoop();
    });

    stopRecordBtn.addEventListener('click', () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        hiddenAudioEl.pause();
        hiddenAudioEl.currentTime = 0;
        if (recorder && recorder.getState() === 'recording') {
            handleRecordingStop();
        } else { // Resetear UI si se detiene antes de tiempo
            startRecordBtn.disabled = false;
            startRecordBtn.classList.remove('hidden');
            stopRecordBtn.classList.add('hidden');
            statusEl.textContent = "Grabación cancelada.";
        }
    });

    // --- INICIALIZACIÓN ---
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    imageThumbnailContainer.innerHTML = '<p class="text-gray-500 text-sm">Ninguna imagen seleccionada.</p>';
});