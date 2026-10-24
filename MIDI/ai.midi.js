// ════════════════════════════════════════════════════════════════
//  AGENTIC 14-CALL MIDI COMPOSER & SYNTHESIZER (ai.midi.js)
// ════════════════════════════════════════════════════════════════

const AGENTIC_STEPS_META = [
  { num: 1,  title: "Agente Director Musical: Arquitectura Maestra, Tonalidad, Instrumentación y Plan de 4 Movimientos" },
  { num: 2,  title: "Agente Compositor (Sección A): Exposición e Introducción (Compases 1-8, Beats 0-32)" },
  { num: 3,  title: "Agente Supervisor Crítico (Sección A): Auditoría Contrapuntística, Conducción de Voces y Corrección" },
  { num: 4,  title: "Agente Compositor (Sección B): Desarrollo Melódico y Polifonía (Compases 9-16, Beats 32-64)" },
  { num: 5,  title: "Agente Supervisor Crítico (Sección B): Revisión Armónica, Enlace Motívico y Perfeccionamiento" },
  { num: 6,  title: "Agente Compositor (Sección C): Clímax Dramático y Tensión Armónica (Compases 17-24, Beats 64-96)" },
  { num: 7,  title: "Agente Supervisor Crítico (Sección C): Optimización de Densidad, Rango Dinámico y Clímax" },
  { num: 8,  title: "Agente Compositor (Sección D): Resolución y Coda Final (Compases 25-32, Beats 96-128)" },
  { num: 9,  title: "Agente Supervisor Crítico (Sección D): Resolución Cadencial y Coherencia Estructural" },
  { num: 10, title: "Agente Maestro de Percusión (Canal 10): Batería Completa, Grooves, Polirritmias y Fills de Transición" },
  { num: 11, title: "Agente Bajista Principal: Línea de Bajo Profunda, Groove Armónico y Enlace Rítmico (Beats 0-128)" },
  { num: 12, title: "Agente Solista y Ornamentación: Arpegios, Contramelodías y Respuestas Expresivas" },
  { num: 13, title: "Agente de Expresión y Automatización: Curvas de Expresión (CC11), Paneo, Volumen y PitchBend" },
  { num: 14, title: "Director General (Masterización Final): Auditoría de Mezcla, Balance de Pistas y Pulido Maestro" }
];

