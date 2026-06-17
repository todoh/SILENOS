import { PAISES } from './paises.js';
import { resolveBookCoverUrl } from './storage.js';

// RENDERIZAR MENÚ DE COLECCIONES
export function renderCollections(state) {
  const container = document.getElementById('collections-list');
  container.innerHTML = '';

  const allActive = state.currentCollection === 'all';
  const allEl = document.createElement('button');
  allEl.onclick = () => window.selectCollection('all');
  allEl.className = `w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${allActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`;
  allEl.innerHTML = `
    <div class="flex items-center space-x-2.5">
      <i data-lucide="library" class="w-4 h-4"></i>
      <span>Todos los libros</span>
    </div>
    <span class="text-xs font-semibold px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-400">${state.books.length}</span>
  `;
  container.appendChild(allEl);

  state.collections.forEach(col => {
    const isActive = state.currentCollection === col;
    const count = state.books.filter(b => b.collection === col).length;
    
    const colEl = document.createElement('div');
    colEl.className = `group flex items-center justify-between rounded-xl transition-all ${isActive ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`;
    
    const btnSelect = document.createElement('button');
    btnSelect.onclick = () => window.selectCollection(col);
    btnSelect.className = 'flex-1 flex items-center space-x-2.5 px-3 py-2 text-sm font-medium text-left';
    btnSelect.innerHTML = `
      <i data-lucide="folder" class="w-4 h-4 flex-none"></i>
      <span class="truncate">${col}</span>
    `;
    colEl.appendChild(btnSelect);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex items-center space-x-1.5 pr-2';
    actionsDiv.innerHTML = `
      <span class="text-xs font-semibold px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-400 group-hover:hidden">${count}</span>
      <button onclick="window.deleteCollection('${col}')" class="p-1 text-zinc-500 hover:text-rose-400 rounded transition-all hidden group-hover:inline-block" title="Eliminar Colección">
        <i data-lucide="trash" class="w-3.5 h-3.5"></i>
      </button>
    `;
    colEl.appendChild(actionsDiv);

    container.appendChild(colEl);
  });

  if (window.lucide) window.lucide.createIcons();
}

