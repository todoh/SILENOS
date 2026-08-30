// SAGA MINI - ALGORITMOS DE LAYOUT, ALINEACIÓN Y FÍSICA MAGNÉTICA
window.Saga = window.Saga || {};
window.Saga.Canvas = window.Saga.Canvas || {};

Object.assign(window.Saga.Canvas, {
    organizeNodesByName() {
        if (!this.nodes || this.nodes.length === 0) return;

        const regionMap = new Map();
        this.regions.forEach(r => regionMap.set(r.id, []));
        const freeNodes = [];

        this.nodes.forEach(node => {
            const r = this.getNodeRegion(node);
            if (r) {
                regionMap.get(r.id).push(node);
            } else {
                freeNodes.push(node);
            }
        });

        this.regions.forEach(r => {
            const nodesInRegion = regionMap.get(r.id);
            if (nodesInRegion && nodesInRegion.length > 0) {
                nodesInRegion.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
                this.packNodesInsideRegion(nodesInRegion, r);
            }
        });

        if (freeNodes.length > 0) {
            freeNodes.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
            const centerWorld = this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
            this.packFreeNodes(freeNodes, centerWorld);
        }

        this.resolveMagneticCollisions();
        this.saveAllNodePositions();
    },

    organizeNodesByTag() {
        if (!this.nodes || this.nodes.length === 0) return;

        const regionMap = new Map();
        this.regions.forEach(r => regionMap.set(r.id, []));
        const freeNodes = [];

        this.nodes.forEach(node => {
            const r = this.getNodeRegion(node);
            if (r) {
                regionMap.get(r.id).push(node);
            } else {
                freeNodes.push(node);
            }
        });

        this.regions.forEach(r => {
            const nodesInRegion = regionMap.get(r.id);
            if (nodesInRegion && nodesInRegion.length > 0) {
                nodesInRegion.sort((a, b) => {
                    const tagA = (Array.isArray(a.tags) && a.tags[0]) ? a.tags[0] : (a.type || "");
                    const tagB = (Array.isArray(b.tags) && b.tags[0]) ? b.tags[0] : (b.type || "");
                    return tagA.localeCompare(tagB);
                });
                this.packNodesInsideRegion(nodesInRegion, r);
            }
        });

        if (freeNodes.length > 0) {
            const groups = {};
            freeNodes.forEach(node => {
                const tagKey = (Array.isArray(node.tags) && node.tags.length > 0 && node.tags[0]) 
                    ? node.tags[0].trim().toLowerCase() 
                    : (node.type || "Sin Etiqueta").toLowerCase();
                
                if (!groups[tagKey]) groups[tagKey] = [];
                groups[tagKey].push(node);
            });

            const gapInsideGroup = 10;
            const groupMargin = 28;

            const groupBoxes = Object.keys(groups).map(key => {
                const groupNodes = groups[key].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
                const count = groupNodes.length;
                const cols = Math.ceil(Math.sqrt(count));
                const rows = Math.ceil(count / cols);

                const maxW = Math.max(...groupNodes.map(n => n.w || 160));
                const maxH = Math.max(...groupNodes.map(n => n.h || 160));
                const width = cols * maxW + (cols - 1) * gapInsideGroup;
                const height = rows * maxH + (rows - 1) * gapInsideGroup;

                return { key, nodes: groupNodes, cols, maxW, maxH, width, height, x: 0, y: 0 };
            });

            groupBoxes.sort((a, b) => (b.width * b.height) - (a.width * a.height));

            const placedBoxes = [];
            const centerWorld = this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);

            groupBoxes.forEach((box, idx) => {
                if (idx === 0) {
                    box.x = centerWorld.x - box.width / 2;
                    box.y = centerWorld.y - box.height / 2;
                    placedBoxes.push(box);
                    return;
                }

                let angle = 0;
                let radius = 20;
                let candidateX = centerWorld.x;
                let candidateY = centerWorld.y;
                let hasCollision = true;

                while (hasCollision) {
                    candidateX = centerWorld.x + radius * Math.cos(angle) - box.width / 2;
                    candidateY = centerWorld.y + radius * Math.sin(angle) - box.height / 2;

                    hasCollision = placedBoxes.some(placed => {
                        return !(
                            candidateX + box.width + groupMargin <= placed.x ||
                            candidateX >= placed.x + placed.width + groupMargin ||
                            candidateY + box.height + groupMargin <= placed.y ||
                            candidateY >= placed.y + placed.height + groupMargin
                        );
                    });

                    angle += 0.4;
                    radius += 6;
                }

                box.x = candidateX;
                box.y = candidateY;
                placedBoxes.push(box);
            });

            groupBoxes.forEach(gBox => {
                gBox.nodes.forEach((node, nIdx) => {
                    const col = nIdx % gBox.cols;
                    const row = Math.floor(nIdx / gBox.cols);
                    node.x = gBox.x + col * (gBox.maxW + gapInsideGroup);
                    node.y = gBox.y + row * (gBox.maxH + gapInsideGroup);
                });
            });
        }

        this.resolveMagneticCollisions();
        this.saveAllNodePositions();
    },

    packNodesInsideRegion(nodes, region) {
        const headerPadding = 36;
        const padding = 12;
        const gap = 12;

        const availW = region.w - padding * 2;
        const maxNodeW = Math.max(...nodes.map(n => n.w || 160));
        const maxNodeH = Math.max(...nodes.map(n => n.h || 160));

        let cols = Math.floor((availW + gap) / (maxNodeW + gap));
        if (cols < 1) cols = 1;

        nodes.forEach((node, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);

            node.x = region.x + padding + col * (maxNodeW + gap);
            node.y = region.y + headerPadding + row * (maxNodeH + gap);
        });
    },

    packFreeNodes(freeNodes, center) {
        const gap = 14;
        const count = freeNodes.length;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);

        const maxW = Math.max(...freeNodes.map(n => n.w || 160));
        const maxH = Math.max(...freeNodes.map(n => n.h || 160));

        const totalW = cols * maxW + (cols - 1) * gap;
        const totalH = rows * maxH + (rows - 1) * gap;

        const startX = center.x - totalW / 2;
        const startY = center.y - totalH / 2;

        freeNodes.forEach((node, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            node.x = startX + col * (maxW + gap);
            node.y = startY + row * (maxH + gap);
        });
    },

    async organizeNodesByAI() {
        const items = window.Saga.Core.items.map(i => ({ id: i.filename, data: i.data }));
        if (items.length === 0) return;

        try {
            const layoutMap = await window.Saga.Gemini.arrangeNodesGraph(items);
            const centerWorld = this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);

            this.nodes.forEach((node, idx) => {
                const targetPos = layoutMap[node.id];
                if (targetPos && typeof targetPos.x === 'number' && typeof targetPos.y === 'number') {
                    node.x = centerWorld.x + targetPos.x;
                    node.y = centerWorld.y + targetPos.y;
                } else {
                    const fallbackRadius = 200 * Math.sqrt(idx + 1);
                    const fallbackAngle = idx * 1.2;
                    node.x = centerWorld.x + fallbackRadius * Math.cos(fallbackAngle) - node.w / 2;
                    node.y = centerWorld.y + fallbackRadius * Math.sin(fallbackAngle) - node.h / 2;
                }
            });

            this.resolveMagneticCollisions();
            this.saveAllNodePositions();
        } catch (e) {
            alert("Error al ordenar con IA: " + e.message);
        }
    },

    resolveMagneticCollisions(iterations = 80) {
        const padding = 16;

        for (let iter = 0; iter < iterations; iter++) {
            let moved = false;

            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const a = this.nodes[i];
                    const b = this.nodes[j];

                    const inRegionA = this.getNodeRegion(a);
                    const inRegionB = this.getNodeRegion(b);

                    if (inRegionA || inRegionB) continue;

                    const centerA = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
                    const centerB = { x: b.x + b.w / 2, y: b.y + b.h / 2 };

                    const minDistX = (a.w + b.w) / 2 + padding;
                    const minDistY = (a.h + b.h) / 2 + padding;

                    const dx = centerB.x - centerA.x;
                    const dy = centerB.y - centerA.y;

                    const absDx = Math.abs(dx);
                    const absDy = Math.abs(dy);

                    if (absDx < minDistX && absDy < minDistY) {
                        moved = true;
                        const overlapX = minDistX - absDx;
                        const overlapY = minDistY - absDy;

                        let pushX = 0, pushY = 0;
                        if (overlapX < overlapY) {
                            pushX = (dx >= 0 ? 1 : -1) * overlapX * 0.5;
                        } else {
                            pushY = (dy >= 0 ? 1 : -1) * overlapY * 0.5;
                        }

                        a.x -= pushX;
                        a.y -= pushY;
                        b.x += pushX;
                        b.y += pushY;
                    }
                }
            }

            this.nodes.forEach(node => {
                if (this.getNodeRegion(node)) return;

                this.regions.forEach(region => {
                    const nodeCenter = { x: node.x + node.w / 2, y: node.y + node.h / 2 };
                    const regCenter = { x: region.x + region.w / 2, y: region.y + region.h / 2 };

                    const minDistX = (node.w + region.w) / 2 + padding;
                    const minDistY = (node.h + region.h) / 2 + padding;

                    const dx = nodeCenter.x - regCenter.x;
                    const dy = nodeCenter.y - regCenter.y;

                    const absDx = Math.abs(dx);
                    const absDy = Math.abs(dy);

                    if (absDx < minDistX && absDy < minDistY) {
                        moved = true;
                        const overlapX = minDistX - absDx;
                        const overlapY = minDistY - absDy;

                        if (overlapX < overlapY) {
                            node.x += (dx >= 0 ? 1 : -1) * overlapX;
                        } else {
                            node.y += (dy >= 0 ? 1 : -1) * overlapY;
                        }
                    }
                });
            });

            if (!moved) break;
        }
    }
});