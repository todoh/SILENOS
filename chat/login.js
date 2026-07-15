/**
 * módulo de autenticación oficial de Pollinations AI (BYOP - Bring Your Own Pollen)
 * Implementa el flujo de redirección por fragmento de URL para aplicaciones del lado del cliente.
 */

// Identificador de aplicación por defecto si el usuario no tiene una clave pk_ configurada
const DEFAULT_CLIENT_ID = 'pk_8lZ42MuYYWVIGBhj'; 

/**
 * Redirige al usuario al portal de autorización oficial de Pollinations
 * @param {string} customClientId - Clave de aplicación publishable (pk_...) opcional
 */
export function iniciarSesionPollinations(customClientId) {
    const clientId = (customClientId && customClientId.startsWith('pk_')) ? customClientId : DEFAULT_CLIENT_ID;
    const redirectUri = window.location.origin + window.location.pathname;
    
    const params = new URLSearchParams({
        redirect_uri: redirectUri,
        client_id: clientId,
        scope: 'profile usage'
    });

    window.location.href = `https://enter.pollinations.ai/authorize?${params.toString()}`;
}

/**
 * Escucha y procesa los parámetros devueltos en el fragmento (#) tras la redirección
 * @returns {string|null} Retorna la clave temporal sk_ si la autenticación fue exitosa
 */
export function procesarRetornoAutenticacion() {
    if (window.location.hash) {
        const hashClean = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
        const hashParams = new URLSearchParams(hashClean);
        const apiKey = hashParams.get('api_key');

        if (apiKey && apiKey.startsWith('sk_')) {
            // Guardar en almacenamiento persistente de inmediato
            localStorage.setItem('hub_key_pollinations', apiKey);
            
            // Limpiar la URL de forma elegante sin recargar la página para proteger la credencial
            window.history.replaceState(
                null, 
                document.title, 
                window.location.pathname + window.location.search
            );
            
            return apiKey;
        }
    }
    return null;
}