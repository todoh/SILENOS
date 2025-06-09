/**
 * @file google.js
 * @description Handles all Google Sign-In, OAuth2 authorization for Drive, and user session logic.
 */

// Global variables to hold user and auth info
let currentUserProfile = null;
let gapi_access_token = null; 

// The specific permission scope we need for Google Drive
const DRIVE_SCOPE =  'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

// ... (líneas de código) ...

// Your Client ID from Google Cloud Console
// Asegúrate de que este ID sea el correcto y esté activo.
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
 */
function initGapiClient() {
    gapi.client.init({
        // API key and discovery docs are not required for this simple Drive v3 usage.
    }).then(() => {
        initAuth();
    }).catch(err => {
        console.error("Error initializing GAPI client:", err);
    });
}

/**
 * Initializes the authentication flow and sets up the token client.
 */
function initAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
        console.error("Google accounts script not loaded yet.");
        return;
    }
    
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                gapi_access_token = tokenResponse.access_token;
                console.log("Access Token received.");
                
                await fetchUserProfile();
                updateAuthUI();

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

    // Render the initial UI (the login button)
    updateAuthUI();
}

/**
 * Starts the login process when the user clicks the sign-in button.
 */
function handleAuthClick() {
    if (tokenClient) {
        // Prompt the user to select a Google Account and ask for consent
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
        if (!response.ok) throw new Error('Failed to fetch user profile.');
        
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
    }
}


/**
 * Handles the user sign-out process.
 */
function handleLogout() {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
        console.log("User signing out.");

        if (gapi_access_token) {
            google.accounts.oauth2.revoke(gapi_access_token, () => {
                console.log('Access token revoked.');
            });
        }

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
                <button id="logout-button" class="" title="Cerrar sesión">Desconectars</button>
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
            <button id="google-signin-button" class="pro pro3">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style="width:18px; height:18px; vertical-align: middle; margin-right: 8px;">
                Iniciar Sesión con Google
            </button>
        `;
        document.getElementById('google-signin-button').addEventListener('click', handleAuthClick);
    }
}
