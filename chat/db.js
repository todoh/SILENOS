/**
 * Helper de almacenamiento persistente directo en carpeta local para búferes de gran tamaño
 */
import { directoryHandle, writeJSONToDirectory, readJSONFromDirectory } from './conversations.js';

export async function getBufferContent(bufferId) {
    if (!directoryHandle) return '';
    const data = await readJSONFromDirectory(`buffer_${bufferId}.json`);
    return data ? data.content : '';
}

export async function saveBufferContent(bufferId, content, append = true) {
    if (!directoryHandle) throw new Error("No hay una carpeta de trabajo cargada.");
    let finalContent = content;
    if (append) {
        const current = await getBufferContent(bufferId);
        finalContent = current + content;
    }
    await writeJSONToDirectory(`buffer_${bufferId}.json`, {
        id: bufferId,
        content: finalContent,
        updatedAt: Date.now()
    });
    return "Escritura completada en búfer local: " + bufferId;
}