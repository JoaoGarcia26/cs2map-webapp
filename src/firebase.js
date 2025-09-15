import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC7_W27R38a9i9ldibVHjg97Xoolu9j6aY",
  authDomain: "cs2-map-37079.firebaseapp.com",
  projectId: "cs2-map-37079",
  storageBucket: "cs2-map-37079.firebasestorage.app",
  messagingSenderId: "196914895214",
  appId: "1:196914895214:web:0d738054b40cd19a27097f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
