// Firebase configuration and initialization
// Replace the below config object with your own Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyDxwUp-DcI5-bOh2cVpPg0BzthgE9E5lbE",
  authDomain: "dive-in-mabini.firebaseapp.com",
  projectId: "dive-in-mabini",
  storageBucket: "dive-in-mabini.firebasestorage.app",
  messagingSenderId: "637435245798",
  appId: "1:637435245798:web:92c6d7f33c829dfcca3727"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Set up Google and Facebook Auth providers
const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();
facebookProvider.setCustomParameters({
  'display': 'popup',
  'redirect_uri': 'https://dive-in-mabini.firebaseapp.com/__/auth/handler'
});

// Export providers for use in main.js
window.googleProvider = googleProvider;
window.facebookProvider = facebookProvider;
