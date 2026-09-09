// animation-skeletal.js - MOTOR AVANZADO DE ANIMACIÓN ESQUELÉTICA 2D, IK, SKINNING SUAVE Y EDICIÓN DE MALLA
class SkeletalAnimationEngine {
    constructor() {
        // Pool de Rigs predefinidos (Esqueletos base) con propiedades de IK y Físicas
        this.rigTemplates = {
            humanoid: {
                id: "humanoid",
                name: "Humanoide Bípedo Avanzado",
                bones: [
                    { id: "root", name: "Cintura (Root)", parent: null, x: 0.5, y: 0.55, angle: 0, length: 0 },
                    { id: "spine", name: "Pecho / Columna", parent: "root", x: 0.5, y: 0.35, angle: -90, length: 0.2 },
                    { id: "head", name: "Cabeza", parent: "spine", x: 0.5, y: 0.15, angle: -90, length: 0.15, isLookAt: true },
                    { id: "arm_l_upper", name: "Brazo Izq (Hombro)", parent: "spine", x: 0.35, y: 0.36, angle: 180, length: 0.15 },
                    { id: "arm_l_lower", name: "Brazo Izq (Codo)", parent: "arm_l_upper", x: 0.22, y: 0.36, angle: 180, length: 0.13 },
                    { id: "arm_r_upper", name: "Brazo Der (Hombro)", parent: "spine", x: 0.65, y: 0.36, angle: 0, length: 0.15 },
                    { id: "arm_r_lower", name: "Brazo Der (Codo)", parent: "arm_r_upper", x: 0.78, y: 0.36, angle: 0, length: 0.13 },
                    { id: "leg_l_upper", name: "Pierna Izq (Muslo)", parent: "root", x: 0.42, y: 0.70, angle: 90, length: 0.18 },
                    { id: "leg_l_lower", name: "Pierna Izq (Rodilla)", parent: "leg_l_upper", x: 0.42, y: 0.88, angle: 90, length: 0.16 },
                    { id: "leg_r_upper", name: "Pierna Der (Muslo)", parent: "root", x: 0.58, y: 0.70, angle: 90, length: 0.18 },
                    { id: "leg_r_lower", name: "Pierna Der (Rodilla)", parent: "leg_r_upper", x: 0.58, y: 0.88, angle: 90, length: 0.16 }
                ]
            },
            quadruped: {
                id: "quadruped",
                name: "Cuadrúpedo (Animal) con Físicas",
                bones: [
                    { id: "root", name: "Lomo / Centro", parent: null, x: 0.5, y: 0.45, angle: 0, length: 0 },
                    { id: "spine_front", name: "Pecho / Cuello", parent: "root", x: 0.3, y: 0.45, angle: 180, length: 0.2 },
                    { id: "head", name: "Cabeza", parent: "spine_front", x: 0.15, y: 0.3, angle: -135, length: 0.15, isLookAt: true },
                    { id: "leg_fl_upper", name: "Pata Del. Izq", parent: "spine_front", x: 0.3, y: 0.65, angle: 90, length: 0.18 },
                    { id: "leg_fl_lower", name: "Pata Del. Izq Abajo", parent: "leg_fl_upper", x: 0.3, y: 0.85, angle: 90, length: 0.15 },
                    { id: "leg_fr_upper", name: "Pata Del. Der", parent: "spine_front", x: 0.35, y: 0.65, angle: 90, length: 0.18 },
                    { id: "leg_fr_lower", name: "Pata Del. Der Abajo", parent: "leg_fr_upper", x: 0.35, y: 0.85, angle: 90, length: 0.15 },
                    { id: "spine_back", name: "Cadera Trasera", parent: "root", x: 0.7, y: 0.45, angle: 0, length: 0.2 },
                    { id: "tail", name: "Cola (Spring Physics)", parent: "spine_back", x: 0.88, y: 0.38, angle: -30, length: 0.15, isSpring: true, stiffness: 0.12, damping: 0.85 },
                    { id: "leg_bl_upper", name: "Pata Tras. Izq", parent: "spine_back", x: 0.7, y: 0.65, angle: 90, length: 0.18 },
                    { id: "leg_bl_lower", name: "Pata Tras. Izq Abajo", parent: "leg_bl_upper", x: 0.7, y: 0.85, angle: 90, length: 0.15 },
                    { id: "leg_br_upper", name: "Pata Tras. Der", parent: "spine_back", x: 0.75, y: 0.65, angle: 90, length: 0.18 },
                    { id: "leg_br_lower", name: "Pata Tras. Der Abajo", parent: "leg_br_upper", x: 0.75, y: 0.85, angle: 90, length: 0.15 }
                ]
            }
        };

        // Pool de animaciones procedimentales
        this.animationClips = {
            humanoid_idle: {
                name: "Humano - Quieto / Respiración",
                rig: "humanoid",
                evaluate: (t) => {
                    const phase = (t / 1000) * Math.PI * 2;
                    return {
                        spine: { rot: Math.sin(phase) * 3, ty: Math.sin(phase) * 2 },
                        head: { rot: Math.cos(phase) * 2 },
                        arm_l_upper: { rot: 15 + Math.sin(phase) * 4 },
                        arm_r_upper: { rot: -15 - Math.sin(phase) * 4 },
                        leg_l_upper: { rot: 0 },
                        leg_r_upper: { rot: 0 }
                    };
                }
            },
            humanoid_walk: {
                name: "Humano - Andar",
                rig: "humanoid",
                evaluate: (t) => {
                    const phase = (t / 400) * Math.PI * 2;
                    return {
                        root: { ty: Math.abs(Math.sin(phase * 2)) * -6 },
                        spine: { rot: Math.sin(phase) * 5 },
                        head: { rot: -Math.sin(phase) * 3 },
                        leg_l_upper: { rot: Math.sin(phase) * 35 },
                        leg_l_lower: { rot: Math.max(0, -Math.sin(phase)) * 30 },
                        leg_r_upper: { rot: -Math.sin(phase) * 35 },
                        leg_r_lower: { rot: Math.max(0, Math.sin(phase)) * 30 },
                        arm_l_upper: { rot: -Math.sin(phase) * 30 },
                        arm_l_lower: { rot: -15 },
                        arm_r_upper: { rot: Math.sin(phase) * 30 },
                        arm_r_lower: { rot: -15 }
                    };
                }
            },
            humanoid_dance: {
                name: "Humano - Bailar",
                rig: "humanoid",
                evaluate: (t) => {
                    const phase = (t / 300) * Math.PI * 2;
                    return {
                        root: { ty: Math.sin(phase * 2) * -12, tx: Math.cos(phase) * 8 },
                        spine: { rot: Math.sin(phase) * 20 },
                        head: { rot: Math.cos(phase) * 15 },
                        arm_l_upper: { rot: -120 + Math.sin(phase) * 40 },
                        arm_l_lower: { rot: -60 + Math.cos(phase) * 30 },
                        arm_r_upper: { rot: 120 - Math.sin(phase) * 40 },
                        arm_r_lower: { rot: 60 - Math.cos(phase) * 30 },
                        leg_l_upper: { rot: Math.sin(phase) * 25 },
                        leg_r_upper: { rot: -Math.sin(phase) * 25 }
                    };
                }
            },
            humanoid_fight: {
                name: "Humano - Pelear / Guardia",
                rig: "humanoid",
                evaluate: (t) => {
                    const phase = (t / 250) * Math.PI * 2;
                    const punch = Math.max(0, Math.sin(phase));
                    return {
                        spine: { rot: -15 + Math.sin(phase) * 8 },
                        head: { rot: 10 },
                        arm_l_upper: { rot: -60 - punch * 50 },
                        arm_l_lower: { rot: -80 + punch * 40 },
                        arm_r_upper: { rot: -40 + Math.cos(phase) * 10 },
                        arm_r_lower: { rot: -90 },
                        leg_l_upper: { rot: 20 },
                        leg_r_upper: { rot: -20 }
                    };
                }
            },
            humanoid_grab: {
                name: "Humano - Coger Objeto",
                rig: "humanoid",
                evaluate: (t) => {
                    const phase = Math.min(Math.PI, (t / 600) * Math.PI);
                    return {
                        spine: { rot: Math.sin(phase) * 35 },
                        head: { rot: -Math.sin(phase) * 15 },
                        arm_r_upper: { rot: -Math.sin(phase) * 80 },
                        arm_r_lower: { rot: -Math.sin(phase) * 40 },
                        leg_l_upper: { rot: Math.sin(phase) * 15 },
                        leg_r_upper: { rot: -Math.sin(phase) * 10 }
                    };
                }
            },
            quadruped_walk: {
                name: "Cuadrúpedo - Andar",
                rig: "quadruped",
                evaluate: (t) => {
                    const phase = (t / 400) * Math.PI * 2;
                    return {
                        root: { ty: Math.abs(Math.sin(phase * 2)) * -4 },
                        spine_front: { rot: Math.sin(phase) * 4 },
                        spine_back: { rot: -Math.sin(phase) * 4 },
                        tail: { rot: Math.sin(phase * 2) * 25 },
                        leg_fl_upper: { rot: Math.sin(phase) * 30 },
                        leg_fr_upper: { rot: -Math.sin(phase) * 30 },
                        leg_bl_upper: { rot: -Math.sin(phase) * 30 },
                        leg_br_upper: { rot: Math.sin(phase) * 30 }
                    };
                }
            }
        };

        this.canvasCache = new Map();
        this.activeEditingElem = null;
        this.editingBones = [];
        this.selectedBoneId = null;
        this.isDraggingJoint = false;
        this.previewAnimClip = "humanoid_walk";
        this.isTestingAnim = false;
        this.springStates = new Map(); // Almacenamiento de dinámicas físicas por entidad
    }

