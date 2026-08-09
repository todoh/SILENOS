// Motor de Noticias, Periódico Global y Eventos Macroeconómicos
import { db } from "./firebase.js";
import { collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export class NewsEngine {
    constructor() {
        this.collectionName = "news";
        this.eventsCatalog = [
            {
                title: "📈 Auge Inmobiliario en Maddna Tower",
                content: "El Consejo de la Ciudad reporta una alta demanda de propiedades residenciales. El valor de la reputación aumenta.",
                type: "ECONOMY"
            },
            {
                title: "⚡ Subida en la Red Eléctrica de la Ciudad",
                content: "Las empresas locales reportan un leve incremento en costes operativos por mantenimiento general.",
                type: "CITY_EVENT"
            },
            {
                title: "☕ Apertura Masiva de Comercios",
                content: "Nuevos emprendedores están registrando marcas en el sector servicios. ¡La economía local se expande!",
                type: "BUSINESS"
            },
            {
                title: "🏆 Récord de Reputación Ciudadana",
                content: "Los ciudadanos de Maddna City siguen aumentando su influencia en la administración local.",
                type: "SOCIAL"
            }
        ];
    }

    // Publicar una noticia en Firestore
    async publishNews(title, content, category = "GENERAL") {
        try {
            await addDoc(collection(db, this.collectionName), {
                title,
                content,
                category,
                timestamp: Date.now()
            });
            return true;
        } catch (e) {
            console.error("Error al publicar noticia:", e);
            return false;
        }
    }

    // Obtener las últimas noticias globales
    async getLatestNews(maxResults = 5) {
        try {
            const q = query(
                collection(db, this.collectionName),
                orderBy("timestamp", "desc"),
                limit(maxResults)
            );
            const querySnapshot = await getDocs(q);
            const newsList = [];
            querySnapshot.forEach(doc => {
                newsList.push({ id: doc.id, ...doc.data() });
            });
            return newsList;
        } catch (e) {
            console.error("Error al obtener noticias:", e);
            return [];
        }
    }

    // Simular evento global aleatorio
    triggerRandomEvent() {
        const randomIndex = Math.floor(Math.random() * this.eventsCatalog.length);
        return this.eventsCatalog[randomIndex];
    }
}