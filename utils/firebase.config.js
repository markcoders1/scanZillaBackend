import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBAAVcCnPLvHe-81R6u2bnkCGW7qhWZJZM",
  authDomain: "scanzilla-53a4d.firebaseapp.com",
  projectId: "scanzilla-53a4d",
  storageBucket: "scanzilla-53a4d.appspot.com",
  messagingSenderId: "393747405017",
  appId: "1:393747405017:web:0e064325f14e44a60906c8",
  measurementId: "G-702ZZNRMGQ"
};

export const app = initializeApp(firebaseConfig);