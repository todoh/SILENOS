/* SILENOS 3/gamebook/gb-ui.js */
window.GB_UI = {
    STYLES: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Merriweather:wght@300;400;700&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #e0e5ec; overflow: hidden; margin:0; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        .canvas-bg { touch-action: none; user-select: none; }
    `,
    
    ICONS_CODE: `
        // --- ICONOS ---
        const Icon = ({ path, size = 24, className = "", fill = "none" }) => (
            <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{path}</svg>
        );
        // Usamos React.Fragment explicitamente para evitar errores de parser en Babel Standalone
        const BookOpen = (p) => <Icon {...p} path={<React.Fragment><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></React.Fragment>} />;
        const Plus = (p) => <Icon {...p} path={<React.Fragment><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></React.Fragment>} />;
        const Trash2 = (p) => <Icon {...p} path={<React.Fragment><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></React.Fragment>} />;
        const Play = (p) => <Icon {...p} path={<polygon points="5 3 19 12 5 21 5 3"/>} />;
        const ImageIcon = (p) => <Icon {...p} path={<React.Fragment><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></React.Fragment>} />;
        const ArrowRight = (p) => <Icon {...p} path={<React.Fragment><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></React.Fragment>} />;
        const X = (p) => <Icon {...p} path={<React.Fragment><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></React.Fragment>} />;
        const Layout = (p) => <Icon {...p} path={<React.Fragment><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></React.Fragment>} />;
        const MousePointer2 = (p) => <Icon {...p} path={<React.Fragment><path d="m12 6 2-2-2-2-2 2 2 2zm0 12-2 2 2 2 2-2-2-2zm-6-6-2-2-2 2 2 2 2-2zm12 0 2-2 2 2-2 2 2-2z"/><path d="M12 2v20M2 12h20"/></React.Fragment>} />;
        const ZoomIn = (p) => <Icon {...p} path={<React.Fragment><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></React.Fragment>} />;
        const ZoomOut = (p) => <Icon {...p} path={<React.Fragment><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></React.Fragment>} />;
        const Flag = (p) => <Icon {...p} path={<React.Fragment><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></React.Fragment>} />;
        const FileText = (p) => <Icon {...p} path={<React.Fragment><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></React.Fragment>} />;
        const Gamepad2 = (p) => <Icon {...p} path={<React.Fragment><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/></React.Fragment>} />;
    `
};