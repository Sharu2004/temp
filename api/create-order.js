const Razorpay = require('razorpay');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') 
        return res.status(405).json({ error: 'Method not allowed' });

    const { totalAmount } = req.body;
    if (!totalAmount || totalAmount <= 0)
        return res.status(400).json({ error: 'Invalid amount' });

    const razorpay = new Razorpay({
        key_id:     process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const d = new Date();
    const orderNumber = `TM-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`;

    try {
        const order = await razorpay.orders.create({
            amount:   Math.round(totalAmount * 100),
            currency: 'INR',
            receipt:  orderNumber,
        });

        res.json({
            order_id:     order.id,
            order_number: orderNumber,
            key_id:       process.env.RAZORPAY_KEY_ID,
            amount:       totalAmount,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create order' });
    }
};