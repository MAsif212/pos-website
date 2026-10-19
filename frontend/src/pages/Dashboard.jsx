import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Wallet,
  Receipt,
  Package,
  AlertTriangle,
  ShoppingCart,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import api from "../api/axios";
import { formatRs, formatDate } from "../utils/format";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// "2026-10-18" -> "Sun 18" (parsed as a local date, not UTC)
const dayLabel = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PK", { weekday: "short", day: "numeric" });
};

const shortRs = (n) => {
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-mocha">Loading dashboard…</p>;
  if (!data) return <p className="text-mocha">Couldn't load the dashboard. Is the backend running?</p>;

  const chartData = data.salesByDay.map((d) => ({ ...d, label: dayLabel(d.date) }));
  const weekTotal = data.salesByDay.reduce((s, d) => s + d.revenue, 0);
  const maxQty = Math.max(1, ...data.topProducts.map((p) => p.quantity));
  const today = new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-mocha">{today}</p>
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">{greeting()}</h1>
          <p className="mt-1 text-mocha">Here's how FreshMart is doing today.</p>
        </div>
        <Link to="/checkout" className="btn btn-primary self-start sm:self-auto">
          <ShoppingCart size={20} /> New sale
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Today's revenue" value={formatRs(data.todayRevenue)} />
        <StatCard icon={Receipt} label="Sales today" value={data.todaySales} />
        <StatCard icon={Package} label="Total products" value={data.totalProducts} to="/products" />
        <StatCard
          icon={AlertTriangle}
          label="Low stock alerts"
          value={data.lowStockCount}
          to="/low-stock"
          alert={data.lowStockCount > 0}
        />
      </div>

      {/* Chart + top products */}
      <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="card min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Last 7 days</h2>
              <p className="text-mocha">Revenue from completed sales</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-mocha">Week total</p>
              <p className="text-xl font-bold">{formatRs(weekTotal)}</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#8D6E63", fontSize: 13 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={shortRs}
                  tick={{ fill: "#8D6E63", fontSize: 13 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#EFE7D6" }}
                  formatter={(value) => [formatRs(value), "Revenue"]}
                  contentStyle={{
                    background: "#4E342E",
                    border: "none",
                    borderRadius: 12,
                    color: "#F8F4E7",
                  }}
                  labelStyle={{ color: "#E0D5C3" }}
                  itemStyle={{ color: "#F8F4E7" }}
                />
                <Bar dataKey="revenue" fill="#4E342E" radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card min-w-0">
          <h2 className="mb-1 flex items-center gap-2 font-serif text-2xl font-semibold">
            <TrendingUp size={22} /> Top products
          </h2>
          <p className="mb-5 text-mocha">By units sold</p>
          {data.topProducts.length === 0 ? (
            <p className="text-mocha">No sales yet.</p>
          ) : (
            <ul className="space-y-4">
              {data.topProducts.map((p, i) => (
                <li key={p._id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate font-semibold">
                      <span className="mr-2 text-mocha">{i + 1}.</span>
                      {p.name}
                    </p>
                    <p className="shrink-0 text-sm text-mocha">{p.quantity} sold</p>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-cream-dark">
                    <div
                      className="h-full rounded-full bg-cocoa"
                      style={{ width: `${(p.quantity / maxQty) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-sm text-mocha">{formatRs(p.revenue)} revenue</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent sales */}
      <section className="card">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-serif text-2xl font-semibold">Recent sales</h2>
          <Link to="/sales" className="flex items-center gap-1 font-semibold hover:underline">
            View all <ArrowRight size={18} />
          </Link>
        </div>
        {data.recentSales.length === 0 ? (
          <p className="text-mocha">No sales yet. Make your first sale on the Checkout page.</p>
        ) : (
          <ul className="divide-y divide-sand">
            {data.recentSales.map((s) => (
              <li key={s._id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono font-semibold">{s.invoiceNo}</p>
                  <p className="text-sm text-mocha">
                    {formatDate(s.createdAt)} · {s.items.reduce((n, i) => n + i.quantity, 0)} items ·{" "}
                    <span className="capitalize">{s.paymentMethod}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-bold ${s.status === "refunded" ? "text-mocha line-through" : ""}`}>
                    {formatRs(s.total)}
                  </p>
                  {s.status === "refunded" && (
                    <p className="text-xs font-semibold text-red-700">Refunded</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function StatCard({ icon: Icon, label, value, to, alert }) {
  const content = (
    <div
      className={`card h-full transition ${to ? "hover:border-cocoa" : ""} ${
        alert ? "border-amber-400 bg-amber-50" : ""
      }`}
    >
      <div
        className={`mb-3 inline-flex rounded-xl p-2.5 ${
          alert ? "bg-amber-100 text-amber-800" : "bg-cream-dark text-cocoa"
        }`}
      >
        <Icon size={22} />
      </div>
      <p className="text-sm font-semibold text-mocha">{label}</p>
      <p className={`mt-1 text-2xl font-bold sm:text-3xl ${alert ? "text-amber-800" : ""}`}>
        {value}
      </p>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}