// ১. Firebase Config (আপনার অরিজিনাল স্ক্রিনশট মিলিয়ে ১০০% ফিক্সড)
const firebaseConfig = {
    apiKey: "AIzaSyC4K_nvbX_KY7dtSUkjIE0s11xgu8KqVkY", 
    authDomain: "zenith-global-assets.firebaseapp.com",
    projectId: "zenith-global-assets",
    storageBucket: "zenith-global-assets.firebasestorage.app",
    messagingSenderId: "818320822478",
    appId: "1:818320822478:web:ddd1e8f247bc3d81dfc09f",
    measurementId: "G-ZNGB5YV218"
};


// ফায়ারবেস ইনিশিয়ালাইজেশন
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let activeGateway = "";

// বিকাশ ও নগদ অফিশিয়াল এজেন্ট নাম্বার
const gatewayNumbers = {
    Bkash: "017XXXXXXXX (bKash Agent)",
    Nagad: "019XXXXXXXX (Nagad Agent)"
};

// ২. Pro Redirect & Session System
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
            // ড্যাশবোর্ডে থাকলে ডাটা, অটো-প্রফিট রান ও হিস্ট্রি লোড হবে
            loadDashboardData(user);
            processDailyYields(user);
            listenToHistoryLog();
            
            // ইউজারের একাউন্ট অনুযায়ী ডায়নামিক রেফারেল লিংক জেনারেট
            const currentDomain = window.location.origin;
            if(document.getElementById('refLinkText')) {
                document.getElementById('refLinkText').innerText = `${currentDomain}/register.html?ref=${user.uid}`;
            }
        }
    }
});

// ৩. Login Logic
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = loginForm.querySelectorAll('input');
        auth.signInWithEmailAndPassword(inputs[0].value, inputs[1].value)
            .then(() => { window.location.href = "dashboard.html"; })
            .catch(err => {
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: err.message,
                    background: '#020617',
                    color: '#fff',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'Try Again'
                });
            });
    });
}

// ৪. Registration Logic + Referral Bonus Check
const regForm = document.getElementById('registerForm');
if(regForm) {
    regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = regForm.querySelectorAll('input');
        const refUID = inputs[3].value.trim() || "none";

        auth.createUserWithEmailAndPassword(inputs[1].value, inputs[2].value).then(cred => {
            // নতুন ইউজারের ৩টি আলাদা ব্যালেন্সসহ ডকুমেন্ট তৈরি
            return db.collection('users').doc(cred.user.uid).set({
                fullName: inputs[0].value,
                email: inputs[1].value,
                balance: 0.00,          // মেইন ব্যালেন্স (ডিপোজিট ও রেফারের টাকা)
                earningBalance: 0.00,   // আর্নিং ব্যালেন্স (দৈনিক প্রফিট)
                activeInvestment: 0.00, // একটিভ ইনভেস্টমেন্ট বা স্টেক
                purchasedCount: 0,
                refBy: refUID,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                // রেফারেল কোড থাকলে রেফারার বা আমন্ত্রণকারীর মেইন ব্যালেন্সে $3.00 ডলার অটো অ্যাড হবে
                if (refUID !== "none") {
                    return db.collection('users').doc(refUID).update({
                        balance: firebase.firestore.FieldValue.increment(3.00)
                    }).catch(err => console.log("Referral crediting skipped:", err));
                }
            });
        }).then(() => {
            auth.signOut().then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Account Verified',
                    text: 'Account verified successfully! Please log in to proceed.',
                    background: '#020617',
                    color: '#fff',
                    confirmButtonColor: '#10b981',
                    confirmButtonText: 'Log In'
                }).then(() => {
                    window.location.href = 'index.html';
                });
            });
        }).catch(err => {
            Swal.fire({
                icon: 'error',
                title: 'System Error',
                text: err.message,
                background: '#020617',
                color: '#fff',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'OK'
            });
        });
    });
}

