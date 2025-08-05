import { initializeApp } from "firebase/app";
import {getAuth,GoogleAuthProvider} from 'firebase/auth'
import {getFirestore} from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

// const firebaseConfig = {
//   apiKey: "AIzaSyArHM_FfClgRHX0ogRIjj4q5wWiPWeNA7w",
//   authDomain: "tudo-english-app.firebaseapp.com",
//   projectId: "tudo-english-app",
//   storageBucket: "tudo-english-app.appspot.com",
//   messagingSenderId: "136065827824",
//   appId: "1:136065827824:web:1f6a4357d9e12592e69335"
// };


const firebaseConfig = {
  apiKey: "AIzaSyArHM_FfClgRHX0ogRIjj4q5wWiPWeNA7w",
  authDomain: "tudo-english-app.firebaseapp.com",
  projectId: "tudo-english-app",
  storageBucket: "tudo-english-app.appspot.com",
  messagingSenderId: "136065827824",
  appId: "1:136065827824:web:1f6a4357d9e12592e69335"
};

const app = initializeApp(firebaseConfig);
const auth=getAuth(app)
const provider=new GoogleAuthProvider()
const db=getFirestore(app)
const storage=getStorage(app)

export {auth,provider,db,storage}