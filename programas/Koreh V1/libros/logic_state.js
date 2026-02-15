// --- LÓGICA DE ESTADO (BASE) ---
const core = {
    projectData: { 
        timeline: null, 
        knowledgeBase: [], 
        eventsQueue: [], 
        currentEventIndex: 0, 
        currentMomentIndex: 0, 
        runningContext: "Inicio.", 
        lastParagraphs: "", 
        processedMoments: 0, 
        totalMoments: 0 
    },
    currentBookId: null,
    bookFileHandle: null, // Handle del archivo JSON de salida
    bookData: {}          // Objeto estructurado del libro
};