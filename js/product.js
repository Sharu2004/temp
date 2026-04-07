// =============================================
// Thanga Mani - product.js (SECURE VERSION)
// All payment secrets handled by backend only
// =============================================

// ── Config: change this to your deployed backend URL ──────────

// For local testing use: 'http://localhost:3000'

// ── EmailJS config (public key only — safe in frontend) ───────
const EMAILJS_SERVICE_ID  = 'service_ujdih9m';
const EMAILJS_TEMPLATE_ID = 'template_2k1ctp2';
const data = await res.json();
const orderId = data.order_id;
// Public key is already initialized in index.html <head>

// ═══════════════════════════════════════════
// TOTAL CALCULATION
// ═══════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    const qtyInputs = document.querySelectorAll('.qty');

    qtyInputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.value === '' || input.value < 0) input.value = 0;
            calculateTotal();
        });
    });
});

function calculateTotal() {
    let total = 0;
    qtyInputs.forEach(i => {
        total += (Number(i.value) || 0) * (Number(i.dataset.price) || 0);
    });
    document.getElementById('totalAmount').innerText = total;
    return total;
}

// ═══════════════════════════════════════════
// OPEN ORDER POPUP (validates cart first)
// ═══════════════════════════════════════════
function openOrderPopup() {
    const total = calculateTotal();
    if (total <= 0) {
        showToast('Please add quantity for at least one product', 'warning');
        return;
    }
    new bootstrap.Modal(document.getElementById('customerModal')).show();
}

// ═══════════════════════════════════════════
// CONFIRM ORDER — validates form, calls backend
// ═══════════════════════════════════════════
async function confirmOrder() {
    const name    = document.getElementById('custName').value.trim();
    const phone   = document.getElementById('custPhone').value.trim();
    const city    = document.getElementById('custCity').value.trim();
    const pincode = document.getElementById('custPincode').value.trim();
    const address = document.getElementById('custAddress').value.trim();

    // Validation
    if (!name || !phone || !city || !pincode || !address) {
        showToast('Please fill in all details before confirming.', 'warning');
        return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
        showToast('Please enter a valid 10-digit Indian mobile number.', 'warning');
        return;
    }
    if (!/^\d{6}$/.test(pincode)) {
        showToast('Please enter a valid 6-digit pincode.', 'warning');
        return;
    }

    // Build cart
    let cartItems = [], totalAmount = 0;
    document.querySelectorAll('.qty').forEach(input => {
        const qty = parseInt(input.value);
        if (qty > 0) {
            const itemName  = input.getAttribute('data-name');
            const itemPrice = parseInt(input.getAttribute('data-price'));
            const itemTotal = qty * itemPrice;
            totalAmount += itemTotal;
            cartItems.push(`${itemName} x${qty} = ₹${itemTotal}`);
        }
    });

    if (cartItems.length === 0) {
        showToast('Please add at least one product to your order.', 'warning');
        return;
    }

    // Close bootstrap modal
    const modalEl = document.getElementById('customerModal');
    bootstrap.Modal.getInstance(modalEl)?.hide();

    // Show loading
    showLoadingOverlay('Preparing your order...');

    // ── Step 1: Create Razorpay order via backend ──────────────
    let orderData;
    try {
        const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        totalAmount: Number(totalAmount)
    })
});

const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        totalAmount: Number(totalAmount)
    })
});

