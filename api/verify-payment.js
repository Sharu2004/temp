const crypto = require('crypto');
const admin  = require('firebase-admin');

// Firebase init (only once)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId:   process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}
const db = admin.firestore();

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST')
        return res.status(405).json({ error: 'Method not allowed' });

    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
        orderNumber, totalAmount, customer, cartItems,
    } = req.body;

    // Verify signature
    const body     = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    if (expected !== razorpay_signature)
        return res.status(400).json({ error: 'Payment verification failed' });

    // Save to Firestore
    try {
        await db.collection('orders').doc(orderNumber).set({
            orderNumber,
            paymentId:       razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            totalAmount,
            customer,
            cartItems,
            status:    'paid',
            createdAt: new Date().toISOString(),
        });

        res.json({ success: true, orderNumber, paymentId: razorpay_payment_id });
    } catch (err) {
        console.error('Firebase error:', err);
        res.json({ success: true, orderNumber, paymentId: razorpay_payment_id, dbError: true });
    }
};