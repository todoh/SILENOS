export let tempTags = {
  authors: [],
  countries: [],
  characters: [],
  regions: [],
  keywords: []
};

export function setTempTags(tags) {
  tempTags = {
    authors: tags.authors || [],
    countries: tags.countries || [],
    characters: tags.characters || [],
    regions: tags.regions || [],
    keywords: tags.keywords || []
  };
}

// MANEJAR CONTROL DE ENTRADAS DE ETIQUETAS EN EL FORMULARIO
export function handleTagInput(event, category) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    const input = event.target;
    let val = input.value.trim();

    if (val) {
      if (category === 'characters' || category === 'regions') {
        if (val.startsWith('@')) val = val.substring(1).trim();
      } else if (category === 'keywords') {
        if (val.startsWith('#')) val = val.substring(1).trim();
      }

      if (val && !tempTags[category].includes(val)) {
        tempTags[category].push(val);
        renderFormTags(category);
      }
      input.value = '';
    }
  }
}

// ELIMINAR ETIQUETA EN EDICIÓN
export function removeTempTag(category, index) {
  tempTags[category].splice(index, 1);
  renderFormTags(category);
}

// RE-RENDERIZAR BADGES DEL FORMULARIO
export function renderFormTags(category) {
  const container = document.getElementById(`${category}-badges`);
  if (!container) return;
  container.innerHTML = '';
  
  let badgeStyle = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
  let prefix = "@";

  if (category === 'authors') {
    badgeStyle = "bg-zinc-800 text-zinc-200 border border-zinc-700";
    prefix = "";
  } else if (category === 'countries') {
    badgeStyle = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
    prefix = "";
  } else if (category === 'regions') {
    badgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  } else if (category === 'keywords') {
    badgeStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    prefix = "#";
  }

  tempTags[category].forEach((tag, idx) => {
    const badge = document.createElement('span');
    badge.className = `inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${badgeStyle}`;
    badge.innerHTML = `
      <span>${prefix}${tag}</span>
      <button type="button" onclick="window.removeTempTag('${category}', ${idx})" class="hover:text-white transition-colors">
        <i data-lucide="x" class="w-3 h-3"></i>
      </button>
    `;
    container.appendChild(badge);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}