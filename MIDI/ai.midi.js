// ─── AI MIDI MODE (ai.midi.js) ───────────────────────────────

window.procesarMidi = async function(rawInput, ts, msgId) {
  const conv = getActiveConv();
  let msg = conv.messages.find(m => m.id === msgId);
  if (!msg) return;

  if (window.ProgressBar) ProgressBar.show("Invocando a Gemini para composición...");

  try {
    const promptMidi = `Actúa como un compositor experto e ingeniero MIDI. Genera una estructura musical en formato JSON estrictamente válido basándote en esta petición: "${rawInput}".
    
EL JSON DEBE TENER ESTA ESTRUCTURA EXACTA (puedes usar múltiples pistas, acordes y controles como attack, release, reverb, chorus. También puedes usar "pitchBend" (0 a 16383, centro en 8192) y "customControllers" mapeando el número de CC a su valor):
{
    "bpm": 120,
    "timeSignature": [4, 4],
    "keySignature": "C",
    "tracks": [
        {
            "name": "Piano",
            "program": 0,
            "volume": 100,
            "pan": 64,
            "reverb": 40,
            "pitchBend": 8192,
            "customControllers": { "1": 127, "11": 100 },
            "notes": [
                { "note": ["C4", "E4", "G4"], "duration": "4", "velocity": 100, "start_beat": 0 },
                { "note": "E4", "duration": "4", "velocity": 100, "start_beat": 1 }
            ]
        }
    ]
}
Devuelve ÚNICAMENTE código JSON puro, sin bloques markdown (como \`\`\`json), sin explicaciones.`;

    const resTexto = await fetchGemini(promptMidi);
    
    if (window.ProgressBar) ProgressBar.update(40, "Analizando estructura musical devuelta...");
    
    let parsedData = extractJsonData(resTexto.text); 
    
    if (!parsedData || !parsedData.tracks) {
        throw new Error("Gemini no devolvió un JSON musical válido.");
    }

    if (window.ProgressBar) ProgressBar.update(60, "Sintetizando archivo MIDI (Importando módulos)...");

    const { default: MidiWriter } = await import('https://esm.sh/midi-writer-js@2.1.4');

    if (window.ProgressBar) ProgressBar.update(80, "Escribiendo pistas, notas y controles...");

    const trackList = [];
    parsedData.tracks.forEach((t, index) => {
        const track = new MidiWriter.Track();
        const midiChannel = (index % 16) + 1; 

        track.setTempo(parsedData.bpm || 120);
        
        if (parsedData.timeSignature && Array.isArray(parsedData.timeSignature) && parsedData.timeSignature.length === 2) {
            track.setTimeSignature(parsedData.timeSignature[0], parsedData.timeSignature[1]);
        }
        
        if (parsedData.keySignature) {
            track.setKeySignature(parsedData.keySignature);
        }

        track.addTrackName(t.name || `Pista ${index + 1}`);

        if (t.program !== undefined) track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: t.program, channel: midiChannel }));
        if (t.volume !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 7, controllerValue: t.volume, channel: midiChannel }));
        if (t.pan !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 10, controllerValue: t.pan, channel: midiChannel }));
        if (t.sustain !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 64, controllerValue: t.sustain ? 127 : 0, channel: midiChannel }));
        if (t.modulation !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 1, controllerValue: t.modulation, channel: midiChannel }));
        if (t.expression !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 11, controllerValue: t.expression, channel: midiChannel }));
        if (t.reverb !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 91, controllerValue: t.reverb, channel: midiChannel }));
        if (t.chorus !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 93, controllerValue: t.chorus, channel: midiChannel }));
        if (t.portamento !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 65, controllerValue: t.portamento ? 127 : 0, channel: midiChannel }));
        if (t.resonance !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 71, controllerValue: t.resonance, channel: midiChannel }));
        if (t.release !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 72, controllerValue: t.release, channel: midiChannel }));
        if (t.attack !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 73, controllerValue: t.attack, channel: midiChannel }));
        if (t.cutoff !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 74, controllerValue: t.cutoff, channel: midiChannel }));

        // ─── NUEVAS POSIBILIDADES GLOBALES ───
        if (t.pitchBend !== undefined) {
            track.addEvent(new MidiWriter.PitchBendEvent({ bend: t.pitchBend, channel: midiChannel }));
        }
        if (t.customControllers && typeof t.customControllers === 'object') {
            for (const [ccNum, ccVal] of Object.entries(t.customControllers)) {
                track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: parseInt(ccNum, 10), controllerValue: parseInt(ccVal, 10), channel: midiChannel }));
            }
        }

        if (t.notes && Array.isArray(t.notes)) {
            t.notes.forEach((n) => {
                let startTick = Math.round((n.start_beat || 0) * 128);
                let pitchArray = Array.isArray(n.note) ? n.note : [n.note];

                track.addEvent(new MidiWriter.NoteEvent({
                    pitch: pitchArray,
                    duration: n.duration || '4',
                    velocity: parseInt(n.velocity) || 90,
                    startTick: startTick,
                    channel: midiChannel
                }));
            });
        }
        trackList.push(track);
    });

    const write = new MidiWriter.Writer(trackList);
    const base64Midi = write.dataUri(); 

    msg.midiData = base64Midi;
    msg.content = JSON.stringify(parsedData, null, 2);
    save();
    
    if (window.actualizarMensajeUI) window.actualizarMensajeUI(msgId);
    if (window.ProgressBar) ProgressBar.update(100, "¡MIDI Completado!");
    setTimeout(() => { if (window.ProgressBar) ProgressBar.hide(); }, 1200);

    if (window.addLog) addLog({ status: 'ok', model: state.selectedModel, ts: new Date().toISOString(), prompt: rawInput.substring(0, 25), tokens: resTexto.usage });

  } catch (err) {
    msg.content = "Error generando MIDI: " + err.message + "\n\nRespuesta bruta de la IA: " + (err.text || "");
    save();
    if (window.actualizarMensajeUI) window.actualizarMensajeUI(msgId);
    if (window.ProgressBar) ProgressBar.hide();
    throw err;
  }
};


