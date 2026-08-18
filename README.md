# 💅 Blush Nail Studio

A full-stack **nail salon booking website** with a premium feminine aesthetic — customer-facing site,
secure authentication, real-time slot availability, and a complete admin dashboard. Built with
**React + Vite** on the frontend and **Node.js + Express + MongoDB Atlas** on the backend.

---

## ✨ What's inside

| Area                | What you get                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Customer site**   | Home (hero, featured designs, services, testimonials, hours), Nail Designs gallery with search & filters, Services, About, Contact |
| **Booking**         | *Browse → Select Design → Pick Date → Choose Live Slot → Confirm* — booked slots are disabled in real time |
| **Accounts**        | Signup / login / forgot-password / reset, JWT sessions, customer dashboard with appointment tracking & notifications |
| **Admin dashboard** | Overview stats + revenue chart, appointment management (accept / reject / complete / cancel), calendar (day/week/month), designs CRUD with image uploads, customers, salon settings |
| **Database**        | MongoDB Atlas (`nails` database) with unique + partial indexes that make double-booking impossible |
| **Security**        | bcrypt password hashing, role-based API guards, server-side validation, safe image uploads |

**Demo accounts (created by the seed script):**

| Role     | Email                | Password      |
| -------- | -------------------- | ------------- |
| Admin    | `admin@blush.com`    | `admin123`    |
| Customer | `sophia@example.com` | `password123` |
| Customer | `emma@example.com`   | `password123` |
| Customer | `olivia@example.com` | `password123` |

---

## 🚀 Quick start

Requires **Node 20+** (tested on Node 24) and a **MongoDB Atlas** cluster (free M0 tier works).

