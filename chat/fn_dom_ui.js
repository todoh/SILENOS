// fn_dom_ui.js
// Módulo de Manipulación de DOM y Componentes UI

export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = val;
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val);
    } else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else {
      el.setAttribute(key, val);
    }
  }
  if (typeof children === 'string') {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        el.appendChild(child);
      }
    });
  }
  return el;
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

export function addClass(el, className) {
  if (el) el.classList.add(...className.split(' ').filter(Boolean));
}

export function removeClass(el, className) {
  if (el) el.classList.remove(...className.split(' ').filter(Boolean));
}

export function toggleClass(el, className, force) {
  if (el) return el.classList.toggle(className, force);
  return false;
}

export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = createElement('div', {
      id: 'toast-container',
      style: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '9999',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }
    });
    document.body.appendChild(container);
  }

  const bgColors = {
    info: '#2563eb',
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706'
  };

  const toast = createElement('div', {
    style: {
      backgroundColor: bgColors[type] || bgColors.info,
      color: '#ffffff',
      padding: '10px 16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      pointerEvents: 'auto',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      opacity: '0',
      transform: 'translateY(10px)'
    }
  }, message);

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

export function createModal({ title, content, onClose }) {
  const overlay = createElement('div', {
    style: {
      position: 'fixed',
      inset: '0',
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: '9000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }
  });

  const modal = createElement('div', {
    style: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      width: '100%',
      maxWidth: '500px',
      padding: '20px',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }
  });

  const header = createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #f3f4f6',
      paddingBottom: '12px'
    }
  }, [
    createElement('h3', { style: { margin: '0', fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif' } }, title),
    createElement('button', {
      style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
      onClick: close
    }, '×')
  ]);

  const body = createElement('div', { style: { fontSize: '13px', fontFamily: 'sans-serif' } }, content);

  function close() {
    overlay.remove();
    if (typeof onClose === 'function') onClose();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return { overlay, modal, close };
}

export function makeDraggable(element, handle = null) {
  const dragHandle = handle || element;
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  dragHandle.style.cursor = 'grab';

  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragHandle.style.cursor = 'grabbing';
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = element.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    element.style.position = 'absolute';
    element.style.margin = '0';
    element.style.left = `${initialLeft}px`;
    element.style.top = `${initialTop}px`;

    const onMouseMove = (moveEvent) => {
      if (!isDragging) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      element.style.left = `${initialLeft + dx}px`;
      element.style.top = `${initialTop + dy}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      dragHandle.style.cursor = 'grab';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}

export function makeResizable(element) {
  element.style.position = 'relative';
  const resizer = createElement('div', {
    style: {
      width: '10px',
      height: '10px',
      backgroundColor: '#9ca3af',
      position: 'absolute',
      right: '0',
      bottom: '0',
      cursor: 'nwse-resize'
    }
  });

  element.appendChild(resizer);

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startWidth = element.offsetWidth;
    const startHeight = element.offsetHeight;
    const startX = e.clientX;
    const startY = e.clientY;

    const onMouseMove = (moveEvent) => {
      element.style.width = `${startWidth + (moveEvent.clientX - startX)}px`;
      element.style.height = `${startHeight + (moveEvent.clientY - startY)}px`;
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}

export async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Fallo al usar Clipboard API, intentando fallback:', err);
    }
  }

  const textArea = createElement('textarea', {
    value: text,
    style: { position: 'fixed', opacity: '0', top: '0', left: '0' }
  });
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  let successful = false;
  try {
    successful = document.execCommand('copy');
  } catch (err) {
    console.error('Error copiando al portapapeles:', err);
  }

  textArea.remove();
  return successful;
}

export function injectStyle(cssText, id = null) {
  if (id && document.getElementById(id)) {
    const existing = document.getElementById(id);
    existing.textContent = cssText;
    return existing;
  }
  const style = createElement('style', id ? { id } : {}, cssText);
  document.head.appendChild(style);
  return style;
}