async function sintetizarObjetoAMidiBase64(parsedData) {
  const { default: MidiWriter } = await import('https://esm.sh/midi-writer-js@2.1.4');
  const trackList = [];

  parsedData.tracks.forEach((t, index) => {
    const track = new MidiWriter.Track();
    const midiChannel = t.channel !== undefined ? t.channel : ((index % 16) + 1);

    track.setTempo(parsedData.bpm || 120);

    if (parsedData.timeSignature && Array.isArray(parsedData.timeSignature) && parsedData.timeSignature.length === 2) {
      track.setTimeSignature(parsedData.timeSignature[0], parsedData.timeSignature[1]);
    }
    if (parsedData.keySignature) {
      try { track.setKeySignature(parsedData.keySignature); } catch (e) {}
    }

    track.addTrackName(t.name || `Pista ${index + 1}`);

    if (t.program !== undefined && midiChannel !== 10) {
      track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: t.program, channel: midiChannel }));
    }
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

    if (t.pitchBend !== undefined) {
      try { track.addEvent(new MidiWriter.PitchBendEvent({ bend: t.pitchBend, channel: midiChannel })); } catch (e) {}
    }

    if (t.customControllers && typeof t.customControllers === 'object') {
      for (const [ccNum, ccVal] of Object.entries(t.customControllers)) {
        track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: parseInt(ccNum, 10), controllerValue: parseInt(ccVal, 10), channel: midiChannel }));
      }
    }

    if (t.tempoChanges && Array.isArray(t.tempoChanges)) {
      t.tempoChanges.forEach(tc => {
        let sTick = Math.round((tc.start_beat || 0) * 128);
        try { if (MidiWriter.TempoEvent) track.addEvent(new MidiWriter.TempoEvent({ bpm: tc.bpm, tick: sTick })); } catch (e) {}
      });
    }

    if (t.timeSignatureChanges && Array.isArray(t.timeSignatureChanges)) {
      t.timeSignatureChanges.forEach(tsc => {
        let sTick = Math.round((tsc.start_beat || 0) * 128);
        try {
          if (MidiWriter.TimeSignatureEvent && tsc.signature && tsc.signature.length === 2) {
            track.addEvent(new MidiWriter.TimeSignatureEvent({ numerator: tsc.signature[0], denominator: tsc.signature[1], tick: sTick }));
          }
        } catch (e) {}
      });
    }

    if (t.automation && Array.isArray(t.automation)) {
      t.automation.forEach(auto => {
        let sTick = Math.round((auto.start_beat || 0) * 128);
        try {
          if (auto.type === "pitchBend") {
            track.addEvent(new MidiWriter.PitchBendEvent({ bend: auto.value, channel: midiChannel, tick: sTick }));
          } else if (auto.type === "cc") {
            track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: auto.number, controllerValue: auto.value, channel: midiChannel, tick: sTick }));
          } else if (auto.type === "volume") {
            track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 7, controllerValue: auto.value, channel: midiChannel, tick: sTick }));
          } else if (auto.type === "pan") {
            track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 10, controllerValue: auto.value, channel: midiChannel, tick: sTick }));
          } else if (auto.type === "aftertouch") {
            if (MidiWriter.ChannelAftertouchEvent) {
              track.addEvent(new MidiWriter.ChannelAftertouchEvent({ pressure: auto.value, channel: midiChannel, tick: sTick }));
            } else {
              track.addEvent(new MidiWriter.ControllerChangeEvent({ controllerNumber: 11, controllerValue: auto.value, channel: midiChannel, tick: sTick }));
            }
          }
        } catch (e) {}
      });
    }

    if (t.textEvents && Array.isArray(t.textEvents)) {
      t.textEvents.forEach(te => {
        try {
          if (te.type === "marker" && track.addMarker) track.addMarker(te.text);
          else if (te.type === "lyric" && track.addLyric) track.addLyric(te.text);
          else if (te.type === "text" && track.addText) track.addText(te.text);
        } catch (e) {}
      });
    }

    if (t.sysex && Array.isArray(t.sysex)) {
      t.sysex.forEach(sx => {
        let sTick = Math.round((sx.start_beat || 0) * 128);
        try {
          if (MidiWriter.SysExEvent) track.addEvent(new MidiWriter.SysExEvent({ data: sx.data, tick: sTick }));
        } catch (e) {}
      });
    }

    if (t.notes && Array.isArray(t.notes)) {
      const sortedNotes = [...t.notes].sort((a, b) => (parseFloat(a.start_beat) || 0) - (parseFloat(b.start_beat) || 0));
      sortedNotes.forEach(n => {
        let startTick = Math.max(0, Math.round((parseFloat(n.start_beat) || 0) * 128));
        let pitchArray = Array.isArray(n.note) ? n.note : [n.note];
        pitchArray = pitchArray.filter(Boolean);
        if (pitchArray.length === 0) return;
        try {
          track.addEvent(new MidiWriter.NoteEvent({
            pitch: pitchArray,
            duration: String(n.duration || '4'),
            velocity: Math.min(127, Math.max(1, parseInt(n.velocity, 10) || 90)),
            startTick: startTick,
            channel: midiChannel
          }));
        } catch (e) {}
      });
    }

    trackList.push(track);
  });

  const write = new MidiWriter.Writer(trackList);
  return write.dataUri();
}

function mergeTracksIntoSong(songData, incomingTracks, minBeat = 0, maxBeat = 9999) {
  if (!incomingTracks || !Array.isArray(incomingTracks)) return;

  incomingTracks.forEach(inc => {
    let target = songData.tracks.find(
      t => (inc.channel && t.channel === inc.channel) ||
           (inc.name && t.name && t.name.toLowerCase() === inc.name.toLowerCase())
    );

    if (!target) {
      target = {
        name: inc.name || `Pista ${songData.tracks.length + 1}`,
        channel: inc.channel !== undefined ? inc.channel : ((songData.tracks.length % 15) + 1),
        program: inc.program !== undefined ? inc.program : 0,
        volume: inc.volume !== undefined ? inc.volume : 100,
        pan: inc.pan !== undefined ? inc.pan : 64,
        reverb: inc.reverb !== undefined ? inc.reverb : 35,
        notes: [],
        automation: []
      };
      songData.tracks.push(target);
    } else {
      if (inc.program !== undefined && target.channel !== 10) target.program = inc.program;
      if (inc.volume !== undefined) target.volume = inc.volume;
      if (inc.pan !== undefined) target.pan = inc.pan;
      if (inc.reverb !== undefined) target.reverb = inc.reverb;
    }

    if (inc.notes && Array.isArray(inc.notes)) {
      // Limpiamos notas existentes en el rango [minBeat, maxBeat) para evitar duplicados al supervisar/corregir
      target.notes = (target.notes || []).filter(n => {
        const sb = parseFloat(n.start_beat) || 0;
        return sb < minBeat || sb >= maxBeat;
      });
      inc.notes.forEach(n => {
        const sb = parseFloat(n.start_beat);
        if (!isNaN(sb) && n.note) {
          target.notes.push({
            note: n.note,
            duration: String(n.duration || '4'),
            velocity: Math.min(127, Math.max(1, parseInt(n.velocity, 10) || 90)),
            start_beat: sb
          });
        }
      });
      target.notes.sort((a, b) => (a.start_beat || 0) - (b.start_beat || 0));
    }

    if (inc.automation && Array.isArray(inc.automation)) {
      target.automation = target.automation || [];
      inc.automation.forEach(a => target.automation.push(a));
    }
  });
}

