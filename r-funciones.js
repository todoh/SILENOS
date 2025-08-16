function updateCollisionFieldsVisibility() {
    const tipo = editorDOM.editColisionTipoSelect.value;
    const radioContainer = document.getElementById('edit-colision-radio-container');
    const alturaContainer = document.getElementById('edit-colision-altura-container');

    radioContainer.style.display = (tipo === 'capsula' || tipo === 'esfera') ? 'block' : 'none';
    alturaContainer.style.display = (tipo === 'capsula' || tipo === 'caja') ? 'block' : 'none';
}

function renderizarRutaMovimiento(ruta) {
    const listaEl = document.getElementById('edit-movimiento-lista');
    listaEl.innerHTML = '';

    if (!ruta || ruta.length === 0) {
        listaEl.innerHTML = '<p style="color: #999; font-style: italic;">Sin ruta de movimiento.</p>';
        return;
    }

    ruta.forEach((paso, index) => {
        const pasoEl = document.createElement('div');
        pasoEl.className = 'ruta-paso';
        pasoEl.dataset.tipo = paso.tipo;

        let textoPaso = '';
        if (paso.tipo === 'aleatorio') {
            const duracionTexto = paso.duracion === null ? '(infinito)' : `(${paso.duracion}s)`;
            textoPaso = `Movimiento Aleatorio ${duracionTexto}`;
            pasoEl.dataset.duracion = paso.duracion;
        } else if (paso.tipo === 'ir_a') {
            textoPaso = `Ir a Coordenada (X: ${paso.coordenadas.x}, Z: ${paso.coordenadas.z})`;
            pasoEl.dataset.x = paso.coordenadas.x;
            pasoEl.dataset.z = paso.coordenadas.z;
        }

        pasoEl.innerHTML = `<span>${index + 1}. ${textoPaso}</span> <button title="Eliminar paso">&times;</button>`;
        pasoEl.querySelector('button').onclick = () => {
            ruta.splice(index, 1);
            renderizarRutaMovimiento(ruta);
        };

        listaEl.appendChild(pasoEl);
    });
}