// 1. Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC4K_nvbX_KY7dtSUkjIE0s11xgu8KqVkY",
  authDomain: "zenith-global-assets.firebaseapp.com",
  projectId: "zenith-global-assets",
  storageBucket: "zenith-global-assets.firebasestorage.app",
  messagingSenderId: "818320822478",
  appId: "1:818320822478:web:ddd1e8f247bc3d81dfc09f",
  measurementId: "G-ZWGBSYVZ18"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

// 2. Pro Redirect System
auth.onAuthStateChanged(user => {
    const path = window.location.pathname;
    const isDashboard = path.includes('dashboard.html');

    if (!user) {
        if (isDashboard) { window.location.href = 'index.html'; }
    } else {
        if (!isDashboard) { window.location.href = 'dashboard.html'; }
        loadDashboardData(user);
    }
});

// 3. Login Logic
const loginForm = document.getElementById('loginForm');
if(loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = loginForm.querySelectorAll('input');
        auth.signInWithEmailAndPassword(inputs[0].value, inputs[1].value)
            .then(() => { window.location.href = 'dashboard.html'; })
            .catch(err => alert("Access Denied: " + err.message));
    });
}

// 4. Registration Logic
const regForm = document.getElementById('registerForm');
if(regForm) {
    regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = regForm.querySelectorAll('input');
        auth.createUserWithEmailAndPassword(inputs[1].value, inputs[2].value).then(cred => {
            return db.collection('users').doc(cred.user.uid).set({
                fullName: inputs[0].value,
                email: inputs[1].value,
                balance: 0.00,
                refBy: inputs[3].value || "none",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).then(() => {
            auth.signOut().then(() => {
                alert("Account verified successfully! Please log in to proceed.");
                window.location.href = 'index.html';
            });
        }).catch(err => alert("System Error: " + err.message));
    });
}

// 5. Load Data
function loadDashboardData(user) {
    db.collection('users').doc(user.uid).onSnapshot(doc => {
        const data = doc.data();
        if(data) {
            if(document.getElementById('userBalance')) document.getElementById('userBalance').innerText = data.balance.toFixed(2);
            if(document.getElementById('userName')) document.getElementById('userName').innerText = data.fullName;
        }
    });
}

// 6. Logout
function logout() {
    auth.signOut().then(() => { window.location.href = 'index.html'; });
}