const orderData = await res.json();

        if (!orderData.order_id) throw new Error('No order_id received');
    } catch (err) {
        hideLoadingOverlay();
        console.error('Backend error:', err);
        showToast('Could not connect to payment server. Please try again.', 'error');
        return;
    }

    hideLoadingOverlay();

    // ── Step 2: Open Razorpay checkout (key_id from backend, secret stays hidden) ──
    const options = {
        key:         orderData.key_id,    // Only public key — secret never in frontend
        amount:      totalAmount * 100,
        currency:    'INR',
        name:        'Thanga Mani',
        description: 'Peanut Burfi Order',
        image:       'images/logo.png',
        order_id:    orderData.order_id,
        prefill: {
            name:    name,
            contact: phone,
        },
        notes: {
            address: address,
            city:    city,
            pincode: pincode,
        },
        theme: { color: '#c8a96e' },

        handler: async function (response) {
            showLoadingOverlay('Verifying payment...');
            console.log("Payment success:", response);

            // ── Step 3: Verify payment signature via backend ───────────
            // This prevents fake payment success — backend checks HMAC
            try {
                const verifyRes = await fetch('/api/verify-payment', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id:   response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature:  response.razorpay_signature,
                        
                        totalAmount,
                        customer: { name, phone, address, city, pincode },
                        cartItems,
                    }),
                });

                const result = await verifyRes.json();
                hideLoadingOverlay();

                if (!result.success) {
                    showToast('Payment verification failed. Please contact support with Payment ID: ' + response.razorpay_payment_id, 'error');
                    return;
                }

                // ── Step 4: Send email notification to admin via EmailJS ──
                const templateParams = {
                    order_number:     result.orderNumber,
                    payment_id:       result.paymentId,
                    total_amount:     totalAmount,
                    customer_name:    name,
                    customer_phone:   phone,
                    customer_address: address,
                    customer_city:    city,
                    customer_pincode: pincode,
                    order_items:      cartItems.join('\n'),
                    admin_email:      'sharukeshavalingam21@gmail.com',
                };

                emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                    .then(() => console.log('✅ Admin email sent'))
                    .catch(err => console.error('❌ Email error:', err));

                // ── Step 5: WhatsApp notification ─────────────────────────
                let msg = `🛒 *New Order - Thanga Mani*\n\n`;
                msg += `🔖 *Order No:* ${result.orderNumber}\n`;
                msg += `✅ *Payment ID:* ${result.paymentId}\n`;
                msg += `💰 *Total:* ₹${totalAmount}\n\n`;
                msg += `👤 *Name:* ${name}\n`;
                msg += `📞 *Phone:* ${phone}\n`;
                msg += `📍 *Address:* ${address}, ${city} - ${pincode}\n\n`;
                msg += `📦 *Items:*\n${cartItems.join('\n')}`;
                window.open(`https://wa.me/919965061448?text=${encodeURIComponent(msg)}`, '_blank');

                // ── Step 6: Show success popup ────────────────────────────
                showSuccessPopup({
                    orderNumber: result.orderNumber,
                    paymentId:   result.paymentId,
                    totalAmount,
                    name,
                    cartItems,
                });

                // Reset cart
                document.querySelectorAll('.qty').forEach(i => i.value = '');
                document.getElementById('totalAmount').innerText = 0;

            } catch (err) {
                hideLoadingOverlay();
                console.error('Verification error:', err);
                showToast(
                    `Payment received but verification error. Save your Payment ID: ${response.razorpay_payment_id} and contact us.`,
                    'error'
                );
            }
        },

        modal: {
            ondismiss: function () {
                showToast('Payment cancelled. Please try again.', 'warning');
            }
        }
    };

    new Razorpay(options).open();
}