// ─── NUEVO: CONVERSOR DIRECTO JSON -> MIDI ─────────────────────
window.procesarJsonAMidi = async function(rawInput, msgId) {
  const conv = getActiveConv();
  let msg = conv.messages.find(m => m.id === msgId);
  if (!msg) return;

  if (window.ProgressBar) ProgressBar.show("Analizando JSON introducido...");

  try {
    let parsedData = extractJsonData(rawInput); 
    
    if (!parsedData || !parsedData.tracks) {
        throw new Error("El texto introducido no es un JSON musical válido o le faltan las pistas ('tracks').");
    }

    if (window.ProgressBar) ProgressBar.update(40, "Sintetizando archivo MIDI...");

    const { default: MidiWriter } = await import('https://esm.sh/midi-writer-js@2.1.4');

    if (window.ProgressBar) ProgressBar.update(80, "Generando pistas y eventos desde el JSON...");

    const trackList = [];
    parsedData.tracks.forEach((t, index) => {
        const track = new MidiWriter.Track();
        const midiChannel = (index % 16) + 1; 

        track.setTempo(parsedData.bpm || 120);
        
        if (parsedData.timeSignature && Array.isArray(parsedData.timeSignature) && parsedData.timeSignature.length === 2) {
            track.setTimeSignature(parsedData.timeSignature[0], parsedData.timeSignature[1]);
        }
        
        if (parsedData.keySignature) {
            track.setKeySignature(parsedData.keySignature);
        }

        track.addTrackName(t.name || `Pista ${index + 1}`);

        if (t.program !== undefined) track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: t.program, channel: midiChannel }));
        if (t.volume !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 7, controllerValue: t.volume, channel: midiChannel }));
        if (t.pan !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 10, controllerValue: t.pan, channel: midiChannel }));
        if (t.sustain !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 64, controllerValue: t.sustain ? 127 : 0, channel: midiChannel }));
        if (t.modulation !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 1, controllerValue: t.modulation, channel: midiChannel }));
        if (t.expression !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 11, controllerValue: t.expression, channel: midiChannel }));
        if (t.reverb !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 91, controllerValue: t.reverb, channel: midiChannel }));
        if (t.chorus !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 93, controllerValue: t.chorus, channel: midiChannel }));
        if (t.portamento !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 65, controllerValue: t.portamento ? 127 : 0, channel: midiChannel }));
        if (t.resonance !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 71, controllerValue: t.resonance, channel: midiChannel }));
        if (t.release !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 72, controllerValue: t.release, channel: midiChannel }));
        if (t.attack !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 73, controllerValue: t.attack, channel: midiChannel }));
        if (t.cutoff !== undefined) track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 74, controllerValue: t.cutoff, channel: midiChannel }));

        // ─── NUEVAS POSIBILIDADES GLOBALES ───
        if (t.pitchBend !== undefined) {
            track.addEvent(new MidiWriter.PitchBendEvent({ bend: t.pitchBend, channel: midiChannel }));
        }
        if (t.customControllers && typeof t.customControllers === 'object') {
            for (const [ccNum, ccVal] of Object.entries(t.customControllers)) {
                track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: parseInt(ccNum, 10), controllerValue: parseInt(ccVal, 10), channel: midiChannel }));
            }
        }

        if (t.notes && Array.isArray(t.notes)) {
            t.notes.forEach((n) => {
                let startTick = Math.round((n.start_beat || 0) * 128);
                let pitchArray = Array.isArray(n.note) ? n.note : [n.note];

                track.addEvent(new MidiWriter.NoteEvent({
                    pitch: pitchArray,
                    duration: n.duration || '4',
                    velocity: parseInt(n.velocity) || 90,
                    startTick: startTick,
                    channel: midiChannel
                }));
            });
        }
        trackList.push(track);
    });

    const write = new MidiWriter.Writer(trackList);
    const base64Midi = write.dataUri(); 

    msg.midiData = base64Midi;
    msg.content = JSON.stringify(parsedData, null, 2);
    save();
    
    if (window.actualizarMensajeUI) window.actualizarMensajeUI(msgId);
    if (window.ProgressBar) ProgressBar.update(100, "¡MIDI Convertido!");
    setTimeout(() => { if (window.ProgressBar) ProgressBar.hide(); }, 1200);

    // DESCARGA AUTOMÁTICA DEL MIDI AL TERMINAR
    const a = document.createElement('a');
    a.href = base64Midi;
    a.download = `Silenos_Convertido_${Date.now()}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

  } catch (err) {
    msg.content = "Error generando MIDI desde JSON: " + err.message;
    save();
    if (window.actualizarMensajeUI) window.actualizarMensajeUI(msgId);
    if (window.ProgressBar) ProgressBar.hide();
    throw err;
  }
};