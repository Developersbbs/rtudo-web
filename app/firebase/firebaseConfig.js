import { initializeApp } from "firebase/app";
import {getAuth,GoogleAuthProvider} from 'firebase/auth'
import {getFirestore} from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBZTBa408ZFophmOkz8RBq7LNDYH-RyDDU",
  authDomain: "tudo-staging.firebaseapp.com",
  projectId: "tudo-staging",
  storageBucket: "tudo-staging.firebasestorage.app",
  messagingSenderId: "910133539337",
  appId: "1:910133539337:web:566c0b99e9ec1c000afed8"
};

const app = initializeApp(firebaseConfig);
const auth=getAuth(app)
const provider=new GoogleAuthProvider()
const db=getFirestore(app)
const storage=getStorage(app)

export {auth,provider,db,storage}