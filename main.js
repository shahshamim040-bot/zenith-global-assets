// এই ফাংশনটি আপনার অ্যাডমিন প্যানেলের "Approve" বাটনে থাকবে
async function approveDeposit(transactionId, userId, depositAmount) {
    const depositRef = db.collection('deposits').doc(transactionId);
    const userRef = db.collection('users').doc(userId);

    try {
        // ১. ইউজারের মেইন ব্যালেন্সে টাকা যোগ করা
        await userRef.update({
            balance: firebase.firestore.FieldValue.increment(depositAmount)
        });

        // ২. চেক করা যে এই ইউজারের কোন রেফারার আছে কিনা
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (userData.refBy && userData.refBy !== "none" && !userData.isFirstDepositDone) {
            // রেফারারকে খুঁজে বের করা (রেফারাল কোড বা ইমেইল দিয়ে)
            const referrerQuery = await db.collection('users').where('email', '==', userData.refBy).get();
            
            if (!referrerQuery.empty) {
                const referrerDoc = referrerQuery.docs[0];
                const bonusAmount = depositAmount * 0.10; // ১০% বোনাস (আপনি চাইলে কমাতে/বাড়াতে পারেন)

                // রেফারারের একাউন্টে বোনাস যোগ করা
                await db.collection('users').doc(referrerDoc.id).update({
                    balance: firebase.firestore.FieldValue.increment(bonusAmount),
                    referralEarnings: firebase.firestore.FieldValue.increment(bonusAmount)
                });
            }

            // প্রথম ডিপোজিট হয়ে গেছে মার্ক করা যেন বারবার বোনাস না যায়
            await userRef.update({ isFirstDepositDone: true });
        }

        // ৩. ডিপোজিট স্ট্যাটাস 'Completed' করা
        await depositRef.update({ status: 'Completed' });
        alert("Deposit Approved & Referral Bonus Sent!");

    } catch (error) {
        console.error("Error approving deposit: ", error);
    }
}