// Firebase client for Scatydeo Live Service
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCNKgqMNQ30NwYcOht-oI2fdGAzx0Etkk4",
  authDomain: "scatydeoliveservice.firebaseapp.com",
  databaseURL: "https://scatydeoliveservice-default-rtdb.firebaseio.com",
  projectId: "scatydeoliveservice",
  storageBucket: "scatydeoliveservice.firebasestorage.app",
  messagingSenderId: "192344947149",
  appId: "1:192344947149:web:017729c541c623c1606c84",
  measurementId: "G-H9JHV5B10M",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const rtdb = getDatabase(firebaseApp);
