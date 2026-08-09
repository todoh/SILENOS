// Motor del Reloj Global de Maddna City
// Escala: 24h Reales = 30 Días de Juego. 48 min Reales = 1 Día de Juego.
export class TimeEngine {
    constructor() {
        // Epoca Base de Maddna City: 1 de Enero del 3000
        this.START_GAME_DATE = new Date("3000-01-01T00:00:00Z").getTime();
        // Marca temporal real fija de referencia (1 de Enero de 2026)
        this.START_REAL_TIMESTAMP = new Date("2026-01-01T00:00:00Z").getTime();
        
        // Relación: 1 segundo real = 30 segundos del juego
        // (30 días * 24h * 3600s) / (24h * 3600s) = 30
        this.TIME_FACTOR = 30;
    }

    // Devuelve el objeto Date actual del mundo Maddna City
    getCurrentGameDate() {
        const nowReal = Date.now();
        const elapsedRealMs = nowReal - this.START_REAL_TIMESTAMP;
        const elapsedGameMs = elapsedRealMs * this.TIME_FACTOR;
        return new Date(this.START_GAME_DATE + elapsedGameMs);
    }

    // Convierte minutos de Maddna City a milisegundos reales
    gameMinutesToRealMs(gameMinutes) {
        return (gameMinutes * 60 * 1000) / this.TIME_FACTOR;
    }

    // Devuelve los datos formateados del tiempo global
    getFormattedTime() {
        const gameDate = this.getCurrentGameDate();
        const months = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        
        const day = gameDate.getUTCDate();
        const month = months[gameDate.getUTCMonth()];
        const year = gameDate.getUTCFullYear();
        const hours = String(gameDate.getUTCHours()).padStart(2, '0');
        const minutes = String(gameDate.getUTCMinutes()).padStart(2, '0');

        return {
            dateStr: `${day} de ${month}`,
            timeStr: `${hours}:${minutes}`,
            year: year,
            rawDate: gameDate
        };
    }
}