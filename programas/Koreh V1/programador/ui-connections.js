// --- UI-CONNECTIONS.JS ---
// Gestión de Cables y Conexiones entre Nodos

Object.assign(window.UI, {

    // Iniciar el arrastre de un cable desde un puerto de salida
    startConnection(e, nodeId, portName) {
        e.stopPropagation();
        this.isConnecting = true;
        
        const portRect = e.target.getBoundingClientRect();
        
        // Centro del puerto en coordenadas de pantalla
        const centerX = portRect.left + portRect.width/2;
        const centerY = portRect.top + portRect.height/2;
        
        // Convertir a coordenadas mundo
        const worldPos = this.getCanvasWorldPos(centerX, centerY);

        this.tempConnection = {
            fromId: nodeId,
            fromPort: portName,
            startX: worldPos.x,
            startY: worldPos.y
        };

        this._boundConnectMove = this.onConnectMove.bind(this);
        this._boundConnectUp = this.onConnectUp.bind(this);

        window.addEventListener('mousemove', this._boundConnectMove);
        window.addEventListener('mouseup', this._boundConnectUp);
    },

    // Mover el cable temporal
    onConnectMove(e) {
        if (!this.isConnecting) return;
        
        const worldPos = this.getCanvasWorldPos(e.clientX, e.clientY);
        this.renderConnections(worldPos.x, worldPos.y);
    },

    // Soltar el cable (si no es en un puerto, se cancela)
    onConnectUp() {
        this.isConnecting = false;
        if (this._boundConnectMove) window.removeEventListener('mousemove', this._boundConnectMove);
        if (this._boundConnectUp) window.removeEventListener('mouseup', this._boundConnectUp);
        
        this.tempConnection = null;
        this.renderConnections();
    },

    // Finalizar conexión en un puerto de entrada
    finishConnection(e, nodeId, portName) {
        e.stopPropagation();
        if (this.isConnecting && this.tempConnection) {
            Logic.addConnection(this.tempConnection.fromId, this.tempConnection.fromPort, nodeId, portName);
            this.onConnectUp(); // Limpieza y render final
        }
    },

    // Renderizar todos los cables (existentes + temporal)
    renderConnections(tempX, tempY) {
        this.svgLayer.innerHTML = '';
        
        // 1. Dibujar conexiones existentes desde Logic
        Logic.connections.forEach(conn => {
            const fromEl = document.querySelector(`#${conn.from} .port-out`);
            const toEl = document.querySelector(`#${conn.to} .port-in`);
            
            if (fromEl && toEl) {
                const fRect = fromEl.getBoundingClientRect();
                const tRect = toEl.getBoundingClientRect();
                
                const fWorld = this.getCanvasWorldPos(fRect.left + fRect.width/2, fRect.top + fRect.height/2);
                const tWorld = this.getCanvasWorldPos(tRect.left + tRect.width/2, tRect.top + tRect.height/2);

                this.drawCurve(fWorld.x, fWorld.y, tWorld.x, tWorld.y, false, conn);
            }
        });

        // 2. Dibujar cable temporal si estamos arrastrando
        if (this.isConnecting && this.tempConnection && tempX !== undefined) {
            this.drawCurve(this.tempConnection.startX, this.tempConnection.startY, tempX, tempY, true);
        }
    },

    // Dibujar curva Bezier SVG
    drawCurve(x1, y1, x2, y2, isTemp = false, connectionObj = null) {
        const dist = Math.abs(x2 - x1) * 0.5;
        const cp1x = x1 + dist;
        const cp2x = x2 - dist;
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`);
        path.setAttribute("class", "connection-line");
        
        if(isTemp) {
            path.style.stroke = "#999";
            path.style.strokeDasharray = "5,5";
        } else {
            // Evento Clic Derecho para borrar
            path.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if(confirm('¿Desconectar este cable?')) {
                    Logic.removeConnectionObject(connectionObj);
                }
            });
            path.innerHTML = `<title>Clic derecho para borrar</title>`;
        }
        
        this.svgLayer.appendChild(path);
    }
});