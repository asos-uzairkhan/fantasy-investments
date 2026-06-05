// ─── Firebase Configuration ───────────────────────────────────────────────────
// Fill in the values below with your Firebase project settings.
//
// How to get these values:
//   1. Go to https://console.firebase.google.com/
//   2. Create a project (or open an existing one)
//   3. Click the </> (Web) icon to add a web app
//   4. Copy the firebaseConfig object shown and paste the values below
//   5. In the left sidebar go to Build → Realtime Database → Create Database
//      (choose "Start in test mode" for now, then update the security rules)
//
// Your Firebase web config values are NOT secret — they are safe to commit.
// Data is protected by Firebase Security Rules (see firebase-rules.json).
// ─────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyCe0gMzUjKoixzGs1JDkwQYBHL6ZOLG-vc",
  authDomain: "fantasy-investments-2026.firebaseapp.com",
  databaseURL: "https://fantasy-investments-2026-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fantasy-investments-2026",
  storageBucket: "fantasy-investments-2026.firebasestorage.app",
  messagingSenderId: "973607070149",
  appId: "1:973607070149:web:fcc6770e8f0f5d910783ac"
};

// Expose a consistent global name expected by script.js.
window.FIREBASE_CONFIG = firebaseConfig;
