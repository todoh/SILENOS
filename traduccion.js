// translator.js

const translations = {
  // ------------------ TRADUCCIONES AL INGLÉS ------------------
  en: {
    '#nuevo': { text: 'New' },
    '#cargar': { text: 'Load' },
    '#bproyecto': { text: '🏗️ Project' },
    '#bdatos': { text: 'Data' },
    '#blibros': { text: 'Book' },
    '#bguion': { text: '📜 Script' }
  },

  // ------------------ TEXTOS ORIGINALES EN ESPAÑOL ------------------
  es: {
    '#nuevo': { text: 'Nuevo' },
    '#cargar': { text: 'Cargar' },
    '#bproyecto': { text: '🏗️ Proyecto' },
    '#bdatos': { text: 'Datos' },
    '#blibros': { text: 'Libro' },
    '#bguion': { text: '📜 Guion' }
  },

  // --- OTROS IDIOMAS ---
  ar: {
    '#nuevo': { text: 'جديد' },
    '#cargar': { text: 'تحميل' },
    '#bproyecto': { text: '🏗️ مشروع' },
    '#bdatos': { text: 'بيانات' },
    '#blibros': { text: 'كتاب' },
    '#bguion': { text: '📜 سيناريو' }
  },
  zh: {
    '#nuevo': { text: '新建' },
    '#cargar': { text: '加载' },
    '#bproyecto': { text: '🏗️ 项目' },
    '#bdatos': { text: '数据' },
    '#blibros': { text: '书' },
    '#bguion': { text: '📜 脚本' }
  },
  hi: {
    '#nuevo': { text: 'नया' },
    '#cargar': { text: 'लोड' },
    '#bproyecto': { text: '🏗️ परियोजना' },
    '#bdatos': { text: 'डेटा' },
    '#blibros': { text: 'किताब' },
    '#bguion': { text: '📜 पटकथा' }
  },
  ru: {
    '#nuevo': { text: 'Новый' },
    '#cargar': { text: 'Загрузить' },
    '#bproyecto': { text: '🏗️ Проект' },
    '#bdatos': { text: 'Данные' },
    '#blibros': { text: 'Книга' },
    '#bguion': { text: '📜 Сценарий' }
  },
  fr: {
    '#nuevo': { text: 'Nouveau' },
    '#cargar': { text: 'Charger' },
    '#bproyecto': { text: '🏗️ Projet' },
    '#bdatos': { text: 'Données' },
    '#blibros': { text: 'Livre' },
    '#bguion': { text: '📜 Scénario' }
  },
  de: {
    '#nuevo': { text: 'Neu' },
    '#cargar': { text: 'Laden' },
    '#bproyecto': { text: '🏗️ Projekt' },
    '#bdatos': { text: 'Daten' },
    '#blibros': { text: 'Buch' },
    '#bguion': { text: '📜 Drehbuch' }
  },
  it: {
    '#nuevo': { text: 'Nuovo' },
    '#cargar': { text: 'Carica' },
    '#bproyecto': { text: '🏗️ Progetto' },
    '#bdatos': { text: 'Dati' },
    '#blibros': { text: 'Libro' },
    '#bguion': { text: '📜 Sceneggiatura' }
  },
  pt: {
    '#nuevo': { text: 'Novo' },
    '#cargar': { text: 'Carregar' },
    '#bproyecto': { text: '🏗️ Projeto' },
    '#bdatos': { text: 'Dados' },
    '#blibros': { text: 'Livro' },
    '#bguion': { text: '📜 Roteiro' }
  },
  ja: {
    '#nuevo': { text: '新規' },
    '#cargar': { text: '読み込み' },
    '#bproyecto': { text: '🏗️ プロジェクト' },
    '#bdatos': { text: 'データ' },
    '#blibros': { text: '本' },
    '#bguion': { text: '📜 脚本' }
  },
  ko: {
    '#nuevo': { text: '새로 만들기' },
    '#cargar': { text: '불러오기' },
    '#bproyecto': { text: '🏗️ 프로젝트' },
    '#bdatos': { text: '데이터' },
    '#blibros': { text: '책' },
    '#bguion': { text: '📜 대본' }
  },
  no: {
    '#nuevo': { text: 'Ny' },
    '#cargar': { text: 'Last' },
    '#bproyecto': { text: '🏗️ Prosjekt' },
    '#bdatos': { text: 'Data' },
    '#blibros': { text: 'Bok' },
    '#bguion': { text: '📜 Manus' }
  },
  ca: {
    '#nuevo': { text: 'Nou' },
    '#cargar': { text: 'Carrega' },
    '#bproyecto': { text: '🏗️ Projecte' },
    '#bdatos': { text: 'Dades' },
    '#blibros': { text: 'Llibre' },
    '#bguion': { text: '📜 Guió' }
  },
  eu: {
    '#nuevo': { text: 'Berria' },
    '#cargar': { text: 'Kargatu' },
    '#bproyecto': { text: '🏗️ Proiektua' },
    '#bdatos': { text: 'Datuak' },
    '#blibros': { text: 'Liburua' },
    '#bguion': { text: '📜 Gidoia' }
  },
  gl: {
    '#nuevo': { text: 'Novo' },
    '#cargar': { text: 'Cargar' },
    '#bproyecto': { text: '🏗️ Proxecto' },
    '#bdatos': { text: 'Datos' },
    '#blibros': { text: 'Libro' },
    '#bguion': { text: '📜 Guión' }
  }
};


/**
 * Cambia el idioma de la interfaz usando selectores de ID y clase.
 * @param {string} lang - El código del idioma (ej. 'en', 'es').
 */
function changeLanguage(lang) {
  const dictionary = translations[lang];

  if (!dictionary || Object.keys(dictionary).length === 0) {
    return console.warn(`Traducciones para "${lang}" no disponibles.`);
  }

  // Itera sobre cada selector en el diccionario (ej. '#mi-id', '.mi-clase')
  for (const selector in dictionary) {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(element => {
      const translationData = dictionary[selector];
      
      if (translationData.text) {
        element.innerHTML = translationData.text;
      }
      if (translationData.placeholder) {
        element.placeholder = translationData.placeholder;
      }
      if (translationData.title) {
        element.title = translationData.title;
      }
    });
  }
  
  document.documentElement.lang = lang;
}

 