// ৫. Load Data (Real-time 3-Balance Sync for Dashboard)
function loadDashboardData(user) {
    db.collection('users').doc(user.uid).onSnapshot(doc => {
        const data = doc.data();
        if(data) {
            if(document.getElementById('userBalance')) document.getElementById('userBalance').innerText = parseFloat(data.balance || 0).toFixed(2);
            if(document.getElementById('earningBalance')) document.getElementById('earningBalance').innerText = parseFloat(data.earningBalance || 0).toFixed(2);
            if(document.getElementById('userName')) document.getElementById('userName').innerText = data.fullName || "VIP User";
            if(document.getElementById('activeInvest')) document.getElementById('activeInvest').innerText = parseFloat(data.activeInvestment || 0).toFixed(2);
            if(document.getElementById('purchasedCount')) document.getElementById('purchasedCount').innerText = data.purchasedCount || 0;
        }
    });
}

// ৬. ২৪ ঘণ্টা পর পর অটোমেটিক দৈনিক লাভ (Daily Yield) অ্যাড করার প্রসেস
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
            
            // ২৪ ঘণ্টা (৮৬৪০০০০০ মিলিমেকেন্ড) পার হয়েছে কিনা চেক
            if (now - lastClaim >= 86400000) {
                const daysPassed = Math.floor((now - lastClaim) / 86400000);
                
                if (daysPassed > 0) {
                    const totalEarned = node.dailyProfitAmount * daysPassed;
                    
                    // ১. ইউজারের ইয়ার্নিং ব্যালেন্সে প্রফিট যোগ হবে
                    db.collection("users").doc(user.uid).update({
                        earningBalance: firebase.firestore.FieldValue.increment(totalEarned)
                    });

                    // ২. একটিভ নোডের লাস্ট ক্লেম টাইম আপডেট
                    db.collection("active_nodes").doc(doc.id).update({
                        lastClaimTime: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // ৩. হিস্ট্রিতে প্রফিট জমার নোটিফিকেশন লগ
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

// ৭. Referral Link Copy Function
function copyReferral() {
    const linkText = document.getElementById('refLinkText').innerText;
    navigator.clipboard.writeText(linkText).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Cloned!',
            text: 'Referral Link Successfully Cloned to Clipboard!',
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Awesome'
        });
    });
}

// ৮. Deposit Gateway Action & Mandatory Inputs Validation
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

    // কঠোর ভ্যালিডেশন চেক (SweetAlert2 ডার্ক থিম দ্বারা কাস্টমাইজড)
    if (!usdAmount || usdAmount <= 0) { 
        Swal.fire({
            icon: 'warning',
            title: 'Invalid Input',
            text: 'Please specify a valid Allocation Value (USD).',
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Understand'
        });
        return; 
    }
    if (!senderNum) { 
        Swal.fire({
            icon: 'warning',
            title: 'Missing Number',
            text: 'Sender Account Number is mandatory.',
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'OK'
        });
        return; 
    }
    if (!trxId) { 
        Swal.fire({
            icon: 'warning',
            title: 'Missing TrxID',
            text: 'Transaction Structure ID (TrxID) is mandatory.',
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'OK'
        });
        return; 
    }
    if (!screenshotFile) { 
        Swal.fire({
            icon: 'warning',
            title: 'Screenshot Required',
            text: 'You must upload a Transfer Confirmation Screen Capture.',
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'OK'
        });
        return; 
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerText = "Transmitting Packet Node...";

    const screenshotName = `${Date.now()}_${screenshotFile.name}`;

    const depositPayload = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: document.getElementById('userName').innerText,
        amount: usdAmount,
        bdtValue: (usdAmount * 127).toFixed(2),
        gateway: activeGateway,
        senderNumber: senderNum,
        transactionId: trxId,
        screenshotName: screenshotName,
        status: "Pending", 
        type: "Deposit",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("transactions").add(depositPayload)
    .then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Deposit Committed',
            text: 'Deposit Packet Committed Successfully! Awaiting Admin Node Verification.',
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Great'
        });
        document.getElementById('usdAmount').value = "";
        document.getElementById('senderNum').value = "";
        document.getElementById('trxId').value = "";
        document.getElementById('screenshot').value = "";
        document.getElementById('paymentBox').classList.add('hidden');
    })
    .catch(error => {
        Swal.fire({
            icon: 'error',
            title: 'Transmission Error',
            text: error.message,
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'OK'
        });
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "Submit Deposit Request";
    });
}

