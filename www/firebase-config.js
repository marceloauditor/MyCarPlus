// Configuração pública do app Web MyCarPlus.
// A chave secreta do reCAPTCHA não pertence ao código do PWA.
const firebaseConfig = {
  apiKey: "AIzaSyDbNLpvgr_ZAbBj1GwD3cbQd1qNtxDBikw",
  authDomain: "mycarplus-3180a.firebaseapp.com",
  projectId: "mycarplus-3180a",
  storageBucket: "mycarplus-3180a.firebasestorage.app",
  messagingSenderId: "999080111160",
  appId: "1:999080111160:web:cd90c0e90558d6f89e0acd",
  measurementId: "G-RZJC9X1SGP"
};
window.FIREBASE_CONFIG = firebaseConfig;

// Chave pública do site reCAPTCHA v3 registrada no Firebase App Check.
window.MYCAR_RECAPTCHA_SITE_KEY = "6Lf_-2QtAAAAAPKgmyclK2savUQZv3nBq41bDfpJ";

// Modelo configurável sem expor chave da API Gemini no aplicativo.
window.MYCAR_AI_MODEL = "gemini-3.5-flash";
