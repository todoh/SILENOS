import { showToast } from './ui.js';

// REFERENCIAS DEL SISTEMA DE ARCHIVOS Y CACHÉ
export let directoryHandle = null;
export let imagesDirectoryHandle = null;
export let imageCacheUrls = {}; // mapea nombre_archivo -> blobURL local de memoria

export function setDirectoryHandle(handle) { directoryHandle = handle; }
export function setImagesDirectoryHandle(handle) { imagesDirectoryHandle = handle; }
export function clearImageCache() { imageCacheUrls = {}; }

// GUARDAR EL ESTADO DIRECTAMENTE AL ARCHIVO FISICO LOCAL
export async function saveStateToFile(state) {
  if (!directoryHandle) return;

  try {
    const fileHandle = await directoryHandle.getFileHandle('inventario.json', { create: true });
    const writable = await fileHandle.createWritable();
    
    const dataToSave = {
      collections: state.collections,
      books: state.books
    };

    await writable.write(JSON.stringify(dataToSave, null, 2));
    await writable.close();
    console.log("Inventario sincronizado físicamente.");
  } catch (err) {
    console.error("Error al guardar en el archivo: ", err);
    showToast("No se pudo autoguardar el archivo JSON.", "rose-500");
  }
}

// EXPORTACIÓN MANUAL (FALLBACK EN CASO DE SAFARI / NO SOPORTADO)
export function exportJSON(state) {
  const dataToSave = {
    collections: state.collections,
    books: state.books
  };
  const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "inventario_libros.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Archivo JSON exportado con éxito.");
}

// RESOLVER IMAGEN LOCAL ASÍNCRONAMENTE
export async function resolveBookCoverUrl(fileName) {
  if (!fileName) return null;
  
  // Limpiar posibles prefijos de rutas como "imagenes/" para extraer solo el nombre de archivo básico
  const cleanFileName = fileName.split('/').pop();

  if (imageCacheUrls[cleanFileName]) {
    return imageCacheUrls[cleanFileName];
  }

  if (imagesDirectoryHandle) {
    try {
      const fileHandle = await imagesDirectoryHandle.getFileHandle(cleanFileName);
      const file = await fileHandle.getFile();
      const url = URL.createObjectURL(file);
      imageCacheUrls[cleanFileName] = url;
      return url;
    } catch (err) {
      console.warn(`No se pudo cargar la portada localmente: ${cleanFileName}`);
    }
  }

  if (fileName.startsWith('data:image') || fileName.startsWith('http')) {
    return fileName;
  }

  return null;
}

// GUARDAR IMAGEN EN LA CARPETA LOCAL Y DEVOLVER EL NOMBRE ORGANIZADO
export async function saveImageToLocalFolder(file, bookId) {
  if (!imagesDirectoryHandle) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  try {
    const fileExtension = file.name.split('.').pop();
    const organizedFileName = `libro_${bookId}.${fileExtension}`;

    const fileHandle = await imagesDirectoryHandle.getFileHandle(organizedFileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();

    delete imageCacheUrls[organizedFileName];

    return organizedFileName;
  } catch (err) {
    console.error("No se pudo escribir el archivo de imagen: ", err);
    showToast("Error al guardar la imagen en la carpeta.", "rose-500");
    return null;
  }
}

// BORRAR ARCHIVO FÍSICO DE PORTADA
export async function deleteImageFile(fileName) {
  if (!fileName) return;

  // Limpiar posibles prefijos de rutas como "imagenes/" antes de evaluar e intentar eliminar
  const cleanFileName = fileName.split('/').pop();

  if (imagesDirectoryHandle && cleanFileName && cleanFileName.startsWith('libro_')) {
    try {
      await imagesDirectoryHandle.removeEntry(cleanFileName);
      delete imageCacheUrls[cleanFileName];
      console.log(`Archivo de imagen ${cleanFileName} eliminado físicamente.`);
    } catch (e) {
      console.warn("No se pudo eliminar el archivo físico de portada.", e);
    }
  }
}