// ৯. Withdrawal Handling with Choice Source & Minimum $20 Limit
function processWithdrawal() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const gateway = document.getElementById('withdrawGateway').value;
    const account = document.getElementById('withdrawAccount').value.trim();
    const source = document.getElementById('withdrawSource').value; 
    
    // ব্যালেন্স এলিমেন্ট আইডি চেক
    const balanceId = (source === "earning") ? 'earningBalance' : 'userBalance';
    const currentBalance = parseFloat(document.getElementById(balanceId).innerText);

    // ২০ ডলারের কম হলে ইনস্ট্যান্ট ইরোর এলার্ট
    if (!amount || amount < 20) { 
        Swal.fire({
            icon: 'error',
            title: 'Limit Restriction',
            text: 'Error: Minimum asset threshold for disinvestment is $20.00 USD.',
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'OK'
        });
        return; 
    }
    if (!account) { 
        Swal.fire({
            icon: 'warning',
            title: 'Blank Terminal',
            text: 'Receiving Terminal Number cannot be left blank.',
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'OK'
        });
        return; 
    }
    if (amount > currentBalance) { 
        Swal.fire({
            icon: 'error',
            title: 'Insufficient Balance',
            text: `Error: Insufficient capital matrix in selected ${source === 'earning' ? 'Earning' : 'Main'} Balance.`,
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'OK'
        });
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
        Swal.fire({
            icon: 'success',
            title: 'Pipeline Deployed',
            text: 'Disinvestment Pipeline Deployed! Liquidation processing is currently Pending.',
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Done'
        });
        document.getElementById('withdrawAmount').value = "";
        document.getElementById('withdrawAccount').value = "";
    })
    .catch(error => {
        Swal.fire({
            icon: 'error',
            title: 'Liquidation Interruption',
            text: error.message,
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'OK'
        });
    });
}

// ১০. Deploy Node Packages (বাস্তবধর্মী প্রফিট লজিক)
function buyPlan(cost, days, rate, planName) {
    const currentBalance = parseFloat(document.getElementById('userBalance').innerText);

    // মেইন ব্যালেন্সে টাকা না থাকলে রিডাইরেক্ট করে ডিপোজিটে পাঠাবে
    if (currentBalance < cost) {
        Swal.fire({
            icon: 'error',
            title: 'ব্যালেন্স অপর্যাপ্ত!',
            text: 'Insufficient Node Deployment Capital. Please fund your main balance desk first.',
            background: '#020617',
            color: '#fff',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Fund Balance'
        }).then(() => {
            switchTab('deposit');
        });
        return;
    }

    // ব্রাউজার কনফার্মেশনের জায়গায় প্রিমিয়াম ডার্ক সুইটঅ্যালার্ট কনফার্ম বক্স
    Swal.fire({
        title: 'Confirm Deployment',
        text: `Confirm deployment of ${planName} for $${cost.toFixed(2)} USD?`,
        icon: 'question',
        showCancelButton: true,
        background: '#020617',
        color: '#fff',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Yes, Deploy Node',
        cancelButtonText: 'Cancel'
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
                Swal.fire({
                    icon: 'success',
                    title: 'Deployed Successfully',
                    text: `${planName} Deployed Successfully! Computational node is now running.`,
                    background: '#020617',
                    color: '#fff',
                    confirmButtonColor: '#10b981',
                    confirmButtonText: 'Excellent'
                });
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Deployment Aborted',
                    text: error.message,
                    background: '#020617',
                    color: '#fff',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'OK'
                });
            });
        }
    });
}

// ১১. Real-Time Audit Log History Synchronization
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

// ১২. Logout Function
function logout() {
    auth.signOut().then(() => { window.location.href = 'index.html'; });
                                                                                   }
