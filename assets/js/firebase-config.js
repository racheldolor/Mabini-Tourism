// Replace the below config object with your own Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyD2R72cmKXuy1928H4fPOnzwHELAyrm5Ns",
  authDomain: "tourism-mabini.firebaseapp.com",
  projectId: "tourism-mabini",
  storageBucket: "tourism-mabini.firebasestorage.app",
  messagingSenderId: "695008451492",
  appId: "1:695008451492:web:bf2c158e28519b2e9dff31",
  measurementId: "G-QP0464V633"
};

// Initialize Firebase
if (!window.firebase) {
  throw new Error('Firebase SDK must be loaded before firebase-config.js');
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

if (firebase.analytics) {
  try {
    firebase.analytics();
  } catch (error) {
    console.warn('Firebase Analytics is unavailable.', error);
  }
}

// Set up Google and Facebook Auth providers
const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();
facebookProvider.setCustomParameters({
  'display': 'popup'
});

// Export providers for use in main.js
window.googleProvider = googleProvider;
window.facebookProvider = facebookProvider;
