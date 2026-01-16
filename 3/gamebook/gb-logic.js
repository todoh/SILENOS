/* SILENOS 3/gamebook/gb-logic.js */
window.GB_Logic = {
    COMPONENT_CODE: `
        // --- COMPONENTE PRINCIPAL ---
        function GamebookMaker() {
            const [scenes, setScenes] = useState([]);
            const [projectTitle, setProjectTitle] = useState(initialTitle);
            const [startSceneId, setStartSceneId] = useState('start');
            const [selectedSceneId, setSelectedSceneId] = useState(null);
            const [isPlaying, setIsPlaying] = useState(false);
            const [playHistory, setPlayHistory] = useState([]);
            const [isLoaded, setIsLoaded] = useState(false);
            
            // Canvas state
            const [viewport, setViewport] = useState({ x: 0, y: 0, k: 1 });
            const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
            const [draggingNodeId, setDraggingNodeId] = useState(null);
            const dragStartRef = useRef({ x: 0, y: 0 }); 
            const itemStartRef = useRef({ x: 0, y: 0 });
            const canvasRef = useRef(null);

            // --- PERSISTENCIA (POSTMESSAGE) ---
            useEffect(() => {
                const handleMsg = (e) => {
                    if (e.data && e.data.type === 'load') {
                        const content = e.data.content;
                        if (content) {
                            setScenes(content.scenes || []);
                            setProjectTitle(content.title || 'Aventura');
                            setStartSceneId(content.startSceneId || 'start');
                            setSelectedSceneId(content.startSceneId || (content.scenes && content.scenes[0] ? content.scenes[0].id : null));
                            setIsLoaded(true);
                        }
                    }
                };
                window.addEventListener('message', handleMsg);
                window.parent.postMessage({ type: 'ready', id: FILE_ID }, '*');
                return () => window.removeEventListener('message', handleMsg);
            }, []);

            useEffect(() => {
                if (!isLoaded) return;
                const timeoutId = setTimeout(() => {
                    window.parent.postMessage({
                        type: 'save',
                        id: FILE_ID,
                        content: { title: projectTitle, scenes, startSceneId }
                    }, '*');
                }, 1000);
                return () => clearTimeout(timeoutId);
            }, [scenes, projectTitle, startSceneId, isLoaded]);

            // --- FUNCIONES LÓGICAS ---
            const addScene = (x = null, y = null) => {
                if (x === null || y === null) {
                    const rect = canvasRef.current ? canvasRef.current.getBoundingClientRect() : { width: 800, height: 600 };
                    x = ((rect.width / 2) - viewport.x) / viewport.k;
                    y = ((rect.height / 2) - viewport.y) / viewport.k;
                }
                const newId = 'scene-' + Date.now();
                setScenes([...scenes, { id: newId, title: 'Nueva Escena', text: '', image: '', choices: [], x, y }]);
                setSelectedSceneId(newId);
                return newId;
            };

            const deleteScene = (id) => {
                if (id === startSceneId) return alert("No puedes borrar la escena de INICIO.");
                if (confirm('¿Borrar escena?')) {
                    setScenes(prev => prev.filter(s => s.id !== id).map(s => ({
                        ...s, choices: s.choices.filter(c => c.targetId !== id)
                    })));
                    setSelectedSceneId(startSceneId);
                }
            };

            const updateScene = (id, field, value) => {
                setScenes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
            };

            const addChoice = (sceneId) => {
                const scene = scenes.find(s => s.id === sceneId);
                updateScene(sceneId, 'choices', [...scene.choices, { id: 'choice-' + Date.now(), text: 'Opción...', targetId: null }]);
            };

            const updateChoice = (sceneId, choiceId, field, value) => {
                const scene = scenes.find(s => s.id === sceneId);
                updateScene(sceneId, 'choices', scene.choices.map(c => c.id === choiceId ? { ...c, [field]: value } : c));
            };

            const removeChoice = (sceneId, choiceId) => {
                const scene = scenes.find(s => s.id === sceneId);
                updateScene(sceneId, 'choices', scene.choices.filter(c => c.id !== choiceId));
            };

            const createLinkedScene = (sourceSceneId, choiceId) => {
                const sourceScene = scenes.find(s => s.id === sourceSceneId);
                const newId = addScene(sourceScene.x + 400, sourceScene.y);
                updateChoice(sourceSceneId, choiceId, 'targetId', newId);
                setTimeout(() => setSelectedSceneId(newId), 50);
            };
            
            const organizeNodes = () => {
                const levels = {};
                const visited = new Set();
                const queue = [{ id: startSceneId, depth: 0 }];
                const nodeMap = new Map(scenes.map(s => [s.id, s]));

                while (queue.length > 0) {
                    const { id, depth } = queue.shift();
                    if (visited.has(id)) continue;
                    visited.add(id);
                    if (!levels[depth]) levels[depth] = [];
                    levels[depth].push(id);
                    const scene = nodeMap.get(id);
                    if (scene && scene.choices) {
                        scene.choices.forEach(c => {
                            if (c.targetId && !visited.has(c.targetId)) queue.push({ id: c.targetId, depth: depth + 1 });
                        });
                    }
                }
                scenes.forEach(s => { if (!visited.has(s.id)) { if (!levels[0]) levels[0] = []; levels[0].push(s.id); } });

                const newScenes = [...scenes];
                const X_SPACING = 350;
                const Y_SPACING = 250;
                Object.keys(levels).forEach(depthStr => {
                    const depth = parseInt(depthStr);
                    const nodesInLevel = levels[depth];
                    const totalHeight = nodesInLevel.length * Y_SPACING;
                    const startY = 300 - (totalHeight / 2);
                    nodesInLevel.forEach((id, index) => {
                        const idx = newScenes.findIndex(s => s.id === id);
                        if (idx !== -1) newScenes[idx] = { ...newScenes[idx], x: 100 + (depth * X_SPACING), y: startY + (index * Y_SPACING) };
                    });
                });
                setScenes(newScenes);
                setViewport({ x: 0, y: 0, k: 0.8 });
            };

            // --- CANVAS HANDLERS ---
            const handleWheel = (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = -e.deltaY * 0.001;
                    const newScale = Math.min(Math.max(0.2, viewport.k + delta), 3);
                    const rect = canvasRef.current.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    const worldX = (mouseX - viewport.x) / viewport.k;
                    const worldY = (mouseY - viewport.y) / viewport.k;
                    setViewport({ x: mouseX - worldX * newScale, y: mouseY - worldY * newScale, k: newScale });
                } else {
                    setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
                }
            };
            const handleMouseDownCanvas = (e) => {
                if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
                    setIsDraggingCanvas(true);
                    dragStartRef.current = { x: e.clientX, y: e.clientY };
                    itemStartRef.current = { x: viewport.x, y: viewport.y };
                }
            };
            const handleMouseDownNode = (e, scene) => {
                e.stopPropagation();
                setDraggingNodeId(scene.id);
                setSelectedSceneId(scene.id);
                dragStartRef.current = { x: e.clientX, y: e.clientY };
                itemStartRef.current = { x: scene.x, y: scene.y };
            };
            const handleMouseMove = (e) => {
                if (isDraggingCanvas) {
                    setViewport(prev => ({
                        ...prev,
                        x: itemStartRef.current.x + (e.clientX - dragStartRef.current.x),
                        y: itemStartRef.current.y + (e.clientY - dragStartRef.current.y)
                    }));
                } else if (draggingNodeId) {
                    const deltaX = (e.clientX - dragStartRef.current.x) / viewport.k;
                    const deltaY = (e.clientY - dragStartRef.current.y) / viewport.k;
                    setScenes(prev => prev.map(s => s.id === draggingNodeId ? { ...s, x: itemStartRef.current.x + deltaX, y: itemStartRef.current.y + deltaY } : s));
                }
            };
            const handleMouseUp = () => { setIsDraggingCanvas(false); setDraggingNodeId(null); };

            const renderConnections = () => {
                return scenes.flatMap(sourceScene => 
                    sourceScene.choices.filter(c => c.targetId && scenes.some(s => s.id === c.targetId)).map(choice => {
                        const targetScene = scenes.find(s => s.id === choice.targetId);
                        const startX = sourceScene.x + 256; const startY = sourceScene.y + 40;
                        const endX = targetScene.x; const endY = targetScene.y + 40;
                        const d = \`M \${startX} \${startY} C \${startX + 100} \${startY}, \${endX - 100} \${endY}, \${endX} \${endY}\`;
                        return <g key={\`\${sourceScene.id}-\${choice.id}\`}><path d={d} stroke="#94a3b8" strokeWidth="3" fill="none" strokeOpacity="0.6" strokeDasharray="5,5" /><circle cx={endX} cy={endY} r="4" fill="#94a3b8" /></g>;
                    })
                );
            };

            const handleExportGame = () => {
                const htmlContent = generateExportHTML({ title: projectTitle, startSceneId, scenes });
                const url = URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' }));
                const a = document.createElement('a'); a.href = url; a.download = \`\${projectTitle.replace(/\\s+/g, '_')}_juego.html\`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            };
            const handleExportBook = () => {
                const htmlContent = generateBookHTML({ title: projectTitle, startSceneId, scenes });
                const url = URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' }));
                const a = document.createElement('a'); a.href = url; a.download = \`\${projectTitle.replace(/\\s+/g, '_')}_libro.html\`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            };

            const activeScene = scenes.find(s => s.id === selectedSceneId);
            const playerCurrentScene = scenes.find(s => s.id === playHistory[playHistory.length - 1]);
            const neuCard = "bg-[#e0e5ec] shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)] rounded-2xl";
            const neuBtn = "bg-[#e0e5ec] shadow-[6px_6px_10px_rgb(163,177,198,0.6),-6px_-6px_10px_rgba(255,255,255,0.5)] hover:shadow-[4px_4px_6px_rgb(163,177,198,0.6),-4px_-4px_6px_rgba(255,255,255,0.5)] active:shadow-[inset_6px_6px_10px_rgb(163,177,198,0.6),inset_-6px_-6px_10px_rgba(255,255,255,0.5)] transition-all rounded-xl text-slate-600 font-semibold";
            const neuInput = "bg-[#e0e5ec] shadow-[inset_6px_6px_10px_rgb(163,177,198,0.6),inset_-6px_-6px_10px_rgba(255,255,255,0.5)] rounded-xl border-none focus:ring-0 focus:shadow-[inset_3px_3px_5px_rgb(163,177,198,0.6),inset_-3px_-3px_5px_rgba(255,255,255,0.5),0_0_0_2px_rgba(99,102,241,0.3)] transition-shadow";

            if (!isLoaded) return <div className="flex items-center justify-center h-screen"><div className="text-slate-500 animate-pulse">Cargando Librojuego...</div></div>;

            return (
                <div className="flex flex-col h-screen bg-[#e0e5ec] text-slate-600 font-sans overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                <header className="h-20 flex items-center justify-between px-8 bg-[#e0e5ec] shrink-0 z-20 relative shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-4">
                    <div className={\`\${neuCard} p-3 flex items-center justify-center\`}><BookOpen className="text-indigo-500" size={24} /></div>
                    <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} className="bg-transparent text-2xl font-bold text-slate-700 focus:outline-none border-b-2 border-transparent focus:border-indigo-400/50 transition-colors w-72 placeholder-slate-400" placeholder="Título del Proyecto" />
                    </div>
                    <div className="flex items-center gap-6">
                        <div className={\`\${neuCard} p-1.5 flex items-center gap-1\`}>
                            <button onClick={() => setViewport(v => ({...v, k: Math.min(v.k + 0.1, 3)}))} className="p-2 hover:text-indigo-500 rounded-lg transition-colors"><ZoomIn size={18}/></button>
                            <button onClick={() => setViewport(v => ({...v, k: Math.max(v.k - 0.1, 0.2)}))} className="p-2 hover:text-indigo-500 rounded-lg transition-colors"><ZoomOut size={18}/></button>
                            <div className="w-px h-6 bg-slate-300 mx-1"></div>
                            <button onClick={() => organizeNodes()} className="p-2 hover:text-yellow-600 rounded-lg transition-colors flex gap-2 items-center text-xs font-bold uppercase tracking-wider text-slate-500"><Layout size={18}/> </button>
                        </div>
                    <button onClick={() => {setPlayHistory([startSceneId]); setIsPlaying(true);}} className={\`\${neuBtn} px-5 py-2.5 text-emerald-600 flex items-center gap-2\`}><Play size={18} fill="currentColor" className="opacity-80" /> <span className="text-sm">Probar</span></button>
                    <div className={\`\${neuCard} flex p-1 gap-2\`}>
                        <button onClick={handleExportGame} className="px-4 py-2 rounded-lg hover:bg-slate-200/50 text-indigo-600 font-medium transition-colors text-sm flex items-center gap-2"><Gamepad2 size={16} /> Juego</button>
                        <div className="w-px bg-slate-300 my-1"></div>
                        <button onClick={handleExportBook} className="px-4 py-2 rounded-lg hover:bg-slate-200/50 text-slate-600 font-medium transition-colors text-sm flex items-center gap-2"><FileText size={16} /> Libro</button>
                    </div>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden relative">
                    <div ref={canvasRef} className="flex-1 bg-[#e0e5ec] relative overflow-hidden cursor-grab active:cursor-grabbing canvas-bg"
                        onWheel={handleWheel} onMouseDown={handleMouseDownCanvas}
                        style={{ backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', backgroundSize: '24px 24px', backgroundPosition: \`\${viewport.x}px \${viewport.y}px\` }}>
                        
                        <div style={{ transform: \`translate(\${viewport.x}px, \${viewport.y}px) scale(\${viewport.k})\`, transformOrigin: '0 0', width: '100%', height: '100%', position: 'absolute' }} className="pointer-events-none">
                            <svg className="absolute top-0 left-0 overflow-visible w-full h-full pointer-events-none" style={{ zIndex: 0 }}>{renderConnections()}</svg>
                            {scenes.map(scene => (
                                <div key={scene.id} onMouseDown={(e) => handleMouseDownNode(e, scene)}
                                    style={{ left: scene.x, top: scene.y, position: 'absolute', zIndex: selectedSceneId === scene.id ? 10 : 1, willChange: 'left, top' }}
                                    className={\`w-64 \${neuCard} border-2 pointer-events-auto transition-colors duration-200 \${selectedSceneId === scene.id ? 'border-indigo-300' : 'border-transparent hover:border-slate-300'}\`}>
                                    <div className="px-4 py-3 border-b border-slate-200/50 flex justify-between items-center cursor-move">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {scene.id === startSceneId ? <span className="text-yellow-500 bg-yellow-100 p-1 rounded-full shadow-inner"><Flag size={12} fill="currentColor" /></span> : <span className="w-2 h-2 rounded-full bg-slate-300"></span>}
                                            <span className="font-bold text-sm truncate text-slate-700 w-32">{scene.title}</span>
                                        </div>
                                        {scene.id !== startSceneId && <button onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }} className="text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>}
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs text-slate-500 line-clamp-3 mb-3 h-10 leading-relaxed font-medium">{scene.text || <span className="italic opacity-50">Sin texto...</span>}</p>
                                        <div className="space-y-2">
                                            {scene.choices.map((c, i) => (
                                                <div key={c.id} className={\`\${neuInput} px-3 py-1.5 flex justify-between items-center text-slate-600\`}>
                                                    <span className="truncate max-w-[120px] text-[11px] font-medium">{c.text}</span>
                                                    {c.targetId ? <ArrowRight size={10} className="text-indigo-400"/> : <span className="text-red-400 text-[10px]">!</span>}
                                                </div>
                                            ))}
                                            <button onClick={(e) => { e.stopPropagation(); addChoice(scene.id); setSelectedSceneId(scene.id); }} className="w-full text-[10px] py-1.5 text-slate-400 hover:text-indigo-500 font-bold uppercase tracking-wider transition-colors border-t border-slate-200/50 mt-1">+ Decisión</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => addScene(null, null)} className={\`absolute bottom-8 right-8 w-16 h-16 \${neuBtn} !rounded-full flex items-center justify-center text-indigo-500 z-20\`} title="Crear Nueva Escena"><Plus size={32} /></button>
                    </div>

                    <div className="w-96 bg-[#e0e5ec] flex flex-col shrink-0 z-10 shadow-[-10px_0_20px_rgba(163,177,198,0.2)]">
                        {activeScene ? (
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <div className="mb-8">
                                    {activeScene.id === startSceneId ? (
                                        <div className={\`\${neuInput} flex items-center gap-3 text-yellow-600 text-sm font-bold px-4 py-3 justify-center shadow-inner bg-yellow-50/50\`}><Flag size={16} fill="currentColor" /> ESCENA INICIAL</div>
                                    ) : (
                                        <button onClick={() => setStartSceneId(activeScene.id)} className={\`\${neuBtn} w-full py-3 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-yellow-600\`}><Flag size={16} /> Establecer como Inicio</button>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">Título de Escena</label><input value={activeScene.title} onChange={(e) => updateScene(activeScene.id, 'title', e.target.value)} className={\`\${neuInput} w-full p-4 text-sm font-semibold text-slate-700\`} /></div>
                                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">Imagen URL</label><div className="relative"><div className="absolute left-4 top-4 text-slate-400"><ImageIcon size={16} /></div><input value={activeScene.image} onChange={(e) => updateScene(activeScene.id, 'image', e.target.value)} className={\`\${neuInput} w-full p-4 pl-12 text-xs text-slate-600\`} placeholder="https://..." /></div>{activeScene.image && (<div className="mt-4 p-2 bg-[#e0e5ec] rounded-xl shadow-[5px_5px_10px_#b8b9be,-5px_-5px_10px_#ffffff]"><img src={activeScene.image} className="w-full h-32 object-cover rounded-lg opacity-90" alt="Preview" /></div>)}</div>
                                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">Narrativa</label><textarea value={activeScene.text} onChange={(e) => updateScene(activeScene.id, 'text', e.target.value)} className={\`\${neuInput} w-full h-40 p-4 text-sm leading-relaxed text-slate-700 resize-none\`} placeholder="Escribe aquí..." /></div>
                                    <div className="pt-6 border-t border-slate-300/50"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-4 block flex justify-between"><span>Decisiones</span><span className="bg-slate-200 text-slate-500 px-2 rounded-full text-[10px] py-0.5">{activeScene.choices.length}</span></label>
                                        <div className="space-y-4">
                                            {activeScene.choices.map((choice, idx) => (
                                                <div key={choice.id} className={\`\${neuCard} p-4 relative group\`}>
                                                    <button onClick={() => removeChoice(activeScene.id, choice.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-400 transition-colors p-1"><X size={14} /></button>
                                                    <div className="mb-3 pr-6"><span className="text-[10px] font-bold text-indigo-300 block mb-1">OPCIÓN #{idx + 1}</span><input value={choice.text} onChange={(e) => updateChoice(activeScene.id, choice.id, 'text', e.target.value)} className="w-full bg-transparent border-b border-indigo-100 focus:border-indigo-400 outline-none text-sm text-slate-700 pb-1 font-medium placeholder-slate-300" placeholder="Texto del botón..." /></div>
                                                    <div className="flex flex-col gap-2">
                                                        <select value={choice.targetId || ''} onChange={(e) => updateChoice(activeScene.id, choice.id, 'targetId', e.target.value)} className={\`\${neuInput} w-full p-2 text-xs text-slate-600 bg-transparent\`}><option value="">-- Seleccionar Destino --</option>{scenes.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
                                                        <button onClick={() => createLinkedScene(activeScene.id, choice.id)} className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold py-1 text-right flex items-center justify-end gap-1">+ Nueva Escena <ArrowRight size={10} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={() => addChoice(activeScene.id)} className={\`\${neuBtn} w-full py-3 text-xs uppercase tracking-wider text-slate-500\`}>+ Añadir Opción</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center opacity-70"><div className="mb-4 text-slate-300"><MousePointer2 size={48} /></div><p className="text-sm font-medium">Selecciona una tarjeta</p></div>}
                    </div>
                </div>

                {isPlaying && (
                    <div className="fixed inset-0 z-50 bg-[#e0e5ec] flex flex-col animate-in fade-in duration-300">
                        <div className="h-20 flex items-center justify-between px-8 bg-[#e0e5ec] shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div><span className="font-bold text-slate-700 tracking-tight text-lg">VISTA PREVIA</span></div>
                            <button onClick={() => setIsPlaying(false)} className={\`\${neuBtn} px-4 py-2 flex items-center gap-2 hover:text-red-500\`}><X size={20} /> <span className="text-sm">Cerrar</span></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-50/50">
                            <div className={\`max-w-2xl w-full \${neuCard} overflow-hidden my-12 h-fit border-4 border-white\`}>
                                {playerCurrentScene?.image && (<div className="w-full h-72 relative"><img src={playerCurrentScene.image} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div></div>)}
                                <div className="p-10">
                                    <p className="font-serif text-xl leading-8 text-slate-700 mb-10 whitespace-pre-line">{playerCurrentScene?.text || "[Sin texto]"}</p>
                                    <div className="space-y-4">
                                        {playerCurrentScene?.choices?.length > 0 ? (playerCurrentScene.choices.map(choice => (
                                                <button key={choice.id} onClick={() => setPlayHistory([...playHistory, choice.targetId])} className={\`\${neuBtn} w-full text-left px-8 py-5 flex justify-between items-center group hover:text-indigo-600\`}>
                                                    <span className="font-semibold text-lg">{choice.text}</span><ArrowRight size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                </button>))) : (<div className="text-center py-10"><p className="text-slate-400 mb-6 font-serif italic text-lg">- Fin de la historia -</p><button onClick={() => setPlayHistory([startSceneId])} className="text-indigo-500 hover:text-indigo-600 font-bold uppercase tracking-wider text-sm border-b-2 border-indigo-200 pb-1">Reiniciar</button></div>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            );
        }
    `
};