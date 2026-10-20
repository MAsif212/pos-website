# FreshMart: Supermarket POS System

**Live demo:** https://freshmart-pos.hafizasifsaleem50.workers.dev

A full-stack **Point of Sale (POS)** web application for a supermarket, built with the **MERN stack** (MongoDB, Express, React, Node.js). Staff log in with their own accounts: **admins** manage the whole store, and **cashiers** make sales. It works on both desktop and mobile screens.

> Demo login details are shared privately with the instructor.

## Features

### Login and roles
- Secure login with **JWT tokens**; passwords are stored as **bcrypt hashes**, never as plain text
- **Admin**: full access, including dashboard, products, stock, refunds, and user management
- **Cashier**: checkout and their own sales only
- Admin can add staff, reset passwords, and disable accounts (disabled users can't log in)
- Every sale records the cashier, and the receipt prints their name
- Sessions expire after 12 hours, and the app logs out automatically

### Checkout (POS)
- Add products by **barcode** (works with USB barcode scanners) or by tapping product cards
- Filter products by category
- Cart with quantity controls that never allow selling more than the available stock
- Discount, adjustable **GST %**, cash or card payment
- Quick cash buttons and automatic **change** calculation
- **Printable receipt** after every sale

### Inventory (admin)
- Add, edit, and delete **products**, with barcode generator, cost and sale price, profit, stock, unit (piece, kg, liter, pack), and expiry date
- Manage **categories** and **suppliers**
- Stock badges: In stock, Low stock, Out of stock
- Expiry badges: Expiring soon, Expired
- **Low stock page** with one-click restocking and supplier details

### Sales
- **Sales history** with search by invoice number, date range, and status filters
- View and **reprint** any receipt
- Admin sees all sales with the cashier's name; cashiers see only their own sales
- **Refunds** (admin only) automatically return the stock

### Dashboard (admin)
- Today's revenue, number of sales, total products, and low stock alerts
- **7-day revenue chart**
- Top 5 best-selling products
- Recent sales

## Security and data safety
- Every API route checks the login token, and admin-only routes also check the role on the **server**, so hiding menu items is not the only protection
- All totals, tax, and change are **recalculated on the server**, so prices can't be faked from the browser
- Stock is reduced with an atomic check, so two cashiers can't sell the last item twice
- Categories and suppliers **can't be deleted** while products still use them (referential integrity)
- Sale items store the product name and price **at the time of sale**, so old receipts stay correct after a price change
- Users are disabled instead of deleted, so old sales keep their cashier's name
- The API only accepts requests from the project's own website (CORS)

## Tech stack

| Layer | Technology |
|---|---|
| Database | MongoDB Atlas, Mongoose |
| Backend | Node.js, Express, JSON Web Tokens, bcryptjs |
| Frontend | React (Vite), React Router, Tailwind CSS |
| Charts and UI | Recharts, Lucide icons, React Hot Toast |
| Hosting | Cloudflare (frontend), Vercel (backend) |

## Project structure

```
pos-website/
├── backend/
│   ├── api/            Vercel entry point
│   ├── config/         Database connection
│   ├── controllers/    Business logic (auth, users, products, sales, ...)
│   ├── middleware/     Login check, role check, error handling
│   ├── models/         User, Category, Supplier, Product, Sale
│   ├── routes/         API endpoints
│   ├── seed.js         Demo products, categories, suppliers, and sales
│   ├── seedUsers.js    Starter admin and cashier accounts
│   └── server.js       Express app
└── frontend/
    └── src/
        ├── api/        Axios setup (sends the login token)
        ├── components/ Layout, Modal, Receipt, PageHeader, RequireAuth
        ├── context/    Login state (AuthContext)
        ├── pages/      Login, Dashboard, Checkout, Products, Categories,
        │               Suppliers, Sales, LowStock, Users
        └── utils/      Formatting and role helpers
```

## How to run locally

### Requirements
- Node.js (LTS version)
- A free MongoDB Atlas account

### 1. Backend
```bash
cd backend
npm install
```
Create a file named `.env` inside the `backend` folder:
```env
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@your-cluster.mongodb.net/supermarket_pos?retryWrites=true&w=majority
JWT_SECRET=any-long-random-text
```
You can generate a random `JWT_SECRET` with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Then add demo data and the starter accounts, and start the server:
```bash
npm run seed -- --with-sales
npm run seed-users
npm run dev
```
The API runs at `http://localhost:5000`.

`seed-users` creates a starter **admin** and **cashier** account (see `seedUsers.js`). Change their passwords from the **Users** page after the first login.

### 2. Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser and sign in.

## API endpoints

🔓 Public · 👤 Any logged-in user · 🛡️ Admin only

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | 🔓 | Log in, returns a token |
| GET | `/api/auth/me` | 👤 | Current logged-in user |
| GET | `/api/users` | 🛡️ | List users |
| POST | `/api/users` | 🛡️ | Create a user |
| PUT | `/api/users/:id` | 🛡️ | Edit, reset password, enable or disable |
| GET | `/api/categories` | 👤 | List categories |
| POST, PUT, DELETE | `/api/categories` | 🛡️ | Create, update, or delete a category |
| GET, POST, PUT, DELETE | `/api/suppliers` | 🛡️ | Manage suppliers |
| GET | `/api/products` | 👤 | List products (with search and filter) |
| GET | `/api/products/barcode/:barcode` | 👤 | Find a product by barcode |
| GET | `/api/products/:id` | 👤 | Get one product |
| GET | `/api/products/low-stock` | 🛡️ | Products at or below their low stock limit |
| POST, PUT, DELETE | `/api/products` | 🛡️ | Create, update, or delete a product |
| POST | `/api/sales` | 👤 | Create a sale |
| GET | `/api/sales` | 👤 | List sales (cashiers see only their own) |
| GET | `/api/sales/:id` | 👤 | Get one sale |
| PUT | `/api/sales/:id/refund` | 🛡️ | Refund a sale and restore stock |
| GET | `/api/dashboard` | 🛡️ | Dashboard statistics |
| GET | `/api/health` | 🔓 | Check that the API and database are running |

Protected routes need the header `Authorization: Bearer <token>`.

## Developed by
Muhammad Asif, CS Student  / 25021519-129 .