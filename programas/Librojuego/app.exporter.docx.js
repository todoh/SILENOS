// Archivo: Librojuego/app.exporter.docx.js

window.DocxExporter = {
    formatPrintableChoice(c) {
        let result = c.text;
        if (c.cond && c.cond.type) {
            let req = "";
            if (c.cond.type === 'item') {
                req = c.cond.op === 'HAS' ? `Tener el objeto: ${c.cond.val}` : `No tener el objeto: ${c.cond.val}`;
            } else {
                let opMap = {'>': 'más de', '<': 'menos de', '==': 'exactamente'};
                req = `Tener ${opMap[c.cond.op] || c.cond.op} ${c.cond.val} de ${c.cond.type.charAt(0).toUpperCase() + c.cond.type.slice(1)}`;
            }
            result = `[Requisito: ${req}] ` + result;
        }
        if (c.eff && c.eff.type) {
            let eff = "";
            if (c.eff.type === 'item') {
                eff = c.eff.op === 'ADD' ? `Consigues el objeto: ${c.eff.val}` : `Pierdes el objeto: ${c.eff.val}`;
            } else {
                let actMap = {'+': 'Ganas', '-': 'Pierdes'};
                eff = `${actMap[c.eff.op] || c.eff.op} ${c.eff.val} de ${c.eff.type.charAt(0).toUpperCase() + c.eff.type.slice(1)}`;
            }
            result += ` (Consecuencia: ${eff})`;
        }
        return result;
    },

    async exportDOCX() {
        if (!Core.book || Core.book.nodes.length === 0) {
            alert("No hay nodos para exportar.");
            return;
        }

        if (typeof UI !== 'undefined' && UI.setLoading) {
            UI.setLoading(true, "Generando DOCX (Tamaño A5)...");
        }

        try {
            const docx = window.docx;
            if (!docx) throw new Error("La librería docx no está cargada en el sistema.");

            const { Document, Packer, Paragraph, TextRun, ImageRun, PageBreak, HeadingLevel, AlignmentType } = docx;

            const docChildren = [];

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
                    text: "Librojuego Interactivo",
                    alignment: AlignmentType.CENTER,
                })
            );

            const startNode = Core.book.nodes[0];
            const otherNodes = Core.book.nodes.slice(1);

            for (let i = otherNodes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [otherNodes[i], otherNodes[j]] = [otherNodes[j], otherNodes[i]];
            }

            const finalNodes = [startNode, ...otherNodes];
            const idToPassage = {};
            finalNodes.forEach((n, index) => { idToPassage[n.id] = index + 1; });

            for (const node of finalNodes) {
                docChildren.push(new Paragraph({ children: [new PageBreak()] }));

                const passageNumber = idToPassage[node.id];
                
                docChildren.push(new Paragraph({
                    text: `${passageNumber}`,
                    heading: HeadingLevel.HEADING_2,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 400 }
                }));

                let imageInserted = false;

                if (node.imageUrl && typeof Exporter !== 'undefined') {
                    const b64 = await Exporter.getBase64Image(node.imageUrl);
                    if (b64) {
                        const base64Data = b64.split(',')[1];
                        
                        const imgDimensions = await new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => {
                                const maxWidth = 300; 
                                const ratio = maxWidth / img.width;
                                resolve({ width: maxWidth, height: img.height * ratio });
                            };
                            img.onerror = () => resolve({ width: 300, height: 300 });
                            img.src = b64;
                        });

                        docChildren.push(new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new ImageRun({
                                    data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
                                    transformation: {
                                        width: imgDimensions.width,
                                        height: imgDimensions.height
                                    }
                                })
                            ]
                        }));

                        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                        imageInserted = true;
                    }
                }

                const paragraphs = node.text.split('\n').filter(p => p.trim());
                for (const p of paragraphs) {
                    docChildren.push(new Paragraph({
                        children: [new TextRun(p)],
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 150 }
                    }));
                }

                if (node.choices && node.choices.length > 0) {
                    docChildren.push(new Paragraph({ text: "", spacing: { before: 300 } }));
                    for (const c of node.choices) {
                        const targetPassage = idToPassage[c.targetId] || "???";
                        const formattedText = this.formatPrintableChoice(c);
                        docChildren.push(new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: formattedText, bold: true, italics: true }),
                                new TextRun(` → Ve al número ${targetPassage}`)
                            ],
                            spacing: { after: 120 }
                        }));
                    }
                } else {
                    const finalScore = node.scoreImpact || 0;
                    docChildren.push(new Paragraph({
                        text: `FIN DE LA AVENTURA (Puntuación Final: ${finalScore}/100)`,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 600 }
                    }));
                }
            }

            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            size: {
                                width: docx.convertMillimetersToTwip(148),
                                height: docx.convertMillimetersToTwip(210)
                            },
                            margin: {
                                top: docx.convertMillimetersToTwip(20),
                                bottom: docx.convertMillimetersToTwip(20),
                                left: docx.convertMillimetersToTwip(20),
                                right: docx.convertMillimetersToTwip(20),
                            }
                        }
                    },
                    children: docChildren
                }]
            });

            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${Core.book.title.replace(/\s+/g, '_')}_A5_Final.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error crítico al exportar DOCX:", error);
            alert("Error al generar Word: " + error.message);
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) {
                UI.setLoading(false);
            }
        }
    }
};