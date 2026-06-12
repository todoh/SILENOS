// export_docx.js
// --- EXPORTACIÓN A DOCUMENTO WORD (DOCX) CON GEOMETRÍA DIN A5, MARCADORES E HIPERVÍNCULOS NATIVOS ---
// --- OPTIMIZACIÓN ANTIFRACTURA: CONTENEDORES INDIVISIBLES POR NODO VIA TABLAS OPENXML ---

async function exportWord() {
    if (!data.nodes || data.nodes.length === 0) {
         alert("El proyecto está vacío.");
         return;
    }

    const loadJSZip = () => {
        return new Promise((resolve, reject) => {
            if (typeof JSZip !== 'undefined') return resolve(window.JSZip);
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => reject(new Error("No se pudo cargar JSZip desde el CDN estable."));
            document.head.appendChild(script);
        });
    };

    let jszipInstance;
    try {
        jszipInstance = await loadJSZip();
    } catch (err) {
        alert(err.message);
        return;
    }

    // Identificación estricta del nodo inicial
    const startNode = data.nodes.find(n => !data.connections.some(c => c.to === n.id)) || data.nodes[0];
    
    // Extraer los nodos restantes para su aleatorización
    const remainingNodes = data.nodes.filter(n => n.id !== startNode.id);
    
    // Algoritmo Fisher-Yates para desordenar los nodos restantes de forma aleatoria pura
    for (let i = remainingNodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingNodes[i], remainingNodes[j]] = [remainingNodes[j], remainingNodes[i]];
    }

    // Reconstrucción de la lista secuencial: El nodo inicial SIEMPRE va primero
    const sortedNodes = [startNode, ...remainingNodes];

    // Mapeo dinámico de índices basado en la nueva secuencia mezclada
    const nodeIndexMap = new Map();
    sortedNodes.forEach((node, idx) => {
        nodeIndexMap.set(node.id, idx + 1);
    });

    const zip = new jszipInstance();
    const mediaFiles = [];

    if (typeof getMediaFromFileSystem === 'function') {
        let imgIndex = 1;
        for (const node of sortedNodes) {
            try {
                const base64Image = await getMediaFromFileSystem(node.id);
                if (base64Image && base64Image.startsWith('data:image')) {
                    const match = base64Image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
                    if (match) {
                        const ext = match[1] === 'jpg' ? 'jpeg' : match[1];
                        const content = match[2];
                        const rId = `rIdImg${imgIndex++}`;
                        const filename = `image${imgIndex}.${ext}`;
                        
                        mediaFiles.push({
                            rId: rId,
                            filename: filename,
                            contentType: `image/${ext}`,
                            base64: content
                        });
                        node._docxImgId = rId;
                    }
                }
            } catch (mediaErr) {
                console.warn("Error mapeando archivo de imagen para nodo: ", node.id, mediaErr);
            }
        }
    }

    let contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        <Default Extension="png" ContentType="image/png"/>
        <Default Extension="jpeg" ContentType="image/jpeg"/>
    </Types>`;
    zip.file("[Content_Types].xml", contentTypesXml.trim());

    let rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`;
    zip.folder("_rels").file(".rels", rootRelsXml.trim());

    let docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
    mediaFiles.forEach(file => {
        docRelsXml += `<Relationship Id="${file.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${file.filename}"/>`;
    });
    docRelsXml += `</Relationships>`;
    zip.folder("word").folder("_rels").file("document.xml.rels", docRelsXml.trim());

    mediaFiles.forEach(file => {
        zip.file(`word/media/${file.filename}`, file.base64, { base64: true });
    });

    // COMPILACIÓN CON GEOMETRÍA EXCLUSIVA DIN A5 EN OPENXML ESTRICTO
    let docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <w:body>
        <w:p>
          <w:pPr>
            <w:jc w:val="center"/>
            <w:spacing w:after="160"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
              <w:bold/>
              <w:sz w:val="40"/>
            </w:rPr>
            <w:t>${data.name.toUpperCase()}</w:t>
          </w:r>
        </w:p>
        
        <w:p>
          <w:pPr>
            <w:jc w:val="center"/>
            <w:spacing w:after="480"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
              <w:color w:val="555555"/>
              <w:sz w:val="20"/>
            </w:rPr>
            <w:t>Crónica interactiva DIN A5 - Creada en Merkados</w:t>
          </w:r>
        </w:p>

        <w:p>
          <w:pPr>
            <w:pBdr>
              <w:top w:val="dash" w:sz="6" w:space="8" w:color="000000"/>
              <w:left w:val="dash" w:sz="6" w:space="8" w:color="000000"/>
              <w:bottom w:val="dash" w:sz="6" w:space="8" w:color="000000"/>
              <w:right w:val="dash" w:sz="6" w:space="8" w:color="000000"/>
            </w:pBdr>
            <w:shd w:val="clear" w:color="auto" w:fill="FAFAFA"/>
            <w:spacing w:after="400"/>
          </w:pPr>
          <w:r>
            <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:bold/><w:sz w:val="22"/></w:rPr>
            <w:t>Guía de Juego y Sistema de Navegación&#10;&#10;</w:t>
          </w:r>
          <w:r>
            <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
            <w:t>Bienvenido a esta aventura interactiva. Tu destino no está escrito; cada paso que des y cada decisión que tomes determinarán tu camino. Lee con atención las reglas de este desafío:&#10;&#10;</w:t>
          </w:r>
          <w:r>
            <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:bold/><w:sz w:val="22"/></w:rPr>
            <w:t>El inicio de tu viaje: </w:t>
          </w:r>
          <w:r>
            <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
            <w:t>Tu aventura comienza siempre en el Pasaje 1. Este no es un libro convencional; leerlo de forma lineal romperá la estructura de la historia.&#10;&#10;</w:t>
          </w:r>
          <w:r>
            <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:bold/><w:sz w:val="22"/></w:rPr>
            <w:t>Tú eres el protagonista: </w:t>
          </w:r>
          <w:r>
            <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
            <w:t>Al final de cada pasaje, se te presentarán varias opciones. Elige con sabiduría tu próximo movimiento para saltar directamente al número indicado.</w:t>
          </w:r>
        </w:p>`;

    for (const node of sortedNodes) {
        const currentNumber = nodeIndexMap.get(node.id);
        const outgoingConnections = data.connections.filter(c => c.from === node.id);
        
        // Iniciamos una tabla de ancho completo sin bordes visibles para actuar de contenedor absoluto
        docXml += `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="0" w:type="auto"/>
            <w:tblBorders>
              <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
              <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
              <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
              <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
              <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
              <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            </w:tblBorders>
            <w:tblCellMar>
              <w:top w:w="0" w:type="dxa"/>
              <w:left w:w="0" w:type="dxa"/>
              <w:bottom w:w="200" w:type="dxa"/>
              <w:right w:w="0" w:type="dxa"/>
            </w:tblCellMar>
          </w:tblPr>
          <w:tr>
            <w:trPr>
              <w:cantSplit/>
            </w:trPr>
            <w:tc>
              <w:tcPr>
                <w:tcW w:w="0" w:type="auto"/>
              </w:tcPr>`;

        // --- CONTENIDO DEL NODO (DENTRO DE LA CELDA INFRAGMENTABLE) ---
        
        // Encabezado del número de paso
        docXml += `
              <w:p>
                <w:pPr>
                  <w:spacing w:before="160" w:after="100"/>
                  <w:pBdr>
                    <w:bottom w:val="single" w:sz="6" w:space="4" w:color="111111"/>
                  </w:pBdr>
                </w:pPr>
                <w:bookmarkStart w:id="${currentNumber}" w:name="nodo_${currentNumber}"/>
                <w:r>
                  <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:bold/><w:sz w:val="26"/></w:rPr>
                  <w:t>${currentNumber} </w:t>
                </w:r>
                <w:bookmarkEnd w:id="${currentNumber}"/>
                ${node.isEnding ? `
                <w:r>
                  <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:bold/><w:sz w:val="18"/><w:color w:val="FFFFFF"/><w:shd w:val="clear" w:color="auto" w:fill="000000"/></w:rPr>
                  <w:t>  FIN DE LA AVENTURA  </w:t>
                </w:r>` : ''}
              </w:p>`;

        // Título del Nodo si existe
        if (node.title && node.title.trim() !== "") {
            docXml += `
              <w:p>
                <w:pPr><w:spacing w:after="100"/></w:pPr>
                <w:r>
                  <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:bold/><w:sz w:val="20"/><w:color w:val="444444"/></w:rPr>
                  <w:t>${node.title.toUpperCase()}</w:t>
                </w:r>
              </w:p>`;
        }

        // Cuerpo de texto del pasaje literario
        const cleanContent = (node.content || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '&#10;');

        docXml += `
              <w:p>
                <w:pPr>
                  <w:jc w:val="both"/>
                  <w:spacing w:after="160" w:line="300" w:lineRule="auto"/>
                </w:pPr>
                <w:r>
                  <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
                  <w:t>${cleanContent}</w:t>
                </w:r>
              </w:p>`;

        // Renderizado de Ilustración si existe
        if (node._docxImgId) {
            docXml += `
              <w:p>
                <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="120"/></w:pPr>
                <w:r>
                  <w:drawing>
                    <wp:inline distT="0" distB="0" distL="0" distR="0">
                      <wp:extent cx="4320000" cy="2700000"/>
                      <wp:docPr id="${currentNumber}" name="Img${currentNumber}"/>
                      <wp:cNvGraphicFramePr>
                        <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                      </wp:cNvGraphicFramePr>
                      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                            <pic:nvPicPr>
                              <pic:cNvPr id="0" name="Image_${currentNumber}"/>
                              <pic:cNvPicPr/>
                            </pic:nvPicPr>
                            <pic:blipFill>
                              <a:blip r:embed="${node._docxImgId}"/>
                              <a:stretch><a:fillRect/></a:stretch>
                            </pic:blipFill>
                            <pic:spPr>
                              <a:xfrm><a:off x="0" y="0"/><a:ext cx="4320000" cy="2700000"/></a:xfrm>
                              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                            </pic:spPr>
                          </pic:pic>
                        </a:graphicData>
                      </a:graphic>
                    </wp:inline>
                  </w:drawing>
                </w:r>
              </w:p>`;
        }

        // Opciones del Sistema de Opciones con Hipervínculos
        if (outgoingConnections.length > 0 && !node.isEnding) {
            outgoingConnections.forEach((conn) => {
                const targetNumber = nodeIndexMap.get(conn.to);
                if (targetNumber) {
                    const connLabel = (conn.label || 'Continuar hacia el siguiente paso')
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                    docXml += `
              <w:p>
                <w:pPr><w:spacing w:after="40"/></w:pPr>
                <w:r>
                  <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
                  <w:t>  • ${connLabel} → </w:t>
                </w:r>
                <w:hyperlink w:anchor="nodo_${targetNumber}">
                  <w:r>
                    <w:rPr>
                      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                      <w:bold/>
                      <w:sz w:val="22"/>
                      <w:color w:val="0563C1"/>
                      <w:underline w:val="single"/>
                    </w:rPr>
                    <w:t>Ve al número ${targetNumber}</w:t>
                  </w:r>
                </w:hyperlink>
              </w:p>`;
                }
            });
        } else if (node.isEnding) {
            docXml += `
              <w:p>
                <w:pPr><w:spacing w:after="120"/></w:pPr>
                <w:r>
                  <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:italic/><w:sz w:val="22"/><w:color w:val="444444"/></w:rPr>
                  <w:t>  Fin del trayecto actual.</w:t>
                </w:r>
              </w:p>`;
        } else {
            docXml += `
              <w:p>
                <w:pPr><w:spacing w:after="120"/></w:pPr>
                <w:r>
                  <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:italic/><w:sz w:val="22"/><w:color w:val="666666"/></w:rPr>
                  <w:t>  El camino termina aquí de forma abrupta.</w:t>
                </w:r>
              </w:p>`;
        }

        // Cierre estricto de la estructura de tabla por nodo
        docXml += `
            </w:tc>
          </w:tr>
        </w:tbl>
        
        <w:p><w:pPr><w:spacing w:before="0" w:after="100"/></w:pPr></w:p>`;
    }

    // DIMENSIONES DE LA PÁGINA FÍSICA DIN A5 EN OPENXML ESTRICTO:
    docXml += `
        <w:sectPr>
          <w:pgSz w:w="8390" w:h="11906" w:orient="portrait"/>
          <w:pgMar w:top="850" w:bottom="850" w:left="680" w:right="680" w:header="720" w:footer="720" w:gutter="0"/>
        </w:sectPr>
      </w:body>
    </w:document>`;
    zip.file("word/document.xml", docXml.trim());

    zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
       .then(function(content) {
           const a = document.createElement('a');
           a.href = URL.createObjectURL(content);
           a.download = `${data.name.replace(/\s+/g, '_')}_A5_Compilacion.docx`;
           document.body.appendChild(a);
           a.click();
           document.body.removeChild(a);
       }).catch(err => {
           alert("Error empaquetando DOCX: " + err.message);
       });
}