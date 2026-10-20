import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import Sales from "./pages/Sales";
import LowStock from "./pages/LowStock";
import Users from "./pages/Users";

const adminOnly = (page) => <RequireAuth roles={["admin"]}>{page}</RequireAuth>;

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: "#4E342E", color: "#F8F4E7", fontSize: "15px" },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Everything below needs a logged-in user */}
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/sales" element={<Sales />} />

          <Route path="/" element={adminOnly(<Dashboard />)} />
          <Route path="/products" element={adminOnly(<Products />)} />
          <Route path="/categories" element={adminOnly(<Categories />)} />
          <Route path="/suppliers" element={adminOnly(<Suppliers />)} />
          <Route path="/low-stock" element={adminOnly(<LowStock />)} />
          <Route path="/users" element={adminOnly(<Users />)} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}