// RENDERIZAR REJILLA DE LIBROS FILTRADOS
export async function renderBooks(state) {
  const grid = document.getElementById('books-grid');
  const emptyState = document.getElementById('empty-state');
  grid.innerHTML = '';

  let titleText = state.currentCollection === 'all' ? "Todos los Libros" : `Colección: ${state.currentCollection}`;
  document.getElementById('current-view-title').innerText = titleText;

  let filtered = state.books;
  if (state.currentCollection !== 'all') {
    filtered = filtered.filter(b => b.collection === state.currentCollection);
  }

  if (state.activeTagFilter) {
    const { type, value } = state.activeTagFilter;
    if (type === 'character') {
      filtered = filtered.filter(b => b.characters && b.characters.includes(value));
    } else if (type === 'region') {
      filtered = filtered.filter(b => b.regions && b.regions.includes(value));
    } else if (type === 'keyword') {
      filtered = filtered.filter(b => b.keywords && b.keywords.includes(value));
    } else if (type === 'country') {
      filtered = filtered.filter(b => {
        const cList = Array.isArray(b.countries) ? b.countries : (b.country ? [b.country] : []);
        return cList.includes(value);
      });
    } else if (type === 'author') {
      filtered = filtered.filter(b => {
        const aList = Array.isArray(b.authors) ? b.authors : (b.author ? [b.author] : []);
        return aList.includes(value);
      });
    }
  }

  if (state.searchQuery) {
    const q = state.searchQuery.replace(/[@#]/g, '').trim().toLowerCase();
    filtered = filtered.filter(b => {
      const aList = Array.isArray(b.authors) ? b.authors : (b.author ? [b.author] : []);
      const cList = Array.isArray(b.countries) ? b.countries : (b.country ? [b.country] : []);
      return b.title.toLowerCase().includes(q) ||
        b.collection.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q)) ||
        aList.some(a => a.toLowerCase().includes(q)) ||
        cList.some(c => c.toLowerCase().includes(q)) ||
        (b.characters && b.characters.some(c => c.toLowerCase().includes(q))) ||
        (b.regions && b.regions.some(r => r.toLowerCase().includes(q))) ||
        (b.keywords && b.keywords.some(k => k.toLowerCase().includes(q)))
    });
  }

  document.getElementById('current-view-count').innerText = `${filtered.length} libros disponibles en la vista actual`;

  if (filtered.length === 0) {
    grid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  grid.classList.remove('hidden');
  emptyState.classList.add('hidden');

  filtered.forEach(book => {
    const card = document.createElement('div');
    card.className = "group bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all duration-300 shadow-xl hover:-translate-y-1";
    
    // Normalización de autores y países para mantener retrocompatibilidad total
    const authorsArr = Array.isArray(book.authors) ? book.authors : (book.author ? [book.author] : ["Autor Desconocido"]);
    const countriesArr = Array.isArray(book.countries) ? book.countries : (book.country ? [book.country] : []);

    const authorsString = authorsArr.join(', ');

    card.innerHTML = `
      <div>
        <div class="relative aspect-[3/4] bg-zinc-950 overflow-hidden border-b border-zinc-850">
          <div id="cover-spinner-${book.id}" class="absolute inset-0 flex items-center justify-center text-zinc-600 bg-zinc-950">
            <i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>
          </div>
          <img id="cover-img-${book.id}" class="w-full h-full object-cover opacity-0 transition-opacity duration-300" alt="Portada de ${book.title}">
          
          <span class="absolute top-3 left-3 bg-zinc-950/90 backdrop-blur border border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-300 px-2.5 py-1 rounded-lg">
            ${book.collection}
          </span>

          <div class="absolute bottom-3 right-3 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button onclick="window.editBook(${book.id})" class="p-2 bg-zinc-950/90 hover:bg-emerald-500 hover:text-white backdrop-blur border border-zinc-800 text-zinc-300 rounded-lg shadow-lg transition-all" title="Editar libro">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="window.confirmDeleteBook(${book.id})" class="p-2 bg-zinc-950/90 hover:bg-rose-600 hover:text-white backdrop-blur border border-zinc-800 text-zinc-300 rounded-lg shadow-lg transition-all" title="Eliminar libro">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <div class="p-5 space-y-3.5">
          <div>
            <h4 class="text-sm font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors" title="${book.title}">${book.title}</h4>
            <div class="text-xs text-zinc-400 font-medium truncate mt-0.5">
              por ${authorsArr.map(auth => `<span onclick="window.applyTagFilter('author', '${auth}')" class="hover:text-emerald-400 cursor-pointer underline decoration-dotted">${auth}</span>`).join(', ')}
            </div>
          </div>

          ${book.description ? `
            <p class="text-xs text-zinc-400/90 leading-relaxed font-normal line-clamp-2" title="${book.description}">
              ${book.description}
            </p>
          ` : ''}

          <div class="flex flex-wrap gap-1">
            ${countriesArr.map(cName => {
              const countryData = PAISES.find(p => p.name === cName);
              const flagEmoji = countryData ? countryData.flag : "🏳️";
              return `
                <button onclick="window.applyTagFilter('country', '${cName}')" class="inline-flex items-center space-x-1.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-[11px] font-semibold text-zinc-300 px-2.5 py-1 rounded-lg transition-all">
                  <span>${flagEmoji}</span>
                  <span>${cName}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- RENDERIZADO DE ENLACES ASOCIADOS AL LIBRO -->
          ${(book.links && book.links.length > 0) ? `
            <div class="space-y-1.5 pt-1.5">
              <div class="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <i data-lucide="link" class="w-3 h-3"></i> Enlaces de interés
              </div>
              <div class="flex flex-wrap gap-1.5">
                ${book.links.map(link => `
                  <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center space-x-1 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 text-[10px] font-medium px-2 py-1 rounded-md transition-all">
                    <span>${link.name}</span>
                    <i data-lucide="external-link" class="w-2.5 h-2.5"></i>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="space-y-2 pt-2 border-t border-zinc-850/50">
            ${(book.characters?.length > 0 || book.regions?.length > 0) ? `
              <div class="flex flex-wrap gap-1">
                ${(book.characters || []).map(char => `
                  <button onclick="window.applyTagFilter('character', '${char}')" class="text-[10px] font-medium bg-blue-500/5 hover:bg-blue-500/15 text-blue-400 border border-blue-500/10 px-2 py-0.5 rounded-md transition-all">
                    @${char}
                  </button>
                `).join('')}
                ${(book.regions || []).map(reg => `
                  <button onclick="window.applyTagFilter('region', '${reg}')" class="text-[10px] font-medium bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded-md transition-all">
                    @${reg}
                  </button>
                `).join('')}
              </div>
            ` : ''}

            ${book.keywords?.length > 0 ? `
              <div class="flex flex-wrap gap-1">
                ${book.keywords.map(key => `
                  <button onclick="window.applyTagFilter('keyword', '${key}')" class="text-[10px] font-medium bg-amber-500/5 hover:bg-amber-500/15 text-amber-400 border border-amber-500/10 px-2 py-0.5 rounded-md transition-all">
                    #${key}
                  </button>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    grid.appendChild(card);

    (async () => {
      const imgElement = document.getElementById(`cover-img-${book.id}`);
      const spinnerElement = document.getElementById(`cover-spinner-${book.id}`);
      const url = await resolveBookCoverUrl(book.image);
      
      if (imgElement && spinnerElement) {
        imgElement.src = url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&auto=format&fit=crop&q=60";
        imgElement.onload = () => {
          imgElement.classList.remove('opacity-0');
          spinnerElement.classList.add('hidden');
        };
      }
    })();
  });

  if (window.lucide) window.lucide.createIcons();
}