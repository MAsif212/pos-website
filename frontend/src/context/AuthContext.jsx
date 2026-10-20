import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { AUTH_STORAGE_KEY } from "../api/axios";

const AuthContext = createContext(null);

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
  } catch {
    return null;
  }
};

const writeSaved = (value) => {
  try {
    if (value) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // storage unavailable: login still works until the page is closed
  }
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readSaved); // { token, user } or null
  const [checking, setChecking] = useState(() => !!readSaved());

  const logout = useCallback(() => {
    writeSaved(null);
    setAuth(null);
  }, []);

  // When the app opens, ask the server if the saved token is still valid
  useEffect(() => {
    const saved = readSaved();
    if (!saved?.token) {
      setChecking(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => {
        const next = { ...saved, user: data };
        writeSaved(next);
        setAuth(next);
      })
      .catch((err) => {
        if (err.status === 401) logout();
      })
      .finally(() => setChecking(false));
  }, [logout]);

  // The API helper fires this when the server rejects the token
  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, [logout]);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    const next = { token: data.token, user: data.user };
    writeSaved(next);
    setAuth(next);
    return data.user;
  };

  const value = {
    user: auth?.user || null,
    isAdmin: auth?.user?.role === "admin",
    checking,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);