// ১. Firebase Config (Collected from your repo in "21625.jpg")
const firebaseConfig = {
    apiKey: "AIzaSyC4k_mvbX_KY7dtSUkjiE0a11xgu8KqVkY",
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

// বিকাশ ও নগদ গেটওয়ে অ্যাকাউন্ট নাম্বার (প্রয়োজন অনুযায়ী পরিবর্তন করতে পারবেন)
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
            // ড্যাশবোর্ডে থাকলে ডাটা ও হিস্ট্রি লোড হবে
            loadDashboardData(user);
            listenToHistoryLog();
            
            // অটোমেটিক রেফারেল লিংক জেনারেট
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
            .catch(err => alert("Access Denied: " + err.message));
    });
}

// ৪. Registration Logic
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
                activeInvestment: 0.00,
                totalYield: 0.00,
                purchasedCount: 0,
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

// ৫. Load Data (Real-time Sync for Dashboard)
function loadDashboardData(user) {
    db.collection('users').doc(user.uid).onSnapshot(doc => {
        const data = doc.data();
        if(data) {
            if(document.getElementById('userBalance')) document.getElementById('userBalance').innerText = parseFloat(data.balance || 0).toFixed(2);
            if(document.getElementById('userName')) document.getElementById('userName').innerText = data.fullName || "VIP User";
            if(document.getElementById('activeInvest')) document.getElementById('activeInvest').innerText = parseFloat(data.activeInvestment || 0).toFixed(2);
            if(document.getElementById('totalYield')) document.getElementById('totalYield').innerText = parseFloat(data.totalYield || 0).toFixed(2);
            if(document.getElementById('purchasedCount')) document.getElementById('purchasedCount').innerText = data.purchasedCount || 0;
        }
    });
}

// ৬. Referral Link Copy Function
function copyReferral() {
    const linkText = document.getElementById('refLinkText').innerText;
    navigator.clipboard.writeText(linkText).then(() => {
        alert("Referral Link Successfully Cloned to Clipboard!");
    });
}

// ৭. Professional Deposit Gateway with Mandatory Inputs
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

    // কঠোর ভ্যালিডেশন চেক (স্কিনসট, নাম্বার ও ট্রানজেকশন আইডি না দিলে সাবমিট হবে না)
    if (!usdAmount || usdAmount <= 0) { return alert("Please specify a valid Allocation Value (USD)."); }
    if (!senderNum) { return alert("Sender Account Number is mandatory."); }
    if (!trxId) { return alert("Transaction Structure ID (TrxID) is mandatory."); }
    if (!screenshotFile) { return alert("You must upload a Transfer Confirmation Screen Capture."); }

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
        status: "Pending", // এডমিন প্যানেল এপ্রুভ করার জন্য পেন্ডিং থাকবে
        type: "Deposit",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("transactions").add(depositPayload)
    .then(() => {
        alert("Deposit Packet Committed Successfully! Awaiting Admin Node Verification.");
        document.getElementById('usdAmount').value = "";
        document.getElementById('senderNum').value = "";
        document.getElementById('trxId').value = "";
        document.getElementById('screenshot').value = "";
        document.getElementById('paymentBox').classList.add('hidden');
    })
    .catch(error => alert("Transmission Error: " + error.message))
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "Commit Settlement Packet";
    });
}

// ৮. Withdrawal Desk with Minimum $20 Limit & Error
function processWithdrawal() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const gateway = document.getElementById('withdrawGateway').value;
    const account = document.getElementById('withdrawAccount').value.trim();
    const currentBalance = parseFloat(document.getElementById('userBalance').innerText);

    // ২০ ডলারের কম হলে ইরোর দেখাবে
    if (!amount || amount < 20) { return alert("Error: Minimum asset threshold for disinvestment is $20.00 USD."); }
    if (!account) { return alert("Receiving Terminal Number cannot be left blank."); }
    if (amount > currentBalance) { return alert("Error: Insufficient capital matrix in available balance."); }

    const withdrawPayload = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        amount: amount,
        gateway: gateway.toUpperCase(),
        accountNumber: account,
        status: "Pending", // এডমিন এপ্রুভ করার আগে পেন্ডিং থাকবে
        type: "Withdrawal",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("transactions").add(withdrawPayload)
    .then(() => {
        return db.collection("users").doc(currentUser.uid).update({
            balance: firebase.firestore.FieldValue.increment(-amount)
        });
    })
    .then(() => {
        alert("Disinvestment Pipeline Deployed! Liquidation processing is currently Pending.");
        document.getElementById('withdrawAmount').value = "";
        document.getElementById('withdrawAccount').value = "";
    })
    .catch(error => alert("Liquidation Interruption: " + error.message));
}

// ৯. Deploy Node Packages (30% Daily Interest Counter Matrix)
function buyPlan(cost, days, planName) {
    const currentBalance = parseFloat(document.getElementById('userBalance').innerText);

    if (currentBalance < cost) {
        alert("Insufficient Node Deployment Capital. Please fund your balance desk first.");
        switchTab('deposit');
        return;
    }

    if (confirm(`Confirm deployment of ${planName} for $${cost.toFixed(2)} USD?`)) {
        // ৩০% হারে মেয়াদ শেষ হওয়ার পর কতো পাবে তা অটো ক্যালকুলেট
        const dailyProfit = cost * 0.30;
        const totalMaturityReturn = cost + (dailyProfit * days);

        const planPayload = {
            userId: currentUser.uid,
            planName: planName,
            cost: cost,
            runtimeDays: days,
            dailyYieldRate: "30%",
            maturityReturn: totalMaturityReturn,
            status: "Success", // প্ল্যান পারচেজ সাথে সাথেই সাকসেসফুল ট্র্যাকিং হবে
            type: "Plan Purchase",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection("transactions").add(planPayload)
        .then(() => {
            return db.collection("users").doc(currentUser.uid).update({
                balance: firebase.firestore.FieldValue.increment(-cost),
                activeInvestment: firebase.firestore.FieldValue.increment(cost),
                purchasedCount: firebase.firestore.FieldValue.increment(1)
            });
        })
        .then(() => alert(`${planName} Deployed Successfully! Processing daily computational clusters.`))
        .catch(error => alert("Deployment Aborted: " + error.message));
    }
}

// ১০. Audit Log / Sidebar History Sync (Pending / Approved / Success)
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

            // এডমিন ড্যাশবোর্ড থেকে স্ট্যাটাস পরিবর্তন করলে অটোমেটিক এখানেও রিয়েল-টাইমে চেঞ্জ হবে
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

// ১১. Logout Function
function logout() {
    auth.signOut().then(() => { window.location.href = 'index.html'; });
}

// ১২. Live Operational Chat Terminal
function sendLiveChatMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if(!msg) return;
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML += `<div class="text-right"><span class="bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl inline-block my-1 max-w-[80%]">${msg}</span></div>`;
    input.value = "";
    setTimeout(() => {
        chatContainer.innerHTML += `<div class="text-left"><span class="bg-slate-900 border border-white/10 text-slate-300 px-3 py-1.5 rounded-xl inline-block my-1 max-w-[80%]">Secure Handshake Complete. Node Operator will review this log sequence shortly.</span></div>`;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 1000);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