function buildAgentPromptForStep(stepNum, rawInput, agentState) {
  const plan = agentState.masterPlan || {};
  const song = agentState.songData || {};
  const summaryPlan = JSON.stringify({
    title: plan.title,
    bpm: plan.bpm,
    timeSignature: plan.timeSignature,
    keySignature: plan.keySignature,
    tracksPlan: plan.tracksPlan,
    sections: plan.sections
  });

  const getSectionTracksSubset = (minB, maxB) => {
    return (song.tracks || []).map(t => ({
      name: t.name,
      channel: t.channel,
      program: t.program,
      notes: (t.notes || []).filter(n => n.start_beat >= minB && n.start_beat < maxB)
    }));
  };

  switch (stepNum) {
    case 1:
      return `Actúa como el AGENTE DIRECTOR MUSICAL MAESTRO (Llamada 1/14).
Diseña la arquitectura musical maestra para esta obra solicitada por el usuario: "${rawInput}".
La obra durará exactamente 128 tiempos de negra (beats 0 a 128, divididos en 4 secciones de 32 beats cada una: Sección A [0-32], Sección B [32-64], Sección C [64-96], Sección D [96-128]).
Devuelve ÚNICAMENTE un JSON puro y válido con esta estructura exacta:
{
  "title": "Título Épico de la Obra",
  "bpm": 120,
  "timeSignature": [4, 4],
  "keySignature": "Cm",
  "styleNotes": "Directrices de orquestación, textura, contrapunto y carácter expresivo",
  "tracksPlan": [
    { "name": "Armonía / Cuerdas / Piano", "channel": 1, "program": 0, "volume": 95, "pan": 45, "reverb": 45, "role": "Acordes y conducción armónica" },
    { "name": "Melodía Principal", "channel": 2, "program": 40, "volume": 108, "pan": 75, "reverb": 50, "role": "Voz líder expresiva" },
    { "name": "Bajo Profundo", "channel": 3, "program": 33, "volume": 105, "pan": 64, "reverb": 20, "role": "Cimiento armónico y rítmico" },
    { "name": "Solista / Arpegios", "channel": 4, "program": 73, "volume": 92, "pan": 85, "reverb": 55, "role": "Contramelodías y arpegios rápidos" },
    { "name": "Batería / Percusión", "channel": 10, "program": 0, "volume": 100, "pan": 64, "reverb": 25, "role": "Percusión General MIDI Canal 10" }
  ],
  "sections": [
    { "id": "A", "name": "Exposición", "start_beat": 0, "end_beat": 32, "chords": ["Cm", "Ab", "Eb", "Bb"], "directive": "Presentación del motivo principal y atmósfera inicial" },
    { "id": "B", "name": "Desarrollo", "start_beat": 32, "end_beat": 64, "chords": ["Fm", "G7", "Cm", "Cm/Bb"], "directive": "Incremento rítmico y diálogo contrapuntístico" },
    { "id": "C", "name": "Clímax", "start_beat": 64, "end_beat": 96, "chords": ["Abmaj7", "Bb7", "Gm7", "Cm9"], "directive": "Máxima tensión emocional, registros agudos y polifonía rica" },
    { "id": "D", "name": "Resolución y Coda", "start_beat": 96, "end_beat": 128, "chords": ["Fm7", "G7b9", "Cm", "Cm"], "directive": "Desenlace cadencial y cierre magistral" }
  ]
}
Sin bloques markdown ni texto adicional.`;

    case 2:
      return `Actúa como el AGENTE COMPOSITOR DE LA SECCIÓN A [Beats 0 a 32] (Llamada 2/14).
Plan Maestro del Director: ${summaryPlan}
Compón las notas para las pistas de "Armonía" (canal 1) y "Melodía Principal" (canal 2) exclusivamente entre start_beat: 0 y start_beat: 31.75.
Usa acordes ricos (arrays de notas ej. ["C4","Eb4","G4","Bb4"]), duraciones variadas ("2", "4", "8", "16") y velocidades expresivas (65-115). Mínimo 25 eventos por pista.
Devuelve ÚNICAMENTE JSON puro:
{
  "composerNotes": "Explicación breve de los motivos creados en Sección A",
  "tracks": [
    { "name": "...", "channel": 1, "program": 0, "notes": [ { "note": ["C4","Eb4","G4"], "duration": "2", "velocity": 85, "start_beat": 0 } ] },
    { "name": "...", "channel": 2, "program": 40, "notes": [ { "note": "G5", "duration": "4", "velocity": 102, "start_beat": 0 } ] }
  ]
}`;

    case 3:
      return `Actúa como el AGENTE SUPERVISOR Y CRÍTICO MUSICAL DE LA SECCIÓN A [Beats 0 a 32] (Llamada 3/14).
Plan Maestro: ${summaryPlan}
Material actual de la Sección A [Beats 0-32]: ${JSON.stringify(getSectionTracksSubset(0, 32))}
Audita este material. Corrige notas fuera de escala, elimina monotonía rítmica, añade síncopas, notas de paso, apoyaturas y mejora la conducción de voces entre los canales 1 y 2 en el rango [0 a 32].
Devuelve ÚNICAMENTE JSON puro con las pistas corregidas y enriquecidas para [0 a 32]:
{
  "critique": "Informe de supervisión y mejoras aplicadas en Sección A",
  "tracks": [
    { "name": "...", "channel": 1, "notes": [...] },
    { "name": "...", "channel": 2, "notes": [...] }
  ]
}`;

    case 4:
      return `Actúa como el AGENTE COMPOSITOR DE LA SECCIÓN B [Beats 32 a 64] (Llamada 4/14).
Plan Maestro: ${summaryPlan}
Final de la Sección A para enlazar con fluidez: ${JSON.stringify(getSectionTracksSubset(24, 32))}
Compón las pistas de "Armonía" (canal 1) y "Melodía Principal" (canal 2) entre start_beat: 32 y start_beat: 63.75. Desarrolla el tema con mayor movimiento rítmico y contrapunto.
Devuelve ÚNICAMENTE JSON puro:
{
  "composerNotes": "Desarrollo aplicado en Sección B",
  "tracks": [
    { "name": "...", "channel": 1, "notes": [...] },
    { "name": "...", "channel": 2, "notes": [...] }
  ]
}`;

    case 5:
      return `Actúa como el AGENTE SUPERVISOR Y CRÍTICO MUSICAL DE LA SECCIÓN B [Beats 32 a 64] (Llamada 5/14).
Plan Maestro: ${summaryPlan}
Material actual de la Sección B [Beats 32-64]: ${JSON.stringify(getSectionTracksSubset(32, 64))}
Supervisa, corrige choques armónicos y enriquece el fraseo melódico y las inversiones de acordes entre start_beat: 32 y start_beat: 63.75.
Devuelve ÚNICAMENTE JSON puro:
{
  "critique": "Supervisión y mejoras aplicadas en Sección B",
  "tracks": [
    { "name": "...", "channel": 1, "notes": [...] },
    { "name": "...", "channel": 2, "notes": [...] }
  ]
}`;

    case 6:
      return `Actúa como el AGENTE COMPOSITOR DE LA SECCIÓN C - CLÍMAX [Beats 64 a 96] (Llamada 6/14).
Plan Maestro: ${summaryPlan}
Final de la Sección B: ${JSON.stringify(getSectionTracksSubset(56, 64))}
Compón el CLÍMAX de la obra para los canales 1 y 2 entre start_beat: 64 y start_beat: 95.75. Emplea acordes amplios, velocidades intensas (95-125) y figuraciones apasionadas en corcheas y semicorcheas.
Devuelve ÚNICAMENTE JSON puro:
{
  "composerNotes": "Construcción del clímax en Sección C",
  "tracks": [
    { "name": "...", "channel": 1, "notes": [...] },
    { "name": "...", "channel": 2, "notes": [...] }
  ]
}`;

    case 7:
      return `Actúa como el AGENTE SUPERVISOR Y CRÍTICO MUSICAL DE LA SECCIÓN C [Beats 64 a 96] (Llamada 7/14).
Plan Maestro: ${summaryPlan}
Material actual del Clímax [Beats 64-96]: ${JSON.stringify(getSectionTracksSubset(64, 96))}
Perfecciona la tensión dramática, asegura que el punto culminante hacia el beat 88-92 sea inolvidable y pule la polifonía de los canales 1 y 2 entre 64 y 95.75.
Devuelve ÚNICAMENTE JSON puro:
{
  "critique": "Auditoría de clímax y mejoras en Sección C",
  "tracks": [
    { "name": "...", "channel": 1, "notes": [...] },
    { "name": "...", "channel": 2, "notes": [...] }
  ]
}`;

    case 8:
      return `Actúa como el AGENTE COMPOSITOR DE LA SECCIÓN D - RESOLUCIÓN Y CODA [Beats 96 a 128] (Llamada 8/14).
Plan Maestro: ${summaryPlan}
Final del Clímax: ${JSON.stringify(getSectionTracksSubset(88, 96))}
Compón el desenlace y gran cadencia final para los canales 1 y 2 entre start_beat: 96 y start_beat: 128. Concluye en el compás final (beats 120-128) con un acorde resolutivo largo ("1").
Devuelve ÚNICAMENTE JSON puro:
{
  "composerNotes": "Resolución y coda en Sección D",
  "tracks": [
    { "name": "...", "channel": 1, "notes": [...] },
    { "name": "...", "channel": 2, "notes": [...] }
  ]
}`;

    case 9:
      return `Actúa como el AGENTE SUPERVISOR Y CRÍTICO MUSICAL DE LA SECCIÓN D [Beats 96 a 128] (Llamada 9/14).
Plan Maestro: ${summaryPlan}
Material actual de la Coda [Beats 96-128]: ${JSON.stringify(getSectionTracksSubset(96, 128))}
Audita la cadencia final, refina el diminuendo o gran acorde de cierre y asegura una conclusión magistral en los canales 1 y 2 entre 96 y 128.
Devuelve ÚNICAMENTE JSON puro:
{
  "critique": "Revisión de cadencia final en Sección D",
  "tracks": [
    { "name": "...", "channel": 1, "notes": [...] },
    { "name": "...", "channel": 2, "notes": [...] }
  ]
}`;

    case 10:
      return `Actúa como el AGENTE MAESTRO DE PERCUSIÓN (Canal 10) (Llamada 10/14).
Plan Maestro: ${summaryPlan}
Compón la pista completa de Batería y Percusión en el CANAL 10 desde start_beat: 0 hasta start_beat: 128.
Usa el estándar General MIDI (C2=36 Bombo/Kick, D2=38 Caja/Snare, F#2=42 Closed Hi-Hat, A#2=46 Open Hi-Hat, C#3=49 Crash). Puedes usar notación ["C2", "F#2"] para golpes simultáneos.
Adapta la intensidad a las 4 secciones (A: sutil, B: groove firme, C: clímax energético con redobles/fills en beats 30-32, 62-64, 94-96, D: cierre cadencial).
Devuelve ÚNICAMENTE JSON puro:
{
  "critique": "Diseño rítmico y fills de percusión en Canal 10",
  "tracks": [
    {
      "name": "Batería / Percusión",
      "channel": 10,
      "program": 0,
      "volume": 100,
      "pan": 64,
      "notes": [
        { "note": ["C2", "C#3"], "duration": "4", "velocity": 110, "start_beat": 0 }
      ]
    }
  ]
}`;

    case 11:
      return `Actúa como el AGENTE BAJISTA PRINCIPAL (Canal 3) (Llamada 11/14).
Plan Maestro: ${summaryPlan}
Compón la línea completa de Bajo Profundo (Canal 3) desde start_beat: 0 hasta start_beat: 128 en las octavas 1 y 2 (ej. "C2", "G1", "Ab1", "Bb1").
Sigue rigurosamente los acordes de las secciones A, B, C y D, conectando las fundamentales con walking bass, octavas o figuras sincopadas que empasten con el bombo.
Devuelve ÚNICAMENTE JSON puro:
{
  "critique": "Construcción de la línea de bajo (Beats 0-128)",
  "tracks": [
    {
      "name": "Bajo Profundo",
      "channel": 3,
      "program": 33,
      "volume": 105,
      "pan": 64,
      "notes": [...]
    }
  ]
}`;

    case 12:
      return `Actúa como el AGENTE DE CONTRAMELODÍAS, ARPEGIOS Y ORNAMENTACIÓN (Canal 4) (Llamada 12/14).
Plan Maestro: ${summaryPlan}
Compón la pista de Solista / Arpegios / Texturas (Canal 4) desde start_beat: 0 hasta start_beat: 128.
Añade arpegios cristalinos en semicorcheas ("16") o corcheas ("8") y contramelodías que respondan a la voz principal sin taparla.
Devuelve ÚNICAMENTE JSON puro:
{
  "critique": "Ornamentación, arpegios y contrapunto secundario añadido en Canal 4",
  "tracks": [
    {
      "name": "Solista / Arpegios",
      "channel": 4,
      "program": 73,
      "volume": 90,
      "pan": 82,
      "notes": [...]
    }
  ]
}`;

    case 13:
      return `Actúa como el AGENTE DE EXPRESIÓN DINÁMICA Y AUTOMATIZACIÓN MIDI (Llamada 13/14).
Plan Maestro: ${summaryPlan}
Pistas actuales: ${(song.tracks || []).map(t => `${t.name} (Canal${t.channel})`).join(', ')}.
Genera curvas de automatización expresiva (crescendos hacia el beat 64, clímax en 64-96, diminuendo suave o cierre en 120-128, modulación CC1, expresión CC11 y sutiles PitchBends en la melodía).
Devuelve ÚNICAMENTE JSON puro:
{
  "critique": "Curvas de expresión CC11, modulación CC1 y PitchBend inyectadas",
  "automationByChannel": {
    "1": [ { "type": "cc", "number": 11, "value": 85, "start_beat": 0 }, { "type": "cc", "number": 11, "value": 125, "start_beat": 64 } ],
    "2": [ { "type": "cc", "number": 1, "value": 65, "start_beat": 64 }, { "type": "pitchBend", "value": 8600, "start_beat": 72 }, { "type": "pitchBend", "value": 8192, "start_beat": 73 } ]
  },
  "textEvents": [
    { "type": "marker", "text": "Seccion A: Exposicion", "start_beat": 0 },
    { "type": "marker", "text": "Seccion B: Desarrollo", "start_beat": 32 },
    { "type": "marker", "text": "Seccion C: Climax", "start_beat": 64 },
    { "type": "marker", "text": "Seccion D: Coda", "start_beat": 96 }
  ]
}`;

    case 14:
      return `Actúa como el DIRECTOR GENERAL EN FASE DE AUDITORÍA Y MASTERIZACIÓN FINAL (Llamada 14/14).
Plan Maestro: ${summaryPlan}
Resumen de la obra completada: ${(song.tracks || []).map(t => ({ name: t.name, channel: t.channel, program: t.program, volume: t.volume, pan: t.pan, reverb: t.reverb, totalNotes: (t.notes || []).length }))}
Realiza el balance final de mezcla (volúmenes óptimos 0-127, panorama estéreo equilibrado 0-127, reverberación CC91 y ajustes de programa GM si procede) para garantizar una masterización cristalina.
Devuelve ÚNICAMENTE JSON puro:
{
  "critique": "Veredicto final del Director y ajustes de masterización aplicados",
  "finalBpm": ${song.bpm || 120},
  "trackMix": [
    { "channel": 1, "volume": 92, "pan": 42, "reverb": 45 },
    { "channel": 2, "volume": 112, "pan": 76, "reverb": 55 },
    { "channel": 3, "volume": 106, "pan": 64, "reverb": 18 },
    { "channel": 4, "volume": 88, "pan": 86, "reverb": 50 },
    { "channel": 10, "volume": 98, "pan": 64, "reverb": 25 }
  ]
}`;
  }
}

