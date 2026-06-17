// NOTIFICACIÓN FLOTANTE (TOAST)
export function showToast(message, bgColor = "emerald-500") {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');

  toast.className = `fixed bottom-5 right-5 z-50 transform translate-y-0 opacity-100 transition-all duration-300 flex items-center p-4 space-x-3 bg-zinc-900 border border-${bgColor}/30 text-${bgColor} rounded-xl shadow-2xl`;
  toastMsg.innerText = message;

  setTimeout(() => {
    toast.className = "fixed bottom-5 right-5 z-50 transform translate-y-20 opacity-0 transition-all duration-300 flex items-center p-4 space-x-3 bg-zinc-900 border border-emerald-500/30 text-emerald-400 rounded-xl shadow-2xl";
  }, 3500);
}

// FUNCIONALIDADES DE VENTANAS MODALES (ABRIR/CERRAR)
export function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('hidden');
  
  // Animación suave de aparición
  setTimeout(() => {
    modal.firstElementChild.classList.remove('scale-95');
    modal.firstElementChild.classList.add('scale-100');
  }, 50);
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  modal.firstElementChild.classList.remove('scale-100');
  modal.firstElementChild.classList.add('scale-95');
  
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 150);
}