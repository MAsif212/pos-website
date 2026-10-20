import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../utils/auth";

export default function RequireAuth({ roles, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="font-serif text-xl tracking-[0.2em] text-cocoa">FRESHMART</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;

  return children;
}