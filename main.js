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

// 2. Auth State Observer & Auto-Redirect
auth.onAuthStateChanged(user => {
    const isAuthPage = window.location.pathname.includes('auth.html');

    if (!user) {
        if (!isAuthPage) {
            window.location.href = 'auth.html';
        }
    } else {
        if (isAuthPage) {
            window.location.href = 'index.html';
        }
        loadDashboardData(user);
    }
});

// 3. Registration Logic (Redirects to Login on Success)
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
            // Sign out after registration so they have to log in manually
            auth.signOut().then(() => {
                alert("Account created successfully! Please log in with your credentials.");
                window.location.reload(); 
            });
        }).catch(err => alert("Registration Failed: " + err.message));
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

// 5. Load Real-time Dashboard Data
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
            if(document.getElementById('userRefCode')) {
                document.getElementById('userRefCode').value = data.email;
            }
        }
    });
}

// 6. Logout Functionality
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'auth.html';
    }).catch(err => alert(err.message));
}

// 7. Admin: Approve Deposit
async function approveDeposit(userId, depositAmount) {
    const userRef = db.collection('users').doc(userId);
    try {
        await userRef.update({
            balance: firebase.firestore.FieldValue.increment(depositAmount)
        });
        alert("Deposit Approved!");
    } catch (error) {
        alert("Action Failed: " + error.message);
    }
}
