const Razorpay = require('razorpay');

module.exports = async (req, res) => {
    try {
        const body = typeof req.body === 'string'
            ? JSON.parse(req.body)
            : req.body;

        const { totalAmount } = body;

        if (!totalAmount || isNaN(totalAmount)) {
            throw new Error("Invalid totalAmount");
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const order = await razorpay.orders.create({
            amount: Math.round(totalAmount * 100),
            currency: 'INR',
        });

        res.json({
            order_id: order.id,                 // ✅ ONLY THIS matters
            key_id: process.env.RAZORPAY_KEY_ID,
            amount: totalAmount,
        });

    } catch (err) {
        console.error("ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};