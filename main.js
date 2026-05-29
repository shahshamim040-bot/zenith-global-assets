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
const USD_TO_BDT_RATE = 127.00; // ১ ডলার = ১২৭ টাকা ফিক্সড গ্লোবাল রেট

const gatewayNumbers = {
    Bkash: "017XXXXXXXX (bKash Agent)",
    Nagad: "019XXXXXXXX (Nagad Agent)"
};

// ==========================================
// ২. CUSTOM PREMIUM MINI-SWAL (ছোট ও প্রিমিয়াম অ্যালার্ট)
// ==========================================
const CustomSwal = Swal.mixin({
    background: '#020617',
    color: '#fff',
    width: '340px', // আপনার কমান্ড অনুযায়ী অ্যালার্ট বক্স ছোট করা হয়েছে
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
// ৪. LIVE EXCHANGE CALCULATOR (অটো BDT ক্যালকুলেশন সিস্টেম)
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
                CustomSwal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: err.message
                });
            });
    });
}

// ==========================================
// ৬. REGISTRATION ENGINE & REFERRAL LOCK
// ==========================================
const regForm = document.getElementById('registerForm');
if(regForm) {
    regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = regForm.querySelectorAll('input');
        const refUID = inputs[3].value.trim() || "none";

        auth.createUserWithEmailAndPassword(inputs[1].value, inputs[2].value).then(cred => {
            return db.collection('users').doc(cred.user.uid).set({
                fullName: inputs[0].value,
                email: inputs[1].value,
                balance: 0.00,
                earningBalance: 0.00,
                activeInvestment: 0.00,
                purchasedCount: 0,
                refBy: refUID,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                if (refUID !== "none") {
                    return db.collection('users').doc(refUID).update({
                        balance: firebase.firestore.FieldValue.increment(3.00)
                    }).catch(err => console.log("Referral transaction skipped:", err));
                }
            });
        }).then(() => {
            auth.signOut().then(() => {
                CustomSwal.fire({
                    icon: 'success',
                    title: 'Account Verified',
                    text: 'Verification successful! Please sign in using your credentials.'
                }).then(() => {
                    window.location.href = 'index.html';
                });
            });
        }).catch(err => {
            CustomSwal.fire({
                icon: 'error',
                title: 'System Error',
                text: err.message
            });
        });
    });
}

