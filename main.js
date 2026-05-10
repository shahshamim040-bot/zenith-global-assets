// 1. আপনার Firebase কনফিগারেশন (আপডেট করা API Key সহ)
const firebaseConfig = {
  apiKey: "AIzaSyC4K_nvbX_KY7dtSUkjIE0s11xgu8KqVkY",
  authDomain: "zenith-global-assets.firebaseapp.com",
  projectId: "zenith-global-assets",
  storageBucket: "zenith-global-assets.firebasestorage.app",
  messagingSenderId: "818320822478",
  appId: "1:818320822478:web:ddd1e8f247bc3d81dfc09f",
  measurementId: "G-ZWGBSYVZ18"
};

// Firebase কানেক্ট করা
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. রেজিস্ট্রেশন লজিক (নতুন ইউজার একাউন্ট খোলা)
const regForm = document.getElementById('registerForm');
if(regForm) {
    regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = regForm[0].value;
        const email = regForm[1].value;
        const password = regForm[2].value;
        const refCode = regForm[3].value; // এখানে রেফারার এর ইমেইল দিতে হবে

        auth.createUserWithEmailAndPassword(email, password).then(cred => {
            // ইউজারের ডাটাবেস ফাইল তৈরি
            return db.collection('users').doc(cred.user.uid).set({
                fullName: name,
                email: email,
                balance: 0.00,
                referralEarnings: 0.00,
                refBy: refCode || "none",
                isFirstDepositDone: false, // এটি নিশ্চিত করবে বোনাস যেন একবারই যায়
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).then(() => {
            alert("Account Created Successfully!");
            window.location.href = 'index.html';
        }).catch(err => alert("Registration Error: " + err.message));
    });
}

// 3. লগইন লজিক
const loginForm = document.getElementById('loginForm');
if(loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm[0].value;
        const password = loginForm[1].value;

        auth.signInWithEmailAndPassword(email, password).then(() => {
            window.location.href = 'index.html';
        }).catch(err => alert("Invalid Login: " + err.message));
    });
}

// 4. ডিপোজিট ও রেফারেল বোনাস অ্যাপ্রুভাল (অ্যাডমিন ফাংশন)
// এটি আপনি আপনার Admin Panel থেকে কল করবেন
async function approveDeposit(transactionId, userId, depositAmount) {
    const userRef = db.collection('users').doc(userId);

    try {
        // ১. ইউজারের মূল ব্যালেন্স বাড়ানো
        await userRef.update({
            balance: firebase.firestore.FieldValue.increment(depositAmount)
        });

        // ২. রেফারেল বোনাস লজিক চেক
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        // যদি ইউজারের রেফারার থাকে এবং এটি তার প্রথম ডিপোজিট হয়
        if (userData.refBy && userData.refBy !== "none" && !userData.isFirstDepositDone) {
            const referrerQuery = await db.collection('users').where('email', '==', userData.refBy).get();
            
            if (!referrerQuery.empty) {
                const referrerDoc = referrerQuery.docs[0];
                const bonus = depositAmount * 0.10; // ১০% বোনাস

                await db.collection('users').doc(referrerDoc.id).update({
                    balance: firebase.firestore.FieldValue.increment(bonus),
                    referralEarnings: firebase.firestore.FieldValue.increment(bonus)
                });
            }
            // প্রথম ডিপোজিট সম্পন্ন হিসেবে মার্ক করা
            await userRef.update({ isFirstDepositDone: true });
        }

        alert("Deposit Approved & Bonus Distributed!");
    } catch (error) {
        alert("System Error: " + error.message);
    }
}

// ৫. ড্যাশবোর্ডে ইউজারের তথ্য দেখানো
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).onSnapshot(doc => {
            const data = doc.data();
            if(document.getElementById('userBalance')) {
                document.getElementById('userBalance').innerText = data.balance.toFixed(2);
            }
            if(document.getElementById('userRefCode')) {
                document.getElementById('userRefCode').value = data.email;
            }
        });
    }
});
