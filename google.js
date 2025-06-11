/**
 * @file google.js
 * @description Handles all Google Sign-In, OAuth2 authorization for Drive, and user session logic.
 */

// Global variables to hold user and auth info
let currentUserProfile = null;
let gapi_access_token = null; 

// The specific permission scope we need for Google Drive
const REQUIRED_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

// Your Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = '438997287133-2sbu4oio9csj9t3b9dcdldrv3fsvmdel.apps.googleusercontent.com';

let tokenClient; // Google's OAuth2 client

/**
 * Initializes the GAPI client. This is the entry point called from index.html's onload attribute.
 */
function gapiLoaded() {
    gapi.load('client', initGapiClient);
}

/**
 * Initializes the GAPI client library.
 * CORRECCIÓN: Se añade 'discoveryDocs' para hacer la inicialización de la API de Drive más robusta.
 */
function initGapiClient() {
    gapi.client.init({
        // The discovery document tells the client how to interact with the Drive API.
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
    }).then(() => {
        // Now that the client is fully initialized, we can proceed with authentication.
        initAuth();
    }).catch(err => {
        console.error("Error initializing GAPI client:", err);
        alert("No se pudo inicializar la conexión con Google. Por favor, refresca la página.");
    });
}

/**
 * Initializes the authentication flow, sets up the token client,
 * AND attempts to restore a session from localStorage.
 */
async function initAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
        console.error("Google accounts script not loaded yet.");
        return;
    }
    
    // Initialize the client for manual login.
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: REQUIRED_SCOPES,
        callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                gapi_access_token = tokenResponse.access_token;
                localStorage.setItem('silenos_gapi_token', gapi_access_token);
                console.log("Access Token received and saved.");
                
                await fetchUserProfile();
                updateAuthUI();

                // ▼▼▼ LLAMADA A TEXTO A VOZ PARA NUEVO LOGIN ▼▼▼
                if (currentUserProfile && currentUserProfile.name) {
                    const welcomeMessage = `Bienvenido a SILENOS versión 1.1.8, ${currentUserProfile.name}`;
                    if(typeof reproducirTexto === 'function') {
                        reproducirTexto(welcomeMessage);
                    }
                }
                // ▲▲▲ FIN DE LA LLAMADA ▲▲▲

                // Transition to the main app view
                if (typeof flexear === 'function') {
                    flexear('silenos');
                }
                // Automatically load project from Drive
                if (typeof cargarProyectoDesdeDrive === 'function') {
                    await cargarProyectoDesdeDrive();
                }
            }
        },
    });

    // Check for a saved token in localStorage to restore the session.
    const savedToken = localStorage.getItem('silenos_gapi_token');
    if (savedToken) {
        console.log("Found saved token. Attempting to restore session...");
        gapi_access_token = savedToken;
        try {
            await fetchUserProfile(); 
            
            if (currentUserProfile) {
                console.log("Session restored successfully for:", currentUserProfile.name);
                updateAuthUI();

                // ▼▼▼ LLAMADA A TEXTO A VOZ PARA SESIÓN RESTAURADA ▼▼▼
                const welcomeMessage = `Bienvenido de nuevo a SILENOS, ${currentUserProfile.name}`;
                 if(typeof reproducirTexto === 'function') {
                    reproducirTexto(welcomeMessage);
                }
                // ▲▲▲ FIN DE LA LLAMADA ▲▲▲
                
                if (typeof flexear === 'function') flexear('silenos');
                if (typeof cargarProyectoDesdeDrive === 'function') await cargarProyectoDesdeDrive();
                
                return;
            } else {
                throw new Error("Token was saved but the user profile could not be fetched.");
            }
        } catch (error) {
            console.error("Failed to restore session with saved token:", error);
            localStorage.removeItem('silenos_gapi_token');
            gapi_access_token = null;
            currentUserProfile = null;
        }
    }

    // If no session was restored, render the initial UI (the login button).
    updateAuthUI();
}

/**
 * Starts the login process when the user clicks the sign-in button.
 */
function handleAuthClick() {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        console.error('Google Auth client not initialized.');
    }
}

/**
 * Fetches the user's profile information using the access token.
 */
async function fetchUserProfile() {
    if (!gapi_access_token) return;
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${gapi_access_token}` }
        });
        if (!response.ok) {
            // If the token is invalid/expired, this will throw an error,
            // which will be caught by the initAuth function.
            throw new Error('Failed to fetch user profile. The token might be expired or invalid.');
        }
        
        const profile = await response.json();
        currentUserProfile = {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            picture: profile.picture
        };
        console.log("User signed in:", currentUserProfile.name);
    } catch(error) {
        console.error("Error fetching user profile:", error);
        // We re-throw the error so the calling function knows it failed.
        throw error;
    }
}


/**
 * Handles the user sign-out process, including clearing the saved token.
 */
function handleLogout() {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
        console.log("User signing out.");

        // Stop any currently playing speech
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        if (gapi_access_token) {
            google.accounts.oauth2.revoke(gapi_access_token, () => {
                console.log('Access token revoked.');
            });
        }

        localStorage.removeItem('silenos_gapi_token');

        currentUserProfile = null;
        gapi_access_token = null;
        
        updateAuthUI();

        if (typeof animacionReiniciar === 'function') {
            animacionReiniciar();
        } else {
            window.location.reload();
        }
    }
}

/**
 * Updates the authentication UI based on whether a user is signed in or not.
 */
function updateAuthUI() {
    const authContainer = document.getElementById('google-auth-container');
    if (!authContainer) return;

    if (currentUserProfile && gapi_access_token) {
        // User is logged in: Show profile, save to drive, and logout buttons.
        authContainer.innerHTML = `
            <div id="user-session-display">
                <img id="user-avatar" src="${currentUserProfile.picture}" alt="User Avatar">
                <span id="user-name">${currentUserProfile.name}</span>
                <button id="drive-save-button" class="" title="Guardar en Google Drive">💾</button>
                <button id="logout-button" class="" title="Cerrar sesión">Desconectar</button>
            </div>
        `;
        document.getElementById('logout-button').addEventListener('click', handleLogout);
        document.getElementById('drive-save-button').addEventListener('click', () => {
            if (typeof guardarProyectoEnDrive === 'function') {
                guardarProyectoEnDrive();
            } else {
                console.error("La función guardarProyectoEnDrive no está definida. Asegúrate de que io.js está cargado y actualizado.");
            }
        });

    } else {
        // User is not logged in: Show a custom Sign-In button.
        authContainer.innerHTML = `
            <button id="google-signin-button" class="">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style="width:18px; height:18px; vertical-align: middle; margin-right: 8px;">
         
            </button>
        `;
        document.getElementById('google-signin-button').addEventListener('click', handleAuthClick);
    }
}
