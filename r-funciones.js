function updateCollisionFieldsVisibility() {
    const tipo = editorDOM.editColisionTipoSelect.value;
    const radioContainer = document.getElementById('edit-colision-radio-container');
    const alturaContainer = document.getElementById('edit-colision-altura-container');

    radioContainer.style.display = (tipo === 'capsula' || tipo === 'esfera') ? 'block' : 'none';
    alturaContainer.style.display = (tipo === 'capsula' || tipo === 'caja') ? 'block' : 'none';
}