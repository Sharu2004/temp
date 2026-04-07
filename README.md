# Thanga Mani — Secure Setup Guide

## Project Structure
```
thangamani/
├── backend/
│   ├── server.js          ← Secure Node.js backend
│   ├── package.json
│   └── .env.example       ← Copy to .env and fill keys
├── frontend/
│   ├── index.html         ← Updated (no secrets)
│   ├── js/
│   │   └── product.js     ← Updated (calls backend)
│   ├── css/  (unchanged)
│   ├── images/ (unchanged)
│   └── products/ (unchanged)
└── .gitignore             ← Prevents .env from being committed
```

---

## Step 1 — Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Now edit .env with your real keys (see below)
npm run dev   # for development
npm start     # for production
```

---

## Step 2 — Fill in .env

### Razorpay Keys
1. Go to https://dashboard.razorpay.com
2. Settings → API Keys → Generate Key
3. Copy Key ID and Key Secret into .env

### Firebase Keys
1. Go to https://console.firebase.google.com
2. Create project → Enable Firestore Database
3. Project Settings → Service Accounts → Generate new private key
4. Download the JSON and copy values into .env:
   - project_id → FIREBASE_PROJECT_ID
   - client_email → FIREBASE_CLIENT_EMAIL
   - private_key → FIREBASE_PRIVATE_KEY (include the full key with \n)

### EmailJS Keys
1. Go to https://www.emailjs.com
2. Account → API Keys → copy Public Key
3. Already initialized in index.html head (safe to keep in frontend)

---

## Step 3 — Update Frontend Backend URL

In `js/product.js`, line 5:
```javascript
const BACKEND_URL = 'https://your-backend-url.onrender.com';
```
Change to your actual deployed backend URL.

For local testing: `http://localhost:3000`

---

## Step 4 — Deploy Backend (Free Options)

### Option A: Render (Recommended)
1. Push your `backend/` folder to a GitHub repo
2. Go to https://render.com → New Web Service
3. Connect repo → Set environment variables from your .env
4. Deploy → copy the URL

### Option B: Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Option C: Vercel
```bash
npm install -g vercel
cd backend
vercel --prod
```

---

## Step 5 — Firebase Firestore Rules (Security)

In Firebase Console → Firestore → Rules, set:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow read, write: if false;  // Only backend (admin SDK) can write
    }
  }
}
```

---

## Step 6 — Test Payment Flow

1. Start backend: `npm run dev`
2. Open `index.html` in browser (use Live Server)
3. Add products → Click Proceed → Fill details → Pay
4. Use Razorpay test card: `4111 1111 1111 1111`, any future date, any CVV
5. Check Firebase Console → Firestore → orders collection
6. Check your email for admin notification

---

## Security Checklist

- [x] Razorpay KEY_SECRET never in frontend
- [x] Razorpay payment signature verified in backend (prevents fake payments)
- [x] Firebase credentials in .env only
- [x] .gitignore blocks .env from GitHub
- [x] XSS protection via escapeHtml() on all user input displayed
- [x] Input validation (phone, pincode format)
- [x] All orders saved to Firebase with timestamp

---

## EmailJS Template Variables

In your EmailJS template `template_2k1ctp2`, use:

| Variable | Example Value |
|---|---|
| `{{order_number}}` | TM-20260407-4821 |
| `{{payment_id}}` | pay_Qx92mT... |
| `{{total_amount}}` | 450 |
| `{{customer_name}}` | Ravi Kumar |
| `{{customer_phone}}` | 9999999999 |
| `{{customer_address}}` | 12 Main St |
| `{{customer_city}}` | Chennai |
| `{{customer_pincode}}` | 600001 |
| `{{order_items}}` | Peanut Burfi Bar x2 = ₹290 |
| `{{admin_email}}` | sharukeshavalingam21@gmail.com |

Subject line: `New Order {{order_number}} — ₹{{total_amount}}`
To Email field: `{{admin_email}}`