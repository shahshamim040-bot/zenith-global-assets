// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4K_nvbX_KY7dtSUkjIE0s11xgu8KqVkY",
  authDomain: "zenith-global-assets.firebaseapp.com",
  projectId: "zenith-global-assets",
  storageBucket: "zenith-global-assets.firebasestorage.app",
  messagingSenderId: "818320822478",
  appId: "1:818320822478:web:ddd1e8f247bc3d81dfc09f",
  measurementId: "G-ZWGBSYVZ18"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// 2. Auth State Observer & Force Redirect (The Solution)
auth.onAuthStateChanged(user => {
    const path = window.location.pathname;
    const isAuthPage = path.includes('auth.html');

    if (!user) {
        // If not logged in and NOT on auth page, force go to auth.html
        if (!isAuthPage) {
            window.location.href = 'auth.html';
        }
    } else {
        // If logged in and on auth page, go to dashboard
        if (isAuthPage) {
            window.location.href = 'index.html';
        }
        loadDashboardData(user);
    }
});

// 3. Registration Logic
const regForm = document.getElementById('registerForm');
if(regForm) {
    regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = regForm[0].value;
        const email = regForm[1].value;
        const password = regForm[2].value;
        const refCode = regForm[3].value;

        auth.createUserWithEmailAndPassword(email, password).then(cred => {
            return db.collection('users').doc(cred.user.uid).set({
                fullName: name,
                email: email,
                balance: 0.00,
                referralEarnings: 0.00,
                refBy: refCode || "none",
                isFirstDepositDone: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).then(() => {
            auth.signOut().then(() => {
                alert("Account created successfully! Please log in.");
                window.location.href = 'auth.html'; 
            });
        }).catch(err => alert("Error: " + err.message));
    });
}

// 4. Login Logic
const loginForm = document.getElementById('loginForm');
if(loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm[0].value;
        const password = loginForm[1].value;

        auth.signInWithEmailAndPassword(email, password).then(() => {
            window.location.href = 'index.html';
        }).catch(err => alert("Login Failed: " + err.message));
    });
}

// 5. Dashboard Data
function loadDashboardData(user) {
    db.collection('users').doc(user.uid).onSnapshot(doc => {
        const data = doc.data();
        if(data) {
            if(document.getElementById('userBalance')) {
                document.getElementById('userBalance').innerText = data.balance.toFixed(2);
            }
            if(document.getElementById('userName')) {
                document.getElementById('userName').innerText = data.fullName;
            }
        }
    });
}