window.detenerMidiAgentico = function(msgId) {
  const conv = getActiveConv();
  if (!conv) return;
  const msg = conv.messages.find(m => m.id === msgId);
  if (msg && msg.agentState) {
    msg.agentState.isGenerating = false;
    save();
    if (window.actualizarMensajeUI) window.actualizarMensajeUI(msgId);
    if (window.ProgressBar) ProgressBar.hide();
  }
};

window.procesarMidi = async function(rawInput, ts, msgId) {
  const conv = getActiveConv();
  if (!conv) return;
  let msg = conv.messages.find(m => m.id === msgId);
  if (!msg) return;

  if (!msg.agentState) {
    msg.agentState = {
      currentStep: 1,
      totalSteps: 14,
      isGenerating: true,
      completed: false,
      rawInput: rawInput || msg.rawInput || '',
      logs: [],
      masterPlan: null,
      songData: {
        title: "Composición en Proceso...",
        bpm: 120,
        timeSignature: [4, 4],
        keySignature: "C",
        tracks: []
      }
    };
  } else {
    msg.agentState.isGenerating = true;
    rawInput = msg.agentState.rawInput || rawInput;
  }

  save();
  if (window.actualizarMensajeUI) window.actualizarMensajeUI(msgId);
  if (window.ProgressBar) ProgressBar.show("Iniciando Sistema Agéntico Musical (14 Llamadas)...");

  try {
    while (msg.agentState.currentStep <= msg.agentState.totalSteps) {
      if (!msg.agentState.isGenerating) {
        if (window.ProgressBar) ProgressBar.hide();
        return;
      }

      const step = msg.agentState.currentStep;
      const meta = AGENTIC_STEPS_META[step - 1];
      const pct = Math.round(((step - 1) / 14) * 100);

      if (window.ProgressBar) {
        ProgressBar.update(pct, `Llamada ${step}/14 · ${meta.title.slice(0, 52)}...`);
      }

      const prompt = buildAgentPromptForStep(step, rawInput, msg.agentState);
      const res = await fetchGemini(prompt);

      if (window.addLog) {
        addLog({
          status: 'ok',
          model: state.selectedModel,
          ts: new Date().toISOString(),
          prompt: `[Agente MIDI ${step}/14] ${rawInput.slice(0, 40)}`,
          tokens: res.usage
        });
      }

      const data = extractJsonData(res.text);
      if (!data) {
        throw new Error(`El Agente en la llamada ${step}/14 no devolvió un JSON válido.`);
      }

      // Procesar respuesta según el paso agéntico
      if (step === 1) {
        msg.agentState.masterPlan = data;
        msg.agentState.songData.title = data.title || "Obra Agéntica Silenos";
        msg.agentState.songData.bpm = data.bpm || 120;
        msg.agentState.songData.timeSignature = data.timeSignature || [4, 4];
        msg.agentState.songData.keySignature = data.keySignature || "C";
        msg.agentState.songData.tracks = (data.tracksPlan || []).map(tp => ({
          name: tp.name,
          channel: tp.channel,
          program: tp.program || 0,
          volume: tp.volume || 100,
          pan: tp.pan !== undefined ? tp.pan : 64,
          reverb: tp.reverb !== undefined ? tp.reverb : 40,
          notes: [],
          automation: []
        }));
        msg.agentState.logs.push(`✔ [1/14] Dirección Maestra: "${msg.agentState.songData.title}" (${msg.agentState.songData.bpm} BPM, Tonalidad ${msg.agentState.songData.keySignature}). ${data.styleNotes || ''}`);
      } else if (step === 2 || step === 3) {
        mergeTracksIntoSong(msg.agentState.songData, data.tracks, 0, 32);
        msg.agentState.logs.push(`✔ [${step}/14] ${step === 2 ? 'Composición' : 'Supervisión Activa'} Sección A [0-32]: ${data.composerNotes || data.critique || 'Completado.'}`);
      } else if (step === 4 || step === 5) {
        mergeTracksIntoSong(msg.agentState.songData, data.tracks, 32, 64);
        msg.agentState.logs.push(`✔ [${step}/14] ${step === 4 ? 'Composición' : 'Supervisión Activa'} Sección B [32-64]: ${data.composerNotes || data.critique || 'Completado.'}`);
      } else if (step === 6 || step === 7) {
        mergeTracksIntoSong(msg.agentState.songData, data.tracks, 64, 96);
        msg.agentState.logs.push(`✔ [${step}/14] ${step === 6 ? 'Composición' : 'Supervisión Activa'} Sección C [64-96]: ${data.composerNotes || data.critique || 'Completado.'}`);
      } else if (step === 8 || step === 9) {
        mergeTracksIntoSong(msg.agentState.songData, data.tracks, 96, 132);
        msg.agentState.logs.push(`✔ [${step}/14] ${step === 8 ? 'Composición' : 'Supervisión Activa'} Sección D [96-128]: ${data.composerNotes || data.critique || 'Completado.'}`);
      } else if (step === 10 || step === 11 || step === 12) {
        mergeTracksIntoSong(msg.agentState.songData, data.tracks, 0, 132);
        msg.agentState.logs.push(`✔ [${step}/14] Especialista Instrumental: ${data.critique || 'Pista integrada.'}`);
      } else if (step === 13) {
        if (data.automationByChannel && typeof data.automationByChannel === 'object') {
          for (const [chStr, autoArr] of Object.entries(data.automationByChannel)) {
            const ch = parseInt(chStr, 10);
            const t = msg.agentState.songData.tracks.find(x => x.channel === ch);
            if (t && Array.isArray(autoArr)) {
              t.automation = autoArr;
            }
          }
        }
        if (data.textEvents && Array.isArray(data.textEvents) && msg.agentState.songData.tracks[0]) {
          msg.agentState.songData.tracks[0].textEvents = data.textEvents;
        }
        msg.agentState.logs.push(`✔ [13/14] Automatización y Expresión: ${data.critique || 'Curvas aplicadas.'}`);
      } else if (step === 14) {
        if (data.finalBpm) msg.agentState.songData.bpm = data.finalBpm;
        if (data.trackMix && Array.isArray(data.trackMix)) {
          data.trackMix.forEach(tm => {
            const t = msg.agentState.songData.tracks.find(x => x.channel === tm.channel);
            if (t) {
              if (tm.volume !== undefined) t.volume = tm.volume;
              if (tm.pan !== undefined) t.pan = tm.pan;
              if (tm.reverb !== undefined) t.reverb = tm.reverb;
            }
          });
        }
        msg.agentState.logs.push(`✔ [14/14] Masterización Final del Director: ${data.critique || 'Mezcla finalizada.'}`);
      }

      // Sintetizamos vista previa parcial en tiempo real tras cada llamada
      msg.content = JSON.stringify(msg.agentState.songData, null, 2);
      try {
        msg.midiData = await sintetizarObjetoAMidiBase64(msg.agentState.songData);
      } catch (synthErr) {
        console.warn("Aviso sintetizando previsualización MIDI:", synthErr);
      }

      msg.agentState.currentStep++;
      if (msg.agentState.currentStep > msg.agentState.totalSteps) {
        msg.agentState.completed = true;
        msg.agentState.isGenerating = false;

        if (window.MidiPlayer) {
          window.MidiPlayer.saveToLibrary({
            id: msg.id,
            title: msg.agentState.songData.title || rawInput.slice(0, 40),
            created: Date.now(),
            songData: msg.agentState.songData,
            midiData: msg.midiData
          });
        }
      }

      save();
      if (window.actualizarMensajeUI) window.actualizarMensajeUI(msgId);
    }

    if (window.ProgressBar) ProgressBar.update(100, "¡Obra Maestra MIDI Completada (14/14 Llamadas)!");
    setTimeout(() => { if (window.ProgressBar) ProgressBar.hide(); }, 1500);

  } catch (err) {
    if (msg.agentState) msg.agentState.isGenerating = false;
    msg.content = JSON.stringify(msg.agentState?.songData || {}, null, 2);
    msg.errorText = "Error en llamada agéntica: " + err.message;
    save();
    if (window.actualizarMensajeUI) window.actualizarMensajeUI(msgId);
    if (window.ProgressBar) ProgressBar.hide();
    throw err;
  }
};

