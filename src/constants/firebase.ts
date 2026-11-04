/**
 * Firebase web app config (Project settings → Your apps → Web). Not a secret:
 * every web client ships it, and access is governed by the Firestore rules.
 * Android reads its own config from google-services.json instead.
 */
export const FIREBASE_WEB_CONFIG = {
  apiKey: "AIzaSyDx9solQCq79vL-Y88UiM2LIpulZZwtheg",
  authDomain: "invictus-tournament-maker.firebaseapp.com",
  projectId: "invictus-tournament-maker",
  storageBucket: "invictus-tournament-maker.firebasestorage.app",
  messagingSenderId: "1005830448191",
  appId: "1:1005830448191:web:6a819b5e571513bdebc48a",
  measurementId: "G-09Z66NT70Q",
} as const
