/**
 * @file google.js
 * @description Handles all Google Sign-In and user session logic.
 */

// Global variable to hold the current user's profile information.
let currentUserProfile = null;

/**
 * Decodes the JWT (JSON Web Token) response from Google to get user profile.
 * NOTE: In a production app with a backend, this verification should be done on the server.
 * @param {string} token The credential token from Google.
 * @returns {object} The decoded user profile object.
 */
function decodeJwtResponse(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Error decoding JWT:", error);
        return null;
    }
}


/**
 * This is the callback function executed by Google's library after a successful sign-in.
 * @param {object} response The credential response object from Google.
 */
function handleCredentialResponse(response) {
    console.log("Google credential response received.");
    
    const profile = decodeJwtResponse(response.credential);
    if (profile) {
        currentUserProfile = {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            picture: profile.picture
        };
        console.log("User signed in:", currentUserProfile.name);
        
        // Update the UI to show the logged-in user.
        updateAuthUI();

        // Transition to the main application view.
        if (typeof flexear === 'function') {
            flexear('silenos');
        }
    } else {
        console.error("Could not process user profile from Google's response.");
    }
}

/**
 * Handles the user sign-out process.
 */
function handleLogout() {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
        console.log("User signing out.");
        currentUserProfile = null;
        
        // Disables automatic sign-in on the next visit.
        if (typeof google !== 'undefined') {
            google.accounts.id.disableAutoSelect();
        }
        
        // Update the UI to show the sign-in button again.
        updateAuthUI();

        // Transition back to the initial screen.
        if (typeof animacionReiniciar === 'function') {
            animacionReiniciar();
        } else {
            // Fallback if the animation function isn't available
            window.location.reload();
        }
    }
}

/**
 * Updates the authentication UI based on whether a user is signed in or not.
 * It replaces the content of the '#google-auth-container' div.
 */
function updateAuthUI() {
    const authContainer = document.getElementById('google-auth-container');
    if (!authContainer) return;

    if (currentUserProfile) {
        // User is logged in: Show profile picture, name, and logout button.
        authContainer.innerHTML = `
            <div id="user-session-display">
                <img id="user-avatar" src="${currentUserProfile.picture}" alt="User Avatar">
                <span id="user-name">${currentUserProfile.name}</span>
                <button id="logout-button" class="pro" title="Cerrar sesión">🚪</button>
            </div>
        `;
        // Add event listener to the new logout button.
        document.getElementById('logout-button').addEventListener('click', handleLogout);

    } else {
        // User is not logged in: Show the Google Sign-In button.
        authContainer.innerHTML = ''; // Clear previous content
        
        if (typeof google !== 'undefined') {
            // Re-initialize the Google Sign-In button.
            google.accounts.id.initialize({
                client_id: '438997287133-2sbu4oio9csj9t3b9dcdldrv3fsvmdel.apps.googleusercontent.com',
                callback: handleCredentialResponse
            });
            google.accounts.id.renderButton(
                authContainer,
                { theme: "outline", size: "large", type: "standard", text: "signin_with", shape: "pill" } 
            );
        }
    }
}

// Initialize the authentication logic when the page loads.
window.addEventListener('load', () => {
    // Initial UI setup. It will show the sign-in button by default.
    updateAuthUI();
});
