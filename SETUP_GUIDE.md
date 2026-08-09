# Antar Yoga — Studio Fee Manager Setup Guide

---

## 1. Run the App Locally

Open **two terminals**:

**Terminal 1 — Backend:**
```powershell
cd C:\Users\Raju\studio-fee-manager\backend
.\venv\Scripts\uvicorn.exe main:app --reload
```

**Terminal 2 — Frontend:**
```powershell
cd C:\Users\Raju\studio-fee-manager\frontend
npm run dev
```

Then open: **http://localhost:5173**

---

## 2. WhatsApp Reminders (Meta Cloud API — Free)

### Step 1 — Register as Meta Developer
1. Go to https://developers.facebook.com
2. Click **Get Started** or **My Apps**
3. If prompted, accept developer terms and register

### Step 2 — Create an App
1. Click **My Apps** → **Create App**
2. Select **Other** → **Next**
3. Select **Business** → **Next**
4. Name: "Antar Yoga" → **Create App**

### Step 3 — Add WhatsApp to the App
1. On app dashboard, scroll to **WhatsApp** → click **Set up**

### Step 4 — Get Token and Phone ID
1. In left sidebar: **WhatsApp** → **API Setup**
2. On that page you will see:
   - **Temporary access token** → copy this
   - **Phone number ID** → copy this

### Step 5 — Add your number as test recipient
1. On the same page, under "To", click **Manage phone number list**
2. Add: **+91 9916486812**
3. Verify with OTP sent to your WhatsApp

### Step 6 — Paste into .env
Open file: `C:\Users\Raju\studio-fee-manager\backend\.env`

```
META_WA_TOKEN=EAAxxxxxxxxxxxxxxxx      ← paste token here
META_WA_PHONE_ID=1234567890123         ← paste phone number ID here
```

### Step 7 — Restart backend
```powershell
cd C:\Users\Raju\studio-fee-manager\backend
.\venv\Scripts\uvicorn.exe main:app --reload
```

> **Note:** Temporary token expires in 24 hours.
> For a permanent token, go to:
> Meta App → WhatsApp → Configuration → generate a System User token.

---

## 3. Payment Confirmation Emails (Gmail — Free)

### Step 1 — Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not already on)

### Step 2 — Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select app: **Mail** → Select device: **Windows Computer**
3. Click **Generate**
4. Copy the **16-character password** shown (e.g. `abcd efgh ijkl mnop`)

### Step 3 — Paste into .env
Open file: `C:\Users\Raju\studio-fee-manager\backend\.env`

```
GMAIL_USER=JASHWANTHRAJU2808@GMAIL.COM
GMAIL_PASSWORD=abcdefghijklmnop       ← paste 16-char password (no spaces)
```

### Step 4 — Restart backend
```powershell
.\venv\Scripts\uvicorn.exe main:app --reload
```

---

## 4. The .env File (full reference)

Location: `C:\Users\Raju\studio-fee-manager\backend\.env`

```env
# Database
DATABASE_URL=postgresql+psycopg://postgres:2808@localhost:5432/studio_fee_manager

# Studio info
STUDIO_NAME=Antar Yoga
STUDIO_PHONE=+919916486812

# Gmail (payment confirmation emails)
GMAIL_USER=JASHWANTHRAJU2808@GMAIL.COM
GMAIL_PASSWORD=                        ← add App Password here

# Meta WhatsApp Cloud API (fee reminders)
META_WA_TOKEN=                         ← add token from developers.facebook.com
META_WA_PHONE_ID=                      ← add Phone Number ID
```

---

## 5. Online Hosting (Free)

When ready to host online, use these three free services:

| Part      | Service | URL                  |
|-----------|---------|----------------------|
| Frontend  | Vercel  | https://vercel.com   |
| Backend   | Render  | https://render.com   |
| Database  | Neon    | https://neon.tech    |

Steps:
1. **Neon** — create a PostgreSQL database, copy the connection string
2. **Render** — connect GitHub repo, set root to `backend/`, start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`, add all .env variables
3. **Vercel** — connect GitHub repo, set root to `frontend/`, update API base URL to your Render URL

---

## 6. Batches

The following 6 batches are pre-loaded in the app:

| # | Batch Time      |
|---|-----------------|
| 1 | 5:30 AM – 6:30 AM |
| 2 | 6:30 AM – 7:30 AM |
| 3 | 8:00 AM – 9:00 AM |
| 4 | 5:00 PM – 6:00 PM |
| 5 | 6:00 PM – 7:00 PM |
| 6 | 7:00 PM – 8:00 PM |

Assign members to batches when adding/editing a member.
Filter members by batch using the dropdown on the Members page.

---

## 7. Features Summary

- **Dashboard** — stats, 6-month chart, unpaid list, send WhatsApp reminders
- **Members** — add/edit/deactivate, assign batch, search, filter by batch, send reminder
- **Payments** — record, edit, delete, filter by month
- **Attendance** — daily mark present/absent, monthly report with % bar
- **Logo** — click the logo area in the sidebar to upload your studio logo

---

*Last updated: August 2026*
