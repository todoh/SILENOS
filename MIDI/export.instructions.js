// ─── COPY INSTRUCTIONS FOR OTHER AIS (export.instructions.js) ───

const PROMPT_OTRAS_IAS = `ACTÚA COMO UN COMPOSITOR EXPERTO E INGENIERO MIDI.
Tu tarea es generar una composición musical basándote en la petición del usuario.
Debes devolver ÚNICAMENTE código JSON puro y estrictamente válido, sin bloques markdown (como \`\`\`json) ni explicaciones previas o posteriores. 

El sistema que leerá tu JSON soporta múltiples pistas, polifonía (acordes) y todos los parámetros MIDI de Control Change (CC) y PitchBend.

EL JSON DEBE TENER ESTA ESTRUCTURA EXACTA Y SOPORTA ESTAS VARIABLES:
{
    "bpm": 120,
    "timeSignature": [4, 4],
    "keySignature": "C",
    "tracks": [
        {
            "name": "Piano Principal",
            "program": 0,          // Número de instrumento MIDI (0-127)
            "volume": 100,         // CC7: Volumen de la pista
            "pan": 64,             // CC10: Paneo (0 izq, 64 centro, 127 der)
            "reverb": 40,          // CC91: Nivel de reverberación
            "chorus": 0,           // CC93: Nivel de chorus
            "sustain": true,       // CC64: Pedal de sustain (booleano true/false)
            "modulation": 0,       // CC1: Rueda de modulación
            "expression": 127,     // CC11: Expresión (dinámica fina)
            "portamento": false,   // CC65: Portamento (booleano)
            "resonance": 64,       // CC71: Resonancia del filtro
            "release": 64,         // CC72: Tiempo de release
            "attack": 64,          // CC73: Tiempo de ataque
            "cutoff": 64,          // CC74: Frecuencia de corte
            "pitchBend": 8192,     // Rueda de PitchBend (Rango 0 a 16383, el centro neutral es 8192)
            "customControllers": { // Mapeo libre de otros CC (ej: CC2 Breath Controller a valor 100)
                "2": 100,
                "16": 64
            },
            "notes": [
                // Para acordes, usa un array de strings en "note". start_beat indica la posición en negras (0 es el inicio)
                { "note": ["C4", "E4", "G4"], "duration": "4", "velocity": 100, "start_beat": 0 },
                // Para melodías sueltas, "note" puede ser un simple string.
                { "note": "E4", "duration": "8", "velocity": 90, "start_beat": 1 },
                { "note": "G4", "duration": "8", "velocity": 85, "start_beat": 1.5 }
            ]
        }
    ]
}`;

function inyectarBotonInstrucciones() {
  const modeSelector = document.getElementById('mode-selector');
  if (!modeSelector) return;

  // Creamos el botón con el mismo estilo base pero con un toque distintivo
  const copyBtn = document.createElement('button');
  copyBtn.className = 'mode-btn';
  copyBtn.style.marginLeft = 'auto'; // Esto lo empujará a la derecha
  copyBtn.style.color = '#0b57d0'; // Azul sutil para diferenciarlo
  copyBtn.style.borderColor = 'rgba(11, 87, 208, 0.3)';
  copyBtn.style.fontWeight = 'bold';
  copyBtn.innerHTML = '📋 Copiar Instrucciones para otras IAs';
  
  // Evento para copiar al portapapeles
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(PROMPT_OTRAS_IAS);
      const textoOriginal = copyBtn.innerHTML;
      copyBtn.innerHTML = '¡Copiado al portapapeles! ✓';
      copyBtn.style.background = 'rgba(11, 87, 208, 0.1)';
      
      setTimeout(() => {
        copyBtn.innerHTML = textoOriginal;
        copyBtn.style.background = 'transparent';
      }, 2000);
    } catch (err) {
      console.error('Fallo al copiar: ', err);
      alert('Error copiando al portapapeles. Mira la consola.');
    }
  });

  modeSelector.appendChild(copyBtn);
}

// Inyectar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inyectarBotonInstrucciones);
} else {
  inyectarBotonInstrucciones();
}