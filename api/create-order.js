const Razorpay = require('razorpay');

module.exports = async (req, res) => {
    try {
        const body = typeof req.body === 'string'
            ? JSON.parse(req.body)
            : req.body;

        const { totalAmount } = body;

        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const Razorpay = require('razorpay');

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const order = await razorpay.orders.create({
            amount: Math.round(totalAmount * 100),
            currency: 'INR',
        });

        return res.json({
            order_id: order.id,
            key_id: process.env.RAZORPAY_KEY_ID,
            amount: totalAmount,
        });

    } catch (err) {
        console.error("CREATE ORDER ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
};