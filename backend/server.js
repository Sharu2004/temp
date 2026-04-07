require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const admin    = require('firebase-admin');

const app = express();
/* ── CORS FIX ───────────────────────────────────────────── */
const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://your-frontend-domain.onrender.com", // add your deployed frontend later
];

app.use(cors({
    origin: function (origin, callback) {

        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed"));
        }
    },
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());

// ── Firebase init ──────────────────────────────────────────────
admin.initializeApp({
    credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
});
const db = admin.firestore();

// ── Razorpay init ─────────────────────────────────────────────
const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Helpers ───────────────────────────────────────────────────
function generateOrderNumber() {
    const d    = new Date();
    const date = d.getFullYear().toString()
        + String(d.getMonth() + 1).padStart(2, '0')
        + String(d.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `TM-${date}-${rand}`;
}

// ── POST /create-order ────────────────────────────────────────
// Frontend calls this → gets a Razorpay order_id back
// Key SECRET never leaves this file
app.post('/create-order', async (req, res) => {
    const { totalAmount } = req.body;
    if (!totalAmount || totalAmount <= 0)
        return res.status(400).json({ error: 'Invalid amount' });

    try {
        const orderNumber = generateOrderNumber();
        const order = await razorpay.orders.create({
            amount:   Math.round(totalAmount * 100),
            currency: 'INR',
            receipt:  orderNumber,
        });

        res.json({
            order_id:     order.id,
            order_number: orderNumber,
            key_id:       process.env.RAZORPAY_KEY_ID,   // only public key sent to frontend
            amount:       totalAmount,
        });
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
});

// ── POST /verify-payment ──────────────────────────────────────
// Verifies HMAC signature — prevents fake payment success attacks
// Saves order to Firebase Firestore
app.post('/verify-payment', async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderNumber,
        totalAmount,
        customer,
        cartItems,
    } = req.body;

    // Signature check
    const body     = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    if (expected !== razorpay_signature) {
        console.warn('Signature mismatch!', { expected, razorpay_signature });
        return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Save to Firestore
    try {
        const orderData = {
            orderNumber,
            paymentId:   razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            totalAmount,
            customer,
            cartItems,
            status:    'paid',
            createdAt: new Date().toISOString(),
        };

        await db.collection('orders').doc(orderNumber).set(orderData);
        console.log('✅ Order saved to Firebase:', orderNumber);

        // Send email via EmailJS server-side API (optional — remove if using frontend EmailJS)
        // You can also call EmailJS REST API here if you want

        res.json({ success: true, orderNumber, paymentId: razorpay_payment_id });
    } catch (err) {
        console.error('Firebase save error:', err);
        // Payment was verified, return success even if DB write fails
        res.json({ success: true, orderNumber, paymentId: razorpay_payment_id, dbError: true });
    }
});

// ── GET /health ────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Thanga Mani backend running on port ${PORT}`));