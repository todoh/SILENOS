// Archivo: Librojuego/app.exporter.docx.js

window.DocxExporter = {
    formatPrintableChoice(c, idToPassage, defaultDeathPassage) {
        let result = c.text;
        
        if (c.cond && c.cond.type) {
            let req = "";
            if (c.cond.type === 'item') {
                if (c.cond.op === 'HAS' || c.cond.op === '!HAS') {
                    req = c.cond.op === 'HAS' ? `Tener el objeto: ${c.cond.val}` : `No tener el objeto: ${c.cond.val}`;
                } else {
                    let opMap = {'>': 'más de', '<': 'menos de', '==': 'exactamente'};
                    req = `Tener ${opMap[c.cond.op] || c.cond.op} ${c.cond.qty} de ${c.cond.val}`;
                }
            } else {
                let opMap = {'>': 'más de', '<': 'menos de', '==': 'exactamente'};
                req = `Tener ${opMap[c.cond.op] || c.cond.op} ${c.cond.val} de ${c.cond.type.charAt(0).toUpperCase() + c.cond.type.slice(1)}`;
            }
            result = `[Requisito: ${req}] ` + result;
        }
        
        let effs = c.effs || (c.eff ? [c.eff] : []);
        if (effs.length > 0) {
            let effTexts = effs.map(eff => {
                if (eff.type === 'item') {
                    let qtyStr = (eff.qty > 1) ? ` ${eff.qty}x` : '';
                    return eff.op === 'ADD' ? `Consigues${qtyStr}: ${eff.val}` : `Pierdes${qtyStr}: ${eff.val}`;
                } else if (eff.type.startsWith('module_')) {
                    return ""; // Los módulos se renderizan como tablas aparte, no en el botón
                } else {
                    let actMap = {'+': 'Ganas', '-': 'Pierdes'};
                    let eStr = `${actMap[eff.op] || eff.op} ${eff.val} de ${eff.type.charAt(0).toUpperCase() + eff.type.slice(1)}`;
                    if (eff.type === 'vida' && eff.op === '-') {
                        let targetPas = eff.deathTarget ? idToPassage[eff.deathTarget] : defaultDeathPassage;
                        eStr += `. Si tu vida es cero o menos, ve al pasaje ${targetPas || '???'}`;
                    }
                    return eStr;
                }
            }).filter(t => t !== "").join(' | ');
            if (effTexts) result += ` (Consecuencia: ${effTexts})`;
        }
        return result;
    },

    async exportDOCX() {
        if (!Core.book || Core.book.nodes.length === 0) {
            alert("No hay nodos para exportar.");
            return;
        }

        if (typeof UI !== 'undefined' && UI.setLoading) {
            UI.setLoading(true, "Generando DOCX con Enlaces e Integración de Módulos...");
        }

        try {
            const docx = window.docx;
            if (!docx) throw new Error("La librería docx no está cargada en el sistema.");

            const { Document, Packer, Paragraph, TextRun, ImageRun, PageBreak, HeadingLevel, AlignmentType, Bookmark, InternalHyperlink } = docx;

            const docChildren = [];

            // Portada
            docChildren.push(
                new Paragraph({
                    text: Core.book.title,
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 4000, after: 400 }
                })
            );
            docChildren.push(
                new Paragraph({
                    text: "Librojuego Interactivo (Formato con Enlaces Internos)",
                    alignment: AlignmentType.CENTER,
                })
            );

            const startNode = Core.book.nodes[0];
            const otherNodes = Core.book.nodes.slice(1);

            // Mezclar nodos para que el número de pasaje no sea predecible
            for (let i = otherNodes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [otherNodes[i], otherNodes[j]] = [otherNodes[j], otherNodes[i]];
            }

            const finalNodes = [startNode, ...otherNodes];
            const idToPassage = {};
            finalNodes.forEach((n, index) => { idToPassage[n.id] = index + 1; });

            const realStartNode = finalNodes.find(n => n.isStartNode) || finalNodes[0];
            const defaultDeathPassage = idToPassage[realStartNode.id];

            docChildren.push(new Paragraph({ children: [new PageBreak()] }));

            for (const node of finalNodes) {
                const passageNumber = idToPassage[node.id];
                const hasImageUrl = node.imageUrl && typeof Exporter !== 'undefined';
                
                let b64Data = null;
                let imgDimensions = null;

                if (hasImageUrl) {
                    const b64 = await Exporter.getBase64Image(node.imageUrl);
                    if (b64) {
                        b64Data = b64.split(',')[1];
                        imgDimensions = await new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => {
                                let maxWidth = 400; 
                                let ratio = maxWidth / img.width;
                                let finalHeight = img.height * ratio;
                                if (finalHeight > 600) { 
                                    finalHeight = 600;
                                    maxWidth = img.width * (600 / img.height);
                                }
                                resolve({ width: maxWidth, height: finalHeight });
                            };
                            img.onerror = () => resolve({ width: 300, height: 300 });
                            img.src = b64;
                        });
                    }
                }

                if (b64Data) {
                    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                    docChildren.push(new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new ImageRun({
                                data: Uint8Array.from(atob(b64Data), c => c.charCodeAt(0)),
                                transformation: { width: imgDimensions.width, height: imgDimensions.height }
                            })
                        ]
                    }));
                    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                }
                
                // Bookmark para el salto interno
                docChildren.push(new Paragraph({
                    children: [
                        new Bookmark({
                            id: `pasaje_${passageNumber}`,
                            children: [new TextRun({ text: `${passageNumber}`, size: 24, bold: true })]
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 150 },
                    keepNext: true,
                    keepLines: true
                }));

                // Resumen de efectos básicos (Si los hay)
                let nodeEffText = "";
                let nEffs = node.effs || (node.eff ? [node.eff] : []);
                const basicEffs = nEffs.filter(e => !e.type.startsWith('module_'));
                
                if (basicEffs.length > 0) {
                    nodeEffText = basicEffs.map(eff => {
                        if (eff.type === 'vida' && eff.op === '-') {
                            let targetPas = eff.deathTarget ? idToPassage[eff.deathTarget] : defaultDeathPassage;
                            return `Pierdes ${eff.val} de vida. Si tu vida es cero o menos, ve al pasaje ${targetPas || '???'}`;
                        } else if (eff.type === 'item') {
                            let qtyStr = (eff.qty > 1) ? ` ${eff.qty}x` : '';
                            return eff.op === 'ADD' ? `Consigues${qtyStr}: ${eff.val}` : `Pierdes${qtyStr}: ${eff.val}`;
                        } else {
                            let actMap = {'+': 'Ganas', '-': 'Pierdes'};
                            return `${actMap[eff.op] || eff.op} ${eff.val} de ${eff.type.charAt(0).toUpperCase() + eff.type.slice(1)}`;
                        }
                    }).join(' | ');
                }

                if (nodeEffText) {
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: `[Efectos al llegar: ${nodeEffText}]`, italics: true, size: 18 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 100, after: 100 },
                        keepNext: true,
                        keepLines: true
                    }));
                }

                // Narrativa del nodo
                const paragraphs = node.text.split('\n').filter(p => p.trim());
                for (let idx = 0; idx < paragraphs.length; idx++) {
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: paragraphs[idx], size: 18 })],
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 100 },
                        keepNext: true,
                        keepLines: true
                    }));
                }

                // ---> INTEGRACIÓN DE MÓDULOS (Combate / Tienda) <---
                for (let eff of nEffs) {
                    if (eff.type.startsWith('module_') && window.Modules) {
                        const moduleElements = window.Modules.getDocxElements(eff, docx);
                        moduleElements.forEach(el => docChildren.push(el));
                    }
                }

                // Opciones y Enlaces Internos
                if (node.choices && node.choices.length > 0) {
                    for (let idx = 0; idx < node.choices.length; idx++) {
                        const c = node.choices[idx];
                        const targetPassage = idToPassage[c.targetId];
                        const formattedText = this.formatPrintableChoice(c, idToPassage, defaultDeathPassage);
                        const isLast = (idx === node.choices.length - 1);

                        let linkChildren = [];
                        if (targetPassage) {
                            linkChildren.push(
                                new InternalHyperlink({
                                    anchor: `pasaje_${targetPassage}`,
                                    children: [
                                        new TextRun({ 
                                            text: ` → Ve al número ${targetPassage}`, 
                                            size: 18,
                                            color: "0563C1", 
                                            underline: {} 
                                        })
                                    ]
                                })
                            );
                        } else {
                            linkChildren.push(new TextRun({ text: ` → Ve al número ???`, size: 18 }));
                        }

                        docChildren.push(new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: formattedText, bold: true, italics: true, size: 18 }),
                                ...linkChildren
                            ],
                            spacing: { after: isLast ? 0 : 80 },
                            keepNext: !isLast, 
                            keepLines: true
                        }));
                    }
                } else {
                    const finalScore = node.scoreImpact || 0;
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: `FIN DE LA AVENTURA (Puntuación Final: ${finalScore}/100)`, bold: true, size: 18 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 0 },
                        keepNext: false,
                        keepLines: true
                    }));
                }
            }

            const doc = new Document({
                styles: { default: { document: { run: { size: 18 } } } },
                sections: [{
                    properties: {
                        page: {
                            size: { width: docx.convertMillimetersToTwip(148), height: docx.convertMillimetersToTwip(210) },
                            margin: { top: docx.convertMillimetersToTwip(15), bottom: docx.convertMillimetersToTwip(15), left: docx.convertMillimetersToTwip(20), right: docx.convertMillimetersToTwip(20) }
                        }
                    },
                    children: docChildren
                }]
            });

            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${Core.book.title.replace(/\s+/g, '_')}_A5_Enlaces.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error crítico al exportar DOCX con Enlaces:", error);
            alert("Error al generar Word: " + error.message);
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) {
                UI.setLoading(false);
            }
        }
    }
};