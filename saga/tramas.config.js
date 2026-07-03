/**  
 * TRAMAS CONFIG - Constantes y Configuraci n Global  
 */
const TramasConfig = {     
    nodeWidth: 180,     
    nodeHeight: 90,     
    portRadius: 6,     
    gridSpacing: 50,          
    
    // Colores por tipo de nodo (Se mantienen vibrantes y compatibles con ambos mundos)
    typeColors: {         
        'Gancho': '#0ea5e9',         
        'Contexto': '#94a3b8',         
        'Incidente': '#f43f5e',         
        'Inflexi n': '#f59e0b',         
        'Desarrollo': '#3b82f6',         
        'Obst culo': '#ef4444',         
        'Medio': '#8b5cf6',         
        'Crisis': '#1f2937',         
        'Cl max': '#d946ef',         
        'Resoluci n': '#10b981',         
        'Ep logo': '#14b8a6',         
        'General': '#9ca3af'     
    },     
    
    // Estilos de Regi n: Se adaptan din micamente en el renderizador seg n el modo activo
    regionColors: [         
        { name: 'Gris Neutro', light: '#f3f4f6', dark: '#000000' },         
        { name: 'Rojo (Acci n)', light: '#fee2e2', dark: '#450a0a' },         
        { name: 'Azul (Misterio)', light: '#e0e7ff', dark: '#1e3a8a' },         
        { name: 'Amarillo (Tensi n)', light: '#fef9c3', dark: '#78350f' },         
        { name: 'Verde (Paz)', light: '#dcfce7', dark: '#064e3b' },         
        { name: 'Morado (Magia)', light: '#f3e8ff', dark: '#4c1d95' }     
    ] 
};

window.TramasConfig = TramasConfig;