// ═══════════════════════════════════════════
// SUCCESS POPUP
// ═══════════════════════════════════════════
function showSuccessPopup({ orderNumber, paymentId, totalAmount, name, cartItems }) {
    // Remove existing overlay if any
    document.getElementById('successOverlay')?.remove();

    const itemsHTML = cartItems.map(item => {
        const eqIdx = item.lastIndexOf(' = ');
        const label = item.substring(0, eqIdx);
        const price = item.substring(eqIdx + 3);
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0;">
            <span style="font-size:13px;color:#555;flex:1;padding-right:8px;">${label}</span>
            <span style="font-size:13px;font-weight:600;color:#333;white-space:nowrap;">${price}</span>
        </div>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'successOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);';

    overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:0;max-width:420px;width:100%;font-family:sans-serif;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.3);animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#c8a96e,#a07840);padding:2rem;text-align:center;">
            <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;border:3px solid rgba(255,255,255,0.5);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p style="font-size:20px;font-weight:700;color:#fff;margin:0 0 4px;">Payment Successful!</p>
            <p style="font-size:14px;color:rgba(255,255,255,0.85);margin:0;">Thank you, ${escapeHtml(name)}! 🎉</p>
        </div>

        <!-- Body -->
        <div style="padding:1.5rem;">

            <!-- Order & Payment IDs -->
            <div style="background:#faf9f6;border-radius:12px;padding:1rem;margin-bottom:1rem;border:1px solid #f0ece3;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Order Number</span>
                    <span style="font-size:14px;font-weight:700;color:#c8a96e;font-family:monospace;">${escapeHtml(orderNumber)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Payment ID</span>
                    <span style="font-size:12px;color:#666;font-family:monospace;">${escapeHtml(paymentId)}</span>
                </div>
            </div>

            <!-- Items -->
            <div style="margin-bottom:1rem;">
                <p style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Order Items</p>
                <div style="max-height:160px;overflow-y:auto;">${itemsHTML}</div>
            </div>

            <!-- Total -->
            <div style="background:#c8a96e;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <span style="font-size:15px;font-weight:700;color:#fff;">Total Paid</span>
                <span style="font-size:18px;font-weight:800;color:#fff;">₹${totalAmount}</span>
            </div>

            <!-- Note -->
            <p style="font-size:12px;color:#aaa;text-align:center;margin:0 0 1rem;line-height:1.5;">
                📧 Admin notified via email &amp; WhatsApp.<br>Keep your order number for reference.
            </p>

            <!-- Button -->
            <button onclick="document.getElementById('successOverlay').remove()"
                style="width:100%;padding:14px;background:#2c2c2c;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s;"
                onmouseover="this.style.background='#c8a96e'"
                onmouseout="this.style.background='#2c2c2c'">
                Done ✓
            </button>
        </div>
    </div>

    <style>
        @keyframes popIn {
            from { opacity:0; transform:scale(0.8) translateY(20px); }
            to   { opacity:1; transform:scale(1) translateY(0); }
        }
    </style>`;

    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
}

// ═══════════════════════════════════════════
// LOADING OVERLAY
// ═══════════════════════════════════════════
function showLoadingOverlay(message = 'Please wait...') {
    document.getElementById('loadingOverlay')?.remove();
    const el = document.createElement('div');
    el.id = 'loadingOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
    el.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:2rem 2.5rem;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.3);">
            <div style="width:48px;height:48px;border:4px solid #f0ece3;border-top-color:#c8a96e;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem;"></div>
            <p style="font-family:sans-serif;font-size:15px;color:#333;margin:0;font-weight:500;">${escapeHtml(message)}</p>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(el);
}

function hideLoadingOverlay() {
    document.getElementById('loadingOverlay')?.remove();
}

// ═══════════════════════════════════════════
// TOAST NOTIFICATION
// ═══════════════════════════════════════════
function showToast(message, type = 'info') {
    const colors = {
        success: { bg: '#2d6a4f', icon: '✓' },
        warning: { bg: '#c8a96e', icon: '⚠' },
        error:   { bg: '#d62828', icon: '✕' },
        info:    { bg: '#333',    icon: 'ℹ' },
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:${c.bg};color:#fff;padding:12px 20px;border-radius:30px;font-family:sans-serif;font-size:14px;z-index:99999;box-shadow:0 8px 25px rgba(0,0,0,0.3);max-width:90%;text-align:center;animation:fadeIn 0.3s ease;`;
    toast.innerHTML = `<span style="margin-right:8px;">${c.icon}</span>${escapeHtml(message)}`;
    toast.innerHTML += `<style>@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// ═══════════════════════════════════════════
// SECURITY: Escape HTML to prevent XSS
// ═══════════════════════════════════════════
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}