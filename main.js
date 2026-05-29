// ==========================================
// ১. FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC4K_nvbX_KY7dtSUkjIE0s11xgu8KqVkY", 
    authDomain: "zenith-global-assets.firebaseapp.com",
    projectId: "zenith-global-assets",
    storageBucket: "zenith-global-assets.firebasestorage.app",
    messagingSenderId: "818320822478",
    appId: "1:818320822478:web:ddd1e8f247bc3d81dfc09f",
    measurementId: "G-ZNGB5YV218"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let activeGateway = "";
const USD_TO_BDT_RATE = 127.00; 

const gatewayNumbers = {
    Bkash: "017XXXXXXXX (bKash Agent)",
    Nagad: "019XXXXXXXX (Nagad Agent)"
};

// ==========================================
// ২. CUSTOM PREMIUM MINI-SWAL
// ==========================================
const CustomSwal = Swal.mixin({
    background: '#020617',
    color: '#fff',
    width: '340px',
    customClass: {
        popup: 'border border-white/10 rounded-[1.5rem] shadow-2xl shadow-black',
        title: 'text-sm font-extrabold tracking-tight uppercase',
        htmlContainer: 'text-xs text-slate-400 font-medium',
        confirmButton: 'bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-5 py-2.5 rounded-xl uppercase font-bold tracking-wider transition-all duration-300 outline-none mx-1',
        cancelButton: 'bg-red-600 hover:bg-red-500 text-white text-xs px-5 py-2.5 rounded-xl uppercase font-bold tracking-wider transition-all duration-300 outline-none mx-1'
    },
    buttonsStyling: false
});

// ==========================================
// ৩. PRO REDIRECT & SECURE SESSION SYSTEM
// ==========================================
auth.onAuthStateChanged(user => {
    const path = window.location.pathname;
    const isDashboard = path.includes('dashboard.html');

    if (!user) {
        if (isDashboard) { window.location.href = 'index.html'; }
    } else {
        currentUser = user;
        if (!isDashboard) { 
            window.location.href = 'dashboard.html'; 
        } else {
            loadDashboardData(user);
            processDailyYields(user);
            listenToHistoryLog();
            initLiveCurrencyCalculator(); 
            
            const currentDomain = window.location.origin;
            if(document.getElementById('refLinkText')) {
                document.getElementById('refLinkText').innerText = `${currentDomain}/register.html?ref=${user.uid}`;
            }
        }
    }
});

// ==========================================
// ৪. LIVE EXCHANGE CALCULATOR
// ==========================================
function initLiveCurrencyCalculator() {
    const usdInput = document.getElementById('usdAmount');
    const bdtDisplay = document.getElementById('totalBdtDisplay'); 

    if (usdInput) {
        usdInput.addEventListener('input', (e) => {
            const usdValue = parseFloat(e.target.value) || 0;
            const convertedBdt = (usdValue * USD_TO_BDT_RATE).toFixed(2);
            if (bdtDisplay) {
                bdtDisplay.innerText = `${convertedBdt} BDT`;
            }
        });
    }
}

// ==========================================
// ৫. SECURE LOGIN SYSTEM
// ==========================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = loginForm.querySelectorAll('input');
        auth.signInWithEmailAndPassword(inputs[0].value, inputs[1].value)
            .then(() => { window.location.href = "dashboard.html"; })
            .catch(err => {
                CustomSwal.fire({ icon: 'error', title: 'Access Denied', text: err.message });
            });
    });
}

