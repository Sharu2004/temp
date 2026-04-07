// =============================================
// Thanga Mani - product.js (FIXED VERSION)
// =============================================

// EmailJS config
const EMAILJS_SERVICE_ID  = 'service_ujdih9m';
const EMAILJS_TEMPLATE_ID = 'template_2k1ctp2';

// Global qtyInputs
let qtyInputs = [];

// DOM READY
document.addEventListener("DOMContentLoaded", () => {
    qtyInputs = document.querySelectorAll('.qty');

    qtyInputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.value === '' || input.value < 0) input.value = 0;
            calculateTotal();
        });
    });
});

// TOTAL
function calculateTotal() {
    let total = 0;
    qtyInputs.forEach(i => {
        total += (Number(i.value) || 0) * (Number(i.dataset.price) || 0);
    });
    document.getElementById('totalAmount').innerText = total;
    return total;
}

// OPEN POPUP
function openOrderPopup() {
    const total = calculateTotal();
    if (total <= 0) {
        alert('Add at least one product');
        return;
    }
    new bootstrap.Modal(document.getElementById('customerModal')).show();
}

// MAIN ORDER FUNCTION
async function confirmOrder() {

    const name    = document.getElementById('custName').value.trim();
    const phone   = document.getElementById('custPhone').value.trim();
    const city    = document.getElementById('custCity').value.trim();
    const pincode = document.getElementById('custPincode').value.trim();
    const address = document.getElementById('custAddress').value.trim();

    if (!name || !phone || !city || !pincode || !address) {
        alert('Fill all details');
        return;
    }

    let cartItems = [], totalAmount = 0;

    document.querySelectorAll('.qty').forEach(input => {
        const qty = parseInt(input.value);
        if (qty > 0) {
            const price = parseInt(input.dataset.price);
            totalAmount += qty * price;
            cartItems.push(`${input.dataset.name} x${qty}`);
        }
    });

    if (totalAmount <= 0) {
        alert('No items selected');
        return;
    }

    let orderData;

    try {
        const res = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalAmount: Number(totalAmount) })
        });

        orderData = await res.json();

        if (!orderData.order_id) {
            throw new Error('No order_id');
        }

    } catch (err) {
        console.error(err);
        alert('Payment server error');
        return;
    }

    const options = {
        key: orderData.key_id,
        amount: totalAmount * 100,
        currency: "INR",
        name: "Thanga Mani",
        description: "Order Payment",
        order_id: orderData.order_id,

        prefill: {
            name,
            contact: phone
        },

        handler: async function (response) {

            console.log("Payment success:", response);

            // 🚨 prevent double execution
            if (window.paymentDone) return;
            window.paymentDone = true;

            try {
                const verifyRes = await fetch('/api/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        totalAmount,
                        customer: { name, phone, address, city, pincode },
                        cartItems
                    })
                });

                const result = await verifyRes.json();

                if (!result.success) {
                    alert("Payment verification failed");
                    return;
                }

                // ✅ CLOSE CUSTOMER MODAL (IMPORTANT)
                const modal = bootstrap.Modal.getInstance(document.getElementById('customerModal'));
                if (modal) modal.hide();

                // ✅ SHOW SUCCESS POPUP (FIXED)
                function showSuccessPopup({ orderNumber, paymentId, totalAmount, name, cartItems }) {

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;
        top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.6);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:9999;
    `;

    overlay.innerHTML = `
        <div style="background:#fff;padding:20px;border-radius:10px;width:90%;max-width:400px;text-align:center">
            <h3 style="color:green">Payment Successful</h3>
            <p><b>Order ID:</b> ${orderNumber}</p>
            <p><b>Payment ID:</b> ${paymentId}</p>
            <p><b>Total:</b> ₹${totalAmount}</p>
            <button onclick="this.closest('div').parentElement.remove()" style="margin-top:10px;padding:10px 20px;background:#000;color:#fff;border:none;border-radius:5px">
                Close
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
}

                // ✅ RESET CART
                document.querySelectorAll('.qty').forEach(i => i.value = '');
                document.getElementById('totalAmount').innerText = 0;

            } catch (err) {
                console.error(err);
                alert("Verification error");
            }
        }
    };

    new Razorpay(options).open();
}