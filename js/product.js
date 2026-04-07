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

    // STEP 1: CREATE ORDER
    let orderData;

    try {
        const res = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                totalAmount: Number(totalAmount)
            })
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

    // STEP 2: RAZORPAY
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

            // VERIFY PAYMENT
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

                alert("Payment successful!");

            } catch (err) {
                console.error(err);
                alert("Verification error");
            }
        }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}