// ==========================================
// ७. REAL-TIME THREE-BALANCE SYNCHRONIZER
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
// ৮. HIGH-FREQUENCY DAILY YIELD ENGINE (AUTO-PROFIT)
// ==========================================
function processDailyYields(user) {
    const now = new Date().getTime();
    
    db.collection("active_nodes")
    .where("userId", "==", user.uid)
    .where("status", "==", "Active")
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            const node = doc.data();
            const lastClaim = node.lastClaimTime ? node.lastClaimTime.toDate().getTime() : node.timestamp.toDate().getTime();
            
            if (now - lastClaim >= 86400000) {
                const daysPassed = Math.floor((now - lastClaim) / 86400000);
                
                if (daysPassed > 0) {
                    const totalEarned = node.dailyProfitAmount * daysPassed;
                    
                    db.collection("users").doc(user.uid).update({
                        earningBalance: firebase.firestore.FieldValue.increment(totalEarned)
                    });

                    db.collection("active_nodes").doc(doc.id).update({
                        lastClaimTime: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    db.collection("transactions").add({
                        userId: user.uid,
                        amount: totalEarned,
                        type: "Daily Yield",
                        status: "Success",
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
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
        CustomSwal.fire({
            icon: 'success',
            title: 'Cloned!',
            text: 'Referral architecture cloned successfully!'
        });
    });
}

// ==========================================
// ১০. ASSET DEPOSIT GATEWAY TERMINAL (PENDING FIX)
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
    const screenshotFile = document.getElementById('screenshot').files[0];

    if (!usdAmount || usdAmount <= 0) { 
        CustomSwal.fire({ icon: 'warning', title: 'Invalid Matrix', text: 'Please specify a valid Allocation Value (USD).' });
        return; 
    }
    if (!senderNum) { 
        CustomSwal.fire({ icon: 'warning', title: 'Data Missing', text: 'Origin Terminal Account Identifier is mandatory.' });
        return; 
    }
    if (!trxId) { 
        CustomSwal.fire({ icon: 'warning', title: 'Data Missing', text: 'Transaction Ledger Signature (TrxID) is mandatory.' });
        return; 
    }
    if (!screenshotFile) { 
        CustomSwal.fire({ icon: 'warning', title: 'Capture Missing', text: 'Transfer Screen Capture proof is mandatory.' });
        return; 
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerText = "Transmitting Packet...";

    const screenshotName = `${Date.now()}_${screenshotFile.name}`;
    const targetBdtValue = (usdAmount * USD_TO_BDT_RATE).toFixed(2);

    const depositPayload = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: document.getElementById('userName').innerText,
        amount: usdAmount,
        bdtValue: targetBdtValue,
        gateway: activeGateway,
        senderNumber: senderNum,
        transactionId: trxId,
        screenshotName: screenshotName,
        status: "Pending", // ইনবিল্ট এরর বা পপ-আপ না এসে সরাসরি ডাটাবেজে Pending যাবে
        type: "Deposit",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("transactions").add(depositPayload)
    .then(() => {
        // ছোট এবং আকর্ষণীয় উইন্ডোতে কাস্টম পেন্ডিং নোটিফিকেশন শো করবে
        CustomSwal.fire({
            icon: 'warning',
            title: 'Deposit Committed',
            text: 'Asset Packet Committed Successfully! Awaiting Admin Node Verification.'
        });
        document.getElementById('usdAmount').value = "";
        document.getElementById('senderNum').value = "";
        document.getElementById('trxId').value = "";
        document.getElementById('screenshot').value = "";
        document.getElementById('paymentBox').classList.add('hidden');
        if(document.getElementById('totalBdtDisplay')) document.getElementById('totalBdtDisplay').innerText = "0.00 BDT";
    })
    .catch(error => {
        CustomSwal.fire({ icon: 'error', title: 'Transmission Error', text: error.message });
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "Submit Deposit Request";
    });
}

// ==========================================
// ১১. ASSET DISINVESTMENT CORE (WITHDRAWAL)
// ==========================================
function processWithdrawal() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const gateway = document.getElementById('withdrawGateway').value;
    const account = document.getElementById('withdrawAccount').value.trim();
    const source = document.getElementById('withdrawSource').value; 
    
    const balanceId = (source === "earning") ? 'earningBalance' : 'userBalance';
    const currentBalance = parseFloat(document.getElementById(balanceId).innerText);

    if (!amount || amount < 20) { 
        CustomSwal.fire({ icon: 'error', title: 'Limit Error', text: 'Minimum disinvestment threshold limit is $20.00 USD.' });
        return; 
    }
    if (!account) { 
        CustomSwal.fire({ icon: 'warning', title: 'Data Missing', text: 'Receiving Node Address cannot be left blank.' });
        return; 
    }
    if (amount > currentBalance) { 
        CustomSwal.fire({ icon: 'error', title: 'Asset Deficit', text: `Insufficient credit matrix in the selected operational balance.` });
        return; 
    }

    const withdrawPayload = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        amount: amount,
        gateway: gateway.toUpperCase(),
        accountNumber: account,
        sourceAccount: source, 
        status: "Pending", 
        type: "Withdrawal",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("transactions").add(withdrawPayload)
    .then(() => {
        let updateField = {};
        updateField[source === "earning" ? "earningBalance" : "balance"] = firebase.firestore.FieldValue.increment(-amount);
        return db.collection("users").doc(currentUser.uid).update(updateField);
    })
    .then(() => {
        CustomSwal.fire({
            icon: 'warning',
            title: 'Pipeline Deployed',
            text: 'Disinvestment Pipeline Deployed! Liquidation matrix is currently Pending.'
        });
        document.getElementById('withdrawAmount').value = "";
        document.getElementById('withdrawAccount').value = "";
    })
    .catch(error => {
        CustomSwal.fire({ icon: 'error', title: 'Pipeline Interruption', text: error.message });
    });
}

// ==========================================
// ১২. DEPLOY LOVABLE HIGH-YIELD PLAN MATRIX (আকর্ষণীয় ও হাই রিটার্ন)
// ==========================================
function buyPlan(cost, days, rate, planName) {
    const currentBalance = parseFloat(document.getElementById('userBalance').innerText);

    if (currentBalance < cost) {
        CustomSwal.fire({
            icon: 'error',
            title: 'Asset Deficit',
            text: 'Insufficient Node Deployment Capital. Please fund your main desk terminal first.'
        });
        return;
    }

    CustomSwal.fire({
        title: 'Confirm Node',
        text: `Confirm deployment of ${planName} for $${cost.toFixed(2)} USD?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Deploy',
        cancelButtonText: 'Abort'
    }).then((result) => {
        if (result.isConfirmed) {
            const dailyProfit = cost * rate;
            const totalMaturityReturn = cost + (dailyProfit * days);

            const nodePayload = {
                userId: currentUser.uid,
                planName: planName,
                cost: cost,
                dailyProfitAmount: dailyProfit,
                status: "Active",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            const txnPayload = {
                userId: currentUser.uid,
                planName: planName,
                cost: cost,
                runtimeDays: days,
                maturityReturn: totalMaturityReturn,
                status: "Success",
                type: "Plan Purchase",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            db.collection("active_nodes").add(nodePayload)
            .then(() => {
                return db.collection("transactions").add(txnPayload);
            })
            .then(() => {
                return db.collection("users").doc(currentUser.uid).update({
                    balance: firebase.firestore.FieldValue.increment(-cost),
                    activeInvestment: firebase.firestore.FieldValue.increment(cost),
                    purchasedCount: firebase.firestore.FieldValue.increment(1)
                });
            })
            .then(() => {
                CustomSwal.fire({ 
                    icon: 'success', 
                    title: 'Active Node', 
                    text: `${planName} Node deployed successfully into the ecosystem.` 
                });
            })
            .catch(error => {
                CustomSwal.fire({ icon: 'error', title: 'Deployment Aborted', text: error.message });
            });
        }
    });
}

// ==========================================
// ১৩. LIVE REAL-TIME AUDIT LEDGER LOGS
// ==========================================
function listenToHistoryLog() {
    const tableBody = document.getElementById('historyLogTable');
    if(!tableBody) return;

    db.collection("transactions")
    .where("userId", "==", currentUser.uid)
    .orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
        tableBody.innerHTML = ""; 

        if (snapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-500 italic">No historical operational logs recorded yet.</td></tr>`;
            return;
        }

        snapshot.forEach(doc => {
            const log = doc.data();
            let statusBadge = "";

            if (log.status === "Pending") {
                statusBadge = `<span class="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-2 py-0.5 rounded text-[10px] uppercase animate-pulse">Pending</span>`;
            } else if (log.status === "Approved" || log.status === "Success") {
                statusBadge = `<span class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Approved</span>`;
            } else {
                statusBadge = `<span class="bg-red-500/10 border border-red-500/30 text-red-400 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Rejected</span>`;
            }

            let targetRouter = "";
            if (log.type === "Deposit") targetRouter = `${log.gateway} (${log.senderNumber})`;
            else if (log.type === "Withdrawal") targetRouter = `${log.gateway} (${log.accountNumber})`;
            else if (log.type === "Plan Purchase") targetRouter = `Term: ${log.runtimeDays} Days`;
            else if (log.type === "Daily Yield") targetRouter = `Automated Cluster Return`;

            const row = `
                <tr class="border-b border-white/5 hover:bg-white/[0.02] transition">
                    <td class="p-3">
                        <p class="font-bold text-white text-xs">${log.type}</p>
                        <p class="text-[9px] text-slate-500 font-mono">${doc.id.substring(0, 8).toUpperCase()}</p>
                    </td>
                    <td class="p-3 font-mono font-bold text-white">$${parseFloat(log.amount || log.cost).toFixed(2)}</td>
                    <td class="p-3 text-slate-400 text-[11px] font-mono">${targetRouter}</td>
                    <td class="p-3 text-center">${statusBadge}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }, error => {
        console.log("Audit Core Error: ", error);
    });
}

// ==========================================
// ১৪. SYSTEM LOGOUT RUNTIME
// ==========================================
function logout() {
    auth.signOut().then(() => { window.location.href = 'index.html'; });
}