### Step 1 — Set up MongoDB Atlas (once)

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com) (e.g. `Cluster0`).
2. **Database Access** → *Add New Database User* — create a user, e.g. `singhharinder662_db_user`, and
   **keep the password** (this is what you'll paste into `.env`).
3. **Network Access** → *Add IP Address* → *Allow access from anywhere* (`0.0.0.0/0`) or add your IP.
4. **Clusters** → *Connect* → *Drivers* — copy the connection string.

### Step 2 — Configure the connection

```bash
cp server/.env.example server/.env
```

Open `server/.env` and replace `<db_password>` in `MONGODB_URI` with your database user's password
(exactly as you set it — the password is case-sensitive).

> **Why is the URI not `mongodb+srv://...`?**
> The standard Atlas connection string (`mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/`) fails on
> some home routers because they refuse Node's SRV DNS lookups (`querySrv ECONNREFUSED`). This project
> therefore uses the **direct shard hostnames** instead — same cluster, same security (TLS is on).
> You can find your shard hostnames via `nslookup -type=srv _mongodb._tcp.<your-cluster>.mongodb.net`.
> If your network supports SRV, you may use the normal string and the app will work either way.

### Step 3 — Install, seed, run

```bash
# 1. Install all dependencies (root + server + client)
npm run install:all

# 2. Seed the database (creates admin, 12 designs, 3 customers, sample appointments)
npm run seed

# 3. Start both servers
npm run dev
```

Open **http://localhost:5173** — the customer site. Admin portal: **http://localhost:5173/admin/login**.

**One-command production:**

```bash
npm run build                      # bundles the client into client/dist
cd server && npm start             # serves the built site + API on :4000
```

---

## 🗄️ What the seed creates

In your `nails` database:

| Collection        | Contents                                                                  |
| ----------------- | ------------------------------------------------------------------------- |
| `users`           | 1 admin + 3 customers (passwords bcrypt-hashed)                           |
| `nail_designs`    | 12 designs across 8 categories (French Tips, Gel, Acrylic, Nail Art, Bridal, Extensions, Custom, Minimal) |
| `appointments`    | Sample bookings: today's, upcoming, past completed, pending, cancelled    |
| `business_hours`  | Mon–Sat 10:00–19:00, Sun 10:00–17:00                                       |
| `salon_settings`  | Salon name, contact info, socials, booking rules (single document)        |
| `notifications`   | Welcome + status notifications for the demo customer                       |
| `slot_state`      | Per-slot counters used to atomically prevent double-booking               |

Collections and indexes are **created automatically on first server start** — you don't need to create
anything in Atlas. Reseed anytime (deletes all app data and re-inserts):

```bash
npm run seed -- --force
```

---

## 🧰 Everyday use

- **Customer flow:** Browse designs → *Book This Design* → sign in (or sign up) → pick a date from the
  strip → pick an available slot → confirm. Your booking appears in the dashboard as **Pending**.
- **Admin flow:** Sign in at `/admin/login` → **Appointments** → *Accept / Reject* pending requests
  (optionally add a note). The customer is notified in-app, and rejected/cancelled slots free up
  immediately.
- **Slot availability:** is always computed server-side. Two people can't grab the same slot — a
  per-slot counter is claimed atomically, and a unique index blocks the same customer from booking the
  same slot twice.
- **Settings:** Admin → Settings lets you edit salon info, per-day business hours (affects slots at
  once), booking interval, max appointments per slot, advance-booking days, and cancellation policy.
- **Images:** Admin → Nail Designs → upload/replace/remove design photos. Files are stored on disk in
  `server/uploads/` (never in the database) and served at `/uploads/...`.

---

## 🏗️ Project structure

```
├── server/                      # Express API (ESM)
│   ├── .env.example             # copy to .env and fill in your MongoDB URI
│   ├── src/
│   │   ├── index.js             # bootstrap, route mounting, static serving
│   │   ├── db.js                # MongoDB connection, collections, indexes
│   │   ├── seed.js              # sample data (npm run seed)
│   │   ├── lib/helpers.js       # slot generation, availability, validation, join helpers
│   │   ├── middleware/auth.js   # JWT verify + admin guard
│   │   └── routes/
│   │       ├── auth.js          # signup / login / logout / forgot+reset / me / profile
│   │       ├── designs.js       # public nail designs (search, filters)
│   │       ├── appointments.js  # customer bookings + cancel (atomic slot claim)
│   │       ├── availability.js  # GET /availability?date=YYYY-MM-DD
│   │       ├── notifications.js # in-app notifications (customer + admin)
│   │       ├── settings.js      # public salon info + hours
│   │       └── admin.js         # stats, appointments, calendar, designs CRUD,
│   │                            # image uploads, customers, settings
│   └── uploads/                 # uploaded nail images (gitignored)
└── client/                      # React 18 + Vite SPA
    └── src/
        ├── pages/               # Home, Designs, Services, About, Contact, Booking, Auth, Dashboard
        ├── admin/               # AdminLogin, Dashboard, Appointments, Calendar, Designs, Customers, Settings
        ├── components/          # Navbar, Footer, DesignCard, ui primitives, Toast, guards
        ├── context/             # AuthContext (session persistence)
        ├── hooks/               # useSiteData
        ├── utils/date.js
        └── styles/global.css    # design system (soft pink / nude / cream / gold)
```

---

## 🔌 API overview

All endpoints are under `/api`. Authenticated routes require `Authorization: Bearer <token>`.
`/api/admin/*` routes additionally require the admin role (403 for customers).

| Area          | Endpoints                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Auth          | `POST /auth/signup` · `POST /auth/login` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `GET /auth/me` · `PUT /profile` |
| Designs       | `GET /nail-designs` · `GET /nail-designs/:id` · `GET /design-categories`                                                               |
| Availability  | `GET /availability?date=YYYY-MM-DD`                                                                                                    |
| Appointments  | `GET /appointments` · `POST /appointments` · `GET /appointments/:id` · `PUT /appointments/:id/cancel`                                  |
| Notifications | `GET /notifications` · `PUT /notifications/:id/read` · `PUT /notifications/read-all` (+ `/admin/*` variants)                            |
| Admin         | `GET /admin/stats` · `GET/POST /admin/designs` · `PUT/DELETE /admin/designs/:id` · `POST/DELETE /admin/uploads` · `GET /admin/appointments` · `PUT /admin/appointments/:id/{accept,reject,complete,cancel}` · `GET /admin/calendar` · `GET /admin/customers` · `GET/PUT /admin/customers/:id` · `GET/PUT /admin/settings` · `PUT /admin/hours` |
| Public        | `GET /settings` · `GET /health`                                                                                                        |

---

## 🔐 Security model

- Passwords are **bcrypt-hashed**; sessions are **JWT** with a 7-day expiry.
- **Role-based access control** is enforced server-side on every admin route — customer tokens get a 403.
- Customers can only read/cancel **their own** appointments (ownership is checked in every query).
- **Double-booking is impossible:** availability is recomputed server-side, the slot is claimed with an
  atomic conditional update, and a unique partial index on
  `(customer_id, appointment_date, appointment_time)` blocks duplicate holds.
- Input validation with field-level errors on every write endpoint; image uploads are restricted by
  MIME type and size (5 MB max).
- Secrets live in `server/.env` (gitignored). Change `JWT_SECRET` before deploying.

---

## 🛠️ Troubleshooting

| Symptom                          | Cause & fix                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `bad auth: authentication failed`| Wrong password / username in `MONGODB_URI`. Re-check the password in Atlas → Database Access (it's case-sensitive), or create a new user.  |
| `querySrv ECONNREFUSED`          | Your router refuses Node's SRV DNS lookups. Use the direct shard-host URI from `.env.example` instead of `mongodb+srv://`.                 |
| `Could not connect` / timeout    | Your IP isn't on the Atlas access list — add it under Network Access (or allow `0.0.0.0/0`).                                              |
| `EADDRINUSE: :::4000`            | Something is already on port 4000 (often a previous server instance). Find it with `netstat -ano \| findstr :4000` and `taskkill /PID <pid> /F`. |
| Empty dashboard / no designs     | The database hasn't been seeded — run `npm run seed`.                                                                                     |
| Ports                             | Change `PORT` in `server/.env` (API) and the `proxy` target in `client/vite.config.js` (frontend) together.                               |
| Forgot-password link             | The reset link is printed to the **server console** (demo mode). Wire up nodemailer/Resend to send real emails.                            |

---

## 📌 Notes

- **Images** are stored locally under `server/uploads/`. To go cloud-native, swap `multer.diskStorage`
  for an S3/Cloudinary uploader in `server/src/routes/admin.js`.
- **Email** notifications are not wired to a provider — everything is in-app. The forgot-password
  endpoint already generates a reset token for you to hook into an email service.
- The `slot_state` counters are rebuilt automatically by the seed script, so availability is always
  consistent after a reseed.
