/**
 * TRAMAS CONFIG - Constantes y Configuración Global
 */
const TramasConfig = {
    nodeWidth: 180,
    nodeHeight: 90,
    portRadius: 6,
    gridSpacing: 50,
    
    // Colores por tipo de nodo
    typeColors: {
        'Gancho': '#0ea5e9',
        'Contexto': '#94a3b8',
        'Incidente': '#f43f5e',
        'Inflexión': '#f59e0b',
        'Desarrollo': '#3b82f6',
        'Obstáculo': '#ef4444',
        'Medio': '#8b5cf6',
        'Crisis': '#1f2937',
        'Clímax': '#d946ef',
        'Resolución': '#10b981',
        'Epílogo': '#14b8a6',
        'General': '#9ca3af'
    },

    // Estilos de Región
    regionColors: [
        { name: 'Gris Claro (Neutro)', value: '#f3f4f6' },
        { name: 'Rojo Suave (Acción)', value: '#fee2e2' },
        { name: 'Azul Suave (Misterio)', value: '#e0e7ff' },
        { name: 'Amarillo Suave (Tensión)', value: '#fef9c3' },
        { name: 'Verde Suave (Paz)', value: '#dcfce7' },
        { name: 'Morado Suave (Magia)', value: '#f3e8ff' }
    ]
};

window.TramasConfig = TramasConfig;