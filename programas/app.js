const $ = (selector) => document.querySelector(selector);
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open('html-library-cache', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('documents', { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function store(mode, action) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', mode);
    const request = action(tx.objectStore('documents'));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const allSaved = () => store('readonly', (s) => s.getAll());
const getSaved = (id) => store('readonly', (s) => s.get(id));
const putSaved = (doc) => store('readwrite', (s) => s.put(doc));
const removeSaved = (id) => store('readwrite', (s) => s.delete(id));

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const prettySize = (bytes) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(0)} KB`;
function filenameVersion(name) {
  const match = name.match(/(?:[_\s(-]v?)(\d+(?:\.\d+){0,3})(?=\)?\.html?$)/i);
  if (!match) return { key: name.toLocaleLowerCase('es').replace(/\.html?$/i, ''), version: null };
  const prefix = name.slice(0, match.index).replace(/[\s_-]+$/, '');
  return { key: prefix.toLocaleLowerCase('es'), version: match[1].split('.').map(Number) };
}
function compareVersions(left, right) {
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const delta = (left[i] || 0) - (right[i] || 0);
    if (delta) return delta;
  }
  return 0;
}
let driveFiles = [];

function notify(message, kind = '') {
  const el = $('#notice');
  el.textContent = message;
  el.className = `notice ${kind}`;
}

async function loadFiles() {
  const manualFiles = (window.HTML_LIBRARY || []).map((item) => {
    const match = item.url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
    return { id: item.id || match?.[1] || item.url, name: item.name || 'Documento HTML', url: item.url };
  });
  const config = window.DRIVE_CONFIG || {};
  if (!config.apiKey || !config.folderId) {
    driveFiles = manualFiles;
    notify('');
    await renderFiles();
    return;
  }
  $('#count').textContent = 'Cargando…';
  $('#files').innerHTML = '<div class="loading"><span></span> Cargando…</div>';
  try {
    const params = new URLSearchParams({
      q: `'${config.folderId}' in parents and trashed = false`,
      key: config.apiKey,
      pageSize: '1000',
      orderBy: 'name',
      fields: 'files(id,name,mimeType,size,modifiedTime),nextPageToken'
    });
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Drive respondió ${response.status}`);
    const listed = (data.files || []).filter((file) => /\.html?$/i.test(file.name));
    driveFiles = [...listed, ...manualFiles.filter((manual) => !listed.some((file) => file.id === manual.id))];
    notify('');
    await renderFiles();
  } catch (error) {
    driveFiles = manualFiles;
    notify(`No se pudo leer la carpeta de Drive: ${error.message}`, 'error');
    await renderFiles();
  }
}

async function renderFiles() {
  const savedDocs = await allSaved();
  const cached = new Map(savedDocs.map((doc) => [doc.id, doc]));
  const visible = driveFiles;
  $('#count').textContent = `${visible.length} ${visible.length === 1 ? 'archivo' : 'archivos'}`;
  $('#empty').hidden = visible.length > 0;
  $('#files').innerHTML = visible.map((file) => {
    const fileVersion = filenameVersion(file.name);
    const saved = cached.get(file.id) || savedDocs.find((doc) => doc.logicalKey === fileVersion.key);
    const savedVersion = saved?.nameVersion || filenameVersion(saved?.name || '').version;
    const hasUpdate = saved && fileVersion.version && savedVersion && compareVersions(fileVersion.version, savedVersion) > 0;
    const isOlder = saved && fileVersion.version && savedVersion && compareVersions(fileVersion.version, savedVersion) < 0;
    const action = hasUpdate ? 'update' : 'cache';
    const label = hasUpdate ? 'Actualizar' : isOlder ? 'Versión antigua' : saved ? '✓ Guardado' : '↓ Guardar';
    const disabled = saved && !hasUpdate;
    return `<article class="file-row"><div class="file-icon">&lt;/&gt;</div><div class="file-info"><strong title="${esc(file.name)}">${esc(file.name)}</strong><span>${file.size ? prettySize(Number(file.size)) : 'HTML'}${file.modifiedTime ? ` · ${new Date(file.modifiedTime).toLocaleDateString('es-ES')}` : ''}${fileVersion.version ? ` · v${esc(fileVersion.version.join('.'))}` : ''}</span></div><button class="button ${disabled ? 'button-cached' : 'button-outline'}" data-${action}="${esc(file.id)}" ${disabled ? 'disabled' : ''}>${label}</button></article>`;
  }).join('');
  $('#files').querySelectorAll('[data-cache]').forEach((button) => button.addEventListener('click', () => cacheFile(button.dataset.cache, button)));
  $('#files').querySelectorAll('[data-update]').forEach((button) => button.addEventListener('click', () => cacheFile(button.dataset.update, button)));
}

async function cacheFile(id, button) {
  const file = driveFiles.find((item) => item.id === id);
  if (!file) return;
  button.disabled = true;
  button.textContent = 'Descargando…';
  try {
    // Drive API permite leer el blob público desde la app si la clave y permisos son válidos.
    const apiKey = window.DRIVE_CONFIG?.apiKey;
    const url = apiKey
      ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(apiKey)}`
      : `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Descarga fallida (${response.status})`);
    }
    const html = await response.text();
    if (!/<!doctype html|<html[\s>]/i.test(html)) throw new Error('Drive no devolvió el contenido HTML esperado');
    const fileVersion = filenameVersion(file.name);
    const previous = (await allSaved()).filter((doc) => doc.logicalKey === fileVersion.key && doc.id !== id);
    for (const doc of previous) await removeSaved(doc.id);
    await putSaved({ id, name: file.name, logicalKey: fileVersion.key, nameVersion: fileVersion.version, html, size: new Blob([html]).size, cachedAt: Date.now() });
    notify(`“${file.name}” está actualizado en este navegador.`, 'success');
    await renderFiles();
    await renderSaved();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Abrir Drive';
    button.onclick = () => window.open(file.url, '_blank', 'noopener,noreferrer');
    notify('Drive bloquea la descarga directa desde esta web. Descarga el HTML desde Drive y luego pulsa «Importar HTML» para guardarlo en esta caché.', 'error');
  }
}

async function renderSaved() {
  const docs = (await allSaved()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  $('#saved-count').textContent = docs.length;
  $('#saved').innerHTML = docs.length ? docs.map((doc) => `<article class="saved-row"><div class="file-icon saved-icon">✓</div><div class="file-info"><strong title="${esc(doc.name)}">${esc(doc.name)}</strong><span>${prettySize(doc.size)} · Guardado ${new Date(doc.cachedAt).toLocaleDateString('es-ES')}</span></div><button class="text-button open-doc" data-open="${esc(doc.id)}">Abrir</button><button class="remove-button" data-remove="${esc(doc.id)}" aria-label="Quitar ${esc(doc.name)}">×</button></article>`).join('') : '<div class="saved-empty">Aún no has guardado ningún HTML.</div>';
  $('#saved').querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => openSaved(button.dataset.open)));
  $('#saved').querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', async () => { await removeSaved(button.dataset.remove); await renderSaved(); await renderFiles(); }));
}

async function openSaved(id) {
  const doc = await getSaved(id);
  if (!doc) return;
  const blob = new Blob([doc.html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank', 'noopener,noreferrer');
  if (!tab) {
    URL.revokeObjectURL(url);
    notify('El navegador bloqueó la nueva pestaña. Permite las ventanas emergentes para SILENOS e inténtalo de nuevo.', 'error');
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

$('#refresh').addEventListener('click', loadFiles);
$('#import-html').addEventListener('change', async (event) => {
  for (const file of event.target.files || []) {
    if (!/\.html?$/i.test(file.name)) continue;
    const html = await file.text();
    const id = `local:${file.name}:${file.size}:${file.lastModified}`;
    const fileVersion = filenameVersion(file.name);
    await putSaved({ id, name: file.name, logicalKey: fileVersion.key, nameVersion: fileVersion.version, html, size: file.size, cachedAt: Date.now() });
  }
  event.target.value = '';
  notify('HTML importado en la caché de este navegador.', 'success');
  await renderSaved();
});
$('#clear-cache').addEventListener('click', async () => {
  if (!confirm('¿Quitar todos los HTML guardados en este navegador?')) return;
  for (const doc of await allSaved()) await removeSaved(doc.id);
  await renderSaved();
  await renderFiles();
});
$('#close-preview').addEventListener('click', () => $('#preview').close());
$('#preview').addEventListener('close', () => { $('#preview-frame').srcdoc = ''; });

loadFiles();
renderSaved();
