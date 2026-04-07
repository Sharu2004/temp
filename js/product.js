// =============================================
// Thanga Mani - product.js (FINAL FIXED VERSION)
// =============================================

const EMAILJS_SERVICE_ID  = 'service_ujdih9m';
const EMAILJS_TEMPLATE_ID = 'template_2k1ctp2';

let qtyInputs = [];
let orderProcessing = false;   // 🔒 prevent double click

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

// SUCCESS POPUP (GLOBAL — FIXED)
function showSuccessPopup({ orderNumber, paymentId, totalAmount }) {

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


// MAIN FUNCTION
async function confirmOrder() {

    if (orderProcessing) return;   // 🔒 prevent multiple clicks
    orderProcessing = true;

    const name    = document.getElementById('custName').value.trim();
    const phone   = document.getElementById('custPhone').value.trim();
    const city    = document.getElementById('custCity').value.trim();
    const pincode = document.getElementById('custPincode').value.trim();
    const address = document.getElementById('custAddress').value.trim();

    if (!name || !phone || !city || !pincode || !address) {
        alert('Fill all details');
        orderProcessing = false;
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
        orderProcessing = false;
        return;
    }

    let orderData;

    try {
        const res = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalAmount })
        });

        orderData = await res.json();

        if (!orderData.order_id) {
            throw new Error('No order_id');
        }

    } catch (err) {
        console.error(err);
        alert('Payment server error');
        orderProcessing = false;
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

    console.log("HANDLER TRIGGERED");

    if (window.paymentHandled) return;
    window.paymentHandled = true;

    try {

        const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                totalAmount
            })
        });

        const result = await verifyRes.json();

        if (!result.success) {
            alert("Payment verification failed");
            return;
        }

        // CLOSE MODAL
        const modal = bootstrap.Modal.getInstance(document.getElementById('customerModal'));
        if (modal) modal.hide();

        // SHOW POPUP
        showSuccessPopup({
            orderNumber: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            totalAmount
        });

        // ✅ SEND EMAIL (NEW)
        emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
                order_number: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                total_amount: totalAmount,
                customer_name: name,
                customer_phone: phone,
                customer_address: address,
                customer_city: city,
                customer_pincode: pincode,
                order_items: cartItems.join(', ')
            }
        )
        .then(() => {
            console.log("✅ EMAIL SENT");
        })
        .catch(err => {
            console.error("❌ EMAIL FAILED:", err);
        });

        // RESET CART
        document.querySelectorAll('.qty').forEach(i => i.value = '');
        document.getElementById('totalAmount').innerText = 0;

    } catch (err) {
        console.error(err);
        alert("Verification error");
    }
}
    };

    // STORE INSTANCE (IMPORTANT)
    window.rzpInstance = new Razorpay(options);
    window.rzpInstance.open();
}