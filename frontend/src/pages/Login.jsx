import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, LogIn, ScanBarcode, PackageCheck, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../utils/auth";

export default function Login() {
  const { user, login, checking } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (checking) return null;
  if (user) return <Navigate to={homeFor(user)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Enter your username and password");
      return;
    }
    setLoading(true);
    try {
      const loggedIn = await login(username.trim(), password);
      toast.success(`Welcome, ${loggedIn.name}`);
      navigate(homeFor(loggedIn), { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <section className="hidden flex-col justify-between bg-cocoa p-12 text-cream lg:flex">
        <div>
          <p className="font-serif text-3xl tracking-[0.25em]">FRESHMART</p>
          <p className="mt-1 text-sand">Supermarket POS</p>
        </div>

        <div>
          <h1 className="mb-6 font-serif text-5xl font-semibold leading-tight">
            Every sale,
            <br />
            every shelf,
            <br />
            in one place.
          </h1>
          <ul className="space-y-4 text-lg text-sand">
            <li className="flex items-center gap-3">
              <ScanBarcode size={22} className="text-cream" /> Fast barcode checkout
            </li>
            <li className="flex items-center gap-3">
              <PackageCheck size={22} className="text-cream" /> Live stock and expiry alerts
            </li>
            <li className="flex items-center gap-3">
              <BarChart3 size={22} className="text-cream" /> Daily sales at a glance
            </li>
          </ul>
        </div>

        <p className="text-sm text-sand">Staff access only</p>
      </section>

      {/* Login form */}
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <p className="font-serif text-3xl tracking-[0.25em] text-cocoa">FRESHMART</p>
            <p className="text-mocha">Supermarket POS</p>
          </div>

          <div className="card p-8">
            <h2 className="font-serif text-3xl font-semibold">Sign in</h2>
            <p className="mb-6 mt-1 text-mocha">Use the account your admin gave you.</p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="label" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className="input"
                  placeholder="ali"
                  autoComplete="username"
                  autoCapitalize="none"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError("");
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input pr-12"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mocha hover:text-cocoa"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-primary w-full py-3.5 text-lg" disabled={loading}>
                <LogIn size={20} /> {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-mocha">
            Forgot your password? Ask your store admin to reset it.
          </p>
        </div>
      </section>
    </div>
  );
}