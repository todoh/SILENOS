// translator.js

const translations = {
  // ------------------ TRADUCCIONES AL INGLÉS ------------------
  en: {
    '#bproyecto': { text: '🏗️ Project' },
    '#bdatos': { text: 'Data' },
    '#blibros': { text: 'Book' },
    '#bguion': { text: '📜 Script' }
  },

  // ------------------ TEXTOS ORIGINALES EN ESPAÑOL ------------------
  es: {
    '#bproyecto': { text: '🏗️ Proyecto' },
    '#bdatos': { text: 'Datos' },
    '#blibros': { text: 'Libro' },
    '#bguion': { text: '📜 Guion' }
  },

  // --- OTROS IDIOMAS ---
  ar: {
    '#bproyecto': { text: '🏗️ مشروع' },
    '#bdatos': { text: 'بيانات' },
    '#blibros': { text: 'كتاب' },
    '#bguion': { text: '📜 سيناريو' }
  },
  zh: {
    '#bproyecto': { text: '🏗️ 项目' },
    '#bdatos': { text: '数据' },
    '#blibros': { text: '书' },
    '#bguion': { text: '📜 脚本' }
  },
  hi: {
    '#bproyecto': { text: '🏗️ परियोजना' },
    '#bdatos': { text: 'डेटा' },
    '#blibros': { text: 'किताब' },
    '#bguion': { text: '📜 पटकथा' }
  },
  ru: {
    '#bproyecto': { text: '🏗️ Проект' },
    '#bdatos': { text: 'Данные' },
    '#blibros': { text: 'Книга' },
    '#bguion': { text: '📜 Сценарий' }
  },
  fr: {
    '#bproyecto': { text: '🏗️ Projet' },
    '#bdatos': { text: 'Données' },
    '#blibros': { text: 'Livre' },
    '#bguion': { text: '📜 Scénario' }
  },
  de: {
    '#bproyecto': { text: '🏗️ Projekt' },
    '#bdatos': { text: 'Daten' },
    '#blibros': { text: 'Buch' },
    '#bguion': { text: '📜 Drehbuch' }
  },
  it: {
    '#bproyecto': { text: '🏗️ Progetto' },
    '#bdatos': { text: 'Dati' },
    '#blibros': { text: 'Libro' },
    '#bguion': { text: '📜 Sceneggiatura' }
  },
  pt: {
    '#bproyecto': { text: '🏗️ Projeto' },
    '#bdatos': { text: 'Dados' },
    '#blibros': { text: 'Livro' },
    '#bguion': { text: '📜 Roteiro' }
  },
  ja: {
    '#bproyecto': { text: '🏗️ プロジェクト' },
    '#bdatos': { text: 'データ' },
    '#blibros': { text: '本' },
    '#bguion': { text: '📜 脚本' }
  },
  ko: {
    '#bproyecto': { text: '🏗️ 프로젝트' },
    '#bdatos': { text: '데이터' },
    '#blibros': { text: '책' },
    '#bguion': { text: '📜 대본' }
  },
  no: {
    '#bproyecto': { text: '🏗️ Prosjekt' },
    '#bdatos': { text: 'Data' },
    '#blibros': { text: 'Bok' },
    '#bguion': { text: '📜 Manus' }
  },
  ca: {
    '#bproyecto': { text: '🏗️ Projecte' },
    '#bdatos': { text: 'Dades' },
    '#blibros': { text: 'Llibre' },
    '#bguion': { text: '📜 Guió' }
  },
  eu: {
    '#bproyecto': { text: '🏗️ Proiektua' },
    '#bdatos': { text: 'Datuak' },
    '#blibros': { text: 'Liburua' },
    '#bguion': { text: '📜 Gidoia' }
  },
  gl: {
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

 