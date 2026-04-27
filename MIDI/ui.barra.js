// ─── PROGRESS BAR (ui.barra.js) ───────────────────────────────
const ProgressBar = {
  container: null,
  bar: null,
  textEl: null,

  init() {
    if (document.getElementById('silenos-progress-container')) return;

    // Inyección de estilos minimalistas (sin bordes, negro y gris)
    const style = document.createElement('style');
    style.innerHTML = `
      #silenos-progress-container {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 3px;
        background-color: #e0e0e0; /* Gris */
        z-index: 9999;
        display: none;
      }
      #silenos-progress-bar {
        height: 100%;
        width: 0%;
        background-color: #000; /* Negro */
        transition: width 0.4s ease;
      }
      #silenos-progress-text {
        position: fixed;
        top: 8px; left: 50%;
        transform: translateX(-50%);
        font-family: 'Georgia', serif;
        font-size: 10px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: #000;
        background: rgba(255,255,255,0.95);
        padding: 4px 12px;
        display: none;
        z-index: 9999;
      }
    `;
    document.head.appendChild(style);

    // Creación de elementos
    const container = document.createElement('div');
    container.id = 'silenos-progress-container';
    
    const bar = document.createElement('div');
    bar.id = 'silenos-progress-bar';
    container.appendChild(bar);

    const textEl = document.createElement('div');
    textEl.id = 'silenos-progress-text';

    document.body.appendChild(container);
    document.body.appendChild(textEl);

    this.container = container;
    this.bar = bar;
    this.textEl = textEl;
  },

  show(text) {
    this.init();
    this.container.style.display = 'block';
    this.textEl.style.display = 'block';
    this.update(0, text);
  },

  update(percent, text) {
    if (!this.container) return;
    this.bar.style.width = `${percent}%`;
    if (text) this.textEl.textContent = `${text} — ${Math.floor(percent)}%`;
  },

  hide() {
    if (!this.container) return;
    this.container.style.display = 'none';
    this.textEl.style.display = 'none';
    this.bar.style.width = '0%';
  }
};

window.ProgressBar = ProgressBar;