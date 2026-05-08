import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
getAuth,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
signInWithPhoneNumber,
RecaptchaVerifier
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxE_IDkGZFkE88Esca5qN_7iHnFRk1dmM",
  authDomain: "ai-interview-pro-7f226.firebaseapp.com",
  projectId: "ai-interview-pro-7f226",
  storageBucket: "ai-interview-pro-7f226.firebasestorage.app",
  messagingSenderId: "904239388644",
  appId: "1:904239388644:web:9b8d4a0087b6f7cb1599f1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// AUTO LOGIN CHECK
if(localStorage.getItem("userLoggedIn")){
    window.location.href = "dashboard.html";
}

// UI SWITCH
window.showLogin = () =>{
    mainOptions.style.display="none";
    loginForm.style.display="block";
};

window.showSignup = () =>{
    mainOptions.style.display="none";
    signupForm.style.display="block";
};

window.back = ()=>{
    loginForm.style.display="none";
    signupForm.style.display="none";
    mainOptions.style.display="block";
};

// LOGIN
window.loginUser = ()=>{
    let email = loginEmail.value;
    let pass = loginPassword.value;

    signInWithEmailAndPassword(auth,email,pass)
    .then(()=> success())
    .catch(e=> alert(e.message));
};

// SIGNUP
window.signupUser = ()=>{
    let email = document.getElementById("email").value;
    let pass = document.getElementById("password").value;
    let name = document.getElementById("name").value;
    let uni = document.getElementById("university").value;

    localStorage.setItem("userName",name);
    localStorage.setItem("university",uni);

    createUserWithEmailAndPassword(auth,email,pass)
    .then(()=> success())
    .catch(e=> alert(e.message));
};

// PHONE OTP
let confirmationResult;

window.sendOTP = ()=>{
    window.recaptchaVerifier = new RecaptchaVerifier(auth,"recaptcha-container",{size:"normal"});

    signInWithPhoneNumber(auth,phone.value,window.recaptchaVerifier)
    .then(res=>{
        confirmationResult=res;
        alert("OTP Sent");
    });
};

window.verifyOTP = ()=>{
    confirmationResult.confirm(otp.value)
    .then(()=> success())
    .catch(()=> alert("Invalid OTP"));
};

// TRY FREE
window.tryFree = ()=>{
    let trials = localStorage.getItem("trials") || 2;

    if(trials > 0){
        trials--;
        localStorage.setItem("trials", trials);
        window.location.href="dashboard.html";
    }else{
        alert("Trial finished. Please login.");
    }
};

// SUCCESS
function success(){
    localStorage.setItem("userLoggedIn",true);
    window.location.href="dashboard.html";
}