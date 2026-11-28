"use strict";

// Cada generador define sus controles y devuelve la vista y el código reutilizable.
const cssTools = Object.create(null);
const number = (label, value, min, max, step = 1) => ({ label, value, min, max, step, type: "number" });
const color = (label, value) => ({ label, value, type: "color" });
const select = (label, options) => ({ label, options, type: "select" });
const area = (label, value) => ({ label, value, type: "textarea" });
const toggle = (label, value = true) => ({ label, value, type: "checkbox" });
const upload = label => ({ label, type: "file" });
const words = (label, value) => ({ label, value, type: "text" });
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const hexColor = value => /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value);
const rgba = (hex, alpha) => {
  const rgb = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16));
  return 'rgb(' + rgb.join(' ') + ' / ' + alpha + ')';
};
const block = (selector, declarations) => selector + ' {\n  ' + declarations.join('\n  ') + '\n}';
const sample = (rules, html = '<div class="demo"></div>', extra = {}) => ({ css: rules, html, ...extra });
const boxes = count => Array.from({ length: count }, (_, i) => '<div class="item">' + (i + 1) + '</div>').join('');
const panel = css => sample(block('.demo', css));
const safeImage = value => value ? 'url("' + value + '")' : '';
const readRows = value => value.trim().split(/\r?\n/).filter(line => line.trim()).map(line => line.trim().split(/\s+/));
const numeric = (s, min, max) => s !== undefined && s !== '' && Number.isFinite(Number(s)) && Number(s) >= min && Number(s) <= max;

function startCssTool() {
  const tool = cssTools[document.documentElement.dataset.tool];
  const root = document.getElementById('css-tool');
  const form = document.createElement('form');
  form.className = 'css-controls';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const frame = document.createElement('iframe');
  frame.title = 'Vista previa de la herramienta';
  frame.setAttribute('sandbox', '');
  frame.hidden = true;

  const code = document.createElement('textarea');
  code.readOnly = true;
  code.rows = 8;
  code.setAttribute('aria-label', 'Código o resultados generados');
  const actions = document.createElement('div');
  actions.className = 'css-actions';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'Copiar resultado';
  const download = document.createElement('button');
  download.type = 'button';
  download.textContent = 'Descargar';
  actions.append(copy, download);
  const preview = document.createElement('div');
  preview.className = 'css-preview';
  preview.append(frame);
  root.append(form, status, preview, actions, code);
  let filename = 'silenos.css';
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(code.value);
      status.textContent = 'Resultado copiado.';
    } catch {
      code.select();
      status.textContent = 'Resultado seleccionado. Cópialo con el teclado.';
    }
  };
  download.onclick = () => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([code.value], {type:'text/plain;charset=utf-8'}));
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const values = {};
  const inputs = {};
  for (const [key, field] of Object.entries(tool.fields)) {
    const label = document.createElement('label');
    const input = document.createElement(field.type === 'select' ? 'select' : field.type === 'textarea' ? 'textarea' : 'input');
    inputs[key] = input;
    label.append(field.label, input);
    form.append(label);
    if (field.type === 'select') {
      for (const option of field.options) input.add(new Option(option, option));
    } else if (field.type === 'textarea') {
      input.rows = 4;
    } else {
      input.type = field.type;
    }
    if (field.type === 'number') {
      Object.assign(input, {min:field.min, max:field.max, step:field.step, required:true});
    }
    if (field.type === 'checkbox') input.checked = field.value;
    else if (field.value !== undefined) input.value = field.value;
    if (field.type === 'file') {
      input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/x-icon';
      input.addEventListener('change', async () => {
        const file = input.files[0];
        values[key] = '';
        if (!file) return update();
        if (file.size > 5 * 1024 * 1024 || !/^image\/(png|jpeg|webp|gif|x-icon|vnd.microsoft.icon)$/.test(file.type)) {
          input.value = '';
          update();
          status.textContent = 'Selecciona una imagen compatible de hasta 5 MB.';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (file !== input.files[0]) return;
          values[key] = reader.result;
          update();
        };
        reader.onerror = () => { status.textContent = 'No se pudo leer la imagen.'; };
        reader.readAsDataURL(file);
      });
    } else {
      const read = () => field.type === 'checkbox' ? input.checked : field.type === 'number' ? input.valueAsNumber : input.value;
      values[key] = read();
      input.addEventListener('input', () => {
        values[key] = read();
        update();
      });
    }
  }
  form.addEventListener('submit', event => event.preventDefault());
  function update() {
    try {
      if (!form.checkValidity()) throw new Error('Revisa los valores numéricos de los controles.');
      const output = tool.render(values);
      status.textContent = output.note || '';
      filename = output.filename || (output.css !== undefined ? 'silenos.css' : 'silenos.txt');
      code.value = output.code ?? output.css ?? '';
      code.hidden = actions.hidden = !code.value;
      preview.hidden = frame.hidden = !output.html;
      if (output.html) {
        frame.style.width = output.width ? output.width + 'px' : '100%';
        frame.style.maxWidth = output.width ? 'none' : '100%';
        frame.style.height = (output.height || 340) + 'px';
        const css = (output.previewCSS ?? output.css ?? '').replace(/<\/style/gi, '<\\/style');
        const base = '*, *::before, *::after {box-sizing:border-box} body{margin:0;padding:22px;background:#e8edf3;color:#162034;font:16px system-ui} .demo{width:min(100%,320px);height:190px;margin:26px auto;background:#7c95ef} .item{background:#c8d4ff;border:1px solid #879de8;padding:12px}';
        frame.srcdoc = '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; form-action \'none\'; base-uri \'none\'"><style>' + (output.raw ? '' : base) + css + '</style><body>' + output.html;
      }
    } catch (error) {
      status.textContent = error.message;
      preview.hidden = frame.hidden = code.hidden = actions.hidden = true;
    }
  }
  if (tool.setup) tool.setup({ form, inputs, preview });
  update();
}
