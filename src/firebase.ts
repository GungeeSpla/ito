// FirebaseのSDKをインポート
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Firebaseの設定（コンソールからコピーして貼り付ける）
const firebaseConfig = {
    apiKey: "AIzaSyDHMbz-8MgTeN9NjStzbFM0xt4KCaadaqw",
    authDomain: "ito-online-39831.firebaseapp.com",
    databaseURL: "https://ito-online-39831-default-rtdb.firebaseio.com/",
    projectId: "ito-online-39831",
    storageBucket: "ito-online-39831.firebasestorage.app",
    messagingSenderId: "723989262629",
    appId: "1:723989262629:web:1d1a5a1edcdbdc8c0f6acc"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };