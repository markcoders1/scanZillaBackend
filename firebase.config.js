// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";

import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: "AIzaSyBAAVcCnPLvHe-81R6u2bnkCGW7qhWZJZM",

  authDomain: "scanzilla-53a4d.firebaseapp.com",

  projectId: "scanzilla-53a4d",

  storageBucket: "scanzilla-53a4d.appspot.com",

  messagingSenderId: "393747405017",

  appId: "1:393747405017:web:0e064325f14e44a60906c8",

  measurementId: "G-702ZZNRMGQ"

};


// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);