// ==========================================
// ৬. REGISTRATION ENGINE
// ==========================================
const regForm = document.getElementById('registerForm');
if(regForm) {
    regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = regForm.querySelectorAll('input');
        const refUID = inputs[3].value.trim() || "none";

        auth.createUserWithEmailAndPassword(inputs[1].value, inputs[2].value).then(cred => {
            if (refUID !== "none") {
                db.collection('users').doc(refUID).update({
                    balance: firebase.firestore.FieldValue.increment(2)
                });
                db.collection('transactions').add({
                    userId: refUID,
                    type: "Referral Bonus",
                    amount: 2,
                    status: "Success",
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            return db.collection('users').doc(cred.user.uid).set({
                fullName: inputs[0].value,
                email: inputs[1].value,
                balance: 0.00,
                earningBalance: 0.00,
                activeInvestment: 0.00,
                purchasedCount: 0,
                refBy: refUID,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).then(() => {
            auth.signOut().then(() => {
                CustomSwal.fire({ icon: 'success', title: 'Account Verified', text: 'Verification successful! Please sign in.' }).then(() => {
                    window.location.href = 'index.html';
                });
            });
        }).catch(err => {
            CustomSwal.fire({ icon: 'error', title: 'System Error', text: err.message });
        });
    });
}

// ==========================================
// ৭. REAL-TIME THREE-BALANCE SYNCHRONIZER
// ==========================================
function loadDashboardData(user) {
    db.collection('users').doc(user.uid).onSnapshot(doc => {
        const data = doc.data();
        if(data) {
            if(document.getElementById('userBalance')) document.getElementById('userBalance').innerText = parseFloat(data.balance || 0).toFixed(2);
            if(document.getElementById('earningBalance')) document.getElementById('earningBalance').innerText = parseFloat(data.earningBalance || 0).toFixed(2);
            if(document.getElementById('userName')) document.getElementById('userName').innerText = data.fullName || "VIP Operator";
            if(document.getElementById('activeInvest')) document.getElementById('activeInvest').innerText = parseFloat(data.activeInvestment || 0).toFixed(2);
            if(document.getElementById('purchasedCount')) document.getElementById('purchasedCount').innerText = data.purchasedCount || 0;
        }
    });
}

// ==========================================
// ৮. HIGH-FREQUENCY DAILY YIELD ENGINE
// ==========================================
function processDailyYields(user) {
    const now = new Date().getTime();
    db.collection("active_nodes").where("userId", "==", user.uid).where("status", "==", "Active").get().then(snapshot => {
        snapshot.forEach(doc => {
            const node = doc.data();
            const lastClaim = node.lastClaimTime ? node.lastClaimTime.toDate().getTime() : node.timestamp.toDate().getTime();
            if (now - lastClaim >= 86400000) {
                const totalEarned = node.dailyProfitAmount;
                db.collection("users").doc(user.uid).update({ earningBalance: firebase.firestore.FieldValue.increment(totalEarned) });
                db.collection("active_nodes").doc(doc.id).update({ lastClaimTime: firebase.firestore.FieldValue.serverTimestamp() });
                db.collection("transactions").add({ userId: user.uid, type: "Daily Profit", amount: totalEarned, status: "Success", timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            }
        });
    });
}

// ==========================================
// ৯. CLONE REFERRAL TO CLIPBOARD
// ==========================================
function copyReferral() {
    const linkText = document.getElementById('refLinkText').innerText;
    navigator.clipboard.writeText(linkText).then(() => {
        CustomSwal.fire({ icon: 'success', title: 'Cloned!', text: 'Referral link copied!' });
    });
}

// ==========================================
// ১০. ASSET DEPOSIT GATEWAY (অটো-আপডেট লজিক সংযুক্ত)
// ==========================================
function openGateway(gateway) {
    activeGateway = gateway;
    document.getElementById('gatewayTitle').innerText = gateway;
    document.getElementById('adminNumber').innerText = gatewayNumbers[gateway];
    document.getElementById('paymentBox').classList.remove('hidden');
}

function submitDeposit() {
    const usdAmount = parseFloat(document.getElementById('usdAmount').value);
    const senderNum = document.getElementById('senderNum').value.trim();
    const trxId = document.getElementById('trxId').value.trim();

    if (!usdAmount || usdAmount <= 0 || !senderNum || !trxId) { 
        CustomSwal.fire({ icon: 'error', title: 'Error', text: 'All fields required!' });
        return; 
    }

    db.collection("deposit_requests").add({
        userId: currentUser.uid,
        userName: document.getElementById('userName').innerText,
        amount: usdAmount,
        gateway: activeGateway,
        senderNum: senderNum,
        trxId: trxId,
        status: "Pending",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    db.collection("transactions").add({
        userId: currentUser.uid,
        type: "Deposit (" + activeGateway + ")",
        amount: usdAmount,
        status: "Pending",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        CustomSwal.fire({ icon: 'warning', title: 'Deposit Committed', text: 'Awaiting Admin Approval.' });
        document.getElementById('paymentBox').classList.add('hidden');
    });
}

// ==========================================
// ১১. ASSET DISINVESTMENT CORE (অটো-আপডেট লজিক সংযুক্ত)
// ==========================================
function processWithdrawal() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const account = document.getElementById('withdrawAccount').value.trim();
    const gateway = document.getElementById('withdrawGateway').value.toUpperCase();
    const currentBal = parseFloat(document.getElementById('userBalance').innerText);
    
    if (amount < 20) { CustomSwal.fire({ icon: 'error', title: 'Limit Error', text: 'Min withdrawal $20!' }); return; }
    if (!account) { CustomSwal.fire({ icon: 'error', title: 'Error', text: 'Account number is required!' }); return; }
    if (amount > currentBal) { CustomSwal.fire({ icon: 'error', title: 'Balance Error', text: 'Insufficient balance!' }); return; }

    db.collection("withdraw_requests").add({
        userId: currentUser.uid,
        userName: document.getElementById('userName').innerText,
        amount: amount,
        account: account,
        gateway: gateway,
        status: "Pending",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    db.collection("transactions").add({
        userId: currentUser.uid,
        type: "Withdrawal (" + gateway + ")",
        amount: amount,
        status: "Pending",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        CustomSwal.fire({ icon: 'success', title: 'Pipeline Deployed', text: 'Withdrawal request under review.' });
    });
}

// ==========================================
// ১২. DEPLOY LOVABLE HIGH-YIELD PLAN MATRIX
// ==========================================
function buyPlan(cost, days, rate, planName) {
    const currentBalance = parseFloat(document.getElementById('userBalance').innerText);
    
    if (currentBalance < cost) {
        CustomSwal.fire({ icon: 'error', title: 'Insufficient Balance', text: 'Please deposit funds first.' });
        return;
    }

    db.collection("active_nodes").add({
        userId: currentUser.uid,
        planName: planName,
        cost: cost,
        dailyProfitAmount: cost * rate,
        status: "Active",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        db.collection("users").doc(currentUser.uid).update({
            balance: firebase.firestore.FieldValue.increment(-cost),
            activeInvestment: firebase.firestore.FieldValue.increment(cost),
            purchasedCount: firebase.firestore.FieldValue.increment(1)
        });
        
        db.collection("transactions").add({
            userId: currentUser.uid,
            type: "Investment: " + planName,
            amount: cost,
            status: "Success",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        CustomSwal.fire({ icon: 'success', title: 'Active Node', text: 'Node deployed successfully.' });
    });
}

// ==========================================
// ১৩. LIVE REAL-TIME AUDIT LEDGER LOGS (অটোমেটিক ব্যালেন্স আপডেটের লিসেনার)
// ==========================================
function listenToHistoryLog() {
    const tableBody = document.getElementById('historyLogTable');
    if(!tableBody) return;

    db.collection("transactions")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snapshot => {
            tableBody.innerHTML = ""; 
            const docs = snapshot.docs.sort((a,b) => b.data().timestamp - a.data().timestamp);
            docs.forEach(doc => {
                const log = doc.data();
                let color = log.status === "Success" ? "text-emerald-400" : (log.status === "Pending" ? "text-amber-400" : "text-blue-400");
                tableBody.innerHTML += `
                <tr class="border-b border-white/5">
                    <td class="p-3 text-xs">${log.type}</td>
                    <td class="p-3 text-xs">$${log.amount || 0}</td>
                    <td class="p-3 text-xs ${color} font-bold">${log.status}</td>
                </tr>`;
            });
        });
}

// ==========================================
// ১৪. SYSTEM LOGOUT
// ==========================================
function logout() {
    auth.signOut().then(() => { window.location.href = 'index.html'; });
}

// ==========================================
// ১৫. REAL-TIME GATEWAY SYNC
// ==========================================
db.collection("settings").doc("gateways").onSnapshot(doc => {
    if (doc.exists) {
        const data = doc.data();
        if (data.bkash) gatewayNumbers.Bkash = data.bkash + " (bKash Agent)";
        if (data.nagad) gatewayNumbers.Nagad = data.nagad + " (Nagad Agent)";
        const adminNumberDisplay = document.getElementById('adminNumber');
        const gatewayTitle = document.getElementById('gatewayTitle');
        if (adminNumberDisplay && gatewayTitle) {
            adminNumberDisplay.innerText = gatewayNumbers[gatewayTitle.innerText];
        }
    }
});

// ==========================================
// ১৬. AUTOMATIC BALANCE SYNC (Cloud Function Triggers)
// ==========================================
// এই লজিকটি Firebase Cloud Functions-এ যোগ করবেন:
/*
exports.syncBalance = functions.firestore.document('deposit_requests/{id}').onUpdate((change) => {
    const data = change.after.data();
    if (data.status === 'Success') {
        return admin.firestore().collection('users').doc(data.userId).update({
            balance: admin.firestore.FieldValue.increment(data.amount)
        });
    }
});
*/
