# FreshMart: Supermarket POS System

A full-stack **Point of Sale (POS)** web application for a supermarket, built with the **MERN stack** (MongoDB, Express, React, Node.js). It is an admin panel for managing products, stock, suppliers, sales, and receipts, and it works on both desktop and mobile screens.

## Features

### Checkout (POS)
- Add products by **barcode** (works with USB barcode scanners) or by tapping product cards
- Filter products by category
- Cart with quantity controls that never allow selling more than the available stock
- Discount, adjustable **GST %**, cash or card payment
- Quick cash buttons and automatic **change** calculation
- **Printable receipt** after every sale

### Inventory
- Add, edit, and delete **products**, with barcode generator, cost and sale price, profit, stock, unit (piece, kg, liter, pack), and expiry date
- Manage **categories** and **suppliers**
- Stock badges: In stock, Low stock, Out of stock
- Expiry badges: Expiring soon, Expired
- **Low stock page** with one-click restocking and supplier details

### Sales
- **Sales history** with search by invoice number, date range, and status filters
- View and **reprint** any old receipt
- **Refunds** that automatically return the stock

### Dashboard
- Today's revenue, number of sales, total products, and low stock alerts
- **7-day revenue chart**
- Top 5 best-selling products
- Recent sales

## Data safety
- All totals, tax, and change are **recalculated on the server**, so prices can't be faked from the browser
- Stock is reduced with an atomic check, so two cashiers can't sell the last item twice
- Categories and suppliers **can't be deleted** while products still use them (referential integrity)
- Sale items store the product name and price **at the time of sale**, so old receipts stay correct after a price change

## Tech stack

| Layer | Technology |
|---|---|
| Database | MongoDB Atlas, Mongoose |
| Backend | Node.js, Express |
| Frontend | React (Vite), React Router, Tailwind CSS |
| Charts and UI | Recharts, Lucide icons, React Hot Toast |

## Project structure

```
pos-website/
├── backend/
│   ├── config/         Database connection
│   ├── controllers/    Business logic
│   ├── middleware/     Error handling
│   ├── models/         Category, Supplier, Product, Sale
│   ├── routes/         API endpoints
│   ├── seed.js         Demo data script
│   └── server.js       Entry point
└── frontend/
    └── src/
        ├── api/        Axios setup
        ├── components/ Layout, Modal, Receipt, PageHeader
        ├── pages/      Dashboard, Checkout, Products, Categories,
        │               Suppliers, Sales, LowStock
        └── utils/      Formatting helpers
```

## How to run

### Requirements
- Node.js (LTS version)
- A free MongoDB Atlas account

### 1. Backend
```bash
cd backend
npm install
```
Create a file named `.env` inside the `backend` folder with these two lines, using your own MongoDB Atlas connection string:
```env
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@your-cluster.mongodb.net/supermarket_pos?retryWrites=true&w=majority
```
Then:
```bash
npm run seed -- --with-sales
npm run dev
```
The API runs at `http://localhost:5000`.

### 2. Frontend.
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET, POST | `/api/categories` | List or create categories |
| PUT, DELETE | `/api/categories/:id` | Update or delete a category |
| GET, POST | `/api/suppliers` | List or create suppliers |
| PUT, DELETE | `/api/suppliers/:id` | Update or delete a supplier |
| GET, POST | `/api/products` | List (with search and filter) or create products |
| GET | `/api/products/low-stock` | Products at or below their low stock limit |
| GET | `/api/products/barcode/:barcode` | Find a product by barcode |
| GET, PUT, DELETE | `/api/products/:id` | Get, update, or delete a product |
| GET, POST | `/api/sales` | List sales (with filters) or create a sale |
| GET | `/api/sales/:id` | Get one sale |
| PUT | `/api/sales/:id/refund` | Refund a sale and restore stock |
| GET | `/api/dashboard` | Dashboard statistics |

## Developed by
Muhammad Asif, CS Student / 25021519-129 .