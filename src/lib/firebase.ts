import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBVi6F2PIS6F6l8haZrcytqlceYhlyrUkE",
  authDomain: "guess-the-alarm.firebaseapp.com",
  databaseURL: "https://guess-the-alarm-default-rtdb.firebaseio.com",
  projectId: "guess-the-alarm",
  storageBucket: "guess-the-alarm.firebasestorage.app",
  messagingSenderId: "781670118217",
  appId: "1:781670118217:web:980fdc3799583c3ba92098"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