    // Genera una malla regular de triángulos (Grid Mesh) con resolución de sub-divisiones
    createMeshGrid(width, height, cols = 8, rows = 8) {
        const vertices = [];
        const uvs = [];
        const indices = [];

        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c <= cols; c++) {
                const u = c / cols;
                const v = r / rows;
                vertices.push({ x: u * width, y: v * height, origX: u * width, origY: v * height });
                uvs.push({ u, v });
            }
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i0 = r * (cols + 1) + c;
                const i1 = i0 + 1;
                const i2 = (r + 1) * (cols + 1) + c;
                const i3 = i2 + 1;
                indices.push(i0, i1, i2);
                indices.push(i1, i3, i2);
            }
        }
        return { vertices, uvs, indices, cols, rows };
    }

    // Skinning Suave Multihueso (Smooth Dual-Bone Skinning con pesos por distancia Gaussiana)
    calculateSkinningWeights(mesh, bones, width, height, maxInfluences = 2) {
        mesh.vertices.forEach(v => {
            const influences = [];
            bones.forEach(b => {
                const bx = b.x * width;
                const by = b.y * height;
                const dist = Math.hypot(v.origX - bx, v.origY - by);
                // Caída de peso por suavizado Gaussiano
                const weight = Math.exp(-Math.pow(dist / (Math.max(width, height) * 0.35), 2));
                influences.push({ boneId: b.id, weight, dist });
            });

            // Ordenar por cercanía/peso
            influences.sort((a, b) => b.weight - a.weight);
            const topInfluences = influences.slice(0, maxInfluences);

            // Normalización de pesos para que sumen 1.0
            const totalWeight = topInfluences.reduce((sum, inf) => sum + inf.weight, 0) || 1.0;
            v.skinning = topInfluences.map(inf => ({
                boneId: inf.boneId,
                weight: inf.weight / totalWeight
            }));
            v.boneId = topInfluences[0].boneId; // Retrocompatibilidad
        });
    }

    // Solver Analítico de Inversa Kinematics (2-Bone IK) para Brazos y Piernas
    solve2BoneIK(rootPos, targetPos, len1, len2, bendPositive = true) {
        const dx = targetPos.x - rootPos.x;
        const dy = targetPos.y - rootPos.y;
        const dist = Math.hypot(dx, dy);

        // Clampar la distancia al alcance máximo de los huesos
        const maxLen = (len1 + len2) * 0.999;
        const minLen = Math.abs(len1 - len2) * 1.001;
        const d = Math.max(minLen, Math.min(maxLen, dist));

        const angleTarget = Math.atan2(dy, dx);
        const cosAngle1 = (len1 * len1 + d * d - len2 * len2) / (2 * len1 * d);
        const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)));

        const cosAngle2 = (len1 * len1 + len2 * len2 - d * d) / (2 * len1 * len2);
        const angle2 = Math.acos(Math.max(-1, Math.min(1, cosAngle2)));

        const bendSign = bendPositive ? 1 : -1;
        const jointAngle1 = angleTarget + angle1 * bendSign;
        const jointAngle2 = (Math.PI - angle2) * bendSign;

        return {
            upperAngle: jointAngle1 * (180 / Math.PI),
            lowerAngle: jointAngle2 * (180 / Math.PI)
        };
    }

    // Interpolación de Poses (Pose Blending / Crossfading entre dos Clips)
    blendPoses(poseA, poseB, weight) {
        const blended = {};
        const allKeys = new Set([...Object.keys(poseA || {}), ...Object.keys(poseB || {})]);
        allKeys.forEach(k => {
            const pA = poseA[k] || { rot: 0, tx: 0, ty: 0 };
            const pB = poseB[k] || { rot: 0, tx: 0, ty: 0 };
            blended[k] = {
                rot: (pA.rot || 0) * (1 - weight) + (pB.rot || 0) * weight,
                tx: (pA.tx || 0) * (1 - weight) + (pB.tx || 0) * weight,
                ty: (pA.ty || 0) * (1 - weight) + (pB.ty || 0) * weight
            };
        });
        return blended;
    }

    // Cálculo de Físicas Secundarias (Spring / Jiggle Physics para cola, pelo o ropa)
    updateSpringPhysics(elemId, bone, targetRot, dt = 0.016) {
        let key = `${elemId}_${bone.id}`;
        let state = this.springStates.get(key) || { rot: targetRot, vel: 0 };
        const stiffness = bone.stiffness || 0.15;
        const damping = bone.damping || 0.8;

        const force = (targetRot - state.rot) * stiffness;
        state.vel = (state.vel + force) * damping;
        state.rot += state.vel;

        this.springStates.set(key, state);
        return state.rot;
    }

    // Renderizado y deformación de imagen por mallas mediante skinning suave
    renderDeformedImage(imgElement, elem, animationClipKey, timeMs, extraOptions = {}) {
        const width = elem.width;
        const height = elem.height;
        let cache = this.canvasCache.get(elem.id);
        const currentRig = elem.customRigBones || (this.rigTemplates[elem.skeletalRigType || "humanoid"]?.bones);

        if (!cache || cache.width !== width || cache.height !== height || cache.rigBones !== currentRig) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const mesh = this.createMeshGrid(width, height, 8, 8);
            const bones = currentRig || this.rigTemplates.humanoid.bones;
            this.calculateSkinningWeights(mesh, bones, width, height, 2);
            cache = { canvas, ctx, mesh, bones, rigBones: currentRig, width, height };
            this.canvasCache.set(elem.id, cache);
        }

        const { canvas, ctx, mesh, bones } = cache;
        ctx.clearRect(0, 0, width, height);

        // Control de Animación y Crossfading
        const clip = this.animationClips[animationClipKey];
        let pose = clip ? clip.evaluate(timeMs) : {};

        if (elem._targetClipKey && elem._blendProgress < 1.0) {
            const clipB = this.animationClips[elem._targetClipKey];
            const poseB = clipB ? clipB.evaluate(timeMs) : {};
            pose = this.blendPoses(pose, poseB, elem._blendProgress);
            elem._blendProgress = Math.min(1.0, (elem._blendProgress || 0) + 0.05);
        }

        // Aplicar FK, IK, Físicas y Deformación sobre Vértices
        mesh.vertices.forEach(v => {
            let finalX = 0;
            let finalY = 0;

            v.skinning.forEach(inf => {
                const boneObj = bones.find(b => b.id === inf.boneId);
                let p = pose[inf.boneId] || { rot: 0, tx: 0, ty: 0 };

                // Físicas de Muelle si el hueso está configurado como Spring
                if (boneObj && boneObj.isSpring) {
                    p.rot = this.updateSpringPhysics(elem.id, boneObj, p.rot);
                }

                const rad = (p.rot || 0) * (Math.PI / 180);
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                const bx = (boneObj ? boneObj.x : 0.5) * width;
                const by = (boneObj ? boneObj.y : 0.5) * height;
                const dx = v.origX - bx;
                const dy = v.origY - by;

                const vx = bx + (dx * cos - dy * sin) + (p.tx || 0);
                const vy = by + (dx * sin + dy * cos) + (p.ty || 0);

                finalX += vx * inf.weight;
                finalY += vy * inf.weight;
            });

            v.x = finalX;
            v.y = finalY;
        });

        // Dibujar triángulos deformados mediante transformaciones afines de Canvas
        const imgW = imgElement.naturalWidth || width;
        const imgH = imgElement.naturalHeight || height;

        for (let i = 0; i < mesh.indices.length; i += 3) {
            const i0 = mesh.indices[i];
            const i1 = mesh.indices[i + 1];
            const i2 = mesh.indices[i + 2];

            const v0 = mesh.vertices[i0];
            const v1 = mesh.vertices[i1];
            const v2 = mesh.vertices[i2];

            const u0 = mesh.uvs[i0].u * imgW; const uv0_v = mesh.uvs[i0].v * imgH;
            const u1 = mesh.uvs[i1].u * imgW; const uv1_v = mesh.uvs[i1].v * imgH;
            const u2 = mesh.uvs[i2].u * imgW; const uv2_v = mesh.uvs[i2].v * imgH;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(v0.x, v0.y);
            ctx.lineTo(v1.x, v1.y);
            ctx.lineTo(v2.x, v2.y);
            ctx.closePath();
            ctx.clip();

            const delta = u0 * (uv1_v - uv2_v) + u1 * (uv2_v - uv0_v) + u2 * (uv0_v - uv1_v);
            if (Math.abs(delta) > 0.0001) {
                const a = (v0.x * (uv1_v - uv2_v) + v1.x * (uv2_v - uv0_v) + v2.x * (uv0_v - uv1_v)) / delta;
                const b = (v0.y * (uv1_v - uv2_v) + v1.y * (uv2_v - uv0_v) + v2.y * (uv0_v - uv1_v)) / delta;
                const c = (v0.x * (u2 - u1) + v1.x * (u0 - u2) + v2.x * (u1 - u0)) / delta;
                const d = (v0.y * (u2 - u1) + v1.y * (u0 - u2) + v2.y * (u1 - u0)) / delta;
                const e = (v0.x * (u1 * uv2_v - u2 * uv1_v) + v1.x * (u2 * uv0_v - u0 * uv2_v) + v2.x * (u0 * uv1_v - u1 * uv0_v)) / delta;
                const f = (v0.y * (u1 * uv2_v - u2 * uv1_v) + v1.y * (u2 * uv0_v - u0 * uv2_v) + v2.y * (u0 * uv1_v - u1 * uv0_v)) / delta;

                ctx.transform(a, b, c, d, e, f);
                ctx.drawImage(imgElement, 0, 0);
            }
            ctx.restore();
        }
        return canvas;
    }

    // =========================================================================
    // MODAL DEL EDITOR INTUITIVO DE ESQUELETOS (RIGGING & NODOS VISUALES)
    // =========================================================================
    openRigEditorModal(elem) {
        this.activeEditingElem = elem;
        const currentType = elem.skeletalRigType || "humanoid";
        this.editingBones = JSON.parse(JSON.stringify(
            elem.customRigBones || this.rigTemplates[currentType]?.bones || this.rigTemplates.humanoid.bones
        ));
        this.selectedBoneId = this.editingBones[0]?.id || null;
        this.isTestingAnim = false;

        let modal = document.getElementById('skeletal-editor-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'skeletal-editor-modal';
            modal.style.cssText = `
                position: fixed; inset: 0; z-index: 99999;
                background: rgba(0,0,0,0.75); backdrop-filter: blur(15px);
                display: flex; align-items: center; justify-content: center;
            `;
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background: #ffffff; width: 920px; max-width: 95vw; height: 620px; max-height: 90vh; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.3);">
                <!-- Header del Modal -->
                <div style="padding: 12px 20px; background: rgba(0,0,0,0.03); border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <strong style="font-size: 13px; color: var(--text-primary);">Editor Esquelético Avanzado 2D (Skinning, IK & Springs)</strong>
                        <span style="font-size: 10px; color: var(--text-secondary); background: #eee; padding: 2px 6px; border-radius: 4px;">Asset: ${elem.image || 'Texto'}</span>
                    </div>
                    <button id="close-skel-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
                </div>
                <!-- Cuerpo del Editor -->
                <div style="display: flex; flex: 1; overflow: hidden;">
                    <!-- Canvas de Edición -->
                    <div style="flex: 1; background: #222226; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        <canvas id="skel-editor-canvas" width="500" height="500" style="border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); cursor: crosshair;"></canvas>
                        <div style="position: absolute; bottom: 12px; left: 12px; color: rgba(255,255,255,0.7); font-size: 10px; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 6px;">
                            Arrastra las articulaciones sobre la imagen para posicionar el esqueleto.
                        </div>
                    </div>
                    <!-- Panel de Controles -->
                    <div style="width: 340px; background: #fafafa; border-left: 1px solid var(--border-subtle); padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto;">
                        <div class="sidebar-title">Plantillas de Esqueleto</div>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn" id="btn-rig-humanoid" style="flex: 1; font-size: 10px;">Humanoide IK</button>
                            <button class="btn" id="btn-rig-quadruped" style="flex: 1; font-size: 10px;">Cuadrúpedo Spring</button>
                        </div>
                        <hr style="border: none; border-top: 1px solid var(--border-subtle);">
                        <div class="sidebar-title">Añadir / Eliminar Nodos</div>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn" id="btn-add-bone" style="flex: 1; background: #0071e3; color: white; border: none; font-size: 10px; padding: 6px;">+ Nuevo Hueso</button>
                            <button class="btn" id="btn-remove-bone" style="background: #ff3b30; color: white; border: none; font-size: 10px; padding: 6px;">Eliminar</button>
                        </div>
                        <div id="skel-bone-properties" style="background: #fff; border: 1px solid var(--border-subtle); padding: 10px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">
                            <strong style="font-size: 11px; color: var(--accent-blue);" id="skel-bone-title">Selecciona un Nodo</strong>
                            <div class="form-group">
                                <label style="font-size: 9px;">Nombre del Hueso:</label>
                                <input type="text" id="skel-bone-name-input" style="font-size: 10px; padding: 4px;">
                            </div>
                            <div class="form-group">
                                <label style="font-size: 9px;">Hueso Padre (Parent):</label>
                                <select id="skel-bone-parent-select" style="font-size: 10px; padding: 4px;"></select>
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                                <input type="checkbox" id="skel-bone-spring-chk" style="width: auto;">
                                <label for="skel-bone-spring-chk" style="font-size: 10px; margin: 0;">Activar Físicas de Muelle (Jiggle/Spring)</label>
                            </div>
                        </div>
                        <hr style="border: none; border-top: 1px solid var(--border-subtle);">
                        <div class="sidebar-title">Testeo en Vivo y Crossfade</div>
                        <div class="form-group">
                            <label style="font-size: 10px;">Probar Animación:</label>
                            <select id="skel-test-anim-select" style="font-size: 11px;">
                                <option value="humanoid_idle">Humano - Respiración</option>
                                <option value="humanoid_walk">Humano - Andar</option>
                                <option value="humanoid_dance">Humano - Bailar</option>
                                <option value="humanoid_fight">Humano - Pelear</option>
                                <option value="humanoid_grab">Humano - Coger Objeto</option>
                                <option value="quadruped_walk">Cuadrúpedo - Andar</option>
                            </select>
                        </div>
                        <button class="btn" id="btn-toggle-test-anim" style="background: #34c759; color: white; border: none; font-weight: 600;">
                            Probar Animación
                        </button>
                        <div style="flex: 1;"></div>
                        <button class="btn" id="btn-save-rig" style="background: #0071e3; color: white; border: none; font-weight: 600; padding: 10px; width: 100%;">
                            Guardar Esqueleto y Malla
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        this.setupRigEditorEvents();
        this.startRigEditorLoop();
    }

    setupRigEditorEvents() {
        const modal = document.getElementById('skeletal-editor-modal');
        const canvas = document.getElementById('skel-editor-canvas');

        document.getElementById('close-skel-modal').onclick = () => {
            modal.style.display = 'none';
            this.isTestingAnim = false;
        };

        document.getElementById('btn-rig-humanoid').onclick = () => {
            this.editingBones = JSON.parse(JSON.stringify(this.rigTemplates.humanoid.bones));
            this.selectedBoneId = "root";
            this.updateBonePropertiesForm();
        };

        document.getElementById('btn-rig-quadruped').onclick = () => {
            this.editingBones = JSON.parse(JSON.stringify(this.rigTemplates.quadruped.bones));
            this.selectedBoneId = "root";
            this.updateBonePropertiesForm();
        };

        document.getElementById('btn-add-bone').onclick = () => {
            const newId = "bone_" + Date.now().toString(36).substring(4);
            const parentId = this.selectedBoneId || "root";
            const parentObj = this.editingBones.find(b => b.id === parentId);
            const newX = parentObj ? Math.min(0.9, parentObj.x + 0.08) : 0.5;
            const newY = parentObj ? parentObj.y : 0.5;

            this.editingBones.push({
                id: newId,
                name: "Nuevo Nodo " + (this.editingBones.length + 1),
                parent: parentId,
                x: newX,
                y: newY,
                angle: 0,
                length: 0.1
            });
            this.selectedBoneId = newId;
            this.updateBonePropertiesForm();
        };

        document.getElementById('btn-remove-bone').onclick = () => {
            if (this.editingBones.length <= 1) {
                alert("No puedes borrar el único nodo del esqueleto.");
                return;
            }
            this.editingBones = this.editingBones.filter(b => b.id !== this.selectedBoneId);
            this.selectedBoneId = this.editingBones[0].id;
            this.updateBonePropertiesForm();
        };

        document.getElementById('btn-toggle-test-anim').onclick = (e) => {
            this.isTestingAnim = !this.isTestingAnim;
            e.target.textContent = this.isTestingAnim ? "Detener Prueba" : "Probar Animación";
            e.target.style.background = this.isTestingAnim ? "#ff9500" : "#34c759";
        };

        document.getElementById('btn-save-rig').onclick = () => {
            if (this.activeEditingElem) {
                this.activeEditingElem.customRigBones = JSON.parse(JSON.stringify(this.editingBones));
                this.activeEditingElem.hasSkeletalAnim = true;
                this.canvasCache.delete(this.activeEditingElem.id);
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
                if (typeof renderStage === 'function') renderStage();
            }
            modal.style.display = 'none';
        };

        // Drag and Drop de Articulaciones
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / rect.width;
            const mouseY = (e.clientY - rect.top) / rect.height;

            let clickedBone = null;
            let minDist = 0.06;

            this.editingBones.forEach(b => {
                const dist = Math.hypot(b.x - mouseX, b.y - mouseY);
                if (dist < minDist) {
                    minDist = dist;
                    clickedBone = b;
                }
            });

            if (clickedBone) {
                this.selectedBoneId = clickedBone.id;
                this.isDraggingJoint = true;
                this.updateBonePropertiesForm();
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDraggingJoint || !this.selectedBoneId) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
            const mouseY = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height));

            const bone = this.editingBones.find(b => b.id === this.selectedBoneId);
            if (bone) {
                bone.x = Math.round(mouseX * 1000) / 1000;
                bone.y = Math.round(mouseY * 1000) / 1000;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDraggingJoint = false;
        });

        const nameInput = document.getElementById('skel-bone-name-input');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                const bone = this.editingBones.find(b => b.id === this.selectedBoneId);
                if (bone) bone.name = e.target.value;
            });
        }

        const parentSelect = document.getElementById('skel-bone-parent-select');
        if (parentSelect) {
            parentSelect.addEventListener('change', (e) => {
                const bone = this.editingBones.find(b => b.id === this.selectedBoneId);
                if (bone) bone.parent = e.target.value || null;
            });
        }

        const springChk = document.getElementById('skel-bone-spring-chk');
        if (springChk) {
            springChk.addEventListener('change', (e) => {
                const bone = this.editingBones.find(b => b.id === this.selectedBoneId);
                if (bone) {
                    bone.isSpring = e.target.checked;
                    bone.stiffness = 0.15;
                    bone.damping = 0.8;
                }
            });
        }

        this.updateBonePropertiesForm();
    }

    updateBonePropertiesForm() {
        const title = document.getElementById('skel-bone-title');
        const nameInput = document.getElementById('skel-bone-name-input');
        const parentSelect = document.getElementById('skel-bone-parent-select');
        const springChk = document.getElementById('skel-bone-spring-chk');

        if (!title || !nameInput || !parentSelect) return;

        const bone = this.editingBones.find(b => b.id === this.selectedBoneId);
        if (!bone) return;

        title.textContent = `Nodo: ${bone.name || bone.id}`;
        nameInput.value = bone.name || bone.id;
        if (springChk) springChk.checked = !!bone.isSpring;

        parentSelect.innerHTML = '<option value="">Sin Padre (Raíz)</option>';
        this.editingBones.forEach(b => {
            if (b.id !== bone.id) {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name || b.id;
                if (b.id === bone.parent) opt.selected = true;
                parentSelect.appendChild(opt);
            }
        });
    }

    startRigEditorLoop() {
        const canvas = document.getElementById('skel-editor-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const renderLoop = () => {
            const modal = document.getElementById('skeletal-editor-modal');
            if (!modal || modal.style.display === 'none') return;

            const elem = this.activeEditingElem;
            const asset = assetsMap[elem.image];
            const rawImg = new Image();
            rawImg.src = asset ? (asset.dataUrl || asset.url) : elem.image;

            canvas.width = 500;
            canvas.height = 500;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Dibujar Imagen base o Canvas Deformado por Skinning Suave
            if (this.isTestingAnim && rawImg.complete) {
                const testClipKey = document.getElementById('skel-test-anim-select').value;
                const tempElem = { ...elem, width: 500, height: 500, customRigBones: this.editingBones };
                const defCanvas = this.renderDeformedImage(rawImg, tempElem, testClipKey, Date.now());
                ctx.drawImage(defCanvas, 0, 0, 500, 500);
            } else if (rawImg.complete && rawImg.naturalWidth > 0) {
                ctx.drawImage(rawImg, 0, 0, 500, 500);
            }

            // Dibujar overlay de huesos y articulaciones
            this.editingBones.forEach(b => {
                const bx = b.x * canvas.width;
                const by = b.y * canvas.height;

                // Conexión con el padre
                if (b.parent) {
                    const pObj = this.editingBones.find(p => p.id === b.parent);
                    if (pObj) {
                        const px = pObj.x * canvas.width;
                        const py = pObj.y * canvas.height;
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        ctx.lineTo(bx, by);
                        ctx.strokeStyle = b.isSpring ? "#ff9500" : "#0071e3";
                        ctx.lineWidth = 3;
                        ctx.stroke();
                    }
                }

                // Articulación (Joint)
                const isSelected = b.id === this.selectedBoneId;
                ctx.beginPath();
                ctx.arc(bx, by, isSelected ? 8 : 6, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? "#ff3b30" : (b.isSpring ? "#ff9500" : "#0071e3");
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Etiqueta del nodo
                ctx.fillStyle = "#ffffff";
                ctx.font = "10px sans-serif";
                ctx.shadowColor = "black";
                ctx.shadowBlur = 4;
                ctx.fillText(b.name || b.id, bx + 10, by + 4);
                ctx.shadowBlur = 0;
            });

            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }
}

const skeletalAnimationEngine = new SkeletalAnimationEngine();