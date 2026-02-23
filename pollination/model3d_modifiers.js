// model3d_modifiers.js
import * as THREE from 'three';

// --- SISTEMA AVANZADO DE MODIFICADORES GEOMÉTRICOS ---
export const GeometryModifiers = {
    // 1. RUIDO (ROUGHEN): Mueve vértices aleatoriamente para simular superficie natural
    roughen: (geometry, intensity = 0.1) => {
        const pos = geometry.attributes.position;
        const vector = new THREE.Vector3();

        for (let i = 0; i < pos.count; i++) {
            vector.fromBufferAttribute(pos, i);
            const normal = vector.clone().normalize();
            const noise = (Math.random() - 0.5) * intensity; 
            const wave = Math.sin(vector.x * 2) * Math.sin(vector.y * 3) * Math.sin(vector.z * 2) * (intensity * 0.5);
            vector.addScaledVector(normal, noise + wave);
            pos.setXYZ(i, vector.x, vector.y, vector.z);
        }
        geometry.computeVertexNormals(); 
        pos.needsUpdate = true;
    },

    // 2. APLANAR (FLATTEN): Aplana la base para que el objeto se asiente bien en el suelo
    flatten: (geometry, axis = 'y', threshold = 0.0) => {
        const pos = geometry.attributes.position;
        geometry.computeBoundingBox();
        const min = geometry.boundingBox.min[axis];
        const max = geometry.boundingBox.max[axis];
        const height = max - min;
        const limit = min + (height * Math.abs(threshold)); 

        for (let i = 0; i < pos.count; i++) {
            const val = (axis === 'y') ? pos.getY(i) : (axis === 'x' ? pos.getX(i) : pos.getZ(i));
            if (val < limit) {
                if (axis === 'y') pos.setY(i, limit);
                else if (axis === 'x') pos.setX(i, limit);
                else pos.setZ(i, limit);
            }
        }
        pos.needsUpdate = true;
        geometry.computeVertexNormals();
    },

    // 3. ESTRECHAR (TAPER): Hace que el objeto sea más fino arriba (ideal para troncos)
    taper: (geometry, factor = 0.5) => {
        geometry.computeBoundingBox();
        const min = geometry.boundingBox.min.y;
        const max = geometry.boundingBox.max.y;
        const range = max - min;

        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const x = pos.getX(i);
            const z = pos.getZ(i);

            const h = (y - min) / range;
            const scale = 1.0 - (h * (1.0 - factor));
            
            pos.setX(i, x * scale);
            pos.setZ(i, z * scale);
        }
        pos.needsUpdate = true;
        geometry.computeVertexNormals();
    },
    
    // 4. DISTORSIÓN (JITTER): Efecto glitch o viento congelado
    distort: (geometry, x = 0, y = 0, z = 0) => {
         const pos = geometry.attributes.position;
         for (let i = 0; i < pos.count; i++) {
             pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * x);
             pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * y);
             pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * z);
         }
         geometry.computeVertexNormals();
         pos.needsUpdate = true;
    },

    // 5. DESPLAZAMIENTO POR TEXTURA: Usa el brillo de la imagen para deformar la malla en 3D
    displaceFromImage: (geometry, image, strength = 0.2) => {
        const canvas = document.createElement('canvas');
        canvas.width = 128; 
        canvas.height = 128;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, 128, 128);
        const data = ctx.getImageData(0, 0, 128, 128).data;

        const pos = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        const vector = new THREE.Vector3();
        const normal = new THREE.Vector3();

        geometry.computeVertexNormals();
        const norms = geometry.attributes.normal;

        for (let i = 0; i < pos.count; i++) {
            const u = uv.getX(i);
            const v = uv.getY(i); 

            let px = Math.floor(u * 127);
            let py = Math.floor((1 - v) * 127); 

            px = Math.max(0, Math.min(127, px));
            py = Math.max(0, Math.min(127, py));

            const index = (py * 128 + px) * 4;
            const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
            const displacement = (brightness / 255) * strength;

            vector.fromBufferAttribute(pos, i);
            normal.fromBufferAttribute(norms, i);
            vector.addScaledVector(normal, displacement);

            pos.setXYZ(i, vector.x, vector.y, vector.z);
        }

        pos.needsUpdate = true;
        geometry.computeVertexNormals(); 
    }
};