// ════════════════════════════════════════════════════════════════
//  CONVERSOR DIRECTO JSON -> MIDI
// ════════════════════════════════════════════════════════════════

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

    if (window.ProgressBar) ProgressBar.update(50, "Sintetizando archivo MIDI y cargando reproductor...");
    const base64Midi = await sintetizarObjetoAMidiBase64(parsedData);

    msg.midiData = base64Midi;
    msg.content = JSON.stringify(parsedData, null, 2);
    msg.agentState = {
      currentStep: 14,
      totalSteps: 14,
      isGenerating: false,
      completed: true,
      logs: ["✔ JSON convertido directamente a MIDI y cargado en el sintetizador."],
      songData: parsedData
    };
    save();

    if (window.MidiPlayer) {
      window.MidiPlayer.saveToLibrary({
        id: msg.id,
        title: parsedData.title || `Conversión Directa (${parsedData.bpm || 120} BPM)`,
        created: Date.now(),
        songData: parsedData,
        midiData: base64Midi
      });
    }

    if (window.actualizarMensajeUI) window.actualizarMensajeUI(msgId);
    if (window.ProgressBar) ProgressBar.update(100, "¡MIDI Convertido!");
    setTimeout(() => { if (window.ProgressBar) ProgressBar.hide(); }, 1200);

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