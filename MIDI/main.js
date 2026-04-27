 




//
// ─── MODELS ───────────────────────────────────────────────────
const MODELS = [
  { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro-preview-06-05',  label: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.0-flash',              label: 'Gemini 2 Flash' },
  { id: 'gemini-2.0-flash-lite',         label: 'Gemini 2 Flash Lite' },
  { id: 'gemma-3-1b-it',                 label: 'Gemma 3 1B' },
  { id: 'gemma-3-4b-it',                 label: 'Gemma 3 4B' },
  { id: 'gemma-3-12b-it',                label: 'Gemma 3 12B' },
  { id: 'gemma-3-27b-it',                label: 'Gemma 3 27B' },
  { id: 'gemma-3-2b-it',                 label: 'Gemma 3 2B' },
  { id: 'gemma-4-26b-it',                label: 'Gemma 4 26B' },
  { id: 'gemma-4-31b-it',                label: '@ Gemma 4 31B' },
  { id: 'gemini-3.0-flash-preview',      label: 'Gemini 3 Flash' },
  { id: 'gemini-3.1-flash-lite-preview', label: '@ Gemini 3.1 Flash Lite' },
  { id: 'gemini-3.1-pro-preview',        label: 'Gemini 3.1 Pro' },
  { id: 'gemini-2.5-flash-lite-preview', label: 'Gemini 2.5 Flash Lite' },
];

// ─── STATE ────────────────────────────────────────────────────
const STORAGE = {
  KEY: 'gchat_apikey',
  CONVS: 'gchat_conversations',
  LOG: 'gchat_log',
  MODEL: 'gchat_model',
};

let state = {
  apiKey: localStorage.getItem(STORAGE.KEY) || '', 
  apiKeys: (localStorage.getItem(STORAGE.KEY) || '').split(',').map(k => k.trim()).filter(k => k.length > 5),
  currentKeyIndex: 0,
  conversations: JSON.parse(localStorage.getItem(STORAGE.CONVS) || '[]'),
  log: JSON.parse(localStorage.getItem(STORAGE.LOG) || '[]'),
  activeConvId: null,
  selectedModel: localStorage.getItem(STORAGE.MODEL) || MODELS[0].id,
  isLoading: false,
};

function save() {
  localStorage.setItem(STORAGE.CONVS, JSON.stringify(state.conversations));
  localStorage.setItem(STORAGE.LOG, JSON.stringify(state.log));
  localStorage.setItem(STORAGE.MODEL, state.selectedModel);
  localStorage.setItem(STORAGE.KEY, state.apiKey);
}

// SANEAR ESTADO: Si cerramos la ventana de golpe mientras generaba, lo marcamos como pausado.
state.conversations.forEach(c => {
  c.messages.forEach(m => {
    if (m.mode === 'libro' && m.bookState && m.bookState.isGenerating) {
      m.bookState.isGenerating = false;
    }
  });
});
save();

function getActiveConv() {
  return state.conversations.find(c => c.id === state.activeConvId);
}

// Funciones para la Metralleta
function getNextApiKey() {
  if (state.apiKeys.length === 0) return null;
  state.currentKeyIndex = (state.currentKeyIndex + 1) % state.apiKeys.length;
  return state.apiKeys[state.currentKeyIndex];
}

function getCurrentApiKey() {
  if (state.apiKeys.length === 0) return null;
  return state.apiKeys[state.currentKeyIndex];
}